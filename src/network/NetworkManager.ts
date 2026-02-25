import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { PacketType, type SyncPacket } from './SyncSchemas';

export class NetworkManager {
    private peer: Peer;
    // Map of Peer ID -> DataConnection for reliable/unreliable channels
    private reliableConnections: Map<string, DataConnection> = new Map();
    private unreliableConnections: Map<string, DataConnection> = new Map();
    private onPacketReceived: (packet: SyncPacket, connection: DataConnection) => void;
    public role: 'host' | 'client';
    public timeOffset: number = 0;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private tickInterval: ReturnType<typeof setInterval> | null = null;
    private tickWorker: Worker | null = null;
    private onTick: (() => void) | null = null;

    constructor(
        peer: Peer,
        role: 'host' | 'client',
        onPacket: (packet: SyncPacket, connection: DataConnection) => void
    ) {
        this.peer = peer;
        this.role = role;
        this.onPacketReceived = onPacket;

        this.setupListeners();
    }

    private setupListeners() {
        this.peer.on('connection', (conn) => {
            console.log(`Incoming ${conn.label} connection from:`, conn.peer);
            this.handleConnection(conn);
        });
    }

    public connectToHost(hostPeerId: string) {
        if (this.role === 'client') {
            // Establish reliable channel for critical events
            const relConn = this.peer.connect(hostPeerId, { label: 'reliable', reliable: true });
            this.handleConnection(relConn);

            // Establish unreliable channel for sync data (low latency, drops packet over HOL-blocking)
            const unRelConn = this.peer.connect(hostPeerId, { label: 'unreliable', reliable: false });
            this.handleConnection(unRelConn);
        }
    }

    private handleConnection(conn: DataConnection) {
        const onOpen = () => {
            if (conn.label === 'reliable') {
                this.reliableConnections.set(conn.peer, conn);
                if (this.role === 'client') {
                    this.startPingLoop(conn);
                }
            } else {
                this.unreliableConnections.set(conn.peer, conn);
            }
            console.log(`Connection established (${conn.label}) with:`, conn.peer);
        };

        conn.on('open', onOpen);
        if (conn.open) {
            onOpen();
        }

        conn.on('data', (data: any) => {
            const packet = data as SyncPacket;

            // Handle NTP Ping/Pong transparently
            if (packet.t === PacketType.PING && packet.pi) {
                // Host replies to Client's PING
                if (conn.open) {
                    conn.send({
                        t: PacketType.PONG,
                        po: {
                            clientTime: packet.pi.clientTime,
                            serverTime: Date.now()
                        },
                        ts: Date.now()
                    });
                }
                return;
            } else if (packet.t === PacketType.PONG && packet.po) {
                // Client calculates network time offset
                const rtt = Date.now() - packet.po.clientTime;
                const newOffset = packet.po.serverTime - (packet.po.clientTime + rtt / 2);

                // Smooth the offset using EMA (Exponential Moving Average)
                if (this.timeOffset === 0) {
                    this.timeOffset = newOffset;
                } else {
                    this.timeOffset = this.timeOffset * 0.8 + newOffset * 0.2;
                }
                return;
            }

            this.onPacketReceived(packet, conn);
        });

        conn.on('close', () => {
            if (conn.label === 'reliable') {
                this.reliableConnections.delete(conn.peer);
            } else {
                this.unreliableConnections.delete(conn.peer);
            }
            console.log(`Connection closed (${conn.label}) with:`, conn.peer);
        });

        conn.on('error', (err) => {
            console.error(`Connection error (${conn.label}) with:`, conn.peer, err);
            if (conn.label === 'reliable') {
                this.reliableConnections.delete(conn.peer);
            } else {
                this.unreliableConnections.delete(conn.peer);
            }
        });
    }

    private startPingLoop(conn: DataConnection) {
        if (this.pingInterval) clearInterval(this.pingInterval);

        const sendPing = () => {
            if (conn.open) {
                conn.send({
                    t: PacketType.PING,
                    pi: { clientTime: Date.now() },
                    ts: Date.now()
                });
            }
        };

        // Ping immediately, then every 1 second
        sendPing();
        this.pingInterval = setInterval(sendPing, 1000);
    }

    /**
     * Broadcasts to all peers. Routes pakets automatically based on PacketType.
     */
    public broadcast(packet: SyncPacket) {
        const isReliable = packet.t === PacketType.GAME_EVENT || packet.t === PacketType.GAME_STATE;
        const targetMap = isReliable ? this.reliableConnections : this.unreliableConnections;

        // PeerJS naturally serializes objects via JS internal cloning before WebRTC bridging.
        // We removed the heavy JSON.stringify() to skip large V8 Garbage Collection pauses.
        targetMap.forEach(conn => {
            if (conn.open) {
                try {
                    conn.send(packet);
                } catch (err) {
                    console.warn(`[Network] Failed to broadcast on ${conn.label}:`, err);
                }
            }
        });
    }

    /**
     * Sends to a specific peer over the correct channel.
     */
    public sendTo(peerId: string, packet: SyncPacket) {
        const isReliable = packet.t === PacketType.GAME_EVENT || packet.t === PacketType.GAME_STATE;
        const conn = isReliable ? this.reliableConnections.get(peerId) : this.unreliableConnections.get(peerId);

        if (conn && conn.open) {
            try {
                conn.send(packet);
            } catch (err) {
                console.warn(`[Network] Failed to sendTo on ${conn.label}:`, err);
            }
        }
    }

    /**
     * Sets an off-main-render-thread tick interval. 
     * Ideal to prevent the networking engine from stuttering or throttling
     * when the browser tab loses focus.
     */
    public setTickFunction(callback: () => void, intervalMs: number = 33) {
        this.onTick = callback;
        if (this.tickInterval) {
            clearInterval(this.tickInterval as any);
            this.tickInterval = null;
        }
        if (this.tickWorker) {
            this.tickWorker.terminate();
        }

        try {
            const workerCode = `
                let intervalId = null;
                self.onmessage = function(e) {
                    if (e.data.type === 'start') {
                        intervalId = setInterval(() => self.postMessage('tick'), e.data.interval);
                    } else if (e.data.type === 'stop') {
                        clearInterval(intervalId);
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.tickWorker = new Worker(URL.createObjectURL(blob));
            this.tickWorker.onmessage = () => {
                if (this.onTick) this.onTick();
            };
            this.tickWorker.postMessage({ type: 'start', interval: intervalMs });
        } catch (e) {
            console.warn("Worker creation failed, falling back to setInterval", e);
            this.tickInterval = setInterval(() => {
                if (this.onTick) this.onTick();
            }, intervalMs);
        }
    }

    /** Safe public accessor for the local peer ID */
    public get peerId(): string {
        return this.peer.id;
    }

    /** 
     * Returns the globally synchronized time.
     * Host returns local time. Client returns local time + network offset.
     */
    public getServerTime(): number {
        return Date.now() + (this.role === 'client' ? this.timeOffset : 0);
    }

    public getConnectedPeerCount(): number {
        // Reliable represents solid connection count securely
        return this.reliableConnections.size;
    }

    public disconnect() {
        this.reliableConnections.forEach(conn => conn.close());
        this.unreliableConnections.forEach(conn => conn.close());
        this.reliableConnections.clear();
        this.unreliableConnections.clear();
        if (this.tickInterval) clearInterval(this.tickInterval as unknown as number);
        if (this.tickWorker) {
            this.tickWorker.terminate();
            this.tickWorker = null;
        }
        if (this.pingInterval) clearInterval(this.pingInterval as unknown as number);
    }
}

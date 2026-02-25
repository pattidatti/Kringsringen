import Peer, { DataConnection } from 'peerjs';
import type { SyncPacket } from './SyncSchemas';

export class NetworkManager {
    private peer: Peer;
    private connections: Map<string, DataConnection> = new Map();
    private onPacketReceived: (packet: SyncPacket, connection: DataConnection) => void;
    public role: 'host' | 'client';

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
            console.log('Incoming connection from:', conn.peer);
            this.handleConnection(conn);
        });
    }

    public connectToHost(hostPeerId: string) {
        if (this.role === 'client') {
            const conn = this.peer.connect(hostPeerId, {
                reliable: false // Vi vil ha lav latency for action-data
            });
            this.handleConnection(conn);
        }
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            console.log('Connection established with:', conn.peer);
        });

        conn.on('data', (data: any) => {
            this.onPacketReceived(data as SyncPacket, conn);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            console.log('Connection closed with:', conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Connection error with:', conn.peer, err);
            this.connections.delete(conn.peer);
        });
    }

    /**
     * Sender en pakke til alle tilkoblede peers (hvis Host) 
     * eller til Host (hvis Client)
     */
    public broadcast(packet: SyncPacket) {
        const data = JSON.parse(JSON.stringify(packet)); // Enkel serialisering
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    /**
     * Sender til en spesifikk peer
     */
    public sendTo(peerId: string, packet: SyncPacket) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(packet);
        }
    }

    public getConnectedPeerCount(): number {
        return this.connections.size;
    }

    public disconnect() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
    }
}

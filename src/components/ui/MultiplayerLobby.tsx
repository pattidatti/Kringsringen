import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { MatchmakingService, type RoomData } from '../../services/Matchmaking';
import Peer from 'peerjs';

interface MultiplayerLobbyProps {
    isOpen: boolean;
    onClose: () => void;
    onStartGame: (role: 'host' | 'client', roomCode: string, peer: Peer, nickname: string, hostPeerId?: string) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ isOpen, onClose, onStartGame }) => {
    const [nickname, setNickname] = useState(localStorage.getItem('mp_nickname') || '');
    const [roomCode, setRoomCode] = useState('');
    const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
    const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [peer, setPeer] = useState<Peer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Initialiser PeerJS når komponenten åpnes
    useEffect(() => {
        if (isOpen && !peer) {
            const newPeer = new Peer();
            newPeer.on('open', (id) => {
                console.log('Peer ID:', id);
                setPeer(newPeer);
            });
            newPeer.on('error', (err) => {
                console.error('Peer error:', err);
                setError('Kunne ikke koble til P2P-nettverket.');
            });
        }

        return () => {
            // Vi sletter ikke peer her hvis vi skal bruke den i spillet,
            // men hvis vi lukker lobbyen uten å starte, bør vi rydde opp.
            if (!isOpen && peer && !activeRoomCode) {
                peer.destroy();
                setPeer(null);
            }
        };
    }, [isOpen, peer, activeRoomCode]);

    // Lytt på rom-endringer
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (activeRoomCode) {
            unsubscribe = MatchmakingService.subscribeToRoom(activeRoomCode, (data) => {
                setCurrentRoom(data);
                if (data && data.status === 'playing' && !isHost) {
                    // Host startet spillet
                    onStartGame('client', activeRoomCode, peer!, nickname, data.hostId);
                }
            });
        }
        return () => unsubscribe?.();
    }, [activeRoomCode, isHost, onStartGame, peer, nickname]);

    const handleCreateRoom = async () => {
        if (!nickname.trim()) {
            setError('Skriv inn et navn først.');
            return;
        }
        if (!peer) return;

        setLoading(true);
        setError(null);
        try {
            localStorage.setItem('mp_nickname', nickname);
            const code = await MatchmakingService.createRoom(nickname, peer.id);
            setActiveRoomCode(code);
            setIsHost(true);
        } catch (err: any) {
            setError(err.message || 'Kunne ikke opprette rom.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!nickname.trim()) {
            setError('Skriv inn et navn først.');
            return;
        }
        if (!roomCode.trim()) {
            setError('Skriv inn rom-kode.');
            return;
        }
        if (!peer) return;

        setLoading(true);
        setError(null);
        try {
            localStorage.setItem('mp_nickname', nickname);
            await MatchmakingService.joinRoom(roomCode, nickname, peer.id);
            setActiveRoomCode(roomCode.toUpperCase());
            setIsHost(false);
        } catch (err: any) {
            setError(err.message || 'Kunne ikke bli med i rommet.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartMatch = async () => {
        if (isHost && activeRoomCode && peer) {
            await MatchmakingService.startMatch(activeRoomCode);
            onStartGame('host', activeRoomCode, peer, nickname, peer.id);
        }
    };

    const handleCancel = async () => {
        if (isHost && activeRoomCode) {
            await MatchmakingService.deleteRoom(activeRoomCode);
        }
        setActiveRoomCode(null);
        setCurrentRoom(null);
        setIsHost(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="pixel-panel w-full max-w-md bg-[#2a1a10] border-4 border-[#4a2e1d] p-6 text-[#fde68a]"
            >
                <h2 className="font-fantasy text-3xl mb-6 text-center tracking-wider text-amber-200">
                    MULTIPLAYER LOBBY
                </h2>

                {error && (
                    <div className="bg-red-900/50 border-2 border-red-500 p-2 mb-4 text-sm text-center text-red-100">
                        {error}
                    </div>
                )}

                {!activeRoomCode ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase mb-1 opacity-70">Ditt Navn</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                maxLength={15}
                                className="w-full bg-black/40 border-2 border-[#4a2e1d] p-2 text-amber-100 outline-none focus:border-amber-500 transition-colors"
                                placeholder="Skriv navn..."
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white/5 p-4 border border-white/10 rounded">
                                <FantasyButton
                                    label={loading ? "Laster..." : "Opprett Rom"}
                                    variant="primary"
                                    onClick={handleCreateRoom}
                                    disabled={loading}
                                    className="w-full"
                                />
                                <p className="text-[10px] text-center mt-2 opacity-60">Start et nytt spill og inviter venner</p>
                            </div>

                            <div className="bg-white/5 p-4 border border-white/10 rounded">
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        maxLength={4}
                                        className="flex-1 bg-black/40 border-2 border-[#4a2e1d] p-2 text-center font-bold tracking-widest text-xl outline-none"
                                        placeholder="KODE"
                                    />
                                    <FantasyButton
                                        label="Bli med"
                                        variant="secondary"
                                        onClick={handleJoinRoom}
                                        disabled={loading}
                                    />
                                </div>
                                <p className="text-[10px] text-center opacity-60">Skriv inn en 4-tegns kode</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-xs uppercase opacity-70 hover:opacity-100 transition-opacity mt-4"
                        >
                            Tilbake
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs uppercase opacity-70">Rom-kode</p>
                            <h3 className="text-5xl font-bold tracking-tighter text-amber-400 drop-shadow-lg">
                                {activeRoomCode}
                            </h3>
                        </div>

                        <div className="bg-black/30 p-4 border-2 border-[#4a2e1d]">
                            <p className="text-xs uppercase mb-2 opacity-70">Spillere i rommet ({Object.keys(currentRoom?.players || {}).length}/4)</p>
                            <ul className="space-y-2">
                                {currentRoom && Object.values(currentRoom.players).map((p, idx) => (
                                    <motion.li
                                        key={p.peerId}
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className={p.peerId === peer?.id ? "text-amber-200" : "text-white"}>
                                            {p.name} {p.peerId === currentRoom.hostId && <span className="text-[10px] text-amber-500 font-bold ml-1">(HOST)</span>}
                                        </span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            {isHost ? (
                                <FantasyButton
                                    label="Start Kampen!"
                                    variant="primary"
                                    onClick={handleStartMatch}
                                    className="w-full py-4 text-xl"
                                    disabled={Object.keys(currentRoom?.players || {}).length < 1}
                                />
                            ) : (
                                <div className="text-center py-4 text-sm animate-pulse text-amber-200">
                                    Venter på at Host starter...
                                </div>
                            )}

                            <button
                                onClick={handleCancel}
                                className="text-xs uppercase opacity-70 hover:opacity-100 transition-opacity"
                            >
                                Avbryt / Forlat
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

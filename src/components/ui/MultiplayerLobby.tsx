import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
    const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [peer, setPeer] = useState<Peer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Endringer for Serverliste
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
    const [lobbies, setLobbies] = useState<Record<string, RoomData>>({});
    const [roomName, setRoomName] = useState('');
    const [hasPassword, setHasPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<{ id: string, name: string } | null>(null);

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

    // Lytt på åpne lobbyer for serverlisten
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (isOpen && activeTab === 'list' && !activeRoomCode) {
            unsubscribe = MatchmakingService.subscribeToLobbies((data) => {
                setLobbies(data || {});
            });
        }
        return () => unsubscribe?.();
    }, [isOpen, activeTab, activeRoomCode]);

    // Lytt på rom-endringer for selve venterommet
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
        if (hasPassword && !password.trim()) {
            setError('Du må skrive et passord når rommet krever det.');
            return;
        }
        if (!peer) return;

        setLoading(true);
        setError(null);
        try {
            localStorage.setItem('mp_nickname', nickname);
            const code = await MatchmakingService.createRoom(nickname, peer.id, roomName, hasPassword, password);
            setActiveRoomCode(code);
            setIsHost(true);
        } catch (err: any) {
            setError(err.message || 'Kunne ikke opprette rom.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinServerClick = (id: string, room: RoomData) => {
        if (room.hasPassword) {
            setSelectedRoom({ id, name: room.roomName });
            setJoinPassword('');
        } else {
            handleJoinRoom(id);
        }
    };

    const handleJoinRoom = async (codeToJoin: string, passAttempt?: string) => {
        if (!nickname.trim()) {
            setError('Skriv inn et navn først.');
            return;
        }
        const targetCode = codeToJoin;
        if (!targetCode.trim()) {
            setError('Ugyldig rom-kode.');
            return;
        }
        if (!peer) return;

        setLoading(true);
        setError(null);
        try {
            localStorage.setItem('mp_nickname', nickname);
            await MatchmakingService.joinRoom(targetCode, nickname, peer.id, passAttempt);
            setActiveRoomCode(targetCode.toUpperCase());
            setIsHost(false);
            setSelectedRoom(null);
            setJoinPassword('');
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
                className="pixel-panel w-full max-w-md bg-[#2a1a10] border-4 border-[#4a2e1d] p-6 text-[#fde68a] relative"
            >
                <h2 className="font-fantasy text-3xl mb-6 text-center tracking-wider text-amber-200">
                    FLERSPILLER
                </h2>

                {error && (
                    <div className="bg-red-900/50 border-2 border-red-500 p-2 mb-4 text-sm text-center text-red-100">
                        {error}
                    </div>
                )}

                {!activeRoomCode ? (
                    <div className="space-y-4">
                        <div className="mb-2">
                            <label className="block text-xs uppercase mb-1 opacity-70 flex justify-between">
                                <span>Ditt Navn</span>
                            </label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                maxLength={15}
                                className="w-full bg-black/40 border-2 border-[#4a2e1d] p-2 text-amber-100 outline-none focus:border-amber-500 transition-colors"
                                placeholder="Skriv navn..."
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b-2 border-[#4a2e1d] mb-4">
                            <button
                                className={`flex-1 py-2 text-xs uppercase tracking-wider font-bold transition-colors ${activeTab === 'list' ? 'text-amber-300 border-b-2 border-amber-500 bg-amber-900/20' : 'text-stone-500 hover:text-stone-300'}`}
                                onClick={() => setActiveTab('list')}
                            >
                                Servere
                            </button>
                            <button
                                className={`flex-1 py-2 text-xs uppercase tracking-wider font-bold transition-colors ${activeTab === 'create' ? 'text-amber-300 border-b-2 border-amber-500 bg-amber-900/20' : 'text-stone-500 hover:text-stone-300'}`}
                                onClick={() => setActiveTab('create')}
                            >
                                Opprett Rom
                            </button>
                        </div>

                        {activeTab === 'list' && (
                            <div className="space-y-4">
                                <div className="max-h-56 min-h-[14rem] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {Object.entries(lobbies).length === 0 ? (
                                        <div className="text-center p-8 border-2 border-dashed border-[#4a2e1d] text-stone-500 flex flex-col items-center justify-center h-full">
                                            Ingen aktive servere funnet.
                                            <p className="text-xs mt-2 opacity-50">Prøv å opprette et eget rom!</p>
                                        </div>
                                    ) : (
                                        Object.entries(lobbies).map(([id, room]) => {
                                            const isFull = Object.keys(room.players || {}).length >= 4;
                                            return (
                                                <div key={id} className="bg-black/30 border border-[#4a2e1d] p-3 flex justify-between items-center group hover:border-amber-700 transition-colors">
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-amber-200 truncate pr-2" title={room.roomName}>{room.roomName}</div>
                                                        <div className="text-[10px] text-stone-400 truncate">Host: {room.hostName}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-xs font-mono bg-black/50 px-1 py-0.5 border border-[#4a2e1d] text-stone-400">
                                                            {id}
                                                        </div>
                                                        <div className="text-sm text-stone-300 flex items-center gap-1 w-12 justify-end">
                                                            {room.hasPassword && <span title="Krever passord">🔒</span>}
                                                            <span className={isFull ? 'text-red-400' : 'text-green-400'}>{Object.keys(room.players || {}).length}/4</span>
                                                        </div>
                                                        <button
                                                            className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors ${isFull ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-amber-800 text-white hover:bg-amber-600'}`}
                                                            onClick={() => !isFull && handleJoinServerClick(id, room)}
                                                            disabled={isFull || loading}
                                                        >
                                                            {isFull ? 'Fullt' : 'Bli Med'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                            </div>
                        )}

                        {activeTab === 'create' && (
                            <div className="space-y-4">
                                <div className="bg-white/5 p-4 border border-white/10 rounded space-y-4 min-h-[14rem] flex flex-col justify-center">
                                    <div>
                                        <label className="block text-xs uppercase mb-1 opacity-70">Rom Navn (Valgfritt)</label>
                                        <input
                                            type="text"
                                            value={roomName}
                                            onChange={(e) => setRoomName(e.target.value)}
                                            maxLength={20}
                                            className="w-full bg-black/40 border-2 border-[#4a2e1d] p-2 text-amber-100 outline-none focus:border-amber-500 transition-colors"
                                            placeholder={`${nickname || 'Min'}s server`}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="hasPassword"
                                            checked={hasPassword}
                                            onChange={(e) => setHasPassword(e.target.checked)}
                                            className="w-4 h-4 accent-amber-600"
                                        />
                                        <label htmlFor="hasPassword" className="text-xs uppercase text-stone-300 select-none cursor-pointer">Krever passord for å bli med</label>
                                    </div>

                                    <AnimatePresence>
                                        {hasPassword && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pt-2">
                                                    <label className="block text-xs uppercase mb-1 opacity-70 text-red-200">Passord</label>
                                                    <input
                                                        type="text"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        maxLength={12}
                                                        className="w-full bg-black/40 border-2 border-red-900/50 p-2 text-amber-100 outline-none focus:border-red-500 transition-colors"
                                                        placeholder="Hemmelig passord..."
                                                    />
                                                    <p className="text-[9px] text-red-400 mt-1 uppercase text-right">Sendes ukryptert via P2P</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="pt-4 mt-auto">
                                        <FantasyButton
                                            label={loading ? "Vennligst vent..." : "Opprett Server"}
                                            variant="primary"
                                            onClick={handleCreateRoom}
                                            disabled={loading}
                                            className="w-full py-3"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full text-xs uppercase opacity-50 hover:opacity-100 transition-opacity mt-4 pt-2 border-t border-[#4a2e1d]"
                        >
                            Lukk Meny
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs uppercase opacity-70">{currentRoom?.roomName || 'Rom'}</p>
                            <h3 className="text-5xl font-bold tracking-tighter text-amber-400 drop-shadow-lg">
                                {activeRoomCode}
                            </h3>
                            {currentRoom?.hasPassword && <div className="text-xs text-red-300 mt-1">🔒 Passordbeskyttet</div>}
                        </div>

                        <div className="bg-black/30 p-4 border-2 border-[#4a2e1d]">
                            <p className="text-xs uppercase mb-2 opacity-70 flex justify-between">
                                <span>Spillere ({Object.keys(currentRoom?.players || {}).length}/4)</span>
                            </p>
                            <ul className="space-y-2 min-h-[8rem]">
                                {currentRoom && Object.values(currentRoom.players).map((p, idx) => (
                                    <motion.li
                                        key={p.peerId}
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center gap-2 bg-black/20 p-2 border border-white/5"
                                    >
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className={p.peerId === peer?.id ? "text-amber-200 font-bold" : "text-white"}>
                                            {p.name} {p.peerId === currentRoom.hostId && <span className="text-[10px] text-amber-500 font-bold ml-1 border border-amber-500/50 px-1 rounded-sm">HOST</span>}
                                        </span>
                                    </motion.li>
                                ))}
                                {/* Render empty slots */}
                                {Array.from({ length: Math.max(0, 4 - Object.keys(currentRoom?.players || {}).length) }).map((_, i) => (
                                    <li key={`empty-${i}`} className="flex items-center gap-2 p-2 border border-white/5 border-dashed opacity-30">
                                        <div className="w-2 h-2 bg-stone-500 rounded-full" />
                                        <span className="text-stone-400 text-sm">Venter på spiller...</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            {isHost ? (
                                <FantasyButton
                                    label={`Start Kampen (${Object.keys(currentRoom?.players || {}).length}/4)`}
                                    variant="primary"
                                    onClick={handleStartMatch}
                                    className="w-full py-4 text-xl"
                                    disabled={Object.keys(currentRoom?.players || {}).length < 1}
                                />
                            ) : (
                                <div className="text-center py-4 bg-black/40 border border-amber-900/50 text-amber-200 uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                                    <span className="animate-pulse">●</span> Venter på Host <span className="animate-pulse">●</span>
                                </div>
                            )}

                            <button
                                onClick={handleCancel}
                                className="text-xs uppercase opacity-70 hover:opacity-100 transition-opacity text-stone-400"
                            >
                                {isHost ? 'Oppløs Rom' : 'Forlat Rom'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Returnerer Modellen for Passord Request */}
                <AnimatePresence>
                    {selectedRoom && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 border-4 border-[#4a2e1d]"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full bg-[#2a1a10] border-2 border-red-900 p-6 shadow-2xl relative"
                            >
                                <h3 className="text-xl text-center text-red-400 font-bold mb-1 tracking-wider uppercase">Låst Server</h3>
                                <p className="text-xs text-center text-stone-400 mb-6">"{selectedRoom.name}" krever passord.</p>
                                <input
                                    type="password"
                                    value={joinPassword}
                                    onChange={(e) => setJoinPassword(e.target.value)}
                                    className="w-full bg-black/60 border-2 border-red-900 p-3 text-white text-center tracking-widest outline-none focus:border-red-500 mb-6"
                                    placeholder="SKRIV PASSORD"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom(selectedRoom.id, joinPassword)}
                                />
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs uppercase font-bold text-stone-400 transition-colors"
                                        onClick={() => {
                                            setSelectedRoom(null);
                                            setJoinPassword('');
                                        }}
                                    >
                                        Avbryt
                                    </button>
                                    <FantasyButton
                                        label={loading ? "..." : "Lås Opp"}
                                        variant="primary"
                                        className="flex-1"
                                        onClick={() => handleJoinRoom(selectedRoom.id, joinPassword)}
                                        disabled={loading || !joinPassword.trim()}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

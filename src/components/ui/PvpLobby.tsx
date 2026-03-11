import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { PvpMatchmakingService, type PvpPlayerEntry, type PvpChallenge } from '../../services/PvpMatchmaking';
import { Pvp2v2MatchmakingService, type Pvp2v2Room, type Pvp2v2SlotId } from '../../services/Pvp2v2Matchmaking';
import { CLASS_CONFIGS, type ClassId } from '../../config/classes';
import Peer from 'peerjs';

interface PvpLobbyProps {
    isOpen: boolean;
    onClose: () => void;
    onStartPvp: (
        role: 'host' | 'client',
        peer: Peer,
        nickname: string,
        hostPeerId: string,
        bestOf: 3 | 5 | 7 | 10,
        opponentName: string,
        classId: ClassId
    ) => void;
    onStartPvp2v2?: (
        role: 'host' | 'client',
        peer: Peer,
        nickname: string,
        hostPeerId: string,
        bestOf: 3 | 5 | 7 | 10,
        classId: ClassId,
        teamAssignments: Record<string, 'A' | 'B'>,
        mySlot: Pvp2v2SlotId
    ) => void;
}

const CLASS_OPTIONS: { id: ClassId; label: string }[] = [
    { id: 'krieger', label: 'Krieger' },
    { id: 'archer', label: 'Archer' },
    { id: 'wizard', label: 'Wizard' },
    { id: 'skald', label: 'Skald' },
];

const BEST_OF_OPTIONS: (3 | 5 | 7 | 10)[] = [3, 5, 7, 10];

type ActiveTab = '1v1' | '2v2';
type Tab2v2View = 'browse' | 'in_room';

export const PvpLobby: React.FC<PvpLobbyProps> = ({ isOpen, onClose, onStartPvp, onStartPvp2v2 }) => {
    // Shared state
    const [nickname, setNickname] = useState(localStorage.getItem('pvp_nickname') || '');
    const [selectedClass, setSelectedClass] = useState<ClassId>('krieger');
    const [peer, setPeer] = useState<Peer | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [activeTab, setActiveTab] = useState<ActiveTab>('1v1');

    // 1v1 state
    const [players, setPlayers] = useState<Record<string, PvpPlayerEntry>>({});
    const [pendingChallenge, setPendingChallenge] = useState<{ id: string; challenge: PvpChallenge } | null>(null);
    const [sentChallengeId, setSentChallengeId] = useState<string | null>(null);
    const [waitingForResponse, setWaitingForResponse] = useState(false);
    const [challengeTarget, setChallengeTarget] = useState<{ peerId: string; name: string } | null>(null);
    const [composerBestOf, setComposerBestOf] = useState<3 | 5 | 7 | 10>(3);

    // 2v2 state
    const [tab2v2View, setTab2v2View] = useState<Tab2v2View>('browse');
    const [openRooms, setOpenRooms] = useState<Record<string, Pvp2v2Room>>({});
    const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
    const [currentRoom, setCurrentRoom] = useState<Pvp2v2Room | null>(null);
    const [mySlot, setMySlot] = useState<Pvp2v2SlotId | null>(null);
    const [createBestOf, setCreateBestOf] = useState<3 | 5 | 7 | 10>(5);
    const [isLocalReady, setIsLocalReady] = useState(false);
    const [joining2v2Code, setJoining2v2Code] = useState('');

    const unsubPlayersRef = useRef<(() => void) | null>(null);
    const unsubChallengesRef = useRef<(() => void) | null>(null);
    const unsubSentChallengeRef = useRef<(() => void) | null>(null);
    const unsubRoom2v2Ref = useRef<(() => void) | null>(null);
    const unsubOpenRoomsRef = useRef<(() => void) | null>(null);
    const peerRef = useRef<Peer | null>(null);

    // Initialize PeerJS
    useEffect(() => {
        if (!isOpen) {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
                setPeer(null);
            }
            return;
        }
        if (peerRef.current) return;

        const newPeer = new Peer();
        peerRef.current = newPeer;

        const timeout = setTimeout(() => {
            if (peerRef.current === newPeer) {
                setError('Tidsoversikt ved tilkobling. Prøv igjen.');
                newPeer.destroy();
                peerRef.current = null;
            }
        }, 10000);

        newPeer.on('open', () => { clearTimeout(timeout); setPeer(newPeer); });
        newPeer.on('error', (err) => {
            clearTimeout(timeout);
            console.error('[PvP] Peer error:', err.type, err);
            setError('Kunne ikke koble til P2P-nettverket. Prøv igjen.');
            newPeer.destroy();
            if (peerRef.current === newPeer) peerRef.current = null;
        });

        return () => clearTimeout(timeout);
    }, [isOpen, retryKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            unsubPlayersRef.current?.();
            unsubChallengesRef.current?.();
            unsubSentChallengeRef.current?.();
            unsubRoom2v2Ref.current?.();
            unsubOpenRoomsRef.current?.();
            if (peer?.id) {
                PvpMatchmakingService.unregisterPlayer(peer.id).catch(() => {});
                PvpMatchmakingService.cleanupPlayerChallenges(peer.id).catch(() => {});
            }
        };
    }, [peer]);

    // Subscribe to open 2v2 rooms when on 2v2 tab
    useEffect(() => {
        if (activeTab !== '2v2' || !isRegistered || tab2v2View !== 'browse') {
            unsubOpenRoomsRef.current?.();
            unsubOpenRoomsRef.current = null;
            return;
        }
        unsubOpenRoomsRef.current = Pvp2v2MatchmakingService.subscribeToOpenRooms((rooms) => {
            setOpenRooms(rooms);
        });
        return () => { unsubOpenRoomsRef.current?.(); unsubOpenRoomsRef.current = null; };
    }, [activeTab, isRegistered, tab2v2View]);

    const handleRegister = async () => {
        if (!peer?.id || !nickname.trim()) return;
        setLoading(true);
        setError(null);
        try {
            localStorage.setItem('pvp_nickname', nickname.trim());
            await PvpMatchmakingService.registerPlayer(nickname.trim(), peer.id, selectedClass);
            setIsRegistered(true);

            unsubPlayersRef.current = PvpMatchmakingService.subscribeToPlayers((p) => setPlayers(p));
            unsubChallengesRef.current = PvpMatchmakingService.subscribeToChallenges(peer.id, (challenges) => {
                const entries = Object.entries(challenges);
                if (entries.length > 0) {
                    const [id, challenge] = entries[0];
                    setPendingChallenge({ id, challenge });
                }
            });
        } catch (e: any) {
            setError(e.message || 'Kunne ikke registrere.');
        }
        setLoading(false);
    };

    const handleClassChange = async (classId: ClassId) => {
        setSelectedClass(classId);
        if (isRegistered && peer?.id) {
            await PvpMatchmakingService.updatePlayerClass(peer.id, classId).catch(() => {});
        }
        // Update class in 2v2 room if in one
        if (currentRoomCode && mySlot) {
            await Pvp2v2MatchmakingService.updateSlotClass(currentRoomCode, mySlot, classId).catch(() => {});
        }
    };

    // ─── 1v1 Logic ────────────────────────────────────────────────────

    function openChallengeComposer(targetPeerId: string, targetName: string) {
        setComposerBestOf(3);
        setChallengeTarget({ peerId: targetPeerId, name: targetName });
    }

    const handleSendChallenge = async () => {
        if (!peer?.id || !challengeTarget) return;
        const { peerId: targetPeerId, name: targetName } = challengeTarget;
        setChallengeTarget(null);
        setWaitingForResponse(true);
        setError(null);
        try {
            const challengeId = await PvpMatchmakingService.sendChallenge(peer.id, nickname.trim(), targetPeerId, targetName, composerBestOf);
            setSentChallengeId(challengeId);
            unsubSentChallengeRef.current = PvpMatchmakingService.subscribeToChallenge(challengeId, (ch) => {
                if (!ch) { setWaitingForResponse(false); setSentChallengeId(null); return; }
                if (ch.status === 'accepted') {
                    handleStartMatch('host', targetPeerId, targetName, ch.bestOf);
                    PvpMatchmakingService.removeChallenge(challengeId).catch(() => {});
                } else if (ch.status === 'rejected') {
                    setWaitingForResponse(false);
                    setSentChallengeId(null);
                    setError(`${targetName} avslo utfordringen.`);
                    PvpMatchmakingService.removeChallenge(challengeId).catch(() => {});
                }
            });
        } catch (e: any) {
            setWaitingForResponse(false);
            setError(e.message || 'Kunne ikke sende utfordring.');
        }
    };

    const handleAcceptChallenge = async () => {
        if (!pendingChallenge || !peer) return;
        const { id, challenge } = pendingChallenge;
        await PvpMatchmakingService.respondToChallenge(id, true);
        setPendingChallenge(null);
        handleStartMatch('client', challenge.challengerPeerId, challenge.challengerName, challenge.bestOf);
        PvpMatchmakingService.removeChallenge(id).catch(() => {});
    };

    const handleRejectChallenge = async () => {
        if (!pendingChallenge) return;
        await PvpMatchmakingService.respondToChallenge(pendingChallenge.id, false);
        setPendingChallenge(null);
    };

    const handleCancelChallenge = async () => {
        if (sentChallengeId) {
            await PvpMatchmakingService.removeChallenge(sentChallengeId).catch(() => {});
            unsubSentChallengeRef.current?.();
            setSentChallengeId(null);
        }
        setWaitingForResponse(false);
    };

    const handleStartMatch = (role: 'host' | 'client', opponentPeerId: string, opponentName: string, matchBestOf: 3 | 5 | 7 | 10) => {
        if (!peer) return;
        unsubPlayersRef.current?.();
        unsubChallengesRef.current?.();
        unsubSentChallengeRef.current?.();
        PvpMatchmakingService.setPlayerInMatch(peer.id).catch(() => {});
        peerRef.current = null;
        onStartPvp(role, peer, nickname.trim(), opponentPeerId, matchBestOf, opponentName, selectedClass);
    };

    // ─── 2v2 Logic ────────────────────────────────────────────────────

    const handleCreate2v2Room = async () => {
        if (!peer?.id || !nickname.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const code = await Pvp2v2MatchmakingService.createRoom(nickname.trim(), peer.id, selectedClass, createBestOf);
            setCurrentRoomCode(code);
            setMySlot('A1');
            setIsLocalReady(false);
            subscribeToRoom(code);
            setTab2v2View('in_room');
        } catch (e: any) {
            setError(e.message || 'Kunne ikke opprette rom.');
        }
        setLoading(false);
    };

    const handleJoin2v2Room = async (code: string, teamPref: 'A' | 'B' = 'A') => {
        if (!peer?.id || !nickname.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const { slotId } = await Pvp2v2MatchmakingService.joinRoom(code, nickname.trim(), peer.id, selectedClass, teamPref);
            setCurrentRoomCode(code);
            setMySlot(slotId);
            setIsLocalReady(false);
            subscribeToRoom(code);
            setTab2v2View('in_room');
        } catch (e: any) {
            setError(e.message || e);
        }
        setLoading(false);
    };

    const subscribeToRoom = (code: string) => {
        unsubRoom2v2Ref.current?.();
        unsubRoom2v2Ref.current = Pvp2v2MatchmakingService.subscribeToRoom(code, (data) => {
            setCurrentRoom(data);
            if (data?.status === 'in_match') {
                handleStart2v2Match(data, code);
            }
        });
    };

    const handleToggleReady = async () => {
        if (!currentRoomCode || !mySlot) return;
        const next = !isLocalReady;
        setIsLocalReady(next);
        await Pvp2v2MatchmakingService.setSlotReady(currentRoomCode, mySlot, next).catch(() => {});
    };

    const handleStartKamp = async () => {
        if (!currentRoomCode) return;
        await Pvp2v2MatchmakingService.startMatch(currentRoomCode).catch(() => {});
    };

    const handleLeave2v2Room = async () => {
        if (currentRoomCode && mySlot) {
            if (mySlot === 'A1') {
                await Pvp2v2MatchmakingService.deleteRoom(currentRoomCode).catch(() => {});
            } else {
                await Pvp2v2MatchmakingService.leaveSlot(currentRoomCode, mySlot).catch(() => {});
            }
        }
        unsubRoom2v2Ref.current?.();
        unsubRoom2v2Ref.current = null;
        setCurrentRoomCode(null);
        setCurrentRoom(null);
        setMySlot(null);
        setIsLocalReady(false);
        setTab2v2View('browse');
    };

    const handleStart2v2Match = (room: Pvp2v2Room, code: string) => {
        if (!peer || !mySlot || !onStartPvp2v2) return;
        const slots = room.slots;
        const teams: Record<string, 'A' | 'B'> = {};
        (['A1', 'A2', 'B1', 'B2'] as Pvp2v2SlotId[]).forEach(sid => {
            const slot = slots[sid];
            if (slot) teams[slot.peerId] = slot.team;
        });
        const hostPeerId = slots.A1?.peerId || peer.id;
        const role: 'host' | 'client' = mySlot === 'A1' ? 'host' : 'client';

        unsubRoom2v2Ref.current?.();
        unsubRoom2v2Ref.current = null;
        peerRef.current = null;

        onStartPvp2v2(role, peer, nickname.trim(), hostPeerId, room.bestOf, selectedClass, teams, mySlot);
        void code; // code is captured in closure, used above
    };

    const handleLeave = async () => {
        unsubPlayersRef.current?.();
        unsubChallengesRef.current?.();
        unsubSentChallengeRef.current?.();
        if (sentChallengeId) await PvpMatchmakingService.removeChallenge(sentChallengeId).catch(() => {});
        if (peer?.id) {
            await PvpMatchmakingService.unregisterPlayer(peer.id).catch(() => {});
            await PvpMatchmakingService.cleanupPlayerChallenges(peer.id).catch(() => {});
        }
        if (currentRoomCode && mySlot) await handleLeave2v2Room();
        setIsRegistered(false);
        setWaitingForResponse(false);
        setSentChallengeId(null);
        setPendingChallenge(null);
        setChallengeTarget(null);
        onClose();
    };

    if (!isOpen) return null;

    const otherPlayers = Object.entries(players).filter(([id]) => id !== peer?.id);

    // 2v2 room helpers
    const allSlotsFilled = currentRoom && ['A1', 'A2', 'B1', 'B2'].every(s => currentRoom.slots[s as Pvp2v2SlotId] !== null);
    const allReady = currentRoom && ['A1', 'A2', 'B1', 'B2'].every(s => currentRoom.slots[s as Pvp2v2SlotId]?.ready === true);

    const slotColor = (slot: 'A1' | 'A2' | 'B1' | 'B2') =>
        slot.startsWith('A') ? 'border-green-600/50 bg-green-900/20' : 'border-red-600/50 bg-red-900/20';
    const slotTeamLabel = (slot: Pvp2v2SlotId) => slot.startsWith('A') ? 'A' : 'B';

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <FantasyPanel className="w-[480px] max-h-[90vh] flex flex-col items-center overflow-hidden">
                    {/* Header */}
                    <div className="flex-shrink-0 w-full text-center py-4 px-6">
                        <h2 className="font-fantasy text-3xl text-amber-200 tracking-wider"
                            style={{ textShadow: '2px 2px 0 #000' }}>
                            PVP Arena
                        </h2>

                        {/* Tab Bar */}
                        <div className="flex mt-3 rounded overflow-hidden border border-amber-800/40">
                            {(['1v1', '2v2'] as ActiveTab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 text-sm font-medium transition-all ${
                                        activeTab === tab
                                            ? 'bg-amber-700/60 text-amber-100'
                                            : 'bg-black/30 text-amber-500 hover:bg-amber-900/30'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 w-full overflow-y-auto px-6 pb-4">

                        {/* Registration Form (shared for both tabs) */}
                        {!isRegistered ? (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-stone-700 text-sm mb-1 block">Navn</label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        maxLength={16}
                                        placeholder="Skriv inn ditt navn..."
                                        className="w-full px-3 py-2 rounded bg-black/40 border border-amber-800/50 text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-stone-700 text-sm mb-2 block">Klasse</label>
                                    <div className="flex gap-2">
                                        {CLASS_OPTIONS.map(({ id, label }) => (
                                            <button
                                                key={id}
                                                onClick={() => handleClassChange(id)}
                                                className={`flex-1 px-3 py-2 rounded border text-sm transition-all ${
                                                    selectedClass === id
                                                        ? 'bg-amber-700/60 border-amber-500 text-amber-100'
                                                        : 'bg-black/30 border-amber-800/30 text-amber-500 hover:border-amber-600/50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    {CLASS_CONFIGS[selectedClass] && (
                                        <p className="text-stone-800 text-xs mt-2">
                                            {CLASS_CONFIGS[selectedClass].description || ''}
                                        </p>
                                    )}
                                </div>
                                {error && (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-red-400 text-sm text-center">{error}</p>
                                        {!peer && (
                                            <button
                                                onClick={() => { setError(null); setRetryKey(k => k + 1); }}
                                                className="text-sm text-amber-400 underline hover:text-amber-200 transition-colors"
                                            >
                                                Prøv igjen
                                            </button>
                                        )}
                                    </div>
                                )}
                                <FantasyButton
                                    label={loading ? 'Kobler til...' : (!peer && !error ? 'Kobler til...' : 'Gå inn i arenaen')}
                                    variant="primary"
                                    onClick={handleRegister}
                                    disabled={!nickname.trim() || !peer || loading}
                                    className="w-full"
                                />
                            </div>
                        ) : activeTab === '1v1' ? (
                            /* 1v1 Player List */
                            <div className="flex flex-col gap-2">
                                {otherPlayers.length === 0 ? (
                                    <div className="text-center py-8 text-stone-600">
                                        <p className="text-lg mb-2">Ingen andre spillere i arenaen...</p>
                                        <p className="text-sm">Vent til noen utfordrer deg!</p>
                                    </div>
                                ) : (
                                    otherPlayers.map(([id, player]) => (
                                        <button
                                            key={id}
                                            onClick={() => openChallengeComposer(id, player.name)}
                                            disabled={waitingForResponse || !!challengeTarget}
                                            className={`w-full flex items-center justify-between p-3 rounded border transition-all ${
                                                waitingForResponse || !!challengeTarget
                                                    ? 'bg-black/20 border-amber-800/20 cursor-not-allowed opacity-50'
                                                    : 'bg-black/30 border-amber-800/40 hover:bg-amber-900/30 hover:border-amber-500/60 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-amber-100 font-medium">{player.name}</span>
                                            </div>
                                            <span className="text-amber-400 text-sm capitalize">
                                                {CLASS_OPTIONS.find(c => c.id === player.classId)?.label || player.classId}
                                            </span>
                                        </button>
                                    ))
                                )}

                                {challengeTarget && !waitingForResponse && (
                                    <div className="mt-3 p-4 rounded border border-amber-600/50 bg-amber-900/20">
                                        <p className="text-stone-800 text-sm font-medium text-center mb-3">
                                            Du utfordrer{' '}
                                            <span className="text-stone-900 font-bold">{challengeTarget.name}</span>
                                        </p>
                                        <div className="mb-3">
                                            <label className="text-stone-700 text-xs mb-2 block text-center">Best of</label>
                                            <div className="flex gap-2">
                                                {BEST_OF_OPTIONS.map((n) => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setComposerBestOf(n)}
                                                        className={`flex-1 px-3 py-2 rounded border text-sm transition-all ${
                                                            composerBestOf === n
                                                                ? 'bg-amber-700/60 border-amber-500 text-amber-100'
                                                                : 'bg-black/30 border-amber-800/30 text-amber-500 hover:border-amber-600/50'
                                                        }`}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSendChallenge}
                                                className="flex-1 px-3 py-2 rounded border border-amber-500 bg-amber-700/60 text-amber-100 text-sm hover:bg-amber-600/70 transition-all"
                                            >
                                                Send utfordring
                                            </button>
                                            <button
                                                onClick={() => setChallengeTarget(null)}
                                                className="flex-1 px-3 py-2 rounded border border-amber-800/40 bg-black/30 text-amber-500 text-sm hover:border-amber-600/50 transition-all"
                                            >
                                                Avbryt
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {waitingForResponse && (
                                    <div className="text-center py-4">
                                        <p className="text-stone-700 animate-pulse">Venter på svar...</p>
                                        <FantasyButton label="Avbryt" variant="secondary" onClick={handleCancelChallenge} className="mt-2" />
                                    </div>
                                )}
                                {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
                            </div>
                        ) : (
                            /* 2v2 Content */
                            <div className="flex flex-col gap-3">
                                {tab2v2View === 'browse' ? (
                                    <>
                                        {/* Create room section */}
                                        <div className="p-3 rounded border border-amber-700/40 bg-amber-900/10">
                                            <p className="text-stone-700 text-sm font-medium mb-2">Opprett rom</p>
                                            <div className="flex gap-1 mb-2">
                                                {BEST_OF_OPTIONS.map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setCreateBestOf(n)}
                                                        className={`flex-1 py-1 rounded border text-xs transition-all ${
                                                            createBestOf === n
                                                                ? 'bg-amber-700/60 border-amber-500 text-amber-100'
                                                                : 'bg-black/30 border-amber-800/30 text-amber-500 hover:border-amber-600/50'
                                                        }`}
                                                    >
                                                        Bo{n}
                                                    </button>
                                                ))}
                                            </div>
                                            <FantasyButton
                                                label={loading ? 'Oppretter...' : 'Opprett rom'}
                                                variant="primary"
                                                onClick={handleCreate2v2Room}
                                                disabled={loading}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Join by code */}
                                        <div className="p-3 rounded border border-amber-700/40 bg-amber-900/10">
                                            <p className="text-stone-700 text-sm font-medium mb-2">Bli med via kode</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={joining2v2Code}
                                                    onChange={e => setJoining2v2Code(e.target.value.toUpperCase())}
                                                    maxLength={4}
                                                    placeholder="KODE"
                                                    className="flex-1 px-3 py-2 rounded bg-black/40 border border-amber-800/50 text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-500 uppercase text-sm"
                                                />
                                                <button
                                                    onClick={() => handleJoin2v2Room(joining2v2Code, 'A')}
                                                    disabled={joining2v2Code.length < 4 || loading}
                                                    className="px-3 py-2 rounded border border-amber-500 bg-amber-700/60 text-amber-100 text-sm hover:bg-amber-600/70 transition-all disabled:opacity-50"
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        </div>

                                        {/* Open rooms list */}
                                        <div>
                                            <p className="text-stone-600 text-xs mb-2">Åpne rom</p>
                                            {Object.keys(openRooms).length === 0 ? (
                                                <p className="text-stone-600 text-sm text-center py-4">Ingen åpne rom...</p>
                                            ) : (
                                                Object.entries(openRooms).map(([code, room]) => {
                                                    const filledCount = ['A1', 'A2', 'B1', 'B2'].filter(s => room.slots[s as Pvp2v2SlotId] !== null).length;
                                                    return (
                                                        <div key={code} className="flex items-center justify-between p-2 rounded border border-amber-800/30 bg-black/20 mb-1">
                                                            <div>
                                                                <span className="text-amber-200 text-sm font-medium">{room.hostName}s rom</span>
                                                                <span className="text-stone-500 text-xs ml-2">{code} · Bo{room.bestOf} · {filledCount}/4</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleJoin2v2Room(code, 'A')}
                                                                    disabled={loading || filledCount >= 4}
                                                                    className="px-2 py-1 rounded border border-green-600/50 text-green-400 text-xs hover:bg-green-900/30 disabled:opacity-40 transition-all"
                                                                >
                                                                    Team A
                                                                </button>
                                                                <button
                                                                    onClick={() => handleJoin2v2Room(code, 'B')}
                                                                    disabled={loading || filledCount >= 4}
                                                                    className="px-2 py-1 rounded border border-red-600/50 text-red-400 text-xs hover:bg-red-900/30 disabled:opacity-40 transition-all"
                                                                >
                                                                    Team B
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                                    </>
                                ) : (
                                    /* In Room View */
                                    currentRoom && (
                                        <div className="flex flex-col gap-3">
                                            {/* Room code */}
                                            <div className="text-center">
                                                <p className="text-stone-600 text-xs">Romkode</p>
                                                <p className="text-amber-200 font-fantasy text-3xl tracking-widest"
                                                    style={{ textShadow: '2px 2px 0 #000' }}>
                                                    {currentRoomCode}
                                                </p>
                                            </div>

                                            {/* Slot grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['A1', 'A2', 'B1', 'B2'] as Pvp2v2SlotId[]).map(sid => {
                                                    const slot = currentRoom.slots[sid];
                                                    const isMe = slot?.peerId === peer?.id;
                                                    return (
                                                        <div
                                                            key={sid}
                                                            className={`p-3 rounded border ${slotColor(sid)} flex flex-col gap-1`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-stone-500">
                                                                    Team {slotTeamLabel(sid)} · {sid}
                                                                </span>
                                                                {slot?.ready && (
                                                                    <span className="text-xs text-green-400">✓ Klar</span>
                                                                )}
                                                            </div>
                                                            {slot ? (
                                                                <>
                                                                    <p className={`text-sm font-medium ${isMe ? 'text-amber-200' : 'text-amber-100'}`}>
                                                                        {slot.name} {isMe && '(deg)'}
                                                                    </p>
                                                                    <p className="text-xs text-stone-500 capitalize">{slot.classId}</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-sm text-stone-600 italic">Ledig...</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Ready + Start buttons */}
                                            <FantasyButton
                                                label={isLocalReady ? '✓ Klar (avmeld)' : 'Meld deg klar'}
                                                variant={isLocalReady ? 'secondary' : 'primary'}
                                                onClick={handleToggleReady}
                                                className="w-full"
                                            />

                                            {mySlot === 'A1' && (
                                                <FantasyButton
                                                    label="Start Kamp"
                                                    variant="primary"
                                                    onClick={handleStartKamp}
                                                    disabled={!allSlotsFilled || !allReady}
                                                    className="w-full"
                                                />
                                            )}

                                            {!allSlotsFilled && (
                                                <p className="text-center text-stone-600 text-xs">
                                                    Venter på {4 - ['A1','A2','B1','B2'].filter(s => currentRoom.slots[s as Pvp2v2SlotId] !== null).length} spiller(e)...
                                                </p>
                                            )}
                                            {allSlotsFilled && !allReady && (
                                                <p className="text-center text-stone-600 text-xs">
                                                    Venter på at alle skal melde seg klare...
                                                </p>
                                            )}

                                            <FantasyButton
                                                label="Forlat rom"
                                                variant="secondary"
                                                onClick={handleLeave2v2Room}
                                                className="w-full"
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 w-full px-6 pb-4">
                        <FantasyButton
                            label={isRegistered ? 'Forlat Arena' : 'Tilbake'}
                            variant="secondary"
                            onClick={handleLeave}
                            className="w-full"
                        />
                    </div>
                </FantasyPanel>

                {/* Incoming 1v1 Challenge Popup */}
                <AnimatePresence>
                    {pendingChallenge && activeTab === '1v1' && (
                        <motion.div
                            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        >
                            <FantasyPanel className="w-[380px] p-6 flex flex-col items-center gap-4">
                                <h3 className="font-fantasy text-2xl text-amber-200" style={{ textShadow: '2px 2px 0 #000' }}>
                                    Utfordring!
                                </h3>
                                <p className="text-stone-800 text-center">
                                    <span className="font-bold text-stone-900">{pendingChallenge.challenge.challengerName}</span>
                                    {' '}utfordrer deg til duell!
                                </p>
                                <p className="text-stone-700 text-sm">Best of {pendingChallenge.challenge.bestOf}</p>
                                <div className="flex gap-3 w-full">
                                    <FantasyButton label="Godta" variant="primary" onClick={handleAcceptChallenge} className="flex-1" />
                                    <FantasyButton label="Avslå" variant="secondary" onClick={handleRejectChallenge} className="flex-1" />
                                </div>
                            </FantasyPanel>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

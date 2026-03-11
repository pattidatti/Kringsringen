import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { PvpMatchmakingService, type PvpPlayerEntry, type PvpChallenge } from '../../services/PvpMatchmaking';
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
}

const CLASS_OPTIONS: { id: ClassId; label: string }[] = [
    { id: 'krieger', label: 'Krieger' },
    { id: 'archer', label: 'Archer' },
    { id: 'wizard', label: 'Wizard' },
    { id: 'skald', label: 'Skald' },
];

const BEST_OF_OPTIONS: (3 | 5 | 7 | 10)[] = [3, 5, 7, 10];

export const PvpLobby: React.FC<PvpLobbyProps> = ({ isOpen, onClose, onStartPvp }) => {
    const [nickname, setNickname] = useState(localStorage.getItem('pvp_nickname') || '');
    const [selectedClass, setSelectedClass] = useState<ClassId>('krieger');
    const [peer, setPeer] = useState<Peer | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [players, setPlayers] = useState<Record<string, PvpPlayerEntry>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    // Challenge state
    const [pendingChallenge, setPendingChallenge] = useState<{ id: string; challenge: PvpChallenge } | null>(null);
    const [sentChallengeId, setSentChallengeId] = useState<string | null>(null);
    const [waitingForResponse, setWaitingForResponse] = useState(false);
    const [challengeTarget, setChallengeTarget] = useState<{ peerId: string; name: string } | null>(null);
    const [composerBestOf, setComposerBestOf] = useState<3 | 5 | 7 | 10>(3);

    const unsubPlayersRef = useRef<(() => void) | null>(null);
    const unsubChallengesRef = useRef<(() => void) | null>(null);
    const unsubSentChallengeRef = useRef<(() => void) | null>(null);
    const peerRef = useRef<Peer | null>(null);

    // Initialize PeerJS
    useEffect(() => {
        if (!isOpen) {
            // Lobby closed — destroy peer unless it was already handed off to the game
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
                setPeer(null);
            }
            return;
        }

        if (peerRef.current) return; // Already initialized

        const newPeer = new Peer();
        peerRef.current = newPeer;

        const timeout = setTimeout(() => {
            if (peerRef.current === newPeer) {
                console.warn('[PvP] Peer initialization timed out');
                setError('Tidsoversikt ved tilkobling. Prøv igjen.');
                newPeer.destroy();
                peerRef.current = null;
            }
        }, 10000);

        newPeer.on('open', () => {
            clearTimeout(timeout);
            setPeer(newPeer);
        });

        newPeer.on('error', (err) => {
            clearTimeout(timeout);
            console.error('[PvP] Peer error:', err.type, err);
            setError('Kunne ikke koble til P2P-nettverket. Prøv igjen.');
            newPeer.destroy();
            if (peerRef.current === newPeer) {
                peerRef.current = null;
            }
        });

        return () => {
            clearTimeout(timeout);
        };
    }, [isOpen, retryKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            unsubPlayersRef.current?.();
            unsubChallengesRef.current?.();
            unsubSentChallengeRef.current?.();
            if (peer?.id) {
                PvpMatchmakingService.unregisterPlayer(peer.id).catch(() => {});
                PvpMatchmakingService.cleanupPlayerChallenges(peer.id).catch(() => {});
            }
        };
    }, [peer]);

    const handleRegister = async () => {
        if (!peer?.id || !nickname.trim()) return;
        setLoading(true);
        setError(null);

        try {
            localStorage.setItem('pvp_nickname', nickname.trim());
            await PvpMatchmakingService.registerPlayer(nickname.trim(), peer.id, selectedClass);
            setIsRegistered(true);

            // Subscribe to player list
            unsubPlayersRef.current = PvpMatchmakingService.subscribeToPlayers((p) => {
                setPlayers(p);
            });

            // Subscribe to incoming challenges
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
    };

    function openChallengeComposer(targetPeerId: string, targetName: string) {
        setComposerBestOf(3);
        setChallengeTarget({ peerId: targetPeerId, name: targetName });
    }

    function handleCancelComposer() {
        setChallengeTarget(null);
    }

    const handleSendChallenge = async () => {
        if (!peer?.id || !challengeTarget) return;
        const { peerId: targetPeerId, name: targetName } = challengeTarget;
        setChallengeTarget(null);
        setWaitingForResponse(true);
        setError(null);

        try {
            const challengeId = await PvpMatchmakingService.sendChallenge(
                peer.id,
                nickname.trim(),
                targetPeerId,
                targetName,
                composerBestOf
            );
            setSentChallengeId(challengeId);

            // Watch the challenge for response
            unsubSentChallengeRef.current = PvpMatchmakingService.subscribeToChallenge(challengeId, (ch) => {
                if (!ch) {
                    // Challenge was removed (opponent disconnected)
                    setWaitingForResponse(false);
                    setSentChallengeId(null);
                    return;
                }

                if (ch.status === 'accepted') {
                    // We are the challenger = host
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

        // We accepted = client, challenger is host
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

        // Cleanup subscriptions
        unsubPlayersRef.current?.();
        unsubChallengesRef.current?.();
        unsubSentChallengeRef.current?.();

        // Mark as in match
        PvpMatchmakingService.setPlayerInMatch(peer.id).catch(() => {});

        // Clear ref so cleanup doesn't destroy the peer after it's handed off to the game
        peerRef.current = null;

        onStartPvp(role, peer, nickname.trim(), opponentPeerId, matchBestOf, opponentName, selectedClass);
    };

    const handleLeave = async () => {
        unsubPlayersRef.current?.();
        unsubChallengesRef.current?.();
        unsubSentChallengeRef.current?.();

        if (sentChallengeId) {
            await PvpMatchmakingService.removeChallenge(sentChallengeId).catch(() => {});
        }

        if (peer?.id) {
            await PvpMatchmakingService.unregisterPlayer(peer.id).catch(() => {});
            await PvpMatchmakingService.cleanupPlayerChallenges(peer.id).catch(() => {});
        }

        setIsRegistered(false);
        setWaitingForResponse(false);
        setSentChallengeId(null);
        setPendingChallenge(null);
        setChallengeTarget(null);
        onClose();
    };

    if (!isOpen) return null;

    const otherPlayers = Object.entries(players).filter(([id]) => id !== peer?.id);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <FantasyPanel className="w-[480px] max-h-[90vh] flex flex-col items-center overflow-hidden">
                    {/* Header */}
                    <div className="flex-shrink-0 w-full text-center py-4 px-6">
                        <h2 className="font-fantasy text-3xl text-amber-200 tracking-wider"
                            style={{ textShadow: '2px 2px 0 #000' }}>
                            PVP Arena
                        </h2>
                        {isRegistered && (
                            <p className="text-stone-700 text-sm mt-1">
                                Klikk på en spiller for å utfordre
                            </p>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 w-full overflow-y-auto px-6 pb-4">
                        {!isRegistered ? (
                            /* Registration form */
                            <div className="flex flex-col gap-4">
                                {/* Name */}
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

                                {/* Class Selection */}
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
                        ) : (
                            /* Player List */
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
                                                onClick={handleCancelComposer}
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
                                        <FantasyButton
                                            label="Avbryt"
                                            variant="secondary"
                                            onClick={handleCancelChallenge}
                                            className="mt-2"
                                        />
                                    </div>
                                )}

                                {error && (
                                    <p className="text-red-400 text-sm text-center mt-2">{error}</p>
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

                {/* Incoming Challenge Popup */}
                <AnimatePresence>
                    {pendingChallenge && (
                        <motion.div
                            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <FantasyPanel className="w-[380px] p-6 flex flex-col items-center gap-4">
                                <h3 className="font-fantasy text-2xl text-amber-200"
                                    style={{ textShadow: '2px 2px 0 #000' }}>
                                    Utfordring!
                                </h3>
                                <p className="text-stone-800 text-center">
                                    <span className="font-bold text-stone-900">{pendingChallenge.challenge.challengerName}</span>
                                    {' '}utfordrer deg til duell!
                                </p>
                                <p className="text-stone-700 text-sm">
                                    Best of {pendingChallenge.challenge.bestOf}
                                </p>
                                <div className="flex gap-3 w-full">
                                    <FantasyButton
                                        label="Godta"
                                        variant="primary"
                                        onClick={handleAcceptChallenge}
                                        className="flex-1"
                                    />
                                    <FantasyButton
                                        label="Avslå"
                                        variant="secondary"
                                        onClick={handleRejectChallenge}
                                        className="flex-1"
                                    />
                                </div>
                            </FantasyPanel>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

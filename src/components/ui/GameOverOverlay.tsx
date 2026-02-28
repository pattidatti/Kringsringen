import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { FantasyButton } from './FantasyButton';
import { HighscoreManager } from '../../config/firebase';
import { SaveManager } from '../../game/SaveManager';
import { getGameInstance } from '../../hooks/useGameRegistry';

/**
 * Inner component: subscribes to all 7 registry keys.
 * Only mounted when the overlay should be visible (hp <= 0 || partyDead).
 * This delays listener creation until needed.
 */
const GameOverContent: React.FC<{ hp: number; partyDead: boolean }> = ({ hp: hpProp, partyDead: partyDeadProp }) => {
    const level = useGameRegistry('gameLevel', 1);
    const wave = useGameRegistry('currentWave', 1);
    const coins = useGameRegistry('playerCoins', 0);
    const isMultiplayer = useGameRegistry('isMultiplayer', false);
    const syncState = useGameRegistry<{ loaded: number, ready: number, expected: number }>('syncState', { loaded: 0, ready: 0, expected: 1 });

    const [playerName, setPlayerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [calculatedRank, setCalculatedRank] = useState<number | null>(null);

    const score = level * 1000 + wave * 100 + coins;

    const [isWaitingRetry, setIsWaitingRetry] = useState(false);

    React.useEffect(() => {
        let isMounted = true;
        const fetchRank = async () => {
            try {
                const scores = await HighscoreManager.fetchHighscores(10);
                if (!isMounted) return;

                let rank = 11;
                for (let i = 0; i < scores.length; i++) {
                    if (score > scores[i].score) {
                        rank = i + 1;
                        break;
                    }
                }

                if (rank === 11 && scores.length < 10) {
                    rank = scores.length + 1;
                }

                if (rank <= 10) {
                    setCalculatedRank(rank);
                }
            } catch (err) {
                console.error("Failed to calculate rank", err);
            }
        };

        fetchRank();

        return () => { isMounted = false; };
    }, [score]);

    const handleSubmitScore = useCallback(async () => {
        const trimmedName = playerName.trim();

        // Validate name
        if (!trimmedName) {
            setSubmitError('Navn kan ikke være tomt');
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            await HighscoreManager.submitScore(
                trimmedName,
                score,
                level,
                wave,
                coins
            );
            setSubmitted(true);
            setSubmitError(null);
            console.log('Score submitted successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Kunne ikke lagre poengsum';
            setSubmitError(errorMessage);
            setSubmitting(false);
            console.error('Failed to submit score:', error);
        }
    }, [playerName, score, level, wave, coins]);

    const handleRestart = useCallback(async () => {
        const trimmedName = playerName.trim();

        // Auto-submit score if name provided and not already submitted
        if (trimmedName && !submitted && !submitting) {
            await handleSubmitScore();
        }

        if (!isMultiplayer) {
            SaveManager.clearRun();
        }

        const game = getGameInstance();
        const mainScene = game?.scene.getScene('MainScene');
        mainScene?.events.emit('request-retry');

        if (isMultiplayer) {
            setIsWaitingRetry(true);
        }
    }, [isMultiplayer, playerName, submitted, submitting, handleSubmitScore]);

    const retryLabel = isMultiplayer
        ? (isWaitingRetry ? `Venter (${syncState.ready}/${syncState.expected})` : 'Prøv Igjen')
        : 'Prøv Igjen';

    return (
        <motion.div
            className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #000000 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
        >
            {/* Blood vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(80,0,0,0.7) 100%)' }}
            />

            {/* Decorative lines */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent" />
            <div className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent" />

            <motion.div
                className="relative flex flex-col items-center gap-6 z-10 w-full max-w-md px-8"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
            >
                {/* Title */}
                <div className="text-center">
                    <motion.h1
                        className="font-cinzel text-8xl tracking-[0.15em] uppercase text-center"
                        style={{
                            color: '#ff2222',
                            textShadow: '0 0 40px rgba(255,0,0,0.9), 0 0 80px rgba(180,0,0,0.5), 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000',
                        }}
                        animate={{ opacity: [1, 0.75, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                    >
                        Falnet
                    </motion.h1>
                    <p className="font-cinzel text-base tracking-[0.35em] text-red-400 uppercase mt-2 text-center">
                        {partyDeadProp ? "Hele følget har falt" : "Din saga ender her"}
                    </p>
                </div>

                {/* Score stats */}
                <div className="w-full border-2 border-red-800/60 bg-black/80 rounded overflow-hidden">
                    <div className="grid grid-cols-3 divide-x-2 divide-red-800/40">
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-cinzel text-sm text-red-400 uppercase tracking-widest">Level</span>
                            <span className="font-cinzel text-5xl text-white">{level}</span>
                        </div>
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-cinzel text-sm text-red-400 uppercase tracking-widest">Fase</span>
                            <span className="font-cinzel text-5xl text-white">{wave}</span>
                        </div>
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-cinzel text-sm text-red-400 uppercase tracking-widest">Gull</span>
                            <span className="font-cinzel text-5xl text-amber-300">{coins}</span>
                        </div>
                    </div>
                    <div className="border-t-2 border-red-800/40 py-4 flex flex-col items-center gap-1 bg-red-950/20">
                        <span className="font-cinzel text-sm text-red-400 uppercase tracking-widest">Score</span>
                        <span className="font-cinzel text-5xl text-white">{score.toLocaleString()}</span>
                    </div>
                </div>

                {/* Name input - Hide for clients in partyDead if they're still alive (ghosts) */}
                {(hpProp <= 0 || !isMultiplayer) && (
                    <div className="w-full flex flex-col gap-2">
                        <label className="font-cinzel text-sm text-red-400 uppercase tracking-widest text-center">
                            Ditt navn
                        </label>
                        <input
                            type="text"
                            maxLength={20}
                            placeholder="Skriv inn navn..."
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            onKeyDown={e => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onKeyUp={e => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            disabled={submitting || submitted}
                            className="w-full bg-black/80 border-2 border-red-800/60 text-white font-cinzel text-base text-center px-4 py-3 rounded outline-none focus:border-red-500 placeholder:text-red-800 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        />

                        {/* Rank Indicator */}
                        {!submitted && calculatedRank !== null && (
                            <motion.p
                                className="text-amber-400 font-cinzel text-sm text-center tracking-widest mt-2"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                Du ligger an til en {calculatedRank}. plass på listen!
                            </motion.p>
                        )}
                    </div>
                )}

                {/* Error message */}
                {submitError && (
                    <motion.p
                        className="text-red-500 font-cinzel text-sm text-center tracking-widest"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {submitError}
                    </motion.p>
                )}

                {/* Buttons */}
                {!submitted && (hpProp <= 0 || !isMultiplayer) ? (
                    <div className="w-full flex gap-4 mt-2">
                        <FantasyButton
                            label="Send Score"
                            variant="secondary"
                            onClick={handleSubmitScore}
                            disabled={submitting || !playerName.trim()}
                            className="flex-1 text-lg"
                        />
                        <FantasyButton
                            label={retryLabel}
                            variant="danger"
                            onClick={handleRestart}
                            disabled={submitting || isWaitingRetry}
                            className="flex-1 text-lg"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        {submitted && (
                            <motion.div
                                className="text-center mb-2 mt-4"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, type: 'spring' }}
                            >
                                <p className="font-cinzel text-green-400 text-lg tracking-widest uppercase mb-1 text-center">
                                    Poengsum lagret!
                                </p>
                                {calculatedRank !== null && (
                                    <p className="font-cinzel text-amber-300 text-md tracking-widest text-center">
                                        Du kom på {calculatedRank}. plass!
                                    </p>
                                )}
                            </motion.div>
                        )}

                        {(partyDeadProp || !isMultiplayer) && (
                            <FantasyButton
                                label={retryLabel}
                                variant="danger"
                                onClick={handleRestart}
                                disabled={isWaitingRetry}
                                className="w-64 text-xl"
                            />
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

/**
 * Outer component: subscribes to hp and partyDead only (low frequency).
 * Only renders GameOverContent when overlay should be visible.
 */
export const GameOverOverlay: React.FC = () => {
    const hp = useGameRegistry('playerHP', 100);
    const isMultiplayer = useGameRegistry('isMultiplayer', false);
    const partyDead = useGameRegistry('partyDead', false);

    // In multiplayer, only show if the whole party is dead.
    // In singleplayer, show if local player is dead (hp <= 0).
    if (isMultiplayer) {
        if (!partyDead) return null;
    } else {
        if (hp > 0) return null;
    }

    return <GameOverContent hp={hp} partyDead={partyDead} />;
};

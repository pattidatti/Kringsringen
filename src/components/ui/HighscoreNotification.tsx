import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HighscoreManager } from '../../config/firebase';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';
import { FantasyIcon } from './FantasyIcon';

interface Threshold {
    rank: number;
    score: number;
}

export const HighscoreNotification: React.FC = () => {
    const level = useGameRegistry('gameLevel', 1);
    const wave = useGameRegistry('currentWave', 1);
    const coins = useGameRegistry('playerCoins', 0);

    // Track HP via ref (not useState) to avoid re-renders on every damage
    const hpRef = useRef(100);
    const currentScore = level * 1000 + wave * 100 + coins;

    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [currentRank, setCurrentRank] = useState<number | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Subscribe to HP changes directly from Phaser (not via useGameRegistry)
    // This avoids triggering re-renders on every damage tick
    useEffect(() => {
        const game = getGameInstance();
        if (!game) return;

        const registry = game.registry;
        hpRef.current = registry.get('playerHP') ?? 100;

        const onHPChange = (_parent: any, newHP: number) => {
            hpRef.current = newHP;
        };

        registry.events.on('changedata-playerHP', onHPChange);

        return () => {
            registry.events.off('changedata-playerHP', onHPChange);
        };
    }, []);

    // Fetch top 25 scores ONCE when component mounts
    useEffect(() => {
        let isMounted = true;

        const fetchThresholds = async () => {
            try {
                const scores = await HighscoreManager.fetchHighscores(25);
                if (!isMounted) return;

                const newThresholds: Threshold[] = scores.map((s, index) => ({
                    rank: index + 1,
                    score: s.score
                }));

                // If less than 25 players on leaderboard, pad it out with 0 score
                // so rank 25 is achievable at 0 score
                if (newThresholds.length < 25) {
                    for (let i = newThresholds.length; i < 25; i++) {
                        newThresholds.push({ rank: i + 1, score: 0 });
                    }
                }

                setThresholds(newThresholds);
                setHasFetched(true);
            } catch (err) {
                console.error("Failed to fetch thresholds statically", err);
            }
        };

        fetchThresholds();

        return () => {
            isMounted = false;
        };
    }, []);

    // Evaluate rank constantly as score changes (but NOT on HP changes)
    useEffect(() => {
        if (!hasFetched || thresholds.length === 0 || hpRef.current <= 0) return;

        // Find the BEST (lowest number) rank the player has beaten
        let bestRankFound: number | null = null;
        for (let i = 0; i < thresholds.length; i++) {
            if (currentScore > thresholds[i].score) {
                bestRankFound = thresholds[i].rank;
                break; // Because array is sorted from highest score (rank 1) to lowest (rank 25)
            }
        }

        if (bestRankFound !== null) {
            // Only update state if rank actually improved (number got smaller)
            // Initial setting: if currentRank is null, just set it
            if (currentRank === null || bestRankFound < currentRank) {
                setCurrentRank(bestRankFound);
                setIsVisible(true);
            }
        }
    }, [currentScore, thresholds, hasFetched, currentRank]);

    // Handle auto-hide timeout
    useEffect(() => {
        if (isVisible && currentRank !== null) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, currentRank]);

    // Don't show anything if dead
    if (hpRef.current <= 0) return null;

    return (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center">
            <AnimatePresence mode="wait">
                {isVisible && currentRank !== null && (
                    <motion.div
                        key={currentRank} // Changing key forces unmount/mount of the animation!
                        initial={{ y: -50, scale: 0.8, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: -20, scale: 1.1, opacity: 0, filter: 'blur(4px)' }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                        className="relative px-8 py-3 bg-gradient-to-r from-amber-900/90 via-black/90 to-amber-900/90 border-y-2 border-amber-500/50 shadow-[0_0_30px_rgba(255,215,0,0.3)] rounded flex items-center gap-4 backdrop-blur-sm"
                    >
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/ui/fantasy/UI_Bars.png')] opacity-10 bg-repeat mix-blend-overlay pointer-events-none" />

                        <motion.div
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                        >
                            <FantasyIcon icon="coin" size="md" className="text-amber-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                        </motion.div>

                        <div className="flex flex-col items-center relative z-10">
                            <span className="font-cinzel text-xs text-amber-200/80 uppercase tracking-[0.2em] font-bold">
                                Highscore Sikret
                            </span>
                            <div className="flex items-end gap-2 text-white">
                                <span className="font-sans font-light text-lg">Du er på</span>
                                <span className="font-black text-3xl text-amber-400 drop-shadow-md leading-none">
                                    {currentRank}.
                                </span>
                                <span className="font-sans font-light text-lg">plass!</span>
                            </div>
                        </div>

                        <motion.div
                            initial={{ rotate: 180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                        >
                            <FantasyIcon icon="coin" size="md" className="text-amber-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

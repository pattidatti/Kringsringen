/**
 * VictoryOverlay – Shown when the player completes Level 10 (final boss).
 * Offers "Ascend" to next Paragon tier or return to menu.
 * Also used for mid-game level-complete celebration when coming from level select.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { getParagonTierName, PARAGON_SCALING } from '../../config/paragon';

interface VictoryOverlayProps {
    paragonLevel: number;
    onAscend: () => void;
    onReturnToMenu: () => void;
}

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
    paragonLevel,
    onAscend,
    onReturnToMenu,
}) => {
    const level = useGameRegistry('gameLevel', 10);
    const coins = useGameRegistry('playerCoins', 0);
    const [isAscending, setIsAscending] = useState(false);

    const currentTier = getParagonTierName(paragonLevel);
    const nextTier = getParagonTierName(paragonLevel + 1);
    const canAscend = paragonLevel < PARAGON_SCALING.maxParagonLevel;
    const isFinalLevel = level >= 10;

    const handleAscend = useCallback(() => {
        setIsAscending(true);
        // Brief animation before ascending
        setTimeout(() => onAscend(), 1500);
    }, [onAscend]);

    if (!isFinalLevel) {
        // Mid-game level complete — simpler overlay
        return (
            <motion.div
                className="absolute inset-0 z-[100] flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at center, #0a1a0a 0%, #000000 100%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <motion.div
                    className="flex flex-col items-center gap-6"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h1
                        className="font-cinzel text-5xl font-bold uppercase tracking-[0.2em] text-emerald-300"
                        style={{ textShadow: '0 0 30px rgba(52,211,153,0.5)' }}
                    >
                        Level {level} Fullfort!
                    </h1>
                    <p className="font-cinzel text-white/50 text-lg tracking-widest">
                        {coins.toLocaleString()} gull samlet
                    </p>
                    <FantasyButton
                        label="Fortsett"
                        variant="primary"
                        onClick={onReturnToMenu}
                        className="w-48 text-lg mt-4"
                    />
                </motion.div>
            </motion.div>
        );
    }

    // Final level complete — full ascension screen
    return (
        <motion.div
            className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #1a1507 0%, #000000 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
        >
            {/* Golden vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180,140,0,0.15) 100%)' }}
            />

            {/* Animated light rays */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-20"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                style={{
                    background: 'conic-gradient(from 0deg, transparent, rgba(251,191,36,0.3), transparent, rgba(251,191,36,0.1), transparent)',
                }}
            />

            {/* Ascension animation overlay */}
            {isAscending && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-50 bg-amber-100"
                    transition={{ duration: 1.5 }}
                />
            )}

            <motion.div
                className="relative flex flex-col items-center gap-8 z-10 w-full max-w-lg px-8"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                {/* Crown / Victory symbol */}
                <motion.div
                    className="text-8xl"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <span className="font-cinzel text-amber-300" style={{ textShadow: '0 0 40px rgba(251,191,36,0.8)' }}>
                        SEIER
                    </span>
                </motion.div>

                {/* Current tier */}
                <div className="text-center">
                    <p className="font-cinzel text-white/40 text-sm uppercase tracking-[0.3em] mb-2">
                        {currentTier} fullfort
                    </p>
                    <motion.h2
                        className="font-cinzel text-6xl font-bold text-amber-200"
                        style={{ textShadow: '0 0 40px rgba(251,191,36,0.6), 3px 3px 0 #000' }}
                        animate={{ opacity: [1, 0.8, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {coins.toLocaleString()} Gull
                    </motion.h2>
                </div>

                {/* Stats summary */}
                <div className="w-full border-2 border-amber-800/40 bg-black/60 rounded overflow-hidden">
                    <div className="grid grid-cols-2 divide-x-2 divide-amber-800/30">
                        <div className="flex flex-col items-center py-4">
                            <span className="font-cinzel text-[10px] text-amber-400/60 uppercase tracking-widest">Paragon</span>
                            <span className="font-cinzel text-4xl text-white">{paragonLevel}</span>
                        </div>
                        <div className="flex flex-col items-center py-4">
                            <span className="font-cinzel text-[10px] text-amber-400/60 uppercase tracking-widest">Neste Tier</span>
                            <span className="font-cinzel text-4xl text-amber-300">{paragonLevel + 1}</span>
                        </div>
                    </div>
                </div>

                {/* Ascension info */}
                {canAscend && (
                    <div className="text-center">
                        <p className="font-cinzel text-white/50 text-sm tracking-widest mb-1">
                            Stig opp til <span className="text-amber-300">{nextTier}</span>
                        </p>
                        <p className="font-cinzel text-white/30 text-xs tracking-widest">
                            Fiender blir sterkere. Oppgraderingene dine beholdes.
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 w-full mt-2">
                    {canAscend && (
                        <FantasyButton
                            label={isAscending ? 'Stiger opp...' : `Stig Opp til ${nextTier}`}
                            variant="primary"
                            onClick={handleAscend}
                            disabled={isAscending}
                            className="w-full text-xl py-3"
                        />
                    )}
                    <FantasyButton
                        label="Tilbake til Meny"
                        variant="secondary"
                        onClick={onReturnToMenu}
                        disabled={isAscending}
                        className="w-full text-base"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * LevelSelectScreen – Allows players to select a previously cleared level to replay,
 * or continue from their current progress.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { LEVEL_CONFIG } from '../../config/levels';
import { getBossForLevel } from '../../config/bosses';
import { getParagonTierName, FARM_COIN_MULTIPLIER, getParagonMultiplier } from '../../config/paragon';
import type { ParagonProfile } from '../../config/paragon';

// ─── Level theme names (Norwegian) ──────────────────────────────────────────

const LEVEL_NAMES: Record<number, string> = {
    1: 'Lysningen',
    2: 'Skogkanten',
    3: 'Dype Skoger',
    4: 'Trollsletta',
    5: 'Kaosfeltet',
    6: 'Mørkedalen',
    7: 'Katakombene',
    8: 'Trolldal',
    9: 'Siste Marsj',
    10: 'Krigsringens Kjerne',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface LevelSelectScreenProps {
    profile: ParagonProfile;
    onSelectLevel: (level: number) => void;
    onClose: () => void;
}

// ─── Level Card ─────────────────────────────────────────────────────────────

const LevelCard: React.FC<{
    level: number;
    config: typeof LEVEL_CONFIG[0];
    isCleared: boolean;
    isCurrent: boolean;
    isLocked: boolean;
    isFarming: boolean;
    hasBoss: boolean;
    bossName?: string;
    paragonHPMult: number;
    isParagon: boolean;
    onClick: () => void;
}> = ({ level, config, isCleared, isCurrent, isLocked, isFarming, hasBoss, bossName, paragonHPMult, isParagon, onClick }) => {
    const levelName = LEVEL_NAMES[level] || `Level ${level}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: level * 0.05 }}
            whileHover={isLocked ? {} : { y: -3, scale: 1.03 }}
            onClick={isLocked ? undefined : onClick}
            className={`relative rounded-lg border-2 overflow-hidden w-full select-none transition-all
                ${isLocked
                    ? 'border-white/5 opacity-30 cursor-not-allowed'
                    : isCurrent
                        ? 'border-amber-400/60 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                        : isCleared
                            ? 'border-emerald-500/30 cursor-pointer hover:border-emerald-400/50'
                            : 'border-white/10 cursor-pointer hover:border-white/30'
                }
            `}
            style={{
                background: isCurrent
                    ? 'linear-gradient(135deg, #1a1507 0%, #0a0f1a 100%)'
                    : isCleared
                        ? 'linear-gradient(135deg, #071a0a 0%, #0a0f1a 100%)'
                        : '#0a0f1a',
            }}
        >
            <div className="flex items-center gap-3 p-3">
                {/* Level Number */}
                <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-cinzel text-lg font-bold shrink-0
                        ${isCurrent
                            ? 'bg-amber-400/20 text-amber-300'
                            : isCleared
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isLocked
                                    ? 'bg-white/5 text-white/20'
                                    : 'bg-white/5 text-white/50'
                        }
                    `}
                >
                    {isLocked ? '?' : level}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-cinzel text-sm font-bold text-white truncate">
                            {isLocked ? '???' : levelName}
                        </h3>
                        {isCleared && (
                            <span className="text-emerald-400 text-xs font-cinzel tracking-wider">KLART</span>
                        )}
                        {isCurrent && (
                            <span className="text-amber-400 text-xs font-cinzel tracking-wider animate-pulse">NESTE</span>
                        )}
                    </div>
                    {!isLocked && (
                        <div className="flex items-center gap-3 text-[10px] text-white/40 font-cinzel uppercase tracking-widest">
                            <span>{config.waves} bølger</span>
                            <span>{config.enemiesPerWave} fiender</span>
                            {isParagon ? (
                                <span className="text-red-400/70">
                                    {(config.multiplier * paragonHPMult).toFixed(1)}× HP
                                </span>
                            ) : (
                                <span>{config.multiplier}× HP</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Boss indicator */}
                {!isLocked && hasBoss && (
                    <div className="shrink-0 px-2 py-1 rounded bg-red-900/40 border border-red-800/40">
                        <span className="text-[10px] font-cinzel text-red-400 uppercase tracking-widest">
                            {bossName || 'Boss'}
                        </span>
                    </div>
                )}

                {/* Farming indicator */}
                {isFarming && (
                    <div className="shrink-0 px-2 py-1 rounded bg-amber-900/30 border border-amber-800/30">
                        <span className="text-[10px] font-cinzel text-amber-400/70 uppercase tracking-widest">
                            {Math.round(FARM_COIN_MULTIPLIER * 100)}% gull
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
    profile,
    onSelectLevel,
    onClose,
}) => {
    const tierName = getParagonTierName(profile.paragonLevel);
    const highestAccessible = Math.max(profile.currentGameLevel, ...profile.clearedLevels, 1);
    const paragonHPMult = getParagonMultiplier(profile.paragonLevel, 'enemyHPMultiplier');
    const paragonDmgMult = getParagonMultiplier(profile.paragonLevel, 'enemyDamageMultiplier');
    const isParagon = profile.paragonLevel > 0;

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 text-center flex-shrink-0 pt-5 pb-3 w-full px-6"
            >
                <h1 className="font-cinzel text-3xl sm:text-4xl font-bold tracking-[0.15em] uppercase text-white mb-1">
                    VELG <span className="text-amber-200">LEVEL</span>
                </h1>
                <div className="flex items-center justify-center gap-3 text-white/40 font-cinzel text-sm tracking-widest">
                    <span>{profile.name}</span>
                    <span>-</span>
                    <span>{tierName}</span>
                </div>
            </motion.div>

            {/* Paragon difficulty indicator (only for paragonLevel > 0) */}
            {isParagon && (
                <motion.div
                    initial={{ opacity: 0, scaleX: 0.95 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="relative z-10 flex-shrink-0 w-full max-w-lg px-6 mb-2"
                >
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-950/30">
                        <span className="text-amber-400 text-xs font-cinzel uppercase tracking-widest">
                            {tierName}
                        </span>
                        <div className="flex items-center gap-4 text-[10px] font-cinzel uppercase tracking-widest">
                            <span className="text-red-400/80">{paragonHPMult.toFixed(2)}× HP</span>
                            <span className="text-orange-400/80">{paragonDmgMult.toFixed(2)}× skade</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Level List */}
            <div className="relative z-10 w-full max-w-lg px-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 py-1">
                {LEVEL_CONFIG.map((config, idx) => {
                    const level = idx + 1;
                    const isCleared = profile.clearedLevels.includes(level);
                    const isCurrent = level === profile.currentGameLevel && !isCleared;
                    const isLocked = level > highestAccessible;
                    const isFarming = isCleared && level < profile.currentGameLevel;
                    const bossConfig = getBossForLevel(level);
                    const hasBoss = !!bossConfig;
                    const bossName = bossConfig?.name;

                    return (
                        <LevelCard
                            key={level}
                            level={level}
                            config={config}
                            isCleared={isCleared}
                            isCurrent={isCurrent}
                            isLocked={isLocked}
                            isFarming={isFarming}
                            hasBoss={hasBoss}
                            bossName={bossName}
                            paragonHPMult={paragonHPMult}
                            isParagon={isParagon}
                            onClick={() => onSelectLevel(level)}
                        />
                    );
                })}
            </div>

            {/* Action buttons (Tilbake on left, Fortsett on right) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 flex-shrink-0 py-4 flex gap-4"
            >
                <FantasyButton
                    label="← Tilbake"
                    variant="secondary"
                    onClick={onClose}
                    className="w-44 text-base !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label={`Fortsett Level ${profile.currentGameLevel}`}
                    variant="primary"
                    onClick={() => onSelectLevel(profile.currentGameLevel)}
                    className="w-64 text-base !text-black [text-shadow:none]"
                />
            </motion.div>
        </div>
    );
};

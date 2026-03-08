import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { BuffCard } from './BuffCard';
import type { ItemIconKey } from './ItemIcon';
import type { BuffStat } from '../../game/BuffManager';
import type { ClassId } from '../../config/classes';

interface ActiveBuff {
    id: string;
    key: string;
    title: string;
    icon: ItemIconKey;
    startTime: number;
    duration: number;
    stacks: number;
    maxStacks: number;
    description?: string;
    statModifiers?: BuffStat[];
    category?: 'combat' | 'passive' | 'ultimate' | 'vers' | 'class_resource';
    priority?: number;
}

interface BuffSection {
    category: ActiveBuff['category'];
    title: string;
    buffs: ActiveBuff[];
    /** Force full card mode regardless of count */
    alwaysFullMode?: boolean;
    /** Compact mode threshold (default: 3) */
    compactThreshold?: number;
}

/**
 * Unified Buff Display System
 * Consolidates BuffHUD, SkaldBuffPanel, and VersIndicator into a single, coherent UI.
 *
 * Layout Strategy:
 * - Top-left position (safe zone, avoids coins/score)
 * - Auto-grouped by category (class resources → ultimate → combat → passive)
 * - Adaptive density (full cards for few buffs, compact grid for many)
 */
export const UnifiedBuffDisplay: React.FC = React.memo(() => {
    const activeBuffs = useGameRegistry<ActiveBuff[]>('activeBuffs', []);
    const playerClass = useGameRegistry<ClassId>('playerClass', 'krieger');
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});

    // Skald-specific resources
    const skaldVers = useGameRegistry('skaldVers', 0) as number;
    const skaldKvadReady = useGameRegistry('skaldKvadReady', false) as boolean;

    // Group buffs by category
    const ultimateBuffs = activeBuffs.filter(b => b.category === 'ultimate');
    const versBuffs = activeBuffs.filter(b => b.category === 'vers');
    const combatBuffs = activeBuffs.filter(b => b.category === 'combat' || !b.category);
    const passiveBuffs = activeBuffs.filter(b => b.category === 'passive');

    // Build sections (only show non-empty sections)
    const sections: BuffSection[] = [];

    // 1. Ultimate Buffs (always full mode, highest priority)
    if (ultimateBuffs.length > 0) {
        sections.push({
            category: 'ultimate',
            title: 'ULTIMATE',
            buffs: ultimateBuffs,
            alwaysFullMode: true
        });
    }

    // 2. Vers Buffs (Skald-specific active buffs like Crescendo)
    if (versBuffs.length > 0) {
        sections.push({
            category: 'vers',
            title: 'VERS KRAFT',
            buffs: versBuffs,
            alwaysFullMode: true
        });
    }

    // 3. Combat Buffs (adaptive mode)
    if (combatBuffs.length > 0) {
        sections.push({
            category: 'combat',
            title: 'AKTIVE EFFEKTER',
            buffs: combatBuffs,
            compactThreshold: 3
        });
    }

    // 4. Passive Buffs (always compact)
    if (passiveBuffs.length > 0) {
        sections.push({
            category: 'passive',
            title: 'PASSIVE BONUSER',
            buffs: passiveBuffs,
            compactThreshold: 1 // Always compact
        });
    }

    // Skald Class Resource (Vers Indicator)
    const showSkaldVers = playerClass === 'skald' && skaldVers > 0;

    // Calculate passive bonuses for Vers
    const skaldPassiveBonuses: string[] = [];
    if (skaldVers >= 1) skaldPassiveBonuses.push('SPD +8%');
    if (skaldVers >= 2) skaldPassiveBonuses.push('ATK +12%');
    if (skaldVers >= 3) skaldPassiveBonuses.push('DMG +15%');
    if (skaldVers >= 4) skaldPassiveBonuses.push('CRIT +25%');

    // If nothing to show, render nothing
    if (!showSkaldVers && sections.length === 0) {
        return null;
    }

    return (
        <div
            className="fixed top-[4.5rem] left-4 z-50 pointer-events-none select-none flex flex-col gap-3"
            style={{ maxWidth: '220px' }}
            role="region"
            aria-label="Active Buffs"
            aria-live="polite"
        >
            {/* Class Resource Section (Skald Vers) */}
            {showSkaldVers && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-1 p-2 bg-black/40 backdrop-blur-md border border-amber-700/40 rounded-lg"
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-300 text-xs font-cinzel font-bold uppercase tracking-widest">
                            ♪ Vers Kraft
                        </span>
                        <div className="ml-auto flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rotate-45 transition-all duration-200 ${
                                        i < skaldVers
                                            ? 'bg-amber-400 shadow-[0_0_6px_rgba(255,215,0,0.8)]'
                                            : 'bg-amber-900/40'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Passive Bonuses */}
                    {skaldPassiveBonuses.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {skaldPassiveBonuses.map((bonus, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10px] px-1.5 py-0.5 bg-amber-900/20 border border-amber-800/50 rounded text-amber-200 font-cinzel"
                                >
                                    {bonus}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Kvad Ready Indicator */}
                    {skaldKvadReady && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[11px] font-cinzel font-black text-amber-300 tracking-[0.25em] uppercase text-center animate-pulse mt-1"
                            style={{
                                textShadow: '0 0 10px rgba(255, 215, 0, 0.9), 0 0 20px rgba(255, 215, 0, 0.6)'
                            }}
                        >
                            ♫ KVAD KLAR ♫
                        </motion.div>
                    )}

                    {/* Max Vers Footer */}
                    {skaldVers === 5 && (upgradeLevels['resonans_shield'] || 0) > 0 && (
                        <div className="text-center text-[9px] text-amber-400/60 font-cinzel uppercase tracking-wider mt-1 border-t border-amber-700/30 pt-1">
                            ✦ Maks Kraft ✦
                        </div>
                    )}
                </motion.div>
            )}

            {/* Buff Sections (Ultimate, Vers, Combat, Passive) */}
            <AnimatePresence mode="popLayout">
                {sections.map((section) => {
                    const useCompactMode = section.alwaysFullMode
                        ? false
                        : section.buffs.length > (section.compactThreshold || 3);

                    return (
                        <motion.div
                            key={section.category}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-1"
                        >
                            {/* Section Header */}
                            <div className="text-[10px] font-cinzel font-bold text-white/50 uppercase tracking-widest px-1">
                                {section.title}
                            </div>

                            {/* Buffs Container */}
                            {useCompactMode ? (
                                // Compact Grid Mode (3 columns)
                                <div className="grid grid-cols-3 gap-2">
                                    <AnimatePresence mode="popLayout">
                                        {section.buffs.map((buff) => (
                                            <BuffCard
                                                key={buff.id}
                                                id={buff.id}
                                                title={buff.title}
                                                icon={buff.icon}
                                                startTime={buff.startTime}
                                                duration={buff.duration}
                                                stacks={buff.stacks}
                                                maxStacks={buff.maxStacks}
                                                description={buff.description}
                                                statModifiers={buff.statModifiers}
                                                compact={true}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                // Full Card Mode (vertical stack)
                                <div className="flex flex-col gap-1.5">
                                    <AnimatePresence mode="popLayout">
                                        {section.buffs.map((buff) => (
                                            <BuffCard
                                                key={buff.id}
                                                id={buff.id}
                                                title={buff.title}
                                                icon={buff.icon}
                                                startTime={buff.startTime}
                                                duration={buff.duration}
                                                stacks={buff.stacks}
                                                maxStacks={buff.maxStacks}
                                                description={buff.description}
                                                statModifiers={buff.statModifiers}
                                                compact={false}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
});

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import type { ItemIconKey } from './ItemIcon';
import { BuffCard } from './BuffCard';

interface PassiveBuffProps {
    icon: ItemIconKey;
    label: string;
    value: string;
    active: boolean;
}

const PassiveBuff: React.FC<PassiveBuffProps> = React.memo(({ icon, label, value, active }) => {
    if (!active) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-amber-900/20 to-amber-950/10 border border-amber-800/30 rounded-lg"
        >
            <div className="w-6 h-6 flex items-center justify-center text-amber-400 text-sm">
                {icon === 'item_lightning' ? '⚡' : icon === 'item_sword' ? '⚔' : icon === 'item_heart_status' ? '❤' : '★'}
            </div>
            <div className="flex flex-col">
                <span className="text-amber-300/70 text-[8px] font-cinzel uppercase tracking-wider leading-none">
                    {label}
                </span>
                <span className="text-amber-200 text-[10px] font-bold leading-none mt-0.5">
                    {value}
                </span>
            </div>
        </motion.div>
    );
});

/**
 * Skald-specific buff panel showing Vers-based passive bonuses and active buffs.
 * Positioned top-right to avoid obstructing left-side enemies.
 */
export const SkaldBuffPanel: React.FC = React.memo(() => {
    const versCount = useGameRegistry('skaldVers', 0) as number;
    const activeBuffs = useGameRegistry<any[]>('activeBuffs', []);
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});

    // Filter for Skald-specific category buffs (Resonans, Crescendo, etc.)
    const skaldBuffs = activeBuffs.filter(buff => buff.category === 'vers' || buff.category === 'ultimate');

    // Check if upgrades are purchased
    const hasResonans = (upgradeLevels['resonans_shield'] || 0) > 0;

    // Calculate passive bonuses (from VersIndicator passive system)
    const speedBonus = versCount >= 1 ? '+8%' : '';
    const attackSpeedBonus = versCount >= 2 ? '+12%' : '';
    const damageBonus = versCount >= 3 ? '+15%' : '';
    const critBonus = versCount >= 4 ? '+25%' : '';

    const showPanel = versCount > 0 || skaldBuffs.length > 0;

    if (!showPanel) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-20 right-4 z-40 pointer-events-none select-none"
        >
            <div className="flex flex-col gap-2" style={{ maxWidth: '180px' }}>
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-900/40 to-amber-950/30 backdrop-blur-md border border-amber-700/40 rounded-t-xl">
                    <span className="text-amber-300 text-[11px] font-cinzel font-bold uppercase tracking-widest">
                        ♪ Vers Kraft
                    </span>
                    <div className="ml-auto flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rotate-45 ${
                                    i < versCount
                                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(255,215,0,0.8)]'
                                        : 'bg-amber-900/40'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Passive Buffs Section */}
                <AnimatePresence mode="popLayout">
                    {versCount > 0 && (
                        <motion.div
                            layout
                            className="flex flex-col gap-1.5 px-2 py-2 bg-black/40 backdrop-blur-md border border-amber-800/30 rounded-lg"
                        >
                            <PassiveBuff
                                icon="item_heart_status"
                                label="Fart"
                                value={speedBonus}
                                active={versCount >= 1}
                            />
                            <PassiveBuff
                                icon="item_lightning"
                                label="Angrepsfart"
                                value={attackSpeedBonus}
                                active={versCount >= 2}
                            />
                            <PassiveBuff
                                icon="item_sword"
                                label="Skade"
                                value={damageBonus}
                                active={versCount >= 3}
                            />
                            <PassiveBuff
                                icon="item_orb_purple"
                                label="Kritisk"
                                value={critBonus}
                                active={versCount >= 4}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active Skald-Specific Buffs */}
                <AnimatePresence mode="popLayout">
                    {skaldBuffs.length > 0 && (
                        <motion.div
                            layout
                            className="flex flex-col gap-1 px-2 py-2 bg-black/40 backdrop-blur-md border border-amber-700/40 rounded-lg"
                        >
                            {skaldBuffs.map((buff) => (
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
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer hint */}
                {versCount === 5 && hasResonans && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-2 py-1 bg-amber-900/20 border border-amber-700/30 rounded-b-xl"
                    >
                        <span className="text-amber-400/60 text-[8px] font-cinzel uppercase tracking-wider">
                            ✦ Maks Vers Kraft ✦
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
});

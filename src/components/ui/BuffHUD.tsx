import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { BuffCard } from './BuffCard';
import type { ItemIconKey } from './ItemIcon';
import type { BuffStat } from '../../game/BuffManager';

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
    category?: string;
    priority?: number;
}

export const BuffHUD: React.FC = React.memo(() => {
    const activeBuffs = useGameRegistry<ActiveBuff[]>('activeBuffs', []);

    // Filter out 'vers' category buffs (shown in SkaldBuffPanel instead)
    const displayBuffs = activeBuffs.filter(buff => buff.category !== 'vers');

    // Compact mode if more than 3 buffs
    const useCompactMode = displayBuffs.length > 3;

    if (displayBuffs.length === 0) return null;

    if (useCompactMode) {
        // Compact grid mode (3 columns)
        return (
            <div className="fixed top-[5rem] left-4 pointer-events-none z-50">
                <div className="grid grid-cols-3 gap-2 max-w-[140px]">
                    <AnimatePresence mode="popLayout">
                        {displayBuffs.map((buff) => (
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
            </div>
        );
    }

    // Full card mode
    return (
        <div className="fixed top-[5rem] left-4 flex flex-col items-start pointer-events-none z-50">
            <AnimatePresence mode="popLayout">
                {displayBuffs.map((buff) => (
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
    );
});

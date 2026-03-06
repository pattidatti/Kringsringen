import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import type { BuffStat } from '../../game/BuffManager';

interface BuffCardProps {
    id: string;
    title: string;
    icon: ItemIconKey;
    startTime: number;
    duration: number; // -1 for infinite/passive
    stacks?: number;
    maxStacks?: number;
    description?: string;
    statModifiers?: BuffStat[];
    compact?: boolean; // Compact icon-only mode
}

export const BuffCard: React.FC<BuffCardProps> = React.memo(({
    title,
    icon,
    startTime,
    duration,
    stacks = 1,
    description,
    statModifiers,
    compact = false
}) => {
    const [progress, setProgress] = useState(1);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (duration === -1) {
            setProgress(1);
            return;
        }

        let rafId: number;
        const update = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const remaining = Math.max(0, 1 - (elapsed / duration));
            setProgress(remaining);

            if (remaining > 0) {
                rafId = requestAnimationFrame(update);
            }
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [startTime, duration]);

    const radius = compact ? 14 : 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;

    const isPassive = duration === -1;
    const isWarning = !isPassive && progress < 0.3;

    if (compact) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                className="relative flex items-center justify-center"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {/* Compact Icon with Progress Circle */}
                <div className="relative w-10 h-10">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="20"
                            cy="20"
                            r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="2"
                        />
                        <motion.circle
                            cx="20"
                            cy="20"
                            r={radius}
                            fill="none"
                            stroke={isPassive ? '#cc88ff' : isWarning ? '#ff4444' : '#00ccff'}
                            strokeWidth="2"
                            strokeDasharray={circumference}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ type: 'tween', ease: 'linear', duration: 0 }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ItemIcon icon={icon} size="sm" fitSize={16} />
                    </div>
                    {stacks > 1 && (
                        <div className="absolute -top-1 -right-1 z-10 bg-orange-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-white/20">
                            ×{stacks}
                        </div>
                    )}
                </div>

                {/* Tooltip on Hover */}
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-black/95 backdrop-blur-md border border-amber-700/50 rounded-lg px-3 py-2 min-w-[140px]">
                            <div className="text-amber-300 text-[10px] font-cinzel font-bold tracking-wider uppercase">
                                {title}
                            </div>
                            {description && (
                                <div className="text-white/80 text-[9px] mt-1">
                                    {description}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    // Full card mode
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`relative flex items-center gap-3 p-2 mb-2 bg-black/40 backdrop-blur-md border rounded-xl ${
                isWarning ? 'border-red-500/50' : 'border-white/10'
            }`}
            style={{ minWidth: '160px' }}
        >
            {/* Progress Circle & Icon */}
            <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="24"
                        cy="24"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                    />
                    <motion.circle
                        cx="24"
                        cy="24"
                        r={radius}
                        fill="none"
                        stroke={isPassive ? '#cc88ff' : isWarning ? '#ff4444' : '#00ccff'}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ type: 'tween', ease: 'linear', duration: 0 }}
                    />
                </svg>
                <div className="z-10 bg-black/60 rounded-full p-1 border border-white/5">
                    <ItemIcon icon={icon} size="sm" fitSize={20} />
                </div>

                {/* Stacks Badge */}
                {stacks > 1 && (
                    <div className="absolute -top-1 -right-1 z-20 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 shadow-lg">
                        ×{stacks}
                    </div>
                )}
            </div>

            {/* Title & Description */}
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                    {title}
                </span>
                {description && (
                    <span className="text-white text-[10px] font-medium truncate max-w-[100px]" style={{ fontFamily: 'Crimson Text, serif' }}>
                        {description}
                    </span>
                )}
                {statModifiers && statModifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {statModifiers.map((stat, idx) => (
                            <span key={idx} className="text-amber-400 text-[9px] font-bold">
                                {stat.displayFormat === 'percent' ? `+${stat.value}%` : `+${stat.value}`}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

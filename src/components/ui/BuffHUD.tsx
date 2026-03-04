import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { ItemIcon, type ItemIconKey } from './ItemIcon';

interface ActiveBuff {
    id: string;
    key: string;
    title: string;
    icon: ItemIconKey;
    startTime: number;
    duration: number;
    stacks: number;
    maxStacks: number;
}

const BuffItem: React.FC<{ buff: ActiveBuff }> = ({ buff }) => {
    const [progress, setProgress] = useState(1);

    useEffect(() => {
        if (buff.duration === -1) {
            setProgress(1);
            return;
        }

        let rafId: number;
        const update = () => {
            const now = Date.now();
            const elapsed = now - buff.startTime;
            const remaining = Math.max(0, 1 - (elapsed / buff.duration));
            setProgress(remaining);

            if (remaining > 0) {
                rafId = requestAnimationFrame(update);
            }
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [buff.startTime, buff.duration]);

    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="relative flex items-center gap-3 p-2 mb-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl"
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
                        stroke={buff.duration === -1 ? '#cc88ff' : '#00ccff'}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ type: 'tween', ease: 'linear', duration: 0 }}
                    />
                </svg>
                <div className="z-10 bg-black/60 rounded-full p-1 border border-white/5">
                    <ItemIcon icon={buff.icon} size="sm" fitSize={20} />
                </div>

                {/* Stacks Badge */}
                {buff.stacks > 1 && (
                    <div className="absolute -top-1 -right-1 z-20 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 shadow-lg">
                        x{buff.stacks}
                    </div>
                )}
            </div>

            {/* Title & Stats */}
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                    {buff.key.replace(/_/g, ' ')}
                </span>
                <span className="text-white text-xs font-bold truncate max-w-[100px]" style={{ fontFamily: 'Crimson Text, serif' }}>
                    {buff.title}
                </span>
            </div>
        </motion.div>
    );
};

export const BuffHUD: React.FC = () => {
    const activeBuffs = useGameRegistry<ActiveBuff[]>('activeBuffs', []);

    return (
        <div className="fixed top-[5rem] left-4 flex flex-col items-start pointer-events-none z-50">
            <AnimatePresence mode="popLayout">
                {activeBuffs.map((buff) => (
                    <BuffItem key={buff.id} buff={buff} />
                ))}
            </AnimatePresence>
        </div>
    );
};

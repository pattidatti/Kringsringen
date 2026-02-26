import React, { useEffect, useRef, useState } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { motion, AnimatePresence } from 'framer-motion';

export const DashCooldownBar: React.FC = React.memo(() => {
    const dashState = useGameRegistry('dashState', { isActive: false, readyAt: 0 }) as { isActive: boolean, readyAt: number };
    const dashCooldown = useGameRegistry('dashCooldown', 20000) as number;

    const barRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [onCooldown, setOnCooldown] = useState(false);

    useEffect(() => {
        let rafId: number;

        const update = () => {
            const now = Date.now();
            const readyAt = dashState?.readyAt || 0;
            const remaining = readyAt - now;

            if (remaining > 0) {
                setOnCooldown(true);
                setIsReady(false);
                if (barRef.current) {
                    const progress = Math.max(0, Math.min(1, remaining / dashCooldown));
                    barRef.current.style.width = `${progress * 100}%`;
                }
            } else {
                setOnCooldown(false);
                setIsReady(true);
                if (barRef.current) barRef.current.style.width = '0%';
            }
            rafId = requestAnimationFrame(update);
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [dashState, dashCooldown]);

    return (
        <div className="flex flex-col items-center mb-1 pointer-events-none select-none">
            <AnimatePresence>
                {onCooldown ? (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="w-32 h-2 bg-black/60 border border-amber-900/40 rounded-full overflow-hidden backdrop-blur-sm"
                        style={{ boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                    >
                        <div
                            ref={barRef}
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 opacity-80"
                            style={{ width: '100%', transition: 'none' }}
                        />
                    </motion.div>
                ) : isReady ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2"
                    >
                        <div className="text-[10px] font-cinzel font-black text-cyan-400 tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-pulse">
                            Dash Klar
                        </div>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
                            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:0.2s]" />
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
});

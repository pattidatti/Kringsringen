import React, { useEffect, useRef, useState } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { motion, AnimatePresence } from 'framer-motion';

export const DashCooldownBar: React.FC = React.memo(() => {
    // Default fallback includes charges=1
    const dashState = useGameRegistry('dashState', { isActive: false, readyAt: 0, charges: 1 }) as { isActive: boolean, readyAt: number, charges: number };
    const dashCooldown = useGameRegistry('dashCooldown', 7000) as number;
    const maxCharges = useGameRegistry('dashCharges', 1) as number;

    const barRef = useRef<HTMLDivElement>(null);
    const [charging, setCharging] = useState(false);

    // Provide a safe fallback for backwards compatibility
    const currentCharges = typeof dashState?.charges === 'number' ? dashState.charges : (dashState?.readyAt > Date.now() ? 0 : 1);

    useEffect(() => {
        let rafId: number;

        const update = () => {
            const now = Date.now();
            const readyAt = dashState?.readyAt || 0;
            const remaining = readyAt - now;

            if (currentCharges < maxCharges && remaining > 0) {
                setCharging(true);
                if (barRef.current) {
                    const progress = Math.max(0, Math.min(1, remaining / dashCooldown));
                    // Fill up from 0 to 100% as the next charge gets closer
                    barRef.current.style.width = `${(1 - progress) * 100}%`;
                }
            } else {
                setCharging(false);
                if (barRef.current) barRef.current.style.width = '100%';
            }
            rafId = requestAnimationFrame(update);
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [dashState, dashCooldown, currentCharges, maxCharges]);

    // Generate charge dots (diamonds)
    const dots = Array.from({ length: maxCharges }).map((_, i) => {
        const isAvailable = i < currentCharges;
        return (
            <motion.div
                key={i}
                initial={false}
                animate={{
                    scale: isAvailable ? 1 : 0.8,
                    opacity: isAvailable ? 1 : 0.4
                }}
                className={`w-2.5 h-2.5 rounded-[1px] rotate-45 transition-colors duration-300 ${isAvailable ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-black/80 border border-cyan-900/50'}`}
            />
        );
    });

    return (
        <div className="flex flex-col items-center mb-2 pointer-events-none select-none">
            <AnimatePresence mode="wait">
                {charging || currentCharges < maxCharges ? (
                    <motion.div
                        key="charging-state"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex flex-col items-center gap-2"
                    >
                        {/* The replenishment bar */}
                        <div
                            className="w-32 h-1.5 bg-black/60 border border-cyan-900/40 rounded-full overflow-hidden backdrop-blur-sm"
                            style={{ boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                        >
                            <div
                                ref={barRef}
                                className="h-full bg-gradient-to-r from-blue-700 to-cyan-400 opacity-90"
                                style={{ width: '0%', transition: 'none' }}
                            />
                        </div>

                        {/* Charge indicators below the bar */}
                        {maxCharges > 1 && (
                            <div className="flex gap-2">
                                {dots}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="ready-state"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center gap-2.5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] font-cinzel font-black text-cyan-400 tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-pulse">
                                Dash Klar
                            </div>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
                                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:0.2s]" />
                            </div>
                        </div>

                        {/* Show fully charged dots too if maxCharges > 1 */}
                        {maxCharges > 1 && (
                            <div className="flex gap-2">
                                {dots}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

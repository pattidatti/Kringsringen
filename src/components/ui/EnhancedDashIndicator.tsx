import React, { useEffect, useRef, useState } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_CONSTANTS } from '../../config/ui-constants';

/**
 * Enhanced Dash Indicator
 * - Larger, more prominent display
 * - Shows multi-dash charges clearly
 * - Displays keybind (SHIFT)
 * - Animated charge consumption and cooldown
 */
export const EnhancedDashIndicator: React.FC = React.memo(() => {
    const dashState = useGameRegistry('dashState', { isActive: false, readyAt: 0, charges: 1 }) as {
        isActive: boolean;
        readyAt: number;
        charges: number
    };
    const dashCooldown = useGameRegistry('dashCooldown', 7000) as number;
    const maxCharges = useGameRegistry('dashCharges', 1) as number;

    const barRef = useRef<HTMLDivElement>(null);
    const [charging, setCharging] = useState(false);

    // Safe fallback for charge count
    const currentCharges = typeof dashState?.charges === 'number'
        ? dashState.charges
        : (dashState?.readyAt > Date.now() ? 0 : 1);

    // Animate cooldown bar
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
                    // Fill from 0% to 100% as charge completes
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

    return (
        <div className="flex flex-col items-center mb-2 pointer-events-none select-none">
            <AnimatePresence mode="wait">
                {/* Charging State */}
                {charging || currentCharges < maxCharges ? (
                    <motion.div
                        key="charging"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex flex-col items-center gap-2"
                    >
                        {/* Header: Icon + Label + Keybind */}
                        <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl">⚡</span>
                            <span className="text-[10px] md:text-[11px] font-cinzel font-bold text-cyan-300/90 tracking-widest uppercase">
                                DASH
                            </span>
                            <span className="text-[8px] md:text-[9px] px-1.5 py-0.5 bg-black/60 border border-cyan-800/50 rounded text-cyan-400 font-mono">
                                {UI_CONSTANTS.DASH.KEYBIND_LABEL}
                            </span>
                        </div>

                        {/* Cooldown Bar */}
                        <div
                            className="w-40 md:w-48 h-2.5 md:h-3 bg-black/70 border border-cyan-900/50 rounded-full overflow-hidden backdrop-blur-sm"
                            style={{ boxShadow: '0 0 12px rgba(0,0,0,0.6), inset 0 1px 2px rgba(0,0,0,0.4)' }}
                        >
                            <div
                                ref={barRef}
                                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 opacity-90"
                                style={{
                                    width: '0%',
                                    transition: 'none',
                                    boxShadow: '0 0 8px rgba(34, 211, 238, 0.6)'
                                }}
                            />
                        </div>

                        {/* Charge Indicators (Multi-Dash) */}
                        {maxCharges > 1 && (
                            <div className="flex gap-2">
                                {Array.from({ length: maxCharges }).map((_, i) => {
                                    const isAvailable = i < currentCharges;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={false}
                                            animate={{
                                                scale: isAvailable ? 1 : 0.75,
                                                opacity: isAvailable ? 1 : 0.3
                                            }}
                                            className={`
                                                w-3 h-3 md:w-4 md:h-4 rounded-sm rotate-45 transition-colors duration-200
                                                ${isAvailable
                                                    ? 'bg-cyan-400 border border-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                                                    : 'bg-black/80 border border-cyan-900/40'
                                                }
                                            `}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    /* Fully Charged State */
                    <motion.div
                        key="ready"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center gap-2"
                    >
                        {/* Ready Header */}
                        <div className="flex items-center gap-3">
                            <motion.span
                                animate={{
                                    scale: [1, 1.2, 1],
                                    filter: [
                                        'drop-shadow(0 0 8px rgba(34,211,238,0.8))',
                                        'drop-shadow(0 0 16px rgba(34,211,238,1))',
                                        'drop-shadow(0 0 8px rgba(34,211,238,0.8))'
                                    ]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="text-2xl md:text-3xl"
                            >
                                ⚡
                            </motion.span>
                            <div className="flex flex-col items-start">
                                <span className="text-[11px] md:text-[12px] font-cinzel font-black text-cyan-300 tracking-[0.25em] uppercase">
                                    DASH KLAR
                                </span>
                                <span className="text-[8px] md:text-[9px] text-cyan-400/70 font-mono tracking-wide">
                                    [{UI_CONSTANTS.DASH.KEYBIND_LABEL}]
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <motion.div
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                                />
                                <motion.div
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                                    className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                                />
                            </div>
                        </div>

                        {/* Fully Charged Indicators (Multi-Dash) */}
                        {maxCharges > 1 && (
                            <div className="flex gap-2">
                                {Array.from({ length: maxCharges }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            boxShadow: [
                                                '0 0 10px rgba(34,211,238,0.8)',
                                                '0 0 16px rgba(34,211,238,1)',
                                                '0 0 10px rgba(34,211,238,0.8)'
                                            ]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.2
                                        }}
                                        className="w-3 h-3 md:w-4 md:h-4 rounded-sm rotate-45 bg-cyan-400 border border-cyan-200"
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

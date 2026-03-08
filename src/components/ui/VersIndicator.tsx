import React, { useEffect, useRef } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Verse Indicator for Bard/Skald class
 * Displays verse progression with large musical notes instead of simple dots
 */
export const VersIndicator: React.FC = React.memo(() => {
    const vers = useGameRegistry('skaldVers', 0) as number;
    const kvadReady = useGameRegistry('skaldKvadReady', false) as boolean;
    const prevVersRef = useRef(vers);

    // Track verse changes for animation triggers
    useEffect(() => {
        prevVersRef.current = vers;
    }, [vers]);

    // Clamp to valid range
    const safeVers = Math.max(0, Math.min(5, typeof vers === 'number' ? vers : 0));

    return (
        <div className="flex flex-col items-center mb-2 pointer-events-none select-none">
            {/* Musical Notes Row */}
            <div className="flex gap-3 items-center">
                {[0, 1, 2, 3, 4].map((i) => {
                    const filled = i < safeVers;
                    return (
                        <motion.div
                            key={i}
                            initial={false}
                            animate={{
                                scale: filled ? 1 : 0.7,
                                opacity: filled ? 1 : 0.25,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20
                            }}
                            className="relative"
                        >
                            {/* Musical Note Icon (eighth note: ♪) */}
                            <div
                                className={`
                                    w-10 h-10 md:w-12 md:h-12 flex items-center justify-center
                                    text-3xl md:text-4xl font-bold transition-all duration-300
                                    ${filled
                                        ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]'
                                        : 'text-amber-900/40'
                                    }
                                `}
                                style={{
                                    filter: filled ? 'brightness(1.2)' : 'brightness(0.5)',
                                    textShadow: filled ? '0 0 20px rgba(255, 215, 0, 0.6)' : 'none'
                                }}
                            >
                                ♪
                            </div>

                            {/* Animated pulse ring on verse gain */}
                            <AnimatePresence>
                                {filled && i === safeVers - 1 && (
                                    <motion.div
                                        key={`pulse-${i}`}
                                        initial={{ scale: 0.8, opacity: 0.8 }}
                                        animate={{ scale: 2, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="absolute inset-0 rounded-full border-2 border-amber-400"
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Kvad Ready Notification */}
            <AnimatePresence>
                {kvadReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.9 }}
                        className="text-[10px] md:text-[11px] font-cinzel font-black text-amber-300 tracking-[0.3em] uppercase mt-2 animate-pulse"
                        style={{
                            textShadow: '0 0 10px rgba(255, 215, 0, 0.9), 0 0 20px rgba(255, 215, 0, 0.6)'
                        }}
                    >
                        ♫ KVAD KLAR ♫
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

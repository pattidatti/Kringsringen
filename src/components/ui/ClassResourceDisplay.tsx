import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Generic Class Resource Display (Vers for Skald, Rage for Krieger, etc.)
 * Extracted from VersIndicator.tsx for reusability.
 */

interface ClassResourceDisplayProps {
    /** Resource count (0-5 for Vers) */
    value: number;
    /** Max resource value */
    max: number;
    /** Visual icon (e.g., '♪' for Vers, '🔥' for Rage) */
    icon: string;
    /** Active passive bonuses labels (e.g., ['SPD', 'ATK', 'DMG']) */
    passiveBonuses?: string[];
    /** Highlight color for filled resources */
    fillColor?: string;
    /** Empty resource color */
    emptyColor?: string;
    /** Glow color for active resources */
    glowColor?: string;
    /** Ready state indicator (e.g., "KVAD KLAR" for Skald) */
    readyLabel?: string;
    /** Whether ready state is active */
    isReady?: boolean;
}

export const ClassResourceDisplay: React.FC<ClassResourceDisplayProps> = React.memo(({
    value,
    max,
    icon,
    passiveBonuses = [],
    fillColor = '#FFD700',
    emptyColor = '#1a1a1a',
    glowColor = 'rgba(255, 215, 0, 0.9)',
    readyLabel,
    isReady = false
}) => {
    const prevValueRef = useRef(value);

    useEffect(() => {
        prevValueRef.current = value;
    }, [value]);

    const safeValue = Math.max(0, Math.min(max, typeof value === 'number' ? value : 0));

    return (
        <div className="flex flex-col items-center gap-2 pointer-events-none select-none">
            {/* Resource Icons Row */}
            <div className="flex gap-2 items-center">
                {Array.from({ length: max }).map((_, i) => {
                    const filled = i < safeValue;
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
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-3xl md:text-4xl font-bold transition-all duration-300"
                                style={{
                                    color: filled ? fillColor : emptyColor,
                                    filter: filled ? 'brightness(1.2)' : 'brightness(0.5)',
                                    textShadow: filled ? `0 0 20px ${glowColor}` : 'none',
                                    WebkitTextStroke: filled ? '1px rgba(0,0,0,0.3)' : 'none'
                                }}
                            >
                                {icon}
                            </div>

                            {/* Pulse ring on resource gain */}
                            <AnimatePresence>
                                {filled && i === safeValue - 1 && (
                                    <motion.div
                                        key={`pulse-${i}`}
                                        initial={{ scale: 0.8, opacity: 0.8 }}
                                        animate={{ scale: 2, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="absolute inset-0 rounded-full border-2"
                                        style={{ borderColor: fillColor, pointerEvents: 'none' }}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Passive Bonus Labels */}
            {passiveBonuses.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 text-[9px] md:text-[10px] font-cinzel tracking-widest uppercase"
                    style={{ color: fillColor }}
                >
                    {passiveBonuses.map((label, idx) => (
                        <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-black/40 rounded border"
                            style={{ borderColor: `${fillColor}80` }}
                        >
                            {label}
                        </span>
                    ))}
                </motion.div>
            )}

            {/* Ready State Notification */}
            <AnimatePresence>
                {isReady && readyLabel && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.9 }}
                        className="text-[10px] md:text-[11px] font-cinzel font-black tracking-[0.3em] uppercase animate-pulse"
                        style={{
                            color: fillColor,
                            textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`
                        }}
                    >
                        {readyLabel}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

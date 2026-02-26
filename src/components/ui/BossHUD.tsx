import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';

export const BossHUD: React.FC = React.memo(() => {
    const isBossActive = useGameRegistry('isBossActive', false);
    const bossMaxHP = useGameRegistry('bossMaxHP', 1);
    const bossName = useGameRegistry('bossName', '');
    const bossPhase = useGameRegistry<number>('bossPhase', 1);

    // Direct ref to HP bar fill — updated via RAF, not React state
    const hpBarRef = useRef<HTMLDivElement>(null);
    const hpValueRef = useRef<number>(0);
    const [displayHP, setDisplayHP] = useState(0);

    const isPhase2 = bossPhase === 2;

    // Subscribe to bossHP directly via Phaser events (NOT via useGameRegistry)
    // This avoids React re-renders while still updating the DOM ref
    useEffect(() => {
        const game = getGameInstance();
        if (!game) return;

        const registry = game.registry;

        // Set initial HP
        hpValueRef.current = registry.get('bossHP') ?? 0;
        setDisplayHP(hpValueRef.current);

        // Animate the bar fill on HP change
        const onBossHPChange = (_parent: any, newHP: number) => {
            hpValueRef.current = newHP;

            // Update the ref with smooth transition using CSS
            if (hpBarRef.current) {
                const hpFraction = bossMaxHP > 0 ? Math.max(0, newHP / bossMaxHP) : 0;
                const width = `${hpFraction * 100}%`;

                // Use CSS transition for smooth animation (60fps native)
                hpBarRef.current.style.width = width;
            }

            // Update display HP text every 10 damage (reduce updates for text)
            setDisplayHP(newHP);
        };

        registry.events.on('changedata-bossHP', onBossHPChange);

        return () => {
            registry.events.off('changedata-bossHP', onBossHPChange);
        };
    }, [bossMaxHP]);

    return (
        <AnimatePresence>
            {isBossActive && (
                <motion.div
                    key="boss-hud"
                    initial={{ opacity: 0, y: 20, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 20, x: "-50%" }}
                    transition={{ duration: 0.4 }}
                    className="absolute top-28 left-1/2 w-[480px] max-w-[90vw] pointer-events-none z-20"
                >
                    {/* Boss name */}
                    <div className="flex items-center justify-between mb-1 px-1">
                        <span
                            className="font-cinzel font-bold text-sm tracking-wider select-none"
                            style={{
                                color: isPhase2 ? '#ff4444' : '#f87171',
                                textShadow: isPhase2
                                    ? '0 0 12px rgba(255,50,50,0.9)'
                                    : '0 0 8px rgba(248,113,113,0.6)',
                            }}
                        >
                            {bossName}
                        </span>
                        <span className="font-mono text-xs text-red-300/70 select-none">
                            {Math.ceil(displayHP)} / {Math.ceil(bossMaxHP)}
                        </span>
                    </div>

                    {/* HP bar track */}
                    <div
                        className="relative w-full h-4 rounded overflow-hidden"
                        style={{
                            background: 'rgba(0,0,0,0.7)',
                            border: `1px solid ${isPhase2 ? 'rgba(255,80,80,0.6)' : 'rgba(180,40,40,0.4)'}`,
                            boxShadow: isPhase2 ? '0 0 10px rgba(255,0,0,0.4)' : 'none',
                        }}
                    >
                        {/* HP fill — direct DOM ref, CSS transition for smooth animation */}
                        <div
                            ref={hpBarRef}
                            className="absolute inset-y-0 left-0 rounded"
                            style={{
                                width: '100%',
                                background: isPhase2
                                    ? 'linear-gradient(90deg, #7f0000, #cc0000, #ff3333)'
                                    : 'linear-gradient(90deg, #7f1d1d, #b91c1c, #ef4444)',
                                boxShadow: isPhase2 ? 'inset 0 0 8px rgba(255,100,100,0.5)' : 'none',
                                transition: 'width 0.2s ease-out',
                            }}
                        />

                        {/* Gloss shine */}
                        <div
                            className="absolute inset-x-0 top-0 h-1/2 rounded-t"
                            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)' }}
                        />

                        {/* Phase 2 pulse overlay */}
                        {isPhase2 && (
                            <motion.div
                                animate={{ opacity: [0, 0.3, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className="absolute inset-0 rounded"
                                style={{ background: 'rgba(255,50,50,0.3)' }}
                            />
                        )}
                    </div>

                    {/* Phase 2 label */}
                    {isPhase2 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center mt-1"
                        >
                            <span
                                className="font-cinzel text-[10px] uppercase tracking-widest select-none"
                                style={{
                                    color: '#ff4444',
                                    textShadow: '0 0 8px rgba(255,0,0,0.8)',
                                }}
                            >
                                ☠ FASE 2 ☠
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
});

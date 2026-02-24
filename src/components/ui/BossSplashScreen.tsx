import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';

const SPLASH_DURATION_MS = 3200;

export const BossSplashScreen: React.FC = () => {
    const splashVisible = useGameRegistry('bossSplashVisible', false);
    const bossName = useGameRegistry('bossName', '');

    const [localVisible, setLocalVisible] = useState(false);
    const [displayedName, setDisplayedName] = useState('');

    useEffect(() => {
        if (splashVisible) {
            setDisplayedName(bossName);
            setLocalVisible(true);
            const timer = setTimeout(() => setLocalVisible(false), SPLASH_DURATION_MS - 400);
            return () => clearTimeout(timer);
        }
    }, [splashVisible, bossName]);

    return (
        <AnimatePresence>
            {localVisible && (
                <motion.div
                    key="boss-splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(60,0,0,0.85) 0%, rgba(0,0,0,0.97) 100%)',
                    }}
                >
                    {/* Top/bottom red lines */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="absolute top-[38%] w-full h-[2px] bg-red-700/60"
                    />
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="absolute bottom-[38%] w-full h-[2px] bg-red-700/60"
                    />

                    <div className="flex flex-col items-center gap-4 px-8">
                        {/* Skull icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                            className="text-5xl mb-2 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]"
                        >
                            💀
                        </motion.div>

                        {/* BOSS BATTLE header */}
                        <motion.h1
                            initial={{ opacity: 0, letterSpacing: '0.5em', y: -20 }}
                            animate={{ opacity: 1, letterSpacing: '0.25em', y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="font-cinzel font-black text-red-500 select-none"
                            style={{
                                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                                textShadow: '0 0 40px rgba(220,38,38,0.9), 0 0 80px rgba(220,38,38,0.5)',
                            }}
                        >
                            BOSS BATTLE
                        </motion.h1>

                        {/* Divider */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent max-w-md"
                        />

                        {/* Boss name */}
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                            className="font-cinzel text-amber-200 tracking-widest select-none"
                            style={{
                                fontSize: 'clamp(1rem, 3vw, 1.75rem)',
                                textShadow: '0 0 20px rgba(251,191,36,0.7)',
                            }}
                        >
                            {displayedName}
                        </motion.p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

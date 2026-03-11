import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';

interface PvpCountdownProps {
    registryKey?: string;
    stateKey?: string;
}

export const PvpCountdown: React.FC<PvpCountdownProps> = ({
    registryKey = 'pvpCountdown',
    stateKey = 'pvpState',
}) => {
    const pvpState = useGameRegistry<string>(stateKey, 'waiting');
    const pvpCountdown = useGameRegistry<number>(registryKey, 0);

    if (pvpState !== 'countdown') return null;

    const label = pvpCountdown > 0 ? pvpCountdown.toString() : 'KAMP!';

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
                <motion.div
                    key={label}
                    initial={{ scale: 2.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="font-fantasy text-8xl font-bold text-center"
                    style={{
                        color: pvpCountdown > 0 ? '#fde68a' : '#ff4444',
                        textShadow: '0 0 40px rgba(255,215,0,0.8), 3px 3px 0 #000, -3px -3px 0 #000',
                    }}
                >
                    {label}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

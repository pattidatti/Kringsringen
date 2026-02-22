import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './ui/FantasyButton';
import '../styles/pixel-ui.css';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [activeToast, setActiveToast] = useState<string | null>(null);

    const showToast = (label: string) => {
        setActiveToast(label);
        setTimeout(() => setActiveToast(null), 2000);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950">
            {/* Background image */}
            <img
                src="/assets/landing-bg.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
                draggable={false}
            />

            {/* Bottom gradient for button contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Title */}
            <motion.h1
                className="absolute top-8 w-full text-center font-fantasy text-6xl md:text-7xl tracking-widest uppercase"
                style={{
                    color: '#fde68a',
                    textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 12px rgba(0,0,0,0.9)',
                }}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                Krigsringen
            </motion.h1>

            {/* Buttons — centered horizontally, positioned below the character */}
            <motion.div
                className="absolute flex flex-col items-center gap-5"
                style={{ top: '62%', left: '50%', transform: 'translateX(-50%)' }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            >
                <FantasyButton
                    label="Start Game"
                    variant="primary"
                    onClick={onStart}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Highscore"
                    variant="secondary"
                    onClick={() => showToast('Highscore')}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Settings"
                    variant="secondary"
                    onClick={() => showToast('Settings')}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
            </motion.div>

            {/* Coming Soon toast */}
            <AnimatePresence>
                {activeToast && (
                    <motion.div
                        key={activeToast}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 font-fantasy text-amber-200 text-sm tracking-widest uppercase bg-black/60 px-6 py-2 rounded"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                    >
                        {activeToast} — Kommer snart
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;

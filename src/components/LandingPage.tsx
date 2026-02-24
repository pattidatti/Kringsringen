import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './ui/FantasyButton';
import { HighscoresModal } from './ui/HighscoresModal';
import '../styles/pixel-ui.css';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [activeToast, setActiveToast] = useState<string | null>(null);
    const [showHighscores, setShowHighscores] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const tryPlay = () => {
            audio.play().catch(() => {/* autoplay blocked, ignore */});
            document.removeEventListener('mousedown', tryPlay);
            document.removeEventListener('keydown', tryPlay);
        };

        document.addEventListener('mousedown', tryPlay);
        document.addEventListener('keydown', tryPlay);

        return () => {
            document.removeEventListener('mousedown', tryPlay);
            document.removeEventListener('keydown', tryPlay);
        };
    }, []);

    const handleStart = () => {
        const audio = audioRef.current;
        if (audio) {
            const fadeOut = setInterval(() => {
                if (audio.volume > 0.05) {
                    audio.volume = Math.max(0, audio.volume - 0.05);
                } else {
                    audio.pause();
                    audio.volume = 1;
                    clearInterval(fadeOut);
                }
            }, 50);
        }
        onStart();
    };

    const showToast = (label: string) => {
        setActiveToast(label);
        setTimeout(() => setActiveToast(null), 2000);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950">
            <audio
                ref={audioRef}
                src={import.meta.env.BASE_URL + 'assets/audio/bgs/forest_day.wav'}
                loop
            />

            {/* Background image */}
            <img
                src={import.meta.env.BASE_URL + 'assets/landing-bg.png'}
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
                    onClick={handleStart}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Highscore"
                    variant="secondary"
                    onClick={() => setShowHighscores(true)}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Settings"
                    variant="secondary"
                    onClick={() => showToast('Settings')}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
            </motion.div>

            {/* Highscores Modal */}
            <HighscoresModal
                isOpen={showHighscores}
                onClose={() => setShowHighscores(false)}
            />

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

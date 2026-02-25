import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './ui/FantasyButton';
import { HighscoresModal } from './ui/HighscoresModal';
import { SettingsModal } from './ui/SettingsModal';
import { OnboardingTutorial } from './ui/OnboardingTutorial';
import { MultiplayerLobby } from './ui/MultiplayerLobby';
import { SaveManager } from '../game/SaveManager';
import Peer from 'peerjs';
import '../styles/pixel-ui.css';

interface LandingPageProps {
    onStart: () => void;
    onStartMP: (role: 'host' | 'client', roomCode: string, peer: Peer, nickname: string, hostPeerId?: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onStartMP }) => {
    const [showHighscores, setShowHighscores] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showMPLobby, setShowMPLobby] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const tryPlay = () => {
            audio.play().catch(() => {/* autoplay blocked, ignore */ });
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

    const fadeAudioAndStart = () => {
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

    const handleStart = () => {
        if (SaveManager.load().tutorialSeen) {
            fadeAudioAndStart();
        } else {
            setShowTutorial(true);
        }
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
            <motion.div
                className="absolute top-8 w-full text-center"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                <motion.h1
                    className="font-fantasy text-6xl md:text-7xl tracking-widest uppercase inline-block"
                    style={{
                        color: '#fde68a',
                        textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 12px rgba(0,0,0,0.9)',
                    }}
                    animate={{
                        textShadow: [
                            '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 12px rgba(0,0,0,0.9)',
                            '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 8px 24px rgba(253, 230, 138, 0.4)',
                            '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 12px rgba(0,0,0,0.9)',
                        ],
                        y: [0, -3, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    Krigsringen
                </motion.h1>
            </motion.div>

            {/* Buttons — centered horizontally, positioned below the character */}
            <motion.div
                className="absolute flex flex-col items-center gap-5"
                style={{ top: '62%', left: '50%', transform: 'translateX(-50%)' }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            >
                <FantasyButton
                    label="Start Spill"
                    variant="primary"
                    onClick={handleStart}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Høyeste Poengsum"
                    variant="secondary"
                    onClick={() => setShowHighscores(true)}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Innstillinger"
                    variant="secondary"
                    onClick={() => setShowSettings(true)}
                    className="w-64 text-xl !text-black [text-shadow:none]"
                />
                <FantasyButton
                    label="Multiplayer"
                    variant="secondary"
                    onClick={() => setShowMPLobby(true)}
                    className="w-64 text-xl !text-black [text-shadow:none] ring-2 ring-amber-500/50"
                />
            </motion.div>

            {/* Highscores Modal */}
            <HighscoresModal
                isOpen={showHighscores}
                onClose={() => setShowHighscores(false)}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {/* Multiplayer Lobby */}
            <MultiplayerLobby
                isOpen={showMPLobby}
                onClose={() => setShowMPLobby(false)}
                onStartGame={(role, code, peer, nick, hostId) => {
                    setShowMPLobby(false);
                    onStartMP(role, code, peer, nick, hostId);
                }}
            />

            {/* Onboarding Tutorial */}
            <AnimatePresence>
                {showTutorial && (
                    <OnboardingTutorial onStart={fadeAudioAndStart} />
                )}
            </AnimatePresence>

        </div>
    );
};

export default LandingPage;

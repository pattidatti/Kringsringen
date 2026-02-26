import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FantasyPanel } from './FantasyPanel';
import { FantasyButton } from './FantasyButton';
import { SaveManager } from '../../game/SaveManager';

interface OnboardingTutorialProps {
    onStart: () => void;
}

const Key: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
    <span
        className={`inline-flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-amber-100 font-mono text-sm font-bold shadow-inner py-1 min-w-[1.75rem] ${wide ? 'px-3' : 'px-1.5'}`}
        style={{ textShadow: '0 0 6px rgba(253,230,138,0.4)' }}
    >
        {children}
    </span>
);

const Row: React.FC<{ label: string; keys: React.ReactNode }> = ({ label, keys }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 border-b border-amber-900/40 last:border-0 pl-1">
        <span className="font-cinzel text-amber-950 font-bold text-sm tracking-wide w-28 shrink-0 text-left">{label}</span>
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">{keys}</div>
    </div>
);

const Divider: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center gap-2 mt-5 mb-2">
        <div className="flex-1 h-px bg-amber-900/40" />
        <span className="font-cinzel text-amber-900/80 font-bold text-xs tracking-widest uppercase">{label}</span>
        <div className="flex-1 h-px bg-amber-900/40" />
    </div>
);

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onStart }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleStart = () => {
        if (dontShowAgain) {
            SaveManager.save({ tutorialSeen: true });
        }
        onStart();
    };

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 18 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm mx-4"
            >
                <FantasyPanel variant="paper" contentPadding="p-6">
                    {/* Title */}
                    <div className="flex flex-col items-center mb-6 mt-2">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                            <h2
                                className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900"
                                style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
                            >
                                Kontroller
                            </h2>
                            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                        </div>
                        <p className="font-cinzel text-center text-amber-800/70 text-[11px] tracking-[0.25em] uppercase mt-3 font-semibold">
                            Slik spiller du Krigsringen
                        </p>
                    </div>

                    {/* Controls */}
                    <Divider label="Karakter" />
                    <Row
                        label="Bevegelse"
                        keys={
                            <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center">
                                <div className="flex items-center gap-1.5">
                                    <Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key>
                                </div>
                                <span className="text-amber-900/70 text-xs font-bold font-cinzel">eller</span>
                                <div className="flex items-center gap-1.5">
                                    <Key>↑</Key><Key>←</Key><Key>↓</Key><Key>→</Key>
                                </div>
                            </div>
                        }
                    />
                    <Row
                        label="Sikt"
                        keys={
                            <div className="flex items-center gap-1.5 font-cinzel text-amber-950 font-bold text-xs tracking-wide">
                                Mus
                            </div>
                        }
                    />
                    <Row
                        label="Angrep"
                        keys={
                            <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center">
                                <div className="flex items-center gap-1.5">
                                    <Key wide>LMB</Key>
                                </div>
                                <span className="text-amber-900/70 text-xs font-bold font-cinzel">eller</span>
                                <div className="flex items-center gap-1.5">
                                    <Key wide>Mellomrom</Key>
                                </div>
                            </div>
                        }
                    />
                    <Row label="Blokk" keys={<Key wide>RMB</Key>} />
                    <Row label="Dash" keys={<Key wide>Shift</Key>} />


                    <Divider label="Våpen" />
                    <Row
                        label="Bytt våpen"
                        keys={
                            <div className="flex flex-nowrap gap-1.5">
                                <Key>1</Key>
                                <Key>2</Key>
                                <Key>3</Key>
                                <Key>4</Key>
                                <Key>5</Key>
                            </div>
                        }
                    />

                    <Divider label="Meny" />
                    <Row label="Åpne butikk" keys={<Key>B</Key>} />
                    <Row label="Lukk" keys={<Key wide>Esc</Key>} />

                    {/* Footer */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <FantasyButton
                            label="Start Spill"
                            variant="primary"
                            onClick={handleStart}
                            className="w-52 text-lg !text-black [text-shadow:none]"
                        />
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={e => setDontShowAgain(e.target.checked)}
                                className="w-3.5 h-3.5 accent-amber-700 cursor-pointer"
                            />
                            <span className="font-cinzel text-amber-950/90 font-bold text-xs tracking-wide group-hover:text-amber-900 transition-colors">
                                Ikke vis igjen
                            </span>
                        </label>
                    </div>
                </FantasyPanel>
            </motion.div>
        </motion.div>
    );
};

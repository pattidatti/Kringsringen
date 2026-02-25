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
        className={`inline-flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-amber-200 font-mono text-xs font-bold shadow-inner py-1 min-w-[1.75rem] ${wide ? 'px-3' : 'px-1.5'}`}
        style={{ textShadow: '0 0 6px rgba(253,230,138,0.4)' }}
    >
        {children}
    </span>
);

const Row: React.FC<{ label: string; keys: React.ReactNode }> = ({ label, keys }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-amber-900/25 last:border-0">
        <span className="font-cinzel text-amber-900 text-xs tracking-wide w-32 shrink-0">{label}</span>
        <div className="flex items-center gap-1 flex-wrap">{keys}</div>
    </div>
);

const Divider: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center gap-2 mt-4 mb-1">
        <div className="flex-1 h-px bg-amber-900/30" />
        <span className="font-cinzel text-amber-700/60 text-[10px] tracking-widest uppercase">{label}</span>
        <div className="flex-1 h-px bg-amber-900/30" />
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
                    <h2
                        className="font-fantasy text-center text-2xl tracking-wider uppercase mb-0.5"
                        style={{ color: '#78350f', textShadow: '1px 1px 0 rgba(255,255,255,0.3)' }}
                    >
                        Kontroller
                    </h2>
                    <p className="font-cinzel text-center text-amber-700/60 text-[10px] tracking-widest uppercase mb-4">
                        Slik spiller du Krigsringen
                    </p>

                    {/* Controls */}
                    <Divider label="Karakter" />
                    <Row
                        label="Bevegelse"
                        keys={
                            <>
                                <Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key>
                                <span className="text-amber-700/50 text-[10px] mx-1 font-cinzel">eller</span>
                                <Key>↑</Key><Key>←</Key><Key>↓</Key><Key>→</Key>
                            </>
                        }
                    />
                    <Row
                        label="Angrep"
                        keys={
                            <>
                                <Key wide>LMB</Key>
                                <span className="text-amber-700/50 text-[10px] mx-1 font-cinzel">eller</span>
                                <Key wide>Mellomrom</Key>
                            </>
                        }
                    />
                    <Row label="Blokk" keys={<Key wide>RMB</Key>} />

                    <Divider label="Våpen" />
                    <Row
                        label="Bytt våpen"
                        keys={
                            <>
                                <Key>1</Key>
                                <Key>2</Key>
                                <Key>3</Key>
                                <Key>4</Key>
                                <Key>5</Key>
                            </>
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
                            <span className="font-cinzel text-amber-800/70 text-[11px] tracking-wide group-hover:text-amber-700 transition-colors">
                                Ikke vis igjen
                            </span>
                        </label>
                    </div>
                </FantasyPanel>
            </motion.div>
        </motion.div>
    );
};

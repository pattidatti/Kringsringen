import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FantasyPanel } from './FantasyPanel';
import { FantasyButton } from './FantasyButton';
import { SaveManager } from '../../game/SaveManager';

interface OnboardingTutorialProps {
    onStart: () => void;
    onClose?: () => void;
}

const Key: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
    <span
        className={`inline-flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-amber-100 font-mono text-[10px] font-bold shadow-inner py-0.5 min-w-[1.25rem] ${wide ? 'px-2' : 'px-1'}`}
        style={{ textShadow: '0 0 6px rgba(253,230,138,0.4)' }}
    >
        {children}
    </span>
);

const ControlItem: React.FC<{ label: string; keys: React.ReactNode }> = ({ label, keys }) => (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-amber-900/20 last:border-0 pl-1">
        <span className="font-cinzel text-amber-950 font-bold text-[11px] tracking-wide shrink-0 text-left uppercase">{label}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">{keys}</div>
    </div>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center gap-2 mb-2">
        <span className="font-cinzel text-amber-900/80 font-bold text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-amber-900/30" />
    </div>
);

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onStart, onClose }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleStart = () => {
        if (dontShowAgain) {
            SaveManager.save({ tutorialSeen: true });
        }
        onStart();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleBackdropClick}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-5xl mx-6 relative"
            >
                {/* Close Button "X" */}
                {onClose && (
                    <motion.div
                        className="absolute -top-3 -right-3 z-[60]"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <FantasyButton
                            label="✕"
                            variant="secondary"
                            onClick={onClose}
                            className="w-10 h-10 min-w-0 p-0 text-xl !text-black flex items-center justify-center"
                            title="Lukk (Esc)"
                        />
                    </motion.div>
                )}
                <FantasyPanel variant="paper" contentPadding="p-4 sm:p-8">
                    {/* Header - Minimal height */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b-2 border-amber-900/10 pb-4 gap-4">
                        <div className="flex flex-col">
                            <h2
                                className="font-cinzel font-bold text-3xl md:text-4xl tracking-[0.2em] uppercase text-amber-900"
                                style={{ textShadow: '2px 2px 0 rgba(120,53,15,0.1)' }}
                            >
                                Kontroller
                            </h2>
                            <p className="font-cinzel text-amber-800/60 text-[10px] tracking-[0.3em] uppercase mt-1 font-bold">
                                Slik spiller du Krigsringen
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={e => setDontShowAgain(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-amber-700 cursor-pointer"
                                />
                                <span className="font-cinzel text-amber-950/70 font-bold text-[10px] tracking-widest uppercase group-hover:text-amber-900 transition-colors">
                                    Ikke vis igjen
                                </span>
                            </label>
                            <FantasyButton
                                label="Start Spill"
                                variant="primary"
                                onClick={handleStart}
                                className="w-44 text-base !text-black [text-shadow:none]"
                            />
                        </div>
                    </div>

                    {/* Content - Horizontal Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        {/* Col 1: Karakter */}
                        <div className="flex flex-col">
                            <SectionHeader label="Karakter" />
                            <ControlItem
                                label="Bevegelse"
                                keys={
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-1">
                                            <Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Key>↑</Key><Key>←</Key><Key>↓</Key><Key>→</Key>
                                        </div>
                                    </div>
                                }
                            />
                            <ControlItem
                                label="Sikt"
                                keys={<div className="font-cinzel text-amber-950 font-bold text-[10px] tracking-widest uppercase">Mus</div>}
                            />
                            <ControlItem
                                label="Dash"
                                keys={<Key wide>Shift</Key>}
                            />
                        </div>

                        {/* Col 2: Kamp */}
                        <div className="flex flex-col">
                            <SectionHeader label="Kamp" />
                            <ControlItem
                                label="Angrep"
                                keys={
                                    <div className="flex flex-col items-end gap-1.5">
                                        <Key wide>LMB</Key>
                                        <Key wide>Space</Key>
                                    </div>
                                }
                            />
                            <ControlItem
                                label="Blokk"
                                keys={<Key wide>RMB</Key>}
                            />
                            <ControlItem
                                label="Bytt våpen"
                                keys={
                                    <div className="flex items-center gap-1">
                                        <Key>1</Key>
                                        <Key>2</Key>
                                        <Key>3</Key>
                                        <Key>4</Key>
                                        <Key>5</Key>
                                    </div>
                                }
                            />
                        </div>

                        {/* Col 3: System */}
                        <div className="flex flex-col">
                            <SectionHeader label="System" />
                            <ControlItem
                                label="Butikk"
                                keys={<Key>B</Key>}
                            />
                            <ControlItem
                                label="Lukk meny"
                                keys={<Key wide>Esc</Key>}
                            />
                        </div>
                    </div>
                </FantasyPanel>
            </motion.div>
        </motion.div>
    );
};

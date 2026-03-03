/**
 * ClassSelector – Fase 3 (Avant-Garde Redesign)
 * Vises ved nytt spill. Spilleren velger mellom Krieger, Archer og Wizard.
 * Fokus på visuell tyngde, minimal tekst og premium følelse.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CLASS_CONFIGS } from '../../config/classes';
import type { ClassId, ClassConfig } from '../../config/classes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClassSelectorProps {
    onSelect: (classId: ClassId) => void;
    onClose: () => void;
    defaultClass?: ClassId;
}

// ─── Stats Config ─────────────────────────────────────────────────────────────

const STAT_LABELS: Record<string, { emoji: string; label: string }> = {
    hp: { emoji: '❤️', label: 'HP' },
    speed: { emoji: '⚡', label: 'Fart' },
    damage: { emoji: '⚔️', label: 'Skade' },
    armor: { emoji: '🛡️', label: 'Rustning' },
};

// ─── Class Card ───────────────────────────────────────────────────────────────

interface ClassCardProps {
    config: ClassConfig;
    isSelected: boolean;
    isAnyConfirming: boolean;
    onClick: () => void;
    index: number;
}

const ClassCard: React.FC<ClassCardProps> = ({ config, isSelected, isAnyConfirming, onClick, index }) => {
    const color = config.color;
    const accentColor = config.accentColor;

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{
                y: 0,
                filter: 'blur(0px)',
                scale: isAnyConfirming && !isSelected ? 0.9 : 1,
                opacity: isAnyConfirming && !isSelected ? 0.1 : 1
            }}
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.23, 1, 0.32, 1]
            }}
            whileHover={!isAnyConfirming ? { y: -8, scale: 1.02, transition: { duration: 0.2 } } : {}}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-500 w-[340px] h-[520px] select-none
                ${isSelected ? 'border-transparent shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]' : 'border-white/10 grayscale-[40%] hover:grayscale-0'}
            `}
            style={{
                background: isSelected ? `linear-gradient(180deg, ${color}33 0%, #020617 100%)` : '#0f172a80',
                boxShadow: isSelected ? `0 0 40px ${color}44` : 'none'
            }}
        >
            {/* Portrait Background */}
            <div className="absolute inset-0 z-0">
                <motion.img
                    src={config.portrait}
                    alt={config.displayName}
                    className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110"
                    animate={isSelected ? { scale: 1.05, opacity: 0.8 } : { scale: 1, opacity: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-90" />
            </div>

            {/* Selection Glow */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 border-2 rounded-2xl z-10"
                        style={{ borderColor: color, boxShadow: `inset 0 0 30px ${color}44` }}
                    />
                )}
            </AnimatePresence>

            {/* Content Overlay */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8">
                {/* Visual Identity */}
                <div className="mb-4">
                    <motion.h2
                        className="font-fantasy text-4xl tracking-tighter uppercase mb-1"
                        style={{ color: '#fff', textShadow: `0 0 20px ${color}` }}
                    >
                        {config.displayName}
                    </motion.h2>
                    <div className="flex gap-2 flex-wrap">
                        {config.traits.map(trait => (
                            <span
                                key={trait}
                                className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-white/10 text-white/70 backdrop-blur-md border border-white/5"
                            >
                                {trait}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Sub-description (Streamlined) */}
                <p className="font-crimson text-sm text-white/60 leading-relaxed mb-6 italic">
                    "{config.tagline.split(' · ').join(' — ')}"
                </p>

                {/* Simplified Stats (Premium style) */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-6 border-t border-white/10">
                    {Object.entries(config.baseStats).slice(0, 4).map(([key, val]) => {
                        const spec = STAT_LABELS[key] || { emoji: '?', label: key };
                        const isPositive = val >= 1 || (key === 'armor' && val > 0);
                        const displayVal = key === 'armor'
                            ? (val > 0 ? `+${val}` : '0')
                            : `${val > 1 ? '+' : ''}${Math.round((val - 1) * 100)}%`;

                        return (
                            <div key={key} className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">{spec.label}</span>
                                <span className="text-xs font-cinzel font-bold" style={{ color: isPositive ? accentColor : '#f87171' }}>
                                    {displayVal}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Ability Preview */}
                <div className="mt-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/40 text-xs font-bold font-cinzel">
                        {config.classAbilityHotkey}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-white/30">Signatur Evne</span>
                        <span className="text-xs font-cinzel text-white/80 uppercase">
                            {config.classAbilityId.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Selection Overlay */}
            {isAnyConfirming && isSelected && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-white font-cinzel text-5xl font-bold uppercase tracking-[0.5em]"
                        style={{ textShadow: `0 0 40px ${color}` }}
                    >
                        VALGT
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
};

// ─── ClassSelector ────────────────────────────────────────────────────────────

const CLASS_ORDER: ClassId[] = ['krieger', 'archer', 'wizard'];

export const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelect, onClose }) => {
    const [selectedId, setSelectedId] = useState<ClassId | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const handleSelect = (id: ClassId) => {
        if (isConfirming) return;
        setSelectedId(id);
        setIsConfirming(true);

        // Premium feel: Let the choice settle for a moment
        setTimeout(() => {
            onSelect(id);
        }, 1200);
    };

    return (
        <div
            className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
            onClick={onClose}
        >
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}
                />
            </div>

            {/* Header Content */}
            <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 text-center mb-16"
            >
                <h1 className="font-cinzel text-6xl font-bold tracking-[0.3em] uppercase text-white mb-4">
                    VELG DIN <span className="text-amber-200">SKJEBNE</span>
                </h1>
                <div className="h-0.5 w-64 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent mx-auto mb-4" />
                <p className="font-crimson text-white/40 text-xl tracking-[0.15em] lowercase">
                    "mørket kaller, hvem svarer?"
                </p>
            </motion.div>

            {/* Class Cards Grid */}
            <div className="relative z-10 flex flex-row gap-10 items-center justify-center">
                {CLASS_ORDER.map((id, index) => (
                    <ClassCard
                        key={id}
                        config={CLASS_CONFIGS[id]}
                        isSelected={selectedId === id}
                        isAnyConfirming={isConfirming}
                        onClick={() => handleSelect(id)}
                        index={index}
                    />
                ))}
            </div>

            {/* Footer Guidance */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-12 text-white/40 font-cinzel text-[10px] tracking-[0.4em] uppercase"
            >
                Klikk for å starte din reise
            </motion.div>
        </div>
    );
};

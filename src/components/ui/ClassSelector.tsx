/**
 * ClassSelector – Fase 2
 * Vises ved nytt spill. Spilleren velger mellom Krieger, Archer og Wizard.
 * Bruker Framer Motion for stagger-animasjon og class-farger fra CLASS_CONFIGS.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CLASS_CONFIGS } from '../../config/classes';
import type { ClassId, ClassConfig } from '../../config/classes';


// ─── Props ────────────────────────────────────────────────────────────────────

interface ClassSelectorProps {
    /** Callback med valgt ClassId. Kalles kun etter eksplisitt "VELG"-klikk. */
    onSelect: (classId: ClassId) => void;
    /** Valgfri: forhåndsvalgt klasse (f.eks. lastSelectedClass fra SaveManager) */
    defaultClass?: ClassId;
}

// ─── Stat bar spec ────────────────────────────────────────────────────────────

interface StatBarDef {
    label: string;
    emoji: string;
    /** Returnerer en verdi 0-100 for fyllingsgrad (basert på ClassConfig) */
    getValue: (cfg: ClassConfig) => number;
    /** Leserlig diff-tekst, f.eks. "+30%" eller "+2" */
    getDiff: (cfg: ClassConfig) => string;
}

const STAT_BARS: StatBarDef[] = [
    {
        label: 'HP',
        emoji: '❤️',
        getValue: (c) => Math.round(c.baseStats.hp * 60),     // 0.80 → 48, 1.30 → 78
        getDiff: (c) => {
            const pct = Math.round((c.baseStats.hp - 1) * 100);
            return pct >= 0 ? `+${pct}%` : `${pct}%`;
        },
    },
    {
        label: 'Fart',
        emoji: '⚡',
        getValue: (c) => Math.round(c.baseStats.speed * 60),
        getDiff: (c) => {
            const pct = Math.round((c.baseStats.speed - 1) * 100);
            return pct >= 0 ? `+${pct}%` : `${pct}%`;
        },
    },
    {
        label: 'Skade',
        emoji: '⚔️',
        getValue: (c) => Math.round(c.baseStats.damage * 60),
        getDiff: (c) => {
            const pct = Math.round((c.baseStats.damage - 1) * 100);
            return pct >= 0 ? `+${pct}%` : `${pct}%`;
        },
    },
    {
        label: 'Rustning',
        emoji: '🛡️',
        getValue: (c) => Math.round(c.baseStats.armor * 25 + 30), // 0 → 30, 2 → 80
        getDiff: (c) => {
            const a = c.baseStats.armor;
            return a > 0 ? `+${a}` : '0';
        },
    },
];

// ─── Class Card ───────────────────────────────────────────────────────────────

interface ClassCardProps {
    config: ClassConfig;
    isSelected: boolean;
    isConfirming: boolean;
    onClick: () => void;
    index: number;
}

const CLASS_EMOJI: Record<ClassId, string> = {
    krieger: '⚔️',
    archer: '🏹',
    wizard: '🔮',
};

const ClassCard: React.FC<ClassCardProps> = ({ config, isSelected, isConfirming, onClick, index }) => {
    const color = config.color;
    const accentColor = config.accentColor;

    return (
        <motion.div
            variants={{
                hidden: { y: 48, opacity: 0 },
                visible: { y: 0, opacity: 1 },
            }}
            animate={
                isConfirming
                    ? isSelected
                        ? { scale: 1.05, y: -10, filter: 'brightness(1.2)' }
                        : { opacity: 0.3, scale: 0.95, filter: 'grayscale(100%)' }
                    : { scale: 1, y: isSelected ? -6 : 0, opacity: 1 }
            }
            transition={{ duration: 0.45, ease: 'easeOut', delay: isConfirming ? 0 : index * 0.1 }}
            onClick={onClick}
            style={{
                border: isSelected
                    ? `1.5px solid ${color}`
                    : '1px solid rgba(255,255,255,0.12)',
                boxShadow: isSelected
                    ? `0 0 28px ${color}55, 0 4px 24px rgba(0,0,0,0.5)`
                    : '0 4px 20px rgba(0,0,0,0.4)',
                background: isSelected
                    ? `linear-gradient(160deg, ${color}18 0%, rgba(15,23,42,0.95) 60%)`
                    : 'rgba(15,23,42,0.9)',
                transition: 'border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                cursor: isConfirming ? 'default' : 'pointer',
                pointerEvents: isConfirming ? 'none' : 'auto',
            }}
            className="relative flex flex-col rounded-xl overflow-hidden w-64 select-none"
            whileHover={!isConfirming ? { y: -4 } : undefined}
            whileTap={!isConfirming ? { scale: 0.97 } : undefined}
        >
            {/* Top color strip */}
            <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${color}, ${accentColor})` }}
            />

            {/* Header */}
            <div className="flex flex-col items-center pt-6 pb-3 px-5">
                <span className="text-5xl mb-2">{CLASS_EMOJI[config.id]}</span>
                <h2
                    className="font-cinzel text-2xl font-bold tracking-widest uppercase"
                    style={{ color, textShadow: `0 0 12px ${color}80` }}
                >
                    {config.displayName}
                </h2>
                <p
                    className="font-crimson text-sm mt-1 opacity-60 tracking-wide"
                    style={{ color: accentColor }}
                >
                    {config.tagline}
                </p>
            </div>

            {/* Description */}
            <p className="font-crimson text-sm text-slate-300 leading-relaxed px-5 pb-4 opacity-80 text-center">
                {config.description}
            </p>

            {/* Stat bars */}
            <div className="flex flex-col gap-2 px-5 pb-4">
                {STAT_BARS.map((bar) => {
                    const fill = Math.min(100, Math.max(0, bar.getValue(config)));
                    const diff = bar.getDiff(config);
                    return (
                        <div key={bar.label} className="flex items-center gap-2">
                            <span className="text-xs w-4">{bar.emoji}</span>
                            <span className="text-xs text-slate-400 w-14 font-crimson">{bar.label}</span>
                            <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${fill}%`,
                                        background: `linear-gradient(90deg, ${color}99, ${accentColor})`,
                                        transition: 'width 0.5s ease',
                                    }}
                                />
                            </div>
                            <span
                                className="text-xs w-10 text-right font-cinzel"
                                style={{ color: diff.startsWith('-') ? '#f87171' : accentColor }}
                            >
                                {diff}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Ability tagline */}
            <div
                className="mx-5 mb-6 rounded-lg px-3 py-2 text-center text-xs font-crimson"
                style={{
                    background: `${color}18`,
                    border: `1px solid ${color}40`,
                    color: accentColor,
                }}
            >
                Evne [{config.classAbilityHotkey}]: <span className="opacity-70">{config.classAbilityId.replace(/_/g, ' ')}</span>
            </div>
        </motion.div>
    );
};

// ─── ClassSelector ────────────────────────────────────────────────────────────

const CLASS_ORDER: ClassId[] = ['krieger', 'archer', 'wizard'];

export const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelect, defaultClass }) => {
    const [selectedClass, setSelectedClass] = useState<ClassId>(defaultClass ?? 'krieger');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleCardClick = (id: ClassId) => {
        if (isConfirming) return;

        setSelectedClass(id);
        setIsConfirming(true);

        // Stagger/delight animation before transitioning to the game
        setTimeout(() => {
            onSelect(id);
        }, 700);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-4">
                {/* Title */}
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <h1
                        className="font-fantasy text-5xl tracking-widest uppercase"
                        style={{
                            color: '#fde68a',
                            textShadow: '0 0 24px rgba(253,230,138,0.4), 2px 2px 0 #000',
                        }}
                    >
                        Velg Din Klasse
                    </h1>
                    <p className="font-crimson text-slate-400 text-lg mt-2 tracking-wide">
                        Hvem er du på slagmarken, kriger?
                    </p>
                </motion.div>

                {/* Cards */}
                <motion.div
                    className="flex flex-row gap-5 items-stretch"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                >
                    {CLASS_ORDER.map((id, index) => {
                        const config = CLASS_CONFIGS[id];
                        return (
                            <ClassCard
                                key={id}
                                config={config}
                                isSelected={selectedClass === id}
                                isConfirming={isConfirming}
                                index={index}
                                onClick={() => handleCardClick(id)}
                            />
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

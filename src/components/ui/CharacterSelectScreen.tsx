/**
 * CharacterSelectScreen – Multi-character Paragon profile picker.
 * Shows existing character cards + "New Character" slot.
 * Replaces the old "Start/Continue" flow on the landing page.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { SaveManager } from '../../game/SaveManager';
import { CLASS_CONFIGS } from '../../config/classes';
import type { ClassId } from '../../config/classes';
import type { ParagonProfile } from '../../config/paragon';
import { getParagonTierName, MAX_CHARACTER_SLOTS } from '../../config/paragon';

// ─── Props ──────────────────────────────────────────────────────────────────

interface CharacterSelectScreenProps {
    onSelectProfile: (profile: ParagonProfile) => void;
    onNewCharacter: () => void;
    onClose: () => void;
}

// ─── Character Card ─────────────────────────────────────────────────────────

const CharacterCard: React.FC<{
    profile: ParagonProfile;
    onSelect: () => void;
    onDelete: () => void;
}> = ({ profile, onSelect, onDelete }) => {
    const [showDelete, setShowDelete] = useState(false);
    const classConfig = CLASS_CONFIGS[profile.classId];
    const color = classConfig.color;
    const tierName = getParagonTierName(profile.paragonLevel);

    const lastPlayed = new Date(profile.lastPlayedAt);
    const timeAgo = getTimeAgo(lastPlayed);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={onSelect}
            className="relative group cursor-pointer rounded-xl border-2 border-white/10 hover:border-white/30 overflow-hidden w-[260px] h-[360px] select-none transition-colors"
            style={{ background: `linear-gradient(180deg, ${color}22 0%, #0a0f1a 100%)` }}
        >
            {/* Portrait */}
            <div className="absolute inset-0 z-0">
                <img
                    src={classConfig.portrait}
                    alt={classConfig.displayName}
                    className="w-full h-full object-cover opacity-30 transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-end p-5">
                {/* Paragon Badge */}
                {profile.paragonLevel > 0 && (
                    <div
                        className="absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-cinzel font-bold uppercase tracking-widest"
                        style={{
                            background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
                            color: '#fff',
                            boxShadow: `0 0 12px ${color}66`,
                        }}
                    >
                        {tierName}
                    </div>
                )}

                {/* Name & Class */}
                <h3
                    className="font-cinzel text-2xl font-bold text-white mb-1 truncate"
                    style={{ textShadow: `0 0 15px ${color}` }}
                >
                    {profile.name}
                </h3>
                <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-white/50 mb-4">
                    {classConfig.displayName}
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="flex flex-col items-center bg-white/5 rounded py-2">
                        <span className="text-[9px] uppercase tracking-widest text-white/40">Level</span>
                        <span className="text-lg font-cinzel text-white font-bold">{profile.currentGameLevel}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/5 rounded py-2">
                        <span className="text-[9px] uppercase tracking-widest text-white/40">Gull</span>
                        <span className="text-lg font-cinzel text-amber-300 font-bold">{formatNumber(profile.coins)}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/5 rounded py-2">
                        <span className="text-[9px] uppercase tracking-widest text-white/40">Drap</span>
                        <span className="text-lg font-cinzel text-red-400 font-bold">{formatNumber(profile.totalKills)}</span>
                    </div>
                </div>

                {/* Last played */}
                <p className="text-[10px] text-white/30 font-cinzel tracking-widest text-center">
                    {timeAgo}
                </p>
            </div>

            {/* Delete button (top-left, visible on hover) */}
            <div
                className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDelete(true);
                }}
            >
                <div className="w-7 h-7 rounded-full bg-red-900/80 hover:bg-red-700 flex items-center justify-center text-white/70 hover:text-white text-xs cursor-pointer transition-colors">
                    X
                </div>
            </div>

            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {showDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="font-cinzel text-white text-sm mb-4 text-center px-4">
                            Slett <span className="text-red-400">{profile.name}</span>?
                        </p>
                        <div className="flex gap-3">
                            <FantasyButton
                                label="Slett"
                                variant="danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="text-sm px-4 py-1"
                            />
                            <FantasyButton
                                label="Avbryt"
                                variant="secondary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDelete(false);
                                }}
                                className="text-sm px-4 py-1"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── New Character Slot ─────────────────────────────────────────────────────

const NewCharacterSlot: React.FC<{ onClick: () => void; disabled: boolean }> = ({ onClick, disabled }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={disabled ? {} : { y: -4, scale: 1.02 }}
        onClick={disabled ? undefined : onClick}
        className={`relative rounded-xl border-2 border-dashed overflow-hidden w-[260px] h-[360px] select-none flex flex-col items-center justify-center gap-4 transition-colors
            ${disabled ? 'border-white/5 cursor-not-allowed opacity-30' : 'border-white/20 hover:border-amber-400/50 cursor-pointer'}
        `}
        style={{ background: '#0a0f1a' }}
    >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-cinzel ${disabled ? 'bg-white/5 text-white/20' : 'bg-amber-400/10 text-amber-400/70'}`}>
            +
        </div>
        <p className={`font-cinzel text-sm uppercase tracking-[0.2em] ${disabled ? 'text-white/20' : 'text-white/40'}`}>
            {disabled ? 'Fullt' : 'Ny Karakter'}
        </p>
    </motion.div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
    onSelectProfile,
    onNewCharacter,
    onClose,
}) => {
    const [profiles, setProfiles] = useState(() => SaveManager.loadProfiles().profiles);
    const isFull = profiles.length >= MAX_CHARACTER_SLOTS;

    const handleDelete = useCallback((profileId: string) => {
        SaveManager.deleteProfile(profileId);
        setProfiles(SaveManager.loadProfiles().profiles);
    }, []);

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 text-center mb-12"
            >
                <h1 className="font-cinzel text-5xl font-bold tracking-[0.2em] uppercase text-white mb-3">
                    VELG <span className="text-amber-200">KARAKTER</span>
                </h1>
                <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent mx-auto mb-3" />
                <p className="font-crimson text-white/40 text-lg tracking-[0.1em]">
                    {profiles.length} / {MAX_CHARACTER_SLOTS} plasser brukt
                </p>
            </motion.div>

            {/* Character Grid */}
            <div className="relative z-10 flex flex-row gap-6 items-start justify-center flex-wrap max-w-[1200px] px-8">
                {profiles
                    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
                    .map((profile) => (
                        <CharacterCard
                            key={profile.id}
                            profile={profile}
                            onSelect={() => onSelectProfile(profile)}
                            onDelete={() => handleDelete(profile.id)}
                        />
                    ))}
                <NewCharacterSlot onClick={onNewCharacter} disabled={isFull} />
            </div>

            {/* Back button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative z-10 mt-10"
            >
                <FantasyButton
                    label="Tilbake"
                    variant="secondary"
                    onClick={onClose}
                    className="w-48 text-base"
                />
            </motion.div>
        </div>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
    if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
}

function getTimeAgo(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Akkurat nå';
    if (minutes < 60) return `${minutes} min siden`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}t siden`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d siden`;
    return date.toLocaleDateString('nb-NO');
}

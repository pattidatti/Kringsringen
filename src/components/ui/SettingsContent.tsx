import React, { useState, useEffect } from 'react';
import { AudioManager } from '../../game/AudioManager';
import type { AudioSettings } from '../../game/AudioManager';
import { SaveManager } from '../../game/SaveManager';
import { FantasyButton } from './FantasyButton';

interface SettingsContentProps {
    inBookContext?: boolean; // Changes layout slightly if needed
    onInteraction?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({ inBookContext, onInteraction }) => {
    const [audioSettings, setAudioSettings] = useState<AudioSettings>({
        masterVolume: 1.0,
        bgmVolume: 0.8,
        sfxVolume: 1.0,
        uiVolume: 1.0,
        bgsVolume: 0.8,
        isMuted: false,
    });

    useEffect(() => {
        const saved = SaveManager.load().audioSettings;
        if (saved) {
            setAudioSettings((prev) => ({ ...prev, ...saved }));
        }
    }, []);

    const handleVolumeChange = (category: keyof AudioSettings, value: number) => {
        if (onInteraction) onInteraction();
        AudioManager.instance.setVolume(category, value);

        setAudioSettings((prev) => {
            const next = { ...prev, [category]: value };
            // Since AudioManager handles SaveManager.save, we just update local state
            return next;
        });

        // Play sample sound based on category
        if (category === 'sfxVolume' && value > 0) {
            AudioManager.instance.playSFX('swing', { volume: 0.5 });
        } else if (category === 'uiVolume' && value > 0) {
            AudioManager.instance.playSFX('ui_click', { volume: 0.5 });
        }
    };

    const handleResetToDefaults = () => {
        if (onInteraction) onInteraction();

        const defaults: AudioSettings = {
            masterVolume: 1.0,
            bgmVolume: 0.8,
            sfxVolume: 1.0,
            uiVolume: 1.0,
            bgsVolume: 0.8,
            isMuted: false,
        };

        setAudioSettings(defaults);

        // Update AudioManager
        (Object.keys(defaults) as Array<keyof AudioSettings>).forEach(key => {
            if (key !== 'isMuted') {
                AudioManager.instance.setVolume(key, defaults[key] as number);
            }
        });

        AudioManager.instance.playSFX('ui_click', { volume: 0.5 });
    };

    const renderSliderRow = (label: string, category: keyof AudioSettings, icon: string) => {
        const value = audioSettings[category] as number;
        return (
            <div className={`flex flex-col gap-1 py-3 border-b border-dotted ${inBookContext ? 'border-amber-900/20' : 'border-slate-700/50'}`}>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-cinzel font-bold text-lg">
                        <span className="text-xl opacity-80">{icon}</span>
                        {label}
                    </span>
                    <span className="font-crimson font-bold text-lg w-12 text-right">
                        {Math.round(value * 100)}%
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={value}
                        onChange={(e) => handleVolumeChange(category, parseFloat(e.target.value))}
                        className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        onMouseUp={() => { if (onInteraction) onInteraction(); }}
                        onTouchEnd={() => { if (onInteraction) onInteraction(); }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className={`flex h-full font-crimson ${inBookContext ? 'text-slate-900' : 'text-slate-200'} animate-in fade-in duration-300`}>
            {/* Left sidebar: Categories */}
            <div className={`${inBookContext ? 'w-1/2' : 'w-1/3'} flex flex-col pr-8 border-r ${inBookContext ? 'border-amber-900/30' : 'border-slate-700'}`}>
                <h2 className="font-cinzel font-bold text-xl mb-6 opacity-60 tracking-widest uppercase">Kategorier</h2>

                <button
                    className={`w-full text-left py-3 px-4 rounded-lg font-cinzel text-lg font-bold transition-all
                        ${inBookContext
                            ? 'bg-amber-900/10 text-amber-950 border border-amber-900/20 shadow-inner'
                            : 'bg-slate-800 text-slate-100 border border-slate-600'}
                    `}
                >
                    <span className="mr-3">🎵</span> Lyd
                </button>
                {/* Future categories go here */}
            </div>

            {/* Right content: Toggles & Sliders */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${inBookContext ? 'pl-8 pr-2' : 'pl-6'}`}>
                <h2 className="font-cinzel font-bold text-2xl mb-4 tracking-wider uppercase border-b pb-2"
                    style={{ borderColor: inBookContext ? 'rgba(120,53,15,0.2)' : 'rgba(148,163,184,0.2)' }}>
                    Lydinnstillinger
                </h2>

                <div className="space-y-2">
                    {renderSliderRow('Master Volum', 'masterVolume', '🔊')}
                    {renderSliderRow('Musikk', 'bgmVolume', '🎸')}
                    {renderSliderRow('Lydeffekter', 'sfxVolume', '⚔️')}
                    {renderSliderRow('Grensesnitt', 'uiVolume', '🖱️')}
                    {renderSliderRow('Omgivelser', 'bgsVolume', '🍃')}
                </div>

                <div className="mt-4 pt-4 pb-4 border-t flex justify-end" style={{ borderColor: inBookContext ? 'rgba(120,53,15,0.2)' : 'rgba(148,163,184,0.2)' }}>
                    <FantasyButton
                        label="Gjenopprett Standard"
                        variant="danger"
                        onClick={handleResetToDefaults}
                        className="scale-90 origin-right"
                    />
                </div>
            </div>
        </div>
    );
};

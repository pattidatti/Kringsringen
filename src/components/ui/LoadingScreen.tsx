import React, { useEffect, useState, useRef } from 'react';
import { LOADING_TIPS } from '../../config/loadingTips';

interface LoadingScreenProps {
    visible: boolean;
    progress?: number; // 0–1, from PreloadScene via registry
    networkStatus?: { loaded: number; expected: number };
}

const CATEGORY_ICONS = {
    combat: '⚔',
    strategy: '◈',
    lore: '✦',
} as const;

const TIP_INTERVAL_MS = 4500;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ visible, progress, networkStatus }) => {
    const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
    const [tipOpacity, setTipOpacity] = useState(1);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!visible) return;

        // Start rotating tips
        intervalRef.current = setInterval(() => {
            setTipOpacity(0);
            setTimeout(() => {
                setTipIndex(i => (i + 1) % LOADING_TIPS.length);
                setTipOpacity(1);
            }, 250);
        }, TIP_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [visible]);

    if (!visible) return null;

    const tip = LOADING_TIPS[tipIndex];
    const percent = progress != null && progress > 0 ? Math.min(100, Math.round(progress * 100)) : null;
    const isIndeterminate = percent === null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#07070f] flex flex-col items-center justify-center overflow-hidden">

            {/* Radial vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }}
            />

            {/* Corner ornaments */}
            <div className="absolute top-12 left-12 w-16 h-16 border-t-2 border-l-2 border-amber-800/30" />
            <div className="absolute top-12 right-12 w-16 h-16 border-t-2 border-r-2 border-amber-800/30" />
            <div className="absolute bottom-12 left-12 w-16 h-16 border-b-2 border-l-2 border-amber-800/30" />
            <div className="absolute bottom-12 right-12 w-16 h-16 border-b-2 border-r-2 border-amber-800/30" />

            <div className="relative flex flex-col items-center gap-20 w-full max-w-xl px-12">

                {/* Title */}
                <div className="flex flex-col items-center gap-6">
                    <div className="font-cinzel text-sm tracking-[0.4em] text-amber-700/60 uppercase">
                        ✦ &nbsp; Laster inn &nbsp; ✦
                    </div>
                    <h1
                        className="font-cinzel text-[5.5rem] leading-none text-amber-100 tracking-[0.15em] uppercase"
                        style={{ textShadow: '0 0 60px rgba(251,191,36,0.25), 0 4px 8px rgba(0,0,0,0.8)' }}
                    >
                        Kringsringen
                    </h1>
                    <div className="h-px w-[28rem] bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />
                </div>

                {/* Loading bar panel */}
                <div className="w-full flex flex-col gap-6">

                    {/* Status row */}
                    <div className="flex items-center justify-between px-1">
                        <span className="font-cinzel text-[22px] tracking-[0.2em] text-amber-500/70 uppercase animate-pulse">
                            Laster Verden...
                        </span>
                        {percent !== null && (
                            <span className="font-cinzel text-[20px] text-amber-700/50 tabular-nums">
                                {percent}%
                            </span>
                        )}
                    </div>

                    {/* Progress track */}
                    <div
                        className="relative h-[6px] w-full rounded-full overflow-hidden"
                        style={{ background: 'rgba(120,53,15,0.25)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
                    >
                        {isIndeterminate ? (
                            <div
                                className="absolute top-0 left-0 h-full w-2/5 rounded-full animate-pulse"
                                style={{
                                    background: 'linear-gradient(90deg, #92400e 0%, #d97706 60%, #fbbf24 100%)',
                                    boxShadow: '0 0 12px rgba(251,191,36,0.5)',
                                }}
                            />
                        ) : (
                            <div
                                className="h-full rounded-full transition-[width] duration-300 ease-out"
                                style={{
                                    width: `${percent}%`,
                                    background: 'linear-gradient(90deg, #92400e 0%, #d97706 60%, #fbbf24 100%)',
                                    boxShadow: '0 0 12px rgba(251,191,36,0.5)',
                                }}
                            />
                        )}
                    </div>

                    {/* Network status */}
                    {networkStatus && (
                        <div className="text-center font-cinzel text-[20px] tracking-widest text-amber-600/50 uppercase">
                            [ {networkStatus.loaded} / {networkStatus.expected} ] Spillere klare
                        </div>
                    )}
                </div>

                {/* Tip section */}
                <div
                    className="flex flex-col items-center gap-4 w-full transition-opacity"
                    style={{ opacity: tipOpacity, transitionDuration: '250ms' }}
                >
                    <div className="font-cinzel text-[20px] tracking-[0.3em] text-amber-800/60 uppercase">
                        {CATEGORY_ICONS[tip.category]} &nbsp; Visste du at
                    </div>
                    <p className="font-crimson text-[30px] text-amber-200/55 text-center leading-relaxed max-w-2xl">
                        {tip.text}
                    </p>
                </div>

            </div>
        </div>
    );
};

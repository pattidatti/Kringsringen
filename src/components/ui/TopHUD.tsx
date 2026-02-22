import React, { useEffect, useState } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { FantasyIcon } from './FantasyIcon';
// import { FantasyPanel } from './FantasyPanel'; // We might use a custom ribbon approach

export const TopHUD: React.FC = React.memo(() => {
    const hp = useGameRegistry('playerHP', 100);
    const maxHp = useGameRegistry('playerMaxHP', 100);
    const level = useGameRegistry('gameLevel', 1);
    const wave = useGameRegistry('currentWave', 1);
    const maxWaves = useGameRegistry('maxWaves', 1);
    const coins = useGameRegistry('playerCoins', 0);

    const [isMounting, setIsMounting] = useState(true);

    useEffect(() => {
        setIsMounting(false);
    }, []);

    const hpPercent = Math.min(100, Math.max(0, (hp / maxHp) * 100));

    const isLowHp = hpPercent < 25;

    return (
        <div
            className={`absolute top-0 left-0 w-full flex justify-between items-start p-4 pointer-events-none transition-transform duration-700 ease-out ${isMounting ? '-translate-y-full' : 'translate-y-0'}`}
        >
            {/* Left Wing: Vitals (HP/XP) */}
            <div className="flex flex-col gap-1 pointer-events-auto">
                {/* HP Bar */}
                <div className={`relative w-64 h-8 bg-black/60 border-2 border-amber-900/50 rounded-r-full overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300 ${isLowHp ? 'shadow-red-500/50 animate-pulse' : ''}`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[url('/assets/ui/fantasy/UI_Bars.png')] bg-repeat-x" style={{ backgroundSize: 'auto 100%' }} />

                    {/* Fill */}
                    <div
                        className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-300 ease-out"
                        style={{ width: `${hpPercent}%` }}
                    />

                    {/* Gloss */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                    {/* Icon & Label */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/90 font-bold text-xs drop-shadow-md">
                        <FantasyIcon icon="heart" size="sm" />
                        <span>{Math.ceil(hp)} / {Math.ceil(maxHp)}</span>
                    </div>
                </div>


            </div>

            {/* Center: Phase & Level Indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center pointer-events-auto">
                {/* Decorative Ribbon Backing (CSS or Image) */}
                <div className="relative bg-amber-950/80 border-x border-b border-amber-500/30 px-8 py-2 rounded-b-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1 group">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500/50" />
                        <h1 className="text-2xl font-black text-amber-100 m-text-outline tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
                            Level {level}
                        </h1>
                        <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500/50" />
                    </div>

                    <span className="text-base font-black text-white uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">Fase {wave} / {maxWaves}</span>

                    {/* Progress Micro-bar for Wave */}
                    <div className="w-full h-0.5 bg-black/50 mt-0.5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400/80" style={{ width: `${(wave / maxWaves) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Right Wing: Economy */}
            <div className="flex items-center gap-3 pointer-events-auto bg-black/60 border-2 border-amber-900/50 pl-4 pr-6 py-1 rounded-l-full shadow-lg backdrop-blur-sm mt-2">
                <div className="text-right">
                    <div className="text-[10px] text-amber-200/60 uppercase tracking-widest">Wealth</div>
                    <div className="text-amber-100 font-bold text-lg leading-none m-text-gold">{coins}</div>
                </div>
                <FantasyIcon icon="coin" size="md" className="animate-pulse" />
            </div>
        </div>
    );
});

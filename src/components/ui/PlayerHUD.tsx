import React from 'react';
import { FantasyPanel } from './FantasyPanel';
import { FantasyProgressBar } from './FantasyProgressBar';
import { FantasyIcon } from './FantasyIcon';

interface PlayerHUDProps {
    hp: number;
    maxHp: number;
    xp: number;
    maxXp: number;
    level: number;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
    hp,
    maxHp,
    xp,
    maxXp,
    level,
}) => {
    return (
        <div className="flex flex-col gap-2 w-72 pointer-events-none select-none">
            {/* Main Panel */}
            <FantasyPanel variant="gold" scale={3} className="pointer-events-auto p-5 pb-6 shadow-2xl drop-shadow-2xl">
                <div className="flex flex-col gap-4">
                    {/* Header: Title & Level */}
                    <div className="flex flex-col items-center border-b-2 border-amber-900/20 pb-3 mb-1">
                        <h1 className="m-text-gold text-2xl tracking-[0.15em] uppercase drop-shadow-sm text-center font-bold">
                            Kringsringen
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-[1px] w-6 bg-amber-900/30" />
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded text-amber-100/90">
                                <span className="text-[10px] tracking-widest uppercase opacity-70">Nivå</span>
                                <span className="text-sm font-bold m-text-gold leading-none">{level}</span>
                            </div>
                            <div className="h-[1px] w-6 bg-amber-900/30" />
                        </div>
                    </div>

                    {/* Bars */}
                    <div className="flex flex-col gap-4">
                        {/* HP */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-md rounded-full" />
                                <FantasyIcon icon="heart" size="md" className="relative z-10 drop-shadow-md" />
                            </div>
                            <FantasyProgressBar
                                value={hp}
                                max={maxHp}
                                variant="health"
                                className="flex-1"
                            />
                        </div>

                        {/* XP */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full" />
                                <FantasyIcon icon="shield" size="md" className="relative z-10 drop-shadow-md" />
                            </div>
                            <FantasyProgressBar
                                value={xp}
                                max={maxXp}
                                variant="xp"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            </FantasyPanel>

            {/* Optional: Add active buffs or other small indicators below */}
        </div>
    );
};

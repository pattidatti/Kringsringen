import React from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';

/**
 * Small HUD showing teammate name + HP bar in 2v2 mode.
 * Displayed bottom-left corner.
 */
export const Pvp2v2TeammateHUD: React.FC = () => {
    const pvp2v2State = useGameRegistry<string>('pvp2v2State', 'waiting');
    const teammateName = useGameRegistry<string>('pvp2v2TeammateName', '');
    const teammateHP = useGameRegistry<number>('pvp2v2TeammateHP', 0);
    const teammateMaxHP = useGameRegistry<number>('pvp2v2TeammateMaxHP', 100);
    const myTeam = useGameRegistry<string>('pvp2v2MyTeam', 'A');

    if (!teammateName || pvp2v2State === 'match_end') return null;

    const hpPct = Math.max(0, Math.min(1, teammateHP / (teammateMaxHP || 1)));
    const teamColor = myTeam === 'A' ? '#4ade80' : '#f87171';

    return (
        <div
            className="fixed bottom-28 left-4 z-50 pointer-events-none"
            style={{ width: 160 }}
        >
            <div
                className="rounded px-2 py-1"
                style={{
                    background: 'rgba(0,0,0,0.65)',
                    border: `1px solid ${teamColor}44`,
                }}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[100px]"
                        style={{ color: teamColor }}>
                        {teammateName}
                    </span>
                    <span className="text-xs text-stone-400 ml-1">
                        {Math.max(0, Math.round(teammateHP))}
                    </span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${hpPct * 100}%`,
                            background: hpPct > 0.5 ? teamColor : hpPct > 0.25 ? '#fbbf24' : '#ef4444',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

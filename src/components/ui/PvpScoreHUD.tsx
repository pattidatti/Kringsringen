import React from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';

export const PvpScoreHUD: React.FC = () => {
    const pvpScore = useGameRegistry<[number, number]>('pvpScore', [0, 0]);
    const pvpRound = useGameRegistry<number>('pvpRound', 1);
    const pvpBestOf = useGameRegistry<number>('pvpBestOf', 5);
    const pvpRoundTimer = useGameRegistry<number>('pvpRoundTimer', 120);
    const pvpState = useGameRegistry<string>('pvpState', 'waiting');
    const nickname = useGameRegistry<string>('nickname', 'Du');
    const pvpOpponentName = useGameRegistry<string>('pvpOpponentName', 'Motstander');

    if (pvpState === 'match_end') return null;

    const timerMinutes = Math.floor(pvpRoundTimer / 60);
    const timerSeconds = pvpRoundTimer % 60;
    const timerStr = `${timerMinutes}:${timerSeconds.toString().padStart(2, '0')}`;
    const timerWarning = pvpRoundTimer <= 15;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="flex flex-col items-center pt-3">
                {/* Score */}
                <div className="flex items-center gap-4 px-6 py-2 rounded-b-lg"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 100%)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderTop: 'none',
                    }}>
                    <span className="text-amber-200 font-fantasy text-lg truncate max-w-[120px]">{nickname}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-fantasy text-3xl font-bold"
                            style={{ textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>
                            {pvpScore[0]}
                        </span>
                        <span className="text-amber-100/40 font-fantasy text-xl">-</span>
                        <span className="text-white font-fantasy text-3xl font-bold"
                            style={{ textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>
                            {pvpScore[1]}
                        </span>
                    </div>
                    <span className="text-amber-200 font-fantasy text-lg truncate max-w-[120px]">{pvpOpponentName}</span>
                </div>

                {/* Round info + timer */}
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-amber-100/50 text-xs">
                        Runde {pvpRound} av {pvpBestOf}
                    </span>
                    {pvpState === 'fighting' && (
                        <span className={`text-sm font-mono font-bold ${
                            timerWarning ? 'text-red-400 animate-pulse' : 'text-amber-200/80'
                        }`}>
                            {timerStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

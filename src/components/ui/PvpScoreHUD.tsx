import React from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';

const Pvp1v1ScoreHUD: React.FC = () => {
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
                        <span className="text-amber-600 font-fantasy text-xl">-</span>
                        <span className="text-white font-fantasy text-3xl font-bold"
                            style={{ textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>
                            {pvpScore[1]}
                        </span>
                    </div>
                    <span className="text-amber-200 font-fantasy text-lg truncate max-w-[120px]">{pvpOpponentName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-amber-400 text-xs">
                        Runde {pvpRound} av {pvpBestOf}
                    </span>
                    {pvpState === 'fighting' && (
                        <span className={`text-sm font-mono font-bold ${timerWarning ? 'text-red-400 animate-pulse' : 'text-amber-200'}`}>
                            {timerStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const Pvp2v2ScoreHUD: React.FC = () => {
    const pvp2v2Score = useGameRegistry<[number, number]>('pvp2v2Score', [0, 0]);
    const pvp2v2Round = useGameRegistry<number>('pvp2v2Round', 1);
    const pvp2v2BestOf = useGameRegistry<number>('pvp2v2BestOf', 5);
    const pvp2v2RoundTimer = useGameRegistry<number>('pvp2v2RoundTimer', 120);
    const pvp2v2State = useGameRegistry<string>('pvp2v2State', 'waiting');
    const myTeam = useGameRegistry<string>('pvp2v2MyTeam', 'A');

    if (pvp2v2State === 'match_end') return null;

    const timerMinutes = Math.floor(pvp2v2RoundTimer / 60);
    const timerSeconds = pvp2v2RoundTimer % 60;
    const timerStr = `${timerMinutes}:${timerSeconds.toString().padStart(2, '0')}`;
    const timerWarning = pvp2v2RoundTimer <= 15;

    const teamAColor = myTeam === 'A' ? '#4ade80' : '#f87171';
    const teamBColor = myTeam === 'B' ? '#4ade80' : '#f87171';

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="flex flex-col items-center pt-3">
                <div className="flex items-center gap-4 px-6 py-2 rounded-b-lg"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 100%)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderTop: 'none',
                    }}>
                    <span className="font-fantasy text-lg" style={{ color: teamAColor }}>Team A</span>
                    <div className="flex items-center gap-2">
                        <span className="font-fantasy text-3xl font-bold"
                            style={{ color: teamAColor, textShadow: '0 0 8px rgba(74,222,128,0.4)' }}>
                            {pvp2v2Score[0]}
                        </span>
                        <span className="text-amber-600 font-fantasy text-xl">–</span>
                        <span className="font-fantasy text-3xl font-bold"
                            style={{ color: teamBColor, textShadow: '0 0 8px rgba(248,113,113,0.4)' }}>
                            {pvp2v2Score[1]}
                        </span>
                    </div>
                    <span className="font-fantasy text-lg" style={{ color: teamBColor }}>Team B</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-amber-400 text-xs">2v2 · Runde {pvp2v2Round} av {pvp2v2BestOf}</span>
                    {pvp2v2State === 'fighting' && (
                        <span className={`text-sm font-mono font-bold ${timerWarning ? 'text-red-400 animate-pulse' : 'text-amber-200'}`}>
                            {timerStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PvpScoreHUDProps {
    mode?: 'pvp' | 'pvp2v2';
}

export const PvpScoreHUD: React.FC<PvpScoreHUDProps> = ({ mode = 'pvp' }) => {
    if (mode === 'pvp2v2') return <Pvp2v2ScoreHUD />;
    return <Pvp1v1ScoreHUD />;
};

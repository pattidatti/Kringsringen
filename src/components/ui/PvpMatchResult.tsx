import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import type { Pvp2v2MatchResultData } from '../../game/Pvp2v2RoundManager';

export interface PvpMatchResultData {
    winner: 'player' | 'opponent';
    finalScore: [number, number];
    roundResults: Array<{ winner: 'player' | 'opponent'; reason: 'death' | 'timeout' }>;
    disconnected?: boolean;
}

interface PvpMatchResultProps {
    onRematch: () => void;
    onLeave: () => void;
    mode?: 'pvp' | 'pvp2v2';
}

const Pvp1v1MatchResult: React.FC<Omit<PvpMatchResultProps, 'mode'>> = ({ onRematch, onLeave }) => {
    const pvpState = useGameRegistry<string>('pvpState', 'waiting');
    const pvpMatchResult = useGameRegistry<PvpMatchResultData | null>('pvpMatchResult', null);
    const nickname = useGameRegistry<string>('nickname', 'Du');
    const pvpOpponentName = useGameRegistry<string>('pvpOpponentName', 'Motstander');

    if (pvpState !== 'match_end' || !pvpMatchResult) return null;

    const isWinner = pvpMatchResult.winner === 'player';

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                    <FantasyPanel className="w-[440px] p-8 flex flex-col items-center gap-5">
                        <h1 className="font-fantasy text-5xl tracking-wider"
                            style={{
                                color: isWinner ? '#fde68a' : '#f87171',
                                textShadow: isWinner
                                    ? '0 0 30px rgba(253,230,138,0.6), 3px 3px 0 #000'
                                    : '0 0 20px rgba(248,113,113,0.4), 3px 3px 0 #000'
                            }}>
                            {pvpMatchResult.disconnected ? 'Motstander koblet fra' : isWinner ? 'SEIER!' : 'TAP'}
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-stone-700 text-sm truncate max-w-[120px]">{nickname}</p>
                                <p className="text-stone-900 font-fantasy text-4xl font-bold">{pvpMatchResult.finalScore[0]}</p>
                            </div>
                            <span className="text-stone-500 font-fantasy text-2xl">-</span>
                            <div className="text-center">
                                <p className="text-stone-700 text-sm truncate max-w-[120px]">{pvpOpponentName}</p>
                                <p className="text-stone-900 font-fantasy text-4xl font-bold">{pvpMatchResult.finalScore[1]}</p>
                            </div>
                        </div>
                        <div className="w-full border-t border-amber-800/30 pt-3">
                            <p className="text-stone-600 text-xs text-center mb-2">Rundeoversikt</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pvpMatchResult.roundResults.map((r, i) => (
                                    <div key={i}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                                            r.winner === 'player'
                                                ? 'bg-green-900/40 border-green-500/50 text-green-400'
                                                : 'bg-red-900/40 border-red-500/50 text-red-400'
                                        }`}
                                        title={`Runde ${i + 1}: ${r.winner === 'player' ? nickname : pvpOpponentName} (${r.reason === 'timeout' ? 'tid ut' : 'eliminasjon'})`}
                                    >
                                        {r.winner === 'player' ? 'W' : 'L'}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 w-full mt-2">
                            <FantasyButton label="Rematch" variant="primary" onClick={onRematch} className="flex-1" />
                            <FantasyButton label="Forlat" variant="secondary" onClick={onLeave} className="flex-1" />
                        </div>
                    </FantasyPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const Pvp2v2MatchResult: React.FC<Omit<PvpMatchResultProps, 'mode'>> = ({ onRematch, onLeave }) => {
    const pvp2v2State = useGameRegistry<string>('pvp2v2State', 'waiting');
    const pvp2v2MatchResult = useGameRegistry<Pvp2v2MatchResultData | null>('pvp2v2MatchResult', null);

    if (pvp2v2State !== 'match_end' || !pvp2v2MatchResult) return null;

    const { winnerTeam, myTeam, finalScore, roundResults, disconnected } = pvp2v2MatchResult;
    const didWin = winnerTeam === myTeam;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                    <FantasyPanel className="w-[440px] p-8 flex flex-col items-center gap-5">
                        <h1 className="font-fantasy text-4xl tracking-wider"
                            style={{
                                color: didWin ? '#fde68a' : '#f87171',
                                textShadow: didWin
                                    ? '0 0 30px rgba(253,230,138,0.6), 3px 3px 0 #000'
                                    : '0 0 20px rgba(248,113,113,0.4), 3px 3px 0 #000'
                            }}>
                            {disconnected ? 'Motstander koblet fra' : `Team ${winnerTeam} Seier!`}
                        </h1>

                        {/* Score */}
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-sm" style={{ color: myTeam === 'A' ? '#4ade80' : '#f87171' }}>Team A</p>
                                <p className="font-fantasy text-4xl font-bold text-stone-900">{finalScore[0]}</p>
                            </div>
                            <span className="text-stone-500 font-fantasy text-2xl">–</span>
                            <div className="text-center">
                                <p className="text-sm" style={{ color: myTeam === 'B' ? '#4ade80' : '#f87171' }}>Team B</p>
                                <p className="font-fantasy text-4xl font-bold text-stone-900">{finalScore[1]}</p>
                            </div>
                        </div>

                        {/* Round breakdown */}
                        <div className="w-full border-t border-amber-800/30 pt-3">
                            <p className="text-stone-600 text-xs text-center mb-2">Rundeoversikt</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {roundResults.map((r, i) => {
                                    const roundWin = r.winnerTeam === myTeam;
                                    return (
                                        <div key={i}
                                            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                                                roundWin
                                                    ? 'bg-green-900/40 border-green-500/50 text-green-400'
                                                    : 'bg-red-900/40 border-red-500/50 text-red-400'
                                            }`}
                                            title={`Runde ${i + 1}: Team ${r.winnerTeam} (${r.reason === 'timeout' ? 'tid ut' : 'eliminasjon'})`}
                                        >
                                            {roundWin ? 'W' : 'L'}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 w-full mt-2">
                            <FantasyButton label="Rematch" variant="primary" onClick={onRematch} className="flex-1" />
                            <FantasyButton label="Forlat" variant="secondary" onClick={onLeave} className="flex-1" />
                        </div>
                    </FantasyPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export const PvpMatchResult: React.FC<PvpMatchResultProps> = ({ mode = 'pvp', ...rest }) => {
    if (mode === 'pvp2v2') return <Pvp2v2MatchResult {...rest} />;
    return <Pvp1v1MatchResult {...rest} />;
};

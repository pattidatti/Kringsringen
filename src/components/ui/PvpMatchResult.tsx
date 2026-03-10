import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { useGameRegistry } from '../../hooks/useGameRegistry';

export interface PvpMatchResultData {
    winner: 'player' | 'opponent';
    finalScore: [number, number];
    roundResults: Array<{ winner: 'player' | 'opponent'; reason: 'death' | 'timeout' }>;
    disconnected?: boolean;
}

interface PvpMatchResultProps {
    onRematch: () => void;
    onLeave: () => void;
}

export const PvpMatchResult: React.FC<PvpMatchResultProps> = ({ onRematch, onLeave }) => {
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <FantasyPanel className="w-[440px] p-8 flex flex-col items-center gap-5">
                        {/* Title */}
                        <h1 className="font-fantasy text-5xl tracking-wider"
                            style={{
                                color: isWinner ? '#fde68a' : '#f87171',
                                textShadow: isWinner
                                    ? '0 0 30px rgba(253,230,138,0.6), 3px 3px 0 #000'
                                    : '0 0 20px rgba(248,113,113,0.4), 3px 3px 0 #000'
                            }}>
                            {pvpMatchResult.disconnected
                                ? 'Motstander koblet fra'
                                : isWinner ? 'SEIER!' : 'TAP'}
                        </h1>

                        {/* Final Score */}
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-amber-200 text-sm truncate max-w-[120px]">{nickname}</p>
                                <p className="text-white font-fantasy text-4xl font-bold"
                                    style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
                                    {pvpMatchResult.finalScore[0]}
                                </p>
                            </div>
                            <span className="text-amber-100/30 font-fantasy text-2xl">-</span>
                            <div className="text-center">
                                <p className="text-amber-200 text-sm truncate max-w-[120px]">{pvpOpponentName}</p>
                                <p className="text-white font-fantasy text-4xl font-bold"
                                    style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
                                    {pvpMatchResult.finalScore[1]}
                                </p>
                            </div>
                        </div>

                        {/* Round Breakdown */}
                        <div className="w-full border-t border-amber-800/30 pt-3">
                            <p className="text-amber-100/50 text-xs text-center mb-2">Rundeoversikt</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pvpMatchResult.roundResults.map((r, i) => (
                                    <div
                                        key={i}
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

                        {/* Actions */}
                        <div className="flex gap-3 w-full mt-2">
                            <FantasyButton
                                label="Rematch"
                                variant="primary"
                                onClick={onRematch}
                                className="flex-1"
                            />
                            <FantasyButton
                                label="Forlat"
                                variant="secondary"
                                onClick={onLeave}
                                className="flex-1"
                            />
                        </div>
                    </FantasyPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

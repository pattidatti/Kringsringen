import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { useGameRegistry } from '../../hooks/useGameRegistry';

export interface PvpRoundResult {
    winner: 'player' | 'opponent';
    playerDamageDealt: number;
    opponentDamageDealt: number;
    playerHpRemaining: number;
    opponentHpRemaining: number;
    roundDuration: number; // seconds
    playerGold: number;
    opponentGold: number;
    reason: 'death' | 'timeout';
}

interface PvpRoundSummaryProps {
    onReady: () => void;
    isWaitingReady: boolean;
}

export const PvpRoundSummary: React.FC<PvpRoundSummaryProps> = ({ onReady, isWaitingReady }) => {
    const pvpState = useGameRegistry<string>('pvpState', 'waiting');
    const pvpRoundResult = useGameRegistry<PvpRoundResult | null>('pvpRoundResult', null);
    const pvpRound = useGameRegistry<number>('pvpRound', 1);
    const pvpScore = useGameRegistry<[number, number]>('pvpScore', [0, 0]);
    const nickname = useGameRegistry<string>('nickname', 'Du');
    const pvpOpponentName = useGameRegistry<string>('pvpOpponentName', 'Motstander');

    if (pvpState !== 'round_end' || !pvpRoundResult) return null;

    const isWinner = pvpRoundResult.winner === 'player';
    const durationStr = `${Math.floor(pvpRoundResult.roundDuration / 60)}:${(pvpRoundResult.roundDuration % 60).toString().padStart(2, '0')}`;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <FantasyPanel className="w-[420px] p-6 flex flex-col items-center gap-4">
                    {/* Round number */}
                    <p className="text-amber-400 text-sm">Runde {pvpRound} avsluttet</p>

                    {/* Winner */}
                    <h2 className="font-fantasy text-3xl"
                        style={{
                            color: isWinner ? '#4ade80' : '#f87171',
                            textShadow: '2px 2px 0 #000'
                        }}>
                        {isWinner ? 'Seier!' : 'Tap!'}
                    </h2>

                    {/* Score */}
                    <div className="flex items-center gap-3 text-2xl font-fantasy">
                        <span className="text-amber-200">{pvpScore[0]}</span>
                        <span className="text-amber-600">-</span>
                        <span className="text-amber-200">{pvpScore[1]}</span>
                    </div>

                    {/* Stats */}
                    <div className="w-full border-t border-amber-800/30 pt-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div />
                            <div className="text-center text-amber-200 font-medium truncate">{nickname}</div>
                            <div className="text-center text-amber-200 font-medium truncate">{pvpOpponentName}</div>

                            <div className="text-amber-400">Skade gjort</div>
                            <div className="text-center text-amber-100">{Math.round(pvpRoundResult.playerDamageDealt)}</div>
                            <div className="text-center text-amber-100">{Math.round(pvpRoundResult.opponentDamageDealt)}</div>

                            <div className="text-amber-400">HP igjen</div>
                            <div className="text-center text-amber-100">{Math.max(0, Math.round(pvpRoundResult.playerHpRemaining))}</div>
                            <div className="text-center text-amber-100">{Math.max(0, Math.round(pvpRoundResult.opponentHpRemaining))}</div>

                            <div className="text-amber-400">Gull</div>
                            <div className="text-center text-yellow-400">+{pvpRoundResult.playerGold}</div>
                            <div className="text-center text-yellow-400">+{pvpRoundResult.opponentGold}</div>
                        </div>

                        <div className="text-center text-amber-500 text-xs mt-2">
                            Varighet: {durationStr} | {pvpRoundResult.reason === 'timeout' ? 'Tid ut' : 'Eliminasjon'}
                        </div>
                    </div>

                    {/* Ready button */}
                    <FantasyButton
                        label={isWaitingReady ? 'Venter på motstander...' : 'Klar'}
                        variant="primary"
                        onClick={onReady}
                        disabled={isWaitingReady}
                        className="w-full mt-2"
                    />
                </FantasyPanel>
            </motion.div>
        </AnimatePresence>
    );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import type { Pvp2v2RoundResult } from '../../game/Pvp2v2RoundManager';

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
    onOpenShop?: () => void;
    isWaitingReady: boolean;
    mode?: 'pvp' | 'pvp2v2';
}

const Pvp1v1Summary: React.FC<Omit<PvpRoundSummaryProps, 'mode'>> = ({ onReady, onOpenShop, isWaitingReady }) => {
    const pvpState = useGameRegistry<string>('pvpState', 'waiting');
    const pvpRoundResult = useGameRegistry<PvpRoundResult | null>('pvpRoundResult', null);
    const pvpRound = useGameRegistry<number>('pvpRound', 1);
    const pvpScore = useGameRegistry<[number, number]>('pvpScore', [0, 0]);
    const nickname = useGameRegistry<string>('nickname', 'Du');
    const pvpOpponentName = useGameRegistry<string>('pvpOpponentName', 'Motstander');
    const pvpOpponentReady = useGameRegistry<boolean>('pvpOpponentReady', false);

    if (pvpState !== 'round_end' || !pvpRoundResult) return null;

    const isWinner = pvpRoundResult.winner === 'player';
    const durationStr = `${Math.floor(pvpRoundResult.roundDuration / 60)}:${(pvpRoundResult.roundDuration % 60).toString().padStart(2, '0')}`;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <FantasyPanel className="w-[420px] p-6 flex flex-col items-center gap-4">
                    <p className="text-stone-600 text-sm">Runde {pvpRound} avsluttet</p>
                    <h2 className="font-fantasy text-3xl" style={{ color: isWinner ? '#4ade80' : '#f87171', textShadow: '2px 2px 0 #000' }}>
                        {isWinner ? 'Seier!' : 'Tap!'}
                    </h2>
                    <div className="flex items-center gap-3 text-2xl font-fantasy">
                        <span className="text-stone-900">{pvpScore[0]}</span>
                        <span className="text-stone-500">-</span>
                        <span className="text-stone-900">{pvpScore[1]}</span>
                    </div>
                    <div className="w-full border-t border-amber-800/30 pt-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div />
                            <div className="text-center text-stone-800 font-medium truncate">{nickname}</div>
                            <div className="text-center text-stone-800 font-medium truncate">{pvpOpponentName}</div>
                            <div className="text-stone-600">Skade gjort</div>
                            <div className="text-center text-stone-800">{Math.round(pvpRoundResult.playerDamageDealt)}</div>
                            <div className="text-center text-stone-800">{Math.round(pvpRoundResult.opponentDamageDealt)}</div>
                            <div className="text-stone-600">HP igjen</div>
                            <div className="text-center text-stone-800">{Math.max(0, Math.round(pvpRoundResult.playerHpRemaining))}</div>
                            <div className="text-center text-stone-800">{Math.max(0, Math.round(pvpRoundResult.opponentHpRemaining))}</div>
                            <div className="text-stone-600">Gull</div>
                            <div className="text-center text-amber-700">+{pvpRoundResult.playerGold}</div>
                            <div className="text-center text-amber-700">+{pvpRoundResult.opponentGold}</div>
                        </div>
                        <div className="text-center text-stone-600 text-xs mt-2">
                            Varighet: {durationStr} | {pvpRoundResult.reason === 'timeout' ? 'Tid ut' : 'Eliminasjon'}
                        </div>
                    </div>
                    <div className="w-full flex flex-col gap-2 mt-2">
                        {onOpenShop && (
                            <FantasyButton label="Åpne Butikk" variant="secondary" onClick={onOpenShop} className="w-full" />
                        )}
                        <FantasyButton
                            label={isWaitingReady ? 'Venter på motstander...' : 'Klar'}
                            variant="primary"
                            onClick={onReady}
                            disabled={isWaitingReady}
                            className="w-full"
                        />
                        {pvpOpponentReady && !isWaitingReady && (
                            <p className="text-center text-stone-600 text-xs">{pvpOpponentName} er klar!</p>
                        )}
                    </div>
                </FantasyPanel>
            </motion.div>
        </AnimatePresence>
    );
};

const Pvp2v2Summary: React.FC<Omit<PvpRoundSummaryProps, 'mode'>> = ({ onReady, onOpenShop }) => {
    const pvp2v2State = useGameRegistry<string>('pvp2v2State', 'waiting');
    const pvp2v2RoundResult = useGameRegistry<Pvp2v2RoundResult | null>('pvp2v2RoundResult', null);
    const pvp2v2Score = useGameRegistry<[number, number]>('pvp2v2Score', [0, 0]);
    const pvp2v2ReadyCount = useGameRegistry<number>('pvp2v2ReadyCount', 0);

    if (pvp2v2State !== 'round_end' || !pvp2v2RoundResult) return null;

    const { winnerTeam, myTeam, reason, roundDuration, teamADamage, teamBDamage, teamAHpSum, teamBHpSum, playerGold, round } = pvp2v2RoundResult;
    const didWin = winnerTeam === myTeam;
    const durationStr = `${Math.floor(roundDuration / 60)}:${(roundDuration % 60).toString().padStart(2, '0')}`;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <FantasyPanel className="w-[440px] p-6 flex flex-col items-center gap-4">
                    <p className="text-stone-600 text-sm">2v2 · Runde {round} avsluttet</p>
                    <h2 className="font-fantasy text-3xl" style={{ color: didWin ? '#4ade80' : '#f87171', textShadow: '2px 2px 0 #000' }}>
                        {didWin ? `Team ${winnerTeam} Seier!` : `Team ${winnerTeam} Seier!`}
                    </h2>

                    {/* Score */}
                    <div className="flex items-center gap-4 text-2xl font-fantasy">
                        <span style={{ color: myTeam === 'A' ? '#4ade80' : '#f87171' }}>A: {pvp2v2Score[0]}</span>
                        <span className="text-stone-500">–</span>
                        <span style={{ color: myTeam === 'B' ? '#4ade80' : '#f87171' }}>B: {pvp2v2Score[1]}</span>
                    </div>

                    {/* Stats */}
                    <div className="w-full border-t border-amber-800/30 pt-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div />
                            <div className="text-center text-stone-800 font-medium">Team A</div>
                            <div className="text-center text-stone-800 font-medium">Team B</div>
                            <div className="text-stone-600">Skade</div>
                            <div className="text-center text-stone-800">{Math.round(teamADamage)}</div>
                            <div className="text-center text-stone-800">{Math.round(teamBDamage)}</div>
                            <div className="text-stone-600">HP igjen</div>
                            <div className="text-center text-stone-800">{Math.max(0, Math.round(teamAHpSum))}</div>
                            <div className="text-center text-stone-800">{Math.max(0, Math.round(teamBHpSum))}</div>
                        </div>
                        <div className="text-center text-stone-600 text-xs mt-2">
                            Varighet: {durationStr} | {reason === 'timeout' ? 'Tid ut' : 'Eliminasjon'}
                        </div>
                        <div className="text-center text-stone-600 text-xs mt-1">
                            Gull: +{playerGold}
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-2 mt-2">
                        {onOpenShop && (
                            <FantasyButton label="Åpne Butikk" variant="secondary" onClick={onOpenShop} className="w-full" />
                        )}
                        <FantasyButton
                            label={`Klar (${pvp2v2ReadyCount}/4)`}
                            variant="primary"
                            onClick={onReady}
                            className="w-full"
                        />
                    </div>
                </FantasyPanel>
            </motion.div>
        </AnimatePresence>
    );
};

export const PvpRoundSummary: React.FC<PvpRoundSummaryProps> = ({ mode = 'pvp', ...rest }) => {
    if (mode === 'pvp2v2') return <Pvp2v2Summary {...rest} />;
    return <Pvp1v1Summary {...rest} />;
};

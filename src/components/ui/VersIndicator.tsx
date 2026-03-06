import React from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { motion } from 'framer-motion';

export const VersIndicator: React.FC = React.memo(() => {
    const vers = useGameRegistry('skaldVers', 0) as number;
    const kvadReady = useGameRegistry('skaldKvadReady', false) as boolean;

    return (
        <div className="flex flex-col items-center mb-1 pointer-events-none select-none">
            <div className="flex gap-2 items-center">
                {[0, 1, 2, 3].map((i) => {
                    const filled = i < vers;
                    return (
                        <motion.div
                            key={i}
                            animate={{
                                scale: filled ? 1 : 0.75,
                                opacity: filled ? 1 : 0.3,
                            }}
                            className={`w-3.5 h-3.5 rotate-45 transition-colors duration-200 ${
                                filled
                                    ? 'bg-amber-400 shadow-[0_0_10px_rgba(255,215,0,0.8)] border border-amber-200'
                                    : 'bg-black/60 border border-amber-900/50'
                            }`}
                        />
                    );
                })}
            </div>

            {/* NEW: Passive buff display */}
            {vers > 0 && (
                <div className="flex gap-1 mt-1.5 text-[7px] text-amber-300/80 font-cinzel tracking-wider">
                    {vers >= 1 && <span>SPD</span>}
                    {vers >= 2 && <span>ATK</span>}
                    {vers >= 3 && <span>DMG</span>}
                    {vers >= 4 && <span className="text-amber-200 animate-pulse">CRIT</span>}
                </div>
            )}

            {kvadReady && (
                <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-cinzel font-black text-amber-400 tracking-[0.25em] uppercase mt-1 animate-pulse drop-shadow-[0_0_6px_rgba(255,215,0,0.9)]"
                >
                    KVAD KLAR
                </motion.div>
            )}
        </div>
    );
});

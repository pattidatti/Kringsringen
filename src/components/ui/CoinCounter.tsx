import { useEffect, useState } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';

export const CoinCounter = () => {
    const coins = useGameRegistry('playerCoins', 0);
    const [displayCoins, setDisplayCoins] = useState(coins);

    // Simple counter animation
    useEffect(() => {
        if (displayCoins !== coins) {
            const timer = setTimeout(() => {
                const diff = coins - displayCoins;
                const step = Math.ceil(Math.abs(diff) / 10); // Animate faster if gap is large

                if (displayCoins < coins) {
                    setDisplayCoins(prev => Math.min(prev + step, coins));
                } else if (displayCoins > coins) {
                    setDisplayCoins(prev => Math.max(prev - step, coins));
                }
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [coins, displayCoins]);

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/40 backdrop-blur-md rounded-full border border-amber-900/20 shadow-xl self-start group">
            <div className="m-icon-coin m-scale-2 drop-shadow-[0_0_8px_rgba(255,204,0,0.4)] group-hover:scale-[2.2] transition-transform duration-300" />
            <div className="flex flex-col">
                <span className="m-text-stats text-[8px] opacity-40 leading-none">Mynter</span>
                <span className="m-text-hud m-text-gold text-xl font-black tabular-nums tracking-wider leading-tight">
                    {displayCoins.toLocaleString()}
                </span>
            </div>
        </div>
    );
};

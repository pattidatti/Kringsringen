import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/main';

export const GameContainer = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const [hp, setHp] = useState(100);
    const [maxHp, setMaxHp] = useState(100);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;

            // Sync HP from Phaser Registry
            const syncHP = () => {
                setHp(game.registry.get('playerHP') || 0);
                setMaxHp(game.registry.get('playerMaxHP') || 100);
            };

            game.registry.events.on('changedata-playerHP', syncHP);
            game.registry.events.on('changedata-playerMaxHP', syncHP);
        }

        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.destroy(true);
                gameInstanceRef.current = null;
            }
        };
    }, []);

    const hpPercentage = (hp / maxHp) * 100;

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950">
            {/* UI Overlay */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
                <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl min-w-[240px]">
                    <h1 className="text-lg font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Arena Survivor
                    </h1>

                    {/* HP Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Health</span>
                            <span>{Math.ceil(hp)} / {maxHp}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300 ease-out"
                                style={{ width: `${hpPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-slate-800 rounded border border-white/10 text-slate-300 font-bold">SPACE</kbd>
                                <span>Attack</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-slate-800 rounded border border-white/10 text-slate-300 font-bold w-7 text-center">F</kbd>
                                <span>Block</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <kbd className="px-2 py-1 bg-slate-800 rounded border border-white/10 text-slate-300 font-bold shrink-0">WASD / ARROWS</kbd>
                            <span>Move</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Death Screen */}
            {hp <= 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-700">
                    <div className="text-center space-y-4">
                        <h2 className="text-6xl font-black text-white tracking-tighter">GAME OVER</h2>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/20"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

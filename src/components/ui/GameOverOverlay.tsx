import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { FantasyButton } from './FantasyButton';

export const GameOverOverlay: React.FC = () => {
    const hp = useGameRegistry('playerHP', 100);
    const level = useGameRegistry('gameLevel', 1);
    const wave = useGameRegistry('currentWave', 1);
    const coins = useGameRegistry('playerCoins', 0);

    const [playerName, setPlayerName] = useState('');

    const score = level * 1000 + wave * 100 + coins;

    const handleRestart = useCallback(() => {
        import('../../game/SaveManager').then(({ SaveManager }) => {
            SaveManager.clearRun();
            window.location.reload();
        });
    }, []);

    if (hp > 0) return null;

    return (
        <motion.div
            className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #000000 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
        >
            {/* Blood vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(80,0,0,0.7) 100%)' }}
            />

            {/* Decorative lines */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent" />
            <div className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/60 to-transparent" />

            <motion.div
                className="relative flex flex-col items-center gap-6 z-10 w-full max-w-md px-8"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
            >
                {/* Title */}
                <div className="text-center">
                    <motion.h1
                        className="font-fantasy text-8xl tracking-[0.15em] uppercase"
                        style={{
                            color: '#ff2222',
                            textShadow: '0 0 40px rgba(255,0,0,0.9), 0 0 80px rgba(180,0,0,0.5), 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000',
                        }}
                        animate={{ opacity: [1, 0.75, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                    >
                        Falnet
                    </motion.h1>
                    <p className="font-fantasy text-base tracking-[0.35em] text-red-400 uppercase mt-2">
                        Din saga ender her
                    </p>
                </div>

                {/* Score stats */}
                <div className="w-full border-2 border-red-800/60 bg-black/80 rounded overflow-hidden">
                    <div className="grid grid-cols-3 divide-x-2 divide-red-800/40">
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-fantasy text-sm text-red-400 uppercase tracking-widest">Level</span>
                            <span className="font-fantasy text-5xl text-white">{level}</span>
                        </div>
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-fantasy text-sm text-red-400 uppercase tracking-widest">Fase</span>
                            <span className="font-fantasy text-5xl text-white">{wave}</span>
                        </div>
                        <div className="flex flex-col items-center py-5 px-2 gap-1">
                            <span className="font-fantasy text-sm text-red-400 uppercase tracking-widest">Gull</span>
                            <span className="font-fantasy text-5xl text-amber-300">{coins}</span>
                        </div>
                    </div>
                    <div className="border-t-2 border-red-800/40 py-4 flex flex-col items-center gap-1 bg-red-950/20">
                        <span className="font-fantasy text-sm text-red-400 uppercase tracking-widest">Score</span>
                        <span className="font-fantasy text-5xl text-white">{score.toLocaleString()}</span>
                    </div>
                </div>

                {/* Name input */}
                <div className="w-full flex flex-col gap-2">
                    <label className="font-fantasy text-sm text-red-400 uppercase tracking-widest text-center">
                        Ditt navn
                    </label>
                    <input
                        type="text"
                        maxLength={20}
                        placeholder="Skriv inn navn..."
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                        className="w-full bg-black/80 border-2 border-red-800/60 text-white font-fantasy text-base text-center px-4 py-3 rounded outline-none focus:border-red-500 placeholder:text-red-800 tracking-widest"
                    />
                </div>

                {/* Restart button */}
                <FantasyButton
                    label="Prøv Igjen"
                    variant="danger"
                    onClick={handleRestart}
                    className="w-56 text-xl"
                />
            </motion.div>
        </motion.div>
    );
};

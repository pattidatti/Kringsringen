import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

type Upgrade = {
    id: string;
    title: string;
    description: string;
    icon: string;
};

const UPGRADES: Upgrade[] = [
    { id: 'damage', title: 'Brute Force', description: '+20% Angrepsstyrke', icon: 'm-icon-sword' },
    { id: 'speed', title: 'Lynrask', description: '+15% Bevegelseshastighet', icon: 'm-icon-plus-small' },
    { id: 'health', title: 'Vitalitet', description: '+20 Maks HP & Helbred 20', icon: 'm-icon-plus-small' },
    { id: 'cooldown', title: 'Raskt Angrep', description: '-15% Nedkjøling', icon: 'm-icon-plus-small' },
    { id: 'knockback', title: 'Tungt Slag', description: '+25% Tilbakeslag', icon: 'm-icon-sword' }
];

export const GameContainer = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const [hp, setHp] = useState(100);
    const [maxHp, setMaxHp] = useState(100);
    const [xp, setXp] = useState(0);
    const [maxXp, setMaxXp] = useState(100);
    const [level, setLevel] = useState(1);
    const [isLeveling, setIsLeveling] = useState(false);
    const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;

            // Sync Stats from Phaser Registry
            const syncStats = () => {
                setHp(game.registry.get('playerHP') ?? 100);
                setMaxHp(game.registry.get('playerMaxHP') ?? 100);
                setXp(game.registry.get('playerXP') ?? 0);
                setMaxXp(game.registry.get('playerMaxXP') ?? 100);
                setLevel(game.registry.get('playerLevel') ?? 1);
            };

            game.registry.events.on('changedata-playerHP', syncStats);
            game.registry.events.on('changedata-playerMaxHP', syncStats);
            game.registry.events.on('changedata-playerXP', syncStats);
            game.registry.events.on('changedata-playerMaxXP', syncStats);
            game.registry.events.on('changedata-playerLevel', syncStats);

            // Handle Level Up - Need to wait for scene to be ready
            const setupSceneListeners = () => {
                const mainScene = game.scene.getScene('MainScene');
                if (mainScene) {
                    mainScene.events.on('level-up', () => {
                        game.scene.pause('MainScene');
                        const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
                        setAvailableUpgrades(shuffled.slice(0, 3));
                        setIsLeveling(true);
                    });
                } else {
                    // Try again in a bit if scene isn't ready yet
                    setTimeout(setupSceneListeners, 100);
                }
            };

            setupSceneListeners();
            syncStats();
        }

        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.destroy(true);
                gameInstanceRef.current = null;
            }
        };
    }, []);

    const selectUpgrade = (upgradeId: string) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('apply-upgrade', upgradeId);
        gameInstanceRef.current.scene.resume('MainScene');
        setIsLeveling(false);
    };

    const handleRestart = () => {
        if (!gameInstanceRef.current) {
            window.location.reload();
            return;
        }

        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        if (mainScene) {
            // Restart the Phaser scene
            mainScene.scene.restart();

            // Explicitly reset React state to default values
            setHp(100);
            setMaxHp(100);
            setXp(0);
            setMaxXp(100);
            setLevel(1);
            setIsLeveling(false);
        } else {
            window.location.reload();
        }
    };

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Overlay */}
            <div className={`absolute top-6 left-6 z-10 medieval-pixel transition-all duration-500 overflow-visible ${isLeveling || hp <= 0 ? 'blur-md grayscale opacity-50' : ''}`}>
                <div className="relative group">
                    {/* Premium Medieval Panel Background */}
                    <div className="absolute inset-[-12px] m-panel-medieval rounded-sm -z-10" />

                    {/* Header Wood Board (Wide Sign Corrected) */}
                    <div className="relative mb-2">
                        <div className="m-sign-wide m-scale-[4] origin-top-left drop-shadow-lg" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-1 pointer-events-none">
                            <h1 className="m-text-hud m-text-gold text-base tracking-widest leading-none uppercase">
                                Kringsringen
                            </h1>
                            <div className="m-text-stats font-bold text-[8px] mt-0.5 opacity-80 translate-y-0.5">
                                NIVÅ {level}
                            </div>
                        </div>
                    </div>

                    {/* Stats Container - Clean & Premium */}
                    <div className="flex flex-col gap-4 py-2 px-1">
                        {/* HP Bar */}
                        <div className="flex items-center gap-4">
                            <div className="m-icon-candle m-scale-2 drop-shadow-md" />
                            <div className="m-progress-container m-scale-[2.8] origin-left">
                                <div
                                    className="m-progress-fill transition-all duration-300"
                                    style={{ width: `${56 * Math.max(0, hp / maxHp)}px` }}
                                />
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="flex items-center gap-4">
                            <div className="m-icon-plus-small m-scale-2 drop-shadow-md" />
                            <div className="m-progress-container m-scale-[2.8] origin-left grayscale brightness-125 sepia">
                                <div
                                    className="m-progress-fill !bg-sky-600 transition-all duration-500"
                                    style={{ width: `${56 * (xp / maxXp)}px` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Death Screen - Polished Pixel Art */}
            {/* Death Screen - Polished Pixel Art */}
            {hp <= 0 && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 animate-in fade-in duration-1000 medieval-pixel overflow-hidden">
                    <div className="m-vignette" />

                    <div className="relative flex flex-col items-center scale-up-center gap-8 z-50">
                        {/* Text Group */}
                        <div className="text-center space-y-2 mb-4">
                            <h2 className="m-text-blood text-6xl tracking-widest leading-none m-text-outline drop-shadow-xl animate-pulse">FALNET</h2>
                            <p className="m-text-hud text-amber-500 text-sm tracking-widest uppercase opacity-80">Din saga ender her</p>
                        </div>

                        {/* New Component-Based Panel */}
                        <MedievalPanel className="w-64 p-4 items-center gap-6 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] scale-150">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <p className="text-[10px] text-amber-900/60 font-serif italic">
                                    "Even the mightiest fall..."
                                </p>
                            </div>

                            <div className="flex gap-4 mt-2">
                                <MedievalButton
                                    label="Prøv Igjen"
                                    onClick={handleRestart}
                                    variant="primary"
                                    className="scale-125"
                                />
                            </div>
                        </MedievalPanel>
                    </div>
                </div>
            )}

            {/* Level Up Overlay */}
            {isLeveling && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in zoom-in duration-500 medieval-pixel">
                    <div className="max-w-6xl w-full px-12 text-center space-y-24">
                        <div className="space-y-8">
                            <h2 className="m-text-gold text-9xl tracking-tighter uppercase drop-shadow-2xl">Forberedelse</h2>
                            <p className="m-text-hud text-amber-200/40 text-3xl italic">Velg din neste sti</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-20">
                            {availableUpgrades.map((upgrade, idx) => (
                                <button
                                    key={upgrade.id}
                                    onClick={() => selectUpgrade(upgrade.id)}
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                    className="group relative flex flex-col items-center gap-10 animate-in slide-in-from-bottom-12 fill-mode-both"
                                >
                                    {/* Choice Plate with Glassmorphism */}
                                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm group-hover:bg-white/[0.08] group-hover:border-white/[0.1] transition-all duration-300">
                                        <div className="m-sign-small m-scale-4 group-hover:scale-[4.2] transition-transform duration-300 ease-out" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className={`${upgrade.icon} m-scale-3 group-hover:scale-[3.5] transition-transform drop-shadow-2xl`} />
                                        </div>
                                    </div>

                                    <div className="text-center max-w-[280px] space-y-4">
                                        <h3 className="m-text-hud text-3xl text-amber-100/90 group-hover:text-amber-400 transition-colors uppercase tracking-tight">{upgrade.title}</h3>
                                        <p className="m-text-stats text-sm leading-relaxed text-amber-50/40 font-medium">{upgrade.description}</p>
                                    </div>

                                    {/* Select Button */}
                                    <div className="m-btn m-btn-check m-scale-3 group-hover:scale-125 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

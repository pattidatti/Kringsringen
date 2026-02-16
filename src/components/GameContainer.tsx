import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';

type Upgrade = {
    id: string;
    title: string;
    description: string;
    icon: string;
};

const UPGRADES: Upgrade[] = [
    { id: 'damage', title: 'Brute Force', description: '+20% Attack Damage', icon: '⚔️' },
    { id: 'speed', title: 'Flash', description: '+15% Movement Speed', icon: '⚡' },
    { id: 'health', title: 'Vitality', description: '+20 Max HP & Heal 20', icon: '❤️' },
    { id: 'cooldown', title: 'Quick Strike', description: '-15% Attack Cooldown', icon: '⏱️' },
    { id: 'knockback', title: 'Heavy Hitter', description: '+25% Knockback Force', icon: '💥' }
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

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Overlay */}
            <div className={`absolute top-24 left-16 z-10 medieval-pixel transition-all duration-500 overflow-visible ${isLeveling ? 'blur-md grayscale opacity-50' : ''}`}>
                <div className="relative overflow-visible">
                    {/* Hanging Sign Background */}
                    <div className="m-sign-hanging m-scale-4 origin-top-left m-float" />

                    {/* Content Overlay - Shifted down to clear the chains and hinge */}
                    <div className="absolute top-[120px] left-0 w-[256px] px-8 text-center space-y-8 pointer-events-none">
                        <div className="space-y-1">
                            <h1 className="m-text-hud m-text-gold text-2xl tracking-tight leading-none">
                                Kringsringen
                            </h1>
                            <div className="m-text-stats text-amber-900/40">
                                Nivå {level}
                            </div>
                        </div>

                        {/* HP Bar */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="m-progress-container m-scale-3 origin-center">
                                <div
                                    className="m-progress-fill"
                                    style={{ width: `${56 * (hp / maxHp)}px` }}
                                />
                            </div>
                            <span className="m-text-stats pt-2">Helse</span>
                        </div>

                        {/* XP Bar */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="m-progress-container m-scale-3 origin-center grayscale brightness-125 sepia">
                                <div
                                    className="m-progress-fill !bg-sky-600"
                                    style={{ width: `${56 * (xp / maxXp)}px` }}
                                />
                            </div>
                            <span className="m-text-stats pt-2">Erfaring</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Death Screen */}
            {hp <= 0 && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-1000 medieval-pixel overflow-hidden">
                    <div className="m-vignette" />

                    <div className="relative flex flex-col items-center scale-up-center">
                        {/* Sign Background */}
                        <div className="m-sign-hanging m-scale-5 m-float" />

                        {/* Content centered on sign */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-32 gap-10">
                            <div className="text-center space-y-4">
                                <h2 className="m-text-hud m-text-gold text-7xl leading-none">FALNET</h2>
                                <p className="m-text-stats text-amber-100/60 lowercase italic">Din saga ender her</p>
                            </div>

                            <button
                                onClick={() => window.location.reload()}
                                className="group flex flex-col items-center gap-4 transition-all hover:scale-110"
                            >
                                <div className="m-btn m-btn-plus m-scale-4 shadow-xl" />
                                <span className="m-text-hud text-white text-2xl filter drop-shadow-lg">Prøv Igjen</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Level Up Overlay */}
            {isLeveling && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-2xl animate-in fade-in zoom-in duration-500 medieval-pixel">
                    <div className="max-w-6xl w-full px-12 text-center space-y-20">
                        <div className="space-y-6">
                            <h2 className="m-text-hud m-text-gold text-8xl text-white">Forberedelse</h2>
                            <p className="m-text-stats text-2xl text-amber-200/50">Velg din skjebne</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-16">
                            {availableUpgrades.map((upgrade, idx) => (
                                <button
                                    key={upgrade.id}
                                    onClick={() => selectUpgrade(upgrade.id)}
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                    className="group relative flex flex-col items-center gap-8 animate-in slide-in-from-bottom-12 fill-mode-both"
                                >
                                    {/* Choice Plate */}
                                    <div className="relative m-card-shine rounded-lg">
                                        <div className="m-sign-wood m-scale-4 group-hover:scale-[4.5] transition-all duration-300 ease-out" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-5xl group-hover:scale-125 transition-transform filter drop-shadow-2xl">{upgrade.icon}</span>
                                        </div>
                                    </div>

                                    <div className="text-center max-w-[240px] space-y-3">
                                        <h3 className="m-text-hud text-3xl text-white group-hover:text-amber-400 transition-colors uppercase">{upgrade.title}</h3>
                                        <p className="m-text-stats text-sm leading-relaxed opacity-60 italic">{upgrade.description}</p>
                                    </div>

                                    {/* Select Button */}
                                    <div className="m-btn m-btn-check m-scale-3 group-hover:brightness-125 group-hover:scale-110 shadow-lg" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';
import { Hotbar } from './ui/Hotbar';
import { CoinCounter } from './ui/CoinCounter';
import { UpgradeShop } from './ui/UpgradeShop';
import { StatsPanel } from './ui/StatsPanel';
import { PlayerHUD } from './ui/PlayerHUD';
import { UPGRADES, type UpgradeConfig } from '../config/upgrades';

export const GameContainer = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const [hp, setHp] = useState(100);
    const [maxHp, setMaxHp] = useState(100);
    const [xp, setXp] = useState(0);
    const [maxXp, setMaxXp] = useState(100);
    const [level, setLevel] = useState(1);
    const [coins, setCoins] = useState(0);
    const [currentWeapon, setCurrentWeapon] = useState('sword');
    const [isLeveling, setIsLeveling] = useState(false);
    const [isShopping, setIsShopping] = useState(false);
    const [availableUpgrades, setAvailableUpgrades] = useState<UpgradeConfig[]>([]);
    const [stageLevel, setStageLevel] = useState(1);
    const [wave, setWave] = useState(1);
    const [maxWaves, setMaxWaves] = useState(1);

    // Upgrade Levels State
    const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({});

    // Stats State
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [playerStats, setPlayerStats] = useState({
        damage: 0,
        attackSpeed: 0,
        speed: 0,
        armor: 0,
        regen: 0,
        critChance: 0,
        projectiles: 0,
        luck: 0,
        maxHp: 100
    });

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
                setCoins(game.registry.get('playerCoins') ?? 0);
                setCurrentWeapon(game.registry.get('currentWeapon') ?? 'sword');
                setStageLevel(game.registry.get('gameLevel') ?? 1);
                setWave(game.registry.get('currentWave') ?? 1);
                setMaxWaves(game.registry.get('maxWaves') ?? 1);

                // Sync Upgrade Levels
                const levels = game.registry.get('upgradeLevels') || {};
                setUpgradeLevels({ ...levels });

                // Advanced Stats Sync
                setPlayerStats({
                    damage: game.registry.get('playerDamage') ?? 0,
                    attackSpeed: game.registry.get('playerAttackSpeed') ?? 1,
                    speed: game.registry.get('playerSpeed') ?? 0,
                    armor: game.registry.get('playerArmor') ?? 0,
                    regen: game.registry.get('playerRegen') ?? 0,
                    critChance: game.registry.get('playerCritChance') ?? 0,
                    projectiles: game.registry.get('playerProjectiles') ?? 1,
                    luck: game.registry.get('playerLuck') ?? 0,
                    maxHp: game.registry.get('playerMaxHP') ?? 100
                });
            };

            game.registry.events.on('changedata-playerHP', syncStats);
            game.registry.events.on('changedata-playerMaxHP', syncStats);
            game.registry.events.on('changedata-playerXP', syncStats);
            game.registry.events.on('changedata-playerMaxXP', syncStats);
            game.registry.events.on('changedata-playerLevel', syncStats);
            game.registry.events.on('changedata-playerCoins', syncStats);
            game.registry.events.on('changedata-currentWeapon', syncStats);
            game.registry.events.on('changedata-gameLevel', syncStats);
            game.registry.events.on('changedata-currentWave', syncStats);
            game.registry.events.on('changedata-maxWaves', syncStats);
            // Listen for all stat changes
            game.registry.events.on('changedata-playerDamage', syncStats);
            game.registry.events.on('changedata-playerArmor', syncStats);
            game.registry.events.on('changedata-playerProjectiles', syncStats);
            game.registry.events.on('changedata-upgradeLevels', syncStats);

            // Hotkey Listener for 'C' (Character Stats)
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key.toLowerCase() === 'c') {
                    setIsStatsOpen(prev => !prev);
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            // Handle Level Up - Need to wait for scene to be ready
            const setupSceneListeners = () => {
                const mainScene = game.scene.getScene('MainScene');
                if (mainScene) {
                    mainScene.events.on('level-up', () => {
                        game.scene.pause('MainScene');

                        // Filter available upgrades (not maxed)
                        const currentLevels = game.registry.get('upgradeLevels') || {};
                        const available = UPGRADES.filter(u => {
                            const lvl = currentLevels[u.id] || 0;
                            return lvl < u.maxLevel && u.category !== 'Magi'; // Hide magic for now
                        });

                        const shuffled = [...available].sort(() => 0.5 - Math.random());
                        setAvailableUpgrades(shuffled.slice(0, 3));
                        setIsLeveling(true);
                    });

                    mainScene.events.on('level-complete', () => {
                        setIsShopping(true);
                    });
                } else {
                    // Try again in a bit if scene isn't ready yet
                    setTimeout(setupSceneListeners, 100);
                }
            };

            setupSceneListeners();
            syncStats();

            return () => {
                if (gameInstanceRef.current) {
                    gameInstanceRef.current.destroy(true);
                    gameInstanceRef.current = null;
                }
                window.removeEventListener('keydown', handleKeyDown); // Cleanup
            };
        }
    }, []);

    const selectUpgrade = (upgradeId: string) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('apply-upgrade', upgradeId);
        gameInstanceRef.current.scene.resume('MainScene');
        setIsLeveling(false);
    };

    const applyShopUpgrade = (upgradeId: string, cost: number) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');

        // Deduct coins in Phaser
        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        gameInstanceRef.current.registry.set('playerCoins', currentCoins - cost);

        // Apply stats in Phaser (will also increment level)
        mainScene.events.emit('apply-upgrade', upgradeId);
    };

    const handleContinue = () => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('start-next-level');
        gameInstanceRef.current.scene.resume('MainScene');
        setIsShopping(false);
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
            setCoins(0);
            setIsLeveling(false);
        } else {
            window.location.reload();
        }
    };

    const selectWeapon = (weaponId: string) => {
        if (gameInstanceRef.current) {
            gameInstanceRef.current.registry.set('currentWeapon', weaponId);
        }
    };

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Overlay */}
            <div className={`absolute top-6 left-6 z-10 transition-all duration-500 origin-top-left ${isLeveling || hp <= 0 ? 'blur-md grayscale opacity-50' : ''}`}>
                <PlayerHUD
                    hp={hp}
                    maxHp={maxHp}
                    xp={xp}
                    maxXp={maxXp}
                    level={level}
                />
            </div>

            {/* Coin & Progress Header - Top Center */}
            <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 flex flex-col items-center gap-2 ${isLeveling || isShopping || hp <= 0 ? 'blur-md grayscale opacity-50' : ''}`}>
                <div className="flex flex-col items-center bg-slate-900/60 backdrop-blur-sm border border-amber-900/20 px-6 py-2 rounded-lg shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="m-text-stats text-[10px] tracking-[0.3em] uppercase opacity-60">Level</span>
                            <span className="m-text-gold text-2xl font-black">{stageLevel}</span>
                        </div>

                        <div className="w-[1px] h-8 bg-amber-900/30" />

                        <div className="flex flex-col items-center min-w-[100px]">
                            <span className="m-text-stats text-[10px] tracking-[0.3em] uppercase opacity-60">Fase</span>
                            <div className="flex items-center gap-2">
                                <span className="m-text-hud text-xl text-amber-100">{wave}</span>
                                <span className="m-text-stats text-sm opacity-40">/</span>
                                <span className="m-text-stats text-sm opacity-40">{maxWaves}</span>
                            </div>
                        </div>
                    </div>

                    {/* Wave Progress Micro-bar */}
                    <div className="w-full h-1 bg-amber-900/10 rounded-full mt-2 overflow-hidden">
                        <div
                            className="h-full bg-amber-500/50 transition-all duration-500"
                            style={{ width: `${(wave / maxWaves) * 100}%` }}
                        />
                    </div>
                </div>

                <CoinCounter coins={coins} />
            </div>

            {/* UI Overlays */}
            <div className="absolute inset-0 z-[60] pointer-events-none">
                <StatsPanel
                    stats={playerStats}
                    isOpen={isStatsOpen}
                    onClose={() => setIsStatsOpen(false)}
                />
            </div>

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
                            {availableUpgrades.length > 0 ? availableUpgrades.map((upgrade, idx) => (
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
                                        <p className="m-text-stats text-sm leading-relaxed text-amber-50/40 font-medium">
                                            {/* Show NEXT level description */}
                                            {upgrade.description((upgradeLevels[upgrade.id] || 0) + 1)}
                                        </p>
                                    </div>

                                    {/* Select Button */}
                                    <div className="m-btn m-btn-check m-scale-3 group-hover:scale-125 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                                </button>
                            )) : (
                                <div className="text-amber-500 m-text-hud">Ingen flere oppgraderinger tilgjengelig!</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Shop Overlay */}
            {isShopping && (
                <UpgradeShop
                    coins={coins}
                    upgradeLevels={upgradeLevels}
                    onBuyUpgrade={applyShopUpgrade}
                    onContinue={handleContinue}
                />
            )}

            {/* Hotbar - Bottom Center */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 medieval-pixel transition-all duration-500 ${isLeveling || hp <= 0 ? 'blur-md grayscale opacity-20' : ''}`}>
                <Hotbar currentWeapon={currentWeapon} onSelectWeapon={selectWeapon} />
            </div>
        </div>
    );
};

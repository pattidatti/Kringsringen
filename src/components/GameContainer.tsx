import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { Hotbar } from './ui/Hotbar';
import { CoinCounter } from './ui/CoinCounter';
import { PlayerHUD } from './ui/PlayerHUD';
import { FantasyBook, type BookMode } from './ui/FantasyBook';
import { UPGRADES, type UpgradeConfig } from '../config/upgrades';
import { setGameInstance, useGameRegistry } from '../hooks/useGameRegistry';

export const GameContainer = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

    // We only keep state that affects layout/modals, NOT game stats
    const [isLeveling, setIsLeveling] = useState(false);
    const [isShopping, setIsShopping] = useState(false);
    const [availablePerks, setAvailablePerks] = useState<UpgradeConfig[]>([]);

    // Book State
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [bookMode, setBookMode] = useState<BookMode>('view');

    // Stats for Header (Infrequent updates)
    const stageLevel = useGameRegistry('gameLevel', 1);
    const wave = useGameRegistry('currentWave', 1);
    const maxWaves = useGameRegistry('maxWaves', 1);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;

            // Initialize the singleton for hooks
            setGameInstance(game);

            // Hotkey Listener for 'B' (Book/Status)
            const handleKeyDown = (e: KeyboardEvent) => {
                const key = e.key.toLowerCase();
                if (key === 'b') {
                    // Use functional update to avoid stale closure if we relied on state directly
                    // but here we just toggle based on prev
                    setIsBookOpen(prev => {
                        if (!prev) setBookMode('view');
                        return !prev;
                    });
                }
                // Close with Escape
                if (key === 'escape') {
                    setIsBookOpen(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            // Handle Level Up - Need to wait for scene to be ready
            const setupSceneListeners = () => {
                const mainScene = game.scene.getScene('MainScene');
                if (mainScene) {
                    mainScene.events.on('level-up', () => {
                        game.scene.pause('MainScene');

                        // Generate Random Perks
                        // Simple shuffle for now
                        const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
                        setAvailablePerks(shuffled.slice(0, 3));

                        // Open Book in Level Up Mode
                        setBookMode('level_up');
                        setIsBookOpen(true);
                        setIsLeveling(true);
                    });

                    mainScene.events.on('level-complete', () => {
                        // Open Book in Shop Mode
                        setBookMode('shop');
                        setIsBookOpen(true);
                        setIsShopping(true);
                    });
                } else {
                    // Try again in a bit if scene isn't ready yet
                    setTimeout(setupSceneListeners, 100);
                }
            };

            setupSceneListeners();

            return () => {
                if (gameInstanceRef.current) {
                    gameInstanceRef.current.destroy(true);
                    gameInstanceRef.current = null;
                }
                window.removeEventListener('keydown', handleKeyDown); // Cleanup
            };
        }
    }, []);

    const selectUpgrade = useCallback((upgradeId: string) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('apply-upgrade', upgradeId);

        // Close Book and Resume
        setIsBookOpen(false);
        setIsLeveling(false);
        mainScene.time.delayedCall(100, () => {
            gameInstanceRef.current?.scene.resume('MainScene');
        });
    }, []);

    const applyShopUpgrade = useCallback((upgradeId: string, cost: number) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');

        // Deduct coins in Phaser
        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        gameInstanceRef.current.registry.set('playerCoins', currentCoins - cost);

        // Apply stats in Phaser (will also increment level)
        mainScene.events.emit('apply-upgrade', upgradeId);
    }, []);

    const handleContinue = useCallback(() => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('start-next-level');

        setIsBookOpen(false);
        setIsShopping(false);
        mainScene.time.delayedCall(100, () => {
            gameInstanceRef.current?.scene.resume('MainScene');
        });
    }, []);


    const handleBookClose = useCallback(() => {
        if (bookMode === 'level_up') return; // Cannot close while leveling

        if (bookMode === 'shop') {
            handleContinue(); // Trigger next level
        } else {
            setIsBookOpen(false);
            if (gameInstanceRef.current) {
                gameInstanceRef.current.scene.resume('MainScene');
            }
        }
    }, [bookMode, handleContinue]);

    // Memoize actions to prevent re-renders in children
    const bookActions = useMemo(() => ({
        onSelectPerk: selectUpgrade,
        onBuyUpgrade: applyShopUpgrade
    }), [selectUpgrade, applyShopUpgrade]);

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Overlay */}
            <div className={`absolute top-6 left-6 z-10 transition-all duration-500 origin-top-left ${isLeveling ? 'blur-md grayscale opacity-50' : ''}`}>
                <PlayerHUD />
            </div>

            {/* Coin & Progress Header - Top Center */}
            <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 flex flex-col items-center gap-2 ${isLeveling || isShopping ? 'blur-md grayscale opacity-50' : ''}`}>
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

                <CoinCounter />
            </div>

            {/* UI Overlays */}
            <div className="absolute inset-0 z-[60] pointer-events-none">
                <div className="pointer-events-auto">
                    <FantasyBook
                        isOpen={isBookOpen}
                        mode={bookMode}
                        onClose={handleBookClose}
                        isGamePaused={isBookOpen}
                        availablePerks={availablePerks}
                        actions={bookActions}
                    />
                </div>
            </div>

            {/* Game Over Overlay - Decoupled */}
            <GameOverOverlay />

            {/* Hotbar - Bottom Center */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 medieval-pixel transition-all duration-500 ${isLeveling ? 'blur-md grayscale opacity-20' : ''}`}>
                <Hotbar />
            </div>
        </div>
    );
};

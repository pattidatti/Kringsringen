import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { Hotbar } from './ui/Hotbar';
import { TopHUD } from './ui/TopHUD';
import { MenuAnchor } from './ui/MenuAnchor';
import { FantasyBook, type BookMode } from './ui/FantasyBook';
import { UPGRADES, type UpgradeConfig } from '../config/upgrades';
import { setGameInstance } from '../hooks/useGameRegistry';

export const GameContainer = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

    const [isLeveling, setIsLeveling] = useState(false);
    const [availablePerks, setAvailablePerks] = useState<UpgradeConfig[]>([]);

    // Book State
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [bookMode, setBookMode] = useState<BookMode>('view');

    // Robust Hotkey Listener for 'B' and 'Escape'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Toggle Book
            if (key === 'b') {
                if (isBookOpen) {
                    if (bookMode === 'view') {
                        setIsBookOpen(false);
                    }
                } else {
                    setBookMode('view');
                    setIsBookOpen(true);
                }
            }

            // Close with Escape
            if (key === 'escape') {
                if (isBookOpen && bookMode === 'view') {
                    setIsBookOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isBookOpen, bookMode]);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id);
            gameInstanceRef.current = game;

            // Initialize the singleton for hooks
            setGameInstance(game);


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
            };
        }
    }, []);

    // Centralized Pause Management
    useEffect(() => {
        if (!gameInstanceRef.current) return;
        const scene = gameInstanceRef.current.scene.getScene('MainScene');
        if (!scene) return;

        if (isBookOpen) {
            if (!scene.sys.isPaused()) scene.scene.pause();
        } else {
            if (scene.sys.isPaused()) scene.scene.resume();
        }
    }, [isBookOpen]);

    const selectUpgrade = useCallback((upgradeId: string) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        mainScene.events.emit('apply-upgrade', upgradeId);

        // Close Book and Resume
        setIsBookOpen(false);
        setIsLeveling(false);
        // Pause handling is now automatic via useEffect
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
        // Pause handling is now automatic
    }, []);


    const handleBookClose = useCallback(() => {
        if (bookMode === 'level_up') return; // Cannot close while leveling

        if (bookMode === 'shop') {
            handleContinue(); // Trigger next level
        } else {
            setIsBookOpen(false);
        }
    }, [bookMode, handleContinue]);

    const handleToggleBook = useCallback(() => {
        if (isBookOpen) {
            handleBookClose();
        } else {
            setBookMode('view');
            setIsBookOpen(true);
        }
    }, [isBookOpen, handleBookClose]);

    // Memoize actions to prevent re-renders in children
    const bookActions = useMemo(() => ({
        onSelectPerk: selectUpgrade,
        onBuyUpgrade: applyShopUpgrade
    }), [selectUpgrade, applyShopUpgrade]);

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Layer - Pointer events managed internally */}
            <div id="ui-layer" className="absolute inset-0 z-10 pointer-events-none">
                <div className={`pointer-events-auto transition-all duration-500 ${isLeveling ? 'blur-sm grayscale opacity-50' : ''}`}>
                    <TopHUD />
                    <MenuAnchor
                        isOpen={isBookOpen}
                        onClick={handleToggleBook}
                    />
                </div>

                {/* Hotbar - Bottom Center */}
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-500 ${isLeveling ? 'blur-md grayscale opacity-20' : ''}`}>
                    <Hotbar />
                </div>
            </div>

            {/* Book/Modal Layer */}
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

            {/* Game Over Overlay */}
            <GameOverOverlay />
        </div>
    );
};

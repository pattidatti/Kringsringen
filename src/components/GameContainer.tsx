import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { Hotbar } from './ui/Hotbar';
import { TopHUD } from './ui/TopHUD';
import { MenuAnchor } from './ui/MenuAnchor';
import { FantasyBook, type BookMode } from './ui/FantasyBook';
import { BossSplashScreen } from './ui/BossSplashScreen';
import { BossHUD } from './ui/BossHUD';
import { HighscoreNotification } from './ui/HighscoreNotification';
import { PacketType } from '../network/SyncSchemas';

import { setGameInstance } from '../hooks/useGameRegistry';
import type { NetworkConfig } from '../App';

interface GameContainerProps {
    networkConfig?: NetworkConfig | null;
}

export const GameContainer: React.FC<GameContainerProps> = ({ networkConfig }) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

    // Book State
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [bookMode, setBookMode] = useState<BookMode>('view');

    // Multiplayer Sync State
    const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
    const [loadedPlayers, setLoadedPlayers] = useState<Set<string>>(new Set());
    const [isWaitingReady, setIsWaitingReady] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(false);
    const [readyReason, setReadyReason] = useState<'unpause' | 'next_level' | null>(null);

    // Official Host-driven Sync State
    const [syncState, setSyncState] = useState({ loaded: 0, ready: 0, expected: 1 });

    const isBookOpenRef = useRef(isBookOpen);
    const bookModeRef = useRef(bookMode);

    useEffect(() => {
        isBookOpenRef.current = isBookOpen;
    }, [isBookOpen]);

    useEffect(() => {
        bookModeRef.current = bookMode;
    }, [bookMode]);

    // Robust Hotkey Listener for 'B' and 'Escape'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const currentIsOpen = isBookOpenRef.current;
            const currentMode = bookModeRef.current;
            const isMultiplayer = !!networkConfig;

            // Toggle Book
            if (key === 'b') {
                if (currentIsOpen) {
                    if (currentMode === 'view') {
                        if (isMultiplayer) {
                            // Can't directly close in MP without syncing
                            // Expected to click Fortsett, but B can trigger it
                            // Will be handled by the close function if needed, but let's ignore B to close in MP for safety
                        } else {
                            setIsBookOpen(false);
                        }
                    }
                } else {
                    if (isMultiplayer) {
                        const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
                        nm?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'sync_pause', data: { isPaused: true, reason: 'book' } },
                            ts: Date.now()
                        });
                        setBookMode('view');
                        setIsBookOpen(true);
                    } else {
                        setBookMode('view');
                        setIsBookOpen(true);
                    }
                }
            }

            // Close with Escape
            if (key === 'escape') {
                if (currentIsOpen && currentMode === 'view' && !isMultiplayer) {
                    setIsBookOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [networkConfig]); // Dependency required now

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id, networkConfig);
            gameInstanceRef.current = game;

            // Initialize the singleton for hooks
            setGameInstance(game);

            // Handle Level Up - Need to wait for scene to be ready
            const setupSceneListeners = () => {
                const mainScene = game.scene.getScene('MainScene');
                if (mainScene) {
                    mainScene.events.on('level-up', () => {
                        // Level up is now automatic in MainScene without opening the book
                    });

                    mainScene.events.on('level-complete', () => {
                        setBookMode('shop');
                        setIsBookOpen(true);
                    });

                    mainScene.events.on('boss-defeated', () => {
                        game.registry.set('bossComingUp', -1);
                        setBookMode('shop');
                        setIsBookOpen(true);
                    });

                    // Multi-player specific events
                    mainScene.events.on('map-ready', (data: any) => {
                        if (networkConfig) {
                            const nm = (mainScene as any).networkManager;
                            if (nm) {
                                setIsLoadingLevel(true);
                                nm.broadcast({
                                    t: PacketType.GAME_EVENT,
                                    ev: { type: 'player_loaded', data: { playerId: networkConfig.peer.id, level: data.level } },
                                    ts: Date.now()
                                });
                            }
                            if (networkConfig.role === 'host') {
                                setLoadedPlayers(prev => new Set(prev).add(networkConfig.peer.id));
                            }
                        }
                    });

                    mainScene.events.on('sync_pause', (data: any) => {
                        if (networkConfig) {
                            setIsBookOpen(data.isPaused);
                            if (data.reason === 'book') setBookMode('view');
                        }
                    });

                    mainScene.events.on('player_loaded', (data: any) => {
                        if (networkConfig?.role === 'host') {
                            setLoadedPlayers(prev => {
                                if (prev.has(data.playerId)) return prev;
                                const next = new Set(prev).add(data.playerId);
                                const nm = (mainScene as any).networkManager;
                                const total = nm ? nm.getConnectedPeerCount() + 1 : 1;

                                // Broadcast updated state to all clients
                                nm?.broadcast({
                                    t: PacketType.GAME_EVENT,
                                    ev: { type: 'sync_players_state', data: { loaded: next.size, ready: readyPlayers.size, expected: total } },
                                    ts: Date.now()
                                });
                                // Keep local state updated immediately for host
                                setSyncState({ loaded: next.size, ready: readyPlayers.size, expected: total });

                                if (next.size >= total) {
                                    nm?.broadcast({
                                        t: PacketType.GAME_EVENT,
                                        ev: { type: 'start_level', data: { level: data.level } },
                                        ts: Date.now()
                                    });
                                    setIsLoadingLevel(false);
                                    setIsWaitingReady(false);
                                    setLoadedPlayers(new Set());
                                }
                                return next;
                            });
                        }
                    });

                    mainScene.events.on('player_ready', (data: any) => {
                        if (networkConfig?.role === 'host') {
                            setReadyPlayers(prev => {
                                if (prev.has(data.playerId)) return prev;
                                const next = new Set(prev).add(data.playerId);
                                const nm = (mainScene as any).networkManager;
                                const total = nm ? nm.getConnectedPeerCount() + 1 : 1;

                                // Broadcast updated state to all clients
                                nm?.broadcast({
                                    t: PacketType.GAME_EVENT,
                                    ev: { type: 'sync_players_state', data: { loaded: loadedPlayers.size, ready: next.size, expected: total } },
                                    ts: Date.now()
                                });
                                setSyncState({ loaded: loadedPlayers.size, ready: next.size, expected: total });

                                if (next.size >= total) {
                                    if (data.reason === 'unpause') {
                                        nm?.broadcast({
                                            t: PacketType.GAME_EVENT,
                                            ev: { type: 'resume_game', data: {} },
                                            ts: Date.now()
                                        });
                                        setIsBookOpen(false);
                                        setReadyPlayers(new Set());
                                        setIsWaitingReady(false);
                                        setReadyReason(null);
                                    } else {
                                        nm?.broadcast({
                                            t: PacketType.GAME_EVENT,
                                            ev: { type: 'start_level', data: {} },
                                            ts: Date.now()
                                        });
                                        mainScene.events.emit('start-next-level');
                                        setIsBookOpen(false);
                                        setReadyPlayers(new Set());
                                        setIsWaitingReady(false);
                                        setReadyReason(null);
                                    }
                                }
                                return next;
                            });
                        }
                    });

                    mainScene.events.on('sync_players_state', (data: { loaded: number, ready: number, expected: number }) => {
                        setSyncState(data);
                    });

                    mainScene.events.on('start_level', () => {
                        if (networkConfig?.role === 'client') {
                            setIsLoadingLevel(false);
                            setIsBookOpen(false);
                            setIsWaitingReady(false);
                            setReadyReason(null);
                            mainScene.events.emit('start-next-level');
                        }
                    });

                    mainScene.events.on('resume_game', () => {
                        if (networkConfig?.role === 'client') {
                            setIsBookOpen(false);
                            setIsWaitingReady(false);
                            setReadyReason(null);
                        }
                    });

                } else {
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
    }, [networkConfig]);

    // Safety check & Client Retry Mechanism
    useEffect(() => {
        if (!networkConfig) return;
        if (!isWaitingReady && !isLoadingLevel) return;

        const interval = setInterval(() => {
            const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
            if (!nm) return;

            if (networkConfig.role === 'client') {
                // Client Retry Mechanism for dropped packets during async WebRTC startup
                if (isLoadingLevel) {
                    const level = gameInstanceRef.current?.registry.get('gameLevel') || 1;
                    nm.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'player_loaded', data: { playerId: networkConfig.peer.id, level } },
                        ts: Date.now()
                    });
                } else if (isWaitingReady && readyReason) {
                    nm.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: readyReason } },
                        ts: Date.now()
                    });
                }
                return; // Host logic below
            }

            const total = nm.getConnectedPeerCount() + 1;

            // Sync state if expected count changed due to drops
            if ((isLoadingLevel || isWaitingReady) && total !== syncState.expected) {
                const currentState = { loaded: loadedPlayers.size, ready: readyPlayers.size, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: currentState }, ts: Date.now() });
                setSyncState(currentState);
            }

            if (isLoadingLevel && loadedPlayers.size >= total) {
                nm.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'start_level', data: {} },
                    ts: Date.now()
                });
                setIsLoadingLevel(false);
                setLoadedPlayers(new Set());

                // Clear state
                const nextState = { loaded: 0, ready: readyPlayers.size, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                setSyncState(nextState);
            }

            // Re-evaluate Ready state based on newly pruned peer count
            if (isWaitingReady && readyPlayers.size >= total) {
                if (readyReason === 'unpause') {
                    nm.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'resume_game', data: {} },
                        ts: Date.now()
                    });
                    setIsBookOpen(false);
                    setReadyPlayers(new Set());
                    setIsWaitingReady(false);
                    setReadyReason(null);
                } else if (readyReason === 'next_level') {
                    nm.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'start_level', data: {} },
                        ts: Date.now()
                    });
                    gameInstanceRef.current?.scene.getScene('MainScene')?.events.emit('start-next-level');
                    setIsBookOpen(false);
                    setReadyPlayers(new Set());
                    setIsWaitingReady(false);
                    setReadyReason(null);
                }

                // Clear state
                const nextState = { loaded: loadedPlayers.size, ready: 0, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                setSyncState(nextState);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [networkConfig, isWaitingReady, isLoadingLevel, loadedPlayers.size, readyPlayers.size, readyReason]);

    // Centralized Pause Management
    useEffect(() => {
        if (!gameInstanceRef.current) return;
        const scene = gameInstanceRef.current.scene.getScene('MainScene');
        if (!scene) return;

        if (isBookOpen || isLoadingLevel) {
            if (!scene.sys.isPaused()) scene.scene.pause();
        } else {
            if (scene.sys.isPaused()) scene.scene.resume();
        }
    }, [isBookOpen, isLoadingLevel]);

    // Play paper sounds when book opens/closes
    useEffect(() => {
        import('../game/AudioManager').then(({ AudioManager }) => {
            AudioManager.instance.playSFX(isBookOpen ? 'paper_open' : 'paper_close');
        });
    }, [isBookOpen]);

    const applyShopUpgrade = useCallback((upgradeId: string, cost: number) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');

        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        gameInstanceRef.current.registry.set('playerCoins', currentCoins - cost);

        mainScene.events.emit('apply-upgrade', upgradeId);
    }, []);

    const applyRevive = useCallback((targetId: string, cost: number) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        const nm = (mainScene as any).networkManager;

        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        if (currentCoins >= cost) {
            gameInstanceRef.current.registry.set('playerCoins', currentCoins - cost);

            // Broadcast the revive request
            nm?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'revive_request', data: { targetId } },
                ts: Date.now()
            });

            // Local host revive (if host revives self or someone else)
            // It gets routed back through main.ts's 'revive_request' handler anyway
        }
    }, []);

    const handleContinue = useCallback(() => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');

        if (networkConfig) {
            setReadyReason('next_level');
            setIsWaitingReady(true);
            const nm = (mainScene as any).networkManager;
            nm?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: 'next_level' } },
                ts: Date.now()
            });
            if (networkConfig.role === 'host') {
                setReadyPlayers(prev => new Set(prev).add(networkConfig.peer.id));
            }
            return;
        }

        const bossComingUp = gameInstanceRef.current.registry.get('bossComingUp') as number ?? -1;
        if (bossComingUp >= 0) {
            gameInstanceRef.current.registry.set('bossComingUp', -1);
            mainScene.events.emit('start-boss', bossComingUp);
        } else {
            mainScene.events.emit('start-next-level');
        }

        setIsBookOpen(false);
    }, [networkConfig]);

    const handleBookClose = useCallback(() => {
        if (bookMode === 'shop') {
            handleContinue();
        } else {
            if (networkConfig) {
                setReadyReason('unpause');
                setIsWaitingReady(true);
                const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
                nm?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: 'unpause' } },
                    ts: Date.now()
                });
                if (networkConfig.role === 'host') {
                    setReadyPlayers(prev => new Set(prev).add(networkConfig.peer.id));
                }
            } else {
                setIsBookOpen(false);
            }
        }
    }, [bookMode, handleContinue, networkConfig]);

    const handleToggleBook = useCallback(() => {
        if (isBookOpen) {
            handleBookClose();
        } else {
            if (networkConfig) {
                const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
                nm?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'sync_pause', data: { isPaused: true, reason: 'book' } },
                    ts: Date.now()
                });
            }
            setBookMode('view');
            setIsBookOpen(true);
        }
    }, [isBookOpen, handleBookClose, networkConfig]);

    // Memoize actions to prevent re-renders in children
    const bookActions = useMemo(() => ({
        onSelectPerk: () => { },
        onBuyUpgrade: applyShopUpgrade,
        onBuyRevive: applyRevive
    }), [applyShopUpgrade, applyRevive]);

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            {/* UI Layer - Pointer events managed internally */}
            <div id="ui-layer" className="absolute inset-0 z-10 pointer-events-none">
                <div className={`pointer-events-auto transition-all duration-500`}>
                    <TopHUD />
                    <MenuAnchor
                        isOpen={isBookOpen}
                        onClick={handleToggleBook}
                    />
                    <HighscoreNotification />
                </div>

                {/* Hotbar - Bottom Center */}
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-500`}>
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
                        availablePerks={[]}
                        actions={bookActions}
                        isMultiplayer={!!networkConfig}
                        isWaitingReady={isWaitingReady}
                        readyPlayersCount={syncState.ready}
                        expectedPlayersCount={syncState.expected}
                        readyReason={readyReason}
                    />
                </div>
            </div>

            {/* Boss HUD — visible above Hotbar during boss fights */}
            <BossHUD />

            {/* Loading Overlay */}
            {isLoadingLevel && (
                <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center pointer-events-auto backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-amber-100 font-cinzel text-3xl animate-pulse tracking-widest uppercase">
                            Laster Verden...
                        </div>
                        <div className="text-amber-500/70 font-crimson text-xl">
                            {'['} {syncState.loaded} / {syncState.expected} {']'} Klare
                        </div>
                    </div>
                </div>
            )}

            {/* Boss Splash Screen — full-screen intro on boss start */}
            <BossSplashScreen />

            {/* Game Over Overlay */}
            <GameOverOverlay />
        </div>
    );
};

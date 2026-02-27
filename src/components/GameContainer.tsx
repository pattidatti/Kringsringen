import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { Hotbar } from './ui/Hotbar';
import { TopHUD } from './ui/TopHUD';
import { DashCooldownBar } from './ui/DashCooldownBar';
import { MenuAnchor } from './ui/MenuAnchor';
import { FantasyBook, type BookMode } from './ui/FantasyBook';
import { BossSplashScreen } from './ui/BossSplashScreen';
import { BossHUD } from './ui/BossHUD';
import { HighscoreNotification } from './ui/HighscoreNotification';
import { PacketType } from '../network/SyncSchemas';

import { setGameInstance } from '../hooks/useGameRegistry';
import type { NetworkConfig } from '../App';
import type { IMainScene } from '../game/IMainScene';

interface GameContainerProps {
    networkConfig?: NetworkConfig | null;
}

export const GameContainer: React.FC<GameContainerProps> = React.memo(({ networkConfig }) => {
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
    const [readyReason, setReadyReason] = useState<'unpause' | 'next_level' | 'retry' | null>(null);

    // Official Host-driven Sync State
    const [syncState, setSyncState] = useState({ loaded: 0, ready: 0, expected: 1 });

    const isBookOpenRef = useRef(isBookOpen);
    const bookModeRef = useRef(bookMode);
    const readyPlayersRef = useRef<Set<string>>(new Set());
    const syncStateRef = useRef(syncState);

    useEffect(() => {
        isBookOpenRef.current = isBookOpen;
    }, [isBookOpen]);

    useEffect(() => {
        bookModeRef.current = bookMode;
    }, [bookMode]);

    useEffect(() => { readyPlayersRef.current = readyPlayers; }, [readyPlayers]);
    useEffect(() => { syncStateRef.current = syncState; }, [syncState]);

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
                            // Ignore B to close in MP for safety
                        } else {
                            setIsBookOpen(false);
                        }
                    }
                } else {
                    if (isMultiplayer) {
                        const hp = gameInstanceRef.current?.registry.get('playerHP') || 0;
                        if (hp <= 0) return; // Can't open book if dead

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
    }, [networkConfig]);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(gameContainerRef.current.id, networkConfig);
            gameInstanceRef.current = game;

            setGameInstance(game);

            const setupSceneListeners = () => {
                const mainScene = game.scene.getScene('MainScene') as IMainScene;
                if (mainScene) {
                    mainScene.events.on('level-complete', () => {
                        setLoadedPlayers(new Set());
                        setSyncState(s => ({ ...s, loaded: 0 }));
                        setBookMode('shop');
                        setIsBookOpen(true);
                    });

                    mainScene.events.on('boss-defeated', () => {
                        setLoadedPlayers(new Set());
                        setSyncState(s => ({ ...s, loaded: 0 }));
                        game.registry.set('bossComingUp', -1);
                        setBookMode('shop');
                        setIsBookOpen(true);
                    });

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
                                setLoadedPlayers(prev => {
                                    const next = new Set(prev).add(networkConfig.peer.id);
                                    // Update sync state immediately for UI
                                    const total = nm ? nm.getConnectedPeerCount() + 1 : 1;
                                    setSyncState(s => ({ ...s, loaded: next.size, expected: total }));
                                    return next;
                                });
                            }
                        }
                    });

                    mainScene.events.on('sync_pause', (data: any) => {
                        if (networkConfig) {
                            setIsBookOpen(data.isPaused);
                            if (data.reason === 'book') setBookMode('view');
                        }
                    });

                    mainScene.events.on('party_dead', () => {
                        setReadyPlayers(new Set());
                        setReadyReason(null);
                        setIsWaitingReady(false);
                    });

                    mainScene.events.on('restart_game', () => {
                        setIsBookOpen(false);
                        setIsWaitingReady(false);
                        setReadyReason(null);
                        setReadyPlayers(new Set());
                        setLoadedPlayers(new Set());
                        setSyncState({ loaded: 0, ready: 0, expected: networkConfig ? syncStateRef.current.expected : 1 });
                    });

                    mainScene.events.on('player_loaded', (data: any) => {
                        if (networkConfig?.role === 'host') {
                            setLoadedPlayers(prev => {
                                if (prev.has(data.playerId)) {
                                    // If we already had them but they are reporting again, 
                                    // they might have missed the start signal due to a late connection.
                                }
                                const next = new Set(prev).add(data.playerId);
                                const nm = (mainScene as any).networkManager;
                                const total = nm ? nm.getConnectedPeerCount() + 1 : 1;

                                // If host is NO LONGER loading, but a client just reported as loaded,
                                // we MUST re-send the start signal to catch them up.
                                if (!isLoadingLevel) {
                                    console.log(`[Host] Late player ${data.playerId} loaded. Re-sending start signal.`);
                                    const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                                    nm?.sendTo(data.playerId, {
                                        t: PacketType.GAME_EVENT,
                                        ev: { type: 'start_level', data: { level: data.level, bossIndex: bossIdx } },
                                        ts: Date.now()
                                    });
                                }

                                nm?.broadcast({
                                    t: PacketType.GAME_EVENT,
                                    ev: { type: 'sync_players_state', data: { loaded: next.size, ready: readyPlayersRef.current.size, expected: total } },
                                    ts: Date.now()
                                });

                                setSyncState({ loaded: next.size, ready: readyPlayersRef.current.size, expected: total });
                                gameInstanceRef.current?.registry.set('syncState', { loaded: next.size, ready: readyPlayersRef.current.size, expected: total });

                                if (isLoadingLevel && next.size >= total) {
                                    const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                                    nm?.broadcast({
                                        t: PacketType.GAME_EVENT,
                                        ev: { type: 'start_level', data: { level: data.level, bossIndex: bossIdx } },
                                        ts: Date.now()
                                    });
                                    setIsLoadingLevel(false);
                                    setIsWaitingReady(false);
                                    // Note: we DO NOT clear loadedPlayers here anymore, 
                                    // so we can detect late joiners or retries correctly.
                                }
                                return next;
                            });
                        }
                    });

                    mainScene.events.on('sync_players_state', (data: { loaded: number, ready: number, expected: number }) => {
                        setSyncState(data);
                        gameInstanceRef.current?.registry.set('syncState', data);
                    });

                    mainScene.events.on('start_level', (data: any) => {
                        if (networkConfig?.role === 'client') {
                            setIsLoadingLevel(false);
                            setIsBookOpen(false);
                            setIsWaitingReady(false);
                            setReadyReason(null);

                            const bossIndex = data?.bossIndex ?? -1;
                            if (bossIndex >= 0) {
                                mainScene.events.emit('start-boss', bossIndex);
                            } else {
                                mainScene.events.emit('start-next-level');
                            }
                        }
                    });

                    mainScene.events.on('resume_game', () => {
                        if (networkConfig?.role === 'client') {
                            setIsBookOpen(false);
                            setIsWaitingReady(false);
                            setReadyReason(null);
                        }
                    });

                    mainScene.events.on('request-retry', () => {
                        if (networkConfig) {
                            setReadyReason('retry');
                            setIsWaitingReady(true);
                            const nm = (mainScene as any).networkManager;
                            nm?.broadcast({
                                t: PacketType.GAME_EVENT,
                                ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: 'retry' } },
                                ts: Date.now()
                            });
                            if (networkConfig.role === 'host') {
                                setReadyPlayers(prev => new Set(prev).add(networkConfig.peer.id));
                            }
                        } else {
                            mainScene.restartGame();
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

    useEffect(() => {
        if (!networkConfig) return;
        if (!isWaitingReady && !isLoadingLevel) return;

        const interval = setInterval(() => {
            const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
            if (!nm) return;

            if (networkConfig.role === 'client') {
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
                return;
            }

            const total = nm.getConnectedPeerCount() + 1;
            const currentState = { loaded: loadedPlayers.size, ready: readyPlayers.size, expected: total };

            if ((isLoadingLevel || isWaitingReady) && total !== syncState.expected) {
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: currentState }, ts: Date.now() });
                setSyncState(currentState);
                gameInstanceRef.current?.registry.set('syncState', currentState);
            }

            if (isLoadingLevel && loadedPlayers.size >= total) {
                const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'start_level', data: { bossIndex: bossIdx } }, ts: Date.now() });
                setIsLoadingLevel(false);

                const nextState = { loaded: loadedPlayers.size, ready: readyPlayers.size, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                setSyncState(nextState);
                gameInstanceRef.current?.registry.set('syncState', nextState);
            }

            if (isWaitingReady && readyPlayers.size >= total) {
                if (readyReason === 'unpause') {
                    nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'resume_game', data: {} }, ts: Date.now() });
                    setIsBookOpen(false);
                    setReadyPlayers(new Set());
                    setIsWaitingReady(false);
                    setReadyReason(null);
                } else if (readyReason === 'next_level') {
                    nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'start_level', data: {} }, ts: Date.now() });
                    gameInstanceRef.current?.scene.getScene('MainScene')?.events.emit('start-next-level');
                    setIsBookOpen(false);
                    setReadyPlayers(new Set());
                    setIsWaitingReady(false);
                    setReadyReason(null);
                } else if (readyReason === 'retry') {
                    (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.restartGame();
                    setIsBookOpen(false);
                    setReadyPlayers(new Set());
                    setIsWaitingReady(false);
                    setReadyReason(null);
                }

                const nextState = { loaded: loadedPlayers.size, ready: 0, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                setSyncState(nextState);
                gameInstanceRef.current?.registry.set('syncState', nextState);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [networkConfig, isWaitingReady, isLoadingLevel, loadedPlayers.size, readyPlayers.size, readyReason, syncState.expected]);

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

        import('../game/AudioManager').then(({ AudioManager }) => {
            AudioManager.instance.playSFX('upgrade_buy');
        });
    }, []);

    const applyRevive = useCallback((targetId: string, cost: number) => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        if (currentCoins >= cost) {
            gameInstanceRef.current.registry.set('playerCoins', currentCoins - cost);
            mainScene.events.emit('buy-revive', targetId);

            import('../game/AudioManager').then(({ AudioManager }) => {
                AudioManager.instance.playSFX('upgrade_buy');
            });
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
                const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as IMainScene)?.networkManager;
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

    const bookActions = useMemo(() => ({
        onSelectPerk: () => { },
        onBuyUpgrade: applyShopUpgrade,
        onBuyRevive: applyRevive
    }), [applyShopUpgrade, applyRevive]);

    return (
        <div id="game-container" ref={gameContainerRef} className="w-full h-full relative overflow-hidden bg-slate-950 font-sans selection:bg-cyan-500/30">
            <div id="ui-layer" className="absolute inset-0 z-10 pointer-events-none">
                <div className="pointer-events-auto transition-all duration-500">
                    <TopHUD />
                    <MenuAnchor isOpen={isBookOpen} onClick={handleToggleBook} />
                    <HighscoreNotification />
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-500 flex flex-col items-center gap-2">
                    <DashCooldownBar />
                    <Hotbar />
                </div>
            </div>

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

            <BossHUD />

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

            <BossSplashScreen />
            <GameOverOverlay />
        </div>
    );
}, (prev, next) => {
    // Only re-render if the peer ID or role changes (significant network config changes)
    return (
        prev.networkConfig?.peer.id === next.networkConfig?.peer.id &&
        prev.networkConfig?.role === next.networkConfig?.role
    );
});

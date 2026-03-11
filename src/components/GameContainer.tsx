import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createGame } from '../game/main';
import '../styles/medieval-ui.css';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { Hotbar } from './ui/Hotbar';
import { TopHUD } from './ui/TopHUD';
import { EnhancedDashIndicator } from './ui/EnhancedDashIndicator';
import { MenuAnchor } from './ui/MenuAnchor';
import { FantasyBook, type BookMode } from './ui/FantasyBook';
import { BossSplashScreen } from './ui/BossSplashScreen';
import { BossHUD } from './ui/BossHUD';
import { HighscoreNotification } from './ui/HighscoreNotification';
import { UnifiedBuffDisplay } from './ui/UnifiedBuffDisplay';
import { VictoryOverlay } from './ui/VictoryOverlay';
import { VersIndicator } from './ui/VersIndicator';
import { PacketType } from '../network/SyncSchemas';
import { AchievementToastQueue } from './ui/AchievementPopup';
import type { AchievementDef } from '../config/achievements';
import { SaveManager } from '../game/SaveManager';

import { setGameInstance, useGameRegistry } from '../hooks/useGameRegistry';
import { LoadingScreen } from './ui/LoadingScreen';
import type { NetworkConfig } from '../App';
import type { IMainScene } from '../game/IMainScene';
import type { ClassId } from '../config/classes';
import type { ParagonProfile } from '../config/paragon';
import { PvpScoreHUD } from './ui/PvpScoreHUD';
import { PvpCountdown } from './ui/PvpCountdown';
import { PvpRoundSummary } from './ui/PvpRoundSummary';
import { PvpMatchResult } from './ui/PvpMatchResult';
import { Pvp2v2TeammateHUD } from './ui/Pvp2v2TeammateHUD';

interface GameContainerProps {
    networkConfig?: NetworkConfig | null;
    continueRun?: boolean;
    /** Klassen spilleren valgte i ClassSelector (eller hentet fra RunProgress) */
    selectedClass?: ClassId;
    onExitToMenu?: () => void;
    /** Active Paragon profile (null = legacy mode) */
    activeProfile?: ParagonProfile | null;
    /** Target level from level select (null = continue from save) */
    targetLevel?: number | null;
}

export const GameContainer: React.FC<GameContainerProps> = React.memo(({ networkConfig, continueRun, selectedClass, onExitToMenu, activeProfile }) => {
    const phaserContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

    // Book State
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [bookMode, setBookMode] = useState<BookMode>('view');

    // Multiplayer Sync State
    const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
    const [loadedPlayers, setLoadedPlayers] = useState<Set<string>>(new Set());
    const [isWaitingReady, setIsWaitingReady] = useState(false);
    const [isLoadingLevel, setIsLoadingLevel] = useState(true);
    const setSafeIsLoadingLevel = (val: boolean) => {
        console.log('[GameContainer] setIsLoadingLevel:', val);
        setIsLoadingLevel(val);
    };
    const [readyReason, setReadyReason] = useState<'unpause' | 'next_level' | 'retry' | null>(null);

    // Official Host-driven Sync State
    const [syncState, setSyncState] = useState({ loaded: 0, ready: 0, expected: 1 });

    const isBookOpenRef = useRef(isBookOpen);
    const bookModeRef = useRef(bookMode);
    const readyPlayersRef = useRef<Set<string>>(new Set());
    const loadedPlayersRef = useRef<Set<string>>(new Set());
    const syncStateRef = useRef(syncState);
    const isWaitingReadyRef = useRef(isWaitingReady);
    const isLoadingLevelRef = useRef(isLoadingLevel);
    const readyReasonRef = useRef(readyReason);
    const isExitingRef = useRef(false);

    // Asset load progress from PreloadScene (0–1), used by LoadingScreen
    const loadProgress = useGameRegistry<number>('loadProgress', 0);
    const pvpState = useGameRegistry<string>('pvpState', 'waiting');
    const pvp2v2State = useGameRegistry<string>('pvp2v2State', 'waiting');
    const pvpOpponentDisconnecting = useGameRegistry<boolean>('pvpOpponentDisconnecting', false);

    // PvP opponent disconnect countdown
    const [disconnectCountdown, setDisconnectCountdown] = useState(10);
    useEffect(() => {
        if (!pvpOpponentDisconnecting) {
            setDisconnectCountdown(10);
            return;
        }
        setDisconnectCountdown(10);
        const interval = setInterval(() => {
            setDisconnectCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [pvpOpponentDisconnecting]);

    // Victory / Ascension state
    const [showVictory, setShowVictory] = useState(false);

    // Achievement toast queue
    const [achievementQueue, setAchievementQueue] = useState<Array<{ achievement: AchievementDef; id: string }>>([]);

    const [rebootKey, setRebootKey] = useState(0);
    const rebootKeyRef = useRef(rebootKey);

    useEffect(() => {
        isBookOpenRef.current = isBookOpen;
    }, [isBookOpen]);

    useEffect(() => { rebootKeyRef.current = rebootKey; }, [rebootKey]);
    useEffect(() => { readyPlayersRef.current = readyPlayers; }, [readyPlayers]);
    useEffect(() => { loadedPlayersRef.current = loadedPlayers; }, [loadedPlayers]);
    useEffect(() => { syncStateRef.current = syncState; }, [syncState]);
    useEffect(() => { isWaitingReadyRef.current = isWaitingReady; }, [isWaitingReady]);
    useEffect(() => { isLoadingLevelRef.current = isLoadingLevel; }, [isLoadingLevel]);
    useEffect(() => { readyReasonRef.current = readyReason; }, [readyReason]);

    // Robust Hotkey Listener for 'B' and 'Escape'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const currentIsOpen = isBookOpenRef.current;
            const currentMode = bookModeRef.current;
            const isMultiplayer = !!networkConfig;

            // Toggle Book
            if (key === 'b') {
                const isPvp = networkConfig?.gameMode === 'pvp';
                const isPvp2v2 = networkConfig?.gameMode === 'pvp2v2';
                if (currentIsOpen) {
                    if (currentMode === 'view') {
                        if (isMultiplayer && !isPvp && !isPvp2v2) {
                            // Ignore B to close in co-op MP for safety
                        } else if (!isPvp && !isPvp2v2) {
                            setIsBookOpen(false);
                        }
                    }
                } else {
                    if (isPvp) {
                        // In PvP, only allow book during round_end (between rounds)
                        const state = gameInstanceRef.current?.registry.get('pvpState');
                        if (state !== 'round_end') return;
                        setBookMode('shop');
                        setIsBookOpen(true);
                    } else if (isPvp2v2) {
                        // In 2v2 PvP, only allow book during round_end
                        const state = gameInstanceRef.current?.registry.get('pvp2v2State');
                        if (state !== 'round_end') return;
                        setBookMode('shop');
                        setIsBookOpen(true);
                    } else if (isMultiplayer) {
                        const partyDead = gameInstanceRef.current?.registry.get('partyDead') || false;
                        if (partyDead) return; // Can't open book if everyone is dead

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
        if (phaserContainerRef.current && !gameInstanceRef.current) {
            const game = createGame(phaserContainerRef.current, networkConfig, continueRun, selectedClass); // Pass element directly
            gameInstanceRef.current = game;

            // Inject PVP mode into registry
            const gameMode = networkConfig?.gameMode || 'pve';
            game.registry.set('gameMode', gameMode);
            if (gameMode === 'pvp') {
                game.registry.set('pvpBestOf', networkConfig?.pvpBestOf || 5);
                game.registry.set('pvpOpponentName', networkConfig?.pvpOpponentName || 'Motstander');
            }
            if (gameMode === 'pvp2v2') {
                game.registry.set('pvpBestOf', networkConfig?.pvpBestOf || 5);
                // Team assignments and slot are injected in MainScene.create() from netConfig
            }

            // Inject Paragon state into Phaser registry for WaveManager and other systems
            if (activeProfile) {
                game.registry.set('paragonLevel', activeProfile.paragonLevel);
                game.registry.set('clearedLevels', [...activeProfile.clearedLevels]);
                game.registry.set('activeProfileId', activeProfile.id);
            } else {
                game.registry.set('paragonLevel', 0);
                game.registry.set('clearedLevels', []);
            }

            if (continueRun) {
                setIsLoadingLevel(true); // HARDENING: Force overlay if continuing
            } else {
                setIsLoadingLevel(true); // For safety, start in loading state
            }

            console.log('[GameContainer] Creating Phaser game in container:', phaserContainerRef.current.id);
            setGameInstance(game);

            // If we are continuing a singleplayer run, ensure we don't get stuck in a loading state
            // especially if the scene completes very rapidly or before we poll.
            if (continueRun && !networkConfig) {
                console.log('[GameContainer] Singleplayer continue detected. Priming for rapid load.');
            }

            let listenersRegistered = false;
            const MAX_WAIT_MS = 15_000;
            const startedAt = Date.now();

            const scenePoller = setInterval(() => {
                if (Date.now() - startedAt > MAX_WAIT_MS) {
                    clearInterval(scenePoller);
                    console.error('[GameContainer] Timed out waiting for scene create-complete. Forcing clear.');
                    setIsLoadingLevel(false);
                    return;
                }

                const mainScene = game.scene.getScene('MainScene') as IMainScene;

                // CRITICAL FIX: If the scene is already complete, clear loading even if listeners aren't bound yet.
                // This prevents the hang when cached assets make initialization near-instant.
                if (game.registry.get('create-complete')) {
                    console.log('[GameContainer] create-complete found in registry. Clearing loading state.');
                    clearInterval(scenePoller);
                    setTimeout(() => {
                        setSafeIsLoadingLevel(false);
                    }, 500);
                    return;
                }

                if (!listenersRegistered && mainScene) {
                    listenersRegistered = true;
                    console.log('[GameContainer] MainScene found. Registering event listeners.');

                    // Achievement unlocked event
                    mainScene.events.on('achievement-unlocked', (achievement: AchievementDef) => {
                        setAchievementQueue((prev) => [
                            ...prev,
                            { achievement, id: `${achievement.id}-${Date.now()}` },
                        ]);
                    });

                    mainScene.events.on('level-complete', () => {
                        setLoadedPlayers(new Set());
                        setSyncState(s => ({ ...s, loaded: 0 }));

                        // Check if this was the final level (10) — show victory/ascension overlay
                        const currentLevel = game.registry.get('gameLevel') || 1;
                        if (currentLevel >= 10 && activeProfile) {
                            setShowVictory(true);
                        } else {
                            setBookMode('shop');
                            setIsBookOpen(true);
                        }
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
                                    const nextState = { loaded: next.size, ready: readyPlayersRef.current.size, expected: total };

                                    setSyncState(nextState);

                                    // CRITICAL FIX: Check if we are now fully loaded and should proceed
                                    if (isLoadingLevelRef.current && next.size >= total) {
                                        console.log(`[Host] Host loaded and all peers accounted for (${next.size}/${total}). Proceeding.`);
                                        const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                                        nm?.broadcast({
                                            t: PacketType.GAME_EVENT,
                                            ev: { type: 'start_level', data: { level: data.level, bossIndex: bossIdx } },
                                            ts: Date.now()
                                        });
                                        setIsLoadingLevel(false);
                                        setIsWaitingReady(false);
                                    }

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

                    mainScene.events.on('restart-game', () => {
                        console.log('[GameContainer] restart-game received. Triggering full instance reboot...');
                        setIsBookOpen(false);
                        setIsWaitingReady(false);
                        setReadyReason(null);
                        setReadyPlayers(new Set());
                        setLoadedPlayers(new Set());
                        setSyncState({ loaded: 0, ready: 0, expected: networkConfig ? syncStateRef.current.expected : 1 });

                        // Force full Phaser restart by incrementing the reboot key
                        setRebootKey(prev => prev + 1);
                    });

                    mainScene.events.on('create-complete', () => {
                        console.log('[GameContainer] create-complete RECEIVED. Clearing loading state.');
                        clearInterval(scenePoller);
                        setIsLoadingLevel(false);
                    });

                    // CRITICAL: Double-check if it's already complete immediately after registering the listener
                    if (mainScene.registry.get('create-complete')) {
                        console.log('[GameContainer] Scene ALREADY complete upon registration. Clearing loading state.');
                        clearInterval(scenePoller);
                        setIsLoadingLevel(false);
                    }

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
                                if (!isLoadingLevelRef.current) {
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

                                if (isLoadingLevelRef.current && next.size >= total) {
                                    const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                                    nm?.broadcast({
                                        t: PacketType.GAME_EVENT,
                                        ev: { type: 'start_level', data: { level: data.level, bossIndex: bossIdx } },
                                        ts: Date.now()
                                    });
                                    setIsLoadingLevel(false);
                                    setIsWaitingReady(false);
                                }
                                return next;
                            });
                        }
                    });

                    mainScene.events.on('sync_players_state', (data: { loaded: number, ready: number, expected: number }) => {
                        setSyncState(data);
                        gameInstanceRef.current?.registry.set('syncState', data);
                    });

                    mainScene.events.on('player_ready', (data: any) => {
                        if (networkConfig?.role === 'host') {
                            setReadyPlayers(prev => {
                                const next = new Set(prev).add(data.playerId);
                                const nm = (mainScene as any).networkManager;
                                const total = nm ? nm.getConnectedPeerCount() + 1 : 1;

                                const nextState = { loaded: syncStateRef.current.loaded, ready: next.size, expected: total };

                                // Broadcast immediately to avoid heartbeat delay
                                nm?.broadcast({
                                    t: PacketType.GAME_EVENT,
                                    ev: { type: 'sync_players_state', data: nextState },
                                    ts: Date.now()
                                });

                                setSyncState(nextState);
                                gameInstanceRef.current?.registry.set('syncState', nextState);
                                return next;
                            });
                        }
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
                                mainScene.events.emit('start-next-level', data?.level);
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

                    // Paragon: Retry current level (soft death)
                    mainScene.events.on('request-retry-level', () => {
                        const currentLevel = game.registry.get('gameLevel') || 1;
                        mainScene.restartAtLevel(currentLevel);
                    });

                    // Paragon: Exit to menu (save and quit)
                    mainScene.events.on('request-exit-to-menu', () => {
                        onExitToMenu?.();
                    });
                }

                // Check registry every tick as belt-and-suspenders
                if (game.registry.get('create-complete')) {
                    console.log('[GameContainer] Poller detected create-complete via registry. Clearing loading state with delay.');
                    clearInterval(scenePoller);
                    setTimeout(() => {
                        setIsLoadingLevel(false);
                    }, 200);
                }
            }, 100);

            return () => {
                console.log('[GameContainer] Unmounting/Rebooting');
                clearInterval(scenePoller);
                if (gameInstanceRef.current) {
                    try { gameInstanceRef.current.loop.stop(); } catch (_) { }
                    try { gameInstanceRef.current.input.destroy(); } catch (_) { }
                    try {
                        gameInstanceRef.current.destroy(true);
                    } catch (_) { } finally {
                        gameInstanceRef.current = null;
                    }
                }
                setGameInstance(null);
            };
        }
    }, [networkConfig, rebootKey, continueRun]); // Added rebootKey and continueRun dependency

    useEffect(() => {
        if (!networkConfig) return;

        const interval = setInterval(() => {
            const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.networkManager;
            if (!nm) return;

            const isWaitingReady = isWaitingReadyRef.current;
            const isLoadingLevel = isLoadingLevelRef.current;
            const readyReason = readyReasonRef.current;
            const readyPlayersSize = readyPlayersRef.current.size;
            const loadedPlayersSize = loadedPlayersRef.current.size;

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
            const currentState = { loaded: loadedPlayersSize, ready: readyPlayersSize, expected: total };

            // Always broadcast state heartbeat to all clients
            nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: currentState }, ts: Date.now() });

            // Only update local state if it changed to avoid ripple re-renders
            if (currentState.loaded !== syncStateRef.current.loaded || currentState.ready !== syncStateRef.current.ready || currentState.expected !== syncStateRef.current.expected) {
                setSyncState(currentState);
                gameInstanceRef.current?.registry.set('syncState', currentState);
            }

            if (isWaitingReady && readyPlayersSize >= total) {
                // Determine signal based on reason
                let eventType: string = 'resume_game';
                if (readyReason === 'next_level') eventType = 'start_level';
                else if (readyReason === 'retry') eventType = 'restart_game';

                console.log(`[Host] All players ready (${readyPlayersSize}/${total}). Sending ${eventType}.`);

                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: eventType, data: {} }, ts: Date.now() });

                // Local execution for host
                if (readyReason === 'unpause') {
                    setIsBookOpen(false);
                } else if (readyReason === 'next_level') {
                    gameInstanceRef.current?.scene.getScene('MainScene')?.events.emit('start-next-level');
                    setIsBookOpen(false);
                } else if (readyReason === 'retry') {
                    (gameInstanceRef.current?.scene.getScene('MainScene') as any)?.restartGame();
                    setIsBookOpen(false);
                }

                // Reset state
                setReadyPlayers(new Set());
                setIsWaitingReady(false);
                setReadyReason(null);

                const nextState = { loaded: loadedPlayersSize, ready: 0, expected: total };
                nm.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                setSyncState(nextState);
                gameInstanceRef.current?.registry.set('syncState', nextState);
            } else if (isLoadingLevel && loadedPlayersSize >= total) {
                // FALLBACK PROGRESSION: If we are stuck in loading but everyone is here
                console.log(`[Host] Heartbeat detect all players loaded (${loadedPlayersSize}/${total}). Forcing start signal.`);
                const level = gameInstanceRef.current?.registry.get('gameLevel') || 1;
                const bossIdx = gameInstanceRef.current?.registry.get('bossComingUp') ?? -1;
                nm.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'start_level', data: { level, bossIndex: bossIdx } },
                    ts: Date.now()
                });
                setIsLoadingLevel(false);
                setIsWaitingReady(false);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [networkConfig]);

    useEffect(() => {
        if (!gameInstanceRef.current) return;
        const scene = gameInstanceRef.current.scene.getScene('MainScene');
        if (!scene) return;

        // In singleplayer, or after multiplayer sync, we must ensure we aren't paused.
        // We only pause for the Book (Shop/View) or while the initial map is being loaded.
        const shouldBePaused = isBookOpen || isLoadingLevel;

        if (shouldBePaused) {
            if (!scene.sys.isPaused()) {
                console.log('[GameContainer] Pausing scene (isBookOpen:', isBookOpen, 'isLoadingLevel:', isLoadingLevel, ')');
                scene.scene.pause();
            }
        } else {
            if (scene.sys.isPaused()) {
                console.log('[GameContainer] Resuming scene');
                scene.scene.resume();
            }
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

    const handleCheatGold = useCallback(() => {
        if (!gameInstanceRef.current) return;
        const currentCoins = gameInstanceRef.current.registry.get('playerCoins') || 0;
        gameInstanceRef.current.registry.set('playerCoins', currentCoins + 30000);

        import('../game/AudioManager').then(({ AudioManager }) => {
            AudioManager.instance.playSFX('upgrade_buy');
        });
    }, []);

    const handleContinue = useCallback(() => {
        if (!gameInstanceRef.current) return;
        const mainScene = gameInstanceRef.current.scene.getScene('MainScene');
        if (networkConfig) {
            setReadyReason('next_level');
            setIsWaitingReady(true);

            // Optimistic UI: Increment ready count locally if we weren't ready yet
            setSyncState(s => ({ ...s, ready: Math.min(s.expected, s.ready + 1) }));

            const nm = (mainScene as any).networkManager;
            nm?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: 'next_level' } },
                ts: Date.now()
            });
            if (networkConfig.role === 'host') {
                setReadyPlayers(prev => {
                    const next = new Set(prev).add(networkConfig.peer.id);
                    // Force a broadcast of the new count
                    const total = nm ? nm.getConnectedPeerCount() + 1 : 1;
                    const nextState = { loaded: syncStateRef.current.loaded, ready: next.size, expected: total };
                    nm?.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                    setSyncState(nextState);
                    return next;
                });
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
        // In PvP, book is only used for shopping between rounds — just close it
        if (networkConfig?.gameMode === 'pvp') {
            setIsBookOpen(false);
            return;
        }
        if (bookMode === 'shop') {
            handleContinue();
        } else {
            if (networkConfig) {
                setReadyReason('unpause');
                setIsWaitingReady(true);

                // Optimistic UI
                setSyncState(s => ({ ...s, ready: Math.min(s.expected, s.ready + 1) }));

                const nm = (gameInstanceRef.current?.scene.getScene('MainScene') as IMainScene)?.networkManager;
                nm?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'player_ready', data: { playerId: networkConfig.peer.id, reason: 'unpause' } },
                    ts: Date.now()
                });
                if (networkConfig.role === 'host') {
                    setReadyPlayers(prev => {
                        const next = new Set(prev).add(networkConfig.peer.id);
                        const total = nm ? nm.getConnectedPeerCount() + 1 : 1;
                        const nextState = { loaded: syncStateRef.current.loaded, ready: next.size, expected: total };
                        nm?.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'sync_players_state', data: nextState }, ts: Date.now() });
                        setSyncState(nextState);
                        return next;
                    });
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

    const handleExitToMenu = useCallback(async () => {
        if (isExitingRef.current) return;
        isExitingRef.current = true;

        const game = gameInstanceRef.current;
        if (game && !networkConfig) {
            try {
                // Ask MainScene to collect and save full game state (has access to player pos + enemies)
                const mainScene = game.scene.getScene('MainScene') as IMainScene;
                mainScene?.events.emit('request-save');
                console.log('[GameContainer] Emitted request-save to MainScene.');
            } catch (e) {
                console.error('[GameContainer] request-save emit failed:', e);
            }

            try {
                const { AudioManager } = await import('../game/AudioManager');
                await AudioManager.instance.fadeOutAndStopAll(1000);
            } catch (e) {
                console.error('[GameContainer] Error during audio fadeout:', e);
            }

            // Stop the game loop synchronously to prevent further rendering.
            // Do NOT call game.destroy() here — let the cleanup effect handle it
            // while the canvas is still in the DOM (React guarantees cleanup runs
            // before DOM removal).
            try { game.loop.stop(); } catch (_) { /* ignore */ }
            try { game.input.destroy(); } catch (_) { /* ignore */ }
        }

        // Clear phaserGames array to prevent createGame from double-destroying
        if ((window as any).phaserGames) {
            (window as any).phaserGames = [];
        }

        onExitToMenu?.();
    }, [onExitToMenu, networkConfig]);

    const isPvpMode = networkConfig?.gameMode === 'pvp';
    const isPvp2v2Mode = networkConfig?.gameMode === 'pvp2v2';

    const handlePvpReady = useCallback(() => {
        const mainScene = gameInstanceRef.current?.scene.getScene('MainScene') as any;
        mainScene?.pvpRoundManager?.setLocalReady();
    }, []);

    const handlePvpRematch = useCallback(() => {
        const mainScene = gameInstanceRef.current?.scene.getScene('MainScene') as any;
        mainScene?.pvpRoundManager?.requestRematch();
    }, []);

    const handlePvp2v2Ready = useCallback(() => {
        const mainScene = gameInstanceRef.current?.scene.getScene('MainScene') as any;
        mainScene?.pvp2v2RoundManager?.setLocalReady();
    }, []);

    const handlePvp2v2Rematch = useCallback(() => {
        const mainScene = gameInstanceRef.current?.scene.getScene('MainScene') as any;
        mainScene?.pvp2v2RoundManager?.requestRematch();
    }, []);

    const handlePvpOpenShop = useCallback(() => {
        setBookMode('shop');
        setIsBookOpen(true);
    }, []);

    // Auto-close book when PvP countdown starts (round is about to begin)
    useEffect(() => {
        if (isPvpMode && pvpState === 'countdown') {
            setIsBookOpen(false);
        }
    }, [isPvpMode, pvpState]);

    useEffect(() => {
        if (isPvp2v2Mode && pvp2v2State === 'countdown') {
            setIsBookOpen(false);
        }
    }, [isPvp2v2Mode, pvp2v2State]);

    const bookActions = useMemo(() => ({
        onSelectPerk: () => { },
        onBuyUpgrade: applyShopUpgrade,
        onBuyRevive: applyRevive,
        onCheatGold: handleCheatGold
    }), [applyShopUpgrade, applyRevive, handleCheatGold]);

    return (
        <div
            id="game-ui-wrapper"
            className="w-full h-full relative overflow-hidden bg-black font-sans selection:bg-cyan-500/30"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Phaser Game Layer */}
            <div
                id="phaser-game-container"
                ref={phaserContainerRef}
                className="absolute inset-0 z-0"
            />

            {/* React UI Layer */}
            <div id="ui-layer" className="absolute inset-0 z-10 pointer-events-none">
                <div className="pointer-events-auto transition-all duration-500">
                    <TopHUD />
                    <MenuAnchor isOpen={isBookOpen} onClick={handleToggleBook} />
                    <HighscoreNotification />
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-500 flex flex-col items-center gap-2">
                    {selectedClass === 'skald' && <VersIndicator />}
                    <EnhancedDashIndicator />
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
                        onExitGame={handleExitToMenu}
                    />
                </div>
            </div>

            {/* PvE-only overlays */}
            {!isPvpMode && <BossHUD />}
            <UnifiedBuffDisplay />

            <LoadingScreen
                visible={isLoadingLevel}
                progress={loadProgress > 0 ? loadProgress : undefined}
                networkStatus={networkConfig ? { loaded: syncState.loaded, expected: syncState.expected } : undefined}
            />

            {!isPvpMode && <BossSplashScreen />}
            {!isPvpMode && <GameOverOverlay />}

            {/* PVP opponent disconnect grace period banner */}
            {(isPvpMode || isPvp2v2Mode) && pvpOpponentDisconnecting && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] px-5 py-3 rounded-lg bg-black/80 border border-amber-700/60 text-center pointer-events-none">
                    <p className="text-amber-200 font-fantasy text-sm" style={{ textShadow: '1px 1px 0 #000' }}>
                        Motstanderen er borte... kobler til igjen ({disconnectCountdown}s)
                    </p>
                </div>
            )}

            {/* PVP 1v1 overlays */}
            {isPvpMode && (
                <>
                    {!isBookOpen && <PvpScoreHUD mode="pvp" />}
                    <PvpCountdown />
                    {!isBookOpen && (
                        <PvpRoundSummary
                            mode="pvp"
                            onReady={handlePvpReady}
                            onOpenShop={handlePvpOpenShop}
                            isWaitingReady={false}
                        />
                    )}
                    <PvpMatchResult
                        mode="pvp"
                        onRematch={handlePvpRematch}
                        onLeave={handleExitToMenu}
                    />
                </>
            )}

            {/* PVP 2v2 overlays */}
            {isPvp2v2Mode && (
                <>
                    {!isBookOpen && <PvpScoreHUD mode="pvp2v2" />}
                    <PvpCountdown registryKey="pvp2v2Countdown" stateKey="pvp2v2State" />
                    {!isBookOpen && (
                        <PvpRoundSummary
                            mode="pvp2v2"
                            onReady={handlePvp2v2Ready}
                            onOpenShop={handlePvpOpenShop}
                            isWaitingReady={false}
                        />
                    )}
                    <PvpMatchResult
                        mode="pvp2v2"
                        onRematch={handlePvp2v2Rematch}
                        onLeave={handleExitToMenu}
                    />
                    <Pvp2v2TeammateHUD />
                </>
            )}

            {/* Achievement Toast Queue */}
            <AchievementToastQueue
                queue={achievementQueue}
                onDismiss={(id) => {
                    setAchievementQueue((prev) => prev.filter((item) => item.id !== id));
                }}
            />

            {/* Victory / Ascension Overlay (Paragon: after beating Level 10) */}
            {showVictory && activeProfile && (
                <VictoryOverlay
                    paragonLevel={activeProfile.paragonLevel}
                    onAscend={() => {
                        // Ascend to next Paragon tier
                        const profile = SaveManager.getActiveProfile();
                        if (profile) {
                            profile.paragonLevel++;
                            profile.currentGameLevel = 1;
                            profile.currentWave = 1;
                            profile.clearedLevels = [];
                            profile.highestLevelReached = Math.max(profile.highestLevelReached, 10);
                            SaveManager.updateProfile(profile);

                            // Update registry
                            gameInstanceRef.current?.registry.set('paragonLevel', profile.paragonLevel);
                            gameInstanceRef.current?.registry.set('clearedLevels', []);
                        }
                        setShowVictory(false);
                        onExitToMenu?.();
                    }}
                    onReturnToMenu={() => {
                        setShowVictory(false);
                        onExitToMenu?.();
                    }}
                />
            )}
        </div>
    );
}, (prev, next) => {
    // Only re-render if the peer ID or role changes (significant network config changes)
    return (
        prev.networkConfig?.peer.id === next.networkConfig?.peer.id &&
        prev.networkConfig?.role === next.networkConfig?.role &&
        prev.continueRun === next.continueRun &&
        prev.selectedClass === next.selectedClass &&
        prev.onExitToMenu === next.onExitToMenu &&
        prev.activeProfile?.id === next.activeProfile?.id &&
        prev.targetLevel === next.targetLevel
    );
});

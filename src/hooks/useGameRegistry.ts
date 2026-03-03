import { useState, useEffect } from 'react';
import Phaser from 'phaser';

// Singleton to hold the game instance reference
let gameInstance: Phaser.Game | null = null;
const readyListeners = new Set<() => void>();
const instanceListeners = new Set<(game: Phaser.Game | null) => void>();

export const setGameInstance = (game: Phaser.Game | null) => {
    console.log('[useGameRegistry] setGameInstance:', !!game);
    gameInstance = game;

    // Notify those waiting for any instance at all (usually first boot)
    if (game) {
        readyListeners.forEach(fn => fn());
        readyListeners.clear();
    }

    // Notify those tracking lifecycle (e.g. hooks that need to resubscribe)
    instanceListeners.forEach(fn => fn(game));
};

export const onGameReady = (fn: () => void) => {
    if (gameInstance) {
        fn();
    } else {
        readyListeners.add(fn);
    }
    return () => { readyListeners.delete(fn); };
};

/**
 * Subscribe to every change of the global game instance (mounts/unmounts).
 */
export const onGameInstanceChange = (fn: (game: Phaser.Game | null) => void) => {
    instanceListeners.add(fn);
    return () => { instanceListeners.delete(fn); };
};

export const getGameInstance = () => gameInstance;

/**
 * Hook to subscribe to a specific key in the Phaser Registry.
 * Triggers a re-render ONLY when this specific key changes.
 * 
 * Phaser's DataManager emits:
 *  - 'setdata' (parent, key, value) — generic, when a NEW key is first set
 *  - 'changedata-KEY' (parent, value, prevValue) — when an EXISTING key's value changes
 * 
 * @param key The registry key to listen for (e.g., 'playerHP', 'playerCoins')
 * @param initialValue Fallback value if registry or key doesn't exist yet
 */
export function useGameRegistry<T>(key: string, initialValue: T): T {
    // Track the current game instance locally so we can resubscribe if it changes
    const [game, setGame] = useState<Phaser.Game | null>(getGameInstance);

    const [value, setValue] = useState<T>(() => {
        if (game) {
            return game.registry.get(key) ?? initialValue;
        }
        return initialValue;
    });

    // Listen for global game instance changes (Phaser rebooting)
    useEffect(() => {
        return onGameInstanceChange((newInstance) => {
            setGame(newInstance);
        });
    }, []);

    // Subscribe to registry events of the current active game instance
    useEffect(() => {
        if (!game) return;

        const registry = game.registry;
        const events = registry.events;

        // Sync local state with current registry value immediately upon new game instance
        const current = registry.get(key);
        setValue(prev => {
            const next = current ?? initialValue;
            return prev === next ? prev : next;
        });

        const onChangeData = (_parent: any, val: T) => {
            setValue(val ?? initialValue);
        };
        events.on(`changedata-${key}`, onChangeData);

        const onSetData = (_parent: any, itemKey: string, val: T) => {
            if (itemKey === key) {
                setValue(val ?? initialValue);
            }
        };
        events.on('setdata', onSetData);

        return () => {
            events.off(`changedata-${key}`, onChangeData);
            events.off('setdata', onSetData);
        };
    }, [key, game]);

    return value;
}

import { useState, useEffect } from 'react';
import Phaser from 'phaser';

// Singleton to hold the game instance reference
let gameInstance: Phaser.Game | null = null;
const instanceListeners = new Set<() => void>();

export const setGameInstance = (game: Phaser.Game | null) => {
    console.log('[useGameRegistry] setGameInstance:', !!game);
    gameInstance = game;
    instanceListeners.forEach(fn => fn());
    if (game) {
        instanceListeners.clear();
    }
};

export const onGameReady = (fn: () => void) => {
    if (gameInstance) {
        fn();
    } else {
        instanceListeners.add(fn);
    }
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
    const [value, setValue] = useState<T>(() => {
        if (gameInstance) {
            return gameInstance.registry.get(key) ?? initialValue;
        }
        return initialValue;
    });

    // Force re-run of subscription effect when game instance appears
    const [ready, setReady] = useState(!!gameInstance);

    // Wait for game instance if not available yet
    useEffect(() => {
        return onGameReady(() => setReady(true));
    }, []);

    // Subscribe to registry events
    useEffect(() => {
        const game = getGameInstance();
        if (!ready || !game) return;

        const registry = game.registry;
        const events = registry.events;

        // Optimized: only setValue if the registry state has actually diverged from our current state
        // This avoids the "cascading render" lint error for the common case where useState initialized correctly.
        const current = registry.get(key);
        setValue(prev => (prev === current ? prev : current));

        const onChangeData = (_parent: any, val: T) => {
            setValue(val);
        };
        events.on(`changedata-${key}`, onChangeData);

        const onSetData = (_parent: any, itemKey: string, val: T) => {
            if (itemKey === key) {
                setValue(val);
            }
        };
        events.on('setdata', onSetData);

        return () => {
            events.off(`changedata-${key}`, onChangeData);
            events.off('setdata', onSetData);
        };
    }, [key, ready]);

    return value;
}

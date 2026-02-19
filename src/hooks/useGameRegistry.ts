import { useState, useEffect } from 'react';
import Phaser from 'phaser';

// Singleton to hold the game instance reference
let gameInstance: Phaser.Game | null = null;

export const setGameInstance = (game: Phaser.Game) => {
    gameInstance = game;
};

export const getGameInstance = () => gameInstance;

/**
 * Hook to subscribe to a specific key in the Phaser Registry.
 * Triggers a re-render ONLY when this specific key changes.
 * 
 * @param key The registry key to listen for (e.g., 'playerHP', 'playerCoins')
 * @param initialValue Fallback value if registry or key doesn't exist yet
 */
export function useGameRegistry<T>(key: string, initialValue: T): T {
    // Initialize state with current registry value if available, or initialValue
    const [value, setValue] = useState<T>(() => {
        if (gameInstance) {
            return gameInstance.registry.get(key) ?? initialValue;
        }
        return initialValue;
    });

    useEffect(() => {
        if (!gameInstance) return;

        const registry = gameInstance.registry;

        // Update local state when the specific registry key changes
        const handleChange = (_parent: any, val: T) => {
            setValue(val);
        };

        // Standard Phaser event: 'changedata-KEY'
        registry.events.on(`changedata-${key}`, handleChange);

        // Check if value changed while we were mounting
        const currentValue = registry.get(key);
        if (currentValue !== undefined && currentValue !== value) {
            setValue(currentValue);
        }

        return () => {
            registry.events.off(`changedata-${key}`, handleChange);
        };
    }, [key]);

    return value;
}

import { useState, useEffect, useRef } from 'react';
import { getGameInstance } from './useGameRegistry';

/**
 * Throttled version of useGameRegistry.
 * Useful for high-frequency data (like playerHP or coins) to reduce React render flooding.
 * 
 * @param key The registry key to listen for
 * @param initialValue Fallback value
 * @param throttleMs Minimum time between React renders (default 100ms = 10 FPS)
 * @param priorityCondition Optional function to bypass throttle (e.g., val => val <= 0)
 */
export function useGameRegistryThrottled<T>(
    key: string,
    initialValue: T,
    throttleMs: number = 100,
    priorityCondition?: (val: T) => boolean
): T {
    const [value, setValue] = useState<T>(() => {
        const game = getGameInstance();
        if (game) {
            return game.registry.get(key) ?? initialValue;
        }
        return initialValue;
    });

    const lastRenderTimeRef = useRef<number>(0);
    const pendingValueRef = useRef<T | undefined>(undefined);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const game = getGameInstance();
        if (!game) return;

        const events = game.registry.events;

        const updateState = (val: T) => {
            const now = Date.now();
            const timeSinceLastRender = now - lastRenderTimeRef.current;

            // Clear any pending deferred updates
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Bypass throttle if priority condition is met (e.g. HP hits 0)
            const isPriority = priorityCondition ? priorityCondition(val) : false;

            if (isPriority || timeSinceLastRender >= throttleMs) {
                setValue(val);
                lastRenderTimeRef.current = now;
                pendingValueRef.current = undefined;
            } else {
                // Defer the update to the end of the throttle window
                pendingValueRef.current = val;
                timeoutRef.current = setTimeout(() => {
                    if (pendingValueRef.current !== undefined) {
                        setValue(pendingValueRef.current);
                        lastRenderTimeRef.current = Date.now();
                        pendingValueRef.current = undefined;
                    }
                }, throttleMs - timeSinceLastRender);
            }
        };

        const onChangeData = (_parent: any, val: T) => updateState(val);
        const onSetData = (_parent: any, itemKey: string, val: T) => {
            if (itemKey === key) updateState(val);
        };

        events.on(`changedata-${key}`, onChangeData);
        events.on('setdata', onSetData);

        return () => {
            events.off(`changedata-${key}`, onChangeData);
            events.off('setdata', onSetData);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [key, throttleMs, priorityCondition]);

    return value;
}

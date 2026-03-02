import { useEffect } from 'react';
import { GAME_IMAGE_URLS, GAME_AUDIO_URLS } from '../game/GameAssetUrls';

/**
 * Warms the browser's HTTP cache with all game assets while the user is on
 * the landing page, so that Phaser's PreloadScene completes near-instantly.
 *
 * Strategy:
 *   - Images:  new Image().src — triggers a cacheable GET, no DOM insertion needed.
 *   - Audio:   fetch() with cache:'default' — ensures the full response body is
 *              cached (new Audio() doesn't guarantee a complete download).
 *
 * This is a pure opportunistic optimisation: if a fetch fails, it is silently
 * ignored. Phaser's own PreloadScene handles all errors and retries independently.
 */
export function useGameAssetPreloader(): void {
    useEffect(() => {
        // Small delay so the landing page's own critical assets (bg image, audio)
        // get a head start on the network before we saturate the bandwidth.
        const timer = setTimeout(() => {
            // — Images —
            GAME_IMAGE_URLS.forEach(url => {
                const img = new Image();
                img.src = url;
            });

            // — Audio —
            GAME_AUDIO_URLS.forEach(url => {
                fetch(url, { cache: 'default' }).catch(() => {
                    // Silently ignore — audio preloading is best-effort only.
                });
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []); // Runs once on mount, never again.
}

import Phaser from 'phaser';
import { loadAssets } from './AssetLoader';

export class PreloadScene extends Phaser.Scene {
    private _fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        super('PreloadScene');
    }

    preload() {
        // Reset progress so React LoadingScreen starts fresh
        this.registry.set('loadProgress', 0);

        // Emit load progress to Phaser registry so the React loading screen can display it
        this.load.on('progress', (value: number) => {
            this.registry.set('loadProgress', value);
        });

        // Error handler — log failed assets but continue loading
        this.load.on('loaderror', (file: Phaser.Loader.File) => {
            console.warn(`[PreloadScene] Asset failed to load: ${file.key} (${file.url})`);
        });

        // Native timeout fallback — independent of Phaser's time system.
        // If the game loop isn't ticking (e.g. after incomplete destroy of previous
        // instance), this.time.delayedCall() would never fire. setTimeout always will.
        this._fallbackTimeout = setTimeout(() => {
            console.error('[PreloadScene] NATIVE TIMEOUT! Assets took >8s. Forcing MainScene transition.');
            if (this.sys?.isActive()) {
                this.scene.start('MainScene');
            }
        }, 8000);

        this.load.on('complete', () => {
            console.log('[PreloadScene] All assets loaded successfully. Transitioning shortly...');
            this.registry.set('loadProgress', 1);
            if (this._fallbackTimeout) {
                clearTimeout(this._fallbackTimeout);
                this._fallbackTimeout = null;
            }
        });

        console.log('[PreloadScene] Preload starting for assets...');
        loadAssets(this);
    }

    create() {
        // Generate runtime glow texture for cheap additive light sprites
        this.generateGlowTexture();

        console.log('[PreloadScene] Create reached. Starting MainScene transition...');
        this.scene.start('MainScene');
    }

    private generateGlowTexture(): void {
        if (this.textures.exists('glow-soft')) return;

        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const half = size / 2;
        const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
        // Cubic falloff curve (1-r)^3 — approximates Light2D inverse-square attenuation
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.1, 'rgba(255,255,255,0.73)');
        gradient.addColorStop(0.25, 'rgba(255,255,255,0.42)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.22)');
        gradient.addColorStop(0.55, 'rgba(255,255,255,0.09)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,0.03)');
        gradient.addColorStop(0.85, 'rgba(255,255,255,0.005)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        this.textures.addCanvas('glow-soft', canvas);
    }

    shutdown() {
        this.load.off('progress');
        this.load.off('complete');
        this.load.off('loaderror');
        if (this._fallbackTimeout) {
            clearTimeout(this._fallbackTimeout);
            this._fallbackTimeout = null;
        }
    }
}

import Phaser from 'phaser';
import { loadAssets } from './AssetLoader';

export class PreloadScene extends Phaser.Scene {
    private _fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        super('PreloadScene');
    }

    preload() {
        const { width, height } = this.scale;
        const barW = 320;
        const barH = 20;
        const bx = width / 2 - barW / 2;
        const by = height / 2 - barH / 2;

        // Background box
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e);
        bg.fillRect(bx - 4, by - 4, barW + 8, barH + 8);
        bg.lineStyle(1, 0x334466);
        bg.strokeRect(bx - 4, by - 4, barW + 8, barH + 8);

        // Progress bar fill
        const bar = this.add.graphics();
        this.load.on('progress', (value: number) => {
            bar.clear();
            bar.fillStyle(0x4488cc);
            bar.fillRect(bx, by, barW * value, barH);
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
            if (this.scene.isActive()) {
                this.scene.start('MainScene');
            }
        }, 8000);

        this.load.on('complete', () => {
            console.log('[PreloadScene] All assets loaded successfully. Transitioning shortly...');
            if (this._fallbackTimeout) {
                clearTimeout(this._fallbackTimeout);
                this._fallbackTimeout = null;
            }
        });

        // Label
        this.add.text(width / 2, by - 28, 'Laster nivå...', {
            fontSize: '16px',
            color: '#8899cc',
            fontFamily: '"Cinzel", Georgia, serif'
        }).setOrigin(0.5);

        console.log('[PreloadScene] Preload starting for assets...');
        loadAssets(this);
    }

    create() {
        console.log('[PreloadScene] Create reached. Starting MainScene transition...');
        this.scene.start('MainScene');
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

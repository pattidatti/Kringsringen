import Phaser from 'phaser';
import { loadAssets } from './AssetLoader';

export class PreloadScene extends Phaser.Scene {
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

        // Timeout fallback — if loader hangs for > 15 seconds, force scene start
        const loadTimeout = this.time.delayedCall(15000, () => {
            console.error('[PreloadScene] Load timed out. Forcing MainScene start.');
            this.scene.start('MainScene');
        });

        this.load.on('complete', () => {
            loadTimeout.remove();
        });

        // Label
        this.add.text(width / 2, by - 28, 'Laster...', {
            fontSize: '16px',
            color: '#8899cc',
            fontFamily: 'serif'
        }).setOrigin(0.5);

        loadAssets(this);
    }

    create() {
        this.scene.start('MainScene');
    }
}

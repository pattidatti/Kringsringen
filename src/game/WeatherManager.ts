import Phaser from 'phaser';
import { AudioManager } from './AudioManager';

/**
 * WeatherManager handles atmospheric effects like rain and fog.
 * It integrates with the light system and audio manager.
 */
export class WeatherManager {
    private scene: Phaser.Scene;
    private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private isRaining: boolean = false;
    private fogParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createTextures();
    }

    private createTextures() {
        // Create Raindrop texture
        if (!this.scene.textures.exists('raindrop')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false } as any);
            graphics.fillStyle(0xafc9ff, 0.6);
            graphics.fillRoundedRect(0, 0, 2, 12, 1);
            graphics.generateTexture('raindrop', 2, 12);
            graphics.destroy();
        }

        // Create Fog cloud texture (soft radial gradient)
        if (!this.scene.textures.exists('fog_cloud')) {
            const size = 128;
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false } as any);

            // Draw a few concentric circles for a soft falloff
            for (let i = 0; i < 8; i++) {
                const alpha = (0.12 - i * 0.015);
                graphics.fillStyle(0xffffff, alpha);
                graphics.fillCircle(size / 2, size / 2, (size / 2) * (1 - i * 0.12));
            }

            graphics.generateTexture('fog_cloud', size, size);
            graphics.destroy();
        }
    }

    public startRain() {
        if (this.isRaining) return;
        this.isRaining = true;

        const { width } = this.scene.scale;

        const quality = (this.scene as any).quality;
        const multiplier = quality?.particleMultiplier || 1.0;

        this.rainEmitter = this.scene.add.particles(0, 0, 'raindrop', {
            x: { min: -200, max: width + 50 },
            y: { min: -20, max: -20 },
            lifespan: 1500,
            speedY: { min: 500, max: 800 },
            speedX: { min: -30, max: 10 },  // Reduced left-drift so right edge is covered
            scaleY: { min: 0.8, max: 1.2 },
            alpha: { start: 0.3, end: 0.1 },
            quantity: Math.max(1, Math.floor(4 * multiplier)),
            frequency: Math.max(1, Math.floor(1 / multiplier)),
            blendMode: 'ADD'
        });

        this.rainEmitter.setDepth(10000); // Definitely on top of everything
        this.rainEmitter.setScrollFactor(0); // Fixed to screen

        AudioManager.instance.playBGS('rain');

        // Schedule automatic rain stop after 2-4 minutes
        const duration = Phaser.Math.Between(120000, 240000);
        this.scene.time.delayedCall(duration, () => this.stopRain());
    }

    public stopRain() {
        if (!this.isRaining) return;
        this.isRaining = false;

        if (this.rainEmitter) {
            this.rainEmitter.stop();
            this.scene.time.delayedCall(2000, () => {
                this.rainEmitter?.destroy();
                this.rainEmitter = null;
            });
        }

        AudioManager.instance.playBGS('forest_ambience');

        // Schedule automatic rain restart after 1-3 minutes
        const pause = Phaser.Math.Between(60000, 180000);
        this.scene.time.delayedCall(pause, () => this.startRain());
    }

    /**
     * Implements an "Avant-Garde" fog effect.
     * Uses large, soft particles that interact with the Light2D pipeline.
     */
    public enableFog() {
        const { width, height } = this.scene.scale;

        const quality = (this.scene as any).quality;
        const multiplier = quality?.particleMultiplier || 1.0;

        // Use a particle emitter for fog so it can interact with Light2D
        this.fogParticles = this.scene.add.particles(0, 0, 'fog_cloud', {
            x: { min: -width * 1.5, max: width * 1.5 },
            y: { min: -height * 1.5, max: height * 1.5 },
            scale: { min: 1.5, max: 3 },
            alpha: { min: 0.05, max: 0.12 },
            rotate: { min: 0, max: 360 },
            speed: { min: 10, max: 40 },
            lifespan: 12000,
            frequency: Math.max(1, Math.floor(120 / multiplier)),
            blendMode: 'NORMAL'
        });

        this.fogParticles.setDepth(10); // Below player mostly
        this.fogParticles.setScrollFactor(0); // Fixed to screen, covers viewport

        if (quality?.lightingEnabled) {
            this.fogParticles.setPipeline('Light2D');
        }

        // Add a subtle tint to the scene for "mood"
        this.scene.cameras.main.setBackgroundColor(0x0a1525);
        // We don't actually want to fade out, we use a very subtle tint overlay if needed
    }

    public update() {
        // Dynamic fog logic if needed (e.g. shifting density)
    }
}

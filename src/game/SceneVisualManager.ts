import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { getQualityConfig, type QualitySettings, type GraphicsQuality } from '../config/QualityConfig';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Manages game visuals including lighting, post-processing, and quality scaling.
 */
export class SceneVisualManager {
    private scene: IMainScene;
    private playerLight: Phaser.GameObjects.Light | null = null;
    private outerPlayerLight: Phaser.GameObjects.Light | null = null;
    private vignetteEffect: any = null;
    private remotePlayerLights: Map<string, Phaser.GameObjects.Light> = new Map();
    private currentQuality!: QualitySettings;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.init();
    }

    private init(): void {
        const qualityLevel = (this.scene.game.registry.get('graphicsQuality') as GraphicsQuality) || GAME_CONFIG.QUALITY.DEFAULT;
        this.currentQuality = getQualityConfig(qualityLevel);

        // Listen for quality changes
        this.scene.game.registry.events.on('changedata-graphicsQuality', (_parent: any, val: GraphicsQuality) => {
            this.currentQuality = getQualityConfig(val);
            this.applyQualitySettings();
        });

        this.setupPostFX();
    }

    private setupPostFX(): void {
        if (this.currentQuality.postFXEnabled) {
            this.vignetteEffect = this.scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.85, 0.15);
        }
    }

    /**
     * Updates visual elements, such as dynamic light positions.
     */
    public update(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const hp = this.scene.registry.get('playerHP') || 100;
        const maxHP = this.scene.registry.get('playerMaxHP') || 100;

        // 1. Update Player Lights
        if (player && this.playerLight && this.outerPlayerLight) {
            this.playerLight.setPosition(player.x, player.y);
            this.outerPlayerLight.setPosition(player.x, player.y);

            // Dynamic radius based on ghost mode (handled in MainScene events currently, but could be here)
            // Original main.ts handles ghost radius in events: player-died / local-player-revived
        }

        // 2. Update Vignette Intensity based on HP (Red-out)
        if (this.vignetteEffect && this.currentQuality.postFXEnabled) {
            const hpRatio = hp / maxHP;
            if (hpRatio < 0.3) {
                // Pulse vignette at low HP
                this.vignetteEffect.strength = 1.0 + Math.sin(Date.now() / 200) * 0.2;
            } else {
                this.vignetteEffect.strength = 0.85;
            }
        }
    }

    /**
     * Re-applies all lighting and shader settings based on current quality profile.
     */
    public applyQualitySettings(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        if (this.currentQuality.lightingEnabled) {
            this.scene.lights.enable();
            this.scene.lights.setAmbientColor(0x0a0a0a);

            if (player) player.setPipeline('Light2D');

            // Re-create player lights if missing
            if (!this.playerLight) {
                this.playerLight = this.scene.lights.addLight(0, 0, 230, 0xfffaf0, 0.7);
                this.outerPlayerLight = this.scene.lights.addLight(0, 0, 575, 0xfffaf0, 0.4);
            } else {
                this.playerLight.setVisible(true);
                this.outerPlayerLight.setVisible(true);
            }

            // Sync lights for other entities
            this.scene.enemies.children.iterate((e: any) => { e.setPipeline('Light2D'); return true; });
            this.scene.bossGroup.children.iterate((e: any) => { e.setPipeline('Light2D'); return true; });
            this.scene.poolManager.setLightingEnabled(true);
        } else {
            this.scene.lights.disable();
            if (player) player.resetPipeline();
            if (this.playerLight) this.playerLight.setVisible(false);
            if (this.outerPlayerLight) this.outerPlayerLight.setVisible(false);

            this.scene.poolManager.setLightingEnabled(false);
        }

        if (this.vignetteEffect) {
            this.vignetteEffect.active = this.currentQuality.postFXEnabled;
        }
    }

    public handleGhostMode(isDead: boolean): void {
        if (!this.playerLight || !this.outerPlayerLight) return;

        if (isDead) {
            this.playerLight.setRadius(58);
            this.outerPlayerLight.setRadius(115);
        } else {
            this.playerLight.setRadius(230);
            this.outerPlayerLight.setRadius(575);
        }
    }

    public addRemotePlayerLight(id: string, x: number, y: number): void {
        if (this.currentQuality.lightingEnabled && !this.remotePlayerLights.has(id)) {
            const light = this.scene.lights.addLight(x, y, 575, 0xfffaf0, 0.4);
            this.remotePlayerLights.set(id, light);
        }
    }

    public updateRemotePlayerLight(id: string, x: number, y: number): void {
        const light = this.remotePlayerLights.get(id);
        if (light) light.setPosition(x, y);
    }

    public removeRemotePlayerLight(id: string): void {
        const light = this.remotePlayerLights.get(id);
        if (light) {
            this.scene.lights.removeLight(light);
            this.remotePlayerLights.delete(id);
        }
    }

    public destroy(): void {
        this.scene.game.registry.events.off('changedata-graphicsQuality');
        this.remotePlayerLights.forEach(l => this.scene.lights.removeLight(l));
        this.remotePlayerLights.clear();
    }
}

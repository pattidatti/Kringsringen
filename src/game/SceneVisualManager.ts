import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { getQualityConfig, type QualitySettings, type GraphicsQuality, type ShadowMode } from '../config/QualityConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { PVP_ARENA } from '../config/pvp-arena';
import { type LightmapLight } from './LightmapRenderer';
import { DarknessPostFX, type ShaderLight } from './DarknessPostFX';

/**
 * Manages game visuals including lighting, post-processing, and quality scaling.
 *
 * Lighting uses a custom PostFX shader (DarknessPostFX) that computes radial
 * darkness on the GPU with support for up to 12 dynamic point lights.
 */
export class SceneVisualManager {
    private scene: IMainScene;
    private vignetteEffect: any = null;
    private darknessEffect: DarknessPostFX | null = null;
    private currentQuality!: QualitySettings;

    // Map Management
    private currentMap: StaticMapLoader | null = null;
    private mapWidth: number = 3000;
    private mapHeight: number = 3000;

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
            (this.scene as any).quality = this.currentQuality;
            this.applyQualitySettings();
        });

        this.setupPostFX();
    }

    private setupPostFX(): void {
        if (this.currentQuality.postFXEnabled) {
            this.vignetteEffect = this.scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.65, 0.35);
        }

        // Darkness shader — always apply if lighting is enabled
        if (this.currentQuality.lightingEnabled) {
            this.scene.cameras.main.setPostPipeline('DarknessPostFX');
            const pipelines = this.scene.cameras.main.getPostPipeline('DarknessPostFX');
            this.darknessEffect = (Array.isArray(pipelines) ? pipelines[0] : pipelines) as DarknessPostFX;
            if (this.darknessEffect) {
                this.darknessEffect.setDarkness(0.0, 0.30, 0.95);
            }
        }
    }

    /**
     * Updates visual elements: vignette pulse.
     */
    public update(): void {
        // Update Vignette Intensity based on HP (Red-out)
        if (this.vignetteEffect && this.currentQuality.postFXEnabled) {
            const hp = this.scene.registry.get('playerHP') || 100;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            const hpRatio = hp / maxHP;
            if (hpRatio < 0.3) {
                this.vignetteEffect.strength = 1.0 + Math.sin(Date.now() / 200) * 0.2;
            } else {
                this.vignetteEffect.strength = 0.35;
            }
        }
    }

    /**
     * Re-applies all lighting and shader settings based on current quality profile.
     */
    public applyQualitySettings(): void {
        if (this.currentQuality.lightingEnabled) {
            if (!this.darknessEffect) {
                this.scene.cameras.main.setPostPipeline('DarknessPostFX');
                const pipelines = this.scene.cameras.main.getPostPipeline('DarknessPostFX');
                this.darknessEffect = (Array.isArray(pipelines) ? pipelines[0] : pipelines) as DarknessPostFX;
                this.darknessEffect?.setDarkness(0.0, 0.30, 0.95);
            }
        } else {
            if (this.darknessEffect) {
                this.scene.cameras.main.removePostPipeline('DarknessPostFX');
                this.darknessEffect = null;
            }
        }

        if (this.vignetteEffect) {
            this.vignetteEffect.active = this.currentQuality.postFXEnabled;
        }
    }

    // ─── Light API (delegates to DarknessPostFX shader) ──────────────────────

    /** Whether lighting is currently active. */
    get effectiveLightingEnabled(): boolean {
        return this.currentQuality.lightingEnabled && this.darknessEffect !== null;
    }

    /**
     * Request a light for a projectile. Returns a LightmapLight-compatible handle.
     * The caller updates .x and .y each frame; the shader picks it up in onPreRender.
     */
    public requestProjectileLight(x: number, y: number, radius: number, color: number, intensity: number): LightmapLight | null {
        if (!this.darknessEffect || !this.effectiveLightingEnabled) return null;
        if (this.darknessEffect.lightCount >= this.darknessEffect.maxLights) return null;
        return this.darknessEffect.addLight(x, y, radius, color, intensity) as unknown as LightmapLight;
    }

    /** Release a projectile light. */
    public releaseProjectileLight(light: LightmapLight): void {
        if (this.darknessEffect) {
            this.darknessEffect.removeLight(light as unknown as ShaderLight);
        }
    }

    /** Add a non-budgeted light (enemy attack glow, remote player, etc.). */
    public addLight(x: number, y: number, radius: number, color: number, intensity: number): LightmapLight | null {
        if (!this.darknessEffect || !this.effectiveLightingEnabled) return null;
        if (this.darknessEffect.lightCount >= this.darknessEffect.maxLights) return null;
        return this.darknessEffect.addLight(x, y, radius, color, intensity) as unknown as LightmapLight;
    }

    /** Remove a non-budgeted light. */
    public removeLight(light: LightmapLight): void {
        if (this.darknessEffect) {
            this.darknessEffect.removeLight(light as unknown as ShaderLight);
        }
    }

    /** Set the projectile light budget override. */
    public setDynamicLightBudget(_budget: number): void {
        // Budget is fixed at MAX_LIGHTS in shader
    }

    public handleGhostMode(isDead: boolean): void {
        if (!this.darknessEffect) return;

        if (isDead) {
            this.darknessEffect.setDarkness(0.02, 0.08, 0.98);
        } else {
            this.darknessEffect.setDarkness(0.0, 0.30, 0.95);
        }
    }

    /** Change lightmap resolution at runtime (for performance degradation). */
    public setLightmapResolution(_scale: number): void {
        // No-op — PostFX shader runs at native resolution
    }

    /** Load the static map for a given level. */
    public regenerateMap(level: number) {
        const safeLevel = Math.max(1, level);

        if (this.currentMap) {
            this.currentMap.destroy();
        }

        const isPvp = this.scene.registry.get('gameMode') === 'pvp';
        const mapDef = isPvp
            ? PVP_ARENA
            : STATIC_MAPS[Math.min(safeLevel - 1, STATIC_MAPS.length - 1)];

        console.log('[SceneVisualManager] Loading map:', isPvp ? 'PVP Arena' : `Level ${safeLevel}`);
        this.currentMap = new StaticMapLoader(this.scene, this.scene.obstacles, this.mapWidth, this.mapHeight);
        this.currentMap.load(mapDef);

        this.scene.staticObstacleGrid.clear();
        this.scene.obstacles.getChildren().forEach((obs: any) => {
            const body = obs.body as Phaser.Physics.Arcade.StaticBody;
            if (body) {
                this.scene.staticObstacleGrid.insert({
                    x: obs.x,
                    y: obs.y,
                    width: body.width,
                    height: body.height
                });
            }
        });

        if (this.scene.flowFieldManager) {
            this.scene.flowFieldManager.buildCostField(this.scene.obstacles);
        }

        // @ts-ignore - ambient is private on MainScene currently
        if ((this.scene as any).ambient) (this.scene as any).ambient.setTheme(safeLevel);

        this.scene.events.emit('map-ready', { level: safeLevel });
    }

    public getShadowMode(): ShadowMode {
        return this.currentQuality.shadowMode;
    }

    public destroy(): void {
        this.scene.game.registry.events.off('changedata-graphicsQuality');
        if (this.darknessEffect) {
            this.scene.cameras.main.removePostPipeline('DarknessPostFX');
            this.darknessEffect = null;
        }
    }
}

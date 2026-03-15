import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { getQualityConfig, type QualitySettings, type GraphicsQuality, type ShadowMode } from '../config/QualityConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { PVP_ARENA } from '../config/pvp-arena';
import { LightmapRenderer, type LightmapLight } from './LightmapRenderer';
import { DarknessPostFX } from './DarknessPostFX';

/**
 * Manages game visuals including lighting, post-processing, and quality scaling.
 *
 * Lighting uses a custom PostFX shader (DarknessPostFX) that computes radial
 * darkness on the GPU. The shader runs on the camera output, darkening pixels
 * based on distance from screen center (where the player always is).
 */
export class SceneVisualManager {
    private scene: IMainScene;
    private vignetteEffect: any = null;
    private darknessEffect: DarknessPostFX | null = null;
    private currentQuality!: QualitySettings;

    /** @deprecated Lightmap is replaced by DarknessPostFX shader. Kept for API compat. */
    public lightmap: LightmapRenderer | null = null;

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

        // Darkness shader — always apply if lighting is enabled (independent of postFX toggle)
        if (this.currentQuality.lightingEnabled) {
            this.scene.cameras.main.setPostPipeline('DarknessPostFX');
            const pipelines = this.scene.cameras.main.getPostPipeline('DarknessPostFX');
            this.darknessEffect = (Array.isArray(pipelines) ? pipelines[0] : pipelines) as DarknessPostFX;
            if (this.darknessEffect) {
                this.darknessEffect.setDarkness(0.06, 0.55, 0.95);
            }
        }
    }

    /**
     * Updates visual elements: darkness shader resolution, vignette pulse.
     */
    public update(): void {
        // 1. Update Vignette Intensity based on HP (Red-out)
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
        // Darkness PostFX shader
        if (this.currentQuality.lightingEnabled) {
            if (!this.darknessEffect) {
                this.scene.cameras.main.setPostPipeline('DarknessPostFX');
                const pipelines = this.scene.cameras.main.getPostPipeline('DarknessPostFX');
                this.darknessEffect = (Array.isArray(pipelines) ? pipelines[0] : pipelines) as DarknessPostFX;
                this.darknessEffect?.setDarkness(0.06, 0.55, 0.95);
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

    /**
     * Set the projectile light budget override. No-op with PostFX shader.
     */
    public setDynamicLightBudget(_budget: number): void {
        // No-op — projectile lights not supported by PostFX shader
    }

    /** Whether lighting is currently active. */
    get effectiveLightingEnabled(): boolean {
        return this.currentQuality.lightingEnabled && this.darknessEffect !== null;
    }

    /**
     * Request a light for a projectile. Returns null — projectile lights not yet
     * supported by the PostFX shader. Kept for API compatibility.
     */
    public requestProjectileLight(_x: number, _y: number, _radius: number, _color: number, _intensity: number): LightmapLight | null {
        return null;
    }

    /**
     * Release a projectile light back to the budget.
     */
    public releaseProjectileLight(_light: LightmapLight): void {
        // No-op — projectile lights not used with PostFX shader
    }

    /**
     * Add a non-budgeted light. Returns null — not supported by PostFX shader.
     */
    public addLight(_x: number, _y: number, _radius: number, _color: number, _intensity: number): LightmapLight | null {
        return null;
    }

    /**
     * Remove a non-budgeted light.
     */
    public removeLight(_light: LightmapLight): void {
        // No-op
    }

    public handleGhostMode(isDead: boolean): void {
        if (!this.darknessEffect) return;

        if (isDead) {
            // Shrink visible area dramatically
            this.darknessEffect.setDarkness(0.02, 0.08, 0.98);
        } else {
            // Restore normal lighting
            this.darknessEffect.setDarkness(0.06, 0.55, 0.95);
        }
    }

    /** Change lightmap resolution at runtime (for performance degradation). */
    public setLightmapResolution(_scale: number): void {
        // No-op — PostFX shader runs at native resolution
    }

    /** Load the static map for a given level. */
    public regenerateMap(level: number) {
        // Safety: Ensure level is at least 1 and within bounds
        const safeLevel = Math.max(1, level);

        // Clean up old map
        if (this.currentMap) {
            this.currentMap.destroy();
        }

        // Select map definition: PVP arena or regular level map
        const isPvp = this.scene.registry.get('gameMode') === 'pvp';
        const mapDef = isPvp
            ? PVP_ARENA
            : STATIC_MAPS[Math.min(safeLevel - 1, STATIC_MAPS.length - 1)];

        // Load static map – no procedural generation, instant
        console.log('[SceneVisualManager] Loading map:', isPvp ? 'PVP Arena' : `Level ${safeLevel}`);
        this.currentMap = new StaticMapLoader(this.scene, this.scene.obstacles, this.mapWidth, this.mapHeight);
        this.currentMap.load(mapDef);

        // Populate static grid for efficient pathfinding lookups
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

        // Generate Pathing Cost Field
        if (this.scene.flowFieldManager) {
            this.scene.flowFieldManager.buildCostField(this.scene.obstacles);
        }

        // Swap ambient particle theme to match the new level
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
        if (this.lightmap) {
            this.lightmap.destroy();
            this.lightmap = null;
        }
    }
}

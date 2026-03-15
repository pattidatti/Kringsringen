import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { getQualityConfig, type QualitySettings, type GraphicsQuality, type ShadowMode } from '../config/QualityConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { PVP_ARENA } from '../config/pvp-arena';
import { LightmapRenderer, type LightmapLight } from './LightmapRenderer';

/**
 * Manages game visuals including lighting, post-processing, and quality scaling.
 *
 * Lighting is handled via an RGB lightmap overlay (LightmapRenderer) instead of
 * Phaser's per-sprite Light2D pipeline. This decouples lighting cost from sprite
 * count, yielding significant GPU savings when many sprites are on screen.
 */
export class SceneVisualManager {
    private scene: IMainScene;
    private playerLight: LightmapLight | null = null;
    private outerPlayerLight: LightmapLight | null = null;
    private vignetteEffect: any = null;
    private currentQuality!: QualitySettings;

    /** The RGB lightmap renderer (null when lighting disabled). */
    public lightmap: LightmapRenderer | null = null;

    // Light budget tracking (projectile lights only — player lights are separate)
    private activeProjectileLights: number = 0;
    private dynamicLightBudget: number = -1;  // -1 = use quality config

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
            this.dynamicLightBudget = -1;
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
     * Updates visual elements: player light positions, vignette, and lightmap render.
     */
    public update(): void {
        // 1. Update Player Lights
        const player = this.scene.player;
        if (player && player.active && this.playerLight && this.outerPlayerLight) {
            this.playerLight.x = player.x;
            this.playerLight.y = player.y;
            this.outerPlayerLight.x = player.x;
            this.outerPlayerLight.y = player.y;
        }

        // 2. Update Vignette Intensity based on HP (Red-out)
        if (this.vignetteEffect && this.currentQuality.postFXEnabled) {
            const hp = this.scene.registry.get('playerHP') || 100;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            const hpRatio = hp / maxHP;
            if (hpRatio < 0.3) {
                this.vignetteEffect.strength = 1.0 + Math.sin(Date.now() / 200) * 0.2;
            } else {
                this.vignetteEffect.strength = 0.85;
            }
        }

        // 3. Render lightmap (must happen every frame when active)
        if (this.lightmap) {
            this.lightmap.render();
        }
    }

    /**
     * Re-applies all lighting and shader settings based on current quality profile.
     */
    public applyQualitySettings(): void {
        if (this.currentQuality.lightingEnabled) {
            console.log('[SceneVisualManager] Enabling RGB lightmap...');

            // Create or reconfigure lightmap
            if (!this.lightmap) {
                this.lightmap = new LightmapRenderer(this.scene, this.currentQuality.lightmapResolution);
            } else {
                this.lightmap.setResolutionScale(this.currentQuality.lightmapResolution);
                this.lightmap.setEnabled(true);
            }
            this.lightmap.setAmbientColor(0x0a0a0a);

            // Re-create player lights if missing
            if (!this.playerLight) {
                this.playerLight = this.lightmap.addLight(
                    0, 0,
                    GAME_CONFIG.LIGHTING.PLAYER_INNER_RADIUS,
                    GAME_CONFIG.LIGHTING.PLAYER_COLOR,
                    GAME_CONFIG.LIGHTING.PLAYER_INTENSITY_INNER
                );
                this.outerPlayerLight = this.lightmap.addLight(
                    0, 0,
                    GAME_CONFIG.LIGHTING.PLAYER_OUTER_RADIUS,
                    GAME_CONFIG.LIGHTING.PLAYER_COLOR,
                    GAME_CONFIG.LIGHTING.PLAYER_INTENSITY_OUTER
                );
            }
        } else {
            // Disable lightmap overlay — sprites render at full brightness
            if (this.lightmap) {
                this.lightmap.setEnabled(false);
            }
            this.playerLight = null;
            this.outerPlayerLight = null;
        }

        if (this.vignetteEffect) {
            this.vignetteEffect.active = this.currentQuality.postFXEnabled;
        }
    }

    /**
     * Set the projectile light budget override. -1 = use quality config.
     */
    public setDynamicLightBudget(budget: number): void {
        this.dynamicLightBudget = budget;
    }

    /** Whether lighting is currently active (lightmap enabled). */
    get effectiveLightingEnabled(): boolean {
        return this.currentQuality.lightingEnabled && this.lightmap?.enabled === true;
    }

    /**
     * Request a light for a projectile. Returns the light if budget allows, null otherwise.
     * Callers must call releaseProjectileLight() when the light is no longer needed.
     */
    public requestProjectileLight(x: number, y: number, radius: number, color: number, intensity: number): LightmapLight | null {
        if (!this.lightmap || !this.effectiveLightingEnabled) return null;
        const effectiveBudget = this.dynamicLightBudget >= 0
            ? this.dynamicLightBudget
            : this.currentQuality.maxProjectileLights;
        if (this.activeProjectileLights >= effectiveBudget) return null;

        this.activeProjectileLights++;
        return this.lightmap.addLight(x, y, radius, color, intensity);
    }

    /**
     * Release a projectile light back to the budget.
     */
    public releaseProjectileLight(light: LightmapLight): void {
        if (this.lightmap) this.lightmap.removeLight(light);
        this.activeProjectileLights = Math.max(0, this.activeProjectileLights - 1);
    }

    /**
     * Add a non-budgeted light (e.g. enemy attack glow, remote player).
     * Caller is responsible for removing it via removeLight().
     */
    public addLight(x: number, y: number, radius: number, color: number, intensity: number): LightmapLight | null {
        if (!this.lightmap || !this.effectiveLightingEnabled) return null;
        return this.lightmap.addLight(x, y, radius, color, intensity);
    }

    /**
     * Remove a non-budgeted light.
     */
    public removeLight(light: LightmapLight): void {
        if (this.lightmap) this.lightmap.removeLight(light);
    }

    public handleGhostMode(isDead: boolean): void {
        if (!this.playerLight || !this.outerPlayerLight) return;

        if (isDead) {
            this.playerLight.radius = GAME_CONFIG.LIGHTING.GHOST_INNER_RADIUS;
            this.outerPlayerLight.radius = GAME_CONFIG.LIGHTING.GHOST_OUTER_RADIUS;
        } else {
            this.playerLight.radius = GAME_CONFIG.LIGHTING.PLAYER_INNER_RADIUS;
            this.outerPlayerLight.radius = GAME_CONFIG.LIGHTING.PLAYER_OUTER_RADIUS;
        }
    }

    /** Change lightmap resolution at runtime (for performance degradation). */
    public setLightmapResolution(scale: number): void {
        if (this.lightmap) {
            this.lightmap.setResolutionScale(scale);
        }
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
        if (this.lightmap) {
            this.lightmap.destroy();
            this.lightmap = null;
        }
    }
}

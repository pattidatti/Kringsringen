import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { getQualityConfig, type QualitySettings, type GraphicsQuality, type ShadowMode } from '../config/QualityConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { PVP_ARENA } from '../config/pvp-arena';

/**
 * Manages game visuals including lighting, post-processing, and quality scaling.
 */
export class SceneVisualManager {
    private scene: IMainScene;
    private playerLight: Phaser.GameObjects.Light | null = null;
    private outerPlayerLight: Phaser.GameObjects.Light | null = null;
    private vignetteEffect: any = null;
    private currentQuality!: QualitySettings;

    // Light budget tracking (projectile lights only — player lights are separate)
    private activeProjectileLights: number = 0;
    private dynamicLightBudget: number = -1;  // -1 = use quality config
    private enemyLightingOverride: boolean | null = null;  // null = use quality config

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
     * Updates visual elements, such as dynamic light positions.
     */
    public update(): void {
        // 1. Update Player Lights
        const player = this.scene.player;
        if (player && player.active && this.playerLight && this.outerPlayerLight) {
            this.playerLight.setPosition(player.x, player.y);
            this.outerPlayerLight.setPosition(player.x, player.y);

            // Dynamic radius based on ghost mode (handled in MainScene events currently, but could be here)
            // Original main.ts handles ghost radius in events: player-died / local-player-revived
        }

        // 2. Update Vignette Intensity based on HP (Red-out)
        if (this.vignetteEffect && this.vignetteEffect.active) {
            const hp = this.scene.registry.get('playerHP') || 100;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
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
        const player = this.scene.player;

        if (this.currentQuality.lightingEnabled) {
            console.log('[SceneVisualManager] Enabling lights/Light2D...');
            this.scene.lights.enable();
            this.scene.lights.setAmbientColor(0x0a0a0a);

            if (player && player.body) player.setPipeline('Light2D');
            else if (player) console.warn('[SceneVisualManager] Player has no body, skipping pipeline set.');

            // Re-create player lights if missing
            if (!this.playerLight) {
                this.playerLight = this.scene.lights.addLight(
                    0, 0,
                    GAME_CONFIG.LIGHTING.PLAYER_INNER_RADIUS,
                    GAME_CONFIG.LIGHTING.PLAYER_COLOR,
                    GAME_CONFIG.LIGHTING.PLAYER_INTENSITY_INNER
                );
                this.outerPlayerLight = this.scene.lights.addLight(
                    0, 0,
                    GAME_CONFIG.LIGHTING.PLAYER_OUTER_RADIUS,
                    GAME_CONFIG.LIGHTING.PLAYER_COLOR,
                    GAME_CONFIG.LIGHTING.PLAYER_INTENSITY_OUTER
                );
            } else if (this.playerLight && this.outerPlayerLight) {
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

    /**
     * Request a PointLight for a projectile. Returns the light if budget allows, null otherwise.
     * Callers must call releaseProjectileLight() when the light is no longer needed.
     */
    public setDynamicLightBudget(budget: number): void {
        this.dynamicLightBudget = budget;
    }

    /** Whether non-player sprites should enroll in Light2D. Used at spawn time. */
    get effectiveEnemyLightingEnabled(): boolean {
        if (this.enemyLightingOverride !== null) return this.enemyLightingOverride;
        return this.currentQuality.lightingEnabled;
    }

    /**
     * Dynamically strip/restore Light2D pipeline on enemy sprites and pooled FX.
     * Player sprite and player lights are NEVER touched — they must stay active.
     * Does NOT call lights.disable() — that would destroy the Light objects.
     */
    public setEnemyLightingOverride(override: boolean | null): void {
        const wasOverride = this.enemyLightingOverride;
        this.enemyLightingOverride = override;

        const effectiveNow = override === null ? this.currentQuality.lightingEnabled : override;
        const effectiveBefore = wasOverride === null ? this.currentQuality.lightingEnabled : wasOverride;
        if (effectiveNow === effectiveBefore) return;  // no change

        if (effectiveNow) {
            // Re-enable pipelines on enemies
            this.scene.enemies.children.iterate((e: any) => {
                if (e.active) e.setPipeline('Light2D');
                return true;
            });
            this.scene.bossGroup.children.iterate((e: any) => {
                if (e.active) e.setPipeline('Light2D');
                return true;
            });
            this.scene.poolManager.setLightingEnabled(true);
            // Restore dark ambient now that enemies are back on Light2D
            this.scene.lights.setAmbientColor(0x0a0a0a);
        } else {
            // Strip Light2D from enemy/pooled sprites only — player untouched
            this.scene.enemies.children.iterate((e: any) => {
                if (e.active) e.resetPipeline();
                return true;
            });
            this.scene.bossGroup.children.iterate((e: any) => {
                if (e.active) e.resetPipeline();
                return true;
            });
            this.scene.poolManager.setLightingEnabled(false);
            // Normalize scene: map tiles still on Light2D would render near-black at
            // ambient 0x0a0a0a while unlit enemies render at full brightness — stark mismatch.
            // Set ambient to white so map tiles match the unlit enemies visually.
            this.scene.lights.setAmbientColor(0xffffff);
        }
    }

    public requestProjectileLight(x: number, y: number, radius: number, color: number, intensity: number): Phaser.GameObjects.Light | null {
        const lightingActive = this.enemyLightingOverride === null
            ? this.currentQuality.lightingEnabled
            : this.enemyLightingOverride;
        if (!lightingActive) return null;
        const effectiveBudget = this.dynamicLightBudget >= 0
            ? this.dynamicLightBudget
            : this.currentQuality.maxProjectileLights;
        if (this.activeProjectileLights >= effectiveBudget) return null;

        this.activeProjectileLights++;
        return this.scene.lights.addLight(x, y, radius, color, intensity);
    }

    /**
     * Release a projectile light back to the budget.
     */
    public releaseProjectileLight(light: Phaser.GameObjects.Light): void {
        this.scene.lights.removeLight(light);
        this.activeProjectileLights = Math.max(0, this.activeProjectileLights - 1);
    }

    public handleGhostMode(isDead: boolean): void {
        if (!this.playerLight || !this.outerPlayerLight) return;

        if (isDead) {
            this.playerLight.setRadius(GAME_CONFIG.LIGHTING.GHOST_INNER_RADIUS);
            this.outerPlayerLight.setRadius(GAME_CONFIG.LIGHTING.GHOST_OUTER_RADIUS);
        } else {
            this.playerLight.setRadius(GAME_CONFIG.LIGHTING.PLAYER_INNER_RADIUS);
            this.outerPlayerLight.setRadius(GAME_CONFIG.LIGHTING.PLAYER_OUTER_RADIUS);
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

    public setVignetteActive(active: boolean): void {
        if (this.vignetteEffect) {
            this.vignetteEffect.active = active;
        }
    }

    public getShadowMode(): ShadowMode {
        return this.currentQuality.shadowMode;
    }

    public destroy(): void {
        this.scene.game.registry.events.off('changedata-graphicsQuality');
    }
}

import Phaser from 'phaser';
import { getQualityConfig, type GraphicsQuality, type ShadowMode } from '../config/QualityConfig';

interface StepThreshold {
    downFps: number;
    upFps: number;
}

/**
 * 7-step dynamic FPS scaler. Monitors rolling FPS average and progressively
 * degrades visual effects to maintain playable frame rates.
 *
 * Step 0 = full quality (user's chosen tier). Each subsequent step adds one
 * reduction on top of the previous ones. Recovery uses hysteresis (+8 FPS)
 * and requires 2 consecutive samples above the threshold before stepping up.
 *
 * Always-on optimizations (isInView, AI throttle) are independent of steps.
 */
export class PerformanceManager {
    private scene: Phaser.Scene;
    private samples: number[];
    private sampleIndex = 0;
    private samplesFilled = 0;
    private lastSampleTime = 0;
    private userMaxLights: number;
    private userQuality: GraphicsQuality;

    /** Current degradation step (0 = full quality, 7 = maximum degradation) */
    public currentStep = 0;

    /** Consecutive samples below/above threshold — prevents spike-jitter. */
    private consecutiveDown = 0;
    private consecutiveUp = 0;

    private readonly SAMPLE_INTERVAL = 1000;
    private readonly SAMPLE_COUNT = 3;
    private readonly REQUIRED_CONSECUTIVE = 2;

    private static readonly THRESHOLDS: StepThreshold[] = [
        { downFps: 50, upFps: 58 },  // step 0 → 1
        { downFps: 47, upFps: 55 },  // step 1 → 2
        { downFps: 44, upFps: 52 },  // step 2 → 3
        { downFps: 42, upFps: 50 },  // step 3 → 4
        { downFps: 40, upFps: 48 },  // step 4 → 5
        { downFps: 38, upFps: 46 },  // step 5 → 6
        { downFps: 35, upFps: 43 },  // step 6 → 7
    ];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.samples = new Array(this.SAMPLE_COUNT).fill(60);

        this.userQuality = (scene.game.registry.get('graphicsQuality') as GraphicsQuality) || 'medium';
        this.userMaxLights = getQualityConfig(this.userQuality).maxProjectileLights;

        // Reset when user manually changes quality
        scene.game.registry.events.on('changedata-graphicsQuality', (_parent: any, val: GraphicsQuality) => {
            this.userQuality = val;
            this.userMaxLights = getQualityConfig(val).maxProjectileLights;
            this.currentStep = 0;
            this.consecutiveDown = 0;
            this.consecutiveUp = 0;
            this.samplesFilled = 0;
            this.sampleIndex = 0;
            this.samples.fill(60);
            // Clear dynamic override so SceneVisualManager falls back to quality config
            (this.scene as any).visuals?.setDynamicLightBudget(-1);
            this.scene.events.emit('perf-step-change', 0);
        });
    }

    update(time: number): void {
        if (time - this.lastSampleTime < this.SAMPLE_INTERVAL) return;
        this.lastSampleTime = time;

        // Sample current FPS
        this.samples[this.sampleIndex] = this.scene.game.loop.actualFps;
        this.sampleIndex = (this.sampleIndex + 1) % this.SAMPLE_COUNT;
        if (this.samplesFilled < this.SAMPLE_COUNT) this.samplesFilled++;

        // Need at least SAMPLE_COUNT samples before acting
        if (this.samplesFilled < this.SAMPLE_COUNT) return;

        // Rolling average
        let sum = 0;
        for (let i = 0; i < this.SAMPLE_COUNT; i++) sum += this.samples[i];
        const avg = sum / this.SAMPLE_COUNT;

        const prevStep = this.currentStep;

        // Check step down
        if (this.currentStep < 7) {
            const threshold = PerformanceManager.THRESHOLDS[this.currentStep];
            if (avg < threshold.downFps) {
                this.consecutiveDown++;
                this.consecutiveUp = 0;
                if (this.consecutiveDown >= this.REQUIRED_CONSECUTIVE) {
                    this.currentStep++;
                    this.consecutiveDown = 0;
                }
            } else {
                this.consecutiveDown = 0;
            }
        }

        // Check step up
        if (this.currentStep > 0) {
            const threshold = PerformanceManager.THRESHOLDS[this.currentStep - 1];
            if (avg > threshold.upFps) {
                this.consecutiveUp++;
                this.consecutiveDown = 0;
                if (this.consecutiveUp >= this.REQUIRED_CONSECUTIVE) {
                    this.currentStep--;
                    this.consecutiveUp = 0;
                }
            } else {
                this.consecutiveUp = 0;
            }
        }

        if (this.currentStep !== prevStep) {
            console.log(`[PerformanceManager] FPS avg=${avg.toFixed(1)}, step ${prevStep}→${this.currentStep}`);
            this.scene.events.emit('perf-step-change', this.currentStep);

            // Update light budget via SceneVisualManager
            const budget = this.lightBudget;
            (this.scene as any).visuals?.setDynamicLightBudget(budget === this.userMaxLights ? -1 : budget);
        }
    }

    // ─── Typed Getters ──────────────────────────────────────────────────────

    /** PostFX glow on new projectiles. False at step >= 2. */
    get glowEnabled(): boolean {
        const userPostFX = getQualityConfig(this.userQuality).postFXEnabled;
        if (!userPostFX) return false;
        return this.currentStep < 2;
    }

    /** Trail particle frequency multiplier: 1.0 / 0.5 / 0.25 */
    get trailDensityMultiplier(): number {
        if (this.currentStep >= 7) return 0.25;
        if (this.currentStep >= 1) return 0.5;
        return 1.0;
    }

    /** Whether bloom postFX should be active. False at step >= 3. */
    get bloomEnabled(): boolean {
        const userBloom = getQualityConfig(this.userQuality).bloomEnabled;
        if (!userBloom) return false;
        return this.currentStep < 3;
    }

    /** Whether hit blur camera effect should fire. False at step >= 3. */
    get hitBlurEnabled(): boolean {
        const userPostFX = getQualityConfig(this.userQuality).postFXEnabled;
        if (!userPostFX) return false;
        return this.currentStep < 3;
    }

    /** Spark count multiplier for death/sword sparks: 1.0 / 0.5 / 0 */
    get sparkMultiplier(): number {
        if (this.currentStep >= 7) return 0;
        if (this.currentStep >= 5) return 0.5;
        return 1.0;
    }

    /** Camera shake intensity multiplier: 1.0 / 0.5 / 0 */
    get shakeMultiplier(): number {
        if (this.currentStep >= 7) return 0;
        if (this.currentStep >= 5) return 0.5;
        return 1.0;
    }

    /** Shadow mode override. Returns null (use user setting) or a downgraded mode at step >= 6. */
    get shadowModeOverride(): ShadowMode | null {
        if (this.currentStep < 6) return null;
        const userMode = getQualityConfig(this.userQuality).shadowMode;
        if (userMode === 'dynamic') return 'silhouette';
        if (userMode === 'silhouette') return 'blob';
        return null; // already blob, can't go lower
    }

    /** Max active damage texts. Gradually reduced at higher steps. */
    get maxDamageTexts(): number {
        if (this.currentStep >= 7) return 10;
        if (this.currentStep >= 5) return 30;
        if (this.currentStep >= 3) return 60;
        return 100;
    }

    /** Projectile light budget (count). Respects user max and step level. */
    get lightBudget(): number {
        if (this.userMaxLights === 0) return 0;
        if (this.currentStep >= 7) return 0;
        if (this.currentStep >= 4) return Math.floor(this.userMaxLights / 2);
        return this.userMaxLights;
    }

    /** Whether state glows on enemies (slow, poison, elite) should render. False at step >= 5. */
    get enemyGlowEnabled(): boolean {
        const userPostFX = getQualityConfig(this.userQuality).postFXEnabled;
        if (!userPostFX) return false;
        return this.currentStep < 5;
    }

    /** Weather particle (rain, fog) multiplier. Aggressively reduced at higher steps. */
    get weatherParticleMultiplier(): number {
        if (this.currentStep >= 7) return 0;
        if (this.currentStep >= 5) return 0.15;
        if (this.currentStep >= 3) return 0.35;
        if (this.currentStep >= 1) return 0.6;
        return 1.0;
    }

    /** Ambient particle (fireflies, leaves, embers) multiplier. */
    get ambientParticleMultiplier(): number {
        if (this.currentStep >= 7) return 0;
        if (this.currentStep >= 5) return 0.2;
        if (this.currentStep >= 3) return 0.4;
        return 1.0;
    }

    /** Max concurrent blood VFX sprites. */
    get maxBloodEffects(): number {
        if (this.currentStep >= 7) return 3;
        if (this.currentStep >= 5) return 10;
        if (this.currentStep >= 3) return 20;
        return 50;
    }

    // ─── Always-on Utilities ────────────────────────────────────────────────

    /**
     * Fast off-screen check. Returns true if the point (x,y) is within the
     * camera viewport plus `margin` pixels on each side.
     */
    static isInView(cam: Phaser.Cameras.Scene2D.Camera, x: number, y: number, margin: number = 150): boolean {
        const left = cam.scrollX - margin;
        const top = cam.scrollY - margin;
        const right = cam.scrollX + cam.width + margin;
        const bottom = cam.scrollY + cam.height + margin;
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    /**
     * Returns the AI update interval (ms) based on distance to player.
     * Closer enemies update more frequently.
     */
    static getAIInterval(distSq: number): number {
        if (distSq < 160000) return 100;   // < 400px
        if (distSq < 640000) return 150;   // 400-800px
        return 250;                         // > 800px
    }

    destroy(): void {
        this.scene.game.registry.events.off('changedata-graphicsQuality');
    }
}

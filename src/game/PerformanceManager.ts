import Phaser from 'phaser';
import { getQualityConfig, type GraphicsQuality } from '../config/QualityConfig';

/**
 * Monitors FPS and dynamically adjusts the projectile light budget.
 * Steps down when FPS drops below threshold, steps up when it recovers.
 * Player lights are never touched — only projectile light requests are throttled.
 */
export class PerformanceManager {
    private scene: Phaser.Scene;
    private samples: number[];
    private sampleIndex = 0;
    private samplesFilled = 0;
    private lastSampleTime = 0;
    private userMaxLights: number;
    private currentBudgetStep = 0; // 0=full, 1=half, 2=zero

    private readonly SAMPLE_INTERVAL = 1500;
    private readonly SAMPLE_COUNT = 5;
    private readonly FPS_DROP = 45;
    private readonly FPS_RESTORE = 55;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.samples = new Array(this.SAMPLE_COUNT).fill(60);

        const quality = (scene.game.registry.get('graphicsQuality') as GraphicsQuality) || 'medium';
        this.userMaxLights = getQualityConfig(quality).maxProjectileLights;

        // Reset when user manually changes quality
        scene.game.registry.events.on('changedata-graphicsQuality', (_parent: any, val: GraphicsQuality) => {
            this.userMaxLights = getQualityConfig(val).maxProjectileLights;
            this.currentBudgetStep = 0;
            this.samplesFilled = 0;
            this.sampleIndex = 0;
            this.samples.fill(60);
            // Clear dynamic override so SceneVisualManager falls back to quality config
            (this.scene as any).visuals?.setDynamicLightBudget(-1);
        });
    }

    update(time: number): void {
        // No-op if lights are already disabled by quality tier
        if (this.userMaxLights === 0) return;

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

        const prevStep = this.currentBudgetStep;

        if (avg < this.FPS_DROP && this.currentBudgetStep < 2) {
            this.currentBudgetStep++;
        } else if (avg > this.FPS_RESTORE && this.currentBudgetStep > 0) {
            this.currentBudgetStep--;
        }

        if (this.currentBudgetStep !== prevStep) {
            const budget = this.getBudgetForStep(this.currentBudgetStep);
            console.log(`[PerformanceManager] FPS avg=${avg.toFixed(1)}, step ${prevStep}→${this.currentBudgetStep}, light budget=${budget}`);
            (this.scene as any).visuals?.setDynamicLightBudget(budget);
        }
    }

    private getBudgetForStep(step: number): number {
        if (step === 0) return this.userMaxLights;
        if (step === 1) return Math.floor(this.userMaxLights / 2);
        return 0;
    }

    destroy(): void {
        this.scene.game.registry.events.off('changedata-graphicsQuality');
    }
}

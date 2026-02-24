import Phaser from 'phaser';

/**
 * Manages screen-space ambient particle effects that change based on the game level/theme.
 *
 * Level 1–3  → Fireflies   (soft green-yellow glowing dots drifting upward, ADD blend)
 * Level 4–6  → Falling leaves (natural forest debris drifting down)
 * Level 7+   → Rising embers (orange sparks floating upward, ADD blend)
 *
 * All emitters use setScrollFactor(0) so they are camera-fixed (screen-space).
 */
export class AmbientParticleManager {
    private scene: Phaser.Scene;
    private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createTextures();
    }

    // ─── Runtime texture creation ──────────────────────────────────────────────

    private createTextures() {
        this.createFireflyTexture();
        this.createLeafTexture();
        this.createEmberTexture();
    }

    private createFireflyTexture() {
        if (this.scene.textures.exists('ambient_firefly')) return;
        const g = this.scene.make.graphics({ x: 0, y: 0, add: false } as any);
        // Soft outer glow
        g.fillStyle(0x99ee44, 0.25);
        g.fillCircle(8, 8, 7);
        // Inner bright core
        g.fillStyle(0xccff88, 0.7);
        g.fillCircle(8, 8, 4);
        // Bright center
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(8, 8, 2);
        g.generateTexture('ambient_firefly', 16, 16);
        g.destroy();
    }

    private createLeafTexture() {
        if (this.scene.textures.exists('ambient_leaf')) return;
        const g = this.scene.make.graphics({ x: 0, y: 0, add: false } as any);
        // Main leaf body
        g.fillStyle(0x4a7a28, 0.85);
        g.fillEllipse(7, 6, 14, 9);
        // Lighter center vein highlight
        g.fillStyle(0x72b040, 0.5);
        g.fillEllipse(7, 6, 6, 3);
        g.generateTexture('ambient_leaf', 14, 12);
        g.destroy();
    }

    private createEmberTexture() {
        if (this.scene.textures.exists('ambient_ember')) return;
        const g = this.scene.make.graphics({ x: 0, y: 0, add: false } as any);
        // Outer hot glow
        g.fillStyle(0xff4400, 0.4);
        g.fillCircle(6, 6, 5);
        // Bright core
        g.fillStyle(0xff8800, 0.9);
        g.fillCircle(6, 6, 3);
        // White-hot center
        g.fillStyle(0xffdd88, 1.0);
        g.fillCircle(6, 6, 1.5);
        g.generateTexture('ambient_ember', 12, 12);
        g.destroy();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Switch to the ambient theme appropriate for the given level.
     * Clears previous emitters with a short fade-out before spawning new ones.
     */
    public setTheme(level: number) {
        this.clear();

        if (level <= 3) {
            this.spawnFireflies();
        } else if (level <= 6) {
            this.spawnLeaves();
        } else {
            this.spawnEmbers();
        }
    }

    /** Stop and destroy all active emitters. */
    public clear() {
        for (const emitter of this.emitters) {
            emitter.stop();
            // Give in-flight particles time to finish before destroying
            this.scene.time.delayedCall(4000, () => {
                if (emitter.scene) emitter.destroy();
            });
        }
        this.emitters = [];
    }

    public destroy() {
        this.clear();
    }

    // ─── Theme implementations ────────────────────────────────────────────────

    /**
     * Fireflies — level 1–3.
     * Tiny glowing dots that drift slowly upward across the full screen.
     * Low quantity, ADD blend, long lifespan = dreamy forest night feel.
     */
    private spawnFireflies() {
        const { width, height } = this.scene.scale;

        const emitter = this.scene.add.particles(0, 0, 'ambient_firefly', {
            x: { min: 0, max: width },
            y: { min: height * 0.1, max: height * 0.9 },
            lifespan: { min: 3500, max: 6000 },
            speedY: { min: -20, max: -8 },
            speedX: { min: -12, max: 12 },
            scale: { min: 0.3, max: 0.8 },
            // Alpha eases in then out over the particle's life, giving a soft blink
            alpha: { start: 0, end: 0, ease: 'Sine.easeInOut' },
            quantity: 1,
            frequency: 500,
            blendMode: 'ADD',
        });

        // Rewrite alpha immediately after creating so particles fade in then out
        // Phaser 3.60+ supports a function for onUpdate in alpha:
        // We work around it by using a simple start→end curve
        emitter.forEachAlive((p: any) => {
            p.alpha = Math.random() * 0.5 + 0.2;
        }, this);

        emitter.setDepth(4500);
        emitter.setScrollFactor(0);
        this.emitters.push(emitter);
    }

    /**
     * Falling leaves — level 4–6.
     * Larger semi-transparent leaf shapes that drift down from the top of the screen
     * with a gentle side-to-side sway and slow rotation.
     */
    private spawnLeaves() {
        const { width } = this.scene.scale;

        const emitter = this.scene.add.particles(0, 0, 'ambient_leaf', {
            x: { min: -60, max: width + 60 },
            y: -20,
            lifespan: { min: 5000, max: 8000 },
            speedY: { min: 35, max: 65 },
            speedX: { min: -25, max: 25 },
            rotate: { start: 0, end: 360 },
            scale: { min: 0.6, max: 1.4 },
            alpha: { start: 0.75, end: 0.05 },
            quantity: 1,
            frequency: 700,
            blendMode: 'NORMAL',
        });

        emitter.setDepth(4500);
        emitter.setScrollFactor(0);
        this.emitters.push(emitter);
    }

    /**
     * Rising embers — level 7+.
     * Hot sparks that rise from the bottom of the screen and fade as they cool.
     * ADD blend gives a real fire feel, especially over the dark ambient lighting.
     */
    private spawnEmbers() {
        const { width, height } = this.scene.scale;

        const emitter = this.scene.add.particles(0, 0, 'ambient_ember', {
            x: { min: 0, max: width },
            y: { min: height * 0.75, max: height + 10 },
            lifespan: { min: 1800, max: 3500 },
            speedY: { min: -90, max: -35 },
            speedX: { min: -25, max: 25 },
            scale: { start: 0.7, end: 0.05 },
            alpha: { start: 1.0, end: 0.0 },
            quantity: 2,
            frequency: 120,
            blendMode: 'ADD',
        });

        emitter.setDepth(4500);
        emitter.setScrollFactor(0);
        this.emitters.push(emitter);
    }
}

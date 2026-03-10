import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';

export class Singularity extends Phaser.GameObjects.Sprite {
    private pullRadius: number = 250;
    private pullForce: number = 300;
    private durationMs: number = 3000;
    private explosionDamage: number = 100;
    private centerDamageMult: number = 1;

    private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private coreTween: Phaser.Tweens.Tween | null = null;
    private light: Phaser.GameObjects.Light | null = null;
    private lightTween: Phaser.Tweens.Tween | null = null;

    private damageReductionActive: boolean = false;
    private damageReductionAmount: number = 0;

    constructor(scene: Phaser.Scene) {
        // Placeholder texture, could be a dark circle or custom sprite
        super(scene, 0, 0, 'lightning_impact');

        scene.add.existing(this);
        this.setDepth(150);
        this.setVisible(false);
        this.setActive(false);
        this.setTint(0x220033);

        if (this.scene.lights && this.scene.lights.active) {
            this.setPipeline('Light2D');
            // Light will be requested from budget on spawn()
        }

        // Create the purple vortex effect
        this.particles = scene.add.particles(0, 0, 'spark', {
            speed: { min: -100, max: -400 }, // Pull inward
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            quantity: 8,
            tint: 0x8800ff,
            blendMode: 'ADD',
            emitting: false
        });
        this.particles.setDepth(149);
    }

    public spawn(x: number, y: number, duration: number, radiusMult: number, damage: number, centerDamageMult: number, damageReduction: number) {
        this.setPosition(x, y);
        this.durationMs = duration;
        this.pullRadius = 250 * radiusMult;
        this.explosionDamage = damage;
        this.centerDamageMult = centerDamageMult;

        this.damageReductionActive = damageReduction > 0;
        this.damageReductionAmount = damageReduction;

        this.setActive(true);
        this.setVisible(true);

        if (this.particles) {
            this.particles.setPosition(x, y);
            this.particles.setEmitterAngle({ min: 0, max: 360 });
            this.particles.setEmitZone({
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, this.pullRadius),
                quantity: 64,
                yoyo: false
            } as any);
            this.particles.start();
        }

        // Pulse animation for the core
        this.setScale(0.1);
        this.setAlpha(0.8);

        // Setup simple rotation
        this.scene.tweens.add({
            targets: this,
            rotation: Math.PI * 4,
            duration: this.durationMs,
            ease: 'Linear'
        });

        this.coreTween = this.scene.tweens.add({
            targets: this,
            scale: 2.5,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.coreTween = this.scene.tweens.add({
                    targets: this,
                    scale: 3,
                    duration: this.durationMs - 400 - 200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // Request light from budget
        if (!this.light) {
            const vis = (this.scene as any).visuals;
            this.light = vis ? vis.requestProjectileLight(x, y, this.pullRadius, 0xaa00ff, 1.5) : null;
        }
        if (this.light) {
            this.light.setPosition(x, y);
            this.light.setRadius(this.pullRadius);
            this.light.setIntensity(1.5);

            // Pulsating light tween matching the core
            this.lightTween = this.scene.tweens.add({
                targets: this.light,
                intensity: 3.0,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Global damage reduction (Manaring)
        if (this.damageReductionActive) {
            this.scene.registry.set('globalDamageReduction', this.damageReductionAmount);
        }

        // Camera shake during active phase
        (this.scene as any).scaledShake?.(this.durationMs, 0.001);

        // Auto-explode after duration
        this.scene.time.delayedCall(this.durationMs, () => {
            this.explode();
        });
    }

    public update(_time: number, delta: number) {
        if (!this.active) return;

        const mainScene = this.scene as any;
        const enemies = mainScene.enemies?.getChildren() || [];
        const bossGroup = mainScene.bossGroup?.getChildren() || [];
        const allEnemies = [...enemies, ...bossGroup];

        const deltaSeconds = delta / 1000;

        for (const e of allEnemies) {
            const enemy = e as Enemy | BossEnemy;
            if (!enemy || !enemy.active || enemy.getIsDead() || !enemy.body) continue;

            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < this.pullRadius) {
                // Bosses are heavier, pull them much less
                const isBoss = enemy instanceof BossEnemy;
                const weightMult = isBoss ? 0.05 : 1;

                // Pull force stronger towards center, but capped
                const normalizedDist = Math.max(dist / this.pullRadius, 0.1);
                const force = (this.pullForce / Math.pow(normalizedDist, 0.7)) * weightMult;

                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.x, this.y);

                if (!enemy.isStunned && !enemy.isPushingBack) {
                    const vx = Math.cos(angle) * force;
                    const vy = Math.sin(angle) * force;

                    enemy.body.velocity.x += vx * deltaSeconds * 10;
                    enemy.body.velocity.y += vy * deltaSeconds * 10;

                    // Cap velocity so they don't break physics
                    const maxV = isBoss ? 50 : 300;
                    if (enemy.body.velocity.length() > maxV) {
                        enemy.body.velocity.normalize().scale(maxV);
                    }
                }
            }
        }
    }

    private explode() {
        // Massive explosion
        const mainScene = this.scene as any;

        mainScene.scaledShake?.(300, 0.006); // Big shake

        // Visual explosion
        const flash = this.scene.add.circle(this.x, this.y, this.pullRadius, 0xaa00ff, 0.8);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        flash.setDepth(151);
        this.scene.tweens.add({
            targets: flash,
            scale: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Circ.easeOut',
            onComplete: () => flash.destroy()
        });

        if (this.lightTween) {
            this.lightTween.stop();
            this.lightTween = null;
        }

        if (this.light) {
            const light = this.light;
            const vis = (this.scene as any).visuals;
            // Bright flash
            light.setColor(0xff00ff);
            light.setIntensity(10);
            light.setRadius(this.pullRadius * 1.5);

            // Fade out light quickly, then release from budget
            this.scene.tweens.add({
                targets: light,
                intensity: 0,
                radius: 0,
                duration: 300,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    if (vis) vis.releaseProjectileLight(light);
                    else this.scene.lights.removeLight(light);
                }
            });
            this.light = null;
        }

        // Damage and Knockback
        const enemies = mainScene.enemies?.getChildren() || [];
        const bossGroup = mainScene.bossGroup?.getChildren() || [];
        const allEnemies = [...enemies, ...bossGroup];

        for (const e of allEnemies) {
            const enemy = e as Enemy | BossEnemy;
            if (!enemy || !enemy.active || enemy.getIsDead()) continue;

            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.pullRadius) {
                // Check if in "center" for extra damage
                const inCenter = dist <= (this.pullRadius * 0.3);
                const dmgMult = inCenter ? this.centerDamageMult : 1;
                const finalDamage = this.explosionDamage * dmgMult;

                // Knockback outward
                const outAngle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                const kbForce = 400 * (1 - dist / this.pullRadius);
                enemy.pushback(this.x - Math.cos(outAngle) * 10, this.y - Math.sin(outAngle) * 10, kbForce); // Push away from center

                enemy.takeDamage(finalDamage, '#aa00ff');
            }
        }

        this.deactivate();
    }

    private deactivate() {
        if (this.damageReductionActive) {
            this.scene.registry.set('globalDamageReduction', 0);
        }

        this.setActive(false);
        this.setVisible(false);
        if (this.particles) {
            this.particles.stop();
        }
        if (this.coreTween) {
            this.coreTween.stop();
        }
        if (this.lightTween) {
            this.lightTween.stop();
            this.lightTween = null;
        }
        if (this.light) {
            const vis = (this.scene as any).visuals;
            if (vis) vis.releaseProjectileLight(this.light);
            else this.scene.lights.removeLight(this.light);
            this.light = null;
        }
    }
}

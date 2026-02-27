import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Singularity extends Phaser.GameObjects.Sprite {
    private radius: number = 150;
    private pullForce: number = 200;
    private duration: number = 1500;
    private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 'lightning_impact'); // Placeholder texture/animation

        scene.add.existing(this);
        this.setDepth(150);
        this.setVisible(false);
        this.setActive(false);

        // Create the purple vortex effect
        this.particles = scene.add.particles(0, 0, 'spark', {
            speed: { min: -100, max: -300 }, // Pull inward
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 5,
            tint: 0x8800ff,
            blendMode: 'ADD',
            emitting: false
        });
        this.particles.setDepth(149);
    }

    spawn(x: number, y: number, radius: number = 150) {
        this.setPosition(x, y);
        this.radius = radius;
        this.setActive(true);
        this.setVisible(true);

        if (this.particles) {
            this.particles.setPosition(x, y);
            this.particles.start();
        }

        // Pulse animation
        this.setScale(0.1);
        this.scene.tweens.add({
            targets: this,
            scale: 2,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // Auto-deactivate after duration
        this.scene.time.delayedCall(this.duration, () => {
            this.deactivate();
        });
    }

    update(_time: number, delta: number) {
        if (!this.active) return;

        const mainScene = this.scene as any;
        const enemies = mainScene.enemies?.getChildren() || [];
        const bossGroup = mainScene.bossGroup?.getChildren() || [];
        const allEnemies = [...enemies, ...bossGroup];

        const deltaSeconds = delta / 1000;

        for (const e of allEnemies) {
            const enemy = e as Enemy;
            if (!enemy.active || enemy.getIsDead()) continue;

            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < this.radius) {
                // Pull force increases as enemies get closer to the center
                const force = (1 - dist / this.radius) * this.pullForce;
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.x, this.y);

                // Gently move enemy toward center via velocity (if not stunned/pushing back)
                if (enemy.body && !enemy.isStunned && !enemy.isPushingBack) {
                    const vx = Math.cos(angle) * force;
                    const vy = Math.sin(angle) * force;

                    // Add to existing velocity for a "magnetic" feel
                    enemy.body.velocity.x += vx * deltaSeconds * 10;
                    enemy.body.velocity.y += vy * deltaSeconds * 10;
                }
            }
        }
    }

    private deactivate() {
        this.setActive(false);
        this.setVisible(false);
        if (this.particles) {
            this.particles.stop();
        }
    }
}

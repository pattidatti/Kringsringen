import Phaser from 'phaser';

export class EclipseWake extends Phaser.GameObjects.Sprite {
    private duration: number = 1000;
    private damage: number = 0;
    private tickRate: number = 200;
    private lastTickTime: number = 0;
    private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 'player_attack'); // Placeholder

        scene.add.existing(this);
        this.setDepth(140);
        this.setVisible(false);
        this.setActive(false);

        // Shadowy particles
        this.particles = scene.add.particles(0, 0, 'spark', {
            speed: { min: 10, max: 40 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 500,
            quantity: 2,
            tint: 0x220033,
            blendMode: 'NORMAL',
            emitting: false
        });
        this.particles.setDepth(139);
    }

    spawn(x: number, y: number, angle: number, damage: number) {
        this.setPosition(x, y);
        this.setRotation(angle);
        this.damage = damage;
        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(0.6);
        this.lastTickTime = this.scene.time.now;

        if (this.particles) {
            this.particles.setPosition(x, y);
            this.particles.start();
        }

        // Fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: this.duration,
            onComplete: () => this.deactivate()
        });
    }

    update(time: number, _delta: number) {
        if (!this.active) return;

        if (time > this.lastTickTime + this.tickRate) {
            this.lastTickTime = time;
            this.dealDamage();
        }
    }

    private dealDamage() {
        const mainScene = this.scene as any;
        const radius = 60;

        // Find enemies in the wake
        const enemies = mainScene.spatialGrid?.getNearby(this.x, this.y, radius) || [];
        for (const enemy of enemies) {
            const e = enemy as any;
            if (e.active && !e.getIsDead()) {
                e.takeDamage(this.damage, '#ff00ff');
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

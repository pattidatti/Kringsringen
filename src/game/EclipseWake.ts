import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Reality-warping strike echo for the Solsnu upgrade.
 * Features an "Avant-Garde" void vortex with implosive gravity particles.
 */
export class EclipseWake extends Phaser.GameObjects.Sprite {
    private duration: number = GAME_CONFIG.WEAPONS.ECLIPSE.duration;
    private damage: number = 0;
    private tickRate: number = GAME_CONFIG.WEAPONS.ECLIPSE.tickRate;
    private lastTickTime: number = 0;
    private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 'eclipse_vortex');

        scene.add.existing(this);
        this.setDepth(140);
        this.setVisible(false);
        this.setActive(false);

        // Implosive "Void" particles
        this.particles = scene.add.particles(0, 0, 'spark', {
            speed: {
                min: GAME_CONFIG.WEAPONS.ECLIPSE.particles.speed.min,
                max: GAME_CONFIG.WEAPONS.ECLIPSE.particles.speed.max
            },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: GAME_CONFIG.WEAPONS.ECLIPSE.particles.lifespan,
            quantity: GAME_CONFIG.WEAPONS.ECLIPSE.particles.quantity,
            tint: 0xff00ff,
            blendMode: 'ADD',
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
        this.setAlpha(0.7);
        this.setScale(0); // Start at 0 for "pop"
        this.lastTickTime = this.scene.time.now;

        if (this.particles) {
            this.particles.setPosition(x, y);
            // Spawn particles on a ring and have them move towards center
            this.particles.addEmitZone({
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, 45)
            });
            this.particles.start();
        }

        // Avant-Garde Juice: Back.out pop-in
        this.scene.tweens.add({
            targets: this,
            scale: 1.0,
            duration: 300,
            ease: 'Back.out'
        });

        // Slow rotation for "vortex" feel
        this.scene.tweens.add({
            targets: this,
            angle: '+=360',
            duration: this.duration,
            repeat: 0
        });

        // Deactivation sequence (fade + shrink)
        this.scene.time.delayedCall(this.duration - 200, () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                scale: 0.5,
                duration: 200,
                ease: 'Power2.in',
                onComplete: () => this.deactivate()
            });
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
        const radius = GAME_CONFIG.WEAPONS.ECLIPSE.baseRadius;

        const nearby = mainScene.spatialGrid?.findNearby({ x: this.x, y: this.y, width: 0, height: 0 }, radius) || [];
        for (const entry of nearby) {
            const e = entry.ref as any;
            if (e && e.active && !e.getIsDead()) {
                // Magenta damage text for thematic consistency
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

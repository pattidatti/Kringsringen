import Phaser from 'phaser';
import { AudioManager } from './AudioManager';

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 800;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private light: Phaser.GameObjects.Light | null = null;
    private projectileType: 'arrow' | 'fireball' = 'arrow';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow'); // Default texture

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(200);
    }

    fire(x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball') {
        this.startX = x;
        this.startY = y;
        this.damage = damage;
        this.projectileType = type;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);

        if (this.body) {
            this.body.enable = true;
            (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
        }

        if (this.trail) {
            this.trail.destroy();
            this.trail = null;
        }

        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }

        if (type === 'fireball') {
            this.setTexture('wizard_fireball');
            this.play('wizard-fireball-fly');
            this.setScale(1.2);
            this.setBodySize(20, 20);

            this.trail = this.scene.add.particles(x, y, 'wizard_fireball', {
                lifespan: 200,
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.5, end: 0 },
                frequency: 25,
                follow: this,
                tint: 0xffaa00,
                blendMode: 'ADD'
            });
            this.trail.setDepth(this.depth - 1);

            // Wizard fireball light intensity is 1/3 of player's (player's is 1.0)
            this.light = this.scene.lights.addLight(x, y, 150, 0xffaa00, 0.33);
            this.postFX.addGlow(0xffaa00, 4, 0, false, 0.1, 10);
        } else {
            this.setTexture('arrow');
            this.play({ key: '' }); // Clear animation if any
            this.setScale(1.5);
            this.setBodySize(20, 10);
            this.setPipeline('Light2D');

            this.trail = this.scene.add.particles(x, y, 'arrow', {
                lifespan: 120,
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.4, end: 0 },
                frequency: 20,
                follow: this,
                tint: 0xcccccc,
                blendMode: 'ADD'
            });
            this.trail.setDepth(this.depth - 1);
        }

        if (this.body) {
            const speed = type === 'fireball' ? 350 : 500;
            this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
        }
    }

    private hit() {
        if (!this.active) return;

        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;

        if (this.trail) {
            this.trail.stop();
            const currentTrail = this.trail;
            this.scene.time.delayedCall(500, () => {
                if (currentTrail && currentTrail.active) currentTrail.destroy();
            });
            this.trail = null;
        }

        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        this.postFX.clear();

        if (this.projectileType === 'fireball') {
            const mainScene = this.scene as any;
            if (mainScene.poolManager) {
                mainScene.poolManager.spawnFireballExplosion(this.x, this.y);
            }
            AudioManager.instance.playSFX('fireball_hit');
        } else {
            AudioManager.instance.playSFX('bow_impact');
        }

        // Return to pool
        const mainScene = this.scene as any;
        if (mainScene.poolManager) {
            mainScene.poolManager.returnEnemyProjectile(this);
        }
    }

    public onHitPlayer(player: any) {
        if (!this.active) return;

        // Emit hit event to handle damage logic in main scene
        this.scene.events.emit('enemy-projectile-hit-player', this.damage, this.projectileType, this.x, this.y, player);
        this.hit();
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

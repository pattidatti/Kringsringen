import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 600;
    private startX: number = 0;
    private startY: number = 0;
    private readonly SPLASH_RADIUS = 80;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'fireball_projectile');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(24, 24);
        this.setDepth(200);

        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_fireball, enemy) => {
            if (!this.active) return;
            this.hit(enemy as Enemy);
        });
    }

    fire(x: number, y: number, angle: number, damage: number) {
        this.startX = x;
        this.startY = y;
        this.damage = damage;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);
        this.play('fireball-fly');

        if (this.body) {
            this.body.enable = true;
            this.scene.physics.velocityFromRotation(angle, 450, this.body.velocity);
        }
    }

    private hit(directHit?: Enemy) {
        if (!this.active) return;

        const hitX = this.x;
        const hitY = this.y;

        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;

        // Direct hit
        if (directHit) {
            directHit.takeDamage(this.damage);
            directHit.pushback(this.startX, this.startY, 200);
        }

        // Splash damage to nearby enemies
        const mainScene = this.scene as any;
        mainScene.enemies.children.iterate((e: any) => {
            if (!e.active || e === directHit) return true;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
            if (dist <= this.SPLASH_RADIUS) {
                (e as Enemy).takeDamage(this.damage * 0.5);
                (e as Enemy).pushback(hitX, hitY, 100);
            }
            return true;
        });

        mainScene.poolManager.spawnFireballExplosion(hitX, hitY);
        AudioManager.instance.playSFX('fireball_hit');
    }

    update() {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

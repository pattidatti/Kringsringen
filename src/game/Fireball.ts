import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 600;
    private startX: number = 0;
    private startY: number = 0;

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
            const mainScene = this.scene as any;
            const fireballSpeed = mainScene.registry.get('fireballSpeed') || 450;
            this.scene.physics.velocityFromRotation(angle, fireballSpeed, this.body.velocity);
        }
    }

    private hit(directHit?: Enemy) {
        if (!this.active) return;

        const hitX = this.x;
        const hitY = this.y;

        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;

        const mainScene = this.scene as any;
        const fireballRadius = mainScene.registry.get('fireballRadius') || 80;
        const fireballDamageMulti = mainScene.registry.get('fireballDamageMulti') || 1;
        const fireChainLvl = (mainScene.registry.get('upgradeLevels') || {})['fire_chain'] || 0;

        const scaledDamage = this.damage * fireballDamageMulti;

        // Direct hit
        if (directHit) {
            directHit.takeDamage(scaledDamage);
            directHit.pushback(this.startX, this.startY, 200);
        }

        // Splash damage to nearby enemies
        const hitEnemies: Enemy[] = [];
        mainScene.enemies.children.iterate((e: any) => {
            if (!e.active || e === directHit) return true;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
            if (dist <= fireballRadius) {
                (e as Enemy).takeDamage(scaledDamage * 0.5);
                (e as Enemy).pushback(hitX, hitY, 100);
                hitEnemies.push(e as Enemy);
            }
            return true;
        });

        mainScene.poolManager.spawnFireballExplosion(hitX, hitY);
        AudioManager.instance.playSFX('fireball_hit');

        // Chain reaction: secondary explosion after 300ms
        if (fireChainLvl > 0) {
            mainScene.time.delayedCall(300, () => {
                mainScene.enemies.children.iterate((e: any) => {
                    if (!e.active) return true;
                    const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
                    if (dist <= fireballRadius && e !== directHit && !hitEnemies.includes(e)) {
                        (e as Enemy).takeDamage(scaledDamage * 0.3);
                        (e as Enemy).pushback(hitX, hitY, 80);
                    }
                    return true;
                });
                mainScene.poolManager.spawnFireballExplosion(hitX, hitY);
            });
        }
    }

    update() {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

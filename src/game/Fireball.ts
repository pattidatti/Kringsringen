import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 600;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private light: Phaser.GameObjects.Light | null = null;

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

        this.trail = this.scene.add.particles(x, y, 'fireball_projectile', {
            lifespan: 200,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.6, end: 0 },
            frequency: 20,
            follow: this,
            tint: 0xff4400,
            blendMode: 'ADD'
        });
        this.trail.setDepth(this.depth - 1);

        // Add Glow FX
        this.postFX.addGlow(0xff4400, 4, 0, false, 0.1, 10);

        // Add Dynamic Light
        this.light = this.scene.lights.addLight(x, y, 200, 0xff6600, 1.0);

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
        if (this.trail) {
            this.trail.destroy();
            this.trail = null;
        }
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        this.postFX.clear();

        // Spawn impact flash light
        const flash = this.scene.lights.addLight(hitX, hitY, 300, 0xffaa00, 2.0);
        this.scene.tweens.add({
            targets: flash,
            intensity: 0,
            radius: 400,
            duration: 400,
            onComplete: () => {
                this.scene.lights.removeLight(flash);
            }
        });

        const mainScene = this.scene as any;
        const fireballRadius = mainScene.registry.get('fireballRadius') || 80;
        const fireballDamageMulti = mainScene.registry.get('fireballDamageMulti') || 1;
        const fireChainLvl = (mainScene.registry.get('upgradeLevels') || {})['fire_chain'] || 0;

        const scaledDamage = this.damage * fireballDamageMulti;

        // Direct hit
        if (directHit) {
            directHit.takeDamage(scaledDamage, '#ff6e24'); // Bright orange/fire
            directHit.pushback(this.startX, this.startY, 200);
        }

        // Splash damage to nearby enemies
        const hitEnemies: Enemy[] = [];
        mainScene.enemies.children.iterate((e: any) => {
            if (!e.active || e === directHit) return true;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
            if (dist <= fireballRadius) {
                (e as Enemy).takeDamage(scaledDamage * 0.5, '#ff6e24');
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
                        (e as Enemy).takeDamage(scaledDamage * 0.3, '#ff6e24');
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

        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }

        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

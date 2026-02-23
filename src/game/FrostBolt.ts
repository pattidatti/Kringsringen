import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class FrostBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'frost_projectile');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(1, 1); // Physics body disabled during use
        this.setDepth(200);
    }

    fire(x: number, y: number, targetX: number, targetY: number, damage: number) {
        this.damage = damage;

        // Play cast animation at player position
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        if (this.body) this.body.enable = false;
        this.play('frost-fly');

        // After one full cycle of cast anim (~550ms @ 12fps × 8 frames), impact at target
        const castDuration = Math.round((8 / 12) * 1000);
        this.scene.time.delayedCall(castDuration, () => {
            this.setActive(false);
            this.setVisible(false);
            this.impact(targetX, targetY);
        });
    }

    private impact(hitX: number, hitY: number) {
        const mainScene = this.scene as any;
        const frostRadius = mainScene.registry.get('frostRadius') || 100;
        const frostDamageMulti = mainScene.registry.get('frostDamageMulti') || 1;
        const frostSlowDuration = mainScene.registry.get('frostSlowDuration') || 0;
        const frostShatterLvl = (mainScene.registry.get('upgradeLevels') || {})['frost_shatter'] || 0;

        const scaledDamage = this.damage * frostDamageMulti;
        const slowedEnemies: Enemy[] = [];

        // Splash damage to all enemies near impact point
        mainScene.enemies.children.iterate((e: any) => {
            if (!e.active) return true;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
            if (dist <= frostRadius) {
                const isCenter = dist < 20;
                (e as Enemy).takeDamage(isCenter ? scaledDamage : scaledDamage * 0.5);
                (e as Enemy).pushback(hitX, hitY, isCenter ? 220 : 120);

                // Apply slow effect if unlocked
                if (frostSlowDuration > 0) {
                    (e as Enemy).applySlow(frostSlowDuration);
                    slowedEnemies.push(e as Enemy);
                }
            }
            return true;
        });

        // Shatter effect: slowed enemies take extra damage and cause secondary splash
        if (frostShatterLvl > 0) {
            slowedEnemies.forEach(slowed => {
                slowed.takeDamage(scaledDamage * 0.5); // Extra 50% damage
                // Secondary splash on nearby enemies
                mainScene.enemies.children.iterate((e: any) => {
                    if (!e.active || e === slowed) return true;
                    const dist = Phaser.Math.Distance.Between(slowed.x, slowed.y, e.x, e.y);
                    if (dist <= 60) { // Smaller radius for shatter splinter
                        (e as Enemy).takeDamage(scaledDamage * 0.25);
                    }
                    return true;
                });
            });
        }

        mainScene.poolManager.spawnFrostExplosion(hitX, hitY);
        AudioManager.instance.playSFX('ice_freeze');
    }

    update() {
        // No movement — teleport spell
    }
}

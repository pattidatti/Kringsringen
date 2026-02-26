import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';

export class FrostBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private light: Phaser.GameObjects.Light | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'frost_projectile');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(1, 1); // Physics body disabled during use
        this.setDepth(200);
        this.setPipeline('Light2D');
    }

    fire(x: number, y: number, targetX: number, targetY: number, damage: number) {
        this.damage = damage;

        // Play cast animation at player position
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        if (this.body) this.body.enable = false;
        this.play('frost-fly');

        // Add Glow FX
        this.postFX.addGlow(0x00aaff, 4, 0, false, 0.1, 10);

        // Add cast glow
        this.light = this.scene.lights.addLight(x, y, 180, 0x88ccff, 1.0);

        // After one full cycle of cast anim (~550ms @ 12fps × 8 frames), impact at target
        const castDuration = Math.round((8 / 12) * 1000);
        this.scene.time.delayedCall(castDuration, () => {
            this.setActive(false);
            this.setVisible(false);
            if (this.light) {
                this.scene.lights.removeLight(this.light);
                this.light = null;
            }
            this.postFX.clear();
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

        const applyFrostSplash = (e: any) => {
            if (!e.active) return;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);
            if (dist <= frostRadius) {
                const isCenter = dist < 20;
                const enemy = e as Enemy;
                const damage = isCenter ? scaledDamage : scaledDamage * 0.5;

                if (mainScene.networkManager?.role === 'client') {
                    enemy.predictDamage(damage);
                    mainScene.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'projectile_hit_request',
                            data: {
                                projectileType: 'frost',
                                targetId: enemy.id || 'boss',
                                hitX: hitX,
                                hitY: hitY,
                                damage: damage,
                                timestamp: mainScene.networkManager.getServerTime(),
                                isSlow: frostSlowDuration > 0,
                                slowDuration: frostSlowDuration
                            }
                        },
                        ts: mainScene.networkManager.getServerTime()
                    });

                    if (mainScene.poolManager) {
                        mainScene.poolManager.getDamageText(enemy.x, enemy.y - 30, damage, '#00aaff');
                        this.scene.events.emit('enemy-hit');
                    }
                } else {
                    enemy.takeDamage(damage, '#00aaff');
                    enemy.pushback(hitX, hitY, isCenter ? 220 : 120);

                    // Apply slow effect if unlocked
                    if (frostSlowDuration > 0) {
                        enemy.applySlow(frostSlowDuration);
                        slowedEnemies.push(enemy);
                    }
                }
            }
        };

        // Splash damage to all enemies near impact point
        mainScene.enemies.children.iterate((e: any) => { applyFrostSplash(e); return true; });
        if (mainScene.bossGroup) {
            mainScene.bossGroup.children.iterate((e: any) => { applyFrostSplash(e); return true; });
        }

        // Shatter effect: slowed enemies take extra damage and cause secondary splash
        if (frostShatterLvl > 0) {
            slowedEnemies.forEach(slowed => {
                slowed.takeDamage(scaledDamage * 0.5, '#00aaff'); // Extra 50% damage
                // Secondary splash on nearby enemies
                mainScene.enemies.children.iterate((e: any) => {
                    if (!e.active || e === slowed) return true;
                    const dist = Phaser.Math.Distance.Between(slowed.x, slowed.y, e.x, e.y);
                    if (dist <= 60) { // Smaller radius for shatter splinter
                        const shatterEnemy = e as Enemy;
                        if (mainScene.networkManager?.role === 'client') {
                            shatterEnemy.predictDamage(scaledDamage * 0.25);
                        } else {
                            shatterEnemy.takeDamage(scaledDamage * 0.25, '#00aaff');
                        }
                    }
                    return true;
                });
            });
        }

        mainScene.poolManager.spawnFrostExplosion(hitX, hitY);
        AudioManager.instance.playSFX('ice_freeze');
        AudioManager.instance.playSFX('frost_impact');

        // Impact flash light
        const flash = this.scene.lights.addLight(hitX, hitY, 350, 0x00aaff, 2.5);
        this.scene.tweens.add({
            targets: flash,
            intensity: 0,
            radius: 450,
            duration: 500,
            onComplete: () => {
                this.scene.lights.removeLight(flash);
            }
        });
    }

    update() {
        // No movement — teleport spell
    }
}

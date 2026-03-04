import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';

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

        if (mainScene.bossGroup) {
            scene.physics.add.overlap(this, mainScene.bossGroup, (_fireball, boss) => {
                if (!this.active) return;
                this.hit(boss as Enemy);
            });
        }
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

        // Pool trail emitter: create once, reuse on subsequent fires
        if (!this.trail) {
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
        } else {
            this.trail.setPosition(x, y);
            this.trail.resume();
        }

        // Add Glow FX
        this.postFX.addGlow(0xff4400, 4, 0, false, 0.1, 10);

        // Add Dynamic Light (remove stale light from pool reuse first)
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
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
            this.trail.stop(); // Stop but keep for pooling (don't destroy)
        }
        this.postFX.clear();

        // Reuse travel light as impact flash — avoid new light allocation
        if (this.light) {
            const light = this.light; // Capture for use in tween callback
            light.setPosition(hitX, hitY).setRadius(300).setIntensity(2.0);
            this.scene.tweens.add({
                targets: light,
                intensity: 0,
                radius: 400,
                duration: 400,
                onComplete: () => {
                    if (light) this.scene.lights.removeLight(light);
                }
            });
            this.light = null;  // Null immediately to prevent double cleanup on pool reuse
        }

        const mainScene = this.scene as any;
        const fireballRadius = mainScene.registry.get('fireballRadius') || 80;
        const fireballDamageMulti = mainScene.registry.get('fireballDamageMulti') || 1;
        const fireChainLvl = (mainScene.registry.get('upgradeLevels') || {})['fire_chain'] || 0;
        const synergyThermalShock = mainScene.registry.get('synergyThermalShock');

        const scaledDamage = this.damage * fireballDamageMulti;

        let thermalShockTriggered = false;

        // Direct hit
        if (directHit) {
            let hitDmg = scaledDamage;
            if (synergyThermalShock && directHit.consumeSlow()) {
                hitDmg *= 3;
                thermalShockTriggered = true;
            }

            if (mainScene.networkManager?.role === 'client') {
                mainScene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'projectile_hit_request',
                        data: {
                            projectileType: 'fireball',
                            targetId: directHit.id || 'boss',
                            hitX: hitX,
                            hitY: hitY,
                            damage: hitDmg,
                            timestamp: mainScene.networkManager.getServerTime()
                        }
                    },
                    ts: mainScene.networkManager.getServerTime()
                });

                if (mainScene.poolManager) {
                    mainScene.poolManager.getDamageText(directHit.x, directHit.y - 30, hitDmg, thermalShockTriggered ? '#ffaa00' : '#ff6e24');
                    mainScene.events.emit('enemy-hit');
                }
                directHit.predictDamage(hitDmg);
            } else {
                directHit.takeDamage(hitDmg, thermalShockTriggered ? '#ffaa00' : '#ff6e24'); // Bright orange/fire
                directHit.pushback(this.startX, this.startY, 200);
            }
        }

        // Splash damage to nearby enemies
        const hitEnemies: Enemy[] = [];
        const finalRadius = thermalShockTriggered ? fireballRadius * 1.5 : fireballRadius;

        const applySplash = (e: any) => {
            if (!e.active || e === directHit) return;
            const dist = Phaser.Math.Distance.Between(hitX, hitY, e.x, e.y);

            if (dist <= finalRadius) {
                const enemy = e as Enemy;
                let splashDmg = scaledDamage * 0.5;

                // Chain thermal shock if other enemies in radius are also frozen
                if (synergyThermalShock && enemy.consumeSlow()) {
                    splashDmg = scaledDamage * 1.5; // 3x splash
                    thermalShockTriggered = true;
                }

                if (thermalShockTriggered) {
                    splashDmg = Math.max(splashDmg, scaledDamage); // Increase baseline splash
                }

                if (mainScene.networkManager?.role === 'client') {
                    enemy.predictDamage(splashDmg);
                } else {
                    enemy.takeDamage(splashDmg, thermalShockTriggered ? '#ffaa00' : '#ff6e24');
                }
                enemy.pushback(hitX, hitY, thermalShockTriggered ? 200 : 100);
                hitEnemies.push(enemy);
            }
        };

        mainScene.enemies.getChildren().forEach((e: any) => { applySplash(e); });
        if (mainScene.bossGroup) {
            mainScene.bossGroup.getChildren().forEach((e: any) => { applySplash(e); });
        }

        mainScene.poolManager.spawnFireballExplosion(hitX, hitY);
        if (thermalShockTriggered) {
            mainScene.poolManager.spawnFrostExplosion(hitX, hitY); // Dual explosion effect
            AudioManager.instance.playSFX('ice_freeze');

            // Screen shake for massive impact
            this.scene.cameras.main.shake(150, 0.015);
        }
        AudioManager.instance.playSFX('fireball_hit');

        // Chain reaction: secondary explosion after 300ms
        if (fireChainLvl > 0) {
            mainScene.time.delayedCall(300, () => {
                mainScene.enemies.getChildren().forEach((e: any) => {
                    const enemy = e as Enemy;
                    if (!enemy.active) return;
                    const dist = Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y);
                    if (dist <= fireballRadius && enemy !== directHit && !hitEnemies.includes(enemy)) {
                        if (mainScene.networkManager?.role === 'client') {
                            enemy.predictDamage(scaledDamage * 0.3);
                        } else {
                            enemy.takeDamage(scaledDamage * 0.3, '#ff6e24');
                        }
                        enemy.pushback(hitX, hitY, 80);
                    }
                });
                mainScene.poolManager.spawnFireballExplosion(hitX, hitY);
            });
        }

        // ── Fase 6: Wizard Spell Effects ─────────────────────────────────────
        const upgLvls = (mainScene.registry?.get('upgradeLevels') || {}) as Record<string, number>;

        // Arcane Insight: every 4 casts, slice the active cooldown
        const arcaneInsightLvl = upgLvls['arcane_insight'] || 0;
        if (arcaneInsightLvl > 0) {
            const casts = mainScene.buffs.getStacks('arcane_insight_tracker') + 1;

            if (casts >= 4) {
                mainScene.buffs.removeBuff('arcane_insight_tracker');
                const weaponCd = mainScene.registry.get('weaponCooldown') as { duration: number; timestamp: number } | undefined;
                if (weaponCd) {
                    const reduction = arcaneInsightLvl === 1 ? 0.30 : 0.60;
                    const remaining = (weaponCd.timestamp + weaponCd.duration) - Date.now();
                    if (remaining > 0) {
                        mainScene.registry.set('weaponCooldown', {
                            duration: weaponCd.duration,
                            timestamp: weaponCd.timestamp - remaining * reduction
                        });
                    }
                }
                // Visual buff indicator for the proc
                mainScene.buffs.addBuff({
                    key: 'arcane_insight_proc',
                    title: 'INSIGHT',
                    icon: 'item_orb_purple',
                    color: 0xcc88ff,
                    duration: 1000,
                    maxStacks: 1,
                    isVisible: true
                });
            } else {
                mainScene.buffs.addBuff({
                    key: 'arcane_insight_tracker',
                    title: 'Casts',
                    icon: 'item_orb_purple',
                    color: 0xaaaaaa,
                    duration: -1,
                    maxStacks: 4,
                    isVisible: false
                });
            }
        }

        // Overload: 3 hits → gratis neste kast (flagg leses i main.ts spell-cast)
        const overloadLvl = upgLvls['overload'] || 0;
        if (overloadLvl > 0) {
            const hits = mainScene.buffs.getStacks('overload_tracker') + 1;
            if (hits >= 3) {
                mainScene.buffs.removeBuff('overload_tracker');
                mainScene._nextCastFree = true;
                mainScene.buffs.addBuff({
                    key: 'overload_proc',
                    title: 'GRATISKAST',
                    icon: 'item_flame',
                    color: 0xcc88ff,
                    duration: 10000,
                    maxStacks: 1,
                    isVisible: true
                });
                const p = mainScene.data?.get('player');
                if (p && mainScene.poolManager) {
                    mainScene.poolManager.getDamageText(p.x, p.y - 70, 'OVERLOAD!', '#cc88ff');
                }
            } else {
                mainScene.buffs.addBuff({
                    key: 'overload_tracker',
                    title: 'Hits',
                    icon: 'item_flame',
                    color: 0xaaaaaa,
                    duration: -1,
                    maxStacks: 3,
                    isVisible: false
                });
            }
        }

        // Spell Echo: chance for free cast
        const spellEchoLvl = upgLvls['spell_echo'] || 0;
        if (spellEchoLvl > 0 && Math.random() < spellEchoLvl * 0.15) {
            mainScene._nextCastFree = true;
            mainScene.buffs.addBuff({
                key: 'spell_echo_proc',
                title: 'ECHO',
                icon: 'item_lightning',
                color: 0xcc88ff,
                duration: 10000,
                maxStacks: 1,
                isVisible: true
            });
        }

        // Elementar Overload: register fireball cross-element window
        const elemOverloadLvl = upgLvls['elementar_overfload'] || 0;
        if (elemOverloadLvl > 0) {
            mainScene.buffs.addBuff({
                key: 'overload_fireball',
                title: 'FIRE WINDOW',
                icon: 'item_synergy_rune',
                color: 0xffaa00,
                duration: 5000,
                maxStacks: 1,
                isVisible: true
            });
            // Legacy flag compatibility
            if (!mainScene._overloadActiveUntil) mainScene._overloadActiveUntil = {};
            mainScene._overloadActiveUntil['fireball'] = Date.now() + 5000;
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

    public destroy(fromScene?: boolean) {
        if (this.trail) this.trail.destroy();
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        super.destroy(fromScene);
    }
}

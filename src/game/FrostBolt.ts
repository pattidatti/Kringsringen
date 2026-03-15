import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';
import type { PerformanceManager } from './PerformanceManager';

export class FrostBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private light: import('./LightmapRenderer').LightmapLight | null = null;

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

        // Add Glow FX (gate by PerformanceManager)
        const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
        if (!pm || pm.glowEnabled) {
            this.postFX.addGlow(0x00aaff, 4, 0, false, 0.1, 10);
        }

        // Add cast glow via light budget (remove stale light from pool reuse first)
        if (this.light) {
            const vis = (this.scene as any).visuals;
            if (vis) vis.releaseProjectileLight(this.light);
            this.light = null;
        }
        const visuals = (this.scene as any).visuals;
        this.light = visuals ? visuals.requestProjectileLight(x, y, 180, 0x88ccff, 1.0) : null;

        // After one full cycle of cast anim (~550ms @ 12fps × 8 frames), impact at target
        const castDuration = Math.round((8 / 12) * 1000);
        this.scene.time.delayedCall(castDuration, () => {
            this.setActive(false);
            this.setVisible(false);
            // Keep travel light alive — will be reused as impact flash in impact()
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
                    enemy.pushback(hitX, hitY, isCenter ? 220 : 120);
                    enemy.takeDamage(damage, '#00aaff');

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

        // ── MASTERY: Ice Prison — frozen enemies that die explode into chain freeze ──
        const upgLvls = (mainScene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const icePrisonLvl = upgLvls['ice_prison'] || 0;
        if (icePrisonLvl > 0) {
            slowedEnemies.forEach(slowed => {
                // Check if enemy died from this hit — chain freeze on death
                if (!slowed.active || slowed.getIsDead()) {
                    this.chainFrostExplosion(slowed.x, slowed.y, scaledDamage * 0.4, frostSlowDuration, 3, mainScene);
                }
            });
        }

        // ── MASTERY: Frost Domain — leave permanent frost zone at cast location ──
        const frostDomainLvl = upgLvls['frost_domain'] || 0;
        if (frostDomainLvl > 0) {
            const existingZones = (mainScene.data?.get('frostDomainZones') || []) as Phaser.GameObjects.Arc[];
            // Max 3 zones
            if (existingZones.length >= 3) {
                const oldest = existingZones.shift()!;
                oldest.destroy();
                mainScene.data.set('frostDomainZones', existingZones);
            }
            const zoneRadius = 200;
            const zone = mainScene.add.circle(hitX, hitY, zoneRadius, 0x0088ff, 0.12).setDepth(1);
            mainScene.tweens.add({
                targets: zone,
                alpha: { from: 0.08, to: 0.18 },
                scale: { from: 0.95, to: 1.05 },
                yoyo: true,
                repeat: -1,
                duration: 800
            });
            existingZones.push(zone);
            mainScene.data.set('frostDomainZones', existingZones);

            // Tick: 40% slow + 25% damage vulnerability
            const tickRate = 500;
            const zoneTickEvent = mainScene.time.addEvent({
                delay: tickRate,
                callback: () => {
                    if (!zone.active) { zoneTickEvent.remove(); return; }
                    const nearby = mainScene.spatialGrid?.findNearby({ x: hitX, y: hitY, width: 1, height: 1 }, zoneRadius) || [];
                    nearby.forEach((cell: any) => {
                        const e = cell.ref;
                        if (e && e.active && !e.getIsDead()) {
                            e.applySlow?.(1500);
                            e.setData('frostVulnUntil', Date.now() + 2000);
                        }
                    });
                },
                loop: true
            });
        }

        mainScene.poolManager.spawnFrostExplosion(hitX, hitY);
        AudioManager.instance.playSFX('ice_freeze');
        AudioManager.instance.playSFX('frost_impact');

        // Reuse travel light as impact flash — avoid new light allocation
        if (this.light) {
            const light = this.light;
            const vis = (this.scene as any).visuals;
            light.x = hitX;
            light.y = hitY;
            light.radius = 350;
            light.intensity = 2.5;
            this.scene.tweens.add({
                targets: light,
                intensity: 0,
                radius: 450,
                duration: 500,
                onComplete: () => {
                    if (vis) vis.releaseProjectileLight(light);
                }
            });
            this.light = null;
        }
    }

    private chainFrostExplosion(x: number, y: number, damage: number, slowDuration: number, chainsLeft: number, mainScene: any): void {
        if (chainsLeft <= 0) return;
        const radius = 120;
        mainScene.poolManager?.spawnFrostExplosion(x, y);
        const nearby = mainScene.spatialGrid?.findNearby({ x, y, width: 1, height: 1 }, radius) || [];
        nearby.forEach((cell: any) => {
            const e = cell.ref;
            if (e && e.active && !e.getIsDead()) {
                e.takeDamage(damage, '#00ccff');
                if (slowDuration > 0) e.applySlow?.(slowDuration);
                // If this kills the enemy, chain further
                if (!e.active || e.getIsDead()) {
                    this.scene.time.delayedCall(200, () => {
                        this.chainFrostExplosion(e.x, e.y, damage * 0.8, slowDuration, chainsLeft - 1, mainScene);
                    });
                }
            }
        });
    }

    update() {
        // No movement — teleport spell
    }

    public destroy(fromScene?: boolean) {
        if (this.light) {
            const vis = (this.scene as any).visuals;
            if (vis) vis.releaseProjectileLight(this.light);
            this.light = null;
        }
        super.destroy(fromScene);
    }
}

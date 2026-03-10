import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';
import type { PerformanceManager } from './PerformanceManager';

export class Arrow extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 800;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private glowSprite: Phaser.GameObjects.Sprite | null = null;
    private glowEffect: Phaser.FX.Glow | null = null;
    private speed: number = 700;
    private pierceCount: number = 0;
    private hitEnemies = new Set<any>();
    private hitExplosionEnemies = new Set<any>();
    private hitCount: number = 0;
    private explosiveLevel: number = 0;
    private singularityLevel: number = 0;
    private poisonLevel: number = 0;
    private abilityExplosiveRadius: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(20, 10);

        // Initialize trail emitter (stopped)
        this.trail = this.scene.add.particles(0, 0, 'arrow', {
            lifespan: 120,
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            frequency: 18,
            tint: 0xddbb66,
            blendMode: 'ADD',
            emitting: false
        });
        this.trail.setDepth(this.depth - 1);

        // Setup overlap in constructor once
        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_arrow, enemy) => {
            this.handleOverlap(enemy as Enemy, mainScene);
        });

        if (mainScene.bossGroup) {
            scene.physics.add.overlap(this, mainScene.bossGroup, (_arrow, boss) => {
                this.handleOverlap(boss as Enemy, mainScene);
            });
        }
    }

    private handleOverlap(e: Enemy, mainScene: any) {
        if (!this.active) return;

        // Check if already hit this enemy
        if (this.hitEnemies.has(e)) return;

        // Mark as hit
        this.hitEnemies.add(e);
        this.hitCount++;

        if (mainScene.networkManager?.role === 'client') {
            mainScene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: {
                    type: 'projectile_hit_request',
                    data: {
                        projectileType: 'arrow',
                        targetId: e.id || 'boss',
                        hitX: this.x,
                        hitY: this.y,
                        damage: this.damage,
                        timestamp: mainScene.networkManager.getServerTime()
                    }
                },
                ts: mainScene.networkManager.getServerTime()
            });

            // Client-side prediction (visual and physical)
            e.predictDamage(this.damage);
            if (mainScene.poolManager) {
                mainScene.poolManager.getDamageText(e.x, e.y - 30, this.damage, '#ffffff');
                mainScene.events.emit('enemy-hit');
            }
        } else {
            e.pushback(this.startX, this.startY, 150);
            e.takeDamage(this.damage, '#ffffff');

            // ── Fase 6: Archer pil-effekter ──────────────────────────────────
            const levels = (mainScene.registry?.get('upgradeLevels') || {}) as Record<string, number>;

            // Pindown – chance to pin enemy in place
            const pindownLvl = levels['pindown'] || 0;
            if (pindownLvl > 0 && Math.random() < pindownLvl * 0.20) {
                e.setVelocity(0, 0);
                e.setData('pinnedUntil', Date.now() + 1500 + pindownLvl * 500);
            }

            // Kite Mastery – reduce dash CD on kill
            const kiteLvl = levels['kite_mastery'] || 0;
            const wasAlive = e.hp > 0;
            if (kiteLvl > 0 && wasAlive && e.hp <= 0) {
                const dashState = mainScene.registry.get('dashState') || { isActive: false, readyAt: 0 };
                const dashCooldown = mainScene.registry.get('dashCooldown') || 7000;
                if (dashState.readyAt > Date.now()) {
                    dashState.readyAt = Math.max(Date.now(), dashState.readyAt - dashCooldown * kiteLvl * 0.20);
                    mainScene.registry.set('dashState', dashState);
                }

                // Shadeskudd – spawn extra arrows on kill
                const shadeskuddLvl = levels['shadeskudd'] || 0;
                if (shadeskuddLvl > 0 && mainScene.arrows) {
                    const nearbyEnemies = mainScene.spatialGrid?.findNearby({ x: e.x, y: e.y, width: 1, height: 1 }, 400) || [];
                    let spawned = 0;
                    for (const cell of nearbyEnemies) {
                        if (spawned >= shadeskuddLvl) break;
                        if (cell.ref && cell.ref !== e && cell.ref.active && !cell.ref.getIsDead()) {
                            const spawnArrow = mainScene.arrows.get(e.x, e.y);
                            if (spawnArrow) {
                                const ang = Phaser.Math.Angle.Between(e.x, e.y, cell.ref.x, cell.ref.y);
                                spawnArrow.fire(e.x, e.y, ang, this.damage, this.speed, 0, 0, 0, 0);
                                spawned++;
                            }
                        }
                    }
                }
            }

            // ── MASTERY: Solar Curse — mark enemies, explode at 3 marks ──
            const solarCurseLvl = levels['solar_curse'] || 0;
            if (solarCurseLvl > 0) {
                const marks = (e.getData('solarMarks') || 0) + 1;
                e.setData('solarMarks', marks);
                e.setData('solarMarkExpiry', Date.now() + 5000);
                if (marks >= 3) {
                    e.setData('solarMarks', 0);
                    // Trigger solar explosion
                    if (mainScene.poolManager) {
                        mainScene.poolManager.spawnFireballExplosion(e.x, e.y);
                    }
                    mainScene.scaledShake?.(150, 0.01);
                    const solarRadius = 180;
                    const solarDmg = this.damage * 2;
                    const solarNearby = mainScene.spatialGrid?.findNearby({ x: e.x, y: e.y, width: 1, height: 1 }, solarRadius) || [];
                    for (const cell of solarNearby) {
                        const se = cell.ref as Enemy;
                        if (se && se.active && !se.getIsDead()) {
                            se.takeDamage(solarDmg, '#ffdd00');
                            se.pushback(e.x, e.y, 200);
                        }
                    }
                    mainScene.poolManager?.getDamageText(e.x, e.y - 40, '☀ SOL!', '#ffdd00');
                }
            }

            // ── MASTERY: Splinter Arrow — on hit, spawn 3 mini-arrows seeking enemies ──
            const splinterArrowLvl = levels['splinter_arrow'] || 0;
            if (splinterArrowLvl > 0 && !(this.getData('isSplinter'))) {
                const splinterNearby = mainScene.spatialGrid?.findNearby({ x: e.x, y: e.y, width: 1, height: 1 }, 200) || [];
                let splinterCount = 0;
                for (const cell of splinterNearby) {
                    if (splinterCount >= 3) break;
                    const se = cell.ref as Enemy;
                    if (se && se !== e && se.active && !se.getIsDead()) {
                        const splinterArrow = mainScene.arrows?.get(e.x, e.y) as Arrow;
                        if (splinterArrow) {
                            const ang = Phaser.Math.Angle.Between(e.x, e.y, se.x, se.y);
                            splinterArrow.fire(e.x, e.y, ang, this.damage * 0.4, this.speed, 0, 0, 0, 0, 0, false);
                            splinterArrow.setScale(0.9);
                            splinterArrow.setTint(0x44ff44);
                            splinterArrow.setData('isSplinter', true);
                            splinterCount++;
                        }
                    }
                }
            }

            // Rikosjett – arrow bounces to nearest other enemy
            const rikosjettLvl = levels['rikosjett'] || 0;
            const ricochetCount = this.getData('ricochetCount') || 0;
            if (rikosjettLvl > 0 && ricochetCount < rikosjettLvl && mainScene.arrows) {
                const nearbyEnemies = mainScene.spatialGrid?.findNearby({ x: e.x, y: e.y, width: 1, height: 1 }, 500) || [];
                for (const cell of nearbyEnemies) {
                    if (cell.ref && cell.ref !== e && !this.hitEnemies.has(cell.ref) && cell.ref.active && !cell.ref.getIsDead()) {
                        const bounceArrow = mainScene.arrows.get(e.x, e.y);
                        if (bounceArrow) {
                            const ang = Phaser.Math.Angle.Between(e.x, e.y, cell.ref.x, cell.ref.y);
                            bounceArrow.fire(e.x, e.y, ang, this.damage, this.speed, 0, 0, 0, 0);
                            bounceArrow.setData('ricochetCount', ricochetCount + 1);
                        }
                        break;
                    }
                }
            }
        }

        // Apply poison on impact
        if (this.poisonLevel > 0) {
            e.applyPoison(this.poisonLevel, this.damage);
        }

        // Handle explosion on impact
        if (this.explosiveLevel > 0 || this.abilityExplosiveRadius > 0) {
            this.explode(e.x, e.y);
        }

        // Check if pierce count exceeded
        // pierceCount = 0 means hit 1 enemy then stop, 1 = hit 2 enemies, etc
        if (this.hitCount > this.pierceCount) {
            this.hit();
        }
    }

    fire(x: number, y: number, angle: number, damage: number, speed: number = 700, pierceCount: number = 0, explosiveLevel: number = 0, singularityLevel: number = 0, poisonLevel: number = 0, abilityExplosiveRadius: number = 0, withLight: boolean = true) {
        this.startX = x;
        this.startY = y;
        this.damage = damage;
        this.speed = speed;
        this.pierceCount = pierceCount;
        this.explosiveLevel = explosiveLevel;
        this.singularityLevel = singularityLevel;
        this.poisonLevel = poisonLevel;
        this.abilityExplosiveRadius = abilityExplosiveRadius;
        this.hitEnemies.clear();
        this.hitCount = 0;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);

        // Add glow post-FX (reuse on pool recycle, gate by PerformanceManager)
        const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
        const glowAllowed = !pm || pm.glowEnabled;
        if (withLight && glowAllowed && !this.glowEffect) {
            this.glowEffect = this.postFX.addGlow(0xffdd88, 3, 0, false, 0.1, 8);
        } else if ((!withLight || !glowAllowed) && this.glowEffect) {
            this.postFX.remove(this.glowEffect);
            this.glowEffect = null;
        }

        // Cheap additive glow sprite instead of PointLight (O(1) vs O(pixels))
        if (withLight && this.scene.textures.exists('glow-soft')) {
            if (!this.glowSprite) {
                this.glowSprite = this.scene.add.sprite(x, y, 'glow-soft');
                this.glowSprite.setBlendMode(Phaser.BlendModes.ADD);
                this.glowSprite.setDepth(this.depth - 1);
            }
            this.glowSprite.setPosition(x, y);
            this.glowSprite.setTint(0xffdd88);
            this.glowSprite.setAlpha(0.5);
            this.glowSprite.setScale(5); // ~160px radius from 32px half-size
            this.glowSprite.setVisible(true);
        } else if (this.glowSprite) {
            this.glowSprite.setVisible(false);
        }

        if (this.trail) {
            const trailFreq = Math.max(1, Math.floor(18 / (pm?.trailDensityMultiplier ?? 1)));
            this.trail.setFrequency(trailFreq);
            this.trail.start();
            this.trail.follow = this;
        }

        if (this.body) {
            this.body.enable = true;
            this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        }
    }

    private hit() {
        AudioManager.instance.playSFX('bow_impact');

        // Trigger singularity if unlocked
        if (this.singularityLevel > 0) {
            const mainScene = this.scene as any;
            const singularity = mainScene.singularities?.get(this.x, this.y) as any;
            if (singularity) {
                singularity.spawn(this.x, this.y, 150 + (this.singularityLevel - 1) * 30);
            }
        }

        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        if (this.trail) {
            this.trail.stop();
        }
        // Impact flash using glow sprite
        if (this.glowSprite && this.glowSprite.visible) {
            const glow = this.glowSprite;
            glow.setPosition(this.x, this.y);
            glow.setAlpha(0.8);
            glow.setScale(7);
            this.scene.tweens.add({
                targets: glow,
                alpha: 0,
                scale: 9,
                duration: 300,
                onComplete: () => { glow.setVisible(false); }
            });
            this.glowSprite = null; // Will be re-created on next fire via pool
        }
    }

    private explode(x: number, y: number) {
        const mainScene = this.scene as any;
        const radius = this.abilityExplosiveRadius > 0
            ? this.abilityExplosiveRadius
            : 80 + (this.explosiveLevel - 1) * 50;
        const explosionDamage = this.damage * 0.5;

        // Spawn explosion effect
        if (mainScene.poolManager) {
            mainScene.poolManager.spawnFireballExplosion(x, y);
        }

        // Damage all enemies in radius
        const nearby = mainScene.spatialGrid?.findNearby({ x, y, width: 0, height: 0 }, radius) || [];
        this.hitExplosionEnemies.clear();

        for (const entry of nearby) {
            const e = entry.ref as Enemy;
            if (e && e.active && !e.getIsDead() && !this.hitExplosionEnemies.has(e)) {
                this.hitExplosionEnemies.add(e);

                if (mainScene.networkManager?.role === 'client') {
                    e.predictDamage(explosionDamage);
                    if (mainScene.poolManager) {
                        mainScene.poolManager.getDamageText(e.x, e.y - 30, explosionDamage, '#ffaa00');
                    }
                } else {
                    e.takeDamage(explosionDamage, '#ffaa00');
                }
            }
        }
    }

    update() {
        if (!this.active) return;

        if (this.glowSprite && this.glowSprite.visible) {
            this.glowSprite.setPosition(this.x, this.y);
        }

        // ── MASTERY: Wind Arrows — boost if passing through player trail ──
        const mainScene = this.scene as any;
        if (!this.getData('windBoosted') && mainScene.weaponManager) {
            const levels = (mainScene.registry?.get('upgradeLevels') || {}) as Record<string, number>;
            if ((levels['wind_arrows'] || 0) > 0) {
                const trail = mainScene.weaponManager.windTrailPositions as Array<{x: number, y: number, time: number}>;
                const now = Date.now();
                for (const pos of trail) {
                    if (now - pos.time > 2000) continue;
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, pos.x, pos.y);
                    if (dist < 60) {
                        // Boost arrow
                        this.setData('windBoosted', true);
                        this.damage *= 1.5;
                        if (this.body) {
                            this.body.velocity.x *= 2;
                            this.body.velocity.y *= 2;
                        }
                        this.setTint(0x88ccff);
                        break;
                    }
                }
            }
        }

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }

    public destroy(fromScene?: boolean) {
        if (this.trail) this.trail.destroy();
        if (this.glowSprite) {
            this.glowSprite.destroy();
            this.glowSprite = null;
        }
        super.destroy(fromScene);
    }
}

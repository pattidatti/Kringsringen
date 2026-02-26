import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';

export class LightningBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private targetEnemy: Enemy | null = null;
    private hitEnemies: Set<Enemy> = new Set();
    private bouncesLeft: number = 1;
    private speed: number = 400;
    private light: Phaser.GameObjects.Light | null = null;
    private impactSprite: Phaser.GameObjects.Sprite | null = null;
    private turnRate: number = 1.2;
    private targetSearchTimer: number = 0;
    private glowEffect: any = null;
    private currentAngle: number = 0;
    private lifespan: number = 2500; // 2.5 sekunder
    private colorHex: number = 0xffffff;
    private colorStr: string = '#ffffff';
    private colorVariant: 'white' | 'blue' = 'white';
    private flashTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'lightning_projectile');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(16, 16);
        this.setDepth(200);
        if (this.scene.lights.active) this.setPipeline('Light2D');

        // Setup overlap detection with enemies
        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_bolt, enemy) => {
            if (!this.active) return;
            this.impact(enemy as Enemy);
        });

        // Setup overlap detection with boss
        if (mainScene.bossGroup) {
            scene.physics.add.overlap(this, mainScene.bossGroup, (_bolt, boss) => {
                if (!this.active) return;
                this.impact(boss as Enemy);
            });
        }
    }

    fire(x: number, y: number, targetX: number, targetY: number, damage: number, bouncesLeft: number, hitEnemies?: Set<Enemy>, initialAngle?: number, colorVariant?: 'white' | 'blue') {
        this.damage = damage;
        this.bouncesLeft = bouncesLeft;
        this.hitEnemies = hitEnemies || new Set();
        this.lifespan = 2500; // Reset lifespan ved hver ny bounce / firing
        this.flashTimer = 0;

        // Determine color variant
        this.colorVariant = colorVariant || (Math.random() < 0.5 ? 'white' : 'blue');
        this.colorHex = this.colorVariant === 'white' ? 0xffffff : 0x0088ff;
        this.colorStr = this.colorVariant === 'white' ? '#ffffff' : '#0088ff';
        const animKey = this.colorVariant === 'white' ? 'lightning-fly-white' : 'lightning-fly-blue';

        // Find nearest active enemy to target position that hasn't been hit
        this.targetEnemy = this.findNearestEnemy(targetX, targetY);

        if (!this.targetEnemy) {
            // No target found, deactivate immediately
            this.setActive(false);
            this.setVisible(false);
            if (this.body) this.body.enable = false;
            return;
        }

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.play(animKey);

        // Add Glow FX - only add once
        if (!this.glowEffect) {
            this.glowEffect = this.postFX.addGlow(this.colorHex, 4, 0, false, 0.1, 10);
        } else {
            this.glowEffect.color = this.colorHex;
        }

        // Add Dynamic Light (remove stale light from pool reuse first)
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        this.light = this.scene.lights.addLight(x, y, 150, this.colorHex, 1.0);

        if (this.body) {
            this.body.enable = true;

            if (initialAngle !== undefined) {
                this.currentAngle = initialAngle;
            } else if (this.targetEnemy) {
                this.currentAngle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
            } else {
                this.currentAngle = 0;
            }

            this.scene.physics.velocityFromRotation(this.currentAngle, this.speed, this.body.velocity);
            this.setRotation(this.currentAngle + Math.PI / 2);
        }
    }

    private findNearestEnemy(searchX: number, searchY: number): Enemy | null {
        const mainScene = this.scene as any;
        const grid = mainScene.spatialGrid;

        let nearest: Enemy | null = null;
        let minDist = Infinity;

        // Use spatial grid to find nearby candidates
        const candidates = grid ? grid.findNearby({ x: searchX, y: searchY, width: 32, height: 32 }, 600) : [];

        if (candidates.length > 0) {
            for (const c of candidates) {
                // BUGFIX: Use c.ref to get the actual Enemy instance
                const e = c.ref as Enemy;
                if (!e || !e.active || e.getIsDead()) continue;
                if (this.hitEnemies.has(e)) continue;

                const dist = Phaser.Math.Distance.Between(searchX, searchY, e.x, e.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = e;
                }
            }
        }

        // Fallback to boss
        if (mainScene.bossGroup) {
            mainScene.bossGroup.children.iterate((e: any) => {
                if (!e.active || e.getIsDead()) return true;
                if (this.hitEnemies.has(e)) return true;

                const dist = Phaser.Math.Distance.Between(searchX, searchY, e.x, e.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = e as Enemy;
                }
                return true;
            });
        }

        // CRITICAL BUGFIX: If no target found yet, ALWAYS do a wide fallback search.
        // The previous condition "candidates.length === 0" was too restrictive.
        if (!nearest) {
            mainScene.enemies.children.iterate((e: any) => {
                const enemy = e as Enemy;
                if (!enemy.active || enemy.getIsDead()) return true;
                if (this.hitEnemies.has(enemy)) return true;

                const dist = Phaser.Math.Distance.Between(searchX, searchY, enemy.x, enemy.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
                return true;
            });
        }

        return nearest;
    }

    private steerTowardTarget(deltaSeconds: number): void {
        if (!this.targetEnemy || !this.body) return;

        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
        this.currentAngle = Phaser.Math.Angle.RotateTo(this.currentAngle, targetAngle, this.turnRate * deltaSeconds);

        this.scene.physics.velocityFromRotation(this.currentAngle, this.speed, this.body.velocity);
        this.setRotation(this.currentAngle + Math.PI / 2);
    }

    update(_time: number, delta: number) {
        if (!this.active) return;

        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.deactivate();
            return;
        }

        this.flashTimer += delta;
        if (this.flashTimer >= 400) { // Bytt farge/sprite hver 100ms for skikkelig lyn-effekt
            this.flashTimer = 0;
            this.toggleColor();
        }

        const deltaSeconds = delta / 1000;

        // Update light position
        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }

        // Check if target is still valid
        if (!this.targetEnemy || !this.targetEnemy.active || this.targetEnemy.getIsDead()) {
            this.targetSearchTimer += delta;
            if (this.targetSearchTimer >= 100) { // Throttle search
                this.targetSearchTimer = 0;
                this.targetEnemy = this.findNearestEnemy(this.x, this.y);
                if (!this.targetEnemy) {
                    this.deactivate();
                    return;
                }
            }
        }

        if (this.targetEnemy) {
            // Steer toward target
            this.steerTowardTarget(deltaSeconds);
        }

        // Check if close enough to target to trigger impact
        const target = this.targetEnemy;
        if (target) {
            const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
            if (distToTarget < 30) {
                this.impact(target);
            }
        }
    }

    private impact(hitEnemy: Enemy): void {
        if (!this.active) return;

        const hitX = this.x;
        const hitY = this.y;

        const mainScene = this.scene as any;
        if (mainScene.networkManager?.role === 'client') {
            mainScene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: {
                    type: 'projectile_hit_request',
                    data: {
                        projectileType: 'lightning',
                        targetId: hitEnemy.id || 'boss',
                        hitX: hitX,
                        hitY: hitY,
                        damage: this.damage,
                        timestamp: mainScene.networkManager.getServerTime()
                    }
                },
                ts: mainScene.networkManager.getServerTime()
            });

            if (mainScene.poolManager && hitEnemy) {
                mainScene.poolManager.getDamageText(hitEnemy.x, hitEnemy.y - 30, this.damage, this.colorStr);
                this.scene.events.emit('enemy-hit');
            }
            if (hitEnemy) hitEnemy.predictDamage(this.damage);
        } else {
            // Deal damage
            hitEnemy.takeDamage(this.damage, this.colorStr);
            hitEnemy.pushback(this.x, this.y, 150);
        }

        // Add to hit set
        this.hitEnemies.add(hitEnemy);

        // Spawn impact animation sprite via pool
        if (mainScene.poolManager) {
            this.impactSprite = mainScene.poolManager.spawnLightningImpact(hitX, hitY);
        } else {
            this.impactSprite = this.scene.add.sprite(hitX, hitY, 'lightning_impact');
            this.impactSprite.play('lightning-impact');
            this.impactSprite.setScale(1.5);
            this.impactSprite.setDepth(199);
            if (this.scene.lights.active) this.impactSprite.setPipeline('Light2D');
        }

        // Impact light handling — only for final bolt in chain (no bounces remaining)
        if (this.bouncesLeft === 0) {
            // Final impact — reuse travel light as impact flash
            if (this.light) {
                const light = this.light; // Capture for use in tween callback
                light.setPosition(hitX, hitY).setRadius(250).setIntensity(2.0);
                this.scene.tweens.add({
                    targets: light,
                    intensity: 0,
                    radius: 350,
                    duration: 300,
                    onComplete: () => {
                        if (light) this.scene.lights.removeLight(light);
                    }
                });
                this.light = null;  // Null immediately to prevent double cleanup on pool reuse
            }
            // Deactivate sprite but keep light for tween
            this.setActive(false);
            this.setVisible(false);
            if (this.body) this.body.enable = false;
            this.postFX.clear();
            this.glowEffect = null;
            this.impactSprite = null;
        } else {
            // Bouncing to next target — normal deactivate (removes travel light)
            this.deactivate();
        }

        // Play impact sound
        AudioManager.instance.playSFX('fireball_hit');

        // Chain to next target if bounces remaining
        if (this.bouncesLeft > 0) {
            this.scene.time.delayedCall(150, () => {
                const nextTarget = this.findNearestEnemy(hitX, hitY);
                if (nextTarget) {
                    const mainScene = this.scene as any;
                    const bolt = mainScene.lightningBolts.get(hitX, hitY) as LightningBolt;
                    if (bolt) {
                        const dmgMult = mainScene.registry.get('lightningDamageMulti') || 1;
                        const damage = this.damage * dmgMult;
                        bolt.fire(hitX, hitY, nextTarget.x, nextTarget.y, damage, this.bouncesLeft - 1, this.hitEnemies, undefined, this.colorVariant);
                    }
                }
            });
        }

        // Cleanup impact sprite logic (pool handles it now)
        if (!mainScene.poolManager) {
            this.impactSprite?.once('animationcomplete-lightning-impact', () => {
                if (this.impactSprite) {
                    this.impactSprite.destroy();
                    this.impactSprite = null;
                }
            });
        }
    }

    private deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        this.postFX.clear();
        this.glowEffect = null;
        this.impactSprite = null;
    }

    private toggleColor(): void {
        this.colorVariant = this.colorVariant === 'white' ? 'blue' : 'white';
        this.colorHex = this.colorVariant === 'white' ? 0xffffff : 0x0088ff;
        this.colorStr = this.colorVariant === 'white' ? '#ffffff' : '#0088ff';

        const animKey = this.colorVariant === 'white' ? 'lightning-fly-white' : 'lightning-fly-blue';

        // Spill av ny animasjon (fortsett på nåværende frame/tid om mulig for smooth loop, selv om fargen hopper)
        this.play({ key: animKey }, true);

        if (this.light) {
            this.light.setColor(this.colorHex);
        }

        if (this.glowEffect) {
            this.glowEffect.color = this.colorHex;
        }
    }
}

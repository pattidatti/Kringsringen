import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';

export class Arrow extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 800;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private light: Phaser.GameObjects.Light | null = null;
    private glowEffect: Phaser.FX.Glow | null = null;
    private speed: number = 700;
    private pierceCount: number = 0;
    private hitEnemies: WeakSet<any> = new WeakSet();
    private hitCount: number = 0;
    private explosiveLevel: number = 0;
    private singularityLevel: number = 0;

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
            e.takeDamage(this.damage, '#ffffff');
            e.pushback(this.startX, this.startY, 150);
        }

        // Handle explosion on impact
        if (this.explosiveLevel > 0) {
            this.explode(e.x, e.y);
        }

        // Check if pierce count exceeded
        // pierceCount = 0 means hit 1 enemy then stop, 1 = hit 2 enemies, etc
        if (this.hitCount > this.pierceCount) {
            this.hit();
        }
    }

    fire(x: number, y: number, angle: number, damage: number, speed: number = 700, pierceCount: number = 0, explosiveLevel: number = 0, singularityLevel: number = 0) {
        this.startX = x;
        this.startY = y;
        this.damage = damage;
        this.speed = speed;
        this.pierceCount = pierceCount;
        this.explosiveLevel = explosiveLevel;
        this.singularityLevel = singularityLevel;
        this.hitEnemies = new WeakSet();
        this.hitCount = 0;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);
        if (this.scene.lights.active) this.setPipeline('Light2D');

        // Add glow post-FX (reuse on pool recycle)
        if (!this.glowEffect) {
            this.glowEffect = this.postFX.addGlow(0xffdd88, 3, 0, false, 0.1, 8);
        }

        // Add dynamic light
        if (this.scene.lights.active) {
            if (this.light) {
                this.scene.lights.removeLight(this.light);
                this.light = null;
            }
            this.light = this.scene.lights.addLight(x, y, 150, 0xffdd88, 0.8);
        }

        if (this.trail) {
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
        if (this.light) {
            this.scene.lights.removeLight(this.light);
            this.light = null;
        }
    }

    private explode(x: number, y: number) {
        const mainScene = this.scene as any;
        const radius = 80 + (this.explosiveLevel - 1) * 50;
        const explosionDamage = this.damage * 0.5;

        // Spawn explosion effect
        const explosion = mainScene.poolManager?.getExplosion();
        if (explosion) {
            explosion.explode(x, y);
        }

        // Damage all enemies in radius
        const enemies = mainScene.spatialGrid?.getNearby(x, y, radius) || [];
        const hitExplosionEnemies = new WeakSet<any>();
        for (const enemy of enemies) {
            const e = enemy as Enemy;
            if (!hitExplosionEnemies.has(e)) {
                hitExplosionEnemies.add(e);
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

        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

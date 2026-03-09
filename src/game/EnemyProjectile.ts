import Phaser from 'phaser';
import { AudioManager } from './AudioManager';

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 800;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private light: Phaser.GameObjects.Light | null = null;
    private glowSprite: Phaser.GameObjects.Sprite | null = null;
    private projectileType: 'arrow' | 'fireball' | 'frostball' = 'arrow';
    private isBurstProjectile: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow'); // Default texture

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(200);
    }

    fire(x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball' | 'frostball', isBurst = false) {
        this.startX = x;
        this.startY = y;
        this.damage = damage;
        this.projectileType = type;

        this.isBurstProjectile = isBurst;
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);

        if (this.body) {
            this.body.enable = true;
            (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
        }

        if (type === 'fireball' || type === 'frostball') {
            if (type === 'fireball') {
                this.setTexture('wizard');
                this.play('wizard-fireball-fly');
                this.setScale(1.5); // Slightly larger for the new fireball from sprite
            } else {
                this.setTexture('wizard_fireball');
                this.play('frost-wizard-projectile-fly');
                this.setScale(1.2);
            }

            this.setBodySize(20, 20);

            const tint = type === 'fireball' ? 0xffaa00 : 0x00ffff;
            const followTexture = type === 'fireball' ? 'wizard' : 'wizard_fireball';

            // Pool trail emitter: create once, reuse on subsequent fires
            if (!this.trail) {
                this.trail = this.scene.add.particles(x, y, followTexture, {
                    lifespan: 200,
                    scale: { start: 0.5, end: 0 },
                    alpha: { start: 0.5, end: 0 },
                    frequency: 25,
                    follow: this,
                    tint: tint,
                    blendMode: 'ADD'
                });
                this.trail.setDepth(this.depth - 1);
            } else {
                this.trail.setPosition(x, y);
                this.trail.resume();
            }

            // Non-burst fireball/frostball: use light budget for PointLight
            if (!this.isBurstProjectile) {
                if (this.light) {
                    const vis = (this.scene as any).visuals;
                    if (vis) vis.releaseProjectileLight(this.light);
                    else this.scene.lights.removeLight(this.light);
                    this.light = null;
                }
                const vis = (this.scene as any).visuals;
                this.light = vis ? vis.requestProjectileLight(x, y, 150, tint, 0.33) : null;
            }

            // postFX glow er GPU-only og trygt for burst. clear() forhindrer stacking på poolede objekter.
            const mainSceneFB = this.scene as any;
            if (mainSceneFB.graphicsQuality !== 'low') {
                this.postFX.clear();
                const glowStrength = this.isBurstProjectile ? 6 : 4;
                this.postFX.addGlow(tint, glowStrength, 0, false, 0.1, 10);
            }
        } else {
            this.setTexture('arrow');
            this.play(`${this.projectileType}-proj-anim`);
            this.setScale(1.5);
            this.setDepth(150);

            if (this.scene.lights.active) this.setPipeline('Light2D');

            this.setBodySize(20, 10);

            // Pool trail emitter: create once, reuse on subsequent fires
            if (!this.trail) {
                this.trail = this.scene.add.particles(x, y, 'arrow', {
                    lifespan: 120,
                    scale: { start: 0.3, end: 0 },
                    alpha: { start: 0.4, end: 0 },
                    frequency: 20,
                    follow: this,
                    tint: 0xcccccc,
                    blendMode: 'ADD'
                });
                this.trail.setDepth(this.depth - 1);
            } else {
                this.trail.setPosition(x, y);
                this.trail.resume();
            }

            // Use cheap additive glow sprite instead of PointLight for arrows
            if (!this.isBurstProjectile && this.scene.textures.exists('glow-soft')) {
                if (!this.glowSprite) {
                    this.glowSprite = this.scene.add.sprite(x, y, 'glow-soft');
                    this.glowSprite.setBlendMode(Phaser.BlendModes.ADD);
                    this.glowSprite.setDepth(this.depth - 1);
                }
                this.glowSprite.setPosition(x, y);
                this.glowSprite.setTint(0xffffff);
                this.glowSprite.setAlpha(0.15);
                this.glowSprite.setScale(2.5); // ~80px radius
                this.glowSprite.setVisible(true);
            }

            const mainSceneArrow = this.scene as any;
            if (mainSceneArrow.graphicsQuality !== 'low') {
                this.postFX.clear();
                this.postFX.addGlow(0xffffff, 2, 0, false, 0.05, 5);
            }
        }

        if (this.body) {
            this.body.enable = true;
            (this.body as Phaser.Physics.Arcade.Body).reset(x, y);

            const speed = type === 'fireball' ? 350 : 500;
            // Explicitly set velocity after ensuring body is enabled and reset
            this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
        }
    }

    private hit() {
        if (!this.active) return;

        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;

        // Pool trail emitter: stop but keep for reuse (don't destroy)
        if (this.trail) {
            this.trail.stop();
        }

        // Release light from budget
        if (this.light) {
            const vis = (this.scene as any).visuals;
            if (vis) vis.releaseProjectileLight(this.light);
            else this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        if (this.glowSprite) {
            this.glowSprite.setVisible(false);
        }
        this.postFX.clear();

        if (this.projectileType === 'fireball' || this.projectileType === 'frostball') {
            const mainScene = this.scene as any;
            if (mainScene.poolManager) {
                if (this.projectileType === 'frostball') {
                    mainScene.poolManager.spawnFrostExplosion(this.x, this.y);
                    AudioManager.instance.playSFX('ice_throw'); // Frosty hit sound
                } else {
                    mainScene.poolManager.spawnFireballExplosion(this.x, this.y);
                    AudioManager.instance.playSFX('fireball_hit');
                }
            }
        } else {
            AudioManager.instance.playSFX('bow_impact');
        }

        // Return to pool
        const mainScene = this.scene as any;
        if (mainScene.poolManager) {
            mainScene.poolManager.returnEnemyProjectile(this);
        }
    }

    public onHitPlayer(player: any) {
        if (!this.active) return;

        // Emit hit event to handle damage logic in main scene
        this.scene.events.emit('enemy-hit-player', this.damage, this.projectileType, this.x, this.y, player);
        this.hit();
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }
        if (this.glowSprite && this.glowSprite.visible) {
            this.glowSprite.setPosition(this.x, this.y);
        }

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }

    public destroy(fromScene?: boolean) {
        if (this.trail) this.trail.destroy();
        if (this.light) {
            const vis = (this.scene as any).visuals;
            if (vis) vis.releaseProjectileLight(this.light);
            else this.scene.lights.removeLight(this.light);
            this.light = null;
        }
        if (this.glowSprite) {
            this.glowSprite.destroy();
            this.glowSprite = null;
        }
        super.destroy(fromScene);
    }
}

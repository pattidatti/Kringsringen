import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyConfig } from '../config/enemies';
import { GAME_CONFIG, type EnemyType } from '../config/GameConfig';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private targetStart: Phaser.GameObjects.Components.Transform; // Renamed to avoid confusion with internal target
    public hp: number = 50;
    private maxHP: number = 50;
    private hpBar: Phaser.GameObjects.Graphics;
    private isDead: boolean = false;
    private attackRange: number = 60;
    private attackCooldown: number = 1500;
    private lastAttackTime: number = 0;
    private isAttacking: boolean = false;
    public hasHit: boolean = false;
    private readonly DAMAGE_FRAME: number = 3; // Frame where damage occurs
    public isOnDamageFrame: boolean = false;
    private isPushingBack: boolean = false;
    private movementSpeed: number = 100;
    private enemyType: string = 'orc';
    private config: EnemyConfig;

    // Static Buffers for AI (GC Hardening)
    private static readonly NUM_RAYS = 8;
    private static readonly INTEREST_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);
    private static readonly DANGER_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);

    public get damage(): number {
        return this.config.baseDamage; // Will be updated in reset
    }

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform, multiplier: number = 1.0, type: string = 'orc') {
        super(scene, x, y, 'orc-idle'); // Default texture, will be set in reset

        // Temporary init to satisfy TS, real init happens in reset() or if created via new (legacy support)
        this.targetStart = target;
        this.config = ENEMY_TYPES['orc'];

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.hpBar = scene.add.graphics();

        // If called with new(), we should initialize. If pooled, reset() will be called.
        // For now, we assume this might be called directly or via pool.
        // Best practice for Phaser pooling: Constructor does minimal setup, Spawn/Reset does logic.

        this.reset(x, y, target, multiplier, type);
    }

    public reset(x: number, y: number, target: Phaser.GameObjects.Components.Transform, multiplier: number = 1.0, type: string = 'orc') {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(x, y);
        this.setAlpha(1);
        this.setTint(0xffffff);
        this.clearTint();
        this.setRotation(0);

        this.targetStart = target;
        this.enemyType = type;
        this.config = ENEMY_TYPES[type] || ENEMY_TYPES['orc'];

        // Get Balance Config from GameConfig
        const configKey = type.toUpperCase() as EnemyType;
        const balanceStats = GAME_CONFIG.ENEMIES[configKey] || GAME_CONFIG.ENEMIES.ORC;

        // Apply Stats
        this.maxHP = Math.floor(balanceStats.baseHP * multiplier);
        this.hp = this.maxHP;
        this.movementSpeed = balanceStats.baseSpeed * (1 + (multiplier - 1) * 0.1); // Slightly less scaling on speed
        this.attackRange = balanceStats.attackRange;
        this.attackCooldown = balanceStats.attackCooldown;

        // Physics & Scale
        this.setScale(balanceStats.scale);
        this.setBodySize(balanceStats.bodySize.width, balanceStats.bodySize.height, true);
        const offsetY = (this.height * 0.5) - (balanceStats.bodySize.height * 0.5);
        this.setOffset(this.body!.offset.x, offsetY + 10);
        this.setDrag(0);

        // State Flags
        this.isDead = false;
        this.isAttacking = false;
        this.hasHit = false;
        this.isPushingBack = false;
        this.isOnDamageFrame = false;
        this.lastAttackTime = 0;
        this.lastAIUpdate = 0;

        // Animation
        this.setTexture(this.config.spriteInfo.texture);
        if (this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims) {
            this.play(this.config.spriteInfo.anims.walk);
        }

        // Animation Listeners (Clean previous listeners to avoid duplicates if not careful, 
        // but Phaser usually handles 'on' by adding. We should check if listener exists or just use internal flags)
        // Better: Define one-time listeners in constructor, but their logic needs to check current state.

        // Reset HP Bar
        this.updateHPBar();
    }

    private lastAIUpdate: number = 0;
    private readonly AI_UPDATE_INTERVAL: number = 100;

    preUpdate(time: number, delta: number) {
        // Pooling Check
        if (!this.active) return;

        super.preUpdate(time, delta);
        if (this.isDead || this.isPushingBack) return;
        if (!this.body) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, (this.targetStart as any).x, (this.targetStart as any).y);
        const hasAttackAnim = this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims?.attack;

        if (hasAttackAnim && distance < this.attackRange && time > this.lastAttackTime + this.attackCooldown) {
            this.isAttacking = true;
            this.lastAttackTime = time;
            this.setVelocity(0, 0);
            if (this.config.spriteInfo.anims?.attack) {
                this.hasHit = false;
                this.play(this.config.spriteInfo.anims.attack);

                // Attack animation completion handler
                this.once(`animationcomplete-${this.config.spriteInfo.anims.attack}`, () => {
                    if (this.active) {
                        this.isAttacking = false;
                        if (!this.isDead && this.config.spriteInfo.anims?.walk) {
                            this.play(this.config.spriteInfo.anims.walk);
                        }
                    }
                });

                // Attack start handler
                this.once(`animationstart-${this.config.spriteInfo.anims.attack}`, () => {
                    this.hasHit = false;
                });
            }
        }

        if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            // Throttled AI
            if (time > this.lastAIUpdate + this.AI_UPDATE_INTERVAL) {
                this.lastAIUpdate = time;
                this.updateAIPathing();
            }

            if (this.body.velocity.x !== 0) {
                this.setFlipX(this.body.velocity.x < 0);
            }
        }

        // Damage Frame Logic (Decoupled from Physics)
        if (this.isAttacking && hasAttackAnim && this.anims.currentAnim?.key === this.config.spriteInfo.anims?.attack) {
            const currentFrameIndex = this.anims.currentFrame?.index || 0;

            // Check for Damage Frame
            if (currentFrameIndex === this.DAMAGE_FRAME && !this.hasHit) {
                const target = this.targetStart as any;
                if (target && target.active) {
                    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                    // Allow slightly more range than attackRange to feel fair (the swing has reach)
                    if (distance <= this.attackRange + 10) {
                        this.hasHit = true;
                        this.scene.events.emit('enemy-hit-player', this.damage, this.enemyType, this.x, this.y);
                    }
                }
            }
        }

        this.updateHPBar();
    }

    private updateAIPathing() {
        if (!this.active) return;
        const speed = this.movementSpeed;
        const numRays = Enemy.NUM_RAYS;
        const rayLength = 80;

        // Zero out the static buffers instead of allocating `new Array()`
        for (let i = 0; i < numRays; i++) {
            Enemy.INTEREST_BUFFER[i] = 0;
            Enemy.DANGER_BUFFER[i] = 0;
        }

        const interests = Enemy.INTEREST_BUFFER;
        const dangers = Enemy.DANGER_BUFFER;

        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, (this.targetStart as any).x, (this.targetStart as any).y);

        // Interest
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            let dot = Math.cos(angle - targetAngle);
            interests[i] = Math.max(0, dot);
        }

        // Dangers (Obstacles)
        const obstacles = (this.scene as any).obstacles as Phaser.Physics.Arcade.StaticGroup;
        if (obstacles) {
            obstacles.getChildren().forEach((obs: any) => {
                if (!obs.active) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, obs.x, obs.y);
                if (dist < rayLength) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, obs.x, obs.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        let dot = Math.cos(rayAngle - ang);
                        if (dot > 0.7) {
                            dangers[i] = Math.max(dangers[i], dot * (1 - dist / rayLength));
                        }
                    }
                }
            });
        }

        // Separation using Spatial Grid
        const grid = (this.scene as any).spatialGrid; // Access grid from scene
        if (grid) {
            const neighbors = grid.findNearby({
                x: this.x,
                y: this.y,
                width: this.body!.width,
                height: this.body!.height
            }, 50); // Look for neighbors within 50px

            for (const neighbor of neighbors) {
                // Approximate distance check since grid returns candidates

                // Skip self check is hard without ID, but valid coordinates check works
                if (Math.abs(neighbor.x - this.x) < 1 && Math.abs(neighbor.y - this.y) < 1) continue;

                const dist = Phaser.Math.Distance.Between(this.x, this.y, neighbor.x, neighbor.y);
                if (dist < 40) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, neighbor.x, neighbor.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        let dot = Math.cos(rayAngle - ang);
                        if (dot > 0.5) {
                            dangers[i] = Math.max(dangers[i], dot * 0.5);
                        }
                    }
                }
            }
        }

        // Direction
        let bestDir = -1;
        let maxScore = -1;

        for (let i = 0; i < numRays; i++) {
            const score = interests[i] - dangers[i];
            if (score > maxScore) {
                maxScore = score;
                bestDir = i;
            }
        }

        if (bestDir !== -1) {
            const moveAngle = (bestDir / numRays) * Math.PI * 2;
            this.setVelocity(
                Math.cos(moveAngle) * speed,
                Math.sin(moveAngle) * speed
            );
        }
    }

    private updateHPBar() {
        this.hpBar.clear();
        if (this.isDead || !this.active) return;

        const width = 40;
        const height = 5;
        const x = this.x - width / 2;
        const y = this.y - (this.height / 2 * this.scaleX) - 5;

        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(x, y, width, height);

        const healthWidth = (Math.max(0, this.hp) / this.maxHP) * width;
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(x, y, healthWidth, height);
    }

    takeDamage(amount: number) {
        if (this.isDead || !this.active) return;

        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active && !this.isDead) this.clearTint();
        });

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.getDamageText(this.x, this.y - 30, amount);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.isDead = true;
        this.setDrag(1000);
        this.hpBar.clear();
        this.setTint(0x444444);

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.spawnBloodEffect(this.x, this.y);
        }

        this.emit('dead', this.x, this.y);
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.disable();
            }
        });
    }

    private disable() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        // Do not destroy, keep in pool
    }

    public pushback(sourceX: number, sourceY: number, force: number = 400) {
        if (!this.active || this.isDead) return;

        const balanceStats = GAME_CONFIG.ENEMIES[this.enemyType.toUpperCase() as EnemyType];
        const resistance = balanceStats ? balanceStats.knockbackResistance : 0;

        const netForce = Math.max(0, force * (1 - resistance));

        if (netForce < 10) return;

        this.isPushingBack = true;
        this.isAttacking = false;

        this.clearTint();
        this.setTint(0xffffff);

        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.x, this.y);
        this.setVelocity(
            Math.cos(angle) * netForce,
            Math.sin(angle) * netForce
        );

        this.scene.time.delayedCall(200, () => {
            if (!this.active) return;
            this.isPushingBack = false;

            if (this.isDead) {
                this.setTint(0x444444);
            } else {
                this.clearTint();
                if (this.config.spriteInfo.anims?.walk) {
                    this.play(this.config.spriteInfo.anims.walk);
                }
            }
        });
    }
}

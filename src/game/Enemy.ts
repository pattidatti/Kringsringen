import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyConfig } from '../config/enemies';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private target: Phaser.GameObjects.Components.Transform;
    public hp: number = 50;
    private maxHP: number = 50;
    private hpBar: Phaser.GameObjects.Graphics;
    private isDead: boolean = false;
    private attackRange: number = 60;
    private attackCooldown: number = 1500;
    private lastAttackTime: number = 0;
    private isAttacking: boolean = false;
    public hasHit: boolean = false;
    public isOnDamageFrame: boolean = false;
    private isPushingBack: boolean = false;
    private movementSpeed: number = 100;
    private config: EnemyConfig;

    public get damage(): number {
        return this.config.baseDamage;
    }

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform, multiplier: number = 1.0, type: string = 'orc') {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES['orc'];

        super(scene, x, y, config.spriteInfo.texture);
        this.config = config;
        this.target = target;

        // Scale stats
        this.maxHP = Math.floor(config.baseHP * multiplier);
        this.hp = this.maxHP;
        this.movementSpeed = config.baseSpeed * (1 + (multiplier - 1) * 0.2);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(config.scale);
        this.setCollideWorldBounds(true);
        this.setBodySize(config.bodySize.width, config.bodySize.height, true);

        const offsetY = (this.height * 0.5) - (config.bodySize.height * 0.5);
        this.setOffset(this.body!.offset.x, offsetY + 10);

        // Animation Handling
        if (config.spriteInfo.type === 'spritesheet' && config.spriteInfo.anims) {
            this.play(config.spriteInfo.anims.walk);
        } else {
            this.scene.tweens.add({
                targets: this,
                scaleY: config.scale * 0.9,
                scaleX: config.scale * 1.1,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        this.hpBar = scene.add.graphics();
        this.updateHPBar();

        if (config.spriteInfo.anims?.attack) {
            this.on(`animationstart-${config.spriteInfo.anims.attack}`, () => {
                this.hasHit = false;
            });

            this.on(`animationcomplete-${config.spriteInfo.anims.attack}`, () => {
                this.isAttacking = false;
                if (!this.isDead && config.spriteInfo.anims?.walk) {
                    this.play(config.spriteInfo.anims.walk);
                }
            });
        }
    }

    private lastAIUpdate: number = 0;
    private readonly AI_UPDATE_INTERVAL: number = 100; // Run AI every 100ms

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.isDead || this.isPushingBack) return;
        if (!this.body) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);
        const hasAttackAnim = this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims?.attack;

        if (hasAttackAnim && distance < this.attackRange && time > this.lastAttackTime + this.attackCooldown) {
            this.isAttacking = true;
            this.lastAttackTime = time;
            this.setVelocity(0, 0);
            if (this.config.spriteInfo.anims?.attack) {
                this.play(this.config.spriteInfo.anims.attack);
            }
        }

        if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            // Throttled AI Update
            if (time > this.lastAIUpdate + this.AI_UPDATE_INTERVAL) {
                this.lastAIUpdate = time;
                this.updateAIPathing();
            }

            // Allow flipX to update every frame for visual responsiveness
            if (this.body.velocity.x !== 0) {
                this.setFlipX(this.body.velocity.x < 0);
            }
        }

        // Damage Frame
        if (this.isAttacking && hasAttackAnim && this.anims.currentAnim?.key === this.config.spriteInfo.anims?.attack) {
            this.isOnDamageFrame = this.anims.currentFrame?.index === 3;
        } else {
            this.isOnDamageFrame = !hasAttackAnim;
        }

        this.updateHPBar();
    }

    private updateAIPathing() {
        // Smarter Pathing: Context Steering
        const speed = this.movementSpeed;
        const numRays = 8;
        const rayLength = 80;
        const interests = new Array(numRays).fill(0);
        const dangers = new Array(numRays).fill(0);

        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);

        // 1. Interest
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            let dot = Math.cos(angle - targetAngle);
            interests[i] = Math.max(0, dot);
        }

        // 2. Danger (Obstacles)
        const obstacles = (this.scene as any).obstacles as Phaser.Physics.Arcade.StaticGroup;
        if (obstacles) {
            obstacles.getChildren().forEach((obs: any) => {
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

        // 3. Separation
        const enemies = (this.scene as any).enemies as Phaser.Physics.Arcade.Group;
        if (enemies) {
            enemies.getChildren().forEach((enemy: any) => {
                if (enemy === this) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < 40) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        let dot = Math.cos(rayAngle - ang);
                        if (dot > 0.5) {
                            dangers[i] = Math.max(dangers[i], dot * 0.5);
                        }
                    }
                }
            });
        }

        // 4. Direction
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
        if (this.isDead) return;

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
        if (this.isDead) return;

        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        // Use Object Pool for Damage Text
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
        this.hpBar.destroy();
        this.setTint(0x444444);

        // Use Object Pool for Blood
        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.spawnBloodEffect(this.x, this.y);
        }

        this.emit('dead', this.x, this.y);
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    public pushback(sourceX: number, sourceY: number, force: number = 400) {
        // Calculate Resistance
        const resistance = this.config.knockbackResistance || 0;
        // Reduce force by resistance
        const netForce = Math.max(0, force * (1 - resistance));

        if (netForce < 10) return; // Immune to small forces

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

import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private target: Phaser.GameObjects.Components.Transform;
    public hp: number = 50;
    private maxHP: number = 50;
    private hpBar: Phaser.GameObjects.Graphics;
    private isDead: boolean = false;
    private attackRange: number = 80;
    private attackCooldown: number = 1500;
    private lastAttackTime: number = 0;
    private isAttacking: boolean = false;
    public hasHit: boolean = false;
    public isOnDamageFrame: boolean = false;
    private isPushingBack: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        super(scene, x, y, 'orc-idle');
        this.target = target;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2);
        this.setCollideWorldBounds(true);
        this.setBodySize(20, 20);
        this.setOffset(40, 70);

        this.play('orc-walk');

        this.hpBar = scene.add.graphics();
        this.updateHPBar();

        this.on('animationstart-orc-attack', () => {
            this.hasHit = false;
        });

        this.on('animationcomplete-orc-attack', () => {
            this.isAttacking = false;
            if (!this.isDead) this.play('orc-walk');
        });
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.isDead || this.isPushingBack) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);

        if (distance < this.attackRange && time > this.lastAttackTime + this.attackCooldown) {
            this.isAttacking = true;
            this.lastAttackTime = time;
            this.setVelocity(0, 0);
            this.play('orc-attack');
        }

        if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            // Smarter Pathing: Context Steering
            const speed = 100;
            const numRays = 8;
            const rayLength = 80;
            const interests = new Array(numRays).fill(0);
            const dangers = new Array(numRays).fill(0);

            const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);

            // 1. Calculate Interest (towards target)
            for (let i = 0; i < numRays; i++) {
                const angle = (i / numRays) * Math.PI * 2;
                let dot = Math.cos(angle - targetAngle);
                interests[i] = Math.max(0, dot);
            }

            // 2. Calculate Danger (obstacles)
            const obstacles = (this.scene as any).obstacles as Phaser.Physics.Arcade.StaticGroup;
            if (obstacles) {
                obstacles.getChildren().forEach((obs: any) => {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, obs.x, obs.y);
                    if (dist < rayLength) {
                        const ang = Phaser.Math.Angle.Between(this.x, this.y, obs.x, obs.y);
                        for (let i = 0; i < numRays; i++) {
                            const rayAngle = (i / numRays) * Math.PI * 2;
                            let dot = Math.cos(rayAngle - ang);
                            if (dot > 0.7) { // Narrow detection for obstacles
                                dangers[i] = Math.max(dangers[i], dot * (1 - dist / rayLength));
                            }
                        }
                    }
                });
            }

            // 3. Calculate Separation (other enemies)
            const enemies = (this.scene as any).enemies as Phaser.Physics.Arcade.Group;
            if (enemies) {
                enemies.getChildren().forEach((enemy: any) => {
                    if (enemy === this) return;
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    if (dist < 40) { // Separation radius
                        const ang = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                        for (let i = 0; i < numRays; i++) {
                            const rayAngle = (i / numRays) * Math.PI * 2;
                            let dot = Math.cos(rayAngle - ang);
                            if (dot > 0.5) {
                                dangers[i] = Math.max(dangers[i], dot * 0.5); // Add danger from other enemies
                            }
                        }
                    }
                });
            }

            // 4. Choose best direction
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

            this.setFlipX(this.body!.velocity.x < 0);
        }

        if (this.isAttacking && this.anims.currentAnim?.key === 'orc-attack') {
            this.isOnDamageFrame = this.anims.currentFrame?.index === 3;
        } else {
            this.isOnDamageFrame = false;
        }

        this.updateHPBar();
    }

    private updateHPBar() {
        this.hpBar.clear();
        if (this.isDead) return;

        const width = 40;
        const height = 5;
        const x = this.x - width / 2;
        const y = this.y - 40;

        // Background
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(x, y, width, height);

        // Health
        const healthWidth = (this.hp / this.maxHP) * width;
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(x, y, healthWidth, height);
    }

    takeDamage(amount: number) {
        if (this.isDead) return;

        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        // Floating Damage Number
        const damageText = this.scene.add.text(this.x, this.y - 30, `${Math.round(amount)}`, {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        damageText.setDepth(2000);

        this.scene.tweens.add({
            targets: damageText,
            y: this.y - 80,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.out',
            onComplete: () => damageText.destroy()
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0);
        this.hpBar.destroy();
        this.setTint(0x444444);

        // Blood effect
        const bloodKey = `blood_${Phaser.Math.Between(1, 5)}`;
        const blood = this.scene.add.sprite(this.x, this.y, bloodKey);
        blood.setScale(1.5); // Slightly larger than enemy for visibility
        blood.play(bloodKey);
        blood.on('animationcomplete', () => blood.destroy());

        // Simple fade out
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
        if (this.isDead) return;

        this.isPushingBack = true;
        this.isAttacking = false;
        this.clearTint();
        this.setTint(0xffffff); // Flash white

        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.x, this.y);
        this.setVelocity(
            Math.cos(angle) * force,
            Math.sin(angle) * force
        );

        this.scene.time.delayedCall(200, () => {
            this.isPushingBack = false;
            this.clearTint();
            if (!this.isDead) this.play('orc-walk');
        });
    }
}

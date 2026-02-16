import Phaser from 'phaser';

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

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        super(scene, x, y, 'orc-idle');
        this.target = target;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2);
        this.setCollideWorldBounds(true);
        this.setBodySize(30, 40);

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
        if (this.isDead) return;

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
            // Simple follow AI
            const speed = 100;
            const angle = Phaser.Math.Angle.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);

            this.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            this.setFlipX(this.body!.velocity.x < 0);
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

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0);
        this.hpBar.destroy();
        this.setTint(0x444444);

        // Simple fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });
    }
}

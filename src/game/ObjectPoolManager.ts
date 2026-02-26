import { EnemyProjectile } from './EnemyProjectile';

export class ObjectPoolManager {
    private scene: Phaser.Scene;
    private damageTextPool: Phaser.GameObjects.Text[] = [];
    private bloodPool: Phaser.GameObjects.Sprite[] = [];
    private explosionPool: Phaser.GameObjects.Sprite[] = [];
    private frostExplosionPool: Phaser.GameObjects.Sprite[] = [];
    private enemyProjectilePool: EnemyProjectile[] = [];

    // Config
    private readonly MAX_TEXT_POOL = 50;
    private readonly MAX_BLOOD_POOL = 50;
    private readonly MAX_EXPLOSION_POOL = 20;
    private readonly MAX_PROJECTILE_POOL = 30;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public getDamageText(x: number, y: number, amount: number | string, color: string = '#ffffff'): Phaser.GameObjects.Text {
        let text: Phaser.GameObjects.Text;
        const textStr = typeof amount === 'number' ? Math.round(amount).toString() : amount;

        if (this.damageTextPool.length > 0) {
            text = this.damageTextPool.pop()!;
            text.setText(textStr);
            text.setColor(color);
            text.setPosition(x, y);
            text.setActive(true);
            text.setVisible(true);
            text.setAlpha(1);
            text.setScale(0.4); // Start small for pop effect
        } else {
            text = this.scene.add.text(x, y, textStr, {
                fontSize: '32px', // Larger font
                color: color,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5, // Thicker stroke
                fontFamily: '"Cinzel", serif'
            }).setOrigin(0.5);
            text.setDepth(2000);
            text.setScale(0.4);
        }

        const driftX = Phaser.Math.Between(-30, 30);

        // Pop and Drift Animation
        this.scene.tweens.add({
            targets: text,
            scale: { from: 0.4, to: 1.4 },
            duration: 100,
            ease: 'Back.out',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: text,
                    scale: 1.0,
                    y: y - 80,
                    x: x + driftX,
                    alpha: 0,
                    duration: 700,
                    ease: 'Cubic.out',
                    onComplete: () => {
                        this.returnDamageText(text);
                    }
                });
            }
        });

        return text;
    }

    private returnDamageText(text: Phaser.GameObjects.Text) {
        if (this.damageTextPool.length < this.MAX_TEXT_POOL) {
            text.setActive(false);
            text.setVisible(false);
            this.damageTextPool.push(text);
        } else {
            text.destroy();
        }
    }

    public spawnBloodEffect(x: number, y: number) {
        let blood: Phaser.GameObjects.Sprite;
        const bloodKey = `blood_${Phaser.Math.Between(1, 5)}`;

        if (this.bloodPool.length > 0) {
            blood = this.bloodPool.pop()!;
            blood.setTexture(bloodKey);
            blood.setPosition(x, y);
            blood.setActive(true);
            blood.setVisible(true);
            blood.setAlpha(1);
            blood.setScale(1.5);
        } else {
            blood = this.scene.add.sprite(x, y, bloodKey);
            blood.setScale(1.5);
        }

        blood.play(bloodKey);
        blood.once('animationcomplete', () => {
            this.returnBlood(blood);
        });
    }

    private returnBlood(blood: Phaser.GameObjects.Sprite) {
        if (this.bloodPool.length < this.MAX_BLOOD_POOL) {
            blood.setActive(false);
            blood.setVisible(false);
            this.bloodPool.push(blood);
        } else {
            blood.destroy();
        }
    }

    public spawnFireballExplosion(x: number, y: number) {
        let explosion: Phaser.GameObjects.Sprite;

        if (this.explosionPool.length > 0) {
            explosion = this.explosionPool.pop()!;
            explosion.setPosition(x, y);
            explosion.setActive(true);
            explosion.setVisible(true);
            explosion.setAlpha(1);
        } else {
            explosion = this.scene.add.sprite(x, y, 'fireball_explosion');
            explosion.setScale(2);
            explosion.setDepth(500);
            explosion.postFX.addGlow(0xff6600, 4, 0.5, false, 0.1, 20);
        }

        explosion.play('fireball-explode');
        explosion.once('animationcomplete', () => {
            this.returnExplosion(explosion);
        });
    }

    private returnExplosion(explosion: Phaser.GameObjects.Sprite) {
        if (this.explosionPool.length < this.MAX_EXPLOSION_POOL) {
            explosion.setActive(false);
            explosion.setVisible(false);
            this.explosionPool.push(explosion);
        } else {
            explosion.destroy();
        }
    }

    public spawnFrostExplosion(x: number, y: number) {
        let explosion: Phaser.GameObjects.Sprite;

        if (this.frostExplosionPool.length > 0) {
            explosion = this.frostExplosionPool.pop()!;
            explosion.setPosition(x, y);
            explosion.setActive(true);
            explosion.setVisible(true);
            explosion.setAlpha(1);
        } else {
            explosion = this.scene.add.sprite(x, y, 'frost_explosion');
            explosion.setScale(2);
            explosion.setDepth(500);
            explosion.postFX.addGlow(0x00aaff, 4, 0.5, false, 0.1, 20);
        }

        explosion.play('frost-explode');
        explosion.once('animationcomplete', () => {
            this.returnFrostExplosion(explosion);
        });
    }

    private returnFrostExplosion(explosion: Phaser.GameObjects.Sprite) {
        if (this.frostExplosionPool.length < this.MAX_EXPLOSION_POOL) {
            explosion.setActive(false);
            explosion.setVisible(false);
            this.frostExplosionPool.push(explosion);
        } else {
            explosion.destroy();
        }
    }

    public getEnemyProjectile(x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball'): EnemyProjectile {
        let projectile: EnemyProjectile;

        if (this.enemyProjectilePool.length > 0) {
            projectile = this.enemyProjectilePool.pop()!;
            projectile.fire(x, y, angle, damage, type);
        } else {
            projectile = new EnemyProjectile(this.scene, x, y);
            projectile.fire(x, y, angle, damage, type);
        }

        return projectile;
    }

    public returnEnemyProjectile(projectile: EnemyProjectile) {
        if (this.enemyProjectilePool.length < this.MAX_PROJECTILE_POOL) {
            projectile.setActive(false);
            projectile.setVisible(false);
            if (projectile.body) projectile.body.enable = false;
            this.enemyProjectilePool.push(projectile);
        } else {
            projectile.destroy();
        }
    }
}

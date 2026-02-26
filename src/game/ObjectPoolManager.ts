import { EnemyProjectile } from './EnemyProjectile';

export class ObjectPoolManager {
    private scene: Phaser.Scene;
    private damageTextPool: Phaser.GameObjects.Text[] = [];
    private bloodPool: Phaser.GameObjects.Sprite[] = [];
    private explosionPool: Phaser.GameObjects.Sprite[] = [];
    private frostExplosionPool: Phaser.GameObjects.Sprite[] = [];
    private lightningImpactPool: Phaser.GameObjects.Sprite[] = [];
    private enemyProjectilePool: EnemyProjectile[] = [];
    private activeDamageTexts: { text: Phaser.GameObjects.Text, startTime: number, x: number, y: number, driftX: number }[] = [];

    // Config
    private readonly MAX_TEXT_POOL = 100;
    private readonly MAX_BLOOD_POOL = 50;
    private readonly MAX_EXPLOSION_POOL = 30;
    private readonly MAX_PROJECTILE_POOL = 50;

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

        // MANUAL ANIMATION TRACKING (GC Optimization)
        this.activeDamageTexts.push({
            text,
            startTime: this.scene.time.now,
            x,
            y,
            driftX
        });

        return text;
    }

    public update() {
        const now = this.scene.time.now;

        for (let i = this.activeDamageTexts.length - 1; i >= 0; i--) {
            const entry = this.activeDamageTexts[i];
            const elapsed = now - entry.startTime;

            if (elapsed < 100) {
                // Pop phase
                const f = elapsed / 100;
                entry.text.setScale(0.4 + 1.0 * f);
            } else if (elapsed < 800) {
                // Drift phase
                const f = (elapsed - 100) / 700;
                entry.text.setScale(1.4 - 0.4 * f);
                entry.text.setY(entry.y - 80 * f);
                entry.text.setX(entry.x + entry.driftX * f);
                entry.text.setAlpha(1 - f);
            } else {
                // Done
                this.returnDamageText(entry.text);
                this.activeDamageTexts.splice(i, 1);
            }
        }
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

            if ((this.scene as any).quality?.bloomEnabled) {
                explosion.postFX.addGlow(0xff6600, 4, 0.5, false, 0.1, 20);
            }
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

            if ((this.scene as any).quality?.bloomEnabled) {
                explosion.postFX.addGlow(0x00aaff, 4, 0.5, false, 0.1, 20);
            }
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

    public spawnLightningImpact(x: number, y: number): Phaser.GameObjects.Sprite {
        let impact: Phaser.GameObjects.Sprite;

        if (this.lightningImpactPool.length > 0) {
            impact = this.lightningImpactPool.pop()!;
            impact.setPosition(x, y);
            impact.setActive(true);
            impact.setVisible(true);
            impact.setAlpha(1);
        } else {
            impact = this.scene.add.sprite(x, y, 'lightning_impact');
            impact.setScale(1.5);
            impact.setDepth(199);
            if (this.scene.lights.active) impact.setPipeline('Light2D');
        }

        impact.play('lightning-impact');
        impact.once('animationcomplete', () => {
            this.returnLightningImpact(impact);
        });

        return impact;
    }

    private returnLightningImpact(impact: Phaser.GameObjects.Sprite) {
        if (this.lightningImpactPool.length < this.MAX_EXPLOSION_POOL) { // Reuse MAX_EXPLOSION_POOL for simplicity
            impact.setActive(false);
            impact.setVisible(false);
            this.lightningImpactPool.push(impact);
        } else {
            impact.destroy();
        }
    }

    public getEnemyProjectile(x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball' | 'frostball'): EnemyProjectile {
        let projectile: EnemyProjectile;
        const mainScene = this.scene as any;
        const group = mainScene.enemyProjectiles;

        if (this.enemyProjectilePool.length > 0) {
            projectile = this.enemyProjectilePool.pop()!;
        } else {
            projectile = new EnemyProjectile(this.scene, x, y);
            if (group) group.add(projectile);
        }

        projectile.fire(x, y, angle, damage, type);
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

    public setLightingEnabled(enabled: boolean) {
        const resetOrSet = (obj: any) => {
            if (enabled) {
                if ('setPipeline' in obj && typeof obj.setPipeline === 'function') obj.setPipeline('Light2D');
            } else {
                if ('resetPipeline' in obj && typeof obj.resetPipeline === 'function') obj.resetPipeline();
            }
        };

        this.lightningImpactPool.forEach(resetOrSet);
        this.enemyProjectilePool.forEach(resetOrSet);
    }
}

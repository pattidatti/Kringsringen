import { EnemyProjectile } from './EnemyProjectile';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
import { LightningBolt } from './LightningBolt';
import { Singularity } from './Singularity';
import { EclipseWake } from './EclipseWake';
import { Coin } from './Coin';
import { Decoy } from './Decoy';
import { Trap } from './Trap';
import { SonicBolt } from './SonicBolt';
import type { IMainScene } from './IMainScene';
import { PerformanceManager } from './PerformanceManager';

export class ObjectPoolManager {
    private scene: Phaser.Scene;
    private damageTextPool: Phaser.GameObjects.Text[] = [];
    private bloodPool: Phaser.GameObjects.Sprite[] = [];
    private explosionPool: Phaser.GameObjects.Sprite[] = [];
    private frostExplosionPool: Phaser.GameObjects.Sprite[] = [];
    private lightningImpactPool: Phaser.GameObjects.Sprite[] = [];
    private enemyProjectilePool: EnemyProjectile[] = [];
    private activeDamageTexts: { text: Phaser.GameObjects.Text, startTime: number, x: number, y: number, driftX: number }[] = [];
    private activeEffects: Phaser.GameObjects.Sprite[] = [];
    private activeBloodCount = 0;

    // Config
    private readonly MAX_TEXT_POOL = 100;
    private readonly MAX_BLOOD_POOL = 50;
    private readonly MAX_EXPLOSION_POOL = 30;
    private readonly MAX_PROJECTILE_POOL = 80;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public initializeGroups() {
        const mainScene = this.scene as IMainScene;
        const groups: any = {
            enemies: { classType: Enemy, maxSize: 100 },
            bossGroup: { classType: BossEnemy, maxSize: 1 },
            arrows: { classType: Arrow, maxSize: 50 },
            fireballs: { classType: Fireball, maxSize: 30 },
            frostBolts: { classType: FrostBolt, maxSize: 20 },
            lightningBolts: { classType: LightningBolt, maxSize: 30 },
            singularities: { classType: Singularity, maxSize: 10 },
            eclipseWakes: { classType: EclipseWake, maxSize: 20 },
            sonicBolts: { classType: SonicBolt, maxSize: 30 },
            coins: { classType: Coin, maxSize: 5000 },
            enemyProjectiles: { classType: EnemyProjectile, maxSize: 50 },
            decoys: { classType: Decoy, maxSize: 10 },
            traps: { classType: Trap, maxSize: 20 }
        };
        Object.keys(groups).forEach(key => {
            (mainScene as any)[key] = this.scene.physics.add.group({ ...groups[key], runChildUpdate: true });
        });
    }

    public getDamageText(x: number, y: number, amount: number | string, color: string = '#ffffff'): Phaser.GameObjects.Text | null {
        // Off-screen culling — skip if not visible to camera
        const cam = this.scene.cameras.main;
        if (!PerformanceManager.isInView(cam, x, y)) return null;

        // Damage text cap from PerformanceManager
        const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
        const maxTexts = pm?.maxDamageTexts ?? 100;
        if (this.activeDamageTexts.length >= maxTexts) return null;

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
            text.setDepth(5000);
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

    public update(delta: number = 16.6) {
        const now = this.scene.time.now;
        const deltaFactor = delta / 16.6; // Normalize to 60fps

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
                // Use delta for smoother drift during stutters
                entry.text.y -= (80 / 700 * 16.6) * deltaFactor;
                entry.text.x += (entry.driftX / 700 * 16.6) * deltaFactor;
                entry.text.setAlpha(1 - f);
            } else {
                // Done
                this.returnDamageText(entry.text);
                this.activeDamageTexts.splice(i, 1);
            }
        }

        // Optimized effect cleanup without listeners
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            if (!effect.active || !effect.anims.isPlaying) {
                this.returnEffect(effect);
                this.activeEffects.splice(i, 1);
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
        // Off-screen culling
        if (!PerformanceManager.isInView(this.scene.cameras.main, x, y)) return;

        // Blood VFX cap from PerformanceManager
        const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
        if (this.activeBloodCount >= (pm?.maxBloodEffects ?? 50)) return;

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
            blood.setDepth(1000);
        }

        blood.play(bloodKey);
        this.activeEffects.push(blood);
        this.activeBloodCount++;
    }

    private returnEffect(sprite: Phaser.GameObjects.Sprite) {
        const tex = sprite.texture.key;
        if (tex.startsWith('blood')) this.returnBlood(sprite);
        else if (tex === 'fireball_explosion') this.returnExplosion(sprite);
        else if (tex === 'frost_explosion') this.returnFrostExplosion(sprite);
        else if (tex === 'lightning_impact') this.returnLightningImpact(sprite);
        else {
            sprite.setActive(false).setVisible(false);
        }
    }

    private returnBlood(blood: Phaser.GameObjects.Sprite) {
        this.activeBloodCount = Math.max(0, this.activeBloodCount - 1);
        if (this.bloodPool.length < this.MAX_BLOOD_POOL) {
            blood.setActive(false);
            blood.setVisible(false);
            this.bloodPool.push(blood);
        } else {
            blood.destroy();
        }
    }

    public spawnFireballExplosion(x: number, y: number, customRadius?: number) {
        // Off-screen culling
        if (!PerformanceManager.isInView(this.scene.cameras.main, x, y)) return;

        let explosion: Phaser.GameObjects.Sprite;

        const currentRadius = customRadius || (this.scene as any).registry.get('fireballRadius') || 80;
        const finalScale = 2 * (currentRadius / 80);

        if (this.explosionPool.length > 0) {
            explosion = this.explosionPool.pop()!;
            explosion.setPosition(x, y);
            explosion.setActive(true);
            explosion.setVisible(true);
            explosion.setAlpha(1);
            explosion.setScale(finalScale);
        } else {
            explosion = this.scene.add.sprite(x, y, 'fireball_explosion');
            explosion.setScale(finalScale);
            explosion.setDepth(500);

            const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
            if ((this.scene as any).quality?.bloomEnabled && (!pm || pm.bloomEnabled)) {
                explosion.postFX.addGlow(0xff6600, 4, 0.5, false, 0.1, 20);
            }
        }

        explosion.play('fireball-explode');
        this.activeEffects.push(explosion);
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

    public spawnFrostExplosion(x: number, y: number, customRadius?: number) {
        // Off-screen culling
        if (!PerformanceManager.isInView(this.scene.cameras.main, x, y)) return;

        let explosion: Phaser.GameObjects.Sprite;

        const currentRadius = customRadius || (this.scene as any).registry.get('frostRadius') || 80;
        const finalScale = 2 * (currentRadius / 80);

        if (this.frostExplosionPool.length > 0) {
            explosion = this.frostExplosionPool.pop()!;
            explosion.setPosition(x, y);
            explosion.setActive(true);
            explosion.setVisible(true);
            explosion.setAlpha(1);
            explosion.setScale(finalScale);
        } else {
            explosion = this.scene.add.sprite(x, y, 'frost_explosion');
            explosion.setScale(finalScale);
            explosion.setDepth(500);

            const pm = (this.scene as any).performanceManager as PerformanceManager | undefined;
            if ((this.scene as any).quality?.bloomEnabled && (!pm || pm.bloomEnabled)) {
                explosion.postFX.addGlow(0x00aaff, 4, 0.5, false, 0.1, 20);
            }
        }

        explosion.play('frost-explode');
        this.activeEffects.push(explosion);
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

    public spawnLightningImpact(x: number, y: number): Phaser.GameObjects.Sprite | null {
        // Off-screen culling
        if (!PerformanceManager.isInView(this.scene.cameras.main, x, y)) return null;

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
        }

        impact.play('lightning-impact');
        this.activeEffects.push(impact);
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

    public getEnemyProjectile(x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball' | 'frostball', isBurst = false): EnemyProjectile {
        let projectile: EnemyProjectile;
        const mainScene = this.scene as any;
        const group = mainScene.enemyProjectiles;

        if (this.enemyProjectilePool.length > 0) {
            projectile = this.enemyProjectilePool.pop()!;
        } else {
            projectile = new EnemyProjectile(this.scene, x, y);
        }

        if (group) group.add(projectile);
        projectile.fire(x, y, angle, damage, type, isBurst);
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

    // Lighting is handled by screen-space lightmap — no per-sprite pipeline switching needed.
}

import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class LightningBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private targetEnemy: Enemy | null = null;
    private hitEnemies: Set<Enemy> = new Set();
    private bouncesLeft: number = 1;
    private speed: number = 400;
    private light: Phaser.GameObjects.Light | null = null;
    private impactSprite: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'lightning_projectile');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(16, 16);
        this.setDepth(200);
        this.setPipeline('Light2D');

        // Setup overlap detection with enemies
        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_bolt, enemy) => {
            if (!this.active) return;
            this.impact(enemy as Enemy);
        });
    }

    fire(x: number, y: number, targetX: number, targetY: number, damage: number, bouncesLeft: number, hitEnemies?: Set<Enemy>) {
        this.damage = damage;
        this.bouncesLeft = bouncesLeft;
        this.hitEnemies = hitEnemies || new Set();

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
        this.play('lightning-fly');

        // Add Glow FX (yellow for lightning)
        this.postFX.addGlow(0xffff00, 4, 0, false, 0.1, 10);

        // Add Dynamic Light
        this.light = this.scene.lights.addLight(x, y, 150, 0xffff00, 1.0);

        if (this.body) {
            this.body.enable = true;
            // Initial velocity toward target
            this.steerTowardTarget();
        }
    }

    private findNearestEnemy(searchX: number, searchY: number): Enemy | null {
        const mainScene = this.scene as any;
        let nearest: Enemy | null = null;
        let minDist = Infinity;

        mainScene.enemies.children.iterate((e: any) => {
            if (!e.active) return true;
            if (this.hitEnemies.has(e)) return true;

            const dist = Phaser.Math.Distance.Between(searchX, searchY, e.x, e.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = e as Enemy;
            }
            return true;
        });

        return nearest;
    }

    private steerTowardTarget(): void {
        if (!this.targetEnemy || !this.body) return;

        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
        this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        this.setRotation(angle);
    }

    update() {
        if (!this.active) return;

        // Update light position
        if (this.light) {
            this.light.setPosition(this.x, this.y);
        }

        // Check if target is still valid
        if (!this.targetEnemy || !this.targetEnemy.active) {
            this.targetEnemy = this.findNearestEnemy(this.x, this.y);
            if (!this.targetEnemy) {
                // No more targets, deactivate
                this.deactivate();
                return;
            }
        }

        // Steer toward target
        this.steerTowardTarget();

        // Check if close enough to target to trigger impact
        const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
        if (distToTarget < 30) {
            this.impact(this.targetEnemy);
        }
    }

    private impact(hitEnemy: Enemy): void {
        if (!this.active) return;

        const hitX = this.x;
        const hitY = this.y;

        // Deal damage
        hitEnemy.takeDamage(this.damage, '#ffff00');
        hitEnemy.pushback(this.x, this.y, 150);

        // Add to hit set
        this.hitEnemies.add(hitEnemy);

        // Deactivate this bolt
        this.deactivate();

        // Spawn impact animation sprite (separate from this bolt)
        this.impactSprite = this.scene.add.sprite(hitX, hitY, 'lightning_impact');
        this.impactSprite.play('lightning-impact');
        this.impactSprite.setScale(1.5);
        this.impactSprite.setDepth(199);
        this.impactSprite.setPipeline('Light2D');

        // Impact light
        const flash = this.scene.lights.addLight(hitX, hitY, 250, 0xffff00, 2.0);
        this.scene.tweens.add({
            targets: flash,
            intensity: 0,
            radius: 350,
            duration: 300,
            onComplete: () => {
                this.scene.lights.removeLight(flash);
            }
        });

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
                        bolt.fire(hitX, hitY, nextTarget.x, nextTarget.y, damage, this.bouncesLeft - 1, this.hitEnemies);
                    }
                }
            });
        }

        // Cleanup impact sprite after animation
        this.impactSprite.once('animationcomplete-lightning-impact', () => {
            if (this.impactSprite) {
                this.impactSprite.destroy();
                this.impactSprite = null;
            }
        });
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
        if (this.impactSprite) {
            this.impactSprite.destroy();
            this.impactSprite = null;
        }
    }
}

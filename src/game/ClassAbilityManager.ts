import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import { Enemy } from './Enemy';

/**
 * Manages active class abilities like Whirlwind, Explosive Shot, and Cascade.
 */
export class ClassAbilityManager {
    private scene: IMainScene;

    public isWhirlwinding: boolean = false;
    public explosiveShotReady: boolean = false;
    public cascadeActiveUntil: number = 0;
    public shadowStepUntil: number = 0;
    public classAbilityCooldownEnd: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public attemptAbility2(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateWhirlwind();
        else if (playerClassId === 'wizard') this.activateArcaneSingularity();
        else if (playerClassId === 'archer') this.activateExplosiveShot();
    }

    public attemptSpecialE(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'archer') {
            this.activateArcherSpecial();
        }
    }

    private activateWhirlwind(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const damageMult = 1 + (levels['whirl_damage'] || 0) * 0.25;
        const cdLvl = levels['whirl_cooldown'] || 0;
        const chainLvl = levels['whirl_chain'] || 0;
        const damage = this.scene.stats.damage * damageMult;
        const radius = 120;
        const cd = 8000 * Math.pow(0.8, cdLvl);

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        this.isWhirlwinding = true;
        this.scene.data.set('isWhirlwinding', true);
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        player.play({ key: 'player-attack', repeat: -1 });
        this.scene.events.emit('player-swing');

        // Create the slash effect
        const slash = this.scene.add.sprite(player.x, player.y, 'whirlwind_slash');
        slash.setDepth(player.depth - 1);
        // The texture is 128x128 (radius 64). Scale it so its visual edge matches the damage radius perfectly.
        slash.setScale(radius / 64);
        slash.setBlendMode(Phaser.BlendModes.ADD);

        // Create duration indicator
        const graphics = this.scene.add.graphics();
        graphics.setDepth(player.depth + 10);

        this.scene.tweens.add({
            targets: player,
            rotation: Math.PI * 8, // 4 full rotations over 1000ms
            duration: 1000,
            ease: 'Linear',
            onUpdate: (tween) => {
                if (!this.isWhirlwinding) {
                    tween.stop();
                    slash.destroy();
                    graphics.destroy();
                    return;
                }
                const progress = tween.progress;
                slash.setPosition(player.x, player.y);
                slash.rotation = player.rotation;

                // Draw duration circle indicator
                graphics.clear();
                graphics.lineStyle(4, 0x000000, 0.5);
                graphics.beginPath();
                graphics.arc(player.x, player.y + 35, 14, 0, Math.PI * 2, false);
                graphics.strokePath();

                graphics.lineStyle(3, 0xff4400, 1);
                graphics.beginPath();
                graphics.arc(player.x, player.y + 35, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - progress)), false);
                graphics.strokePath();

                // Avant-Garde Juice: Continuous spark spray during whirlwind
                if (Math.random() < 0.8) {
                    this.scene.swordSparkEmitter.setEmitterAngle({ min: 0, max: 360 });
                    this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y - 15, 2);

                    // Minor screen shake randomly
                    if (Math.random() < 0.2) {
                        this.scene.cameras.main.shake(40, 0.003);
                    }
                }
            },
            onComplete: () => {
                player.setRotation(0);
                slash.destroy();
                graphics.destroy();
                if (this.scene.data.get('isWhirlwinding')) {
                    player.play('player-idle');
                }
            }
        });

        const triggerHit = (color: string) => {
            const px = player.x, py = player.y;
            const hitEnemies = (this.scene.enemies.getChildren() as Enemy[]).filter(e => e.active && Phaser.Math.Distance.Between(px, py, e.x, e.y) <= radius);
            hitEnemies.forEach(e => {
                e.takeDamage(damage, color);
                e.pushback(px, py, this.scene.stats.knockback);
            });
            return hitEnemies;
        };

        // First hit (start)
        triggerHit('#ffcc00');

        // Second hit (500ms)
        this.scene.time.delayedCall(500, () => {
            if (this.isWhirlwinding) triggerHit('#ffaa00');
        });

        // Third hit and end (1000ms)
        this.scene.time.delayedCall(1000, () => {
            if (!this.isWhirlwinding) return;
            const finalHit = triggerHit('#ffaa00');
            if (chainLvl > 0) {
                const reduction = Math.min(finalHit.length * (chainLvl === 1 ? 0.05 : 0.07), chainLvl === 1 ? 0.25 : 0.35);
                this.classAbilityCooldownEnd -= cd * reduction;
                this.scene.registry.set('classAbilityCooldown', {
                    duration: cd,
                    timestamp: this.classAbilityCooldownEnd - cd
                });
            }
            this.isWhirlwinding = false;
            this.scene.data.set('isWhirlwinding', false);
        });
    }

    private activateExplosiveShot(): void {
        this.explosiveShotReady = true;
        this.scene.data.set('explosiveShotReady', true);
        this.scene.registry.set('explosiveShotReady', true);

        // Ensure bow is equipped for the ability
        this.scene.registry.set('currentWeapon', 'bow');

        // Reset cooldown to allow immediate firing
        this.scene.registry.set('weaponCooldown', { duration: 0, timestamp: 0 });

        // Trigger immediate attack
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;

        this.scene.time.delayedCall(500, () => {
            if (!this.scene.data.get('isAttacking')) return; // Could have been interrupted
            const newAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            this.scene.weaponManager.handleWeaponExecution(newAngle);
        });

        this.scene.time.delayedCall(5000, () => {
            if (this.explosiveShotReady) {
                this.explosiveShotReady = false;
                this.scene.data.set('explosiveShotReady', false);
                this.scene.registry.set('explosiveShotReady', false);
            }
        });
    }

    private activateArcaneSingularity(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // Duration: Base 3s, +0.5s per upg
        const duration = (3 + (levels['singularity_duration'] || 0) * 0.5) * 1000;

        // Radius: Base 1, +0.25 per upg
        const radiusMult = 1 + (levels['singularity_radius'] || 0) * 0.25;

        // Damage calculation
        const baseDamage = this.scene.stats.damage * 3; // Huge base damage
        const centerDamageMult = 1 + (levels['singularity_damage'] || 0) * 0.5; // +50% or +100%

        // Damage Reduction (Manaring)
        const manaRingLvl = levels['manaring'] || 0;
        const damageReduction = manaRingLvl > 0 ? (manaRingLvl === 1 ? 0.25 : 0.40) : 0;

        const cd = 12000;

        const pointer = this.scene.input.activePointer;
        const spawnX = pointer.worldX;
        const spawnY = pointer.worldY;

        this.cascadeActiveUntil = Date.now() + duration; // keeping variable name for state consistency if needed
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        const singularity = this.scene.singularities.get(spawnX, spawnY) as import('./Singularity').Singularity | null;
        if (singularity) {
            singularity.spawn(spawnX, spawnY, duration, radiusMult, baseDamage, centerDamageMult, damageReduction);
        }
    }

    private activateArcherSpecial(): void {
        const upgLvls = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const timeSlowLvl = upgLvls['time_slow_arrow'] || 0;
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        if (timeSlowLvl > 0) {
            const slowDuration = 3000 + timeSlowLvl * 1000;
            this.scene.enemies.children.iterate((e: any) => { if (e && e.active) e.applySlow?.(slowDuration); return true; });
            this.scene.bossGroup.children.iterate((boss: any) => { if (boss && boss.active) boss.applySlow?.(slowDuration); return true; });
            this.scene.poolManager.getDamageText(player.x, player.y - 70, 'TIME SLOW!', '#88aaff');
        }
    }
}

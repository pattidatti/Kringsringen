import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import { Enemy } from './Enemy';

/**
 * Manages active class abilities like Whirlwind, Explosive Shot, and Cascade.
 */
export class ClassAbilityManager {
    private scene: IMainScene;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public attemptAbility2(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateWhirlwind();
        else if (playerClassId === 'wizard') this.activateCascade();
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

        this.scene.isWhirlwinding = true;
        this.scene.data.set('isWhirlwinding', true);
        this.scene.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        player.play('player-attack');
        this.scene.events.emit('player-swing');

        this.scene.tweens.add({
            targets: player,
            rotation: Math.PI * 4,
            duration: 500,
            ease: 'Linear',
            onComplete: () => { player.setRotation(0); }
        });

        const px = player.x, py = player.y;
        const hitEnemies = (this.scene.enemies.getChildren() as Enemy[]).filter(e => e.active && Phaser.Math.Distance.Between(px, py, e.x, e.y) <= radius);

        hitEnemies.forEach(e => {
            e.takeDamage(damage, '#ffcc00');
            e.pushback(px, py, this.scene.stats.knockback * 1.5);
        });

        this.scene.time.delayedCall(500, () => {
            hitEnemies.forEach(e => { if (e.active) { e.takeDamage(damage, '#ffaa00'); e.pushback(px, py, this.scene.stats.knockback); } });
            if (chainLvl > 0) {
                const reduction = Math.min(hitEnemies.length * (chainLvl === 1 ? 0.05 : 0.07), chainLvl === 1 ? 0.25 : 0.35);
                this.scene.classAbilityCooldownEnd -= cd * reduction;
            }
            this.scene.isWhirlwinding = false;
            this.scene.data.set('isWhirlwinding', false);
        });
    }

    private activateExplosiveShot(): void {
        this.scene.explosiveShotReady = true;
        this.scene.data.set('explosiveShotReady', true);
        this.scene.registry.set('explosiveShotReady', true);
        this.scene.time.delayedCall(5000, () => {
            if (this.scene.explosiveShotReady) {
                this.scene.explosiveShotReady = false;
                this.scene.data.set('explosiveShotReady', false);
                this.scene.registry.set('explosiveShotReady', false);
            }
        });
    }

    private activateCascade(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const duration = (4 + (levels['cascade_duration'] || 0) * 2) * 1000;
        const cd = 10000;

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        this.scene.cascadeActiveUntil = Date.now() + duration;
        this.scene.classAbilityCooldownEnd = this.scene.cascadeActiveUntil + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: duration + cd, timestamp: Date.now() });

        const cascadeEmitter = this.scene.add.particles(player.x, player.y, 'arrow', {
            lifespan: 1200, speed: { min: 20, max: 50 }, scale: { start: 0.25, end: 0 },
            alpha: { start: 0.5, end: 0 }, angle: { min: 0, max: 360 }, frequency: 40,
            tint: [0xff00ff, 0x00ffff, 0xffff00, 0x88ff00], blendMode: 'ADD', follow: player,
        });

        this.scene.time.delayedCall(duration, () => { cascadeEmitter.destroy(); });
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

import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { BossConfig } from '../config/bosses';
import { AudioManager } from './AudioManager';

/**
 * BossEnemy — extends Enemy with boss-specific stats, abilities, and phase logic.
 * Spawned via a dedicated bossGroup in MainScene (max size 1).
 */
export class BossEnemy extends Enemy {
    private bossConfig!: BossConfig;
    private phase: 1 | 2 = 1;
    private isPhase2Active: boolean = false;
    private abilityTimers: Phaser.Time.TimerEvent[] = [];
    private isCharging: boolean = false;

    /** Called after pooled retrieval to configure this enemy as a boss. */
    public initAsBoss(
        x: number,
        y: number,
        player: Phaser.GameObjects.Components.Transform,
        config: BossConfig
    ): void {
        // Base reset sets up sprite, animations, physics, default stats
        this.reset(x, y, player, 1.0, config.enemyType);
        this.id = 'boss';

        this.bossConfig = config;
        this.phase = 1;
        this.isPhase2Active = false;
        this.isCharging = false;

        // Override stats with boss values
        this.maxHP = config.hp;
        this.hp = config.hp;
        this.movementSpeed = config.speed;
        this.originalSpeed = config.speed;

        // Physics body & scale
        this.setScale(config.scale);
        this.setBodySize(config.bodySize.width, config.bodySize.height, true);
        const offsetY = (this.height * 0.5) - (config.bodySize.height * 0.5);
        this.setOffset(this.body!.offset.x, offsetY + 10);
        this.setDrag(0);

        // Registry
        this.scene.registry.set('bossHP', config.hp);
        this.scene.registry.set('bossMaxHP', config.hp);
        this.scene.registry.set('bossName', config.name);
        this.scene.registry.set('bossPhase', 1);
        this.scene.registry.set('isBossActive', true);

        // Play boss music
        AudioManager.instance.playBGM(config.music);

        // Start ability loop
        this.activateAbilities(false);
    }

    // ── Ability registration ──────────────────────────────────────────────────

    private activateAbilities(phase2: boolean): void {
        this.clearAbilityTimers();
        const p2 = phase2;

        switch (this.bossConfig.enemyType) {
            case 'armored_orc':
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 3000 : 5000, callback: this.performShockwave, callbackScope: this, loop: true })
                );
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 5000 : 8000, callback: this.performCharge, callbackScope: this, loop: true })
                );
                break;

            case 'greatsword_skeleton':
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 4000 : 6000, callback: this.performRaiseDead, callbackScope: this, loop: true })
                );
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 2500 : 4000, callback: this.performBoneVolley, callbackScope: this, loop: true })
                );
                break;

            case 'werewolf':
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 5000 : 8000, callback: this.performFeralHowl, callbackScope: this, loop: true })
                );
                this.abilityTimers.push(
                    this.scene.time.addEvent({ delay: p2 ? 2500 : 4000, callback: this.performPredatorDash, callbackScope: this, loop: true })
                );
                break;
        }
    }

    private clearAbilityTimers(): void {
        this.abilityTimers.forEach(t => t.remove(false));
        this.abilityTimers = [];
    }

    // ── Abilities ─────────────────────────────────────────────────────────────

    private performShockwave(): void {
        if (!this.active || this.isDead) return;

        // Spill shockwave-animasjon (rad 4 av armored_orc.png, frames 36–44)
        this.isAttacking = true;
        this.setVelocity(0, 0);
        this.play('armored-orc-shockwave');
        this.once('animationcomplete-armored-orc-shockwave', () => {
            if (this.active && !this.isDead) {
                this.isAttacking = false;
                this.play('armored-orc-walk');
            }
        });

        const graphics = this.scene.add.graphics();
        const state = { r: 0, alpha: 1.0 };
        const bossX = this.x;
        const bossY = this.y;

        this.scene.tweens.add({
            targets: state,
            r: 200,
            alpha: 0,
            duration: 500,
            onUpdate: () => {
                graphics.clear();
                graphics.lineStyle(4, 0xff6600, state.alpha);
                graphics.strokeCircle(bossX, bossY, state.r);
            },
            onComplete: () => graphics.destroy(),
        });

        // Damage check at midpoint of animation
        this.scene.time.delayedCall(250, () => {
            const player = (this.scene as any).data?.get('player') as any;
            if (!player || !player.active) return;
            const dist = Phaser.Math.Distance.Between(bossX, bossY, player.x, player.y);
            if (dist <= 200) {
                this.scene.events.emit('enemy-hit-player', 20, 'boss_shockwave', bossX, bossY);
            }
        });
    }

    private performCharge(): void {
        if (!this.active || this.isDead || this.isCharging) return;

        const player = (this.scene as any).data?.get('player') as any;
        if (!player || !player.active) return;

        this.isCharging = true;
        const chargeSpeed = this.bossConfig.speed * 3;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

        // Yellow flash telegraphs the charge
        this.setTint(0xffff00);

        this.scene.time.delayedCall(250, () => {
            if (!this.active || this.isDead) { this.isCharging = false; return; }
            this.clearTint();
            this.setVelocity(
                Math.cos(angle) * chargeSpeed,
                Math.sin(angle) * chargeSpeed
            );

            this.scene.time.delayedCall(1200, () => {
                if (this.active) this.isCharging = false;
            });
        });
    }

    private performRaiseDead(): void {
        if (!this.active || this.isDead) return;

        const count = this.phase === 2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spawnX = this.x + Math.cos(angle) * 150;
            const spawnY = this.y + Math.sin(angle) * 150;
            this.scene.events.emit('boss-spawn-minion', spawnX, spawnY, 'skeleton');
        }
    }

    private performBoneVolley(): void {
        if (!this.active || this.isDead) return;

        const player = (this.scene as any).data?.get('player') as any;
        if (!player || !player.active) return;

        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const count = this.phase === 2 ? 5 : 3;
        const spread = 0.35;

        for (let i = 0; i < count; i++) {
            const offset = (i - Math.floor(count / 2)) * spread;
            this.fireBoneProjectile(baseAngle + offset);
        }
    }

    private fireBoneProjectile(angle: number): void {
        const speed = 320;
        const travelDist = speed * 2; // 2-second travel
        const endX = this.x + Math.cos(angle) * travelDist;
        const endY = this.y + Math.sin(angle) * travelDist;

        const circle = this.scene.add.circle(this.x, this.y, 8, 0xdddddd);
        const damage = Math.floor(this.bossConfig.damage * 0.5);

        this.scene.tweens.add({
            targets: circle,
            x: endX,
            y: endY,
            duration: 2000,
            ease: 'Linear',
            onUpdate: () => {
                if (!circle.active) return;
                const player = (this.scene as any).data?.get('player') as any;
                if (!player || !player.active) return;
                const dist = Phaser.Math.Distance.Between(circle.x, circle.y, player.x, player.y);
                if (dist < 32) {
                    this.scene.events.emit('enemy-hit-player', damage, 'bone_projectile', circle.x, circle.y);
                    circle.destroy();
                }
            },
            onComplete: () => {
                if (circle.active) circle.destroy();
            },
        });
    }

    private performFeralHowl(): void {
        if (!this.active || this.isDead) return;

        // Scale pulse to signal howl
        this.scene.tweens.add({
            targets: this,
            scaleX: this.bossConfig.scale * 1.2,
            scaleY: this.bossConfig.scale * 1.2,
            duration: 200,
            yoyo: true,
        });

        const count = this.phase === 2 ? 4 : 3;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spawnX = this.x + Math.cos(angle) * 200;
            const spawnY = this.y + Math.sin(angle) * 200;
            this.scene.events.emit('boss-spawn-minion', spawnX, spawnY, 'werewolf');
        }
    }

    private performPredatorDash(): void {
        if (!this.active || this.isDead) return;

        const player = (this.scene as any).data?.get('player') as any;
        if (!player || !player.active) return;

        // Teleport near player with a brief vanish effect
        const angle = Math.random() * Math.PI * 2;
        const targetX = player.x + Math.cos(angle) * 80;
        const targetY = player.y + Math.sin(angle) * 80;

        this.setAlpha(0.15);
        this.setVelocity(0, 0);

        this.scene.time.delayedCall(300, () => {
            if (!this.active || this.isDead) return;
            this.setPosition(targetX, targetY);
            this.setAlpha(1);
            this.setTint(0xff3333);

            // AoE slam impact
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 100) {
                this.scene.events.emit('enemy-hit-player', Math.floor(this.bossConfig.damage * 0.8), 'predator_dash', this.x, this.y);
            }

            this.scene.time.delayedCall(200, () => {
                if (this.active && !this.isDead) this.clearTint();
            });
        });
    }

    // ── Overrides ─────────────────────────────────────────────────────────────

    takeDamage(amount: number, color: string = '#ffffff'): void {
        super.takeDamage(amount, color);
        if (!this.active) return;

        // Keep registry in sync
        this.scene.registry.set('bossHP', Math.max(0, this.hp));

        // Blood Frenzy passive (Werewolf): gains speed as HP drops
        if (this.bossConfig && this.bossConfig.enemyType === 'werewolf') {
            const missingFraction = 1 - (this.hp / this.maxHP);
            const stacks = Math.floor(missingFraction * 10); // 0–10
            const bonus = Math.min(stacks * 0.05, 0.5);       // cap at +50%
            this.movementSpeed = this.bossConfig.speed * (1 + bonus);
            this.originalSpeed = this.movementSpeed;
        }

        // Phase 2 transition
        if (
            this.bossConfig &&
            this.phase === 1 &&
            this.hp > 0 &&
            this.hp / this.maxHP <= this.bossConfig.phase2Threshold
        ) {
            this.enterPhase2();
        }
    }

    protected die(): void {
        this.clearAbilityTimers();

        this.scene.registry.set('isBossActive', false);
        this.scene.registry.set('bossHP', 0);
        this.scene.events.emit('boss-defeated');

        super.die();
    }

    // ── Phase 2 ───────────────────────────────────────────────────────────────

    private enterPhase2(): void {
        if (this.isPhase2Active) return;
        this.isPhase2Active = true;
        this.phase = 2;

        this.scene.registry.set('bossPhase', 2);

        // Red flash
        this.setTint(0xff2222);
        this.scene.time.delayedCall(600, () => {
            if (this.active && !this.isDead) this.clearTint();
        });

        // Scale pulse
        this.scene.tweens.add({
            targets: this,
            scaleX: this.bossConfig.scale * 1.15,
            scaleY: this.bossConfig.scale * 1.15,
            duration: 350,
            yoyo: true,
        });

        // Orc Warchief enrage: permanent +50% speed
        if (this.bossConfig.enemyType === 'armored_orc') {
            this.movementSpeed = this.bossConfig.speed * 1.5;
            this.originalSpeed = this.movementSpeed;
        }

        // Restart ability timers with phase-2 cooldowns
        this.activateAbilities(true);
    }
}

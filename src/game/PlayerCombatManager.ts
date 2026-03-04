import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';

/**
 * Manages player damage, invincibility frames, and knockback state.
 */
export class PlayerCombatManager {
    private scene: IMainScene;
    private isInvincible: boolean = false;
    /** Absolute timestamp (ms) after which knockback is considered over. Non-stacking. */
    private _knockbackEndTime: number = 0;
    private invincibilityDuration: number = 1000;
    private pendingHPChange: number = 0;
    private regenAccumulator: number = 0;

    /** Active camera blur FX reference – removed after the hit-impact fades. */
    private hitBlurFX: any = null;

    /** Fase 6: iron_will – can only trigger once per level/wave */
    private ironWillUsedThisLevel: boolean = false;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /** Whether the player is currently in knockback recovery */
    get isKnockedBack(): boolean { return Date.now() < this._knockbackEndTime; }

    /** Reset iron_will charge (call at level/wave start) */
    public resetIronWill(): void {
        this.ironWillUsedThisLevel = false;
    }

    /** Handle incoming damage to the player */
    takePlayerDamage(amount: number, srcX?: number, srcY?: number): void {
        if (this.isInvincible) return;

        let hp = this.scene.registry.get('playerHP');
        if (hp <= 0) return;

        const isBlocking = this.scene.data.get('isBlocking') as boolean;
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const armor = this.scene.registry.get('playerArmor') || 0;
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // Armor Reduction: Damage - Armor (min 1)
        let damageAfterArmor = Math.max(1, amount - armor);

        // Block reduces damage by 80%
        let actualDamage = isBlocking ? damageAfterArmor * 0.2 : damageAfterArmor;

        // ── Fase 6: Mana Shield (Wizard) – chance to absorb damage ──────────
        const manaShieldLvl = levels['mana_shield'] || 0;
        if (manaShieldLvl > 0 && Math.random() < manaShieldLvl * 0.30) {
            // Shield absorbs: show feedback but skip damage
            this.scene.poolManager.getDamageText(player.x, player.y - 40, 'MANA SHIELD', '#00aaff');
            // Reduce a spell cooldown by 2s
            const weaponCd = this.scene.registry.get('weaponCooldown') as { duration: number; timestamp: number } | undefined;
            if (weaponCd) {
                this.scene.registry.set('weaponCooldown', { duration: weaponCd.duration, timestamp: weaponCd.timestamp - 2000 });
            }
            // Apply camera shake + red flash for visual feedback even on absorb
            this.scene.cameras.main.shake(100, 0.006);
            return;
        }

        // ── Fase 6: Global Damage Reduction (Wizard Manaring) ──────────────
        const globalDR = this.scene.registry.get('globalDamageReduction') || 0;
        if (globalDR > 0) {
            actualDamage *= (1 - globalDR);
        }

        // Throttled HP update
        this.pendingHPChange -= actualDamage;

        // ── Fase 6: Iron Will (Krieger) – survive lethal hit with 1 HP ──────
        const ironWillLvl = levels['iron_will'] || 0;
        if (ironWillLvl > 0 && !this.ironWillUsedThisLevel && hp + this.pendingHPChange <= 0) {
            this.ironWillUsedThisLevel = true;
            // Clamp to 1 HP
            this.pendingHPChange = -(hp - 1);
            this.scene.poolManager.getDamageText(player.x, player.y - 60, 'JERNVILJE!', '#ffd700');
        }

        // ── Fase 6: Counter Strike (Krieger) – return damage on hit ─────────
        const counterLvl = levels['counter_strike'] || 0;
        if (counterLvl > 0 && Math.random() < counterLvl * 0.20) {
            const nearby = this.scene.spatialGrid.findNearby({ x: player.x, y: player.y, width: 1, height: 1 }, 250);
            if (nearby.length > 0) {
                const target = nearby[0].ref as any;
                if (target && target.takeDamage) {
                    target.takeDamage(actualDamage * counterLvl * 0.25, '#ff4444');
                }
            }
        }

        // ── Fase 6: Blodust (Krieger) – reflect damage to source enemy ──────
        const blodustLvl = levels['blodust'] || 0;
        if (blodustLvl > 0 && srcX !== undefined && srcY !== undefined) {
            const nearSrc = this.scene.spatialGrid.findNearby({ x: srcX, y: srcY, width: 1, height: 1 }, 60);
            if (nearSrc.length > 0) {
                const srcEnemy = nearSrc[0].ref as any;
                if (srcEnemy && srcEnemy.takeDamage) {
                    srcEnemy.takeDamage(actualDamage * blodustLvl * 0.15, '#cc0000');
                }
            }
        }

        // Screen Shake
        this.scene.cameras.main.shake(200, 0.014);

        // Hit-impact blur: brief camera blur that resolves quickly, giving a
        // physical "impact" feel distinct from the red flash overlay.
        this.applyHitBlur();

        // Red screen flash
        const cam = this.scene.cameras.main;
        const flash = (this.scene as unknown as Phaser.Scene).add.rectangle(
            cam.width / 2,
            cam.height / 2,
            cam.width,
            cam.height,
            0xff0000,
            0.35
        ).setDepth(10000).setScrollFactor(0);
        (this.scene as unknown as Phaser.Scene).tweens.add({
            targets: flash,
            alpha: 0,
            duration: 180,
            onComplete: () => flash.destroy()
        });

        // Visual Impact (Blood) - Pooled
        this.scene.poolManager.spawnBloodEffect(player.x, player.y);

        // Damage Number - Pooled
        this.scene.poolManager.getDamageText(player.x, player.y - 40, actualDamage);

        if (!isBlocking) {
            // Knockback — absolute timestamp, never stacks into a permanent freeze
            if (srcX !== undefined && srcY !== undefined) {
                this._knockbackEndTime = Date.now() + 200;
                const angle = Phaser.Math.Angle.Between(srcX, srcY, player.x, player.y);
                player.setVelocity(
                    Math.cos(angle) * this.scene.stats.knockback,
                    Math.sin(angle) * this.scene.stats.knockback
                );
            }

            // I-Frames starts
            this.isInvincible = true;

            // Blinking effect
            const blinkCount = Math.floor(this.invincibilityDuration / 200);
            this.scene.tweens.add({
                targets: player,
                alpha: 0.2,
                duration: 100,
                yoyo: true,
                repeat: blinkCount - 1,
                onComplete: () => {
                    player.setAlpha(1);
                    this.isInvincible = false;
                }
            });
        } else {
            // Block feedback
            player.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => player.clearTint());
        }

        // Check for lethal damage (predicted)
        if (hp + this.pendingHPChange <= 0) {
            this.flushHP(); // Force immediate update to 0

            const isMultiplayer = this.scene.registry.get('isMultiplayer') as boolean;
            if (isMultiplayer) {
                // Ghost Mode: Instead of pausing, emit player-died
                // Provide a flag indicating it was the local player just now dying
                this.scene.events.emit('player-died');
            } else {
                // Single Player: Traditional Game Over
                this.scene.scene.pause();
                this.scene.events.emit('singleplayer-game-over');
            }
        }
    }

    /**
     * Adds a short camera blur that eases back to zero, giving a tactile
     * "screen impact" sensation when the player takes damage.
     * Only one blur instance is kept active at a time.
     */
    private applyHitBlur() {
        const cam = this.scene.cameras.main;

        // Remove any previous hit blur so effects don't stack
        if (this.hitBlurFX) {
            try { cam.postFX.remove(this.hitBlurFX); } catch (_) { /* ignore */ }
            this.hitBlurFX = null;
        }

        // addBlur(quality, x, y, strength, color, steps)
        // quality 0 = low, keeps perf cost minimal
        this.hitBlurFX = cam.postFX.addBlur(0, 2, 2, 1.2);

        (this.scene as unknown as Phaser.Scene).tweens.add({
            targets: this.hitBlurFX,
            strength: 0,
            duration: 280,
            ease: 'Cubic.out',
            onComplete: () => {
                try { cam.postFX.remove(this.hitBlurFX); } catch (_) { /* ignore */ }
                this.hitBlurFX = null;
            }
        });
    }

    /**
     * Periodically called to accumulate health regeneration and apply pending HP changes.
     */
    public update(_time: number, delta: number) {
        this.regenAccumulator += delta;
        if (this.regenAccumulator >= 1000) {
            this.regenAccumulator -= 1000;
            const regenAmount = this.scene.registry.get('playerRegen') || 0;
            const currentHP = this.scene.registry.get('playerHP') || 0;
            if (regenAmount > 0 && currentHP > 0) {
                // Apply healing through pendingHPChange so it flows naturally through flushHP
                this.pendingHPChange += regenAmount;
            }
        }

        this.flushHP();
    }

    /**
     * Periodically called to apply pending HP changes and notify React (UI).
     * This avoids excessive re-renders when many enemies hit at once.
     */
    public flushHP() {
        if (this.pendingHPChange !== 0) {
            let currentHP = this.scene.registry.get('playerHP');
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            currentHP = Math.max(0, Math.min(maxHP, currentHP + this.pendingHPChange));
            this.scene.registry.set('playerHP', currentHP);
            this.pendingHPChange = 0;
        }
    }

    /** Manually set invincibility frames (used by Dash) */
    public setDashIframe(active: boolean): void {
        this.isInvincible = active;
    }
}

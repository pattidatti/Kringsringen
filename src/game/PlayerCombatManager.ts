import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';

/**
 * Manages player damage, invincibility frames, and knockback state.
 */
export class PlayerCombatManager {
    private scene: IMainScene;
    private isInvincible: boolean = false;
    private _isKnockedBack: boolean = false;
    private invincibilityDuration: number = 1000;
    private pendingHPChange: number = 0;

    /** Active camera blur FX reference – removed after the hit-impact fades. */
    private hitBlurFX: any = null;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /** Whether the player is currently in knockback recovery */
    get isKnockedBack(): boolean { return this._isKnockedBack; }

    /** Handle incoming damage to the player */
    takePlayerDamage(amount: number, srcX?: number, srcY?: number): void {
        if (this.isInvincible) return;

        let hp = this.scene.registry.get('playerHP');
        const isBlocking = this.scene.data.get('isBlocking') as boolean;
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const armor = this.scene.registry.get('playerArmor') || 0;

        // Armor Reduction: Damage - Armor (min 1)
        let damageAfterArmor = Math.max(1, amount - armor);

        // Block reduces damage by 80%
        const actualDamage = isBlocking ? damageAfterArmor * 0.2 : damageAfterArmor;

        // Throttled HP update
        this.pendingHPChange -= actualDamage;

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
        ).setDepth(9999).setScrollFactor(0);
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
            // Knockback
            if (srcX !== undefined && srcY !== undefined) {
                this._isKnockedBack = true;
                const angle = Phaser.Math.Angle.Between(srcX, srcY, player.x, player.y);
                player.setVelocity(
                    Math.cos(angle) * this.scene.stats.knockback,
                    Math.sin(angle) * this.scene.stats.knockback
                );

                // End knockback after a short duration
                this.scene.time.delayedCall(200, () => {
                    this._isKnockedBack = false;
                });
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

        if (hp <= 0) {
            this.scene.scene.pause();
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
     * Periodically called to apply pending HP changes and notify React (UI).
     * This avoids excessive re-renders when many enemies hit at once.
     */
    public flushHP() {
        if (this.pendingHPChange !== 0) {
            let currentHP = this.scene.registry.get('playerHP');
            currentHP = Math.max(0, currentHP + this.pendingHPChange);
            this.scene.registry.set('playerHP', currentHP);
            this.pendingHPChange = 0;
        }
    }
}

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

        hp -= actualDamage;
        this.scene.registry.set('playerHP', Math.max(0, hp));

        // Screen Shake
        this.scene.cameras.main.shake(150, 0.005);

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
}

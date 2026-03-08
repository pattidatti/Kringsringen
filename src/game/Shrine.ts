import Phaser from 'phaser';
import type { ShrineEffectDef } from '../config/shrines';

const DESPAWN_DELAY = 30000; // ms before auto-despawn if not activated

/**
 * A shrine game object rendered as a glowing stone pedestal.
 * Owns all its own graphics and manages its auto-despawn timer.
 * No physics body — proximity is checked via distance in ShrineManager.
 */
export class Shrine extends Phaser.GameObjects.Container {
    public readonly def: ShrineEffectDef;
    private despawnTimer: Phaser.Time.TimerEvent | null = null;
    private orbTween: Phaser.Tweens.Tween | null = null;
    private orb!: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene, x: number, y: number, def: ShrineEffectDef) {
        super(scene, x, y);
        this.def = def;

        this.buildVisuals();
        this.startDespawnTimer();

        scene.add.existing(this);
        this.setDepth(500);
    }

    private buildVisuals(): void {
        const colorHex = '#' + this.def.color.toString(16).padStart(6, '0');

        // ── Stone base ───────────────────────────────────────────────────────
        const base = this.scene.add.graphics();
        base.fillStyle(0x555566, 1);
        base.fillRect(-14, 2, 28, 10);  // wide base
        base.fillRect(-10, -6, 20, 8);  // cap
        this.add(base);

        // ── Glowing orb ──────────────────────────────────────────────────────
        this.orb = this.scene.add.arc(0, -14, 10, 0, 360, false, this.def.color, 1);
        // Specular highlight
        const highlight = this.scene.add.arc(-3, -17, 3, 0, 360, false, 0xffffff, 0.3);
        this.add(this.orb);
        this.add(highlight);

        // Pulse tween on orb y-offset
        this.orbTween = this.scene.tweens.add({
            targets: [this.orb, highlight],
            y: '-=8',
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── Text label (always visible) ───────────────────────────────────────
        const typeLabel = this.def.type === 'blessing' ? '✦ VELSIGNELSE' : '✧ FORBANNELSE';
        const label = this.scene.add.text(0, -36, `${this.def.displayName}\n${typeLabel}`, {
            fontSize: '11px',
            color: colorHex,
            stroke: '#000000',
            strokeThickness: 3,
            fontFamily: '"Cinzel", serif',
            align: 'center'
        }).setOrigin(0.5, 1);
        this.add(label);

        // Interaction prompt — hidden by default, shown when player is nearby
        const prompt = this.scene.add.text(0, 12, '[C] Aktiver', {
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontFamily: '"Cinzel", serif',
            align: 'center'
        }).setOrigin(0.5, 0).setAlpha(0);
        this.add(prompt);
        this.setData('prompt', prompt);
    }

    /** Show or hide the "press C" interaction prompt. */
    public setPromptVisible(visible: boolean): void {
        const prompt = this.getData('prompt') as Phaser.GameObjects.Text | undefined;
        if (prompt) prompt.setAlpha(visible ? 1 : 0);
    }

    /** Cancel the auto-despawn timer (call when activating). */
    public cancelDespawn(): void {
        if (this.despawnTimer) {
            this.despawnTimer.destroy();
            this.despawnTimer = null;
        }
    }

    private startDespawnTimer(): void {
        this.despawnTimer = this.scene.time.delayedCall(DESPAWN_DELAY, () => {
            if (this.active) {
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => { if (this.active) this.destroy(); }
                });
            }
        });
    }

    public destroy(fromScene?: boolean): void {
        this.orbTween?.stop();
        this.orbTween = null;
        this.despawnTimer?.destroy();
        this.despawnTimer = null;
        super.destroy(fromScene);
    }
}

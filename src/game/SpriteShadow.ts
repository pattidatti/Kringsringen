import Phaser from 'phaser';
import type { ShadowMode } from '../config/QualityConfig';

/**
 * Dynamic sprite-based shadow that mirrors its parent's animation frame.
 * Supports three modes:
 * - 'blob': static oval (legacy) — uses the 'shadows' spritesheet
 * - 'silhouette': parent sprite tinted black, fixed position below parent
 * - 'dynamic': silhouette + light-reactive positioning/rotation
 */
export class SpriteShadow {
    private shadow: Phaser.GameObjects.Sprite;
    private parent: Phaser.GameObjects.Sprite;
    private mode: ShadowMode;
    private yOffset: number;

    // Cached for dynamic mode
    private static readonly BASE_SHADOW_LEN = 20;
    private static readonly MIN_SHADOW_LEN = 8;
    private static readonly MAX_SHADOW_LEN = 40;
    private static readonly REFERENCE_DIST = 300;
    private static readonly HALF_PI = Math.PI / 2;

    constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Sprite, mode: ShadowMode, yOffset: number = 0) {
        this.parent = parent;
        this.mode = mode;
        this.yOffset = yOffset;

        if (mode === 'blob') {
            // Legacy oval blob shadow
            this.shadow = scene.add.sprite(parent.x, parent.y + yOffset, 'shadows', 0)
                .setAlpha(0.4)
                .setDepth(parent.depth - 1);
        } else {
            // Silhouette or dynamic: clone parent's texture
            this.shadow = scene.add.sprite(parent.x, parent.y + yOffset, parent.texture.key, parent.frame.name)
                .setTint(0x000000)
                .setAlpha(0.3)
                .setDepth(parent.depth - 1);
            // Shadow stays on default pipeline (lightmap handles scene lighting)
            // Initial flatten
            this.shadow.setScale(parent.scaleX, parent.scaleY * 0.5);
        }
    }

    /**
     * Update shadow position and appearance every frame.
     * @param lightX X position of the primary light source (player)
     * @param lightY Y position of the primary light source (player)
     */
    public update(lightX: number, lightY: number): void {
        if (!this.shadow.visible || !this.parent.active) return;

        if (this.mode === 'blob') {
            this.shadow.setPosition(this.parent.x, this.parent.y + this.yOffset);
            return;
        }

        // Sync animation frame from parent
        const parentFrame = this.parent.frame.name;
        if (this.shadow.frame.name !== parentFrame) {
            this.shadow.setTexture(this.parent.texture.key, parentFrame);
            this.shadow.setTint(0x000000);
        }

        if (this.mode === 'silhouette') {
            // Fixed position below parent, flattened
            this.shadow.setPosition(this.parent.x, this.parent.y + this.yOffset);
            this.shadow.setScale(this.parent.scaleX, this.parent.scaleY * 0.5);
            this.shadow.setRotation(0);
            return;
        }

        // Dynamic mode: react to light source
        const dx = this.parent.x - lightX;
        const dy = this.parent.y - lightY;
        const distSq = dx * dx + dy * dy;

        // If very close to light (player's own shadow), fall back to centered
        if (distSq < 4) {
            this.shadow.setPosition(this.parent.x, this.parent.y + this.yOffset);
            this.shadow.setScale(this.parent.scaleX, this.parent.scaleY * 0.5);
            this.shadow.setRotation(0);
            this.shadow.setAlpha(0.25);
            return;
        }

        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx);

        // Shadow length: closer to light = shorter, farther = longer
        const rawLen = SpriteShadow.BASE_SHADOW_LEN * (dist / SpriteShadow.REFERENCE_DIST);
        const shadowLength = rawLen < SpriteShadow.MIN_SHADOW_LEN
            ? SpriteShadow.MIN_SHADOW_LEN
            : rawLen > SpriteShadow.MAX_SHADOW_LEN
                ? SpriteShadow.MAX_SHADOW_LEN
                : rawLen;

        // Position: offset from feet position in direction away from light
        this.shadow.x = this.parent.x + Math.cos(angle) * shadowLength;
        this.shadow.y = (this.parent.y + this.yOffset) + Math.sin(angle) * shadowLength;

        // Flatten vertically and orient away from light
        this.shadow.setScale(this.parent.scaleX, this.parent.scaleY * 0.5);
        this.shadow.setRotation(angle + SpriteShadow.HALF_PI);

        // Alpha: slightly more opaque farther from light
        const alpha = 0.25 + 0.1 * Math.min(dist / 500, 1);
        this.shadow.setAlpha(alpha);
    }

    public setYOffset(offset: number): void {
        this.yOffset = offset;
    }

    public setVisible(v: boolean): void {
        this.shadow.setVisible(v);
    }

    public setDepth(d: number): void {
        this.shadow.setDepth(d);
    }

    public setPosition(x: number, y: number): void {
        this.shadow.setPosition(x, y);
    }

    /**
     * Dynamically switch shadow rendering mode (used by PerformanceManager degradation).
     * Handles texture swap between blob atlas and parent silhouette.
     */
    public setMode(mode: ShadowMode): void {
        if (mode === this.mode) return;
        const prevMode = this.mode;
        this.mode = mode;

        if (mode === 'blob') {
            // Switch to blob atlas texture
            this.shadow.setTexture('shadows', 0);
            this.shadow.setTint(0xffffff);
            this.shadow.setAlpha(0.4);
            this.shadow.setRotation(0);
            this.shadow.setScale(1);
        } else if (prevMode === 'blob') {
            // Switching FROM blob to silhouette/dynamic — clone parent texture
            this.shadow.setTexture(this.parent.texture.key, this.parent.frame.name);
            this.shadow.setTint(0x000000);
            this.shadow.setAlpha(0.3);
            this.shadow.setRotation(0);
            this.shadow.setScale(this.parent.scaleX, this.parent.scaleY * 0.5);
        }
        // silhouette ↔ dynamic doesn't need texture changes, just mode flag
    }

    public getMode(): ShadowMode {
        return this.mode;
    }

    public destroy(): void {
        this.shadow.destroy();
    }
}

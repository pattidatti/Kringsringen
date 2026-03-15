import Phaser from 'phaser';

/**
 * Lightweight data-only light descriptor. No Phaser GameObjects — just numbers.
 */
export interface LightmapLight {
    x: number;
    y: number;
    radius: number;
    color: number;     // 0xRRGGBB
    intensity: number; // 0–1+ multiplier on alpha
    /** Internal id for budget tracking */
    _id: number;
}

/**
 * RGB Lightmap renderer.
 *
 * Replaces Phaser's per-sprite Light2D pipeline with a single screen-space
 * multiply overlay. Each frame:
 *   1. Clear RenderTexture to the ambient colour (near-black).
 *   2. Stamp the pre-generated `glow-soft` radial gradient texture once per
 *      light, tinted to the light's colour, with ADD blend mode.
 *   3. The resulting RT is displayed as a full-screen sprite with MULTIPLY
 *      blend, darkening unlit areas and preserving lit colours.
 *
 * Performance wins:
 *   - Cost is O(lights) per frame, completely independent of sprite count.
 *   - RT can run at reduced resolution (configurable).
 *   - No per-sprite pipeline switches needed.
 */
export class LightmapRenderer {
    private scene: Phaser.Scene;
    private rt: Phaser.GameObjects.RenderTexture;
    private overlay: Phaser.GameObjects.Image;
    private stamp: Phaser.GameObjects.Image;

    /** All registered lights (player + projectile + enemy attack) */
    private lights: Map<number, LightmapLight> = new Map();
    private nextId = 1;

    /** Resolution scale factor (1 = native, 0.5 = half, etc.) */
    private resolutionScale: number;
    private rtWidth: number;
    private rtHeight: number;

    /** Whether the lightmap is currently active. When false the overlay is hidden. */
    private _enabled: boolean = true;

    constructor(scene: Phaser.Scene, resolutionScale: number = 0.5) {
        this.scene = scene;
        this.resolutionScale = resolutionScale;

        const cam = scene.cameras.main;
        this.rtWidth = Math.ceil(cam.width * resolutionScale);
        this.rtHeight = Math.ceil(cam.height * resolutionScale);

        // Create the off-screen render texture
        this.rt = scene.add.renderTexture(0, 0, this.rtWidth, this.rtHeight);
        this.rt.setVisible(false); // We only use .texture, not the RT itself

        // Create the full-screen overlay image that reads from the RT texture
        this.overlay = scene.add.image(0, 0, this.rt.texture.key);
        this.overlay.setOrigin(0, 0);
        this.overlay.setScrollFactor(0); // fixed to camera
        this.overlay.setBlendMode(Phaser.BlendModes.NORMAL);
        this.overlay.setDepth(9999); // on top of everything
        this.overlay.setScale(1 / resolutionScale);

        // Stamp sprite used to draw each light onto the RT
        this.stamp = scene.add.image(0, 0, 'glow-soft');
        this.stamp.setVisible(false);
    }

    // ─── Public API ─────────────────────────────────────────────────────────────

    /**
     * Register a new light and return its handle.
     * Caller should store the returned LightmapLight and update x/y each frame.
     */
    public addLight(x: number, y: number, radius: number, color: number, intensity: number): LightmapLight {
        const light: LightmapLight = { x, y, radius, color, intensity, _id: this.nextId++ };
        this.lights.set(light._id, light);
        return light;
    }

    /** Remove a previously added light. */
    public removeLight(light: LightmapLight): void {
        this.lights.delete(light._id);
    }

    /** @deprecated No-op — erase approach uses opaque black. Kept for API compat. */
    public setAmbientColor(_color: number): void { /* no-op */ }

    /** Enable or disable the lightmap overlay entirely. */
    public setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        this.overlay.setVisible(enabled);
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    /** Change resolution scale at runtime (e.g. performance degradation). */
    public setResolutionScale(scale: number): void {
        if (scale === this.resolutionScale) return;
        this.resolutionScale = scale;

        const cam = this.scene.cameras.main;
        this.rtWidth = Math.ceil(cam.width * scale);
        this.rtHeight = Math.ceil(cam.height * scale);

        this.rt.resize(this.rtWidth, this.rtHeight);
        this.overlay.setScale(1 / (scale * this.scene.cameras.main.zoom));
    }

    // ─── Per-frame render ───────────────────────────────────────────────────────

    /**
     * Call once per frame in the scene's update().
     * Redraws the lightmap with all active lights.
     */
    public render(): void {
        if (!this._enabled) return;

        const cam = this.scene.cameras.main;
        const scale = this.resolutionScale;

        // Counteract camera zoom on the overlay so it fills exactly the viewport
        this.overlay.setScale(1 / (scale * cam.zoom));

        // 1. Fill with opaque black (the "darkness")
        this.rt.fill(0x000000, 1);

        // The glow-soft texture is 64×64. Each light needs to be drawn at the
        // correct camera-relative position and scaled so its visual radius matches.
        const glowHalf = 32; // half of 64

        const zoom = cam.zoom;

        this.lights.forEach(light => {
            // Camera-relative position, accounting for zoom and RT resolution
            const lx = (light.x - cam.scrollX) * zoom * scale;
            const ly = (light.y - cam.scrollY) * zoom * scale;

            // Scale so the glow circle covers `radius` screen-pixels (world radius * zoom)
            const lightScale = (light.radius * zoom * scale) / glowHalf;

            this.stamp.setAlpha(Math.min(light.intensity, 1));
            this.stamp.setScale(lightScale);

            this.rt.erase(this.stamp, lx, ly);
        });
    }

    // ─── Cleanup ────────────────────────────────────────────────────────────────

    public destroy(): void {
        this.lights.clear();
        this.overlay.destroy();
        this.rt.destroy();
        this.stamp.destroy();
    }
}

import Phaser from 'phaser';

export interface IHpBarTarget {
    x: number;
    y: number;
    hp: number;
    maxHP: number;
    visible: boolean;
    active: boolean;
    scaleX: number;
    scaleY: number;
}

/**
 * Batched HP Bar Renderer.
 * Draws all health bars in a single Graphics pass to minimize draw call flushes.
 */
export class HpBarRenderer {
    private graphics: Phaser.GameObjects.Graphics;
    private static readonly BAR_WIDTH = 40;
    private static readonly BAR_HEIGHT = 4;
    private static readonly BAR_OFFSET_Y = 35;

    constructor(scene: Phaser.Scene) {
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(9999); // Always on top
    }

    /**
     * Renders health bars for a collection of targets.
     * Should be called once per frame in the scene's update loop.
     */
    public render(targets: IHpBarTarget[]) {
        this.graphics.clear();

        for (const target of targets) {
            if (!target.active || !target.visible || target.hp <= 0) {
                continue;
            }

            const scale = Math.abs(target.scaleX);
            const w = HpBarRenderer.BAR_WIDTH * scale;
            const h = HpBarRenderer.BAR_HEIGHT * scale;
            const x = target.x - w / 2;
            const y = target.y - (HpBarRenderer.BAR_OFFSET_Y * scale);

            const hpPercent = Math.max(0, target.hp / target.maxHP);

            // Background (Black)
            this.graphics.fillStyle(0x000000, 0.7);
            this.graphics.fillRect(x, y, w, h);

            // Fill (Red/Green depending on percentage or type)
            const color = hpPercent > 0.4 ? 0x27ae60 : 0xc0392b;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(x, y, w * hpPercent, h);

            // Border (Optional, for extra juice)
            this.graphics.lineStyle(1, 0x000000, 0.3);
            this.graphics.strokeRect(x, y, w, h);
        }
    }

    public destroy() {
        this.graphics.destroy();
    }

    public setVisible(visible: boolean) {
        this.graphics.setVisible(visible);
    }
}

import Phaser from 'phaser';

/**
 * Programmatic texture generation for Kringsringen.
 * Decouples graphics drawing from the MainScene.
 */
export class TextureSetup {
    /**
     * Generates all programmatic textures (xp-gem, coin, spark)
     */
    static create(scene: Phaser.Scene): void {
        const graphics = scene.add.graphics();

        // --- XP-GEM (Small White Diamond) ---
        graphics.fillStyle(0xffffff);
        graphics.beginPath();
        graphics.moveTo(5, 0);
        graphics.lineTo(10, 5);
        graphics.lineTo(5, 10);
        graphics.lineTo(0, 5);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture('xp-gem', 10, 10);

        // --- COIN (Yellow Circle with baked-in glow) ---
        graphics.clear();
        // Faint outer circles for soft glow (faster than shaders)
        for (let r = 10; r > 5; r--) {
            const alpha = (10 - r) * 0.05;
            graphics.fillStyle(0xffcc00, alpha);
            graphics.fillCircle(10, 10, r);
        }
        // Main coin body
        graphics.fillStyle(0xffcc00, 1);
        graphics.fillCircle(10, 10, 5);
        // Subtle inner highlight
        graphics.fillStyle(0xffffff, 0.4);
        graphics.fillCircle(10, 8, 2);
        // Subtle rim
        graphics.lineStyle(1, 0x000000, 0.3);
        graphics.strokeCircle(10, 10, 5);
        graphics.generateTexture('coin', 20, 20);

        // --- SPARK (Enemy death burst particles) ---
        graphics.clear();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('spark', 8, 8);

        graphics.destroy();
    }
}

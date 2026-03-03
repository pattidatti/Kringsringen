import Phaser from 'phaser';

export class Decoy extends Phaser.Physics.Arcade.Sprite {
    private lifespan: number = 3000;
    private timer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(150);
        this.setScale(2);
        this.setTint(0x8888ff);
        this.setAlpha(0.6);
    }

    public spawn(x: number, y: number, duration: number = 3000) {
        this.setPosition(x, y);
        this.lifespan = duration;
        this.timer = 0;
        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(0.6);
        this.play('player-idle');

        // Pulsing effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    update(_time: number, delta: number) {
        if (!this.active) return;
        this.timer += delta;
        if (this.timer >= this.lifespan) {
            this.explode();
        }
    }

    private explode() {
        this.scene.tweens.killTweensOf(this);
        const mainScene = this.scene as any;
        if (mainScene.poolManager) {
            mainScene.poolManager.spawnFireballExplosion(this.x, this.y);
        }

        // Damage nearby enemies
        const radius = 150;
        const enemies = mainScene.spatialGrid.findNearby({
            x: this.x,
            y: this.y,
            width: 0,
            height: 0
        }, radius);

        const damage = mainScene.stats.damage * 2;

        for (const entry of enemies) {
            const enemy = entry.ref;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                enemy.takeDamage(damage, '#ffaa00');
                enemy.pushback(this.x, this.y, 300);
            }
        }

        this.setActive(false);
        this.setVisible(false);
    }
}

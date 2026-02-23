import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';

export class Coin extends Phaser.Physics.Arcade.Sprite {
    private targetStart: Phaser.GameObjects.Components.Transform;
    private magnetRange: number = GAME_CONFIG.PLAYER.MAGNET_RANGE;
    private collectionRange: number = GAME_CONFIG.PLAYER.PICKUP_RANGE;
    private speed: number = 600;
    private isCollected: boolean = false;
    private spawnTime: number = 0;
    private lifespan: number = GAME_CONFIG.DROPS.COIN_LIFETIME;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        super(scene, x, y, 'coin');
        this.targetStart = target;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setTint(0xffd700); // Gold color

        // Initial state if created via new()
        this.spawn(x, y, target);
    }

    public spawn(x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        this.setActive(true);
        this.setVisible(true);
        this.body!.enable = true;
        this.setPosition(x, y);
        this.targetStart = target;
        this.isCollected = false;
        this.spawnTime = this.scene.time.now;

        // Visual Reset
        this.setAlpha(1);
        this.setScale(0.1);
        this.scene.tweens.add({
            targets: this,
            scale: 1.5,
            duration: 300,
            ease: 'Back.out'
        });

        // Initial pop out effect
        const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
        const force = Phaser.Math.Between(150, 250);
        this.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
        this.setDrag(150);
        this.setPipeline('Light2D');
        this.postFX.addGlow(0xffd700, 2, 0, false, 0.1, 15);
    }

    preUpdate(time: number, delta: number) {
        if (!this.active) return;
        super.preUpdate(time, delta);
        if (this.isCollected || !this.targetStart) return;

        // Lifetime Check
        if (time > this.spawnTime + this.lifespan) {
            this.disable();
            return;
        }

        const distance = Phaser.Math.Distance.Between(this.x, this.y, (this.targetStart as any).x, (this.targetStart as any).y);

        if (distance < this.magnetRange) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, (this.targetStart as any).x, (this.targetStart as any).y);
            this.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
            this.setDrag(0);
        }

        if (distance < this.collectionRange) {
            this.collect();
        }
    }

    private collect() {
        this.isCollected = true;
        this.emit('collected');
        this.disable();
    }

    private disable() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        // Clear FX to prevent stacking if reused from pool
        this.postFX.clear();
    }
}

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';

export class Coin extends Phaser.Physics.Arcade.Sprite {
    private targetStart: Phaser.GameObjects.Components.Transform;
    private magnetRange: number = GAME_CONFIG.PLAYER.MAGNET_RANGE;
    private collectionRange: number = GAME_CONFIG.PLAYER.PICKUP_RANGE;
    private speed: number = 600;
    public id: string = "";
    private isCollected: boolean = false;
    public forceMagnet: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        super(scene, x, y, 'coin');
        this.targetStart = target;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setTint(0xffd700); // Gold color

        // Initial state if created via new()
        this.spawn(x, y, target, `coin-${Phaser.Math.RND.uuid()}`);
    }

    public spawn(x: number, y: number, target: Phaser.GameObjects.Components.Transform, id?: string) {
        this.id = id || `coin-${Phaser.Math.RND.uuid()}`;
        this.setActive(true);
        this.setVisible(true);
        if (this.body) this.body.enable = true;
        this.setPosition(x, y);
        this.targetStart = target;
        this.isCollected = false;
        this.forceMagnet = false;


        // Visual Reset
        this.setAlpha(1);
        this.setScale(0.1);
        this.setBlendMode(Phaser.BlendModes.ADD); // Optimization: Additive blend for that glowing look

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

        // Removed postFX.addGlow - now using baked-in texture glow + ADD blend
        if (this.scene.lights.active) this.setPipeline('Light2D');
    }

    preUpdate(time: number, delta: number) {
        if (!this.active) return;
        super.preUpdate(time, delta);
        if (this.isCollected || !this.targetStart) return;

        /* Lifetime Check removed - Gold stays on the ground 
        if (time > this.spawnTime + this.lifespan) {
            this.disable();
            return;
        }
        */

        const dx = (this.targetStart as any).x - this.x;
        const dy = (this.targetStart as any).y - this.y;
        const distSq = dx * dx + dy * dy;

        // Optimization: use distance squared to avoid Math.sqrt
        if (this.forceMagnet || distSq < this.magnetRange * this.magnetRange) {
            const angle = Math.atan2(dy, dx);
            const currentSpeed = this.forceMagnet ? this.speed * 1.5 : this.speed;
            this.setVelocity(
                Math.cos(angle) * currentSpeed,
                Math.sin(angle) * currentSpeed
            );
            this.setDrag(0);
        }

        if (distSq < this.collectionRange * this.collectionRange) {
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
        // Optimization: No need to clear postFX since we don't add it anymore
        this.setBlendMode(Phaser.BlendModes.NORMAL);
    }
}

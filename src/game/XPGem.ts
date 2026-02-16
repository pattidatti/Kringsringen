import Phaser from 'phaser';

export class XPGem extends Phaser.Physics.Arcade.Sprite {
    private target: Phaser.GameObjects.Components.Transform;
    private magnetRange: number = 200;
    private collectionRange: number = 20;
    private speed: number = 500;
    private isCollected: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform) {
        super(scene, x, y, 'xp-gem');
        this.target = target;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setTint(0x00ffff); // Cyan gem

        // Initial pop out effect
        const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
        this.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
        this.setDrag(100);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.isCollected) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);

        if (distance < this.magnetRange) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, (this.target as any).x, (this.target as any).y);
            this.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
            this.setDrag(0);
        }

        if (distance < this.collectionRange) {
            this.isCollected = true;
            this.emit('collected');
            this.destroy();
        }
    }
}

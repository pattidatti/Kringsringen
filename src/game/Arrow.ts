import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Arrow extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = 800;
    private startX: number = 0;
    private startY: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setBodySize(20, 10);

        // Setup overlap in constructor once
        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_arrow, enemy) => {
            if (!this.active) return;
            const e = enemy as Enemy;
            e.takeDamage(this.damage);
            e.pushback(this.startX, this.startY, 150);
            this.hit();
        });
    }

    fire(x: number, y: number, angle: number, damage: number) {
        this.startX = x;
        this.startY = y;
        this.damage = damage;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);

        if (this.body) {
            this.body.enable = true;
            const speed = 700;
            this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
        }
    }

    private hit() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
    }

    update() {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.hit();
        }
    }
}

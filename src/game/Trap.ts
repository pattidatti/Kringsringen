import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { Enemy } from './Enemy';

export class Trap extends Phaser.Physics.Arcade.Sprite {
    private stunDuration: number = 2000;
    private radius: number = 100;
    private isSprung: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'item_frost_orb');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(100);
        this.setScale(1.5);
    }

    public spawn(x: number, y: number, stunDuration: number) {
        this.setPosition(x, y);
        this.stunDuration = stunDuration;
        this.setActive(true);
        this.setVisible(true);
        this.isSprung = false;
        this.setAlpha(0.8);
        this.setTint(0x00ffff);

        // Add a subtle pulse effect
        this.scene.tweens.add({
            targets: this,
            scale: 1.8,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    update() {
        if (!this.active || this.isSprung) return;

        const mainScene = this.scene as IMainScene;
        const enemies = mainScene.spatialGrid.findNearby({
            x: this.x,
            y: this.y,
            width: 32,
            height: 32
        }, this.radius);

        for (const entry of enemies) {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                this.spring();
                break;
            }
        }
    }

    private spring() {
        this.isSprung = true;
        this.scene.tweens.killTweensOf(this);

        const mainScene = this.scene as IMainScene;
        if (mainScene.poolManager) {
            mainScene.poolManager.spawnFrostExplosion(this.x, this.y);
        }

        // Apply stun to all nearby enemies
        const nearby = mainScene.spatialGrid.findNearby({
            x: this.x,
            y: this.y,
            width: 32,
            height: 32
        }, this.radius * 1.5);

        for (const entry of nearby) {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                enemy.stun(this.stunDuration);
                enemy.applySlow(this.stunDuration * 1.5);
            }
        }

        this.scene.time.delayedCall(500, () => {
            this.setActive(false);
            this.setVisible(false);
        });
    }
}

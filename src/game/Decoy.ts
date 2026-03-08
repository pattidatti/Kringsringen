import Phaser from 'phaser';

export class Decoy extends Phaser.Physics.Arcade.Sprite {
    private lifespan: number = 3000;
    private timer: number = 0;
    private explodeOnDeath: boolean = false;
    private mimicEnabled: boolean = false;
    private mimicTimer: number = 0;
    private readonly MIMIC_INTERVAL = 1500;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(150);
        this.setScale(2);
        this.setTint(0x8888ff);
        this.setAlpha(0.6);
        this.setData('isDecoy', true);
    }

    public spawn(x: number, y: number, duration: number = 3000,
                 withExplosion: boolean = false, withMimic: boolean = false) {
        this.setPosition(x, y);
        this.lifespan = duration;
        this.timer = 0;
        this.explodeOnDeath = withExplosion;
        this.mimicEnabled = withMimic;
        this.mimicTimer = 0;
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

        if (this.mimicEnabled) {
            this.mimicTimer += delta;
            if (this.mimicTimer >= this.MIMIC_INTERVAL) {
                this.mimicTimer = 0;
                this.fireAtNearestEnemy();
            }
        }

        if (this.timer >= this.lifespan) {
            this.die();
        }
    }

    private fireAtNearestEnemy() {
        const mainScene = this.scene as any;
        const nearby = mainScene.spatialGrid?.findNearby(
            { x: this.x, y: this.y, width: 32, height: 32 },
            400
        );
        if (!nearby || nearby.length === 0) return;

        let nearest: any = null;
        let bestDist = Infinity;
        for (const entry of nearby) {
            const e = entry.ref;
            if (!e || !e.active || e.getIsDead?.()) continue;
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) { bestDist = dist; nearest = e; }
        }

        if (!nearest) return;

        const angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
        const arrow = mainScene.arrows?.get(this.x, this.y);
        if (arrow) {
            arrow.fire(this.x, this.y, angle, mainScene.stats?.damage ?? 10, 700, 0, 0, 0, 0, 0, false);
        }
    }

    private die() {
        this.scene.tweens.killTweensOf(this);
        const mainScene = this.scene as any;

        if (this.explodeOnDeath) {
            if (mainScene.poolManager) {
                mainScene.poolManager.spawnFireballExplosion(this.x, this.y);
            }

            const radius = 150;
            const enemies = mainScene.spatialGrid?.findNearby(
                { x: this.x, y: this.y, width: 32, height: 32 },
                radius
            ) ?? [];

            const damage = (mainScene.stats?.damage ?? 0) * 2;
            for (const entry of enemies) {
                const enemy = entry.ref;
                if (enemy && enemy.active && !enemy.getIsDead()) {
                    enemy.pushback(this.x, this.y, 300);
                    enemy.takeDamage(damage, '#ffaa00');
                }
            }
        }

        this.setActive(false);
        this.setVisible(false);
    }
}

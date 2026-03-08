import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GAME_CONFIG } from '../config/GameConfig';

export class SonicBolt extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 0;
    private maxDistance: number = GAME_CONFIG.WEAPONS.VERS_BOLT.range;
    private startX: number = 0;
    private startY: number = 0;
    private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private speed: number = GAME_CONFIG.WEAPONS.VERS_BOLT.speed;
    private pierceCount: number = 0;
    private hitEnemies: WeakSet<any> = new WeakSet();
    private hitCount: number = 0;
    private slowDuration: number = 0;
    private pulseDirection: number = 1; // For size pulsing animation
    private weaponType: 'harp' | 'vers' = 'vers'; // Current weapon type for visual theming
    private versGiven: boolean = false; // Ensures only one Vers per bolt flight

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow'); // Placeholder texture — tinted gold

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.5); // Increased from 1.8 for better visibility
        this.setBodySize(20, 10);
        this.setTint(0xffd700);
        this.setBlendMode(Phaser.BlendModes.ADD); // Glowing effect

        // Enhanced gold particle trail with note-like shapes
        this.trail = this.scene.add.particles(0, 0, 'arrow', {
            lifespan: 400, // Increased from 200ms for longer trail
            scale: { start: 0.6, end: 0 }, // Larger particles
            alpha: { start: 0.8, end: 0 }, // Brighter
            frequency: 10, // More frequent (was 15)
            tint: [0xffd700, 0xffed4e, 0xffc700], // Gold gradient
            blendMode: 'ADD',
            emitting: false,
            rotate: { min: 0, max: 360 }
        });
        this.trail.setDepth(this.depth - 1);

        // Setup overlap with enemies
        const mainScene = scene as any;
        scene.physics.add.overlap(this, mainScene.enemies, (_bolt, enemy) => {
            this.handleOverlap(enemy as Enemy, mainScene);
        });

        if (mainScene.bossGroup) {
            scene.physics.add.overlap(this, mainScene.bossGroup, (_bolt, boss) => {
                this.handleOverlap(boss as Enemy, mainScene);
            });
        }
    }

    private handleOverlap(e: Enemy, mainScene: any): void {
        if (!this.active) return;
        if (this.hitEnemies.has(e)) return;

        this.hitEnemies.add(e);
        this.hitCount++;

        e.takeDamage(this.damage, '#ffd700');
        e.pushback(this.startX, this.startY, 150);

        // Build Vers on hit (not on cast) — only once per bolt
        if (this.weaponType === 'harp' && !this.versGiven) {
            this.versGiven = true;
            mainScene.events.emit('harp-bolt-hit');
        }

        // Skaldsang Lifesteal — helbred ved Stridssang-treff
        if (this.weaponType === 'vers') {
            const levels = (mainScene.registry.get('upgradeLevels') || {}) as Record<string, number>;
            const lvl = levels['skaldsang_lifesteal'] || 0;
            if (lvl > 0) {
                const healAmt = lvl * 2;
                const curHP = (mainScene.registry.get('playerHP') || 0) as number;
                const maxHP = (mainScene.registry.get('playerMaxHP') || 100) as number;
                mainScene.registry.set('playerHP', Math.min(maxHP, curHP + healAmt));
            }
        }

        // Spark burst at impact point
        if (mainScene.swordSparkEmitter) {
            mainScene.swordSparkEmitter.setEmitterAngle({ min: 0, max: 360 });
            mainScene.swordSparkEmitter.emitParticleAt(e.x, e.y, 3);
        }

        // Small screen shake
        if (mainScene.cameras?.main) {
            mainScene.cameras.main.shake(40, 0.002);
        }

        // Stridssang slow
        if (this.slowDuration > 0 && e.applySlow) {
            e.applySlow(this.slowDuration);
        }

        // Check pierce
        if (this.hitCount > this.pierceCount) {
            this.deactivate();
        }
    }

    fire(x: number, y: number, angle: number, damage: number, pierceCount: number = 0, slowDuration: number = 0, weaponType: 'harp' | 'vers' = 'vers'): void {
        this.startX = x;
        this.startY = y;
        this.damage = damage;
        this.pierceCount = pierceCount;
        this.slowDuration = slowDuration;
        this.weaponType = weaponType;
        this.hitEnemies = new WeakSet();
        this.hitCount = 0;
        this.pulseDirection = 1;
        this.versGiven = false;

        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.setRotation(angle);

        // Visual differentiation based on weapon type
        if (weaponType === 'harp') {
            // Harp Bolt: Silver-blue, lighter trail, smaller scale
            this.setTint(0x88ccff);
            this.setScale(1.6);
            if (this.trail) {
                this.trail.setConfig({
                    lifespan: 200, // Shorter trail
                    alpha: { start: 0.6, end: 0 }, // Lighter
                    tint: [0x88ccff, 0xaaddff, 0x66aaee]
                });
            }
        } else {
            // Vers Bolt: Gold, denser trail, larger scale
            this.setTint(0xffd700);
            this.setScale(2.5);
            if (this.trail) {
                this.trail.setConfig({
                    lifespan: 400, // Longer trail
                    alpha: { start: 0.8, end: 0 }, // Brighter
                    tint: [0xffd700, 0xffed4e, 0xffc700]
                });
            }
        }

        if (this.trail) {
            this.trail.start();
            this.trail.follow = this;
        }

        if (this.body) {
            this.body.enable = true;
            this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        }
    }

    private deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        if (this.trail) this.trail.stop();
    }

    update(): void {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distance > this.maxDistance) {
            this.deactivate();
            return;
        }

        // Pulsing scale animation (0.9 → 1.1)
        const currentScale = this.scaleX;
        if (currentScale >= 2.0) this.pulseDirection = -1;
        else if (currentScale <= 1.6) this.pulseDirection = 1;
        this.setScale(currentScale + this.pulseDirection * 0.03);

        // Rotate sprite for "tumbling note" effect
        this.rotation += 0.08;
    }

    public destroy(fromScene?: boolean): void {
        if (this.trail) this.trail.destroy();
        super.destroy(fromScene);
    }
}

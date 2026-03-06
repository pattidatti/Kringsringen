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
    private noteGraphics: Phaser.GameObjects.Graphics | null = null; // Musical note shape
    private weaponType: 'harp' | 'vers' = 'vers'; // Current weapon type for visual theming

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'arrow'); // Placeholder texture — tinted gold

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.5); // Increased from 1.8 for better visibility
        this.setBodySize(20, 10);
        this.setTint(0xffd700);
        this.setBlendMode(Phaser.BlendModes.ADD); // Glowing effect

        // Create a procedural musical note graphic overlay
        this.noteGraphics = this.scene.add.graphics();
        this.noteGraphics.setDepth(this.depth + 1);
        this.noteGraphics.setBlendMode(Phaser.BlendModes.ADD);

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

        if (this.noteGraphics) {
            this.noteGraphics.setVisible(true);
        }

        if (this.body) {
            this.body.enable = true;
            this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        }

        // Spawn ripple effect for visual "oomph" (color based on weapon type)
        const mainScene = this.scene as any;
        if (mainScene.add && mainScene.tweens) {
            const rippleColor = weaponType === 'harp' ? 0x88ccff : 0xffd700;
            const ripple = mainScene.add.circle(x, y, 15, rippleColor, 0);
            ripple.setStrokeStyle(3, rippleColor, 0.9);
            ripple.setDepth(this.depth - 2);
            mainScene.tweens.add({
                targets: ripple,
                radius: 60,
                alpha: 0,
                duration: 200,
                ease: 'Cubic.out',
                onComplete: () => ripple.destroy()
            });
        }
    }

    private deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        if (this.trail) this.trail.stop();
        if (this.noteGraphics) {
            this.noteGraphics.setVisible(false);
            this.noteGraphics.clear();
        }
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

        // Draw procedural musical note overlay (color based on weapon type)
        if (this.noteGraphics) {
            this.noteGraphics.clear();

            // Color theming based on weapon type
            const primaryColor = this.weaponType === 'harp' ? 0x88ccff : 0xffd700;
            const secondaryColor = this.weaponType === 'harp' ? 0xaaddff : 0xffed4e;

            // Pulsing glow effect
            const glowAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;
            this.noteGraphics.lineStyle(4, primaryColor, glowAlpha); // Thicker stroke
            this.noteGraphics.fillStyle(primaryColor, 0.8); // Brighter fill

            // Simple eighth note shape at bolt position (scaled up)
            const noteX = this.x;
            const noteY = this.y;

            // Note head (larger circle with glow)
            this.noteGraphics.fillCircle(noteX, noteY, 10); // Increased from 6

            // Outer glow ring
            this.noteGraphics.lineStyle(2, secondaryColor, 0.4);
            this.noteGraphics.strokeCircle(noteX, noteY, 14);

            // Note stem (thicker line)
            this.noteGraphics.lineStyle(4, primaryColor, glowAlpha);
            this.noteGraphics.beginPath();
            this.noteGraphics.moveTo(noteX + 8, noteY);
            this.noteGraphics.lineTo(noteX + 8, noteY - 24); // Taller stem
            this.noteGraphics.strokePath();

            // Note flag (more visible)
            this.noteGraphics.beginPath();
            this.noteGraphics.moveTo(noteX + 8, noteY - 24);
            this.noteGraphics.lineTo(noteX + 14, noteY - 18);
            this.noteGraphics.lineTo(noteX + 11, noteY - 14);
            this.noteGraphics.strokePath();
        }
    }

    public destroy(fromScene?: boolean): void {
        if (this.trail) this.trail.destroy();
        if (this.noteGraphics) this.noteGraphics.destroy();
        super.destroy(fromScene);
    }
}

import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import { Enemy } from './Enemy';

/**
 * Manages active class abilities like Whirlwind, Explosive Shot, and Cascade.
 */
export class ClassAbilityManager {
    private scene: IMainScene;

    public isWhirlwinding: boolean = false;
    public explosiveShotReady: boolean = false;
    public whirlwindActiveUntil: number = 0;
    public cascadeActiveUntil: number = 0;
    public shadowDecoyActiveUntil: number = 0;
    public classAbilityCooldownEnd: number = 0;
    public classAbility3CooldownEnd: number = 0;
    public classAbility4CooldownEnd: number = 0;
    private bulwarkGraphics: Phaser.GameObjects.Graphics | null = null;
    private bulwarkAlpha: number = 0;
    private bulwarkRotation: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public attemptAbility2(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateWhirlwind();
        else if (playerClassId === 'wizard') this.activateCascade();
        else if (playerClassId === 'archer') this.activateExplosiveShot();
    }

    public attemptAbility3(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateIronBulwark();
        else if (playerClassId === 'archer') this.activateVaultAndVolley();
    }

    public attemptAbility4(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateChainGrapple();
        else if (playerClassId === 'archer') this.activateShadowDecoy();
    }

    public attemptSpecialE(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'archer') {
            this.activateArcherSpecial();
        }
    }

    private activateWhirlwind(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const damageMult = 1 + (levels['whirl_damage'] || 0) * 0.25;
        const cdLvl = levels['whirl_cooldown'] || 0;
        const chainLvl = levels['whirl_chain'] || 0;
        const damage = this.scene.stats.damage * damageMult;
        const radius = 120;
        const cd = 8000 * Math.pow(0.8, cdLvl);

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        this.isWhirlwinding = true;
        this.scene.data.set('isWhirlwinding', true);
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        player.play({ key: 'player-attack', repeat: -1 });
        this.scene.events.emit('player-swing');

        // Create the slash effect
        const slash = this.scene.add.sprite(player.x, player.y, 'whirlwind_slash');
        slash.setDepth(player.depth - 1);
        // The texture is 128x128 (radius 64). Scale it so its visual edge matches the damage radius perfectly.
        slash.setScale(radius / 64);
        slash.setBlendMode(Phaser.BlendModes.ADD);

        // Client-side prediction
        this.scene.buffs.addBuff({
            key: 'whirlwind',
            title: 'WHIRLWIND',
            icon: 'item_sword',
            color: 0xffaa00,
            duration: 3000,
            maxStacks: 1,
            isVisible: true
        });
        // Create duration indicator
        const graphics = this.scene.add.graphics();
        graphics.setDepth(player.depth + 10);

        const triggerHit = (color: string) => {
            const px = player.x, py = player.y;
            const hitEnemies = (this.scene.enemies.getChildren() as Enemy[]).filter(e => e.active && Phaser.Math.Distance.Between(px, py, e.x, e.y) <= radius);
            hitEnemies.forEach(e => {
                e.takeDamage(damage, color);
                e.pushback(px, py, this.scene.stats.knockback);
            });
            return hitEnemies;
        };

        this.scene.tweens.add({
            targets: player,
            rotation: Math.PI * 24, // 12 full rotations over 3000ms (maintains visual speed)
            duration: 3000,
            ease: 'Linear',
            onUpdate: (tween) => {
                if (!this.isWhirlwinding) {
                    tween.stop();
                    slash.destroy();
                    graphics.destroy();
                    return;
                }
                const progress = tween.progress;
                slash.setPosition(player.x, player.y);
                slash.rotation = player.rotation;

                // Draw duration circle indicator
                graphics.clear();
                graphics.lineStyle(4, 0x000000, 0.5);
                graphics.beginPath();
                graphics.arc(player.x, player.y + 35, 14, 0, Math.PI * 2, false);
                graphics.strokePath();

                graphics.lineStyle(3, 0xff4400, 1);
                graphics.beginPath();
                graphics.arc(player.x, player.y + 35, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - progress)), false);
                graphics.strokePath();

                // Avant-Garde Juice: Continuous spark spray during whirlwind
                if (Math.random() < 0.8) {
                    this.scene.swordSparkEmitter.setEmitterAngle({ min: 0, max: 360 });
                    this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y - 15, 2);

                    // Minor screen shake randomly
                    if (Math.random() < 0.2) {
                        this.scene.cameras.main.shake(40, 0.003);
                    }
                }
            },
            onComplete: () => {
                this.isWhirlwinding = false;
                this.scene.data.set('isWhirlwinding', false);
                player.setRotation(0);
                slash.destroy();
                graphics.destroy();

                // Final hit logic at the end of the 3s spin
                const finalHit = triggerHit('#ffaa00');
                if (chainLvl > 0) {
                    const reduction = Math.min(finalHit.length * (chainLvl === 1 ? 0.05 : 0.07), chainLvl === 1 ? 0.25 : 0.35);
                    this.classAbilityCooldownEnd -= cd * reduction;
                    this.scene.registry.set('classAbilityCooldown', {
                        duration: cd,
                        timestamp: this.classAbilityCooldownEnd - cd
                    });
                }

                // Force immediate orientation update
                this.scene.inputManager.handleOrientation(player);
            }
        });

        // Periodic damage ticks every 200ms
        // Ticks at: 0ms, 200ms, 400ms, ..., 2800ms (15 total ticks)
        for (let i = 0; i < 15; i++) {
            this.scene.time.delayedCall(i * 200, () => {
                if (this.isWhirlwinding) {
                    const hitEnemies = triggerHit(i === 0 ? '#ffcc00' : '#ffaa00');

                    // Avant-Garde Juice: Visual feedback on every tick that hits something
                    if (hitEnemies.length > 0) {
                        this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y - 15, 3);
                        this.scene.cameras.main.shake(50, 0.005);
                    }
                }
            });
        }
    }

    private activateExplosiveShot(): void {
        this.explosiveShotReady = true;
        this.scene.data.set('explosiveShotReady', true);
        this.scene.registry.set('explosiveShotReady', true);

        // Ensure bow is equipped for the ability
        this.scene.registry.set('currentWeapon', 'bow');

        // Reset cooldown to allow immediate firing
        this.scene.registry.set('weaponCooldown', { duration: 0, timestamp: 0 });

        // Trigger immediate attack
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;

        this.scene.time.delayedCall(500, () => {
            if (!this.scene.data.get('isAttacking')) return; // Could have been interrupted
            const newAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            this.scene.weaponManager.handleWeaponExecution(newAngle);
        });

        this.scene.time.delayedCall(5000, () => {
            if (this.explosiveShotReady) {
                this.explosiveShotReady = false;
                this.scene.data.set('explosiveShotReady', false);
                this.scene.registry.set('explosiveShotReady', false);
            }
        });
    }

    private activateCascade(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // Duration: Base 3s, +0.5s per upg
        const duration = (3 + (levels['cascade_duration'] || 0) * 0.5) * 1000;

        // Radius: Base 1, +0.25 per upg
        const radiusMult = 1 + (levels['cascade_radius'] || 0) * 0.25;

        // Damage calculation
        const baseDamage = this.scene.stats.damage * 3; // Huge base damage
        const centerDamageMult = 1 + (levels['cascade_damage'] || 0) * 0.5; // +50% or +100%

        // Damage Reduction (Manaring)
        const manaRingLvl = levels['manaring'] || 0;
        const damageReduction = manaRingLvl > 0 ? (manaRingLvl === 1 ? 0.25 : 0.40) : 0;

        const cd = 12000;

        const pointer = this.scene.input.activePointer;
        const spawnX = pointer.worldX;
        const spawnY = pointer.worldY;

        this.cascadeActiveUntil = Date.now() + duration;
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        const singularity = this.scene.singularities.get(spawnX, spawnY) as import('./Singularity').Singularity | null;
        if (singularity) {
            singularity.spawn(spawnX, spawnY, duration, radiusMult, baseDamage, centerDamageMult, damageReduction);
            this.scene.buffs.addBuff({
                key: 'cascade',
                title: 'CASCADE',
                icon: 'item_orb_purple',
                color: 0xcc88ff,
                duration: duration,
                maxStacks: 1,
                isVisible: true
            });
        }
    }

    private activateIronBulwark(): void {
        const cd = 12000;
        const duration = 5000;
        if (Date.now() < this.classAbility3CooldownEnd) return;

        this.classAbility3CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility3Cooldown', { duration: cd, timestamp: Date.now() });

        this.scene.buffs.addBuff({
            key: 'iron_bulwark',
            title: 'BULWARK',
            icon: 'item_shield',
            color: 0x00ccff,
            duration: duration,
            maxStacks: 1,
            isVisible: true
        });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // Visual Shell
        if (this.bulwarkGraphics) this.bulwarkGraphics.destroy();
        this.bulwarkGraphics = this.scene.add.graphics();
        this.bulwarkGraphics.setDepth(player.depth + 1);
        this.bulwarkGraphics.setBlendMode(Phaser.BlendModes.ADD); // Ensure transparency/glow works
        this.bulwarkAlpha = 0;
        this.bulwarkRotation = 0;

        this.scene.tweens.add({
            targets: this,
            bulwarkAlpha: 1,
            duration: 200,
            ease: 'Cubic.out'
        });

        this.scene.time.delayedCall(duration, () => {
            this.scene.tweens.add({
                targets: this,
                bulwarkAlpha: 0,
                duration: 200,
                onComplete: () => {
                    this.bulwarkGraphics?.destroy();
                    this.bulwarkGraphics = null;
                    this.scene.registry.set('bulwarkActiveUntil', 0);
                }
            });
        });

        // Sfx placeholder or trigger
        this.scene.events.emit('sfx-shield-up');
    }

    public update(time: number, delta: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const bulwarkActiveUntil = this.scene.registry.get('bulwarkActiveUntil') || 0;
        const now = Date.now();

        if (this.bulwarkGraphics && player && player.active) {
            this.bulwarkGraphics.clear();
            this.bulwarkGraphics.setAlpha(this.bulwarkAlpha);

            // Juice: Rotation
            this.bulwarkRotation += delta * 0.002;

            // Juice: Pulsing scale
            const pulse = 1 + Math.sin(time * 0.008) * 0.05;
            const radius = 60 * pulse;

            // Visual details: Glow and Shell (Iron Bulwark: Blue/Gold)
            // Outer Gold Glow
            this.bulwarkGraphics.lineStyle(6, 0xffaa00, 0.3 * this.bulwarkAlpha);
            this.drawHexagon(player.x, player.y, radius + 6, this.bulwarkRotation * 0.5);

            // Inner Cyan Pulse
            const innerPulse = 0.8 + Math.sin(time * 0.015) * 0.2;
            this.bulwarkGraphics.lineStyle(2, 0x00ffff, 0.6 * innerPulse * this.bulwarkAlpha);
            this.drawHexagon(player.x, player.y, radius - 5, -this.bulwarkRotation);

            // Main Gold Shell
            this.bulwarkGraphics.lineStyle(3, 0xffdd44, 0.9 * this.bulwarkAlpha);
            this.bulwarkGraphics.fillStyle(0xffaa00, 0.05 * this.bulwarkAlpha);
            this.drawHexagon(player.x, player.y, radius, this.bulwarkRotation);

            // --- Visual Timer ---
            if (bulwarkActiveUntil > now) {
                const duration = 5000;
                const remaining = bulwarkActiveUntil - now;
                const progress = Math.max(0, remaining / duration);

                // Smart Position: Avoid overlap with Whirlwind (Whirlwind is at y+35)
                const timerY = this.isWhirlwinding ? 60 : 35;
                const targetX = player.x;
                const targetY = player.y + timerY;

                // Background
                this.bulwarkGraphics.lineStyle(4, 0x000000, 0.5 * this.bulwarkAlpha);
                this.bulwarkGraphics.beginPath();
                this.bulwarkGraphics.arc(targetX, targetY, 14, 0, Math.PI * 2, false);
                this.bulwarkGraphics.strokePath();

                // Progress Arc (Cyan/White for Bulwark)
                this.bulwarkGraphics.lineStyle(3, 0x00ccff, 1 * this.bulwarkAlpha);
                this.bulwarkGraphics.beginPath();
                this.bulwarkGraphics.arc(targetX, targetY, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress), false);
                this.bulwarkGraphics.strokePath();
            }
        }
    }

    private drawHexagon(x: number, y: number, radius: number, rotation: number): void {
        if (!this.bulwarkGraphics) return;
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = rotation + (i / 6) * Math.PI * 2;
            points.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }
        this.bulwarkGraphics.beginPath();
        this.bulwarkGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) this.bulwarkGraphics.lineTo(points[i].x, points[i].y);
        this.bulwarkGraphics.closePath();
        this.bulwarkGraphics.strokePath();
        this.bulwarkGraphics.fillPath();
    }

    private activateChainGrapple(): void {
        const cd = 10000;
        if (Date.now() < this.classAbility4CooldownEnd) return;

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const radius = 400;

        // 1. Visceral Shockwave Effect
        const ring = this.scene.add.circle(player.x, player.y, 10, 0xaaaaaa, 0.4);
        ring.setStrokeStyle(4, 0xffffff, 0.8);
        ring.setDepth(player.depth - 1);
        this.scene.tweens.add({
            targets: ring,
            radius: radius,
            alpha: 0,
            duration: 350,
            ease: 'Expo.out',
            onComplete: () => ring.destroy()
        });

        // Minor initial shake when hooks fly out
        this.scene.cameras.main.shake(150, 0.005);

        // Search for enemies in radius
        const nearbyEntries = this.scene.spatialGrid.findNearby({
            x: player.x,
            y: player.y,
            width: 1,
            height: 1
        }, radius);

        const chainGraphics = this.scene.add.graphics();
        chainGraphics.setDepth(player.depth - 1);
        const activeChains: Array<{ enemy: Enemy, color: number }> = [];

        nearbyEntries.forEach(entry => {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                activeChains.push({ enemy, color: 0xcccccc });

                // Vekt: Tension/Stun phase before the pull starts
                enemy.setTint(0xffaa00);
                if (enemy.body) enemy.setVelocity(0, 0);

                // Start the pull after a short tension delay
                this.scene.time.delayedCall(150, () => {
                    if (!enemy.active || enemy.getIsDead()) return;

                    enemy.clearTint();
                    this.scene.tweens.add({
                        targets: enemy,
                        x: player.x + (enemy.x - player.x) * 0.15, // Pull close but not on top
                        y: player.y + (enemy.y - player.y) * 0.15,
                        duration: 350,
                        ease: 'Back.out', // Snappy pull
                        onUpdate: () => {
                            if (enemy.body) enemy.setVelocity(0, 0);
                        },
                        onComplete: () => {
                            if (!enemy.active) return;

                            // 2. Impact Layer
                            // Remove from active chains so it stops drawing
                            const idx = activeChains.findIndex(c => c.enemy === enemy);
                            if (idx !== -1) activeChains.splice(idx, 1);

                            // Juice: Spark explosion on impact
                            this.scene.swordSparkEmitter.emitParticleAt(enemy.x, enemy.y, 5);
                            this.scene.cameras.main.shake(100, 0.008);

                            // Visual: Impact Text
                            this.scene.poolManager.getDamageText(enemy.x, enemy.y - 40, 'PULL!', '#ffffff');

                            // Stun enemy briefly on impact
                            enemy.setTint(0xffffff);
                            this.scene.time.delayedCall(200, () => { if (enemy.active) enemy.clearTint(); });
                        }
                    });
                });
            }
        });

        // 3. Dynamic Chain Rendering Loop
        const renderTimer = this.scene.time.addEvent({
            delay: 16,
            repeat: 100, // Should cover the 350ms duration + tension
            callback: () => {
                chainGraphics.clear();
                if (activeChains.length === 0) {
                    renderTimer.destroy();
                    chainGraphics.destroy();
                    return;
                }

                activeChains.forEach(chain => {
                    if (chain.enemy && chain.enemy.active) {
                        // Draw a jagged/segmented chain for aesthetic
                        chainGraphics.lineStyle(2, chain.color, 0.8);

                        const startX = player.x;
                        const startY = player.y;
                        const endX = chain.enemy.x;
                        const endY = chain.enemy.y;

                        // Zig-zag effect for 'tension'
                        const segments = 6;
                        chainGraphics.beginPath();
                        chainGraphics.moveTo(startX, startY);

                        for (let i = 1; i < segments; i++) {
                            const t = i / segments;
                            const px = startX + (endX - startX) * t;
                            const py = startY + (endY - startY) * t;
                            const jitter = (Math.random() - 0.5) * 4;
                            chainGraphics.lineTo(px + jitter, py + jitter);
                        }

                        chainGraphics.lineTo(endX, endY);
                        chainGraphics.strokePath();

                        // Add small 'hook' circle at the end
                        chainGraphics.fillStyle(0xffffff, 1);
                        chainGraphics.fillCircle(endX, endY, 4);
                    }
                });
            }
        });
    }

    private activateVaultAndVolley(): void {
        const cd = 7000;
        if (Date.now() < this.classAbility3CooldownEnd) return;

        this.classAbility3CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility3Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

        // Leap backward
        const leapDist = 180;
        const targetX = player.x - Math.cos(angle) * leapDist;
        const targetY = player.y - Math.sin(angle) * leapDist;

        this.scene.tweens.add({
            targets: player,
            x: targetX,
            y: targetY,
            duration: 300,
            ease: 'Cubic.out',
            onStart: () => {
                // Ghosting effect
                for (let i = 0; i < 3; i++) {
                    this.scene.time.delayedCall(i * 80, () => {
                        const ghost = this.scene.add.sprite(player.x, player.y, player.texture.key, player.frame.name);
                        ghost.setScale(player.scaleX, player.scaleY).setAlpha(0.4).setTint(0x88ccff);
                        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
                    });
                }
            }
        });

        // Volley: Fire 5 arrows in a fan
        for (let i = -2; i <= 2; i++) {
            const arrowAngle = angle + (i * 0.15);
            const arrow = (this.scene as any).arrows.get(player.x, player.y);
            if (arrow) {
                arrow.fire(player.x, player.y, arrowAngle, this.scene.stats.damage * 0.7);
            }
        }
    }

    private activateShadowDecoy(): void {
        const cd = 15000;
        if (Date.now() < this.classAbility4CooldownEnd) return;

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // Spawn Decoy
        const decoy = (this.scene as any).decoys.get(player.x, player.y) as any;
        if (decoy) {
            decoy.spawn(player.x, player.y);
        }

        // Pseudo-invis for player
        player.setAlpha(0.3);
        this.scene.time.delayedCall(1500, () => {
            player.setAlpha(1);
        });
    }

    private activateArcherSpecial(): void {
        const upgLvls = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const frostTrapLvl = upgLvls['frost_trap'] || 0;
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // If we have frost trap, we use it here (Hotkey E variant or passive)
        // For now, let's trigger it manually or as part of the Special
        if (frostTrapLvl > 0) {
            const trap = (this.scene as any).traps.get(player.x, player.y) as any;
            if (trap) {
                trap.spawn(player.x, player.y, 1500 + frostTrapLvl * 500);
            }
        }

        const timeSlowLvl = upgLvls['time_slow_arrow'] || 0;
        if (timeSlowLvl > 0) {
            const slowDuration = 3000 + timeSlowLvl * 1000;
            this.scene.enemies.children.iterate((e: any) => { if (e && e.active) e.applySlow?.(slowDuration); return true; });
            this.scene.bossGroup.children.iterate((boss: any) => { if (boss && boss.active) boss.applySlow?.(slowDuration); return true; });
            this.scene.poolManager.getDamageText(player.x, player.y - 70, 'TIME SLOW!', '#88aaff');
        }
    }
}

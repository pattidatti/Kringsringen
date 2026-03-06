import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import { Enemy } from './Enemy';
import { Arrow } from './Arrow';
import { AudioManager } from './AudioManager';

/**
 * Manages active class abilities like Whirlwind, Explosive Shot, and Cascade.
 */
export class ClassAbilityManager {
    private scene: IMainScene;

    public isWhirlwinding: boolean = false;
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
        else if (playerClassId === 'archer') this.activatePhantomVolley();
        else if (playerClassId === 'skald') this.activateVersBolt();
    }

    public attemptAbility3(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateIronBulwark();
        else if (playerClassId === 'archer') this.activateVaultAndVolley();
        else if (playerClassId === 'skald') this.activateInspirendeKvad();
    }

    public attemptAbility4(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') this.activateChainGrapple();
        else if (playerClassId === 'archer') this.activateShadowDecoy();
        else if (playerClassId === 'skald') this.activateSeierskvad();
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
        AudioManager.instance.playSFX('swing');

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
            const nearby = this.scene.spatialGrid.findNearby(
                { x: px, y: py, width: 1, height: 1 }, radius
            );
            let hitCount = 0;
            for (const entry of nearby) {
                const e = entry.ref as Enemy;
                if (e && e.active && !e.getIsDead()) {
                    e.takeDamage(damage, color);
                    e.pushback(px, py, this.scene.stats.knockback);
                    hitCount++;
                }
            }
            return hitCount;
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
                const finalHitCount = triggerHit('#ffaa00');
                if (chainLvl > 0) {
                    const reduction = Math.min(finalHitCount * (chainLvl === 1 ? 0.05 : 0.07), chainLvl === 1 ? 0.25 : 0.35);
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
                    const hitCount = triggerHit(i === 0 ? '#ffcc00' : '#ffaa00');

                    // Blade spin sound — every tick
                    AudioManager.instance.playSFX('whirl_activate');

                    // Avant-Garde Juice: Visual feedback on every tick that hits something
                    if (hitCount > 0) {
                        this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y - 15, 3);
                        this.scene.cameras.main.shake(50, 0.005);
                        AudioManager.instance.playSFX('whirl_hit');
                    }
                }
            });
        }
    }

    private activatePhantomVolley(): void {
        const cd = 12000;
        if (Date.now() < this.classAbilityCooldownEnd) return;

        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;

        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // Upgrades
        const countLvl = levels['volley_count'] || 0;
        const damageLvl = levels['volley_damage'] || 0;
        const pierceLvl = levels['volley_pierce'] || 0;

        const totalArrows = 15 + countLvl * 5;
        const damageMult = 1.0 + damageLvl * 0.2;
        const pierceCount = pierceLvl;

        // Base damage is lower per arrow because of the sheer quantity
        const baseDamage = this.scene.stats.damage * damageMult * 0.35;

        this.scene.buffs.addBuff({
            key: 'phantom_volley',
            title: 'FANTOMBYGE',
            icon: 'item_bow',
            color: 0xff6600,
            duration: 1500,
            maxStacks: 1,
            isVisible: true
        });

        // Fire loop
        const fireInterval = 1500 / totalArrows;

        const fireTimer = this.scene.time.addEvent({
            delay: fireInterval,
            repeat: totalArrows - 1,
            callback: () => {
                if (!player || !player.active || player.getData('isDead')) {
                    fireTimer.destroy();
                    return;
                }

                // Recalculate angle towards pointer to allow tracking while firing
                const currentAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

                // Add a small randomized spread to simulate machine-gun inaccuracies
                const spread = (Math.random() - 0.5) * 0.25; // +/- 0.125 rads
                const finalAngle = currentAngle + spread;

                const arrow = (this.scene as any).arrows.get(player.x, player.y) as Arrow;
                if (arrow) {
                    const poisonLvl = levels['poison_arrow'] || 0;

                    // Fast arrows, pierce applied
                    arrow.fire(player.x, player.y, finalAngle, baseDamage, 900, pierceCount, 0, 0, poisonLvl, 0, true);

                    // Recoil (Push player slightly backwards)
                    const recoilDist = 20;
                    if (player.body) {
                        player.setVelocity(
                            player.body.velocity.x - Math.cos(currentAngle) * recoilDist,
                            player.body.velocity.y - Math.sin(currentAngle) * recoilDist
                        );
                    }

                    // Juice: minor screen shake per arrow
                    this.scene.cameras.main.shake(40, 0.002);
                }
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
            const arrow = (this.scene as any).arrows.get(player.x, player.y) as Arrow;
            if (arrow) {
                // Ability 3 optimization: Only the middle arrow (i=0) has light to prevent FPS drops
                arrow.fire(player.x, player.y, arrowAngle, this.scene.stats.damage * 0.7, 700, 0, 0, 0, 0, 0, i === 0);
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

    // ─── SKALD ABILITIES ──────────────────────────────────────────────────────

    private activateInspirendeKvad(): void {
        const vers = (this.scene.registry.get('skaldVers') || 0) as number;
        if (vers < 2) {
            // Feedback: not enough Vers
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (player) {
                this.scene.poolManager.getDamageText(player.x, player.y - 50, 'TRENGER 2 VERS', '#ff4444');
            }
            return;
        }

        if (Date.now() < this.classAbility3CooldownEnd) return;

        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const durationLvl = levels['kvad_duration'] || 0;
        const duration = 5000 + durationLvl * 1000;
        const cd = 8000; // Shorter CD since it only costs 2 Vers

        // CONSUME 2 VERS
        this.scene.registry.set('skaldVers', vers - 2);
        this.scene.registry.set('skaldKvadReady', false);

        this.classAbility3CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility3Cooldown', { duration: cd, timestamp: Date.now() });

        this.scene.buffs.addBuff({
            key: 'inspirerende_kvad',
            title: 'KVAD',
            icon: 'item_lightning',
            color: 0xffd700,
            duration: duration,
            maxStacks: 1,
            isVisible: true
        });

        // Enhanced visual: Glorious healing aura
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // Outer pulsing aura ring
        const auraGraphics = this.scene.add.graphics();
        auraGraphics.setDepth(player.depth - 1);
        auraGraphics.setBlendMode(Phaser.BlendModes.ADD);

        const auraRadius = 80;
        let auraPulse = 0;

        // Particle emission: Rising gold sparkles
        const particleCount = Math.max(8, Math.floor(20 * (this.scene.quality?.particleMultiplier || 1.0)));
        const auraParticleTimer = this.scene.time.addEvent({
            delay: 100,
            repeat: Math.floor(duration / 100) - 1,
            callback: () => {
                if (player.active && this.scene.swordSparkEmitter) {
                    this.scene.swordSparkEmitter.setEmitterAngle({ min: -110, max: -70 }); // Upward
                    this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y, Math.floor(particleCount * 0.3));
                }
            }
        });

        // Aura rendering loop
        const auraRenderTimer = this.scene.time.addEvent({
            delay: 16,
            repeat: Math.floor(duration / 16) - 1,
            callback: () => {
                if (!player.active) {
                    auraRenderTimer.destroy();
                    auraParticleTimer.destroy();
                    auraGraphics.destroy();
                    return;
                }

                auraGraphics.clear();

                // Pulsing alpha (0.3 → 0.7)
                auraPulse += 0.05;
                const pulseAlpha = 0.5 + Math.sin(auraPulse) * 0.2;

                // Outer gold ring
                auraGraphics.lineStyle(4, 0xffd700, pulseAlpha * 0.6);
                auraGraphics.strokeCircle(player.x, player.y, auraRadius + Math.sin(auraPulse * 0.7) * 5);

                // Inner white glow
                auraGraphics.fillStyle(0xffffff, pulseAlpha * 0.15);
                auraGraphics.fillCircle(player.x, player.y, auraRadius * 0.6);

                // Mid-ring amber
                auraGraphics.lineStyle(2, 0xffed4e, pulseAlpha * 0.8);
                auraGraphics.strokeCircle(player.x, player.y, auraRadius * 0.7);
            }
        });

        // Cleanup aura at end of duration
        this.scene.time.delayedCall(duration, () => {
            auraRenderTimer.destroy();
            auraParticleTimer.destroy();
            this.scene.tweens.add({
                targets: auraGraphics,
                alpha: 0,
                duration: 300,
                onComplete: () => auraGraphics.destroy()
            });
        });

        // Heal based on duration upgrade
        const healAmount = 30 + durationLvl * 10;
        const curHP = this.scene.registry.get('playerHP') || 0;
        const maxHP = this.scene.registry.get('playerMaxHP') || 100;
        this.scene.registry.set('playerHP', Math.min(maxHP, curHP + healAmount));

        // Heal VFX: Green "+" symbols floating up + player pulse
        this.scene.poolManager.getDamageText(player.x, player.y - 60, `+${healAmount}`, '#55ff55');
        this.scene.poolManager.getDamageText(player.x, player.y - 75, 'INSPIRERENDE KVAD!', '#ffd700');

        // Player scale pulse
        this.scene.tweens.add({
            targets: player,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 200,
            yoyo: true,
            ease: 'Sine.inOut'
        });

        // Camera flash (gold)
        this.scene.cameras.main.flash(150, 255, 215, 0, false);
        this.scene.cameras.main.shake(120, 0.006);

        // Trigger stat recalculation to update passive bonuses
        this.scene.stats.recalculateStats();
    }

    private activateSeierskvad(): void {
        const vers = (this.scene.registry.get('skaldVers') || 0) as number;

        if (vers < 4) {
            // Feedback: not enough Vers
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (player) {
                this.scene.poolManager.getDamageText(player.x, player.y - 50, 'TRENGER 4 VERS', '#ff4444');
            }
            return;
        }

        if (Date.now() < this.classAbility4CooldownEnd) return;

        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        const cd = 20000;
        const kvadRadiusLvl = levels['kvad_radius'] || 0;
        const ekkoLvl = levels['ekko'] || 0;
        const blodkvadLvl = levels['blodkvad'] || 0;
        const anthemLvl = levels['anthem_of_fury'] || 0;

        // Consume all Vers
        this.scene.registry.set('skaldVers', 0);
        this.scene.registry.set('skaldKvadReady', false);

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const radius = 200 + kvadRadiusLvl * 30;
        const damage = this.scene.stats.damage * 2.5;

        // AOE burst
        const nearbyEntries = this.scene.spatialGrid.findNearby({
            x: player.x, y: player.y, width: 1, height: 1
        }, radius);

        let totalDamageDealt = 0;
        nearbyEntries.forEach(entry => {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                enemy.takeDamage(damage, '#ffd700');
                totalDamageDealt += damage;
                // Stun
                if (enemy.stun && typeof enemy.stun === 'function') {
                    enemy.stun(3000);
                }
            }
        });

        // Blodkvad lifesteal
        if (blodkvadLvl > 0 && totalDamageDealt > 0) {
            const heal = Math.floor(totalDamageDealt * blodkvadLvl * 0.15);
            const curHP = this.scene.registry.get('playerHP') || 0;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            this.scene.registry.set('playerHP', Math.min(maxHP, curHP + heal));
            this.scene.poolManager.getDamageText(player.x, player.y - 40, `+${heal}`, '#55ff55');
        }

        // Ekko: 4 additional damage ticks with enhanced visuals
        if (ekkoLvl > 0) {
            const echoColors = [0xffd700, 0xffcc44, 0xffaa22, 0xff8800]; // Gold → Amber → Orange
            for (let i = 1; i <= 4; i++) {
                this.scene.time.delayedCall(i * 1000, () => {
                    const echoDamage = damage * 0.6;
                    const echoNearby = this.scene.spatialGrid.findNearby({
                        x: player.x, y: player.y, width: 1, height: 1
                    }, radius);

                    let hitCount = 0;
                    echoNearby.forEach(entry => {
                        const enemy = entry.ref as Enemy;
                        if (enemy && enemy.active && !enemy.getIsDead()) {
                            enemy.takeDamage(echoDamage, '#ffcc44');
                            hitCount++;

                            // Visual: Musical note spinning above enemy head
                            const noteText = ['♪', '♫', '♬'][i % 3];
                            this.scene.poolManager.getDamageText(enemy.x, enemy.y - 30, noteText, '#ffcc44');
                        }
                    });

                    // Echo wave visual (smaller ring)
                    if (hitCount > 0) {
                        const echoRing = this.scene.add.circle(player.x, player.y, 20, echoColors[i - 1], 0);
                        echoRing.setStrokeStyle(3, echoColors[i - 1], 0.8);
                        echoRing.setDepth(player.depth - 1);
                        this.scene.tweens.add({
                            targets: echoRing,
                            radius: radius * 0.6,
                            alpha: 0,
                            duration: 400,
                            ease: 'Cubic.out',
                            onComplete: () => echoRing.destroy()
                        });

                        this.scene.cameras.main.shake(80 - i * 10, 0.004);
                    }
                });
            }
        }

        // Anthem of Fury buff
        if (anthemLvl > 0) {
            this.scene.buffs.addBuff({
                key: 'anthem_of_fury',
                title: 'RASERI',
                icon: 'item_sword_heavy',
                color: 0xff4400,
                duration: 8000,
                maxStacks: 1,
                isVisible: true,
                data: { level: anthemLvl }
            });
        }

        // Enhanced visual: Cascading sound-wave shockwaves
        // Primary wave
        const primaryRing = this.scene.add.circle(player.x, player.y, 10, 0xffd700, 0.6);
        primaryRing.setStrokeStyle(6, 0xffffff, 0.9);
        primaryRing.setDepth(player.depth - 1);
        this.scene.tweens.add({
            targets: primaryRing,
            radius: radius,
            alpha: 0,
            duration: 500,
            ease: 'Expo.out',
            onComplete: () => primaryRing.destroy()
        });

        // Secondary cascading waves (3 waves trailing behind)
        for (let i = 1; i <= 3; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const secondaryRing = this.scene.add.circle(player.x, player.y, 10, 0xffed4e, 0.4);
                secondaryRing.setStrokeStyle(4, 0xffd700, 0.7);
                secondaryRing.setDepth(player.depth - 1);
                this.scene.tweens.add({
                    targets: secondaryRing,
                    radius: radius * 0.8,
                    alpha: 0,
                    duration: 400,
                    ease: 'Cubic.out',
                    onComplete: () => secondaryRing.destroy()
                });
            });
        }

        // Distortion effect: Intense screen shake + chromatic aberration pulse
        this.scene.cameras.main.shake(220, 0.018);
        this.scene.cameras.main.flash(220, 255, 215, 0, false);

        // Title text + particle burst
        this.scene.poolManager.getDamageText(player.x, player.y - 70, 'SEIERSKVAD!', '#ffd700');

        // Massive particle explosion
        const burstCount = Math.max(15, Math.floor(40 * (this.scene.quality?.particleMultiplier || 1.0)));
        if (this.scene.swordSparkEmitter) {
            this.scene.swordSparkEmitter.setEmitterAngle({ min: 0, max: 360 });
            this.scene.swordSparkEmitter.emitParticleAt(player.x, player.y, burstCount);
        }

        // Stun VFX for hit enemies: Musical note symbols spinning
        nearbyEntries.forEach(entry => {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                // Spiral knockback trajectory (not linear)
                const spiralAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
                const spiralX = Math.cos(spiralAngle + 0.3) * 50;
                const spiralY = Math.sin(spiralAngle + 0.3) * 50;
                if (enemy.body) {
                    enemy.setVelocity(spiralX, spiralY);
                }
            }
        });

        // Trigger stat recalculation to update passive bonuses (Vers now 0)
        this.scene.stats.recalculateStats();
    }

    private activateVersBolt(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !player.active) return;

        const versCooldown = 1200; // Strategic cooldown (increased from 700ms for identity)
        const attackSpeedMult = this.scene.registry.get('playerAttackSpeed') || 1;
        const cd = versCooldown / attackSpeedMult;

        // Check weapon cooldown (not class ability cooldown)
        const lastCd = this.scene.registry.get('weaponCooldown');
        if (lastCd && Date.now() < lastCd.timestamp + lastCd.duration) return;

        this.scene.registry.set('weaponCooldown', { duration: cd, timestamp: Date.now() });
        this.scene.data.set('isAttacking', true);

        player.play('player-cast');

        // Safety valve
        this.scene.time.delayedCall(1500, () => {
            if (this.scene.data.get('isAttacking')) {
                this.scene.data.set('isAttacking', false);
                player.play('player-idle');
            }
        });

        this.scene.time.delayedCall(cd * 0.5, () => {
            const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
            const versDmgLvl = levels['sonic_damage'] || 0;
            const pierceLvl = levels['sonic_pierce'] || 0;
            const slowLvl = levels['stridssang_slow'] || 0;

            const baseDamage = this.scene.stats.damage * 1.1 * (1 + versDmgLvl * 0.20); // VERS_BOLT.damageMult = 1.1
            const slowDuration = slowLvl > 0 ? (500 + slowLvl * 500) : 0;

            const pointer = this.scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

            const bolt = (this.scene as any).sonicBolts.get(player.x, player.y) as import('./SonicBolt').SonicBolt;
            if (bolt) {
                bolt.fire(player.x, player.y, angle, baseDamage, pierceLvl, slowDuration, 'vers');
                AudioManager.instance.playSFX('vers_cast');
                this.scene.events.emit('vers-cast');
            }

            // BUILD VERS on cast
            const currentVers = this.scene.registry.get('skaldVers') || 0;
            if (currentVers < 4) {
                const newVers = currentVers + 1;
                this.scene.registry.set('skaldVers', newVers);

                // Enhanced visual feedback: Expanding golden ring
                const ring = (this.scene as any).add.circle(player.x, player.y, 20, 0xffd700, 0);
                ring.setStrokeStyle(3, 0xffd700, 0.9);
                ring.setDepth(player.depth - 1);
                (this.scene as any).tweens.add({
                    targets: ring,
                    radius: 80,
                    alpha: 0,
                    duration: 600,
                    ease: 'Cubic.out',
                    onComplete: () => ring.destroy()
                });

                // Particle burst
                const particleCount = Math.max(5, Math.floor(12 * (this.scene.quality?.particleMultiplier || 1.0)));
                if ((this.scene as any).swordSparkEmitter) {
                    (this.scene as any).swordSparkEmitter.setEmitterAngle({ min: 0, max: 360 });
                    (this.scene as any).swordSparkEmitter.emitParticleAt(player.x, player.y - 15, particleCount);
                }

                // Visual feedback text
                this.scene.poolManager.getDamageText(player.x, player.y - 50, '+1 VERS', '#ffd700');

                // Musical flash
                const flashIntensity = 80 + newVers * 20;
                (this.scene as any).cameras.main.flash(flashIntensity, 255, 215, 0, false);
                (this.scene as any).cameras.main.shake(80 + newVers * 20, 0.003);

                // Audio feedback
                this.scene.events.emit('vers-gained', newVers);

                // Check if Kvad is ready (4 Vers)
                if (newVers >= 4) {
                    this.scene.registry.set('skaldKvadReady', true);
                    (this.scene as any).cameras.main.flash(200, 255, 215, 0, false);
                    this.scene.poolManager.getDamageText(player.x, player.y - 70, 'KVAD KLAR!', '#ffed4e');
                }

                // Trigger stat recalculation
                this.scene.stats.recalculateStats();
            }
        });

        player.once('animationcomplete-player-cast', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }
}

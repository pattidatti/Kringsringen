import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import { Enemy } from './Enemy';
import { Arrow } from './Arrow';
import { AudioManager } from './AudioManager';
import type { GridClient } from './SpatialGrid';

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

    // ── Mastery state ──
    /** Double Vault: whether second vault is available */
    public doubleVaultAvailable: boolean = false;
    private doubleVaultTimer: Phaser.Time.TimerEvent | null = null;
    /** Valkyrie Hymn: shield charges remaining */
    public valkyrieShieldCharges: number = 0;
    public valkyrieAbsorbedDamage: number = 0;
    /** Soul Grapple: linked enemy reference */
    public soulLinkedEnemy: Enemy | null = null;
    public soulLinkExpiry: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /** Check if a weapon/ability slot is unlocked in the registry */
    private isSlotUnlocked(slotId: string): boolean {
        const unlocked = (this.scene.registry.get('unlockedWeapons') || []) as string[];
        return unlocked.includes(slotId);
    }

    public attemptAbility2(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') {
            if (this.isSlotUnlocked('ability_whirlwind')) this.activateWhirlwind();
        } else if (playerClassId === 'wizard') {
            // Wizard hotkey 2 = frost weapon, not an ability — handled by InputManager
            // But if cascade was on hotkey 2 for some config, check here
            if (this.isSlotUnlocked('ability_cascade')) this.activateCascade();
        } else if (playerClassId === 'archer') {
            if (this.isSlotUnlocked('ability_explosive')) this.activatePhantomVolley();
        } else if (playerClassId === 'skald') {
            if (this.isSlotUnlocked('ability_vers_bolt')) this.activateViolin();
        }
    }

    public attemptAbility3(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') {
            if (this.isSlotUnlocked('ability_bulwark')) this.activateIronBulwark();
        } else if (playerClassId === 'archer') {
            if (this.isSlotUnlocked('ability_vault')) {
                // ── MASTERY: Double Vault — free second activation ──
                if (this.doubleVaultAvailable && Date.now() < this.classAbility3CooldownEnd) {
                    this.doubleVaultAvailable = false;
                    if (this.doubleVaultTimer) { this.doubleVaultTimer.remove(); this.doubleVaultTimer = null; }
                    this.activateDoubleVaultSecond();
                } else {
                    this.activateVaultAndVolley();
                }
            }
        } else if (playerClassId === 'skald') {
            if (this.isSlotUnlocked('ability_kvad_inspire')) this.activateInspirendeKvad();
        }
    }

    public attemptAbility4(): void {
        const playerClassId = resolveClassId(this.scene.registry.get('playerClass'));
        if (playerClassId === 'krieger') {
            if (this.isSlotUnlocked('ability_grapple')) this.activateChainGrapple();
        } else if (playerClassId === 'archer') {
            if (this.isSlotUnlocked('ability_decoy')) this.activateShadowDecoy();
        } else if (playerClassId === 'skald') {
            if (this.isSlotUnlocked('ability_kvad_seier')) this.activateSeierskvad();
        }
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
            duration: whirlDuration,
            maxStacks: 1,
            isVisible: true,
            description: 'Roterer og gjør skade',
            category: 'combat',
            priority: 12
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
                    e.pushback(px, py, this.scene.stats.knockback);
                    e.takeDamage(damage, color);
                    hitCount++;
                }
            }
            return hitCount;
        };

        // ── MASTERY: Eternal Storm — double duration, allow 50% movement ──
        const eternalStormLvl = levels['eternal_storm'] || 0;
        const whirlDuration = eternalStormLvl > 0 ? 6000 : 3000;
        const whirlRotations = eternalStormLvl > 0 ? Math.PI * 48 : Math.PI * 24;

        if (eternalStormLvl > 0) {
            // Allow 50% movement during whirlwind
            this.scene.data.set('whirlwindMoveSpeed', 0.5);
        }

        // ── MASTERY: Splinter Storm — fire 8 arrows at activation ──
        const splinterStormLvl = levels['splinter_storm'] || 0;
        if (splinterStormLvl > 0) {
            for (let i = 0; i < 8; i++) {
                const arrowAngle = (i / 8) * Math.PI * 2;
                const arrow = (this.scene as any).arrows?.get(player.x, player.y) as Arrow;
                if (arrow) {
                    arrow.fire(player.x, player.y, arrowAngle, damage * 0.5, 700, 2, 0, 0, 0, 0, false);
                    arrow.setTint(0xff4400);
                }
            }
        }

        this.scene.tweens.add({
            targets: player,
            rotation: whirlRotations,
            duration: whirlDuration,
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
        const totalTicks = Math.floor(whirlDuration / 200);
        for (let i = 0; i < totalTicks; i++) {
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
            isVisible: true,
            description: 'Skyter flere piler',
            category: 'combat',
            priority: 12
        });

        // Fire loop
        const fireInterval = 1500 / totalArrows;
        let volleyArrowIndex = 0;

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

                    // Only every 4th arrow gets glow to prevent FPS drops (15-40 lights = massive cost)
                    const withLight = (volleyArrowIndex % 4 === 0);
                    volleyArrowIndex++;

                    // ── MASTERY: Fate Volley — homing arrows ──
                    const fateVolleyLvl = levels['fate_volley'] || 0;
                    const arrowSpeed = fateVolleyLvl > 0 ? 600 : 900; // Slower for homing feel

                    // Fast arrows, pierce applied
                    arrow.fire(player.x, player.y, finalAngle, baseDamage, arrowSpeed, pierceCount, 0, 0, poisonLvl, 0, withLight);
                    if (fateVolleyLvl > 0) {
                        arrow.setData('isHoming', true);
                        arrow.setTint(0xffaa00);
                    }

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

        // ── MASTERY: Hail Storm — spawn frost zones at volley impact area ──
        const hailStormLvl = levels['hail_storm'] || 0;
        if (hailStormLvl > 0) {
            const hailTarget = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            // Spawn frost zones in a pattern around target
            for (let i = 0; i < 3; i++) {
                const hx = hailTarget.x + (Math.random() - 0.5) * 200;
                const hy = hailTarget.y + (Math.random() - 0.5) * 200;
                this.scene.time.delayedCall(i * 300, () => {
                    this.spawnHazardArea(hx, hy, this.scene.stats.damage * 0.3, 3000, 100, 0x0088ff);
                    this.scene.poolManager?.spawnFrostExplosion(hx, hy);
                });
            }
        }
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
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        // ── MASTERY: Elementær Konvergens — cascade deals 0 damage, buffs spells ──
        const convergenceLvl = levels['elemental_convergence'] || 0;
        const finalDamage = convergenceLvl > 0 ? 0 : baseDamage;

        // ── MASTERY: Dimension Rift — teleport enemies to center every 1s, 3x final explosion ──
        const dimensionRiftLvl = levels['dimension_rift'] || 0;
        const finalCenterMult = dimensionRiftLvl > 0 ? centerDamageMult * 3 : centerDamageMult;

        const singularity = this.scene.singularities.get(spawnX, spawnY) as import('./Singularity').Singularity | null;
        if (singularity) {
            singularity.spawn(spawnX, spawnY, duration, radiusMult, finalDamage, finalCenterMult, damageReduction);

            // Dimension Rift: teleport enemies to center every 1s
            if (dimensionRiftLvl > 0) {
                const riftRadius = 200 * radiusMult;
                const teleportTimer = this.scene.time.addEvent({
                    delay: 1000,
                    repeat: Math.floor(duration / 1000) - 1,
                    callback: () => {
                        const nearby = this.scene.spatialGrid.findNearby({ x: spawnX, y: spawnY, width: 1, height: 1 }, riftRadius);
                        let teleported = 0;
                        for (const entry of nearby) {
                            if (teleported >= 3) break;
                            const e = entry.ref as Enemy;
                            if (e && e.active && !e.getIsDead()) {
                                e.setPosition(spawnX + (Math.random() - 0.5) * 30, spawnY + (Math.random() - 0.5) * 30);
                                e.setVelocity(0, 0);
                                teleported++;
                            }
                        }
                        if (teleported > 0) {
                            this.scene.cameras.main.shake(80, 0.005);
                        }
                    }
                });
            }

            // Elemental Convergence: set spell buff flags
            if (convergenceLvl > 0) {
                this.scene.data.set('convergenceActiveUntil', Date.now() + duration);
                this.scene.time.delayedCall(duration, () => {
                    this.scene.data.set('convergenceActiveUntil', 0);
                });
            }

            this.scene.buffs.addBuff({
                key: 'cascade',
                title: 'CASCADE',
                icon: 'item_orb_purple',
                color: convergenceLvl > 0 ? 0xffdd00 : 0xcc88ff,
                duration: duration,
                maxStacks: 1,
                isVisible: true,
                description: convergenceLvl > 0 ? 'Konvergens aktiv — buff modus' : 'Tyngdefelt aktiv',
                category: 'ultimate',
                priority: 13
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
            title: 'JERNBOLVERK',
            icon: 'item_shield',
            color: 0x00ccff,
            duration: duration,
            maxStacks: 1,
            isVisible: true,
            description: 'Skjold aktivert',
            category: 'combat',
            priority: 11
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

        // Shield activation SFX
        AudioManager.instance.playSFX('shield_activate', { volume: 0.6 });
        this.scene.registry.set('bulwarkActiveUntil', Date.now() + duration);

        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // ── MASTERY: Thorn Fortress — reflect blocked damage as AoE ──
        const thornFortressLvl = levels['thorn_fortress'] || 0;
        if (thornFortressLvl > 0) {
            this.scene.data.set('thornFortressActive', true);
            this.scene.time.delayedCall(duration, () => {
                this.scene.data.set('thornFortressActive', false);
            });
        }

        // ── MASTERY: Gravity Wall — pull enemies within 200px during bulwark ──
        const gravityWallLvl = levels['gravity_wall'] || 0;
        if (gravityWallLvl > 0) {
            const pullRadius = 200;
            const pullStrength = 30;
            const pullTimer = this.scene.time.addEvent({
                delay: 100,
                repeat: Math.floor(duration / 100) - 1,
                callback: () => {
                    if (!player.active) { pullTimer.remove(); return; }
                    const nearby = this.scene.spatialGrid.findNearby(
                        { x: player.x, y: player.y, width: 1, height: 1 }, pullRadius
                    );
                    for (const entry of nearby) {
                        const e = entry.ref as Enemy;
                        if (e && e.active && !e.getIsDead()) {
                            const ang = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
                            const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
                            if (dist > 30) {
                                e.setVelocity(
                                    Math.cos(ang) * pullStrength * (1 - dist / pullRadius),
                                    Math.sin(ang) * pullStrength * (1 - dist / pullRadius)
                                );
                            }
                        }
                    }
                }
            });
            // Knockback explosion at end
            this.scene.time.delayedCall(duration, () => {
                const nearby = this.scene.spatialGrid.findNearby(
                    { x: player.x, y: player.y, width: 1, height: 1 }, pullRadius
                );
                for (const entry of nearby) {
                    const e = entry.ref as Enemy;
                    if (e && e.active && !e.getIsDead()) {
                        e.pushback(player.x, player.y, this.scene.stats.knockback * 3);
                        e.takeDamage(this.scene.stats.damage, '#00ccff');
                    }
                }
                this.scene.poolManager.spawnFireballExplosion(player.x, player.y);
                this.scene.cameras.main.shake(200, 0.015);
            });
        }
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

    private spawnHazardArea(x: number, y: number, dps: number, duration: number, radius: number = 100, color: number = 0xff4400): void {
        const fireAura = this.scene.add.circle(x, y, radius, color, 0.3).setDepth(1);
        this.scene.tweens.add({
            targets: fireAura,
            alpha: 0.1,
            scale: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 300
        });
        const tickRate = 500;
        let elapsed = 0;
        const tickEvent = this.scene.time.addEvent({
            delay: tickRate,
            callback: () => {
                elapsed += tickRate;
                if (elapsed >= duration) {
                    tickEvent.remove();
                    fireAura.destroy();
                    return;
                }
                const nearby = this.scene.spatialGrid.findNearby({ x, y, width: 1, height: 1 }, radius);
                for (const cell of nearby) {
                    const e = cell.ref as Enemy;
                    if (e && e.active && !e.getIsDead()) {
                        e.takeDamage(dps * (tickRate / 1000), '#ff4400');
                    }
                }
            },
            loop: true
        });
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
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const cdLvl        = levels['grapple_cooldown']  || 0;
        const radiusLvl    = levels['grapple_radius']    || 0;
        const damageLvl    = levels['grapple_damage']    || 0;
        const stunLvl      = levels['grapple_stun']      || 0;
        const lifestealLvl = levels['grapple_lifesteal'] || 0;
        const chainLvl     = levels['grapple_chain']     || 0;

        const cd     = Math.max(6000, 10000 - cdLvl * 1000);
        const radius = 400 * (1 + radiusLvl * 0.25);
        const damage = damageLvl * 75;

        if (Date.now() < this.classAbility4CooldownEnd) return;

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

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

        // ── MASTERY: Lava Chain — spawn fire hazard areas along grapple path ──
        const lavaChainLvl = levels['lava_chain'] || 0;
        if (lavaChainLvl > 0) {
            const pointer = this.scene.input.activePointer;
            const grappleAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            const steps = 4;
            for (let i = 1; i <= steps; i++) {
                const t = i / (steps + 1);
                const hx = player.x + Math.cos(grappleAngle) * radius * t;
                const hy = player.y + Math.sin(grappleAngle) * radius * t;
                this.spawnHazardArea(hx, hy, this.scene.stats.damage * 0.4, 4000, 80, 0xff4400);
            }
        }

        // ── MASTERY: Soul Grapple — link player to first grappled enemy for lifesteal ──
        const soulGrappleLvl = levels['soul_grapple'] || 0;
        if (soulGrappleLvl > 0 && nearbyEntries.length > 0) {
            // Find first valid enemy
            for (const entry of nearbyEntries) {
                const e = entry.ref as Enemy;
                if (e && e.active && !e.getIsDead()) {
                    this.soulLinkedEnemy = e;
                    this.soulLinkExpiry = Date.now() + 5000;
                    this.scene.poolManager.getDamageText(e.x, e.y - 50, '⛓ SJELELENKE', '#cc44ff');
                    break;
                }
            }
        }

        if (chainLvl > 0) {
            // Split enemies into two hemispheres based on pointer direction
            const pointer = this.scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);

            const frontEntries: GridClient[] = [];
            const backEntries: GridClient[] = [];

            nearbyEntries.forEach(entry => {
                const enemy = entry.ref as Enemy;
                if (enemy && enemy.active && !enemy.getIsDead()) {
                    const ex = enemy.x - player.x;
                    const ey = enemy.y - player.y;
                    const dot = ex * dirX + ey * dirY;
                    if (dot >= 0) frontEntries.push(entry);
                    else backEntries.push(entry);
                }
            });

            this.runGrapplePull(player, frontEntries, damage, stunLvl, lifestealLvl, 0xcccccc);
            this.runGrapplePull(player, backEntries, damage, stunLvl, lifestealLvl, 0xffaa44);
        } else {
            this.runGrapplePull(player, nearbyEntries, damage, stunLvl, lifestealLvl, 0xcccccc);
        }
    }

    private runGrapplePull(
        player: Phaser.Physics.Arcade.Sprite,
        entries: readonly GridClient[],
        damage: number,
        stunLvl: number,
        lifestealLvl: number,
        chainColor: number
    ): void {
        const chainGraphics = this.scene.add.graphics();
        chainGraphics.setDepth(player.depth - 1);
        const activeChains: Array<{ enemy: Enemy, color: number }> = [];

        entries.forEach(entry => {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                activeChains.push({ enemy, color: chainColor });

                // Tension phase before the pull starts
                enemy.setTint(0xffaa00);
                if (enemy.body) enemy.setVelocity(0, 0);

                this.scene.time.delayedCall(150, () => {
                    if (!enemy.active || enemy.getIsDead()) return;

                    enemy.clearTint();
                    this.scene.tweens.add({
                        targets: enemy,
                        x: player.x + (enemy.x - player.x) * 0.15,
                        y: player.y + (enemy.y - player.y) * 0.15,
                        duration: 350,
                        ease: 'Back.out',
                        onUpdate: () => {
                            if (enemy.body) enemy.setVelocity(0, 0);
                        },
                        onComplete: () => {
                            if (!enemy.active) return;

                            const idx = activeChains.findIndex(c => c.enemy === enemy);
                            if (idx !== -1) activeChains.splice(idx, 1);

                            this.scene.swordSparkEmitter.emitParticleAt(enemy.x, enemy.y, 5);
                            this.scene.cameras.main.shake(100, 0.008);

                            if (damage > 0) {
                                enemy.takeDamage(damage, '#ffaa00');
                                if (lifestealLvl > 0) {
                                    const heal = Math.floor(damage * lifestealLvl * 0.15);
                                    const curHP = this.scene.registry.get('playerHP') || 0;
                                    const maxHP = this.scene.registry.get('playerMaxHP') || 100;
                                    this.scene.registry.set('playerHP', Math.min(maxHP, curHP + heal));
                                    this.scene.poolManager.getDamageText(player.x, player.y - 40, `+${heal}`, '#55ff55');
                                }
                                if (stunLvl > 0) {
                                    enemy.stun(1000);
                                    this.scene.poolManager.getDamageText(enemy.x, enemy.y - 50, '★ STUNNET', '#ffed4e');
                                }
                            } else {
                                this.scene.poolManager.getDamageText(enemy.x, enemy.y - 40, 'PULL!', '#ffffff');
                            }

                            enemy.setTint(0xffffff);
                            this.scene.time.delayedCall(200, () => { if (enemy.active) enemy.clearTint(); });
                        }
                    });
                });
            }
        });

        // Dynamic Chain Rendering Loop
        const renderTimer = this.scene.time.addEvent({
            delay: 16,
            repeat: 100,
            callback: () => {
                chainGraphics.clear();
                if (activeChains.length === 0) {
                    renderTimer.destroy();
                    chainGraphics.destroy();
                    return;
                }

                activeChains.forEach(chain => {
                    if (chain.enemy && chain.enemy.active) {
                        chainGraphics.lineStyle(2, chain.color, 0.8);

                        const startX = player.x;
                        const startY = player.y;
                        const endX = chain.enemy.x;
                        const endY = chain.enemy.y;

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

                        chainGraphics.fillStyle(0xffffff, 1);
                        chainGraphics.fillCircle(endX, endY, 4);
                    }
                });
            }
        });
    }

    private activateVaultAndVolley(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // vault_cooldown: 7s → 5.5 → 4.5 → 3.5
        const cdLvl = levels['vault_cooldown'] || 0;
        const cd = ([7000, 5500, 4500, 3500][cdLvl]) ?? 7000;

        if (Date.now() < this.classAbility3CooldownEnd) return;

        this.classAbility3CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility3Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

        // vault_distance: base 180px, +30% per level
        const leapDist = 180 * (1 + (levels['vault_distance'] || 0) * 0.30);
        const targetX = player.x - Math.cos(angle) * leapDist;
        const targetY = player.y - Math.sin(angle) * leapDist;

        // ── MASTERY: Shadow Vault — leave poison cloud at origin ──
        const shadowVaultLvl = levels['shadow_vault'] || 0;
        if (shadowVaultLvl > 0) {
            this.spawnHazardArea(player.x, player.y, this.scene.stats.damage * 0.5, 4000, 120, 0x44ff44);
        }

        // ── MASTERY: Double Vault — allow second vault within 2s ──
        const doubleVaultLvl = levels['double_vault'] || 0;
        if (doubleVaultLvl > 0) {
            this.doubleVaultAvailable = true;
            if (this.doubleVaultTimer) this.doubleVaultTimer.remove();
            this.doubleVaultTimer = this.scene.time.delayedCall(2000, () => {
                this.doubleVaultAvailable = false;
            });
        }

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

        // vault_arrows: base half-width 2 (5 arrows), +1 per level (→7, 9, 11)
        const half = 2 + (levels['vault_arrows'] || 0);
        // vault_damage: base 0.7x, +25% per level
        const damageMult = 0.7 * (1 + (levels['vault_damage'] || 0) * 0.25);
        // vault_pierce: +1 pierce per level
        const pierceLvl = levels['vault_pierce'] || 0;

        for (let i = -half; i <= half; i++) {
            const arrowAngle = angle + (i * 0.15);
            const arrow = (this.scene as any).arrows.get(player.x, player.y) as Arrow;
            if (arrow) {
                // Ability 3 optimization: Only the middle arrow (i=0) has light to prevent FPS drops
                arrow.fire(player.x, player.y, arrowAngle, this.scene.stats.damage * damageMult, 700, pierceLvl, 0, 0, 0, 0, i === 0);
            }
        }
    }

    /** Double Vault second activation: 360° arrows, free, i-frames */
    private activateDoubleVaultSecond(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        const leapDist = 180 * (1 + (levels['vault_distance'] || 0) * 0.30);
        const targetX = player.x - Math.cos(angle) * leapDist;
        const targetY = player.y - Math.sin(angle) * leapDist;

        this.scene.tweens.add({
            targets: player,
            x: targetX,
            y: targetY,
            duration: 300,
            ease: 'Cubic.out'
        });

        // 360° arrows
        const damageMult = 0.7 * (1 + (levels['vault_damage'] || 0) * 0.25);
        for (let i = 0; i < 12; i++) {
            const arrowAngle = (i / 12) * Math.PI * 2;
            const arrow = (this.scene as any).arrows?.get(player.x, player.y) as Arrow;
            if (arrow) {
                arrow.fire(player.x, player.y, arrowAngle, this.scene.stats.damage * damageMult, 700, 0, 0, 0, 0, 0, false);
            }
        }
    }

    private activateShadowDecoy(): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // decoy_cooldown: 15s → 12 → 9 → 7
        const cdLvl = levels['decoy_cooldown'] || 0;
        const cd = ([15000, 12000, 9000, 7000][cdLvl]) ?? 15000;

        if (Date.now() < this.classAbility4CooldownEnd) return;

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // decoy_duration: base 3000ms + 2000ms per level
        const decoyLifespan = 3000 + (levels['decoy_duration'] || 0) * 2000;
        const withExplosion = (levels['decoy_explode'] || 0) > 0;
        const withMimic = (levels['decoy_mimic'] || 0) > 0;

        // Spawn Decoy
        const decoy = (this.scene as any).decoys.get(player.x, player.y) as any;
        if (decoy) {
            decoy.spawn(player.x, player.y, decoyLifespan, withExplosion, withMimic);
        }

        // ── MASTERY: Doppelganger — decoy fires arrows + teleport on death ──
        const doppelgangerLvl = levels['doppelganger'] || 0;
        if (doppelgangerLvl > 0 && decoy) {
            // Decoy fires arrows at 50% damage
            const decoyShootTimer = this.scene.time.addEvent({
                delay: 800,
                repeat: Math.floor(decoyLifespan / 800) - 1,
                callback: () => {
                    if (!decoy.active) { decoyShootTimer.remove(); return; }
                    // Find nearest enemy
                    const nearbyEn = this.scene.spatialGrid.findNearby({ x: decoy.x, y: decoy.y, width: 1, height: 1 }, 400);
                    for (const cell of nearbyEn) {
                        const e = cell.ref as Enemy;
                        if (e && e.active && !e.getIsDead()) {
                            const ang = Phaser.Math.Angle.Between(decoy.x, decoy.y, e.x, e.y);
                            const arrow = (this.scene as any).arrows?.get(decoy.x, decoy.y) as Arrow;
                            if (arrow) {
                                arrow.fire(decoy.x, decoy.y, ang, this.scene.stats.damage * 0.5, 700, 0, 0, 0, 0, 0, false);
                                arrow.setTint(0xcc44ff);
                            }
                            break;
                        }
                    }
                }
            });
            // Teleport player to decoy on death/expiry
            this.scene.time.delayedCall(decoyLifespan, () => {
                if (player.active && decoy) {
                    player.setPosition(decoy.x, decoy.y);
                    player.setAlpha(1);
                    this.scene.cameras.main.shake(100, 0.008);
                }
            });
        }

        // ── MASTERY: Trap Network — spawn 3 mini-decoys that chain-explode on proximity ──
        const trapNetworkLvl = levels['trap_network'] || 0;
        if (trapNetworkLvl > 0) {
            for (let i = 0; i < 3; i++) {
                const offsetAngle = (i / 3) * Math.PI * 2;
                const tx = player.x + Math.cos(offsetAngle) * 80;
                const ty = player.y + Math.sin(offsetAngle) * 80;
                const miniDecoy = this.scene.add.circle(tx, ty, 12, 0xff6600, 0.7).setDepth(player.depth - 1);
                miniDecoy.setStrokeStyle(2, 0xffaa00, 0.8);
                // Pulsing
                this.scene.tweens.add({
                    targets: miniDecoy,
                    alpha: { from: 0.4, to: 0.8 },
                    scale: { from: 0.8, to: 1.2 },
                    yoyo: true,
                    repeat: -1,
                    duration: 400
                });
                // Proximity check
                const checkTimer = this.scene.time.addEvent({
                    delay: 200,
                    repeat: Math.floor(decoyLifespan / 200) - 1,
                    callback: () => {
                        if (!miniDecoy.active) { checkTimer.remove(); return; }
                        const nearby = this.scene.spatialGrid.findNearby({ x: tx, y: ty, width: 1, height: 1 }, 60);
                        for (const cell of nearby) {
                            const e = cell.ref as Enemy;
                            if (e && e.active && !e.getIsDead()) {
                                // Detonate all mini-decoys
                                checkTimer.remove();
                                miniDecoy.destroy();
                                this.scene.poolManager.spawnFireballExplosion(tx, ty);
                                const blastNearby = this.scene.spatialGrid.findNearby({ x: tx, y: ty, width: 1, height: 1 }, 130);
                                for (const bc of blastNearby) {
                                    const be = bc.ref as Enemy;
                                    if (be && be.active && !be.getIsDead()) {
                                        be.takeDamage(this.scene.stats.damage * 1.5, '#ff6600');
                                        be.pushback(tx, ty, 250);
                                    }
                                }
                                break;
                            }
                        }
                    }
                });
                // Auto-destroy after lifespan
                this.scene.time.delayedCall(decoyLifespan, () => { if (miniDecoy.active) miniDecoy.destroy(); });
            }
        }

        // decoy_invis: base 1500ms + 1000ms per level
        const invisDuration = 1500 + (levels['decoy_invis'] || 0) * 1000;
        player.setAlpha(0.3);
        this.scene.time.delayedCall(invisDuration, () => {
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
        const hornHealLvl = levels['horn_heal'] || 0;
        const hornCdLvl   = levels['horn_cooldown'] || 0;
        const duration = 5000 + durationLvl * 1000;
        const cd = Math.max(3000, 8000 - hornCdLvl * 1000);

        // CONSUME 2 VERS
        this.scene.registry.set('skaldVers', vers - 2);
        this.scene.registry.set('skaldKvadReady', false);

        this.classAbility3CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility3Cooldown', { duration: cd, timestamp: Date.now() });

        this.scene.buffs.addBuff({
            key: 'horn',
            title: 'HORN',
            icon: 'item_moon_crescent',
            color: 0xffd700,
            duration: duration,
            maxStacks: 1,
            isVisible: true,
            description: '+25% skade og fart',
            statModifiers: [
                { type: 'damage', value: 25, displayFormat: 'percent' },
                { type: 'speed', value: 25, displayFormat: 'percent' }
            ],
            category: 'ultimate',
            priority: 15
        });

        // Shield/Aura activation SFX (magical protective aura)
        AudioManager.instance.playSFX('shield_activate', { volume: 0.5, pitch: 0.95 });

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

        // Heal based on duration upgrade and horn_heal upgrade
        const healAmount = 30 + durationLvl * 10 + hornHealLvl * 15;
        const curHP = this.scene.registry.get('playerHP') || 0;
        const maxHP = this.scene.registry.get('playerMaxHP') || 100;
        this.scene.registry.set('playerHP', Math.min(maxHP, curHP + healAmount));

        // Heal VFX: Green "+" symbols floating up + player pulse
        this.scene.poolManager.getDamageText(player.x, player.y - 60, `+${healAmount}`, '#55ff55');
        this.scene.poolManager.getDamageText(player.x, player.y - 75, 'HORN!', '#ffd700');

        // Player scale pulse
        this.scene.tweens.add({
            targets: player,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 200,
            yoyo: true,
            ease: 'Sine.inOut'
        });

        this.scene.cameras.main.shake(120, 0.006);

        // ── MASTERY: Valkyrie Hymn — grant 3-hit absorption shield ──
        const valkyrieHymnLvl = levels['valkyrie_hymn'] || 0;
        if (valkyrieHymnLvl > 0) {
            this.valkyrieShieldCharges = 3;
            this.valkyrieAbsorbedDamage = 0;
            this.scene.data.set('valkyrieShieldActive', true);
            this.scene.poolManager.getDamageText(player.x, player.y - 90, '🛡 VALKYRJE', '#ffd700');
        }

        // ── MASTERY: War Horn Echo — pulsing AoE damage during horn ──
        const warHornEchoLvl = levels['war_horn_echo'] || 0;
        if (warHornEchoLvl > 0) {
            const versCount = (this.scene.registry.get('skaldVers') || 0) as number;
            const pulseTimer = this.scene.time.addEvent({
                delay: 2000,
                repeat: Math.floor(duration / 2000) - 1,
                callback: () => {
                    if (!player.active) { pulseTimer.remove(); return; }
                    const pulseRadius = 150;
                    const currentVers = (this.scene.registry.get('skaldVers') || 0) as number;
                    const pulseDamage = this.scene.stats.damage * 0.5 * (1 + currentVers * 0.1);
                    const nearby = this.scene.spatialGrid.findNearby(
                        { x: player.x, y: player.y, width: 1, height: 1 }, pulseRadius
                    );
                    for (const entry of nearby) {
                        const e = entry.ref as Enemy;
                        if (e && e.active && !e.getIsDead()) {
                            e.takeDamage(pulseDamage, '#ffd700');
                        }
                    }
                    // Visual: expanding gold ring
                    const ring = this.scene.add.circle(player.x, player.y, 20, 0xffd700, 0.3);
                    ring.setStrokeStyle(3, 0xffd700, 0.8);
                    ring.setDepth(player.depth - 1);
                    this.scene.tweens.add({
                        targets: ring,
                        radius: pulseRadius,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => ring.destroy()
                    });
                }
            });
        }

        // Trigger stat recalculation to update passive bonuses
        this.scene.stats.recalculateStats();
    }

    private activateSeierskvad(): void {
        const vers = (this.scene.registry.get('skaldVers') || 0) as number;
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const krigsbardeActive = (levels['krigsbarde'] || 0) > 0;
        const requiredVers = krigsbardeActive ? 4 : 5;

        if (vers < requiredVers) {
            // Feedback: not enough Vers
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (player) {
                this.scene.poolManager.getDamageText(player.x, player.y - 50, `TRENGER ${requiredVers} VERS`, '#ff4444');
            }
            return;
        }

        if (Date.now() < this.classAbility4CooldownEnd) return;

        const cd = 20000;
        const kvadRadiusLvl = levels['kvad_radius'] || 0;
        const ekkoLvl = levels['ekko'] || 0;
        const blodkvadLvl = levels['blodkvad'] || 0;
        const anthemLvl = levels['anthem_of_fury'] || 0;
        const ragnarokLvl = levels['ragnarok_requiem'] || 0;
        const eternalVerseLvl = levels['eternal_verse'] || 0;

        // ── MASTERY: Eternal Verse — costs 3 Vers instead of 5, 60% damage ──
        if (eternalVerseLvl > 0) {
            this.scene.registry.set('skaldVers', Math.max(0, vers - 3));
        } else {
            // Consume all Vers
            this.scene.registry.set('skaldVers', 0);
        }
        this.scene.registry.set('skaldKvadReady', false);

        this.classAbility4CooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbility4Cooldown', { duration: cd, timestamp: Date.now() });

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const radius = 200 + kvadRadiusLvl * 30 + (ragnarokLvl > 0 ? 100 : 0);
        const damage = this.scene.stats.damage * (eternalVerseLvl > 0 ? 1.5 : 2.5) * (ragnarokLvl > 0 ? 1.5 : 1);

        // AOE burst
        const nearbyEntries = this.scene.spatialGrid.findNearby({
            x: player.x, y: player.y, width: 1, height: 1
        }, radius);

        let totalDamageDealt = 0;
        let stunCount = 0;
        nearbyEntries.forEach(entry => {
            const enemy = entry.ref as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                enemy.takeDamage(damage, '#ffd700');
                totalDamageDealt += damage;
                // Bosses get half stun duration to signal resistance
                const isBoss = !!(enemy as any).bossConfig;
                const stunDuration = isBoss ? 1500 : 3000;
                if (enemy.stun && typeof enemy.stun === 'function') {
                    enemy.stun(stunDuration);
                    stunCount++;
                    // Stun indicator above enemy
                    this.scene.poolManager.getDamageText(enemy.x, enemy.y - 50, '★ STUNNET', '#ffed4e');
                }
            }
        });

        // ── MASTERY: Ragnarök Requiem — killed enemies become temporary allies ──
        if (ragnarokLvl > 0) {
            nearbyEntries.forEach(entry => {
                const enemy = entry.ref as Enemy;
                if (enemy && (!enemy.active || enemy.getIsDead())) {
                    // Create a green-tinted "ghost" ally at enemy position
                    const ghost = this.scene.add.sprite(enemy.x, enemy.y, enemy.texture.key, enemy.frame?.name);
                    ghost.setTint(0x44ff44);
                    ghost.setAlpha(0.7);
                    ghost.setScale(enemy.scaleX, enemy.scaleY);
                    ghost.setDepth(enemy.depth);
                    ghost.postFX.addGlow(0x44ff44, 4, 0, false, 0.1, 8);

                    // Ghost chases and attacks nearby enemies for 3s
                    let ghostLife = 3000;
                    const ghostTimer = this.scene.time.addEvent({
                        delay: 200,
                        repeat: 14,
                        callback: () => {
                            ghostLife -= 200;
                            if (ghostLife <= 0) {
                                ghostTimer.remove();
                                this.scene.tweens.add({
                                    targets: ghost,
                                    alpha: 0,
                                    duration: 300,
                                    onComplete: () => ghost.destroy()
                                });
                                return;
                            }
                            // Find nearest living enemy and move toward it
                            const nearby2 = this.scene.spatialGrid.findNearby({ x: ghost.x, y: ghost.y, width: 1, height: 1 }, 200);
                            for (const cell of nearby2) {
                                const target = cell.ref as Enemy;
                                if (target && target.active && !target.getIsDead()) {
                                    const ang = Phaser.Math.Angle.Between(ghost.x, ghost.y, target.x, target.y);
                                    ghost.x += Math.cos(ang) * 15;
                                    ghost.y += Math.sin(ang) * 15;
                                    const dist = Phaser.Math.Distance.Between(ghost.x, ghost.y, target.x, target.y);
                                    if (dist < 40) {
                                        target.takeDamage(damage * 0.5, '#44ff44');
                                    }
                                    break;
                                }
                            }
                        }
                    });
                }
            });
        }

        // ── MASTERY: Eternal Verse — 10s window for permanent damage stacking ──
        if (eternalVerseLvl > 0) {
            this.scene.data.set('eternalVerseActiveUntil', Date.now() + 10000);
            this.scene.data.set('eternalVerseStacks', 0);
            this.scene.poolManager.getDamageText(player.x, player.y - 90, '♫ EVIG VERS AKTIV', '#ffd700');
        }

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
            const damageBonus = anthemLvl * 20;
            this.scene.buffs.addBuff({
                key: 'anthem_of_fury',
                title: 'RASERIETS HYMNE',
                icon: 'item_sword_heavy',
                color: 0xff4400,
                duration: 8000,
                maxStacks: 1,
                isVisible: true,
                description: `+${damageBonus}% skade`,
                statModifiers: [{
                    type: 'damage',
                    value: damageBonus,
                    displayFormat: 'percent'
                }],
                category: 'ultimate',
                priority: 14,
                data: { level: anthemLvl }
            });
        }

        // Enhanced visual: Cascading sound-wave shockwaves
        // Primary wave — expands to full radius so player can see what got hit
        const primaryRing = this.scene.add.circle(player.x, player.y, 10, 0xffd700, 0.5);
        primaryRing.setStrokeStyle(6, 0xffffff, 0.9);
        primaryRing.setDepth(player.depth - 1);
        this.scene.tweens.add({
            targets: primaryRing,
            radius: radius,
            alpha: 0.1,
            duration: 600,
            ease: 'Sine.out',
            onComplete: () => {
                // Hold briefly at full radius so player reads the area
                this.scene.tweens.add({
                    targets: primaryRing,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => primaryRing.destroy()
                });
            }
        });

        // Secondary cascading waves (3 waves trailing behind)
        for (let i = 1; i <= 3; i++) {
            this.scene.time.delayedCall(i * 120, () => {
                const secondaryRing = this.scene.add.circle(player.x, player.y, 10, 0xffed4e, 0.4);
                secondaryRing.setStrokeStyle(4, 0xffd700, 0.7);
                secondaryRing.setDepth(player.depth - 1);
                this.scene.tweens.add({
                    targets: secondaryRing,
                    radius: radius * 0.8,
                    alpha: 0,
                    duration: 450,
                    ease: 'Cubic.out',
                    onComplete: () => secondaryRing.destroy()
                });
            });
        }

        // Distortion effect: Intense screen shake + chromatic aberration pulse
        this.scene.cameras.main.shake(220, 0.018);

        // Feedback: show how many enemies were stunned
        const feedbackText = stunCount > 0 ? `${stunCount} STUNNET!` : 'PANFLØYTE!';
        this.scene.poolManager.getDamageText(player.x, player.y - 70, feedbackText, '#ffd700');

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

    private activateViolin(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !player.active) return;

        if (Date.now() < this.classAbilityCooldownEnd) return;

        const cd = 2000;
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.scene.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        this.scene.data.set('isAttacking', true);
        player.play('player-cast');

        // Safety valve
        this.scene.time.delayedCall(1500, () => {
            if (this.scene.data.get('isAttacking')) {
                this.scene.data.set('isAttacking', false);
                player.play('player-idle');
            }
        });

        this.scene.time.delayedCall(cd * 0.3, () => {
            const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
            const versDmgLvl = levels['sonic_damage'] || 0;
            const pierceLvl = levels['sonic_pierce'] || 0;
            const slowLvl = levels['stridssang_slow'] || 0;

            const vers = (this.scene.registry.get('skaldVers') || 0) as number;
            const poetiskLvl = levels['poetisk_lisens'] || 0;
            const boltCount = Math.max(1 + vers, 1 + poetiskLvl);
            const baseDamage = this.scene.stats.damage * 1.0 * (1 + versDmgLvl * 0.20);
            const slowDuration = slowLvl > 0 ? (500 + slowLvl * 500) : 0;

            const pointer = this.scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

            // Fan spread: total arc scales with Vers (0° at 0 Vers, 40° at 4 Vers)
            const totalArcRad = Phaser.Math.DegToRad(vers * 10);

            for (let i = 0; i < boltCount; i++) {
                let offsetAngle = 0;
                if (boltCount > 1) {
                    offsetAngle = -totalArcRad / 2 + (i / (boltCount - 1)) * totalArcRad;
                }
                const bolt = (this.scene as any).sonicBolts.get(player.x, player.y) as import('./SonicBolt').SonicBolt;
                if (bolt) {
                    bolt.fire(player.x, player.y, angle + offsetAngle, baseDamage, pierceLvl, slowDuration, 'vers');
                }
            }

            AudioManager.instance.playSFX('vers_cast');
            this.scene.events.emit('vers-cast');

            // Visual feedback scales with bolt count
            (this.scene as any).cameras.main.shake(80 + vers * 20, 0.003 + vers * 0.001);

            // Consume all Vers
            if (vers > 0) {
                this.scene.registry.set('skaldVers', 0);
                this.scene.registry.set('skaldKvadReady', false);
                this.scene.stats.recalculateStats();
            }
        });

        player.once('animationcomplete-player-cast', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }
}

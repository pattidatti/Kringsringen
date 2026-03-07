import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { resolveClassId } from '../config/classes';
import type { ClassId } from '../config/classes';
import {
    getUnlockedParagonAbilities,
    getParagonAbilityById,
    type ParagonAbilityDef,
    type ParagonAbilitySlot,
} from '../config/paragon-abilities';
import { AudioManager } from './AudioManager';
import { Enemy } from './Enemy';

/**
 * ParagonAbilityManager — Phaser-side manager for Paragon-tier abilities (E, F, Q).
 *
 * Handles:
 * - Keyboard input for E/F/Q (when Paragon abilities are unlocked)
 * - Cooldown tracking per slot
 * - Ability execution (AoE damage, buffs, debuffs)
 * - Registry updates for React Hotbar cooldown display
 */
export class ParagonAbilityManager {
    private scene: IMainScene;

    /** Cooldown end timestamps per slot */
    private cooldownEnd: Record<ParagonAbilitySlot, number> = { E: 0, F: 0, Q: 0 };

    /** Active buff timers (for duration-based abilities) */
    private activeBuffs: Map<string, { endTime: number; cleanup?: () => void }> = new Map();

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Attempt to activate the Paragon ability on the given slot.
     * Returns true if the ability was activated (so caller can skip class ability).
     */
    public attemptSlot(slot: ParagonAbilitySlot): boolean {
        const paragonLevel = this.scene.registry.get('paragonLevel') || 0;
        if (paragonLevel <= 0) return false;

        const classId = resolveClassId(this.scene.registry.get('playerClass')) as ClassId;
        const abilities = getUnlockedParagonAbilities(classId, paragonLevel);
        const ability = abilities.find(a => a.hotkey === slot);
        if (!ability) return false;

        // Check cooldown
        if (Date.now() < this.cooldownEnd[slot]) return true; // Consumed input but on CD

        this.activateAbility(ability);
        return true;
    }

    /**
     * Check if a Paragon ability is available for the given slot.
     */
    public hasAbilityForSlot(slot: ParagonAbilitySlot): boolean {
        const paragonLevel = this.scene.registry.get('paragonLevel') || 0;
        if (paragonLevel <= 0) return false;
        const classId = resolveClassId(this.scene.registry.get('playerClass')) as ClassId;
        const abilities = getUnlockedParagonAbilities(classId, paragonLevel);
        return abilities.some(a => a.hotkey === slot);
    }

    /**
     * Called every frame from MainScene.update().
     */
    public update(_time: number, _delta: number): void {
        // Clean up expired buffs
        const now = Date.now();
        for (const [key, buff] of this.activeBuffs) {
            if (now >= buff.endTime) {
                buff.cleanup?.();
                this.activeBuffs.delete(key);
            }
        }
    }

    // ─── Core Activation ─────────────────────────────────────────────────────

    private activateAbility(ability: ParagonAbilityDef): void {
        const now = Date.now();
        const slot = ability.hotkey;

        // Apply cooldown reduction from upgrades
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const cdrLevel = levels['time_manipulation'] || 0;
        const cdrMult = cdrLevel > 0 ? Math.pow(0.92, cdrLevel) : 1;
        const cd = ability.cooldown * cdrMult;

        this.cooldownEnd[slot] = now + cd;
        this.scene.registry.set(`paragonAbilityCooldown_${slot}`, { duration: cd, timestamp: now });

        // Dispatch to specific ability handler
        switch (ability.id) {
            // ── Krieger ──
            case 'earthquake_slam': this.doEarthquakeSlam(ability); break;
            case 'blood_rage': this.doBloodRage(ability, cd); break;
            case 'titans_shield': this.doTitansShield(ability); break;
            // ── Archer ──
            case 'rain_of_arrows': this.doRainOfArrows(ability); break;
            case 'shadow_step': this.doShadowStep(ability); break;
            case 'phoenix_arrow': this.doPhoenixArrow(ability); break;
            // ── Wizard ──
            case 'meteor_shower': this.doMeteorShower(ability); break;
            case 'time_warp': this.doTimeWarp(ability); break;
            case 'arcane_nova': this.doArcaneNova(ability); break;
            // ── Skald ──
            case 'war_hymn': this.doWarHymn(ability); break;
            case 'dissonance': this.doDissonance(ability); break;
            case 'ragnarok_vers': this.doRagnarokVers(ability); break;
        }
    }

    // ─── Helper Methods ──────────────────────────────────────────────────────

    private getPlayer(): Phaser.Physics.Arcade.Sprite {
        return this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
    }

    private getBaseDamage(): number {
        return this.scene.stats.damage;
    }

    private getNearbyEnemies(x: number, y: number, radius: number): any[] {
        const cells = this.scene.spatialGrid.findNearby({ x, y, width: 1, height: 1 }, radius);
        return cells
            .map(c => c.ref)
            .filter((e: any) => e && e.active && !e.getIsDead());
    }

    private showDamageText(x: number, y: number, text: string, color: string = '#ffaa00'): void {
        this.scene.poolManager.getDamageText(x, y - 30, text, color);
    }

    private addBuff(key: string, title: string, icon: string, color: number, duration: number): void {
        this.scene.buffs.addBuff({
            key,
            title,
            icon,
            color,
            duration,
            maxStacks: 1,
            isVisible: true,
            description: '',
            category: 'combat',
            priority: 15,
        });
    }

    private createGroundCircle(x: number, y: number, radius: number, color: number, alpha: number, duration: number): void {
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const circle = phaserScene.add.circle(x, y, radius, color, alpha).setDepth(0);
        phaserScene.tweens.add({
            targets: circle,
            alpha: 0,
            scale: 1.3,
            duration,
            onComplete: () => circle.destroy(),
        });
    }

    // ─── Krieger Abilities ───────────────────────────────────────────────────

    /** Earthquake Slam — massive ground slam damaging & stunning nearby enemies */
    private doEarthquakeSlam(_ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const damage = this.getBaseDamage() * 3;
        const radius = 200;
        const stunDuration = 1500;

        // Screen shake
        this.scene.cameras.main.shake(300, 0.03);

        // Ground VFX
        this.createGroundCircle(player.x, player.y, radius, 0x8B4513, 0.5, 800);

        // Concentric ripple
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const ripple = phaserScene.add.circle(player.x, player.y, 30, 0xffa500, 0.3).setDepth(0);
        phaserScene.tweens.add({
            targets: ripple,
            radius: radius,
            alpha: 0,
            duration: 600,
            onComplete: () => ripple.destroy(),
        });

        // Damage + stun enemies
        const enemies = this.getNearbyEnemies(player.x, player.y, radius);
        for (const enemy of enemies) {
            enemy.takeDamage(damage, '#ff8800');
            if (typeof enemy.stun === 'function') {
                enemy.stun(stunDuration);
            }
        }

        this.addBuff('earthquake_slam', 'JORDSKJELV', 'item_sword', 0xB8860B, 1000);
        AudioManager.instance.playSFX('swing');
    }

    /** Blood Rage — 10s buff: +50% damage, +30% speed, take 20% more damage */
    private doBloodRage(ability: ParagonAbilityDef, _cd: number): void {
        const duration = ability.duration;
        const player = this.getPlayer();

        // Apply stat modifiers via registry
        const currentDmg = this.scene.registry.get('playerDamage') || this.getBaseDamage();
        const currentSpd = this.scene.registry.get('playerSpeed') || this.scene.stats.speed;

        // Store originals for cleanup
        const origDmg = currentDmg;
        const origSpd = currentSpd;

        this.scene.stats.recalculateStats();
        // Boost damage by 50% and speed by 30%
        const boostedDmg = Math.floor(currentDmg * 1.5);
        const boostedSpd = Math.floor(currentSpd * 1.3);
        this.scene.registry.set('playerDamage', boostedDmg);
        this.scene.registry.set('playerSpeed', boostedSpd);
        this.scene.data.set('bloodRageActive', true);

        // Red tint on player
        player.setTint(0xff3333);

        this.addBuff('blood_rage', 'BLODRUS', 'item_swords_crossed', 0xff3333, duration);

        this.activeBuffs.set('blood_rage', {
            endTime: Date.now() + duration,
            cleanup: () => {
                this.scene.data.set('bloodRageActive', false);
                this.scene.stats.recalculateStats();
                player.clearTint();
            },
        });
    }

    /** Titan's Shield — 5s invincibility barrier that reflects projectiles */
    private doTitansShield(ability: ParagonAbilityDef): void {
        const duration = ability.duration;
        const player = this.getPlayer();

        // Make player invincible
        this.scene.combat.setDashIframe(true);

        // Blue shield VFX
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const shield = phaserScene.add.circle(player.x, player.y, 60, 0x4488ff, 0.25)
            .setDepth(player.depth + 1);

        // Pulsing animation
        phaserScene.tweens.add({
            targets: shield,
            alpha: { from: 0.25, to: 0.5 },
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        // Follow player
        const followTimer = phaserScene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => shield.setPosition(player.x, player.y),
        });

        player.setTint(0x88ccff);
        this.addBuff('titans_shield', 'TITANENS SKJOLD', 'item_shield', 0x4488ff, duration);

        this.activeBuffs.set('titans_shield', {
            endTime: Date.now() + duration,
            cleanup: () => {
                this.scene.combat.setDashIframe(false);
                shield.destroy();
                followTimer.destroy();
                player.clearTint();
            },
        });
    }

    // ─── Archer Abilities ────────────────────────────────────────────────────

    /** Rain of Arrows — rains arrows in a target area for 3 seconds */
    private doRainOfArrows(ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const pointer = this.scene.input.activePointer;
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;
        const radius = 150;
        const damage = this.getBaseDamage() * 0.8;
        const tickInterval = 200; // ms between arrow waves
        const duration = ability.duration;

        // Ground marker
        this.createGroundCircle(targetX, targetY, radius, 0xcc8800, 0.2, duration);

        const phaserScene = this.scene as unknown as Phaser.Scene;
        let elapsed = 0;

        const timer = phaserScene.time.addEvent({
            delay: tickInterval,
            repeat: Math.floor(duration / tickInterval) - 1,
            callback: () => {
                elapsed += tickInterval;
                // Random positions within radius
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * radius;
                    const ax = targetX + Math.cos(angle) * dist;
                    const ay = targetY + Math.sin(angle) * dist;

                    // Small impact VFX
                    const spark = phaserScene.add.circle(ax, ay, 5, 0xffaa00, 0.7).setDepth(1);
                    phaserScene.tweens.add({
                        targets: spark,
                        alpha: 0,
                        scale: 2,
                        duration: 300,
                        onComplete: () => spark.destroy(),
                    });

                    // Damage enemies at impact point
                    const enemies = this.getNearbyEnemies(ax, ay, 30);
                    for (const enemy of enemies) {
                        enemy.takeDamage(damage, '#ffcc00');
                    }
                }
            },
        });

        this.addBuff('rain_of_arrows', 'PILREGN', 'item_bow', 0xcc8800, duration);
    }

    /** Shadow Step — teleport behind nearest enemy and guarantee critical hit */
    private doShadowStep(_ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const damage = this.getBaseDamage() * 4; // Guaranteed crit

        // Find nearest enemy
        const enemies = this.getNearbyEnemies(player.x, player.y, 500);
        if (enemies.length === 0) {
            // Refund partial cooldown if no enemies
            this.cooldownEnd['F'] = Date.now() + 3000;
            this.scene.registry.set('paragonAbilityCooldown_F', { duration: 3000, timestamp: Date.now() });
            return;
        }

        // Sort by distance, pick nearest
        enemies.sort((a: any, b: any) => {
            const da = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
            const db = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
            return da - db;
        });

        const target = enemies[0] as any;
        const behindX = target.x + (target.x > player.x ? 40 : -40);
        const behindY = target.y;

        // Vanish effect at origin
        player.setAlpha(0.3);
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const smoke = phaserScene.add.circle(player.x, player.y, 20, 0x333333, 0.5).setDepth(1);
        phaserScene.tweens.add({
            targets: smoke,
            alpha: 0,
            scale: 3,
            duration: 400,
            onComplete: () => smoke.destroy(),
        });

        // Teleport
        player.setPosition(behindX, behindY);
        player.setAlpha(1);

        // Deal massive critical damage
        target.takeDamage(damage, '#ffff00');
        this.showDamageText(target.x, target.y, 'KRITISK!', '#ffff00');

        this.scene.cameras.main.shake(100, 0.01);
        AudioManager.instance.playSFX('swing');
    }

    /** Phoenix Arrow — massive fire arrow that explodes and leaves burning ground */
    private doPhoenixArrow(_ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        const speed = 600;
        const damage = this.getBaseDamage() * 5;
        const explosionRadius = 180;

        const phaserScene = this.scene as unknown as Phaser.Scene;

        // Create a glowing projectile
        const projectile = phaserScene.add.circle(player.x, player.y, 10, 0xff4400, 1).setDepth(2);
        const trail = phaserScene.add.circle(player.x, player.y, 6, 0xff8800, 0.6).setDepth(1);

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        let lifetime = 0;

        const moveTimer = phaserScene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                lifetime += 16;
                projectile.x += vx * 0.016;
                projectile.y += vy * 0.016;
                trail.setPosition(projectile.x, projectile.y);

                // Check for enemy collision
                const hit = this.getNearbyEnemies(projectile.x, projectile.y, 20);
                if (hit.length > 0 || lifetime > 2000) {
                    // Explode!
                    this.createGroundCircle(projectile.x, projectile.y, explosionRadius, 0xff4400, 0.4, 1500);
                    this.scene.cameras.main.shake(200, 0.02);

                    // AoE damage
                    const aoeTargets = this.getNearbyEnemies(projectile.x, projectile.y, explosionRadius);
                    for (const enemy of aoeTargets) {
                        enemy.takeDamage(damage, '#ff4400');
                    }

                    // Burning ground (ticks for 3s)
                    const burnX = projectile.x;
                    const burnY = projectile.y;
                    const burnDmg = this.getBaseDamage() * 0.5;
                    let burnTicks = 0;
                    const burnTimer = phaserScene.time.addEvent({
                        delay: 500,
                        repeat: 5,
                        callback: () => {
                            burnTicks++;
                            const burnTargets = this.getNearbyEnemies(burnX, burnY, explosionRadius * 0.7);
                            for (const enemy of burnTargets) {
                                enemy.takeDamage(burnDmg, '#ff6600');
                            }
                        },
                    });

                    projectile.destroy();
                    trail.destroy();
                    moveTimer.destroy();
                }
            },
        });

        this.addBuff('phoenix_arrow', 'FØNIKS-PIL', 'item_bow', 0xff4400, 1000);
        AudioManager.instance.playSFX('swing');
    }

    // ─── Wizard Abilities ────────────────────────────────────────────────────

    /** Meteor Shower — channeled meteor rain in target area for 3 seconds */
    private doMeteorShower(ability: ParagonAbilityDef): void {
        const pointer = this.scene.input.activePointer;
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;
        const radius = 180;
        const damage = this.getBaseDamage() * 2;
        const duration = ability.duration;
        const tickInterval = 300;

        this.createGroundCircle(targetX, targetY, radius, 0xff3300, 0.15, duration);

        const phaserScene = this.scene as unknown as Phaser.Scene;

        const timer = phaserScene.time.addEvent({
            delay: tickInterval,
            repeat: Math.floor(duration / tickInterval) - 1,
            callback: () => {
                // Random meteor impact
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * radius;
                const mx = targetX + Math.cos(angle) * dist;
                const my = targetY + Math.sin(angle) * dist;

                // Impact VFX
                const impact = phaserScene.add.circle(mx, my, 25, 0xff4400, 0.6).setDepth(1);
                phaserScene.tweens.add({
                    targets: impact,
                    alpha: 0,
                    scale: 2.5,
                    duration: 500,
                    onComplete: () => impact.destroy(),
                });

                this.scene.cameras.main.shake(80, 0.008);

                // Damage
                const enemies = this.getNearbyEnemies(mx, my, 50);
                for (const enemy of enemies) {
                    enemy.takeDamage(damage, '#ff3300');
                }
            },
        });

        this.addBuff('meteor_shower', 'METEORREGN', 'item_magic_staff', 0xff3300, duration);
    }

    /** Time Warp — slows all enemies in radius by 80% for 4 seconds */
    private doTimeWarp(ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const radius = 250;
        const duration = ability.duration;
        const slowFactor = 0.2; // 80% slow = 20% speed

        // Visual bubble
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const bubble = phaserScene.add.circle(player.x, player.y, radius, 0x44aaff, 0.15).setDepth(0);
        phaserScene.tweens.add({
            targets: bubble,
            alpha: { from: 0.15, to: 0.25 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
        });

        // Apply slow to enemies in radius
        const enemies = this.getNearbyEnemies(player.x, player.y, radius);
        const affectedEnemies: any[] = [];
        for (const enemy of enemies) {
            if (enemy.body) {
                const origSpeed = enemy.body.speed || 100;
                enemy.setData?.('timeWarpOrigSpeed', origSpeed);
                // Slow them down via their movement speed
                if (typeof enemy.setSlowed === 'function') {
                    enemy.setSlowed(slowFactor, duration);
                }
                affectedEnemies.push(enemy);
            }
        }

        this.addBuff('time_warp', 'TIDSVARP', 'item_frost_orb', 0x44aaff, duration);

        this.activeBuffs.set('time_warp', {
            endTime: Date.now() + duration,
            cleanup: () => {
                bubble.destroy();
            },
        });
    }

    /** Arcane Nova — massive explosion centered on player, scales with all element upgrades */
    private doArcaneNova(_ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;

        // Scales with all elemental upgrade levels
        const fireLvl = levels['fire_damage'] || 0;
        const frostLvl = levels['frost_damage'] || 0;
        const lightningLvl = levels['lightning_damage'] || 0;
        const bonusMult = 1 + (fireLvl + frostLvl + lightningLvl) * 0.15;

        const damage = this.getBaseDamage() * 6 * bonusMult;
        const radius = 300;

        // Screen shake and flash
        this.scene.cameras.main.shake(400, 0.04);
        this.scene.cameras.main.flash(300, 180, 100, 255);

        // Multi-ring explosion VFX
        const phaserScene = this.scene as unknown as Phaser.Scene;
        for (let i = 0; i < 3; i++) {
            const ring = phaserScene.add.circle(player.x, player.y, 20, [0xaa44ff, 0xff44aa, 0x44aaff][i], 0.4).setDepth(1);
            phaserScene.tweens.add({
                targets: ring,
                radius: radius * (0.6 + i * 0.2),
                alpha: 0,
                duration: 600 + i * 150,
                delay: i * 100,
                onComplete: () => ring.destroy(),
            });
        }

        // Damage all enemies in radius
        const enemies = this.getNearbyEnemies(player.x, player.y, radius);
        for (const enemy of enemies) {
            enemy.takeDamage(damage, '#cc66ff');
        }

        this.addBuff('arcane_nova', 'ARKAN NOVA', 'item_synergy_rune', 0xaa44ff, 1000);
    }

    // ─── Skald Abilities ─────────────────────────────────────────────────────

    /** War Hymn — AoE buff: +25% damage for 8 seconds */
    private doWarHymn(ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const duration = ability.duration;

        // Apply damage buff
        const currentDmg = this.scene.registry.get('playerDamage') || this.getBaseDamage();
        const boostedDmg = Math.floor(currentDmg * 1.25);
        this.scene.registry.set('playerDamage', boostedDmg);

        // Golden aura VFX
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const aura = phaserScene.add.circle(player.x, player.y, 40, 0xffcc00, 0.2).setDepth(player.depth - 1);
        phaserScene.tweens.add({
            targets: aura,
            scale: { from: 1, to: 1.3 },
            alpha: { from: 0.2, to: 0.35 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        const followTimer = phaserScene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => aura.setPosition(player.x, player.y),
        });

        this.addBuff('war_hymn', 'KRIGSHYMNE', 'item_lute', 0xffcc00, duration);

        this.activeBuffs.set('war_hymn', {
            endTime: Date.now() + duration,
            cleanup: () => {
                this.scene.stats.recalculateStats();
                aura.destroy();
                followTimer.destroy();
            },
        });
    }

    /** Dissonance — AoE debuff: enemies take +40% damage for 5 seconds */
    private doDissonance(ability: ParagonAbilityDef): void {
        const player = this.getPlayer();
        const radius = 200;
        const duration = ability.duration;

        // Purple shockwave
        this.createGroundCircle(player.x, player.y, radius, 0x8844cc, 0.3, 1000);

        // Mark nearby enemies as taking extra damage
        const enemies = this.getNearbyEnemies(player.x, player.y, radius);
        for (const enemy of enemies) {
            // Use data to store vulnerability multiplier
            enemy.setData?.('dissonanceVulnerable', true);
            enemy.setData?.('dissonanceMult', 1.4);
            enemy.setTint?.(0xcc88ff);

            // Remove after duration
            const phaserScene = this.scene as unknown as Phaser.Scene;
            phaserScene.time.delayedCall(duration, () => {
                if (enemy.active) {
                    enemy.setData?.('dissonanceVulnerable', false);
                    enemy.clearTint?.();
                }
            });
        }

        this.addBuff('dissonance', 'DISSONANS', 'item_harp', 0x8844cc, duration);
        this.scene.cameras.main.shake(100, 0.01);
    }

    /** Ragnarök Vers — ultimate: all 4 Vers active simultaneously for 10 seconds */
    private doRagnarokVers(ability: ParagonAbilityDef): void {
        const duration = ability.duration;

        // Activate all Skald vers simultaneously
        // Set registry value that the Skald weapon system reads
        this.scene.registry.set('ragnarokVersActive', true);
        this.scene.registry.set('skaldVers', 99); // Special value = all vers active

        // Dramatic golden aura
        const player = this.getPlayer();
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const aura = phaserScene.add.circle(player.x, player.y, 50, 0xffaa00, 0.3).setDepth(player.depth - 1);
        phaserScene.tweens.add({
            targets: aura,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 0.3, to: 0.5 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        const followTimer = phaserScene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => aura.setPosition(player.x, player.y),
        });

        player.setTint(0xffcc44);
        this.scene.cameras.main.flash(200, 255, 200, 50);

        this.addBuff('ragnarok_vers', 'RAGNARÖK', 'item_lute', 0xffaa00, duration);

        this.activeBuffs.set('ragnarok_vers', {
            endTime: Date.now() + duration,
            cleanup: () => {
                this.scene.registry.set('ragnarokVersActive', false);
                // Restore to previous vers (0-3 cycle)
                this.scene.registry.set('skaldVers', 0);
                aura.destroy();
                followTimer.destroy();
                player.clearTint();
            },
        });
    }
}

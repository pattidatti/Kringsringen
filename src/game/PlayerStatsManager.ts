import Phaser from 'phaser';
import { UPGRADES } from '../config/upgrades';
import { SaveManager } from './SaveManager';
import { GAME_CONFIG } from '../config/GameConfig';
import type { IMainScene } from './IMainScene';

/**
 * Manages player stats, upgrades, and the batched economy system.
 */
export class PlayerStatsManager {
    private scene: IMainScene;

    // Base Stats
    private baseDamage: number = GAME_CONFIG.PLAYER.BASE_DAMAGE;
    private baseSpeed: number = GAME_CONFIG.PLAYER.BASE_SPEED;
    private baseMaxHP: number = GAME_CONFIG.PLAYER.BASE_MAX_HP;
    private baseKnockback: number = GAME_CONFIG.PLAYER.BASE_KNOCKBACK;
    private baseRegen: number = 0;
    private baseArmor: number = 0;
    private baseCritChance: number = GAME_CONFIG.PLAYER.BASE_CRIT_CHANCE;
    private baseProjectiles: number = GAME_CONFIG.PLAYER.BASE_PROJECTILES;

    // Calculated Stats
    private playerDamage!: number;
    private playerSpeed!: number;
    private playerMaxHP!: number;
    public playerCooldown!: number;
    private playerKnockback!: number;

    // Batched Economy (GC Hardening & React Bridge)
    private pendingEconomy = {
        coins: 0
    };

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /** Current calculated damage */
    get damage(): number { return this.playerDamage; }

    /** Current calculated speed */
    get speed(): number { return this.playerSpeed; }

    /** Current calculated max HP */
    get maxHP(): number { return this.playerMaxHP; }

    /** Current calculated bow cooldown */
    get cooldown(): number { return this.playerCooldown; }

    /** Current calculated knockback */
    get knockback(): number { return this.playerKnockback; }

    /** Recalculates all player stats from upgrade levels in the registry */
    recalculateStats(): void {
        const levels = this.scene.registry.get('upgradeLevels') || {};

        // Damage
        const dmgLvl = levels['damage'] || 0;
        this.playerDamage = this.baseDamage * (1 + (dmgLvl * 0.1));
        this.scene.registry.set('playerDamage', this.playerDamage);

        // Speed
        const speedLvl = levels['speed'] || 0;
        this.playerSpeed = this.baseSpeed + (speedLvl * 10);
        this.scene.registry.set('playerSpeed', this.playerSpeed);

        // Max HP
        const hpLvl = levels['health'] || 0;
        const newMaxHP = this.baseMaxHP + (hpLvl * 20);
        this.playerMaxHP = newMaxHP;
        this.scene.registry.set('playerMaxHP', this.playerMaxHP);

        // Cooldown Multiplicative Formula: base / (1 + (lvl * factor))
        const cdLvl = levels['bow_cooldown'] || 0;
        const bowCdBase = GAME_CONFIG.WEAPONS.BOW.cooldown;
        this.playerCooldown = bowCdBase / (1 + (cdLvl * 0.15));

        // Attack Speed (Sword)
        const atkSpdLvl = levels['attack_speed'] || 0;
        const attackSpeedMult = 1 + (atkSpdLvl * 0.1);
        this.scene.registry.set('playerAttackSpeed', attackSpeedMult);

        // Knockback
        const kbLvl = levels['knockback'] || 0;
        this.playerKnockback = this.baseKnockback * (1 + (kbLvl * 0.15)) * 1.15; // Buffed by 15%

        // Armor
        const armorLvl = levels['armor'] || 0;
        const currentArmor = this.baseArmor + armorLvl;
        this.scene.registry.set('playerArmor', currentArmor);

        // Regen
        const regenLvl = levels['regen'] || 0;
        const currentRegen = this.baseRegen + regenLvl;
        this.scene.registry.set('playerRegen', currentRegen);

        // Projectiles
        const multiLvl = levels['multishot'] || 0;
        const currentProjectiles = this.baseProjectiles + multiLvl;
        this.scene.registry.set('playerProjectiles', currentProjectiles);

        // Arrow stats
        const pierceLvl = levels['pierce'] || 0;
        const arrowDmgLvl = levels['arrow_damage'] || 0;
        const arrowSpdLvl = levels['arrow_speed'] || 0;
        const explosiveLvl = levels['explosive_arrow'] || 0;
        this.scene.registry.set('playerPierceCount', pierceLvl);
        this.scene.registry.set('playerArrowDamageMultiplier', 1 + arrowDmgLvl * 0.15);
        this.scene.registry.set('playerArrowSpeed', GAME_CONFIG.WEAPONS.BOW.speed * (1 + arrowSpdLvl * 0.20));
        this.scene.registry.set('playerExplosiveLevel', explosiveLvl);

        // Fireball stats
        const fireDmgLvl = levels['fire_damage'] || 0;
        const fireRadLvl = levels['fire_radius'] || 0;
        const fireSpdLvl = levels['fire_speed'] || 0;
        this.scene.registry.set('fireballDamageMulti', 1 + fireDmgLvl * 0.15);
        this.scene.registry.set('fireballRadius', GAME_CONFIG.WEAPONS.FIREBALL.splashRadius + fireRadLvl * 20);
        this.scene.registry.set('fireballSpeed', GAME_CONFIG.WEAPONS.FIREBALL.speed * (1 + fireSpdLvl * 0.15));

        // FrostBolt stats
        const frostDmgLvl = levels['frost_damage'] || 0;
        const frostRadLvl = levels['frost_radius'] || 0;
        const frostSlowLvl = levels['frost_slow'] || 0;
        this.scene.registry.set('frostDamageMulti', 1 + frostDmgLvl * 0.15);
        this.scene.registry.set('frostRadius', GAME_CONFIG.WEAPONS.FROST.radius + frostRadLvl * 20);
        this.scene.registry.set('frostSlowDuration', 1000 + frostSlowLvl * 800); // Ms - Buffed from 500ms

        // Lightning stats
        const ltgDmgLvl = levels['lightning_damage'] || 0;
        const ltgBounceLvl = levels['lightning_bounces'] || 0;
        const ltgStunLvl = levels['lightning_stun'] || 0;
        const ltgVoltageLvl = levels['lightning_voltage'] || 0;
        this.scene.registry.set('lightningDamageMulti', 1 + ltgDmgLvl * 0.15);
        this.scene.registry.set('lightningBounces', GAME_CONFIG.WEAPONS.LIGHTNING.bounces + ltgBounceLvl);
        this.scene.registry.set('lightningStunChance', ltgStunLvl * 0.1); // 10% per level
        this.scene.registry.set('lightningBounceBonus', 1 + ltgVoltageLvl * 0.15); // +15% per bounce per level? No, let's keep it simple: 15% per level total bounce bonus

        // Misc
        this.scene.registry.set('playerLuck', 1.0);
        this.scene.registry.set('playerCritChance', this.baseCritChance);

        // Dash stats (Previously fixed, using current values but verifying formula)
        const dashCdLvl = levels['dash_cooldown'] || 0;
        const dashDistLvl = levels['dash_distance'] || 0;
        const dashCooldownMs = GAME_CONFIG.PLAYER.DASH_COOLDOWN_MS / (1 + dashCdLvl * 0.2); // Multiplicative
        const dashDistance = GAME_CONFIG.PLAYER.DASH_DISTANCE + dashDistLvl * 50;
        this.scene.registry.set('dashCooldown', Math.max(3000, dashCooldownMs));
        this.scene.registry.set('dashDistance', dashDistance);
    }

    /** Apply an upgrade by ID (increments level, saves, recalculates) */
    applyUpgrade(upgradeId: string): void {
        const levels = this.scene.registry.get('upgradeLevels') || {};
        const config = UPGRADES.find(u => u.id === upgradeId);

        if (!config) return;

        const currentLvl = levels[upgradeId] || 0;
        if (currentLvl >= config.maxLevel) return;

        // Increment Level
        levels[upgradeId] = currentLvl + 1;
        this.scene.registry.set('upgradeLevels', { ...levels });

        // Special On-Purchase Effects (like Healing)
        if (upgradeId === 'health') {
            let currentHP = this.scene.registry.get('playerHP');
            this.scene.registry.set('playerHP', currentHP + 20);
        }

        // Recalculate all stats
        this.recalculateStats();

        // Visual feedback
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        this.scene.tweens.add({
            targets: player,
            scale: 2.5,
            duration: 250,
            yoyo: true,
            ease: 'Back.out'
        });
    }

    /** Queue coins for batched flush to the registry (GC-friendly) */
    addCoins(amount: number): void {
        this.pendingEconomy.coins += amount;
    }

    /** HP healed on a successful dash (from dash_lifesteal upgrade) */
    getDashLifestealHP(): number {
        const levels = this.scene.registry.get('upgradeLevels') || {};
        const lvl = levels['dash_lifesteal'] || 0;
        return lvl * 5;
    }

    /** Flush pending economy updates to registry and save */
    flushEconomy(): void {
        if (!this.scene.scene.isActive()) return;

        if (this.pendingEconomy.coins > 0) {
            let coins = this.scene.registry.get('playerCoins') || 0;
            coins += this.pendingEconomy.coins;
            this.scene.registry.set('playerCoins', coins);

            if (coins % 10 === 0) {
                SaveManager.save({ coins });
            }

            this.pendingEconomy.coins = 0;
        }
    }
}

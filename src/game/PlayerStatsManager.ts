import Phaser from 'phaser';
import type { ShrineMods } from '../config/shrines';
import { UPGRADES } from '../config/upgrades';
import { CLASS_UPGRADES, ABILITY_UNLOCK_MAP } from '../config/class-upgrades';
import { SaveManager } from './SaveManager';
import { GAME_CONFIG } from '../config/GameConfig';
import type { IMainScene } from './IMainScene';
import type { ClassConfig } from '../config/classes';

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

    /**
     * Fase 1 – Class System.
     * Kjøres én gang fra MainScene.create() etter at playerClass er satt i registry.
     * Muterer base-stats slik at recalculateStats() bruker klasse-spesifikke verdier.
     * VIKTIG: kall denne FØR recalculateStats().
     */
    applyClassModifiers(config: ClassConfig): void {
        this.baseDamage = GAME_CONFIG.PLAYER.BASE_DAMAGE * config.baseStats.damage;
        this.baseSpeed = GAME_CONFIG.PLAYER.BASE_SPEED * config.baseStats.speed;
        this.baseMaxHP = GAME_CONFIG.PLAYER.BASE_MAX_HP * config.baseStats.hp;
        this.baseArmor = config.baseStats.armor; // Additivt flat tall

        if (config.baseStats.attackSpeed !== undefined) {
            // Lagres i registry – MainScene leser denne for sword/bow attack speed init.
            this.scene.registry.set('classAttackSpeedMulti', config.baseStats.attackSpeed);
        } else {
            this.scene.registry.set('classAttackSpeedMulti', 1.0);
        }

        if (config.baseStats.dashCharges !== undefined) {
            this.scene.registry.set('dashCharges', config.baseStats.dashCharges);
        } else {
            this.scene.registry.set('dashCharges', 1);
        }
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
        const massivEksplosjonLvl = levels['massiv_eksplosjon'] || 0;

        this.scene.registry.set('fireballDamageMulti', 1 + fireDmgLvl * 0.15);
        this.scene.registry.set('fireballRadius', GAME_CONFIG.WEAPONS.FIREBALL.splashRadius + fireRadLvl * 30 + massivEksplosjonLvl * 40);
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

        // Poison arrow
        const poisonLvl = levels['poison_arrow'] || 0;
        this.scene.registry.set('playerPoisonLevel', poisonLvl);

        // Advanced Upgrades
        const singularityLvl = levels['bow_singularity'] || 0;
        const soulLinkLvl = levels['magic_soul_link'] || 0;
        const eclipseLvl = levels['sword_eclipse'] || 0;
        this.scene.registry.set('playerSingularityLevel', singularityLvl);
        this.scene.registry.set('magicSoulLinkLevel', soulLinkLvl);
        this.scene.registry.set('playerEclipseLevel', eclipseLvl);

        // Synergi Upgrades
        const thermalShockLvl = levels['thermal_shock'] || 0;
        this.scene.registry.set('synergyThermalShock', thermalShockLvl > 0);

        // Misc
        this.scene.registry.set('playerLuck', 1.0);

        // Crit Chance (base + upgrades)
        const critChanceLvl = levels['crit_chance'] || 0;
        const finalCritChance = this.baseCritChance + critChanceLvl * 0.05;
        this.scene.registry.set('playerCritChance', finalCritChance);

        // ── Class Upgrade Stats ──────────────────────────────────────────
        // Coin Magnet radius
        const coinMagnetLvl = levels['coin_magnet'] || 0;
        this.scene.registry.set('coinMagnetRadius', 400 + coinMagnetLvl * 50);

        // Archer: Headshot – bonus crit chance on arrows
        const headshotLvl = levels['headshot'] || 0;
        this.scene.registry.set('arrowCritBonus', headshotLvl * 0.15);

        // Archer: Eagle Eye – faster arrows + max range cap
        const eagleEyeLvl = levels['eagle_eye'] || 0;
        if (eagleEyeLvl > 0) {
            const baseArrowSpeed = this.scene.registry.get('playerArrowSpeed') || GAME_CONFIG.WEAPONS.BOW.speed;
            this.scene.registry.set('playerArrowSpeed', baseArrowSpeed * (1 + eagleEyeLvl * 0.20));
            this.scene.registry.set('playerArrowMaxRange', 800 + eagleEyeLvl * 200);
        }

        // Archer: Luftmobilitet – extra dash charges
        const luftLvl = levels['luftmobilitet'] || 0;
        if (luftLvl > 0) {
            const baseDashCharges = this.scene.registry.get('dashCharges') || 1;
            this.scene.registry.set('dashCharges', baseDashCharges + luftLvl);
        }

        // Wizard: Cascade Updates
        const cascadeDurLvl = levels['cascade_duration'] || 0;
        this.scene.registry.set('cascadeDuration', 3000 + cascadeDurLvl * 500);

        const cascadeRadLvl = levels['cascade_radius'] || 0;
        this.scene.registry.set('cascadeRadiusMult', 1 + cascadeRadLvl * 0.25);

        const manaringLvl = levels['manaring'] || 0;
        this.scene.registry.set('globalDamageReductionLevel', manaringLvl === 1 ? 25 : (manaringLvl >= 2 ? 40 : 0));
        this.scene.registry.set('manaringDRBonus', manaringLvl === 1 ? 0.25 : manaringLvl === 2 ? 0.40 : 0);

        // Warrior: Skadeskalering – armor-scaled damage
        const skadekLvl = levels['skadeskalering'] || 0;
        if (skadekLvl > 0) {
            const armorLvl2 = levels['armor'] || 0;
            this.playerDamage *= (1 + armorLvl2 * skadekLvl * 0.05);
            this.scene.registry.set('playerDamage', this.playerDamage);
        }

        // ── Skald Buffs ──────────────────────────────────────────────
        // Horn: +25% speed and damage
        if (this.scene.buffs?.hasBuff('horn')) {
            this.playerDamage *= 1.25;
            this.playerSpeed *= 1.25;
            this.scene.registry.set('playerDamage', this.playerDamage);
            this.scene.registry.set('playerSpeed', this.playerSpeed);
        }

        // Anthem of Fury: +20%/lvl damage
        if (this.scene.buffs?.hasBuff('anthem_of_fury')) {
            const anthemLvl = levels['anthem_of_fury'] || 0;
            if (anthemLvl > 0) {
                this.playerDamage *= (1 + anthemLvl * 0.20);
                this.scene.registry.set('playerDamage', this.playerDamage);
            }
        }

        // Vers Damage scaling (from upgrade)
        const versDmgLvl = levels['vers_damage'] || 0;
        if (versDmgLvl > 0) {
            const versCount = (this.scene.registry.get('skaldVers') || 0) as number;
            if (versCount > 0) {
                this.playerDamage *= (1 + versCount * 0.15 * versDmgLvl);
                this.scene.registry.set('playerDamage', this.playerDamage);
            }
        }

        // NEW: Vers Passive Bonuses (resource-based system)
        const playerClassId = this.scene.registry.get('playerClass');
        if (playerClassId === 'skald') {
            const versCount = (this.scene.registry.get('skaldVers') || 0) as number;

            if (versCount >= 1) {
                // +8% movement speed at 1+ Vers
                this.playerSpeed *= 1.08;
                this.scene.registry.set('playerSpeed', this.playerSpeed);
            }

            if (versCount >= 2) {
                // +12% attack speed at 2+ Vers
                const currentAttackSpeed = this.scene.registry.get('playerAttackSpeed') || 1;
                this.scene.registry.set('playerAttackSpeed', currentAttackSpeed * 1.12);
            }

            if (versCount >= 3) {
                // +15% damage at 3+ Vers
                this.playerDamage *= 1.15;
                this.scene.registry.set('playerDamage', this.playerDamage);
            }

            if (versCount >= 4) {
                // +25% crit chance at 4 Vers (max stack)
                const currentCrit = this.scene.registry.get('playerCritChance') || 0;
                this.scene.registry.set('playerCritChance', currentCrit + 0.25);
            }
        }

        // Resonans Shield: damage reduction at max vers
        const resonansLvl = levels['resonans_shield'] || 0;
        if (resonansLvl > 0 && this.scene.buffs?.hasBuff('resonans_shield')) {
            this.scene.registry.set('skaldDamageReduction', resonansLvl * 0.15);
        } else {
            this.scene.registry.set('skaldDamageReduction', 0);
        }

        // Sync Skald-specific passive buffs to BuffManager
        if (playerClassId === 'skald') {
            this.syncSkaldPassiveBuffs();
        }

        // ── Shrine Mods (last pass — multiplies fully-calculated stats) ──────
        const shrineMods = this.scene.registry.get('shrineStatMods') as ShrineMods | null;
        if (shrineMods) {
            if (shrineMods.damageMult) {
                this.playerDamage *= shrineMods.damageMult;
                this.scene.registry.set('playerDamage', this.playerDamage);
            }
            if (shrineMods.speedMult) {
                this.playerSpeed *= shrineMods.speedMult;
                this.scene.registry.set('playerSpeed', this.playerSpeed);
            }
            if (shrineMods.maxHpMult) {
                this.playerMaxHP = Math.round(this.playerMaxHP * shrineMods.maxHpMult);
                this.scene.registry.set('playerMaxHP', this.playerMaxHP);
            }
            if (shrineMods.cooldownMult) {
                this.playerCooldown *= shrineMods.cooldownMult;
            }
            if (shrineMods.regenBonus) {
                const currentRegen = (this.scene.registry.get('playerRegen') as number) || 0;
                this.scene.registry.set('playerRegen', currentRegen + shrineMods.regenBonus);
            }
            if (shrineMods.pierceBonus) {
                const currentPierce = (this.scene.registry.get('playerPierceCount') as number) || 0;
                this.scene.registry.set('playerPierceCount', currentPierce + shrineMods.pierceBonus);
            }
            if (shrineMods.critBonus) {
                const currentCrit = (this.scene.registry.get('playerCritChance') as number) || 0;
                this.scene.registry.set('playerCritChance', Math.max(0, currentCrit + shrineMods.critBonus));
            }
            if (shrineMods.extraProjectiles) {
                const currentProj = (this.scene.registry.get('playerProjectiles') as number) || 0;
                this.scene.registry.set('playerProjectiles', currentProj + shrineMods.extraProjectiles);
            }
        }

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
        const config = [...UPGRADES, ...CLASS_UPGRADES].find(u => u.id === upgradeId);

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

        // Ability Unlock: add weapon/ability to unlockedWeapons
        const unlockSlotId = ABILITY_UNLOCK_MAP[upgradeId];
        if (unlockSlotId) {
            const weapons = [...(this.scene.registry.get('unlockedWeapons') || [])] as string[];
            if (!weapons.includes(unlockSlotId)) {
                weapons.push(unlockSlotId);
                this.scene.registry.set('unlockedWeapons', weapons);
            }
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

    /**
     * Sync Skald passive buffs to BuffManager (Resonans Shield, Crescendo).
     * Called from recalculateStats() after Vers-based stat calculations.
     */
    private syncSkaldPassiveBuffs(): void {
        if (!this.scene.buffs) return;

        const levels = this.scene.registry.get('upgradeLevels') || {};
        const versCount = (this.scene.registry.get('skaldVers') || 0) as number;

        // 1. Resonans Shield — Active at 4 Vers
        const resonansLvl = levels['resonans_shield'] || 0;
        if (resonansLvl > 0 && versCount >= 4) {
            const reductionPercent = resonansLvl * 15;
            if (!this.scene.buffs.hasBuff('resonans_shield')) {
                this.scene.buffs.addBuff({
                    key: 'resonans_shield',
                    title: 'RESONANSSKJOLD',
                    icon: 'item_shield',
                    color: 0xffd700,
                    duration: -1, // Passive (infinite while 4 Vers)
                    maxStacks: 1,
                    isVisible: true,
                    description: `Reduserer skade med ${reductionPercent}%`,
                    statModifiers: [{
                        type: 'damageReduction',
                        value: reductionPercent,
                        displayFormat: 'percent'
                    }],
                    category: 'vers',
                    priority: 10 // High priority (show prominently)
                });
            } else {
                // Update description if level changed
                this.scene.buffs.updateBuff('resonans_shield', {
                    description: `Reduserer skade med ${reductionPercent}%`,
                    statModifiers: [{
                        type: 'damageReduction',
                        value: reductionPercent,
                        displayFormat: 'percent'
                    }]
                });
            }
        } else {
            // Remove if Vers drops below 4 or upgrade not purchased
            this.scene.buffs.removeBuff('resonans_shield');
        }

        // 2. Crescendo — Attack speed per Vers
        const crescendoLvl = levels['crescendo'] || 0;
        if (crescendoLvl > 0 && versCount > 0) {
            const bonusPercent = crescendoLvl * 8 * versCount;
            if (!this.scene.buffs.hasBuff('crescendo')) {
                this.scene.buffs.addBuff({
                    key: 'crescendo',
                    title: 'CRESCENDO',
                    icon: 'item_lute',
                    color: 0xffed4e,
                    duration: -1, // Passive (dynamic based on Vers)
                    maxStacks: 1,
                    isVisible: true,
                    description: `+${bonusPercent}% angrepsfart`,
                    statModifiers: [{
                        type: 'attackSpeed',
                        value: bonusPercent,
                        displayFormat: 'percent'
                    }],
                    category: 'vers',
                    priority: 9
                });
            } else {
                // Update value dynamically as Vers changes
                this.scene.buffs.updateBuff('crescendo', {
                    description: `+${bonusPercent}% angrepsfart`,
                    statModifiers: [{
                        type: 'attackSpeed',
                        value: bonusPercent,
                        displayFormat: 'percent'
                    }]
                });
            }
        } else {
            this.scene.buffs.removeBuff('crescendo');
        }
    }
}

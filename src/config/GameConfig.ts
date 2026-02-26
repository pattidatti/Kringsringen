export interface EnemyStats {
    baseHP: number;
    baseDamage: number;
    baseSpeed: number;
    baseXP: number;
    attackRange: number;
    attackCooldown: number;
    scale: number;
    bodySize: { width: number, height: number };
    knockbackResistance: number;
}

export const GAME_CONFIG = {
    PLAYER: {
        BASE_SPEED: 250,
        BASE_DAMAGE: 20,
        BASE_MAX_HP: 100,
        BASE_COOLDOWN: 500,
        BASE_KNOCKBACK: 400,
        BASE_CRIT_CHANCE: 0.05,
        BASE_PROJECTILES: 1,
        PICKUP_RANGE: 60, // Default collection range
        MAGNET_RANGE: 250, // Default magnet range
        // --- DASH ---
        DASH_COOLDOWN_MS: 20000, // 20 seconds default
        DASH_DISTANCE: 220,      // pixels
        DASH_DURATION_MS: 160    // ms — short, punchy burst
    },
    ENEMIES: {
        ORC: {
            baseHP: 50,
            baseDamage: 10,
            baseSpeed: 100,
            baseXP: 10,
            attackRange: 60,
            attackCooldown: 1500,
            scale: 1.5,
            bodySize: { width: 40, height: 60 },
            knockbackResistance: 0.0
        },
        SLIME: {
            baseHP: 30,
            baseDamage: 5,
            baseSpeed: 80,
            baseXP: 5,
            attackRange: 40,
            attackCooldown: 1000,
            scale: 1.2,
            bodySize: { width: 30, height: 30 },
            knockbackResistance: 0.0
        },
        SKELETON: {
            baseHP: 40,
            baseDamage: 15,
            baseSpeed: 110,
            baseXP: 12,
            attackRange: 70,
            attackCooldown: 2000,
            scale: 1.4,
            bodySize: { width: 35, height: 65 },
            knockbackResistance: 0.1
        },
        WEREWOLF: { // Fast, high burst
            baseHP: 80,
            baseDamage: 25,
            baseSpeed: 160,
            baseXP: 25,
            attackRange: 50,
            attackCooldown: 800,
            scale: 1.6,
            bodySize: { width: 50, height: 60 },
            knockbackResistance: 0.2
        },
        ELITE_ORC: { // Tanky
            baseHP: 250,
            baseDamage: 30,
            baseSpeed: 90,
            baseXP: 50,
            attackRange: 70,
            attackCooldown: 1800,
            scale: 2.0,
            bodySize: { width: 60, height: 80 },
            knockbackResistance: 0.5
        },
        GREATSWORD_SKELETON: {
            baseHP: 200,
            baseDamage: 40,
            baseSpeed: 90,
            baseXP: 50,
            attackRange: 80,
            attackCooldown: 2500,
            scale: 2.5,
            bodySize: { width: 50, height: 80 },
            knockbackResistance: 0.8
        },
        ARMORED_SKELETON: {
            baseHP: 150,
            baseDamage: 30,
            baseSpeed: 100,
            baseXP: 35,
            attackRange: 70,
            attackCooldown: 1800,
            scale: 2.0,
            bodySize: { width: 40, height: 60 },
            knockbackResistance: 0.6
        },
        ARMORED_ORC: {
            baseHP: 250,
            baseDamage: 45,
            baseSpeed: 80,
            baseXP: 60,
            attackRange: 70,
            attackCooldown: 1500,
            scale: 2.1,
            bodySize: { width: 45, height: 65 },
            knockbackResistance: 0.9
        },
        FROST_WIZARD: {
            baseHP: 80,
            baseDamage: 25,
            baseSpeed: 70,
            baseXP: 40,
            attackRange: 350,
            attackCooldown: 2500,
            scale: 1.8,
            bodySize: { width: 30, height: 50 },
            knockbackResistance: 0.3
        },
        WIZARD: {
            baseHP: 100,
            baseDamage: 35,
            baseSpeed: 75,
            baseXP: 50,
            attackRange: 400,
            attackCooldown: 2200,
            scale: 1.8,
            bodySize: { width: 30, height: 50 },
            knockbackResistance: 0.3
        },
        SKELETON_ARCHER: {
            baseHP: 60,
            baseDamage: 20,
            baseSpeed: 90,
            baseXP: 25,
            attackRange: 400,
            attackCooldown: 2000,
            scale: 1.8,
            bodySize: { width: 30, height: 50 },
            knockbackResistance: 0.2
        }
    } as const,
    WAVES: {
        SPAWN_DELAY: 1500,
        WAVE_DELAY: 2000,
        LEVEL_COMPLETE_DELAY: 1500
    },
    DROPS: {
        COIN_LIFETIME: 10000, // Disappear after 10s if not collected (optimization)
        XP_GEM_LIFETIME: 30000
    }
};

export type EnemyType = keyof typeof GAME_CONFIG.ENEMIES;

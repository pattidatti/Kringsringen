/**
 * Paragon System Configuration
 *
 * When a player completes Level 10, they can "Ascend" to the next Paragon tier.
 * All upgrades, coins and weapons carry over. Enemies scale harder each tier.
 */

import type { ClassId } from './classes';

// ─── Paragon Profile (persistent character save) ────────────────────────────

export interface ParagonProfile {
    /** Unique identifier */
    id: string;
    /** Character display name */
    name: string;
    /** Class chosen at creation */
    classId: ClassId;
    /** 0 = first playthrough, 1+ = Paragon tiers */
    paragonLevel: number;
    /** Current game level (1-10) within current Paragon tier */
    currentGameLevel: number;
    /** Current wave within current level */
    currentWave: number;
    /** Coins accumulated across all tiers */
    coins: number;
    /** All purchased upgrades from the shop */
    upgradeLevels: Record<string, number>;
    /** Currently equipped weapon ID */
    currentWeapon: string;
    /** All unlocked weapon IDs */
    unlockedWeapons: string[];
    /** Current HP */
    playerHP: number;
    /** Max HP (derived from upgrades) */
    playerMaxHP: number;
    /** Player position X (for mid-level saves) */
    playerX?: number;
    /** Player position Y */
    playerY?: number;
    /** Saved enemy state for mid-level restore */
    savedEnemies?: import('../game/SaveManager').EnemySave[];
    /** Enemies remaining to spawn in current wave */
    waveEnemiesRemaining?: number;
    /** Highest level ever reached (across all Paragon tiers) */
    highestLevelReached: number;
    /** Levels cleared in current Paragon tier (for level select) */
    clearedLevels: number[];
    /** Total enemies killed (all time) */
    totalKills: number;
    /** Total play time in seconds */
    totalPlayTime: number;
    /** Earned achievement IDs */
    achievements: string[];
    /** Profile creation timestamp */
    createdAt: number;
    /** Last played timestamp */
    lastPlayedAt: number;
}

// ─── Difficulty Scaling ─────────────────────────────────────────────────────

export const PARAGON_SCALING = {
    /** Enemy HP multiplier per Paragon level (compounding) */
    enemyHPMultiplier: 1.4,
    /** Enemy damage multiplier per Paragon level */
    enemyDamageMultiplier: 1.25,
    /** Enemy speed multiplier per Paragon level (subtle) */
    enemySpeedMultiplier: 1.05,
    /** More enemies per wave per Paragon level */
    enemyCountMultiplier: 1.15,
    /** Coin drop multiplier to compensate for difficulty */
    coinMultiplier: 1.3,
    /** Boss HP scales harder than regular enemies */
    bossHPMultiplier: 1.5,
    /** Maximum Paragon level */
    maxParagonLevel: 10,
} as const;

/**
 * Calculate the effective multiplier for a given Paragon level.
 * All multipliers compound: value = base^paragonLevel
 */
export function getParagonMultiplier(paragonLevel: number, key: keyof typeof PARAGON_SCALING): number {
    if (key === 'maxParagonLevel') return PARAGON_SCALING.maxParagonLevel;
    if (paragonLevel <= 0) return 1;
    return Math.pow(PARAGON_SCALING[key], paragonLevel);
}

// ─── Death Penalty (no permadeath) ──────────────────────────────────────────

export const DEATH_PENALTY = {
    /** Fraction of coins lost on death (10%) */
    coinLossFraction: 0.10,
    /** Minimum coins that cannot be lost (floor) */
    coinFloor: 0,
} as const;

// ─── Paragon Tier Names ─────────────────────────────────────────────────────

export const PARAGON_TIER_NAMES: Record<number, string> = {
    0: 'Normal',
    1: 'Paragon I',
    2: 'Paragon II',
    3: 'Paragon III',
    4: 'Paragon IV',
    5: 'Paragon V',
    6: 'Paragon VI',
    7: 'Paragon VII',
    8: 'Paragon VIII',
    9: 'Paragon IX',
    10: 'Paragon X',
};

export function getParagonTierName(level: number): string {
    return PARAGON_TIER_NAMES[Math.min(level, PARAGON_SCALING.maxParagonLevel)] ?? `Paragon ${level}`;
}

// ─── Level Select ───────────────────────────────────────────────────────────

/** Coin multiplier when replaying a previously-cleared level (farming reduction) */
export const FARM_COIN_MULTIPLIER = 0.5;

// ─── Profile Defaults ───────────────────────────────────────────────────────

export const MAX_CHARACTER_SLOTS = 6;

export function createDefaultProfile(name: string, classId: ClassId, startingWeapons: string[]): ParagonProfile {
    const now = Date.now();
    return {
        id: generateProfileId(),
        name,
        classId,
        paragonLevel: 0,
        currentGameLevel: 1,
        currentWave: 1,
        coins: 0,
        upgradeLevels: {},
        currentWeapon: startingWeapons[0] || 'sword',
        unlockedWeapons: [...startingWeapons],
        playerHP: 100,
        playerMaxHP: 100,
        highestLevelReached: 1,
        clearedLevels: [],
        totalKills: 0,
        totalPlayTime: 0,
        achievements: [],
        createdAt: now,
        lastPlayedAt: now,
    };
}

function generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

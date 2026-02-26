/**
 * Wave Composition System
 *
 * Controls WHAT spawns in each wave, not just HOW MANY.
 * Each composition defines:
 *  - meleePool:         Weighted pool of melee enemy IDs
 *  - rangedPool:        Weighted pool of ranged enemy IDs
 *  - maxRangedFraction: Hard cap — max fraction of a wave that may be ranged (0–1)
 *
 * Weights are relative within their pool. A weight of 2 means twice as likely
 * to be picked as an entry with weight 1.
 */

/** Weighted entry: [enemyId, relativeWeight] */
export type WeightedEntry = [string, number];

export interface WaveComposition {
    maxRangedFraction: number;
    meleePool: WeightedEntry[];
    rangedPool: WeightedEntry[];
}

/**
 * Performs a weighted random pick from a pool.
 * Returns a random enemyId, respecting relative weights.
 */
export function weightedRandom(pool: WeightedEntry[]): string {
    if (pool.length === 0) throw new Error('weightedRandom: empty pool');

    const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    for (const [id, weight] of pool) {
        roll -= weight;
        if (roll <= 0) return id;
    }

    // Fallback (floating point edge case)
    return pool[pool.length - 1][0];
}

// ---------------------------------------------------------------------------
// Composition Tables
// ---------------------------------------------------------------------------

/**
 * Key format: `${level}-${wave}`
 * For waves beyond those explicitly defined, we fall back to the last wave
 * entry for that level, and for levels beyond 5, we use the level-5 entry.
 */
const COMPOSITIONS: Record<string, WaveComposition> = {
    // ─── LEVEL 1 ── Purely melee. Training wheels. ───────────────────────
    '1-1': {
        maxRangedFraction: 0,
        meleePool: [['orc', 2], ['slime', 1]],
        rangedPool: []
    },
    '1-2': {
        maxRangedFraction: 0,
        meleePool: [['orc', 2], ['slime', 1]],
        rangedPool: []
    },

    // ─── LEVEL 2 ── Ranged introduced cautiously ─────────────────────────
    // Wave 1: 10% ranged max — one archer might show up, nothing more
    '2-1': {
        maxRangedFraction: 0.10,
        meleePool: [['orc', 1], ['skeleton', 2], ['armored_skeleton', 1]],
        rangedPool: [['skeleton_archer', 1]]
    },
    // Wave 2: 15% — archers more likely, first glimpse of wizard
    '2-2': {
        maxRangedFraction: 0.15,
        meleePool: [['skeleton', 2], ['armored_skeleton', 1], ['orc', 1]],
        rangedPool: [['skeleton_archer', 3], ['wizard', 1]]
    },
    // Wave 3 (final): 20% — clear ranged presence, still outnumbered
    '2-3': {
        maxRangedFraction: 0.20,
        meleePool: [['skeleton', 2], ['armored_skeleton', 2], ['orc', 1]],
        rangedPool: [['skeleton_archer', 2], ['wizard', 1]]
    },

    // ─── LEVEL 3 ── Harder melee + frost wizards introduced ──────────────
    '3-1': {
        maxRangedFraction: 0.20,
        meleePool: [['werewolf', 2], ['armored_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 1]]
    },
    '3-2': {
        maxRangedFraction: 0.25,
        meleePool: [['werewolf', 2], ['armored_orc', 2], ['armored_skeleton', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 1]]
    },
    '3-3': {
        maxRangedFraction: 0.30,
        meleePool: [['armored_orc', 2], ['werewolf', 2], ['armored_skeleton', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 1], ['skeleton_archer', 1]]
    },

    // ─── LEVEL 4 ── Elite enemies enter, ranged at 30% ceiling ───────────
    '4-1': {
        maxRangedFraction: 0.25,
        meleePool: [['elite_orc', 2], ['greatsword_skeleton', 1], ['armored_orc', 2]],
        rangedPool: [['frost_wizard', 2], ['wizard', 1]]
    },
    '4-2': {
        maxRangedFraction: 0.28,
        meleePool: [['elite_orc', 2], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 1]]
    },
    '4-3': {
        maxRangedFraction: 0.30,
        meleePool: [['elite_orc', 2], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 1]]
    },
    '4-4': {
        maxRangedFraction: 0.30,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 1]]
    },

    // ─── LEVEL 5+ ── Full chaos, 35% ranged ceiling maintained ───────────
    '5-1': {
        maxRangedFraction: 0.30,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 1]]
    },
    '5-2': {
        maxRangedFraction: 0.33,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 2]]
    },
    '5-3': {
        maxRangedFraction: 0.35,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 2]]
    },
    '5-4': {
        maxRangedFraction: 0.35,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 2], ['wizard', 2], ['skeleton_archer', 2]]
    },
    '5-5': {
        maxRangedFraction: 0.35,
        meleePool: [['elite_orc', 3], ['greatsword_skeleton', 2], ['armored_orc', 1]],
        rangedPool: [['frost_wizard', 3], ['wizard', 3], ['skeleton_archer', 2]]
    },
};

/**
 * Retrieves the WaveComposition for a given level and wave.
 * Clamps level to max defined (5) and falls back to the previous wave
 * entry if the exact wave is not defined for that level.
 */
export function getWaveComposition(level: number, wave: number): WaveComposition {
    const clampedLevel = Math.min(level, 5);

    // Try exact match first, then walk back waves, then use wave 1
    for (let w = wave; w >= 1; w--) {
        const key = `${clampedLevel}-${w}`;
        if (COMPOSITIONS[key]) return COMPOSITIONS[key];
    }

    // Ultimate fallback — melee only (should never happen with full tables above)
    return {
        maxRangedFraction: 0,
        meleePool: [['orc', 1], ['slime', 1]],
        rangedPool: []
    };
}

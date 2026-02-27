/**
 * Level progression configuration.
 *
 * Rules:
 *  - Wave count is kept at or below 3 for all levels.
 *    Difficulty scales through enemiesPerWave and multiplier, NOT wave count.
 *  - To add a new level: append one entry here, add a map in StaticMapData.ts,
 *    add wave compositions in wave_compositions.ts, and optionally a boss in bosses.ts.
 */

export interface LevelConfig {
    waves: number;
    enemiesPerWave: number;
    /** HP multiplier applied to all enemies spawned in this level. */
    multiplier: number;
}

export const LEVEL_CONFIG: LevelConfig[] = [
    { waves: 2, enemiesPerWave: 6,  multiplier: 1.0 },  // L1  – opplæring
    { waves: 3, enemiesPerWave: 8,  multiplier: 1.2 },  // L2  – variert
    { waves: 3, enemiesPerWave: 11, multiplier: 1.5 },  // L3  – elitestyrker
    { waves: 3, enemiesPerWave: 14, multiplier: 2.0 },  // L4  – tung melee
    { waves: 3, enemiesPerWave: 17, multiplier: 2.5 },  // L5  – full kaos
    { waves: 3, enemiesPerWave: 20, multiplier: 3.0 },  // L6  – mørk akt
    { waves: 3, enemiesPerWave: 22, multiplier: 3.5 },  // L7  – katakomber
    { waves: 3, enemiesPerWave: 24, multiplier: 4.0 },  // L8  – trolldal
    { waves: 3, enemiesPerWave: 26, multiplier: 4.5 },  // L9  – sluttpush
    { waves: 3, enemiesPerWave: 28, multiplier: 5.0 },  // L10 – sluttboss-akt
];

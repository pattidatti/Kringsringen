export interface BossConfig {
    bossIndex: number;      // 0-based
    afterLevel: number;     // Spawns after this regular level
    name: string;           // Norwegian display name
    subtitle: string;       // English subtitle shown on splash
    enemyType: string;      // Sprite/animation base from enemies.ts
    hp: number;
    damage: number;
    speed: number;
    scale: number;
    knockbackResistance: number;
    bodySize: { width: number; height: number };
    attackRange: number;
    attackCooldown: number;
    music: string;          // AudioManifest ID
    phase2Threshold: number; // HP fraction that triggers phase 2 (0–1)
}

export const BOSS_CONFIGS: BossConfig[] = [
    {
        bossIndex: 0,
        afterLevel: 2,
        name: 'Orkehøvdingen',
        subtitle: 'The Orc Warchief',
        enemyType: 'armored_orc',
        hp: 1600,
        damage: 50,
        speed: 110,
        scale: 3.0,
        knockbackResistance: 0.85,
        bodySize: { width: 40, height: 80 },
        attackRange: 90,
        attackCooldown: 900,
        music: 'final_dungeon_loop',
        phase2Threshold: 0.5,
    },
    {
        bossIndex: 1,
        afterLevel: 4,
        name: 'Skjelettoverlorden',
        subtitle: 'The Skeleton Overlord',
        enemyType: 'greatsword_skeleton',
        hp: 1500,
        damage: 50,
        speed: 75,
        scale: 2.5,
        knockbackResistance: 0.9,
        bodySize: { width: 35, height: 90 },
        attackRange: 100,
        attackCooldown: 1000,
        music: 'glitch_king',
        phase2Threshold: 0.5,
    },
    {
        bossIndex: 2,
        afterLevel: 6,
        name: 'Alfa-Varulven',
        subtitle: 'The Alpha Werewolf',
        enemyType: 'werewolf',
        hp: 2500,
        damage: 70,
        speed: 100,
        scale: 2.5,
        knockbackResistance: 0.7,
        bodySize: { width: 45, height: 70 },
        attackRange: 80,
        attackCooldown: 800,
        music: 'final_dungeon_loop',
        phase2Threshold: 0.5,
    },
    {
        bossIndex: 3,
        afterLevel: 8,
        name: 'Trollhersker Grak',
        subtitle: 'The Troll Warlord',
        enemyType: 'elite_orc',
        hp: 3500,
        damage: 90,
        speed: 95,
        scale: 3.2,
        knockbackResistance: 0.95,
        bodySize: { width: 55, height: 85 },
        attackRange: 100,
        attackCooldown: 850,
        music: 'glitch_in_the_dungeon',
        phase2Threshold: 0.5,
    },
    {
        bossIndex: 4,
        afterLevel: 10,
        name: 'Skjelettkongen',
        subtitle: 'The Undying King',
        enemyType: 'armored_skeleton',
        hp: 5000,
        damage: 110,
        speed: 80,
        scale: 3.5,
        knockbackResistance: 0.98,
        bodySize: { width: 50, height: 95 },
        attackRange: 110,
        attackCooldown: 1000,
        music: 'glitch_king',
        phase2Threshold: 0.4,
    },
];

/** Returns the boss config for the given regular level, or null if no boss follows it. */
export function getBossForLevel(level: number): BossConfig | null {
    return BOSS_CONFIGS.find(b => b.afterLevel === level) ?? null;
}

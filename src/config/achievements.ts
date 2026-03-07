/**
 * Achievement System Configuration
 *
 * 30+ achievements across 4 categories:
 * - Combat: Kill streaks, boss victories, damage milestones
 * - Survival: No-damage challenges, close calls, death defiance
 * - Paragon: Ascension milestones, tier progression
 * - Exploration: Level completion, wave mastery, map discovery
 */

import type { ParagonProfile } from './paragon';

export type AchievementCategory = 'combat' | 'survival' | 'paragon' | 'exploration';

export interface AchievementContext {
  profile: ParagonProfile;
  gameStats: {
    /** Boss IDs defeated without taking damage this session */
    pristineBossKills: string[];
    /** Current kill streak (resets on player hit) */
    currentKillStreak: number;
    /** Longest kill streak ever */
    longestKillStreak: number;
    /** Damage taken in last wave */
    lastWaveDamageTaken: number;
    /** Time survived under 10% HP (cumulative seconds) */
    lowHealthSurvivalTime: number;
    /** Total deaths across all profiles */
    totalDeaths: number;
    /** Levels completed without taking damage */
    flawlessLevelCompletions: number[];
  };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Emoji or sprite frame for icon */
  icon: string;
  category: AchievementCategory;
  /** Hidden until unlocked (shows "???" in list) */
  secret?: boolean;
  /** Evaluator function - returns true if achievement should unlock */
  condition: (ctx: AchievementContext) => boolean;
}

// ─── Combat Achievements (11) ───────────────────────────────────────────────

const combatAchievements: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'Første Blod',
    description: 'Drep din første fiende',
    icon: '⚔️',
    category: 'combat',
    condition: (ctx) => ctx.profile.totalKills >= 1,
  },
  {
    id: 'slayer',
    name: 'Drapsmann',
    description: 'Drep 100 fiender totalt',
    icon: '🗡️',
    category: 'combat',
    condition: (ctx) => ctx.profile.totalKills >= 100,
  },
  {
    id: 'executioner',
    name: 'Bøddel',
    description: 'Drep 500 fiender totalt',
    icon: '🪓',
    category: 'combat',
    condition: (ctx) => ctx.profile.totalKills >= 500,
  },
  {
    id: 'reaper',
    name: 'Ljåmann',
    description: 'Drep 1000 fiender totalt',
    icon: '💀',
    category: 'combat',
    condition: (ctx) => ctx.profile.totalKills >= 1000,
  },
  {
    id: 'rampage',
    name: 'Blodbad',
    description: 'Drep 20 fiender uten å bli truffet',
    icon: '🔥',
    category: 'combat',
    condition: (ctx) => ctx.gameStats.currentKillStreak >= 20,
  },
  {
    id: 'unstoppable',
    name: 'Ustoppelig',
    description: 'Drep 50 fiender uten å bli truffet',
    icon: '⚡',
    category: 'combat',
    condition: (ctx) => ctx.gameStats.currentKillStreak >= 50,
  },
  {
    id: 'godlike',
    name: 'Guddommelig',
    description: 'Drep 100 fiender uten å bli truffet',
    icon: '✨',
    category: 'combat',
    secret: true,
    condition: (ctx) => ctx.gameStats.longestKillStreak >= 100,
  },
  {
    id: 'boss_slayer',
    name: 'Boss-dreper',
    description: 'Beseir din første boss',
    icon: '👑',
    category: 'combat',
    condition: (ctx) => ctx.gameStats.pristineBossKills.length >= 1 || ctx.profile.highestLevelReached >= 6,
  },
  {
    id: 'pristine_victory',
    name: 'Uberørt Seier',
    description: 'Beseir en boss uten å ta skade',
    icon: '🛡️',
    category: 'combat',
    secret: true,
    condition: (ctx) => ctx.gameStats.pristineBossKills.length >= 1,
  },
  {
    id: 'boss_master',
    name: 'Boss-mester',
    description: 'Beseir alle 5 bosser',
    icon: '👹',
    category: 'combat',
    condition: (ctx) => ctx.profile.highestLevelReached >= 10,
  },
  {
    id: 'ragnarok',
    name: 'Ragnarök',
    description: 'Beseir Utgårdslokki (final boss)',
    icon: '🌋',
    category: 'combat',
    secret: true,
    condition: (ctx) => ctx.profile.highestLevelReached >= 10,
  },
];

// ─── Survival Achievements (8) ──────────────────────────────────────────────

const survivalAchievements: AchievementDef[] = [
  {
    id: 'survivor',
    name: 'Overlever',
    description: 'Fullfør level 1 uten å dø',
    icon: '❤️',
    category: 'survival',
    condition: (ctx) => ctx.profile.highestLevelReached >= 2,
  },
  {
    id: 'flawless',
    name: 'Feilfri',
    description: 'Fullfør en level uten å ta skade',
    icon: '💎',
    category: 'survival',
    secret: true,
    condition: (ctx) => ctx.gameStats.flawlessLevelCompletions.length >= 1,
  },
  {
    id: 'untouchable',
    name: 'Uoppnåelig',
    description: 'Fullfør 3 levels uten å ta skade',
    icon: '👻',
    category: 'survival',
    secret: true,
    condition: (ctx) => ctx.gameStats.flawlessLevelCompletions.length >= 3,
  },
  {
    id: 'close_call',
    name: 'Nære på',
    description: 'Fullfør en wave med under 10% HP',
    icon: '💔',
    category: 'survival',
    condition: (ctx) => ctx.gameStats.lastWaveDamageTaken > 0 && ctx.profile.playerHP < ctx.profile.playerMaxHP * 0.1,
  },
  {
    id: 'death_defier',
    name: 'Døds-trotseren',
    description: 'Overlev i 30 sekunder med under 10% HP',
    icon: '🩸',
    category: 'survival',
    secret: true,
    condition: (ctx) => ctx.gameStats.lowHealthSurvivalTime >= 30,
  },
  {
    id: 'phoenix',
    name: 'Føni ks',
    description: 'Dø og start et nytt run (død er ikke slutten)',
    icon: '🔥',
    category: 'survival',
    condition: (ctx) => ctx.gameStats.totalDeaths >= 1,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Dø 10 ganger (læring gjennom smerte)',
    icon: '⚰️',
    category: 'survival',
    condition: (ctx) => ctx.gameStats.totalDeaths >= 10,
  },
  {
    id: 'immortal',
    name: 'Udødelig',
    description: 'Nå level 10 uten å dø (i ett run)',
    icon: '👼',
    category: 'survival',
    secret: true,
    condition: (ctx) => ctx.profile.highestLevelReached >= 10 && ctx.gameStats.totalDeaths === 0,
  },
];

// ─── Paragon Achievements (7) ───────────────────────────────────────────────

const paragonAchievements: AchievementDef[] = [
  {
    id: 'first_ascension',
    name: 'Første Oppstigelse',
    description: 'Nå Paragon I (fullfør level 10 første gang)',
    icon: '🌟',
    category: 'paragon',
    condition: (ctx) => ctx.profile.paragonLevel >= 1,
  },
  {
    id: 'paragon_iii',
    name: 'Paragon III',
    description: 'Nå Paragon III',
    icon: '⭐',
    category: 'paragon',
    condition: (ctx) => ctx.profile.paragonLevel >= 3,
  },
  {
    id: 'paragon_v',
    name: 'Paragon V',
    description: 'Nå Paragon V',
    icon: '🌠',
    category: 'paragon',
    condition: (ctx) => ctx.profile.paragonLevel >= 5,
  },
  {
    id: 'paragon_vii',
    name: 'Paragon VII',
    description: 'Nå Paragon VII',
    icon: '💫',
    category: 'paragon',
    condition: (ctx) => ctx.profile.paragonLevel >= 7,
  },
  {
    id: 'paragon_x',
    name: 'Paragon X (Maksimal Mestring)',
    description: 'Nå den ultimate Paragon-tieren',
    icon: '🏆',
    category: 'paragon',
    secret: true,
    condition: (ctx) => ctx.profile.paragonLevel >= 10,
  },
  {
    id: 'rich',
    name: 'Velstående',
    description: 'Samle 10,000 mynter totalt',
    icon: '💰',
    category: 'paragon',
    condition: (ctx) => ctx.profile.coins >= 10000,
  },
  {
    id: 'tycoon',
    name: 'Magnat',
    description: 'Samle 100,000 mynter totalt',
    icon: '💸',
    category: 'paragon',
    secret: true,
    condition: (ctx) => ctx.profile.coins >= 100000,
  },
];

// ─── Exploration Achievements (7) ───────────────────────────────────────────

const explorationAchievements: AchievementDef[] = [
  {
    id: 'explorer',
    name: 'Utforsker',
    description: 'Fullfør level 3',
    icon: '🗺️',
    category: 'exploration',
    condition: (ctx) => ctx.profile.highestLevelReached >= 4,
  },
  {
    id: 'adventurer',
    name: 'Eventyrer',
    description: 'Fullfør level 5',
    icon: '🧭',
    category: 'exploration',
    condition: (ctx) => ctx.profile.highestLevelReached >= 6,
  },
  {
    id: 'champion',
    name: 'Mester',
    description: 'Fullfør level 7',
    icon: '🏅',
    category: 'exploration',
    condition: (ctx) => ctx.profile.highestLevelReached >= 8,
  },
  {
    id: 'legend',
    name: 'Legende',
    description: 'Fullfør level 10 (første gang)',
    icon: '🎖️',
    category: 'exploration',
    condition: (ctx) => ctx.profile.highestLevelReached >= 10,
  },
  {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: 'Fullfør en level under 5 minutter',
    icon: '⏱️',
    category: 'exploration',
    secret: true,
    condition: () => false, // TODO: Track level completion time
  },
  {
    id: 'wave_master',
    name: 'Wave-mester',
    description: 'Fullfør 100 waves totalt',
    icon: '🌊',
    category: 'exploration',
    condition: (ctx) => ctx.profile.highestLevelReached * 5 >= 100, // Approximate: each level has ~5 waves
  },
  {
    id: 'completionist',
    name: 'Fullføringist',
    description: 'Lås opp alle achievements (unntatt denne)',
    icon: '🏆',
    category: 'exploration',
    secret: true,
    condition: (ctx) => {
      const totalAchievements = ACHIEVEMENTS.length - 1; // Exclude this achievement itself
      return ctx.profile.achievements.length >= totalAchievements;
    },
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  ...combatAchievements,
  ...survivalAchievements,
  ...paragonAchievements,
  ...explorationAchievements,
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

export function getAllCategories(): AchievementCategory[] {
  return ['combat', 'survival', 'paragon', 'exploration'];
}

export function getCategoryDisplayName(category: AchievementCategory): string {
  const names: Record<AchievementCategory, string> = {
    combat: 'Kamp',
    survival: 'Overlevelse',
    paragon: 'Paragon',
    exploration: 'Utforskning',
  };
  return names[category];
}

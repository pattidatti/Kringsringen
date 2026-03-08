/**
 * AchievementManager
 *
 * Tracks game events and unlocks achievements based on conditions.
 * Integrates with ParagonProfile for persistence.
 */

import type { MainScene } from './main';
import { ACHIEVEMENTS, type AchievementContext, type AchievementDef } from '../config/achievements';
import { SaveManager } from './SaveManager';

export class AchievementManager {
  private scene: MainScene;

  // Game stats tracked for achievement conditions
  private gameStats: AchievementContext['gameStats'] = {
    pristineBossKills: [],
    currentKillStreak: 0,
    longestKillStreak: 0,
    lastWaveDamageTaken: 0,
    lowHealthSurvivalTime: 0,
    totalDeaths: 0,
    flawlessLevelCompletions: [],
  };

  // Session tracking
  private currentLevelDamageTaken = 0;
  private currentWaveDamageTaken = 0;
  private lowHealthTimer = 0; // Seconds under 10% HP
  private isLowHealth = false;

  // Recently unlocked achievements (for queueing toasts)
  private recentlyUnlocked: string[] = [];

  constructor(scene: MainScene) {
    this.scene = scene;
    this.setupEventListeners();
    this.loadPersistentStats();
  }

  /**
   * Subscribe to scene events for achievement tracking
   */
  private setupEventListeners(): void {
    const { events } = this.scene;

    // Combat events
    events.on('enemy-killed', this.onEnemyKilled, this);
    events.on('boss-defeated', this.onBossDefeated, this);

    // Damage events
    events.on('player-hit', this.onPlayerHit, this);

    // Wave/Level events
    events.on('wave-complete', this.onWaveComplete, this);
    events.on('level-complete', this.onLevelComplete, this);

    // Death event
    events.on('player-death', this.onPlayerDeath, this);

    // Game lifecycle
    events.on('shutdown', this.cleanup, this);
    events.on('destroy', this.cleanup, this);
  }

  /**
   * Load persistent stats from profile (total deaths, etc.)
   */
  private loadPersistentStats(): void {
    const profile = SaveManager.getActiveProfile();
    if (!profile) return;

    // Total deaths is tracked in a global setting (not in ParagonProfile yet)
    // For now, we'll estimate from profile data or initialize to 0
    const globalSettings = SaveManager.loadProfiles().globalSettings as any;
    this.gameStats.totalDeaths = globalSettings?.totalDeaths ?? 0;
  }

  /**
   * Update loop - called every frame from MainScene
   */
  public update(delta: number): void {
    // Track time survived under low health
    const registry = this.scene.registry;
    const playerHP = registry.get('playerHP') as number;
    const playerMaxHP = registry.get('playerMaxHP') as number;

    if (playerHP > 0 && playerHP < playerMaxHP * 0.1) {
      if (!this.isLowHealth) {
        this.isLowHealth = true;
        this.lowHealthTimer = 0;
      }
      this.lowHealthTimer += delta / 1000; // Convert ms to seconds
      this.gameStats.lowHealthSurvivalTime = Math.max(
        this.gameStats.lowHealthSurvivalTime,
        this.lowHealthTimer
      );

      // Check death_defier achievement
      this.checkAchievement('death_defier');
    } else {
      this.isLowHealth = false;
      this.lowHealthTimer = 0;
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────

  private onEnemyKilled(): void {
    this.gameStats.currentKillStreak++;
    this.gameStats.longestKillStreak = Math.max(
      this.gameStats.longestKillStreak,
      this.gameStats.currentKillStreak
    );

    // Increment total kills in profile
    const profile = SaveManager.getActiveProfile();
    if (profile) {
      profile.totalKills++;
      SaveManager.updateProfile(profile);
    }

    // Check kill-related achievements
    this.checkAchievement('first_blood');
    this.checkAchievement('slayer');
    this.checkAchievement('executioner');
    this.checkAchievement('reaper');
    this.checkAchievement('rampage');
    this.checkAchievement('unstoppable');
    this.checkAchievement('godlike');
  }

  private onBossDefeated(bossId: string, damageTaken: number): void {
    if (damageTaken === 0) {
      this.gameStats.pristineBossKills.push(bossId);
      this.checkAchievement('pristine_victory');
    }

    this.checkAchievement('boss_slayer');
    this.checkAchievement('boss_master');
    this.checkAchievement('ragnarok');
  }

  private onPlayerHit(damage: number): void {
    this.gameStats.currentKillStreak = 0; // Reset kill streak
    this.currentWaveDamageTaken += damage;
    this.currentLevelDamageTaken += damage;
  }

  private onWaveComplete(): void {
    this.gameStats.lastWaveDamageTaken = this.currentWaveDamageTaken;

    // Check close_call achievement (finished wave with <10% HP)
    const playerHP = this.scene.registry.get('playerHP') as number;
    const playerMaxHP = this.scene.registry.get('playerMaxHP') as number;
    if (this.currentWaveDamageTaken > 0 && playerHP < playerMaxHP * 0.1) {
      this.checkAchievement('close_call');
    }

    // Check wave_master
    this.checkAchievement('wave_master');

    // Reset wave damage counter
    this.currentWaveDamageTaken = 0;
  }

  private onLevelComplete(): void {
    const currentLevel = this.scene.registry.get('gameLevel') as number;

    // Check if level was flawless (no damage taken)
    if (this.currentLevelDamageTaken === 0) {
      this.gameStats.flawlessLevelCompletions.push(currentLevel);
      this.checkAchievement('flawless');
      this.checkAchievement('untouchable');
    }

    // Reset level damage counter
    this.currentLevelDamageTaken = 0;

    // Check progression achievements
    this.checkAchievement('survivor');
    this.checkAchievement('explorer');
    this.checkAchievement('adventurer');
    this.checkAchievement('champion');
    this.checkAchievement('legend');
    this.checkAchievement('first_ascension');

    // Check Paragon tier achievements
    this.checkAchievement('paragon_iii');
    this.checkAchievement('paragon_v');
    this.checkAchievement('paragon_vii');
    this.checkAchievement('paragon_x');

    // Check coin achievements
    this.checkAchievement('rich');
    this.checkAchievement('tycoon');

    // Check immortal (reach level 10 without dying)
    if (currentLevel >= 10 && this.gameStats.totalDeaths === 0) {
      this.checkAchievement('immortal');
    }
  }

  private onPlayerDeath(): void {
    this.gameStats.totalDeaths++;

    // Persist total deaths to global settings
    const store = SaveManager.loadProfiles();
    const globalSettings = store.globalSettings as any;
    globalSettings.totalDeaths = this.gameStats.totalDeaths;
    SaveManager.saveProfiles(store);

    // Check death-related achievements
    this.checkAchievement('phoenix');
    this.checkAchievement('veteran');
  }

  // ─── Achievement Checking & Unlocking ───────────────────────────────────

  /**
   * Check if a specific achievement should unlock
   */
  private checkAchievement(achievementId: string): void {
    const profile = SaveManager.getActiveProfile();
    if (!profile) return;

    // Already unlocked?
    if (profile.achievements.includes(achievementId)) return;

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return;

    // Build context for condition check
    const context: AchievementContext = {
      profile,
      gameStats: this.gameStats,
    };

    // Evaluate condition
    if (achievement.condition(context)) {
      this.unlock(achievementId, achievement);
    }
  }

  /**
   * Unlock an achievement (idempotent - safe to call multiple times)
   */
  public unlock(achievementId: string, achievement?: AchievementDef): void {
    const profile = SaveManager.getActiveProfile();
    if (!profile) return;

    // Already unlocked?
    if (profile.achievements.includes(achievementId)) return;

    // Add to profile
    profile.achievements.push(achievementId);
    SaveManager.updateProfile(profile);

    // Track for toast notification
    this.recentlyUnlocked.push(achievementId);

    // Emit event for UI to show toast
    const ach = achievement || ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (ach) {
      this.scene.events.emit('achievement-unlocked', ach);
      console.log(`[AchievementManager] 🏆 Unlocked: ${ach.name}`);
    }

    // Check completionist achievement (meta-achievement)
    this.checkAchievement('completionist');
  }

  /**
   * Get recently unlocked achievement IDs and clear the queue
   */
  public getRecentlyUnlocked(): string[] {
    const recent = [...this.recentlyUnlocked];
    this.recentlyUnlocked = [];
    return recent;
  }

  /**
   * Get current achievement context (for debugging or manual checks)
   */
  public getContext(): AchievementContext {
    const profile = SaveManager.getActiveProfile();
    return {
      profile: profile!,
      gameStats: this.gameStats,
    };
  }

  /**
   * Cleanup event listeners
   */
  private cleanup(): void {
    const { events } = this.scene;
    events.off('enemy-killed', this.onEnemyKilled, this);
    events.off('boss-defeated', this.onBossDefeated, this);
    events.off('player-hit', this.onPlayerHit, this);
    events.off('wave-complete', this.onWaveComplete, this);
    events.off('level-complete', this.onLevelComplete, this);
    events.off('player-death', this.onPlayerDeath, this);
  }
}

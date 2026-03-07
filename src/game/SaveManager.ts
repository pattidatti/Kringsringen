import { CLASS_CONFIGS, type ClassId } from '../config/classes';
import type { ParagonProfile } from '../config/paragon';
import { createDefaultProfile, MAX_CHARACTER_SLOTS } from '../config/paragon';

export interface EnemySave {
    type: string;
    x: number;
    y: number;
    hp: number;
    maxHP: number;
}

export interface RunProgress {
    gameLevel: number;
    currentWave: number;
    playerCoins: number;
    upgradeLevels: Record<string, number>;
    currentWeapon: string;
    unlockedWeapons: string[];
    playerHP: number;
    playerMaxHP: number;
    savedAt: number;
    playerX?: number;
    playerY?: number;
    savedEnemies?: EnemySave[];
    waveEnemiesRemaining?: number;
    /** Klassen spilleren valgte for denne runen. undefined i gamle saves → resolves til 'krieger'. */
    playerClass?: ClassId;
}

export interface SaveData {
    coins: number;
    upgradeLevels: Record<string, number>;
    highStage: number;
    unlockedWeapons: string[];
    audioSettings?: any; // Avoiding circular dependency, will be typed in AudioManager
    graphicsQuality?: string;
    tutorialSeen?: boolean;
    /** Siste klasse spilleren valgte. Brukes for å huske valg på neste run. */
    lastSelectedClass?: ClassId;
}

// ─── Profile Store (multi-character Paragon system) ─────────────────────────

export interface ProfileStore {
    profiles: ParagonProfile[];
    activeProfileId: string | null;
    globalSettings: {
        audioSettings?: any;
        graphicsQuality?: string;
        tutorialSeen?: boolean;
    };
}

export class SaveManager {
    private static readonly SAVE_KEY = 'kringsringen_save_v1';
    private static readonly RUN_KEY = 'kringsringen_run_v1';
    private static readonly PROFILES_KEY = 'kringsringen_profiles_v1';

    // ─── Profile System (new Paragon persistence) ───────────────────────

    static loadProfiles(): ProfileStore {
        try {
            const data = localStorage.getItem(this.PROFILES_KEY);
            if (data) {
                const parsed = JSON.parse(data) as ProfileStore;
                return {
                    profiles: parsed.profiles || [],
                    activeProfileId: parsed.activeProfileId || null,
                    globalSettings: parsed.globalSettings || {},
                };
            }
        } catch (e) {
            console.error('[SaveManager] Failed to load profiles:', e);
        }
        return { profiles: [], activeProfileId: null, globalSettings: {} };
    }

    static saveProfiles(store: ProfileStore): void {
        try {
            localStorage.setItem(this.PROFILES_KEY, JSON.stringify(store));
        } catch (e) {
            console.error('[SaveManager] Failed to save profiles:', e);
        }
    }

    static getActiveProfile(): ParagonProfile | null {
        const store = this.loadProfiles();
        if (!store.activeProfileId) return null;
        return store.profiles.find(p => p.id === store.activeProfileId) ?? null;
    }

    static setActiveProfile(profileId: string): void {
        const store = this.loadProfiles();
        store.activeProfileId = profileId;
        this.saveProfiles(store);
    }

    static createProfile(name: string, classId: ClassId): ParagonProfile {
        const store = this.loadProfiles();
        if (store.profiles.length >= MAX_CHARACTER_SLOTS) {
            throw new Error(`Maximum ${MAX_CHARACTER_SLOTS} character slots`);
        }
        const classConfig = CLASS_CONFIGS[classId];
        const profile = createDefaultProfile(name, classId, classConfig.startingWeapons);
        store.profiles.push(profile);
        store.activeProfileId = profile.id;
        this.saveProfiles(store);
        return profile;
    }

    static updateProfile(profile: ParagonProfile): void {
        const store = this.loadProfiles();
        const idx = store.profiles.findIndex(p => p.id === profile.id);
        if (idx >= 0) {
            store.profiles[idx] = { ...profile, lastPlayedAt: Date.now() };
        }
        this.saveProfiles(store);
    }

    static deleteProfile(profileId: string): void {
        const store = this.loadProfiles();
        store.profiles = store.profiles.filter(p => p.id !== profileId);
        if (store.activeProfileId === profileId) {
            store.activeProfileId = store.profiles[0]?.id ?? null;
        }
        this.saveProfiles(store);
    }

    static hasProfiles(): boolean {
        const store = this.loadProfiles();
        return store.profiles.length > 0;
    }

    /**
     * Build a RunProgress from a ParagonProfile for compatibility with existing game code.
     */
    static profileToRunProgress(profile: ParagonProfile): RunProgress {
        return {
            gameLevel: profile.currentGameLevel,
            currentWave: profile.currentWave,
            playerCoins: profile.coins,
            upgradeLevels: profile.upgradeLevels,
            currentWeapon: profile.currentWeapon,
            unlockedWeapons: [...profile.unlockedWeapons],
            playerHP: profile.playerHP,
            playerMaxHP: profile.playerMaxHP,
            savedAt: profile.lastPlayedAt,
            playerX: profile.playerX,
            playerY: profile.playerY,
            savedEnemies: profile.savedEnemies,
            waveEnemiesRemaining: profile.waveEnemiesRemaining,
            playerClass: profile.classId,
        };
    }

    /**
     * Sync current game state back into a ParagonProfile.
     */
    static syncToProfile(profile: ParagonProfile, run: RunProgress): ParagonProfile {
        return {
            ...profile,
            currentGameLevel: run.gameLevel,
            currentWave: run.currentWave,
            coins: run.playerCoins,
            upgradeLevels: { ...run.upgradeLevels },
            currentWeapon: run.currentWeapon,
            unlockedWeapons: [...run.unlockedWeapons],
            playerHP: run.playerHP,
            playerMaxHP: run.playerMaxHP,
            playerX: run.playerX,
            playerY: run.playerY,
            savedEnemies: run.savedEnemies,
            waveEnemiesRemaining: run.waveEnemiesRemaining,
            lastPlayedAt: Date.now(),
        };
    }

    /**
     * Migrate legacy v1 save data into a Paragon profile (one-time migration).
     */
    static migrateFromLegacy(): ParagonProfile | null {
        const legacySave = this.load();
        const legacyRun = this.loadRunProgress();

        // Nothing to migrate if no meaningful data
        if (!legacyRun && legacySave.highStage <= 1 && legacySave.coins === 0) {
            return null;
        }

        const classId = legacyRun?.playerClass ?? legacySave.lastSelectedClass ?? 'krieger';
        const classConfig = CLASS_CONFIGS[classId];

        const profile = createDefaultProfile('Helt', classId, classConfig.startingWeapons);

        // Merge legacy data
        if (legacyRun) {
            profile.currentGameLevel = Math.max(1, legacyRun.gameLevel);
            profile.currentWave = legacyRun.currentWave ?? 1;
            profile.coins = legacyRun.playerCoins ?? 0;
            profile.upgradeLevels = legacyRun.upgradeLevels ?? {};
            profile.currentWeapon = legacyRun.currentWeapon ?? classConfig.startingWeapons[0];
            profile.unlockedWeapons = legacyRun.unlockedWeapons?.length
                ? [...legacyRun.unlockedWeapons]
                : [...classConfig.startingWeapons];
            profile.playerHP = legacyRun.playerHP ?? 100;
            profile.playerMaxHP = legacyRun.playerMaxHP ?? 100;
            profile.playerX = legacyRun.playerX;
            profile.playerY = legacyRun.playerY;
            profile.savedEnemies = legacyRun.savedEnemies;
            profile.waveEnemiesRemaining = legacyRun.waveEnemiesRemaining;
        }

        profile.highestLevelReached = legacySave.highStage;

        return profile;
    }

    /** Save global settings (audio, graphics, tutorial) separate from profiles */
    static saveGlobalSettings(settings: ProfileStore['globalSettings']): void {
        const store = this.loadProfiles();
        store.globalSettings = { ...store.globalSettings, ...settings };
        this.saveProfiles(store);

        // Also save to legacy for backward compatibility during transition
        this.save(settings as Partial<SaveData>);
    }

    static loadGlobalSettings(): ProfileStore['globalSettings'] {
        const store = this.loadProfiles();
        // Fall back to legacy settings if profile store has none
        if (!store.globalSettings.graphicsQuality && !store.globalSettings.tutorialSeen) {
            const legacy = this.load();
            return {
                audioSettings: legacy.audioSettings,
                graphicsQuality: legacy.graphicsQuality,
                tutorialSeen: legacy.tutorialSeen,
            };
        }
        return store.globalSettings;
    }

    // ─── Legacy RunProgress System (kept for backward compat + multiplayer) ──

    static saveRunProgress(progress: RunProgress): void {
        try {
            localStorage.setItem(this.RUN_KEY, JSON.stringify({ ...progress, savedAt: Date.now() }));
        } catch (e) {
            console.error('Failed to save run progress:', e);
        }

        // Also sync to active profile
        const activeProfile = this.getActiveProfile();
        if (activeProfile) {
            const updated = this.syncToProfile(activeProfile, progress);
            this.updateProfile(updated);
        }
    }

    static loadRunProgress(): RunProgress | null {
        try {
            const data = localStorage.getItem(this.RUN_KEY);
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (typeof parsed.gameLevel !== 'number' || typeof parsed.currentWave !== 'number') {
                this.clearRunProgress();
                return null;
            }
            return parsed as RunProgress;
        } catch (e) {
            console.error('Failed to load run progress:', e);
            return null;
        }
    }

    static rehabilitateRunProgress(run: RunProgress): RunProgress {
        // CRITICAL: Clamp level to minimum 1 to prevent STATIC_MAPS[-1] crash
        const restoredLevel = Math.max(1, run.gameLevel || 1);
        const restoredWave = run.currentWave ?? 1;
        const restoredCoins = run.playerCoins ?? 0;
        const restoredUpgrades = run.upgradeLevels ?? {};
        const restoredWeapon = run.currentWeapon ?? 'sword';

        // REHABILITATION: If a corrupted save has no weapons, restore to class defaults.
        // Wizard starts with 3, Others with 1. We only flag as corrupted if it's empty.
        let restoredWeapons = run.unlockedWeapons || [];

        if (restoredWeapons.length === 0) {
            const playerClassId = run.playerClass || 'krieger';
            const classConfig = CLASS_CONFIGS[playerClassId];
            console.log(`[SaveManager] Empty weapon list detected for ${playerClassId}. Restoring to starting weapons.`);
            restoredWeapons = [...(classConfig?.startingWeapons || ['sword'])];
        }

        return {
            ...run,
            gameLevel: restoredLevel,
            currentWave: restoredWave,
            playerCoins: restoredCoins,
            upgradeLevels: restoredUpgrades,
            currentWeapon: restoredWeapon,
            unlockedWeapons: restoredWeapons,
            playerHP: Math.max(0, run.playerHP)
        };
    }

    static clearRunProgress(): void {
        localStorage.removeItem(this.RUN_KEY);
    }

    static hasSavedRun(): boolean {
        return localStorage.getItem(this.RUN_KEY) !== null;
    }

    static load(): SaveData {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                return {
                    coins: parsed.coins || 0,
                    upgradeLevels: parsed.upgradeLevels || {},
                    highStage: parsed.highStage || 1,
                    unlockedWeapons: parsed.unlockedWeapons || ['sword'],
                    audioSettings: parsed.audioSettings,
                    graphicsQuality: parsed.graphicsQuality,
                    tutorialSeen: parsed.tutorialSeen,
                    lastSelectedClass: parsed.lastSelectedClass
                };
            }
        } catch (e) {
            console.error('Failed to load save data:', e);
        }
        return this.getDefaultData();
    }

    static save(data: Partial<SaveData>) {
        try {
            // Merge with existing data to avoid overwriting missing fields if passing partial
            const current = this.load();
            const toSave = { ...current, ...data };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    static clear() {
        localStorage.removeItem(this.SAVE_KEY);
    }

    /** Resets all per-run data (coins, upgrades, weapons) but preserves highStage. */
    static clearRun(): void {
        const current = this.load();
        this.save({
            coins: 0,
            upgradeLevels: {},
            unlockedWeapons: ['sword'],
            highStage: current.highStage
        });
    }

    private static getDefaultData(): SaveData {
        return {
            coins: 0,
            upgradeLevels: {},
            highStage: 1,
            unlockedWeapons: ['sword']
        };
    }
}

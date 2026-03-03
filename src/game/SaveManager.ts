import { CLASS_CONFIGS, type ClassId } from '../config/classes';

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

export class SaveManager {
    private static readonly SAVE_KEY = 'kringsringen_save_v1';
    private static readonly RUN_KEY = 'kringsringen_run_v1';

    static saveRunProgress(progress: RunProgress): void {
        try {
            localStorage.setItem(this.RUN_KEY, JSON.stringify({ ...progress, savedAt: Date.now() }));
        } catch (e) {
            console.error('Failed to save run progress:', e);
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

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
}

export interface SaveData {
    coins: number;
    upgradeLevels: Record<string, number>;
    highStage: number;
    unlockedWeapons: string[];
    audioSettings?: any; // Avoiding circular dependency, will be typed in AudioManager
    graphicsQuality?: string;
    tutorialSeen?: boolean;
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
                    graphicsQuality: parsed.graphicsQuality
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

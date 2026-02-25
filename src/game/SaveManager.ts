export interface SaveData {
    coins: number;
    upgradeLevels: Record<string, number>;
    highStage: number;
    unlockedWeapons: string[];
    audioSettings?: any; // Avoiding circular dependency, will be typed in AudioManager
    tutorialSeen?: boolean;
}

export class SaveManager {
    private static readonly SAVE_KEY = 'kringsringen_save_v1';

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
                    audioSettings: parsed.audioSettings
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

import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import type { ItemIconKey } from '../components/ui/ItemIcon';

export type BuffCategory = 'combat' | 'passive' | 'ultimate' | 'vers';

export interface BuffStat {
    type: 'damage' | 'speed' | 'attackSpeed' | 'damageReduction' | 'crit' | 'lifesteal' | 'heal';
    value: number;               // Absolute or percentage value
    displayFormat: 'percent' | 'flat' | 'multiplier';
}

export interface Buff {
    id: string;      // Unique instance ID (e.g. 'momentum_123')
    key: string;     // Logic ID (e.g. 'heavy_momentum')
    title: string;
    icon: ItemIconKey;
    color: number;   // Hex for visual effects
    startTime: number;
    duration: number; // -1 for infinite
    stacks: number;
    maxStacks: number;
    isVisible: boolean;
    data?: any;

    // Enhanced metadata for better UI
    description?: string;        // Human-readable description for tooltips
    statModifiers?: BuffStat[];  // Machine-readable stat changes
    category?: BuffCategory;     // Categorization for UI sorting/grouping
    priority?: number;           // Display order (higher = shown first, default: 0)
}

export class BuffManager {
    private scene: IMainScene;
    private buffs: Map<string, Buff> = new Map();


    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public addBuff(config: Omit<Buff, 'id' | 'startTime' | 'stacks'> & { id?: string }): void {
        const key = config.key;
        const now = Date.now();

        // Handle stacking if buff already exists
        const existing = Array.from(this.buffs.values()).find(b => b.key === key);

        if (existing) {
            existing.startTime = now; // Refresh duration
            existing.stacks = Math.min(existing.stacks + 1, existing.maxStacks);

            // If it's a visible buff, trigger a registry sync if stacks changed
            if (existing.isVisible) {
                this.syncToRegistry();
            }
            return;
        }

        // New buff
        const newBuff: Buff = {
            ...config,
            id: config.id || `${key}_${now}`,
            startTime: now,
            stacks: 1
        };

        this.buffs.set(newBuff.id, newBuff);

        if (newBuff.isVisible) {
            this.syncToRegistry();
        }

        // Juice: Visual effect on player
        this.triggerProcEffect(newBuff);
    }

    public removeBuff(key: string): void {
        let changed = false;
        for (const [id, buff] of this.buffs.entries()) {
            if (buff.key === key) {
                this.buffs.delete(id);
                changed = true;
            }
        }
        if (changed) this.syncToRegistry();
    }

    /**
     * Update an existing buff's properties (primarily for stat modifiers).
     * Used for dynamic buffs like Crescendo that change value based on Vers count.
     */
    public updateBuff(key: string, updates: Partial<Omit<Buff, 'id' | 'key' | 'startTime'>>): void {
        const existing = Array.from(this.buffs.values()).find(b => b.key === key);
        if (!existing) return;

        Object.assign(existing, updates);

        if (existing.isVisible) {
            this.syncToRegistry();
        }
    }

    public hasBuff(key: string): boolean {
        return Array.from(this.buffs.values()).some(b => b.key === key);
    }

    public getStacks(key: string): number {
        const buff = Array.from(this.buffs.values()).find(b => b.key === key);
        return buff ? buff.stacks : 0;
    }

    public update(): void {
        const now = Date.now();
        let changed = false;

        for (const [id, buff] of this.buffs.entries()) {
            if (buff.duration !== -1 && now > buff.startTime + buff.duration) {
                this.buffs.delete(id);
                changed = true;
            }
        }

        if (changed) {
            this.syncToRegistry();
        }
    }

    private syncToRegistry(): void {
        // Only sync if visible buffs changed
        const visibleBuffs = Array.from(this.buffs.values())
            .filter(b => b.isVisible)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // Sort by priority
            .map(b => ({
                id: b.id,
                key: b.key,
                title: b.title,
                icon: b.icon,
                startTime: b.startTime,
                duration: b.duration,
                stacks: b.stacks,
                maxStacks: b.maxStacks,
                description: b.description,
                statModifiers: b.statModifiers,
                category: b.category,
                priority: b.priority
            }));

        this.scene.registry.set('activeBuffs', visibleBuffs);
    }

    private triggerProcEffect(buff: Buff): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !player.active) return;

        // Rising icon or glow effect
        this.scene.events.emit('buff-proc', buff);

        // Simple glow tween on player
        if (buff.color !== 0xffffff) {
            this.scene.tweens.add({
                targets: player,
                tint: buff.color,
                duration: 200,
                yoyo: true,
                onComplete: () => {
                    if (player.active) player.clearTint();
                }
            });
        }
    }

    public clear(): void {
        this.buffs.clear();
        this.syncToRegistry();
    }
}

import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { Shrine } from './Shrine';
import { SHRINE_EFFECTS } from '../config/shrines';
import type { ShrineMods } from '../config/shrines';

const PROXIMITY_RADIUS = 80;
const MAP_CENTER_X = 1500;
const MAP_CENTER_Y = 1500;

/** Registry shape written to 'activeShrineEffect'. React reads this for HUD. */
export interface ActiveShrineInfo {
    name: string;
    description: string;
    color: number;
    type: 'blessing' | 'curse';
    startTime: number;   // Date.now() at activation — React uses this for countdown
    duration: number;    // ms
}

/**
 * Manages shrine spawning, proximity detection, effect application, and cleanup.
 * Mirrors the structure of WaveEventManager.
 */
export class ShrineManager {
    private readonly scene: IMainScene;
    private activeShrine: Shrine | null = null;
    private modEndTimer: Phaser.Time.TimerEvent | null = null;
    private drainAccumulator: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;

        // Listen for C-key activate-shrine event emitted by InputManager
        this.scene.events.on('activate-shrine', this.onActivateKey, this);

        // Clear mods when player dies (singleplayer)
        this.scene.events.on('singleplayer-game-over', this.clearMods, this);
    }

    /**
     * 40% chance to spawn a shrine at a random position around the map center.
     * No-ops if a shrine is already present on the map.
     * Only call on the host / single-player (guard in WaveManager).
     */
    public trySpawnShrine(): void {
        if (this.activeShrine && this.activeShrine.active) return;
        if (Math.random() > 0.40) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = Phaser.Math.Between(300, 600);
        const x = MAP_CENTER_X + Math.cos(angle) * dist;
        const y = MAP_CENTER_Y + Math.sin(angle) * dist;

        const def = Phaser.Utils.Array.GetRandom(SHRINE_EFFECTS);
        this.activeShrine = new Shrine(this.scene as unknown as Phaser.Scene, x, y, def);
    }

    /**
     * Called from MainScene.update() every frame.
     * Handles proximity prompt visibility and HP drain.
     */
    public update(delta: number): void {
        const player = this.scene.player;
        if (!player?.active) return;

        // ── Proximity prompt ─────────────────────────────────────────────────
        if (this.activeShrine?.active) {
            const dist = Phaser.Math.Distance.Between(
                player.x, player.y,
                this.activeShrine.x, this.activeShrine.y
            );
            const inRange = dist <= PROXIMITY_RADIUS;
            this.scene.registry.set('shrinePromptVisible', inRange);
            this.activeShrine.setPromptVisible(inRange);
        } else {
            // Shrine was destroyed (despawned) — clear prompt flag
            if (this.scene.registry.get('shrinePromptVisible')) {
                this.scene.registry.set('shrinePromptVisible', false);
            }
            this.activeShrine = null;
        }

        // ── HP drain from active shrine effect ───────────────────────────────
        const shrineMods = this.scene.registry.get('shrineStatMods') as ShrineMods | null;
        if (!shrineMods?.drainPerSec) return;

        const curHP = (this.scene.registry.get('playerHP') as number) || 0;
        if (curHP <= 1) return;

        this.drainAccumulator += delta;
        if (this.drainAccumulator >= 1000) {
            this.drainAccumulator -= 1000;
            const drain = shrineMods.drainPerSec;
            const newHP = Math.max(1, curHP - drain);
            this.scene.registry.set('playerHP', newHP);
            this.scene.poolManager.getDamageText(player.x, player.y - 30, `-${drain}`, '#cc44cc');
        }
    }

    /** Called by the C-key event bridge in InputManager → scene.events. */
    private onActivateKey(): void {
        if (!this.scene.registry.get('shrinePromptVisible')) return;
        if (!this.activeShrine?.active) return;
        this.activateShrine(this.activeShrine);
    }

    private activateShrine(shrine: Shrine): void {
        // Clear any existing shrine effect before applying the new one
        this.clearMods();

        shrine.cancelDespawn();
        this.scene.registry.set('shrinePromptVisible', false);

        // Apply stat mods
        const { mods, def } = this.getShrineParts(shrine);
        this.scene.registry.set('shrineStatMods', mods);
        this.scene.stats.recalculateStats();

        // Clamp current HP to new max (handles maxHpMult reducing max HP)
        if (mods.maxHpMult !== undefined) {
            const newMaxHP = this.scene.registry.get('playerMaxHP') as number;
            const curHP = this.scene.registry.get('playerHP') as number;
            if (curHP > newMaxHP) {
                this.scene.registry.set('playerHP', newMaxHP);
            }
        }

        // Publish active shrine info for React HUD
        const info: ActiveShrineInfo = {
            name: def.displayName,
            description: def.description,
            color: def.color,
            type: def.type,
            startTime: Date.now(),
            duration: def.duration
        };
        this.scene.registry.set('activeShrineEffect', info);

        // Visual: fade out and destroy the shrine object
        (this.scene as unknown as Phaser.Scene).tweens.add({
            targets: shrine,
            alpha: 0,
            duration: 400,
            onComplete: () => { if (shrine.active) shrine.destroy(); }
        });
        this.activeShrine = null;
        this.drainAccumulator = 0;

        // Schedule effect end
        this.modEndTimer = this.scene.time.delayedCall(def.duration, () => {
            this.clearMods();
        });
    }

    /** Removes shrine mods and resets registry. Safe to call at any time. */
    public clearMods(): void {
        this.modEndTimer?.destroy();
        this.modEndTimer = null;
        this.drainAccumulator = 0;

        const hadMods = !!this.scene.registry.get('shrineStatMods');
        this.scene.registry.set('shrineStatMods', null);
        this.scene.registry.set('activeShrineEffect', null);
        this.scene.registry.set('shrinePromptVisible', false);

        if (hadMods) {
            this.scene.stats.recalculateStats();
        }
    }

    /** Extract mods and def from a Shrine (helper to avoid repetition). */
    private getShrineParts(shrine: Shrine): { mods: ShrineMods; def: typeof shrine.def } {
        return { mods: shrine.def.mods, def: shrine.def };
    }

    public destroy(): void {
        this.scene.events.off('activate-shrine', this.onActivateKey, this);
        this.scene.events.off('singleplayer-game-over', this.clearMods, this);
        this.modEndTimer?.destroy();
        if (this.activeShrine?.active) this.activeShrine.destroy();
    }
}

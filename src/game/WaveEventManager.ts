import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';

interface WaveEventDef {
    id: string;
    displayName: string;
    description: string;
    /** Duration in ms. */
    duration: number;
    /** Hex colour for the announcement text. */
    color: number;
    /**
     * Activates the event. Returns a cleanup function called when the event ends.
     * The cleanup must undo every side effect (registry keys, overlays, timers).
     */
    activate(scene: IMainScene): () => void;
}

const WAVE_EVENTS: WaveEventDef[] = [
    // ─── 1. BLODMÅNE ─────────────────────────────────────────────────────────
    {
        id: 'blood_moon',
        displayName: 'BLODMÅNE',
        description: 'Fiendene beveger seg 2× raskere i 15 sekunder!',
        duration: 15000,
        color: 0xcc2222,
        activate(scene) {
            const cam = scene.cameras.main;
            const overlay = scene.add.rectangle(
                cam.width / 2, cam.height / 2, 4000, 4000, 0xcc0000, 0
            ).setScrollFactor(0).setDepth(7900);
            scene.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.18 }, duration: 1000 });
            scene.registry.set('waveEventSpeedMultiplier', 2);

            return () => {
                scene.registry.set('waveEventSpeedMultiplier', 1);
                if (overlay.active) {
                    scene.tweens.add({
                        targets: overlay, alpha: 0, duration: 800,
                        onComplete: () => { if (overlay.active) overlay.destroy(); }
                    });
                }
            };
        }
    },

    // ─── 2. MYNTSTORM ────────────────────────────────────────────────────────
    {
        id: 'coin_rush',
        displayName: 'MYNTSTORM',
        description: 'Alle fiender dropper 3× mynter i 20 sekunder!',
        duration: 20000,
        color: 0xf6d860,
        activate(scene) {
            scene.registry.set('waveEventCoinMultiplier', 3);

            // Golden border on camera edges
            const cam = scene.cameras.main;
            const gfx = scene.add.graphics().setScrollFactor(0).setDepth(7900).setAlpha(0);
            gfx.lineStyle(6, 0xf6d860, 0.5);
            gfx.strokeRect(4, 4, cam.width - 8, cam.height - 8);
            scene.tweens.add({ targets: gfx, alpha: 1, duration: 600 });

            return () => {
                scene.registry.set('waveEventCoinMultiplier', 1);
                if (gfx.active) gfx.destroy();
            };
        }
    },

    // ─── 3. GYLDEN HORDE ─────────────────────────────────────────────────────
    {
        id: 'golden_horde',
        displayName: 'GYLDEN HORDE',
        description: 'Gylne fiender dropper 2× mynter!',
        duration: 25000,
        color: 0xffc400,
        activate(scene) {
            scene.registry.set('waveEventCoinMultiplier', 2);
            const tinted: any[] = [];
            scene.enemies.children.iterate((child: any) => {
                if (child.active && !child.isDead) {
                    child.setTint(0xffd700);
                    tinted.push(child);
                }
                return true;
            });

            return () => {
                scene.registry.set('waveEventCoinMultiplier', 1);
                tinted.forEach(e => { if (e.active) e.clearTint(); });
            };
        }
    },

    // ─── 4. LYNSTORM ─────────────────────────────────────────────────────────
    {
        id: 'lightning_storm',
        displayName: 'LYNSTORM',
        description: 'Lynnedslag treffer kartet – hold deg unna!',
        duration: 18000,
        color: 0x88ccff,
        activate(scene) {
            const cam = scene.cameras.main;
            const overlay = scene.add.rectangle(
                cam.width / 2, cam.height / 2, 4000, 4000, 0x001133, 0
            ).setScrollFactor(0).setDepth(7900);
            scene.tweens.add({ targets: overlay, alpha: { from: 0, to: 0.10 }, duration: 800 });

            const strikeTimer = scene.time.addEvent({
                delay: 1500,
                loop: true,
                callback: () => {
                    const wx = cam.worldView.x + Math.random() * cam.worldView.width;
                    const wy = cam.worldView.y + Math.random() * cam.worldView.height;

                    // White line bolt
                    const g = scene.add.graphics().setDepth(4500);
                    g.lineStyle(3, 0xffffff, 1.0);
                    g.lineBetween(wx, wy - 280, wx, wy);
                    scene.tweens.add({
                        targets: g, alpha: { from: 1, to: 0 }, duration: 250,
                        onComplete: () => { if (g.active) g.destroy(); }
                    });

                    scene.poolManager.spawnLightningImpact(wx, wy);

                    const player = scene.player;
                    if (player?.active) {
                        if (Phaser.Math.Distance.Between(player.x, player.y, wx, wy) < 100) {
                            scene.combat.takePlayerDamage(10, wx, wy);
                        }
                    }
                }
            });

            return () => {
                strikeTimer.destroy();
                if (overlay.active) {
                    scene.tweens.add({
                        targets: overlay, alpha: 0, duration: 800,
                        onComplete: () => { if (overlay.active) overlay.destroy(); }
                    });
                }
            };
        }
    },

    // ─── 5. METEORREG ────────────────────────────────────────────────────────
    {
        id: 'meteor_shower',
        displayName: 'METEORREG',
        description: 'Meteorer rammer bakken – unngå de oransje sonene!',
        duration: 20000,
        color: 0xff6600,
        activate(scene) {
            const spawnSalvo = () => {
                const player = scene.player;
                if (!player?.active) return;

                const count = Phaser.Math.Between(2, 4);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Phaser.Math.Between(180, 450);
                    const x = Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 100, 2900);
                    const y = Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 100, 2900);

                    const g = scene.add.graphics().setDepth(3000);
                    g.lineStyle(3, 0xff6600, 0.9);
                    g.strokeCircle(x, y, 80);
                    scene.tweens.add({
                        targets: g, alpha: { from: 0.4, to: 1 },
                        duration: 350, yoyo: true, repeat: 2
                    });

                    scene.time.delayedCall(1800, () => {
                        if (g.active) g.destroy();
                        scene.poolManager.spawnFireballExplosion(x, y);

                        const p = scene.player;
                        if (p?.active) {
                            if (Phaser.Math.Distance.Between(p.x, p.y, x, y) < 80) {
                                scene.combat.takePlayerDamage(18, x, y);
                            }
                        }
                    });
                }
            };

            scene.time.delayedCall(800, spawnSalvo);
            const meteorTimer = scene.time.addEvent({ delay: 3200, loop: true, callback: spawnSalvo });

            return () => {
                meteorTimer.destroy();
            };
        }
    }
];

/** Registry shape written to 'activeWaveEvent'. React reads this for HUD. */
export interface ActiveWaveEventInfo {
    name: string;
    description: string;
    color: number;
    startTime: number;  // Date.now() at trigger — React uses this for countdown
    duration: number;   // ms
}

export class WaveEventManager {
    private readonly scene: IMainScene;
    private activeEventId: string | null = null;
    private cleanupFn: (() => void) | null = null;
    private endTimer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /**
     * Called by WaveManager mid-wave.
     * 65% chance of triggering a random event; no-ops if one is already active.
     */
    public triggerRandom(): void {
        if (this.activeEventId) return;
        if (Math.random() > 0.65) return;

        const event = Phaser.Utils.Array.GetRandom(WAVE_EVENTS) as WaveEventDef;
        this.trigger(event);
    }

    /** Immediately ends the active event (no-op if none). Called on wave complete and player death. */
    public endActive(): void {
        if (!this.activeEventId) return;

        this.cleanupFn?.();
        this.cleanupFn = null;

        this.endTimer?.destroy();
        this.endTimer = null;

        this.activeEventId = null;
        this.scene.registry.set('activeWaveEvent', null);
    }

    private trigger(event: WaveEventDef): void {
        this.activeEventId = event.id;
        this.showAnnouncement(event);
        this.cleanupFn = event.activate(this.scene);

        const info: ActiveWaveEventInfo = {
            name: event.displayName,
            description: event.description,
            color: event.color,
            startTime: Date.now(),
            duration: event.duration
        };
        this.scene.registry.set('activeWaveEvent', info);

        this.endTimer = this.scene.time.delayedCall(event.duration, () => {
            this.endActive();
        });
    }

    private showAnnouncement(event: WaveEventDef): void {
        const cam = this.scene.cameras.main;
        const colorHex = '#' + event.color.toString(16).padStart(6, '0');

        const title = this.scene.add.text(
            cam.width / 2,
            cam.height / 2 + 60,
            event.displayName,
            {
                fontSize: '52px',
                color: colorHex,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 8,
                fontFamily: '"Cinzel", serif'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(9500).setAlpha(0);

        const sub = this.scene.add.text(
            cam.width / 2,
            cam.height / 2 + 122,
            event.description,
            {
                fontSize: '20px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5,
                fontFamily: '"Cinzel", serif'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(9500).setAlpha(0);

        this.scene.tweens.add({
            targets: [title, sub],
            alpha: { from: 0, to: 1 },
            y: '-=18',
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: [title, sub],
                    alpha: 0,
                    delay: 2500,
                    duration: 800,
                    onComplete: () => { title.destroy(); sub.destroy(); }
                });
            }
        });
    }
}

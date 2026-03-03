import type { IMainScene } from './IMainScene';
import { PacketType } from '../network/SyncSchemas';
import { BOSS_CONFIGS } from '../config/bosses';
import { SaveManager } from './SaveManager';
import { Enemy } from './Enemy';
import { Coin } from './Coin';

export class SceneEventManager {
    private scene: IMainScene;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public setupEventListeners() {
        const scene = this.scene as any; // Temporary cast for internal access until IMainScene is fully fleshed

        scene.events.on('enemy-hit-player', (damage: number, _type: string, x?: number, y?: number, target?: any) => {
            const player = scene.data.get('player');
            const role = scene.networkManager?.role;

            if (target === player) {
                // Local player takes damage
                scene.combat.takePlayerDamage(damage, x, y);

                // Host must notify CLIENTS that the Host was hit
                if (role === 'host' && scene.networkManager) {
                    scene.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'damage_player', data: { id: scene.networkManager.peerId, damage, x, y } },
                        ts: Date.now()
                    });
                }
            } else if (role === 'host' && scene.networkManager) {
                // Host validates that a remote player was hit and notifies EVERYONE
                let targetPeerId: string | null = null;
                scene.remotePlayers.forEach((sprite: any, peerId: string) => {
                    if (sprite === target) targetPeerId = peerId;
                });

                if (targetPeerId) {
                    // 1. Broadcast to all clients
                    scene.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'damage_player', data: { id: targetPeerId, damage, x, y } },
                        ts: Date.now()
                    });
                    // 2. Trigger visual feedback LOCALLY on the Host's screen for the client sprite
                    scene.networkPacketHandler.handleGameEvent({ type: 'damage_player', data: { id: targetPeerId, damage, x, y } });
                }
            }
        });

        // Listen for Upgrades
        scene.events.off('apply-upgrade');
        scene.events.on('apply-upgrade', (upgradeId: string) => {
            scene.stats.applyUpgrade(upgradeId);
        });

        // Listen for Revive Purchases
        scene.events.off('buy-revive');
        scene.events.on('buy-revive', (targetId: string) => {
            if (scene.networkManager?.role === 'client') {
                scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'revive_request', data: { targetId } },
                    ts: Date.now()
                });
            } else {
                scene.networkPacketHandler.handleGameEvent({ type: 'player_revived', data: { targetId } });
                scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'player_revived', data: { targetId } },
                    ts: Date.now()
                });
            }
        });

        scene.events.on('start-next-level', (lvl?: number) => scene.waves.startLevel(lvl ?? scene.registry.get('gameLevel') + 1));

        scene.events.on('start-boss', (idx: number) => {
            const config = BOSS_CONFIGS[idx];
            if (config) scene.registry.set('bossName', config.name);
            scene.registry.set('bossSplashVisible', true);
            scene.time.delayedCall(3200, () => {
                scene.registry.set('bossSplashVisible', false);
                scene.spawnBoss(idx);
            });
        });

        scene.events.on('boss-spawn-minion', (x: number, y: number, type: string) => {
            const minion = scene.enemies.get(x, y) as Enemy | null;
            if (minion) minion.reset(x, y, scene.player, 1.0, type);
        });

        scene.events.on('boss-died-collect-all', (x: number, y: number, idx: number) => {
            scene.waves.spawnBossCoins(x, y, idx);
            scene.combat.setDashIframe(true);
            scene.time.delayedCall(2000, () => scene.combat.setDashIframe(false));
            scene.time.delayedCall(400, () => scene.coins.children.iterate((c: any) => { if (c.active) (c as Coin).forceMagnet = true; return true; }));
        });

        scene.events.on('enemy-fire-projectile', (x: number, y: number, ang: number, dmg: number, type: 'arrow' | 'fireball' | 'frostball', burst?: boolean) => {
            if (scene.networkManager?.role === 'client') return;
            scene.poolManager.getEnemyProjectile(x, y, ang, dmg, type, burst);
            scene.networkManager?.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'spawn_enemy_projectile', data: { x, y, angle: ang, damage: dmg, type } }, ts: Date.now() });
        });

        scene.events.on('request-save', () => {
            if (!scene.registry.get('isMultiplayer')) {
                const data = scene.collectSaveData();
                SaveManager.saveRunProgress(data);
                console.log('[SceneEventManager] Game saved via request-save.');
            }
        });

        scene.events.on('level-complete', () => {
            const next = scene.registry.get('gameLevel') + 1;
            scene.coins.clear(true, true);
            scene.enemies.clear(true, true);
            scene.bossGroup.clear(true, true);
            if (!scene.registry.get('isMultiplayer')) {
                SaveManager.saveRunProgress(scene.collectSaveData());
            }
            scene.time.delayedCall(1000, () => scene.visuals.regenerateMap(next));
        });

        scene.events.on('attempt-class-ability-e', () => scene.abilityManager.attemptSpecialE());
        scene.events.on('attempt-class-ability-2', () => scene.abilityManager.attemptAbility2());
        scene.events.on('attempt-attack', () => scene.handlePlayerActionCombat(scene.time.now, 16.6));
    }
}

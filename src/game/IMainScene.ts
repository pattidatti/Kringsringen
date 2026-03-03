import type { SpatialHashGrid } from './SpatialGrid';
import type { ObjectPoolManager } from './ObjectPoolManager';
import type { PlayerStatsManager } from './PlayerStatsManager';
import type { PlayerCombatManager } from './PlayerCombatManager';
import type { WaveManager } from './WaveManager';
import type { NetworkManager } from '../network/NetworkManager';
import type { RunProgress } from './SaveManager';

/**
 * Lightweight interface for MainScene.
 * Managers depend on this instead of importing MainScene directly,
 * which prevents circular imports.
 */
export interface IMainScene extends Phaser.Scene {
    enemies: Phaser.Physics.Arcade.Group;
    bossGroup: Phaser.Physics.Arcade.Group;
    coins: Phaser.Physics.Arcade.Group;
    obstacles: Phaser.Physics.Arcade.StaticGroup;
    arrows: Phaser.Physics.Arcade.Group;
    fireballs: Phaser.Physics.Arcade.Group;
    frostBolts: Phaser.Physics.Arcade.Group;
    lightningBolts: Phaser.Physics.Arcade.Group;
    spatialGrid: SpatialHashGrid;
    staticObstacleGrid: SpatialHashGrid;
    poolManager: ObjectPoolManager;
    stats: PlayerStatsManager;
    combat: PlayerCombatManager;
    waves: WaveManager;
    inputManager: import('./InputManager').InputManager;
    visuals: import('./SceneVisualManager').SceneVisualManager;
    collisions: import('./CollisionManager').CollisionManager;
    networkHandler: import('./NetworkPacketHandler').NetworkPacketHandler;
    deathSparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    networkManager?: NetworkManager;
    pendingDeaths: Set<string>;
    restartGame(): void;
    collectSaveData(): RunProgress;
}

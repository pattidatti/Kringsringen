import type { SpatialHashGrid } from './SpatialGrid';
import type { ObjectPoolManager } from './ObjectPoolManager';
import type { PlayerStatsManager } from './PlayerStatsManager';
import type { PlayerCombatManager } from './PlayerCombatManager';
import type { WaveManager } from './WaveManager';
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
    singularities: Phaser.Physics.Arcade.Group;
    eclipseWakes: Phaser.Physics.Arcade.Group;
    enemyProjectiles: Phaser.Physics.Arcade.Group;
    enemyPool?: import('./ObjectPoolManager').ObjectPoolManager;
    spatialGrid: SpatialHashGrid;
    staticObstacleGrid: SpatialHashGrid;
    poolManager: ObjectPoolManager;
    stats: PlayerStatsManager;
    combat: PlayerCombatManager;
    waves: WaveManager;
    inputManager: any;
    visuals: any;
    collisions: any;
    networkPacketHandler: any;
    weaponManager: any;
    abilityManager: any;
    eventManager: any;
    weather: any;
    ambient: any;
    player: Phaser.Physics.Arcade.Sprite;
    attackHitbox: Phaser.Physics.Arcade.Sprite;
    currentSwingHitIds: Set<string>;
    quality: any;
    networkManager?: any;
    remotePlayers: Map<string, Phaser.Physics.Arcade.Sprite>;
    playerNicknames: Map<string, Phaser.GameObjects.Text>;
    playerBuffers: Map<string, any>;
    remotePlayerPackets: Map<string, any>;
    remotePlayerLights: Map<string, Phaser.GameObjects.Light>;
    pendingDeaths: Set<string>;
    restartGame(): void;
    handlePlayerActionCombat(time: number, delta: number): void;
    spawnBoss(idx: number): void;
    collectSaveData(): RunProgress;
}

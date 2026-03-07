import type { SpatialHashGrid } from './SpatialGrid';
import type { ObjectPoolManager } from './ObjectPoolManager';
import type { PlayerStatsManager } from './PlayerStatsManager';
import type { PlayerCombatManager } from './PlayerCombatManager';
import type { WaveManager } from './WaveManager';
import type { RunProgress } from './SaveManager';
import type { CollisionManager } from './CollisionManager';
import type { WeaponManager } from './WeaponManager';
import type { ClassAbilityManager } from './ClassAbilityManager';
import type { SceneEventManager } from './SceneEventManager';
import type { SceneVisualManager } from './SceneVisualManager';
import type { NetworkPacketHandler } from './NetworkPacketHandler';
import type { WeatherManager } from './WeatherManager';
import type { AmbientParticleManager } from './AmbientParticleManager';
import type { InputManager } from './InputManager';
import type { FlowFieldManager } from './pathing/FlowFieldManager';
import type { BuffManager } from './BuffManager';
import type { ParagonAbilityManager } from './ParagonAbilityManager';

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
    players: Phaser.Physics.Arcade.Group;
    arrows: Phaser.Physics.Arcade.Group;
    fireballs: Phaser.Physics.Arcade.Group;
    frostBolts: Phaser.Physics.Arcade.Group;
    lightningBolts: Phaser.Physics.Arcade.Group;
    singularities: Phaser.Physics.Arcade.Group;
    eclipseWakes: Phaser.Physics.Arcade.Group;
    sonicBolts: Phaser.Physics.Arcade.Group;
    enemyProjectiles: Phaser.Physics.Arcade.Group;
    decoys: Phaser.Physics.Arcade.Group;
    traps: Phaser.Physics.Arcade.Group;
    enemyPool?: import('./ObjectPoolManager').ObjectPoolManager;
    spatialGrid: SpatialHashGrid;
    staticObstacleGrid: SpatialHashGrid;
    flowFieldManager: FlowFieldManager;
    poolManager: ObjectPoolManager;
    stats: PlayerStatsManager;
    combat: PlayerCombatManager;
    waves: WaveManager;
    inputManager: InputManager;
    visuals: SceneVisualManager;
    collisions: CollisionManager;
    networkPacketHandler: NetworkPacketHandler;
    weaponManager: WeaponManager;
    abilityManager: ClassAbilityManager;
    eventManager: SceneEventManager;
    weather: WeatherManager;
    ambient: AmbientParticleManager;
    buffs: BuffManager;
    paragonAbility: ParagonAbilityManager;
    player: Phaser.Physics.Arcade.Sprite;
    quality: any;
    networkManager?: any;
    remotePlayers: Map<string, Phaser.Physics.Arcade.Sprite>;
    playerNicknames: Map<string, Phaser.GameObjects.Text>;
    playerBuffers: Map<string, any>;
    remotePlayerPackets: Map<string, any>;
    remotePlayerLights: Map<string, Phaser.GameObjects.Light>;
    pendingDeaths: Set<string>;
    deathSparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    swordSparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    playerShadow: Phaser.GameObjects.Sprite | null;
    restartGame(): void;
    restartAtLevel(level: number): void;
    handlePlayerActionCombat(time: number, delta: number): void;
    spawnBoss(idx: number): void;
    collectSaveData(): RunProgress;
}

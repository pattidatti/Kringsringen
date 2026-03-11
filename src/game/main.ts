import Phaser from 'phaser';
import type { NetworkConfig } from '../App';
import { BossEnemy } from './BossEnemy';
import { GAME_CONFIG } from '../config/GameConfig';
import { SaveManager } from './SaveManager';
import { ObjectPoolManager } from './ObjectPoolManager';
import { SpatialHashGrid } from './SpatialGrid';
import { AudioManager } from './AudioManager';
import { createAnimations } from './AnimationSetup';
import { WaveManager } from './WaveManager';
import { PlayerStatsManager } from './PlayerStatsManager';
import { PlayerCombatManager } from './PlayerCombatManager';
import type { IMainScene } from './IMainScene';
import { PreloadScene } from './PreloadScene';
import { WeatherManager } from './WeatherManager';
import { AmbientParticleManager } from './AmbientParticleManager';
import { PacketType, type SyncPacket } from '../network/SyncSchemas';
import { type QualitySettings } from '../config/QualityConfig';
import { CLASS_CONFIGS, resolveClassId } from '../config/classes';
import { ABILITY_UNLOCK_MAP } from '../config/class-upgrades';
import { getQualityConfig } from '../config/QualityConfig';
import { InputManager } from './InputManager';
import { TextureSetup } from './TextureSetup';
import { SceneVisualManager } from './SceneVisualManager';
import { CollisionManager } from './CollisionManager';
import { NetworkPacketHandler } from './NetworkPacketHandler';
import { WeaponManager } from './WeaponManager';
import { ClassAbilityManager } from './ClassAbilityManager';
import { SceneEventManager } from './SceneEventManager';
import { NetworkManager } from '../network/NetworkManager';
import { BOSS_CONFIGS } from '../config/bosses';
import { FlowFieldManager } from './pathing/FlowFieldManager';
import { BuffManager } from './BuffManager';
import { ParagonAbilityManager } from './ParagonAbilityManager';
import { HpBarRenderer, type IHpBarTarget } from './HpBarRenderer';
import { AchievementManager } from './AchievementManager';
import { WaveEventManager } from './WaveEventManager';
import { ShrineManager } from './ShrineManager';
import { SpriteShadow } from './SpriteShadow';
import { PerformanceManager } from './PerformanceManager';
import { PvpRoundManager } from './PvpRoundManager';


export class MainScene extends Phaser.Scene implements IMainScene {
    public players!: Phaser.Physics.Arcade.Group;
    public enemies!: Phaser.Physics.Arcade.Group;
    public bossGroup!: Phaser.Physics.Arcade.Group;
    public coins!: Phaser.Physics.Arcade.Group;
    public obstacles!: Phaser.Physics.Arcade.StaticGroup;
    public collisions!: CollisionManager;
    public inputManager!: InputManager;
    public visuals!: SceneVisualManager;
    public networkPacketHandler!: NetworkPacketHandler;
    public eventManager!: SceneEventManager;
    public weaponManager!: WeaponManager;
    public abilityManager!: ClassAbilityManager;
    public paragonAbility!: ParagonAbilityManager;
    public buffs!: BuffManager;
    public hpBarRenderer!: HpBarRenderer;
    public achievementManager!: AchievementManager;
    private hpTargets: IHpBarTarget[] = [];

    public arrows!: Phaser.Physics.Arcade.Group;
    public fireballs!: Phaser.Physics.Arcade.Group;
    public frostBolts!: Phaser.Physics.Arcade.Group;
    public lightningBolts!: Phaser.Physics.Arcade.Group;
    public singularities!: Phaser.Physics.Arcade.Group;
    public eclipseWakes!: Phaser.Physics.Arcade.Group;
    public sonicBolts!: Phaser.Physics.Arcade.Group;
    public enemyProjectiles!: Phaser.Physics.Arcade.Group;
    public decoys!: Phaser.Physics.Arcade.Group;
    public traps!: Phaser.Physics.Arcade.Group;
    public spatialGrid!: SpatialHashGrid;
    public staticObstacleGrid!: SpatialHashGrid;
    public flowFieldManager!: FlowFieldManager;
    public player!: Phaser.Physics.Arcade.Sprite;
    public poolManager!: ObjectPoolManager;

    // Managers
    public stats!: PlayerStatsManager;
    public combat!: PlayerCombatManager;
    public waves!: WaveManager;
    public waveEvents!: WaveEventManager;
    public shrines!: ShrineManager;
    public performanceManager!: PerformanceManager;
    public pvpRoundManager?: PvpRoundManager;

    // Map Generation
    private mapWidth: number = 3000;
    private mapHeight: number = 3000;
    public playerShadow: SpriteShadow | null = null;

    public setupEventHandlers!: () => void;
    public wasd!: any;
    public hotkeys!: any;


    // ... continued managers and other fields ...

    // Weather
    public weather!: WeatherManager;

    // Ambient particles (fireflies / leaves / embers)
    public ambient!: AmbientParticleManager;

    public deathSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    public swordSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Multiplayer properties (delegated to networkPacketHandler)
    public networkManager?: NetworkManager;
    public get remotePlayers() { return this.networkPacketHandler.remotePlayers; }
    public get playerNicknames() { return this.networkPacketHandler.playerNicknames; }
    public get playerBuffers() { return this.networkPacketHandler.playerBuffers; }
    public get remotePlayerPackets() { return this.networkPacketHandler.remotePlayerPackets; }
    public get remotePlayerLights() { return this.networkPacketHandler.remotePlayerLights; }
    public pendingDeaths: Set<string> = new Set();
    public quality!: QualitySettings;

    constructor() {
        super('MainScene');
    }

    create() {
        try {
            // Load Saved Data
            const saveData = SaveManager.load();

            const playerClassId = resolveClassId(this.registry.get('playerClass'));
            const classConfig = CLASS_CONFIGS[playerClassId];

            // Initialize Registry State — run resources always start fresh
            this.registry.set('playerCoins', 0);
            this.registry.set('currentWeapon', classConfig.startingWeapons[0] || 'sword');
            this.registry.set('upgradeLevels', {});
            this.registry.set('highStage', saveData.highStage);
            this.registry.set('unlockedWeapons', [...classConfig.startingWeapons]);
            // Boss state
            this.registry.set('bossComingUp', -1);
            this.registry.set('isBossActive', false);
            this.registry.set('bossSplashVisible', false);
            this.registry.set('bossHP', 0);
            this.registry.set('bossMaxHP', 0);
            this.registry.set('bossName', '');
            this.registry.set('bossPhase', 1);

            console.log('[MainScene] Create starting...');
            const netConfig = this.game.registry.get('networkConfig') as NetworkConfig | null;
            console.log('[MainScene] netConfig:', netConfig ? 'present' : 'null');
            this.registry.set('isMultiplayer', !!netConfig);

            // Core State
            this.registry.set('gameLevel', 1); // Always initialize to 1 for UI
            this.registry.set('highStage', saveData.highStage);
            this.registry.set('playerCoins', 0);
            this.registry.set('currentWave', 1);
            this.registry.set('bossComingUp', -1);
            this.registry.set('upgradeLevels', {});
            console.log('[MainScene] Registry initialized.');

            // Initialize Grids
            this.spatialGrid = new SpatialHashGrid(150);
            this.staticObstacleGrid = new SpatialHashGrid(150);
            this.flowFieldManager = new FlowFieldManager(this, this.mapWidth, this.mapHeight);
            this.hpBarRenderer = new HpBarRenderer(this);

            // Initialize Core Physics Groups
            console.log('[MainScene] Initializing core physics groups...');
            this.players = this.physics.add.group();
            this.obstacles = this.physics.add.staticGroup();

            // Restore saved run progress (singleplayer continue only)
            const continueRun = this.game.registry.get('continueRun') as boolean | undefined;
            let startLevelOverride = 1;
            let savedRun: import('./SaveManager').RunProgress | null = null;
            if (continueRun && !netConfig) {
                try {
                    console.log('[MainScene] Continuing run...');
                    const rawRun = SaveManager.loadRunProgress();
                    if (rawRun) {
                        const run = SaveManager.rehabilitateRunProgress(rawRun);
                        savedRun = run;
                        console.log('[MainScene] Restored run:', run);

                        this.registry.set('gameLevel', run.gameLevel);
                        startLevelOverride = run.gameLevel;
                        this.registry.set('currentWave', run.currentWave);
                        this.registry.set('playerCoins', run.playerCoins);
                        this.registry.set('upgradeLevels', run.upgradeLevels);
                        this.registry.set('currentWeapon', run.currentWeapon);
                        // Reconstruct unlocked weapons from upgradeLevels (backward-compat)
                        const restoredWeapons = [...(run.unlockedWeapons || classConfig.startingWeapons)];
                        for (const [upgradeId, slotId] of Object.entries(ABILITY_UNLOCK_MAP)) {
                            if ((run.upgradeLevels[upgradeId] || 0) > 0 && !restoredWeapons.includes(slotId)) {
                                restoredWeapons.push(slotId);
                            }
                        }
                        this.registry.set('unlockedWeapons', restoredWeapons);

                        // Store temporarily; applied after recalculateStats()
                        this.game.registry.set('_restoredHP', run.playerHP);
                        console.log('[MainScene] Restore successful. HP to restore:', run.playerHP);
                    } else {
                        console.warn('[MainScene] No run progress found despite continue flag.');
                    }
                } catch (e) {
                    console.error('[MainScene] Failed to restore continue run, starting fresh:', e);
                    SaveManager.clearRunProgress();
                }
            }

            this.poolManager = new ObjectPoolManager(this);
            this.poolManager.initializeGroups(); // CRITICAL: Do this BEFORE managers that need groups

            this.stats = new PlayerStatsManager(this);
            this.combat = new PlayerCombatManager(this);
            this.waves = new WaveManager(this);
            this.waveEvents = new WaveEventManager(this);
            this.shrines = new ShrineManager(this);
            this.weather = new WeatherManager(this);
            this.ambient = new AmbientParticleManager(this);
            console.log('[MainScene] Initializing managers...');
            this.visuals = new SceneVisualManager(this);
            this.inputManager = new InputManager(this);
            this.networkPacketHandler = new NetworkPacketHandler(this);
            this.eventManager = new SceneEventManager(this);
            this.weaponManager = new WeaponManager(this);
            this.abilityManager = new ClassAbilityManager(this);
            this.buffs = new BuffManager(this);
            this.paragonAbility = new ParagonAbilityManager(this);
            this.achievementManager = new AchievementManager(this);
            this.collisions = new CollisionManager(this);
            this.performanceManager = new PerformanceManager(this);

            // Listen for performance step changes to downgrade visuals
            this.events.on('perf-step-change', (_step: number) => {
                // 0. Strip Light2D from enemy sprites when FPS is too low
                const enemyLightingOn = this.performanceManager.dynamicEnemyLightingEnabled;
                this.visuals.setEnemyLightingOverride(enemyLightingOn ? null : false);

                // 1. Shadow modes
                const override = this.performanceManager.shadowModeOverride;
                if (override) {
                    // Downgrade enemy shadows
                    this.enemies.children.iterate((e: any) => {
                        const shadow = e?.getShadow?.();
                        if (shadow && shadow.getMode() !== override) {
                            shadow.setMode(override);
                        }
                        return true;
                    });
                    // Downgrade player shadow
                    if (this.playerShadow && (this.playerShadow as any).getMode() !== override) {
                        (this.playerShadow as any).setMode(override);
                    }
                }

                // 2. Update weather particles (rain, fog)
                const wMult = this.performanceManager.weatherParticleMultiplier;
                const userMult = this.quality.particleMultiplier;
                this.weather.updateQuality({
                    particleMultiplier: userMult * wMult,
                    lightingEnabled: enemyLightingOn && this.quality.lightingEnabled
                });

                // 3. Update ambient particles (fireflies, leaves, embers)
                const aMult = this.performanceManager.ambientParticleMultiplier;
                this.ambient.updateQuality({ particleMultiplier: userMult * aMult });
            });

            console.log('[MainScene] All managers instantiated.');

            this.quality = getQualityConfig((this.registry.get('graphicsQuality') as any) || 'medium');

            AudioManager.instance.setScene(this);

            this.visuals.applyQualitySettings();
            TextureSetup.create(this);
            createAnimations(this);

            this.deathSparkEmitter = this.add.particles(0, 0, 'flare', {
                speed: { min: 50, max: 100 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 300,
                emitting: false
            });

            this.swordSparkEmitter = this.add.particles(0, 0, 'spark', {
                speed: { min: 150, max: 350 }, // Explosive burst
                scale: { start: 2.0, end: 0.5 }, // Much larger sparks
                alpha: { start: 1, end: 0 },
                tint: 0xffcc44,
                blendMode: 'ADD',
                lifespan: { min: 150, max: 300 }, // Slightly longer
                emitting: false
            });
            this.swordSparkEmitter.setDepth(150);

            // Link Input Keys
            this.wasd = this.inputManager.wasd;
            this.hotkeys = this.inputManager.hotkeys;

            console.log('[MainScene] Creating player at', this.mapWidth / 2, this.mapHeight / 2);
            this.player = this.physics.add.sprite(this.mapWidth / 2, this.mapHeight / 2, 'player-idle');
            this.player.setCollideWorldBounds(true).setScale(2).setBodySize(20, 15, true).setOffset(this.player.body!.offset.x, 33).setMass(2).play('player-idle');

            if (this.player && this.player.body) {
                console.log('[MainScene] Player body created successfully.');
                this.player.setPipeline('Light2D');
            } else if (this.player) {
                console.error('[MainScene] FATAL: Player created but has no physics body!');
            }

            this.data.set('player', this.player);
            const playerFeetY = 82; // Pixel from top to feet in the 100×100 frame
            this.playerShadow = new SpriteShadow(this, this.player, this.quality.shadowMode,
                this.player.scaleY * (playerFeetY - this.player.height * 0.75));
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            console.log('[MainScene] Camera following player.');

            // Now that player and groups exist, setup colliders
            this.collisions.setupColliders(this.player);
            this.collisions.setupPvpColliders();

            this.eventManager.setupEventListeners();
            this.players.add(this.player);

            // Scene Logic setup
            this.visuals.regenerateMap(startLevelOverride);
            this.stats.applyClassModifiers(classConfig);
            this.stats.recalculateStats();

            // HP Restoration logic — MUST happen before waves.startLevel to prevent autosaving HP=0
            const restoredHP = this.game.registry.get('_restoredHP');
            this.registry.set('playerHP', this.stats.maxHP);
            if (restoredHP !== undefined) {
                this.registry.set('playerHP', Math.min(restoredHP, this.stats.maxHP));
                this.game.registry.remove('_restoredHP');
                console.log('[MainScene] HP Restored to:', this.registry.get('playerHP'));
            }

            if (savedRun?.playerX !== undefined) {
                this.player.setPosition(savedRun.playerX, savedRun.playerY);
            }

            const isPvp = this.registry.get('gameMode') === 'pvp';

            // If singleplayer and fresh run (or restored run that needs starting), start the wave logic!
            if (!netConfig && !isPvp) {
                console.log('[MainScene] Starting Level:', startLevelOverride);
                this.waves.startLevel(startLevelOverride);
            }

            // Multiplayer Initialization
            if (netConfig) {
                this.networkManager = new NetworkManager(
                    netConfig.peer,
                    netConfig.role,
                    (packet: SyncPacket, conn: any) => this.networkPacketHandler.handlePacket(packet, conn)
                );
                this.networkManager.onDisconnect = (id: string) => this.networkPacketHandler.removeRemotePlayer(id);

                if (netConfig.role === 'client' && netConfig.hostPeerId) {
                    this.networkManager.connectToHost(netConfig.hostPeerId);
                }
                this.registry.set('nickname', netConfig.nickname || '');
                console.log('[MainScene] NetworkManager initialized as', netConfig.role);
            }

            // PVP Mode initialization
            if (isPvp) {
                this.pvpRoundManager = new PvpRoundManager(this);
                this.pvpRoundManager.initialize();
                console.log('[MainScene] PVP mode initialized');

                // Override disconnect handler for PVP
                if (this.networkManager) {
                    const originalOnDisconnect = this.networkManager.onDisconnect;
                    this.networkManager.onDisconnect = (id: string) => {
                        originalOnDisconnect?.(id);
                        this.pvpRoundManager?.handleOpponentDisconnect();
                    };
                }
            }

            if (!isPvp) {
                this.weather.enableFog();
                this.weather.startRain();
            }

            // If client, we might need to connect to host (handled in create())
            if (this.networkManager?.role === 'client') {
                // Handled via netConfig.hostPeerId in create()
            }

        } catch (e) {
            console.error('[MainScene] Critical error during create():', e);
        } finally {
            // GUARANTEED: always unblock GameContainer loading overlay regardless of exceptions
            if (this.scene.isActive('PreloadScene')) {
                this.scene.stop('PreloadScene');
            }
            this.registry.set('create-complete', true);
            this.events.emit('create-complete');
            console.log('[MainScene] create-complete emitted.');
        }
    }



    /** Spawn a boss at the center of the map. */
    public spawnBoss(bossIndex: number): void {
        const config = BOSS_CONFIGS[bossIndex];
        if (!config) return;

        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // Spawn offset from map center so boss isn't on top of player
        const spawnX = this.mapWidth / 2 + 350;
        const spawnY = this.mapHeight / 2;

        const boss = this.bossGroup.get(spawnX, spawnY) as BossEnemy | null;
        if (!boss) {
            console.warn('BossEnemy pool exhausted — cannot spawn boss');
            return;
        }

        boss.initAsBoss(spawnX, spawnY, player, config);
    }



    private lastHeartbeat: number = 0;
    private lastSpatialUpdate: number = 0;
    private readonly SPATIAL_UPDATE_INTERVAL: number = 33; // ~30Hz

    update(_time: number, delta: number) {
        try {
            if (_time - this.lastHeartbeat > 2000) {
                this.lastHeartbeat = _time;
                console.log(`[Heartbeat] Scene: ${this.scene.key}, Player: (${Math.round(this.player?.x)},${Math.round(this.player?.y)}), Camera: (${Math.round(this.cameras.main.scrollX)},${Math.round(this.cameras.main.scrollY)}), Active: ${this.player?.active}`);
            }

            this.performanceManager.update(_time);

            const cappedDelta = Math.min(delta, 100);
            this.poolManager.update(cappedDelta);
            this.networkPacketHandler.networkTick();
            this.stats.flushEconomy();
            this.combat.update(_time, cappedDelta);

            this.singularities.children.iterate((s: any) => { if (s.active) (s as import('./Singularity').Singularity).update(_time, delta); return true; });
            this.eclipseWakes.children.iterate((w: any) => { if (w.active) (w as import('./EclipseWake').EclipseWake).update(_time, delta); return true; });
            this.decoys.children.iterate((d: any) => { if (d.active) (d as any).update?.(_time, delta); return true; });
            this.traps.children.iterate((t: any) => { if (t.active) (t as any).update?.(_time, delta); return true; });

            if (this.player && this.playerShadow) this.playerShadow.update(this.player.x, this.player.y);
            if (!this.player || !this.player.body) return;

            const renderTime = this.networkManager ? this.networkManager.getServerTime() - 100 : Date.now();
            this.networkPacketHandler.interpolateRemotePlayers(renderTime);

            this.visuals.update();
            this.inputManager.update(_time, delta);
            this.abilityManager.update(_time, delta);
            this.paragonAbility.update(_time, delta);
            this.buffs.update();

            const isPvpMode = this.registry.get('gameMode') === 'pvp';
            if (!isPvpMode) {
                this.shrines.update(cappedDelta);
            }
            if (isPvpMode && this.pvpRoundManager) {
                this.pvpRoundManager.update(_time, cappedDelta);
            }
            this.achievementManager.update(delta);

            // Update Spatial Grid (Throttled for Performance)
            this.flowFieldManager.update(this.player.x, this.player.y);
            if (_time - this.lastSpatialUpdate > this.SPATIAL_UPDATE_INTERVAL) {
                this.lastSpatialUpdate = _time;
                this.spatialGrid.clear();
                this.enemies.children.iterate((e: any) => {
                    if (e.active && !e.isDead) {
                        e._gridClient.x = e.x;
                        e._gridClient.y = e.y;
                        e._gridClient.width = e.body?.width || 40;
                        e._gridClient.height = e.body?.height || 40;
                        e._gridClient.id = e.id;
                        this.spatialGrid.insert(e._gridClient);
                    }
                    return true;
                });
                this.bossGroup.children.iterate((b: any) => {
                    if (b.active && !b.isDead) {
                        b._gridClient.x = b.x;
                        b._gridClient.y = b.y;
                        b._gridClient.width = b.body?.width || 80;
                        b._gridClient.height = b.body?.height || 80;
                        b._gridClient.id = 'boss';
                        this.spatialGrid.insert(b._gridClient);
                    }
                    return true;
                });
            }

            // Batched HP Bar Rendering (Final Pass)
            this.hpTargets.length = 0;
            const px = this.player.x;
            const py = this.player.y;
            const lightRadiusSq = Math.pow(GAME_CONFIG.LIGHTING.PLAYER_OUTER_RADIUS, 2);

            this.enemies.children.iterate((e: any) => {
                if (e.active && !e.isDead) {
                    const dx = e.x - px;
                    const dy = e.y - py;
                    const distSq = dx * dx + dy * dy;

                    // Show HP bar if damaged OR within light radius
                    if (e.hp < e.maxHP || distSq < lightRadiusSq) {
                        this.hpTargets.push(e);
                    }
                }
                return true;
            });
            this.hpBarRenderer.render(this.hpTargets);

        } catch (error) {
            console.error('[MainScene] Update loop crashed:', error);
        }
    }



    public handlePlayerActionCombat(_time: number, _delta: number) {
        const player = this.player;
        if (!player || !player.active) return;
        const pointer = this.input.activePointer;
        const hp = this.registry.get('playerHP') || 0;
        if (hp <= 0 || this.data.get('isBlocking')) return;

        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        const radius = 50;
        this.collisions.attackHitbox.setPosition(
            player.x + Math.cos(angle) * radius,
            player.y + Math.sin(angle) * radius
        );
        this.collisions.attackHitbox.setRotation(angle);

        this.weaponManager.handleWeaponExecution(angle);
    }



    public collectSaveData(): import('./SaveManager').RunProgress {
        const enemies: import('./SaveManager').EnemySave[] = [];
        this.enemies.getChildren().forEach((child: any) => {
            if (child.active && !child.isDead) {
                enemies.push({ type: child.enemyType ?? child.name ?? 'orc', x: child.x, y: child.y, hp: child.hp, maxHP: child.maxHP });
            }
        });
        return {
            gameLevel: this.registry.get('gameLevel') || 1,
            currentWave: this.registry.get('currentWave') || 1,
            playerCoins: this.registry.get('playerCoins') || 0,
            upgradeLevels: this.registry.get('upgradeLevels') || {},
            currentWeapon: this.registry.get('currentWeapon') || 'sword',
            unlockedWeapons: this.registry.get('unlockedWeapons') || ['sword'],
            playerHP: this.registry.get('playerHP') || 0,
            playerMaxHP: this.registry.get('playerMaxHP') || 100,
            playerX: this.player?.x, playerY: this.player?.y,
            savedEnemies: enemies, waveEnemiesRemaining: this.waves?.getEnemiesToSpawnRemaining() ?? 0,
            savedAt: Date.now(), playerClass: this.registry.get('playerClass') ?? 'krieger'
        };
    }

    private _hitstopActive = false;
    private _hitstopCooldownUntil = 0;

    /**
     * Scaled camera shake — multiplies intensity by performanceManager.shakeMultiplier.
     * At high degradation steps shake is reduced or eliminated entirely.
     */
    public scaledShake(duration: number, intensity: number): void {
        const mult = this.performanceManager?.shakeMultiplier ?? 1;
        if (mult <= 0) return;
        this.cameras.main.shake(duration, intensity * mult);
    }

    public triggerHitstop(durationMs: number = 80): void {
        const now = Date.now();
        if (this._hitstopActive || now < this._hitstopCooldownUntil) return;

        this._hitstopActive = true;
        this.physics.world.pause();
        this.scaledShake(80, 0.003);

        this.time.delayedCall(durationMs, () => {
            this.physics.world.resume();
            this._hitstopActive = false;
            this._hitstopCooldownUntil = Date.now() + 150;
        });
    }

    public restartGame() {
        console.log("[Game] Restarting run...");
        // physics.world.resume(), scene.resume(), and events.emit('restart-game') are
        // guaranteed via finally so the canvas never stays frozen if any reset throws.
        try {
            SaveManager.clearRunProgress();
            if (this.networkManager?.role === 'host') this.networkManager.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'restart_game', data: {} }, ts: Date.now() });

            // End any lingering wave event (resets speed/coin multipliers in registry)
            this.waveEvents?.endActive();
            // Cancel all pending wave timers before reboot
            this.waves?.stopAllTimers();

            // Minimal registry reset — hides the Game Over overlay in React immediately
            // while the full Phaser instance reboot (triggered by 'restart-game') runs.
            const playerClassId = resolveClassId(this.registry.get('playerClass'));
            const classConfig = CLASS_CONFIGS[playerClassId];
            this.registry.set('playerHP', GAME_CONFIG.PLAYER.BASE_MAX_HP);
            this.registry.set('playerCoins', 0);
            this.registry.set('partyDead', false);
            this.registry.set('isBossActive', false);
            this.registry.set('bossComingUp', -1);
            this.registry.set('upgradeLevels', {});
            if (classConfig) {
                this.registry.set('unlockedWeapons', [...classConfig.startingWeapons]);
                this.registry.set('currentWeapon', classConfig.startingWeapons[0] || 'sword');
            }
        } catch (e) {
            console.error('[Game] restartGame failed during reset:', e);
        } finally {
            // Always clear hitstop, resume physics/scene, and trigger the reboot —
            // even if something in the reset block threw. This guarantees the canvas
            // never stays frozen on the death frame.
            this._hitstopActive = false;
            this._hitstopCooldownUntil = 0;
            this.physics.world.resume();
            this.scene.resume();
            // Trigger the full reboot via GameContainer (setRebootKey).
            this.events.emit('restart-game');
        }
    }

    /**
     * Paragon: Restart at a specific level (e.g., after soft death or level select).
     * Keeps upgrades, coins, and weapons. Resets HP to max, clears enemies,
     * and starts the given level from wave 1.
     */
    public restartAtLevel(level: number) {
        console.log(`[Game] Restarting at level ${level}...`);

        // scene.resume() MUST be called regardless of errors below (scene was paused on death)
        try {
            // End any active wave event first — resets speed/coin multipliers
            this.waveEvents?.endActive();
            // Cancel all pending wave timers BEFORE clearing enemies to prevent
            // ghost level-complete timers firing after the enemy group is destroyed.
            this.waves?.stopAllTimers();
            // Clear combat state but keep progression
            this.registry.set('gameLevel', level);
            this.registry.set('currentWave', 1);
            this.registry.set('isBossActive', false);
            this.registry.set('bossComingUp', -1);
            this.registry.set('partyDead', false);

            // Restore HP to max
            const maxHP = this.registry.get('playerMaxHP') || GAME_CONFIG.PLAYER.BASE_MAX_HP;
            this.registry.set('playerHP', maxHP);

            // Clear enemies and projectiles
            this.enemies.clear(true, true);
            this.bossGroup.clear(true, true);
            this.coins.clear(true, true);
            ['arrows', 'fireballs', 'frostBolts', 'lightningBolts', 'decoys', 'traps'].forEach(g => (this as any)[g]?.clear(true, true));

            // Reset transient combat state (invincibility, fortification, berserker, etc.)
            this.combat.resetForRestart();

            // Reset player position and state
            if (this.player) {
                this.player.setPosition(this.mapWidth / 2, this.mapHeight / 2);
                this.player.clearTint();
                this.player.setBlendMode(Phaser.BlendModes.NORMAL);
                this.player.setAlpha(1.0);
            }

            // Recalculate stats (upgrades are kept)
            this.stats.recalculateStats();

            // Regenerate map for the target level and start it
            this.visuals.regenerateMap(level);
            if (this.networkManager?.role !== 'client') this.waves.startLevel(level);

            // Save progress
            SaveManager.saveRunProgress(this.collectSaveData());
        } catch (e) {
            console.error('[Game] restartAtLevel failed:', e);
        } finally {
            // Clear any lingering hitstop — physics must be running after restart
            this._hitstopActive = false;
            this._hitstopCooldownUntil = 0;
            this.physics.world.resume();
            // Always resume — the scene was paused on death
            this.scene.resume();
        }
    }
}



export const createGame = (container: HTMLElement, networkConfig?: NetworkConfig | null, continueRun: boolean = false, selectedClass?: import('../config/classes').ClassId) => {
    // HARDENING: If there are existing Phaser instances, destroy them all to prevent "ghost" games
    if ((window as any).phaserGames && Array.isArray((window as any).phaserGames)) {
        console.log(`[main.ts] Found ${(window as any).phaserGames.length} existing Phaser instances. Destroying all...`);
        (window as any).phaserGames.forEach((g: Phaser.Game) => {
            try {
                g.loop?.stop();
                g.destroy(true);
            } catch (e) {
                console.warn('[main.ts] Error destroying ghost instance:', e);
            }
        });
        (window as any).phaserGames = [];
    }

    if (container) {
        container.innerHTML = '';
    }

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        width: '100%',
        height: '100%',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },
        render: {
            powerPreference: 'high-performance',
            pixelArt: true,
            antialias: false,
        },
        fps: {
            target: 60,
            forceSetTimeOut: false
        },
        scene: [PreloadScene, MainScene],
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        backgroundColor: '#000000'
    });

    // Global error trap
    window.addEventListener('error', (event) => {
        console.error('[GLOBAL ERROR]', event.message, 'at', event.filename, ':', event.lineno);
    });

    // Track instance globally for hardening
    if (!(window as any).phaserGames) (window as any).phaserGames = [];
    (window as any).phaserGames.push(game);

    if (networkConfig) {
        game.registry.set('networkConfig', networkConfig);
    }

    if (continueRun) {
        game.registry.set('continueRun', true);
    }

    // Initialize registry with saved quality or default
    const saved = SaveManager.load();
    game.registry.set('graphicsQuality', saved.graphicsQuality || 'medium');

    // Set playerClass from ClassSelector (or default 'krieger' for legacy saves)
    game.registry.set('playerClass', selectedClass ?? 'krieger');

    return game;
};

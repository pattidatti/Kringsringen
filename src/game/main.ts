import Phaser from 'phaser';
import type { NetworkConfig } from '../App';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { BOSS_CONFIGS } from '../config/bosses';
import { GAME_CONFIG } from '../config/GameConfig';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
import { LightningBolt } from './LightningBolt';
import { Singularity } from './Singularity';
import { EclipseWake } from './EclipseWake';
import { Coin } from './Coin';
import { SaveManager } from './SaveManager';
import { ObjectPoolManager } from './ObjectPoolManager';
import { SpatialHashGrid } from './SpatialGrid';
import { AudioManager } from './AudioManager';
import { createAnimations } from './AnimationSetup';
import { WaveManager } from './WaveManager';
import { PlayerStatsManager } from './PlayerStatsManager';
import { PlayerCombatManager } from './PlayerCombatManager';
import { IMainScene } from './IMainScene';
import { PreloadScene } from './PreloadScene';
import { WeatherManager } from './WeatherManager';
import { AmbientParticleManager } from './AmbientParticleManager';
import { NetworkManager } from '../network/NetworkManager';
import { PacketType, type PackedPlayer, type SyncPacket } from '../network/SyncSchemas';
import { JitterBuffer } from '../network/JitterBuffer';
import { EnemyProjectile } from './EnemyProjectile';
import { type QualitySettings } from '../config/QualityConfig';
import { CLASS_CONFIGS, resolveClassId } from '../config/classes';
import { InputManager } from './InputManager';
import { TextureSetup } from './TextureSetup';
import { SceneVisualManager } from './SceneVisualManager';
import { CollisionManager } from './CollisionManager';
import { NetworkPacketHandler } from './NetworkPacketHandler';


export class MainScene extends Phaser.Scene implements IMainScene {
    public player!: Phaser.Physics.Arcade.Sprite;
    public enemies!: Phaser.Physics.Arcade.Group;
    public spatialGrid!: SpatialHashGrid;
    public staticObstacleGrid!: SpatialHashGrid;
    public coins!: Phaser.Physics.Arcade.Group;
    public obstacles!: Phaser.Physics.Arcade.StaticGroup;
    public collisions!: CollisionManager;
    public inputManager!: InputManager;
    public visuals!: SceneVisualManager;
    public networkHandler!: NetworkPacketHandler;

    public arrows!: Phaser.Physics.Arcade.Group;
    public fireballs!: Phaser.Physics.Arcade.Group;
    public frostBolts!: Phaser.Physics.Arcade.Group;
    public lightningBolts!: Phaser.Physics.Arcade.Group;
    public singularities!: Phaser.Physics.Arcade.Group;
    private eclipseWakes!: Phaser.Physics.Arcade.Group;
    public bossGroup!: Phaser.Physics.Arcade.Group;
    private players!: Phaser.Physics.Arcade.Group;
    public poolManager!: ObjectPoolManager;

    // Managers
    public stats!: PlayerStatsManager;
    public combat!: PlayerCombatManager;
    public waves!: WaveManager;

    // Map Generation
    private currentMap: StaticMapLoader | null = null;
    private mapWidth: number = 3000;
    private mapHeight: number = 3000;
    private playerShadow: Phaser.GameObjects.Sprite | null = null;

    public attackHitbox!: Phaser.Physics.Arcade.Sprite;
    public currentSwingHitIds: Set<string> = new Set();
    public setupEventHandlers!: () => void;
    public wasd!: any;
    public hotkeys!: any;

    // ── Class Ability State ──────────────────────────────────────────────────
    public classAbilityCooldownEnd: number = 0;
    public isWhirlwinding: boolean = false;
    public explosiveShotReady: boolean = false;
    public cascadeActiveUntil: number = 0;
    public shadowStepUntil: number = 0;

    // ... continued managers and other fields ...

    // Weather
    private weather!: WeatherManager;

    // Ambient particles (fireflies / leaves / embers)
    private ambient!: AmbientParticleManager;

    // Vignette post-FX — strength driven by player HP
    private vignetteEffect: any = null;

    public deathSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Multiplayer properties
    public networkManager?: NetworkManager;
    public remotePlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    public playerNicknames: Map<string, Phaser.GameObjects.Text> = new Map();
    public playerBuffers: Map<string, JitterBuffer<PackedPlayer>> = new Map();
    public remotePlayerPackets: Map<string, PackedPlayer> = new Map();
    public remotePlayerLights: Map<string, Phaser.GameObjects.Light> = new Map();
    public pendingDeaths: Set<string> = new Set();
    public quality!: QualitySettings;

    public playerLight!: Phaser.GameObjects.Light;
    public outerPlayerLight!: Phaser.GameObjects.Light;

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

            // Restore saved run progress (singleplayer continue only)
            const continueRun = this.game.registry.get('continueRun') as boolean | undefined;
            let startLevelOverride = 1;
            let savedRun: import('./SaveManager').RunProgress | null = null;
            if (continueRun && !netConfig) {
                try {
                    console.log('[MainScene] Continuing run...');
                    const run = SaveManager.loadRunProgress();
                    savedRun = run;
                    if (run) {
                        console.log('[MainScene] Restored run:', run);
                        // CRITICAL: Clamp level to minimum 1 to prevent STATIC_MAPS[-1] crash
                        const restoredLevel = Math.max(1, run.gameLevel || 1);
                        this.registry.set('gameLevel', restoredLevel);
                        startLevelOverride = restoredLevel;
                        this.registry.set('currentWave', run.currentWave ?? 1);
                        this.registry.set('playerCoins', run.playerCoins ?? 0);
                        this.registry.set('upgradeLevels', run.upgradeLevels ?? {});
                        this.registry.set('currentWeapon', run.currentWeapon ?? 'sword');

                        // REHABILITATION: If a corrupted save has only sword but we are at high level,
                        // unlock the basic arsenal to keep the game playable.
                        let restoredWeapons = run.unlockedWeapons || ['sword'];
                        if (restoredWeapons.length <= 1) {
                            console.log('[MainScene] Corrupted weapon list detected. Rehabilitating arsenal...');
                            restoredWeapons = ['sword', 'bow', 'fireball', 'frost', 'lightning'];
                        }
                        if (!restoredWeapons.includes('sword')) restoredWeapons.push('sword');
                        this.registry.set('unlockedWeapons', restoredWeapons);

                        // Store temporarily; applied after recalculateStats()
                        this.game.registry.set('_restoredHP', Math.max(0, run.playerHP));
                        console.log('[MainScene] Restore successful. HP to restore:', run.playerHP);
                    } else {
                        console.warn('[MainScene] No run progress found despite continue flag.');
                    }
                } catch (e) {
                    console.error('[MainScene] Failed to restore continue run, starting fresh:', e);
                    SaveManager.clearRunProgress();
                    // startLevelOverride stays 1, registry defaults remain
                }
            }

            // Initialize Managers
            this.stats = new PlayerStatsManager(this);
            this.combat = new PlayerCombatManager(this);
            this.waves = new WaveManager(this);
            this.poolManager = new ObjectPoolManager(this);
            this.weather = new WeatherManager(this);
            this.ambient = new AmbientParticleManager(this);
            this.visuals = new SceneVisualManager(this);
            this.collisions = new CollisionManager(this);
            this.inputManager = new InputManager(this);
            this.networkHandler = new NetworkPacketHandler(this);

            AudioManager.instance.setScene(this);

            this.visuals.applyQualitySettings();
            TextureSetup.create(this);
            createAnimations(this);

            // Create Player
            this.player = this.physics.add.sprite(this.mapWidth / 2, this.mapHeight / 2, 'player-idle');
            this.player.setCollideWorldBounds(true).setScale(2).setBodySize(20, 15, true).setOffset(this.player.body!.offset.x, 33).setMass(2).play('player-idle').setPipeline('Light2D');
            this.playerShadow = this.add.sprite(this.player.x, this.player.y + 28, 'shadows', 0).setAlpha(0.4).setDepth(this.player.depth - 1);
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

            // Group Initialization (simplified)
            const groups: any = {
                enemies: { classType: Enemy, maxSize: 100 },
                bossGroup: { classType: BossEnemy, maxSize: 1 },
                arrows: { classType: Arrow, maxSize: 50 },
                fireballs: { classType: Fireball, maxSize: 30 },
                frostBolts: { classType: FrostBolt, maxSize: 20 },
                lightningBolts: { classType: LightningBolt, maxSize: 30 },
                singularities: { classType: Singularity, maxSize: 10 },
                eclipseWakes: { classType: EclipseWake, maxSize: 20 },
                coins: { classType: Coin, maxSize: 5000 },
                enemyProjectiles: { classType: EnemyProjectile, maxSize: 50 }
            };
            Object.keys(groups).forEach(key => (this as any)[key] = this.physics.add.group({ ...groups[key], runChildUpdate: true }));

            this.players = this.physics.add.group();
            this.players.add(this.player);

            // Scene Logic setup
            this.regenerateMap(startLevelOverride);
            this.stats.applyClassModifiers(classConfig);
            this.stats.recalculateStats();

            // Multiplayer Initialization
            if (netConfig) {
                this.networkManager = new NetworkManager(
                    netConfig.peer,
                    netConfig.role,
                    (packet: SyncPacket, conn: any) => this.networkHandler.handlePacket(packet, conn)
                );
                this.networkManager.onDisconnect = (id: string) => this.removeRemotePlayer(id);

                if (netConfig.role === 'client' && netConfig.hostPeerId) {
                    this.networkManager.connectToHost(netConfig.hostPeerId);
                }
                console.log('[MainScene] NetworkManager initialized as', netConfig.role);
            }

            // HP Restoration logic
            const restoredHP = this.game.registry.get('_restoredHP');
            this.registry.set('playerHP', this.stats.maxHP);
            if (restoredHP !== undefined) {
                this.registry.set('playerHP', Math.min(restoredHP, this.stats.maxHP));
                this.game.registry.remove('_restoredHP');
            }
            if (savedRun?.playerX !== undefined) this.player.setPosition(savedRun.playerX, savedRun.playerY);

            // Initialize Hitbox
            this.attackHitbox = this.add.rectangle(0, 0, 80, 80, 0xff0000, 0) as any;
            this.physics.add.existing(this.attackHitbox);
            (this.attackHitbox.body as Phaser.Physics.Arcade.Body).enable = false;

            this.physics.add.overlap(this.attackHitbox, this.bossGroup, (_hitbox, boss) => {
                const b = boss as BossEnemy;
                if (this.currentSwingHitIds.has(b.id)) return;
                this.currentSwingHitIds.add(b.id);
                b.takeDamage(this.stats.damage, '#ffcc00');
                b.pushback(this.player.x, this.player.y, this.stats.knockback);
            });

            this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
                const e = enemy as Enemy;
                if (this.currentSwingHitIds.has(e.id)) return;
                this.currentSwingHitIds.add(e.id);
                e.takeDamage(this.stats.damage, '#ffcc00');
                e.pushback(this.player.x, this.player.y, this.stats.knockback);
            });

            // Player Hit Logic (Event-Driven)
            this.events.on('enemy-hit-player', (damage: number, _type: string, x?: number, y?: number, target?: any) => {
                const player = this.data.get('player');
                const role = this.networkManager?.role as string | undefined;

                if (target === player) {
                    // Local player takes damage
                    this.combat.takePlayerDamage(damage, x, y);

                    // Host must notify CLIENTS that the Host was hit
                    if (role === 'host' && this.networkManager) {
                        this.networkManager.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'damage_player', data: { id: this.networkManager.peerId, damage, x, y } },
                            ts: Date.now()
                        });
                    }
                } else if (role === 'host' && this.networkManager) {
                    // Host validates that a remote player was hit and notifies EVERYONE
                    let targetPeerId: string | null = null;
                    this.remotePlayers.forEach((sprite, peerId) => {
                        if (sprite === target) targetPeerId = peerId;
                    });

                    if (targetPeerId) {
                        // 1. Broadcast to all clients
                        this.networkManager.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'damage_player', data: { id: targetPeerId, damage, x, y } },
                            ts: Date.now()
                        });
                        // 2. Trigger visual feedback LOCALLY on the Host's screen for the client sprite
                        this.handleGameEvent({ type: 'damage_player', data: { id: targetPeerId, damage, x, y } } as any);
                    }
                }
            });

            // Input Context
            this.input.mouse?.disableContextMenu();

            this.data.set('player', this.player);
            this.data.set('isAttacking', false);
            this.data.set('isBlocking', false);
            this.data.set('attackAnimIndex', 0);
            this.data.set('isWhirlwinding', false);
            this.data.set('explosiveShotReady', false);


            // Ghost Mode Events
            this.events.on('player-died', () => {
                const p = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
                p.setTint(0xaaaaff);
                p.setBlendMode(Phaser.BlendModes.ADD);
                p.setAlpha(0.6);
                if (this.playerLight) this.playerLight.setRadius(58);
                if (this.outerPlayerLight) this.outerPlayerLight.setRadius(115);
                if (this.poolManager) this.poolManager.getDamageText(p.x, p.y - 50, "GHOST", "#aaaaff");
            });

            this.events.on('local-player-revived', () => {
                const p = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
                p.clearTint();
                p.setBlendMode(Phaser.BlendModes.NORMAL);
                p.setAlpha(1.0);
                if (this.playerLight) this.playerLight.setRadius(230);
                if (this.outerPlayerLight) this.outerPlayerLight.setRadius(575);
                this.combat.flushHP();
                this.registry.set('playerHP', this.registry.get('playerMaxHP'));
                if (this.poolManager) this.poolManager.getDamageText(p.x, p.y - 50, "REVIVED", "#55ff55");
            });

            // Listen for Upgrades
            this.events.off('apply-upgrade');
            this.events.on('apply-upgrade', (upgradeId: string) => {
                this.stats.applyUpgrade(upgradeId);
            });

            // Listen for Revive Purchases
            this.events.off('buy-revive');
            this.events.on('buy-revive', (targetId: string) => {
                if (this.networkManager?.role === 'client') {
                    // Client requests host to revive them
                    this.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'revive_request', data: { targetId } },
                        ts: Date.now()
                    });
                } else {
                    // Host does it instantly and tells everyone
                    this.handleGameEvent({ type: 'player_revived', data: { targetId } } as any);
                    this.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'player_revived', data: { targetId } },
                        ts: Date.now()
                    });
                }
            });

            // Listen for Next Level
            this.events.on('start-next-level', (targetLevel?: number) => {
                if (targetLevel !== undefined) {
                    this.waves.startLevel(targetLevel);
                } else {
                    this.waves.startLevel(this.registry.get('gameLevel') + 1);
                }
            });

            // Boss fight start
            this.events.on('start-boss', (bossIndex: number) => {
                // Show splash screen, then spawn boss
                const config = BOSS_CONFIGS[bossIndex];
                if (config) {
                    this.registry.set('bossName', config.name);
                }

                this.registry.set('bossSplashVisible', true);
                this.time.delayedCall(3200, () => {
                    this.registry.set('bossSplashVisible', false);
                    this.spawnBoss(bossIndex);
                });
            });

            // Boss minion spawning (from abilities like Raise Dead / Feral Howl)
            this.events.on('boss-spawn-minion', (x: number, y: number, type: string) => {
                const p = this.data.get('player');
                const minion = this.enemies.get(x, y) as Enemy | null;
                if (minion) {
                    minion.reset(x, y, p, 1.0, type);
                }
            });

            this.events.on('boss-died-collect-all', (x: number, y: number, bossIndex: number) => {
                this.waves.spawnBossCoins(x, y, bossIndex);
                this.combat.setDashIframe(true);
                this.time.delayedCall(2000, () => {
                    this.combat.setDashIframe(false);
                });
                this.time.delayedCall(400, () => {
                    this.coins.children.iterate((c: any) => {
                        if (c.active) {
                            const coin = c as Coin;
                            coin.forceMagnet = true;
                        }
                        return true;
                    });
                });
            });

            // Enemy Projectile Events
            this.events.on('enemy-fire-projectile', (x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball', isBurst = false) => {
                if (this.networkManager?.role === 'client') return; // Only host/singleplayer fires

                this.poolManager.getEnemyProjectile(x, y, angle, damage, type, isBurst);
                // Group addition now handled in poolManager

                // Broadcast to clients
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'spawn_enemy_projectile', data: { x, y, angle, damage, type } },
                    ts: Date.now()
                });
            });

            // Healer Wizard Events
            this.events.on('enemy-heal-ally', (healer: Enemy, target: Enemy, amount: number) => {
                if (this.networkManager?.role === 'client') return;

                // Apply heal logic (Host/Singleplayer authority)
                const healedAmount = Math.min(amount, target.maxHP - target.hp);
                if (healedAmount <= 0) return;

                target.hp += healedAmount;

                // Visual feedback
                const effect = this.add.sprite(target.x, target.y, 'heal_effect');
                effect.setDepth(target.depth + 1);
                effect.setScale(target.scale * 1.5);
                effect.play('heal-effect-anim');
                effect.on('animationcomplete', () => effect.destroy());

                this.poolManager.getDamageText(target.x, target.y - 40, `+${Math.round(healedAmount)}`, '#55ff55');

                // Apply slight green glow to target
                target.setTint(0xccffcc);
                this.time.delayedCall(500, () => {
                    if (target.active && !target.getIsDead()) target.clearTint();
                });

                // Sync heal event to clients
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'enemy_heal',
                        data: {
                            targetId: target.id,
                            healerId: healer.id,
                            amount: healedAmount,
                            tx: target.x,
                            ty: target.y
                        }
                    },
                    ts: Date.now()
                });
            });

            this.events.on('enemy-projectile-hit-player', (damage: number, _type: string, x: number, y: number, target: any) => {
                const player = this.data.get('player');
                const role = this.networkManager?.role as string | undefined;

                if (target === player) {
                    this.combat.takePlayerDamage(damage, x, y);

                    if (role === 'host' && this.networkManager) {
                        this.networkManager.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'damage_player', data: { id: this.networkManager.peerId, damage, x, y } },
                            ts: Date.now()
                        });
                    }
                } else if (role === 'host' && this.networkManager) {
                    let targetPeerId: string | null = null;
                    this.remotePlayers.forEach((sprite, peerId) => {
                        if (sprite === target) targetPeerId = peerId;
                    });

                    if (targetPeerId) {
                        this.networkManager.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'damage_player', data: { id: targetPeerId, damage, x, y } },
                            ts: Date.now()
                        });
                        this.handleGameEvent({ type: 'damage_player', data: { id: targetPeerId, damage, x, y } } as any);
                    }
                }
            });

            this.time.addEvent({
                delay: 50,
                callback: () => {
                    this.stats.flushEconomy();
                    this.combat.flushHP();
                },
                callbackScope: this,
                loop: true
            });

            // HP regen tick — applies playerRegen (Trollblod upgrade) every second
            this.time.addEvent({
                delay: 1000,
                callback: () => {
                    const regen = this.registry.get('playerRegen') as number;
                    if (regen > 0) {
                        const hp = this.registry.get('playerHP') as number;
                        const maxHP = this.registry.get('playerMaxHP') as number;
                        if (hp < maxHP) {
                            this.registry.set('playerHP', Math.min(hp + regen, maxHP));
                        }
                    }
                },
                callbackScope: this,
                loop: true
            });

            // Listen for save requests from GameContainer (before destroying)
            this.events.on('request-save', () => {
                if (!this.registry.get('isMultiplayer')) {
                    SaveManager.saveRunProgress(this.collectSaveData());
                    console.log('[MainScene] Saved run state on request-save.');
                }
            });

            // Initial Start (Only if Host or Single Player - Clients wait for Host signal)
            if (!netConfig || netConfig.role === 'host') {
                const finalStartLevel = startLevelOverride;
                const savedWave = this.registry.get('currentWave') as number ?? 1;
                const hasSavedEnemies = continueRun && savedRun?.savedEnemies && savedRun.savedEnemies.length > 0;
                console.log('[MainScene] Starting wave system at level:', finalStartLevel, 'wave:', savedWave, 'restoreEnemies:', hasSavedEnemies);
                if (hasSavedEnemies) {
                    this.waves.restoreWaveState(finalStartLevel, savedWave, savedRun!.savedEnemies!, savedRun!.waveEnemiesRemaining ?? 0);
                } else {
                    this.waves.startLevel(finalStartLevel, savedWave);
                }
            }
            console.log('[MainScene] Create complete.');

            // Resume audio context and play music
            this.input.on('pointerdown', () => AudioManager.instance.resumeContext());
            AudioManager.instance.playBGS('forest_ambience');
            // Global Sound Listeners
            this.events.on('enemy-hit', () => AudioManager.instance.playSFX('hit'));
            this.events.on('player-swing', () => AudioManager.instance.playSFX('swing'));
            this.events.on('bow-shot', () => AudioManager.instance.playSFX('bow_attack'));
            this.events.on('fireball-cast', () => AudioManager.instance.playSFX('fireball_cast'));
            this.events.on('frost-cast', () => AudioManager.instance.playSFX('ice_throw'));
            this.events.on('lightning-cast', () => AudioManager.instance.playSFX('fireball_cast')); // Using fireball_cast as placeholder
            this.events.on('player-dash', () => AudioManager.instance.playSFX('dash'));

            // Listen for weapon changes
            this.registry.events.on('changedata-currentWeapon', () => {
                AudioManager.instance.playSFX('weapon_pick_up');
            }, this);

            // Listen for level completion to regenerate map for next level
            this.events.on('level-complete', () => {
                const nextLevel = this.registry.get('gameLevel') + 1;

                // Clear world on level complete
                this.coins.clear(true, true);
                this.enemies.clear(true, true);
                this.bossGroup.clear(true, true);

                // Save run progress at level boundary (singleplayer only)
                if (!this.registry.get('isMultiplayer')) {
                    SaveManager.saveRunProgress({
                        gameLevel: nextLevel,
                        currentWave: 1,
                        playerCoins: this.registry.get('playerCoins') || 0,
                        upgradeLevels: this.registry.get('upgradeLevels') || {},
                        currentWeapon: this.registry.get('currentWeapon') || 'sword',
                        unlockedWeapons: this.registry.get('unlockedWeapons') || ['sword'],
                        playerHP: this.registry.get('playerHP') || 0,
                        playerMaxHP: this.registry.get('playerMaxHP') || 100,
                        savedAt: Date.now()
                    });
                }

                // Schedule map regeneration after level complete delay
                this.time.delayedCall(1000, () => {
                    this.regenerateMap(nextLevel);
                });
            });

            // Save run on browser close (singleplayer only)
            const handleUnload = () => {
                if (!this.registry.get('isMultiplayer')) {
                    SaveManager.saveRunProgress(this.collectSaveData());
                }
            };
            window.addEventListener('beforeunload', handleUnload);
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                window.removeEventListener('beforeunload', handleUnload);
            });

            // Listen for class abilities
            this.events.on('attempt-class-ability-e', () => {
                const playerClassId = resolveClassId(this.registry.get('playerClass'));
                if (playerClassId === 'archer') {
                    // Archer has a special E key logic
                    this.activateArcherSpecial();
                }
            });

            this.events.on('attempt-class-ability-2', () => {
                const playerClassId = resolveClassId(this.registry.get('playerClass'));
                if (playerClassId === 'krieger') this.activateWhirlwind();
                else if (playerClassId === 'wizard') this.activateCascade();
                else if (playerClassId === 'archer') this.activateExplosiveShot();
            });

            this.events.on('attempt-attack', () => {
                this.handlePlayerActionCombat(this.time.now, 16.6); // delta placeholder
            });

            this.events.on('play-footstep', () => {
                AudioManager.instance.playSFX('footstep');
            });

            // Start Weather Effects
            this.weather.enableFog();
            this.weather.startRain();

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

    private removeRemotePlayer(id: string) {
        const sprite = this.remotePlayers.get(id);
        if (sprite) {
            sprite.destroy();
            this.remotePlayers.delete(id);
        }

        const label = this.playerNicknames.get(id);
        if (label) {
            label.destroy();
            this.playerNicknames.delete(id);
        }

        const light = this.remotePlayerLights.get(id);
        if (light) {
            this.lights.removeLight(light);
            this.remotePlayerLights.delete(id);
        }

        this.playerBuffers.delete(id);
        this.remotePlayerPackets.delete(id);
    }

    private handleGameEvent(event: any) {
        this.networkHandler.handleGameEvent(event);
    }


    /** Spawn a boss at the center of the map. */
    private spawnBoss(bossIndex: number): void {
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

    /** Load the static map for a given level. */
    private regenerateMap(level: number) {
        // Safety: Ensure level is at least 1 and within bounds
        const safeLevel = Math.max(1, level);

        // Clean up old map
        if (this.currentMap) {
            this.currentMap.destroy();
        }

        // Select map definition (capped at last entry)
        const mapIndex = Math.min(safeLevel - 1, STATIC_MAPS.length - 1);
        const mapDef = STATIC_MAPS[mapIndex];

        // Load static map – no procedural generation, instant
        this.currentMap = new StaticMapLoader(this, this.obstacles, this.mapWidth, this.mapHeight);
        this.currentMap.load(mapDef);

        // Populate static grid for efficient pathfinding lookups
        this.staticObstacleGrid.clear();
        this.obstacles.getChildren().forEach((obs: any) => {
            const body = obs.body as Phaser.Physics.Arcade.StaticBody;
            if (body) {
                this.staticObstacleGrid.insert({
                    x: obs.x,
                    y: obs.y,
                    width: body.width,
                    height: body.height
                });
            }
        });

        // Swap ambient particle theme to match the new level
        this.ambient.setTheme(safeLevel);

        this.events.emit('map-ready', { level: safeLevel });
    }

    update(_time: number, delta: number) {
        try {
            const cappedDelta = Math.min(delta, 100);
            this.poolManager.update(cappedDelta);

            this.networkHandler.networkTick();

            this.singularities.children.iterate((s: any) => { if (s.active) s.update(_time, delta); return true; });
            this.eclipseWakes.children.iterate((w: any) => { if (w.active) w.update(_time, delta); return true; });

            if (this.player && this.playerShadow) this.playerShadow.setPosition(this.player.x, this.player.y + 28);
            if (!this.player || !this.player.body) return;

            const renderTime = this.networkManager ? this.networkManager.getServerTime() - 100 : Date.now();
            this.networkHandler.interpolateRemotePlayers(renderTime);

            if (this.quality.lightingEnabled) {
                this.playerLight.setPosition(this.player.x, this.player.y);
                this.outerPlayerLight.setPosition(this.player.x, this.player.y);
            }

            this.updateVignette();
            this.inputManager.update(_time, delta);

            // Update Spatial Grid
            this.spatialGrid.clear();
            this.enemies.children.iterate((e: any) => {
                if (e.active && !e.isDead) this.spatialGrid.insert({ x: e.x, y: e.y, width: e.body?.width || 40, height: e.body?.height || 40, id: e.id, ref: e });
                return true;
            });
            this.bossGroup.children.iterate((b: any) => {
                if (b.active && !b.isDead) this.spatialGrid.insert({ x: b.x, y: b.y, width: b.body?.width || 80, height: b.body?.height || 80, id: 'boss', ref: b });
                return true;
            });

            this.handlePlayerActionCombat(_time, delta);

        } catch (error) {
            console.error('[MainScene] Update loop crashed:', error);
        }
    }

    private updateVignette() {
        if (!this.quality.postFXEnabled || !this.vignetteEffect) return;
        const hp = this.registry.get('playerHP') || 0;
        const max = this.registry.get('playerMaxHP') || 100;
        const ratio = hp / max;

        if (ratio < 0.3) {
            const urgency = 1 + (0.3 - ratio) * 5;
            const pulse = (Math.sin(this.time.now / (380 / urgency)) + 1) * 0.5;
            this.vignetteEffect.strength = 0.30 + pulse * 0.45;
        } else {
            this.vignetteEffect.strength = Phaser.Math.Linear(this.vignetteEffect.strength, 0.15, 0.08);
        }
    }

    private handlePlayerActionCombat(_time: number, _delta: number) {
        const player = this.player;
        if (!player || !player.active) return;
        const pointer = this.input.activePointer;
        const hp = this.registry.get('playerHP') || 0;
        if (hp <= 0 || this.data.get('isBlocking')) return;

        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        const radius = 50;
        this.attackHitbox.setPosition(
            player.x + Math.cos(angle) * radius,
            player.y + Math.sin(angle) * radius
        );
        this.attackHitbox.setRotation(angle);

        // This method will be expanded in the next step to include full weapon logic,
        // but for now we ensure it handles the basics to keep lints happy.
        this.handleWeaponExecution(angle);
    }

    private handleWeaponExecution(angle: number) {
        const player = this.player;
        const currentWeapon = this.registry.get('currentWeapon');
        const lastCd = this.registry.get('weaponCooldown');
        if (lastCd && Date.now() < lastCd.timestamp + lastCd.duration) return;

        this.data.set('isAttacking', true);

        // Safety valve
        this.time.delayedCall(1500, () => {
            if (this.data.get('isAttacking')) {
                this.data.set('isAttacking', false);
                player.play('player-idle');
            }
        });

        if (currentWeapon === 'sword') {
            this.executeSwordAttack(angle);
        } else if (currentWeapon === 'bow') {
            this.executeBowAttack(angle);
        } else if (currentWeapon === 'fireball') {
            this.executeFireballAttack(angle);
        } else if (currentWeapon === 'frost') {
            this.executeFrostAttack(angle);
        } else if (currentWeapon === 'lightning') {
            this.executeLightningAttack(angle);
        }
    }

    private executeSwordAttack(angle: number) {
        const attackSpeedMult = this.registry.get('playerAttackSpeed') || 1;
        const swordCooldown = GAME_CONFIG.WEAPONS.SWORD.cooldown / attackSpeedMult;

        const ATTACK_ANIMS = ['player-attack', 'player-attack-2'];
        const idx = this.data.get('attackAnimIndex') || 0;
        const attackAnimKey = ATTACK_ANIMS[idx];
        this.data.set('attackAnimIndex', (idx + 1) % ATTACK_ANIMS.length);

        this.registry.set('weaponCooldown', { duration: swordCooldown, timestamp: Date.now() });

        this.currentSwingHitIds.clear();
        this.player.play(attackAnimKey);
        this.events.emit('player-swing');

        this.networkManager?.broadcast({
            t: PacketType.GAME_EVENT,
            ev: {
                type: 'attack',
                data: { id: this.networkManager.peerId, weapon: 'sword', anim: attackAnimKey, angle }
            },
            ts: Date.now()
        });

        this.time.delayedCall(Math.max(100, swordCooldown * 0.3), () => {
            (this.attackHitbox.body as Phaser.Physics.Arcade.Body).enable = true;
            this.time.delayedCall(100, () => {
                (this.attackHitbox.body as Phaser.Physics.Arcade.Body).enable = false;
            });
        });

        this.player.once(`animationcomplete-${attackAnimKey}`, () => {
            this.data.set('isAttacking', false);
            this.player.play('player-idle');
        });

        // ECLIPSE STRIKE
        const eclipseLevel = this.registry.get('playerEclipseLevel') || 0;
        if (eclipseLevel > 0) {
            const wake = this.eclipseWakes.get(this.player.x, this.player.y) as EclipseWake;
            if (wake) {
                const wakeDamage = this.stats.damage * 0.3 * eclipseLevel;
                wake.spawn(this.player.x, this.player.y, angle, wakeDamage);
            }
        }
    }

    private executeBowAttack(angle: number) {
        const bowCooldown = this.stats.playerCooldown;
        this.registry.set('weaponCooldown', { duration: bowCooldown, timestamp: Date.now() });
        this.player.play('player-bow');

        this.time.delayedCall(bowCooldown * 0.5, () => {
            const arrowDamageMultiplier = this.registry.get('playerArrowDamageMultiplier') || 1;
            const arrowSpeed = this.registry.get('playerArrowSpeed') || GAME_CONFIG.WEAPONS.BOW.speed;
            const pierceCount = this.registry.get('playerPierceCount') || 0;
            const explosiveLevel = this.registry.get('playerExplosiveLevel') || 0;
            const baseDamage = this.stats.damage * GAME_CONFIG.WEAPONS.BOW.damageMult * arrowDamageMultiplier;
            const singularityLevel = this.registry.get('playerSingularityLevel') || 0;
            const poisonLevel = this.registry.get('playerPoisonLevel') || 0;

            const arrow = this.arrows.get(this.player.x, this.player.y) as Arrow;
            if (arrow) {
                if (this.explosiveShotReady) {
                    const levels = (this.registry.get('upgradeLevels') || {}) as Record<string, number>;
                    const abilityDamage = baseDamage * (2.0 + (levels['exp_shot_damage'] || 0) * 0.3);
                    const abilityRadius = 120 + (levels['exp_shot_radius'] || 0) * 40;
                    arrow.fire(this.player.x, this.player.y, angle, abilityDamage, arrowSpeed, pierceCount, explosiveLevel, singularityLevel, poisonLevel, abilityRadius);
                    this.explosiveShotReady = false;
                    this.registry.set('explosiveShotReady', false);
                    this.classAbilityCooldownEnd = Date.now() + 12000;
                    this.registry.set('classAbilityCooldown', { duration: 12000, timestamp: Date.now() });
                } else {
                    arrow.fire(this.player.x, this.player.y, angle, baseDamage, arrowSpeed, pierceCount, explosiveLevel, singularityLevel, poisonLevel);
                }
                this.events.emit('bow-shot');

                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'attack',
                        data: { id: this.networkManager.peerId, weapon: 'bow', anim: 'player-bow', angle }
                    },
                    ts: Date.now()
                });

                const projectiles = this.registry.get('playerProjectiles') || 1;
                if (projectiles > 1) {
                    for (let i = 1; i < projectiles; i++) {
                        const offset = Math.ceil(i / 2) * 10 * (Math.PI / 180) * (i % 2 === 0 ? -1 : 1);
                        const subArrow = this.arrows.get(this.player.x, this.player.y) as Arrow;
                        if (subArrow) subArrow.fire(this.player.x, this.player.y, angle + offset, baseDamage, arrowSpeed, pierceCount, explosiveLevel, 0, poisonLevel);
                    }
                }
            }
        });

        this.player.once('animationcomplete-player-bow', () => {
            this.data.set('isAttacking', false);
            this.player.play('player-idle');
        });
    }

    private executeFireballAttack(angle: number) {
        const fireCd = GAME_CONFIG.WEAPONS.FIREBALL.cooldown;
        this.registry.set('weaponCooldown', { duration: fireCd, timestamp: Date.now() });
        this.player.play('player-bow');
        this.events.emit('fireball-cast');

        this.time.delayedCall(100, () => {
            const fireball = this.fireballs.get(this.player.x, this.player.y) as Fireball;
            if (fireball) {
                const cascadeBonus = Date.now() < this.cascadeActiveUntil ? 1.5 + ((this.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
                fireball.fire(this.player.x, this.player.y, angle, this.stats.damage * GAME_CONFIG.WEAPONS.FIREBALL.damageMult * (this.registry.get('fireballDamageMulti') || 1) * cascadeBonus);
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'attack', data: { id: this.networkManager.peerId, weapon: 'fire', anim: 'player-cast', angle } },
                    ts: Date.now()
                });
            }
        });

        this.player.once('animationcomplete-player-bow', () => {
            this.data.set('isAttacking', false);
            this.player.play('player-idle');
        });
    }

    private executeFrostAttack(angle: number) {
        const frostCd = GAME_CONFIG.WEAPONS.FROST.cooldown;
        this.registry.set('weaponCooldown', { duration: frostCd, timestamp: Date.now() });
        this.player.play('player-cast');

        const pointer = this.input.activePointer;
        const frostTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        this.time.delayedCall(100, () => {
            const frostBolt = this.frostBolts.get(this.player.x, this.player.y) as FrostBolt;
            if (frostBolt) {
                const cascadeBonus = Date.now() < this.cascadeActiveUntil ? 1.5 + ((this.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
                frostBolt.fire(this.player.x, this.player.y, frostTarget.x, frostTarget.y, this.stats.damage * GAME_CONFIG.WEAPONS.FROST.damageMult * (this.registry.get('frostDamageMulti') || 1) * cascadeBonus);
                this.events.emit('frost-cast');
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'attack', data: { id: this.networkManager.peerId, weapon: 'frost', anim: 'player-cast', angle } },
                    ts: Date.now()
                });
            }
        });

        this.player.once('animationcomplete-player-cast', () => {
            this.data.set('isAttacking', false);
            this.player.play('player-idle');
        });
    }

    private executeLightningAttack(angle: number) {
        const ltgCd = GAME_CONFIG.WEAPONS.LIGHTNING.cooldown;
        this.registry.set('weaponCooldown', { duration: ltgCd, timestamp: Date.now() });
        this.player.play('player-cast');
        const pointer = this.input.activePointer;
        const ltTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        this.time.delayedCall(100, () => {
            const cascadeBonus = Date.now() < this.cascadeActiveUntil ? 1.5 + ((this.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
            const baseDamage = this.stats.damage * GAME_CONFIG.WEAPONS.LIGHTNING.damageMult * (this.registry.get('lightningDamageMulti') || 1) * cascadeBonus;
            const bolt = this.lightningBolts.get(this.player.x, this.player.y) as LightningBolt;
            if (bolt) bolt.fire(this.player.x, this.player.y, ltTarget.x, ltTarget.y, baseDamage, this.registry.get('lightningBounces') || GAME_CONFIG.WEAPONS.LIGHTNING.bounces, new Set(), angle);
            this.events.emit('lightning-cast');
            this.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'attack', data: { id: this.networkManager.peerId, weapon: 'lightning', anim: 'player-cast', angle } },
                ts: Date.now()
            });
        });

        this.player.once('animationcomplete-player-cast', () => {
            this.data.set('isAttacking', false);
            this.player.play('player-idle');
        });
    }

    // ── Class Ability Methods ────────────────────────────────────────────────

    private activateWhirlwind(): void {
        const levels = (this.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const damageMult = 1 + (levels['whirl_damage'] || 0) * 0.25;
        const cdLvl = levels['whirl_cooldown'] || 0;
        const chainLvl = levels['whirl_chain'] || 0;
        const damage = this.stats.damage * damageMult;
        const radius = 120;
        const cd = 8000 * Math.pow(0.8, cdLvl);

        this.isWhirlwinding = true;
        this.data.set('isWhirlwinding', true);
        this.classAbilityCooldownEnd = Date.now() + cd;
        this.registry.set('classAbilityCooldown', { duration: cd, timestamp: Date.now() });

        this.player.play('player-attack');
        this.events.emit('player-swing');

        this.tweens.add({
            targets: this.player,
            rotation: Math.PI * 4,
            duration: 500,
            ease: 'Linear',
            onComplete: () => { this.player.setRotation(0); }
        });

        const px = this.player.x, py = this.player.y;
        const hitEnemies = (this.enemies.getChildren() as Enemy[]).filter(e => e.active && Phaser.Math.Distance.Between(px, py, e.x, e.y) <= radius);

        hitEnemies.forEach(e => {
            e.takeDamage(damage, '#ffcc00');
            e.pushback(px, py, this.stats.knockback * 1.5);
        });

        this.time.delayedCall(500, () => {
            hitEnemies.forEach(e => { if (e.active) { e.takeDamage(damage, '#ffaa00'); e.pushback(px, py, this.stats.knockback); } });
            if (chainLvl > 0) {
                const reduction = Math.min(hitEnemies.length * (chainLvl === 1 ? 0.05 : 0.07), chainLvl === 1 ? 0.25 : 0.35);
                this.classAbilityCooldownEnd -= cd * reduction;
            }
            this.isWhirlwinding = false;
            this.data.set('isWhirlwinding', false);
        });
    }

    private activateExplosiveShot(): void {
        this.explosiveShotReady = true;
        this.data.set('explosiveShotReady', true);
        this.registry.set('explosiveShotReady', true);
        this.time.delayedCall(5000, () => {
            if (this.explosiveShotReady) {
                this.explosiveShotReady = false;
                this.data.set('explosiveShotReady', false);
                this.registry.set('explosiveShotReady', false);
            }
        });
    }

    private activateCascade(): void {
        const levels = (this.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const duration = (4 + (levels['cascade_duration'] || 0) * 2) * 1000;
        const cd = 10000;

        this.cascadeActiveUntil = Date.now() + duration;
        this.classAbilityCooldownEnd = this.cascadeActiveUntil + cd;
        this.registry.set('classAbilityCooldown', { duration: duration + cd, timestamp: Date.now() });

        const cascadeEmitter = this.add.particles(this.player.x, this.player.y, 'arrow', {
            lifespan: 1200, speed: { min: 20, max: 50 }, scale: { start: 0.25, end: 0 },
            alpha: { start: 0.5, end: 0 }, angle: { min: 0, max: 360 }, frequency: 40,
            tint: [0xff00ff, 0x00ffff, 0xffff00, 0x88ff00], blendMode: 'ADD', follow: this.player,
        });

        this.time.delayedCall(duration, () => { cascadeEmitter.destroy(); });
    }

    private activateArcherSpecial(): void {
        const upgLvls3 = (this.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const timeSlowLvl = upgLvls3['time_slow_arrow'] || 0;
        if (timeSlowLvl > 0) {
            const slowDuration = 3000 + timeSlowLvl * 1000;
            this.enemies.children.iterate((e: any) => { if (e && e.active) e.applySlow?.(slowDuration); return true; });
            this.bossGroup.children.iterate((boss: any) => { if (boss && boss.active) boss.applySlow?.(slowDuration); return true; });
            this.poolManager.getDamageText(this.player.x, this.player.y - 70, 'TIME SLOW!', '#88aaff');
        }
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

    public restartGame() {
        console.log("[Game] Restarting run...");
        SaveManager.clearRunProgress();
        if (this.networkManager?.role === 'host') this.networkManager.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'restart_game', data: {} }, ts: Date.now() });
        this.events.emit('restart-game');

        const playerClassId = resolveClassId(this.registry.get('playerClass'));
        const classConfig = CLASS_CONFIGS[playerClassId];

        this.registry.set('playerMaxHP', GAME_CONFIG.PLAYER.BASE_MAX_HP);
        this.registry.set('playerHP', GAME_CONFIG.PLAYER.BASE_MAX_HP);
        this.registry.set('playerCoins', 0);
        this.registry.set('gameLevel', 1);
        this.registry.set('currentWave', 1);
        this.registry.set('isBossActive', false);
        this.registry.set('bossComingUp', -1);
        this.registry.set('reviveCount', 0);
        this.registry.set('unlockedWeapons', [...classConfig.startingWeapons]);
        this.registry.set('currentWeapon', classConfig.startingWeapons[0] || 'sword');
        this.registry.set('partyDead', false);
        this.registry.set('upgradeLevels', {});

        this.enemies.clear(true, true);
        this.bossGroup.clear(true, true);
        this.coins.clear(true, true);
        ['arrows', 'fireballs', 'frostBolts', 'lightningBolts'].forEach(g => (this as any)[g].clear(true, true));

        if (this.player) {
            this.player.setPosition(this.mapWidth / 2, this.mapHeight / 2);
            this.player.clearTint();
            this.player.setBlendMode(Phaser.BlendModes.NORMAL);
            this.player.setAlpha(1.0);
        }
        this.remotePlayers.forEach(rp => { rp.clearTint(); rp.setBlendMode(Phaser.BlendModes.NORMAL); rp.setAlpha(1.0); });
        this.stats.recalculateStats();
        this.regenerateMap(1);
        if (this.networkManager?.role !== 'client') this.waves.startLevel(1);
        this.scene.resume();
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
        backgroundColor: '#0f172a'
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

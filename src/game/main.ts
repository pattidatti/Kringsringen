import Phaser from 'phaser';
import type { NetworkConfig } from '../App';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { BOSS_CONFIGS } from '../config/bosses';
import { GAME_CONFIG } from '../config/GameConfig';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
import { LightningBolt } from './LightningBolt';
import { Singularity } from './Singularity';
import { EclipseWake } from './EclipseWake';
import { Coin } from './Coin';
import { EnemyProjectile } from './EnemyProjectile';
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
import { NetworkManager } from '../network/NetworkManager';
import { PacketType, type PackedPlayer, type SyncPacket } from '../network/SyncSchemas';
import { JitterBuffer } from '../network/JitterBuffer';
import { type QualitySettings } from '../config/QualityConfig';
import { CLASS_CONFIGS, resolveClassId } from '../config/classes';
import { InputManager } from './InputManager';
import { TextureSetup } from './TextureSetup';
import { SceneVisualManager } from './SceneVisualManager';
import { CollisionManager } from './CollisionManager';
import { NetworkPacketHandler } from './NetworkPacketHandler';
import { WeaponManager } from './WeaponManager';
import { ClassAbilityManager } from './ClassAbilityManager';


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
    public weaponManager!: WeaponManager;
    public abilityManager!: ClassAbilityManager;

    public arrows!: Phaser.Physics.Arcade.Group;
    public fireballs!: Phaser.Physics.Arcade.Group;
    public frostBolts!: Phaser.Physics.Arcade.Group;
    public lightningBolts!: Phaser.Physics.Arcade.Group;
    public singularities!: Phaser.Physics.Arcade.Group;
    public eclipseWakes!: Phaser.Physics.Arcade.Group;
    public bossGroup!: Phaser.Physics.Arcade.Group;
    private players!: Phaser.Physics.Arcade.Group;
    public poolManager!: ObjectPoolManager;

    // Managers
    public stats!: PlayerStatsManager;
    public combat!: PlayerCombatManager;
    public waves!: WaveManager;

    // Map Generation
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
    public ambient!: AmbientParticleManager;

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
            this.weaponManager = new WeaponManager(this);
            this.abilityManager = new ClassAbilityManager(this);

            AudioManager.instance.setScene(this);

            this.visuals.applyQualitySettings();
            TextureSetup.create(this);
            createAnimations(this);

            // Create Player
            this.player = this.physics.add.sprite(this.mapWidth / 2, this.mapHeight / 2, 'player-idle');
            this.player.setCollideWorldBounds(true).setScale(2).setBodySize(20, 15, true).setOffset(this.player.body!.offset.x, 33).setMass(2).play('player-idle').setPipeline('Light2D');
            this.playerShadow = this.add.sprite(this.player.x, this.player.y + 28, 'shadows', 0).setAlpha(0.4).setDepth(this.player.depth - 1);
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

            this.setupGroups();

            this.players = this.physics.add.group();
            this.players.add(this.player);

            // Scene Logic setup
            this.visuals.regenerateMap(startLevelOverride);
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

            this.setupEventListeners();

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
                this.time.delayedCall(1000, () => this.visuals.regenerateMap(nextLevel));
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

            this.events.on('play-footstep', () => AudioManager.instance.playSFX('footstep'));

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

            this.visuals.update();
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

        this.weaponManager.handleWeaponExecution(angle);
    }

    private setupGroups() {
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
    }

    private setupEventListeners() {
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

        // Listen for Upgrades
        this.events.off('apply-upgrade');
        this.events.on('apply-upgrade', (upgradeId: string) => {
            this.stats.applyUpgrade(upgradeId);
        });

        // Listen for Revive Purchases
        this.events.off('buy-revive');
        this.events.on('buy-revive', (targetId: string) => {
            if (this.networkManager?.role === 'client') {
                this.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'revive_request', data: { targetId } },
                    ts: Date.now()
                });
            } else {
                this.handleGameEvent({ type: 'player_revived', data: { targetId } } as any);
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'player_revived', data: { targetId } },
                    ts: Date.now()
                });
            }
        });

        this.events.on('start-next-level', (lvl?: number) => this.waves.startLevel(lvl ?? this.registry.get('gameLevel') + 1));
        this.events.on('start-boss', (idx: number) => {
            const config = BOSS_CONFIGS[idx];
            if (config) this.registry.set('bossName', config.name);
            this.registry.set('bossSplashVisible', true);
            this.time.delayedCall(3200, () => {
                this.registry.set('bossSplashVisible', false);
                this.spawnBoss(idx);
            });
        });

        this.events.on('boss-spawn-minion', (x: number, y: number, type: string) => {
            const minion = this.enemies.get(x, y) as Enemy | null;
            if (minion) minion.reset(x, y, this.player, 1.0, type);
        });

        this.events.on('boss-died-collect-all', (x: number, y: number, idx: number) => {
            this.waves.spawnBossCoins(x, y, idx);
            this.combat.setDashIframe(true);
            this.time.delayedCall(2000, () => this.combat.setDashIframe(false));
            this.time.delayedCall(400, () => this.coins.children.iterate((c: any) => { if (c.active) (c as Coin).forceMagnet = true; return true; }));
        });

        this.events.on('enemy-fire-projectile', (x: number, y: number, ang: number, dmg: number, type: any, burst?: boolean) => {
            if (this.networkManager?.role === 'client') return;
            this.poolManager.getEnemyProjectile(x, y, ang, dmg, type, burst);
            this.networkManager?.broadcast({ t: PacketType.GAME_EVENT, ev: { type: 'spawn_enemy_projectile', data: { x, y, angle: ang, damage: dmg, type } }, ts: Date.now() });
        });

        this.events.on('level-complete', () => {
            const next = this.registry.get('gameLevel') + 1;
            this.coins.clear(true, true);
            this.enemies.clear(true, true);
            this.bossGroup.clear(true, true);
            if (!this.registry.get('isMultiplayer')) {
                SaveManager.saveRunProgress({
                    gameLevel: next, currentWave: 1, playerCoins: this.registry.get('playerCoins'),
                    upgradeLevels: this.registry.get('upgradeLevels'), currentWeapon: this.registry.get('currentWeapon'),
                    unlockedWeapons: this.registry.get('unlockedWeapons'), playerHP: this.registry.get('playerHP'),
                    playerMaxHP: this.registry.get('playerMaxHP'), savedAt: Date.now()
                });
            }
            this.time.delayedCall(1000, () => this.visuals.regenerateMap(next));
        });

        this.events.on('attempt-class-ability-e', () => this.abilityManager.attemptSpecialE());
        this.events.on('attempt-class-ability-2', () => this.abilityManager.attemptAbility2());
        this.events.on('attempt-attack', () => this.handlePlayerActionCombat(this.time.now, 16.6));
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
        this.visuals.regenerateMap(1);
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

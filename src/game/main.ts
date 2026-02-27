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
import type { IMainScene } from './IMainScene';
import { PreloadScene } from './PreloadScene';
import { WeatherManager } from './WeatherManager';
import { AmbientParticleManager } from './AmbientParticleManager';
import { NetworkManager } from '../network/NetworkManager';
import { PacketType, type SyncPacket, type PackedPlayer } from '../network/SyncSchemas';
import type { DataConnection } from 'peerjs';
import { JitterBuffer } from '../network/JitterBuffer';
import { EnemyProjectile } from './EnemyProjectile';
import { getQualityConfig, type QualitySettings, type GraphicsQuality } from '../config/QualityConfig';
import { BinaryPacker } from '../network/BinaryPacker';


class MainScene extends Phaser.Scene implements IMainScene {
    public enemies!: Phaser.Physics.Arcade.Group;
    public spatialGrid!: SpatialHashGrid;
    public coins!: Phaser.Physics.Arcade.Group;
    public obstacles!: Phaser.Physics.Arcade.StaticGroup;
    private attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
        SHIFT: Phaser.Input.Keyboard.Key;
    };
    private hotkeys!: {
        [key: string]: Phaser.Input.Keyboard.Key;
    };

    private arrows!: Phaser.Physics.Arcade.Group;
    private fireballs!: Phaser.Physics.Arcade.Group;
    private frostBolts!: Phaser.Physics.Arcade.Group;
    private lightningBolts!: Phaser.Physics.Arcade.Group;
    public singularities!: Phaser.Physics.Arcade.Group;
    private eclipseWakes!: Phaser.Physics.Arcade.Group;
    public bossGroup!: Phaser.Physics.Arcade.Group;
    private enemyProjectiles!: Phaser.Physics.Arcade.Group;
    private players!: Phaser.Physics.Arcade.Group;
    public poolManager!: ObjectPoolManager;

    // Networking Buffers (Pre-allocated to reduce GC churn)
    private localPackedPlayer: PackedPlayer = ['unknown', 0, 0, 'player-idle', 0, 100, '', 'unknown'];

    // Managers
    public stats!: PlayerStatsManager;
    public combat!: PlayerCombatManager;
    public waves!: WaveManager;

    // Map Generation
    private currentMap: StaticMapLoader | null = null;
    private mapWidth: number = 3000;
    private mapHeight: number = 3000;
    private playerShadow: Phaser.GameObjects.Sprite | null = null;
    private playerLight!: Phaser.GameObjects.Light;
    private outerPlayerLight!: Phaser.GameObjects.Light;

    // Audio throttle
    private lastFootstepTime: number = 0;

    // Weather
    private weather!: WeatherManager;

    // Ambient particles (fireflies / leaves / embers)
    private ambient!: AmbientParticleManager;

    // Vignette post-FX — strength driven by player HP
    private vignetteEffect: any = null;

    public deathSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Multiplayer properties
    public networkManager?: NetworkManager;
    private remotePlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private playerNicknames: Map<string, Phaser.GameObjects.Text> = new Map();
    private playerBuffers: Map<string, JitterBuffer<PackedPlayer>> = new Map();
    /** Cache of last-received packet per remote peer — used by Host to relay all positions */
    private remotePlayerPackets: Map<string, PackedPlayer> = new Map();
    public pendingDeaths: Set<string> = new Set();
    private lastSyncTime: number = 0;
    private lastSentPlayerStates: Map<string, string> = new Map();
    private networkTickCount: number = 0;
    public quality!: QualitySettings;

    constructor() {
        super('MainScene');
    }

    create() {
        // Load Saved Data
        const saveData = SaveManager.load();

        // Initialize Registry State — run resources always start fresh
        this.registry.set('playerCoins', 0);
        this.registry.set('currentWeapon', 'sword');
        this.registry.set('upgradeLevels', {});
        this.registry.set('highStage', saveData.highStage);
        this.registry.set('unlockedWeapons', ['sword', 'bow', 'fireball', 'frost', 'lightning']);
        // Boss state
        this.registry.set('bossComingUp', -1);
        this.registry.set('isBossActive', false);
        this.registry.set('bossSplashVisible', false);
        this.registry.set('bossHP', 0);
        this.registry.set('bossMaxHP', 0);
        this.registry.set('bossName', '');
        this.registry.set('bossPhase', 1);

        // Network state
        const netConfig = this.game.registry.get('networkConfig') as NetworkConfig | null;
        if (netConfig) {
            this.registry.set('isMultiplayer', true);
            this.registry.set('roomCode', netConfig.roomCode);
            this.registry.set('networkRole', netConfig.role);
            this.registry.set('nickname', netConfig.nickname);
        } else {
            this.registry.set('isMultiplayer', false);
        }

        // Initialize Audio Manager
        AudioManager.instance.setScene(this);

        // Initialize Managers
        this.stats = new PlayerStatsManager(this);
        this.combat = new PlayerCombatManager(this);
        this.waves = new WaveManager(this);
        this.poolManager = new ObjectPoolManager(this);
        this.weather = new WeatherManager(this);
        this.ambient = new AmbientParticleManager(this);

        // Quality Initialization
        const qualityLevel = (this.game.registry.get('graphicsQuality') as GraphicsQuality) || GAME_CONFIG.QUALITY.DEFAULT;
        this.quality = getQualityConfig(qualityLevel);

        this.game.registry.events.on('changedata-graphicsQuality', (_parent: any, val: GraphicsQuality) => {
            this.quality = getQualityConfig(val);
            this.applyQualitySettings();
        });

        // Initialize Network Manager if in multiplayer
        if (netConfig) {
            this.networkManager = new NetworkManager(
                netConfig.peer,
                netConfig.role,
                (packet, conn) => this.handleNetworkPacket(packet, conn)
            );

            // Standalone network tick uncoupled from Phaser update()
            this.networkManager.setTickFunction(() => this.networkTick(), 33);

            if (netConfig.role === 'client' && netConfig.hostPeerId) {
                console.log('Client connecting to host:', netConfig.hostPeerId);
                this.networkManager.connectToHost(netConfig.hostPeerId);
            }
        }

        // Calculate Initial Stats
        this.stats.recalculateStats();

        // HP starts at full max (after stats are calculated)
        this.registry.set('playerHP', this.stats.maxHP);

        // Initialize Object Pool
        this.poolManager = new ObjectPoolManager(this);

        // Create Gem Texture (Small Diamond)
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.beginPath();
        graphics.moveTo(5, 0);
        graphics.lineTo(10, 5);
        graphics.lineTo(5, 10);
        graphics.lineTo(0, 5);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture('xp-gem', 10, 10);

        // Create Coin Texture (Yellow Circle with baked-in glow)
        graphics.clear();

        // 1. Draw several faint outer circles for a "soft glow" look (no postFX needed)
        // This is much faster than per-object shaders.
        for (let r = 10; r > 5; r--) {
            const alpha = (10 - r) * 0.05;
            graphics.fillStyle(0xffcc00, alpha);
            graphics.fillCircle(10, 10, r);
        }

        // 2. Main coin body
        graphics.fillStyle(0xffcc00, 1);
        graphics.fillCircle(10, 10, 5);

        // 3. Subtle inner highlight
        graphics.fillStyle(0xffffff, 0.4);
        graphics.fillCircle(10, 8, 2);

        // 4. Subtle rim
        graphics.lineStyle(1, 0x000000, 0.3);
        graphics.strokeCircle(10, 10, 5);

        graphics.generateTexture('coin', 20, 20);
        graphics.destroy();

        // Spark texture — used for enemy death burst particles
        const sparkGfx = this.add.graphics();
        sparkGfx.fillStyle(0xffffff);
        sparkGfx.fillCircle(4, 4, 4);
        sparkGfx.generateTexture('spark', 8, 8);
        sparkGfx.destroy();

        // ── DEATH SPARK EMITTER (Centralized) ────────────────────────────────
        this.deathSparkEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 60, max: 180 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 350,
            quantity: 10,
            blendMode: 'ADD',
            emitting: false,
        });
        this.deathSparkEmitter.setDepth(600);

        this.applyQualitySettings();

        // --- POST PROCESSING ---
        // Vignette — starts invisible; strength is driven by HP in update().
        // Gives a subtle border darkening at all times and pulses red at low HP.
        if (this.quality.postFXEnabled) {
            this.vignetteEffect = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.85, 0.15);
        }

        // Background: Map Generation with Variety
        // Set World Bounds
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Initialize Spatial Grid (Cell Size 150px)
        this.spatialGrid = new SpatialHashGrid(150);

        // Initialize Obstacles
        this.obstacles = this.physics.add.staticGroup();

        // Generate initial map (Level 1)
        this.regenerateMap(1);

        createAnimations(this);

        const player = this.physics.add.sprite(this.mapWidth / 2, this.mapHeight / 2, 'player-idle');
        player.setCollideWorldBounds(true);
        player.setScale(2);
        player.setBodySize(20, 15, true);
        player.setOffset(player.body!.offset.x, 33);
        player.setMass(2);
        player.play('player-idle');
        player.setPipeline('Light2D');

        this.playerShadow = this.add.sprite(player.x, player.y + 28, 'shadows', 0)
            .setAlpha(0.4)
            .setDepth(player.depth - 1);

        // Camera follow
        this.cameras.main.startFollow(player, true, 0.1, 0.1);

        // Attack Hitbox (invisible circle)
        this.attackHitbox = this.add.rectangle(0, 0, 60, 60, 0xff0000, 0) as any;
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body!.setCircle(30);
        this.attackHitbox.body!.setEnable(false);

        // Enemy Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true,
            maxSize: 100
        });

        // Boss Group (max 1 boss at a time)
        this.bossGroup = this.physics.add.group({
            classType: BossEnemy,
            runChildUpdate: true,
            maxSize: 1
        });

        // Arrow Group
        this.arrows = this.physics.add.group({
            classType: Arrow,
            runChildUpdate: true,
            maxSize: 50
        });

        // Fireball Group
        this.fireballs = this.physics.add.group({
            classType: Fireball,
            runChildUpdate: true,
            maxSize: 30
        });

        // Frost Bolt Group
        this.frostBolts = this.physics.add.group({
            classType: FrostBolt,
            runChildUpdate: true,
            maxSize: 20
        });

        // Lightning Bolt Group
        this.lightningBolts = this.physics.add.group({
            classType: LightningBolt,
            runChildUpdate: true,
            maxSize: 30
        });

        this.singularities = this.physics.add.group({
            classType: Singularity,
            runChildUpdate: true,
            maxSize: 10
        });

        this.eclipseWakes = this.physics.add.group({
            classType: EclipseWake,
            runChildUpdate: true,
            maxSize: 20
        });

        // Coin Group
        this.coins = this.physics.add.group({
            classType: Coin,
            runChildUpdate: true,
            maxSize: 5000
        });

        // Enemy Projectile Group
        this.enemyProjectiles = this.physics.add.group({
            classType: EnemyProjectile,
            runChildUpdate: true,
            maxSize: 50
        });

        this.players = this.physics.add.group();
        this.players.add(player);

        // Collisions
        this.physics.add.collider(player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.collider(player, this.obstacles);
        // Only host handles hard physical separation for enemies to avoid rubberbanding
        if (this.networkManager?.role !== 'client') {
            this.physics.add.collider(player, this.enemies);
            this.physics.add.collider(this.bossGroup, this.obstacles);
        }

        this.physics.add.collider(this.enemies, this.obstacles);
        this.physics.add.collider(player, this.bossGroup);

        this.physics.add.overlap(this.enemyProjectiles, this.players, (_projectile, _target) => {
            (_projectile as EnemyProjectile).onHitPlayer(_target);
        });

        this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
            const e = enemy as Enemy;
            if (this.networkManager?.role === 'client') {
                const now = Date.now();
                const lastReq = e.getData('lastHitRequest') || 0;
                if (now - lastReq > 250) { // Throttle client hit requests
                    e.setData('lastHitRequest', now);
                    this.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'hit_request',
                            data: {
                                enemyId: e.id,
                                hitX: this.attackHitbox.x,
                                hitY: this.attackHitbox.y,
                                damage: this.stats.damage
                            }
                        },
                        ts: this.networkManager.getServerTime()
                    });

                    // Client-side prediction (visual and physical)
                    e.predictDamage(this.stats.damage);
                    if (this.poolManager) {
                        this.poolManager.getDamageText(e.x, e.y - 30, this.stats.damage, '#ffcc00');
                        this.events.emit('enemy-hit'); // Sound
                    }
                }
            } else {
                e.takeDamage(this.stats.damage, '#ffcc00'); // Gold for physical
                e.pushback(player.x, player.y, this.stats.knockback);
            }
        });

        this.physics.add.overlap(this.attackHitbox, this.bossGroup, (_hitbox, boss) => {
            const b = boss as BossEnemy;
            if (this.networkManager?.role === 'client') {
                const now = Date.now();
                const lastReq = b.getData('lastHitRequest') || 0;
                if (now - lastReq > 250) {
                    b.setData('lastHitRequest', now);
                    this.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'hit_request',
                            data: {
                                enemyId: 'boss',
                                hitX: this.attackHitbox.x,
                                hitY: this.attackHitbox.y,
                                damage: this.stats.damage
                            }
                        },
                        ts: this.networkManager.getServerTime()
                    });

                    // Client-side prediction (visual only)
                    if (this.poolManager) {
                        this.poolManager.getDamageText(b.x, b.y - 30, this.stats.damage, '#ffcc00');
                        this.events.emit('enemy-hit');
                    }
                }
            } else {
                b.takeDamage(this.stats.damage, '#ffcc00');
                b.pushback(player.x, player.y, this.stats.knockback);
            }
        });

        // Player Hit Logic (Event-Driven)
        this.events.on('enemy-hit-player', (damage: number, _type: string, x?: number, y?: number, target?: any) => {
            const player = this.data.get('player');
            if (target === player) {
                // Local player takes damage
                this.combat.takePlayerDamage(damage, x, y);
            } else if (this.networkManager?.role === 'host') {
                // Remote player was hit. Host notifies the client.
                // Find Peer ID for the target sprite
                let targetPeerId: string | null = null;
                this.remotePlayers.forEach((sprite, peerId) => {
                    if (sprite === target) targetPeerId = peerId;
                });

                if (targetPeerId) {
                    this.networkManager.sendTo(targetPeerId, {
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'damage_player', data: { damage, x, y } },
                        ts: Date.now()
                    });
                }
            }
        });

        const cursors = this.input.keyboard?.createCursorKeys();

        this.wasd = this.input.keyboard?.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT
        }) as any;

        this.hotkeys = this.input.keyboard?.addKeys({
            '1': Phaser.Input.Keyboard.KeyCodes.ONE,
            '2': Phaser.Input.Keyboard.KeyCodes.TWO,
            '3': Phaser.Input.Keyboard.KeyCodes.THREE,
            '4': Phaser.Input.Keyboard.KeyCodes.FOUR,
            '5': Phaser.Input.Keyboard.KeyCodes.FIVE
        }) as any;

        this.input.mouse?.disableContextMenu();

        this.data.set('player', player);
        this.data.set('cursors', cursors);
        this.data.set('isAttacking', false);
        this.data.set('isBlocking', false);
        this.data.set('attackAnimIndex', 0);


        // Ghost Mode Events
        this.events.on('player-died', () => {
            const p = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
            p.setTint(0xaaaaff);
            p.setBlendMode(Phaser.BlendModes.ADD);
            p.setAlpha(0.6);
            if (this.playerLight) this.playerLight.setRadius(50);
            if (this.outerPlayerLight) this.outerPlayerLight.setRadius(100);
            if (this.poolManager) this.poolManager.getDamageText(p.x, p.y - 50, "GHOST", "#aaaaff");
        });

        this.events.on('local-player-revived', () => {
            const p = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
            p.clearTint();
            p.setBlendMode(Phaser.BlendModes.NORMAL);
            p.setAlpha(1.0);
            if (this.playerLight) this.playerLight.setRadius(200);
            if (this.outerPlayerLight) this.outerPlayerLight.setRadius(500);
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
        this.events.on('start-next-level', () => {
            this.waves.startLevel(this.registry.get('gameLevel') + 1);
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

        this.events.on('boss-died-collect-all', (x: number, y: number) => {
            this.waves.spawnBossCoins(x, y);
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
        this.events.on('enemy-fire-projectile', (x: number, y: number, angle: number, damage: number, type: 'arrow' | 'fireball') => {
            if (this.networkManager?.role === 'client') return; // Only host/singleplayer fires

            this.poolManager.getEnemyProjectile(x, y, angle, damage, type);
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
            if (target === player) {
                this.combat.takePlayerDamage(damage, x, y);
            } else if (this.networkManager?.role === 'host') {
                // Host validates and notifies client
                let targetPeerId: string | null = null;
                this.remotePlayers.forEach((sprite, peerId) => {
                    if (sprite === target) targetPeerId = peerId;
                });

                if (targetPeerId) {
                    this.networkManager.sendTo(targetPeerId, {
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'damage_player', data: { damage, x, y } },
                        ts: Date.now()
                    });
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

        // Initial Start
        this.waves.startLevel(1);

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

            // Schedule map regeneration after level complete delay
            this.time.delayedCall(1000, () => {
                this.regenerateMap(nextLevel);
            });
        });

        // Start Weather Effects
        this.weather.enableFog();
        this.weather.startRain();

        // If client, we might need to connect to host (handled in create())
        if (this.networkManager?.role === 'client') {
            // Handled via netConfig.hostPeerId in create()
        }
    }

    private applyQualitySettings() {
        // --- LIGHT SYSTEM ---
        const player = this.data ? this.data.get('player') as Phaser.Physics.Arcade.Sprite : null;

        if (this.quality.lightingEnabled) {
            this.lights.enable();
            this.lights.setAmbientColor(0x0a0a0a); // Near black edges — essential for atmosphere

            if (player) player.setPipeline('Light2D');
            if (this.enemies) this.enemies.children.iterate((e: any) => { e.setPipeline('Light2D'); return true; });
            if (this.bossGroup) this.bossGroup.children.iterate((e: any) => { e.setPipeline('Light2D'); return true; });
            if (this.currentMap) this.currentMap.setLightingEnabled(true);
            if (this.poolManager) this.poolManager.setLightingEnabled(true);
            if (this.enemyProjectiles) this.enemyProjectiles.children.iterate((p: any) => { p.setPipeline('Light2D'); return true; });

            // Re-create or re-enable lights if needed
            if (!this.playerLight) {
                this.playerLight = this.lights.addLight(0, 0, 200, 0xfffaf0, 0.7);
                this.outerPlayerLight = this.lights.addLight(0, 0, 500, 0xfffaf0, 0.4);
            } else {
                this.playerLight.setVisible(true);
                this.outerPlayerLight.setVisible(true);
            }
        } else {
            this.lights.disable();

            if (player) player.resetPipeline();
            if (this.enemies) this.enemies.children.iterate((e: any) => { e.resetPipeline(); return true; });
            if (this.bossGroup) this.bossGroup.children.iterate((e: any) => { e.resetPipeline(); return true; });
            if (this.currentMap) this.currentMap.setLightingEnabled(false);
            if (this.poolManager) this.poolManager.setLightingEnabled(false);
            if (this.enemyProjectiles) this.enemyProjectiles.children.iterate((p: any) => { p.resetPipeline(); return true; });

            if (this.playerLight) {
                this.playerLight.setVisible(false);
                this.outerPlayerLight.setVisible(false);
            }
        }

        // Post-FX Vignette
        if (this.vignetteEffect) {
            this.vignetteEffect.active = this.quality.postFXEnabled;
        }

        // Notify managers
        if (this.weather) this.weather.updateQuality(this.quality);
        if (this.ambient) this.ambient.updateQuality(this.quality);
    }

    private handleNetworkPacket(packet: SyncPacket, conn: DataConnection) {
        switch (packet.t) {
            case PacketType.PLAYER_SYNC:
                if (packet.p) this.updateRemotePlayer(packet.p, packet.ts);
                if (packet.ps) packet.ps.forEach(p => this.updateRemotePlayer(p, packet.ts));
                break;
            case PacketType.ENEMY_SYNC:
                // Only clients receive this from host
                if (this.networkManager?.role === 'client' && packet.es) {
                    this.waves.syncEnemies(packet.es, packet.ts);
                }
                break;
            case PacketType.GAME_EVENT:
                if (packet.ev) {
                    if (packet.ev.type === 'hit_request' && this.networkManager?.role === 'host') {
                        // Host validates the hit using Lag Compensation (Rewind)
                        const req = packet.ev.data;
                        let enemy: Enemy | BossEnemy | null = null;

                        if (req.enemyId === 'boss') {
                            enemy = this.bossGroup.getFirstAlive() as BossEnemy;
                        } else {
                            enemy = this.waves.findEnemyById(req.enemyId);
                        }

                        if (enemy && enemy.active && !enemy.getData('isDead')) { // Using isDead getter safely
                            const historicalPos = enemy.getHistoricalPosition(packet.ts);
                            if (historicalPos) {
                                const dist = Phaser.Math.Distance.Between(historicalPos.x, historicalPos.y, req.hitX, req.hitY);
                                // The player's attack hitbox radius is 50. Allow 70px for precision grace.
                                if (dist <= 70) {
                                    console.log(`[Host] Validated client hit on ${req.enemyId} at lag ${this.networkManager.getServerTime() - packet.ts}ms. Distance: ${dist}`);
                                    enemy.takeDamage(req.damage, '#ffcc00');

                                    // Remote player pushback source
                                    const remoteSprite = this.remotePlayers.get(conn.peer);
                                    if (remoteSprite) {
                                        enemy.pushback(remoteSprite.x, remoteSprite.y, this.stats.knockback);
                                    }
                                } else {
                                    console.warn(`[Host] Rejected client hit on ${req.enemyId}. Distance ${dist} too far at historical time.`);
                                }
                            }
                        }
                        break; // Do not broadcast hit_requests
                    }

                    if (packet.ev.type === 'projectile_hit_request' && this.networkManager?.role === 'host') {
                        const req = packet.ev.data;
                        const enemy = this.waves.findEnemyById(req.targetId) || (req.targetId === 'boss' ? this.bossGroup.getFirstAlive() as any : null);

                        if (enemy && enemy.active && !enemy.getData('isDead')) {
                            const historicalPos = enemy.getHistoricalPosition(req.timestamp || packet.ts);
                            if (historicalPos) {
                                const dist = Phaser.Math.Distance.Between(historicalPos.x, historicalPos.y, req.hitX, req.hitY);
                                // Projectile hitbox grace: 60px base + 40px lag grace
                                if (dist <= 100) {
                                    console.log(`[Host] Validated client ${req.projectileType} hit on ${req.targetId} at lag ${this.networkManager.getServerTime() - (req.timestamp || packet.ts)}ms. Distance: ${dist}`);
                                    enemy.takeDamage(req.damage, req.projectileType === 'frost' ? '#00aaff' : '#ffcc00');

                                    if (req.projectileType === 'frost' && req.isSlow) {
                                        enemy.applySlow(req.slowDuration);
                                    }

                                    // Apply pushback from impact point
                                    enemy.pushback(req.hitX, req.hitY, 150);
                                } else {
                                    console.warn(`[Host] Rejected client ${req.projectileType} hit on ${req.targetId}. Distance ${dist} too far.`);
                                }
                            }
                        }
                        break;
                    }

                    this.handleGameEvent(packet.ev);
                    // Relay to all if host
                    if (this.networkManager?.role === 'host') {
                        this.networkManager.broadcast(packet);
                    }
                }
                break;
            case PacketType.GAME_STATE:
                if (packet.gs) {
                    this.registry.set('gameLevel', packet.gs.level);
                    this.registry.set('currentWave', packet.gs.wave);
                    this.registry.set('isBossActive', packet.gs.isBossActive);
                    if (packet.gs.bossIndex !== undefined) {
                        this.registry.set('bossComingUp', packet.gs.bossIndex);
                    }
                }
                break;
        }
    }

    private updateRemotePlayer(p: PackedPlayer, ts: number) {
        const [id, px, py, _anim, _flipX, _hp, _weapon, name] = p;

        // Use the registry peer ID (not private NetworkManager.peer) to skip ourselves
        const myId = this.game.registry.get('networkConfig')?.peer.id;
        if (id === myId) return;

        let remotePlayer = this.remotePlayers.get(id);
        if (!remotePlayer) {
            remotePlayer = this.physics.add.sprite(px, py, 'player-idle');
            remotePlayer.setScale(2);
            remotePlayer.setDepth(100);
            this.remotePlayers.set(id, remotePlayer);
            this.players.add(remotePlayer);

            // Add nickname tag
            const label = this.add.text(px, py - 40, name || 'Spiller', {
                fontSize: '12px',
                fontFamily: 'Alagard',
                color: '#ffffff',
                backgroundColor: '#00000088',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(101);
            this.playerNicknames.set(id, label);
        }

        // Push to JitterBuffer instead of applying instantly
        let buffer = this.playerBuffers.get(id);
        if (!buffer) {
            buffer = new JitterBuffer<PackedPlayer>(30);
            this.playerBuffers.set(id, buffer);
        }
        buffer.push(ts, p);

        // Cache latest packet so host can relay it to other clients
        this.remotePlayerPackets.set(id, p);
    }

    private handleGameEvent(event: any) {
        if (event.type === 'attack') {
            const { id, weapon, angle, anim } = event.data;
            if (id === this.game.registry.get('networkConfig')?.peer.id) return;

            const remoteSprite = this.remotePlayers.get(id);
            if (remoteSprite) {
                remoteSprite.play(anim);

                // Spawn projectile for remote player if needed
                if (weapon === 'bow') {
                    const arrow = this.arrows.get(remoteSprite.x, remoteSprite.y) as Arrow;
                    if (arrow) {
                        arrow.fire(remoteSprite.x, remoteSprite.y, angle, 10, 700, 0, 0);
                    }
                } else if (weapon === 'fire') {
                    const fireball = this.fireballs.get(remoteSprite.x, remoteSprite.y) as Fireball;
                    if (fireball) fireball.fire(remoteSprite.x, remoteSprite.y, angle, 15);
                } else if (weapon === 'frost') {
                    const bolt = this.frostBolts.get(remoteSprite.x, remoteSprite.y) as FrostBolt;
                    if (bolt) {
                        const targetX = remoteSprite.x + Math.cos(angle) * 200;
                        const targetY = remoteSprite.y + Math.sin(angle) * 200;
                        bolt.fire(remoteSprite.x, remoteSprite.y, targetX, targetY, 12);
                    }
                } else if (weapon === 'lightning') {
                    const bolt = this.lightningBolts.get(remoteSprite.x, remoteSprite.y) as LightningBolt;
                    if (bolt) {
                        const targetX = remoteSprite.x + Math.cos(angle) * 300;
                        const targetY = remoteSprite.y + Math.sin(angle) * 300;
                        bolt.fire(remoteSprite.x, remoteSprite.y, targetX, targetY, 20, 1);
                    }
                }
            }
        } else if (event.type === 'party_dead') {
            this.registry.set('partyDead', true);
            this.events.emit('party_dead');
        } else if (event.type === 'restart_game') {
            this.restartGame();
        } else if (event.type === 'revive_request') {
            const { targetId } = event.data;
            if (this.networkManager?.role === 'host') {
                this.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'player_revived', data: { targetId } },
                    ts: Date.now()
                });
                // Handle locally immediately for the host
                this.handleGameEvent({ type: 'player_revived', data: { targetId } } as any);
            }
        } else if (event.type === 'player_revived') {
            const { targetId } = event.data;

            // Increment the cost multiplier across all clients synced via this event
            const currentReviveCount = this.registry.get('reviveCount') || 0;
            this.registry.set('reviveCount', currentReviveCount + 1);

            const isLocal = targetId === this.networkManager?.peerId || !this.networkManager?.role;
            if (isLocal) {
                this.events.emit('local-player-revived');
            } else {
                const remoteSprite = this.remotePlayers.get(targetId);
                if (remoteSprite) {
                    remoteSprite.clearTint();
                    remoteSprite.setBlendMode(Phaser.BlendModes.NORMAL);
                    remoteSprite.setAlpha(1.0);
                }
            }
        } else if (event.type === 'spawn_enemy_projectile') {
            const { x, y, angle, damage, type } = event.data;
            if (this.networkManager?.role === 'client') {
                const proj = this.poolManager.getEnemyProjectile(x, y, angle, damage, type);
                this.enemyProjectiles.add(proj);
            }
        } else if (event.type === 'spawn_coins') {
            const { x, y, count, coins } = event.data;
            const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;

            if (coins && Array.isArray(coins)) {
                coins.forEach((cData: any) => {
                    const coin = this.coins.get(cData.x, cData.y) as Coin;
                    if (coin) {
                        coin.spawn(cData.x, cData.y, player, cData.id);
                        coin.removeAllListeners('collected');
                        this.setupCoinCollection(coin);
                    }
                });
            } else {
                // Fallback for older packet versions
                for (let i = 0; i < count; i++) {
                    const coin = this.coins.get(x, y) as Coin;
                    if (coin) {
                        coin.spawn(x, y, player);
                        coin.removeAllListeners('collected');
                        this.setupCoinCollection(coin);
                    }
                }
            }
        } else if (event.type === 'coin_collect') {
            const { amount, x, y, id } = event.data;
            // Host acts as authority on total gold
            if (this.networkManager?.role === 'host') {
                this.stats.addCoins(amount);
            } else {
                // Client receives this from Host (via relay)
                this.stats.addCoins(amount);
            }

            // Visually remove the coin. Priority: ID match, Fallback: Proximity
            let removed = false;
            this.coins.children.iterate((c: any) => {
                if (c.active && id && c.id === id) {
                    c.setActive(false);
                    c.setVisible(false);
                    if (c.body) c.body.enable = false;
                    removed = true;
                    return false;
                }
                return true;
            });

            if (!removed && x !== undefined && y !== undefined) {
                this.coins.children.iterate((c: any) => {
                    // Increased radius to 150 to account for drift/lag in coin movement
                    if (c.active && Phaser.Math.Distance.Between(c.x, c.y, x, y) < 150) {
                        c.setActive(false);
                        c.setVisible(false);
                        if (c.body) c.body.enable = false;
                        return false;
                    }
                    return true;
                });
            }
        } else if (event.type === 'enemy_death') {
            const { id } = event.data;
            const enemy = this.waves.findEnemyById(id) || (id === 'boss' ? this.bossGroup.getFirstAlive() as any : null);
            if (enemy) {
                if (enemy.die) {
                    enemy.die();
                } else {
                    enemy.disable();
                }
            } else {
                // Buffer the death so it applies if logic spawns it later from an old unreliable packet
                this.pendingDeaths.add(id);
            }
        } else if (event.type === 'damage_player') {
            // Client receives damage from Host authority
            const { damage, x, y } = event.data;
            this.combat.takePlayerDamage(damage, x, y);
        } else if (event.type === 'level_complete') {
            const { nextLevel } = event.data;
            if (this.networkManager?.role === 'client') {
                // Clients follow host authority on level completion
                this.registry.set('gameLevel', nextLevel - 1); // Set current before increment in event
                this.events.emit('level-complete');
            }
        } else if (event.type === 'sync_pause') {
            this.events.emit('sync_pause', event.data);
        } else if (event.type === 'player_loaded') {
            this.events.emit('player_loaded', event.data);
        } else if (event.type === 'player_ready') {
            this.events.emit('player_ready', event.data);
        } else if (event.type === 'start_level') {
            this.events.emit('start_level', event.data);
        } else if (event.type === 'resume_game') {
            this.events.emit('resume_game', event.data);
        } else if (event.type === 'sync_players_state') {
            this.events.emit('sync_players_state', event.data);
        } else if (event.type === 'enemy_heal') {
            // Client-side visual sync for healing
            const { targetId, amount } = event.data;
            const target = this.waves.findEnemyById(targetId);
            if (target) {
                target.hp += amount;

                // Spawn effect on client
                const effect = this.add.sprite(target.x, target.y, 'heal_effect');
                effect.setDepth(target.depth + 1);
                effect.setScale(target.scale * 1.5);
                effect.play('heal-effect-anim');
                effect.on('animationcomplete', () => effect.destroy());

                this.poolManager.getDamageText(target.x, target.y - 40, `+${Math.round(amount)}`, '#55ff55');

                target.setTint(0xccffcc);
                this.time.delayedCall(500, () => {
                    if (target.active && !target.getIsDead()) target.clearTint();
                });
            }
        }
    }

    private setupCoinCollection(coin: Coin) {
        coin.on('collected', () => {
            // If client picks up, tell host (host handles the central score)
            if (this.networkManager?.role === 'client') {
                this.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'coin_collect', data: { amount: 1, x: coin.x, y: coin.y, id: coin.id } },
                    ts: Date.now()
                });
            } else {
                // Host picked up locally
                this.stats.addCoins(1);
            }
            AudioManager.instance.playSFX('coin_collect');
        });
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
        // Clean up old map
        if (this.currentMap) {
            this.currentMap.destroy();
        }

        // Select map definition (capped at last entry)
        const mapIndex = Math.min(level - 1, STATIC_MAPS.length - 1);
        const mapDef = STATIC_MAPS[mapIndex];

        // Load static map – no procedural generation, instant
        this.currentMap = new StaticMapLoader(this, this.obstacles, this.mapWidth, this.mapHeight);
        this.currentMap.load(mapDef);

        // Swap ambient particle theme to match the new level
        this.ambient.setTheme(level);

        this.events.emit('map-ready', { level });
    }

    update(_time: number, delta: number) {
        // Cap delta time (max 100ms) to prevent physics "tunneling" after stutters
        const cappedDelta = Math.min(delta, 100);
        this.poolManager.update(cappedDelta);

        // Update Effect Groups
        this.singularities.children.iterate((s: any) => {
            if (s.active) s.update(_time, delta);
            return true;
        });
        this.eclipseWakes.children.iterate((w: any) => {
            if (w.active) w.update(_time, delta);
            return true;
        });
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (this.playerShadow) {
            this.playerShadow.setPosition(player.x, player.y + 28);
        }

        // --- Iterating Remote Players for dead reckoning updates ---
        // Use cappedDelta for render time calculation if necessary, but interpolation usually uses absolute time.
        // We'll keep renderTime as is, but ensure cappedDelta is "used" by being part of the game loop logic.
        const renderTime = this.networkManager ? this.networkManager.getServerTime() - 100 : Date.now();

        this.remotePlayers.forEach((remotePlayer, id) => {
            const buffer = this.playerBuffers.get(id);
            if (buffer) {
                const sample = buffer.sample(renderTime);
                if (sample) {
                    const pPrev = sample.prev.state;
                    const pNext = sample.next.state;
                    const f = sample.factor;

                    // Interpolate X and Y
                    const x = pPrev[1] + (pNext[1] - pPrev[1]) * f;
                    const y = pPrev[2] + (pNext[2] - pPrev[2]) * f;

                    // Hard Snapping (Resilience): If distance is too large, log it
                    const dist = Phaser.Math.Distance.Between(remotePlayer.x, remotePlayer.y, x, y);
                    if (dist > 300) {
                        console.warn(`[Desync] Hard snapping remote player ${id} (dist: ${Math.round(dist)}px)`);
                    }
                    remotePlayer.setPosition(x, y);

                    // Use discrete state (animation/flip) from the active nearest boundary
                    const activeState = f > 0.5 ? pNext : pPrev;
                    const anim = activeState[3];
                    const flipX = activeState[4];
                    const hp = activeState[5];

                    if (hp <= 0) {
                        remotePlayer.setTint(0xaaaaff);
                        remotePlayer.setBlendMode(Phaser.BlendModes.ADD);
                        remotePlayer.setAlpha(0.6);
                    } else {
                        remotePlayer.clearTint();
                        remotePlayer.setBlendMode(Phaser.BlendModes.NORMAL);
                        remotePlayer.setAlpha(1.0);
                    }

                    if (remotePlayer.anims.currentAnim?.key !== anim) {
                        remotePlayer.play(anim);
                    }
                    remotePlayer.setFlipX(flipX === 1);
                }
            }

            const label = this.playerNicknames.get(id);
            if (label) label.setPosition(remotePlayer.x, remotePlayer.y - 40);
        });

        // Update Light Positions based on player
        const playerHP = this.registry.get('playerHP') as number;
        const playerMaxHP = this.registry.get('playerMaxHP') as number;
        const hpPercent = playerHP / playerMaxHP;

        if (this.quality.lightingEnabled) {
            this.playerLight.setPosition(player.x, player.y);
            this.outerPlayerLight.setPosition(player.x, player.y);
        }

        // --- VIGNETTE & LOW HP Pulsing ---
        if (this.quality.postFXEnabled && this.vignetteEffect) {
            // Below 30 % HP the vignette pulses with increasing intensity, giving a
            // clear "danger" signal without interrupting gameplay.
            if (playerMaxHP > 0) {
                const ratio = hpPercent;
                if (ratio < 0.3) {
                    // Pulse strength between 0.30 and 0.75, speed scales with danger
                    const urgency = 1 + (0.3 - ratio) * 5; // faster at lower HP
                    const pulse = (Math.sin(this.time.now / (380 / urgency)) + 1) * 0.5;
                    this.vignetteEffect.strength = 0.30 + pulse * 0.45;
                } else {
                    // Smoothly return to the resting strength (0.15)
                    const target = 0.15;
                    const diff = this.vignetteEffect.strength - target;
                    if (Math.abs(diff) > 0.005) {
                        this.vignetteEffect.strength -= diff * 0.08;
                    } else {
                        this.vignetteEffect.strength = target;
                    }
                }
            }
        }
        // ────────────────────────────────────────────────────────────────────
        const cursors = this.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
        const isAttacking = this.data.get('isAttacking') as boolean;
        const pointer = this.input.activePointer;
        let speed = this.stats.speed;

        // Update Spatial Grid
        this.spatialGrid.clear();
        this.enemies.children.iterate((enemy: any) => {
            if (enemy.active && !enemy.isDead) {
                this.spatialGrid.insert({
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.body?.width || 40,
                    height: enemy.body?.height || 40,
                    id: (enemy as any).id,
                    ref: enemy
                });
            }
            return true;
        });
        // Include active boss in spatial grid so regular enemies avoid it
        this.bossGroup.children.iterate((boss: any) => {
            if (boss.active && !boss.isDead) {
                this.spatialGrid.insert({
                    x: boss.x,
                    y: boss.y,
                    width: boss.body?.width || 80,
                    height: boss.body?.height || 80,
                    id: 'boss',
                    ref: boss
                });
            }
            return true;
        });

        // --- Handle Dash (Shift) ---
        const dashState = this.registry.get('dashState') || { isActive: false, readyAt: 0 };
        let hp = this.registry.get('playerHP') || 0;
        if (this.wasd?.SHIFT?.isDown && hp > 0 && Date.now() >= dashState.readyAt && !this.data.get('isDashing')) {
            const dashCooldown = this.registry.get('dashCooldown') || 7000;
            const dashDistance = this.registry.get('dashDistance') || 220;
            const dashDuration = GAME_CONFIG.PLAYER.DASH_DURATION_MS;

            this.data.set('isDashing', true);
            this.registry.set('dashState', { isActive: true, readyAt: Date.now() + dashCooldown });

            // INTERRUPT CURRENT ACTIONS
            if (isAttacking) {
                this.data.set('isAttacking', false);
                player.anims.stop(); // Stop the attack animation immediately
                // Remove all once-listeners for animationcomplete to avoid stale state resets
                player.off('animationcomplete-player-attack');
                player.off('animationcomplete-player-attack-2');
                player.off('animationcomplete-player-bow');
                player.off('animationcomplete-player-cast');
            }
            if (this.data.get('isBlocking')) {
                this.data.set('isBlocking', false);
                player.clearTint();
            }

            // Invincibility
            this.combat.setDashIframe(true);

            // Determine direction
            let dx = 0;
            let dy = 0;
            if (this.wasd.W.isDown) dy -= 1;
            if (this.wasd.S.isDown) dy += 1;
            if (this.wasd.A.isDown) dx -= 1;
            if (this.wasd.D.isDown) dx += 1;

            if (dx === 0 && dy === 0) {
                // Dash towards mouse if stationary
                const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
                dx = Math.cos(angle);
                dy = Math.sin(angle);
            } else {
                // Normalize WASD vector
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }

            // Visuals
            player.play('player-walk'); // or specific dash anim if we had one
            player.setAlpha(0.7);
            this.events.emit('player-dash');

            // Dash Visual Effect
            const dashFx = this.add.sprite(player.x, player.y, 'dash_effect');
            dashFx.setDepth(player.depth + 1);
            dashFx.setScale(2);
            dashFx.play('player-dash-effect', true);

            // Movement via Tween for precision
            this.tweens.add({
                targets: player,
                x: player.x + dx * dashDistance,
                y: player.y + dy * dashDistance,
                duration: dashDuration,
                ease: 'Cubic.out',
                onUpdate: () => {
                    if (dashFx.active) {
                        dashFx.setPosition(player.x, player.y);
                    }
                },
                onComplete: () => {
                    this.data.set('isDashing', false);
                    player.setAlpha(1);
                    if (dashFx.active) {
                        dashFx.destroy();
                    }
                    this.combat.setDashIframe(false);
                    player.play('player-idle');

                    // Lifesteal upgrade effect
                    const heal = this.stats.getDashLifestealHP();
                    if (heal > 0) {
                        const curHP = this.registry.get('playerHP');
                        const maxHP = this.registry.get('playerMaxHP');
                        this.registry.set('playerHP', Math.min(maxHP, curHP + heal));
                        this.poolManager.getDamageText(player.x, player.y - 40, `+${heal}`, "#55ff55");
                    }
                }
            });

            return;
        }

        if (isAttacking || this.combat.isKnockedBack || this.data.get('isDashing')) {
            if (isAttacking || this.data.get('isDashing')) {
                // Keep movement during dash handled by tween, but block WASD
                if (isAttacking) player.setVelocity(0, 0);
            }
            return;
        }


        // Handle Weapon Switching
        const unlocked = this.registry.get('unlockedWeapons') || ['sword'];
        if (this.hotkeys['1']?.isDown && this.registry.get('currentWeapon') !== 'sword' && unlocked.includes('sword')) {
            this.registry.set('currentWeapon', 'sword');
        }
        if (this.hotkeys['2']?.isDown && this.registry.get('currentWeapon') !== 'bow' && unlocked.includes('bow')) {
            this.registry.set('currentWeapon', 'bow');
        }
        if (this.hotkeys['3']?.isDown && this.registry.get('currentWeapon') !== 'fireball' && unlocked.includes('fireball')) {
            this.registry.set('currentWeapon', 'fireball');
        }
        if (this.hotkeys['4']?.isDown && this.registry.get('currentWeapon') !== 'frost' && unlocked.includes('frost')) {
            this.registry.set('currentWeapon', 'frost');
        }
        if (this.hotkeys['5']?.isDown && this.registry.get('currentWeapon') !== 'lightning' && unlocked.includes('lightning')) {
            this.registry.set('currentWeapon', 'lightning');
        }

        // Handle Orientation (Face Mouse)
        if (pointer.worldX > player.x) {
            player.setFlipX(false);
        } else if (pointer.worldX < player.x) {
            player.setFlipX(true);
        }

        // Handle Block (Right Click)
        const blockPressed = pointer.rightButtonDown();
        if (blockPressed) {
            this.data.set('isBlocking', true);
            speed = 80; // Walk slow while blocking
            player.setTint(0x3b82f6); // Visual feedback for blocking
        } else {
            if (this.data.get('isBlocking')) {
                player.clearTint();
            }
            this.data.set('isBlocking', false);
        }

        // Update attack hitbox position based on mouse angle (360 degrees)
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        const radius = 50; // Reach from body center
        this.attackHitbox.setPosition(
            player.x + Math.cos(angle) * radius,
            player.y + Math.sin(angle) * radius
        );
        this.attackHitbox.setRotation(angle);

        // Handle Attack (Left Click or Spacebar)
        const spacePressed = this.wasd?.SPACE?.isDown;
        hp = this.registry.get('playerHP') || 0;
        if (hp > 0 && (pointer.leftButtonDown() || spacePressed) && !blockPressed) {
            const lastCd = this.registry.get('weaponCooldown');
            if (lastCd && Date.now() < lastCd.timestamp + lastCd.duration) {
                return;
            }

            const currentWeapon = this.registry.get('currentWeapon');
            this.data.set('isAttacking', true);

            // Safety valve: if the animationcomplete event somehow never fires (e.g. missing
            // animation key), this hard-clears isAttacking so movement can never be permanently locked.
            this.time.delayedCall(1500, () => {
                if (this.data.get('isAttacking')) {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                }
            });

            if (currentWeapon === 'sword') {
                const attackSpeedMult = this.registry.get('playerAttackSpeed') || 1;
                const swordCooldown = GAME_CONFIG.WEAPONS.SWORD.cooldown / attackSpeedMult;

                const ATTACK_ANIMS = ['player-attack', 'player-attack-2'];
                const idx = this.data.get('attackAnimIndex') as number;
                const attackAnimKey = ATTACK_ANIMS[idx];
                this.data.set('attackAnimIndex', (idx + 1) % ATTACK_ANIMS.length);

                this.registry.set('weaponCooldown', { duration: swordCooldown, timestamp: Date.now() });

                player.play(attackAnimKey);
                this.events.emit('player-swing');

                // SYNC ATTACK
                this.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'attack',
                        data: {
                            id: this.game.registry.get('networkConfig')?.peer.id,
                            weapon: 'sword',
                            anim: attackAnimKey,
                            angle: angle
                        }
                    },
                    ts: Date.now()
                });

                // Enable hitbox during middle of animation
                this.time.delayedCall(Math.max(100, swordCooldown * 0.3), () => {
                    this.attackHitbox.body!.setEnable(true);
                    this.time.delayedCall(100, () => {
                        this.attackHitbox.body!.setEnable(false);
                    });
                });

                player.once(`animationcomplete-${attackAnimKey}`, () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });

                // ECLIPSE STRIKE
                const eclipseLevel = this.registry.get('playerEclipseLevel') || 0;
                if (eclipseLevel > 0) {
                    const wake = this.eclipseWakes.get(player.x, player.y) as EclipseWake;
                    if (wake) {
                        const wakeDamage = this.stats.damage * 0.3 * eclipseLevel;
                        wake.spawn(player.x, player.y, angle, wakeDamage);
                    }
                }
            } else if (currentWeapon === 'bow') {
                const bowCooldown = this.stats.playerCooldown;
                this.registry.set('weaponCooldown', { duration: bowCooldown, timestamp: Date.now() });
                player.play('player-bow');

                // Spawn arrow during animation
                this.time.delayedCall(bowCooldown * 0.5, () => {
                    // Read arrow upgrade stats
                    const arrowDamageMultiplier = this.registry.get('playerArrowDamageMultiplier') || 1;
                    const arrowSpeed = this.registry.get('playerArrowSpeed') || GAME_CONFIG.WEAPONS.BOW.speed;
                    const pierceCount = this.registry.get('playerPierceCount') || 0;
                    const explosiveLevel = this.registry.get('playerExplosiveLevel') || 0;

                    const baseDamage = this.stats.damage * GAME_CONFIG.WEAPONS.BOW.damageMult * arrowDamageMultiplier;
                    const singularityLevel = this.registry.get('playerSingularityLevel') || 0;

                    const arrow = this.arrows.get(player.x, player.y) as Arrow;
                    if (arrow) {
                        arrow.fire(player.x, player.y, angle, baseDamage, arrowSpeed, pierceCount, explosiveLevel, singularityLevel);
                        this.events.emit('bow-shot');

                        // SYNC BOW ATTACK
                        this.networkManager?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: {
                                type: 'attack',
                                data: {
                                    id: this.game.registry.get('networkConfig')?.peer.id,
                                    weapon: 'bow',
                                    anim: 'player-bow',
                                    angle: angle
                                }
                            },
                            ts: Date.now()
                        });

                        // Multishot logic (Cone)
                        const projectiles = this.registry.get('playerProjectiles') || 1;
                        if (projectiles > 1) {
                            for (let i = 1; i < projectiles; i++) {
                                // Alternating sides: +10deg, -10deg, +20deg...
                                const offset = Math.ceil(i / 2) * 10 * (Math.PI / 180) * (i % 2 === 0 ? -1 : 1);
                                const subArrow = this.arrows.get(player.x, player.y) as Arrow;
                                if (subArrow) {
                                    subArrow.fire(player.x, player.y, angle + offset, baseDamage, arrowSpeed, pierceCount, explosiveLevel);
                                }
                            }
                        }
                    }
                });

                player.once('animationcomplete-player-bow', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'fireball') {
                const fireCd = GAME_CONFIG.WEAPONS.FIREBALL.cooldown;
                this.registry.set('weaponCooldown', { duration: fireCd, timestamp: Date.now() });
                player.play('player-bow'); // Uses bow animation for casting too
                this.events.emit('fireball-cast');

                this.time.delayedCall(100, () => {
                    const fireball = this.fireballs.get(player.x, player.y) as Fireball;
                    if (fireball) {
                        const fireDmgMult = this.registry.get('fireballDamageMulti') || 1;
                        fireball.fire(player.x, player.y, angle, this.stats.damage * GAME_CONFIG.WEAPONS.FIREBALL.damageMult * fireDmgMult);
                        this.events.emit('fireball-cast');

                        // SYNC FIRE ATTACK
                        this.networkManager?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: {
                                type: 'attack',
                                data: {
                                    id: this.game.registry.get('networkConfig')?.peer.id,
                                    weapon: 'fire',
                                    anim: 'player-cast',
                                    angle: angle
                                }
                            },
                            ts: Date.now()
                        });
                    }
                });

                player.once('animationcomplete-player-bow', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'frost') {
                const frostCd = GAME_CONFIG.WEAPONS.FROST.cooldown;
                this.registry.set('weaponCooldown', { duration: frostCd, timestamp: Date.now() });
                player.play('player-cast');

                // Capture mouse world position at cast time
                const frostTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const frostBolt = this.frostBolts.get(player.x, player.y) as FrostBolt;
                    if (frostBolt) {
                        const frostDmgMult = this.registry.get('frostDamageMulti') || 1;
                        frostBolt.fire(player.x, player.y, frostTarget.x, frostTarget.y, this.stats.damage * GAME_CONFIG.WEAPONS.FROST.damageMult * frostDmgMult);
                        this.events.emit('frost-cast');

                        // SYNC FROST ATTACK
                        this.networkManager?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: {
                                type: 'attack',
                                data: {
                                    id: this.game.registry.get('networkConfig')?.peer.id,
                                    weapon: 'frost',
                                    anim: 'player-cast',
                                    angle: angle
                                }
                            },
                            ts: Date.now()
                        });
                    }
                });

                player.once('animationcomplete-player-cast', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'lightning') {
                const ltgCd = GAME_CONFIG.WEAPONS.LIGHTNING.cooldown;
                this.registry.set('weaponCooldown', { duration: ltgCd, timestamp: Date.now() });
                player.play('player-cast');
                this.events.emit('lightning-cast');

                // Get target position from mouse
                const ltTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const dmgMult = this.registry.get('lightningDamageMulti') || 1;
                    const bounces = this.registry.get('lightningBounces') || GAME_CONFIG.WEAPONS.LIGHTNING.bounces;
                    const baseDamage = this.stats.damage * GAME_CONFIG.WEAPONS.LIGHTNING.damageMult * dmgMult;
                    const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, ltTarget.x, ltTarget.y);

                    const bolt = this.lightningBolts.get(player.x, player.y) as LightningBolt;
                    if (bolt) {
                        bolt.fire(player.x, player.y, ltTarget.x, ltTarget.y, baseDamage, bounces, new Set(), baseAngle);
                    }

                    // SYNC LIGHTNING ATTACK
                    this.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'attack',
                            data: {
                                id: this.game.registry.get('networkConfig')?.peer.id,
                                weapon: 'lightning',
                                anim: 'player-cast',
                                angle: angle
                            }
                        },
                        ts: Date.now()
                    });
                });

                player.once('animationcomplete-player-cast', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            }
            return;
        }

        let vx = 0;
        let vy = 0;

        // WASD Movement
        if (this.wasd?.A?.isDown || cursors?.left?.isDown) {
            vx = -speed;
        } else if (this.wasd?.D?.isDown || cursors?.right?.isDown) {
            vx = speed;
        }

        if (this.wasd?.W?.isDown || cursors?.up?.isDown) {
            vy = -speed;
        } else if (this.wasd?.S?.isDown || cursors?.down?.isDown) {
            vy = speed;
        }

        player.setVelocity(vx, vy);

        // Enemy Damage Detection MOVED TO PHYSICS OVERLAP

        if (vx !== 0 || vy !== 0) {
            if (player.anims.currentAnim?.key !== 'player-walk') {
                player.play('player-walk');
            }
            // Footstep audio (throttled)
            const now = this.time.now;
            if (now - this.lastFootstepTime > 250) {
                this.lastFootstepTime = now;
                AudioManager.instance.playSFX('footstep');
            }
        } else {
            if (player.anims.currentAnim?.key !== 'player-idle') {
                player.play('player-idle');
            }
        }

    }

    private networkTick() {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !this.networkManager) return;

        const now = this.networkManager.getServerTime();
        const myId = this.game.registry.get('networkConfig')?.peer.id || 'unknown';

        // Reuse localPackedPlayer buffer to eliminate per-tick allocation
        this.localPackedPlayer[0] = myId;
        this.localPackedPlayer[1] = Math.round(player.x);
        this.localPackedPlayer[2] = Math.round(player.y);
        this.localPackedPlayer[3] = player.anims.currentAnim?.key || 'player-idle';
        this.localPackedPlayer[4] = player.flipX ? 1 : 0;
        this.localPackedPlayer[5] = this.registry.get('playerHP');
        this.localPackedPlayer[6] = this.registry.get('currentWeapon');
        this.localPackedPlayer[7] = this.registry.get('nickname');

        const playerPacket = this.localPackedPlayer;

        if (this.networkManager.role === 'host') {
            this.networkTickCount++;
            const forceFullSync = this.networkTickCount % 20 === 0;
            const playersToSync: PackedPlayer[] = [];

            const processPlayer = (p: PackedPlayer) => {
                const id = p[0];
                // [id, x, y, anim, flip, hp, weapon, name]
                const stateStr = `${p[1]},${p[2]},${p[3]},${p[4]},${p[5]},${p[6]}`;
                const lastState = this.lastSentPlayerStates.get(id);

                if (forceFullSync || lastState !== stateStr) {
                    this.lastSentPlayerStates.set(id, stateStr);
                    playersToSync.push(p);
                }
            };

            // Sync partyState to registry for the UI (FantasyBook Revive)
            const partyState = [
                { id: myId, name: this.registry.get('nickname') || 'Host', isDead: this.registry.get('playerHP') <= 0 }
            ];
            this.remotePlayerPackets.forEach((rp, remoteId) => {
                partyState.push({ id: remoteId, name: rp[7] || 'Spiller', isDead: rp[5] <= 0 });
            });
            this.registry.set('partyState', partyState);

            // Check for party death
            const allDead = partyState.every(p => p.isDead);
            if (allDead && partyState.length > 0 && !this.registry.get('partyDead')) {
                this.registry.set('partyDead', true);
                this.events.emit('party_dead');
                this.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'party_dead', data: {} },
                    ts: now
                });
                console.log("[Host] Whole party is dead! Broadcasting party_dead.");
            }

            // Process local player
            processPlayer(playerPacket);
            // Process remote players
            this.remotePlayerPackets.forEach(p => processPlayer(p));

            if (playersToSync.length > 0) {
                this.networkManager.broadcast(BinaryPacker.packPlayers(playersToSync, now));
            }

            const enemies = this.waves.getEnemySyncData();
            if (enemies.length > 0) {
                this.networkManager.broadcast(BinaryPacker.packEnemies(enemies, now));
            }

            // Periodic Game State Sync (Throatled to 1 per second to save bandwidth)
            if (now - this.lastSyncTime > 1000) {
                this.lastSyncTime = now;
                this.networkManager.broadcast({
                    t: PacketType.GAME_STATE,
                    gs: {
                        level: this.registry.get('gameLevel'),
                        wave: this.registry.get('currentWave'),
                        isBossActive: this.registry.get('isBossActive'),
                        bossIndex: this.registry.get('bossComingUp')
                    },
                    ts: now
                });
            }
        } else if (this.networkManager.role === 'client') {
            const id = playerPacket[0];
            const stateStr = `${playerPacket[1]},${playerPacket[2]},${playerPacket[3]},${playerPacket[4]},${playerPacket[5]},${playerPacket[6]}`;
            const lastState = this.lastSentPlayerStates.get(id);

            if (lastState !== stateStr) {
                this.lastSentPlayerStates.set(id, stateStr);
                this.networkManager.broadcast(BinaryPacker.packPlayer(playerPacket, now));
            }
        }
    }

    public restartGame() {
        console.log("[Game] Restarting run...");

        // Reset Local Registry State
        this.registry.set('playerMaxHP', GAME_CONFIG.PLAYER.BASE_MAX_HP);
        this.registry.set('playerHP', GAME_CONFIG.PLAYER.BASE_MAX_HP);
        this.registry.set('playerCoins', 0);
        this.registry.set('gameLevel', 1);
        this.registry.set('currentWave', 1);
        this.registry.set('isBossActive', false);
        this.registry.set('bossComingUp', -1);
        this.registry.set('reviveCount', 0);
        this.registry.set('unlockedWeapons', ['sword']);
        this.registry.set('currentWeapon', 'sword');
        this.registry.set('partyDead', false);
        this.registry.set('upgradeLevels', {});

        // Clear Game World
        this.enemies.clear(true, true);
        this.bossGroup.clear(true, true);
        this.coins.clear(true, true);
        this.arrows.clear(true, true);
        this.fireballs.clear(true, true);
        this.frostBolts.clear(true, true);
        this.lightningBolts.clear(true, true);

        // Reset Player instance
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (player) {
            player.setPosition(this.mapWidth / 2, this.mapHeight / 2);
            player.clearTint();
            player.setBlendMode(Phaser.BlendModes.NORMAL);
            player.setAlpha(1.0);
            if (this.playerLight) this.playerLight.setRadius(200);
            if (this.outerPlayerLight) this.outerPlayerLight.setRadius(500);
        }

        // Reset remote players visuals
        this.remotePlayers.forEach(rp => {
            rp.clearTint();
            rp.setBlendMode(Phaser.BlendModes.NORMAL);
            rp.setAlpha(1.0);
        });

        // Refresh stats
        this.stats.recalculateStats();

        // Reset Map & Waves
        this.regenerateMap(1);
        if (this.networkManager?.role !== 'client') {
            this.waves.startLevel(1);
        }

        // Host notifies clients
        if (this.networkManager?.role === 'host') {
            this.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'restart_game', data: {} },
                ts: Date.now()
            });
        }

        // Notify React UI
        this.events.emit('restart_game');
    }
}

export const createGame = (containerId: string, networkConfig?: NetworkConfig | null) => {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerId,
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
            powerPreference: 'high-performance'
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

    if (networkConfig) {
        game.registry.set('networkConfig', networkConfig);
    }

    // Initialize registry with saved quality or default
    const saved = SaveManager.load();
    game.registry.set('graphicsQuality', saved.graphicsQuality || 'medium');

    return game;
};

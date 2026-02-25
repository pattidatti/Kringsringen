import Phaser from 'phaser';
import type { NetworkConfig } from '../App';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { BOSS_CONFIGS } from '../config/bosses';
import { StaticMapLoader } from './StaticMapLoader';
import { STATIC_MAPS } from './StaticMapData';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
import { LightningBolt } from './LightningBolt';
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
    };
    private hotkeys!: {
        [key: string]: Phaser.Input.Keyboard.Key;
    };

    private arrows!: Phaser.Physics.Arcade.Group;
    private fireballs!: Phaser.Physics.Arcade.Group;
    private frostBolts!: Phaser.Physics.Arcade.Group;
    private lightningBolts!: Phaser.Physics.Arcade.Group;
    public bossGroup!: Phaser.Physics.Arcade.Group;
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
    private playerLight!: Phaser.GameObjects.Light;
    private outerPlayerLight!: Phaser.GameObjects.Light;
    private haloPlayerLight!: Phaser.GameObjects.Light;

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
    private lastSyncTime: number = 0;

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

        // --- LIGHT SYSTEM ---
        this.lights.enable();
        this.lights.setAmbientColor(0x0a0a0a); // Near black edges

        // Three-layer player light for a "ultra-smooth" halo effect
        // 1. Core light (sharpest but low intensity)
        this.playerLight = this.lights.addLight(this.mapWidth / 2, this.mapHeight / 2, 250, 0xfffaf0, 0.7);
        // 2. Mid-range halo
        this.outerPlayerLight = this.lights.addLight(this.mapWidth / 2, this.mapHeight / 2, 600, 0xfffaf0, 0.4);
        // 3. Wide ambient glow (near invisible but smooths the final falloff)
        this.haloPlayerLight = this.lights.addLight(this.mapWidth / 2, this.mapHeight / 2, 1200, 0xfffaf0, 0.2);

        // --- POST PROCESSING ---
        // Vignette — starts invisible; strength is driven by HP in update().
        // Gives a subtle border darkening at all times and pulses red at low HP.
        this.vignetteEffect = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.85, 0.15);

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
            runChildUpdate: false
        });

        // Fireball Group
        this.fireballs = this.physics.add.group({
            classType: Fireball,
            runChildUpdate: true
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

        // Coin Group
        this.coins = this.physics.add.group({
            classType: Coin,
            runChildUpdate: true,
            maxSize: 5000
        });

        // Collisions
        this.physics.add.collider(player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.collider(player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);
        this.physics.add.collider(player, this.bossGroup);
        this.physics.add.collider(this.bossGroup, this.obstacles);

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

                    // Client-side prediction (visual only)
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
        this.events.on('enemy-hit-player', (damage: number, _type: string, x?: number, y?: number) => {
            this.combat.takePlayerDamage(damage, x, y);
        });

        const cursors = this.input.keyboard?.createCursorKeys();

        this.wasd = this.input.keyboard?.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
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


        // Listen for Upgrades
        this.events.off('apply-upgrade');
        this.events.on('apply-upgrade', (upgradeId: string) => {
            this.stats.applyUpgrade(upgradeId);
        });

        // Listen for Next Level
        this.events.on('start-next-level', () => {
            this.waves.startLevel(this.registry.get('gameLevel') + 1);
        });

        // Boss fight start
        this.events.on('start-boss', (bossIndex: number) => {
            // Show splash screen, then spawn boss
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

        // Listen for weapon changes
        this.registry.events.on('changedata-currentWeapon', () => {
            AudioManager.instance.playSFX('weapon_pick_up');
        }, this);

        // Listen for level completion to regenerate map for next level
        this.events.on('level-complete', () => {
            const nextLevel = this.registry.get('gameLevel') + 1;

            // Clear coins on level complete
            this.coins.clear(true, true);

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

    private handleNetworkPacket(packet: SyncPacket, conn: DataConnection) {
        switch (packet.t) {
            case PacketType.PLAYER_SYNC:
                if (packet.p) this.updateRemotePlayer(packet.p, packet.ts);
                if (packet.ps) packet.ps.forEach(p => this.updateRemotePlayer(p, packet.ts));
                break;
            case PacketType.ENEMY_SYNC:
                // Only clients receive this from host
                if (this.networkManager?.role === 'client' && packet.es) {
                    this.waves.syncEnemies(packet.es);
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
        } else if (event.type === 'spawn_coins') {
            const { x, y, count } = event.data;
            const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
            for (let i = 0; i < count; i++) {
                const coin = this.coins.get(x, y) as Coin;
                if (coin) {
                    coin.spawn(x, y, player);
                    coin.removeAllListeners('collected');
                    coin.on('collected', () => {
                        // If client picks up, tell host (host handles the central score)
                        if (this.networkManager?.role === 'client') {
                            this.networkManager.broadcast({
                                t: PacketType.GAME_EVENT,
                                ev: { type: 'coin_collect', data: { amount: 1 } },
                                ts: Date.now()
                            });
                        } else {
                            // Host picked up locally
                            this.stats.addCoins(1);
                        }
                        AudioManager.instance.playSFX('coin_collect');
                    });
                }
            }
        } else if (event.type === 'coin_collect') {
            const { amount } = event.data;
            // Host acts as authority on total gold
            if (this.networkManager?.role === 'host') {
                this.stats.addCoins(amount);
                // We could broadcast the new total, but for now just increment locally on all
            } else {
                // Client receives this from Host (or another client broadcast)
                this.stats.addCoins(amount);
            }
        } else if (event.type === 'level_complete') {
            const { nextLevel } = event.data;
            if (this.networkManager?.role === 'client') {
                // Clients follow host authority on level completion
                this.registry.set('gameLevel', nextLevel - 1); // Set current before increment in event
                this.events.emit('level-complete');
            }
        }
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
    }

    update(_time: number, _delta: number) {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (this.playerShadow) {
            this.playerShadow.setPosition(player.x, player.y + 28);
        }

        // --- Iterating Remote Players for dead reckoning updates ---
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

                    remotePlayer.setPosition(x, y);

                    // Use discrete state (animation/flip) from the active nearest boundary
                    const activeState = f > 0.5 ? pNext : pPrev;
                    const anim = activeState[3];
                    const flipX = activeState[4];

                    if (remotePlayer.anims.currentAnim?.key !== anim) {
                        remotePlayer.play(anim);
                    }
                    remotePlayer.setFlipX(flipX === 1);
                }
            }

            const label = this.playerNicknames.get(id);
            if (label) label.setPosition(remotePlayer.x, remotePlayer.y - 40);
        });

        // Update Player Lights
        this.playerLight.setPosition(player.x, player.y - 10);
        this.outerPlayerLight.setPosition(player.x, player.y - 10);
        this.haloPlayerLight.setPosition(player.x, player.y - 10);

        // ── Vignette HP warning ──────────────────────────────────────────────
        // Below 30 % HP the vignette pulses with increasing intensity, giving a
        // clear "danger" signal without interrupting gameplay.
        if (this.vignetteEffect) {
            const hp = this.registry.get('playerHP') as number;
            const maxHP = this.registry.get('playerMaxHP') as number;
            if (maxHP > 0) {
                const ratio = hp / maxHP;
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
                    id: (enemy as any).id
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
                    id: 'boss'
                });
            }
            return true;
        });

        if (isAttacking || this.combat.isKnockedBack) {
            if (isAttacking) player.setVelocity(0, 0);
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
        if ((pointer.leftButtonDown() || spacePressed) && !blockPressed) {
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
                const ATTACK_ANIMS = ['player-attack', 'player-attack-2'];
                const idx = this.data.get('attackAnimIndex') as number;
                const attackAnimKey = ATTACK_ANIMS[idx];
                this.data.set('attackAnimIndex', (idx + 1) % ATTACK_ANIMS.length);

                this.registry.set('weaponCooldown', { duration: 400, timestamp: Date.now() });

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

                const attackSpeedMult = this.registry.get('playerAttackSpeed') || 1;

                // Adjust cooldown based on stats (faster attack speed = lower cooldown)
                const cooldown = 500 / attackSpeedMult;

                // Enable hitbox during middle of animation
                this.time.delayedCall(Math.max(100, cooldown * 0.3), () => {
                    this.attackHitbox.body!.setEnable(true);
                    this.time.delayedCall(100, () => {
                        this.attackHitbox.body!.setEnable(false);
                    });
                });

                player.once(`animationcomplete-${attackAnimKey}`, () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'bow') {
                this.registry.set('weaponCooldown', { duration: 600, timestamp: Date.now() });
                player.play('player-bow');

                // Spawn arrow during animation
                this.time.delayedCall(this.stats.cooldown * 0.5, () => {
                    // Read arrow upgrade stats
                    const arrowDamageMultiplier = this.registry.get('playerArrowDamageMultiplier') || 1;
                    const arrowSpeed = this.registry.get('playerArrowSpeed') || 700;
                    const pierceCount = this.registry.get('playerPierceCount') || 0;
                    const explosiveLevel = this.registry.get('playerExplosiveLevel') || 0;

                    const baseDamage = this.stats.damage * 0.8 * arrowDamageMultiplier;

                    const arrow = this.arrows.get(player.x, player.y) as Arrow;
                    if (arrow) {
                        arrow.fire(player.x, player.y, angle, baseDamage, arrowSpeed, pierceCount, explosiveLevel);
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
                this.registry.set('weaponCooldown', { duration: 600, timestamp: Date.now() });
                player.play('player-bow');
                this.events.emit('fireball-cast');

                this.time.delayedCall(100, () => {
                    const fireball = this.fireballs.get(player.x, player.y) as Fireball;
                    if (fireball) {
                        fireball.fire(player.x, player.y, angle, this.stats.damage * 1.5);
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
                this.registry.set('weaponCooldown', { duration: 1000, timestamp: Date.now() });
                player.play('player-cast');

                // Capture mouse world position at cast time
                const frostTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const frostBolt = this.frostBolts.get(player.x, player.y) as FrostBolt;
                    if (frostBolt) {
                        frostBolt.fire(player.x, player.y, frostTarget.x, frostTarget.y, this.stats.damage * 1.2);
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
                this.registry.set('weaponCooldown', { duration: 800, timestamp: Date.now() });
                player.play('player-cast');
                this.events.emit('lightning-cast');

                // Get target position from mouse
                const ltTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const dmgMult = this.registry.get('lightningDamageMulti') || 1;
                    const bounces = this.registry.get('lightningBounces') || 1;
                    const multicast = this.registry.get('lightningMulticast') || 1;
                    const baseDamage = this.stats.damage * 0.85 * dmgMult;
                    const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, ltTarget.x, ltTarget.y);
                    const spreadAngle = 15 * (Math.PI / 180);

                    for (let i = 0; i < multicast; i++) {
                        const bolt = this.lightningBolts.get(player.x, player.y) as LightningBolt;
                        if (bolt) {
                            const offset = Math.ceil(i / 2) * spreadAngle * (i % 2 === 0 ? -1 : 1);
                            const finalAngle = baseAngle + offset;
                            bolt.fire(player.x, player.y, ltTarget.x, ltTarget.y, baseDamage, bounces, new Set(), finalAngle);
                        }
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
                                angle: baseAngle
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
        const playerPacket: PackedPlayer = [
            myId,
            Math.round(player.x),
            Math.round(player.y),
            player.anims.currentAnim?.key || 'player-idle',
            player.flipX ? 1 : 0,
            this.registry.get('playerHP'),
            this.registry.get('currentWeapon'),
            this.registry.get('nickname')
        ];

        if (this.networkManager.role === 'host') {
            // Host broadcasts its own position + all remote (client) positions
            const allPlayers: PackedPlayer[] = [playerPacket, ...Array.from(this.remotePlayerPackets.values())];

            this.networkManager.broadcast({
                t: PacketType.PLAYER_SYNC,
                ps: allPlayers,
                ts: now
            });

            const enemies = this.waves.getEnemySyncData();
            this.networkManager.broadcast({
                t: PacketType.ENEMY_SYNC,
                es: enemies,
                ts: now
            });

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
            // Client sends local state to host
            this.networkManager.broadcast({
                t: PacketType.PLAYER_SYNC,
                p: playerPacket,
                ts: now
            });
        }
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

    return game;
};

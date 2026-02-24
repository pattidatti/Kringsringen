import Phaser from 'phaser';
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
    private bossGroup!: Phaser.Physics.Arcade.Group;
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

        // Initialize Audio Manager
        AudioManager.instance.setScene(this);

        // Initialize Managers
        this.stats = new PlayerStatsManager(this);
        this.combat = new PlayerCombatManager(this);
        this.waves = new WaveManager(this);
        this.weather = new WeatherManager(this);
        this.ambient = new AmbientParticleManager(this);

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
            e.takeDamage(this.stats.damage, '#ffcc00'); // Gold for physical
            e.pushback(player.x, player.y, this.stats.knockback);
        });

        this.physics.add.overlap(this.attackHitbox, this.bossGroup, (_hitbox, boss) => {
            const b = boss as BossEnemy;
            b.takeDamage(this.stats.damage, '#ffcc00');
            b.pushback(player.x, player.y, this.stats.knockback);
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

        // Initial Start
        this.waves.startLevel(1);

        // Resume audio context and play music
        this.input.on('pointerdown', () => AudioManager.instance.resumeContext());
        const bgmTracks = ['meadow_theme', 'exploration_theme', 'dragons_fury'];
        const randomBGM = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
        AudioManager.instance.playBGM(randomBGM);
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

    update() {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (this.playerShadow) {
            this.playerShadow.setPosition(player.x, player.y + 28);
        }

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

            if (currentWeapon === 'sword') {
                const ATTACK_ANIMS = ['player-attack', 'player-attack-2'];
                const idx = this.data.get('attackAnimIndex') as number;
                const attackAnimKey = ATTACK_ANIMS[idx];
                this.data.set('attackAnimIndex', (idx + 1) % ATTACK_ANIMS.length);

                player.play(attackAnimKey);
                this.events.emit('player-swing');
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
                player.play('player-bow');
                this.events.emit('fireball-cast');

                this.time.delayedCall(100, () => {
                    const fireball = this.fireballs.get(player.x, player.y) as Fireball;
                    if (fireball) {
                        fireball.fire(player.x, player.y, angle, this.stats.damage * 1.2);
                    }
                });

                player.once('animationcomplete-player-bow', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'frost') {
                player.play('player-bow');
                this.events.emit('frost-cast');

                // Capture mouse world position at cast time
                const frostTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const bolt = this.frostBolts.get(player.x, player.y) as FrostBolt;
                    if (bolt) {
                        bolt.fire(player.x, player.y, frostTarget.x, frostTarget.y, this.stats.damage * 1.1);
                    }
                });

                player.once('animationcomplete-player-bow', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'lightning') {
                player.play('player-bow');
                this.events.emit('lightning-cast');

                // Get target position from mouse
                const ltTarget = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

                this.time.delayedCall(100, () => {
                    const dmgMult = this.registry.get('lightningDamageMulti') || 1;
                    const bounces = this.registry.get('lightningBounces') || 1;
                    const multicast = this.registry.get('lightningMulticast') || 1;
                    const baseDamage = this.stats.damage * 1.3 * dmgMult;

                    for (let i = 0; i < multicast; i++) {
                        const bolt = this.lightningBolts.get(player.x, player.y) as LightningBolt;
                        if (bolt) {
                            bolt.fire(player.x, player.y, ltTarget.x, ltTarget.y, baseDamage, bounces, new Set());
                        }
                    }
                });

                player.once('animationcomplete-player-bow', () => {
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
}

export const createGame = (containerId: string) => {
    return new Phaser.Game({
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
};

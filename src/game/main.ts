import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CircularForestMapGenerator, LEVEL_MAP_THEMES } from './CircularForestMapGenerator';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
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
    };
    private hotkeys!: {
        [key: string]: Phaser.Input.Keyboard.Key;
    };

    private arrows!: Phaser.Physics.Arcade.Group;
    private fireballs!: Phaser.Physics.Arcade.Group;
    private frostBolts!: Phaser.Physics.Arcade.Group;
    public poolManager!: ObjectPoolManager;

    // Managers
    public stats!: PlayerStatsManager;
    public combat!: PlayerCombatManager;
    public waves!: WaveManager;

    // Map Generation
    private currentMap: CircularForestMapGenerator | null = null;
    private mapWidth: number = 3000;
    private mapHeight: number = 3000;

    // Audio throttle
    private lastFootstepTime: number = 0;

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
        this.registry.set('unlockedWeapons', ['sword', 'fireball', 'frost']);

        // Initialize Audio Manager
        AudioManager.instance.setScene(this);

        // Initialize Managers
        this.stats = new PlayerStatsManager(this);
        this.combat = new PlayerCombatManager(this);
        this.waves = new WaveManager(this);

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

        // Create Coin Texture (Yellow Circle)
        graphics.clear();
        graphics.fillStyle(0xffcc00);
        graphics.fillCircle(5, 5, 5);
        graphics.lineStyle(1, 0x000000, 0.5);
        graphics.strokeCircle(5, 5, 5);
        graphics.generateTexture('coin', 10, 10);
        graphics.destroy();

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

        // Coin Group
        this.coins = this.physics.add.group({
            classType: Coin,
            runChildUpdate: true,
            maxSize: 100
        });

        // Collisions
        this.physics.add.collider(player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.collider(player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);

        this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
            const e = enemy as Enemy;
            e.takeDamage(this.stats.damage);
            e.pushback(player.x, player.y, this.stats.knockback);
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


        // Listen for Upgrades
        this.events.off('apply-upgrade');
        this.events.on('apply-upgrade', (upgradeId: string) => {
            this.stats.applyUpgrade(upgradeId);
        });

        // Listen for Next Level
        this.events.on('start-next-level', () => {
            this.waves.startLevel(this.registry.get('gameLevel') + 1);
        });

        // Economy Throttler (React Bridge Batching)
        this.time.addEvent({
            delay: 50,
            callback: () => this.stats.flushEconomy(),
            callbackScope: this,
            loop: true
        });

        // Initial Start
        this.waves.startLevel(1);

        // Resume audio context and play music
        this.input.on('pointerdown', () => AudioManager.instance.resumeContext());
        AudioManager.instance.playBGM('meadow_theme');
        AudioManager.instance.playBGS('forest_ambience');

        // Global Sound Listeners
        this.events.on('enemy-hit', () => AudioManager.instance.playSFX('hit'));
        this.events.on('player-swing', () => AudioManager.instance.playSFX('swing'));
        this.events.on('bow-shot', () => AudioManager.instance.playSFX('bow_attack'));
        this.events.on('fireball-cast', () => AudioManager.instance.playSFX('fireball_cast'));
        this.events.on('frost-cast', () => AudioManager.instance.playSFX('ice_throw'));

        // Listen for level completion to regenerate map for next level
        this.events.on('level-complete', () => {
            const nextLevel = this.registry.get('gameLevel') + 1;
            // Schedule map regeneration after level complete delay
            this.time.delayedCall(1000, () => {
                this.regenerateMap(nextLevel);
            });
        });
    }

    /** Regenerate the map for a given level with appropriate theme. */
    private regenerateMap(level: number) {
        // Clean up old map
        if (this.currentMap) {
            this.currentMap.destroy();
        }

        // Get theme for this level (capped at last theme)
        const themeIndex = Math.min(level - 1, LEVEL_MAP_THEMES.length - 1);
        const theme = LEVEL_MAP_THEMES[themeIndex];

        // Generate new map
        this.currentMap = new CircularForestMapGenerator(this, this.obstacles, this.mapWidth, this.mapHeight);
        this.currentMap.generate(theme);
    }

    update() {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
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
                player.play('player-attack');
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

                player.once('animationcomplete-player-attack', () => {
                    this.data.set('isAttacking', false);
                    player.play('player-idle');
                });
            } else if (currentWeapon === 'bow') {
                player.play('player-bow');

                // Spawn arrow during animation
                this.time.delayedCall(this.stats.cooldown * 0.5, () => {
                    const arrow = this.arrows.get(player.x, player.y) as Arrow;
                    if (arrow) {
                        arrow.fire(player.x, player.y, angle, this.stats.damage * 0.8);
                        this.events.emit('bow-shot');

                        // Multishot logic (Cone)
                        const projectiles = this.registry.get('playerProjectiles') || 1;
                        if (projectiles > 1) {
                            for (let i = 1; i < projectiles; i++) {
                                // Alternating sides: +10deg, -10deg, +20deg...
                                const offset = Math.ceil(i / 2) * 10 * (Math.PI / 180) * (i % 2 === 0 ? -1 : 1);
                                const subArrow = this.arrows.get(player.x, player.y) as Arrow;
                                if (subArrow) {
                                    subArrow.fire(player.x, player.y, angle + offset, this.stats.damage * 0.8);
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

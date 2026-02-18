import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { XPGem } from './XPGem';
import { CircularForestMapGenerator } from './CircularForestMapGenerator';
import { FantasyAssetManifest } from './FantasyAssetManifest';
import { Arrow } from './Arrow';
import { Coin } from './Coin';


class MainScene extends Phaser.Scene {
    public enemies!: Phaser.Physics.Arcade.Group;
    private gems!: Phaser.Physics.Arcade.Group;
    private coins!: Phaser.Physics.Arcade.Group;
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
    private currentLevel: number = 1;
    private currentWave: number = 1;
    private enemiesToSpawn: number = 0;
    private enemiesAlive: number = 0;
    private isLevelActive: boolean = false;

    private readonly LEVEL_CONFIG = [
        { waves: 2, enemiesPerWave: 6, multiplier: 1.0 },   // Level 1
        { waves: 3, enemiesPerWave: 8, multiplier: 1.2 },   // Level 2
        { waves: 3, enemiesPerWave: 12, multiplier: 1.5 },  // Level 3
        { waves: 4, enemiesPerWave: 15, multiplier: 2.0 },  // Level 4
        { waves: 5, enemiesPerWave: 20, multiplier: 3.0 }   // Level 5+
    ];

    // Player Stats
    private playerDamage!: number;
    private playerBaseSpeed!: number;
    private playerAttackCooldown!: number;
    private playerKnockbackForce!: number;
    private isInvincible: boolean = false;
    private isKnockedBack: boolean = false;
    private invincibilityDuration: number = 1000;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.spritesheet('player-idle', 'assets/sprites/soldier/Soldier-Idle.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('player-walk', 'assets/sprites/soldier/Soldier-Walk.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('player-attack', 'assets/sprites/soldier/Soldier-Attack01.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('player-full', 'assets/sprites/soldier/Soldier.png', { frameWidth: 100, frameHeight: 100 });
        this.load.image('arrow', 'assets/sprites/projectile/arrow.png');

        this.load.spritesheet('orc-idle', 'assets/sprites/orc/Orc-Idle.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('orc-walk', 'assets/sprites/orc/Orc-Walk.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('orc-attack', 'assets/sprites/orc/Orc-Attack01.png', { frameWidth: 100, frameHeight: 100 });

        // Fantasy Tileset Assets
        this.load.spritesheet('fantasy-ground', 'assets/fantasy/Art/Ground Tileset/Tileset_Ground.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('fantasy-road', 'assets/fantasy/Art/Ground Tileset/Tileset_Road.png', { frameWidth: 16, frameHeight: 16 });

        // Load all assets from manifest
        FantasyAssetManifest.forEach(asset => {
            this.load.image(asset.id, asset.path);
        });

        // Keeping atlases for potential use
        this.load.spritesheet('fantasy-props-atlas', 'assets/fantasy/Art/Props/Atlas/Props.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('fantasy-trees-atlas', 'assets/fantasy/Art/Trees and Bushes/Atlas/Trees_Bushes.png', { frameWidth: 16, frameHeight: 16 });

        // Map Assets
        this.load.image('tiles-grass', 'assets/textures/TX Tileset Grass.png');
        this.load.image('tiles-stone', 'assets/textures/TX Tileset Stone Ground.png');
        this.load.spritesheet('props', 'assets/textures/TX Props.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('plants', 'assets/textures/TX Plant.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('struct', 'assets/textures/TX Struct.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('shadows', 'assets/textures/TX Shadow.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('shadows-plant', 'assets/textures/TX Shadow Plant.png', { frameWidth: 32, frameHeight: 32 });

        // Blood Effects
        for (let i = 1; i <= 5; i++) {
            this.load.spritesheet(`blood_${i}`, `assets/sprites/effects/blood/blood_${i}.png`, { frameWidth: 100, frameHeight: 100 });
        }
    }

    create() {
        // Reset Player Stats to Defaults
        this.playerDamage = 20;
        this.playerBaseSpeed = 250;
        this.playerAttackCooldown = 150;
        this.playerKnockbackForce = 400;
        this.isInvincible = false;
        this.isKnockedBack = false;

        // Match player stats in registry (for React UI access)
        this.registry.set('playerHP', 100);
        this.registry.set('playerMaxHP', 100);
        this.registry.set('playerXP', 0);
        this.registry.set('playerMaxXP', 100);
        this.registry.set('playerLevel', 1);
        this.registry.set('playerCoins', 0);
        this.registry.set('currentWeapon', 'sword');

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
        const mapWidth = 3000;
        const mapHeight = 3000;

        // Set World Bounds
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        // 1. Base Layer (Grass)
        // const floor = this.add.tileSprite(mapWidth / 2, mapHeight / 2, mapWidth, mapHeight, 'tiles-grass');
        // floor.setDepth(-100);

        // Initialize Obstacles
        this.obstacles = this.physics.add.staticGroup();

        // 3. Procedural Map Generation (Map Engine)
        // const mapGenerator = new MapGenerator(this, this.obstacles, mapWidth, mapHeight);
        // mapGenerator.generate();
        // mapGenerator.generateTestLevel();

        // FANTASY DEMO
        const fantasyMap = new CircularForestMapGenerator(this, this.obstacles, mapWidth, mapHeight);
        fantasyMap.generate();

        this.setupAnimations();

        const player = this.physics.add.sprite(mapWidth / 2, mapHeight / 2, 'player-idle');
        player.setCollideWorldBounds(true);
        player.setScale(2);
        player.setBodySize(20, 15, true);
        player.setOffset(player.body!.offset.x, 33); // Move Y offset up from 75 to 33 (near center)
        player.setMass(2); // Make player a bit heavier than enemies
        player.play('player-idle');

        // Camera follow
        this.cameras.main.startFollow(player, true, 0.1, 0.1);

        // Attack Hitbox (invisible circle) - Better for 360-degree detection
        this.attackHitbox = this.add.rectangle(0, 0, 60, 60, 0xff0000, 0) as any;
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body!.setCircle(30);
        this.attackHitbox.body!.setEnable(false);

        // Enemy Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });

        // Gem Group
        this.gems = this.physics.add.group({
            classType: XPGem,
            runChildUpdate: true
        });

        // Arrow Group
        this.arrows = this.physics.add.group({
            classType: Arrow,
            runChildUpdate: true
        });

        // Coin Group
        this.coins = this.physics.add.group({
            classType: Coin,
            runChildUpdate: true
        });

        // Collisions
        this.physics.add.collider(player, this.enemies);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.collider(player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);

        this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
            const e = enemy as Enemy;
            e.takeDamage(this.playerDamage);
            e.pushback(player.x, player.y, this.playerKnockbackForce);
        });

        const cursors = this.input.keyboard?.createCursorKeys();

        this.wasd = this.input.keyboard?.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
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
            this.applyUpgrade(upgradeId);
        });

        // Listen for Next Level
        this.events.on('start-next-level', () => {
            this.startLevel(this.currentLevel + 1);
        });

        // Initial Start
        this.startLevel(1);
    }

    private setupAnimations() {
        this.anims.create({
            key: 'player-idle',
            frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'player-walk',
            frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 7 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'player-attack',
            frames: this.anims.generateFrameNumbers('player-attack', { start: 0, end: 5 }),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'player-bow',
            frames: this.anims.generateFrameNumbers('player-full', { start: 36, end: 44 }),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'orc-walk',
            frames: this.anims.generateFrameNumbers('orc-walk', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'orc-attack',
            frames: this.anims.generateFrameNumbers('orc-attack', { start: 0, end: 5 }),
            frameRate: 12,
            repeat: 0
        });

        // Blood Animations
        for (let i = 1; i <= 5; i++) {
            this.anims.create({
                key: `blood_${i}`,
                frames: this.anims.generateFrameNumbers(`blood_${i}`, { start: 0, end: 29 }),
                frameRate: 24, // Faster for impact
                repeat: 0
            });
        }
    }

    private startLevel(level: number) {
        this.currentLevel = level;
        this.currentWave = 1;
        this.isLevelActive = true;
        this.registry.set('gameLevel', this.currentLevel);
        this.startWave();
    }

    private startWave() {
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];
        this.enemiesToSpawn = config.enemiesPerWave;

        // Sync to registry
        this.registry.set('currentWave', this.currentWave);
        this.registry.set('maxWaves', config.waves);

        // Visual Announcement
        const topText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, `LEVEL ${this.currentLevel} - WAVE ${this.currentWave}`, {
            fontSize: '48px',
            color: '#fbbf24',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: topText,
            alpha: { from: 1, to: 0 },
            y: this.cameras.main.centerY - 150,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => topText.destroy()
        });

        // Start spawning
        this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemyInWave,
            callbackScope: this,
            repeat: this.enemiesToSpawn - 1
        });
    }

    private spawnEnemyInWave() {
        if (!this.isLevelActive) return;

        const mapWidth = 3000;
        const mapHeight = 3000;
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        const radius = 800; // Match CircularForestMapGenerator clearingRadius

        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];

        const enemy = new Enemy(this, x, y, player, config.multiplier);
        this.enemies.add(enemy);
        this.enemiesAlive++;

        enemy.on('dead', (ex: number, ey: number) => {
            this.enemiesAlive--;
            this.checkWaveProgress();

            // Spawn XP Gem
            const gem = new XPGem(this, ex, ey, player);
            this.gems.add(gem);
            gem.on('collected', () => {
                this.addXP(10);
            });

            // Spawn Coins (1-5)
            const coinCount = Phaser.Math.Between(1, 5);
            for (let i = 0; i < coinCount; i++) {
                const coin = new Coin(this, ex, ey, player);
                this.coins.add(coin);
                coin.on('collected', () => {
                    this.addCoins(1);
                });
            }
        });
    }

    private checkWaveProgress() {
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];

        if (this.enemiesAlive === 0) {
            if (this.currentWave < config.waves) {
                this.currentWave++;
                this.time.delayedCall(2000, () => this.startWave());
            } else {
                // Level Complete
                this.isLevelActive = false;
                this.time.delayedCall(1500, () => {
                    this.events.emit('level-complete');
                    this.scene.pause();
                });
            }
        }
    }

    private addCoins(amount: number) {
        let coins = this.registry.get('playerCoins') || 0;
        coins += amount;
        this.registry.set('playerCoins', coins);
    }

    private addXP(amount: number) {
        let xp = this.registry.get('playerXP');
        let maxXp = this.registry.get('playerMaxXP');
        let level = this.registry.get('playerLevel');

        xp += amount;

        if (xp >= maxXp) {
            xp -= maxXp;
            level++;
            maxXp = Math.floor(maxXp * 1.2);

            this.registry.set('playerLevel', level);
            this.registry.set('playerMaxXP', maxXp);
            this.events.emit('level-up');
        }

        this.registry.set('playerXP', xp);
    }

    private applyUpgrade(upgradeId: string) {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;

        switch (upgradeId) {
            case 'damage':
                this.playerDamage *= 1.2;
                break;
            case 'speed':
                this.playerBaseSpeed *= 1.15;
                break;
            case 'health': {
                const maxHP = this.registry.get('playerMaxHP') + 20;
                let currentHP = this.registry.get('playerHP') + 20;
                currentHP = Math.min(currentHP, maxHP);
                this.registry.set('playerMaxHP', maxHP);
                this.registry.set('playerHP', currentHP);
                break;
            }
            case 'cooldown':
                this.playerAttackCooldown *= 0.85;
                break;
            case 'knockback':
                this.playerKnockbackForce *= 1.25;
                break;
        }

        // Visual feedback
        this.tweens.add({
            targets: player,
            scale: 2.2,
            duration: 200,
            yoyo: true,
            ease: 'Power2'
        });
    }

    private takePlayerDamage(amount: number, source?: Phaser.GameObjects.Components.Transform) {
        if (this.isInvincible) return;

        let hp = this.registry.get('playerHP');
        const isBlocking = this.data.get('isBlocking') as boolean;
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;

        // Block reduces damage by 80%
        const actualDamage = isBlocking ? amount * 0.2 : amount;

        hp -= actualDamage;
        this.registry.set('playerHP', Math.max(0, hp));

        // Screen Shake
        this.cameras.main.shake(150, 0.005);

        // Visual Impact (Blood)
        const bloodKey = `blood_${Phaser.Math.Between(1, 5)}`;
        const blood = this.add.sprite(player.x, player.y, bloodKey);
        blood.setScale(1.5);
        blood.setDepth(player.depth + 1);
        blood.play(bloodKey);
        blood.on('animationcomplete', () => blood.destroy());

        // Damage Number
        const damageText = this.add.text(player.x, player.y - 40, `-${Math.round(actualDamage)}`, {
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        damageText.setDepth(2000);

        this.tweens.add({
            targets: damageText,
            y: player.y - 100,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });

        if (!isBlocking) {
            // Knockback
            if (source) {
                this.isKnockedBack = true;
                const angle = Phaser.Math.Angle.Between(source.x, source.y, player.x, player.y);
                player.setVelocity(
                    Math.cos(angle) * this.playerKnockbackForce,
                    Math.sin(angle) * this.playerKnockbackForce
                );

                // End knockback after a short duration
                this.time.delayedCall(200, () => {
                    this.isKnockedBack = false;
                });
            }

            // I-Frames starts
            this.isInvincible = true;

            // Blinking effect
            const blinkCount = Math.floor(this.invincibilityDuration / 200);
            this.tweens.add({
                targets: player,
                alpha: 0.2,
                duration: 100,
                yoyo: true,
                repeat: blinkCount - 1,
                onComplete: () => {
                    player.setAlpha(1);
                    this.isInvincible = false;
                }
            });
        } else {
            // Block feedback
            player.setTint(0xffffff);
            this.time.delayedCall(100, () => player.clearTint());
        }

        if (hp <= 0) {
            this.scene.pause();
        }
    }

    update() {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const cursors = this.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
        const isAttacking = this.data.get('isAttacking') as boolean;
        const pointer = this.input.activePointer;
        let speed = this.playerBaseSpeed;

        if (isAttacking || this.isKnockedBack) {
            if (isAttacking) player.setVelocity(0, 0);
            return;
        }

        // Handle Weapon Switching
        if (this.hotkeys['1']?.isDown && this.registry.get('currentWeapon') !== 'sword') {
            console.log('Switching to sword');
            this.registry.set('currentWeapon', 'sword');
        }
        if (this.hotkeys['2']?.isDown && this.registry.get('currentWeapon') !== 'bow') {
            console.log('Switching to bow');
            this.registry.set('currentWeapon', 'bow');
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

        // Handle Attack (Left Click)
        if (pointer.leftButtonDown() && !blockPressed) {
            const currentWeapon = this.registry.get('currentWeapon');
            this.data.set('isAttacking', true);

            if (currentWeapon === 'sword') {
                player.play('player-attack');

                // Enable hitbox during middle of animation
                this.time.delayedCall(this.playerAttackCooldown, () => {
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

                // Spawn arrow during animation (frame 3-4 is usually the release)
                this.time.delayedCall(250, () => {
                    const arrow = this.arrows.get(player.x, player.y) as Arrow;
                    if (arrow) {
                        arrow.fire(player.x, player.y, angle, this.playerDamage * 0.8);
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

        // Enemy Damage Detection (Distance-based to work with colliders)
        this.enemies.getChildren().forEach((enemy) => {
            const e = enemy as Enemy;
            if (e.active && e.isOnDamageFrame && !e.hasHit) {
                // Calculate distance between "feet" where collision happens
                const playerFeetY = player.y + 33;
                const enemyFeetY = e.y + 33;
                const dist = Phaser.Math.Distance.Between(player.x, playerFeetY, e.x, enemyFeetY);

                if (dist < 75) { // Reach of the orc attack
                    e.hasHit = true;
                    this.takePlayerDamage(10, e);
                }
            }
        });

        if (vx !== 0 || vy !== 0) {
            if (player.anims.currentAnim?.key !== 'player-walk') {
                player.play('player-walk');
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
        scene: MainScene,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        backgroundColor: '#0f172a'
    });
};

import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { XPGem } from './XPGem';

class MainScene extends Phaser.Scene {
    private enemies!: Phaser.Physics.Arcade.Group;
    private gems!: Phaser.Physics.Arcade.Group;
    private attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    private keyF!: Phaser.Input.Keyboard.Key;
    private keyK!: Phaser.Input.Keyboard.Key;

    // Player Stats
    private playerDamage: number = 20;
    private playerBaseSpeed: number = 250;
    private playerAttackCooldown: number = 150;
    private playerKnockbackForce: number = 400;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.spritesheet('player-idle', 'assets/sprites/soldier/Soldier-Idle.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('player-walk', 'assets/sprites/soldier/Soldier-Walk.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('player-attack', 'assets/sprites/soldier/Soldier-Attack01.png', { frameWidth: 100, frameHeight: 100 });

        this.load.spritesheet('orc-idle', 'assets/sprites/orc/Orc-Idle.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('orc-walk', 'assets/sprites/orc/Orc-Walk.png', { frameWidth: 100, frameHeight: 100 });
        this.load.spritesheet('orc-attack', 'assets/sprites/orc/Orc-Attack01.png', { frameWidth: 100, frameHeight: 100 });

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

        // Match player stats in registry (for React UI access)
        this.registry.set('playerHP', 100);
        this.registry.set('playerMaxHP', 100);
        this.registry.set('playerXP', 0);
        this.registry.set('playerMaxXP', 100);
        this.registry.set('playerLevel', 1);

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
        graphics.destroy();

        // Background: Map Generation with Variety
        const mapWidth = 3000;
        const mapHeight = 3000;

        // Set World Bounds
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        // 1. Base Layer (Grass)
        const floor = this.add.tileSprite(mapWidth / 2, mapHeight / 2, mapWidth, mapHeight, 'tiles-grass');
        floor.setDepth(-100);

        // 2. Terrain Patches (Stone Ground)
        for (let i = 0; i < 15; i++) {
            const rx = Phaser.Math.Between(200, mapWidth - 200);
            const ry = Phaser.Math.Between(200, mapHeight - 200);
            const pWidth = Phaser.Math.Between(200, 500);
            const pHeight = Phaser.Math.Between(200, 500);

            const patch = this.add.tileSprite(rx, ry, pWidth, pHeight, 'tiles-stone');
            patch.setDepth(-90);
            patch.setAlpha(0.8);
        }

        // 3. Structures and Ruins (Points of Interest)
        for (let i = 0; i < 8; i++) {
            const rx = Phaser.Math.Between(300, mapWidth - 300);
            const ry = Phaser.Math.Between(300, mapHeight - 300);

            // RUINS: Cluster of structure blocks
            for (let j = 0; j < 5; j++) {
                const ox = Phaser.Math.Between(-32, 32);
                const oy = Phaser.Math.Between(-32, 32);
                const frame = Phaser.Math.Between(0, 20);

                // Add shadow
                const shadow = this.add.image(rx + ox + 4, ry + oy + 8, 'shadows', 0);
                shadow.setAlpha(0.3);
                shadow.setDepth(ry + oy - 1);

                const wall = this.add.image(rx + ox, ry + oy, 'struct', frame);
                wall.setDepth(ry + oy);
                wall.setScale(2);
            }
        }

        // 4. Clustered Props (Plants & Rocks)
        for (let i = 0; i < 30; i++) {
            const clusterX = Phaser.Math.Between(100, mapWidth - 100);
            const clusterY = Phaser.Math.Between(100, mapHeight - 100);
            const clusterSize = Phaser.Math.Between(3, 8);

            for (let j = 0; j < clusterSize; j++) {
                const ox = Phaser.Math.Between(-60, 60);
                const oy = Phaser.Math.Between(-60, 60);
                const isPlant = Math.random() > 0.4;
                const tex = isPlant ? 'plants' : 'props';
                const frame = Phaser.Math.Between(0, 10);

                const rx = clusterX + ox;
                const ry = clusterY + oy;

                // Shadow for plant
                if (isPlant) {
                    const shadow = this.add.image(rx, ry + 10, 'shadows-plant', 0);
                    shadow.setAlpha(0.2);
                    shadow.setDepth(ry - 1);
                } else {
                    const shadow = this.add.image(rx + 2, ry + 5, 'shadows', 0);
                    shadow.setAlpha(0.2);
                    shadow.setDepth(ry - 1);
                }

                const prop = this.add.image(rx, ry, tex, frame);
                prop.setDepth(ry);
                prop.setScale(2);
            }
        }

        this.setupAnimations();

        const player = this.physics.add.sprite(mapWidth / 2, mapHeight / 2, 'player-idle');
        player.setCollideWorldBounds(true);
        player.setScale(2);
        player.setBodySize(30, 40);
        player.play('player-idle');

        // Camera follow
        this.cameras.main.startFollow(player, true, 0.1, 0.1);

        // Attack Hitbox (invisible)
        this.attackHitbox = this.add.rectangle(0, 0, 60, 60, 0xff0000, 0) as any;
        this.physics.add.existing(this.attackHitbox);
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

        // Collisions
        this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
            const e = enemy as Enemy;
            e.takeDamage(this.playerDamage);
            e.pushback(player.x, player.y, this.playerKnockbackForce);
        });

        this.physics.add.overlap(player, this.enemies, (_playerSprite, enemy) => {
            const e = enemy as Enemy;
            if (!e.active || e.hasHit) return;

            // Damage only during specific frame of orc-attack
            if (e.anims.currentAnim?.key === 'orc-attack' && e.anims.currentFrame?.index === 3) {
                e.hasHit = true;
                this.takePlayerDamage(10);
            }
        });

        const cursors = this.input.keyboard?.createCursorKeys();
        const spaceBar = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyF = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F) as Phaser.Input.Keyboard.Key;
        this.keyK = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.K) as Phaser.Input.Keyboard.Key;

        this.wasd = this.input.keyboard?.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        }) as any;

        this.data.set('player', player);
        this.data.set('cursors', cursors);
        this.data.set('spaceBar', spaceBar);
        this.data.set('isAttacking', false);
        this.data.set('isBlocking', false);

        // Spawn timer
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnWave,
            callbackScope: this,
            loop: true
        });

        // Listen for Upgrades
        this.events.on('apply-upgrade', (upgradeId: string) => {
            this.applyUpgrade(upgradeId);
        });
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

    private spawnWave() {
        const { width, height } = this.scale;
        const cam = this.cameras.main;
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0: // Top
                x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
                y = cam.scrollY - 50;
                break;
            case 1: // Right
                x = cam.scrollX + width + 50;
                y = Phaser.Math.Between(cam.scrollY, cam.scrollY + height);
                break;
            case 2: // Bottom
                x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
                y = cam.scrollY + height + 50;
                break;
            default: // Left
                x = cam.scrollX - 50;
                y = Phaser.Math.Between(cam.scrollY, cam.scrollY + height);
                break;
        }

        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const enemy = new Enemy(this, x, y, player);
        this.enemies.add(enemy);

        enemy.on('dead', (ex: number, ey: number) => {
            const gem = new XPGem(this, ex, ey, player);
            this.gems.add(gem);
            gem.on('collected', () => {
                this.addXP(10);
            });
        });
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

    private takePlayerDamage(amount: number) {
        let hp = this.registry.get('playerHP');
        const isBlocking = this.data.get('isBlocking') as boolean;

        // Block reduces damage by 80%
        const actualDamage = isBlocking ? amount * 0.2 : amount;

        hp -= actualDamage;
        this.registry.set('playerHP', Math.max(0, hp));

        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;

        if (!isBlocking) {
            player.setTint(0xff0000);
            this.time.delayedCall(100, () => player.clearTint());
        }

        if (hp <= 0) {
            this.scene.pause();
            this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
                fontSize: '64px',
                color: '#f00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }
    }

    update() {
        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const cursors = this.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
        const spaceBar = this.data.get('spaceBar') as Phaser.Input.Keyboard.Key;
        const isAttacking = this.data.get('isAttacking') as boolean;
        let speed = this.playerBaseSpeed;

        if (isAttacking) {
            player.setVelocity(0, 0);
            return;
        }

        // Handle Block
        const blockPressed = this.keyF.isDown || this.keyK.isDown;
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

        // Update attack hitbox position
        const offsetX = player.flipX ? -50 : 50;
        this.attackHitbox.setPosition(player.x + offsetX, player.y);

        // Handle Attack
        if (Phaser.Input.Keyboard.JustDown(spaceBar) && !blockPressed) {
            this.data.set('isAttacking', true);
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
            return;
        }

        let vx = 0;
        let vy = 0;

        if (cursors && (cursors.left.isDown || this.wasd?.A?.isDown)) {
            vx = -speed;
            player.setFlipX(true);
        } else if (cursors && (cursors.right.isDown || this.wasd?.D?.isDown)) {
            vx = speed;
            player.setFlipX(false);
        }

        if (cursors && (cursors.up.isDown || this.wasd?.W?.isDown)) {
            vy = -speed;
        } else if (cursors && (cursors.down.isDown || this.wasd?.S?.isDown)) {
            vy = speed;
        }

        player.setVelocity(vx, vy);

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

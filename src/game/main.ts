import Phaser from 'phaser';
import { Enemy } from './Enemy';

class MainScene extends Phaser.Scene {
    private enemies!: Phaser.Physics.Arcade.Group;
    private attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    private keyF!: Phaser.Input.Keyboard.Key;

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
    }

    create() {
        const { width, height } = this.scale;

        // Match player stats in registry (for React UI access)
        this.registry.set('playerHP', 100);
        this.registry.set('playerMaxHP', 100);

        // Background color / Arena boundary
        this.add.grid(width / 2, height / 2, width * 2, height * 2, 64, 64, 0x1e293b, 0.5, 0x334155, 0.2);

        this.setupAnimations();

        const player = this.physics.add.sprite(width / 2, height / 2, 'player-idle');
        player.setCollideWorldBounds(true);
        player.setScale(2);
        player.setBodySize(30, 40);
        player.play('player-idle');

        // Attack Hitbox (invisible)
        this.attackHitbox = this.add.rectangle(0, 0, 60, 60, 0xff0000, 0) as any;
        this.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body!.setEnable(false);

        // Enemy Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });

        // Collisions
        this.physics.add.overlap(this.attackHitbox, this.enemies, (_hitbox, enemy) => {
            (enemy as Enemy).takeDamage(20);
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
    }

    private spawnWave() {
        const { width, height } = this.scale;
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0: x = Phaser.Math.Between(0, width); y = -50; break;
            case 1: x = width + 50; y = Phaser.Math.Between(0, height); break;
            case 2: x = Phaser.Math.Between(0, width); y = height + 50; break;
            default: x = -50; y = Phaser.Math.Between(0, height); break;
        }

        const player = this.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const enemy = new Enemy(this, x, y, player);
        this.enemies.add(enemy);
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
        let speed = 250;

        if (isAttacking) {
            player.setVelocity(0, 0);
            return;
        }

        // Handle Block
        if (this.keyF.isDown) {
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
        if (Phaser.Input.Keyboard.JustDown(spaceBar) && !this.keyF.isDown) {
            this.data.set('isAttacking', true);
            player.play('player-attack');

            // Enable hitbox during middle of animation
            this.time.delayedCall(150, () => {
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

        if (cursors.left.isDown || this.wasd.A.isDown) {
            vx = -speed;
            player.setFlipX(true);
        } else if (cursors.right.isDown || this.wasd.D.isDown) {
            vx = speed;
            player.setFlipX(false);
        }

        if (cursors.up.isDown || this.wasd.W.isDown) {
            vy = -speed;
        } else if (cursors.down.isDown || this.wasd.S.isDown) {
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

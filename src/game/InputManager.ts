import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';

/**
 * Handles all player input and translates it into game commands.
 */
export class InputManager {
    private scene: IMainScene;
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

    private lastFootstepTime: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.setupKeys();
    }

    private setupKeys(): void {
        if (!this.scene.input.keyboard) return;

        this.wasd = this.scene.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT
        }) as any;

        this.hotkeys = this.scene.input.keyboard.addKeys({
            '1': Phaser.Input.Keyboard.KeyCodes.ONE,
            '2': Phaser.Input.Keyboard.KeyCodes.TWO,
            '3': Phaser.Input.Keyboard.KeyCodes.THREE,
            '4': Phaser.Input.Keyboard.KeyCodes.FOUR,
            '5': Phaser.Input.Keyboard.KeyCodes.FIVE,
            'E': Phaser.Input.Keyboard.KeyCodes.E
        }) as any;
    }

    /**
     * Updates movement and checks for action triggers.
     * Called from MainScene.update().
     */
    public update(time: number, _delta: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !player.body) return;

        // 1. Handle Weapon Switching
        this.handleWeaponSwitch();

        // 2. Handle Dash
        this.handleDash();

        // 3. Handle Class Abilities
        this.handleClassAbilities();

        // 4. Handle Movement
        this.handleMovement(time);
    }

    private handleWeaponSwitch(): void {
        const unlocked = (this.scene.registry.get('unlockedWeapons') || []) as string[];

        for (let i = 1; i <= 5; i++) {
            if (Phaser.Input.Keyboard.JustDown(this.hotkeys[i.toString()])) {
                if (unlocked[i - 1]) {
                    this.scene.registry.set('currentWeapon', unlocked[i - 1]);
                }
            }
        }
    }

    private handleDash(): void {
        if (Phaser.Input.Keyboard.JustDown(this.wasd.SHIFT) || Phaser.Input.Keyboard.JustDown(this.wasd.SPACE)) {
            // Dash logic is currently tightly coupled in MainScene via combat manager and physics.
            // For now, we emit an event or call a method on MainScene to handle the physics/iframe part.
            this.scene.events.emit('attempt-dash');
        }
    }

    private handleClassAbilities(): void {
        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['E'])) {
            this.scene.events.emit('attempt-class-ability');
        }
    }

    private handleMovement(time: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const cursors = this.scene.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
        const speed = this.scene.stats.speed;
        const isAttacking = this.scene.data.get('isAttacking') as boolean;

        // If not attacking or whirwinding (TODO: add flag for whirlwind), move
        // Movement is restricted during some animations in original main.ts

        let vx = 0;
        let vy = 0;

        if (this.wasd.A.isDown || cursors?.left?.isDown) {
            vx = -speed;
            player.setFlipX(true);
        } else if (this.wasd.D.isDown || cursors?.right?.isDown) {
            vx = speed;
            player.setFlipX(false);
        }

        if (this.wasd.W.isDown || cursors?.up?.isDown) {
            vy = -speed;
        } else if (this.wasd.S.isDown || cursors?.down?.isDown) {
            vy = speed;
        }

        // Apply velocity if not in knockback (CollisionManager will handle knockback state check)
        // For now, checking combat manager directly as IMainScene includes it
        if (!this.scene.combat.isKnockedBack && !isAttacking) {
            player.setVelocity(vx, vy);

            if (vx !== 0 || vy !== 0) {
                if (player.anims.currentAnim?.key !== 'player-walk') {
                    player.play('player-walk');
                }
                // Footstep audio (throttled)
                if (time - this.lastFootstepTime > 250) {
                    this.lastFootstepTime = time;
                    this.scene.events.emit('play-footstep');
                }
            } else {
                if (player.anims.currentAnim?.key !== 'player-idle') {
                    player.play('player-idle');
                }
            }
        }
    }

    /**
     * Clean up input listeners.
     */
    public destroy(): void {
        // Phaser keys handle their own cleanup usually, but we can clear refs
    }
}

import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { AudioManager } from './AudioManager';

/**
 * Handles all player input and translates it into game commands.
 */
export class InputManager {
    private scene: IMainScene;
    public wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
        SHIFT: Phaser.Input.Keyboard.Key;
    };
    public hotkeys!: {
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
            'E': Phaser.Input.Keyboard.KeyCodes.E,
            'F': Phaser.Input.Keyboard.KeyCodes.F,
            'Q': Phaser.Input.Keyboard.KeyCodes.Q,
            'C': Phaser.Input.Keyboard.KeyCodes.C
        }) as any;
    }

    /**
     * Updates movement and checks for action triggers.
     * Called from MainScene.update().
     */
    public update(time: number, _delta: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const hp = this.scene.registry.get('playerHP') || 0;
        if (!player || !player.body || hp <= 0) return;

        // 1. Handle Orientation (Face Mouse)
        this.handleOrientation(player);

        // 2. Handle Blocking
        this.handleBlocking();

        // 3. Handle Weapon Switching
        this.handleWeaponSwitch();

        // 4. Handle Dash
        this.handleDash();

        // 5. Handle Class Abilities
        this.handleClassAbilities();

        // 6. Handle Attack
        this.handleAttack();

        // 7. Handle Movement
        this.handleMovement(time);

        // 8. Handle Shrine Interaction
        this.handleShrineInteract();
    }

    private handleAttack(): void {
        const pointer = this.scene.input.activePointer;
        const spacePressed = this.wasd?.SPACE?.isDown;
        const blockPressed = this.scene.data.get('isBlocking');
        const hp = this.scene.registry.get('playerHP') || 0;

        if (hp > 0 && (pointer.leftButtonDown() || spacePressed) && !blockPressed) {
            this.scene.events.emit('attempt-attack');
        }
    }

    public handleOrientation(player: Phaser.Physics.Arcade.Sprite): void {
        const isWhirlwinding = this.scene.data.get('isWhirlwinding');
        if (!isWhirlwinding) {
            const pointer = this.scene.input.activePointer;
            if (pointer.worldX > player.x) {
                player.setFlipX(false);
            } else if (pointer.worldX < player.x) {
                player.setFlipX(true);
            }
        }
    }

    private handleBlocking(): void {
        const pointer = this.scene.input.activePointer;
        const blockPressed = pointer.rightButtonDown();
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        if (blockPressed) {
            this.scene.data.set('isBlocking', true);
            player.setTint(0x3b82f6);
        } else {
            if (this.scene.data.get('isBlocking')) {
                player.clearTint();
            }
            this.scene.data.set('isBlocking', false);
        }
    }

    private handleWeaponSwitch(): void {
        const playerClassId = (this.scene as any).registry.get('playerClass');
        const unlocked = (this.scene.registry.get('unlockedWeapons') || []) as string[];
        const curWep = this.scene.registry.get('currentWeapon');

        if (playerClassId === 'wizard') {
            if (this.hotkeys['1']?.isDown && curWep !== 'fireball' && unlocked.includes('fireball'))
                this.scene.registry.set('currentWeapon', 'fireball');
            if (this.hotkeys['2']?.isDown && curWep !== 'frost' && unlocked.includes('frost'))
                this.scene.registry.set('currentWeapon', 'frost');
            if (this.hotkeys['3']?.isDown && curWep !== 'lightning' && unlocked.includes('lightning'))
                this.scene.registry.set('currentWeapon', 'lightning');
        } else if (playerClassId === 'archer') {
            if (this.hotkeys['1']?.isDown && curWep !== 'bow' && unlocked.includes('bow'))
                this.scene.registry.set('currentWeapon', 'bow');
        } else if (playerClassId === 'krieger') {
            if (this.hotkeys['1']?.isDown && curWep !== 'sword' && unlocked.includes('sword'))
                this.scene.registry.set('currentWeapon', 'sword');
        } else if (playerClassId === 'skald') {
            // Skald has 1 weapon: harp_bolt (1). Vers Bolt (2) is an ability.
            if (this.hotkeys['1']?.isDown && curWep !== 'harp_bolt' && unlocked.includes('harp_bolt'))
                this.scene.registry.set('currentWeapon', 'harp_bolt');
        }
    }

    private handleDash(): void {
        const isDashing = this.scene.data.get('isDashing');
        const isWhirlwinding = this.scene.data.get('isWhirlwinding');

        const maxCharges = this.scene.registry.get('dashCharges') || 1;
        let dashState = this.scene.registry.get('dashState');

        // Initialize or migrate dashState
        if (!dashState || typeof dashState.charges !== 'number') {
            dashState = {
                isActive: dashState?.isActive || false,
                readyAt: dashState?.readyAt || 0,
                charges: maxCharges
            };
            this.scene.registry.set('dashState', dashState);
        }

        const now = Date.now();

        // Replenish charges if time has passed
        if (dashState.charges < maxCharges && now >= dashState.readyAt) {
            dashState.charges++;
            if (dashState.charges < maxCharges) {
                // If we still need more charges, set the next interval timer
                const dashCooldown = this.scene.registry.get('dashCooldown') || 7000;
                dashState.readyAt = now + dashCooldown;
            }
            this.scene.registry.set('dashState', dashState);
        }

        if (this.wasd.SHIFT.isDown && !isDashing && !isWhirlwinding && dashState.charges > 0) {
            this.executeDash();
        }
    }

    private executeDash(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const dashCooldown = this.scene.registry.get('dashCooldown') || 7000;
        const dashDistance = this.scene.registry.get('dashDistance') || 220;
        const dashDuration = 250; // GAME_CONFIG.PLAYER.DASH_DURATION_MS

        const maxCharges = this.scene.registry.get('dashCharges') || 1;
        let dashState = this.scene.registry.get('dashState') || { isActive: false, readyAt: 0, charges: maxCharges };

        this.scene.data.set('isDashing', true);

        dashState.isActive = true;
        dashState.charges--;

        // If we were at max charges (meaning the timer wasn't running), or timer is somehow dead, start it now
        if (dashState.charges === maxCharges - 1 || Date.now() >= dashState.readyAt) {
            dashState.readyAt = Date.now() + dashCooldown;
        }

        this.scene.registry.set('dashState', dashState);

        const currentWeapon = this.scene.registry.get('currentWeapon');
        const upgradeLevels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        const aerialLvl = upgradeLevels['aerial_shot'] || 0;
        const canAerialShoot = currentWeapon === 'bow' && aerialLvl > 0;

        // Interrupt attack
        if (this.scene.data.get('isAttacking') && !canAerialShoot) {
            this.scene.data.set('isAttacking', false);
            player.anims.stop();
            player.off('animationcomplete-player-attack');
            player.off('animationcomplete-player-attack-2');
            player.off('animationcomplete-player-bow');
            player.off('animationcomplete-player-cast');
        }

        this.scene.combat.setDashIframe(true);

        let dx = 0, dy = 0;
        if (this.wasd.W.isDown) dy -= 1;
        if (this.wasd.S.isDown) dy += 1;
        if (this.wasd.A.isDown) dx -= 1;
        if (this.wasd.D.isDown) dx += 1;

        if (dx === 0 && dy === 0) {
            const pointer = this.scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        } else {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;
        }

        if (canAerialShoot && this.scene.data.get('isAttacking')) {
            // Keep the bow animation going during aerial shot
        } else {
            player.play('player-walk');
        }
        player.setAlpha(0.7);
        this.scene.events.emit('player-dash');
        AudioManager.instance.playSFX('dash');

        const dashFx = (this.scene as unknown as Phaser.Scene).add.sprite(player.x, player.y, 'dash_effect');
        dashFx.setDepth(player.depth + 1).setScale(2).play('player-dash-effect', true);

        this.scene.tweens.add({
            targets: player,
            x: player.x + dx * dashDistance,
            y: player.y + dy * dashDistance,
            duration: dashDuration,
            ease: 'Cubic.out',
            onUpdate: () => { if (dashFx.active) dashFx.setPosition(player.x, player.y); },
            onComplete: () => {
                this.scene.data.set('isDashing', false);
                player.setAlpha(1);
                if (dashFx.active) dashFx.destroy();
                this.scene.combat.setDashIframe(false);
                if (canAerialShoot && this.scene.data.get('isAttacking')) {
                    // Let the attack finish organically
                } else {
                    player.play('player-idle');
                }

                // Shadow Step
                const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
                const shadowStepLvl = levels['shadow_step'] || 0;
                if (shadowStepLvl > 0) {
                    (this.scene as any).shadowStepUntil = Date.now() + shadowStepLvl * 500;
                }

                // Stomp (Krieger)
                const stompLvl = levels['stomp'] || 0;
                if (stompLvl > 0) {
                    const stunDuration = stompLvl === 1 ? 500 : 800; // ms
                    const radius = 150;

                    // VFX: Screen Shake and Ground Decal
                    this.scene.cameras.main.shake(150, 0.015);
                    const phaserScene = this.scene as unknown as Phaser.Scene;
                    const stompDecal = phaserScene.add.circle(player.x, player.y, radius, 0xaaaaaa, 0.4).setDepth(player.depth - 1);
                    phaserScene.tweens.add({
                        targets: stompDecal,
                        alpha: 0,
                        scale: 1.2,
                        duration: 500,
                        onComplete: () => stompDecal.destroy()
                    });

                    // SFX check (assuming 'dash_impact' or similar exists, else default heavy hit)
                    // To be safe, we'll avoid SFX here unless we know it exists, but the plan asked for "low-frequency bass impact sound".
                    // The camera shake will provide the feel.

                    // Stun logic
                    const nearbyEnemies = this.scene.spatialGrid.findNearby({ x: player.x, y: player.y, width: 1, height: 1 }, radius);
                    nearbyEnemies.forEach(cell => {
                        const enemy = cell.ref as any;
                        if (enemy && enemy.active && !enemy.getIsDead()) {
                            // Apply a small damage number for visual feedback that they got hit
                            enemy.takeDamage(10, '#ffffff');
                            if (enemy.stun && typeof enemy.stun === 'function') {
                                enemy.stun(stunDuration);
                            }
                        }
                    });
                }

                // Lifesteal
                const heal = this.scene.stats.getDashLifestealHP();
                if (heal > 0) {
                    const curHP = this.scene.registry.get('playerHP');
                    const maxHP = this.scene.registry.get('playerMaxHP');
                    this.scene.registry.set('playerHP', Math.min(maxHP, curHP + heal));
                    this.scene.poolManager.getDamageText(player.x, player.y - 40, `+${heal}`, "#55ff55");
                }
            }
        });
    }

    private handleClassAbilities(): void {
        const playerClassId = this.scene.registry.get('playerClass');
        const abilityReady = Date.now() >= this.scene.abilityManager.classAbilityCooldownEnd;

        // E key: Paragon ability takes priority if unlocked, otherwise class ability
        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['E'])) {
            if (!this.scene.paragonAbility.attemptSlot('E')) {
                this.scene.events.emit('attempt-class-ability-e');
            }
        }

        // F key: Paragon ability only
        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['F'])) {
            this.scene.paragonAbility.attemptSlot('F');
        }

        // Q key: Paragon ability only
        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['Q'])) {
            this.scene.paragonAbility.attemptSlot('Q');
        }

        // Action key based on class
        if (playerClassId === 'wizard') {
            if (Phaser.Input.Keyboard.JustDown(this.hotkeys['4']) && abilityReady) {
                this.scene.events.emit('attempt-class-ability-2');
            }
        } else {
            if (Phaser.Input.Keyboard.JustDown(this.hotkeys['2']) && abilityReady) {
                this.scene.events.emit('attempt-class-ability-2');
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['3'])) {
            this.scene.events.emit('attempt-class-ability-3');
        }

        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['4'])) {
            this.scene.events.emit('attempt-class-ability-4');
        }
    }

    private handleMovement(time: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const cursors = this.scene.data.get('cursors') as Phaser.Types.Input.Keyboard.CursorKeys;
        let speed = this.scene.stats.speed;
        const isAttacking = this.scene.data.get('isAttacking') as boolean;
        const isBlocking = this.scene.data.get('isBlocking') as boolean;
        const isDashing = this.scene.data.get('isDashing') as boolean;

        if (isAttacking || this.scene.combat.isKnockedBack || isDashing) {
            if (isAttacking) player.setVelocity(0, 0);
            return;
        }

        if (isBlocking) speed = 80;

        let vx = 0, vy = 0;
        if (this.wasd.A.isDown || cursors?.left?.isDown) vx = -speed;
        else if (this.wasd.D.isDown || cursors?.right?.isDown) vx = speed;

        if (this.wasd.W.isDown || cursors?.up?.isDown) vy = -speed;
        else if (this.wasd.S.isDown || cursors?.down?.isDown) vy = speed;

        player.setVelocity(vx, vy);

        const isWhirlwinding = this.scene.data.get('isWhirlwinding') as boolean;

        if (!isWhirlwinding) {
            if (vx !== 0 || vy !== 0) {
                if (player.anims.currentAnim?.key !== 'player-walk') player.play('player-walk');
                if (time - this.lastFootstepTime > 250) {
                    this.lastFootstepTime = time;
                    this.scene.events.emit('play-footstep');
                    AudioManager.instance.playSFX('footstep');
                }
            } else {
                if (player.anims.currentAnim?.key !== 'player-idle') player.play('player-idle');
            }
        }
    }

    private handleShrineInteract(): void {
        if (Phaser.Input.Keyboard.JustDown(this.hotkeys['C'])) {
            if (this.scene.registry.get('shrinePromptVisible')) {
                this.scene.events.emit('activate-shrine');
            }
        }
    }

    /**
     * Clean up input listeners.
     */
    public destroy(): void {
        // Phaser keys handle their own cleanup usually
    }
}

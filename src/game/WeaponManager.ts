import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { GAME_CONFIG } from '../config/GameConfig';
import { PacketType } from '../network/SyncSchemas';
import { Arrow } from './Arrow';
import { Fireball } from './Fireball';
import { FrostBolt } from './FrostBolt';
import { LightningBolt } from './LightningBolt';
import { EclipseWake } from './EclipseWake';

/**
 * Manages player weapon execution, cooldowns, and network synchronization.
 */
export class WeaponManager {
    private scene: IMainScene;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /**
     * Executes the primary attack logic for the current weapon.
     * @param angle The angle (radians) towards the target (usually mouse pointer).
     */
    public handleWeaponExecution(angle: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !player.active) return;

        const currentWeapon = this.scene.registry.get('currentWeapon');
        const lastCd = this.scene.registry.get('weaponCooldown');
        if (lastCd && Date.now() < lastCd.timestamp + lastCd.duration) return;

        this.scene.data.set('isAttacking', true);

        // Safety valve to reset attack state if animation fails or hangs
        this.scene.time.delayedCall(1500, () => {
            if (this.scene.data.get('isAttacking')) {
                this.scene.data.set('isAttacking', false);
                player.play('player-idle');
            }
        });

        switch (currentWeapon) {
            case 'sword':
                this.executeSwordAttack(player, angle);
                break;
            case 'bow':
                this.executeBowAttack(player, angle);
                break;
            case 'fireball':
                this.executeFireballAttack(player, angle);
                break;
            case 'frost':
                this.executeFrostAttack(player, angle);
                break;
            case 'lightning':
                this.executeLightningAttack(player, angle);
                break;
        }
    }

    private executeSwordAttack(player: Phaser.Physics.Arcade.Sprite, angle: number): void {
        const attackSpeedMult = this.scene.registry.get('playerAttackSpeed') || 1;
        const swordCooldown = GAME_CONFIG.WEAPONS.SWORD.cooldown / attackSpeedMult;

        const ATTACK_ANIMS = ['player-attack', 'player-attack-2'];
        const idx = this.scene.data.get('attackAnimIndex') || 0;
        const attackAnimKey = ATTACK_ANIMS[idx];
        this.scene.data.set('attackAnimIndex', (idx + 1) % ATTACK_ANIMS.length);

        this.scene.registry.set('weaponCooldown', { duration: swordCooldown, timestamp: Date.now() });

        this.scene.collisions.currentSwingHitIds.clear();

        player.play(attackAnimKey);
        this.scene.events.emit('player-swing');

        this.scene.networkManager?.broadcast({
            t: PacketType.GAME_EVENT,
            ev: {
                type: 'attack',
                data: { id: this.scene.networkManager.peerId, weapon: 'sword', anim: attackAnimKey, angle }
            },
            ts: Date.now()
        });

        this.scene.time.delayedCall(Math.max(100, swordCooldown * 0.3), () => {
            // Avant-Garde Juice: Micro-shake and directional spark burst
            this.scene.cameras.main.shake(80, 0.005);
            // Adjust start position to be slightly in front of the character
            const reach = 25;
            const pyCenter = player.y - 10; // A bit lower than helmet
            const px = player.x + Math.cos(angle) * reach;
            const py = pyCenter + Math.sin(angle) * reach;

            const angleDeg = Phaser.Math.RadToDeg(angle);
            // Spark amount depends on graphics quality
            const sparkCount = Math.max(10, Math.floor(25 * (this.scene.quality?.particleMultiplier || 1.0)));

            // Wide Swing Upgrade
            const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
            const wideSwingLvl = levels['wide_swing'] || 0;
            const wideSwingMult = 1 + (wideSwingLvl * 0.30); // 30%, 60%, 90% increase
            const hitRadius = 40 * wideSwingMult;
            const swingArcAngle = 35 * wideSwingMult;

            // Bulletproof Emission using native Phaser 3.60 API
            this.scene.swordSparkEmitter.setEmitterAngle({ min: angleDeg - swingArcAngle, max: angleDeg + swingArcAngle });
            // Scale up spark count slightly based on width
            this.scene.swordSparkEmitter.emitParticleAt(px, py, Math.floor(sparkCount * wideSwingMult));

            this.scene.collisions.enableAttackHitbox(px, py, hitRadius);
            this.scene.time.delayedCall(100, () => {
                this.scene.collisions.disableAttackHitbox();
            });
        });

        player.once(`animationcomplete-${attackAnimKey}`, () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });

        // ECLIPSE STRIKE (Krieger/General upgrade)
        const eclipseLevel = this.scene.registry.get('playerEclipseLevel') || 0;
        if (eclipseLevel > 0) {
            const offset = GAME_CONFIG.WEAPONS.ECLIPSE.spawnOffset;
            const vx = player.x + Math.cos(angle) * offset;
            const vy = player.y + Math.sin(angle) * offset;

            const wake = this.scene.eclipseWakes.get(vx, vy) as EclipseWake;
            if (wake) {
                const wakeDamage = this.scene.stats.damage * 0.3 * eclipseLevel;
                wake.spawn(vx, vy, angle, wakeDamage);
            }
        }
    }

    private executeBowAttack(player: Phaser.Physics.Arcade.Sprite, angle: number): void {
        const bowCooldown = this.scene.stats.playerCooldown;
        this.scene.registry.set('weaponCooldown', { duration: bowCooldown, timestamp: Date.now() });
        player.play('player-bow');

        this.scene.time.delayedCall(bowCooldown * 0.5, () => {
            const arrowDamageMultiplier = this.scene.registry.get('playerArrowDamageMultiplier') || 1;
            const arrowSpeed = this.scene.registry.get('playerArrowSpeed') || GAME_CONFIG.WEAPONS.BOW.speed;
            const pierceCount = this.scene.registry.get('playerPierceCount') || 0;
            const explosiveLevel = this.scene.registry.get('playerExplosiveLevel') || 0;
            const baseDamage = this.scene.stats.damage * GAME_CONFIG.WEAPONS.BOW.damageMult * arrowDamageMultiplier;
            const singularityLevel = this.scene.registry.get('playerSingularityLevel') || 0;
            const poisonLevel = this.scene.registry.get('playerPoisonLevel') || 0;

            const arrow = this.scene.arrows.get(player.x, player.y) as Arrow;
            if (arrow) {
                arrow.fire(player.x, player.y, angle, baseDamage, arrowSpeed, pierceCount, explosiveLevel, singularityLevel, poisonLevel);

                this.scene.events.emit('bow-shot');

                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'attack',
                        data: { id: this.scene.networkManager.peerId, weapon: 'bow', anim: 'player-bow', angle }
                    },
                    ts: Date.now()
                });

                const projectiles = this.scene.registry.get('playerProjectiles') || 1;
                if (projectiles > 1) {
                    for (let i = 1; i < projectiles; i++) {
                        const offset = Math.ceil(i / 2) * 10 * (Math.PI / 180) * (i % 2 === 0 ? -1 : 1);
                        const subArrow = this.scene.arrows.get(player.x, player.y) as Arrow;
                        if (subArrow) subArrow.fire(player.x, player.y, angle + offset, baseDamage, arrowSpeed, pierceCount, explosiveLevel, 0, poisonLevel);
                    }
                }
            }
        });

        player.once('animationcomplete-player-bow', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }

    private executeFireballAttack(player: Phaser.Physics.Arcade.Sprite, angle: number): void {
        const fireCd = GAME_CONFIG.WEAPONS.FIREBALL.cooldown;
        this.scene.registry.set('weaponCooldown', { duration: fireCd, timestamp: Date.now() });
        player.play('player-bow'); // Wizard uses bow anim for cast currently
        this.scene.events.emit('fireball-cast');

        this.scene.time.delayedCall(100, () => {
            const fireball = this.scene.fireballs.get(player.x, player.y) as Fireball;
            if (fireball) {
                const cascadeBonus = Date.now() < this.scene.abilityManager.cascadeActiveUntil ? 1.5 + ((this.scene.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
                fireball.fire(player.x, player.y, angle, this.scene.stats.damage * GAME_CONFIG.WEAPONS.FIREBALL.damageMult * (this.scene.registry.get('fireballDamageMulti') || 1) * cascadeBonus);

                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'attack', data: { id: this.scene.networkManager.peerId, weapon: 'fire', anim: 'player-cast', angle } },
                    ts: Date.now()
                });
            }
        });

        player.once('animationcomplete-player-bow', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }

    private executeFrostAttack(player: Phaser.Physics.Arcade.Sprite, angle: number): void {
        const frostCd = GAME_CONFIG.WEAPONS.FROST.cooldown;
        this.scene.registry.set('weaponCooldown', { duration: frostCd, timestamp: Date.now() });
        player.play('player-cast');

        const pointer = this.scene.input.activePointer;
        const frostTarget = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

        this.scene.time.delayedCall(100, () => {
            const frostBolt = this.scene.frostBolts.get(player.x, player.y) as FrostBolt;
            if (frostBolt) {
                const cascadeBonus = Date.now() < this.scene.abilityManager.cascadeActiveUntil ? 1.5 + ((this.scene.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
                frostBolt.fire(player.x, player.y, frostTarget.x, frostTarget.y, this.scene.stats.damage * GAME_CONFIG.WEAPONS.FROST.damageMult * (this.scene.registry.get('frostDamageMulti') || 1) * cascadeBonus);
                this.scene.events.emit('frost-cast');

                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'attack', data: { id: this.scene.networkManager.peerId, weapon: 'frost', anim: 'player-cast', angle } },
                    ts: Date.now()
                });
            }
        });

        player.once('animationcomplete-player-cast', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }

    private executeLightningAttack(player: Phaser.Physics.Arcade.Sprite, angle: number): void {
        const ltgCd = GAME_CONFIG.WEAPONS.LIGHTNING.cooldown;
        this.scene.registry.set('weaponCooldown', { duration: ltgCd, timestamp: Date.now() });
        player.play('player-cast');
        const pointer = this.scene.input.activePointer;
        const ltTarget = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

        this.scene.time.delayedCall(100, () => {
            const cascadeBonus = Date.now() < this.scene.abilityManager.cascadeActiveUntil ? 1.5 + ((this.scene.registry.get('upgradeLevels') || {})['cascade_damage'] || 0) * 0.15 : 1;
            const baseDamage = this.scene.stats.damage * GAME_CONFIG.WEAPONS.LIGHTNING.damageMult * (this.scene.registry.get('lightningDamageMulti') || 1) * cascadeBonus;
            const bolt = this.scene.lightningBolts.get(player.x, player.y) as LightningBolt;
            if (bolt) {
                bolt.fire(player.x, player.y, ltTarget.x, ltTarget.y, baseDamage, this.scene.registry.get('lightningBounces') || GAME_CONFIG.WEAPONS.LIGHTNING.bounces, new Set(), angle);
            }
            this.scene.events.emit('lightning-cast');

            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'attack', data: { id: this.scene.networkManager.peerId, weapon: 'lightning', anim: 'player-cast', angle } },
                ts: Date.now()
            });
        });

        player.once('animationcomplete-player-cast', () => {
            this.scene.data.set('isAttacking', false);
            player.play('player-idle');
        });
    }
}

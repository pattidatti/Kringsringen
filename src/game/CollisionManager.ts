import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { EnemyProjectile } from './EnemyProjectile';
import { Coin } from './Coin';
import { PacketType } from '../network/SyncSchemas';

/**
 * Manages all physics colliders, overlaps, and the core combat damage pipeline.
 */
export class CollisionManager {
    private scene: IMainScene;
    private attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private currentSwingHitIds: Set<string> = new Set();

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.init();
    }

    private init(): void {
        this.setupAttackHitbox();
        this.setupColliders();
    }

    private setupAttackHitbox(): void {
        const phaserScene = this.scene as unknown as Phaser.Scene;
        this.attackHitbox = phaserScene.add.rectangle(0, 0, 60, 60, 0xff0000, 0) as any;
        phaserScene.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body!.setCircle(30);
        this.attackHitbox.body!.setEnable(false);
    }

    private setupColliders(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const phaserScene = this.scene as unknown as Phaser.Scene;

        // Player vs Obstacles
        phaserScene.physics.add.collider(player, this.scene.obstacles);

        // Host/Singleplayer authority colliders
        if (this.scene.networkManager?.role !== 'client') {
            phaserScene.physics.add.collider(player, this.scene.enemies);
            phaserScene.physics.add.collider(this.scene.enemies, this.scene.enemies);
            phaserScene.physics.add.collider(this.scene.bossGroup, this.scene.obstacles);
        }

        phaserScene.physics.add.collider(this.scene.enemies, this.scene.obstacles);
        phaserScene.physics.add.collider(player, this.scene.bossGroup);

        // Projectile vs Players
        phaserScene.physics.add.overlap(
            (this.scene as any).enemyProjectiles,
            (this.scene as any).players,
            (_projectile, _target) => {
                (_projectile as EnemyProjectile).onHitPlayer(_target);
            }
        );

        // Melee Attack Hitbox vs Enemies
        phaserScene.physics.add.overlap(this.attackHitbox, this.scene.enemies, (_hitbox, enemy) => {
            this.handlePlayerMeleeHit(enemy as Enemy);
        });

        // Melee Attack Hitbox vs Boss
        phaserScene.physics.add.overlap(this.attackHitbox, this.scene.bossGroup, (_hitbox, boss) => {
            this.handlePlayerMeleeHit(boss as BossEnemy);
        });
    }

    private handlePlayerMeleeHit(target: Enemy | BossEnemy): void {
        if (this.currentSwingHitIds.has(target.id)) return;
        this.currentSwingHitIds.add(target.id);

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        if (this.scene.networkManager?.role === 'client') {
            this.sendHitRequest(target);
        } else {
            this.applyAuthorityMeleeHit(target, player);
        }
    }

    private sendHitRequest(target: Enemy | BossEnemy): void {
        const now = Date.now();
        const lastReq = target.getData('lastHitRequest') || 0;
        if (now - lastReq > 250) {
            target.setData('lastHitRequest', now);
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: {
                    type: 'hit_request',
                    data: {
                        enemyId: target instanceof BossEnemy ? 'boss' : (target as Enemy).id,
                        hitX: this.attackHitbox.x,
                        hitY: this.attackHitbox.y,
                        damage: this.scene.stats.damage
                    }
                },
                ts: this.scene.networkManager.getServerTime()
            });

            // Client-side prediction
            if (target instanceof Enemy) target.predictDamage(this.scene.stats.damage);
            this.scene.poolManager.getDamageText(target.x, target.y - 30, this.scene.stats.damage, '#ffcc00');
            this.scene.events.emit('enemy-hit');
        }
    }

    private applyAuthorityMeleeHit(target: Enemy | BossEnemy, player: Phaser.Physics.Arcade.Sprite): void {
        const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
        let swordDamage = this.scene.stats.damage;

        // ── Phase 6 Upgrade Multipliers (Warrior) ──

        // Executioner
        const execLvl = levels['executioner'] || 0;
        if (execLvl > 0 && target.hp / target.maxHP < 0.25) {
            swordDamage *= 1 + execLvl * 0.5;
        }

        // Heavy Momentum
        const momentumLvl = levels['heavy_momentum'] || 0;
        if (momentumLvl > 0) {
            const now = Date.now();
            const momentumStacks = this.scene.data.get('momentumStacks') || 0;
            const momentumLastTime = this.scene.data.get('momentumLastHitTime') || 0;

            let currentStacks = now - momentumLastTime > 3000 ? 0 : momentumStacks;
            swordDamage *= (1 + currentStacks * 0.10);

            const nextStacks = Math.min(currentStacks + 1, momentumLvl * 3);
            this.scene.data.set('momentumStacks', nextStacks);
            this.scene.data.set('momentumLastHitTime', now);
        }

        // Battle Cry
        const battleCryActiveUntil = this.scene.data.get('battleCryActiveUntil') || 0;
        if (Date.now() < battleCryActiveUntil) {
            const battleCryLvl = levels['battle_cry'] || 0;
            swordDamage *= 1 + battleCryLvl * 0.15;
        }

        // Berserker Rage (HP ratio passive)
        const berserkerMulti = this.scene.data.get('berserkerMulti') || 1;
        swordDamage *= berserkerMulti;

        const wasAlive = target.hp > 0;
        target.takeDamage(swordDamage, '#ffcc00');
        target.pushback(player.x, player.y, this.scene.stats.knockback);

        // Utstotbar Slag (AOE knockback on hit)
        const utstotbarLvl = levels['utstotbar_slag'] || 0;
        if (utstotbarLvl > 0 && target instanceof Enemy) {
            const nearby = this.scene.spatialGrid.findNearby({ x: target.x, y: target.y, width: 1, height: 1 }, 150);
            nearby.forEach(cell => {
                if (cell.ref !== target && cell.ref && (cell.ref as Enemy).active && !(cell.ref as Enemy).getIsDead()) {
                    const neighbor = cell.ref as Enemy;
                    neighbor.takeDamage(swordDamage * 0.4, '#ff8800');
                    neighbor.pushback(target.x, target.y, this.scene.stats.knockback * 0.6);
                }
            });
        }

        // Melee Kill Effects
        if (wasAlive && target.hp <= 0) {
            this.handleMeleeKill(levels, player);
        }
    }

    private handleMeleeKill(levels: Record<string, number>, player: Phaser.Physics.Arcade.Sprite): void {
        // Livsstaling (Heal on melee kill)
        const livsstalLvl = levels['livsstaling'] || 0;
        if (livsstalLvl > 0) {
            const heal = livsstalLvl * 8;
            const curHP = this.scene.registry.get('playerHP') || 0;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            this.scene.registry.set('playerHP', Math.min(maxHP, curHP + heal));
            this.scene.poolManager.getDamageText(player.x, player.y - 50, `+${heal}`, '#55ff55');
        }

        // Battle Cry (Kill counter)
        const battleCryLvl = levels['battle_cry'] || 0;
        if (battleCryLvl > 0) {
            let kills = (this.scene.data.get('battleCryKills') || 0) + 1;
            if (kills >= 5) {
                kills = 0;
                this.scene.data.set('battleCryActiveUntil', Date.now() + 8000);
                this.scene.poolManager.getDamageText(player.x, player.y - 70, 'BATTLE CRY!', '#ffaa00');
            }
            this.scene.data.set('battleCryKills', kills);
        }
    }

    public enableAttackHitbox(x: number, y: number, radius: number): void {
        this.attackHitbox.setPosition(x, y);
        this.attackHitbox.body!.setCircle(radius);
        this.attackHitbox.body!.setEnable(true);
        this.currentSwingHitIds.clear();
    }

    public disableAttackHitbox(): void {
        this.attackHitbox.body!.setEnable(false);
    }

    public update(): void {
        // Any per-frame collision updates go here
    }

    public destroy(): void {
        if (this.attackHitbox) this.attackHitbox.destroy();
    }
}

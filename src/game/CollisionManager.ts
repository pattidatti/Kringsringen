import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { Enemy } from './Enemy';
import { BossEnemy } from './BossEnemy';
import { EnemyProjectile } from './EnemyProjectile';
import { PacketType } from '../network/SyncSchemas';

/**
 * Manages all physics colliders, overlaps, and the core combat damage pipeline.
 */
export class CollisionManager {
    private scene: IMainScene;
    public attackHitbox!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    public currentSwingHitIds: Set<string> = new Set();

    constructor(scene: IMainScene) {
        this.scene = scene;
        this.init();
    }

    private init(): void {
        this.setupAttackHitbox();
    }

    private setupAttackHitbox(): void {
        const phaserScene = this.scene as unknown as Phaser.Scene;
        this.attackHitbox = phaserScene.add.rectangle(0, 0, 80, 80, 0xff0000, 0) as any;
        phaserScene.physics.add.existing(this.attackHitbox);
        const body = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
        body.setCircle(40);
        body.setEnable(false);
    }

    public setupColliders(player: Phaser.Physics.Arcade.Sprite): void {
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

        // Projectile Reflection (Iron Bulwark)
        phaserScene.physics.add.overlap(
            (this.scene as any).enemyProjectiles,
            player,
            (projectile: any, _player: any) => {
                const bulwarkActiveUntil = this.scene.registry.get('bulwarkActiveUntil') || 0;
                if (Date.now() < bulwarkActiveUntil) {
                    // Reflect!
                    if (projectile.body) {
                        projectile.body.velocity.x *= -1.5;
                        projectile.body.velocity.y *= -1.5;
                        projectile.setRotation(Math.atan2(projectile.body.velocity.y, projectile.body.velocity.x));
                        projectile.setData('isReflected', true);
                        this.scene.poolManager.getDamageText(projectile.x, projectile.y - 20, "REFLECT!", "#ffdd44");

                        // Juice: Sparks and Shake
                        this.scene.swordSparkEmitter.emitParticleAt(projectile.x, projectile.y, 10);
                        this.scene.scaledShake(100, 0.005);
                    }
                } else {
                    // Normal hit logic (delegated to EnemyProjectile.onHitPlayer via overlap in EnemyProjectile)
                    // Note: EnemyProjectile already has its own overlap with players setup in its fire() or elsewhere?
                    // Actually, let's look at setupColliders again.
                }
            }
        );

        // Reflected Projectiles vs Enemies
        phaserScene.physics.add.overlap(
            (this.scene as any).enemyProjectiles,
            this.scene.enemies,
            (projectile: any, enemy: any) => {
                if (projectile.getData('isReflected')) {
                    enemy.takeDamage(this.scene.stats.damage * 2, '#ffdd44');
                    projectile.destroy(); // Or return to pool
                }
            }
        );

        // ── Fase 6: Wizard Nullifikasjon ──
        const playerProjectiles = [
            (this.scene as any).arrows,
            (this.scene as any).fireballs,
            (this.scene as any).frostBolts,
            (this.scene as any).lightningBolts,
            (this.scene as any).sonicBolts
        ].filter(group => group !== undefined); // Ensure groups exist

        phaserScene.physics.add.overlap(
            playerProjectiles,
            (this.scene as any).enemyProjectiles,
            (pProj: any, eProj: any) => {
                const levels = (this.scene.registry.get('upgradeLevels') || {}) as Record<string, number>;
                const nullLvl = levels['nullifikasjon'] || 0;

                if (nullLvl > 0 && pProj.active && eProj.active) {
                    // Destroy enemy projectile
                    if (eProj.destroy) eProj.destroy();

                    // UX: Violet implosion feedback
                    this.scene.poolManager.getDamageText(eProj.x, eProj.y - 10, 'NULLIFIED', '#cc88ff');

                    const sparks = phaserScene.add.particles(eProj.x, eProj.y, 'item_orb_purple', {
                        speed: { min: 50, max: 150 },
                        scale: { start: 0.5, end: 0 },
                        alpha: { start: 1, end: 0 },
                        lifespan: 300,
                        blendMode: 'ADD',
                        maxParticles: 12
                    });
                    sparks.setDepth(100);
                    phaserScene.time.delayedCall(400, () => sparks.destroy());
                }
            }
        );
    }

    /**
     * Sets up PVP-specific overlaps: player projectiles + melee vs remote players.
     */
    public setupPvpColliders(): void {
        const phaserScene = this.scene as unknown as Phaser.Scene;
        const isPvp = this.scene.registry.get('gameMode') === 'pvp';
        if (!isPvp) return;

        // Melee Attack Hitbox vs Remote Players
        phaserScene.physics.add.overlap(this.attackHitbox, this.scene.players, (_hitbox, target) => {
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (target === player) return; // Don't hit self

            if (!this.scene.registry.get('pvpFightActive')) return;

            // Rate-limit PVP hit requests
            const now = Date.now();
            const lastReq = (target as any).getData?.('lastPvpHitReq') || 0;
            if (now - lastReq < 250) return;
            (target as any).setData?.('lastPvpHitReq', now);

            // Find the remote player ID
            let targetId: string | undefined;
            for (const [id, sprite] of this.scene.networkPacketHandler.remotePlayers) {
                if (sprite === target) { targetId = id; break; }
            }
            if (!targetId) return;

            if (this.scene.networkManager?.role === 'client') {
                this.scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'pvp_hit_request',
                        data: {
                            targetId,
                            damage: this.scene.stats.damage,
                            hitX: this.attackHitbox.x,
                            hitY: this.attackHitbox.y
                        }
                    },
                    ts: this.scene.networkManager.getServerTime()
                });
            } else {
                // Host: apply damage directly
                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'damage_player',
                        data: { id: targetId, damage: this.scene.stats.damage, x: this.attackHitbox.x, y: this.attackHitbox.y }
                    },
                    ts: Date.now()
                });
                const mainScene = this.scene as any;
                mainScene.pvpRoundManager?.trackDamage(true, this.scene.stats.damage);
            }

            this.scene.poolManager.getDamageText((target as any).x, (target as any).y - 30, this.scene.stats.damage, '#ff4444');
            this.scene.events.emit('enemy-hit');
        });

        // Player projectiles vs remote players
        const projectileGroups = [
            (this.scene as any).arrows,
            (this.scene as any).fireballs,
            (this.scene as any).frostBolts,
            (this.scene as any).lightningBolts,
            (this.scene as any).sonicBolts,
        ].filter(g => g !== undefined);

        for (const group of projectileGroups) {
            phaserScene.physics.add.overlap(group, this.scene.players, (projectile: any, target: any) => {
                if (projectile.getData?.('pvpRemote')) return;
                const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
                if (target === player) return;
                if (!this.scene.registry.get('pvpFightActive')) return;
                if (!projectile.active) return;

                let targetId: string | undefined;
                for (const [id, sprite] of this.scene.networkPacketHandler.remotePlayers) {
                    if (sprite === target) { targetId = id; break; }
                }
                if (!targetId) return;

                const damage = projectile.damage || this.scene.stats.damage;

                if (this.scene.networkManager?.role === 'client') {
                    this.scene.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'pvp_projectile_hit',
                            data: {
                                targetId,
                                damage,
                                hitX: projectile.x,
                                hitY: projectile.y,
                                projectileType: projectile.projectileType || 'arrow'
                            }
                        },
                        ts: this.scene.networkManager.getServerTime()
                    });
                } else {
                    this.scene.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'damage_player',
                            data: { id: targetId, damage, x: projectile.x, y: projectile.y }
                        },
                        ts: Date.now()
                    });
                    const mainScene = this.scene as any;
                    mainScene.pvpRoundManager?.trackDamage(true, damage);
                }

                // Destroy projectile on hit
                if (projectile.disableBody) projectile.disableBody(true, true);
                else if (projectile.destroy) projectile.destroy();

                this.scene.poolManager.getDamageText(target.x, target.y - 30, damage, '#ff4444');
            });
        }
    }

    /**
     * Sets up 2v2 PvP overlaps with friendly-fire checks.
     */
    public setupPvp2v2Colliders(): void {
        const phaserScene = this.scene as unknown as Phaser.Scene;
        if (this.scene.registry.get('gameMode') !== 'pvp2v2') return;

        // Melee Attack Hitbox vs Remote Players (with team check)
        phaserScene.physics.add.overlap(this.attackHitbox, this.scene.players, (_hitbox, target) => {
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (target === player) return;
            if (!this.scene.registry.get('pvp2v2FightActive')) return;

            const now = Date.now();
            const lastReq = (target as any).getData?.('lastPvp2v2HitReq') || 0;
            if (now - lastReq < 250) return;
            (target as any).setData?.('lastPvp2v2HitReq', now);

            let targetId: string | undefined;
            for (const [id, sprite] of this.scene.networkPacketHandler.remotePlayers) {
                if (sprite === target) { targetId = id; break; }
            }
            if (!targetId) return;

            // Client-side friendly fire guard
            const teams = (this.scene.registry.get('pvp2v2Teams') || {}) as Record<string, 'A' | 'B'>;
            const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
            if (teams[targetId] === myTeam) return;

            const damage = this.scene.stats.damage;

            if (this.scene.networkManager?.role === 'client') {
                this.scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'pvp2v2_hit_request',
                        data: { targetId, damage, hitX: this.attackHitbox.x, hitY: this.attackHitbox.y }
                    },
                    ts: this.scene.networkManager.getServerTime()
                });
            } else {
                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'damage_player', data: { id: targetId, damage, x: this.attackHitbox.x, y: this.attackHitbox.y } },
                    ts: Date.now()
                });
                const mainScene = this.scene as any;
                mainScene.pvp2v2RoundManager?.trackTeamDamage(myTeam, damage);
            }

            this.scene.poolManager.getDamageText((target as any).x, (target as any).y - 30, damage, '#ff4444');
            this.scene.events.emit('enemy-hit');
        });

        // Player projectiles vs remote players (with team check)
        const projectileGroups = [
            (this.scene as any).arrows,
            (this.scene as any).fireballs,
            (this.scene as any).frostBolts,
            (this.scene as any).lightningBolts,
            (this.scene as any).sonicBolts,
        ].filter(g => g !== undefined);

        for (const group of projectileGroups) {
            phaserScene.physics.add.overlap(group, this.scene.players, (projectile: any, target: any) => {
                if (projectile.getData?.('pvpRemote')) return;
                const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
                if (target === player) return;
                if (!this.scene.registry.get('pvp2v2FightActive')) return;
                if (!projectile.active) return;

                let targetId: string | undefined;
                for (const [id, sprite] of this.scene.networkPacketHandler.remotePlayers) {
                    if (sprite === target) { targetId = id; break; }
                }
                if (!targetId) return;

                // Client-side friendly fire guard
                const teams = (this.scene.registry.get('pvp2v2Teams') || {}) as Record<string, 'A' | 'B'>;
                const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
                if (teams[targetId] === myTeam) return;

                const damage = projectile.damage || this.scene.stats.damage;

                if (this.scene.networkManager?.role === 'client') {
                    this.scene.networkManager.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: {
                            type: 'pvp2v2_projectile_hit',
                            data: { targetId, damage, hitX: projectile.x, hitY: projectile.y, projectileType: projectile.projectileType || 'arrow' }
                        },
                        ts: this.scene.networkManager.getServerTime()
                    });
                } else {
                    this.scene.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'damage_player', data: { id: targetId, damage, x: projectile.x, y: projectile.y } },
                        ts: Date.now()
                    });
                    const mainScene = this.scene as any;
                    mainScene.pvp2v2RoundManager?.trackTeamDamage(myTeam, damage);
                }

                if (projectile.disableBody) projectile.disableBody(true, true);
                else if (projectile.destroy) projectile.destroy();

                this.scene.poolManager.getDamageText(target.x, target.y - 30, damage, '#ff4444');
            });
        }
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
            const currentStacks = this.scene.buffs.getStacks('heavy_momentum');
            swordDamage *= (1 + currentStacks * 0.10);

            this.scene.buffs.addBuff({
                key: 'heavy_momentum',
                title: 'Momentum',
                icon: 'item_lightning',
                color: 0xffff00,
                duration: 3000,
                maxStacks: momentumLvl * 3,
                isVisible: true
            });
        }

        // Battle Cry
        // Battle Cry (Active check)
        if (this.scene.buffs.hasBuff('battle_cry')) {
            const battleCryLvl = levels['battle_cry'] || 0;
            swordDamage *= 1 + battleCryLvl * 0.15;
        }

        // Berserker Rage (HP ratio passive)
        const berserkerLvl = levels['berserker_rage'] || 0;
        if (berserkerLvl > 0) {
            const curHP = this.scene.registry.get('playerHP') || 0;
            const maxHP = this.scene.registry.get('playerMaxHP') || 100;
            if (curHP / maxHP < 0.3) {
                const bonus = [0.05, 0.10, 0.15][berserkerLvl - 1] || 0.15;
                swordDamage *= 1 + bonus;
            }
        }

        const wasAlive = target.hp > 0;
        target.pushback(player.x, player.y, this.scene.stats.knockback);
        target.takeDamage(swordDamage, '#ffcc00');

        // Utstotbar Slag (AOE knockback on hit)
        const utstotbarLvl = levels['utstotbar_slag'] || 0;
        if (utstotbarLvl > 0 && target instanceof Enemy) {
            const nearby = this.scene.spatialGrid.findNearby({ x: target.x, y: target.y, width: 1, height: 1 }, 150);
            nearby.forEach(cell => {
                if (cell.ref !== target && cell.ref && (cell.ref as Enemy).active && !(cell.ref as Enemy).getIsDead()) {
                    const neighbor = cell.ref as Enemy;
                    neighbor.pushback(target.x, target.y, this.scene.stats.knockback * 0.6);
                    neighbor.takeDamage(swordDamage * 0.4, '#ff8800');
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

        // Battle Cry (Kill counter - we use a hidden buff for tracking)
        const battleCryLvl = levels['battle_cry'] || 0;
        if (battleCryLvl > 0) {
            const kills = this.scene.buffs.getStacks('battle_cry_kills') + 1;

            if (kills >= 5) {
                this.scene.buffs.removeBuff('battle_cry_kills');
                this.scene.buffs.addBuff({
                    key: 'battle_cry',
                    title: 'KRIGSRUSH',
                    icon: 'item_sword_heavy',
                    color: 0xffaa00,
                    duration: 8000,
                    maxStacks: 1,
                    isVisible: true
                });
                this.scene.poolManager.getDamageText(player.x, player.y - 70, 'BATTLE CRY!', '#ffaa00');
            } else {
                this.scene.buffs.addBuff({
                    key: 'battle_cry_kills',
                    title: 'BC Kills',
                    icon: 'item_sword_heavy',
                    color: 0xaaaaaa,
                    duration: -1,
                    maxStacks: 5,
                    isVisible: false // Hidden tracking buff
                });
            }
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

import Phaser from 'phaser';
import type { IMainScene } from './IMainScene';
import { PacketType, type SyncPacket, type PackedPlayer } from '../network/SyncSchemas';
import { BinaryPacker } from '../network/BinaryPacker';
import type { DataConnection } from 'peerjs';

/**
 * Handles incoming network packets, game events, and remote player interpolation.
 */
export class NetworkPacketHandler {
    private scene: IMainScene;
    private lastSentPlayerStates: Map<string, string> = new Map();
    private localPackedPlayer: PackedPlayer = ['', 0, 0, '', 0, 0, '', ''] as any;
    private networkTickCount: number = 0;
    private lastSyncTime: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    /**
     * Processes incoming packets from the NetworkManager.
     */
    public handlePacket(packet: SyncPacket, _conn: DataConnection): void {
        switch (packet.t) {
            case PacketType.PLAYER_SYNC:
                if (packet.p) {
                    this.pushToBuffer(packet.p, packet.ts);
                }
                if (packet.ps) {
                    packet.ps.forEach(p => this.pushToBuffer(p, packet.ts));
                }
                break;

            case PacketType.ENEMY_SYNC:
                if (packet.es && this.scene.networkManager?.role === 'client') {
                    this.scene.waves.syncEnemies(packet.es, packet.ts);
                }
                break;

            case PacketType.GAME_EVENT:
                if (packet.ev) {
                    // Host-only validation for hit requests from clients
                    if (this.scene.networkManager?.role === 'host') {
                        if (packet.ev.type === 'hit_request') {
                            this.handleHitRequest(packet.ev, packet.ts, _conn.peer);
                        } else if (packet.ev.type === 'projectile_hit_request') {
                            this.handleProjectileHitRequest(packet.ev, packet.ts);
                        }
                    }
                    this.handleGameEvent(packet.ev);

                    // Relay to all if host
                    if (this.scene.networkManager?.role === 'host') {
                        this.scene.networkManager.broadcast(packet);
                    }
                }
                break;

            case PacketType.GAME_STATE:
                if (packet.gs && this.scene.networkManager?.role === 'client') {
                    this.scene.registry.set('gameLevel', packet.gs.level);
                    this.scene.registry.set('currentWave', packet.gs.wave);
                    this.scene.registry.set('isBossActive', packet.gs.isBossActive);
                }
                break;
        }
    }

    private pushToBuffer(p: PackedPlayer, ts: number): void {
        const id = p[0];
        const myId = this.scene.game.registry.get('networkConfig')?.peer.id;
        if (id === myId) return;

        const buffer = (this.scene as any).playerBuffers.get(id);
        if (buffer) {
            buffer.push({ state: p, timestamp: ts });
        }
    }

    private handleHitRequest(event: any, ts: number, peerId: string): void {
        const req = event.data;
        const enemy = this.scene.waves.findEnemyById(req.enemyId) || (req.enemyId === 'boss' ? this.scene.bossGroup.getFirstAlive() as any : null);

        if (enemy && enemy.active && !enemy.getIsDead()) {
            // Lag Compensation: Rewind enemy to the time the player hit it
            const historicalPos = enemy.getHistoricalPosition(ts);
            if (historicalPos) {
                const dist = Phaser.Math.Distance.Between(historicalPos.x, historicalPos.y, req.hitX, req.hitY);
                // Allow some grace for precision (70px)
                if (dist <= 70) {
                    enemy.takeDamage(req.damage, '#ffcc00');

                    // Apply knockback from the remote player's position
                    const remoteSprite = (this.scene as any).remotePlayers.get(peerId);
                    if (remoteSprite) {
                        enemy.pushback(remoteSprite.x, remoteSprite.y, this.scene.stats.knockback);
                    }
                }
            }
        }
    }

    private handleProjectileHitRequest(event: any, ts: number): void {
        const req = event.data;
        const enemy = this.scene.waves.findEnemyById(req.targetId) || (req.targetId === 'boss' ? this.scene.bossGroup.getFirstAlive() as any : null);

        if (enemy && enemy.active && !enemy.getIsDead()) {
            const historicalPos = enemy.getHistoricalPosition(req.timestamp || ts);
            if (historicalPos) {
                const dist = Phaser.Math.Distance.Between(historicalPos.x, historicalPos.y, req.hitX, req.hitY);
                if (dist <= 100) {
                    enemy.takeDamage(req.damage, req.projectileType === 'frost' ? '#00aaff' : '#ffcc00');
                    if (req.projectileType === 'frost' && req.isSlow) {
                        enemy.applySlow(req.slowDuration);
                    }
                    enemy.pushback(req.hitX, req.hitY, 150);
                }
            }
        }
    }

    public handleGameEvent(event: any): void {
        const type = event.type;
        const data = event.data;

        switch (type) {
            case 'attack':
                this.handleRemoteAttack(data);
                break;
            case 'coin_collect':
                this.handleCoinCollect(data);
                break;
            case 'enemy_death':
                this.handleEnemyDeath(data.id);
                break;
            case 'damage_player':
                this.handleDamagePlayer(data);
                break;
            case 'spawn_coins':
                this.handleSpawnCoins(data);
                break;
            case 'spawn_enemy_projectile':
                if (this.scene.networkManager?.role === 'client') {
                    this.scene.poolManager.getEnemyProjectile(data.x, data.y, data.angle, data.damage, data.type);
                }
                break;
            case 'party_dead':
                this.scene.registry.set('partyDead', true);
                this.scene.events.emit('party_dead');
                break;
            case 'revive_request':
                this.handleReviveRequest(data);
                break;
            case 'player_revived':
                this.handlePlayerRevived(data);
                break;
            case 'level_complete':
                if (this.scene.networkManager?.role === 'client') {
                    this.scene.registry.set('gameLevel', data.nextLevel - 1);
                    this.scene.events.emit('level-complete');
                }
                break;
            case 'enemy_heal':
                this.handleEnemyHeal(data);
                break;
            case 'restart_game':
                this.scene.restartGame();
                break;
            default:
                // Relay unknown events to the scene's event emitter (sync_pause, player_ready, etc.)
                this.scene.events.emit(type, data);
                break;
        }
    }

    private handleSpawnCoins(data: any): void {
        const player = this.scene.data.get('player');
        const coins = data.coins;
        if (coins && Array.isArray(coins)) {
            coins.forEach((cData: any) => {
                const coin = this.scene.coins.get(cData.x, cData.y) as any;
                if (coin) {
                    coin.spawn(cData.x, cData.y, player, cData.id);
                    coin.removeAllListeners('collected');
                    this.setupCoinCollection(coin);
                }
            });
        }
    }

    private setupCoinCollection(coin: any): void {
        coin.on('collected', () => {
            if (this.scene.networkManager?.role === 'client') {
                this.scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'coin_collect', data: { amount: 1, x: coin.x, y: coin.y, id: coin.id } },
                    ts: Date.now()
                });
            } else {
                this.scene.stats.addCoins(1);
            }
            this.scene.sound.play('coin_collect', { volume: 0.3 }); // Use global scene sound if available
        });
    }

    private handleReviveRequest(data: any): void {
        const { targetId } = data;
        if (this.scene.networkManager?.role === 'host') {
            const ev = { type: 'player_revived', data: { targetId } } as any;
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: ev,
                ts: Date.now()
            });
            this.handlePlayerRevived(data);
        }
    }

    private handlePlayerRevived(data: any): void {
        const { targetId } = data;
        const currentReviveCount = this.scene.registry.get('reviveCount') || 0;
        this.scene.registry.set('reviveCount', currentReviveCount + 1);

        const isLocal = targetId === this.scene.networkManager?.peerId || !this.scene.networkManager?.role;
        if (isLocal) {
            this.scene.events.emit('local-player-revived');
        } else {
            const remoteSprite = (this.scene as any).remotePlayers.get(targetId);
            if (remoteSprite) {
                remoteSprite.clearTint();
                remoteSprite.setBlendMode(Phaser.BlendModes.NORMAL);
                remoteSprite.setAlpha(1.0);
            }
        }
    }

    private handleRemoteAttack(data: any): void {
        const remoteSprite = (this.scene as any).remotePlayers.get(data.id);
        if (remoteSprite) {
            remoteSprite.play(data.anim || 'player-attack');

            const angle = data.angle;
            const weapon = data.weapon;

            if (weapon === 'bow') {
                const arrow = this.scene.arrows.get(remoteSprite.x, remoteSprite.y) as any;
                if (arrow) arrow.fire(remoteSprite.x, remoteSprite.y, angle, 10, 700, 0, 0);
            } else if (weapon === 'fire') {
                const fireball = this.scene.fireballs.get(remoteSprite.x, remoteSprite.y) as any;
                if (fireball) fireball.fire(remoteSprite.x, remoteSprite.y, angle, 15);
            } else if (weapon === 'frost') {
                const bolt = this.scene.frostBolts.get(remoteSprite.x, remoteSprite.y) as any;
                if (bolt) {
                    const targetX = remoteSprite.x + Math.cos(angle) * 200;
                    const targetY = remoteSprite.y + Math.sin(angle) * 200;
                    bolt.fire(remoteSprite.x, remoteSprite.y, targetX, targetY, 12);
                }
            } else if (weapon === 'lightning') {
                const bolt = this.scene.lightningBolts.get(remoteSprite.x, remoteSprite.y) as any;
                if (bolt) {
                    const targetX = remoteSprite.x + Math.cos(angle) * 300;
                    const targetY = remoteSprite.y + Math.sin(angle) * 300;
                    bolt.fire(remoteSprite.x, remoteSprite.y, targetX, targetY, 20, 1);
                }
            }
        }
    }

    private handleCoinCollect(data: any): void {
        const { x, y, id } = data;
        // Host authority: add actual coins
        if (this.scene.networkManager?.role === 'host') {
            this.scene.stats.addCoins(data.amount || 1);
        }

        // Shared visual: remove coin from world
        let removed = false;
        this.scene.coins.getChildren().forEach((c: any) => {
            if (c.id === id) {
                c.setActive(false).setVisible(false);
                if (c.body) c.body.enable = false;
                removed = true;
            }
        });

        if (!removed && x !== undefined) {
            this.scene.coins.children.iterate((c: any) => {
                if (c.active && Phaser.Math.Distance.Between(c.x, c.y, x, y) < 150) {
                    c.setActive(false).setVisible(false);
                    if (c.body) c.body.enable = false;
                    return false;
                }
                return true;
            });
        }
    }

    private handleEnemyDeath(id: string): void {
        const enemy = this.scene.waves.findEnemyById(id) || (id === 'boss' ? this.scene.bossGroup.getFirstAlive() as any : null);
        if (enemy) {
            if (enemy.die) enemy.die();
            else enemy.disable();
        } else {
            this.scene.pendingDeaths.add(id);
        }
    }

    private handleDamagePlayer(data: any): void {
        const { id, damage, x, y } = data;
        const myId = this.scene.networkManager?.peerId;

        if (!id || id === myId) {
            this.scene.combat.takePlayerDamage(damage, x, y);
        } else {
            const remoteSprite = (this.scene as any).remotePlayers.get(id);
            if (remoteSprite) {
                this.scene.poolManager.spawnBloodEffect(remoteSprite.x, remoteSprite.y);
                this.scene.poolManager.getDamageText(remoteSprite.x, remoteSprite.y - 40, damage);
                remoteSprite.setTint(0xff0000);
                this.scene.time.delayedCall(150, () => {
                    if (remoteSprite.active) remoteSprite.clearTint();
                });
            }
        }
    }

    private handleEnemyHeal(data: any): void {
        const { targetId, amount } = data;
        const target = this.scene.waves.findEnemyById(targetId);
        if (target) {
            target.hp += amount;
            this.scene.poolManager.getDamageText(target.x, target.y - 40, `+${Math.round(amount)}`, '#55ff55');
            target.setTint(0xccffcc);
            this.scene.time.delayedCall(500, () => {
                if (target.active && !target.getIsDead()) target.clearTint();
            });
        }
    }

    /**
     * Broadcasts local state to other players.
     */
    public networkTick(): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player || !this.scene.networkManager) return;

        const now = this.scene.networkManager.getServerTime();
        const myId = this.scene.networkManager.peerId || 'unknown';

        this.localPackedPlayer[0] = myId;
        this.localPackedPlayer[1] = Math.round(player.x);
        this.localPackedPlayer[2] = Math.round(player.y);
        this.localPackedPlayer[3] = player.anims.currentAnim?.key || 'player-idle';
        this.localPackedPlayer[4] = player.flipX ? 1 : 0;
        this.localPackedPlayer[5] = this.scene.registry.get('playerHP');
        this.localPackedPlayer[6] = this.scene.registry.get('currentWeapon');
        this.localPackedPlayer[7] = this.scene.registry.get('nickname');

        if (this.scene.networkManager.role === 'host') {
            this.handleHostTick(now);
        } else {
            // Delta-sync optimization for clients
            const stateStr = `${this.localPackedPlayer[1]},${this.localPackedPlayer[2]},${this.localPackedPlayer[3]},${this.localPackedPlayer[4]},${this.localPackedPlayer[5]},${this.localPackedPlayer[6]}`;
            if (this.lastSentPlayerStates.get(myId) !== stateStr) {
                this.lastSentPlayerStates.set(myId, stateStr);
                this.scene.networkManager.broadcast(BinaryPacker.packPlayer(this.localPackedPlayer, now));
            }
        }
    }

    private handleHostTick(now: number): void {
        this.networkTickCount++;
        const forceFullSync = this.networkTickCount % 20 === 0;
        const playersToSync: PackedPlayer[] = [];
        const myId = this.scene.networkManager?.peerId || 'unknown';

        // Party State & Death Check
        const partyState = [{
            id: myId,
            name: this.scene.registry.get('nickname') || 'Host',
            isDead: this.scene.registry.get('playerHP') <= 0
        }];

        const processPlayer = (p: PackedPlayer) => {
            const id = p[0];
            const stateStr = `${p[1]},${p[2]},${p[3]},${p[4]},${p[5]},${p[6]}`;
            const lastState = this.lastSentPlayerStates.get(id);

            if (forceFullSync || lastState !== stateStr) {
                this.lastSentPlayerStates.set(id, stateStr);
                playersToSync.push(p);
            }

            if (id !== myId) {
                partyState.push({
                    id: id,
                    name: p[7] || 'Spiller',
                    isDead: p[5] <= 0
                });
            }
        };

        // Local player
        processPlayer(this.localPackedPlayer);
        // Remote players
        (this.scene as any).remotePlayerPackets.forEach((p: PackedPlayer) => processPlayer(p));

        this.scene.registry.set('partyState', partyState);

        // Global Game Over (Party Wipe) logic
        if (partyState.every(p => p.isDead) && partyState.length > 0 && !this.scene.registry.get('partyDead')) {
            this.scene.registry.set('partyDead', true);
            this.scene.events.emit('party_dead');
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'party_dead', data: {} },
                ts: now
            });
        }

        if (playersToSync.length > 0) {
            this.scene.networkManager?.broadcast(BinaryPacker.packPlayers(playersToSync, now));
        }

        // Enemy sync
        const enemies = this.scene.waves.getEnemySyncData();
        if (enemies.length > 0) {
            this.scene.networkManager?.broadcast(BinaryPacker.packEnemies(enemies, now));
        }

        // Periodic Game State Sync
        if (now - this.lastSyncTime > 1000) {
            this.lastSyncTime = now;
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_STATE,
                gs: {
                    level: this.scene.registry.get('gameLevel'),
                    wave: this.scene.registry.get('currentWave'),
                    isBossActive: this.scene.registry.get('isBossActive'),
                    bossIndex: this.scene.registry.get('bossComingUp')
                },
                ts: now
            });
        }
    }

    /**
     * Interpolates remote players.
     */
    public interpolateRemotePlayers(renderTime: number): void {
        (this.scene as any).remotePlayers.forEach((remotePlayer: any, id: string) => {
            const buffer = (this.scene as any).playerBuffers.get(id);
            if (buffer) {
                const sample = buffer.sample(renderTime);
                if (sample) {
                    const pPrev = sample.prev.state;
                    const pNext = sample.next.state;
                    const f = sample.factor;

                    remotePlayer.setPosition(
                        pPrev[1] + (pNext[1] - pPrev[1]) * f,
                        pPrev[2] + (pNext[2] - pPrev[2]) * f
                    );

                    const activeState = f > 0.5 ? pNext : pPrev;
                    this.applyRemoteVitals(remotePlayer, activeState);
                }
            }
            const label = (this.scene as any).playerNicknames.get(id);
            if (label) label.setPosition(remotePlayer.x, remotePlayer.y - 40);
        });
    }

    private applyRemoteVitals(remotePlayer: any, state: PackedPlayer): void {
        const anim = state[3];
        const flipX = state[4];
        const hp = state[5];

        if (hp <= 0) {
            remotePlayer.setTint(0xaaaaff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
        } else {
            remotePlayer.clearTint().setBlendMode(Phaser.BlendModes.NORMAL).setAlpha(1.0);
        }

        if (remotePlayer.anims.currentAnim?.key !== anim) remotePlayer.play(anim);
        remotePlayer.setFlipX(flipX === 1);
    }
}

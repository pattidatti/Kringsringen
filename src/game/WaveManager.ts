import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { PackedEnemy } from '../network/SyncSchemas';
import { Coin } from './Coin';
import { SaveManager } from './SaveManager';
import { GAME_CONFIG } from '../config/GameConfig';
import { AudioManager } from './AudioManager';
import { PacketType } from '../network/SyncSchemas';
import type { IMainScene } from './IMainScene';
import { getBossForLevel } from '../config/bosses';
import { getWaveComposition, weightedRandom } from '../config/wave_compositions';
import { LEVEL_CONFIG } from '../config/levels';

/**
 * Manages level/wave lifecycle: spawning enemies, tracking progress,
 * and triggering level-complete events.
 */
export class WaveManager {
    private scene: IMainScene;

    private currentLevel: number = 1;
    private currentWave: number = 1;
    private enemiesToSpawnInWave: number = 0;
    /** Snapshot of total enemies at wave start — used for ranged fraction math */
    private enemiesToSpawnInWave_total: number = 0;
    /** How many ranged enemies have spawned so far this wave */
    private rangedSpawnedThisWave: number = 0;
    private enemiesAlive: number = 0;
    private isLevelActive: boolean = false;
    private bgmPlaylist: string[] = [];

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    private getPlayerCount(): number {
        const isMultiplayer = this.scene.registry.get('isMultiplayer');
        if (!isMultiplayer) return 1;

        // Count remote players + local player
        return (this.scene as any).remotePlayers?.size + 1 || 1;
    }

    startLevel(level: number): void {
        this.currentLevel = level;
        this.currentWave = 1;
        this.isLevelActive = true;
        this.scene.registry.set('gameLevel', this.currentLevel);

        // Music per level
        if (this.bgmPlaylist.length === 0) {
            const bgmTracks = [
                'meadow_theme', 'exploration_theme', 'dragons_fury',
                'pixel_rush_overture', 'glitch_in_the_forest', 'glitch_in_the_dungeon',
                'glitch_in_the_catacombs', 'glitch_in_the_heavens'
            ];
            this.bgmPlaylist = Phaser.Utils.Array.Shuffle(bgmTracks);
        }

        const nextBGM = this.bgmPlaylist.pop();
        if (nextBGM) {
            AudioManager.instance.playBGM(nextBGM);
        }

        this.startWave();
    }

    private startWave(): void {
        const playerCount = this.getPlayerCount();
        const config = LEVEL_CONFIG[Math.min(this.currentLevel - 1, LEVEL_CONFIG.length - 1)];

        // Scaling: +25% more enemies per extra player
        this.enemiesToSpawnInWave = Math.round(config.enemiesPerWave * (1 + (playerCount - 1) * 0.25));

        // Snapshot total for ranged budget calculation + reset counter
        this.enemiesToSpawnInWave_total = this.enemiesToSpawnInWave;
        this.rangedSpawnedThisWave = 0;

        // Sync to registry
        this.scene.registry.set('currentWave', this.currentWave);
        this.scene.registry.set('maxWaves', config.waves);

        // Visual Announcement
        const topText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2 - 100,
            `LEVEL ${this.currentLevel} - WAVE ${this.currentWave}`,
            {
                fontSize: '48px',
                color: '#fbbf24',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 6,
                fontFamily: '"Cinzel", serif'
            }
        ).setOrigin(0.5).setScrollFactor(0);

        this.scene.tweens.add({
            targets: topText,
            alpha: { from: 1, to: 0 },
            y: this.scene.cameras.main.centerY - 150,
            delay: 2000,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => topText.destroy()
        });

        // START SPAWNING (Only if Host or Single Player)
        const isClient = this.scene.registry.get('networkRole') === 'client';
        if (!isClient) {
            this.scene.time.addEvent({
                delay: GAME_CONFIG.WAVES.SPAWN_DELAY,
                callback: this.spawnEnemyInWave,
                callbackScope: this,
                repeat: this.enemiesToSpawnInWave - 1
            });
        }
    }

    private spawnEnemyInWave(): void {
        if (!this.isLevelActive) return;

        const mapWidth = 3000;
        const mapHeight = 3000;
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        const radius = 800;

        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const config = LEVEL_CONFIG[Math.min(this.currentLevel - 1, LEVEL_CONFIG.length - 1)];
        const playerCount = this.getPlayerCount();

        // Scaling: +50% HP per extra player
        const hpMultiplier = config.multiplier * (1 + (playerCount - 1) * 0.5);

        // Select Enemy Type using weighted composition table
        let type = this.selectEnemyType();

        // Spawn using Pool
        let enemy = this.scene.enemies.get(x, y) as Enemy;
        if (!enemy) return;

        // Reset/Spawn Logic
        enemy.reset(x, y, player, hpMultiplier, type);

        this.enemiesAlive++;
        this.enemiesToSpawnInWave--;

        enemy.removeAllListeners('dead');
        enemy.on('dead', (ex: number, ey: number) => {
            this.enemiesAlive--;
            this.checkWaveProgress();

            // Sync enemy death reliably to prevent ghosting
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'enemy_death', data: { id: enemy.id } },
                ts: Date.now()
            });

            // Management of coin drops: Singleplayer or Host
            const isMultiplayer = this.scene.registry.get('isMultiplayer');
            const isHost = this.scene.networkManager?.role === 'host';
            if (isMultiplayer && !isHost) return;

            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (!player) return;

            const baseCoins = Phaser.Math.Between(5, 15);
            const coinCount = baseCoins + (this.currentLevel - 1) * 3;
            const coinData: { x: number, y: number, id: string }[] = [];

            for (let i = 0; i < coinCount; i++) {
                let coin = this.scene.coins.get(ex, ey) as Coin;
                if (!coin) continue;

                const coinId = `coin-${Phaser.Math.RND.uuid()}`;
                coin.spawn(ex, ey, player, coinId);
                coin.removeAllListeners('collected');
                coin.on('collected', () => {
                    this.scene.stats.addCoins(1);
                    AudioManager.instance.playSFX('coin_collect');

                    // Sync coin collection with actual current position and ID
                    this.scene.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'coin_collect', data: { amount: 1, x: coin.x, y: coin.y, id: coin.id } },
                        ts: Date.now()
                    });
                });

                coinData.push({ x: ex, y: ey, id: coinId });
            }

            // Sync coin spawn to clients with IDs
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'spawn_coins', data: { x: ex, y: ey, count: coinCount, coins: coinData } },
                ts: Date.now()
            });
        });
    }

    /**
     * Picks an enemy type for this spawn slot using the wave composition table.
     * Respects the per-wave ranged cap (maxRangedFraction) to prevent
     * ranged enemies from dominating early waves.
     */
    private selectEnemyType(): string {
        const comp = getWaveComposition(this.currentLevel, this.currentWave);

        const maxRangedForWave = Math.floor(
            this.enemiesToSpawnInWave_total * comp.maxRangedFraction
        );

        // Attempt to use ranged pool if budget allows and pool is non-empty
        const canUseRanged =
            comp.rangedPool.length > 0 &&
            this.rangedSpawnedThisWave < maxRangedForWave;

        // Blend: use ranged with probability equal to the fraction cap,
        // so they're spread throughout the wave rather than front-loaded.
        const useRanged = canUseRanged && Math.random() < comp.maxRangedFraction;

        if (useRanged) {
            this.rangedSpawnedThisWave++;
            return weightedRandom(comp.rangedPool);
        }

        return weightedRandom(comp.meleePool);
    }

    private checkWaveProgress(): void {
        const config = LEVEL_CONFIG[Math.min(this.currentLevel - 1, LEVEL_CONFIG.length - 1)];

        if (this.enemiesAlive === 0 && this.enemiesToSpawnInWave === 0) {
            if (this.currentWave < config.waves) {
                this.currentWave++;
                this.scene.time.delayedCall(GAME_CONFIG.WAVES.WAVE_DELAY, () => this.startWave());
            } else {
                this.isLevelActive = false;
                const currentStage = this.scene.registry.get('gameLevel');
                const highStage = this.scene.registry.get('highStage') || 1;
                if (currentStage >= highStage) {
                    SaveManager.save({ highStage: currentStage + 1 });
                }

                const bossConfig = getBossForLevel(this.currentLevel);
                this.scene.registry.set('bossComingUp', bossConfig ? bossConfig.bossIndex : -1);

                this.scene.time.delayedCall(GAME_CONFIG.WAVES.LEVEL_COMPLETE_DELAY, () => {
                    this.scene.events.emit('level-complete');
                    this.scene.scene.pause();

                    // Sync level complete to clients
                    this.scene.networkManager?.broadcast({
                        t: PacketType.GAME_EVENT,
                        ev: { type: 'level_complete', data: { nextLevel: this.currentLevel + 1 } },
                        ts: Date.now()
                    });
                });
            }
        }
    }

    /** Drops a large burst of coins from a boss */
    public spawnBossCoins(ex: number, ey: number): void {
        const isMultiplayer = this.scene.registry.get('isMultiplayer');
        const isHost = this.scene.networkManager?.role === 'host';
        if (isMultiplayer && !isHost) return;

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (!player) return;

        // Bosses drop significantly more coins
        const coinCount = (GAME_CONFIG as any).BOSSES?.COIN_DROP_COUNT || 75;
        const coinData: { x: number, y: number, id: string }[] = [];

        for (let i = 0; i < coinCount; i++) {
            let coin = this.scene.coins.get(ex, ey) as Coin;
            if (!coin) continue;

            const coinId = `coin-boss-${Phaser.Math.RND.uuid()}`;
            coin.spawn(ex, ey, player, coinId);

            // Randomize velocity more for a bigger explosion
            const angle = Math.random() * Math.PI * 2;
            const force = Phaser.Math.Between(200, 450);
            coin.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);

            coin.removeAllListeners('collected');
            coin.on('collected', () => {
                this.scene.stats.addCoins(1);
                AudioManager.instance.playSFX('coin_collect');

                this.scene.networkManager?.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: { type: 'coin_collect', data: { amount: 1, x: coin.x, y: coin.y, id: coin.id } },
                    ts: Date.now()
                });
            });

            coinData.push({ x: ex, y: ey, id: coinId });
        }

        // Sync coin spawn to clients
        this.scene.networkManager?.broadcast({
            t: PacketType.GAME_EVENT,
            ev: { type: 'spawn_coins', data: { x: ex, y: ey, count: coinCount, coins: coinData } },
            ts: Date.now()
        });
    }

    private lastEnemyStates: Map<string, string> = new Map();
    private updateTick: number = 0;

    public getEnemySyncData(): PackedEnemy[] {
        const data: PackedEnemy[] = [];
        this.updateTick++;
        const forceFullSync = this.updateTick % 20 === 0;

        const processEnemy = (child: any, type: string) => {
            const id = child.id || child.name || type;
            if (child.active && !child.isDead) {
                const rx = Math.round(child.x);
                const ry = Math.round(child.y);
                const hp = child.hp;
                const anim = child.anims.currentAnim?.key || '';
                const flipX = child.flipX ? 1 : 0;

                const stateStr = `${rx},${ry},${hp},${anim},${flipX}`;
                const lastState = this.lastEnemyStates.get(id);

                if (forceFullSync || lastState !== stateStr) {
                    this.lastEnemyStates.set(id, stateStr);
                    data.push([id, rx, ry, hp, anim, flipX]);
                }
            } else if (this.lastEnemyStates.has(id)) {
                // He just died or deactivated! Tell clients this HP is 0, so they can destroy him
                this.lastEnemyStates.delete(id);
                data.push([id, Math.round(child.x), Math.round(child.y), 0, '', 0]);
            }
        };

        this.scene.enemies.children.iterate((child: any) => { processEnemy(child, 'enemy'); return true; });
        this.scene.bossGroup.children.iterate((boss: any) => { processEnemy(boss, 'boss'); return true; });

        return data;
    }

    public syncEnemies(packets: PackedEnemy[], timestamp: number): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;

        packets.forEach(p => {
            const [id, x, y, hp, _anim, flipX] = p;
            let enemy: any = null;

            if (id === 'boss') {
                enemy = this.scene.bossGroup.getFirstAlive();
                if (!enemy && hp > 0) {
                    const bossIdx = this.scene.registry.get('bossComingUp') ?? -1;
                    if (bossIdx >= 0) {
                        this.scene.registry.set('bossComingUp', -1);
                        this.scene.events.emit('start-boss', bossIdx);
                    }
                }

                // If boss is still null (e.g., spawn event lag), don't process further packets yet
                if (!enemy) return;
            } else {
                enemy = this.findEnemyById(id);
                if (!enemy && hp > 0) {
                    // Check if this enemy was already marked dead before it even spawned locally
                    if (this.scene.pendingDeaths && this.scene.pendingDeaths.has(id)) {
                        this.scene.pendingDeaths.delete(id);
                        return; // Don't spawn
                    }

                    let type = 'orc';
                    // Parse ID format: "elite_orc-1234abcd..."
                    const lastDashIdx = id.lastIndexOf('-');
                    if (lastDashIdx > 0) {
                        const parsedType = id.substring(0, lastDashIdx);
                        type = parsedType; // Assuming config exists, ENEMY_TYPES would be the ultimate check but we'll trust the ID
                    }

                    // Dynamically calculate the same hpMultiplier the Host used for this wave
                    const currentLevel = this.scene.registry.get('gameLevel') || 1;
                    const config = LEVEL_CONFIG[Math.min(currentLevel - 1, LEVEL_CONFIG.length - 1)];
                    const playerCount = this.getPlayerCount();
                    const hpMultiplier = config.multiplier * (1 + (playerCount - 1) * 0.5);

                    enemy = this.scene.enemies.get(x, y) as Enemy;
                    if (enemy) {
                        enemy.reset(x, y, player, hpMultiplier, type);
                        enemy.id = id;
                    }
                }
            }

            if (enemy && enemy.active) {
                // RACE PROTECTION: If enemy is already dead or in death animation, ignore old packets
                if (enemy.getIsDead && enemy.getIsDead()) {
                    return;
                }

                if (hp <= 0) {
                    // Update: Only trigger death if not already in prediction
                    // The prediction logic already triggered die/disable!
                    if (enemy.predictedDeadUntil > 0) {
                        enemy.predictedDeadUntil = 0; // Host confirmed, we are good!
                    } else {
                        if (enemy.die) enemy.die();
                        else enemy.disable();
                    }
                    return;
                }

                // If host confirms an HP greater than 0 but we predicted death,
                // we DO NOT reset here. The JitterBuffer/preUpdate rollback will handle it!
                // We just let the buffer accumulate the true state.

                enemy.setData('targetX', x);
                enemy.setData('targetY', y);
                enemy.hp = hp;

                // Sync protection: If host sends an HP higher than our local maxHP,
                // our prediction/multiplier was off (e.g. joined mid-game), so forcefully correct it.
                if (hp > enemy.maxHP) {
                    enemy.maxHP = hp;
                }

                enemy.setFlipX(flipX === 1);

                if (id === 'boss') {
                    this.scene.registry.set('bossHP', Math.max(0, hp));
                }

                if (enemy.setClientMode) enemy.setClientMode(true);
                if (enemy.pushState) enemy.pushState(timestamp, p);
            }
        });
    }

    public findEnemyById(id: string): Enemy | null {
        let found: Enemy | null = null;
        this.scene.enemies.children.iterate((child: any) => {
            if ((child as any).id === id) {
                found = child as Enemy;
                return false;
            }
            return true;
        });
        return found;
    }
}

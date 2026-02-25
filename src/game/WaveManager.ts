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

/**
 * Manages level/wave lifecycle: spawning enemies, tracking progress,
 * and triggering level-complete events.
 */
export class WaveManager {
    private scene: IMainScene;

    private currentLevel: number = 1;
    private currentWave: number = 1;
    private enemiesToSpawnInWave: number = 0;
    private enemiesAlive: number = 0;
    private isLevelActive: boolean = false;
    private bgmPlaylist: string[] = [];

    private readonly LEVEL_CONFIG = [
        { waves: 2, enemiesPerWave: 6, multiplier: 1.0 },   // Level 1
        { waves: 3, enemiesPerWave: 8, multiplier: 1.2 },   // Level 2
        { waves: 3, enemiesPerWave: 12, multiplier: 1.5 },  // Level 3
        { waves: 4, enemiesPerWave: 15, multiplier: 2.0 },  // Level 4
        { waves: 5, enemiesPerWave: 20, multiplier: 3.0 }   // Level 5+
    ];

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
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];

        // Scaling: +25% more enemies per extra player
        this.enemiesToSpawnInWave = Math.round(config.enemiesPerWave * (1 + (playerCount - 1) * 0.25));

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
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];
        const playerCount = this.getPlayerCount();

        // Scaling: +50% HP per extra player
        const hpMultiplier = config.multiplier * (1 + (playerCount - 1) * 0.5);

        // Select Enemy Type
        let allowedTypes: string[] = ['orc', 'slime'];
        if (this.currentLevel >= 2) {
            allowedTypes.push('skeleton', 'armored_skeleton');
        }
        if (this.currentLevel >= 3) {
            allowedTypes.push('werewolf', 'armored_orc');
        }
        if (this.currentLevel >= 4) {
            allowedTypes.push('elite_orc', 'greatsword_skeleton');
        }

        let type = Phaser.Utils.Array.GetRandom(allowedTypes);

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

            // Management of coin drops: Singleplayer or Host
            const isMultiplayer = this.scene.registry.get('isMultiplayer');
            const isHost = this.scene.networkManager?.role === 'host';
            if (isMultiplayer && !isHost) return;

            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (!player) return;

            const baseCoins = Phaser.Math.Between(5, 15);
            const coinCount = baseCoins + (this.currentLevel - 1) * 3;
            const coinData: any[] = [];

            for (let i = 0; i < coinCount; i++) {
                let coin = this.scene.coins.get(ex, ey) as Coin;
                // Avoid using getFirstAlive which might steal a coin that's already on screen
                if (!coin) continue;

                if (coin) {
                    coin.spawn(ex, ey, player);
                    coin.removeAllListeners('collected');
                    coin.on('collected', () => {
                        this.scene.stats.addCoins(1);
                        AudioManager.instance.playSFX('coin_collect');

                        // Sync coin collection
                        this.scene.networkManager?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'coin_collect', data: { amount: 1, x: ex, y: ey } },
                            ts: Date.now()
                        });
                    });

                    coinData.push({ x: ex, y: ey });
                }
            }

            // Sync coin spawn to clients
            this.scene.networkManager?.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'spawn_coins', data: { x: ex, y: ey, count: coinCount } },
                ts: Date.now()
            });
        });
    }

    private checkWaveProgress(): void {
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];

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

        // We do NOT disable missing enemies anymore because of Delta Compression.
        // Enemies are only disabled when an explicit packet with hp <= 0 is received.
        packets.forEach(p => {
            const [id, x, y, hp, anim, flipX] = p;
            let enemy: any = null;

            if (id === 'boss') {
                enemy = this.scene.bossGroup.getFirstAlive();
                if (!enemy && hp > 0) {
                    const bossIdx = this.scene.registry.get('bossComingUp') ?? 0;
                    this.scene.events.emit('start-boss', bossIdx);
                }
            } else {
                enemy = this.findEnemyById(id);
                if (!enemy && hp > 0) {
                    let type = 'orc';
                    if (anim.includes('slime')) type = 'slime';
                    if (anim.includes('skeleton')) type = 'skeleton';
                    if (anim.includes('werewolf')) type = 'werewolf';

                    enemy = this.scene.enemies.get(x, y) as Enemy;
                    if (enemy) {
                        enemy.reset(x, y, player, 1.0, type);
                        enemy.id = id;
                    }
                }
            }

            if (enemy) {
                if (hp <= 0) {
                    enemy.disable();
                    return;
                }

                // Ensure enemy is active if it was previously disabled in the pool
                if (!enemy.active) {
                    enemy.setActive(true);
                    enemy.setVisible(true);
                    if (enemy.body) enemy.body.enable = true;
                }

                enemy.setData('targetX', x);
                enemy.setData('targetY', y);
                enemy.hp = hp;
                enemy.setFlipX(flipX === 1);

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

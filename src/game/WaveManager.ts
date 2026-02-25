import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { EnemyPacket } from '../network/SyncSchemas';
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
                if (!coin) coin = this.scene.coins.getFirstAlive() as Coin;

                if (coin) {
                    coin.spawn(ex, ey, player);
                    coin.removeAllListeners('collected');
                    coin.on('collected', () => {
                        this.scene.stats.addCoins(1);
                        AudioManager.instance.playSFX('coin_collect');

                        // Sync coin collection
                        this.scene.networkManager?.broadcast({
                            t: PacketType.GAME_EVENT,
                            ev: { type: 'coin_collect', data: { amount: 1 } },
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
                });
            }
        }
    }

    public getEnemySyncData(): EnemyPacket[] {
        const data: EnemyPacket[] = [];
        this.scene.enemies.children.iterate((child: any) => {
            if (child.active && !child.isDead) {
                data.push({
                    id: child.id || child.name,
                    x: Math.round(child.x),
                    y: Math.round(child.y),
                    hp: child.hp,
                    anim: child.anims.currentAnim?.key || '',
                    flipX: child.flipX
                });
            }
            return true;
        });
        return data;
    }

    public syncEnemies(packets: EnemyPacket[]): void {
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        const activeIds = new Set(packets.map(p => p.id));

        packets.forEach(p => {
            let enemy = this.findEnemyById(p.id);
            if (!enemy) {
                let type = 'orc';
                if (p.anim.includes('slime')) type = 'slime';
                if (p.anim.includes('skeleton')) type = 'skeleton';
                if (p.anim.includes('werewolf')) type = 'werewolf';

                enemy = this.scene.enemies.get(p.x, p.y) as Enemy;
                if (enemy) {
                    enemy.reset(p.x, p.y, player, 1.0, type);
                    (enemy as any).id = p.id;
                }
            }

            if (enemy) {
                // Position and animation driven purely by host
                enemy.setPosition(p.x, p.y);
                enemy.hp = p.hp;
                enemy.setFlipX(p.flipX);
                if (enemy.anims.currentAnim?.key !== p.anim && p.anim) {
                    enemy.play(p.anim);
                }
                // Ensure this is a passive puppet — no AI, no physics body, no damage
                enemy.setClientMode(true);
            }
        });

        // Use disable() (pool-safe) instead of destroy() to prevent pool exhaustion over time
        const toRemove: any[] = [];
        this.scene.enemies.children.iterate((child: any) => {
            if (child.active && !activeIds.has(child.id)) toRemove.push(child);
            return true;
        });
        toRemove.forEach(e => (e as Enemy).disable());
    }

    private findEnemyById(id: string): Enemy | null {
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

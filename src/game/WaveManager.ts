import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Coin } from './Coin';
import { SaveManager } from './SaveManager';
import { GAME_CONFIG } from '../config/GameConfig';
import { AudioManager } from './AudioManager';
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

    startLevel(level: number): void {
        this.currentLevel = level;
        this.currentWave = 1;
        this.isLevelActive = true;
        this.scene.registry.set('gameLevel', this.currentLevel);

        // Music per level — boss music is handled separately in BossEnemy/spawnBoss
        const bgmTracks = ['meadow_theme', 'exploration_theme', 'dragons_fury'];
        const randomBGM = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
        AudioManager.instance.playBGM(randomBGM);

        this.startWave();
    }

    private startWave(): void {
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];
        this.enemiesToSpawnInWave = config.enemiesPerWave;

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

        // Start spawning
        this.scene.time.addEvent({
            delay: GAME_CONFIG.WAVES.SPAWN_DELAY,
            callback: this.spawnEnemyInWave,
            callbackScope: this,
            repeat: this.enemiesToSpawnInWave - 1
        });
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

        // Select Enemy Type based on level/wave
        let allowedTypes: string[] = ['orc', 'slime']; // Default Level 1

        if (this.currentLevel >= 2) {
            allowedTypes.push('skeleton');
            allowedTypes.push('armored_skeleton');
        }

        if (this.currentLevel >= 3) {
            allowedTypes.push('werewolf');
            allowedTypes.push('armored_orc');
        }

        if (this.currentLevel >= 4) {
            allowedTypes.push('elite_orc');
            allowedTypes.push('greatsword_skeleton');
        }

        // Simple weighted random (prefer basic enemies)
        let type = Phaser.Utils.Array.GetRandom(allowedTypes);

        // Spawn using Pool
        let enemy = this.scene.enemies.get(x, y) as Enemy;
        if (!enemy) return; // Pool full

        // Reset/Spawn Logic
        enemy.reset(x, y, player, config.multiplier, type);

        this.enemiesAlive++;
        this.enemiesToSpawnInWave--;

        // Clear previous listeners to avoid stacking
        enemy.removeAllListeners('dead');

        enemy.on('dead', (ex: number, ey: number) => {
            console.log(`WaveManager caught 'dead' event for enemy at ${ex}, ${ey}`);
            this.enemiesAlive--;
            this.checkWaveProgress();

            // Get player reference for drops
            const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
            if (!player) return;

            // Spawn Coins: scale with level (5-15 base, multiplied by level)
            const baseCoins = Phaser.Math.Between(5, 15);
            const coinCount = baseCoins + (this.currentLevel - 1) * 3;
            for (let i = 0; i < coinCount; i++) {
                let coin = this.scene.coins.get(ex, ey) as Coin;

                // Recycling fallback: if pool is full, reuse the oldest active coin
                if (!coin) {
                    coin = this.scene.coins.getFirstAlive() as Coin;
                }

                if (coin) {
                    coin.spawn(ex, ey, player);
                    coin.removeAllListeners('collected');
                    coin.on('collected', () => {
                        this.scene.stats.addCoins(1);
                        AudioManager.instance.playSFX('coin_collect');
                    });
                } else {
                    console.error('CRITICAL: Coin spawning failed even with recycling fallback!');
                }
            }
        });
    }

    private checkWaveProgress(): void {
        const config = this.LEVEL_CONFIG[Math.min(this.currentLevel - 1, this.LEVEL_CONFIG.length - 1)];

        if (this.enemiesAlive === 0 && this.enemiesToSpawnInWave === 0) {
            if (this.currentWave < config.waves) {
                this.currentWave++;
                this.scene.time.delayedCall(GAME_CONFIG.WAVES.WAVE_DELAY, () => this.startWave());
            } else {
                // Level Complete
                this.isLevelActive = false;

                // Save High Stage
                const currentStage = this.scene.registry.get('gameLevel');
                const highStage = this.scene.registry.get('highStage') || 1;
                if (currentStage >= highStage) {
                    SaveManager.save({ highStage: currentStage + 1 });
                }

                // Signal whether a boss follows this level
                const bossConfig = getBossForLevel(this.currentLevel);
                this.scene.registry.set('bossComingUp', bossConfig ? bossConfig.bossIndex : -1);

                this.scene.time.delayedCall(GAME_CONFIG.WAVES.LEVEL_COMPLETE_DELAY, () => {
                    this.scene.events.emit('level-complete');
                    this.scene.scene.pause();
                });
            }
        }
    }
}

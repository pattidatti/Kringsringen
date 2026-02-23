import Phaser from 'phaser';
import { FantasyAssetManifest } from './FantasyAssetManifest';
import type { FantasyAsset } from './FantasyAssetManifest';

/**
 * Visual theme configuration for a map level.
 *
 * Ground tileset (fantasy-ground) is Tileset_Ground.png loaded as 16x16 frames.
 * Sheet is 12 columns × 14 rows = 168 frames total.
 *   Row 0:  frames 0–11
 *   Row 1:  frames 12–23  (frame 20 = main grass, 21 = flower tile)
 *   ...
 *   Row 9:  frames 108–119 (frame 114 = dirt patch)
 *   Row 12: frames 144–155 (bottom 2nd row)
 *   Row 13: frames 156–167 (bottom row)
 */
export interface MapThemeConfig {
    /** Base ground tile frame (tiled across entire map floor) */
    groundBaseFrame: number;
    /** Detail tile frames scattered randomly inside the clearing */
    clearingDetailFrames: number[];
    /** Probability for each detail frame (must sum ≤ 1; remainder = no detail) */
    clearingDetailWeights: number[];
    /** Number of rocks to scatter inside the clearing (with physics collision) */
    rocksInClearing: number;
    /** Number of rocks scattered in the outer forest zone (decoration, no physics) */
    rocksInForest: number;
    /** How many bushes to scatter inside the clearing */
    bushesInClearing: number;
    /** Total attempts when generating the forest ring */
    forestDensity: number;
}

/** Predefined themes, one per level (index = level - 1, capped at last entry). */
export const LEVEL_MAP_THEMES: MapThemeConfig[] = [
    // Level 1 – Den Grønne Lysningen
    {
        groundBaseFrame: 20,
        clearingDetailFrames: [21, 114],
        clearingDetailWeights: [0.15, 0.10],
        rocksInClearing: 0,
        rocksInForest: 0,
        bushesInClearing: 0,
        forestDensity: 2500,
    },
    // Level 2 – De Mørke Stiene
    {
        groundBaseFrame: 20,
        clearingDetailFrames: [114, 145, 157],
        clearingDetailWeights: [0.12, 0.08, 0.06],
        rocksInClearing: 8,
        rocksInForest: 20,
        bushesInClearing: 12,
        forestDensity: 2700,
    },
    // Level 3 – Ulvemarka
    {
        groundBaseFrame: 20,
        clearingDetailFrames: [114, 144, 145, 156, 157],
        clearingDetailWeights: [0.08, 0.07, 0.07, 0.06, 0.06],
        rocksInClearing: 18,
        rocksInForest: 50,
        bushesInClearing: 20,
        forestDensity: 3000,
    },
    // Level 4+ – same as Level 3 but even more rocks
    {
        groundBaseFrame: 20,
        clearingDetailFrames: [114, 144, 145, 156, 157],
        clearingDetailWeights: [0.08, 0.08, 0.08, 0.07, 0.07],
        rocksInClearing: 25,
        rocksInForest: 80,
        bushesInClearing: 25,
        forestDensity: 3200,
    },
];

export class CircularForestMapGenerator {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;
    private readonly scale: number = 2;
    private readonly clearingRadius: number = 800;

    /** All game objects created by this generator — destroyed on cleanup. */
    private createdObjects: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, width: number, height: number) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = width;
        this.mapHeight = height;
    }

    public generate(theme: MapThemeConfig = LEVEL_MAP_THEMES[0]) {
        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;

        // 1. Fill background with base ground tile
        const floor = this.scene.add.tileSprite(centerX, centerY, this.mapWidth, this.mapHeight, 'fantasy-ground', theme.groundBaseFrame);
        floor.setScale(this.scale);
        floor.setDepth(-100);
        this.createdObjects.push(floor);

        // 2. Dense forest ring outside the clearing
        this.generateCircularForest(centerX, centerY, theme);

        // 3. Ground detail tiles inside the clearing
        this.generateClearingDetails(centerX, centerY, theme);

        // 4. Scattered rocks inside clearing (with physics)
        if (theme.rocksInClearing > 0) {
            this.generateRocksInClearing(centerX, centerY, theme.rocksInClearing);
        }

        // 5. Scattered rocks in forest zone (decoration, no physics)
        if (theme.rocksInForest > 0) {
            this.generateRocksInForest(centerX, centerY, theme.rocksInForest);
        }

        // 6. Scattered bushes inside clearing
        if (theme.bushesInClearing > 0) {
            this.generateBushesInClearing(centerX, centerY, theme.bushesInClearing);
        }
    }

    /** Remove all game objects created by this generator. */
    public destroy() {
        for (const obj of this.createdObjects) {
            obj.destroy();
        }
        this.createdObjects = [];
    }

    public getClearingRadius(): number {
        return this.clearingRadius;
    }

    // -------------------------------------------------------------------------

    private generateCircularForest(centerX: number, centerY: number, theme: MapThemeConfig) {
        const trees = FantasyAssetManifest.filter(a => a.type === 'tree');
        const bushes = FantasyAssetManifest.filter(a => a.type === 'bush');

        for (let i = 0; i < theme.forestDensity; i++) {
            const x = Phaser.Math.Between(0, this.mapWidth);
            const y = Phaser.Math.Between(0, this.mapHeight);
            const dist = Phaser.Math.Distance.Between(x, y, centerX, centerY);

            if (dist < this.clearingRadius) continue;

            const usePhysics = dist <= (this.clearingRadius + 100);
            const edgeBonus = Math.max(0, 1 - (dist - this.clearingRadius) / 400);
            const roll = Math.random();

            if (roll < 0.6 + edgeBonus * 0.3) {
                const tree = trees[Phaser.Math.Between(0, trees.length - 1)];
                this.placeAsset(x, y, tree, usePhysics);

                if (Math.random() > 0.7) {
                    const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
                    this.placeAsset(x + 20, y + 20, bush, usePhysics);
                }
            } else if (roll < 0.9) {
                const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
                this.placeAsset(x, y, bush, usePhysics);
            }
        }
    }

    private generateClearingDetails(centerX: number, centerY: number, theme: MapThemeConfig) {
        for (let i = 0; i < 300; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.clearingRadius;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            let cumulative = 0;
            const roll = Math.random();
            for (let j = 0; j < theme.clearingDetailFrames.length; j++) {
                cumulative += theme.clearingDetailWeights[j];
                if (roll < cumulative) {
                    this.placeTile(x, y, 'fantasy-ground', theme.clearingDetailFrames[j], -98);
                    break;
                }
            }
        }
    }

    private generateRocksInClearing(centerX: number, centerY: number, count: number) {
        const rocks = FantasyAssetManifest.filter(a => a.type === 'rock');
        if (rocks.length === 0) return;

        // Keep rocks away from the very centre (player spawn)
        const minDist = 150;
        const maxDist = this.clearingRadius - 80;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const rock = rocks[Phaser.Math.Between(0, rocks.length - 1)];
            this.placeAsset(x, y, rock, true);
        }
    }

    private generateRocksInForest(centerX: number, centerY: number, count: number) {
        const rocks = FantasyAssetManifest.filter(a => a.type === 'rock');
        if (rocks.length === 0) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = this.clearingRadius + 50 + Math.random() * 600;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            if (x < 0 || x > this.mapWidth || y < 0 || y > this.mapHeight) continue;

            const rock = rocks[Phaser.Math.Between(0, rocks.length - 1)];
            this.placeAsset(x, y, rock, false);
        }
    }

    private generateBushesInClearing(centerX: number, centerY: number, count: number) {
        const bushes = FantasyAssetManifest.filter(a => a.type === 'bush');
        if (bushes.length === 0) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * (this.clearingRadius - 250);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
            this.placeAsset(x, y, bush, false);
        }
    }

    private placeTile(x: number, y: number, key: string, frame: number, depth: number) {
        const sprite = this.scene.add.image(x, y, key, frame);
        sprite.setScale(this.scale);
        sprite.setDepth(depth);
        this.createdObjects.push(sprite);
    }

    private placeAsset(x: number, y: number, asset: FantasyAsset, usePhysics: boolean) {
        if (!asset) return;

        let sprite: Phaser.GameObjects.GameObject;
        if (usePhysics) {
            const s = this.obstacles.create(x, y, asset.id) as Phaser.Physics.Arcade.Image;
            s.refreshBody();
            s.setScale(this.scale);
            const baselineY = y + (asset.height * this.scale) / 2;
            s.setDepth(baselineY);
            sprite = s;
        } else {
            const s = this.scene.add.image(x, y, asset.id);
            s.setScale(this.scale);
            const baselineY = y + (asset.height * this.scale) / 2;
            s.setDepth(baselineY);
            sprite = s;
        }

        this.createdObjects.push(sprite);
    }
}

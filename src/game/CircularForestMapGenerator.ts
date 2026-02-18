import Phaser from 'phaser';
import { FantasyAssetManifest } from './FantasyAssetManifest';
import type { FantasyAsset } from './FantasyAssetManifest';

export class CircularForestMapGenerator {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;
    private scale: number = 2; // Default scale for assets
    private clearingRadius: number = 800; // Radius of the grass area

    constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, width: number, height: number) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = width;
        this.mapHeight = height;
    }

    public generate() {
        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;

        // 1. Fill background with grass
        const floor = this.scene.add.tileSprite(centerX, centerY, this.mapWidth, this.mapHeight, 'fantasy-ground', 20);
        floor.setScale(this.scale);
        floor.setDepth(-100);

        // 2. Generate Dense Forest outside the clearing
        this.generateCircularForest(centerX, centerY);

        // 3. Generate variations inside the clearing
        this.generateClearingDetails(centerX, centerY);
    }

    private generateCircularForest(centerX: number, centerY: number) {
        const trees = FantasyAssetManifest.filter(a => a.type === 'tree');
        const bushes = FantasyAssetManifest.filter(a => a.type === 'bush');

        // We want a very dense border at the clearing edge, and then scattered trees further out
        const forestDensity = 2500; // Increased count for density

        for (let i = 0; i < forestDensity; i++) {
            // Random point on the map
            const x = Phaser.Math.Between(0, this.mapWidth);
            const y = Phaser.Math.Between(0, this.mapHeight);

            const dist = Phaser.Math.Distance.Between(x, y, centerX, centerY);

            // If inside the clearing, skip
            if (dist < this.clearingRadius) continue;

            // Higher probability of placing something near the edge to make it look dense
            const edgeBonus = Math.max(0, 1 - (dist - this.clearingRadius) / 400);
            const roll = Math.random();

            if (roll < 0.6 + (edgeBonus * 0.3)) {
                const tree = trees[Phaser.Math.Between(0, trees.length - 1)];
                this.placeAsset(x, y, tree);

                // Occasional bush next to tree
                if (Math.random() > 0.7) {
                    const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
                    this.placeAsset(x + 20, y + 20, bush);
                }
            } else if (roll < 0.9) {
                const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
                this.placeAsset(x, y, bush);
            }
        }
    }

    private generateClearingDetails(centerX: number, centerY: number) {
        for (let i = 0; i < 300; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.clearingRadius;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const roll = Math.random();
            if (roll < 0.15) {
                // Flower (Tile 21)
                this.placeTile(x, y, 'fantasy-ground', 21, -95);
            } else if (roll < 0.25) {
                // Dirt patch (Tile 114)
                this.placeTile(x, y, 'fantasy-ground', 114, -98);
            }
        }
    }

    private placeTile(x: number, y: number, key: string, frame: number, depth: number) {
        const sprite = this.scene.add.image(x, y, key, frame);
        sprite.setScale(this.scale);
        sprite.setDepth(depth);
    }

    private placeAsset(x: number, y: number, asset: FantasyAsset) {
        if (!asset) return;
        const sprite = this.obstacles.create(x, y, asset.id);
        sprite.setScale(this.scale);

        // Depth sorting: baseline strategy
        const baselineY = y + (asset.height * this.scale) / 2;
        sprite.setDepth(baselineY);

        // Round off body for better movement
        if (sprite.body) {
            sprite.refreshBody();
        }
    }

    public getClearingRadius(): number {
        return this.clearingRadius;
    }
}

import Phaser from 'phaser';
import { FantasyAssetManifest } from './FantasyAssetManifest';
import type { FantasyAsset } from './FantasyAssetManifest';

const ROAD_TILES = {
    H: 37, V: 42,
    TL: 18, TR: 20, BL: 30, BR: 32,
    T_DOWN: 43, T_UP: 44, T_RIGHT: 45, T_LEFT: 46,
    CROSS: 47
};

export class FantasyMapGenerator {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;
    private scale: number = 2; // Default scale for assets
    private tileSize: number = 16;
    private scaledTileSize: number;

    constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, width: number, height: number) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = width;
        this.mapHeight = height;
        this.scaledTileSize = this.tileSize * this.scale;
    }

    public generate() {
        console.log("FantasyMapGenerator: Starting generation...");
        // 1. Fill background with grass
        const floor = this.scene.add.tileSprite(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 'fantasy-ground', 20);
        floor.setScale(this.scale);
        floor.setDepth(-100);

        // 2. Add some variation to the grass (flowers, dirt)
        this.generateTerrainVariation();

        // 3. Define Zones (Town, Forest, Scattered)
        // Let's place a Town in the center
        this.generateTown(this.mapWidth / 2, this.mapHeight / 2);

        // Place some Forests in corners or edges
        this.generateForest(500, 500);
        this.generateForest(2500, 500);
        this.generateForest(2500, 2500);
        this.generateForest(500, 2500);

        // Scatter some props everywhere else
        this.generateWilderness();
    }

    private generateTerrainVariation() {
        // Randomly place some flowers or dirt patches
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(0, this.mapWidth);
            const y = Phaser.Math.Between(0, this.mapHeight);

            // 20% flowers, 10% dirt spots
            const roll = Math.random();
            if (roll < 0.2) {
                // Flower (Tile 21 in Ground)
                this.placeTile(x, y, 'fantasy-ground', 21, -95);
            } else if (roll < 0.3) {
                // Dirt patch (Tile 114 in Ground)
                this.placeTile(x, y, 'fantasy-ground', 114, -98);
            }
        }
    }

    private generateTown(centerX: number, centerY: number) {
        console.log("FantasyMapGenerator: Generating Town at", centerX, centerY);
        const buildings = FantasyAssetManifest.filter(a => a.type === 'building');
        const townProps = FantasyAssetManifest.filter(a => a.type === 'prop');

        // Central well or landmark
        const well = buildings.find(b => b.id.includes('Well')) || buildings[0];
        this.placeAsset(centerX, centerY, well);

        // Place some houses in a loose circle/grid
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const dist = 350 + Phaser.Math.Between(-50, 50);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const building = buildings[Phaser.Math.Between(0, buildings.length - 1)];
            this.placeAsset(x, y, building);

            // Draw a road from the building to the well
            this.drawRoad(x, y + 40, centerX, centerY + 40);

            // Place some props around each house
            for (let j = 0; j < 3; j++) {
                const px = x + Phaser.Math.Between(-100, 100);
                const py = y + building.height + Phaser.Math.Between(20, 60);
                const prop = townProps[Phaser.Math.Between(0, townProps.length - 1)];
                this.placeAsset(px, py, prop);
            }
        }

        this.scene.add.text(centerX, centerY - 150, "The Eternal Hamlet", {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    private drawRoad(x1: number, y1: number, x2: number, y2: number) {
        // Simple L-shaped road
        // Align to grid
        const startX = Math.round(x1 / this.scaledTileSize) * this.scaledTileSize;
        const startY = Math.round(y1 / this.scaledTileSize) * this.scaledTileSize;
        const endX = Math.round(x2 / this.scaledTileSize) * this.scaledTileSize;
        const endY = Math.round(y2 / this.scaledTileSize) * this.scaledTileSize;

        // Draw horizontal leg
        const stepX = endX > startX ? this.scaledTileSize : -this.scaledTileSize;
        let curX = startX;
        while (Math.abs(curX - endX) > 1) {
            this.placeTile(curX, startY, 'fantasy-road', ROAD_TILES.H, -90);
            curX += stepX;
        }

        // Draw corner
        if (startX !== endX && startY !== endY) {
            // Pick corner tile based on direction
            let cornerTile = ROAD_TILES.CROSS;
            if (endX > startX && endY > startY) cornerTile = ROAD_TILES.BR;
            else if (endX > startX && endY < startY) cornerTile = ROAD_TILES.TR;
            else if (endX < startX && endY > startY) cornerTile = ROAD_TILES.BL;
            else if (endX < startX && endY < startY) cornerTile = ROAD_TILES.TL;

            this.placeTile(endX, startY, 'fantasy-road', cornerTile, -90);
        }

        // Draw vertical leg
        const stepY = endY > startY ? this.scaledTileSize : -this.scaledTileSize;
        let curY = startY + (startY !== endY ? stepY : 0);
        while (Math.abs(curY - endY) > 1) {
            this.placeTile(endX, curY, 'fantasy-road', ROAD_TILES.V, -90);
            curY += stepY;
        }
    }

    private placeTile(x: number, y: number, key: string, frame: number, depth: number) {
        const sprite = this.scene.add.image(x, y, key, frame);
        sprite.setScale(this.scale);
        sprite.setDepth(depth);
    }

    private generateForest(centerX: number, centerY: number) {
        const trees = FantasyAssetManifest.filter(a => a.type === 'tree');
        const bushes = FantasyAssetManifest.filter(a => a.type === 'bush');

        for (let i = 0; i < 15; i++) {
            const x = centerX + Phaser.Math.Between(-200, 200);
            const y = centerY + Phaser.Math.Between(-200, 200);

            const tree = trees[Phaser.Math.Between(0, trees.length - 1)];
            this.placeAsset(x, y, tree);

            if (Phaser.Math.Between(0, 1) > 0.5) {
                const bush = bushes[Phaser.Math.Between(0, bushes.length - 1)];
                this.placeAsset(x + 20, y + 20, bush);
            }
        }
    }

    private generateWilderness() {
        const wildernessProps = FantasyAssetManifest.filter(a => a.type === 'prop' || a.type === 'bush');

        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(100, this.mapWidth - 100);
            const y = Phaser.Math.Between(100, this.mapHeight - 100);

            // Avoid Town center (simple radius check)
            const distToTown = Phaser.Math.Distance.Between(x, y, this.mapWidth / 2, this.mapHeight / 2);
            if (distToTown < 600) continue;

            const asset = wildernessProps[Phaser.Math.Between(0, wildernessProps.length - 1)];
            this.placeAsset(x, y, asset);
        }
    }

    private placeAsset(x: number, y: number, asset: FantasyAsset) {
        if (!asset) {
            console.error("FantasyMapGenerator: Attempted to place undefined asset!");
            return;
        }
        const sprite = this.obstacles.create(x, y, asset.id);
        sprite.setScale(this.scale);
        sprite.refreshBody();

        // Depth sorting: baseline strategy
        const baselineY = y + (asset.height * this.scale) / 2;
        sprite.setDepth(baselineY);
    }
}

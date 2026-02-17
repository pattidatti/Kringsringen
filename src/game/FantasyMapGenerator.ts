import Phaser from 'phaser';

export class FantasyMapGenerator {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;

    constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, width: number, height: number) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = width;
        this.mapHeight = height;
    }

    public generate() {
        // Fill background with grass
        // The grass tiles are 16x16 in the tileset. We'll use a tileSprite for efficiency if possible,
        // but since we want to show off the specific tileset, let's just use the first tile for now as a base.
        // Actually, let's use the 'fantasy-ground' image we loaded.

        // 1. Base Layer (Grass) using the new tileset image
        // We'll create a TiledSprite using the first 16x16 block of the specific texture
        const floor = this.scene.add.tileSprite(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 'fantasy-ground', 0);
        floor.setScale(2); // Scale up to match game feel
        floor.setDepth(-100);

        // 2. Demo Layout
        this.createDemoArea(400, 400);
        this.createDemoArea(1000, 400);
        this.createDemoArea(400, 1000);
    }

    private createDemoArea(x: number, y: number) {
        // Place a House (from Buildings atlas)
        // Buildings atlas is 16x16 grid. 
        // Let's place a random frame from it to see what we get, or just a known house-valid range if we knew.
        // Since we don't have individual frame data easily without the JSON, we'll just place a few sprites 
        // to show they are loaded.

        this.scene.add.text(x, y - 100, "Fantasy Tileset Demo", { color: '#ffffff' });

        // Place some props
        const props = ['fantasy-props', 'fantasy-trees', 'fantasy-buildings'];

        for (let i = 0; i < 5; i++) {
            const key = props[Phaser.Math.Between(0, props.length - 1)];
            const frame = Phaser.Math.Between(0, 20); // Random frame

            const sprite = this.obstacles.create(x + (i * 60), y, key, frame);
            sprite.setScale(2);
            sprite.refreshBody();
        }

        // Place a specific large tree if we can hit it (approximate frame)
        // Trees usually have large frames.
        const tree = this.obstacles.create(x + 100, y + 100, 'fantasy-trees', 5);
        tree.setScale(3);
        tree.refreshBody();
    }
}

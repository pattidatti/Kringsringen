import Phaser from 'phaser';

interface Prefab {
    texture: string;
    frame: number;
    scale: number;
    width?: number; // Width in tiles (default 1)
    height?: number; // Height in tiles (default 1)
    collisionSize?: { w: number, h: number };
    collisionOffset?: { x: number, y: number };
    isCircle?: boolean;
    circleRadius?: number;
    shadowType: 'none' | 'struct' | 'plant';
}

export class MapGenerator {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;

    private prefabs: Record<string, Prefab> = {
        // STRUCTURES (TX Struct)
        'wall_rect': { texture: 'struct', frame: 33, scale: 2, width: 1, height: 2, collisionSize: { w: 30, h: 48 }, collisionOffset: { x: 1, y: 8 }, shadowType: 'struct' },
        'wall_window': { texture: 'struct', frame: 45, scale: 2, width: 1, height: 2, collisionSize: { w: 30, h: 48 }, collisionOffset: { x: 1, y: 8 }, shadowType: 'struct' },

        // PLANTS (TX Plant)
        // tree_large_1: Grid 1,2 -> Frame 33. Size 3x4 (Trimmed).
        'tree_large_1': { texture: 'plants', frame: 33, scale: 3, width: 3, height: 4, isCircle: true, circleRadius: 16, collisionOffset: { x: 48, y: 110 }, shadowType: 'plant' },
        // tree_large_2: Grid 5,2 -> Frame 37. Size 3x4.
        'tree_large_2': { texture: 'plants', frame: 37, scale: 3, width: 3, height: 4, isCircle: true, circleRadius: 16, collisionOffset: { x: 48, y: 110 }, shadowType: 'plant' },
        // tree_mid: Grid 9,2 -> Frame 41. Size 3x4.
        'tree_mid': { texture: 'plants', frame: 41, scale: 3, width: 3, height: 4, isCircle: true, circleRadius: 12, collisionOffset: { x: 48, y: 110 }, shadowType: 'plant' },
        // bush_1: Grid 1,7 -> Frame 113. Size 1x1.
        'bush_1': { texture: 'plants', frame: 113, scale: 2.5, width: 1, height: 1, collisionSize: { w: 20, h: 20 }, collisionOffset: { x: 6, y: 6 }, shadowType: 'plant' },
        // bush_2: Grid 5,7 -> Frame 117. Size 1x1.
        'bush_2': { texture: 'plants', frame: 117, scale: 2.5, width: 1, height: 1, collisionSize: { w: 20, h: 20 }, collisionOffset: { x: 6, y: 6 }, shadowType: 'plant' },

        // PROPS (TX Props)
        // rock_large: Grid 0,14 -> Frame 224. Size 2x2. (Actually Verified)
        'rock_large': { texture: 'props', frame: 224, scale: 2.5, width: 2, height: 2, collisionSize: { w: 50, h: 30 }, collisionOffset: { x: 15, y: 45 }, shadowType: 'struct' },
        // rock_mid: Grid 2,14 -> Frame 226. Size 1x1.
        'rock_mid': { texture: 'props', frame: 226, scale: 2, width: 1, height: 1, collisionSize: { w: 20, h: 14 }, collisionOffset: { x: 6, y: 10 }, shadowType: 'struct' },
        // barrel: Grid 1,0 -> Frame 1. Size 1x1.
        'barrel': { texture: 'props', frame: 1, scale: 2, width: 1, height: 1, collisionSize: { w: 18, h: 22 }, collisionOffset: { x: 7, y: 5 }, shadowType: 'struct' },
        // crate: Grid 4,0 -> Frame 4. Size 1x1.
        'crate': { texture: 'props', frame: 4, scale: 2, width: 1, height: 1, collisionSize: { w: 28, h: 28 }, collisionOffset: { x: 2, y: 2 }, shadowType: 'struct' },
        // statue: Grid 11,10 -> Frame 171. Size 2x2. (Actually a Well).
        'statue': { texture: 'props', frame: 171, scale: 2, width: 2, height: 2, isCircle: true, circleRadius: 24, collisionOffset: { x: 32, y: 32 }, shadowType: 'struct' },
    };

    constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, width: number, height: number) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = width;
        this.mapHeight = height;
    }

    public generate() {
        // 1. Village Ruins (Scattered points)
        for (let i = 0; i < 6; i++) {
            this.createRuinBiome();
        }

        // 2. Dense Forests
        for (let i = 0; i < 15; i++) {
            this.createForestBiome();
        }

        // 3. Scattered Props
        for (let i = 0; i < 40; i++) {
            this.spawnRandomObject();
        }
    }

    public generateTestLevel() {
        const keys = Object.keys(this.prefabs);
        let x = 200;
        let y = 200;
        const spacing = 600; // Increased spacing to prevent overlap

        // Add a title text for the test level (optional, but helpful if we had UI access)
        // this.scene.add.text(50, 50, 'PREFAB TEST LEVEL', { fontSize: '32px', color: '#fff' });

        keys.forEach((key) => {
            this.addObject(key, x, y);

            // Add label
            this.scene.add.text(x, y - 40, key, {
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#000000'
            }).setOrigin(0.5);

            x += spacing;
            if (x > this.mapWidth - 400) {
                x = 200;
                y += spacing + 200; // Extra vertical spacing
            }
        });
    }

    private createRuinBiome() {
        const x = Phaser.Math.Between(400, this.mapWidth - 400);
        const y = Phaser.Math.Between(400, this.mapHeight - 400);
        if (this.isNearSpawn(x, y)) return;

        const ruinType = Phaser.Math.Between(0, 1); // 0: L-Shape, 1: Corridor

        if (ruinType === 0) {
            // L-Shape
            for (let i = 0; i < 4; i++) this.addObject('wall_rect', x + i * 32 * 2, y);
            for (let i = 1; i < 4; i++) this.addObject('wall_rect', x, y + i * 32 * 2);
        } else {
            // Corridor
            for (let i = 0; i < 5; i++) {
                this.addObject('wall_rect', x, y + i * 32 * 2);
                this.addObject('wall_rect', x + 120, y + i * 32 * 2);
            }
        }

        // Add some debris inside
        this.addObject('rock_mid', x + 60, y + 60);
        this.addObject('barrel', x + 40, y + 100);
        this.addObject('crate', x + 80, y + 40);

        // Chance for a statue or large rock
        if (Math.random() > 0.5) {
            this.addObject('statue', x + 20, y + 20);
        } else {
            this.addObject('rock_large', x + 90, y + 90);
        }

        // Occasionally swap a wall for a window
        if (Math.random() > 0.3) {
            this.addObject('wall_window', x + 32 * 2, y);
        }
    }

    private createForestBiome() {
        const x = Phaser.Math.Between(200, this.mapWidth - 200);
        const y = Phaser.Math.Between(200, this.mapHeight - 200);
        if (this.isNearSpawn(x, y)) return;

        const count = Phaser.Math.Between(8, 15);
        for (let i = 0; i < count; i++) {
            const ox = Phaser.Math.Between(-120, 120);
            const oy = Phaser.Math.Between(-120, 120);

            let type = 'tree_large_1';
            const r = Math.random();

            if (r < 0.3) type = 'tree_large_1';
            else if (r < 0.5) type = 'tree_large_2';
            else if (r < 0.7) type = 'tree_mid';
            else if (r < 0.85) type = 'bush_1';
            else type = 'bush_2';

            this.addObject(type, x + ox, y + oy);
        }
    }

    private spawnRandomObject() {
        const x = Phaser.Math.Between(100, this.mapWidth - 100);
        const y = Phaser.Math.Between(100, this.mapHeight - 100);
        if (this.isNearSpawn(x, y)) return;

        const keys = Object.keys(this.prefabs);
        const randomKey = keys[Phaser.Math.Between(0, keys.length - 1)];
        this.addObject(randomKey, x, y);
    }

    private addObject(key: string, x: number, y: number) {
        const prefab = this.prefabs[key];
        if (!prefab) return;

        const width = prefab.width || 1;
        const height = prefab.height || 1;
        const tileStep = 32 * prefab.scale; // Width of one rendered tile in pixels

        // Add shadow first (centered on the whole object)
        if (prefab.shadowType !== 'none') {
            const shadowTex = prefab.shadowType === 'plant' ? 'shadows-plant' : 'shadows';
            const shadowX = x + (width * tileStep) / 2 - (tileStep / 2) + 4;
            const shadowY = y + (height * tileStep) / 2 - 10;

            const shadow = this.scene.add.image(shadowX, shadowY, shadowTex, 0);
            shadow.setAlpha(0.25);
            shadow.setDepth(y - 1);
            // Reduced shadow scale to prevent massive gray blocks
            shadow.setScale(prefab.scale * 1.5);
        }

        // Render Tiles
        // We use the first tile (0,0) as the Physics Anchor in the StaticGroup
        let anchorObj: Phaser.Physics.Arcade.Sprite | null = null;

        console.log(`Rendering prefab ${key} at ${x},${y}`);

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const posX = x + (c * tileStep);
                const posY = y + (r * tileStep);
                const frameIndex = prefab.frame + c + (r * 16); // 16 columns in 512px sheet
                console.log(`  - Tile ${c},${r}: Frame ${frameIndex}`);

                if (r === 0 && c === 0) {
                    // Create the Anchor Object (Physics)
                    anchorObj = this.obstacles.create(posX, posY, prefab.texture, frameIndex);
                    if (anchorObj) {
                        anchorObj.setScale(prefab.scale);
                        anchorObj.setDepth(posY);
                    }
                } else {
                    // Create Visual-Only parts
                    const tile = this.scene.add.image(posX, posY, prefab.texture, frameIndex);
                    tile.setScale(prefab.scale);
                    tile.setDepth(posY);
                }
            }
        }

        // Apply Collision to the Anchor Object
        if (anchorObj && anchorObj.body) {
            if (prefab.isCircle) {
                anchorObj.body.setCircle(prefab.circleRadius || 10, prefab.collisionOffset?.x || 0, prefab.collisionOffset?.y || 0);
            } else if (prefab.collisionSize) {
                anchorObj.body.setSize(prefab.collisionSize.w, prefab.collisionSize.h);
                if (prefab.collisionOffset) {
                    anchorObj.body.setOffset(prefab.collisionOffset.x, prefab.collisionOffset.y);
                }
            }
            anchorObj.refreshBody();
        }
    }

    private isNearSpawn(x: number, y: number): boolean {
        return Phaser.Math.Distance.Between(x, y, this.mapWidth / 2, this.mapHeight / 2) < 300;
    }
}

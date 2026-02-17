import Phaser from 'phaser';

interface Prefab {
    texture: string;
    frame: number;
    scale: number;
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
        'wall_rect': { texture: 'struct', frame: 0, scale: 2, collisionSize: { w: 30, h: 24 }, collisionOffset: { x: 1, y: 4 }, shadowType: 'struct' },
        'wall_window': { texture: 'struct', frame: 7, scale: 2, collisionSize: { w: 30, h: 24 }, collisionOffset: { x: 1, y: 4 }, shadowType: 'struct' },

        // PLANTS (TX Plant)
        'tree_large_1': { texture: 'plants', frame: 0, scale: 3, isCircle: true, circleRadius: 10, collisionOffset: { x: 6, y: 16 }, shadowType: 'plant' },
        'tree_large_2': { texture: 'plants', frame: 1, scale: 3, isCircle: true, circleRadius: 10, collisionOffset: { x: 6, y: 16 }, shadowType: 'plant' },
        'tree_mid': { texture: 'plants', frame: 2, scale: 3, isCircle: true, circleRadius: 8, collisionOffset: { x: 8, y: 18 }, shadowType: 'plant' },
        'bush_1': { texture: 'plants', frame: 3, scale: 2, collisionSize: { w: 24, h: 16 }, collisionOffset: { x: 4, y: 16 }, shadowType: 'plant' },
        'bush_2': { texture: 'plants', frame: 4, scale: 2, collisionSize: { w: 24, h: 16 }, collisionOffset: { x: 4, y: 16 }, shadowType: 'plant' },

        // PROPS (TX Props)
        'rock_large': { texture: 'props', frame: 32, scale: 2.5, collisionSize: { w: 28, h: 20 }, collisionOffset: { x: 2, y: 6 }, shadowType: 'struct' },
        'rock_mid': { texture: 'props', frame: 33, scale: 2, collisionSize: { w: 20, h: 14 }, collisionOffset: { x: 6, y: 10 }, shadowType: 'struct' },
        'barrel': { texture: 'props', frame: 10, scale: 2, collisionSize: { w: 18, h: 22 }, collisionOffset: { x: 7, y: 5 }, shadowType: 'struct' },
        'crate': { texture: 'props', frame: 2, scale: 2, collisionSize: { w: 28, h: 28 }, collisionOffset: { x: 2, y: 2 }, shadowType: 'struct' },
        'statue': { texture: 'props', frame: 6, scale: 2, collisionSize: { w: 24, h: 40 }, collisionOffset: { x: 4, y: -8 }, shadowType: 'struct' },
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
    }

    private createForestBiome() {
        const x = Phaser.Math.Between(200, this.mapWidth - 200);
        const y = Phaser.Math.Between(200, this.mapHeight - 200);
        if (this.isNearSpawn(x, y)) return;

        const count = Phaser.Math.Between(8, 15);
        for (let i = 0; i < count; i++) {
            const ox = Phaser.Math.Between(-120, 120);
            const oy = Phaser.Math.Between(-120, 120);
            const type = Math.random() > 0.4 ? 'tree_large_1' : (Math.random() > 0.5 ? 'tree_large_2' : 'bush_1');
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

        // Add shadow first
        if (prefab.shadowType !== 'none') {
            const shadowTex = prefab.shadowType === 'plant' ? 'shadows-plant' : 'shadows';
            const shadow = this.scene.add.image(x + 4, y + 10, shadowTex, 0);
            shadow.setAlpha(0.25);
            shadow.setDepth(y - 1);
            shadow.setScale(prefab.scale);
        }

        const obj = this.obstacles.create(x, y, prefab.texture, prefab.frame);
        obj.setScale(prefab.scale);
        obj.setDepth(y);
        obj.refreshBody();

        if (prefab.isCircle) {
            obj.body.setCircle(prefab.circleRadius, prefab.collisionOffset?.x || 0, prefab.collisionOffset?.y || 0);
        } else if (prefab.collisionSize) {
            obj.body.setSize(prefab.collisionSize.w, prefab.collisionSize.h);
            if (prefab.collisionOffset) {
                obj.body.setOffset(prefab.collisionOffset.x, prefab.collisionOffset.y);
            }
        }
    }

    private isNearSpawn(x: number, y: number): boolean {
        return Phaser.Math.Distance.Between(x, y, this.mapWidth / 2, this.mapHeight / 2) < 300;
    }
}

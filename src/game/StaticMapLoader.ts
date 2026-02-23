import Phaser from 'phaser';
import type { StaticMapDef } from './StaticMapData';

/**
 * Loads a pre-defined static map definition into the Phaser scene.
 * Replaces the procedural CircularForestMapGenerator with zero runtime computation.
 */
export class StaticMapLoader {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.StaticGroup;
    private mapWidth: number;
    private mapHeight: number;
    private createdObjects: Phaser.GameObjects.GameObject[] = [];
    private readonly scale: number = 2;
    private readonly clearingRadius: number = 800;

    constructor(
        scene: Phaser.Scene,
        obstacles: Phaser.Physics.Arcade.StaticGroup,
        mapWidth: number,
        mapHeight: number,
    ) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
    }

    public load(mapDef: StaticMapDef): void {
        const cx = this.mapWidth / 2;
        const cy = this.mapHeight / 2;

        // 1. Tiled background floor
        const floor = this.scene.add.tileSprite(cx, cy, this.mapWidth, this.mapHeight, 'fantasy-ground', mapDef.groundFrame);
        floor.setScale(this.scale);
        floor.setDepth(-100);
        this.createdObjects.push(floor);

        // 2. Ground detail tiles (flowers, dirt patches inside clearing)
        for (const d of mapDef.detailTiles) {
            const img = this.scene.add.image(d.x, d.y, 'fantasy-ground', d.frame);
            img.setScale(this.scale);
            img.setDepth(-98);
            this.createdObjects.push(img);
        }

        // 3. Map objects (trees, bushes, rocks)
        for (const obj of mapDef.objects) {
            this.placeObject(obj.assetId, obj.x, obj.y, obj.physics);
        }

        // 4. Batch-refresh all static physics bodies in one call
        this.obstacles.refresh();
    }

    public destroy(): void {
        for (const obj of this.createdObjects) {
            obj.destroy();
        }
        this.createdObjects = [];
    }

    public getClearingRadius(): number {
        return this.clearingRadius;
    }

    private placeObject(assetId: string, x: number, y: number, usePhysics: boolean): void {
        if (usePhysics) {
            const s = this.obstacles.create(x, y, assetId) as Phaser.Physics.Arcade.Image;
            s.setScale(this.scale);
            s.setDepth(y + s.height * this.scale * 0.5);
            this.createdObjects.push(s);
        } else {
            const s = this.scene.add.image(x, y, assetId);
            s.setScale(this.scale);
            s.setDepth(y + s.height * this.scale * 0.5);
            this.createdObjects.push(s);
        }
    }
}

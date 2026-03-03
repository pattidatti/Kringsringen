import fs from 'fs';
import path from 'path';
import { STATIC_MAPS } from '../src/game/StaticMapData';
import { FantasyAssetManifest } from '../src/game/FantasyAssetManifest';

const OUTPUT_DIR = path.join(process.cwd(), 'exports', 'spritefusion');
const ASSETS_ROOT = path.join(process.cwd(), 'public');

// SpriteFusion 2 format constants
const TILE_SIZE = 16;
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;

function toBase64(filePath: string): string {
    const fullPath = path.join(ASSETS_ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Asset not found: ${fullPath}`);
        return '';
    }
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface SF2Tile {
    id: string;
    x: number;
    y: number;
    spriteSheetId: string;
    tileIndex: number;
    rot: number;
    flipX: boolean;
    scaleX: number;
    attributes: Record<string, any>;
}

interface SF2Layer {
    id: string;
    name: string;
    tiles: SF2Tile[];
    collider: boolean;
}

function exportLevel(levelDef: any, index: number) {
    console.log(`Exporting Level ${levelDef.level}...`);

    const spriteSheets: Record<string, string> = {};
    const assetIdToSheetId: Record<string, string> = {};

    // 1. Add Ground Tileset
    const groundSheetId = generateUUID();
    spriteSheets[groundSheetId] = toBase64('assets/fantasy/Art/Ground Tileset/Tileset_Ground.png');

    // 2. Add individual object assets as their own "spritesheets" (SpriteFusion 1-tile sheets)
    levelDef.objects.forEach((obj: any) => {
        if (!assetIdToSheetId[obj.assetId]) {
            const asset = FantasyAssetManifest.find(a => a.id === obj.assetId);
            if (asset) {
                const sheetId = generateUUID();
                spriteSheets[sheetId] = toBase64(asset.path);
                assetIdToSheetId[obj.assetId] = sheetId;
            }
        }
    });

    const layers: SF2Layer[] = [
        {
            id: generateUUID(),
            name: "Ground",
            tiles: [],
            collider: false
        },
        {
            id: generateUUID(),
            name: "Details",
            tiles: [],
            collider: false
        },
        {
            id: generateUUID(),
            name: "Objects",
            tiles: [],
            collider: true
        }
    ];

    // 3. Fill Ground Layer (simplified: just one big tile covering the center or tiled)
    // For SpriteFusion, we'll actually tile the area.
    // Given 3000x3000px and 16px tiles, that's ~188x188 tiles.
    // To keep JSON size sane, let's only tile the visible area or a reasonable chunk.
    const groundFrame = levelDef.groundFrame;
    for (let x = 0; x < MAP_WIDTH; x += TILE_SIZE) {
        for (let y = 0; y < MAP_HEIGHT; y += TILE_SIZE) {
            layers[0].tiles.push({
                id: `g_${x}_${y}`,
                x,
                y,
                spriteSheetId: groundSheetId,
                tileIndex: groundFrame,
                rot: 0,
                flipX: false,
                scaleX: 1,
                attributes: {}
            });
        }
    }

    // 4. Detail Tiles
    levelDef.detailTiles.forEach((tile: any, idx: number) => {
        layers[1].tiles.push({
            id: `d_${idx}`,
            x: tile.x,
            y: tile.y,
            spriteSheetId: groundSheetId,
            tileIndex: tile.frame,
            rot: 0,
            flipX: false,
            scaleX: 1,
            attributes: {}
        });
    });

    // 5. Objects
    levelDef.objects.forEach((obj: any, idx: number) => {
        const sheetId = assetIdToSheetId[obj.assetId];
        if (sheetId) {
            layers[2].tiles.push({
                id: `o_${idx}`,
                x: obj.x,
                y: obj.y,
                spriteSheetId: sheetId,
                tileIndex: 0, // Individual image sheet has only 1 tile
                rot: 0,
                flipX: false,
                scaleX: 1,
                attributes: { assetId: obj.assetId, physics: obj.physics }
            });
        }
    });

    const project = {
        tileSize: TILE_SIZE,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        spriteSheets,
        layers
    };

    const fileName = `level_${levelDef.level}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
    console.log(`Saved level to ${filePath}`);
}

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

STATIC_MAPS.forEach((map, idx) => {
    exportLevel(map, idx);
});

console.log('All levels exported successfully.');

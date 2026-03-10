import type { StaticMapDef, MapObject, DetailTile } from '../game/StaticMapData';

/**
 * Dedikert PVP-arena: Symmetrisk sirkulær lysning med skogring.
 * Kompakt arena med taktisk dekning (symmetriske steiner).
 * Spillere spawner på motstående sider: host på x=1200, client på x=1800.
 */

const CX = 1500;
const CY = 1500;
const CLEARING = 600; // Tighter than PvE maps for close combat

const TREES = [
    'tree-Tree_Emerald_1',
    'tree-Tree_Emerald_2',
    'tree-Tree_Emerald_3',
    'tree-Tree_Emerald_4',
];
const BUSHES = [
    'bush-Bush_Emerald_1',
    'bush-Bush_Emerald_2',
    'bush-Bush_Emerald_3',
    'bush-Bush_Emerald_4',
];
const ROCKS = [
    'rock-Rock_Brown_1',
    'rock-Rock_Brown_2',
    'rock-Rock_Brown_4',
];

function ring(
    cx: number, cy: number, radius: number, count: number,
    angleOffset: number, assetIds: string[], physics: boolean,
    radiusJitter: number = 60,
): MapObject[] {
    const objects: MapObject[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + angleOffset;
        const r = radius + ((i * 37) % (radiusJitter * 2)) - radiusJitter;
        const x = Math.round(cx + Math.cos(angle) * r);
        const y = Math.round(cy + Math.sin(angle) * r);
        objects.push({ assetId: assetIds[i % assetIds.length], x, y, physics });
    }
    return objects;
}

function pts(seed: number, count: number, cx: number, cy: number, minR: number, maxR: number) {
    const result: Array<{ x: number; y: number }> = [];
    let s = seed >>> 0;
    for (let i = 0; i < count; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const angle = (s / 0xffffffff) * Math.PI * 2;
        s = (s * 1664525 + 1013904223) >>> 0;
        const r = minR + (s / 0xffffffff) * (maxR - minR);
        result.push({ x: Math.round(cx + Math.cos(angle) * r), y: Math.round(cy + Math.sin(angle) * r) });
    }
    return result;
}

export function buildPvpArena(): StaticMapDef {
    const objects: MapObject[] = [];

    // Dense tree ring - inner boundary
    objects.push(...ring(CX, CY, CLEARING + 40, 52, 0, TREES, true, 30));
    // Bush layer
    objects.push(...ring(CX, CY, CLEARING + 80, 48, 0.065, BUSHES, true, 25));
    // Mid-forest
    objects.push(...ring(CX, CY, CLEARING + 200, 40, 0.09, TREES, false, 70));
    objects.push(...ring(CX, CY, CLEARING + 200, 36, 0.135, BUSHES, false, 50));
    // Outer forest
    objects.push(...ring(CX, CY, CLEARING + 380, 30, 0.18, TREES, false, 100));
    objects.push(...ring(CX, CY, CLEARING + 540, 24, 0.25, TREES, false, 120));

    // Corner fill
    const cornerPts = pts(8001, 30, CX, CY, CLEARING + 600, 1100);
    for (let i = 0; i < cornerPts.length; i++) {
        const p = cornerPts[i];
        if (p.x < 100 || p.x > 2900 || p.y < 100 || p.y > 2900) continue;
        objects.push({ assetId: TREES[i % TREES.length], x: p.x, y: p.y, physics: false });
    }

    // SYMMETRICAL cover rocks - 4 pairs placed symmetrically
    // Top pair
    objects.push({ assetId: ROCKS[0], x: CX - 200, y: CY - 250, physics: true });
    objects.push({ assetId: ROCKS[0], x: CX + 200, y: CY - 250, physics: true });
    // Bottom pair
    objects.push({ assetId: ROCKS[1], x: CX - 200, y: CY + 250, physics: true });
    objects.push({ assetId: ROCKS[1], x: CX + 200, y: CY + 250, physics: true });
    // Center side barriers - closer to spawn points for initial cover
    objects.push({ assetId: ROCKS[2], x: CX - 150, y: CY, physics: true });
    objects.push({ assetId: ROCKS[2], x: CX + 150, y: CY, physics: true });

    // Detail tiles
    const detailTiles: DetailTile[] = [];
    const dPts = pts(9001, 60, CX, CY, 0, CLEARING - 80);
    const detailFrames = [21, 21, 114, 21];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return {
        level: 0, // Special: PVP arena
        groundFrame: 20, // Grass
        objects,
        detailTiles,
    };
}

export const PVP_ARENA = buildPvpArena();

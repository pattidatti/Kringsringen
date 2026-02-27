/**
 * Static map definitions for each game level.
 *
 * Map is 3000×3000 px. Player spawns at (1500, 1500).
 * Clearing radius: 800 px from centre.
 * Forest zone: outside 800 px radius.
 * All sprites are rendered at 2× scale.
 *
 * Physics rules:
 *  - Trees and edge-bushes with physics=true block player/enemies.
 *  - Decorative forest objects and clearing bushes use physics=false.
 *  - Clearing rocks always use physics=true.
 */

export interface MapObject {
    assetId: string;
    x: number;
    y: number;
    physics: boolean;
}

export interface DetailTile {
    x: number;
    y: number;
    frame: number; // fantasy-ground spritesheet frame index
}

export interface StaticMapDef {
    level: number;
    groundFrame: number; // base ground tile frame (20 = grass)
    objects: MapObject[];
    detailTiles: DetailTile[];
}

// ---------------------------------------------------------------------------
// Helper: build a dense ring of trees and bushes around the clearing.
// Angles are evenly distributed with slight offsets so it feels hand-placed.
// ---------------------------------------------------------------------------

function ring(
    cx: number,
    cy: number,
    radius: number,
    count: number,
    angleOffset: number,
    assetIds: string[],
    physics: boolean,
    radiusJitter: number = 60,
): MapObject[] {
    const objects: MapObject[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + angleOffset;
        const r = radius + ((i * 37) % (radiusJitter * 2)) - radiusJitter;
        const x = Math.round(cx + Math.cos(angle) * r);
        const y = Math.round(cy + Math.sin(angle) * r);
        const asset = assetIds[i % assetIds.length];
        objects.push({ assetId: asset, x, y, physics });
    }
    return objects;
}

// Deterministic point generator (avoids Math.random at build time)
function pts(seed: number, count: number, cx: number, cy: number, minR: number, maxR: number) {
    const result: Array<{ x: number; y: number }> = [];
    let s = seed >>> 0;
    for (let i = 0; i < count; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const angle = (s / 0xffffffff) * Math.PI * 2;
        s = (s * 1664525 + 1013904223) >>> 0;
        const r = minR + (s / 0xffffffff) * (maxR - minR);
        result.push({
            x: Math.round(cx + Math.cos(angle) * r),
            y: Math.round(cy + Math.sin(angle) * r),
        });
    }
    return result;
}

const CX = 1500;
const CY = 1500;
const CLEARING = 800;

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
    'bush-Bush_Emerald_5',
    'bush-Bush_Emerald_6',
    'bush-Bush_Emerald_7',
];
const ROCKS = [
    'rock-Rock_Brown_1',
    'rock-Rock_Brown_2',
    'rock-Rock_Brown_4',
    'rock-Rock_Brown_6',
    'rock-Rock_Brown_9',
];

// ---------------------------------------------------------------------------
// LEVEL 1 – Den Grønne Lysningen
// Simple open clearing, dense emerald forest ring. No obstacles in clearing.
// ---------------------------------------------------------------------------

function buildLevel1(): StaticMapDef {
    const objects: MapObject[] = [];

    // Inner edge of forest – tight ring of trees with physics (block player)
    objects.push(...ring(CX, CY, CLEARING + 40, 48, 0, TREES, true, 40));
    // Bushes nestled against the tree line
    objects.push(...ring(CX, CY, CLEARING + 80, 48, 0.065, BUSHES, true, 30));
    // Mid-forest layer – trees, no physics (player can't reach)
    objects.push(...ring(CX, CY, CLEARING + 220, 36, 0.09, TREES, false, 80));
    objects.push(...ring(CX, CY, CLEARING + 220, 36, 0.135, BUSHES, false, 60));
    // Outer forest – sparse, deep trees
    objects.push(...ring(CX, CY, CLEARING + 420, 28, 0.18, TREES, false, 120));
    objects.push(...ring(CX, CY, CLEARING + 580, 22, 0.25, TREES, false, 140));

    // Corner fill – extra trees in map corners where rings don't reach
    const cornerPts = pts(1001, 30, CX, CY, CLEARING + 700, 1200);
    for (let i = 0; i < cornerPts.length; i++) {
        const p = cornerPts[i];
        if (p.x < 100 || p.x > 2900 || p.y < 100 || p.y > 2900) continue;
        objects.push({ assetId: TREES[i % TREES.length], x: p.x, y: p.y, physics: false });
    }

    // Clearing detail tiles (flowers frame 21, dirt frame 114)
    const detailTiles: DetailTile[] = [];
    const dPts = pts(2001, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [21, 21, 21, 114];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 1, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 2 – De Mørke Stiene
// Clearing rocks + bushes appear. Forest gets denser.
// ---------------------------------------------------------------------------

function buildLevel2(): StaticMapDef {
    const objects: MapObject[] = [];

    // Forest ring (same as level 1 but slightly tighter)
    objects.push(...ring(CX, CY, CLEARING + 40, 52, 0.05, TREES, true, 38));
    objects.push(...ring(CX, CY, CLEARING + 85, 52, 0.08, BUSHES, true, 28));
    objects.push(...ring(CX, CY, CLEARING + 230, 40, 0.12, TREES, false, 85));
    objects.push(...ring(CX, CY, CLEARING + 230, 40, 0.155, BUSHES, false, 65));
    objects.push(...ring(CX, CY, CLEARING + 430, 32, 0.20, TREES, false, 110));
    objects.push(...ring(CX, CY, CLEARING + 600, 24, 0.28, TREES, false, 140));

    // Rocks inside clearing (physics=true, kept 150+ from centre)
    const rockPts = pts(3001, 8, CX, CY, 200, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    // Rocks in forest zone (decoration)
    const forestRockPts = pts(3501, 20, CX, CY, CLEARING + 50, CLEARING + 600);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    // Bushes in clearing (decoration)
    const clearingBushPts = pts(4001, 12, CX, CY, 200, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(5001, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [114, 145, 157, 21];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 2, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 3 – Ulvemarka
// More rocks and bushes in clearing, even denser forest.
// ---------------------------------------------------------------------------

function buildLevel3(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 40, 56, 0.10, TREES, true, 35));
    objects.push(...ring(CX, CY, CLEARING + 88, 56, 0.13, BUSHES, true, 25));
    objects.push(...ring(CX, CY, CLEARING + 240, 44, 0.17, TREES, false, 80));
    objects.push(...ring(CX, CY, CLEARING + 240, 44, 0.21, BUSHES, false, 60));
    objects.push(...ring(CX, CY, CLEARING + 440, 36, 0.25, TREES, false, 105));
    objects.push(...ring(CX, CY, CLEARING + 620, 28, 0.31, TREES, false, 130));
    // Extra deep layer
    objects.push(...ring(CX, CY, CLEARING + 850, 22, 0.38, TREES, false, 160));

    // Clearing rocks
    const rockPts = pts(6001, 18, CX, CY, 170, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    // Forest rocks
    const forestRockPts = pts(6501, 50, CX, CY, CLEARING + 50, CLEARING + 650);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    // Clearing bushes
    const clearingBushPts = pts(7001, 20, CX, CY, 180, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(8001, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [114, 144, 145, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 3, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 4 – Trollskogen
// Maximum density, many rocks in clearing, very tight forest wall.
// ---------------------------------------------------------------------------

function buildLevel4(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 38, 60, 0.15, TREES, true, 32));
    objects.push(...ring(CX, CY, CLEARING + 82, 60, 0.19, BUSHES, true, 22));
    objects.push(...ring(CX, CY, CLEARING + 180, 48, 0.23, TREES, false, 75));
    objects.push(...ring(CX, CY, CLEARING + 180, 48, 0.27, BUSHES, false, 55));
    objects.push(...ring(CX, CY, CLEARING + 350, 40, 0.32, TREES, false, 95));
    objects.push(...ring(CX, CY, CLEARING + 520, 32, 0.38, TREES, false, 115));
    objects.push(...ring(CX, CY, CLEARING + 700, 26, 0.44, TREES, false, 140));
    objects.push(...ring(CX, CY, CLEARING + 900, 20, 0.51, TREES, false, 160));

    // Clearing rocks (25)
    const rockPts = pts(9001, 25, CX, CY, 160, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    // Forest rocks (80)
    const forestRockPts = pts(9501, 80, CX, CY, CLEARING + 50, CLEARING + 700);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    // Clearing bushes (25)
    const clearingBushPts = pts(10001, 25, CX, CY, 160, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(11001, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [114, 144, 145, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 4, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 5 – Skumringen
// Darker clearing: many rocks, dense forest, dead bushes mixed in.
// ---------------------------------------------------------------------------

function buildLevel5(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 36, 62, 0.20, TREES, true, 30));
    objects.push(...ring(CX, CY, CLEARING + 78, 62, 0.24, BUSHES, true, 20));
    objects.push(...ring(CX, CY, CLEARING + 170, 50, 0.29, TREES, false, 70));
    objects.push(...ring(CX, CY, CLEARING + 170, 50, 0.33, BUSHES, false, 50));
    objects.push(...ring(CX, CY, CLEARING + 340, 42, 0.38, TREES, false, 90));
    objects.push(...ring(CX, CY, CLEARING + 510, 34, 0.44, TREES, false, 110));
    objects.push(...ring(CX, CY, CLEARING + 680, 28, 0.51, TREES, false, 135));
    objects.push(...ring(CX, CY, CLEARING + 880, 22, 0.58, TREES, false, 155));

    // Clearing rocks (30)
    const rockPts = pts(12001, 30, CX, CY, 150, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    // Forest rocks (90)
    const forestRockPts = pts(12501, 90, CX, CY, CLEARING + 50, CLEARING + 720);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    // Clearing bushes (28)
    const clearingBushPts = pts(13001, 28, CX, CY, 150, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(13501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [114, 144, 145, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 5, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 6 – Ravinen
// Cramped clearing with many large rock formations.
// ---------------------------------------------------------------------------

function buildLevel6(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 34, 64, 0.26, TREES, true, 28));
    objects.push(...ring(CX, CY, CLEARING + 74, 64, 0.31, BUSHES, true, 18));
    objects.push(...ring(CX, CY, CLEARING + 160, 52, 0.36, TREES, false, 65));
    objects.push(...ring(CX, CY, CLEARING + 160, 52, 0.40, BUSHES, false, 48));
    objects.push(...ring(CX, CY, CLEARING + 320, 44, 0.45, TREES, false, 85));
    objects.push(...ring(CX, CY, CLEARING + 490, 36, 0.51, TREES, false, 105));
    objects.push(...ring(CX, CY, CLEARING + 660, 30, 0.57, TREES, false, 130));
    objects.push(...ring(CX, CY, CLEARING + 860, 24, 0.63, TREES, false, 150));

    // More rocks in clearing (35)
    const rockPts = pts(14001, 35, CX, CY, 140, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    const forestRockPts = pts(14501, 100, CX, CY, CLEARING + 50, CLEARING + 740);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    const clearingBushPts = pts(15001, 30, CX, CY, 140, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(15501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [144, 145, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 6, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 7 – Katakombene
// Very dense rock placement — narrow corridors between obstacles.
// ---------------------------------------------------------------------------

function buildLevel7(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 32, 66, 0.32, TREES, true, 26));
    objects.push(...ring(CX, CY, CLEARING + 70, 66, 0.37, BUSHES, true, 16));
    objects.push(...ring(CX, CY, CLEARING + 150, 54, 0.42, TREES, false, 60));
    objects.push(...ring(CX, CY, CLEARING + 150, 54, 0.46, BUSHES, false, 44));
    objects.push(...ring(CX, CY, CLEARING + 300, 46, 0.51, TREES, false, 80));
    objects.push(...ring(CX, CY, CLEARING + 470, 38, 0.57, TREES, false, 100));
    objects.push(...ring(CX, CY, CLEARING + 640, 32, 0.63, TREES, false, 125));
    objects.push(...ring(CX, CY, CLEARING + 840, 26, 0.69, TREES, false, 145));

    const rockPts = pts(16001, 40, CX, CY, 130, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    const forestRockPts = pts(16501, 110, CX, CY, CLEARING + 50, CLEARING + 760);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    const clearingBushPts = pts(17001, 32, CX, CY, 130, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(17501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [144, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 7, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 8 – Trolldalen
// Maximum rock density, labyrinthine clearing.
// ---------------------------------------------------------------------------

function buildLevel8(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 30, 68, 0.38, TREES, true, 24));
    objects.push(...ring(CX, CY, CLEARING + 66, 68, 0.43, BUSHES, true, 14));
    objects.push(...ring(CX, CY, CLEARING + 140, 56, 0.48, TREES, false, 55));
    objects.push(...ring(CX, CY, CLEARING + 140, 56, 0.52, BUSHES, false, 40));
    objects.push(...ring(CX, CY, CLEARING + 280, 48, 0.57, TREES, false, 75));
    objects.push(...ring(CX, CY, CLEARING + 450, 40, 0.63, TREES, false, 95));
    objects.push(...ring(CX, CY, CLEARING + 620, 34, 0.69, TREES, false, 120));
    objects.push(...ring(CX, CY, CLEARING + 820, 28, 0.75, TREES, false, 140));

    const rockPts = pts(18001, 45, CX, CY, 120, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    const forestRockPts = pts(18501, 120, CX, CY, CLEARING + 50, CLEARING + 780);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    const clearingBushPts = pts(19001, 35, CX, CY, 120, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(19501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [144, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 8, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 9 – Den Mørke Borg
// Heaviest forest, rocks packed tight — pre-final push.
// ---------------------------------------------------------------------------

function buildLevel9(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 28, 70, 0.44, TREES, true, 22));
    objects.push(...ring(CX, CY, CLEARING + 62, 70, 0.49, BUSHES, true, 12));
    objects.push(...ring(CX, CY, CLEARING + 130, 58, 0.54, TREES, false, 50));
    objects.push(...ring(CX, CY, CLEARING + 130, 58, 0.58, BUSHES, false, 36));
    objects.push(...ring(CX, CY, CLEARING + 260, 50, 0.63, TREES, false, 70));
    objects.push(...ring(CX, CY, CLEARING + 430, 42, 0.69, TREES, false, 90));
    objects.push(...ring(CX, CY, CLEARING + 600, 36, 0.75, TREES, false, 115));
    objects.push(...ring(CX, CY, CLEARING + 800, 30, 0.81, TREES, false, 135));

    const rockPts = pts(20001, 50, CX, CY, 110, CLEARING - 80);
    for (let i = 0; i < rockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: rockPts[i].x, y: rockPts[i].y, physics: true });
    }

    const forestRockPts = pts(20501, 130, CX, CY, CLEARING + 50, CLEARING + 800);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    const clearingBushPts = pts(21001, 38, CX, CY, 110, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(21501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [144, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 9, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// LEVEL 10 – Sluttboss-arenaen
// Open centre (fewer rocks near middle) but impenetrable forest walls.
// Boss arena feel: lots of space to move but oppressive surroundings.
// ---------------------------------------------------------------------------

function buildLevel10(): StaticMapDef {
    const objects: MapObject[] = [];

    objects.push(...ring(CX, CY, CLEARING + 26, 72, 0.50, TREES, true, 20));
    objects.push(...ring(CX, CY, CLEARING + 58, 72, 0.55, BUSHES, true, 10));
    objects.push(...ring(CX, CY, CLEARING + 120, 60, 0.60, TREES, false, 45));
    objects.push(...ring(CX, CY, CLEARING + 120, 60, 0.64, BUSHES, false, 32));
    objects.push(...ring(CX, CY, CLEARING + 250, 52, 0.69, TREES, false, 65));
    objects.push(...ring(CX, CY, CLEARING + 420, 44, 0.75, TREES, false, 85));
    objects.push(...ring(CX, CY, CLEARING + 590, 38, 0.81, TREES, false, 110));
    objects.push(...ring(CX, CY, CLEARING + 790, 32, 0.87, TREES, false, 130));

    // Fewer rocks in centre (arena feel) but ring of rocks near forest edge
    const innerRockPts = pts(22001, 15, CX, CY, 450, CLEARING - 80);
    for (let i = 0; i < innerRockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: innerRockPts[i].x, y: innerRockPts[i].y, physics: true });
    }

    const outerRockPts = pts(22201, 20, CX, CY, 200, 420);
    for (let i = 0; i < outerRockPts.length; i++) {
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: outerRockPts[i].x, y: outerRockPts[i].y, physics: true });
    }

    const forestRockPts = pts(22501, 140, CX, CY, CLEARING + 50, CLEARING + 820);
    for (let i = 0; i < forestRockPts.length; i++) {
        const p = forestRockPts[i];
        if (p.x < 50 || p.x > 2950 || p.y < 50 || p.y > 2950) continue;
        objects.push({ assetId: ROCKS[i % ROCKS.length], x: p.x, y: p.y, physics: false });
    }

    const clearingBushPts = pts(23001, 30, CX, CY, 300, CLEARING - 100);
    for (let i = 0; i < clearingBushPts.length; i++) {
        objects.push({ assetId: BUSHES[i % BUSHES.length], x: clearingBushPts[i].x, y: clearingBushPts[i].y, physics: false });
    }

    const detailTiles: DetailTile[] = [];
    const dPts = pts(23501, 80, CX, CY, 0, CLEARING - 50);
    const detailFrames = [144, 156, 157];
    for (let i = 0; i < dPts.length; i++) {
        detailTiles.push({ x: dPts[i].x, y: dPts[i].y, frame: detailFrames[i % detailFrames.length] });
    }

    return { level: 10, groundFrame: 20, objects, detailTiles };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const STATIC_MAPS: StaticMapDef[] = [
    buildLevel1(),
    buildLevel2(),
    buildLevel3(),
    buildLevel4(),
    buildLevel5(),
    buildLevel6(),
    buildLevel7(),
    buildLevel8(),
    buildLevel9(),
    buildLevel10(),
];

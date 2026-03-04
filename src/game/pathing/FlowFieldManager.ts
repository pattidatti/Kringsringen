import Phaser from 'phaser';
import type { Vector2D, PathingGrid } from './PathingConfig';

export class FlowFieldManager {
    // Scene reference not needed currently but kept for potential future use (e.g. debug graphics)
    private grid: PathingGrid;

    // 0 = Traversable, 255 = Impassable
    public costField: Uint8Array;
    // Distance from target
    public integrationField: Uint16Array;
    // Normalized directions
    public vectorField: Vector2D[];

    private targetCell: { col: number, row: number } | null = null;
    private readonly MAX_DISTANCE = 65535;

    constructor(_scene: Phaser.Scene, mapWidth: number, mapHeight: number, cellSize: number = 64) {
        this.grid = {
            width: mapWidth,
            height: mapHeight,
            cellSize: cellSize,
            cols: Math.ceil(mapWidth / cellSize),
            rows: Math.ceil(mapHeight / cellSize)
        };

        const totalCells = this.grid.cols * this.grid.rows;
        this.costField = new Uint8Array(totalCells);
        this.integrationField = new Uint16Array(totalCells);
        this.vectorField = new Array(totalCells);

        for (let i = 0; i < totalCells; i++) {
            this.vectorField[i] = { x: 0, y: 0 };
        }
    }

    /**
     * Maps static obstacles into the cost field. 
     * Call this once after the map/obstacles are generated.
     */
    public buildCostField(obstacles: Phaser.Physics.Arcade.StaticGroup) {
        // Reset cost field
        this.costField.fill(0);

        const children = obstacles.getChildren();
        for (const child of children) {
            const body = child.body as Phaser.Physics.Arcade.Body;
            if (!body) continue;

            // Mark cells that overlap with this physics body as impassable (255)
            // Or add a buffer to prevent clipping
            const minCol = Math.max(0, Math.floor((body.x) / this.grid.cellSize));
            const maxCol = Math.min(this.grid.cols - 1, Math.floor((body.right) / this.grid.cellSize));
            const minRow = Math.max(0, Math.floor((body.y) / this.grid.cellSize));
            const maxRow = Math.min(this.grid.rows - 1, Math.floor((body.bottom) / this.grid.cellSize));

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const idx = r * this.grid.cols + c;
                    this.costField[idx] = 255;
                }
            }
        }
    }

    /**
     * Updates the flow field based on the target position.
     * Throttled call (e.g., 4 times a second).
     */
    public update(targetX: number, targetY: number) {
        const col = Math.floor(targetX / this.grid.cellSize);
        const row = Math.floor(targetY / this.grid.cellSize);

        // Clamp to grid
        if (col < 0 || col >= this.grid.cols || row < 0 || row >= this.grid.rows) return;

        // Optimized: only rebuild if target moved to a new cell
        if (this.targetCell && this.targetCell.col === col && this.targetCell.row === row) {
            return;
        }

        this.targetCell = { col, row };

        this.updateIntegrationField(col, row);
        this.updateVectorField();
    }

    private updateIntegrationField(targetCol: number, targetRow: number) {
        this.integrationField.fill(this.MAX_DISTANCE);

        const targetIdx = targetRow * this.grid.cols + targetCol;
        this.integrationField[targetIdx] = 0;

        const queue: number[] = [targetIdx];
        let head = 0;

        // BFS
        while (head < queue.length) {
            const currentIdx = queue[head++];
            const cCol = currentIdx % this.grid.cols;
            const cRow = Math.floor(currentIdx / this.grid.cols);
            const currentDist = this.integrationField[currentIdx];

            // 8-way neighbors (N, S, E, W, NE, NW, SE, SW)
            const neighbors = [
                { c: cCol, r: cRow - 1 }, // N
                { c: cCol, r: cRow + 1 }, // S
                { c: cCol + 1, r: cRow }, // E
                { c: cCol - 1, r: cRow }, // W
                { c: cCol + 1, r: cRow - 1 }, // NE
                { c: cCol - 1, r: cRow - 1 }, // NW
                { c: cCol + 1, r: cRow + 1 }, // SE
                { c: cCol - 1, r: cRow + 1 }  // SW
            ];

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                if (n.c < 0 || n.c >= this.grid.cols || n.r < 0 || n.r >= this.grid.rows) continue;

                const nIdx = n.r * this.grid.cols + n.c;
                const cost = this.costField[nIdx];

                if (cost === 255) continue; // Impassable

                // Add diagonal cost weight (approx 1.4 for diags, 1 for ortho. We'll just use +10 and +14 for whole numbers)
                const moveCost = (i < 4) ? 10 : 14;
                const newDist = currentDist + cost + moveCost;

                if (newDist < this.integrationField[nIdx]) {
                    this.integrationField[nIdx] = newDist;
                    queue.push(nIdx);
                }
            }
        }
    }

    private updateVectorField() {
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                const idx = r * this.grid.cols + c;

                if (this.costField[idx] === 255) {
                    // Start of Ejection Field Logic
                    let bestEscapeDirX = 0;
                    let bestEscapeDirY = 0;
                    let minEscapeCost = this.MAX_DISTANCE;
                    let validEscapeFound = false;

                    const neighbors = [
                        { dx: 0, dy: -1 }, // N
                        { dx: 0, dy: 1 }, // S
                        { dx: 1, dy: 0 }, // E
                        { dx: -1, dy: 0 }, // W
                        { dx: 1, dy: -1 }, // NE
                        { dx: -1, dy: -1 }, // NW
                        { dx: 1, dy: 1 }, // SE
                        { dx: -1, dy: 1 }  // SW
                    ];

                    for (const offset of neighbors) {
                        const nc = c + offset.dx;
                        const nr = r + offset.dy;
                        if (nc < 0 || nc >= this.grid.cols || nr < 0 || nr >= this.grid.rows) continue;

                        const nIdx = nr * this.grid.cols + nc;
                        // Only consider neighbors that are NOT walls themselves
                        if (this.costField[nIdx] < 255) {
                            const nCost = this.integrationField[nIdx];
                            if (nCost < minEscapeCost) {
                                minEscapeCost = nCost;
                                bestEscapeDirX = offset.dx;
                                bestEscapeDirY = offset.dy;
                                validEscapeFound = true;
                            }
                        }
                    }

                    if (validEscapeFound && (bestEscapeDirX !== 0 || bestEscapeDirY !== 0)) {
                        const len = Math.sqrt(bestEscapeDirX * bestEscapeDirX + bestEscapeDirY * bestEscapeDirY);
                        this.vectorField[idx].x = bestEscapeDirX / len;
                        this.vectorField[idx].y = bestEscapeDirY / len;
                    } else if (this.targetCell) {
                        // Fallback: If completely surrounded by walls, push directly towards target.
                        const dx = this.targetCell.col - c;
                        const dy = this.targetCell.row - r;
                        if (dx !== 0 || dy !== 0) {
                            const len = Math.sqrt(dx * dx + dy * dy);
                            this.vectorField[idx].x = dx / len;
                            this.vectorField[idx].y = dy / len;
                        } else {
                            this.vectorField[idx].x = 0;
                            this.vectorField[idx].y = 0;
                        }
                    } else {
                        this.vectorField[idx].x = 0;
                        this.vectorField[idx].y = 0;
                    }
                    continue;
                }

                // If target cell, vector is 0
                if (this.targetCell && this.targetCell.col === c && this.targetCell.row === r) {
                    this.vectorField[idx].x = 0;
                    this.vectorField[idx].y = 0;
                    continue;
                }

                let minCost = this.integrationField[idx];
                let bestDirX = 0;
                let bestDirY = 0;

                const neighbors = [
                    { dx: 0, dy: -1 }, // N
                    { dx: 0, dy: 1 }, // S
                    { dx: 1, dy: 0 }, // E
                    { dx: -1, dy: 0 }, // W
                    { dx: 1, dy: -1 }, // NE
                    { dx: -1, dy: -1 }, // NW
                    { dx: 1, dy: 1 }, // SE
                    { dx: -1, dy: 1 }  // SW
                ];

                for (const offset of neighbors) {
                    const nc = c + offset.dx;
                    const nr = r + offset.dy;

                    if (nc < 0 || nc >= this.grid.cols || nr < 0 || nr >= this.grid.rows) continue;

                    const nIdx = nr * this.grid.cols + nc;
                    const nCost = this.integrationField[nIdx];

                    if (nCost < minCost) {
                        minCost = nCost;
                        bestDirX = offset.dx;
                        bestDirY = offset.dy;
                    }
                }

                // Normalize Vector
                if (bestDirX !== 0 || bestDirY !== 0) {
                    const len = Math.sqrt(bestDirX * bestDirX + bestDirY * bestDirY);
                    this.vectorField[idx].x = bestDirX / len;
                    this.vectorField[idx].y = bestDirY / len;
                } else {
                    this.vectorField[idx].x = 0;
                    this.vectorField[idx].y = 0;
                }
            }
        }
    }

    /**
     * O(1) lookup for enemies to get their ideal movement vector
     */
    public getVector(worldX: number, worldY: number): Vector2D | null {
        const c = Math.floor(worldX / this.grid.cellSize);
        const r = Math.floor(worldY / this.grid.cellSize);

        if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) return null;

        const idx = r * this.grid.cols + c;

        // Ejection vectors are now handled during `updateVectorField()`.
        // Even for costField === 255, we have a valid vector calculated (or fallback).
        return this.vectorField[idx];
    }

    /**
     * O(1) lookup for cost field
     */
    public getCost(worldX: number, worldY: number): number {
        const c = Math.floor(worldX / this.grid.cellSize);
        const r = Math.floor(worldY / this.grid.cellSize);

        if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) return 255;

        const idx = r * this.grid.cols + c;
        return this.costField[idx];
    }

    /**
     * O(1) lookup for integration field
     */
    public getIntegrationCost(worldX: number, worldY: number): number {
        const c = Math.floor(worldX / this.grid.cellSize);
        const r = Math.floor(worldY / this.grid.cellSize);

        if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) return this.MAX_DISTANCE;

        const idx = r * this.grid.cols + c;
        return this.integrationField[idx];
    }
}

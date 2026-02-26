export interface GridClient {
    x: number;
    y: number;
    width: number;
    height: number;
    id?: string | number;
    ref?: any; // Reference to the actual entity (Enemy, etc.)
}

export class SpatialHashGrid {
    private cells: Map<string, GridClient[]> = new Map();
    private cellSize: number;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    private getKeysForClient(client: GridClient): string[] {
        const keys: string[] = [];

        // Calculate the range of cells the client touches
        // We add a small buffer or just use the center? 
        // For simple point/circle collision in this game, center point might be enough, 
        // but for correctness with larger entities, we should cover all touched cells.
        // Given enemies are roughly 40-60px and cell size is 150px, usually 1-4 cells.

        const minX = Math.floor((client.x - client.width / 2) / this.cellSize);
        const maxX = Math.floor((client.x + client.width / 2) / this.cellSize);
        const minY = Math.floor((client.y - client.height / 2) / this.cellSize);
        const maxY = Math.floor((client.y + client.height / 2) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                keys.push(`${x},${y}`);
            }
        }

        return keys;
    }

    public insert(client: GridClient) {
        const keys = this.getKeysForClient(client);
        for (const key of keys) {
            if (!this.cells.has(key)) {
                this.cells.set(key, []);
            }
            this.cells.get(key)!.push(client);
        }
    }

    public findNearby(client: GridClient, range: number = 0): GridClient[] {
        const results = new Set<GridClient>();

        // Check cells within range
        // If range is 0, we check the client's own cells.
        // If range > 0, we might need to check adjacent cells too.
        // For simplicity, we'll check the cells the client+range *would* occupy.

        const searchClient = {
            x: client.x,
            y: client.y,
            width: client.width + range * 2,
            height: client.height + range * 2
        };

        const keys = this.getKeysForClient(searchClient);

        for (const key of keys) {
            const cell = this.cells.get(key);
            if (cell) {
                for (const potential of cell) {
                    if (potential !== client) {
                        results.add(potential);
                    }
                }
            }
        }

        return Array.from(results);
    }

    public clear() {
        this.cells.clear();
    }
}

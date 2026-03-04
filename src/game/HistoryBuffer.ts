/**
 * A specialized circular buffer using Float32Array to store [timestamp, x, y] triplets.
 * This is designed to eliminate Garbage Collection (GC) churn during high-frequency
 * position tracking for Lag Compensation.
 */
export class HistoryBuffer {
    private buffer: Float32Array;
    private cursor: number = 0;
    private size: number;
    private count: number = 0;

    /**
     * @param maxElements Maximum number of [ts, x, y] records to store
     */
    constructor(maxElements: number = 120) {
        this.size = maxElements;
        // 3 values per record: timestamp, x, y
        this.buffer = new Float32Array(maxElements * 3);
    }

    /**
     * Pushes a new position into the buffer.
     */
    public push(ts: number, x: number, y: number): void {
        const offset = this.cursor * 3;
        this.buffer[offset] = ts;
        this.buffer[offset + 1] = x;
        this.buffer[offset + 2] = y;

        this.cursor = (this.cursor + 1) % this.size;
        this.count = Math.min(this.count + 1, this.size);
    }

    /**
     * Interpolates the position at the given target time.
     * Retruns {x, y} or null if no data is available.
     */
    public getAt(targetTime: number): { x: number, y: number } | null {
        if (this.count === 0) return null;

        // Find the index of the first record (oldest)
        let oldestIdx = this.count < this.size ? 0 : this.cursor;
        let newestIdx = (this.cursor + this.size - 1) % this.size;

        const oldestTs = this.buffer[oldestIdx * 3];
        const newestTs = this.buffer[newestIdx * 3];

        // Boundary clamping
        if (targetTime <= oldestTs) return { x: this.buffer[oldestIdx * 3 + 1], y: this.buffer[oldestIdx * 3 + 2] };
        if (targetTime >= newestTs) return { x: this.buffer[newestIdx * 3 + 1], y: this.buffer[newestIdx * 3 + 2] };

        // Search for the two records surrounding targetTime
        // Since it's a circular buffer but timestamps are basically sorted (with one wrap-around jump),
        // we can iterate from the newest backwards for faster lookup of recent positions.
        for (let i = 0; i < this.count - 1; i++) {
            const currIdx = (this.cursor + this.size - 1 - i) % this.size;
            const prevIdx = (this.cursor + this.size - 2 - i) % this.size;

            const currTs = this.buffer[currIdx * 3];
            const prevTs = this.buffer[prevIdx * 3];

            if (targetTime <= currTs && targetTime >= prevTs) {
                const range = currTs - prevTs;
                const f = range === 0 ? 0 : (targetTime - prevTs) / range;

                return {
                    x: this.buffer[prevIdx * 3 + 1] + (this.buffer[currIdx * 3 + 1] - this.buffer[prevIdx * 3 + 1]) * f,
                    y: this.buffer[prevIdx * 3 + 2] + (this.buffer[currIdx * 3 + 2] - this.buffer[prevIdx * 3 + 2]) * f
                };
            }
        }

        return null;
    }

    public clear(): void {
        this.cursor = 0;
        this.count = 0;
        this.buffer.fill(0);
    }
}

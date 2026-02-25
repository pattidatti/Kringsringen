export interface BufferedState<T> {
    ts: number;
    state: T;
}

export class JitterBuffer<T> {
    private buffer: BufferedState<T>[] = [];
    private maxCapacity: number;

    constructor(maxCapacity = 30) {
        this.maxCapacity = maxCapacity;
    }

    public push(ts: number, state: T) {
        this.buffer.push({ ts, state });
        // Keep sorted by timestamp to handle out-of-order UDP/WebRTC packets
        this.buffer.sort((a, b) => a.ts - b.ts);

        if (this.buffer.length > this.maxCapacity) {
            this.buffer.shift();
        }
    }

    public sample(targetTime: number): { prev: BufferedState<T>, next: BufferedState<T>, factor: number } | null {
        if (this.buffer.length === 0) return null;

        // If target time is older than the oldest we have, just return the oldest
        if (targetTime <= this.buffer[0].ts) {
            return { prev: this.buffer[0], next: this.buffer[0], factor: 0 };
        }

        // If target time is newer than the newest we have, clamp to newest
        // (Extrapolation could be added here later if needed)
        if (targetTime >= this.buffer[this.buffer.length - 1].ts) {
            const latest = this.buffer[this.buffer.length - 1];
            return { prev: latest, next: latest, factor: 0 };
        }

        // Find the bounding frames
        for (let i = this.buffer.length - 1; i >= 1; i--) {
            const next = this.buffer[i];
            const prev = this.buffer[i - 1];

            if (targetTime >= prev.ts && targetTime <= next.ts) {
                const range = next.ts - prev.ts;
                const factor = range === 0 ? 0 : (targetTime - prev.ts) / range;
                return { prev, next, factor };
            }
        }

        return null;
    }

    public clear() {
        this.buffer = [];
    }
}

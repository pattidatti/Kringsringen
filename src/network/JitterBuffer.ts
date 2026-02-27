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
        // Maintain sorted order via binary search insertion (O(log N))
        // This is significantly faster than sorting every time (O(N log N)) when we have hundreds of entities.
        let low = 0;
        let high = this.buffer.length;

        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.buffer[mid].ts < ts) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        this.buffer.splice(low, 0, { ts, state });

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

        // If target time is newer than the newest we have, perform linear extrapolation
        // to prevent stuttering/hopping when packets are late.
        if (targetTime > this.buffer[this.buffer.length - 1].ts) {
            const latest = this.buffer[this.buffer.length - 1];

            // We need at least two packets to calculate velocity/drift
            if (this.buffer.length >= 2) {
                const prev = this.buffer[this.buffer.length - 2];
                const dt = latest.ts - prev.ts;

                if (dt > 0) {
                    const extrapolationTime = Math.min(targetTime - latest.ts, 200); // Cap to 200ms
                    const factor = extrapolationTime / dt;

                    // We return the latest as both prev and next, but with a factor > 1
                    // The caller must handle factors > 1 if they want true extrapolation,
                    // or we can synthesize a "future" packet here.
                    // Synthesizing a future state is cleaner for the caller.

                    return {
                        prev: latest,
                        next: {
                            ts: targetTime,
                            state: this.extrapolateState(latest.state, prev.state, factor)
                        },
                        factor: 1.0 // Force it to the synthesized next state
                    };
                }
            }
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

    /**
     * Synthesizes a future state based on current velocity.
     * T is assumed to be an array of values (PackedPlayer or PackedEnemy).
     */
    private extrapolateState(latest: T, prev: T, factor: number): T {
        if (!Array.isArray(latest) || !Array.isArray(prev)) return latest;

        const nextState = [...latest] as any;
        // Indices 1 and 2 are usually X and Y in Kringsringen's packed schemas
        if (typeof nextState[1] === 'number' && typeof prev[1] === 'number') {
            nextState[1] = latest[1] + (latest[1] - (prev as any)[1]) * factor;
        }
        if (typeof nextState[2] === 'number' && typeof prev[2] === 'number') {
            nextState[2] = latest[2] + (latest[2] - (prev as any)[2]) * factor;
        }

        return nextState as T;
    }

    public clear() {
        this.buffer = [];
    }
}

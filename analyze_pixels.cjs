const { Jimp } = require('jimp');

async function analyze() {
    try {
        const image = await Jimp.read('public/assets/sprites/ui/MediavelFree.png');
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        console.log(`Image size: ${width}x${height}`);

        const visited = new Set();
        const rects = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = image.getPixelColor(x, y);
                // Jimp 1.x uses a number. Let's extract alpha.
                // It's usually RGBA or ABGR.
                const alpha = color & 0xFF; // In some Jimp versions alpha is the last byte.

                if (alpha > 0 && !visited.has(`${x},${y}`)) {
                    // Start flood fill/bounding box scan
                    let minX = x, maxX = x, minY = y, maxY = y;
                    const queue = [[x, y]];
                    visited.add(`${x},${y}`);

                    while (queue.length > 0) {
                        const [currX, currY] = queue.shift();
                        minX = Math.min(minX, currX);
                        maxX = Math.max(maxX, currX);
                        minY = Math.min(minY, currY);
                        maxY = Math.max(maxY, currY);

                        // Check neighbors
                        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                            const nx = currX + dx;
                            const ny = currY + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(`${nx},${ny}`)) {
                                const nextAlpha = image.getPixelColor(nx, ny) & 0xFF;
                                if (nextAlpha > 0) {
                                    visited.add(`${nx},${ny}`);
                                    queue.push([nx, ny]);
                                }
                            }
                        }
                    }
                    rects.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
                }
            }
        }

        console.log('Significant Assets (w > 20):');
        rects.filter(r => r.w > 20).forEach((r, i) => {
            console.log(`Asset ${i}: x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`);
        });

    } catch (err) {
        console.error('Analysis failed:', err.message || err);
    }
}

analyze();

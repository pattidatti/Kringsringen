const { Jimp } = require('jimp');

async function analyze(filePath) {
    try {
        console.log(`Analyzing ${filePath}...`);
        const image = await Jimp.read(filePath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        console.log(`Image size: ${width}x${height}`);

        const visited = new Set();
        const rects = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                const alpha = image.bitmap.data[idx + 3];

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
                                const nIdx = (width * ny + nx) << 2;
                                const nAlpha = image.bitmap.data[nIdx + 3];
                                if (nAlpha > 0) {
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

        console.log('Detected Frames (w > 10, h > 10):');
        console.log('Detected Frames (w > 40, h > 40):');
        rects.filter(r => r.w > 40 && r.h > 40).forEach((r, i) => {
            console.log(`Frame ${i}: { x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h}, slice: 16 }, // center: ${r.x + r.w / 2}, ${r.y + r.h / 2}`);
        });

    } catch (err) {
        console.error('Analysis failed:', err.message || err);
    }
}

const args = process.argv.slice(2);
if (args.length > 0) {
    analyze(args[0]);
} else {
    console.error('Please provide an image path.');
}

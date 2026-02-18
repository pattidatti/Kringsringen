const { Jimp } = require('jimp');

async function scanRows(filePath) {
    try {
        const image = await Jimp.read(filePath);
        const blockSize = 48; // A reasonable guess for frame grid height

        console.log(`Scanning rows of ${filePath}...`);

        for (let y = 0; y < image.bitmap.height; y += blockSize) {
            // Check a central point in the first block
            const cx = 24;
            const cy = y + 24;

            if (cx >= image.bitmap.width || cy >= image.bitmap.height) continue;

            // Sample a small area around center to get average
            let r = 0, g = 0, b = 0, count = 0;
            for (let dy = -5; dy <= 5; dy++) {
                for (let dx = -5; dx <= 5; dx++) {
                    const idx = (image.bitmap.width * (cy + dy) + (cx + dx)) << 2;
                    if (image.bitmap.data[idx + 3] > 0) {
                        r += image.bitmap.data[idx];
                        g += image.bitmap.data[idx + 1];
                        b += image.bitmap.data[idx + 2];
                        count++;
                    }
                }
            }

            if (count > 0) {
                console.log(`Row starting at y=${y}: RGB(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
            } else {
                console.log(`Row starting at y=${y}: Transparent/Empty`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
scanRows(args[0]);

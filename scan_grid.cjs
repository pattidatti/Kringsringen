const { Jimp } = require('jimp');

async function scanGrid(filePath) {
    try {
        const image = await Jimp.read(filePath);
        const blockSize = 48;

        console.log(`Scanning grid of ${filePath}...`);

        for (let row = 0; row < 4; row++) { // Check first 4 rows
            const y = row * blockSize;
            let rowStr = `Row ${row}: `;

            for (let col = 0; col < 28; col++) { // Check all columns
                const x = col * blockSize;
                const cx = x + 24;
                const cy = y + 24;

                if (cx >= image.bitmap.width || cy >= image.bitmap.height) continue;

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
                    rowStr += `[${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)}] `;
                } else {
                    rowStr += `[Blank] `;
                }
            }
            console.log(rowStr);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
scanGrid(args[0]);

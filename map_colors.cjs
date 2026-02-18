const { Jimp } = require('jimp');

async function mapColors(filePath) {
    try {
        const image = await Jimp.read(filePath);
        const blockSize = 48; // Try 48x48 blocks (common frame size)

        console.log(`Mapping ${filePath} (${image.bitmap.width}x${image.bitmap.height}) in ${blockSize}px blocks...`);

        for (let y = 0; y < image.bitmap.height; y += blockSize) {
            let rowStr = `Row ${y / blockSize}: `;
            for (let x = 0; x < image.bitmap.width; x += blockSize) {
                let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;

                // Sample pixels in block
                for (let by = 0; by < blockSize; by += 4) { // stride 4 for speed
                    for (let bx = 0; bx < blockSize; bx += 4) {
                        if (x + bx >= image.bitmap.width || y + by >= image.bitmap.height) continue;

                        const idx = (image.bitmap.width * (y + by) + (x + bx)) << 2;
                        const a = image.bitmap.data[idx + 3];

                        if (a > 20) {
                            rTotal += image.bitmap.data[idx];
                            gTotal += image.bitmap.data[idx + 1];
                            bTotal += image.bitmap.data[idx + 2];
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const r = Math.round(rTotal / count);
                    const g = Math.round(gTotal / count);
                    const b = Math.round(bTotal / count);
                    rowStr += `[${r},${g},${b}] `;
                } else {
                    rowStr += `[   ] `; // Empty
                }
            }
            console.log(rowStr);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
mapColors(args[0]);

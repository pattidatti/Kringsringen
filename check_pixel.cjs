const { Jimp } = require('jimp');

async function checkPixel(filePath, x, y) {
    try {
        const image = await Jimp.read(filePath);
        const idx = (image.bitmap.width * y + x) << 2;
        const r = image.bitmap.data[idx];
        const g = image.bitmap.data[idx + 1];
        const b = image.bitmap.data[idx + 2];
        const a = image.bitmap.data[idx + 3];

        console.log(`Pixel at (${x}, ${y}): R=${r}, G=${g}, B=${b}, A=${a}`);
    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
checkPixel(args[0], parseInt(args[1]), parseInt(args[2]));

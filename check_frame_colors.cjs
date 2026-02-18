const { Jimp } = require('jimp');

async function checkFrameColors(filePath) {
    try {
        const image = await Jimp.read(filePath);

        // Check frames in a grid (e.g., 4x4)
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = col * 96;
                const y = row * 96;

                if (x >= image.bitmap.width || y >= image.bitmap.height) continue;

                // Sample border pixel (Top-Left corner)
                const bX = x + 8;
                const bY = y + 8;

                const idx = (image.bitmap.width * bY + bX) << 2;
                const r = image.bitmap.data[idx];
                const g = image.bitmap.data[idx + 1];
                const b = image.bitmap.data[idx + 2];
                const a = image.bitmap.data[idx + 3];

                console.log(`Frame (${col},${row}) at ${x},${y} - Border RGB(${r}, ${g}, ${b}) A=${a}`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
checkFrameColors(args[0]);

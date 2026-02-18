const { Jimp } = require('jimp');

async function findBrownFrame(filePath) {
    try {
        const image = await Jimp.read(filePath);

        // Define candidate frames (x, y)
        const candidates = [
            { id: 0, x: 16, y: 16 },   // Frame 0 top-left (inside border)
            { id: 1, x: 112, y: 16 },  // Frame 1 top-left
            { id: 2, x: 208, y: 16 },  // Frame 2...
            { id: 3, x: 16, y: 112 },  // Row 2?
        ];

        for (const c of candidates) {
            if (c.x >= image.bitmap.width || c.y >= image.bitmap.height) continue;

            const idx = (image.bitmap.width * c.y + c.x) << 2;
            const r = image.bitmap.data[idx];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];

            console.log(`Frame candidate at (${c.x}, ${c.y}): RGB(${r}, ${g}, ${b})`);

            // Simple brown check: R > G > B and not too dark/light
            if (r > g && g > b && r > 50 && r < 200) {
                console.log(`-> Potential Brown Frame!`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
findBrownFrame(args[0]);

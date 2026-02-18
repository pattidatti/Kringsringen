const { Jimp } = require('jimp');

async function reconstruct() {
    try {
        const source = await Jimp.read('public/assets/sprites/ui/MediavelFree.png');

        // Create a new 48x48 image (3x3 grid of 16x16 tiles)
        const master = new Jimp({ width: 48, height: 48, color: 0x00000000 });

        const tiles = [
            // Using bottom corners (y=71) for top corners too to skip chains
            { sx: 7, sy: 71, dx: 0, dy: 0 },   // TL (from BL)
            { sx: 23, sy: 71, dx: 16, dy: 0 }, // T (from B)
            { sx: 55, sy: 71, dx: 32, dy: 0 }, // TR (from BR)

            { sx: 7, sy: 48, dx: 0, dy: 16 },  // L
            { sx: 23, sy: 48, dx: 16, dy: 16 }, // C
            { sx: 55, sy: 48, dx: 32, dy: 16 }, // R

            { sx: 7, sy: 71, dx: 0, dy: 32 },  // BL
            { sx: 23, sy: 71, dx: 16, dy: 32 }, // B
            { sx: 55, sy: 71, dx: 32, dy: 32 }  // BR
        ];

        for (const t of tiles) {
            const part = source.clone().crop({ x: t.sx, y: t.sy, w: 16, h: 16 });
            master.composite(part, t.dx, t.dy);
        }

        await master.write('public/assets/sprites/ui/medieval_panel_9slice_clean.png');
        console.log('Successfully reconstructed 48x48 master 9-slice asset.');

    } catch (err) {
        console.error('Reconstruction failed:', err.message || err);
    }
}

reconstruct();

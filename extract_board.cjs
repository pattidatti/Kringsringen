const { Jimp } = require('jimp');

async function extract() {
    try {
        const image = await Jimp.read('public/assets/sprites/ui/MediavelFree.png');

        // Jimp 1.6.0 uses object for crop parameters
        image.crop({ x: 0, y: 16, w: 64, h: 64 });

        await image.write('public/assets/sprites/ui/medieval_panel_9slice.png');
        console.log('Successfully extracted 9-slice asset to public/assets/sprites/ui/medieval_panel_9slice.png');
    } catch (err) {
        console.error('Extraction failed:', err.message || err);
    }
}

extract();

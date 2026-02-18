const { Jimp } = require('jimp');

async function extract() {
    try {
        const image = await Jimp.read('public/assets/sprites/ui/MediavelFree.png');

        // Asset 0 from analysis: x=3, y=1, w=71, h=92
        // Chains go from y=1 to roughly y=22
        // Board starts roughly at y=23
        // Let's take a 64x64 slice from the center of the board
        image.crop({ x: 7, y: 23, w: 64, h: 64 });

        await image.write('public/assets/sprites/ui/medieval_panel_9slice.png');
        console.log('Successfully extracted clean 9-slice asset to public/assets/sprites/ui/medieval_panel_9slice.png');
    } catch (err) {
        console.error('Extraction failed:', err.message || err);
    }
}

extract();

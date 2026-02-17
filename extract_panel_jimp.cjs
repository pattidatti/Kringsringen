const Jimp = require('jimp');

(async () => {
    try {
        const image = await Jimp.read('public/assets/sprites/ui/MediavelFree.png');

        // Crop: 0,0, 80, 96
        image.crop(0, 0, 80, 96);

        // Get Base64
        const b64 = await image.getBase64Async(Jimp.MIME_PNG);
        console.log(b64);
    } catch (err) {
        console.error(err);
    }
})();

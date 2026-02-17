const fs = require('fs');
const path = require('path');

function getImageDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    // Simple PNG header parsing to find width/height
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.readUInt32BE(0) !== 0x89504E47) {
        console.error(`Not a PNG: ${filePath}`);
        return;
    }

    // IHDR chunk starts at byte 8 (length 4 bytes), type (4 bytes), then width (4 bytes), height (4 bytes)
    // 8 + 4 + 4 = 16
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    console.log(`${path.basename(filePath)}: ${width}x${height}`);
}

const files = [
    'public/assets/textures/TX Props.png',
    'public/assets/textures/TX Plant.png',
    'public/assets/textures/TX Struct.png'
];

files.forEach(f => getImageDimensions(path.resolve(__dirname, f)));

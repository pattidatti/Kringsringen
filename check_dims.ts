import fs from 'fs';
import path from 'path';

const files = ['skeleton.png', 'slime.png', 'werewolf.png', 'greatsword_skeleton.png'];
const baseDir = 'public/assets/sprites';

console.log('Checking dimensions...');

files.forEach(file => {
    const p = path.resolve(baseDir, file);
    try {
        if (fs.existsSync(p)) {
            const fd = fs.openSync(p, 'r');
            const buffer = Buffer.alloc(24);
            fs.readSync(fd, buffer, 0, 24, 0);
            fs.closeSync(fd);

            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            console.log(`${file}: ${width}x${height}`);
        } else {
            console.log(`${file}: Not found at ${p}`);
        }
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});

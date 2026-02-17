import fs from 'fs';
import { PNG } from 'pngjs';
import path from 'path';

const assetsDir = path.resolve('/home/irik/Kringsringen/public/assets/textures');
const debugDir = path.resolve('/home/irik/.gemini/antigravity/brain/afec911f-4ddd-42e3-8490-7abadbd552c1');

const files = ['TX Plant.png', 'TX Props.png', 'TX Struct.png'];

function scanImage(filename) {
    const filePath = path.join(assetsDir, filename);
    const data = fs.readFileSync(filePath);
    const png = PNG.sync.read(data);
    const { width, height, data: pixels } = png;

    const patches = [];
    const visited = new Set();
    const tileSize = 32;

    // We scan grid tiles (32x32)
    // If a tile has pixels, it's "occupied".
    // We then group adjacent occupied tiles correctly? 
    // Or just list all occupied tiles and I manually assemble them?
    // Listing all occupied tiles is safer.

    console.log(`\nScanning ${filename} (${width}x${height})...`);

    for (let y = 0; y < height; y += tileSize) {
        let rowStr = "";
        for (let x = 0; x < width; x += tileSize) {
            // Check if this 32x32 tile has any non-transparent pixels
            let hasPixels = false;
            // Sample center and corners to be fast? No, check all.
            for (let py = 0; py < tileSize; py++) {
                for (let px = 0; px < tileSize; px++) {
                    const idx = ((y + py) * width + (x + px)) * 4;
                    if (pixels[idx + 3] > 10) { // Alpha threshold
                        hasPixels = true;
                        break;
                    }
                }
                if (hasPixels) break;
            }

            if (hasPixels) {
                const col = x / tileSize;
                const row = y / tileSize;
                const index = row * (width / tileSize) + col;
                console.log(`  [FOUND] Tile ${col},${row} (Index ${index})`);
                rowStr += "[X]";
            } else {
                rowStr += "[ ]";
            }
        }
        // console.log(rowStr); // Visual ASCII map
    }
}

// We need to install pngjs first
// But wait, I might not have npm access to install new packages easily?
// I can try to use a Python script with Pillow (PIL) which is standard in many envs?
// Or just use the browser subagent to run this logic in the browser console!
// The browser already has the images loaded. Canvas API pixel manipulation is perfect.

console.log("Plan switch: Use Browser Canvas API for this.");

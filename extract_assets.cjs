const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const FRAMES_PATH = 'src/assets/ui/fantasy/UI_Frames.png';
const BOOK_PATH = 'src/assets/ui/fantasy/Book_UI.png';
const OUT_DIR = 'src/assets/ui/fantasy/panels';

// Calibrated coordinates from FantasyPanel.tsx
const PANELS = {
    wood: { x: 10, y: 10, w: 28, h: 31 },
    paper: { x: 58, y: 10, w: 28, h: 31 },
    stone: { x: 106, y: 10, w: 28, h: 31 },
    gold: { x: 154, y: 10, w: 28, h: 31 },
    obsidian: { x: 202, y: 10, w: 28, h: 31 },
};

const BOOK_CONFIG = { x: 7, y: 5, w: 227, h: 134 };

// Calibrated from user screenshot
// Red start approx 750.
// Stride approx 50px.
const TABS = {
    red: { x: 750, y: 80, w: 34, h: 18 },
    blue: { x: 800, y: 80, w: 34, h: 18 },
    green: { x: 850, y: 80, w: 34, h: 18 },
    yellow: { x: 900, y: 80, w: 34, h: 18 }
};

async function extract() {
    try {
        if (!fs.existsSync(OUT_DIR)) {
            fs.mkdirSync(OUT_DIR, { recursive: true });
        }

        console.log(`Reading ${FRAMES_PATH}...`);
        const framesImage = await Jimp.read(FRAMES_PATH);

        console.log(`Reading ${BOOK_PATH}...`);
        const bookImage = await Jimp.read(BOOK_PATH);

        // Extract Panels
        for (const [name, config] of Object.entries(PANELS)) {
            console.log(`Extracting ${name}...`);
            const clone = framesImage.clone();
            clone.crop({ x: config.x, y: config.y, w: config.w, h: config.h });

            const outPath = path.join(OUT_DIR, `panel_${name}.png`);
            await clone.write(outPath);
            console.log(`Saved to ${outPath}`);
        }

        // Extract Book
        console.log('Extracting book_open...');
        const bookClone = bookImage.clone();
        bookClone.crop(BOOK_CONFIG);
        await bookClone.write(path.join(OUT_DIR, 'book_open.png'));

        // Extract Tabs
        for (const [color, config] of Object.entries(TABS)) {
            console.log(`Extracting tab_${color}...`);
            const tabClone = bookImage.clone();
            tabClone.crop(config);
            await tabClone.write(path.join(OUT_DIR, `tab_${color}.png`));
            console.log(`Saved to src/assets/ui/fantasy/panels/tab_${color}.png`);
        }

        console.log('Extraction complete.');

    } catch (err) {
        console.error('Extraction failed:', err);
    }
}

extract();

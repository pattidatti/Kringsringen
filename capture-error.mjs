import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('BROWSER CONSOLE ERROR:', msg.text());
            }
        });

        page.on('pageerror', error => {
            console.log('PAGE ERROR:', error.message);
        });

        await page.goto('http://localhost:5173'); // Vite default port

        // Wait for game to load
        await new Promise(r => setTimeout(r, 2000));

        // Try to click something or press a key to open the book?
        // Wait, how do you open the book in Kringsringen? It might be 'B' or 'Esc' or by a button.
        // I will just evaluate a script to trigger the book open if it's react state, or simulate an event.
        // Often 'Tab' or 'Escape' or clicking a merchant.
        console.log('Page loaded. Dispatching "b" keydown or looking for book open UI...');
        await page.keyboard.press('KeyB');
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 1000));

        // Let's also check if there's a fatal overlay from Vite
        const viteError = await page.evaluate(() => {
            const overlay = document.querySelector('vite-error-overlay');
            return overlay ? overlay.shadowRoot.innerHTML : null;
        });

        if (viteError) {
            console.log("VITE ERROR OVERLAY:", viteError.substring(0, 1000));
        }

        await browser.close();
    } catch (e) {
        console.log("Puppeteer script error:", e);
    }
})();

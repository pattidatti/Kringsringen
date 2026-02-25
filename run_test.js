const { chromium } = require('playwright-core');

(async () => {
    try {
        const browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox'] 
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
        
        await page.goto('http://localhost:5176');
        
        // Wait 3 seconds
        await new Promise(r => setTimeout(r, 4000));
        await browser.close();
    } catch (e) {
        console.error('Script Error:', e.message);
    }
})();

// Session lost while playing (owner, 14 Oct 2026): when the server refuses the key (the character was loaded in
// another tab/device), the game stops and shows „Sesja wygasła” with a button that loads the character again.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-sesja.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  for (const tryb of ['heartbeat', 'save']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pl-PL' });
    let wazny = true;
    const errors = [];
    await ctx.route('**/*.supabase.co/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = null, status = 200;
      if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 12 } };
      if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(path)) body = [];
      if (path.endsWith('/game_settings')) body = {};
      if (path.endsWith('/heartbeat')) body = tryb === 'heartbeat' ? wazny : true;
      if (path.endsWith('/save_game')) {
        if (tryb === 'save' && !wazny) { status = 400; body = { message: 'Sesja wygasła, zaloguj się ponownie' }; } else body = true;
      }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/?lang=pl&ostrosc=1#postac=Jam&kod=ANGELIKA');
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
    await page.waitForTimeout(4000);
    assert.equal(await page.locator('#sesja-wygasla').count(), 0, 'no window while the key is valid');
    wazny = false;
    // A save point (entering a shop, finishing a mission…) – here the scene's own save.
    if (tryb === 'save') await page.evaluate(() => window.__game.scene.getScene('game').save());
    await page.waitForSelector('#sesja-wygasla', { timeout: 15000 });
    const spi = await page.evaluate(() => !window.__game.loop.running);
    await page.screenshot({ path: `work/sesja-${tryb}.png` });
    await page.locator('#sesja-wygasla button').first().click();
    await page.waitForTimeout(500);
    console.log(tryb, { spi, hash: await page.evaluate(() => location.hash) });
    assert(spi, 'the game is stopped');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('OK');
} finally {
  await browser.close();
}

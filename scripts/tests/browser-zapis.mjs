// Load point = the last save (owner, 19 Oct 2026) + the character code hidden in the Kufer until asked.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-zapis.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'pl-PL' });
  const zapisy = [];
  let wylogowany = false;
  const errors = [];
  await ctx.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    // Saved 300 m from home, a hotel elsewhere: the login must start at the save, not at the hotel or home.
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, zapis: { m: 'lublin', x: 3500, y: 3100, s: 1.92 }, at: { m: 'lublin', x: 2600, y: 2600, s: 1.92 } }, exp: 0, dead: false, died_at: null, age: 12 } };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(path)) body = [];
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/heartbeat')) body = true;
    if (path.endsWith('/save_game')) { zapisy.push(JSON.parse(req.postData()).p_save); body = true; }
    if (path.endsWith('/logout')) { wylogowany = true; body = true; }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?lang=pl&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(3000);
  const start = await page.evaluate(() => { const p = window.__game.scene.getScene('game').player; return { x: p.x, y: p.y }; });
  console.log('start', start);
  assert(Math.hypot(start.x - 3500, start.y - 3100) < 40, 'starts at the last save');

  // The Kufer: the code is hidden until the eye is tapped.
  await page.keyboard.press('c');
  await page.waitForSelector('.k-kod-code', { timeout: 10000 });
  const ukryty = await page.locator('.k-kod-code').textContent();
  await page.screenshot({ path: 'work/zapis-kufer-ukryty.png' });
  await page.locator('.k-kod-oko').click();
  const widac = await page.locator('.k-kod-code').textContent();
  await page.screenshot({ path: 'work/zapis-kufer-widac.png' });
  console.log({ ukryty, widac });
  assert(!/ANG/.test(ukryty), 'hidden at first');
  assert(/ANG/.test(widac.replace(/\W/g, '')), 'shown on request');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // Walk a bit and save: the save carries where the hero stands.
  const g = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); s.player.setPosition(s.player.x + 30, s.player.y); s.save(); return { x: s.player.x, y: s.player.y }; });
  await page.waitForTimeout(1500);
  const z1 = zapisy.at(-1)?.zapis;
  console.log('save', z1, g);
  assert(z1 && z1.m === 'lublin' && Math.abs(z1.x - Math.round(g.x)) <= 1, 'save has the spot');
  assert.equal(zapisy.at(-1).at.x, 2600, 'hotel room kept');

  // „Wyjdź” saves too, then logs out.
  const n = zapisy.length;
  await page.evaluate(() => window.__game.scene.getScene('game').leave());
  await page.waitForTimeout(2000);
  console.log({ zapisy: zapisy.length - n, wylogowany });
  assert(zapisy.length > n && wylogowany, 'leaving saves and logs out');
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

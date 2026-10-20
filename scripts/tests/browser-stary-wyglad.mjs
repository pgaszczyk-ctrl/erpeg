// Old characters keep their 25-hero look after 1.032 (modular heroes on every server): the hero walks as the saved 25-hero (`hd-lista?`),
// the Kufer shows ◀ ▶ plus „✨ Nowy wygląd”, which switches to a modular look and saves it.
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-stary-wyglad.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'pl-PL' });
  let zapis = null;
  await context.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Zbyszek', idik: 'ABCDEFGH', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 50, look: { postac: 4 }, story: { st: 'start', walked: 0 } }, exp: 10, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) { zapis = JSON.parse(req.postData() || '{}'); body = true; }
    if (path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Zbyszek&kod=ABCDEFGH');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(2000);
  const tex = () => page.evaluate(() => window.__game.scene.getScene('game').player.texture.key);
  const t0 = await tex();
  console.log('stara postać', t0);
  assert.match(t0, /^hd-listae/, 'old hero keeps the 25-hero look');
  await page.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'work/stary-wyglad-kufer.png' });
  const btn = page.locator('.k-nowy-wyglad');
  assert(await btn.count(), '„Nowy wygląd” in the Kufer');
  await btn.click();
  await page.waitForTimeout(800);
  assert(await page.locator('.m-skinrow').count(), 'modular creator shown after the switch');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const t1 = await tex();
  console.log('po zmianie', t1);
  assert.match(t1, /^hd-modul/, 'hero walks as the modular figure');
  const look = await page.evaluate(() => window.__session.look);
  assert(look.modul, 'look.modul in the session (saved with the next save)');
  console.log('OK stary wygląd');
} finally {
  await browser.close();
}

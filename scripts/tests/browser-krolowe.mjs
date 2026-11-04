// Queens in the newspaper's puzzle of the day (owner, 13 Oct 2026): the board shows the areas, taps cycle
// empty → × → ♛, a wrong queen turns red, the right ones solve it once (+EXP, RPC lamiglowka_rozwiazana).
// Uses the test-only ?lamiglowka=krolowe. Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 &
//   node scripts/tests/browser-krolowe.mjs   (TELEFON=1 for the phone)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const tel = !!process.env.TELEFON;
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext(tel ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'pl-PL' } : { viewport: { width: 1100, height: 820 }, locale: 'pl-PL' });
  const errors = [], rpcs = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports') || path.endsWith('/kurier_wiesci')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    if (path.endsWith('/lamiglowka_rozwiazana')) { rpcs.push(JSON.parse(route.request().postData())); body = true; }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&lamiglowka=krolowe#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    s.newspaper({ id: 'test', name: 'Franek', x: s.player.x, y: s.player.y });
  });
  await page.waitForSelector('#gazeta');
  await page.locator('#gazeta button', { hasText: 'Łamigłówka' }).first().click();
  await page.waitForSelector('#gazeta .gz-krolowe');
  const n = await page.evaluate(() => Math.round(Math.sqrt(document.querySelectorAll('#gazeta .gz-krolowe .gz-cell').length)));
  assert.equal(n, 7, 'Średni = 7×7');
  const cells = page.locator('#gazeta .gz-krolowe .gz-cell');
  // A wrong pair first: two queens side by side → red.
  await cells.nth(0).click(); await cells.nth(0).click();
  await cells.nth(1).click(); await cells.nth(1).click();
  assert.equal(await page.locator('#gazeta .gz-krolowe .gz-cell.zle').count(), 2);
  await page.screenshot({ path: `work/krolowe-zle${tel ? '-tel' : ''}.png` });
  await page.locator('#gazeta button', { hasText: 'Od nowa' }).click();
  // The solution, from the same generator the page uses.
  const sol = await page.evaluate(() => window.__krolowe);
  assert(sol, 'solution hook');
  for (let r = 0; r < n; r++) { const i = r * n + sol[r]; await cells.nth(i).click(); await cells.nth(i).click(); }
  await page.waitForSelector('#gazeta .gz-puz-msg.ok');
  const msg = await page.locator('#gazeta .gz-puz-msg').textContent();
  await page.screenshot({ path: `work/krolowe${tel ? '-tel' : ''}.png` });
  console.log(JSON.stringify({ n, msg, rpcs }));
  assert.match(msg, /Brawo/);
  assert.equal(rpcs.length, 1);
  assert.equal(rpcs[0].p_rodzaj, 'krolowe');
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

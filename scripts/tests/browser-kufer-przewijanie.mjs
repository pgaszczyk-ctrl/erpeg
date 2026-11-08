// The trunk on an upright phone (page turned, obrot.ts) scrolls by sliding a finger; the button the finger started on
// is not pressed; a plain tap still presses (owner, 8 Nov 2026, iPhone 11 Pro report).
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-kufer-przewijanie.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = { name: 'Jam', idik: 'ANGELIKA', start_place: 'x', start_x: 4477, start_y: 12236, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 500, dead: false, age: 6, konto: true };
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'pl-PL' });
  await ctx.route('**/*.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    let body = null;
    if (name === 'login') body = { token: 't', player: gracz };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  assert(await page.evaluate(() => document.documentElement.classList.contains('exp-obrot')), 'page turned');
  await page.evaluate(() => window.__game.scene.getScene('ui').openCharacter('stan'));
  await page.waitForSelector('#character .k-body');
  const info = await page.evaluate(() => { const b = document.querySelector('#character .k-body'); return { sh: b.scrollHeight, ch: b.clientHeight }; });
  console.log('k-body', info);
  assert(info.sh > info.ch + 20, 'the page is longer than the window');
  // Count clicks on any button inside.
  await page.evaluate(() => { window.__kliki = 0; document.querySelector('#character .k-body').addEventListener('click', (e) => { if (e.target.closest('button')) window.__kliki++; }); });
  const cdp = await ctx.newCDPSession(page);
  // Start on a button inside the page; the page is turned −90°: its „down” is the screen's right... slide along the page's Y.
  const btn = await page.evaluate(() => { const b = [...document.querySelectorAll('#character .k-body button')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0; }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const pageY = (sx) => sx; // turned page: page Y grows with the screen's X (naEkranie: y = clientX)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const top0 = await page.evaluate(() => document.querySelector('#character .k-body').scrollTop);
  await touch('touchStart', btn.x, btn.y);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', btn.x - i * 15, btn.y); await page.waitForTimeout(16); }
  await touch('touchEnd');
  await page.waitForTimeout(600);
  const top1 = await page.evaluate(() => document.querySelector('#character .k-body').scrollTop);
  const kliki = await page.evaluate(() => window.__kliki);
  console.log('scrollTop', top0, '→', top1, 'clicks', kliki, pageY(0));
  assert(top1 > top0 + 50, 'scrolled by sliding');
  assert.equal(kliki, 0, 'no button pressed by the slide');
  // A plain tap still presses a button.
  const b2 = await page.evaluate(() => { const b = [...document.querySelectorAll('#character .k-body button')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.left > 0 && r.top > 0 && r.right < innerHeight && r.bottom < innerWidth; }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.waitForTimeout(600);
  await touch('touchStart', b2.x, b2.y);
  await touch('touchEnd');
  await page.waitForTimeout(300);
  console.log('clicks after tap', await page.evaluate(() => window.__kliki));
  assert(await page.evaluate(() => window.__kliki) >= 1, 'a tap presses');
  await page.screenshot({ path: 'work/kufer-przewijanie.png' });
  console.log('OK');
} finally {
  await browser.close();
}

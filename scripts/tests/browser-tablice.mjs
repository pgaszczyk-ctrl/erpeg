// City boards (tablice z mapką miasta, scripts/tablice): a board stands by a station in Lublin, E / a click opens its
// map (ways out with two names, you are here, stations), a tap on a station → card → „🧭 Prowadź” sets the arrow.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-tablice.mjs   (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const index = require('../../public/map/lublin.json');
const [bx, by] = index.tablice.miejsca[Number(process.env.TABLICA ?? 7)];

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: bx, start_y: by + 14, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove()));
  const near = await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); return { n: s.city.tablice.length, hero: [s.player.x, s.player.y], at: !!s.tablicaAt(x, y - 6) }; }, [bx, by]);
  console.log('board', bx, by, JSON.stringify(near));
  assert(near.n > 10 && near.at, 'the board is there and can be hit');
  await page.screenshot({ path: `work/tablica-swiat${mobile ? '-tel' : ''}.png` });
  // E (AKCJA) right by it.
  await page.keyboard.press('e');
  await page.waitForSelector('#tablica', { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `work/tablica-mapa${mobile ? '-tel' : ''}.png` });
  const cele = await page.evaluate(() => window.__tablica);
  console.log('cele', cele.length, cele.filter((c) => c.rodzaj === 'wylot').map((c) => c.nazwa).join(' | '));
  assert(cele.filter((c) => c.rodzaj === 'wylot').length >= 5);
  assert(cele.some((c) => c.rodzaj === 'ty'));
  const ty = cele.find((c) => c.rodzaj === 'ty');
  const st = cele.filter((c) => c.rodzaj === 'kolej' && Math.hypot(c.x - ty.x, c.y - ty.y) > 60 && cele.every((d) => d === c || d.rodzaj === 'wylot' || Math.hypot(d.x - c.x, d.y - c.y) > 30))[0];
  assert(st, 'a station');
  const r = await page.evaluate(() => { const b = document.querySelector('#tablica canvas').getBoundingClientRect(); return { x: b.left, y: b.top }; });
  await page.mouse.click(r.x + st.x, r.y + st.y);
  await page.waitForSelector('#tablica .tb-karta');
  await page.screenshot({ path: `work/tablica-karta${mobile ? '-tel' : ''}.png` });
  console.log('karta', await page.evaluate(() => document.querySelector('#tablica .tb-karta').innerText.replace(/\n/g, ' / ')));
  await page.click('#tablica .tb-karta button');
  await page.waitForSelector('#tablica', { state: 'detached' });
  await page.waitForTimeout(800);
  const droga = await page.evaluate(() => window.__game.scene.getScene('game').drogaDo());
  console.log('droga', JSON.stringify(droga));
  assert(droga && droga.nazwa === st.nazwa);
  assert(await page.evaluate(() => window.__game.loop.running), 'the world runs again');
  await page.screenshot({ path: `work/tablica-strzalka${mobile ? '-tel' : ''}.png` });
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

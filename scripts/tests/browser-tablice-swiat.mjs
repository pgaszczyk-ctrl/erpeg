// City boards in towns of the world (src/tablice/swiatowe.ts): on a world map (the Kraków sample) the town is found
// from the world map's places, its board plan is worked out from the low-zoom tiles (outline, main roads, water, ways
// out with two names), boards go up where the ground is loaded, and the board window draws it.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-tablice-swiat.mjs  (TELEFON=1, PROBKA=krakow, LL=50.06,19.94)
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const probka = process.env.PROBKA ?? 'krakow';
const [lat, lon] = (process.env.LL ?? '50.0550,19.9350').split(',').map(Number);
const sample = await readFile(`data/world-sample/${probka}.pmtiles`);
const mobile = process.env.TELEFON === '1';

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  const save = { coins: 10, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, at: { m: `w:${lat.toFixed(4)},${lon.toFixed(4)}`, x: 0, y: 0, s: 1.92 } };
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save, exp: 200, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await context.route((url) => url.pathname.endsWith('/sample.pmtiles'), async (route) => {
    const range = route.request().headers().range;
    const m = range && /bytes=(\d+)-(\d+)/.exec(range);
    if (!m) return route.fulfill({ status: 200, body: sample, contentType: 'application/octet-stream' });
    const a = Number(m[1]), b = Math.min(Number(m[2]), sample.length - 1);
    return route.fulfill({ status: 206, body: sample.subarray(a, b + 1), headers: { 'Content-Range': `bytes ${a}-${b}/${sample.length}`, 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' } });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=czysto&ostrosc=1&world=http://127.0.0.1:${process.env.PORT ?? 4173}/sample.pmtiles#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove()));
  const t0 = Date.now();
  await page.waitForFunction(() => [...window.__planyTablic.values()].some((p) => p.gotowy), null, { timeout: 120000 });
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const [key, p] = [...window.__planyTablic.entries()].find(([, p]) => p.gotowy);
    const pl = p.gotowy.plan;
    return { key, miasto: s.miastoTablic, spoty: p.gotowy.spoty.length, granica: pl.granica[0].length, drogi: pl.drogi.length, rzeki: pl.rzeki.length, jeziora: pl.jeziora.length, morza: pl.morza.length, wyloty: pl.wyloty.map((w) => `${w[5] || '–'}/${w[3] || '–'}`), rozmiar: JSON.stringify(pl).length };
  });
  console.log('plan', ((Date.now() - t0) / 1000).toFixed(1) + ' s', JSON.stringify(info));
  assert(info.miasto && info.wyloty.length >= 3, 'a town with ways out');
  // The sample's ground covers only ~2 km, so a planned spot is added next to the hero: a board must go up there
  // on free ground and open with E.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const p = [...window.__planyTablic.values()].find((p) => p.gotowy);
    p.gotowy.spoty.push({ x: s.player.x + 40, y: s.player.y, dx: 0, dy: 0 });
  });
  await page.waitForFunction(() => window.__game.scene.getScene('game').city.tablice.length > 0, null, { timeout: 20000 });
  const t = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); const t = s.city.tablice[0]; s.player.setPosition(t.x, t.y + 14); return { x: t.x, y: t.y, miasto: t.miasto }; });
  console.log('tablica stoi', JSON.stringify(t));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `work/tablica-swiat-stoi${mobile ? '-tel' : ''}.png` });
  await page.keyboard.press('e');
  await page.waitForSelector('#tablica', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('#tablica .tb-gora button').click());
  await page.waitForSelector('#tablica', { state: 'detached' });
  // The window with the plan (opened as if from a board right here).
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const p = [...window.__planyTablic.values()].find((p) => p.gotowy);
    window.__game.scene.getScene('ui').openTablica({ x: s.player.x, y: s.player.y, plan: p.gotowy.plan, miasto: s.miastoTablic.pl });
  });
  await page.waitForSelector('#tablica');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `work/tablica-swiat-${probka}${mobile ? '-tel' : ''}.png` });
  const cele = await page.evaluate(() => window.__tablica);
  assert(cele.filter((c) => c.rodzaj === 'wylot').length >= 3);
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

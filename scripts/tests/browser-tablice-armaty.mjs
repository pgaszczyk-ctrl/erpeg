// A city board by every cannon (the pinball „metro”): on the test server's Lublin map the generated artillery puts
// cannons on car parks; walking near one must put a board up 14–30 m from it, showing Lublin's plan.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-tablice-armaty.mjs  (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const mobile = process.env.TELEFON === '1';
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 15383, start_y: 10414, map_scale: 1.92, save: { coins: 1000, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    if (path.endsWith('/ma_stan')) body = { enabled: true, discovered: [] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove()));
  // The generated stations (their generated points) – wait for the network.
  await page.waitForFunction(() => (window.__game.scene.getScene('game').artillery?.naPlanie() ?? []).length > 0, null, { timeout: 60000 });
  const stacje = await page.evaluate(() => window.__game.scene.getScene('game').artillery.naPlanie());
  console.log('stacje', stacje.map((s) => `${s.nazwa}${s.pewne ? '' : '?'}`).join(', '));
  let sprawdzone = 0;
  for (const st of stacje) {
    // Walk there (teleport), wait for the ground and the cannon's spot.
    await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 40); s.cameras.main.centerOn(x, y); }, [st.x, st.y]);
    const ok = await page.waitForFunction((id) => {
      const s = window.__game.scene.getScene('game');
      const a = s.artillery.naPlanie().find((q) => q.id === id);
      return a && a.pewne && s.city.tablice.some((t) => Math.hypot(t.x - a.x, t.y - a.y) < 32 * 1.92) ? { x: a.x, y: a.y } : false;
    }, st.id, { timeout: 40000 }).then((h) => h.jsonValue()).catch(() => null);
    const info = await page.evaluate((id) => { const s = window.__game.scene.getScene('game'); const a = s.artillery.naPlanie().find((q) => q.id === id); return a; }, st.id);
    console.log(st.nazwa, info?.pewne ? (ok ? 'tablica stoi' : 'BRAK tablicy') : 'armata bez miejsca na tej mapie');
    if (info?.pewne) { assert(ok, `a board by ${st.nazwa}`); sprawdzone++; if (sprawdzone === 1) { await page.waitForTimeout(1200); await page.screenshot({ path: `work/tablica-armata${mobile ? '-tel' : ''}.png` }); } }
    if (sprawdzone >= 2) break;
  }
  assert(sprawdzone >= 1, 'at least one cannon checked');
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

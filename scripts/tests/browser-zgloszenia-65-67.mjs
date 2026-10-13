// Bug reports 65–67 (13 Oct 2026): 65 – railway bridges can be walked (Lublin, the bridge over the Bystrzyca by
// the main station) and are drawn as iron trusses; 66 – a wild dragon's lair shows red-coloured smoke from afar
// and says so on entering (the test server's fixed dragon by Decathlon); 67 – on a world map the town is asked
// of a passer-by (the Lublin sample: the answer must be „Lublin”, read from the map's place names).
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-zgloszenia-65-67.mjs
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const sample = await readFile('data/world-sample/lublin.pmtiles');

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
async function login(save, query = '') {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Arceus', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save, exp: 50000, dead: false, died_at: null, age: 9, immortal: true } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  // The world map sample, with Range requests.
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
  await page.goto(`http://127.0.0.1:4173/?lang=pl&pogoda=czysto${query}#postac=Arceus&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); setInterval(() => { s.noHurtUntil = s.time.now + 60000; }, 200); });
  return { context, page, errors };
}
const go = (page, x, y) => page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.cameras.main.centerOn(x, y); }, [x, y]);
const ready = (page) => page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady(), null, { timeout: 60000 });

try {
  // ---- 65: the railway bridge by Lublin Główny (rail × Bystrzyca at about (16090, 13438) map px).
  {
    const { context, page, errors } = await login({ coins: 10, story: { st: 'koniec', walked: 99 } });
    await go(page, 16090, 13470);
    await ready(page);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      const c = s.city;
      const box = { x0: 15990, y0: 13340, x1: 16190, y1: 13540 };
      const rail = c.query(box).lines.find((l) => l.kind === 'rail');
      if (!rail) return { rail: false };
      // Walk the rail's points near the river: any blocked spot?
      const pts = rail.pts;
      let checked = 0, blocked = 0, water = 0;
      for (let i = 0; i + 3 < pts.length; i += 2) {
        const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3], L = Math.hypot(bx - ax, by - ay);
        for (let t = 0; t <= L; t += 2) {
          const x = ax + ((bx - ax) * t) / L, y = ay + ((by - ay) * t) / L;
          if (Math.hypot(x - 16090, y - 13438) > 40) continue;
          checked++;
          if (c.nearWater(x, y, 2)) water++;
          if (c.isBlocked(x, y)) blocked++;
        }
      }
      return { rail: true, checked, blocked, water };
    });
    console.log('65 bridge', JSON.stringify(r));
    assert(r.rail && r.checked > 10 && r.water > 0, 'a rail line over water');
    assert.equal(r.blocked, 0, 'no blocked spot along the rail over the river');
    await page.screenshot({ path: 'work/zgl65-most.png' });
    assert.deepEqual(errors, []);
    await context.close();
  }

  // ---- 66: the test server's dragon by Decathlon (place gear:3703:14957) gets a smoky lair.
  {
    const { context, page, errors } = await login({ coins: 10, story: { st: 'koniec', walked: 99 } });
    const toasts = [];
    await page.evaluate(() => { const s = window.__game.scene.getScene('game'); const t = s.toast.bind(s); window.__toasts = []; s.toast = (m, ms) => { window.__toasts.push(m); return t(m, ms); }; });
    const door = await page.evaluate(() => window.__game.scene.getScene('game').city.places.find((q) => q.id === 'gear:3703:14957')?.door);
    assert(door, 'Decathlon');
    await go(page, door.x - 200, door.y);
    await ready(page);
    await page.waitForFunction(() => [...window.__game.scene.getScene('game').smokiNaMapie.kratki.values()].some((m) => m?.dym), null, { timeout: 20000 });
    const lair = await page.evaluate(() => { const m = [...window.__game.scene.getScene('game').smokiNaMapie.kratki.values()].find((q) => q?.dym); return { x: m.x, y: m.y, g: m.g, n: m.dym.length }; });
    console.log('66 lair', JSON.stringify(lair));
    assert(lair.n > 20);
    await go(page, lair.x + 45 * 1.92 + 30, lair.y + 20);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'work/zgl66-legowisko.png' });
    await go(page, lair.x + 20, lair.y + 10);
    await page.waitForFunction(() => window.__toasts.some((t) => t.includes('Legowisko')), null, { timeout: 8000 });
    console.log('66 toast', (await page.evaluate(() => window.__toasts.filter((t) => t.includes('Legowisko')))).join(' | '));
    assert.deepEqual(errors, []);
    await context.close();
  }

  // ---- 67: a world map in the Lublin sample; asking a passer-by names the town from the map's place names.
  {
    const { context, page, errors } = await login({ coins: 10, story: { st: 'koniec', walked: 99 }, at: { m: 'w:51.2450,22.5650', x: 0, y: 0, s: 1.92 } }, '&world=http://127.0.0.1:4173/sample.pmtiles');
    const before = await page.evaluate(() => window.__game.scene.getScene('game').localTown);
    assert.equal(before, null);
    await page.waitForFunction(() => window.__game.scene.getScene('game').folk?.people?.length || window.__game.scene.getScene('game').folk?.list?.length, null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      // Any passer-by will do; the answer comes before the greeting.
      s.learnTown(() => {});
    });
    await page.waitForFunction(() => window.__game.scene.getScene('game').localTown, null, { timeout: 15000 });
    const t = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { name: s.localTown.name, here: s.townHere(), plate: s.placeInfo() }; });
    console.log('67 town', JSON.stringify(t));
    assert.equal(t.name, 'Lublin');
    assert.equal(t.here, 'Lublin');
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('OK');
} finally {
  await browser.close();
}

// Built game, real map data, isolated character. Warsaw can be supplied as a local PMTiles extract;
// CI uses the existing Krakow sample. No generated map archive is added to Git.
import assert from 'node:assert/strict';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
import { preview } from 'vite';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const sample = await readFile(process.env.WORLD_SAMPLE ?? 'data/world-sample/krakow.pmtiles');
const [lat, lon] = (process.env.WORLD_TARGET ?? '50.055,19.935').split(',').map(Number);
const cityName = process.env.WORLD_CITY ?? 'Krakow';
const zSource = stripTypeScriptTypes(await readFile('src/map/ziemia09.ts', 'utf8'), { mode: 'transform', disableExperimentalWarning: true })
  .replace(/^import .*$/mg, '').replaceAll('export ', '');
const { RODZAJE, GEN_DOTS, MARGINES } = vm.runInNewContext(`(()=>{${zSource};return {RODZAJE,GEN_DOTS,MARGINES};})()`, { hex: () => 0 });
const server = await preview({ preview: { host: '127.0.0.1', port: 4196, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
await mkdir('work/road-surfaces', { recursive: true });
const base = 'http://127.0.0.1:4196';
const raw = JSON.parse(await readFile('public/map/lublin.json', 'utf8'));
const at = (o, p) => ({ x: (p.lon - o.lon) * 111412.84 * Math.cos((o.lat0 ?? o.lat) * Math.PI / 180) * 1.92,
  y: (o.lat - p.lat) * (111132.954 - 559.822 * Math.cos(2 * (o.lat0 ?? o.lat) * Math.PI / 180)) * 1.92 });
async function run(mobile, native, legacy = false) {
  const tag = `${native ? 'Lublin' : cityName}-${mobile ? 'phone' : 'desktop'}${legacy ? '-legacy' : ''}`;
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1200, height: 800 },
    isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', reducedMotion: 'reduce' });
  const home = at(raw.origin, { lat: 51.23471, lon: 22.56526 });
  const save = { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 },
    tu: native ? { m: 'lublin', ...home, s: 1.92 } : { m: `w:${lat.toFixed(4)},${lon.toFixed(4)}`, x: 0, y: 0, s: 1.92 } };
  await context.route('**/*.supabase.co/**', route => {
    const fn = new URL(route.request().url()).pathname.split('/').pop();
    let body = null;
    if (fn === 'login') body = { token: 'isolated', player: { name: 'Arceus', idik: 'ANGELIKA', start_place: 'Lublin', start_x: home.x, start_y: home.y,
      map_scale: 1.92, save, exp: 0, age: 9, dead: false, immortal: true } };
    if (fn === 'game_settings') body = {};
    if (['game_content', 'school_quizzes', 'game_ports'].includes(fn)) body = [];
    if (fn === 'server_now') body = new Date().toISOString();
    if (fn === 'ma_stan') body = { enabled: false };
    if (fn === 'weather') body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (['save_game', 'heartbeat', 'logout', 'log_error'].includes(fn)) body = true;
    return route.fulfill({ json: body });
  });
  await context.route(url => url.pathname.endsWith('/sample.pmtiles'), route => {
    const range = /bytes=(\d+)-(\d+)/.exec(route.request().headers().range ?? '');
    if (!range) return route.fulfill({ body: sample });
    const a = +range[1], b = Math.min(+range[2], sample.length - 1);
    return route.fulfill({ status: 206, body: sample.subarray(a, b + 1), headers: { 'Content-Range': `bytes ${a}-${b}/${sample.length}`, 'Accept-Ranges': 'bytes' } });
  });
  // A missing elevation tile gives flat terrain; the test concerns materials, not hills.
  await context.route('**/elevation-tiles-prod/**', r => r.fulfill({ status: 404, body: '' }));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?lang=pl&pogoda=czysto&ostrosc=1&wyglad=${legacy ? '0' : '09'}&world=${base}/sample.pmtiles#postac=Arceus&kod=ANGELIKA`);
  await page.waitForFunction(() => {
    const s = window.__game?.scene.getScene('game'), cover = document.getElementById('loading-map');
    return s?.sys.isActive() && s.firstViewReady() && (!cover || cover.hidden);
  }, null, { timeout: 180000 });
  const check = await page.evaluate(({ RODZAJE, GEN_DOTS, MARGINES }) => {
    document.querySelectorAll('.m-screen, #samouczek-krok').forEach(e => e.remove());
    const s = window.__game.scene.getScene('game'), hero = s.player;
    const candidates = [];
    for (const l of s.city.query({ x0: hero.x - 700, y0: hero.y - 700, x1: hero.x + 700, y1: hero.y + 700 }).lines) {
      if (!['major', 'medium', 'minor'].includes(l.kind)) continue;
      for (let i = 0; i + 3 < l.pts.length; i += 2) {
        const x = (l.pts[i] + l.pts[i + 2]) / 2, y = (l.pts[i + 1] + l.pts[i + 3]) / 2;
        const d = Math.hypot(x - hero.x, y - hero.y);
        if (d < 650 && s.city.isFree(x, y, 3, 3)) candidates.push({ x, y, d, kind: l.kind });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    if (!candidates[0]) throw Error('No real street near the saved character');
    const p = candidates[0]; hero.setPosition(p.x, p.y);
    s.cameras.main.stopFollow(); s.cameras.main.centerOn(p.x, p.y);
    for (let x = p.x - 500; x < p.x + 500; x += 4) for (let y = p.y - 400; y < p.y + 400; y += 4) s.explored.mark(x, y);
    const order = s.mapView.groundOrder(Math.floor(p.x / 512) * 512, Math.floor(p.y / 512) * 512);
    const x = Math.floor(p.x * GEN_DOTS - order.X0 + MARGINES), y = Math.floor(p.y * GEN_DOTS - order.Y0 + MARGINES);
    return { map: s.city.id, street: p.kind, material: RODZAJE[order.ids[y * order.S + x]],
      pavingAreas: s.city.areas.filter(a => a.kind === 'paved').length,
      cobblePixels: [...order.ids].filter(id => RODZAJE[id] === 'bruk').length };
  }, { RODZAJE, GEN_DOTS, MARGINES });
  assert.equal(check.material, 'bruk', `${tag}: real street must use cobbles`);
  if (!native) assert.equal(check.pavingAreas, 0, 'world street must not depend on Lublin-only paving polygons');
  assert(check.cobblePixels > 1000);
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady(), null, { timeout: 120000 });
  await page.evaluate(() => new Promise(resolve => window.__game.events.once('postrender', resolve)));
  await page.screenshot({ path: `work/road-surfaces/${tag}.png` });
  assert.deepEqual(errors, []);
  console.log('PASS', tag, JSON.stringify(check));
  await context.close();
}
try {
  for (const mobile of [false, true]) { await run(mobile, false); await run(mobile, true); }
  await run(false, false, true);
} finally { await browser.close(); await server.httpServer.close(); }

// Full built game, real Krakow/Lublin terrain, isolated account/RPCs. No real player writes.
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const server = await preview({ preview: { host: '127.0.0.1', port: 4194, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const sample = await readFile('data/world-sample/krakow.pmtiles');
const base = 'http://127.0.0.1:4194';
const target = { lat: 50.055, lon: 19.935 };
await mkdir('work/world-identity', { recursive: true });
const pixelAt = (origin, at) => ({
  x: (at.lon - origin.lon) * 111412.84 * Math.cos((origin.lat0 ?? origin.lat) * Math.PI / 180) * 1.92,
  y: (origin.lat - at.lat) * (111132.954 - 559.822 * Math.cos(2 * (origin.lat0 ?? origin.lat) * Math.PI / 180)) * 1.92,
});
async function run(mobile, native = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1200, height: 800 },
    isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', locale: 'pl-PL' });
  const errors = [];
  const old = { lat: 50.06, lon: 19.94 };
  const lublin = JSON.parse(await readFile('public/map/lublin.json', 'utf8'));
  const lubOrigin = lublin.origin;
  const home = pixelAt(lubOrigin, { lat: 51.23471, lon: 22.56526 });
  const save = { coins: 100000, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 },
    tu: native ? { m: 'lublin', ...home, s: 1.92 } : { m: 'w:50.0600,19.9400', ...pixelAt(old, target), s: 1.92 } };
  await context.route('**/*.supabase.co/**', route => {
    const fn = new URL(route.request().url()).pathname.split('/').pop();
    let body = null;
    if (fn === 'login') body = { token: 'isolated', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: home.x, start_y: home.y,
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
    const match = /bytes=(\d+)-(\d+)/.exec(route.request().headers().range ?? '');
    if (!match) return route.fulfill({ body: sample, contentType: 'application/octet-stream' });
    const a = +match[1], b = Math.min(+match[2], sample.length - 1);
    return route.fulfill({ status: 206, body: sample.subarray(a, b + 1), headers: { 'Content-Range': `bytes ${a}-${b}/${sample.length}`, 'Accept-Ranges': 'bytes' } });
  });
  // Elevations are irrelevant to identity; use a flat real-size terrarium tile offline.
  await context.route('**/elevation-tiles-prod/**', r => r.fulfill({ body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'), contentType: 'image/png' }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?lang=pl&pogoda=czysto&ostrosc=1&world=${base}/sample.pmtiles#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => {
    const s = window.__game?.scene.getScene('game');
    const cover = document.getElementById('loading-map');
    return s?.sys.isActive() && s.firstViewReady() && (!cover || cover.hidden);
  }, null, { timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach(e => e.remove()));
  const info = () => page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const g = s.city.query({ x0: s.player.x - 4000, y0: s.player.y - 4000, x1: s.player.x + 4000, y1: s.player.y + 4000 });
    return { id: s.city.id, roads: g.lines.length, houses: g.buildings.length,
      geometry: JSON.stringify({ roads: g.lines.map(l => [l.id, l.kind, l.pts]), houses: g.buildings.map(b => [b.id, b.seed, b.rings]) }),
      landmarks: s.zabytki.stoja.map(z => z.z.id), at: s.city.toLatLon(s.player.x, s.player.y) };
  });
  const before = await info();
  assert.equal(before.id, native ? 'lublin' : 'w:50.1000,19.9000');
  assert(before.houses > 0 && before.roads > 0);
  if (native) assert(before.landmarks.includes('targi_lublin'), 'authored Targi exists');
  // The old destination mapId deliberately differs: a route must use geographic ownership instead.
  await page.evaluate(({ native, target }) => {
    const s = window.__game.scene.getScene('game');
    s.explored.mark(s.player.x + 300, s.player.y + 300);
    window.__identityMark = s.city.toLatLon(s.player.x + 300, s.player.y + 300);
    window.__identityCity = s.city;
    window.__identityRenderer = s.mapView;
    const ll = s.city.toLatLon(s.player.x, s.player.y);
    const name = 'Powrót w to samo miejsce';
    s.city.places.push({ kind: 'station', id: 'identity-return', name, building: null, door: { x: s.player.x, y: s.player.y } });
    s.travel({ to: { ...ll, name, key: 'isolated', mapId: 'w:50.0550,19.9350', mapName: 'Kraków' }, km: 0, price: 0, via: null, train: true });
  }, { native, target });
  await page.waitForFunction(() => {
    const s = window.__game.scene.getScene('game');
    return s.mapView !== window.__identityRenderer && s.firstViewReady() && !s.travelling;
  }, null, { timeout: 180000 });
  const after = await info();
  assert.equal(after.id, before.id);
  const state = await page.evaluate(() => {
    const s = window.__game.scene.getScene('game'), mark = window.__identityMark;
    const p = s.city.fromLatLon(mark.lat, mark.lon);
    return { sameMap: s.city === window.__identityCity, seen: s.explored.hasCell(Math.floor(p.x / 4), Math.floor(p.y / 4)),
      saved: window.__session.tu.m, coins: window.__session.coins };
  });
  assert(state.sameMap && state.seen, 'same-city ride preserves geography and explored fog');
  assert.equal(state.saved, after.id); assert.equal(state.coins, 100000);
  if (native) assert(after.landmarks.includes('targi_lublin'), 'authored Targi survives restart');
  if (!native) {
    // Real station choice may move arrival into the adjacent sector. The durable
    // position must belong to that final point before the first walking update.
    await page.evaluate(target => {
      const s = window.__game.scene.getScene('game');
      window.__identityRenderer = s.mapView;
      s.travel({ to: { ...target, name: 'Kraków', key: 'actual-station', mapId: 'w:50.0550,19.9350', mapName: 'Kraków' }, km: 0, price: 0, via: null, train: true });
    }, target);
    await page.waitForFunction(() => {
      const s = window.__game.scene.getScene('game');
      return s.mapView !== window.__identityRenderer && !s.travelling && s.firstViewReady();
    }, null, { timeout: 180000 });
    assert(await page.evaluate(() => {
      const s = window.__game.scene.getScene('game'), ll = s.city.toLatLon(s.player.x, s.player.y);
      const expected = `w:${(Math.floor(ll.lat * 10 + .5) / 10).toFixed(4)},${(Math.floor(ll.lon * 10 + .5) / 10).toFixed(4)}`;
      return s.city.id === expected && window.__session.tu.m === expected;
    }), 'final station arrival is saved in its canonical map');
    // Walking changes sector at a fixed geographic line, then returns to the same old map/fog.
    for (const ll of [{ lat: 50.049, lon: 19.935 }, target]) {
      await page.evaluate(async ll => {
        const s = window.__game.scene.getScene('game'), p = s.city.fromLatLon(ll.lat, ll.lon);
        await s.city.ensure(p.x, p.y, 800);
        s.player.setPosition(p.x, p.y); s.crossAt = 0;
      }, ll);
      const expected = ll.lat < 50.05 ? 'w:50.0000,19.9000' : 'w:50.1000,19.9000';
      await page.waitForFunction(id => { const s = window.__game.scene.getScene('game'); return s.city.id === id && !s.travelling && s.firstViewReady(); }, expected, { timeout: 180000 });
    }
    assert(await page.evaluate(() => {
      const s = window.__game.scene.getScene('game'), p = s.city.fromLatLon(window.__identityMark.lat, window.__identityMark.lon);
      return s.explored.hasCell(Math.floor(p.x / 4), Math.floor(p.y / 4));
    }), 'walking back restores exploration');
  }
  await page.screenshot({ path: `work/world-identity/${native ? 'lublin' : 'world'}-${mobile ? 'phone' : 'desktop'}.png` });
  assert.deepEqual(errors, []);
  console.log('PASS', native ? 'Lublin landmarks' : 'world arrival, same-city ride, sector walk, fog', mobile ? 'phone' : 'desktop');
  await context.close();
}
try {
  for (const mobile of [false, true]) {
    await run(mobile);
    await run(mobile, true);
  }
} finally { await browser.close(); await server.httpServer.close(); }

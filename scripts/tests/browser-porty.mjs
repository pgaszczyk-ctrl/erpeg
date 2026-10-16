// Ferry ports (content/porty.ts) on the test build: a character on a world map (the Szczecin sample) by the
// real ferry terminal „Nabrzeże Starówka”, a captain appears, his dialog lists the port's lines, the ride
// screen shows the sea, and the hero lands at the other port. RPCs are mocked; nothing is saved.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-porty.mjs
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const A = { lat: 53.42769, lon: 14.57279 }; // Nabrzeże Starówka (ferry_terminal in the sample)
const B = { lat: 53.4302, lon: 14.5652 }; // a quay under Wały Chrobrego
const mapId = `w:${A.lat.toFixed(4)},${A.lon.toFixed(4)}`;
const porty = { v: 'test', porty: [[0, 'Szczecin', A.lat, A.lon, 'Nabrzeże Starówka'], [1, 'Wały Chrobrego', B.lat, B.lon, null]], linie: [[0, 1, 12, 'Szczecin – Wały (test)']] };
await mkdir('work', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 860 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', deviceScaleFactor: mobile ? 2 : 1 });
    const errors = [];
    const asked = [];
    const save = { at: { m: mapId, x: 30, y: 30, s: 1.92 }, coins: 5000, hp: 10, look: null };
    await context.route('**/*.supabase.co/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = null;
      if (path.endsWith('/login')) body = { token: 't', player: { name: 'Arceus', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 0, start_y: 0, map_scale: 1.92, save, exp: 50000, dead: false, died_at: null, age: 9, immortal: true } };
      if (path.endsWith('/game_settings')) body = {};
      if (path.endsWith('/game_content')) body = [];
      if (path.endsWith('/school_quizzes')) body = [];
      if (path.endsWith('/server_now')) body = new Date().toISOString();
      if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
      if (path.endsWith('/settings')) body = { external: { google: false } };
      if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
      if (path.endsWith('/game_ports')) body = [];
      if (path.endsWith('/port_answers')) body = [{ id: 7, at: new Date().toISOString(), port: 'Szczecin', lat: A.lat, lon: A.lon, text: 'Kopenhaga', status: 'dodana', odpowiedz: null }];
      if (path.endsWith('/port_request')) { asked.push(JSON.parse(route.request().postData())); body = true; }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await context.route('**/sample.pmtiles', async (route) => {
      const data = await readFile('data/world-sample/szczecin.pmtiles');
      const range = route.request().headers()['range'];
      if (!range) return route.fulfill({ status: 200, body: data });
      const [, a, b] = /bytes=(\d+)-(\d*)/.exec(range);
      const start = Number(a), end = b ? Math.min(Number(b), data.length - 1) : data.length - 1;
      await route.fulfill({ status: 206, headers: { 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes' }, body: data.subarray(start, end + 1) });
    });
    await context.route('**/terrain/**', (route) => route.fulfill({ status: 404, body: '' }));
    await context.route('**/porty.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(porty) }));
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    await page.goto('http://127.0.0.1:4173/?lang=pl&world=http://127.0.0.1:4173/sample.pmtiles&terrain=http://127.0.0.1:4173/terrain#postac=Arceus&kod=ANGELIKA');
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').city?.id?.startsWith('w:'), null, { timeout: 120000 });
    // The captain appears once the map around the port is loaded.
    await page.waitForFunction(() => window.__game.scene.getScene('game').porty.size > 0, null, { timeout: 60000 });
    const port = await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      const p = s.city.places.find((q) => q.kind === 'port');
      s.player.setPosition(p.door.x, p.door.y + 12);
      s.cameras.main.centerOn(p.door.x, p.door.y);
      const ll = s.city.toLatLon(p.door.x, p.door.y);
      return { id: p.id, name: p.name, blocked: s.city.isBlocked(p.door.x, p.door.y), ...ll };
    });
    console.log(name, 'port', JSON.stringify(port));
    assert.equal(port.blocked, false, 'The captain must stand on walkable ground');
    assert(Math.abs(port.lat - A.lat) < 0.003 && Math.abs(port.lon - A.lon) < 0.005, 'The captain stands at the terminal');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `work/porty-${name}-kapitan.png` });
    // Talk to him: the port's line, price and time.
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      const orig = s.dialog.bind(s);
      s.dialog = (req) => { window.__ostatni = req; return orig(req); };
      s.openPort(s.city.places.find((q) => q.kind === 'port'));
    });
    await page.waitForFunction(() => window.__game.scene.getScene('ui').dialogBox, null, { timeout: 10000 });
    const text = await page.evaluate(() => {
      const ui = window.__game.scene.getScene('ui');
      return ui.dialogBox.list?.filter((o) => o.text).map((o) => o.text).join(' | ') ?? '';
    });
    console.log(name, 'dialog', text.replace(/\n/g, ' ').slice(0, 300));
    assert(/Wały Chrobrego/.test(text), 'The line is listed');
    assert(/Pytałeś o: Kopenhaga/.test(text), 'The answer to an earlier request');
    await page.screenshot({ path: `work/porty-${name}-dialog.png` });
    const chooseLabel = async (prefix) => {
      const i = await page.evaluate((prefix) => window.__ostatni.buttons.findIndex((b) => b.startsWith(prefix)), prefix);
      assert(i >= 0, `button ${prefix}`);
      await choose(i);
    };
    const choose = async (index) => {
      await page.waitForTimeout(300);
      const at = await page.evaluate((index) => { const r = window.__game.scene.getScene('ui').dialogButtons.find((b) => b.index === index).rect; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, index);
      await page.mouse.click(at.x, at.y);
    };
    // „🧭 Inne miejsce…”: the wish goes to the server, the captain promises to ask around.
    await chooseLabel('🧭');
    await page.locator('#prompt input, .prompt input, input[type=text]').first().fill('Atlantyda');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /Zajrzyj jutro/.test(window.__game.scene.getScene('ui').dialogBox?.list?.map((o) => o.text ?? '').join(' ') ?? ''), null, { timeout: 10000 });
    await page.screenshot({ path: `work/porty-${name}-inne.png` });
    assert.equal(asked.length, 1);
    assert.equal(asked[0].p_text, 'Atlantyda');
    console.log(name, 'request', JSON.stringify(asked[0]));
    await choose(0);
    // A real country: the captain works out the way with changes through the network's main ports.
    await page.evaluate(() => { const s = window.__game.scene.getScene('game'); s.openPort(s.city.places.find((q) => q.kind === 'port')); });
    await page.waitForFunction(() => window.__game.scene.getScene('ui').dialogBox, null, { timeout: 10000 });
    await chooseLabel('🧭');
    await page.locator('#prompt input, .prompt input, input[type=text]').first().fill('Kenia');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /Dar es Salaam/.test(window.__game.scene.getScene('ui').dialogBox?.list?.map((o) => o.text ?? '').join(' ') ?? ''), null, { timeout: 10000 });
    console.log(name, 'kenia', (await page.evaluate(() => window.__game.scene.getScene('ui').dialogBox.list.map((o) => o.text ?? '').join(' | '))).replace(/\n/g, ' ').slice(0, 400));
    await page.screenshot({ path: `work/porty-${name}-kenia.png` });
    assert.equal(asked.length, 1, 'no request to us for a country the network reaches');
    await chooseLabel('Dobrze');
    await page.evaluate(() => { const s = window.__game.scene.getScene('game'); s.openPort(s.city.places.find((q) => q.kind === 'port')); });
    await page.waitForFunction(() => window.__game.scene.getScene('ui').dialogBox, null, { timeout: 10000 });
    await chooseLabel('⛴ Wały');
    await page.waitForFunction(() => window.__game.scene.getScene('ui').dialogBox, null, { timeout: 10000 });
    await page.screenshot({ path: `work/porty-${name}-potwierdz.png` });
    const coins = await page.evaluate(() => window.__session.coins);
    await choose(0);
    // An immortal test character sails at once: the scene starts again on the other port's map.
    await page.waitForFunction((id) => { const s = window.__game.scene.getScene('game'); return window.__game.scene.isActive('game') && s.city.id !== id && !s.travelling; }, mapId, { timeout: 90000 });
    const after = await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      return { map: s.city.id, coins: window.__session.coins, at: window.__session.at, ...s.city.toLatLon(s.player.x, s.player.y), blocked: s.city.isBlocked(s.player.x, s.player.y) };
    });
    console.log(name, 'arrived', JSON.stringify(after));
    assert.equal(after.map, `w:${B.lat.toFixed(4)},${B.lon.toFixed(4)}`);
    assert(after.coins < coins, 'The ticket was paid');
    assert.equal(after.blocked, false);
    assert(Math.abs(after.lat - B.lat) < 0.004 && Math.abs(after.lon - B.lon) < 0.006, 'Landed at the other port');
    await page.waitForFunction(() => window.__game.scene.getScene('game').porty.size > 0, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `work/porty-${name}-przyplynal.png` });
    // The ride screen of a mortal character: the sea, a ship between two lighthouses, days left.
    await page.evaluate(() => { const now = Date.now(); void window.__showJourney({ from: 'Rotterdam', to: 'Nowy Jork', km: 6100, start: now - 2.2 * 86400000, end: now + 5.1 * 86400000, statek: true }); });
    await page.waitForTimeout(1200);
    const left = await page.locator('#journey .j-left').textContent();
    console.log(name, 'ride', left);
    assert(/dni|dzień/.test(left));
    await page.screenshot({ path: `work/porty-${name}-rejs.png` });
    await page.evaluate(() => document.getElementById('journey').remove());
    console.log(name, 'errors', errors);
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}

// Production release regression: real read-only catalogue, mocked player/login/save.
// The chain's completion is driven through completeStage to test unlocks/rewards,
// rather than retesting combat and every individual task mechanic.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const expected = ['sz_jarmark', 'sz_para', 'sz_chochliki', 'sz_czarcia_lapa', 'sz_slodki_trop', 'sz_herszt', 'sz_zegarmistrz', 'sz_serce'];
let catalogue = JSON.parse(readFileSync('docs/historie/serce-zebatka.json'));
if (process.env.LIVE_CONTENT === '1') {
  const source = readFileSync('src/api.ts', 'utf8');
  const url = /const URL = '([^']+)'/.exec(source)[1];
  const key = /const KEY = '([^']+)'/.exec(source)[1];
  const response = await fetch(url + 'game_content', { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_all: true }), signal: AbortSignal.timeout(20000) });
  assert(response.ok, `Read-only game_content: HTTP ${response.status}`);
  catalogue = await response.json();
  for (const id of [...expected, 'sz_cukiernia']) assert(catalogue.some(m => m.id === id), `Live catalogue missing ${id}`);
  console.log('PASS: live server returns all eight missions and Bruno; no player RPCs called.');
}
// A new test-only mission must stay hidden even if the server returns it.
catalogue.push({ ...catalogue[0], id: 'unreleased-regression-fixture', tylkoTest: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  mkdirSync('.cache', { recursive: true });
  for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    if (process.env.LIVE_MAPS === '1') await page.route('**/map/lublin/**', async route => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ response: await route.fetch({ url: 'https://exp-lore.app' + path }) });
    });
    let start;
    let saved = { coins: 10, story: { st: 'koniec', walked: 0 } };
    await page.route('**/rest/v1/rpc/**', async route => {
      const fn = new URL(route.request().url()).pathname.split('/').pop();
      const args = route.request().postDataJSON();
      let json = [];
      if (fn === 'game_content') { assert.equal(args.p_all, true); json = catalogue; }
      if (fn === 'game_settings') json = {};
      if (fn === 'settings') json = { external: { google: false } };
      if (fn === 'server_now') json = new Date().toISOString();
      if (fn === 'login') json = { token: 'offline-serce-test', player: { name: 'Arceus', idik: 'TESTCODE', start_place: 'Dworcowa 11', start_x: start.x, start_y: start.y, map_scale: 1.92, exp: 0, dead: false, died_at: null, age: 7, immortal: true, save: saved } };
      if (fn === 'save_game') { saved = args.p_save; json = true; }
      if (['logout', 'heartbeat'].includes(fn)) json = true;
      await route.fulfill({ json });
    });
    let loginAttempt = 0;
    async function login() {
      // A different query forces a new document; adding only #wczytaj during play
      // is a same-document navigation and does not reopen the start menu.
      await page.goto(`http://127.0.0.1:4173/?lang=pl&ostrosc=1&test-login=${loginAttempt++}#wczytaj`);
      await page.waitForSelector('#menu', { timeout: 60000 });
      start = await page.evaluate(() => {
        const city = window.__game.registry.get('city');
        const b = city.findBuilding('Dworcowa 11');
        if (!b) throw new Error('Targi address missing');
        return city.entranceOf(b);
      });
      const inputs = page.locator('#menu input');
      await inputs.nth(0).fill('Arceus'); await inputs.nth(1).fill('TESTCODE');
      await page.getByRole('button', { name: 'Wczytaj', exact: true }).click();
      await page.waitForFunction(() => window.__game?.scene.getScene('game').missions?.some(r => r.m.id === 'sz_jarmark'), null, { timeout: 90000 });
      await page.waitForFunction(() => document.getElementById('loading-map')?.hidden, null, { timeout: 90000 });
      await page.evaluate(() => window.__game.events.on('dialog', req => { window.__dialog = req; }));
    }
    async function click(label) {
      await page.waitForFunction(label => window.__dialog?.buttons.includes(label), label);
      await page.waitForTimeout(400);
      const at = await page.evaluate(label => {
        const ui = window.__game.scene.getScene('ui');
        const index = window.__dialog.buttons.indexOf(label);
        const r = ui.dialogButtons.find(b => b.index === index).rect;
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, label);
      assert(at.x >= 0 && at.y >= 0 && at.x < width && at.y < height, `Button outside ${name}: ${label}`);
      await page.mouse.click(at.x, at.y);
    }
    await login();
    const state = await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      return { ids: s.missions.map(r => r.m.id), extras: window.__session.extra.map(m => m.id), targi: s.city.toLatLon(s.missions.find(r => r.m.id === 'sz_jarmark').door.x, s.missions.find(r => r.m.id === 'sz_jarmark').door.y) };
    });
    for (const id of [...expected, 'sz_cukiernia']) assert(state.ids.includes(id), `Resolved mission missing ${id}`);
    assert(!state.extras.includes('unreleased-regression-fixture'));
    assert(!state.extras.some(id => id.startsWith('sg_')), 'Other test chain leaked');
    assert(Math.abs(state.targi.lat - 51.23471) < 0.002 && Math.abs(state.targi.lon - 22.56526) < 0.002);
    await page.waitForFunction(() => [...window.__game.scene.getScene('game').etapy.givers.values()].some(g => g.imie === 'Hela Trybik'));
    await page.screenshot({ path: `.cache/serce-${name}-targi.png` });
    for (const [i, id] of expected.entries()) {
      console.log(`${name}: accepting ${id}`);
      await page.evaluate(id => {
        const s = window.__game.scene.getScene('game');
        s.openMissionDialog(s.missions.find(r => r.m.id === id));
      }, id);
      if (!i) {
        assert.match(await page.evaluate(() => window.__dialog.title), /Hela Trybik/);
        await page.screenshot({ path: `.cache/serce-${name}-hela.png` });
      }
      await click('Przyjmuję');
      // The final destination is Hela, where this fixture already stands: the
      // game may reach the goal in the frame immediately after acceptance.
      await page.waitForFunction(id => ['active', 'goal'].includes(window.__session.missions[id]), id);
      if (!i) {
        await page.waitForTimeout(500);
        assert.equal(saved.missions.sz_jarmark, 'active');
        await login();
        assert.equal(await page.evaluate(() => window.__session.missions.sz_jarmark), 'active');
        assert(await page.evaluate(() => window.__game.scene.getScene('game').questLog().some(q => q.id === 'sz_jarmark')));
      }
      // Exercise chain state transitions and item requirements, with actual reward dialogs.
      await page.evaluate(id => {
        const s = window.__game.scene.getScene('game');
        const rm = s.missions.find(r => r.m.id === id);
        if (!rm.target) throw new Error(`Missing target ${id}`);
        if (window.__session.missions[id] === 'active') s.completeStage(rm);
      }, id);
      await click('Dziękuję!');
      await page.waitForFunction(id => window.__session.missions[id] === 'done', id);
    }
    await page.waitForTimeout(500);
    assert.equal(saved.diamenty, 1);
    assert.equal(saved.stats.missions, 8);
    for (const id of expected) assert.equal(saved.missions[id], 'done');
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: Hela at Targi, all eight chain missions accepted/completed, item prerequisite, first mission restored after login, eight completions and one diamond saved; unrelated test story hidden.`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}

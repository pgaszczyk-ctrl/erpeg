// Elzet 10 (owner's robot quest, 30 Oct 2026): the whole chain on the real Lublin map with mocked server calls.
// Inspect → imps at the Lidl circle the cog → cog → robot stands up → fight 1 (stops at 10 %) → Nałęczowska 14 →
// fight 2 (spells, then sword) → golden ball → lake → 10 jokes (apples after 5, boots after 10) → saved.
// TELEFON=1 runs a phone held sideways. Needs `npm run build` first.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const tel = process.env.TELEFON === '1';
const [W, H] = tel ? [844, 390] : [1280, 800];
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
mkdirSync('.cache', { recursive: true });
const shot = (n) => page.screenshot({ path: `.cache/elzet-${tel ? 'tel' : 'pc'}-${n}.png` });
let page;
try {
  page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: tel, isMobile: tel });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  let saved = { coins: 10, story: { st: 'koniec', walked: 0 } };
  let start = { x: 0, y: 0 };
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const fn = new URL(route.request().url()).pathname.split('/').pop();
    const args = route.request().postDataJSON();
    let json = [];
    if (fn === 'game_settings') json = {};
    if (fn === 'settings') json = { external: { google: false } };
    if (fn === 'server_now') json = new Date().toISOString();
    if (fn === 'login') json = { token: 'offline-elzet', player: { name: 'Jam', idik: 'TESTCODE', start_place: 'Kryształowa 20', start_x: start.x, start_y: start.y, map_scale: 1.92, exp: 0, dead: false, died_at: null, age: 12, immortal: true, save: saved } };
    if (fn === 'save_game') { saved = args.p_save; json = true; }
    if (['logout', 'heartbeat'].includes(fn)) json = true;
    await route.fulfill({ json });
  });
  await page.goto('http://127.0.0.1:4175/?lang=pl&ostrosc=1&ludzik3d=0#wczytaj');
  await page.waitForSelector('#menu', { timeout: 60000 });
  start = await page.evaluate(() => window.__game.registry.get('city').fromLatLon(51.22418, 22.49825));
  const inputs = page.locator('#menu input');
  await inputs.nth(0).fill('Jam');
  await inputs.nth(1).fill('TESTCODE');
  await page.getByRole('button', { name: 'Wczytaj', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('loading-map')?.hidden, null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__game.events.on('dialog', (req) => { window.__dialog = req; });
    const s = window.__game.scene.getScene('game');
    s.noHurtUntil = 0;
  });
  const g = (fn, arg) => page.evaluate(fn, arg);
  /** Answers the open dialog with button `i` (as the UI would). */
  const choose = async (i = 0) => {
    await page.waitForFunction(() => window.__dialog && window.__game.scene.isPaused('game'), null, { timeout: 15000 });
    await page.waitForTimeout(400);
    const at = await g((i) => {
      const ui = window.__game.scene.getScene('ui');
      const r = ui.dialogButtons.find((b) => b.index === i).rect;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, i);
    await g(() => { window.__dialog = null; });
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(300);
  };
  const resume = () => page.waitForTimeout(100);
  const teleport = async (lat, lon) => {
    await g(async ([lat, lon]) => {
      const s = window.__game.scene.getScene('game');
      const p = s.city.fromLatLon(lat, lon);
      await s.city.ensure(p.x, p.y, 400);
      const f = s.city.freeNear(p.x, p.y);
      s.player.setPosition(f.x, f.y);
      s.player.vel.set(0, 0);
    }, [lat, lon]);
    await page.waitForTimeout(1500);
  };
  const elzet = () => g(() => {
    const e = window.__game.scene.getScene('game').elzet;
    return { krok: window.__session.flagi.elzet ?? 0, npc: e.npc ? { x: e.npc.x, y: e.npc.y, vis: e.npc.visible } : null, walka: !!e.walka, imps: e.chochliki.filter((c) => c.active).length, kolko: !!e.kolko, zarty: window.__session.flagi.elzet_zarty ?? 0 };
  });

  // 1. The sitting robot on Kryształowa.
  await page.waitForFunction(() => !!window.__game.scene.getScene('game').elzet?.npc, null, { timeout: 30000 });
  let st = await elzet();
  assert.equal(st.krok, 0);
  const ll = await g(({ x, y }) => window.__game.scene.getScene('game').city.toLatLon(x, y), st.npc);
  assert(Math.abs(ll.lat - 51.224225) < 0.0004 && Math.abs(ll.lon - 22.49834) < 0.0006, `robot not at the owner's spot: ${JSON.stringify(ll)}`);
  await g(({ x, y }) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 6); }, st.npc);
  await page.waitForTimeout(400);
  await shot('1-siedzi');
  await g(({ x, y }) => window.__game.scene.getScene('game').talkableAt(x, y, 14)(), st.npc);
  assert.match(await g(() => window.__dialog.text), /ELZET 10/);
  await choose(0);
  await resume();
  assert.equal((await elzet()).krok, 1);
  assert(await g(() => window.__game.scene.getScene('game').questLog().some((q) => q.id === 'elzet')), 'quest not in the log');

  // 2. Imps at the Lidl circle the cog; it can only be taken once they are gone.
  await teleport(51.2250, 22.5025);
  await page.waitForFunction(() => window.__game.scene.getScene('game').elzet.chochliki.length === 5, null, { timeout: 30000 });
  const a = await g(() => window.__game.scene.getScene('game').elzet.chochliki.map((c) => ({ x: c.x, y: c.y })));
  await page.waitForTimeout(1500);
  const b = await g(() => window.__game.scene.getScene('game').elzet.chochliki.map((c) => ({ x: c.x, y: c.y })));
  assert(a.some((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) > 1), 'imps do not run round the cog');
  await shot('2-chochliki');
  await g(() => { const s = window.__game.scene.getScene('game'); const k = s.elzet.kolko; s.player.setPosition(k.x, k.y - 4); });
  await page.waitForTimeout(300);
  assert.equal((await elzet()).krok, 1, 'cog taken while guarded');
  await g(() => { const s = window.__game.scene.getScene('game'); for (const c of [...s.elzet.chochliki]) if (c.hit({ x: c.x, y: c.y }, s.time.now, 999)) s.onEnemyKilled(c); });
  await page.waitForTimeout(500);
  await page.waitForFunction(() => window.__session.flagi.elzet === 2, null, { timeout: 5000 });

  // 3. Back to the robot: the cog goes in, it stands up and turns, then fight 1.
  await teleport(51.22418, 22.49825);
  await page.waitForFunction(() => !!window.__game.scene.getScene('game').elzet?.npc, null, { timeout: 30000 });
  st = await elzet();
  await g(({ x, y }) => window.__game.scene.getScene('game').talkableAt(x, y, 14)(), st.npc);
  await choose(0);
  await resume();
  await page.waitForFunction(() => window.__dialog?.title?.includes('Elzet'), null, { timeout: 10000 });
  await choose(0);
  await resume();
  assert((await elzet()).walka, 'fight 1 did not start');
  const f1 = await g(() => {
    const s = window.__game.scene.getScene('game');
    const w = s.elzet.walka;
    return { hp: w.s.hp, speed: w.predkosc / s.player.speed, prog: w.s.prog.hp, heroHp: s.player.hp };
  });
  assert(Math.abs(f1.speed - 1.5) < 0.01, 'fight 1 speed');
  // Let it fight for a while: it must hurt the hero (the immortal test hero gets refilled, so watch the hurt calls).
  await g(() => { const s = window.__game.scene.getScene('game'); s.__ciosy = 0; const h = s.player.hurt.bind(s.player); s.player.hurt = (...a) => { const r = h(...a); if (r) s.__ciosy++; return r; }; });
  await page.waitForTimeout(5000);
  await shot('3-walka1');
  assert(await g(() => window.__game.scene.getScene('game').__ciosy > 0), 'the robot never hit the hero');
  // The hero's blows: never below 10 %.
  await g(() => { const s = window.__game.scene.getScene('game'); const w = s.elzet.walka.s; w.hit({ x: w.x, y: w.y }, s.time.now, 99999); });
  const left = await g(() => window.__game.scene.getScene('game').elzet.walka.s.hp);
  assert.equal(left, f1.prog, 'the robot died instead of stopping at 10 %');
  await page.waitForFunction(() => window.__dialog?.text?.includes('Nałęczowskiej'), null, { timeout: 5000 });
  await choose(0);
  await resume();
  await page.waitForTimeout(3200);
  st = await elzet();
  assert.equal(st.krok, 4);
  assert(!st.walka, 'robot did not walk away');

  // 4. Nałęczowska 14: fight 2 – spells first.
  await teleport(51.24888, 22.51760);
  await page.waitForFunction(() => window.__dialog?.text?.includes('magiczny'), null, { timeout: 30000 });
  await shot('4-naleczowska');
  await choose(0);
  await resume();
  const f2 = await g(() => { const s = window.__game.scene.getScene('game'); const w = s.elzet.walka; return { speed: w.predkosc / s.player.speed, akcje: w.akcje.join(',') }; });
  assert(Math.abs(f2.speed - 0.7) < 0.01, 'fight 2 speed');
  assert.equal(f2.akcje, 'czar,czar,czar,przerwa,czar,czar,czar,przerwa,miecz,miecz,miecz,przerwa');
  await page.waitForTimeout(3000);
  assert(await g(() => window.__game.scene.getScene('game').elzet.walka.i > 0), 'no spell cast');
  await shot('5-walka2');
  await g(() => { const s = window.__game.scene.getScene('game'); const w = s.elzet.walka.s; w.hit({ x: w.x, y: w.y }, s.time.now, 99999); });
  await page.waitForFunction(() => window.__dialog?.text?.includes('przeznaczenie'), null, { timeout: 5000 });
  await choose(0);
  await resume();
  await page.waitForTimeout(3000);
  assert.equal((await elzet()).krok, 5);
  assert(await g(() => JSON.stringify(window.__gear).includes('zlota_pilka')), 'no golden ball');

  // 5. The lake: he walks round the house; 10 jokes.
  await teleport(51.19590, 22.53540);
  await page.waitForFunction(() => !!window.__game.scene.getScene('game').elzet?.npc, null, { timeout: 30000 });
  const p0 = (await elzet()).npc;
  await page.waitForTimeout(2500);
  const p1 = (await elzet()).npc;
  assert(Math.hypot(p0.x - p1.x, p0.y - p1.y) > 2, 'robot not walking round the house');
  await shot('6-jezioro');
  for (let i = 0; i < 10; i++) {
    st = await elzet();
    await g(({ x, y }) => window.__game.scene.getScene('game').talkableAt(x, y, 14)(), st.npc);
    await choose(0); // listen
    await choose(0); // laugh, close
    await resume();
  }
  st = await elzet();
  assert.equal(st.zarty, 10);
  assert.equal(st.krok, 6);
  const gear = await g(() => JSON.stringify(window.__gear));
  assert(gear.includes('buty_biegacza'), 'no boots');
  assert(await g(() => window.__session.stats && true));
  await page.waitForTimeout(800);
  assert.equal(saved.flagi?.elzet, 6, 'not saved');
  assert(!errors.length, errors.join('\n'));
  console.log(`PASS (${tel ? 'telefon' : 'komputer'}): Elzet 10 od Kryształowej do jeziora; walka 1 życie ${f1.hp}, próg ${f1.prog}.`);
} finally {
  await browser.close();
  server.httpServer.close();
}

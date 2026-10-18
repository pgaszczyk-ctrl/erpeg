// Arena Cechu (asynchronous PvP, test server): the judge, a fight with another player's ghost on the arena
// outside the map, the reward, the ranking and the letter in the home chest. Server mocked.
// Old header of the fight test:
// The turn fight MVP 1 (test server; src/walka/): a group waits in its ring, walking in asks Podejdź / Odejdź,
// Odejdź steps back for free, Podejdź starts a fight on the map: the group spreads out, a target is picked by
// tapping it, the second tap strikes, Ruch walks inside the lit range, the enemies answer, a win heals fully.
// Bandits talk and take a fee; a hotel night gives one more move per turn.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-walka-tur.mjs   (TELEFON=1 for the phone)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });

const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'tel' : 'pc';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  const calls = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    // Jam in Lublin, level 3 (Średni), a stick.
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    if (path.endsWith('/arena_rywal')) { calls.push('rywal'); body = { bilet: '00000000-0000-0000-0000-000000000001', poziom: 3, zostalo_godz: 4, zostalo_dzis: 14,
      rywal: process.env.GLADIATOR ? null : { name: 'Zbyszko', poziom: 3, wygrane: 7, punkty: 1040, snap: { postac: 4, name: 'Zbyszko', poziom: 3, maxHp: 10, atak: 3, trafienie: 0.75, blok: 0.05, mocny: 3 } } }; }
    if (path.endsWith('/arena_wynik')) { calls.push('wynik:' + JSON.parse(route.request().postData()).p_wygrana); body = { punkty: 1016, delta: 16, wygrane: 1, przegrane: 0 }; }
    if (path.endsWith('/arena_listy')) body = [{ dzien: '2026-10-17', walk: 4, wygranych: 3 }];
    if (path.endsWith('/arena_odbierz')) { calls.push('odbierz'); body = 30; }
    if (path.endsWith('/arena_ranking')) body = { top: [{ name: 'Zbyszko', poziom: 3, punkty: 1040, wygrane: 7, przegrane: 2 }], ja: { punkty: 1016, wygrane: 1, przegrane: 0, miejsce: 2, obrony: 3 } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('#loading-map:not([hidden])') && !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push({ title: req.title, text: req.text, buttons: req.buttons }); return orig(req); };
    // No fresh-start protection blinking in the pictures; the hero on free ground.
    s.protectUntil = 0;
    // Away from home (enemies vanish within 40 m of it).
    const f = s.city.freeNear(s.player.x + 260, s.player.y + 5);
    s.player.setPosition(f.x, f.y - 5);
  });
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').streets.tury), true, 'turn fight is on (TEST)');

  const g = (fn, arg) => page.evaluate(fn, arg);
  let seen = 0;
  async function dialogNext(title) {
    await page.waitForFunction((n) => window.__dialogi.length > n && window.__game.scene.getScene('ui').dialogBox, seen, { timeout: 30000 });
    const d = await g((n) => window.__dialogi[n], seen);
    seen++;
    console.log(`[${d.title}] ${d.text.replace(/\n+/g, ' ').slice(0, 120)} → ${JSON.stringify(d.buttons)}`);
    if (title) assert.match(d.title, title);
    return d;
  }
  async function press(d, label) {
    const index = d.buttons.findIndex((b) => b.includes(label));
    assert(index >= 0, `button ${label} in ${JSON.stringify(d.buttons)}`);
    await page.waitForTimeout(300);
    const at = await g((i) => { const r = window.__game.scene.getScene('ui').dialogButtons.find((b) => b.index === i).rect; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, index);
    if (mobile) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(300);
  }
  /** A world point → a tap on the screen (CSS px). */
  async function tapWorld(x, y) {
    const at = await g(([x, y]) => {
      const s = window.__game.scene.getScene('game');
      const cam = s.cameras.main;
      const r = s.game.canvas.getBoundingClientRect();
      const css = cam.zoom / (s.scale.width / r.width);
      return { x: r.left + (x - cam.worldView.x) * css, y: r.top + (y - cam.worldView.y) * css };
    }, [x, y]);
    if (mobile) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(250);
  }
  async function button(sel) {
    const b = page.locator(`#walka-panel ${sel}`);
    await b.waitFor({ timeout: 10000 });
    try {
      if (mobile) await b.tap({ timeout: 8000 });
      else await b.click({ timeout: 8000 });
    } catch (e) {
      console.log('STAN', JSON.stringify(await fight()), await page.evaluate(() => document.getElementById('walka-panel')?.outerHTML.slice(0, 600)));
      await page.screenshot({ path: `work/walka-${tag}-blad.png` });
      throw e;
    }
    await page.waitForTimeout(250);
  }
  const fight = () => g(() => {
    const w = window.__game.scene.getScene('game').walka;
    if (!w) return null;
    return { maxHp: w.panel.stan?.maxHp, faza: w.faza, ruchy: w.ruchy, max: w.maxRuchy, tryb: w.tryb, cel: !!w.cel, punkt: !!w.punkt, busy: w.busy, zywi: w.zywi.map((q) => ({ x: q.e.x, y: q.e.y, hp: q.e.hp, k: q.e.kindId })), hp: window.__game.scene.getScene('game').player.hp };
  });
  const waitPhase = (f) => page.waitForFunction((f) => { const w = window.__game.scene.getScene('game').walka; return !w || (w.faza === f && !w.busy); }, f, { timeout: 30000 });


  const coins = () => g(() => window.__session.coins);
  const c0 = await coins();
  // LUBLIN=1: the arena of Lublin (its coat of arms in the sand).
  if (process.env.LUBLIN) await g(() => { window.__game.scene.getScene('game').kurierMiejsce = () => ({ k: 'PL', c: 'Lublin' }); });
  await g(() => window.__game.scene.getScene('game').talkSport({ role: 'sedzia' }));
  await press(await dialogNext(/Sędzia Areny/), 'Walka');
  const offer = await dialogNext(/Arena Cechu/);
  assert.match(offer.text, process.env.GLADIATOR ? /Gladiator/ : /Zbyszko/);
  await press(offer, 'Walcz');
  await page.waitForFunction(() => window.__game.scene.isActive('arena') && window.__game.scene.getScene('arena').walka?.faza === 'gracz', null, { timeout: 20000 });
  assert.equal(await coins(), c0 - 100, 'entry fee paid');
  await page.waitForTimeout(800);
  if (process.env.DEBUG) console.log(JSON.stringify(await g(() => { const gs = window.__game.scene.getScene('game'); const a = window.__game.scene.getScene('arena'); return { zoom: a.cameras.main.zoom, ch: a.cameras.main.height, cw: a.cameras.main.width, vis: gs.sys.settings.visible, st: gs.sys.settings.status, camVis: gs.cameras.main.visible, alpha: gs.cameras.main.alpha, tr: a.cameras.main.transparent, bg: a.cameras.main.backgroundColor.rgba, order: window.__game.scene.scenes.map((s) => s.sys.settings.key) }; })));
  await page.screenshot({ path: `work/arena-${tag}-1-start.png` });
  const af = () => g(() => {
    const a = window.__game.scene.getScene('arena');
    const w = a?.walka;
    if (!w) return null;
    return { faza: w.faza, ruchy: w.ruchy, busy: w.busy, zywi: w.zywi.map((q) => ({ x: q.e.x, y: q.e.y, hp: q.e.hp })), hp: a.player.hp };
  });
  const aTap = async (x, y) => {
    const at = await g(([x, y]) => {
      const s = window.__game.scene.getScene('arena');
      const cam = s.cameras.main, r = s.game.canvas.getBoundingClientRect();
      const css = cam.zoom / (s.scale.width / r.width);
      return { x: r.left + (x - cam.worldView.x) * css, y: r.top + (y - cam.worldView.y) * css };
    }, [x, y]);
    if (mobile) await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(250);
  };
  const waitA = () => page.waitForFunction(() => { const w = window.__game.scene.getScene('arena')?.walka; return !w || (w.faza === 'gracz' && !w.busy); }, null, { timeout: 30000 });
  let shot = false;
  for (let t = 0; t < 40; t++) {
    // The test keeps the hero alive.
    await g(() => { const a = window.__game.scene.getScene('arena'); if (a?.player) a.player.hp = Math.max(a.player.hp, 40); });
    const f = await af();
    if (!f) break;
    if (f.faza !== 'gracz' || f.busy) { await waitA(); continue; }
    const e = f.zywi[0];
    if (!e) break;
    await aTap(e.x, e.y - 4);
    const plan = await g(() => { const w = window.__game.scene.getScene('arena')?.walka; return w?.cel ? w.planCiosu(w.cel, false) : null; });
    if (plan?.ok) { await aTap(e.x, e.y - 4); if (!shot) { shot = true; } }
    else if (plan && /Podejdź/.test(plan.tekst)) {
      // Drag the hero towards the ghost.
      const spot = await g(([ex, ey]) => { const w = window.__game.scene.getScene('arena').walka; let b = null, bd = 1e9; for (const c of w.zas.values()) { const d = Math.hypot(c.x - ex, c.y - ey); if (d > 12 && d < bd) [b, bd] = [c, d]; } return b; }, [e.x, e.y]);
      await page.evaluate(() => document.querySelector('#walka-panel .wp-b.ruch')?.click());
      if (spot) { await aTap(spot.x, spot.y); await aTap(spot.x, spot.y); }
    } else await page.evaluate(() => document.querySelector('#walka-panel .wp-koniec:not(.wp-wroc)')?.click());
    if (t === 3) await page.screenshot({ path: `work/arena-${tag}-2-walka.png` });
    await page.waitForTimeout(200);
    await waitA();
  }
  const res = await dialogNext(/Arena Cechu/);
  await page.screenshot({ path: `work/arena-${tag}-3-wynik.png` });
  assert.match(res.text, /Zwycięstwo/);
  assert.equal(await coins(), c0 - 100 + 150, 'reward paid');
  assert(calls.includes('wynik:true'), 'result sent');
  await press(res, 'OK');
  assert.equal(await g(() => window.__game.scene.isActive('arena')), false, 'back on the map');
  // The ranking.
  await g(() => window.__game.scene.getScene('game').arenaRanking());
  const rk = await dialogNext(/Ranking/);
  assert.match(rk.text, /Zbyszko/);
  await press(rk, 'OK');
  // The letter in the home chest.
  await g(() => window.__game.scene.getScene('game').openHome());
  const home = await dialogNext(/domek/);
  assert.match(home.text, /Cechu/);
  await press(home, 'List z Areny');
  const list = await dialogNext(/List z Areny/);
  assert.match(list.text, /wygrał 3/);
  await page.screenshot({ path: `work/arena-${tag}-4-list.png` });
  const c1 = await coins();
  await press(list, 'kopertę');
  await page.waitForTimeout(800);
  assert.equal(await coins(), c1 + 30, 'gold from the letter');
  assert.deepEqual(errors, [], 'no page errors');
  console.log(`OK arena (${tag})`);
} finally {
  await browser.close();
}

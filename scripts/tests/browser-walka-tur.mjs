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

  /** A free spot about `d` px from the hero towards `a`, with a group of `kinds` there. */
  async function group(kinds, d = 75) {
    return g(([kinds, d]) => {
      const s = window.__game.scene.getScene('game');
      const p = s.player;
      for (let t = 0; t < 200; t++) {
        const a = Math.random() * Math.PI * 2;
        const cx = p.x + Math.cos(a) * d, cy = p.y + Math.sin(a) * d;
        const ok = (x, y) => s.freeFeet(x, y + 5);
        if (!ok(cx, cy)) continue;
        // A straight free way from the hero to the group (the test walks it).
        let clear = true;
        for (let k = 8; k <= d && clear; k += 3) if (!ok(p.x + Math.cos(a) * k, p.y + Math.sin(a) * k)) clear = false;
        if (!clear) continue;
        const pts = kinds.map((_, i) => ({ x: cx + Math.cos(i * 2.1) * 6, y: cy + Math.sin(i * 2.1) * 5 }));
        if (!pts.every((q) => ok(q.x, q.y))) continue;
        kinds.forEach((k, i) => s.spawnEnemy(pts[i].x, pts[i].y, undefined, k));
        return { x: cx, y: cy, a };
      }
      return null;
    }, [kinds, d]);
  }
  /** Walks the hero (by the keyboard-free way: small steps) towards a point until a dialog shows or the distance is reached. */
  async function walkTo(x, y, stop = 0) {
    for (let i = 0; i < 200; i++) {
      const r = await g(([x, y, stop]) => {
        const s = window.__game.scene.getScene('game');
        if (s.scene.isPaused() || s.walka) return 'stop';
        const p = s.player;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d <= stop + 1) return 'there';
        const k = Math.min(2, d - stop) / d;
        p.setPosition(p.x + (x - p.x) * k, p.y + (y - p.y) * k);
        return 'go';
      }, [x, y, stop]);
      if (r !== 'go') return r;
      await page.waitForTimeout(40);
    }
    return 'far';
  }

  // ---- 1. A group of imps: the ring, then Podejdź / Odejdź.
  const imps = await group(['glut', 'glut', 'glut'], 90);
  assert(imps, 'a free spot for the group');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `work/walka-${tag}-1-krag.png` });
  assert.equal(await walkTo(imps.x, imps.y), 'stop', 'walking in stops the game');
  const ask = await dialogNext(/Grupka/);
  assert.match(ask.text, /Narwani/);
  await page.screenshot({ path: `work/walka-${tag}-2-pytanie.png` });

  // Odejdź: stepped back out of the ring, no fight; walking straight back doesn't ask again.
  const before = await g(() => ({ x: window.__game.scene.getScene('game').player.x, y: window.__game.scene.getScene('game').player.y }));
  await press(ask, 'Odejdź');
  const after = await g(() => ({ x: window.__game.scene.getScene('game').player.x, y: window.__game.scene.getScene('game').player.y, walka: !!window.__game.scene.getScene('game').walka }));
  assert.equal(after.walka, false);
  assert(Math.hypot(after.x - imps.x, after.y - imps.y) > Math.hypot(before.x - imps.x, before.y - imps.y) + 3, 'stepped back');
  await page.waitForTimeout(500);
  assert.equal(await g(() => window.__dialogi.length), seen, 'no question right after Odejdź');
  // Far away and back: asks again.
  await walkTo(imps.x + Math.cos(imps.a) * 160 - Math.cos(imps.a) * 90, imps.y + Math.sin(imps.a) * 160 - Math.sin(imps.a) * 90);
  await g(([x, y, a]) => { const p = window.__game.scene.getScene('game').player; p.setPosition(x - Math.cos(a) * 160, y - Math.sin(a) * 160); }, [imps.x, imps.y, imps.a]);
  await page.waitForTimeout(400);
  assert.equal(await walkTo(imps.x, imps.y), 'stop');
  const ask2 = await dialogNext(/Grupka/);

  // ---- 2. Podejdź: a fight on the map.
  await press(ask2, 'Podejdź');
  await page.waitForSelector('#walka-panel', { timeout: 10000 });
  await waitPhase('gracz');
  let f = await fight();
  console.log('fight', JSON.stringify(f));
  const maxHp = f.maxHp;
  assert.equal(f.zywi.length, 3);
  assert(f.max === 3 || f.max === 4, 'level 3: 3 moves (+1 with luck)');
  const r0start = f.ruchy;
  // Spread out: nobody overlaps, everyone keeps clear of the hero.
  const pos = await g(() => { const s = window.__game.scene.getScene('game'); return { p: { x: s.player.x, y: s.player.y }, e: s.walka.zywi.map((q) => ({ x: q.e.x, y: q.e.y, r: q.r })) }; });
  for (let i = 0; i < pos.e.length; i++) {
    assert(Math.hypot(pos.e[i].x - pos.p.x, pos.e[i].y - pos.p.y) > 10, 'clear of the hero');
    for (let j = i + 1; j < pos.e.length; j++) assert(Math.hypot(pos.e[i].x - pos.e[j].x, pos.e[i].y - pos.e[j].y) >= pos.e[i].r + pos.e[j].r, 'no overlap');
  }
  const panelH = await page.evaluate(() => document.getElementById('walka-panel').getBoundingClientRect().height);
  console.log('panel height', panelH);
  assert(panelH <= 190, `compact panel (${panelH})`);
  assert.equal(await page.locator('#walka-panel .wp-rzad .wp-b').count(), 3, 'exactly three main buttons');
  await page.screenshot({ path: `work/walka-${tag}-3-rozstawienie.png` });

  // Pick the nearest imp by tapping it on the map; the second tap strikes.
  const near = f.zywi.sort((a, b) => Math.hypot(a.x - pos.p.x, a.y - pos.p.y) - Math.hypot(b.x - pos.p.x, b.y - pos.p.y))[0];
  await tapWorld(near.x, near.y - 4);
  f = await fight();
  assert.equal(f.cel, true, 'target chosen by a tap on the map');
  assert.equal(f.ruchy, r0start, 'choosing costs nothing');
  await page.screenshot({ path: `work/walka-${tag}-4-cel.png` });
  await tapWorld(near.x, near.y - 4);
  await waitPhase('gracz');
  f = await fight();
  console.log('after a blow', JSON.stringify(f));
  assert(f.ruchy === r0start - 1 || f.faza !== 'gracz', 'a blow costs a move');

  // Ruch: the lit range, a tap on the ground previews, the second tap walks.
  if (f.ruchy >= 1 && f.faza === 'gracz') {
    await button('.wp-b.ruch');
    await page.screenshot({ path: `work/walka-${tag}-5-zasieg.png` });
    const spot = await g(() => {
      const s = window.__game.scene.getScene('game');
      const w = s.walka;
      const cells = [...w.zas.values()].filter((c) => c.d > 14 && c.d < 30);
      return cells[Math.floor(cells.length / 2)];
    });
    await tapWorld(spot.x, spot.y);
    assert.equal((await fight()).punkt, true, 'a spot previewed');
    const r0 = (await fight()).ruchy;
    await tapWorld(spot.x, spot.y);
    await waitPhase('gracz');
    const p1 = await g(() => ({ x: window.__game.scene.getScene('game').player.x, y: window.__game.scene.getScene('game').player.y }));
    assert(Math.hypot(p1.x - spot.x, p1.y - spot.y) < 2, 'walked to the spot');
    f = await fight();
    assert(f.ruchy === r0 - 1 || f.faza !== 'gracz');
  }
  // End the turn: the enemies answer.
  if ((await fight())?.faza === 'gracz') await button('.wp-koniec:not(.wp-wroc)');
  await waitPhase('gracz');
  console.log('after their turn', JSON.stringify(await fight()));
  await page.screenshot({ path: `work/walka-${tag}-6-po-turze.png` });

  // Fight on until the group is beaten (the hero kept alive for the test): strike the chosen one each time.
  for (let turn = 0; turn < 25 && (await fight()); turn++) {
    await g(() => { window.__game.scene.getScene('game').player.hp = Math.max(window.__game.scene.getScene('game').player.hp, 3); });
    f = await fight();
    if (!f) break;
    if (f.faza !== 'gracz') { await waitPhase('gracz'); continue; }
    const p = await g(() => ({ x: window.__game.scene.getScene('game').player.x, y: window.__game.scene.getScene('game').player.y }));
    const t = f.zywi.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    await tapWorld(t.x, t.y - 4);
    const ok = await g(() => { const w = window.__game.scene.getScene('game').walka; return w ? (w.cel ? w.planCiosu(w.cel, false) : { ok: false, tekst: '' }) : null; });
    if (!ok) break;
    if (ok.ok) await tapWorld(t.x, t.y - 4);
    else if (/Podejdź/.test(ok.tekst)) {
      // Too far: one Ruch towards it.
      await button('.wp-b.ruch');
      const spot = await g(([tx, ty]) => {
        const w = window.__game.scene.getScene('game').walka;
        let best = null, bd = Infinity;
        for (const c of w.zas.values()) { const d = Math.hypot(c.x - tx, c.y - ty); if (d > 12 && d < bd) [best, bd] = [c, d]; }
        return best;
      }, [t.x, t.y]);
      if (spot) { await tapWorld(spot.x, spot.y); await tapWorld(spot.x, spot.y); }
    } else await page.evaluate(() => document.querySelector('#walka-panel .wp-koniec:not(.wp-wroc)')?.click());
    await page.waitForTimeout(200);
    await waitPhase('gracz');
  }
  assert.equal(await fight(), null, 'fight over');
  const won = await g(() => { const s = window.__game.scene.getScene('game'); return { hp: s.player.hp, panel: !!document.getElementById('walka-panel'), follow: s.cameras.main._follow === s.player }; });
  console.log('won', JSON.stringify(won), 'max', maxHp);
  assert.equal(won.panel, false, 'panel gone');
  assert.equal(won.hp, maxHp, 'full life after a won fight');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `work/walka-${tag}-7-wygrana.png` });

  // ---- 3. Bandits talk and take a fee.
  const b = await group(['bandyta', 'bandyta'], 90);
  assert(b);
  await page.waitForTimeout(600);
  assert.equal(await walkTo(b.x, b.y), 'stop');
  const askB = await dialogNext(/Grupka/);
  assert.match(askB.text, /pogadać/);
  await press(askB, 'Podejdź');
  const talk = await dialogNext(/Rozmowa/);
  await page.screenshot({ path: `work/walka-${tag}-8-rozmowa.png` });
  const coins0 = await g(() => window.__session.coins);
  await press(talk, 'okup');
  await page.waitForTimeout(800);
  const coins1 = await g(() => window.__session.coins);
  assert(coins1 < coins0, 'fee paid');
  assert.equal(await g(([x, y]) => window.__game.scene.getScene('game').enemies.filter((e) => e.active && !e.isDead && Math.hypot(e.x - x, e.y - y) < 30).length, [b.x, b.y]), 0, 'they left');

  // ---- 4. A hotel night: one more move per turn.
  await g(() => { window.__session.flagi.wyspany = Date.now() + 30 * 60000; });
  const c = await group(['glut'], 90);
  await page.waitForTimeout(600);
  await walkTo(c.x, c.y);
  await press(await dialogNext(/Grupka/), 'Podejdź');
  await waitPhase('gracz');
  f = await fight();
  assert(f.max >= 4, `rested: ${f.max} moves`);
  // Ucieczka: the fight ends, −1 heart, the group stays.
  await button('.wp-b.spec');
  await page.screenshot({ path: `work/walka-${tag}-9-specjalne.png` });
  await button('.wp-b.uciekaj');
  assert.equal(await fight(), null, 'ran away');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`OK walka turowa (${tag})`);
} finally {
  await browser.close();
}

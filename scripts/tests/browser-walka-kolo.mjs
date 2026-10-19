// The turn fight's new controls (test server, walka/tryb.ts nowyPanel; ui/walkaKolo.ts): the turn bar at the top
// (moves as dots, a first-fight tip, Uciekaj with „Na pewno?”), a tap on an enemy opens its ring (Cios / Mocny cios –
// the hero walks up and strikes from close by), a tap on the ground previews a walk and the second walks, a tap on
// the hero opens his ring (Leczenie / Unik), out of moves the turn passes by itself; on a computer the hover previews.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-walka-tur.mjs   (TELEFON=1 for the phone)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });

const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'kolo-tel' : 'kolo-pc';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: Number(process.env.SZER || 390), height: 844 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
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
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&panel=nowy#postac=Jam&kod=ANGELIKA');
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


  const heroScr = () => g(() => {
    const s = window.__game.scene.getScene('game');
    const cam = s.cameras.main, r = s.game.canvas.getBoundingClientRect();
    const css = cam.zoom / (s.scale.width / r.width);
    return { x: r.left + (s.player.x - cam.worldView.x) * css, y: r.top + (s.player.y - 4 - cam.worldView.y) * css };
  });
  const tapScr = async (at) => {
    if (mobile) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(300);
  };
  const near = (f, p) => f.zywi.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  const heroPos = () => g(() => ({ x: window.__game.scene.getScene('game').player.x, y: window.__game.scene.getScene('game').player.y }));

  // ---- 1. A group of imps far enough that the first blow needs a walk up.
  const imps = await group(['glut', 'glut', 'glut'], 90);
  assert(imps, 'a free spot for the group');
  await page.waitForTimeout(800);
  assert.equal(await walkTo(imps.x, imps.y), 'stop');
  await press(await dialogNext(/Grupka/), 'Podejdź');
  await page.waitForSelector('#walka-panel.wn', { timeout: 10000 });
  await waitPhase('gracz');
  let f = await fight();
  console.log('fight', JSON.stringify(f));
  const maxHp = f.maxHp;
  // The bar: whose turn, one dot per move, a tip on the first turn; no bottom buttons.
  const bar = await page.evaluate(() => {
    const el = document.getElementById('walka-panel');
    const r = el.getBoundingClientRect();
    return { tura: el.querySelector('.wn-tura').textContent, kropki: el.querySelectorAll('.wn-kropki i:not(.pusta)').length, rada: !!el.querySelector('.wn-podp.rada'), podp: el.querySelector('.wn-podp').textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right, stare: document.querySelectorAll('.wp-b').length };
  });
  console.log('bar', JSON.stringify(bar));
  assert.equal(bar.tura, 'TWOJA TURA');
  assert.equal(bar.kropki, f.ruchy, 'a dot per move');
  assert.equal(bar.rada, true, 'a first-fight tip');
  assert.equal(bar.stare, 0, 'no old buttons');
  assert(bar.top < 20 && bar.bottom < 140, 'the bar is at the top');
  assert(bar.left >= 0 && bar.right <= (mobile ? Number(process.env.SZER || 390) : 1280), 'the bar fits the screen');
  await page.screenshot({ path: `work/walka-${tag}-1-start.png` });

  // ---- 2. A computer: hovering an enemy previews, no move spent.
  let p = await heroPos();
  let t = near(f, p);
  if (!mobile) {
    const at = await g(([x, y]) => {
      const s = window.__game.scene.getScene('game');
      const cam = s.cameras.main, r = s.game.canvas.getBoundingClientRect();
      const css = cam.zoom / (s.scale.width / r.width);
      return { x: r.left + (x - cam.worldView.x) * css, y: r.top + (y - 4 - cam.worldView.y) * css };
    }, [t.x, t.y]);
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(300);
    f = await fight();
    assert.equal(f.cel, true, 'hover = preview');
  }

  // ---- 3. Tap the nearest imp: its ring of blows; „Cios” walks up and strikes from close by.
  const r0 = f.ruchy;
  await tapWorld(t.x, t.y - 4);
  f = await fight();
  assert.equal(f.ruchy, r0, 'choosing costs nothing');
  // The blows grow out of the creature: right after the tap they are still small, a moment later full size.
  const poczatek = await page.evaluate(() => { const b = document.querySelector('#walka-kolo .wk-b'); return b && getComputedStyle(b).transform; });
  await page.waitForTimeout(500);
  const koniec = await page.evaluate(() => { const b = document.querySelector('#walka-kolo .wk-b'); return b && getComputedStyle(b).transform; });
  console.log('grow', poczatek, '→', koniec);
  assert(poczatek && poczatek !== 'none' && koniec === 'none', 'the ring grows out of the creature');
  // A blow without walking reaches only a little beyond touching: farther enemies need a walk-up move.
  const zasiegi = await g(() => {
    const w = window.__game.scene.getScene('game').walka, p = w.h.player, W = 56 * 0.36 * (2 / 3);
    return w.zywi.map((q) => { const pl = w.planCiosu(q, false); return { d: Math.hypot(q.e.x - p.x, q.e.y - p.y), max: q.r + 0.3 * W + 2 + 1.5 + 0.5 * W, dojscie: !!pl.dojscie, koszt: pl.koszt }; });
  });
  console.log('reach', JSON.stringify(zasiegi));
  for (const z of zasiegi) if (z.d > z.max + 1) assert(z.dojscie && z.koszt >= 2, `a far enemy (${z.d.toFixed(1)} px) needs a walk-up`);
  const ringW = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => b.className + ' ' + b.textContent));
  console.log('enemy ring', JSON.stringify(ringW));
  assert.equal(ringW.length, 2, 'only the unlocked attacks in the enemy ring (Cios, Mocny cios) – no locked Zamach');
  assert(/cios/.test(ringW[0]) && /mocny/.test(ringW[1]), 'Cios and Mocny cios');
  assert(!/%|pokona/.test(await page.evaluate(() => document.body.innerText + window.__game.scene.getScene('game').walka.etykieta.text)), 'no percentages, no „pokona”');
  const plan = await g(() => { const w = window.__game.scene.getScene('game').walka; return w.planCiosu(w.cel, false); });
  console.log('plan', JSON.stringify(plan));
  assert(plan.ok, 'reachable this turn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `work/walka-${tag}-2-kolo-wroga.png` });
  const cel = { x: t.x, y: t.y };
  const przed = await heroPos();
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.cios').click());
  await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || w.busy; }, null, { timeout: 5000 }).catch(() => {});
  // Closest point of the strike (sampled while it lasts).
  let najblizej = Infinity;
  let zdjecie = false;
  for (let i = 0; i < 40; i++) {
    if (!zdjecie && i === 6) { zdjecie = true; await page.screenshot({ path: `work/walka-${tag}-2b-cios.png` }); }
    const st = await g(([x, y]) => { const s = window.__game.scene.getScene('game'); return { d: Math.hypot(s.player.x - x, s.player.y - y), busy: !!s.walka?.busy }; }, [cel.x, cel.y]);
    najblizej = Math.min(najblizej, st.d);
    if (!st.busy) break;
    await page.waitForTimeout(40);
  }
  f = await fight();
  console.log('after a blow', JSON.stringify(f), 'closest', najblizej.toFixed(1), 'from', Math.hypot(przed.x - cel.x, przed.y - cel.y).toFixed(1));
  assert(!f || f.ruchy === r0 - plan.koszt || f.faza !== 'gracz', `a blow costs ${plan.koszt}`);
  // Touching = both figures' ground rings side by side (TuryWalki.miejsce keeps them apart by that).
  const styk = await g(() => { const w = window.__game.scene.getScene('game').walka; const q = w.zywi[0]; return q.r + 0.3 * 56 * 0.36 * (2 / 3) + 2 + 1.5; });
  console.log('touching at', styk.toFixed(1));
  assert(najblizej <= styk * 1.25, `struck from close by (${najblizej.toFixed(1)} px, touching ${styk.toFixed(1)})`);

  // ---- 4. Tap the hero: the ring of four; a tap beside it closes it.
  if ((await fight())?.faza === 'gracz') {
    await tapScr(await heroScr());
    f = await fight();
    const ring = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => { const r = b.getBoundingClientRect(); return { k: b.className, x: r.left, y: r.top, w: r.width, r: r.right, b: r.bottom }; }));
    console.log('ring', JSON.stringify(ring.map((q) => q.k)));
    assert.deepEqual(ring.map((q) => q.k.split(' ')[1]), ['lecz', 'unik'], 'Leczenie and Unik around the hero');
    const W = mobile ? Number(process.env.SZER || 390) : 1280, H = mobile ? 844 : 860;
    for (const q of ring) assert(q.x >= 0 && q.r <= W && q.y >= 0 && q.b <= H, 'ring on screen');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `work/walka-${tag}-3-kolo.png` });
    const h = await heroScr();
    await tapScr({ x: h.x + 150 > W - 10 ? h.x - 150 : h.x + 150, y: h.y + 160 });
    assert.equal(await page.locator('#walka-kolo .wk-b').count(), 0, 'closed by a tap beside it');
  }

  // ---- 5. Tap the ground in range: preview, then walk.
  if ((await fight())?.faza === 'gracz' && (await fight()).ruchy >= 1) {
    const r1 = (await fight()).ruchy;
    const spot = await g(() => {
      const w = window.__game.scene.getScene('game').walka;
      const cells = [...w.zas.values()].filter((c) => c.d > 14 && c.d < 30 && !w.ktoTu(c.x, c.y, 12)[0] && Math.hypot(c.x - w.h.player.x, c.y - w.h.player.y) > 12);
      return cells[Math.floor(cells.length / 2)];
    });
    if (!mobile) await page.mouse.move(5, 5);
    await tapWorld(spot.x, spot.y);
    const fp = await fight();
    if (mobile) {
      assert.equal(fp.punkt, true, 'a spot previewed');
      assert.equal(fp.ruchy, r1);
      await page.screenshot({ path: `work/walka-${tag}-4-pole.png` });
      await tapWorld(spot.x, spot.y);
    }
    await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || !w.busy; }, null, { timeout: 20000 });
    const p1 = await heroPos();
    assert(Math.hypot(p1.x - spot.x, p1.y - spot.y) < 2, 'walked to the spot');
  }

  // ---- 6. Out of moves (or „Zakończ turę”): the enemies' turn shows red, then the hero's again.
  if ((await fight())?.faza === 'gracz') await page.evaluate(() => document.querySelector('#walka-panel .wn-koniec:not(:disabled)')?.click());
  await page.waitForFunction(() => document.querySelector('#walka-panel.wrog') || !window.__game.scene.getScene('game').walka, null, { timeout: 10000 });
  await page.screenshot({ path: `work/walka-${tag}-5-tura-wroga.png` });
  await waitPhase('gracz');

  // ---- 7. Fight on with taps only: tap the nearest twice (walk up included) until they are beaten.
  for (let turn = 0; turn < 30 && (await fight()); turn++) {
    await g(() => { const s = window.__game.scene.getScene('game'); s.player.hp = Math.max(s.player.hp, 3); });
    f = await fight();
    if (!f) break;
    if (f.faza !== 'gracz') { await waitPhase('gracz'); continue; }
    p = await heroPos();
    t = near(f, p);
    const r0 = f.ruchy;
    await tapWorld(t.x, t.y - 4);
    const zrob = await page.evaluate(() => { const b = document.querySelector('#walka-kolo .wk-b.cios'); if (b && b.getAttribute('aria-disabled') !== 'true') { b.click(); return true; } return false; });
    await page.waitForTimeout(150);
    await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || !w.busy; }, null, { timeout: 30000 });
    const w2 = await fight();
    // Nothing done (e.g. no way up): end the turn by the bar's button.
    if (w2 && w2.faza === 'gracz' && (w2.ruchy === r0 || !zrob)) await page.evaluate(() => document.querySelector('#walka-panel .wn-koniec:not(:disabled)')?.click());
    await waitPhase('gracz');
  }
  assert.equal(await fight(), null, 'fight over');
  const won = await g(() => { const s = window.__game.scene.getScene('game'); return { hp: s.player.hp, panel: !!document.getElementById('walka-panel'), kolo: !!document.getElementById('walka-kolo') }; });
  assert.equal(won.panel, false, 'bar gone');
  assert.equal(won.kolo, false, 'ring gone');
  assert.equal(won.hp, maxHp, 'full life after a won fight');

  // ---- 8. Hurt: Leczenie glows in the hero's ring; Uciekaj in the bar asks once, the second tap runs away.
  const c = await group(['glut', 'glut', 'glut'], 90);
  await page.waitForTimeout(600);
  await walkTo(c.x, c.y);
  await press(await dialogNext(/Grupka/), 'Podejdź');
  await waitPhase('gracz');
  // Unlocked Zamach (sword level 5): one swing hits several imps standing together.
  await g(() => {
    window.__gear.skills.miecz = 1e6;
    window.__session.level = { ...window.__session.level, celnosc: 100 };
    const s = window.__game.scene.getScene('game'), w = s.walka, p = s.player;
    const ang = [-0.5, 0, 0.5];
    w.zywi.forEach((q, i) => { const d = q.r + 0.3 * 56 * 0.36 * (2 / 3) + 2 + 2; q.e.setPosition(p.x + Math.cos(-Math.PI / 2 + ang[i]) * d, p.y + Math.sin(-Math.PI / 2 + ang[i]) * d); q.e.hp = 999; });
    w.ruchy = 5;
    w.przelicz();
  });
  f = await fight();
  assert.equal(f.zywi.length, 3, 'three imps for the sweep');
  const hp0 = f.zywi.map((q) => q.hp);
  await tapWorld(f.zywi[1].x, f.zywi[1].y - 4);
  await page.waitForTimeout(400);
  const ringZ = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => b.className));
  console.log('ring with zamach', JSON.stringify(ringZ));
  assert(ringZ.some((k) => /zamach/.test(k) ), 'Zamach unlocked');
  await page.screenshot({ path: `work/walka-${tag}-8-zamach.png` });
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.zamach').click());
  await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || !w.busy; }, null, { timeout: 20000 });
  f = await fight();
  const trafieni = f.zywi.filter((q, i) => q.hp < hp0[i]).length;
  console.log('zamach hit', trafieni, 'of', f.zywi.length);
  assert(trafieni >= 2, `Zamach hits several (${trafieni})`);
  // A wand in hand + magic level 3: the ring shows Czar and Wachlarz ognia, the fan burns several.
  await g(() => {
    window.__gear.equip.bron = 'rozdzka'; window.__gear.magic = true; window.__gear.skills.magia = 1e6;
    const w = window.__game.scene.getScene('game').walka;
    w.zywi.forEach((q) => { q.e.hp = 999; });
    w.ruchy = 5; w.przelicz();
  });
  f = await fight();
  const hp1 = f.zywi.map((q) => q.hp);
  await tapWorld(f.zywi[1].x, f.zywi[1].y - 4);
  await page.waitForTimeout(400);
  const ringM = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => b.className));
  console.log('ring with a wand', JSON.stringify(ringM));
  assert(ringM.some((k) => /czar/.test(k)) && ringM.some((k) => /wachlarz/.test(k) ), 'Czar and Wachlarz ognia');
  await page.screenshot({ path: `work/walka-${tag}-8b-wachlarz.png` });
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.wachlarz').click());
  await page.waitForTimeout(150);
  await page.screenshot({ path: `work/walka-${tag}-8c-ogien.png` });
  await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || !w.busy; }, null, { timeout: 20000 });
  f = await fight();
  const spaleni = f.zywi.filter((q, i) => q.hp < hp1[i]).length;
  console.log('fan hit', spaleni, 'of', f.zywi.length);
  assert(spaleni >= 2, `Wachlarz ognia burns several (${spaleni})`);
  // Many attacks: pages of 3 + „Więcej”, locked ones never shown.
  await g(() => {
    for (const id of ['proba1', 'proba2', 'proba3']) window.__ataki.push({ id, nazwa: id, bron: 'magia', koszt: 1, mnoznik: 1, obszar: 'jeden', opis: '' });
    window.__ataki.push({ id: 'probaZamk', nazwa: 'zamk', bron: 'magia', koszt: 1, mnoznik: 1, obszar: 'jeden', opis: '', wymaga: { poziomPostaci: 99 } });
    const w = window.__game.scene.getScene('game').walka; w.ruchy = 5; w.przelicz();
  });
  f = await fight();
  await tapWorld(f.zywi[1].x, f.zywi[1].y - 4);
  await page.waitForTimeout(400);
  const strona1 = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => b.className + ' ' + b.textContent));
  console.log('ring page 1', JSON.stringify(strona1));
  assert.equal(strona1.length, 4, 'four buttons at most');
  assert(/wiecej/.test(strona1[3]) && /1\/2/.test(strona1[3]), '„Więcej” with 1/2');
  await page.screenshot({ path: `work/walka-${tag}-8d-wiecej.png` });
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.wiecej').click());
  await page.waitForTimeout(400);
  const strona2 = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => b.className + ' ' + b.textContent));
  console.log('ring page 2', JSON.stringify(strona2));
  assert(strona2.some((k) => /proba3/.test(k)) && /2\/2/.test(strona2[strona2.length - 1]), 'page 2 shows the rest');
  assert(![...strona1, ...strona2].some((k) => /probaZamk|zamk/.test(k)), 'locked attack never shown');
  await g(() => { window.__ataki.splice(window.__ataki.findIndex((a) => a.id === 'proba1'), 4); const w = window.__game.scene.getScene('game').walka; w.koloWroga = null; w.odswiez(); });
  await g(() => { window.__gear.equip.bron = 'kijek'; });
  await g(() => { window.__game.scene.getScene('game').player.hp = 3; window.__game.scene.getScene('game').walka.odswiez(); });
  await tapScr(await heroScr());
  assert.equal(await page.locator('#walka-kolo .wk-b.lecz.blysk').count(), 1, 'Leczenie glows when hurt');
  await page.screenshot({ path: `work/walka-${tag}-6-kolo-bohatera.png` });
  const h2 = await heroScr();
  await tapScr({ x: h2.x, y: h2.y + 170 });
  const ucieczka = page.locator('#walka-panel .wn-ucieczka');
  if (mobile) await ucieczka.tap(); else await ucieczka.click();
  await page.waitForTimeout(250);
  assert.notEqual(await fight(), null, 'first tap only asks');
  assert.match(await page.locator('#walka-panel .wn-ucieczka').getAttribute('class'), /pyta/);
  await page.screenshot({ path: `work/walka-${tag}-7-ucieczka.png` });
  if (mobile) await ucieczka.tap(); else await ucieczka.click();
  await page.waitForTimeout(250);
  assert.equal(await fight(), null, 'ran away');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`OK nowe sterowanie walki (${tag})`);
} finally {
  await browser.close();
}

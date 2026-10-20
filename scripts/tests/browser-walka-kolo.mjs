// The turn fight's new controls (test server, walka/tryb.ts nowyPanel; ui/walkaKolo.ts): the turn bar at the top
// (a first-fight tip, Uciekaj with „Na pewno?”), moves as ambers under the hero, a tap on an enemy opens its ring
// (Cios / Mocny cios with small amber costs); picking one previews the ambers it spends, „Uderz” carries it out (the
// hero walks up and strikes from close by); short of moves the missing ambers show dashed and nothing happens, a tap on the ground previews a walk and the second walks, a tap on
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
  /** The open ring's buttons vs the other figures on screen: the nearest distance (CSS px) of a button's centre. */
  const odstepKola = () => g(() => {
    const s = window.__game.scene.getScene('game'), w = s.walka, cam = s.cameras.main, r = s.game.canvas.getBoundingClientRect();
    const css = cam.zoom / (s.scale.width / r.width);
    const scr = (x, y) => ({ x: r.left + (x - cam.worldView.x) * css, y: r.top + (y - cam.worldView.y) * css });
    const inni = w.zywi.filter((o) => o !== w.koloWroga && o.e.visible).map((o) => scr(o.e.x, o.e.y - 3));
    if (w.koloWroga) inni.push(scr(s.player.x, s.player.y - 3));
    let min = Infinity;
    for (const b of document.querySelectorAll('#walka-kolo .wk-b')) {
      const q = b.getBoundingClientRect();
      for (const o of inni) min = Math.min(min, Math.hypot(q.left + q.width / 2 - o.x, q.top + q.height / 2 - o.y));
    }
    return Math.round(min);
  });
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
    const pula = document.querySelector('#walka-bursztyny .bz-w').getBoundingClientRect();
    return { tura: el.querySelector('.wn-tura').textContent, kropki: document.querySelectorAll('#walka-bursztyny .bz.pelny').length, pulaY: pula.top, pulaX: (pula.left + pula.right) / 2, staraKropka: !!el.querySelector('.wn-kropki'), rada: !!el.querySelector('.wn-podp.rada'), podp: el.querySelector('.wn-podp').textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right, stare: document.querySelectorAll('.wp-b').length };
  });
  console.log('bar', JSON.stringify(bar));
  assert.equal(bar.tura, 'TWOJA TURA');
  assert.equal(bar.kropki, f.ruchy, 'an amber per move');
  assert.equal(bar.staraKropka, false, 'no dots in the bar');
  const hs = await heroScr();
  assert(bar.pulaY > hs.y && bar.pulaY < hs.y + 80 && Math.abs(bar.pulaX - hs.x) < 30, `ambers under the hero (${JSON.stringify(bar)} hero ${JSON.stringify(hs)})`);
  assert(/^(Dotknij|Kliknij)/.test(bar.podp), 'a short hint');
  assert.equal(bar.rada, true, 'a first-fight tip');
  assert.equal(bar.stare, 0, 'no old buttons');
  assert(bar.top < 20 && bar.bottom < 140, 'the bar is at the top');
  assert(bar.left >= 0 && bar.right <= (mobile ? Number(process.env.SZER || 390) : 1280), 'the bar fits the screen');
  // Nothing open: the hero and attackable enemies pulse by turns; the reachable ground has an edge.
  const zach = await g(() => { const w = window.__game.scene.getScene('game').walka; const z = w.zas; let brzeg = 0; for (const k of z.keys()) { const [i, j] = k.split(',').map(Number); if (!z.has(`${i + 1},${j}`)) brzeg++; } return { brzeg, n: z.size }; });
  assert(zach.brzeg > 3 && zach.brzeg < zach.n, 'an edge of the range');
  // The range is blue smoke (a soft inside + puffs on the edge), not pixel squares.
  const dym = await g(() => { const d = window.__game.scene.getScene('game').walka.dym; return d && { wnetrze: d.wnetrze.visible, kleby: d.kleby.length, widac: d.kleby.filter((k) => k.visible).length }; });
  console.log('range smoke', JSON.stringify(dym));
  assert(dym && dym.wnetrze && dym.kleby > 10 && dym.widac === dym.kleby, 'the range is drawn as smoke');
  // Stage 2: a cost plaque over every enemy.
  const plak = await g(() => { const w = window.__game.scene.getScene('game').walka; return { widac: [...w.plakietki.values()].filter((t) => t.visible).map((t) => t.text), wrogow: w.zywi.length }; });
  console.log('plaques', JSON.stringify(plak));
  assert.equal(plak.widac.length, plak.wrogow, 'a plaque over every enemy');
  await page.screenshot({ path: `work/walka-${tag}-1-start.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `work/walka-${tag}-1b-puls.png` });

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
  const odst1 = await odstepKola();
  console.log('ring clearance', odst1);
  assert(odst1 >= 28, `the ring's buttons keep clear of the other figures (${odst1} px)`);
  console.log('enemy ring', JSON.stringify(ringW));
  assert.equal(ringW.length, 2, 'only the unlocked attacks in the enemy ring (Cios, Mocny cios) – no locked Zamach');
  assert(/\bcios\b.*Atak/.test(ringW[0]) && /\bmocny\b.*Mocny atak/.test(ringW[1]), 'Atak and Mocny atak');
  // Before a pick the cheapest attack pulses slowly.
  assert.equal(await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.zacheta')?.classList.contains('cios')), true, 'Atak pulses as a hint');
  assert(!/%|pokona|Podejdź \+|\d ruch(y|ów)?\b|z podejściem/.test(await page.evaluate(() => document.body.innerText + window.__game.scene.getScene('game').walka.etykieta.text)), 'no percentages, no cost texts');
  const mini = await page.evaluate(() => [...document.querySelectorAll('#walka-kolo .wk-b')].map((b) => ({ k: b.className, bz: b.querySelectorAll('.bz-mini .bz:not(.but)').length, but: b.querySelectorAll('.bz-mini .bz.but').length })));
  console.log('small ambers', JSON.stringify(mini));
  assert.equal(mini[0].bz, 1, 'Cios: one amber');
  assert.equal(mini[1].bz, 2, 'Mocny cios: two ambers');
  const plan = await g(() => { const w = window.__game.scene.getScene('game').walka; return w.planCiosu(w.cel, false); });
  console.log('plan', JSON.stringify(plan));
  assert(plan.ok, 'reachable this turn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `work/walka-${tag}-2-kolo-wroga.png` });
  const cel = { x: t.x, y: t.y };
  const przed = await heroPos();
  if (plan.dojscie) assert(mini[0].but >= 1, 'a walk up shows a boot and its dots');
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.cios').click());
  await page.waitForTimeout(350);
  // Picking is a preview: nothing spent, the ambers that would go pulse, „Uderz” shows.
  const pg = await page.evaluate(() => ({ but: document.querySelectorAll('#walka-bursztyny .bz.but').length, cios: document.querySelectorAll('#walka-bursztyny .bz.cios').length, podp: document.querySelector('#walka-panel .wn-podp').textContent, wybrany: !!document.querySelector('#walka-kolo .wk-b.cios.wybrany'), szybko: document.querySelector('#walka-kolo .wk-b.cios') && getComputedStyle(document.querySelector('#walka-kolo .wk-b.cios')).animationName, stary: !!document.getElementById('walka-uderz') }));
  console.log('preview', JSON.stringify(pg));
  assert.equal((await fight()).ruchy, r0, 'picking an attack spends nothing');
  assert.equal(pg.but + pg.cios, plan.koszt, 'the ambers to be spent pulse');
  assert.equal(pg.cios, 1, 'one for the blow');
  assert.equal(pg.stary, false, 'no „Uderz” button');
  assert.equal(pg.szybko, 'wk-wybrany', 'the picked attack pulses fast');
  assert.match(pg.podp, /jeszcze raz/);
  assert(pg.wybrany, 'the picked attack is marked');
  const numerki = await g(() => window.__game.scene.getScene('game').walka.numerki.filter((t) => t.visible).map((t) => t.text));
  console.log('path numbers', JSON.stringify(numerki));
  if (plan.podejscie) assert.deepEqual(numerki, ['1'], 'a one-move walk up is numbered 1');
  await page.screenshot({ path: `work/walka-${tag}-2a-podglad.png` });
  // The second tap on the same attack attacks.
  if (mobile) await page.locator('#walka-kolo .wk-b.cios').tap({ force: true });
  else await page.locator('#walka-kolo .wk-b.cios').click({ force: true });
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
    if (zrob) { await page.waitForTimeout(100); await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.cios.wybrany:not([aria-disabled="true"])')?.click()); }
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
  // The random group sometimes joins the fight with fewer imps (where it landed): top it up to three, quiet ones.
  await g(() => {
    const s = window.__game.scene.getScene('game'), w = s.walka, p = s.player;
    while (w.zywi.length < 3) {
      const e = s.spawnEnemy(p.x, p.y - 20, undefined, 'glut');
      e.spokojny = true;
      w.u.push({ e, rola: 'wrecz', r: Math.max(3, e.size * 0.7), oglusz: false, hp0: e.hp });
      w.wszyscy.push(e);
    }
  });
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
  console.log('ring clearance (packed)', await odstepKola());
  console.log('ring with zamach', JSON.stringify(ringZ));
  assert(ringZ.some((k) => /zamach/.test(k) ), 'Zamach unlocked');
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.zamach').click());
  await page.waitForTimeout(250);
  // Stage 2: the sweep previewed rings every enemy it would reach – the same list the swing uses.
  const obszar = await g(() => { const w = window.__game.scene.getScene('game').walka, v = w.podgladAtaku(); return w.celeObszaru(v.q, v.atak, v.plan.z ?? w.h.player).length; });
  assert.equal(obszar, 3, 'the sweep preview rings all three');
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
  // Stage 2: an enemy two moves away – the walk up over two moves is numbered 1, 2 and done in one go.
  const daleko = await g(() => {
    const s = window.__game.scene.getScene('game'), w = s.walka, p = s.player;
    w.ruchy = 5; w.maxRuchy = 5; w.koloWroga = null; w.wybranyAtak = null; w.przelicz();
    const krok = 3.4 * 56 * 0.36 * (2 / 3);
    const q = w.zywi[0];
    const zd = w.zasDalej();
    const kom = [...zd.values()].filter((c) => c.d > krok * 1.75 && c.d < krok * 2.0 && Math.hypot(c.x - p.x, c.y - p.y) > krok * 1.2)
      .find((c) => w.zywi.every((o) => o === q || Math.hypot(o.e.x - c.x, o.e.y - c.y) > 25));
    if (!kom) return null;
    q.e.setPosition(kom.x, kom.y);
    w.przelicz();
    const a = w.atakiDostepne()[0];
    const pl = w.planCiosu(q, false, a);
    return { x: q.e.x, y: q.e.y, pod: pl.podejscie, koszt: pl.koszt, ok: pl.ok };
  });
  console.log('two moves away', JSON.stringify(daleko));
  if (daleko) {
    assert.equal(daleko.pod, 2, 'a walk up of two moves');
    assert(daleko.ok, 'affordable with 5 moves');
    await tapWorld(daleko.x, daleko.y - 4);
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.cios').click());
    await page.waitForTimeout(300);
    const nr = await g(() => window.__game.scene.getScene('game').walka.numerki.filter((t) => t.visible).map((t) => t.text));
    console.log('path numbers (2 moves)', JSON.stringify(nr));
    assert.deepEqual(nr, ['1', '2'], 'the walk is numbered 1, 2');
    await page.screenshot({ path: `work/walka-${tag}-7a-dwa-ruchy.png` });
    await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.cios').click());
    await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || !w.busy; }, null, { timeout: 20000 });
    const po = await g(([x, y]) => { const s = window.__game.scene.getScene('game'); return { ruchy: s.walka?.ruchy, d: Math.hypot(s.player.x - x, s.player.y - y) }; }, [daleko.x, daleko.y]);
    console.log('after the long walk up', JSON.stringify(po));
    assert.equal(po.ruchy, 5 - daleko.koszt, 'two moves of walking + the blow spent');
    assert(po.d < 16, 'the hero ended next to it');
  }
  // Short of moves: 1 left, Mocny cios (2) – the amber left blinks, the missing one is a dashed ring, nothing happens.
  await g(() => { const w = window.__game.scene.getScene('game').walka; w.ruchy = 1; w.maxRuchy = 5; w.przelicz(); });
  f = await fight();
  const blisko = near(f, await heroPos());
  await tapWorld(blisko.x, blisko.y - 4);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.mocny').click());
  await page.waitForTimeout(300);
  const krotko = await page.evaluate(() => ({ brak: document.querySelectorAll('#walka-bursztyny .bz.brak').length, miga: document.querySelectorAll('#walka-bursztyny .bz.miga').length, off: document.querySelector('#walka-kolo .wk-b.mocny').getAttribute('aria-disabled'), podp: document.querySelector('#walka-panel .wn-podp').textContent }));
  console.log('short', JSON.stringify(krotko));
  assert(krotko.brak >= 1 && krotko.miga === 1, 'missing ambers dashed, the left one blinks');
  assert.equal(krotko.off, 'true', 'the button greyed');
  assert.match(krotko.podp, /^Brakuje 1 ruchu/);
  await page.screenshot({ path: `work/walka-${tag}-7-brakuje.png` });
  await page.evaluate(() => document.querySelector('#walka-kolo .wk-b.mocny').click());
  await page.waitForTimeout(300);
  assert.equal((await fight()).ruchy, 1, 'a second tap does nothing when short');
  // 7 moves, 2 of them from the hotel/luck: two rows of 4, bright rims; 10 moves: one amber with ×10.
  await g(() => { const w = window.__game.scene.getScene('game').walka; w.koloWroga = null; w.wybranyAtak = null; w.ruchy = 6; w.maxRuchy = 7; w.bonusRuchy = 2; w.przelicz(); });
  const siedem = await page.evaluate(() => ({ n: document.querySelectorAll('#walka-bursztyny .bz').length, bonus: document.querySelectorAll('#walka-bursztyny .bz.bonus').length, kol: getComputedStyle(document.querySelector('#walka-bursztyny .bz-w')).gridTemplateColumns.split(' ').length }));
  console.log('seven', JSON.stringify(siedem));
  assert.deepEqual(siedem, { n: 7, bonus: 2, kol: 4 });
  await page.screenshot({ path: `work/walka-${tag}-7b-siedem.png` });
  await g(() => { const w = window.__game.scene.getScene('game').walka; w.ruchy = 10; w.maxRuchy = 10; w.bonusRuchy = 0; w.przelicz(); });
  assert.match(await page.evaluate(() => document.querySelector('#walka-bursztyny').textContent), /×10/);
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

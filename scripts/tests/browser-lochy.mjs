// Lochy (content/lochy.ts, src/loch/, scenes/Lochy.ts) + trzeci stopień przybliżenia (screen.ts):
//  - zoom: zwykły → ~30 % → 2× → zwykły (klawisz Z),
//  - zejście na cmentarzu i za świątynią widać na mapie, E (podwójne dotknięcie) pyta, „Schodzę” – osobna mapa lochu,
//  - w lochu: ciemno (lampa, pochodnie), potwory w komnatach walczą jak w „nowej walce”, skrzynia zamknięta, dopóki żyje
//    strażnik, potem otwarta raz; zapis w lochu trzyma miejsce przy wejściu; schody w górę wracają przy wejściu.
// Serwer udawany (route), mapa Lublina.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-lochy.mjs   (TELEFON=1)
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
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  const saves = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) {
      try { saves.push(JSON.parse(req.postData() ?? '{}')); } catch { /* ignore */ }
      body = true;
    }
    if (path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_/.test(m.text()) && errors.push(m.text()));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const hook = () => g(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    if (s.__hooked) return;
    s.__hooked = true;
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
    window.__toasty = [];
    const ot = s.toast.bind(s);
    s.toast = (t, ms) => { window.__toasty.push(t); return ot(t, ms); };
  });
  const wybierz = (i) => g((k) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(k); }, i);

  // 1. Zoom: three steps (key Z; the first press may still meet the loading cover, so step until it moves).
  const zoom = () => g(() => window.__game.scene.getScene('game').cameras.main.zoomX);
  const z0 = await zoom();
  const kroki = [];
  for (let i = 0; i < 3; i++) {
    const przed = await zoom();
    for (let t = 0; t < 10 && (await zoom()) === przed; t++) {
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(400);
    }
    kroki.push(await zoom());
    if (i === 1) await page.screenshot({ path: `work/lochy-${tag}-zoom2.png` });
  }
  const [z1, z2, z3] = kroki;
  console.log('zoom', z0, z1, z2, z3);
  assert(z1 > z0 && z1 < z2, 'step 1 closer than usual');
  assert.equal(z2, z0 * 2, 'step 2 twice as close');
  assert.equal(z3, z0, 'back to the usual');

  // 2. The crypt by a cemetery (Cmentarz przy ul. Lipowej).
  await hook();
  await g(async () => {
    const s = window.__game.scene.getScene('game');
    const p = s.city.fromLatLon(51.2446, 22.5545);
    await s.city.ensure(p.x, p.y, 1200);
    s.player.setPosition(p.x, p.y);
  });
  await page.waitForFunction(() => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.rodzaj === 'krypta'), null, { timeout: 60000 });
  const wej = await g(() => {
    const s = window.__game.scene.getScene('game');
    const l = s.lochy.lista;
    const k = l.filter((w) => w.rodzaj === 'krypta').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    return { k, wszystkie: l.map((w) => w.rodzaj), podziemia: l.filter((w) => w.rodzaj === 'podziemia').length };
  });
  console.log('zejścia', JSON.stringify(wej));
  // Behind every second church: some found around (Śródmieście has many).
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 10); }, [wej.k.x, wej.k.y]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `work/lochy-${tag}-wejscie.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.length > 0, null, { timeout: 10000 });
  const d1 = await g(() => ({ title: window.__dialogi.at(-1).title, buttons: window.__dialogi.at(-1).buttons }));
  console.log('pytanie', JSON.stringify(d1));
  assert(/Krypta/.test(d1.title), 'the crypt asks first');
  const zapisowPrzed = saves.length;
  await wybierz(0);
  await page.waitForFunction(() => window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await hook();
  const wLochu = await g(() => {
    const s = window.__game.scene.getScene('game');
    return { id: s.city.id, enemies: s.enemies.length, zostalo: s.loch.zostalo, hero: { x: s.player.x, y: s.player.y }, blocked: s.city.isBlocked(s.player.x, s.player.y), lamp: s.weatherFx.lamp.visible, fogDark: s.fogView.podZiemia };
  });
  console.log('w lochu', JSON.stringify(wLochu));
  assert(wLochu.id.startsWith('loch:krypta:'), 'on the dungeon map');
  assert(!wLochu.blocked, 'the hero stands on the floor');
  assert(wLochu.enemies >= 3 && wLochu.enemies === wLochu.zostalo, 'monsters in the chambers');
  assert(wLochu.lamp && wLochu.fogDark, 'dark: the lamp burns');
  assert(saves.length > zapisowPrzed, 'saved before going down');
  const ostatni = saves.at(-1);
  console.log('zapis tu', JSON.stringify(ostatni?.p_save?.tu ?? ostatni?.tu ?? null));
  await page.screenshot({ path: `work/lochy-${tag}-start.png` });
  // The camera keeps the hero in the middle even at the maze's edge (owner, 27 Oct 2026: he drifted under the HUD).
  await g(() => { const s = window.__game.scene.getScene('game'); const p = s.loch.plan; const k = p.komnaty.reduce((a, b) => (b.cx + b.cy < a.cx + a.cy ? b : a)); s.player.setPosition((k.cx + 0.5) * p.T, (k.cy + 0.5) * p.T); });
  await page.waitForTimeout(5000);
  const srodek = await g(() => { const s = window.__game.scene.getScene('game'); const m = s.cameras.main.midPoint; return { dx: m.x - s.player.x, dy: m.y - s.player.y, stopien: s.loch.plan.stopien }; });
  console.log('kamera', JSON.stringify(srodek));
  assert(Math.abs(srodek.dx) < 6 && Math.abs(srodek.dy) < 6, 'hero centred at the maze corner');
  assert(/:p1-\d+:/.test(wLochu.id), 'the id carries the floor');

  // 3. A fight: next to the nearest monster for a while (StworAI telegraphs).
  await g(() => {
    const s = window.__game.scene.getScene('game');
    const e = s.enemies.filter((q) => !q.isDead).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    s.player.setPosition(e.x + 20, e.y);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `work/lochy-${tag}-walka.png` });
  const ai = await g(() => window.__game.scene.getScene('game').wilki.size);
  console.log('stworki z AI', ai);
  assert(ai >= 1, 'monsters fight the new way (StworAI)');

  // 4. The chest is guarded until the guardian falls.
  const skrzynia = await g(() => { const s = window.__game.scene.getScene('game'); return { ...s.loch.skrzynia, pow: s.loch.skrzyniaPowod() }; });
  assert.equal(skrzynia.pow, 'pilnowana');
  await g(() => {
    const s = window.__game.scene.getScene('game');
    s.protectUntil = Infinity;
    for (const e of [...s.enemies]) { e.isDead = true; s.onEnemyKilled(e); e.destroy(); }
  });
  assert.equal(await g(() => window.__game.scene.getScene('game').loch.zostalo), 0, 'all monsters beaten');
  const coins0 = await g(() => window.__session.coins);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 12); }, [skrzynia.x, skrzynia.y]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `work/lochy-${tag}-skrzynia.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /Skrzynia/.test(d.title)), null, { timeout: 10000 }).catch(async () => {
    console.log('diagnoza', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); const h = s.player.hitPoint(); return { toasty: window.__toasty, przy: s.loch.przy(h.x, h.y), hp: [h.x, h.y], gracz: [s.player.x, s.player.y], sk: s.loch.skrzynia, pow: s.loch.skrzyniaPowod(), aktywna: window.__game.scene.isActive('game'), ui: window.__game.scene.getScene('ui').hasDialog }; })));
    throw new Error('skrzynia się nie otworzyła');
  });
  const nagroda = await g(() => window.__dialogi.at(-1).text);
  console.log('skrzynia', JSON.stringify(nagroda));
  await wybierz(0);
  const coins1 = await g(() => window.__session.coins);
  assert(coins1 > coins0, 'gold from the chest');
  assert.equal(await g(() => window.__session.stats.lochy), 1);
  await page.waitForTimeout(800);
  const tu = saves.at(-1)?.p_save?.tu ?? null;
  console.log('zapis w lochu → tu', JSON.stringify(tu));
  if (tu) assert(!String(tu.m).startsWith('loch:'), 'a save in a dungeon keeps the entrance on the surface');

  // 4b. Floors (owner, 27 Oct 2026: number of floors by difficulty, each harder): the stairs down by the chest lead
  //     to floor 2 (a more tangled maze, more monsters, a stronger boss); its stairs up come back by floor 1's stairs down.
  const p1 = await g(() => { const s = window.__game.scene.getScene('game'); const p = s.loch.plan; return { pietro: p.pietro, pieter: p.pieter, dol: s.loch.schodyDol, potworow: s.loch.zostalo }; });
  console.log('piętro 1', JSON.stringify(p1));
  assert.equal(p1.pieter, 5, 'Średni: 5 floors (2 × 1.5 rounded up… 3 × 1.5 = 4.5 → 5)');
  assert(p1.dol, 'stairs down on floor 1');
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 4); }, [p1.dol.x, p1.dol.y]);
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /w dół/.test(d.title)), null, { timeout: 10000 });
  await wybierz(0);
  await page.waitForFunction(() => /:p2-5:/.test(window.__game.scene.getScene('game').city?.id ?? '') && window.__game.scene.isActive('game'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await hook();
  const p2 = await g(() => { const s = window.__game.scene.getScene('game'); const p = s.loch.plan; return { id: s.city.id, pietro: p.pietro, komnat: p.komnaty.length, potworow: s.loch.zostalo, blocked: s.city.isBlocked(s.player.x, s.player.y) }; });
  console.log('piętro 2', JSON.stringify(p2));
  assert.equal(p2.pietro, 2);
  assert(!p2.blocked, 'on the floor at floor 2');
  await page.screenshot({ path: `work/lochy-${tag}-pietro2.png` });
  const sch2 = await g(() => window.__game.scene.getScene('game').loch.schody);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 8); }, [sch2.x, sch2.y]);
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /w górę/.test(d.title)), null, { timeout: 10000 });
  await wybierz(0);
  await page.waitForFunction(() => /:p1-5:/.test(window.__game.scene.getScene('game').city?.id ?? '') && window.__game.scene.isActive('game'), null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await hook();
  const wrocil = await g(() => { const s = window.__game.scene.getScene('game'); const d = s.loch.schodyDol; return { d: Math.hypot(s.player.x - d.x, s.player.y - d.y), blocked: s.city.isBlocked(s.player.x, s.player.y), skrzynia: s.loch.skrzyniaPowod() }; });
  console.log('z powrotem na 1.', JSON.stringify(wrocil));
  assert(wrocil.d < 60 && !wrocil.blocked, 'back up by floor 1\'s stairs down');
  assert.equal(wrocil.skrzynia, 'pusta', 'floor 1 remembers its opened chest');

  // 5. Up the stairs: back by the entrance.
  const schody = await g(() => window.__game.scene.getScene('game').loch.schody);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 8); }, [schody.x, schody.y]);
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /Schody/.test(d.title)), null, { timeout: 10000 });
  await wybierz(0);
  await page.waitForFunction(() => !window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const gora = await g(() => { const s = window.__game.scene.getScene('game'); return { id: s.city.id, x: s.player.x, y: s.player.y }; });
  console.log('na górze', JSON.stringify(gora));
  assert.equal(gora.id, 'lublin');
  assert(Math.hypot(gora.x - wej.k.x, gora.y - wej.k.y) < 60, 'back by the entrance');
  await page.screenshot({ path: `work/lochy-${tag}-powrot.png` });

  // Fog lifted around the hero for a screenshot (the test jumps to places nobody has walked yet).
  const odkryj = () => g(() => {
    const s = window.__game.scene.getScene('game');
    for (let dy = -260; dy <= 260; dy += 3) for (let dx = -360; dx <= 360; dx += 3) s.explored.mark(s.player.x + dx, s.player.y + dy);
    s.lastVision = { x: NaN, y: NaN, a: NaN };
  });

  // 6. Cmentarz przy Unickiej (owner: „narysowałeś park”): graves drawn, a crypt there.
  await g(async () => {
    const s = window.__game.scene.getScene('game');
    const p = s.city.fromLatLon(51.2589, 22.5770);
    await s.city.ensure(p.x, p.y, 1500);
    s.player.setPosition(p.x, p.y);
  });
  await page.waitForFunction(() => {
    const s = window.__game.scene.getScene('game');
    return (s.lochy?.lista ?? []).some((w) => w.rodzaj === 'krypta' && Math.hypot(w.x - s.player.x, w.y - s.player.y) < 300);
  }, null, { timeout: 60000 });
  const unicka = await g(() => { const s = window.__game.scene.getScene('game'); return { kinds: s.city.areaKindsAt(s.player.x, s.player.y), w: s.lochy.lista.find((w) => w.rodzaj === 'krypta' && Math.hypot(w.x - s.player.x, w.y - s.player.y) < 300) }; });
  console.log('Unicka', JSON.stringify(unicka));
  assert(unicka.kinds.includes('cemetery'), 'Unicka is a cemetery on the map');
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 8); }, [unicka.w.x, unicka.w.y]);
  await odkryj();
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady(), null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `work/lochy-${tag}-unicka.png` });

  // 7. Catacombs: every big church (≥ LOCH.kosciolOdM2), never a chapel.
  await g(async () => {
    const s = window.__game.scene.getScene('game');
    const p = s.city.fromLatLon(51.2472, 22.5682);
    await s.city.ensure(p.x, p.y, 1500);
    s.player.setPosition(p.x, p.y);
  });
  await page.waitForFunction(() => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.rodzaj === 'podziemia' && /Archikatedra/.test(w.przy ?? '')), null, { timeout: 60000 });
  const pod = await g(() => window.__game.scene.getScene('game').lochy.lista.filter((w) => w.rodzaj === 'podziemia').map((w) => w.przy));
  console.log('katakumby', JSON.stringify(pod));
  assert(!pod.some((n) => /Kaplica/i.test(n)), 'no chapel has catacombs');
  // Every big church already looked at (its tiles in) has its catacombs.
  const brak = await g(() => {
    const s = window.__game.scene.getScene('game');
    const pole = (r) => { let a = 0; for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return Math.abs(a) / 2; };
    const M = 1.92, R = 900 * M;
    const maja = new Set(s.lochy.lista.filter((w) => w.rodzaj === 'podziemia').map((w) => w.przy));
    return s.city.places.filter((p) => p.kind === 'church' && p.building?.rings?.length && !/kaplic|chapel|kapell/i.test(p.name)
      && Math.abs(p.door.x - s.player.x) < R && Math.abs(p.door.y - s.player.y) < R
      && s.city.ready({ x0: p.door.x - 60, y0: p.door.y - 60, x1: p.door.x + 60, y1: p.door.y + 60 })
      && pole(p.building.rings[0]) / (M * M) >= 1200 && !maja.has(p.name)).map((p) => p.name);
  });
  console.log('duże bez katakumb', JSON.stringify(brak));
  assert.equal(brak.length, 0, 'every big church has catacombs');
  const pw = await g(() => { const s = window.__game.scene.getScene('game'); return s.lochy.lista.find((w) => w.rodzaj === 'podziemia' && /Archikatedra/.test(w.przy ?? '')); });
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 8); }, [pw.x, pw.y]);
  await odkryj();
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady(), null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `work/lochy-${tag}-katedra.png` });
  await hook();
  // Two quick attacks open it (owner: „akcja ma być wyzwalana dwukrotnym atakiem”): the ATTACK button on a phone, Space on a computer.
  await page.waitForTimeout(800);
  if (mobile) {
    const b = await page.locator('#hud-ster .hs-atak').boundingBox();
    for (let i = 0; i < 2; i++) {
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(120);
    }
  } else {
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    await page.keyboard.press('Space');
  }
  await page.waitForFunction(() => window.__dialogi.some((d) => /Katakumby/.test(d.title)), null, { timeout: 10000 }).catch(async () => {
    console.log('diagnoza', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); const h = s.player.hitPoint(); return { toasty: window.__toasty, dialogi: window.__dialogi.map((d) => d.title), przy: s.lochy.przy(s.player.x, s.player.y), gracz: [s.player.x, s.player.y], ui: window.__game.scene.getScene('ui').hasDialog, aktywna: window.__game.scene.isActive('game'), walka: s.inCombat(), siatka: (() => { const w = s.lochy.lista.find((q) => /Archikatedra/.test(q.przy ?? '')); const rows = []; for (let dy = -15; dy <= 21; dy += 3) { let r = ''; for (let dx = -15; dx <= 15; dx += 3) r += s.city.isBlocked(w.x + dx, w.y + dy) ? '#' : (dx === 0 && dy === 0 ? 'o' : '.'); rows.push(r); } return rows; })() }; })));
    throw new Error('katakumby się nie otworzyły');
  });
  console.log('pytanie', JSON.stringify(await g(() => window.__dialogi.at(-1).title)));
  // 8. The escape button in the Kufer (owner: „przycisk ucieczki z lochu, np. w eq”): straight up from the catacombs.
  await wybierz(0);
  await page.waitForFunction(() => window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await g(() => window.__game.scene.getScene('ui').openCharacter('eq'));
  await page.waitForSelector('#character .k-ucieczka', { timeout: 10000 }).catch(async (e) => {
    await page.screenshot({ path: `work/lochy-${tag}-ucieczka-blad.png` });
    console.log('kufer', JSON.stringify(await g(() => ({ html: document.querySelector('#character')?.className, przyciski: [...document.querySelectorAll('#character button')].map((b) => b.textContent), ui: window.__game.scene.getScene('ui').hasDialog, loch: !!window.__game.scene.getScene('game').city?.loch }))));
    throw e;
  });
  await page.screenshot({ path: `work/lochy-${tag}-ucieczka.png` });
  await page.click('#character .k-ucieczka');
  await page.waitForFunction(() => !window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game'), null, { timeout: 60000 });
  const poUcieczce = await g(() => { const s = window.__game.scene.getScene('game'); return { id: s.city.id, x: s.player.x, y: s.player.y }; });
  console.log('po ucieczce', JSON.stringify(poUcieczce));
  assert.equal(poUcieczce.id, 'lublin');
  assert(Math.hypot(poUcieczce.x - pw.x, poUcieczce.y - pw.y) < 60, 'escaped by the catacombs\' entrance');

  const zle = errors.filter((e) => !/Failed to fetch|NetworkError|ERR_/.test(e));
  console.log('błędy', JSON.stringify(zle));
  assert.equal(zle.length, 0, 'no page errors');
  console.log('OK');
} finally {
  await browser.close();
}

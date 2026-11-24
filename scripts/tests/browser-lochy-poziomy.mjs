// Poziomy lochu (owner, 24 Nov 2026): loch z 5 zwykłymi poziomami + ukrytym szóstym za luźną ścianą.
//  - poziom 1: zejście w najdalszej komnacie, bez skrzyni; przycisk ucieczki dopiero po 10 s,
//  - E przy zejściu → pytanie → poziom -2 (id …:p2),
//  - poziom -5: luźna ściana (bez nazwy, bez paska życia), 3 ciosy → zejście; poziom -6 ze skrzynią,
//  - schody w górę z -6 → -5 przy ukrytym zejściu,
//  - ucieczka: pytanie, animacja biegnącego ludzika, po ≥ 5 s na powierzchni przy wejściu.
// Serwer udawany (route), mapa Lublina.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-lochy-poziomy.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ziarno } from './lochy-ziarna.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/lochy-poziomy', { recursive: true });
const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'tel' : 'pc';
const SEED = ziarno('krypta', 5, true);
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => { errors.push(e.message); console.log('STACK', e.stack); });
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_/.test(m.text()) && errors.push(m.text()));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const hook = () => g(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    window.__toasty = window.__toasty ?? [];
    if (s.__hooked) return;
    s.__hooked = true;
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
    const ot = s.toast.bind(s);
    s.toast = (t, ms) => { window.__toasty.push(t); return ot(t, ms); };
  });
  const wybierz = (i) => g((k) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(k); }, i);
  const czekajNaPoziom = (n) => page.waitForFunction((n) => { const s = window.__game.scene.getScene('game'); return window.__game.scene.isActive('game') && s.city?.loch?.poziom === n && s.loch && !s.travelling; }, n, { timeout: 30000 });
  const stan = () => g(() => { const s = window.__game.scene.getScene('game'), p = s.city.loch; return { id: s.city.id, poziom: p.poziom, ukryty: p.ukrytyPoziom, chest: s.loch.skrzyniaPowod(), zejscie: s.loch.zejscie, ukryte: p.ukryte, start: p.start, T: p.T, hero: { x: s.player.x, y: s.player.y }, blocked: s.city.isBlocked(s.player.x, s.player.y), nazwa: s.loch.nazwaPoziomu, potwory: s.enemies.filter((e) => !e.isDead).map((e) => e.hp) }; });
  const spokoj = () => g(() => { const s = window.__game.scene.getScene('game'); s.protectUntil = Infinity; for (const e of [...s.enemies]) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); } });

  // 1. The crypt by Lipowa, its seed swapped for one with 5 + hidden levels.
  await hook();
  await g(async () => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(51.2446, 22.5545); await s.city.ensure(p.x, p.y, 1200); s.player.setPosition(p.x, p.y); });
  await page.waitForFunction(() => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.rodzaj === 'krypta'), null, { timeout: 60000 });
  const wej = await g((seed) => {
    const s = window.__game.scene.getScene('game');
    const w = s.lochy.lista.filter((q) => q.rodzaj === 'krypta').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    w.seed = seed;
    s.player.setPosition(w.x, w.y + 10);
    return { x: w.x, y: w.y };
  }, SEED);
  await page.waitForTimeout(1200);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.length > 0, null, { timeout: 10000 });
  const t0 = Date.now();
  await wybierz(0);
  await czekajNaPoziom(1);
  await hook();
  const p1 = await stan();
  console.log('poziom 1', JSON.stringify({ id: p1.id, chest: p1.chest, zejscie: p1.zejscie, potwory: p1.potwory.length }));
  assert(!/:p\d/.test(p1.id), 'level 1 keeps the old id');
  assert.equal(p1.chest, 'brak', 'no chest above the last level');
  assert(p1.zejscie, 'a way down on level 1');
  assert(!p1.blocked, 'on the floor');
  assert(!(await page.locator('#loch-wyjscie.on').isVisible()), 'no escape button right after arriving');
  await page.waitForFunction(() => !!document.querySelector('#loch-wyjscie.on'), null, { timeout: 20000 });
  const poIleS = (Date.now() - t0) / 1000;
  console.log('przycisk po', poIleS.toFixed(1), 's');
  assert(poIleS >= 9, 'escape button only after ~10 s');
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-1-przycisk.png` });

  // 2. Down the stairs in the farthest chamber.
  await spokoj();
  await g(([x, y]) => window.__game.scene.getScene('game').player.setPosition(x, y + 14), [p1.zejscie.x, p1.zejscie.y]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-1-zejscie.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /głąb/.test(d.title)), null, { timeout: 10000 });
  console.log('pytanie', JSON.stringify(await g(() => window.__dialogi.at(-1).text)));
  await wybierz(0);
  await czekajNaPoziom(2);
  await hook();
  const p2 = await stan();
  console.log('poziom 2', JSON.stringify({ id: p2.id, nazwa: p2.nazwa, hp: p2.potwory.slice(0, 3) }));
  assert(/:p2$/.test(p2.id), 'level 2 has its own id');
  assert(/poziom -2/.test(p2.nazwa));

  // 3. Level -5: the loose wall.
  await g(() => window.__game.scene.getScene('game').przejdzPoziom(5));
  await czekajNaPoziom(5);
  await hook();
  await spokoj();
  const p5 = await stan();
  console.log('poziom 5', JSON.stringify({ chest: p5.chest, zejscie: p5.zejscie, ukryte: p5.ukryte }));
  assert(p5.ukryte, 'a hidden spot on the last ordinary level');
  assert.equal(p5.zejscie, null, 'hidden way down closed at first');
  assert.notEqual(p5.chest, 'brak', 'the last ordinary level has its chest');
  const gruz = await g(() => { const s = window.__game.scene.getScene('game'); const o = s.children.list.find((q) => q.texture?.key?.startsWith('loch-gruz-')); return o ? { x: o.x, y: o.y, frame: o.frame.name } : null; });
  assert(gruz, 'the loose wall is drawn');
  const ux = (p5.ukryte.x + 0.5) * p5.T, uy = (p5.ukryte.y + 2.5) * p5.T;
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.player.face?.(0, -1); }, [ux, uy]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-5-sciana.png` });
  for (let i = 0; i < 3; i++) {
    await g(() => { const s = window.__game.scene.getScene('game'); const p = s.player; s.resolveAttack({ x: p.x, y: p.y - 14 }, s.time.now); });
    await page.waitForTimeout(500);
    if (i === 1) await page.screenshot({ path: `work/lochy-poziomy/${tag}-5-peka.png` });
  }
  await page.waitForTimeout(800);
  const po = await stan();
  console.log('po 3 ciosach', JSON.stringify(po.zejscie), JSON.stringify(await g(() => window.__toasty.slice(-3))));
  assert(po.zejscie, 'three blows open the hidden way down');
  assert(!(await g(() => window.__game.scene.getScene('game').children.list.some((q) => q.texture?.key?.startsWith('loch-gruz-')))), 'the wall is gone');
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-5-odkryte.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /głąb/.test(d.title) && /-6/.test(d.text)), null, { timeout: 10000 });
  await wybierz(0);
  await czekajNaPoziom(6);
  await hook();
  const p6 = await stan();
  console.log('poziom 6', JSON.stringify({ id: p6.id, ukryty: p6.ukryty, chest: p6.chest, nazwa: p6.nazwa }));
  assert(p6.ukryty, 'the hidden level');
  assert.equal(p6.chest, 'pilnowana', 'a guarded chest on the hidden level');
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-6.png` });

  // 4. Up again: arrive by the hidden way down on -5.
  await spokoj();
  const sch = await g(() => window.__game.scene.getScene('game').loch.schody);
  await g(([x, y]) => window.__game.scene.getScene('game').player.setPosition(x, y + 10), [sch.x, sch.y]);
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /górę/.test(d.title)), null, { timeout: 10000 });
  await wybierz(0);
  await czekajNaPoziom(5);
  await hook();
  const z6 = await stan();
  console.log('z powrotem na -5', JSON.stringify(z6.hero), 'ukryte', JSON.stringify(z6.ukryte));
  assert(Math.hypot(z6.hero.x - (z6.ukryte.x + 0.5) * z6.T, z6.hero.y - (z6.ukryte.y + 0.5) * z6.T) < 4 * z6.T, 'arrived by the hidden stairs');
  assert(z6.zejscie, 'the wall stays broken this login');

  // 5. Escape: question, running animation, surface after ≥ 5 s.
  await page.waitForFunction(() => !!document.querySelector('#loch-wyjscie.on'), null, { timeout: 20000 });
  await page.locator('#loch-wyjscie').click();
  await page.waitForFunction(() => window.__dialogi.some((d) => /Ucieczka/.test(d.title)), null, { timeout: 10000 });
  const u0 = Date.now();
  await wybierz(0);
  await page.waitForFunction(() => !!document.getElementById('loch-ucieczka'), null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `work/lochy-poziomy/${tag}-ucieczka.png` });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return !s.city?.loch && window.__game.scene.isActive('game'); }, null, { timeout: 60000 });
  const uMs = Date.now() - u0;
  await page.waitForFunction(() => !document.getElementById('loch-ucieczka'), null, { timeout: 10000 });
  const gora = await g(() => { const s = window.__game.scene.getScene('game'); return { id: s.city.id, x: s.player.x, y: s.player.y }; });
  console.log('ucieczka trwała', uMs, 'ms, na górze', JSON.stringify(gora));
  assert(uMs >= 4900, 'the escape takes at least 5 s');
  assert.equal(gora.id, 'lublin');
  assert(Math.hypot(gora.x - wej.x, gora.y - wej.y) < 60, 'back by the entrance');
  assert.equal(await page.locator('#loch-wyjscie').count(), 0, 'no escape button on the surface');

  const zle = errors.filter((e) => !/Failed to fetch|NetworkError|ERR_/.test(e));
  console.log('błędy', JSON.stringify(zle));
  assert.equal(zle.length, 0, 'no page errors');
  console.log('OK');
} finally {
  await browser.close();
}

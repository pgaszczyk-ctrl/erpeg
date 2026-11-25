// Jaskinie i kopalnie (właściciel, 25.11.2026; content/kopalnie.ts):
//  - mała stara sztolnia w Starym Gaju (Lublin): wejście na powierzchni, zejście, 1 poziom (id …:km), żyły rudy,
//    kilof → 5 ciosów → grudka w plecaku, skrzynia w leżu bez zejścia niżej,
//  - Kopalnia Bogdanka (wielka, 5 poziomów, region węglowy: węgiel w żyłach) – zejście przez to samo wejście,
//  - losowe jaskinie/kopalnie w okolicy (tylko liczone).
// Serwer udawany (route), mapa Lublina.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-kopalnie.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/kopalnie', { recursive: true });
const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'tel' : 'pc';
const PORT = process.env.PORT || 4173;
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 }, flagi: { samouczek: 1 } }, exp: 400, dead: false, died_at: null, age: 12 } };
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
  await page.goto(`http://127.0.0.1:${PORT}/?lang=pl&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA`);
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
  });
  const wybierz = (i) => g((k) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(k); }, i);
  const wLochu = () => page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return window.__game.scene.isActive('game') && s.loch && !s.travelling && s.firstViewReady?.(); }, null, { timeout: 60000 });
  const spokoj = () => g(() => { const s = window.__game.scene.getScene('game'); s.protectUntil = Infinity; for (const e of [...s.enemies]) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); } });

  // 1. Stara sztolnia w Starym Gaju.
  await hook();
  await g(async () => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(51.2058, 22.489); await s.city.ensure(p.x, p.y, 1500); s.player.setPosition(p.x, p.y + 40); });
  await page.waitForFunction(() => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.id.endsWith('stala:stary-gaj')), null, { timeout: 60000 });
  const wej = await g(() => {
    const s = window.__game.scene.getScene('game');
    const w = s.lochy.lista.find((q) => q.id.endsWith('stala:stary-gaj'));
    s.player.setPosition(w.x, w.y + 10);
    const ll = s.city.toLatLon(w.x, w.y);
    const losowe = s.lochy.lista.filter((q) => /:jaskinia:\d/.test(q.id)).map((q) => q.rodzaj + '/' + q.skala);
    return { ...w, ll, losowe };
  });
  console.log('wejście', JSON.stringify({ nazwa: wej.nazwa, skala: wej.skala, rodzaj: wej.rodzaj, ll: wej.ll, losowe: wej.losowe }));
  assert.equal(wej.rodzaj, 'kopalnia');
  assert.equal(wej.skala, 'maly');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `work/kopalnie/${tag}-1-wejscie.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.length > 0, null, { timeout: 4000 }).catch(async () => {
    console.log('E nie otworzyło – cele:', await g(() => window.__game.scene.getScene('game').interactionCandidates().map((t) => t.id).join(',')));
    await g(() => { const s = window.__game.scene.getScene('game'); const w = s.lochy.lista.find((q) => q.id.endsWith('stala:stary-gaj')); s.talkReadyAt = 0; s.lochDotyk(new s.player.vel.constructor(w.x, w.y), w); });
  });
  await page.waitForFunction(() => window.__dialogi.length > 0, null, { timeout: 5000 });
  const d1 = await g(() => window.__dialogi.at(-1).title);
  assert.match(d1, /Starym Gaju/);
  await wybierz(0);
  await wLochu();
  await hook();
  await spokoj();
  const st = await g(() => { const s = window.__game.scene.getScene('game'), p = s.city.loch; return { id: s.city.id, poziom: p.poziom, normalne: p.normalne, zyly: p.zyly.length, rodzaje: p.zyly.map((z) => z.s), chest: s.loch.skrzyniaPowod(), zejscie: s.loch.zejscie, nazwa: s.loch.nazwaPoziomu, w: p.w, h: p.h }; });
  console.log('sztolnia', JSON.stringify(st));
  assert.match(st.id, /^loch:kopalnia:512031:.*:km$/);
  assert.equal(st.normalne, 1);
  assert(st.zyly > 0, 'veins');
  assert.equal(st.zejscie, null);
  assert.match(st.nazwa, /Starym Gaju/);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `work/kopalnie/${tag}-2-sztolnia.png` });

  // Kilof i kopanie żyły: 5 ciosów → grudka.
  const przed = await g(() => {
    const s = window.__game.scene.getScene('game'), z = s.loch.zyly[0];
    window.__inv.addItem('kilof');
    s.player.setPosition(z.x, z.y + s.city.loch.T * 1.2);
    s.player.face?.(0, -1);
    return { s: z.s, n: window.__inv.fruitCount(z.s) };
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `work/kopalnie/${tag}-3-zyla.png` });
  for (let i = 0; i < 6; i++) { await g(() => { const s = window.__game.scene.getScene('game'); s.kopZyle(s.loch.zyly[0]); }); await page.waitForTimeout(450); }
  const po = await g((sw) => window.__inv.fruitCount(sw), przed.s);
  console.log('kopanie', przed.s, przed.n, '→', po);
  assert.equal(po, przed.n + 1, 'one nugget after 5 blows');
  // Kopanie ciosem (atak w stronę żyły) też działa.
  for (let i = 0; i < 5; i++) { await g(() => { const s = window.__game.scene.getScene('game'); const z = s.loch.zyly[0]; s.mineReady = 0; s.resolveAttack(new s.player.vel.constructor(z.x, z.y + 4), s.time.now, false); }); await page.waitForTimeout(450); }
  const po2 = await g((sw) => window.__inv.fruitCount(sw), przed.s);
  console.log('kopanie ciosem', po, '→', po2);
  assert.equal(po2, po + 1, 'a swing at the vein mines too');

  // 2. Kopalnia Bogdanka (wielka) – zejście przez sztuczne wejście (Bogdanka leży na mapie świata).
  await g(() => { const s = window.__game.scene.getScene('game'); s.travelling = false; s.wyjdzZLochu(); });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return window.__game.scene.isActive('game') && !s.loch && s.lochy && !s.travelling; }, null, { timeout: 60000 });
  await hook();
  await g(() => { const s = window.__game.scene.getScene('game'); s.zejdzDoLochu({ id: 'test:bogdanka', rodzaj: 'kopalnia', x: s.player.x, y: s.player.y, seed: 512017, skala: 'wielki', nazwa: 'Kopalnia Bogdanka' }); });
  await wLochu();
  await hook();
  await spokoj();
  const b = await g(() => { const s = window.__game.scene.getScene('game'), p = s.city.loch; const c = {}; for (const z of p.zyly) c[z.s] = (c[z.s] ?? 0) + 1; return { id: s.city.id, normalne: p.normalne, zyly: c, w: p.w, h: p.h, nazwa: s.loch.nazwaPoziomu, zejscie: !!s.loch.zejscie, potwory: s.enemies.length }; });
  console.log('Bogdanka', JSON.stringify(b));
  assert.match(b.id, /:kw$/);
  assert.equal(b.normalne, 5);
  assert(b.zejscie, 'way down on level 1');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `work/kopalnie/${tag}-4-bogdanka.png` });
  await g(() => { const s = window.__game.scene.getScene('game'); s.cameras.main.setZoom(0.5); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `work/kopalnie/${tag}-5-bogdanka-z-daleka.png` });
  console.log('błędy', errors);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('OK');
} finally {
  await browser.close();
}

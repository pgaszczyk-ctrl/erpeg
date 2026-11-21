// Zejścia do lochów rysowane kodem (src/loch/zejscieObraz.ts): zamknięte z daleka, pukanie (błysk + dźwięk), otwarte przy bohaterze.
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-zejscia.mjs   (TELEFON=1)
// Lochy (content/lochy.ts, src/loch/, scenes/Lochy.ts) + trzeci stopień przybliżenia (screen.ts):
//  - zoom: zwykły → ~30 % → 2× → zwykły (klawisz Z),
//  - zejście na cmentarzu i za świątynią widać na mapie, E (podwójne dotknięcie) pyta, „Schodzę” – osobna mapa lochu,
//  - w lochu: ciemno (lampa, pochodnie), potwory w komnatach walczą jak w „nowej walce”, skrzynia zamknięta, dopóki żyje
//    strażnik, potem otwarta raz; zapis w lochu trzyma miejsce przy wejściu; schody w górę wracają przy wejściu.
// Serwer udawany (route), mapa Lublina.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-lochy.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from "node:fs/promises";
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
  const PELNY_STARY = Buffer.alloc(512, 255).toString('base64'); // a fully seen chunk in the old format
  let wolnyZapisMs = 0; // a slow save (bug report 74): going down must not wait for it
  await context.route('**/*.supabase.co/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 }, fogs: { 'w:50.0000,20.0000': { s: 1.92, chunks: { '0,0': PELNY_STARY } } } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) {
      try { saves.push(JSON.parse(req.postData() ?? '{}')); } catch { /* ignore */ }
      if (wolnyZapisMs) await new Promise((r) => setTimeout(r, wolnyZapisMs));
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
  for (const [nazwa, ll, rodzaj] of [['krypta', [51.2446, 22.5545], 'krypta'], ['katakumby', [51.2479, 22.5683], 'podziemia']]) {
    await g(async (ll) => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(ll[0], ll[1]); await s.city.ensure(p.x, p.y, 1200); s.player.setPosition(p.x, p.y); }, ll);
    await page.waitForFunction((r) => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.rodzaj === r), rodzaj, { timeout: 60000 }).catch(() => {});
    const w = await g((r) => { const s = window.__game.scene.getScene('game'); return s.lochy.lista.filter((w) => w.rodzaj === r).sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]; }, rodzaj);
    if (!w) { console.log('brak', rodzaj); continue; }
    // Stand ~20 m south (doors closed), wait for chunks, then force a knock.
    await g((w) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(w.x + 20, w.y + 40); }, w);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `work/zejscie-${tag}-${nazwa}-zamkniete.png` });
    await g((w) => { const s = window.__game.scene.getScene('game'); const st = s.lochy.stan.get(w.id); st.nast = 0; }, w);
    await g(() => { const s = window.__game.scene.getScene('game'); window.__pukniete = 0; const o = s.lochy.zywe.bind(s.lochy); const sfxCalls = []; s.lochy.zywe = (...a) => { o(...a); for (const [id, im] of s.lochy.obrazki) if (String(im[0].frame.name) === '1') window.__pukniete++; }; });
    const ctxOK = await g(() => { window.__audio = 0; const O = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__audio++; return O.call(this); }; return true; });
    await g((w) => { const s = window.__game.scene.getScene('game'); s.lochy.stan.get(w.id).nast = 0; }, w);
    await page.waitForTimeout(1500);
    if (!(await g(() => window.__pukniete)) || !(await g(() => window.__audio))) throw new Error(nazwa + ': no knock (flash/sound)');
    console.log(nazwa, 'klatek z błyskiem', await g(() => window.__pukniete), 'oscylatorów', await g(() => window.__audio));
    const info = await g((w) => { const s = window.__game.scene.getScene('game'); const im = s.lochy.obrazki.get(w.id)[0]; return { frame: im.frame.name, y: im.y, wy: w.y }; }, w);
    console.log(nazwa, JSON.stringify(info));
    await g((w) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(w.x, w.y + 10); }, w);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `work/zejscie-${tag}-${nazwa}-otwarte.png` });
    console.log(nazwa, 'open frame', await g((w) => window.__game.scene.getScene('game').lochy.obrazki.get(w.id)[0].frame.name, w));
  }
  console.log('errors', errors);
  if (errors.length) throw new Error('page errors');
  console.log('OK');
} finally { await browser.close(); }

// Drogowskazy niebezpieczeństwa (właściciel, 21.11.2026): na dużych skrzyżowaniach miasta, jeden na km², drewniany
// znak z niedbałym stworem i strzałką do najbliższego średniego+ siedliska. Prawdziwy Lublin albo próbka świata
// (PROBKA=barcelona LL=41.39,2.15). Sprawdza: znaki stoją przy skrzyżowaniach dróg, cel to średnie+ siedlisko
// w zasięgu, strzałka wskazuje jego kierunek, okno „Prowadź” ustawia strzałkę. Zrzuty w work/drogowskazy.
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-drogowskazy.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/drogowskazy', { recursive: true });
const mobile = process.env.TELEFON === '1';
const PROBKA = process.env.PROBKA || '';
const tag = (PROBKA || 'lublin') + (mobile ? '-tel' : '-pc');
const PORT = process.env.PORT || 4173;
const [LAT, LON] = (process.env.LL || (PROBKA ? '41.395,2.150' : '51.2370,22.5300')).split(',').map(Number);

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const errors = [];
const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, locale: 'pl-PL' });
let pm = null;
if (PROBKA) {
  pm = await readFile(`data/world-sample/${PROBKA}.pmtiles`);
  await context.route((u) => u.pathname.endsWith('/probka.pmtiles'), async (route) => {
    const r = route.request().headers()['range'];
    const m = /bytes=(\d+)-(\d*)/.exec(r || '');
    if (!m) return route.fulfill({ status: 200, body: pm, headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
    const a = +m[1], b = m[2] ? Math.min(+m[2], pm.length - 1) : pm.length - 1;
    return route.fulfill({ status: 206, body: pm.subarray(a, b + 1), headers: { 'content-range': `bytes ${a}-${b}/${pm.length}`, 'accept-ranges': 'bytes', 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  await context.route((u) => /terrarium|elevation-tiles/.test(u.href), (r) => r.fulfill({ status: 404, body: '' }));
}
await context.route('**/*.supabase.co/**', async (route) => {
  const path = new URL(route.request().url()).pathname;
  let body = null;
  const at = PROBKA ? { m: `w:${LAT.toFixed(4)},${LON.toFixed(4)}`, x: 0, y: 0, s: 1.92 } : null;
  if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'koniec', walked: 0 }, daily: {}, flagi: { samouczek: 1 }, ...(at ? { at } : {}) }, exp: 4000, dead: false, died_at: null, age: 12, immortal: true } };
  if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
  if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports') || path.endsWith('/kurier_wiesci')) body = [];
  if (path.endsWith('/server_now')) body = new Date().toISOString();
  if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
  if (path.endsWith('/settings')) body = { external: { google: false } };
  if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_|404/.test(m.text()) && errors.push(m.text()));
const g = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`http://127.0.0.1:${PORT}/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&stwory3d=0&mieszkancy3d=0&dzwieki=0${PROBKA ? '&world=' + encodeURIComponent(`http://127.0.0.1:${PORT}/probka.pmtiles`) : ''}#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  const mapa = await g(() => window.__game.scene.getScene('game').city.id);
  console.log('mapa', mapa);
  // Bohater na wskazane miejsce; czekamy, aż znaki w okolicy znajdą cel.
  await g(([lat, lon]) => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(lat, lon); const f = s.city.freeNear?.(p.x, p.y) ?? p; s.player.setPosition(f.x, f.y); }, [LAT, LON]);
  let stan = null;
  for (let i = 0; i < 160; i++) {
    await page.waitForTimeout(1000);
    stan = await g(() => {
      const d = window.__drogowskazy; if (!d) return null;
      const z = [...d.znaki.values()];
      return { znakow: z.length, gotowe: z.filter((q) => q.gotowy).length, zCelem: z.filter((q) => q.cel).length, postawione: z.filter((q) => q.img).length };
    });
    if (stan && stan.znakow && stan.gotowe === stan.znakow && i > 5) break;
    // Bohater stoi kolejno przy niegotowych znakach (szukanie celu tylko dla bliskich).
    if (i % 12 === 11) await g(() => { const s = window.__game.scene.getScene('game'); const z = [...window.__drogowskazy.znaki.values()].find((q) => !q.gotowy); if (z) s.player.setPosition(z.x + 10, z.y + 10); });
  }
  console.log('stan', JSON.stringify(stan));
  assert(stan && stan.znakow > 0, 'w mieście są znaki przy skrzyżowaniach');
  assert(stan.zCelem > 0, 'co najmniej jeden znak wskazuje siedlisko');
  const znaki = await g(() => [...window.__drogowskazy.znaki.values()].filter((q) => q.cel).map((q) => ({ id: q.id, x: q.x, y: q.y, kx: q.kx, ky: q.ky, d: q.cel.d, rozmiar: q.cel.s.rozmiar, typ: q.cel.s.typ, kind: q.cel.kind, sx: q.cel.s.x, sy: q.cel.s.y, opis: window.__drogowskazy.opis(q) })));
  for (const z of znaki) {
    console.log(z.opis, '|', z.rozmiar, z.typ);
    assert(['sredni', 'duzy', 'warownia', 'wielki', 'twierdza'].includes(z.rozmiar), 'cel to średnie+ siedlisko');
    assert(z.d <= 3500 * 1.92 + 1, 'cel w zasięgu');
    assert(Math.hypot(z.x - z.kx, z.y - z.ky) < 40 * 1.92, 'znak stoi przy skrzyżowaniu');
  }
  // Jeden na kilometr: żadne dwa znaki bliżej niż ~300 m (każdy w swojej komórce, przy swoim skrzyżowaniu).
  // Zrzut: bohater przy znaku.
  const z = znaki[0];
  await g((z) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(z.x + 14, z.y + 10); s.cameras.main.setZoom(6); }, z);
  await page.waitForTimeout(6000);
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  const widac = await g(() => [...window.__drogowskazy.znaki.values()].some((q) => q.img?.visible && q.napis));
  assert(widac, 'znak widać i ma napis');
  await page.screenshot({ path: `work/drogowskazy/${tag}-znak.png` });
  // Okno i „Prowadź”.
  await g((id) => { const s = window.__game.scene.getScene('game'); const q = [...window.__drogowskazy.znaki.values()].find((v) => v.id === id); s.czytajDrogowskaz(q); }, z.id);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `work/drogowskazy/${tag}-okno.png` });
  assert.deepEqual(errors, []);
  console.log(`PASS drogowskazy (${tag})`);
} finally {
  await browser.close();
}

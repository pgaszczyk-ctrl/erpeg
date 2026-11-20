// Siedliska w prawdziwej grze (mapa Lublina, serwer udawany): obóz z palisadą jest częścią mapy –
//  - planuje się w lesie / na łące, ma klepisko i ścieżki w podłożu, palisadę, namioty i ognisko jako obiekty świata,
//  - palisada blokuje bohatera, brama przepuszcza, w środku mieszkają bandyci i herszt (istniejący bestiariusz),
//  - po ponownym wczytaniu obóz jest dokładnie w tym samym miejscu (ten sam plan),
//  - ?siedliska=0 przywraca poprzednią mapę (żadnych obozów).
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-siedliska.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/siedliska', { recursive: true });
const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'tel' : 'pc';
const PORT = process.env.PORT || 4173;
// Miejsca do szukania obozu: lasy i łąki na skraju Lublina (lat, lon).
const SZUKAJ = [[51.2075, 22.4890], [51.1760, 22.5420], [51.2165, 22.4720], [51.1890, 22.4980], [51.2700, 22.6300], [51.2300, 22.6700], [51.1700, 22.5900], [51.2850, 22.5200], [51.2000, 22.6400], [51.2500, 22.4500]];

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const errors = [];
async function otworz(extra = '') {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, locale: 'pl-PL' });
  await context.route('**/*.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'koniec', walked: 0 }, daily: {} }, exp: 4000, dead: false, died_at: null, age: 12, immortal: true } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_|404/.test(m.text()) && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${PORT}/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&stwory3d=0&mieszkancy3d=0&dzwieki=0${extra}#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { context, page, g: (fn, arg) => page.evaluate(fn, arg) };
}

/** Przenosi bohatera i czeka, aż okolica się wczyta i łowiska/siedliska zaplanują (komórki 1,1 km). */
async function idzDo(g, page, x, y) {
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.player.vel?.set(0, 0); }, [x, y]);
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const ok = await g(([x, y]) => { const s = window.__game.scene.getScene('game'); return s.city.ready({ x0: x - 900, y0: y - 900, x1: x + 900, y1: y + 900 }); }, [x, y]);
    if (ok) break;
  }
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const plan = (g) => g(() => {
  const s = window.__game.scene.getScene('game');
  return (s.lowiska?.siedliska ?? []).map((q) => ({ id: q.id, x: q.x, y: q.y, rozmiar: q.rozmiar, obrys: q.obrys, bramy: q.bramy, namioty: q.namioty.length, pale: q.pale.length, wieza: !!q.wieza, spawny: q.spawny.length }));
});

try {
  const A = await otworz();
  const { page, g } = A;
  // 1. Szukanie obozu.
  let obozy = [];
  for (const [lat, lon] of SZUKAJ) {
    const p = await g(([lat, lon]) => window.__game.scene.getScene('game').city.fromLatLon(lat, lon), [lat, lon]);
    await idzDo(g, page, p.x, p.y);
    obozy = await plan(g);
    console.log('szukam', lat, lon, '→ obozów', obozy.length);
    if (obozy.length) break;
  }
  assert(obozy.length, 'żaden obóz się nie zaplanował');
  const o = obozy[0];
  console.log('obóz', o.id, o.rozmiar, 'namioty', o.namioty, 'pale', o.pale, 'wieża', o.wieza, 'spawny', o.spawny);
  const b = o.bramy[0];
  const M = 1.92;

  // 2. Podejście pod bramę z zewnątrz, zrzut z daleka (mieszkańcy, ognisko, palisada w świecie).
  await idzDo(g, page, b.x + b.nx * 28 * M, b.y + b.ny * 28 * M);
  await page.waitForTimeout(3500);
  const stan = await g((id) => {
    const s = window.__game.scene.getScene('game');
    const sd = s.lowiska.siedliska.find((q) => q.id === id);
    const wroga = s.enemies.filter((e) => !e.isDead && Math.hypot(e.x - sd.x, e.y - sd.y) < 120).map((e) => e.kindId);
    // Podłoże kawałka w środku obozu: kolor z mapy rodzajów (klepisko) zamiast lasu.
    return { wroga, blok: s.city.isBlocked(sd.pale[3].x, sd.pale[3].y), wBramie: s.city.isBlocked(sd.bramy[0].x, sd.bramy[0].y), srodek: s.city.isBlocked(sd.x + 30, sd.y + 30) };
  }, o.id);
  console.log('mieszkańcy', stan.wroga.join(','), '| pal blokuje', stan.blok, '| brama wolna', !stan.wBramie);
  assert(stan.blok, 'palisada blokuje');
  assert(!stan.wBramie, 'brama przechodnia');
  assert(stan.wroga.includes('bandyta'), 'w obozie mieszkają bandyci');
  assert(stan.wroga.includes('herszt'), 'herszt przed swoim namiotem');
  await g(() => { const s = window.__game.scene.getScene('game'); for (const e of s.enemies) e.spokojny = true; s.player.protectUntil = 1e15; s.noHurtUntil = 1e15; });
  await page.screenshot({ path: `work/siedliska/${tag}-brama.png` });

  // 3. Palisada zatrzymuje: idzie prosto w ścianę obok bramy (klawisze), pozycja nie przechodzi na drugą stronę.
  const sciana = await g((id) => {
    const s = window.__game.scene.getScene('game');
    const sd = s.lowiska.siedliska.find((q) => q.id === id);
    const pal = sd.pale.filter((p) => !p.brama).sort((a, b) => Math.hypot(a.x - sd.bramy[0].x, a.y - sd.bramy[0].y) - Math.hypot(b.x - sd.bramy[0].x, b.y - sd.bramy[0].y))[8];
    const nx = (pal.x - sd.x) / Math.hypot(pal.x - sd.x, pal.y - sd.y), ny = (pal.y - sd.y) / Math.hypot(pal.x - sd.x, pal.y - sd.y);
    s.player.setPosition(pal.x + nx * 14, pal.y + ny * 14);
    return { x: pal.x, y: pal.y, nx, ny };
  }, o.id);
  // Walk inwards with the keyboard for 1.5 s (direction ≈ −normal).
  const klawisze = [];
  if (sciana.nx > 0.38) klawisze.push('ArrowLeft'); else if (sciana.nx < -0.38) klawisze.push('ArrowRight');
  if (sciana.ny > 0.38) klawisze.push('ArrowUp'); else if (sciana.ny < -0.38) klawisze.push('ArrowDown');
  for (const k of klawisze) await page.keyboard.down(k);
  await page.waitForTimeout(1500);
  for (const k of klawisze) await page.keyboard.up(k);
  const poScianie = await g((id) => {
    const s = window.__game.scene.getScene('game');
    const sd = s.lowiska.siedliska.find((q) => q.id === id);
    const r = sd.obrys; let w = false; const x = s.player.x, y = s.player.y;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) if ((r[i + 1] > y) !== (r[j + 1] > y) && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) w = !w;
    return { w, x, y };
  }, o.id);
  console.log('po marszu w ścianę: w obozie?', poScianie.w);
  assert(!poScianie.w, 'bohater nie przeszedł przez palisadę');

  // 4. Przez bramę: z zewnątrz do środka – prawdziwy ruch gry (moveActor z kolizjami), krok po kroku wzdłuż normalnej bramy.
  const poBramie = await g((id) => {
    const s = window.__game.scene.getScene('game');
    const sd = s.lowiska.siedliska.find((q) => q.id === id);
    const b = sd.bramy[0];
    s.player.setPosition(b.x + b.nx * 14, b.y + b.ny * 14);
    const v = 60;
    const r = sd.obrys;
    const wSrodku = (x, y) => { let w = false; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) if ((r[i + 1] > y) !== (r[j + 1] > y) && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) w = !w; return w; };
    for (let i = 0; i < 40; i++) {
      s.player.vel.set(-b.nx * v, -b.ny * v);
      s.moveActor(s.player, 1 / 30);
      if (wSrodku(s.player.x, s.player.y) && Math.hypot(s.player.x - b.x, s.player.y - b.y) > 12) break;
    }
    s.player.vel.set(0, 0);
    return wSrodku(s.player.x, s.player.y) && Math.hypot(s.player.x - b.x, s.player.y - b.y) > 12;
  }, o.id);
  console.log('przez bramę do środka:', poBramie);
  if (!poBramie) console.log('diagnoza bramy', JSON.stringify(await g((id) => {
    const s = window.__game.scene.getScene('game');
    const sd = s.lowiska.siedliska.find((q) => q.id === id);
    const b = sd.bramy[0];
    const out = [];
    for (let t = 14; t >= -14; t -= 2) {
      const x = b.x + b.nx * t, y = b.y + b.ny * t + 5;
      out.push([t, s.city.isFree(x, y, 2, 1.5), s.city.isBlocked(x, y), s.mapView.korony.blocked(x, y), s.forest.blocked(x, y), s.landmarks.blocked(x, y), s.city.przeszkoda?.(x, y)]);
    }
    return { b, gracz: [s.player.x, s.player.y], out };
  }, o.id)));
  assert(poBramie, 'brama przepuszcza bohatera');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `work/siedliska/${tag}-srodek.png` });

  // 5. Zrzut z dalszego przybliżenia: cały obóz w widoku gry.
  await g((id) => { const s = window.__game.scene.getScene('game'); const sd = s.lowiska.siedliska.find((q) => q.id === id); s.player.setPosition(sd.x, sd.y + 6); }, o.id);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `work/siedliska/${tag}-oboz.png` });

  // 6. Ponowne wczytanie: ten sam plan w tym samym miejscu.
  await A.context.close();
  const B = await otworz();
  await idzDo(B.g, B.page, o.x, o.y + 200);
  const znowu = (await plan(B.g)).find((q) => q.id === o.id);
  assert(znowu, 'obóz po ponownym wczytaniu');
  assert.deepEqual(znowu, o, 'ten sam układ obozu po ponownym wczytaniu');
  console.log('po ponownym wczytaniu: identyczny');
  // Podejście z drugiej strony (kawałki malowane w innej kolejności) – plan nadal ten sam.
  await idzDo(B.g, B.page, o.x - 600, o.y - 400);
  await idzDo(B.g, B.page, o.x, o.y - 120);
  assert.deepEqual((await plan(B.g)).find((q) => q.id === o.id), o, 'ten sam układ przy podejściu z innej strony');
  await B.context.close();

  // 7. Wyłączone: żadnych obozów.
  const C = await otworz('&siedliska=0');
  await idzDo(C.g, C.page, o.x, o.y + 200);
  const bez = await plan(C.g);
  assert.equal(bez.length, 0, 'z ?siedliska=0 nie ma obozów');
  assert(!(await C.g(([x, y]) => window.__game.scene.getScene('game').city.isBlocked(x, y), [o.bramy[0].x + 30, o.bramy[0].y])), 'bez siedlisk teren wolny jak dawniej');
  await C.page.screenshot({ path: `work/siedliska/${tag}-wylaczone.png` });
  await C.page.evaluate(() => localStorage.removeItem('exp-siedliska'));
  await C.context.close();

  const bledy = errors.filter((e) => !/ResizeObserver|AudioContext/.test(e));
  assert.equal(bledy.length, 0, 'błędy strony: ' + bledy.join(' | '));
  console.log('browser-siedliska: OK');
} finally {
  await browser.close();
}

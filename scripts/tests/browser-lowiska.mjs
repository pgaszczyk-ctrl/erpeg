// Łowiska test pilot (?lowiska=1, isolated from the turn fight): wolves spawn only in real OSM forests
// (natural=wood/landuse=forest), always real-time, with a telegraphed charge the hero can be hit by, and the
// pack doesn't instantly respawn once cleared. This is a smoke/behaviour check, not a full 150-wolf endurance run.
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-lowiska.mjs   (TELEFON=1)
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
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&lowiska=1&tury=0#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  const g = (fn, arg) => page.evaluate(fn, arg);

  // Pilota jest włączony (switch odwracalny, domyślnie off – sprawdzamy, że ten test naprawdę go włączył).
  const on = await g(() => window.__game.scene.getScene('game').lowiska != null);
  assert(on, 'łowiska() is on with ?lowiska=1');

  // Znajdź prawdziwy las z indeksu mapy (big-area, już wczytany) i teleportuj tam bohatera.
  const spot = await g(() => {
    const s = window.__game.scene.getScene('game');
    for (const a of s.city.areas) {
      if (a.kind !== 'forest') continue;
      const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
      if (s.city.areaKindsAt(cx, cy).includes('forest')) return { x: cx, y: cy, w: a.x1 - a.x0, h: a.y1 - a.y0 };
    }
    return null;
  });
  console.log('las', JSON.stringify(spot));
  assert(spot, 'a real forest area exists in the loaded map index');

  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.protectUntil = 0; s.player.setPosition(x, y); }, [spot.x, spot.y]);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return s.city.ready({ x0: s.player.x - 300, y0: s.player.y - 300, x1: s.player.x + 300, y1: s.player.y + 300 }); }, null, { timeout: 60000 });
  await page.waitForTimeout(3000);

  const po1 = await g(() => { const s = window.__game.scene.getScene('game'); return s.enemies.filter((e) => e.kindId === 'wilk' || e.kindId === 'warg').length; });
  console.log('wilki w pobliżu', po1);
  await page.screenshot({ path: `work/lowiska-${tag}-las.png` });
  if (po1 === 0) {
    // Ten konkretny punkt mógł nie mieć watahy (losowanie per km²) – spróbuj paru przesunięć w tym samym lesie.
    for (const [dx, dy] of [[150, 0], [-150, 0], [0, 150], [0, -150], [300, 300]]) {
      await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); }, [spot.x + dx, spot.y + dy]);
      await page.waitForTimeout(1500);
      const n = await g(() => { const s = window.__game.scene.getScene('game'); return s.enemies.filter((e) => e.kindId === 'wilk' || e.kindId === 'warg').length; });
      if (n > 0) break;
    }
  }
  const hp0 = await g(() => window.__game.scene.getScene('game').player.hp);
  console.log('hp przed', hp0);

  // Stój przy watahowej nawiedzonej strefie i czekaj na zapowiedź + doskok (bez walki klawiszami – telegraf i trafienie są automatyczne).
  let trafiony = false, maxJednoczesnie = 0, hpTeraz = hp0;
  for (let i = 0; i < 40 && !trafiony; i++) {
    await page.waitForTimeout(500);
    const info = await g(() => {
      const s = window.__game.scene.getScene('game');
      return { hp: s.player.hp, wrecz: s.atakiWrecz, n: s.enemies.filter((e) => (e.kindId === 'wilk' || e.kindId === 'warg') && !e.isDead).length };
    });
    hpTeraz = info.hp;
    maxJednoczesnie = Math.max(maxJednoczesnie, info.wrecz);
    if (info.hp < hp0) trafiony = true;
  }
  console.log('hp po', hpTeraz, 'maks. jednoczesnych rezerwacji wręcz', maxJednoczesnie);
  await page.screenshot({ path: `work/lowiska-${tag}-doskok.png` });
  assert(hpTeraz < hp0, 'a telegraphed charge actually hurt the hero while standing in the pack territory');
  assert(maxJednoczesnie <= 2, 'the shared melee-attack reservation never exceeds the brief\'s limit of 2');

  // Zabij całą napotkaną watahę mieczem (tap ataku na każdym wilku w zasięgu) – ciągłe EXP, bez premii za „rozbicie".
  const exp0 = await g(() => window.__session.exp);
  for (let i = 0; i < 300; i++) {
    const done = await g(() => {
      const s = window.__game.scene.getScene('game');
      const w = s.enemies.find((e) => (e.kindId === 'wilk' || e.kindId === 'warg') && !e.isDead);
      if (!w) return true;
      s.player.setPosition(w.x, w.y + 6);
      s.resolveAttack({ x: w.x, y: w.y }, s.time.now);
      return false;
    });
    if (done) break;
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
  const ostatni = await g(() => { const s = window.__game.scene.getScene('game'); return s.enemies.filter((e) => (e.kindId === 'wilk' || e.kindId === 'warg') && !e.isDead).length; });
  console.log('wilki żywe po bitwie', ostatni);
  assert.equal(ostatni, 0, 'the whole encountered pack was beaten');
  const exp1 = await g(() => window.__session.exp);
  console.log('exp', exp0, '→', exp1);
  assert(exp1 > exp0, 'EXP was granted per kill (continuous farming, no "pack cleared" bonus event)');
  await page.screenshot({ path: `work/lowiska-${tag}-rozbita.png` });

  // Odejdź i wróć od razu – bez nowej generacji (odnawianie wymaga sekund aktywnej symulacji, a nie było ich jeszcze 25).
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x + 1000, y + 1000); }, [spot.x, spot.y]);
  await page.waitForTimeout(800);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); }, [spot.x, spot.y]);
  await page.waitForTimeout(1500);
  const odrazu = await g(() => { const s = window.__game.scene.getScene('game'); return s.enemies.filter((e) => (e.kindId === 'wilk' || e.kindId === 'warg') && !e.isDead).length; });
  console.log('wilki od razu po rozbiciu', odrazu);
  assert.equal(odrazu, 0, 'no instant respawn right after clearing the pack');

  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

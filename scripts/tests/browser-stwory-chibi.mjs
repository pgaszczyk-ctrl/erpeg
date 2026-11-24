// Monsters as code-drawn clay chibis (owner, 24 Nov 2026: „rób stworki”; src/chibi/StworyChibi.ts): every kind gets its
// chibi texture, walks, winds up, strikes, falls. Spawns one of each next to the hero; screenshots in work/stwory/.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-stwory-chibi.mjs  (TELEFON=1)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TELEFON = process.env.TELEFON === '1';
const sfx = TELEFON ? '-tel' : '';
fs.mkdirSync('work/stwory', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 450, dead: false, died_at: null, age: 6, konto: true, immortal: true, ...o });
try {
  const ctx = await browser.newContext(TELEFON ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, locale: 'pl-PL' } : { viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
  let startXY = null;
  await ctx.route('**/*.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const req = route.request().postDataJSON?.() ?? {};
    let body = null;
    if (name === 'create_character') { startXY = [req.p_start_x, req.p_start_y]; body = { token: 't', player: gracz({ start_x: req.p_start_x, start_y: req.p_start_y }) }; }
    if (name === 'login') body = { token: 't', player: gracz({ start_x: startXY?.[0] ?? 3000, start_y: startXY?.[1] ?? 3000 }) };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${process.env.PORT || 4173}/?lang=pl&ostrosc=1`);
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.getByPlaceholder('np. Zbyszko').fill('Zbyszko');
  await page.getByText('Mężczyzna', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(2000);
  // Away from home: the 40 m safe zone around it removes monsters.
  await page.evaluate(() => { const g = window.__game.scene.getScene('game'), p = g.player;
    const t = g.city.reachableNear?.(p.x + 260, p.y + 60) ?? g.city.freeNear(p.x + 260, p.y + 60); p.setPosition(t.x, t.y); g.cameras.main.centerOn(t.x, t.y); });
  await page.waitForTimeout(4000);
  const RODZAJE = ['wilk', 'warg', 'glut', 'szkielet', 'driada', 'zombie', 'bandyta', 'herszt', 'upior', 'blob', 'wodnik', 'koziol'];
  await page.evaluate((rodzaje) => {
    const g = window.__game.scene.getScene('game'), p = g.player;
    window.__stwory = rodzaje.map((k, i) => {
      const a = (i / rodzaje.length) * Math.PI * 2, r = 34 + (i % 2) * 14;
      const e = g.spawnEnemy(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, undefined, k);
      e.peaceful = true; e.spokojny = true; return e;
    });
  }, RODZAJE);
  // Frames come from the workers: wait until every kind wears its chibi texture.
  await page.waitForFunction(() => window.__stwory.every((e) => e.texture.key.startsWith('chibi:')), null, { timeout: 120000 }).catch(() => {});
  const stan = await page.evaluate(() => window.__stwory.map((e) => ({ k: e.kindId, tex: e.texture.key, h: Math.round(e.displayHeight) })));
  console.log(stan);
  await page.screenshot({ path: `work/stwory/wszystkie${sfx}.png` });
  assert(stan.every((s) => s.tex.startsWith('chibi:')), 'every kind is a chibi');
  // A wind-up, the strike and a fall on the wolf and the bandit.
  await page.evaluate(() => { const n = window.__game.scene.getScene('game').time.now; for (const e of window.__stwory.slice(0, 7)) e.modelAttack = { clip: 'attack', start: n, contact: n + 1500, end: n + 3000, aim: 0.8 }; });
  await page.waitForTimeout(800); await page.screenshot({ path: `work/stwory/zamach${sfx}.png` });
  await page.waitForTimeout(1300); await page.screenshot({ path: `work/stwory/cios${sfx}.png` });
  await page.evaluate(() => { const g = window.__game.scene.getScene('game'); for (const e of window.__stwory.slice(0, 3)) e.hit(g.player.vel.clone().set(g.player.x, g.player.y), g.time.now, 999); });
  await page.waitForTimeout(450); await page.screenshot({ path: `work/stwory/padaja${sfx}.png` });
  // Walking: one creature crosses the screen.
  await page.evaluate(() => { const e = window.__stwory[3]; e.peaceful = true; e.vel.set(25, 10); });
  await page.waitForTimeout(600);
  assert.deepEqual(errors, [], 'no errors');
  console.log('OK');
} finally { await browser.close(); }

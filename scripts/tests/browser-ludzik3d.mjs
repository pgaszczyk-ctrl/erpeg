// The hero as a live 3D model in the 2D world (owner, 27 Oct 2026; src/ludzik3d.ts): the guard loads, replaces the
// hero's sprite, turns with the walking direction and plays its blow on a swing. Screenshots in work/.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-ludzik3d.mjs  (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TELEFON = process.env.TELEFON === '1';
const sfx = TELEFON ? '-tel' : '';
const URL0 = 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 450, dead: false, died_at: null, age: 6, konto: true, ...o });
try {
  const ctx = await browser.newContext(TELEFON
    ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, locale: 'pl-PL' }
    : { viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
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
  page.on('console', (m) => { if (/Ludzik 3D/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${URL0}?lang=pl&ostrosc=1&ludzik3d=1&live=0`);
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.locator('.m-namerow input').fill('Zbyszko');
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => window.__game.scene.getScene('game').ludzik3d?.widoczny, null, { timeout: 60000 });
  const stan = () => page.evaluate(() => { const g = window.__game.scene.getScene('game'); const l = g.ludzik3d; return { hero: g.player.visible, kat: l.kat, x: g.player.x, y: g.player.y }; });
  const s0 = await stan();
  assert.equal(s0.hero, false, 'the sheet hero is hidden under the 3D one');
  await page.screenshot({ path: `work/ludzik3d-stoi${sfx}.png` });
  const katy = {};
  for (const [k, n] of [['ArrowRight', 'prawo'], ['ArrowUp', 'gora'], ['ArrowLeft', 'lewo'], ['ArrowDown', 'dol']]) {
    await page.keyboard.down(k); await page.waitForTimeout(900);
    await page.screenshot({ path: `work/ludzik3d-${n}${sfx}.png` });
    await page.keyboard.up(k); await page.waitForTimeout(300);
    katy[n] = (await stan()).kat;
  }
  console.log('angles', katy);
  const blisko = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.35;
  assert(blisko(katy.prawo, Math.PI / 2) && blisko(katy.lewo, -Math.PI / 2) && blisko(katy.gora, Math.PI) && blisko(katy.dol, 0), 'turns to the walking direction');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `work/ludzik3d-cios${sfx}.png` });
  const cios = await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.g.atak.isRunning());
  assert(cios, 'a swing plays the blow');
  // Zoomed crop around the hero for a close look.
  const box = await page.evaluate(() => { const g = window.__game.scene.getScene('game'); const c = g.cameras.main; const p = g.player; const z = c.zoom / (window.devicePixelRatio > 1 ? 1 : 1); return { x: (p.x - c.worldView.x) * c.zoomX / (g.game.canvas.width / g.game.canvas.clientWidth), y: (p.y - c.worldView.y) * c.zoomY / (g.game.canvas.width / g.game.canvas.clientWidth) }; });
  await page.screenshot({ path: `work/ludzik3d-zblizenie${sfx}.png`, clip: { x: Math.max(0, box.x - 80), y: Math.max(0, box.y - 110), width: 160, height: 160 } });
  assert.deepEqual(errors, [], 'no errors');
  console.log('OK');
} finally {
  await browser.close();
}

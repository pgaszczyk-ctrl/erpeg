// The hero as a code-drawn clay chibi (owner, 24 Nov 2026; src/chibi/): frames come from the worker, the drawn sheet is
// hidden, the figure turns to the walking direction, runs, swings (A/B), the strong blow, the spin and shots, and the
// blade trail is fed to the game's ribbon. Screenshots in work/chibi/.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-chibi.mjs  (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TELEFON = process.env.TELEFON === '1';
const sfx = TELEFON ? '-tel' : '';
const URL0 = `http://127.0.0.1:${process.env.PORT || 4173}/`;
fs.mkdirSync('work/chibi', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, equip: { bron: 'zelazny', helm: 'zelazny_helm', zbroja: 'skorzana_zbroja', dystans: 'tarcza_drewniana' } }, exp: 450, dead: false, died_at: null, age: 6, konto: true, ...o });
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
  await page.goto(`${URL0}?lang=pl&ostrosc=1&chibi=1&live=0`);
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.getByPlaceholder(/np\. (Zbyszko|Dobrawa)/).fill('Zbyszko');
  await page.getByText('Mężczyzna', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForTimeout(3000); await page.screenshot({ path: `work/chibi/po-utworzeniu${sfx}.png` });
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  await page.waitForFunction(() => { const l = window.__game.scene.getScene('game').ludzik3d; return l?.widoczny && l.image?.visible; }, null, { timeout: 90000 });
  const stan = () => page.evaluate(() => { const g = window.__game.scene.getScene('game'); const l = g.ludzik3d; return { klasa: typeof l.ubierz === 'function' ? 'LudzikChibi' : 'inny', hero: g.player.visible, kat: l.kat, h: l.image?.displayHeight, tex: l.image?.texture.key }; });
  const s0 = await stan();
  console.log('start', s0);
  assert.equal(s0.klasa, 'LudzikChibi');
  assert.equal(s0.hero, false, 'the sheet hero is hidden');
  // Let the worker compute the movement frames.
  await page.waitForTimeout(TELEFON ? 15000 : 10000);
  await page.screenshot({ path: `work/chibi/stoi${sfx}.png` });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(300); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(300);
  const katy = {};
  for (const [k, n] of [['ArrowRight', 'prawo'], ['ArrowUp', 'gora'], ['ArrowLeft', 'lewo'], ['ArrowDown', 'dol']]) {
    await page.keyboard.down(k); await page.waitForTimeout(900);
    await page.screenshot({ path: `work/chibi/${n}${sfx}.png` });
    await page.keyboard.up(k); await page.waitForTimeout(300);
    katy[n] = (await stan()).kat;
  }
  console.log('angles', katy);
  const blisko = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.35;
  assert(blisko(katy.prawo, Math.PI / 2) && blisko(katy.lewo, -Math.PI / 2) && blisko(Math.abs(katy.gora), Math.PI) && blisko(katy.dol, 0), 'turns to the walking direction');
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); window.__cios = []; window.__smuga = 0;
    s.events.on('postupdate', () => { const l = s.ludzik3d; if (l.cios) { const w = l.cios.wariant; if (!window.__cios.includes(w)) window.__cios.push(w); } window.__smuga = Math.max(window.__smuga, l.smuga.length); }); });
  // Swings in a series (A, B), then the strong blow straight from the hero (C) and the spin.
  for (let i = 0; i < 2; i++) { await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.atakuj(0.6)); await page.waitForTimeout(i ? 450 : 200); if (!i) await page.screenshot({ path: `work/chibi/zamach${sfx}.png` }); }
  await page.evaluate(() => { const l = window.__game.scene.getScene('game').ludzik3d; l.atakuj(0.6, undefined, 0, { mocny: true }); });
  await page.waitForTimeout(260); await page.screenshot({ path: `work/chibi/mocny${sfx}.png` });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const l = window.__game.scene.getScene('game').ludzik3d; l.atakuj(0.6, undefined, 0, { mocny: true, wir: true }); });
  await page.waitForTimeout(400); await page.screenshot({ path: `work/chibi/wir${sfx}.png` });
  await page.waitForTimeout(900);
  const c = await page.evaluate(() => ({ warianty: window.__cios, smuga: window.__smuga }));
  console.log('blows', c);
  assert(c.warianty.includes('A') && c.warianty.includes('B') && c.warianty.includes('C') && c.warianty.includes('wir'), 'swing, strong blow and spin play');
  assert(c.smuga > 2, 'the blade trail is fed to the ribbon');
  // Close crop of the hero (scaled 4×) – how he looks in the world.
  const box = await page.evaluate(() => { const g = window.__game.scene.getScene('game'); const c = g.cameras.main, p = g.player, k = g.game.canvas.width / g.game.canvas.clientWidth; return { x: (p.x - c.worldView.x) * c.zoomX / k, y: (p.y - c.worldView.y) * c.zoomY / k }; });
  await page.screenshot({ path: `work/chibi/zblizenie${sfx}.png`, clip: { x: Math.max(0, box.x - 90), y: Math.max(0, box.y - 110), width: 180, height: 160 } });
  console.log('frames cached', await page.evaluate(() => Object.keys(window.__game.textures.list).filter(k => k.startsWith('chibi:')).length));
  assert.deepEqual(errors, [], 'no errors');
  console.log('OK');
} finally {
  await browser.close();
}

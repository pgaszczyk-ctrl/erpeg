// Slow-frame log (owner, 27 Oct 2026): while playing, a window under 40 fps (headless swiftshader always is)
// sends one `fps` report to log_error with the measurement and context; paused/dialog time doesn't count.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-fps.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 500, dead: false, died_at: null, age: 6, konto: true, ...o });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
  const raporty = [];
  let xy = [3000, 3000];
  await ctx.route('**/*.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const req = route.request().postDataJSON?.() ?? {};
    let body = null;
    if (name === 'create_character') { xy = [req.p_start_x, req.p_start_y]; body = { token: 't', player: gracz({ start_x: xy[0], start_y: xy[1] }) }; }
    if (name === 'login') body = { token: 't', player: gracz({ start_x: xy[0], start_y: xy[1] }) };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (name === 'log_error') raporty.push(req);
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/?lang=pl');
  await page.evaluate(() => Object.assign(window.__fps, { rozgrzewkaS: 0, oknoS: 3, prog: 0, dlugichIle: 1e9 }));
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.getByPlaceholder('np. Zbyszko').fill('Zbyszko');
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  const fpsGry = await page.evaluate(() => window.__game.loop.actualFps);
  console.log('actualFps', fpsGry.toFixed(1));
  // Sleeping loop (map screen, Kufer): nothing is measured.
  await page.evaluate(() => window.__game.loop.sleep());
  await page.evaluate(() => Object.assign(window.__fps, { prog: 40, dlugichIle: 4 }));
  await page.waitForTimeout(7000);
  assert.equal(raporty.filter((r) => r.p_kind === 'fps').length, 0, 'no report while paused');
  await page.evaluate(() => window.__game.loop.wake());
  for (let i = 0; i < 20 && !raporty.some((r) => r.p_kind === 'fps'); i++) await page.waitForTimeout(1000);
  const fps = raporty.filter((r) => r.p_kind === 'fps');
  if (fpsGry < 40) {
    assert.equal(fps.length, 1, 'one fps report');
    console.log(fps[0].p_message);
    console.log(JSON.stringify(fps[0].p_ctx));
    assert(JSON.stringify(fps[0].p_ctx).length < 4000, 'ctx fits the server limit');
    assert(fps[0].p_ctx.fps < 40 || fps[0].p_ctx.dlugie >= 4);
    // A second slow window within 5 min is not sent again.
    await page.waitForTimeout(7000);
    assert.equal(raporty.filter((r) => r.p_kind === 'fps').length, 1, 'throttled');
  } else console.log('fast machine, no report expected:', fps.length);
  console.log('OK');
} finally {
  await browser.close();
}

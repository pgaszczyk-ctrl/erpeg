// Janusz's slow laptop (8 Nov 2026, fps log 207/208): 1920×953, Lublin x 4477 y 12236, walking. CPU profile of the
// page's main thread, self time per function. Run: npm run build && npx vite preview --port 4173 & node scripts/tests/profil-janusz.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const X = Number(process.env.X ?? 4477), Y = Number(process.env.Y ?? 12236);
const gracz = { name: 'Jam', idik: 'ANGELIKA', start_place: 'x', start_x: X, start_y: Y, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 500, dead: false, died_at: null, age: 6, konto: true };
try {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 953 }, locale: 'pl-PL' });
  await ctx.route('**/*.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    let body = null;
    if (name === 'login') body = { token: 't', player: gracz };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:4173/?lang=pl&pogoda=czysto${process.env.Q ?? ''}#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForTimeout(8000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  for (const k of keys) { await page.keyboard.down(k); await page.waitForTimeout(3000); await page.keyboard.up(k); }
  const { profile } = await cdp.send('Profiler.stop');
  const info = await page.evaluate(() => ({ fps: window.__game.loop.actualFps, obj: window.__game.scene.getScene('game').children.list.length }));
  const dt = (profile.endTime - profile.startTime) / 1000;
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const counts = new Map();
  for (const s of profile.samples) counts.set(s, (counts.get(s) ?? 0) + 1);
  const per = (profile.endTime - profile.startTime) / profile.samples.length / 1000;
  for (const [id, c] of counts) {
    const n = byId.get(id);
    const f = n.callFrame;
    const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
    self.set(k, (self.get(k) ?? 0) + c * per);
  }
  console.log('fps', info.fps.toFixed(1), 'objects', info.obj, 'profile ms', dt.toFixed(0));
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(v.toFixed(0).padStart(6), k);
} finally {
  await browser.close();
}

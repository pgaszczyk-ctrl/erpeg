// Starting the game on an upright phone (owner, 28 Oct 2026: „najpierw ładuje starego ludzika i avatarek w 3/4 ekranu,
// potem przekręca grę i ładuje nowego ludzika”): the page must be turned from the loading cover on, the drawn hero
// never shows before the 3D one, and the HUD portrait sits in the turned page's top-left corner the whole time.
// Run: VITE_TEST=1 npx vite build --outDir work/dist-test && npx vite preview --outDir work/dist-test --port 4174 & node scripts/tests/browser-start-telefon.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = process.env.PORT || 4174;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route('**/*.supabase.co/**', (r) => {
  const n = new URL(r.request().url()).pathname.split('/').pop();
  let body = null;
  if (n === 'login') body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'x', start_x: 7500, start_y: 6500, map_scale: 1.92, save: { coins: 5, story: { st: 'koniec' } }, exp: 450, dead: false, age: 12, konto: false } };
  if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(n)) body = [];
  if (n === 'game_settings') body = {};
  if (['heartbeat', 'save_game'].includes(n)) body = true;
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('exp-postac', JSON.stringify({ name: 'Jam', code: 'ANGELIKA' })); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?ostrosc=1`);
const go = p.locator('button', { hasText: 'Kontynuuj' });
await go.waitFor({ timeout: 60000 });
await go.tap();
// Sample the page while it loads and right after reveal.
const probki = [];
const t0 = Date.now();
let pokazanaGra = 0;
for (;;) {
  const s = await p.evaluate(() => {
    const g = window.__game?.scene.getScene('game');
    const gra = !!window.__game?.scene.isActive('game');
    const okladka = !!document.querySelector('.lm-cover, #loading-map:not([hidden])');
    const pl = g?.player;
    const l3 = g?.ludzik3d;
    const por = document.querySelector('.tel-portret')?.getBoundingClientRect();
    return {
      obrot: document.documentElement.classList.contains('exp-obrot'),
      gra, okladka,
      gotowa: !!(gra && g.firstViewReady?.()),
      staryWidac: !!(pl && pl.visible && pl.alpha > 0.05),
      nowyWidac: !!l3?.widoczny,
      portret: por ? { x: Math.round(por.left), y: Math.round(por.top) } : null,
    };
  });
  s.t = Date.now() - t0;
  probki.push(s);
  if (s.gotowa && !pokazanaGra) pokazanaGra = s.t;
  if ((pokazanaGra && s.t - pokazanaGra > 8000) || s.t > 150000) break;
  await p.waitForTimeout(150);
}
await p.screenshot({ path: 'work/start-telefon.png' });
const zmiany = probki.filter((s, i) => i === 0 || JSON.stringify({ ...s, t: 0 }) !== JSON.stringify({ ...probki[i - 1], t: 0 }));
for (const s of zmiany) console.log(JSON.stringify(s));
// Turned from the first sample in the game on, never upright again.
const odGry = probki.filter((s) => s.gra);
assert(odGry.length, 'the game started');
assert(odGry.every((s) => s.obrot), 'the page stays turned while the game runs');
// The drawn hero never shows while the 3D one isn't there yet.
assert(!odGry.some((s) => s.staryWidac && !s.nowyWidac), 'the old drawn hero showed');
assert(probki.at(-1).nowyWidac, 'the 3D hero is shown');
// The portrait stays at the turned page's top-left (in the page's own coordinates, i.e. the rotated layout).
const pos = odGry.filter((s) => s.portret).map((s) => `${s.portret.x},${s.portret.y}`);
assert(new Set(pos).size <= 1, `portrait moved: ${[...new Set(pos)].join(' ')}`);
console.log({ errs }); assert.deepEqual(errs, []);
console.log('OK');
await b.close();

// An upright phone shows the game turned on its side (owner, 27 Oct 2026: no „turn your phone” card), touches still
// steer the hero; the game menu's cut button peeks from under its edge; no look choice in the new-character form.
// Run: VITE_TEST=1 npx vite build --outDir work/dist-test && npx vite preview --outDir work/dist-test --port 4174 & node scripts/tests/browser-obrot.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
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
// The new-character form: no look buttons.
await p.goto('http://127.0.0.1:4174/?ostrosc=1#nowa');
await p.waitForTimeout(3000);
await p.screenshot({ path: 'work/obrot-nowa.png' });
assert.equal(await p.locator('#menu .m-ikbtn, #menu .m-hero').count(), 0, 'no look choice');
await p.goto('http://127.0.0.1:4174/?ostrosc=1&live=1#postac=Jam&kod=ANGELIKA');
await p.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
await p.waitForTimeout(4000);
const st = await p.evaluate(() => ({ obrot: document.documentElement.classList.contains('exp-obrot'), w: innerWidth, h: innerHeight, gw: window.__game.scale.width, gh: window.__game.scale.height }));
console.log(st);
assert(st.obrot && st.w === 844 && st.h === 390 && st.gw > st.gh, 'turned landscape');
await p.screenshot({ path: 'work/obrot-gra.png' });
// The joystick: in the turned page the left side is the bottom of the upright screen. A drag „right” on the
// turned page = upwards on the upright screen.
const pl = () => p.evaluate(() => { const s = window.__game.scene.getScene('game').player; return { x: s.x, y: s.y }; });
const a = await pl();
const cdp = await ctx.newCDPSession(p);
const tp = (x, y) => [{ x, y, id: 1 }];
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(300, 700) });
for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(300, 700 - i * 6) });
await p.waitForTimeout(1500);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const c = await pl();
console.log('ruch', a, c);
assert(c.x - a.x > 5 && Math.abs(c.y - a.y) < Math.abs(c.x - a.x), 'the joystick steers in the turned page');
await p.evaluate(() => window.__game.scene.getScene('ui').openGameMenu());
await p.waitForTimeout(800);
await p.screenshot({ path: 'work/obrot-menu.png' });
// Turned back upright: the page stands normally.
await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
await p.waitForTimeout(500);
await p.setViewportSize({ width: 844, height: 390 });
await p.waitForTimeout(1500);
const st2 = await p.evaluate(() => ({ obrot: document.documentElement.classList.contains('exp-obrot'), w: innerWidth, gw: window.__game.scale.width }));
console.log(st2);
assert(!st2.obrot && st2.w === 844, 'landscape: not turned');
await p.screenshot({ path: 'work/obrot-poziomo-menu.png' });
console.log({ errs }); assert.deepEqual(errs, []);
console.log('OK');
await b.close();

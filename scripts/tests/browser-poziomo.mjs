// Phone held sideways on the test server (owner, 26 Oct 2026): Kufer hero left / backpack right, joystick and
// attack buttons in from the edges, the code hidden, the app manifest served.
// Run: VITE_TEST=1 npx vite build --outDir work/dist-test && npx vite preview --outDir work/dist-test --port 4174 & node scripts/tests/browser-poziomo.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 932, height: 430 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.route('**/*.supabase.co/**', (r) => {
  const n = new URL(r.request().url()).pathname.split('/').pop();
  let body = null;
  if (n === 'login') body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'x', start_x: 7500, start_y: 6500, map_scale: 1.92, save: { coins: 5, story: { st: 'koniec' } }, exp: 450, dead: false, age: 12, konto: false } };
  if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(n)) body = [];
  if (n === 'game_settings') body = {};
  if (['heartbeat','save_game'].includes(n)) body = true;
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://127.0.0.1:4174/?ostrosc=1#postac=Jam&kod=ANGELIKA');
await p.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
await p.waitForTimeout(5000);
await p.screenshot({ path: 'work/poziomo-gra.png' });
await p.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
await p.waitForTimeout(1200);
// close the first-visit spotlight if any
await p.evaluate(() => document.getElementById('samouczek')?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, bubbles: true })));
await p.waitForTimeout(300);
await p.screenshot({ path: 'work/poziomo-kufer-stat.png' });
await p.evaluate(() => [...document.querySelectorAll('#character .k-tab')].find((t) => t.textContent.includes('Postać'))?.click());
await p.waitForTimeout(800);
await p.screenshot({ path: 'work/poziomo-kufer.png' });
const man = await p.evaluate(async () => (await fetch('manifest.webmanifest')).ok);
const uklad = await p.evaluate(() => { const l = document.querySelector('#character .k-lewa').getBoundingClientRect(); const r = document.querySelector('#character .k-prawa').getBoundingClientRect(); return { obok: r.left >= l.right - 1, kod: document.querySelector('#character .k-kod-code')?.textContent }; });
console.log(uklad);
assert(uklad.obok, 'backpack beside the hero'); assert(man, 'manifest');
console.log({ errs, man }); assert.deepEqual(errs, []); console.log('OK');
await b.close();

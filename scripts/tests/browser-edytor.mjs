// Look editor (owner, 25 Nov 2026; artist pack 51-G001): Kufer → „Wygląd” lights up on the first opening, three
// choices change the big figure, the look is saved when the trunk closes, the HUD portrait follows.
// Run: VITE_TEST=1 npx vite build --outDir work/dist-test && npx vite preview --outDir work/dist-test --port 4174 & node scripts/tests/browser-edytor.mjs
// TELEFON=1 = phone held sideways.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const TEL = process.env.TELEFON === '1';
const PORT = process.env.PORT ?? '4174';
mkdirSync('work/edytor', { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext(TEL
  ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  : { viewport: { width: 1280, height: 800 } });
const zapisy = [];
await ctx.route('**/*.supabase.co/**', (r) => {
  const n = new URL(r.request().url()).pathname.split('/').pop();
  let body = null;
  const look = { head: 0, build: 1, outfit: 0, hair: 1, skin: 0, hairColor: 0, top: 0, bottom: 7, guard3d: 'k', wyg: { f: 'dlugie', w: 4, s: 0 } };
  if (n === 'login') body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'x', start_x: 7500, start_y: 6500, map_scale: 1.92, save: { coins: 5, story: { st: 'koniec' }, look }, exp: 450, dead: false, age: 12, konto: true } };
  if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(n)) body = [];
  if (n === 'game_settings') body = {};
  if (n === 'save_game') { try { zapisy.push(JSON.parse(r.request().postData() ?? '{}')); } catch { /* */ } body = true; }
  if (n === 'heartbeat') body = true;
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${PORT}/?ostrosc=1#postac=Jam&kod=ANGELIKA`);
await p.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
await p.waitForTimeout(5000);
const s = TEL ? 'tel' : 'pc';
await p.screenshot({ path: `work/edytor/${s}-gra.png` });
const portret0 = await p.evaluate(() => document.querySelector('.tel-portret img, .tel-portret, .hud-avpic')?.outerHTML?.slice(0, 80));
await p.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
await p.waitForTimeout(1000);
const swiatlo = await p.evaluate(() => !!document.getElementById('samouczek'));
await p.screenshot({ path: `work/edytor/${s}-kufer-podpowiedz.png` });
assert(swiatlo, 'the look tab is pointed at on the first opening');
await p.evaluate(() => document.querySelector('#character .k-tab[data-strona="wyglad"]').click());
await p.waitForTimeout(400);
await p.evaluate(() => document.getElementById('samouczek')?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, bubbles: true })));
await p.waitForTimeout(300);
if (!(await p.locator('#character .k-wyg-row').count())) await p.evaluate(() => document.querySelector('#character .k-tab[data-strona="wyglad"]').click());
const pelne = async () => p.evaluate(() => {
  const c = document.querySelector('#character .k-wyg-ramka canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n / (c.width * c.height);
});
await p.waitForFunction(() => { const c = document.querySelector('#character .k-wyg-ramka canvas'); if (!c) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 400) if (d[i]) return true; return false; }, null, { timeout: 20000 });
console.log('figura wypełnia', (await pelne()).toFixed(2));
await p.screenshot({ path: `work/edytor/${s}-wyglad-1.png` });
const klik = async (cls, ktory) => {
  await p.locator(`#character .${cls} .k-wyg-strz`).nth(ktory).click();
  await p.waitForTimeout(700);
};
await klik('k-wyg-fryzura', 1);
await klik('k-wyg-wlosy', 1);
await klik('k-wyg-skora', 1); await klik('k-wyg-skora', 1); await klik('k-wyg-skora', 1); await klik('k-wyg-skora', 1);
const wyg = await p.evaluate(() => window.__session.look.wyg);
console.log('wygląd', wyg);
assert.deepEqual(wyg, { f: 'loki', w: 5, s: 4 });
await p.screenshot({ path: `work/edytor/${s}-wyglad-2.png` });
const przewija = await p.evaluate(() => { const b = document.querySelector('#character .k-body'); return b.scrollHeight - b.clientHeight; });
console.log('przewijanie', przewija);
await p.keyboard.press('Escape');
await p.waitForTimeout(1500);
const ost = zapisy.at(-1);
console.log('zapisów', zapisy.length, 'look.wyg w zapisie', ost?.p_save?.look?.wyg);
assert.deepEqual(ost?.p_save?.look?.wyg, wyg, 'saved on close');
await p.waitForTimeout(2500);
await p.screenshot({ path: `work/edytor/${s}-gra-po.png` });
const portret1 = await p.evaluate(() => document.querySelector('.tel-portret img, .tel-portret, .hud-avpic')?.outerHTML?.slice(0, 80));
console.log({ portret0, portret1 });
console.log({ errs });
assert.deepEqual(errs, []);
console.log('OK');
await b.close();

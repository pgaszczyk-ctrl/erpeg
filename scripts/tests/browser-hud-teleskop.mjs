// The telescopic HUD (artist 39-G002, test server with turn fights): folded at the start, a tap on the portrait slides
// the four buttons out one after another, a button does nothing while moving or on the opening touch, works once open
// (Dziennik → Kufer at the quest log), folds by itself after 4 s; life shows only while hurt and a tap on it heals.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-hud-teleskop.mjs   (TELEFON=1)
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
  const vw = Number(process.env.SZER || (mobile ? 390 : 1280));
  const context = await browser.newContext({ viewport: mobile ? { width: vw, height: 844 } : { width: vw, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, mikstury: 2, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
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
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const tap = async (sel) => {
    const b = await page.locator(sel).boundingBox();
    assert(b, `${sel} on screen`);
    if (mobile) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  assert(await page.locator('#hud-tel').count(), 'telescopic HUD mounted');
  assert.equal(await g(() => getComputedStyle(document.querySelector('#hud .hud-m')).display), 'none', 'no boiler at the bottom');
  // Full life: no life tube.
  await g(() => { const s = window.__game.scene.getScene('game'); s.emitHud(); });
  await page.waitForTimeout(600);
  assert.equal(await page.locator('#hud-tel .tel-zycie').isHidden(), true, 'life hidden at full health');
  await page.screenshot({ path: `work/teleskop-${tag}-zwiniety.png` });
  // Open: mid-way and fully out.
  await tap('#hud-tel .tel-portret');
  await page.waitForTimeout(140);
  const srodek = await g(() => window.__teleskop());
  await page.screenshot({ path: `work/teleskop-${tag}-w-ruchu.png` });
  console.log('w ruchu', JSON.stringify(srodek));
  assert(srodek.t > 0 && !srodek.otwarta, 'mid-way while opening');
  await page.waitForTimeout(400);
  const otw = await g(() => window.__teleskop());
  console.log('otwarty', JSON.stringify(otw));
  assert.equal(otw.otwarta, true);
  assert.deepEqual(otw.kola.map((k) => k.top), ['60px', '112px', '164px', '216px'], 'final positions 52 px apart');
  await page.screenshot({ path: `work/teleskop-${tag}-otwarty.png` });
  // Dziennik → Kufer at the quest log; the column folds.
  await tap('#hud-tel .tel-kolo:nth-of-type(2)');
  await page.waitForTimeout(700);
  const kufer = await g(() => !!document.querySelector('.k-box, #character, .k-wrap'));
  console.log('kufer', kufer);
  assert(kufer, 'Dziennik opened the Kufer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  assert.equal((await g(() => window.__teleskop())).t, 0, 'folded after the choice');
  // Auto-fold after 4 s.
  await tap('#hud-tel .tel-portret');
  await page.waitForTimeout(4700);
  assert.equal((await g(() => window.__teleskop())).t, 0, 'folded by itself after 4 s');
  // Hurt: life tube, a tap heals with a potion.
  await g(() => { const s = window.__game.scene.getScene('game'); s.player.hp = 3; s.emitHud(); });
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#hud-tel .tel-zycie').isVisible(), true, 'life shown while hurt');
  await page.screenshot({ path: `work/teleskop-${tag}-ranny.png` });
  await tap('#hud-tel .tel-zycie');
  await page.waitForTimeout(500);
  const hp = await g(() => window.__game.scene.getScene('game').player.hp);
  console.log('po leczeniu', hp);
  assert(hp > 3, 'a tap on the life tube healed');
  assert.deepEqual(errors, []);
  console.log('OK teleskop', tag, vw);
} finally {
  await browser.close();
}

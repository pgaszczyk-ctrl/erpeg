// A dialog open while the screen changes size (owner, 8 Nov 2026: iPhone sideways – the window stayed laid out for the
// old, taller screen, its buttons below the edge, and the game hung). The dialog must be laid out again and stay pressable.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & MAPA=1 node scripts/tests/browser-dialog-obrot.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 700 }, hasTouch: true, deviceScaleFactor: 2, locale: 'pl-PL' });
  if (process.env.MAPA === '1') {
    const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0];
    const map = { unitsPerM: 1.92, w: 6000, h: 6000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 }, boundary: [ring], areas: [['paved', ring]], lines: [['minor', 0, [0, 3000, 5760, 0], 'Test']], buildings: [], pois: [], towns: [['Lublin', 2880, 2880]] };
    await context.route('**/map/lublin.json', r => r.fulfill({ json: map }));
    await context.route('**/map/world.json', r => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
  }
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = true;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 }, flagi: { samouczek: 1 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const stan = () => page.evaluate(() => {
    const ui = window.__game.scene.getScene('ui');
    const btns = ui.dialogButtons.filter((b) => b.index >= 0).map((b) => ({ y: b.rect.y + b.rect.height, x: b.rect.x + b.rect.width / 2, cy: b.rect.y + b.rect.height / 2, v: b.rect.visible }));
    return { otwarte: !!ui.dialogBox, btns, h: ui.view.height, w: ui.view.width, scrollMax: ui.scrollMax };
  });
  await page.evaluate(() => {
    window.__wybor = [];
    window.__game.scene.getScene('game').dialog({ title: 'Exp-lore', text: 'Gra jest wciąż w przygotowaniu. Exp-loruj śmiało, ale poza Lublinem zadań jest na razie znacznie mniej.\n\nPs. Na wyprawę dobrze zabrać ze sobą namiot. Pierwszy gratis!', buttons: ['OK', 'Anuluj'], onChoose: (i) => window.__wybor.push(i) });
  });
  await page.waitForTimeout(400);
  console.log('przed', await stan());
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 844, height: 340 });
  await page.waitForTimeout(800);
  const s = await stan();
  console.log('po', s);
  await page.screenshot({ path: 'work/dialog-obrot.png' });
  assert(s.otwarte, 'dialog still open');
  assert.equal(s.h, 340, 'game follows the new height');
  const widoczne = s.btns.filter((b) => b.v && b.y <= s.h + 0.5);
  assert(widoczne.length || s.scrollMax > 0, 'a button fits on screen (or the dialog scrolls)');
  const b = widoczne[0];
  await page.touchscreen.tap(b.x, b.cy);
  await page.waitForTimeout(500);
  const wybor = await page.evaluate(() => window.__wybor);
  console.log('wybór', wybor);
  assert.deepEqual(wybor, [0], 'tapping the button chooses it');
  console.log('OK');
} finally {
  await browser.close();
}

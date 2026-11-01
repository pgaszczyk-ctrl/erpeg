// Long talks come in portions with „Dalej ▶” and letters appear one by one (owner, 1 Nov 2026).
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-dialog-strony.mjs  (TELEFON=1 for a phone sideways)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TEL = process.env.TELEFON === '1';
await mkdir('work', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext(TEL
    ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'pl-PL' }
    : { viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
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
  await page.waitForTimeout(8000);
  const tekst = 'Pod Trybunałem siedzi na kamiennym schodku starsza kobieta w wyblakłej chuście i ściska w dłoniach pomięty papier.\n\n„Wdowa Agata jestem. Pan Złotousty, ten od złotych guzików i słodkich słówek, pokazał w Trybunale dokument, że mój dom przy Grodzkiej należy do niego. Pieczęć prawdziwa, podpis niby prawdziwy… a przecież ja nic nie podpisywałam! Sędziowie tylko rozłożyli ręce.\n\nA wiesz, co jest najdziwniejsze? Od tamtego dnia stary stół z wypaloną łapą – ten, który dziś stoi na Zamku – żarzy się nocami jak węgiel. Pisarz Trybunału mówi, że to znak. Że ktoś musi wydać sprawiedliwy wyrok, zanim zrobią to inni.\n\nPomożesz mi?”';
  const stan = () => page.evaluate(() => {
    const ui = window.__game.scene.getScene('ui');
    const btns = ui.dialogButtons.filter((b) => b.index >= 0);
    const linie = ui.scrollRows.filter((r) => !r.btns).flatMap((r) => r.texts).map((t) => t.text).join('\n');
    const box = ui.dialogBox?.getBounds();
    return { otwarte: ui.hasDialog, pisze: !!ui.pisanie, strona: ui.strony ? [ui.strony.i, ui.strony.strony.length] : null, przyciski: btns.map((b) => b.rect.visible), etykiety: ui.scrollRows.filter((r) => r.btns).flatMap((r) => r.texts).map((t) => t.text), linie, scrollMax: ui.scrollMax, gora: box?.y, dol: box ? box.y + box.height : 0, h: ui.view.height };
  });
  const wybrano = [];
  await page.evaluate((t) => {
    const s = window.__game.scene.getScene('game');
    window.__wybor = [];
    s.dialog({ title: 'Wdowa Agata – Czarci Wyrok', text: t, buttons: ['Przyjmuję', 'Później'], kto: { tex: 'hd-babcia' }, onChoose: (i) => window.__wybor.push(i) });
  }, tekst);
  await page.waitForTimeout(500);
  let s = await stan();
  console.log('pisanie', s);
  assert(s.pisze, 'letters are written one by one');
  assert(s.strona && s.strona[1] >= 2, 'long talk is paged');
  assert(s.przyciski.every((v) => !v), 'buttons wait for the text');
  assert(s.linie.length < 60, 'only part of the text written');
  await page.screenshot({ path: `work/dialog-strony-pisze${TEL ? '-tel' : ''}.png` });
  const tap = async () => { const c = await page.$('canvas'); const b = await c.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + 40); await page.waitForTimeout(350); };
  await tap();
  s = await stan();
  assert(!s.pisze && s.przyciski.every(Boolean), 'tap writes the rest and shows the buttons');
  let n = 0;
  while (s.strona && s.strona[0] < s.strona[1] - 1) {
    console.log('strona', s.strona, s.etykiety, 'dół', Math.round(s.dol), '/', s.h);
    assert.equal(s.scrollMax, 0, 'a portion fits without scrolling');
    assert(s.dol <= s.h + 1 && s.gora >= 0, 'window on screen');
    assert(/Dalej/.test(s.etykiety[0]), 'Dalej button');
    await page.screenshot({ path: `work/dialog-strony-${n}${TEL ? '-tel' : ''}.png` });
    // Press the Dalej button.
    const xy = await page.evaluate(() => { const ui = window.__game.scene.getScene('ui'); const r = ui.dialogButtons.find((b) => b.index === 0).rect.getBounds(); const c = document.querySelector('canvas').getBoundingClientRect(); const k = c.width / ui.view.width; return [c.left + (r.centerX) * k, c.top + r.centerY * k]; });
    await page.mouse.click(xy[0], xy[1]); await page.waitForTimeout(350);
    s = await stan();
    if (s.pisze) { await tap(); s = await stan(); }
    n++;
    assert(n < 8);
  }
  console.log('ostatnia', s.strona, s.etykiety);
  await page.screenshot({ path: `work/dialog-strony-ostatnia${TEL ? '-tel' : ''}.png` });
  assert.deepEqual(s.etykiety, ['Przyjmuję', 'Później'], 'real buttons on the last portion');
  assert.equal(s.scrollMax, 0);
  assert.deepEqual(await page.evaluate(() => window.__wybor), [], 'Dalej never chose');
  await page.evaluate(() => { const ui = window.__game.scene.getScene('ui'); const d = ui.dialogChoose; ui.closeDialog(); d(0); });
  assert.deepEqual(await page.evaluate(() => window.__wybor), [0]);
  assert(!(await page.evaluate(() => window.__game.scene.isPaused('game'))), 'game resumed');
  // Escape on the first portion skips to the last.
  await page.evaluate((t) => window.__game.scene.getScene('game').dialog({ title: 'Test', text: t, buttons: ['OK', 'Nie'], kto: { tex: 'hd-babcia' }, onChoose: (i) => window.__wybor.push(i) }), tekst);
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  s = await stan();
  assert.deepEqual(s.etykiety, ['OK', 'Nie'], 'Escape skips to the last portion');
  // A short menu text is shown at once.
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => window.__game.scene.getScene('game').dialog({ title: 'Krótko', text: 'Gra zapisana.', buttons: ['OK'], kto: null, onChoose: () => {} }));
  await page.waitForTimeout(300);
  s = await stan();
  assert(!s.pisze && !s.strona, 'short system text at once');
  console.log('OK');
} finally { await browser.close(); }

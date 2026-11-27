// VITE_TEST=1 npm run build && npm run preview -- --port 4173
// BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/tests/browser-alchemik.mjs (TELEFON=1 for mobile)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phone = process.env.TELEFON === '1';
const language = phone ? 'en' : 'pl';
const price = phone ? 75 : 60;
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
try {
  const context = await browser.newContext(phone
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
    : { viewport: { width: 1280, height: 720 } });
  const saves = [];
  await context.route('**/*.supabase.co/**', route => {
    let body = true;
    const rpc = new URL(route.request().url()).pathname.split('/').pop();
    if (rpc === 'login') {
      body = {
        token: 't',
        player: {
          name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000,
          map_scale: 1.92, exp: 400, dead: false, age: 12,
          save: { coins: price, fruits: { jablko: 50 }, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } },
        },
      };
    }
    if (rpc === 'game_settings') body = phone ? { alchemik_cena: price } : {};
    if (rpc === 'game_stwory') body = {};
    if (['game_content', 'school_quizzes', 'game_ports'].includes(rpc)) body = [];
    if (rpc === 'server_now') body = new Date().toISOString();
    if (rpc === 'save_game') saves.push(route.request().postDataJSON().p_save);
    return route.fulfill({ json: body });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:4173/?lang=${language}&live=1&pogoda=czysto#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game')
    && window.__game.scene.getScene('game').firstViewReady?.()
    && document.getElementById('loading-map')?.hidden, null, { timeout: 120000 });

  const open = () => page.evaluate(() => {
    const game = window.__game.scene.getScene('game');
    const ui = window.__game.scene.getScene('ui');
    ui.closeDialog();
    game.openPlaceInner({ kind: 'alchemist', name: 'Test' });
    return ui.dialogAktualny.buttons;
  });
  async function choose(index) {
    await page.waitForFunction(i => {
      const ui = window.__game.scene.getScene('ui');
      return ui.time.now - ui.dialogOpenedAt >= 250 && ui.dialogButtons.some(b => b.index === i && b.rect.visible);
    }, index);
    await page.evaluate(i => {
      const ui = window.__game.scene.getScene('ui');
      const bounds = ui.dialogButtons.find(b => b.index === i).rect.getBounds();
      ui.onDialogTap(bounds.centerX, bounds.centerY);
    }, index);
  }
  const state = () => page.evaluate(() => {
    const { coins, mikstury, stats } = window.__session;
    return { coins, mikstury, spent: stats.spent };
  });

  const buttons = await open();
  assert.equal(buttons[1], phone ? `🪙 Buy potion – ${price} gold` : `🪙 Kup miksturę – ${price} złota`);
  await chooseAndCheckSave(1, 1, 50);
  assert.deepEqual(await state(), { coins: 0, mikstury: 1, spent: price });
  await open();
  await choose(1);
  assert.deepEqual(await state(), { coins: 0, mikstury: 1, spent: price });
  await open();
  await chooseAndCheckSave(0, 2, 0);
  assert.deepEqual(await state(), { coins: 0, mikstury: 2, spent: price });
  assert.deepEqual(errors, []);
  console.log(`PASS alchemist (${phone ? 'mobile EN, configured price' : 'desktop PL, default price'})`);

  async function chooseAndCheckSave(index, potions, apples) {
    await Promise.all([
      page.waitForEvent('response', {
        predicate: r => r.url().endsWith('/save_game') && r.ok()
          && r.request().postDataJSON().p_save.mikstury === potions,
      }),
      choose(index),
    ]);
    const save = saves.find(s => s.mikstury === potions);
    assert.equal(save?.coins, 0);
    assert.equal(save.bag.reduce((count, slot) => count + (slot.counts?.jablko ?? 0), 0), apples);
  }
} finally {
  await browser.close();
}

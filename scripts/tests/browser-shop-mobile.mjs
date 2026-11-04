// Built game, isolated account and map. All server writes stay inside Playwright fixtures.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await preview({ preview: { host: '127.0.0.1', port: 4186, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
await mkdir('work/shop-mobile', { recursive: true });
const ring = [0, 0, 6000, 0, 0, 6000, -6000, 0];
const map = { unitsPerM: 1.92, w: 6000, h: 6000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 },
  boundary: [ring], areas: [['paved', ring]], lines: [['minor', 0, [0, 3000, 6000, 0], 'Test']], buildings: [], pois: [], towns: [['Lublin', 3000, 3000]] };
try {
  for (const [name, width, height, mobile] of [['small', 320, 568, true], ['landscape', 844, 390, true], ['portrait', 390, 844, true],
    ['reference', 1280, 570, true], ['native-portrait', 390, 844, false], ['desktop', 1280, 800, false]]) {
    const compact = width <= 700 || height <= 600;
    if (process.env.SHOP_DEVICE && name !== process.env.SHOP_DEVICE) continue;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', reducedMotion: 'reduce' });
    // Avoid fullscreen changes caused by the emulated phone's first touch.
    await context.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error('fixture')); });
    await context.route('**/map/lublin.json', r => r.fulfill({ json: map }));
    await context.route('**/map/world.json', r => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
    await context.route('**/*.supabase.co/**', r => {
      const fn = new URL(r.request().url()).pathname.split('/').pop();
      let body = true;
      if (fn === 'login') body = { token: 'fixture', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000,
        map_scale: 1.92, exp: 400, age: 12, dead: false, save: { coins: 90000, diamenty: 99, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 },
          equip: { bron: 'kijek' }, bag: [{ goods: 'owoce', counts: { jablko: 10 } }, { goods: 'warzywa', counts: { marchewka: 5 } }, { item: 'korona' }, { item: 'zelazny' }, { item: 'zelazny' }, { item: 'zelazny_helm' }, { item: 'miecz_rekruta' }] } } };
      if (fn === 'game_settings') body = {};
      if (['game_content', 'school_quizzes', 'game_ports', 'game_stwory', 'kurier_wiesci'].includes(fn)) body = [];
      if (fn === 'server_now') body = new Date().toISOString();
      if (fn === 'ma_stan') body = { enabled: false };
      return r.fulfill({ json: body });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.log(name, 'pageerror', e.message); });
    console.log('START', name);
    await page.goto('http://127.0.0.1:4186/?lang=pl&pogoda=czysto&ostrosc=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && document.getElementById('loading-map')?.hidden, null, { timeout: 120000 }).catch(async error => {
      await page.screenshot({ path: `work/shop-mobile/${name}-loading-failed.png` });
      console.log(await page.evaluate(() => ({ cover: document.getElementById('loading-map')?.textContent, scenes: window.__game?.scene.scenes.map(s => [s.sys.settings.key, s.sys.settings.status]) })));
      throw error;
    });
    console.log('READY', name);
    const open = () => page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      s.noHurtUntil = Infinity; s.protectUntil = Infinity;
      window.__game.scene.getScene('ui').closeDialog();
      s.openShop({ id: 'shop:fixture', kind: 'shop', name: 'Żabka', door: { x: s.player.x, y: s.player.y } });
    });
    await open();
    await page.locator('#shop .s26-action').waitFor();
    const fits = async () => {
      const layout = await page.evaluate(() => {
        const q = s => document.querySelector('#shop ' + s);
        const box = q('.s26-box'), root = document.getElementById('shop');
        const inside = e => {
          const r = e.getBoundingClientRect();
          return r.left >= -1 && r.top >= -1 && r.right <= document.documentElement.clientWidth + 1 && r.bottom <= document.documentElement.clientHeight + 1;
        };
        return { box: box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1,
          root: root.scrollHeight <= root.clientHeight + 1, visible: [q('.s26-tabs'), q('.s26-detail'), q('.s26-close'), q('.s26-action')].filter(Boolean).every(inside),
          rotated: document.documentElement.classList.contains('exp-obrot') };
      });
      if (!(layout.box && layout.root && layout.visible)) await page.screenshot({ path: `work/shop-mobile/${name}-overflow.png` });
      assert(layout.box && layout.root && layout.visible, `${name} fits without scrolling the shop: ${JSON.stringify(layout)}`);
    };
    if (compact) await fits();
    await page.screenshot({ path: `work/shop-mobile/${name}-buy.png` });
    // Native click/tap, real transaction and refreshed offer.
    const before = await page.evaluate(() => window.__session.coins);
    const buyId = await page.locator('#shop .s26-action').getAttribute('data-action');
    await page.locator('#shop .s26-action').click();
    await page.waitForFunction(n => window.__session.coins < n, before);
    assert(await page.locator('#shop').count(), 'shop remains open after purchase');
    assert(!(await page.locator('#shop .s26-action').getAttribute('data-action') === buyId), 'purchased offer refreshed');
    if (compact) await fits();
    assert.equal(await page.locator('#shop .s26-tab').count(), 2, 'only Buy/Sell remain');
    assert.equal(await page.locator('#shop .s26-backpack, #shop .s26-bag-tab').count(), 0);
    await page.locator('#shop [data-focus="tab:1"]').click();
    const equipment = await page.evaluate(() => JSON.stringify(window.__gear.equip));
    assert.equal(await page.locator('#shop .s26-cell img[src$="/zelazny.png"]').count(), 2, 'both spare swords are offered');
    for (let i = 0; i < 2; i++) {
      await page.locator('#shop .s26-cell').filter({ has: page.locator('img[src$="/zelazny.png"]') }).first().click();
      const coins = await page.evaluate(() => window.__session.coins);
      assert((await page.locator('#shop .s26-action').innerText()).includes('600'));
      await page.waitForTimeout(380);
      const saved = page.waitForRequest(r => r.url().endsWith('/save_game') && r.postDataJSON()?.p_save?.coins === coins + 600);
      await page.locator('#shop .s26-action').click();
      await page.waitForFunction(n => window.__session.coins === n + 600, coins);
      const snapshot = (await saved).postDataJSON().p_save;
      assert.equal(snapshot.bag.filter(s => s.item === 'zelazny').length, 1 - i, 'sale is persisted with the remaining copies');
      assert.equal(await page.locator('#shop .s26-cell img[src$="/zelazny.png"]').count(), 1 - i);
      assert.equal(await page.evaluate(() => JSON.stringify(window.__gear.equip)), equipment);
      if (compact) await fits();
    }
    await page.locator('#shop .s26-cell').filter({ has: page.locator('img[src$="/zelazny_helm.png"]') }).click();
    const helmetCoins = await page.evaluate(() => window.__session.coins);
    const helmetPrice = Number((await page.locator('#shop .s26-action span').innerText()).replace(/\D/g, ''));
    await page.screenshot({ path: `work/shop-mobile/${name}-sell-equipment.png` });
    await page.waitForTimeout(380);
    await page.locator('#shop .s26-action').click();
    await page.waitForFunction(({ before, price }) => window.__session.coins === before + price && !window.__gear.bag.some(s => s.item === 'zelazny_helm'), { before: helmetCoins, price: helmetPrice });
    await page.locator('#shop .s26-cell').filter({ has: page.locator('img[src$="/korona.png"]') }).click();
    assert(await page.locator('#shop .s26-action').isDisabled(), 'unpriced rewards explain why they cannot be sold');
    assert((await page.locator('#shop .s26-info').innerText()).includes('kupiec go nie skupuje'));
    const itemsBeforeBulk = await page.evaluate(() => JSON.stringify(window.__gear.bag.filter(s => !('goods' in s))));
    await page.locator('#shop [data-entry="sell:all"]').click();
    if (compact) await fits();
    await page.screenshot({ path: `work/shop-mobile/${name}-sell.png` });
    const sellBefore = await page.evaluate(() => window.__session.coins);
    await page.waitForTimeout(380);
    await page.locator('#shop [data-action="sell:all"]').click();
    await page.waitForFunction(n => window.__session.coins > n && !window.__gear.bag.some(s => 'goods' in s), sellBefore);
    assert.equal(await page.evaluate(() => JSON.stringify(window.__gear.bag)), itemsBeforeBulk, 'bulk harvest sale keeps all equipment/rewards');
    await page.evaluate(() => {
      window.__gear.bag = [];
      const s = window.__game.scene.getScene('game');
      s.openShop({ id: 'shop:fixture', kind: 'shop', name: 'Żabka', door: { x: s.player.x, y: s.player.y } }, 1);
    });
    assert.equal(await page.locator('#shop .s26-action').count(), 0, 'empty backpack has no transaction button');
    if (compact) await fits();
    // Back closes the same shop after sales and refreshes.
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('shop'));
    if (compact) {
      await open();
      await page.evaluate(() => {
        const ui = window.__game.scene.getScene('ui');
        const entries = Array.from({ length: 90 }, (_, i) => ({ id: `stress:${i}`, index: i, category: 'supplies', name: `Towar ${i + 1}`,
          picture: 'items_hd/siekiera.png', price: 100, description: 'Pełny opis przedmiotu pozostaje dostępny. '.repeat(60) }));
        ui.showDialog({ title: 'Sklep z długą nazwą i dużą ofertą', buttons: ['Wyjdź'], onChoose() {}, shop: { entries, banner: 'kupiec_01', subtitle: '' } });
      });
      await fits();
      const overflow = await page.evaluate(() => {
        const stock = document.querySelector('#shop .s26-stock'), info = document.querySelector('#shop .s26-info');
        stock.scrollTop = 100; info.scrollTop = 100;
        return stock.scrollHeight > stock.clientHeight && info.scrollHeight > info.clientHeight && stock.scrollTop > 0 && info.scrollTop > 0;
      });
      assert(overflow, 'large stock and full description scroll independently');
      await fits();
      await page.locator('#shop .s26-close').click();
      await page.waitForFunction(() => !document.getElementById('shop'));
    }
    if (name === 'landscape') {
      await open();
      await page.setViewportSize({ width: 1280, height: 800 });
      assert.equal(await page.locator('#shop .s26-tab').count(), 2);
      await page.setViewportSize({ width: 844, height: 390 });
      await fits();
      await page.locator('#shop .s26-close').click();
      await page.waitForFunction(() => !document.getElementById('shop'));
    }
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`PASS ${name}: layout, purchase, individual swords/helmet, protected rewards, bulk harvests, empty stock, history`);
    await context.close();
  }
} finally { await browser.close(); await server.httpServer.close(); }

// Production regression: TEST saves ~-prefixed fog; production must load it without losing explored cells.
// PORT=4175 NODE_PATH=<playwright modules> node scripts/tests/browser-fog-compat.mjs
// EXPECT_BROKEN=1 verifies the original production failure before applying the draft patch.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ channel: 'chromium', args: ['--no-sandbox'] });
mkdirSync('work/fog-compat', { recursive: true });
try {
  for (const phone of [false, true]) {
    const ctx = await browser.newContext({
      viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: phone, hasTouch: phone, reducedMotion: 'reduce',
    });
    const raw = btoa(String.fromCharCode(1, ...new Uint8Array(511)));
    if (process.env.LIVE_MAPS === '1') await ctx.route('**/map/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const response = await route.fetch({ url: `https://exp-lore.app${path}` });
      assert(response.ok(), `published map request failed: ${path}`);
      await route.fulfill({ response });
    });
    await ctx.route('**/*.supabase.co/**', (route) => {
      const rpc = new URL(route.request().url()).pathname.split('/').pop();
      let body = null;
      if (rpc === 'login') body = { token: 'fixture-token', player: {
        name: 'Jam', idik: 'ANGELIKA', start_place: 'fixture', start_x: 7500, start_y: 6500,
        map_scale: 1.92, exp: 450, dead: false, age: 12, konto: false,
        save: { coins: 5, story: { st: 'koniec' }, fog: { s: 1.92, chunks: {
          '-20,-20': '~AIAg', '-19,-20': raw,
        } } },
      } };
      if (/game_content|school_quizzes|game_ports|kurier_wiesci/.test(rpc)) body = [];
      if (rpc === 'game_settings') body = {};
      if (['heartbeat', 'save_game'].includes(rpc)) body = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('exp-postac', JSON.stringify({ name: 'Jam', code: 'ANGELIKA' })));
    await page.goto(`http://127.0.0.1:${process.env.PORT || 4175}/?ostrosc=1&lang=pl`);
    await page.getByRole('button', { name: /Kontynuuj/ }).click({ timeout: 60000 });
    if (process.env.EXPECT_BROKEN) {
      await page.getByText(/Nie udało się przygotować mapy/).waitFor({ timeout: 120000 });
      assert.match(await page.locator('#loading-map').innerText(), /atob/);
      console.log(`Reproduced original atob failure: ${phone ? 'phone' : 'desktop'}`);
    } else {
      await page.waitForFunction(() => {
        const game = window.__game;
        const scene = game?.scene.getScene('game');
        return game?.scene.isActive('game') && scene?.firstViewReady?.() &&
          !document.querySelector('#loading-map:not([hidden])');
      }, null, { timeout: 150000 });
      const cells = await page.evaluate(() => {
        const explored = window.__game.scene.getScene('game').explored;
        return [explored.hasCell(-1280, -1280), explored.hasCell(-1217, -1217),
          explored.hasCell(-1216, -1280), explored.hasCell(-1215, -1280)];
      });
      assert.deepEqual(cells, [true, true, true, false], 'compressed and raw fog retain their exact cells');
      assert.deepEqual(errors, []);
      console.log(`PASS mixed-format save loads and preserves fog: ${phone ? 'phone' : 'desktop'}`);
    }
    await page.screenshot({ path: `work/fog-compat/${process.env.EXPECT_BROKEN ? 'before' : 'after'}-${phone ? 'phone' : 'desktop'}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
}

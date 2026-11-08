// Start anywhere + default names (owner, 8 Nov 2026). The new-character form: a random name is filled in, „Paryż”
// makes a character whose load point is on the world map at Paris; a Lublin address still starts in Lublin.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-start-swiat.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  for (const [miejsce, swiat] of [['Paryż', true], ['Zamkowa 9', false]]) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 800 }, locale: 'pl-PL' });
    const zapisy = [];
    let utworz = null;
    await ctx.route('**/*.supabase.co/**', (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      const req = route.request().postDataJSON?.() ?? {};
      let body = null;
      if (name === 'create_character') { utworz = req; body = { token: 't', player: { name: req.p_name, idik: 'ABCDEFGH', start_place: req.p_start_place, start_x: req.p_start_x, start_y: req.p_start_y, map_scale: 1.92, save: {}, exp: 0, dead: false, age: req.p_age } }; }
      if (name === 'save_game') zapisy.push(req.p_save);
      if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
      if (name === 'game_settings') body = {};
      if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
      if (name === 'server_now') body = new Date().toISOString();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await ctx.route('**/nominatim.openstreetmap.org/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:4173/?lang=pl#nowa');
    const imie = page.locator('#menu input').first();
    await imie.waitFor({ timeout: 120000 });
    const v = await imie.inputValue();
    assert(v.length >= 2, 'a name is filled in');
    console.log('imię domyślne:', v);
    await page.locator('#menu input').nth(1).fill(miejsce);
    await page.getByRole('button', { name: 'Stwórz postać' }).click();
    for (let i = 0; i < 120 && !zapisy.length; i++) await page.waitForTimeout(500);
    const err = await page.locator('.m-error').allTextContents();
    assert(zapisy.length, `saved (${err.join(' ')})`);
    assert.equal(utworz.p_name, v);
    const at = zapisy[0].at;
    console.log(miejsce, '→ at', JSON.stringify(at));
    if (swiat) assert(at && at.m.startsWith('w:48.9') && /,2\.3/.test(at.m), 'Paris world map');
    else assert(!at, 'Lublin start, no world load point');
    await ctx.close();
  }
  console.log('OK');
} finally {
  await browser.close();
}

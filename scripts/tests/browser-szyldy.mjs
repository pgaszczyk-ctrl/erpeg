// Sign light and swing (artist's 36-G002) on the test build, Lublin map: by day the double blink every 2–3 s,
// at night the steady light; the shop board shows its three frames, other boards lean by code.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-szyldy.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  // A day zone and a night zone for the device clock (isNight reads the local hour).
  const nowUtc = new Date().getUTCHours();
  const zone = (want) => ['Pacific/Honolulu', 'America/New_York', 'Europe/London', 'Europe/Warsaw', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Tokyo', 'Pacific/Auckland']
    .find((z) => { const h = Number(new Date().toLocaleString('en-GB', { timeZone: z, hour: '2-digit', hour12: false })); return want === 'day' ? h >= 10 && h < 16 : h >= 23 || h < 4; });
  for (const [pora, viewport, mobile] of [['dzien', { width: 1280, height: 860 }, false], ['noc', { width: 1280, height: 860 }, false], ['dzien', { width: 390, height: 844 }, true]]) {
    const timezoneId = zone(pora === 'dzien' ? 'day' : 'night');
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', deviceScaleFactor: mobile ? 2 : 1, timezoneId });
    const errors = [];
    await context.route('**/*.supabase.co/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = null;
      if (path.endsWith('/login')) body = { token: 't', player: { name: 'Arceus', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 10, hp: 10 }, exp: 50000, dead: false, died_at: null, age: 9, immortal: true } };
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
    page.on('dialog', (d) => d.accept());
    await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto#postac=Arceus&kod=ANGELIKA');
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').posts?.length > 0, null, { timeout: 120000 });
    // Walk up to a shop's post and wait for the map there.
    const shop = await page.evaluate(() => {
      const s = window.__game.scene.getScene('game');
      const q = s.posts.find((p) => p.frames) ?? s.posts[0];
      s.player.setPosition(q.post.x + 14, q.post.y + 18);
      s.cameras.main.centerOn(q.post.x, q.post.y);
      s.noHurtUntil = s.time.now + 600000;
      return { frames: q.frames, x: q.post.x, y: q.post.y, night: s.postsNight };
    });
    console.log(pora, mobile ? 'phone' : 'desktop', timezoneId, JSON.stringify(shop));
    assert(shop.frames, 'A shop board with the artist frames');
    await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady(), null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    // Sample the light and the board over 3.5 s: day blinks (flash/dim/base), the board goes through frames 0, 1, 2.
    const probe = await page.evaluate(async () => {
      const s = window.__game.scene.getScene('game');
      const q = s.posts.find((p) => p.frames);
      const alphas = new Set(), frames = new Set();
      for (let i = 0; i < 140; i++) {
        alphas.add(q.pool.alpha.toFixed(2));
        frames.add(q.board.frame.name);
        await new Promise((r) => setTimeout(r, 25));
      }
      return { alphas: [...alphas], frames: [...frames], lamp: q.lamp.visible, night: s.postsNight, tex: q.pool.texture.key };
    });
    console.log(' probe', JSON.stringify(probe));
    assert.equal(probe.tex, 'snop-szyldu');
    assert.deepEqual(probe.frames.map(String).sort(), ['0', '1', '2']);
    if (pora === 'dzien') {
      assert.equal(probe.night, false);
      assert(probe.alphas.includes('0.85') && probe.alphas.includes('0.35'), 'Day: flash and base');
    } else assert.equal(probe.night, true);
    const shot = async (name) => page.screenshot({ path: `work/szyldy-${pora}-${mobile ? 'phone' : 'desktop'}-${name}.png` });
    await shot('a');
    await page.waitForTimeout(700);
    await shot('b');
    console.log(' errors', errors);
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}

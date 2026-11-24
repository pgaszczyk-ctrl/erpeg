// Loading zoom close-up layers (loadingOkolica.ts): the poster hands over to a drawn map that zooms in sharply.
// Needs `npm run build`. Uses data/world-sample/lublin.pmtiles; the Lublin map is held back so the cover stays.
// TELEFON=1 = upright phone.
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phone = process.env.TELEFON === '1';
const server = await preview({ preview: { host: '127.0.0.1', port: 4191, strictPort: true } });
const pm = await readFile('data/world-sample/lublin.pmtiles');
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
await mkdir('work/okolica', { recursive: true });
try {
  const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: phone, hasTouch: phone, locale: 'pl-PL' });
  let puscMape = false;
  await context.route((u) => /\/map\/lublin\/[^/]+\.json$/.test(u.pathname), async (r) => { while (!puscMape) await new Promise((ok) => setTimeout(ok, 200)); r.continue(); });
  await context.route((u) => u.pathname === '/swiat.pmtiles', (r) => {
    const m = /bytes=(\d+)-(\d+)/.exec(r.request().headers().range ?? '');
    const a = m ? Number(m[1]) : 0, b = m ? Math.min(Number(m[2]), pm.length - 1) : pm.length - 1;
    r.fulfill({ status: 206, headers: { 'content-range': `bytes ${a}-${b}/${pm.length}`, 'accept-ranges': 'bytes', 'content-type': 'application/octet-stream' }, body: pm.subarray(a, b + 1) });
  });
  await context.route('**/*.supabase.co/**', (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop(); let body = null;
    if (fn === 'login') body = { token: 'fixture', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 15356, start_y: 10692, map_scale: 1.92, exp: 400, dead: false, age: 12, konto: true, save: { coins: 0, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } } } };
    if (['heartbeat', 'logout', 'log_error', 'save_game'].includes(fn)) body = true;
    if (['game_content', 'school_quizzes', 'game_ports', 'kurier_wiesci', 'my_characters', 'game_stwory'].includes(fn)) body = [];
    if (fn === 'game_settings') body = {}; if (fn === 'server_now') body = new Date().toISOString();
    return r.fulfill({ json: body });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4191/?lang=pl&world=http://127.0.0.1:4191/swiat.pmtiles#postac=Jam&kod=ANGELIKA', { waitUntil: 'commit' });
  await page.locator('.lm-okolica.on').waitFor({ state: 'attached', timeout: 60000 });
  const t0 = Date.now();
  for (const ms of [200, 1500, 3000, 5000, 8000]) {
    await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
    await page.screenshot({ path: `work/okolica/${phone ? 'telefon' : 'komputer'}-${ms}.png` });
  }
  const px = await page.evaluate(() => { const c = document.querySelector('.lm-okolica'); return { w: c.width, h: c.height, css: c.clientWidth }; });
  assert(px.w >= px.css, 'canvas drawn at the screen\'s real pixels');
  puscMape = true;
  await page.waitForFunction(() => document.getElementById('loading-map')?.hidden, null, { timeout: 120000 });
  assert.equal(await page.locator('.lm-okolica').count(), 0, 'canvas removed after reveal');
  assert.deepEqual(errors, []);
  console.log('ok', phone ? 'telefon' : 'komputer', px);
} finally { await browser.close(); await server.close(); }

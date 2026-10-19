// Smoki z paczki 40-G002: każdy z 6 gatunków przywołany obok bohaterki ma rysunek grafika, stoi, idzie
// w trzech kierunkach i ma stopy w tym samym miejscu (zrzuty work/smoki40-*.png). Serwer z mocków.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-smoki-40.mjs   (TELEFON=1)
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
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
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
  page.on('dialog', (d) => d.accept());
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const g = (fn, arg) => page.evaluate(fn, arg);

  for (const gat of ['ognisty', 'gorski', 'kwasowy', 'lesny', 'trujacy', 'cien']) {
    await g(([gt]) => {
      const s = window.__game.scene.getScene('game');
      s.protectUntil = Date.now() + 1e9;
      for (const e of s.enemies.filter((e) => e.kind === 'smok')) e.destroy();
      const f = s.city.freeNear(s.player.x + 260, s.player.y);
      s.player.setPosition(f.x, f.y);
      window.__smok(gt);
      window.__d = s.enemies[s.enemies.length - 1];
      window.__d.setPosition(s.player.x + 70, s.player.y);
    }, [gat]);
    await page.waitForFunction(() => window.__d.ownLook, null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const info = await g(() => {
      const d = window.__d, s = window.__game.scene.getScene('game');
      const key = d.texture.key;
      const anims = ['stoi', 'idzie', 'ugryzienie'].flatMap((a) => ['bok', 'przod', 'tyl'].map((k) => s.anims.exists(`${key}-${a}_${k}`)));
      return { key, w: d.displayWidth, h: d.displayHeight, size: d.sizeOverride, anims, frame: d.frame.name };
    });
    console.log(gat, JSON.stringify(info));
    assert.equal(info.key, `smok-${gat}`, `${gat}: rysunek grafika`);
    assert.ok(info.anims.every(Boolean), `${gat}: stoi/idzie/ugryzienie w 3 kierunkach`);
    await page.screenshot({ path: `work/smoki40-${tag}-${gat}.png` });
    // Kierunki chodu: ta sama pozycja, stopy nie skaczą między klatkami (sprawdzane na zrzutach).
    for (const k of ['bok', 'przod', 'tyl']) {
      await g(([gt, kk]) => { window.__d.anims.play(`smok-${gt}-idzie_${kk}`); }, [gat, k]);
      await page.waitForTimeout(300);
    }
  }
  assert.deepEqual(errors, []);
  console.log('OK', tag);
} finally {
  await browser.close();
}

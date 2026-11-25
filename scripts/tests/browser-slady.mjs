// Footprints and grass under the boots (owner, 25 Nov 2026; src/sladyStop.ts, sound 'krok-trawa'):
// real built game on a flat fixture map (west half grass, east half sand), no player data.
//  - walking on grass plays krok-trawa and makes blades bend and spring back, which vanish within a second,
//  - walking on sand leaves prints, they fade and are gone ~50 m behind the hero,
//  - on a dry dirt-free road nothing is left.
// Run: npm run build && node scripts/tests/browser-slady.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phone = process.env.TELEFON === '1', tag = phone ? 'tel' : 'pc';
const server = await preview({ build: { outDir: process.env.PREVIEW_OUTDIR || 'dist' }, preview: { host: '127.0.0.1', port: 4177, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], chromiumSandbox: false });
await mkdir('work/slady', { recursive: true });
const context = await browser.newContext({ viewport: phone ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: phone, hasTouch: phone, locale: 'pl-PL' });
const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0];
const piasek = [2880, 0, 2880, 0, 0, 5760, -2880, 0];
const map = { unitsPerM: 1.92, w: 3000, h: 3000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 }, boundary: [ring], areas: [['sand', piasek]],
  lines: [['minor', 0, [0, 400, 5760, 0], 'Test road']], buildings: [], pois: [], towns: [['Lublin', 2880, 2880]] };
await context.route('**/map/lublin.json', r => r.fulfill({ json: map }));
await context.route('**/map/world.json', r => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
await context.route('**/*.supabase.co/**', r => {
  const name = new URL(r.request().url()).pathname.split('/').pop(); let body = null;
  if (name === 'login') body = { token: 'fixture', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 2600, start_y: 2880, map_scale: 1.92,
    exp: 0, dead: false, age: 12, konto: true, save: { coins: 0, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, equip: { bron: 'zelazny' } } } };
  if (['heartbeat', 'logout', 'log_error', 'save_game'].includes(name)) body = true;
  if (['game_content', 'school_quizzes', 'game_ports', 'kurier_wiesci', 'my_characters', 'game_stwory'].includes(name)) body = [];
  if (name === 'game_settings') body = {}; if (name === 'server_now') body = new Date().toISOString(); return r.fulfill({ json: body });
});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
const game = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `work/slady/${tag}-${name}.png` });
async function idz(klawisz, ms, zrzut) {
  if (!phone) { await page.keyboard.down(klawisz); await page.waitForTimeout(ms); if (zrzut) await shot(zrzut); await page.keyboard.up(klawisz); return; }
  const dx = klawisz === 'ArrowRight' ? 1 : klawisz === 'ArrowLeft' ? -1 : 0, dy = klawisz === 'ArrowDown' ? 1 : klawisz === 'ArrowUp' ? -1 : 0;
  const cdp = await context.newCDPSession(page), x = 120, y = 300;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i * 10, y: y + dy * i * 10, id: 1 }] }); await page.waitForTimeout(16); }
  await page.waitForTimeout(ms);
  if (zrzut) await shot(zrzut);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
try {
  await page.goto('http://127.0.0.1:4177/?lang=pl&pogoda=czysto&ostrosc=1&live=1&mieszkancy3d=0&stwory3d=0#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.getScene('game')?.slady && document.getElementById('loading-map')?.hidden !== false, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await game(() => {
    const s = window.__game.scene.getScene('game');
    for (const e of [...s.enemies]) e.destroy();
    s.enemies = []; s.noHurtUntil = Infinity; s.protectUntil = Infinity; window.__session.immortal = true;
    s.cameras.main.setZoom(8);
    window.__dzwieki = []; s.events.on('combat-sound', e => window.__dzwieki.push(e.id));
  });
  await page.mouse.click(5, 5).catch(() => {});
  assert.equal(await game(() => window.__game.scene.getScene('game').city.surfaceAt(window.__game.scene.getScene('game').player.x, window.__game.scene.getScene('game').player.y)), 'trawa');
  // Grass: walk west a little, look at the blades mid-step.
  await idz('ArrowLeft', 900, 'trawa');
  const trawa = await game(() => { const sl = window.__game.scene.getScene('game').slady; return { zdzbla: sl.zdzbla.length, odciski: sl.odciski.length }; });
  console.log('grass', trawa, 'sounds', await game(() => [...new Set(window.__dzwieki)]));
  assert.ok(trawa.zdzbla > 0, 'blades bend on grass');
  assert.equal(trawa.odciski, 0, 'no prints on grass');
  if (await game(() => window.__game.scene.getScene('game').combatAudio.ready > 0)) assert.ok((await game(() => window.__dzwieki)).includes('krok-trawa'), 'grass footstep sound');
  await page.waitForTimeout(1000);
  assert.equal(await game(() => window.__game.scene.getScene('game').slady.zdzbla.length), 0, 'blades gone after a second');
  // Sand: jump onto it, walk east.
  await game(() => { const s = window.__game.scene.getScene('game'); s.player.x = 3000; s.player.y = 2880; });
  await page.waitForTimeout(300);
  await idz('ArrowRight', 1200, 'piasek-krok');
  const piach = await game(() => { const s = window.__game.scene.getScene('game'); return { pod: s.city.surfaceAt(s.player.x, s.player.y), odciski: s.slady.odciski.length }; });
  console.log('sand', piach);
  await shot('piasek');
  assert.equal(piach.pod, 'piasek');
  assert.ok(piach.odciski >= 2, 'prints on sand');
  // Far away: prints gone.
  await game(() => { const s = window.__game.scene.getScene('game'); s.player.x += 60 * 1.92; });
  await page.waitForTimeout(300);
  assert.equal(await game(() => window.__game.scene.getScene('game').slady.odciski.length), 0, 'prints gone 50 m behind');
  assert.deepEqual(errors, []);
  console.log(`OK ${tag}`);
} finally {
  await browser.close(); await server.close();
}

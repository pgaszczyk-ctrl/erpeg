// Movement feel (owner, 21 Nov 2026; src/ruch.ts): run-up/braking, look-ahead camera, dust, footsteps, run lean.
// STARY=1 checks the ?ruch=0 switch (old instant walking, fixed camera). Based on browser-oprawa-walki's fixture.
// Combat presentation (owner, 20 Nov 2026; walka/oprawa.ts, ludzik3d.ts, ui/comicBurst.ts, audio/syntezaWalki.ts):
// real built game + real GLBs on a flat fixture map, no player data. Checks with real input on PC / phone:
//  - three different sword cuts in a series (A, B, C), a strong blow is always C, the blade leaves a trail while it cuts,
//  - a hit stops the struck creature's picture (never longer for a hit during the stop), sparks + flash, a number,
//    a strong blow / critical gets the bigger burst, the game's own contact and fall sounds play,
//  - the bow and the wand play their own release, projectiles leave trails, a shot into nothing raises dust,
//  - creature telegraphs carry no red any more, the hero's wounds show as red sinking numbers,
//  - the blow's timing (contact at 40 %) and the attack cooldown are unchanged.
// Run: npm run build && node scripts/tests/browser-oprawa-walki.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phone = process.env.TELEFON === '1', tag = phone ? 'tel' : 'pc';
const server = await preview({ build: { outDir: process.env.PREVIEW_OUTDIR || 'dist' }, preview: { host: '127.0.0.1', port: 4176, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], chromiumSandbox: false });
await mkdir('work/ruch', { recursive: true });
const context = await browser.newContext({ viewport: phone ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: phone, hasTouch: phone, locale: 'pl-PL' });
const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0];
const map = { unitsPerM: 1.92, w: 3000, h: 3000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 }, boundary: [ring], areas: [['paved', ring]],
  lines: [['minor', 0, [0, 2880, 5760, 0], 'Test road']], buildings: [], pois: [], towns: [['Lublin', 2880, 2880]] };
await context.route('**/map/lublin.json', r => r.fulfill({ json: map }));
await context.route('**/map/world.json', r => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
await context.route('**/*.supabase.co/**', r => {
  const name = new URL(r.request().url()).pathname.split('/').pop(); let body = null;
  if (name === 'login') body = { token: 'fixture', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 2880, start_y: 2880, map_scale: 1.92,
    exp: 0, dead: false, age: 12, konto: true, save: { coins: 0, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, equip: { bron: 'zelazny' }, skills: { miecz: 250, luk: 250, magia: 250 }, magic: true } } };
  if (['heartbeat', 'logout', 'log_error', 'save_game'].includes(name)) body = true;
  if (['game_content', 'school_quizzes', 'game_ports', 'kurier_wiesci', 'my_characters', 'game_stwory'].includes(name)) body = [];
  if (name === 'game_settings') body = {}; if (name === 'server_now') body = new Date().toISOString(); return r.fulfill({ json: body });
});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
const game = (fn, arg) => page.evaluate(fn, arg);
const shot = (name, clip) => page.screenshot({ path: `work/ruch/${tag}-${name}.png`, clip });
const attackKey = async () => { if (phone) await page.locator('.hs-atak').tap(); else await page.keyboard.press('Space'); };
try {
  await page.goto('http://127.0.0.1:4176/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1&mieszkancy3d=0'+(process.env.STARY==='1'?'&ruch=0':'')+'#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.getScene('game').ludzik3d?.widoczny && document.getElementById('loading-map')?.hidden !== false, null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  // Clean ground around the hero, hits always land (the game's hit chance is not what we test), nothing hurts him.
  await game(() => {
    const s = window.__game.scene.getScene('game'), p = s.player;
    p.x += 150; s.cameras.main.setZoom(6);
    for (const e of [...s.enemies]) { s.wilki.get(e)?.destroy(); s.wilki.delete(e); e.destroy(); }
    s.enemies = []; s.noHurtUntil = Infinity; s.protectUntil = Infinity; window.__session.immortal = true;
    window.__session.level.celnosc = 100;
    window.__trafienia = []; window.__dzwieki = [];
    s.events.on('trafienie', t => window.__trafienia.push({ fx: t.fx, ile: t.ile, zabity: t.zabity, stop: t.cel.zamrozDo - s.time.now }));
    s.events.on('combat-sound', e => window.__dzwieki.push(e.id));
    s.vision = [p.x - 300, p.y - 300, p.x + 300, p.y - 300, p.x + 300, p.y + 300, p.x - 300, p.y + 300];
    s.lastVision = { x: p.x, y: p.y, a: 0 };
  });
  // Unlock audio with a real gesture (synthesised buffers are made then).
  await page.mouse.click(5, 5).catch(() => {});
  await page.waitForFunction(() => window.__game.scene.getScene('game').combatAudio.ready > 30, null, { timeout: 20000 });

  const g = game;
  const stan = () => g(() => { const s = window.__game.scene.getScene('game'), c = s.cameras.main;
    return { v: Math.hypot(s.player.vel.x, s.player.vel.y), sp: s.player.speed, ox: c.followOffset.x, oy: c.followOffset.y, ef: window.__oprawa.stats.efekty, lean: s.ludzik3d.bylaSzybkosc }; });
  // Speed right after pressing (first frames) vs after a moment.
  await g(() => { window.__probki = []; const s = window.__game.scene.getScene('game');
    s.events.on('postupdate', () => window.__probki.push(Math.hypot(s.player.vel.x, s.player.vel.y))); });
  // The test character gets its admin speed a moment after loading: wait until the speed has settled.
  await page.waitForFunction(() => window.__game.scene.getScene('game').player.speed > 100, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  const przed = await stan();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  const w = await stan();
  await shot('bieg');
  const probki = await g(() => window.__probki.slice(0, 40));
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(80);
  const po = await stan();
  await page.waitForTimeout(1200);
  const stoi = await stan();
  const dz = await g(() => window.__dzwieki.slice());
  console.log(JSON.stringify({ przed, w, po, stoi, probki: probki.map(v => Math.round(v)).slice(0, 12), kroki: dz.filter(d => d.startsWith('krok')).length }));
  if (process.env.STARY === '1') {
    assert(Math.abs(w.ox) < 0.01, 'switch off: camera stays centred');
    const r = probki.filter(v => v > 0);
    assert(r[0] >= r[4] * 0.95, 'switch off: full speed at once (no run-up)');
  } else {
    const ruszajace = probki.filter(v => v > 0);
    assert(ruszajace[0] < ruszajace[4] * 0.9, 'a short run-up: speed still grows over the first frames');
    assert(w.v > w.sp * 0.95, 'full speed after a moment');
    assert(w.ox < -3, 'the camera looks ahead to the right while walking right');
    assert(w.lean > 0.8, 'the 3D hero runs (lean share)');
    assert(dz.some(d => d === 'krok-twardy'), 'footsteps on paving');
    assert(stoi.v === 0, 'stops completely');
    assert(Math.abs(stoi.ox) < Math.abs(w.ox), 'the camera eases back to the middle');
    assert(stoi.ef > przed.ef, 'dust on start / stop');
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ruch (${tag}${process.env.STARY === '1' ? ', stary' : ''})`);
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}

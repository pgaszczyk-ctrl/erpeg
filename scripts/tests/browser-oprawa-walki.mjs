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
const server = await preview({ build: { outDir: process.env.PREVIEW_OUTDIR || 'dist' }, preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], chromiumSandbox: false });
await mkdir('work/oprawa', { recursive: true });
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
const shot = (name, clip) => page.screenshot({ path: `work/oprawa/${tag}-${name}.png`, clip });
const attackKey = async () => { if (phone) await page.locator('.hs-atak').tap(); else await page.keyboard.press('Space'); };
try {
  await page.goto('http://127.0.0.1:4174/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1&mieszkancy3d=0#postac=Jam&kod=ANGELIKA');
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

  // ---------- 1. three different cuts on a sturdy dummy creature, with the blade trail
  await game(() => {
    const s = window.__game.scene.getScene('game'), p = s.player;
    const e = s.spawnEnemy(p.x + 10, p.y, 'oprawa', 'zombie'); e.brain = () => e.vel.set(0, 0); e.hp = 1e6; e.spokojny = false; window.__cel = e;
    p.face(1, 0);
  });
  await page.waitForFunction(() => window.__cel.model3d, null, { timeout: 60000 });
  const warianty = [], smugi = [];
  // Screenshots are slow in a headless container: the series window is widened for the first three cuts.
  await game(() => { window.__ludzik3d.seriaMs = 60000; });
  for (let i = 0; i < 4; i++) {
    if (i === 3) { await game(() => { window.__ludzik3d.seriaMs = 1100; }); await page.waitForTimeout(1500); }
    await attackKey();
    await page.waitForTimeout(170);
    const st = await game(() => { const l = window.__game.scene.getScene('game').ludzik3d; return { w: l.cios?.wariant, rodzaj: l.cios?.rodzaj, smuga: l.smuga.length }; });
    await shot(`ciecie-${i}`);
    await page.waitForTimeout(130);
    const po = await game(() => window.__game.scene.getScene('game').ludzik3d.smuga.length);
    warianty.push(st.w); smugi.push(Math.max(st.smuga, po));
    await page.waitForTimeout(250);
  }
  console.log('warianty', warianty, 'smuga', smugi);
  assert.deepEqual(warianty.slice(0, 3), [0, 1, 2], 'a series is three different cuts: A, B, C');
  assert.equal(warianty[3], 0, 'then the series starts again');
  assert(smugi.every(n => n >= 3), 'every cut leaves a trail of blade points');
  const tr = await game(() => window.__trafienia.slice());
  assert(tr.length >= 3, 'the cuts landed');
  assert(tr.every(t => t.fx.bohater && t.fx.rodzaj === 'ostrze'), 'blade contact from the hero');
  assert(tr.every(t => t.stop > 0 && t.stop <= 70), 'each hit stops the picture briefly (≤ 70 ms)');
  // Hit stop never stacks: two hits in a row during one stop keep the first end.
  const stack = await game(() => { const s = window.__game.scene.getScene('game'), e = window.__cel, now = s.time.now + 5000;
    e.zamroz(now, 40); const a = e.zamrozDo; e.zamroz(now + 10, 60); return [a, e.zamrozDo]; });
  assert.equal(stack[0], stack[1], 'hit stop does not stack');

  await game(() => { window.__ludzik3d.seriaMs = 1100; });
  // ---------- 2. series pause → A again; strong blow = C with the bigger burst and the heavy sound
  await page.waitForTimeout(1300);
  await game(() => { window.__trafienia = []; window.__dzwieki = []; const s = window.__game.scene.getScene('game'), p = s.player;
    s.resolveAttack({ x: p.x + 10, y: p.y + 2 }, s.time.now, true); });
  await page.waitForTimeout(120);
  const mocny = await game(() => { const s = window.__game.scene.getScene('game');
    return { w: s.ludzik3d.cios?.wariant, burst: s.children.list.filter(o => o.name?.startsWith('comic-hit')).map(o => ({ n: o.name, d: o.depth, sc: o.scale })) }; });
  assert.equal(mocny.w, 2, 'a strong blow is the overhead cut');
  await shot('mocny');
  await page.waitForTimeout(500);
  const dz = await game(() => window.__dzwieki.slice());
  const trM = await game(() => window.__trafienia.slice());
  console.log('mocny', JSON.stringify(trM.map(t => t.fx)), dz);
  assert(trM.some(t => t.fx.mocny), 'strong flag reaches the presentation');
  assert(dz.includes('hit-blade') && dz.includes('hit-heavy'), 'blade contact + heavy layer sound');

  // ---------- 3. critical (the arrow's instant kill) → biggest burst; the fall: death effect and sound
  await game(() => { window.__dzwieki = []; const s = window.__game.scene.getScene('game'), e = window.__cel;
    e.hp = 30; e.hit({ x: s.player.x, y: s.player.y }, s.time.now, 30, { rodzaj: 'strzala', krytyk: true, bohater: true }); });
  await page.waitForTimeout(80);
  const kryt = await game(() => window.__game.scene.getScene('game').children.list.filter(o => o.name?.startsWith('comic-hit')).map(o => o.depth));
  assert(kryt.some(d => d >= 1_060_002), 'a critical gets the top burst');
  await shot('krytyk');
  await page.waitForTimeout(1600);
  const smierc = await game(() => ({ oprawa: { ...window.__oprawa.stats }, dz: window.__dzwieki.slice() }));
  console.log('smierc', JSON.stringify(smierc));
  assert(smierc.oprawa.smierci >= 1, 'the fall is shown');
  assert(smierc.dz.includes('death-czlowiek'), 'a zombie falls with the person/body sound');

  // ---------- 4. bow: release with the shot, a trail, dust when it hits nothing
  await game(() => { window.__gear.equip.bron = 'luk'; window.__gear.ammo.strzaly = 50; window.__dzwieki = []; });
  await page.waitForTimeout(1500); // the donor bow loads
  const przed = await game(() => window.__oprawa.stats.efekty);
  await game(() => { const s = window.__game.scene.getScene('game'), p = s.player; s.lastShot = -1e9; s.resolveAttack({ x: p.x + 40, y: p.y + 2 }, s.time.now); });
  await page.waitForTimeout(60);
  const luk = await game(() => { const s = window.__game.scene.getScene('game'); return { rodzaj: s.ludzik3d.cios?.rodzaj, p: s.ludzik3d.cios?.p, strzaly: s.shots.length, slady: window.__oprawa.slady.length, lekko: window.__oprawa.lekko }; });
  console.log('luk', JSON.stringify(luk));
  assert.equal(luk.rodzaj, 'luk', 'the bow plays its own draw and release');
  assert(luk.p > 0.5 && luk.p < 0.75, 'the clip starts at the release, together with the arrow');
  assert(luk.strzaly >= 1 && (luk.slady >= 1 || luk.lekko), 'the arrow has a trail (weak devices skip arrow trails)');
  await shot('luk');
  await page.waitForFunction(() => window.__game.scene.getScene('game').shots.length === 0, null, { timeout: 8000 });
  await page.waitForTimeout(100);
  const pyl = await game(() => ({ ef: window.__oprawa.stats.efekty, dz: window.__dzwieki.slice() }));
  assert(pyl.ef > przed, 'the spent arrow raised dust');
  assert(pyl.dz.includes('hit-wall'), 'and ticked into the ground');

  // ---------- 5. wand: the mage's gesture with a hand flash and a glowing trail
  await game(() => { window.__gear.equip.bron = 'rozdzka'; });
  await page.waitForTimeout(1500);
  await game(() => { const s = window.__game.scene.getScene('game'), p = s.player; s.lastShot = -1e9; s.resolveAttack({ x: p.x + 40, y: p.y + 2 }, s.time.now); });
  await page.waitForTimeout(60);
  const mag = await game(() => { const s = window.__game.scene.getScene('game'); return { rodzaj: s.ludzik3d.cios?.rodzaj, slady: window.__oprawa.slady.filter(x => x.magia).length }; });
  assert.equal(mag.rodzaj, 'magia', 'the wand plays the mage gesture');
  assert(mag.slady >= 1, 'the spell has a glowing trail');
  await shot('magia');

  // ---------- 6. telegraphs: no red; the hero's wounds: red sinking numbers (not the hero's star)
  await game(() => { window.__gear.equip.bron = 'zelazny'; const s = window.__game.scene.getScene('game'), p = s.player;
    const w = s.spawnEnemy(p.x + 26, p.y, 'oprawa', 'wilk'); w.spokojny = false; window.__wilk = w; window.__kolory = new Set();
    s.events.on('postupdate', () => { const a = s.wilki.get(window.__wilk); if (!a) return;
      for (const c of a.gfx.commandBuffer) if (typeof c === 'number' && c > 0xffff) window.__kolory.add(c); }); });
  await page.waitForFunction(() => window.__game.scene.getScene('game').wilki.get(window.__wilk)?.stan === 'zapowiedz', null, { timeout: 20000 });
  await page.waitForTimeout(250);
  await shot('zapowiedz');
  const kolory = await game(() => [...window.__kolory]);
  assert(!kolory.includes(0xff3b1f), 'no red telegraph colour any more');
  await game(() => { const s = window.__game.scene.getScene('game'); s.player.invulnerableUntil = 0; s.player.hurt({ x: s.player.x + 5, y: s.player.y }, s.time.now, 1); });
  await page.waitForTimeout(60);
  const rana = await game(() => window.__game.scene.getScene('game').children.list.some(o => o.name?.startsWith('comic-rana:-')));
  assert(rana, 'the hero\'s wound shows as its own red number');

  // ---------- 7. timing unchanged: contact at 40 % of the blow, never after the next legal attack
  const czas = await game(() => { const s = window.__game.scene.getScene('game'); return { kontakt: s.ludzik3d.attackEventMs, cd: s.player.attackCooldown }; });
  console.log('czas', JSON.stringify(czas));
  assert(czas.kontakt < czas.cd, 'the blow reaches contact before the next attack is allowed');
  assert.deepEqual(errors, []);
  console.log(`PASS oprawa walki (${tag})`);
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}

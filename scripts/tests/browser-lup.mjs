// Łup (właściciel, 22.11.2026): grudki złota wyskakują z pokonanego po łuku, magnes przyciąga je z kilku metrów,
// wilk nie zostawia złota ani sprzętu, chochlik zostawia złoto, przedmioty leżą na ziemi w poświacie swojej rzadkości.
// Serwer udawany (route), mapa Lublina.
// Run: npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-lup.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/lup', { recursive: true });
const mobile = process.env.TELEFON === '1';
const tag = mobile ? 'tel' : 'pc';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_/.test(m.text()) && errors.push(m.text()));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  // A free spot a few metres east of the hero, everything in sight.
  const spot = await g(() => {
    const s = window.__game.scene.getScene('game');
    s.protectUntil = Infinity;
    for (const e of [...s.enemies]) { s.enemies = s.enemies.filter((x) => x !== e); e.destroy(); }
    for (const p of [...s.pickups]) s.removePickup(p);
    const p = s.city.freeNear(s.player.x + 40, s.player.y, 60);
    return { x: p.x, y: p.y, hx: s.player.x, hy: s.player.y };
  });
  const zabij = (kind) => g(([kind, x, y]) => {
    const s = window.__game.scene.getScene('game');
    for (const p of [...s.pickups]) s.removePickup(p);
    const e = s.spawnEnemy(x, y, undefined, kind);
    e.hp = 0; s.onEnemyKilled(e); e.destroy();
    return s.pickups.filter((i) => i.getData('lup')).map((i) => ({ kind: i.getData('kind'), x: i.x, y: i.y }));
  }, [kind, spot.x, spot.y]);

  // 1. Wolves: never gold, never gear (20 kills).
  for (let i = 0; i < 20; i++) {
    const lup = await zabij('wilk');
    assert(!lup.some((l) => l.kind === 'coin' || l.kind.startsWith('item:')), `wolf dropped ${JSON.stringify(lup)}`);
  }
  // 2. An imp: gold pops out of its body on an arc (in the air at first, lands away from where it died).
  let lup = [];
  for (let i = 0; i < 30 && !lup.some((l) => l.kind === 'coin'); i++) lup = await zabij('glut');
  assert(lup.some((l) => l.kind === 'coin'), 'imps carry gold');
  await page.waitForTimeout(220);
  const wLocie = await g(() => window.__game.scene.getScene('game').pickups.filter((i) => i.getData('kind') === 'coin').map((i) => ({ y: i.y, by: i.getData('by'), tex: i.texture.key })));
  console.log('w locie', JSON.stringify(wLocie));
  assert(wLocie.every((c) => c.tex.startsWith('grudka-')), 'gold is drawn as nuggets');
  assert(wLocie.some((c) => c.y < c.by - 2), 'a nugget is up in the air');
  await page.screenshot({ path: `work/lup/${tag}-wylot.png` });

  // 3. Gear on the ground: one of each rarity, a diamond and a big gold nugget, then a screenshot of the glows.
  await g(([x, y]) => {
    const s = window.__game.scene.getScene('game');
    for (const p of [...s.pickups]) s.removePickup(p);
    s.lupZPanelu(x, y, [{ co: 'zelazny', ile: 1 }, { co: 'zelazny_jakosc2', ile: 1 }, { co: 'stalowy_jakosc3', ile: 1 }, { co: 'kolczuga_jakosc4', ile: 1 }, { co: 'swietlisty', ile: 1 }, { co: 'diament', ile: 1 }, { co: 'zloto', ile: 60 }]);
  }, [spot.x + 30, spot.y]);
  await page.waitForTimeout(1600);
  const ziemia = await g(() => window.__game.scene.getScene('game').pickups.filter((i) => i.getData('lup')).map((i) => ({ kind: i.getData('kind'), tex: i.texture.key, fx: (i.getData('fx') ?? []).map((f) => f.rodzaj) })));
  console.log('na ziemi', JSON.stringify(ziemia));
  const epic = ziemia.find((z) => z.kind === 'item:kolczuga_jakosc4');
  assert(epic?.fx.includes('glow') && epic.fx.includes('slup'), 'epic gear has a glow and a light beam');
  assert(!ziemia.find((z) => z.kind === 'item:zelazny').fx.includes('glow'), 'common gear has no glow');
  assert(ziemia.find((z) => z.kind === 'item:zelazny_jakosc2').fx.includes('glow'), 'uncommon gear glows');
  assert(ziemia.some((z) => z.tex === 'grudka-3' || z.tex === 'grudka-2'), 'a big sum makes a big nugget');
  await g(() => { const s = window.__game.scene.getScene('game'); s.cameras.main.setZoom(s.cameras.main.zoom); });
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x - 34, y); }, [spot.x + 30, spot.y]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `work/lup/${tag}-rzadkosci.png` });

  // 4. Magnet: the hero stands ~9 m from a nugget and doesn't move – it slides to him by itself.
  const coins0 = await g(() => window.__session.coins);
  await g(() => {
    const s = window.__game.scene.getScene('game');
    for (const p of [...s.pickups]) s.removePickup(p);
    const x = s.player.x + 18, y = s.player.y + 4;
    s.dropPickup(x, y, false, 5);
  });
  await page.waitForTimeout(2200);
  const coins1 = await g(() => window.__session.coins);
  console.log('magnes', coins0, '→', coins1);
  assert(coins1 >= coins0 + 5, 'the magnet brought the nugget in');
  // 5. Walking over gear puts it in the backpack.
  const plecak0 = await g(() => window.__gear.bag.length + Object.values(window.__gear.equip).filter(Boolean).length);
  await g(() => {
    const s = window.__game.scene.getScene('game');
    s.upuscPrzedmiot(s.player.x + 16, s.player.y + 4, 'stalowy_jakosc3');
  });
  await page.waitForTimeout(2200);
  const plecak1 = await g(() => window.__gear.bag.length + Object.values(window.__gear.equip).filter(Boolean).length);
  assert(plecak1 > plecak0 || (await g(() => window.__gear.bag.some((b) => b.item === 'stalowy_jakosc3') || window.__gear.equip.bron === 'stalowy_jakosc3')), 'gear picked up');
  // The trunk shows the rarity glow on the slot.
  await g(() => window.__game.scene.getScene('ui').openCharacter?.('eq'));
  await page.waitForTimeout(800);
  const rzSloty = await page.locator('.sl-cell.rz-rzadki').count();
  console.log('sloty rzadkie', rzSloty);
  assert(rzSloty >= 1, 'a rare item glows blue in the trunk');
  await page.screenshot({ path: `work/lup/${tag}-kufer.png` });
  assert.deepEqual(errors, []);
  console.log(`PASS ${tag}`);
} finally {
  await browser.close();
}

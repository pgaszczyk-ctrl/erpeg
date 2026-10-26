// „Nowa walka” test package (walka/live.ts, docs/walka/LIVE.md): tilted camera, fixed controls, stamina/mana,
// new HUD, life over the hero, weak groups, safe-zone regeneration, the saved spot, epicentric hunting grounds
// and double-tap interactions. Mocked server (route), Lublin map.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-live.mjs   (TELEFON=1)
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
  const saves = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) {
      try { saves.push(JSON.parse(req.postData() ?? '{}')); } catch { /* ignore */ }
      body = true;
    }
    if (path.endsWith('/heartbeat')) body = true;
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
  const S = 'window.__game.scene.getScene("game")';

  // 1. Tilted camera: zoomY = zoomX × 0.8, sprites stretched back.
  const cam = await g(() => { const c = window.__game.scene.getScene('game').cameras.main; return { x: c.zoomX, y: c.zoomY, w: c.wyprost }; });
  console.log('kamera', JSON.stringify(cam));
  assert(Math.abs(cam.y / cam.x - 0.8) < 0.01, 'camera squashed vertically');
  assert(Math.abs(cam.w - 1.25) < 0.01, 'sprites stretched back');

  // 3. New HUD + controls.
  assert(await page.locator('#hud-live .hl-flask').isVisible(), 'life flask visible');
  assert(await page.locator('#hud-live .hl-bar').isVisible(), 'stamina bar visible');
  assert(await page.locator('#hud-live .hl-th').isVisible(), 'EXP thermometer visible');
  assert(await page.locator('#hud-ster .hs-atak').isVisible(), 'attack button visible');
  assert(await page.locator('#hud-ster .hs-spec').isVisible(), 'skill button visible');
  assert(await page.locator('#hud-ster .hs-lecz').isVisible(), 'heal button visible');
  assert(!(await page.locator('#hud .hud-m').isVisible()), 'the old machine is hidden');
  await page.screenshot({ path: `work/live-${tag}-start.png` });

  // Strong attack button costs stamina once.
  const s0 = await g(() => window.__zasoby?.s ?? null);
  await page.locator('#hud-ster .hs-spec').dispatchEvent('pointerdown');
  await page.waitForFunction((v) => window.__zasoby.s < v - 1, s0, { timeout: 15000 }).catch(() => {});
  const s1 = await g(() => window.__zasoby.s);
  console.log('siły', s0, '→', s1);
  assert(s1 <= s0 - 20, 'strong attack took stamina');
  // A second press right away: on cooldown, nothing taken.
  await page.locator('#hud-ster .hs-spec').dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  const s2 = await g(() => window.__zasoby.s);
  assert(s2 >= s1 - 0.01, 'cooldown: no second payment');
  // Regeneration (safe zone, no mist at the start). Active-play seconds: headless frames are slow, so wait long.
  await page.waitForFunction((v) => window.__zasoby.s > v, s2, { timeout: 20000 }).catch(() => {});
  const s3 = await g(() => window.__zasoby.s);
  console.log('siły po odpoczynku', s3);
  assert(s3 > s2, 'stamina comes back');

  // 4. Life over the hero.
  const hpBar = await g(() => { const s = window.__game.scene.getScene('game'); return !!s.hpNad && s.hpNad.active; });
  assert(hpBar, 'life bar over the hero');

  // 6. Safe zone: hurt → life comes back outside the mist.
  await g(() => { const s = window.__game.scene.getScene('game'); s.player.hp = Math.max(1, s.player.hp - 3); });
  const hpA = await g(() => window.__game.scene.getScene('game').player.hp);
  await page.waitForFunction((v) => window.__game.scene.getScene('game').player.hp > v, hpA, { timeout: 30000 }).catch(() => {});
  const hpB = await g(() => window.__game.scene.getScene('game').player.hp);
  console.log('życie w bezpiecznej strefie', hpA, '→', hpB);
  assert(hpB > hpA, 'life regenerates in a safe zone');

  // 9. Double tap: E near a place door opens its dialog; walking up alone doesn't.
  const door = await g(() => {
    const s = window.__game.scene.getScene('game');
    const p = s.city.places.filter((q) => q.kind === 'shop' || q.kind === 'church' || q.kind === 'school').sort((a, b) => Math.hypot(a.door.x - s.player.x, a.door.y - s.player.y) - Math.hypot(b.door.x - s.player.x, b.door.y - s.player.y))[0];
    return p ? { x: p.door.x, y: p.door.y, name: p.name } : null;
  });
  console.log('drzwi', JSON.stringify(door));
  if (door) {
    await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y - 2); }, [door.x, door.y]);
    await page.waitForTimeout(1200);
    const before = await g(() => window.__game.scene.getScene('ui').hasDialog);
    assert(!before, 'standing at a door opens nothing by itself');
    // A single attack swing at the door: no dialog either.
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    assert(!(await g(() => window.__game.scene.getScene('ui').hasDialog)), 'a swing does not open a door any more');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(800);
    const after = await g(() => window.__game.scene.getScene('ui').hasDialog || !!document.querySelector('.s26, #shop26, .shop26'));
    console.log('dialog po E', after);
    await page.screenshot({ path: `work/live-${tag}-drzwi.png` });
    assert(after, 'E (double tap) opens the place');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 7. Saved spot.
  await g(() => window.__game.scene.getScene('game').save());
  await page.waitForTimeout(800);
  const last = saves.at(-1);
  console.log('zapis.tu', JSON.stringify(last?.p_save?.tu ?? last?.save?.tu ?? null));
  const tu = last?.p_save?.tu ?? last?.save?.tu;
  assert(tu && Number.isFinite(tu.x), 'the save carries the hero spot');
  assert(last?.p_save?.zasoby ?? last?.save?.zasoby, 'the save carries stamina/mana');

  // 5. Weak groups: every gang planned is a 3-member "Grupka" with a small radius.
  const gangi = await g(() => window.__game.scene.getScene('game').streets.gangs.map((x) => ({ n: x.kind.nazwa, r: x.r })));
  console.log('grupki', gangi.length, JSON.stringify(gangi.slice(0, 3)));
  assert(gangi.every((x) => x.n === 'Grupka'), 'only weak groups');

  // 8. Epicentric hunting grounds: find one, check its layers and that it stays away from settlements.
  // Walk (teleport) out of town in steps until one is planned.
  let low = null;
  for (const [dx, dy] of [[0, 0], [4000, 0], [-4000, 0], [0, 4000], [0, -4000], [6000, 6000], [-6000, 6000], [6000, -6000], [-6000, -6000]]) {
    await g(([dx, dy]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(3000 + dx, 3000 + dy); }, [dx, dy]);
    await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return s.city.ready({ x0: s.player.x - 1500, y0: s.player.y - 1500, x1: s.player.x + 1500, y1: s.player.y + 1500 }); }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    low = await g(() => { const L = window.__game.scene.getScene('game').lowiska; return L?.lowiska?.length ? L.lowiska.map((l) => ({ x: l.x, y: l.y, r: l.r, n: l.pakiety.length, w: l.pakiety.map((p) => p.warstwa) })) : null; });
    if (low) break;
  }
  console.log('łowiska', JSON.stringify(low?.slice(0, 3)));
  assert(low && low.length, 'a hunting ground was planned in open land');
  const l0 = low[0];
  assert(l0.w.includes('obrzeze'), 'outer layer with packs');
  // Stand in its core and see the mist and the layer message, then in the outer layer.
  await g(([x, y, r]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x + r * 0.85, y); }, [l0.x, l0.y, l0.r]);
  await page.waitForTimeout(3000);
  const w = await g(() => { const s = window.__game.scene.getScene('game'); return { w: s.lowiska.warstwaW(s.player.x, s.player.y), wolves: s.enemies.filter((e) => e.kindId === 'wilk' || e.kindId === 'warg').length, safe: s.bezpiecznie }; });
  console.log('na obrzeżu', JSON.stringify(w));
  assert.equal(w.w, 'obrzeze');
  assert(!w.safe, 'inside the hunting ground is no safe zone');
  await page.screenshot({ path: `work/live-${tag}-lowisko.png` });
  // Settlement check: no hunting-ground anchor has more than 3 buildings within 330 m.
  const domy = await g((ls) => {
    const s = window.__game.scene.getScene('game');
    return ls.map((l) => s.lowiska.domyW(l.x, l.y, 330 * 1.92));
  }, low);
  console.log('domy przy kotwicach', domy);
  assert(domy.every((n) => n <= 3), 'hunting grounds stay away from settlements');

  if (mobile) {
    // Touch: the attack button swings (tap), the joystick is fixed bottom-left.
    const joy = await g(() => { const u = window.__game.scene.getScene('ui'); return { vis: u.joyBase.visible, x: u.joyBase.x, y: u.joyBase.y }; });
    console.log('joystick', JSON.stringify(joy));
    assert(joy.vis, 'joystick shown');
  }
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

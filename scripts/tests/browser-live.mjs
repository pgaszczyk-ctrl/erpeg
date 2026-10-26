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
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  const saves = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_stwory')) body = { wilk: { exp: 99, lup: [{ co: 'kiel', ile: 2, szansa: 100 }, { co: 'zloto', ile: 3, szansa: 100 }, { co: 'jablko', ile: 1, szansa: 0 }] } };
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

  // 1. Camera straight from above again (owner, 26 Oct 2026: „poprzednia była lepsza”).
  const cam = await g(() => { const c = window.__game.scene.getScene('game').cameras.main; return { x: c.zoomX, y: c.zoomY, w: c.wyprost }; });
  console.log('kamera', JSON.stringify(cam));
  assert(Math.abs(cam.y - cam.x) < 0.001, 'camera not squashed');

  // 3. New HUD + controls.
  // The production telescope HUD (portrait with the EXP reservoir) + the two tubes; no life flask any more.
  assert(await page.locator('#hud-tel .tel-portret').isVisible(), 'telescope portrait visible');
  assert(await page.locator('#hud-tel .tel-rura.hp').isVisible(), 'life tube visible');
  assert(await page.locator('#hud-tel .tel-rura.st').isVisible(), 'stamina tube visible');
  assert.equal(await page.locator('#hud-live').count(), 0, 'no life flask panel');
  const hpTube = await page.locator('#hud-tel .tel-rura.hp i.p').evaluate((e) => e.style.height);
  console.log('rurka życia', hpTube);
  assert(hpTube && hpTube !== '0%', 'life tube filled');
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

  // 3b. Creatures fight readably (StworAI): telegraph → attack → rest, never by touch; imps throw acorns.
  for (let i = 0; i < 4 && await g(() => !window.__game.scene.isActive('game')); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(900);
  const fight = async (kind, dm) => {
    await g(([kind, dm]) => {
      const s = window.__game.scene.getScene('game');
      for (const e of [...s.enemies]) if (!e.isDead) { s.wilki.get(e)?.destroy(); s.wilki.delete(e); e.destroy(); }
      s.enemies = [];
      window.__session.immortal = true;
      // An open spot: the hero and the creature both on free ground with nothing between them.
      if (!window.__plac) {
        const free = (x, y) => { for (let dx = -40; dx <= 40; dx += 4) for (let dy = -12; dy <= 12; dy += 4) if (s.city.isBlocked(x + dx, y + dy)) return false; return true; };
        outer: for (let r = 0; r < 600; r += 12) for (let a = 0; a < 6.28; a += 0.4) { const x = s.player.x + Math.cos(a) * r, y = s.player.y + Math.sin(a) * r; if (free(x, y)) { window.__plac = { x, y }; break outer; } }
      }
      s.player.setPosition(window.__plac.x - 20, window.__plac.y);
      const p = { x: window.__plac.x - 20 + dm * 1.92, y: window.__plac.y };
      window.__stan = [];
      window.__e = s.spawnEnemy(p.x, p.y, undefined, kind);
    }, [kind, dm]);
    for (let i = 0; i < 70; i++) {
      await page.waitForTimeout(60);
      const st = await g(() => { const s = window.__game.scene.getScene('game'); const ai = s.wilki.get(window.__e); return ai ? `${ai.stan}:${ai.atak}:${ai.pociski.length}` : `brak(${s.scene.isActive()})`; });
      await g((st) => { if (window.__stan.at(-1) !== st) window.__stan.push(st); }, st);
    }
    return g(() => window.__stan);
  };
  const wilk = await fight('wilk', 14);
  console.log('debug', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); const e = window.__e; return { act: s.scene.isActive(), paused: s.scene.isPaused(), px: s.player.x, py: s.player.y, ex: e.x, ey: e.y, vel: [e.vel.x, e.vel.y], dead: e.isDead, inList: s.enemies.includes(e), stan: s.wilki.get(e)?.stan, nohurt: s.noHurtUntil - s.time.now }; })));
  console.log('wilk', wilk.join(' → '));
  assert(wilk.some((x) => x.startsWith('zapowiedz:doskok')), 'wolf telegraphs its lunge');
  assert(wilk.some((x) => x.startsWith('atak:doskok')), 'wolf lunges');
  assert(wilk.some((x) => x.startsWith('odpoczynek')), 'wolf rests after');
  const imp = await fight('glut', 16);
  console.log('chochlik', imp.join(' → '));
  assert(imp.some((x) => x.startsWith('zapowiedz:rzut')), 'imp telegraphs a throw');
  assert(imp.some((x) => /:rzut:[1-9]/.test(x)), 'acorn flies');
  const boss = await fight('koziol', 12);
  console.log('kozioł', boss.join(' → '));
  assert(boss.some((x) => /zapowiedz:(taran|tupniecie|rogi)/.test(x)), 'boss telegraphs');
  await page.screenshot({ path: `work/live-${tag}-boss.png` });
  // Loot from the admin panel's table: 2 fangs + 3 gold on the ground, EXP 99 instead of 12.
  const lup = await g(async () => {
    const s = window.__game.scene.getScene('game');
    for (const e of [...s.enemies]) { s.wilki.get(e)?.destroy(); s.wilki.delete(e); e.destroy(); }
    s.enemies = [];
    const e = s.spawnEnemy(s.player.x + 30, s.player.y, undefined, 'wilk');
    const exp0 = window.__session.exp;
    s.onEnemyKilled(e);
    e.destroy();
    await new Promise((r) => setTimeout(r, 600));
    const kinds = s.pickups.map((p) => p.getData('kind'));
    return { exp: window.__session.exp - exp0, kly: kinds.filter((k) => k === 'fruit:kiel').length, jablka: kinds.filter((k) => k === 'fruit:jablko').length, zloto: kinds.filter((k) => String(k).startsWith('coin')).length, kinds };
  });
  console.log('łup', JSON.stringify(lup));
  assert.equal(lup.exp, 99, 'EXP from the panel');
  assert.equal(lup.kly, 2, 'two fangs');
  assert.equal(lup.jablka, 0, '0 % never drops');

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
    low = await g(() => { const L = window.__game.scene.getScene('game').lowiska; const ls = (L?.lowiska ?? []).filter((l) => !l.park); window.__parki = (L?.lowiska ?? []).filter((l) => l.park).length; return ls.length ? ls.map((l) => ({ x: l.x, y: l.y, r: l.r, n: l.pakiety.length, w: l.pakiety.map((p) => p.warstwa) })) : null; });
    if (low) break;
  }
  console.log('łowiska', JSON.stringify(low?.slice(0, 3)), 'w parkach:', await g(() => window.__parki));
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
    // Upright phone: the game sleeps under the „turn your phone” card; landscape again: it runs.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const karta = await page.locator('#obroc-telefon.on').isVisible();
    const spi = await g(() => !window.__game.loop.running);
    await page.screenshot({ path: `work/live-${tag}-obroc.png` });
    console.log('pionowo: karta', karta, 'pętla śpi', spi);
    assert(karta && spi, 'portrait phone: rotate card + game asleep');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(800);
    assert(!(await page.locator('#obroc-telefon.on').isVisible()), 'landscape: card gone');
    assert(await g(() => window.__game.loop.running), 'landscape: game runs');
    // The attack stick: a tap swings (attack cooldown starts).
    const t0 = await g(() => window.__game.scene.getScene('game').player.lastAttack);
    const box = await page.locator('#hud-ster .hs-atak').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction((v) => window.__game.scene.getScene('game').player.lastAttack !== v, t0, { timeout: 10000 }).catch(() => {});
    const t1 = await g(() => window.__game.scene.getScene('game').player.lastAttack);
    console.log('atak drążkiem', t0, '→', t1);
    assert(t1 !== t0, 'a tap on the attack stick swings');
    await page.screenshot({ path: `work/live-${tag}-poziomo.png` });
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

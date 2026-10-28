// Real runtime, mocked account: level 1 / Medium. Run after build + preview on 4173; TELEFON=1 for phone.
// PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE may point at preinstalled tools. Browser QA is pending.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mobile = process.env.TELEFON === '1', tag = mobile ? 'tel' : 'pc';
await mkdir('work', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL' });
  await context.route('**/*.supabase.co/**', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    let body = null;
    if (name === 'login') body = { token: 'test', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, exp: 0, age: 12, dead: false, save: { coins: 0, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } } } };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (/game_settings|game_stwory/.test(name)) body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:4173/') + '?lang=pl&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 });
  assert(await page.locator('#hud-tel .tel-rura.st').isVisible());
  assert(await page.locator('#hud-ster .hs-atak').isVisible());
  await page.evaluate(() => {
    const g = window.__game.scene.getScene('game');
    // Mission fixture survives the clearHomeArea rule, which deliberately removes ambient enemies at home.
    window.__balanceEnemy = g.spawnEnemy(g.player.x + 32, g.player.y, 'balance-fixture', 'glut');
  });
  await page.waitForFunction(() => window.__game.scene.getScene('game').wilki.has(window.__balanceEnemy));
  const results = await page.evaluate(() => {
    const g = window.__game.scene.getScene('game');
    g.scene.pause();
    const e = window.__balanceEnemy, ai = g.wilki.get(e), base = g.time.now + 10000;
    const run = ({ dodge = false, wall = false, stun = false } = {}) => {
      e.setPosition(32, 0); e.hp = 10000; e.vel.set(0, 0);
      e.knockUntil = e.stunnedUntil = e.dazedUntil = 0;
      ai.stan = 'patrol'; ai.until = 0; ai.rezerwacja = null; ai.pociski = [];
      ai.home = { x: 32, y: 0, r: 1000 };
      let hits = 0, throws = [], nextHit = 0, dodged = false, last = '';
      const player = { x: 0, y: 0 };
      ai.h = { ...ai.h, player, hurt: () => hits++, rezerwuj: () => true, zwolnij: () => {}, sciana: x => wall && ai.pociski.length > 0 && x < 20 && x > 18, inni: () => [] };
      for (let i = 0; i < 720; i++) {
        const now = base + i * 1000 / 120;
        if (now >= nextHit) { e.hit(g.player.facing.clone().set(0, 0), now, 0.01); nextHit = now + 320; }
        if (stun && i === 12) e.daze(now, 800);
        if (dodge && ai.stan === 'zapowiedz' && !dodged) { player.y = player.y <= 0 ? 18 : -18; dodged = true; }
        const count = ai.pociski.length;
        ai.update(now, 1 / 120);
        if (ai.pociski.length > count) throws.push(now - base);
        if (last === 'zapowiedz' && ai.stan !== last) dodged = false;
        last = ai.stan;
      }
      return { hits, throws };
    };
    const standing = run(), dodging = run({ dodge: true }), wall = run({ wall: true }), strong = run({ stun: true });
    const z = window.__zasoby;
    z.s = 0; g.player.lastAttack = base; g.player.attackCooldown = 320;
    const early = g.zwyklyAtak(base + 400), later = g.zwyklyAtak(base + 600);
    const oldHp = e.hp; e.vel.set(-20, 0); e.hit(g.player.facing.clone(), base + 7000, 1);
    const reaction = { hpLost: oldHp - e.hp, vx: e.vel.x, stunned: e.ogluszony(base + 7000) };
    e.setPosition(g.player.x + 8, g.player.y + 2); e.hp = 10000; g.enemies = [e];
    g.player.face(1, 0); z.s = 100;
    for (let i = 0; i < 10; i++) g.resolveAttack(g.player.hitPoint(), base + 10000 + i * 600);
    const spent = z.s;
    g.updateZasoby(0.1);
    const combatSafe = g.bezpiecznie;
    g.player.move(1, 0, base + 20000); const tiredSpeed = g.player.vel.length();
    z.s = 100; g.player.move(1, 0, base + 20000); const freshSpeed = g.player.vel.length();
    g.player.vel.set(0, 0); z.s = 15; g.emitZasoby();
    return { difficulty: window.__session.level.nazwa, exp: window.__session.exp, standing, dodging, wall, strong, cooldown: { early: !!early, later: !!later }, reaction, spent, combatSafe, tiredSpeed, freshSpeed };
  });
  console.log(JSON.stringify(results, null, 2));
  assert.equal(results.difficulty, 'Średni'); assert.equal(results.exp, 0);
  assert(results.standing.throws.length >= 5, 'ordinary hits cannot suppress acorn throws');
  const intervals = results.standing.throws.slice(1).map((t, i) => t - results.standing.throws[i]);
  assert(intervals.every(t => t >= 1000 && t <= 1050), 'roughly one throw per second with readable windup');
  assert(results.standing.hits >= 4, 'standing under fire is punished');
  assert.equal(results.dodging.hits, 0, 'moving after direction lock dodges acorns');
  assert(results.wall.throws.length >= 4, 'wall fixture launches projectiles');
  assert.equal(results.wall.hits, 0, 'walls stop faster projectiles');
  assert(results.strong.throws[0] > results.standing.throws[0] + 500, 'explicit stun interrupts the throw');
  assert.deepEqual(results.cooldown, { early: false, later: true });
  assert.equal(results.reaction.hpLost, 1); assert.equal(results.reaction.vx, -20);
  assert.equal(results.reaction.stunned, false);
  assert.equal(results.spent, 0, 'actual melee integration depletes stamina');
  assert.equal(results.combatSafe, false, 'nearby enemies prevent safe regeneration');
  assert(results.tiredSpeed > 0 && results.tiredSpeed === results.freshSpeed, 'empty stamina preserves movement');
  assert(await page.locator('#hud-tel .tel-rura.st.slabo').isVisible());
  await page.screenshot({ path: 'work/walka-balance-' + tag + '.png' });
  if (mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    assert(await page.evaluate(() => document.documentElement.classList.contains('exp-obrot')));
    await page.screenshot({ path: 'work/walka-balance-pion.png' });
  }
  assert.deepEqual(errors, []);
  console.log('OK: combat balance ' + tag);
} finally { await browser.close(); }

// A dragon in the turn fight (test server; walka/smokTury.ts): the dragon announces its special as a red area,
// the attack lands on it in its next turn, fire leaves burning ground, a flight makes it unhittable and it lands
// stunned; Osłona in the special menu; a won fight heals fully and gives dragon scales. Server mocked.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-smok-tury.mjs   (TELEFON=1)
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
  // 25 Oct 2026: exploration combat defaults to real time now (owner: „nie chcę walki turowej") – this
  // script still regression-tests dragon turn fights, so it explicitly asks for the turn system back.
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&tury=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const S = () => window.__game.scene.getScene('game');

  async function walka(gatunek) {
    await g(([gat]) => {
      const s = window.__game.scene.getScene('game');
      s.protectUntil = 0;
      s.noHurtUntil = 0;
      const f = s.city.freeNear(s.player.x + 300, s.player.y + 5);
      s.player.setPosition(f.x, f.y - 5);
      s.player.hp = 10;
      window.__smok(gat);
      window.__d = s.enemies[s.enemies.length - 1];
    }, [gatunek]);
    await page.waitForFunction(() => window.__d.ownLook, null, { timeout: 30000 });
    await g(() => window.__game.scene.getScene('game').startWalka([window.__d]));
    await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return w && w.faza === 'gracz' && !w.busy; }, null, { timeout: 30000 });
  }
  const stan = () => g(() => {
    const s = window.__game.scene.getScene('game');
    const w = s.walka;
    const sm = w?.smok;
    const st = sm && [...sm.stany.values()][0];
    return { w: !!w, faza: w?.faza, hp: s.player.hp, smokHp: window.__d.hp, zap: st?.zap?.atak ?? null, pola: sm?.pola.length ?? 0, widac: window.__d.visible, ogl: w?.u?.[0]?.oglusz, podp: document.querySelector('#walka-panel .wp-podp')?.textContent };
  });
  const koniecTury = async () => {
    await g(() => window.__game.scene.getScene('game').walka.koniecTury());
    await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || (w.faza === 'gracz' && !w.busy); }, null, { timeout: 30000 });
  };

  // 1) Fire dragon: announcement → burning ground.
  await walka('ognisty');
  let s = await stan();
  for (let i = 0; i < 4 && !s.zap; i++) { await koniecTury(); s = await stan(); }
  console.log('po zapowiedzi', JSON.stringify(s));
  assert.equal(s.zap, 'ogien', 'the fire dragon announced its fire');
  assert.match(s.podp, /Smok nabiera powietrza/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `work/smok-${tag}-zapowiedz.png` });
  // Stand in the cone on purpose (the hero is the target) and wait.
  const hp0 = s.hp;
  await koniecTury();
  s = await stan();
  console.log('po ogniu', JSON.stringify(s));
  assert(s.hp < hp0 || /Unik|Blok/.test(s.podp ?? ''), 'the fire hurt the hero standing in the red area');
  assert(s.pola > 0, 'burning ground stays');
  await page.screenshot({ path: `work/smok-${tag}-plonie.png` });
  // Osłona in the special menu.
  await g(() => window.__game.scene.getScene('game').walka.ustawPodmenu(true));
  await page.waitForTimeout(200);
  assert(await page.locator('#walka-panel .wp-b.oslona').count(), 'Osłona button');
  await page.screenshot({ path: `work/smok-${tag}-oslona.png` });
  await g(() => window.__game.scene.getScene('game').walka.oslon());
  // Win: the dragon nearly dead, one blow.
  await g(() => { window.__d.hp = 0.5; const w = window.__game.scene.getScene('game').walka; w.cel = w.u[0]; w.ruchy = 3; });
  await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return !w || (w.faza === 'gracz' && !w.busy); }, null, { timeout: 30000 });
  await g(() => { const w = window.__game.scene.getScene('game').walka; if (w) { w.faza = 'gracz'; w.ruchy = 3; w.cel = w.u[0]; w.przelicz(); } });
  // Walk next to it, then strike.
  await g(() => { const s = window.__game.scene.getScene('game'); const d = window.__d; const f = s.city.freeNear(d.x + 18, d.y); s.player.setPosition(f.x, f.y); s.walka.przelicz(); });
  await g(() => window.__game.scene.getScene('game').walka.wykonajCios(false));
  await page.waitForFunction(() => !window.__game.scene.getScene('game').walka, null, { timeout: 30000 });
  const po = await g(() => ({ hp: window.__game.scene.getScene('game').player.hp, max: window.__maxHp?.() ?? null, luski: window.__gear.bag.reduce((n, sl) => n + (sl?.counts?.luska ?? 0), 0) }));
  console.log('wygrana', JSON.stringify(po));
  assert(po.luski > 0, 'dragon scales after the win');
  assert(po.hp >= 10 && po.hp > 4, 'a won fight heals fully');

  // 2) Mountain dragon: flight → unhittable → landing stunned.
  await walka('gorski');
  s = await stan();
  for (let i = 0; i < 4 && !s.zap; i++) { await koniecTury(); s = await stan(); }
  console.log('lot', JSON.stringify(s));
  assert.equal(s.zap, 'lot');
  assert.equal(s.widac, false, 'in the air the dragon is not seen (unhittable)');
  await page.screenshot({ path: `work/smok-${tag}-lot.png` });
  await koniecTury();
  s = await stan();
  console.log('ladowanie', JSON.stringify(s));
  assert.equal(s.widac, true, 'landed');
  assert.equal(s.ogl, true, 'stunned after landing');
  await page.screenshot({ path: `work/smok-${tag}-ladowanie.png` });
  // 3) The story's dragon: „walcz” starts the turn fight at once, its life = ciosowFabuly blows; after running away
  //    walking up asks „Walcz / Odejdź”.
  await g(() => { const s = window.__game.scene.getScene('game'); const w = s.walka; if (w) w.zakoncz('przerwana'); s.enemies = s.enemies.filter((e) => e !== window.__d); window.__d.destroy(); });
  await page.waitForTimeout(500);
  const fab = await g(() => {
    const s = window.__game.scene.getScene('game');
    const f = s.city.freeNear(s.player.x + 120, s.player.y);
    const d = s.story.host.spawnDragon(f.x, f.y);
    d.missionId = 'story-smok';
    d.peaceful = false;
    s.story.dragon = d;
    s.story.met = true;
    window.__d = d;
    const ok = s.story.host.walczZeSmokiem(d);
    return { ok, gat: d.gatunek, spok: d.spokojny, hp: d.hp };
  });
  console.log('fabularny', JSON.stringify(fab));
  assert.equal(fab.ok, true, 'the story dragon fights in turns');
  assert.equal(fab.gat, 'cien');
  await page.waitForFunction(() => { const w = window.__game.scene.getScene('game').walka; return w && w.faza === 'gracz' && !w.busy; }, null, { timeout: 30000 });
  await g(() => window.__game.scene.getScene('game').walka.uciekaj());
  await page.waitForTimeout(800);
  const dial = await g(() => {
    const s = window.__game.scene.getScene('game');
    const t = [];
    const orig = s.dialog.bind(s);
    s.dialog = (r) => { t.push(r.title + ' | ' + r.buttons.join(' / ')); return orig(r); };
    window.__dt = t;
    s.spotkania.unikniete = new WeakSet();
    s.player.setPosition(window.__d.x + 25, window.__d.y + 10);
  });
  await page.waitForFunction(() => window.__dt.length > 0, null, { timeout: 15000 });
  const tytul = await g(() => window.__dt[0]);
  console.log('podejście', tytul);
  assert.match(tytul, /Cień smoka \| ⚔ Walcz/);
  assert.deepEqual(errors, []);
  console.log('OK smok w turach', tag);
} finally {
  await browser.close();
}

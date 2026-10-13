// The wizard's trials before level 5 (content/probyMaga.ts): the scale after the shadow, the wizard's
// intro, gang → lesson (one wrong answer) → burnt circle → potion, each with the pigeon's note,
// then „ready” at level 5. Lublin map, mocked server.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-proby-maga.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 10, story: { st: 'start', walked: 0 } }, exp: 0, dead: false, died_at: null, age: 9 } };
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
  page.on('dialog', (d) => d.accept());
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  // Every dialog the game opens is logged; the hero is never hurt.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push({ title: req.title, text: req.text, buttons: req.buttons }); return orig(req); };
    setInterval(() => { s.noHurtUntil = s.time.now + 60000; s.player.hp = Math.max(s.player.hp, 6); }, 200);
  });
  let seen = 0;
  /** Waits for the next dialog, checks its title and presses the button with `label` (or index 0). */
  async function next(title, label) {
    await page.waitForFunction((n) => window.__dialogi.length > n && window.__game.scene.getScene('ui').dialogBox, seen, { timeout: 60000 });
    const d = await page.evaluate((n) => window.__dialogi[n], seen);
    seen++;
    console.log(`[${d.title}] ${d.text.replace(/\n+/g, ' ').slice(0, 150)}… → ${JSON.stringify(d.buttons)}`);
    assert.match(d.title, title);
    const index = label ? d.buttons.findIndex((b) => b === label) : 0;
    assert(index >= 0, `button ${label}`);
    await page.waitForTimeout(350);
    const at = await page.evaluate((i) => { const r = window.__game.scene.getScene('ui').dialogButtons.find((b) => b.index === i).rect; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, index);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(250);
    return d;
  }
  const goal = () => page.evaluate(() => window.__game.scene.getScene('game').story.goal());
  /** Puts the hero at (x, y) and waits until the map there is loaded. */
  async function go(x, y) {
    await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.cameras.main.centerOn(x, y); }, [x, y]);
    // The tiles there (a trial dialog may pause the scene before the picture is painted).
    await page.waitForFunction(([x, y]) => window.__game.scene.getScene('game').city.ready({ x0: x - 200, y0: y - 200, x1: x + 200, y1: y + 200 }), [x, y], { timeout: 60000 });
    await page.waitForTimeout(600);
  }

  // 0. The shadow, then the scale falls nearby.
  await page.evaluate(() => window.__game.scene.getScene('game').story.dragonShadow());
  await next(/❗/);
  const g0 = await goal();
  console.log('goal', JSON.stringify(g0));
  assert.match(g0.text, /spadło/);
  await page.screenshot({ path: 'work/proby-luska.png' });
  await go(g0.pos.x, g0.pos.y);
  await next(/Łuska/);
  assert.equal(await page.evaluate(() => window.__session.exp), 30);
  assert.match((await goal()).text, /Popytaj/);

  // Asking around: the first knowing school or church sends the hero to the wizard.
  const wizard = await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    for (const p of s.city.places.filter((q) => q.kind === 'school' || q.kind === 'church')) {
      s.story.ask(p);
      if (window.__session.story.st === 'uczelnia') return window.__session.story.target;
      window.__dialogi.pop();
      window.__game.scene.getScene('ui').closeDialog?.();
    }
    return null;
  });
  assert(wizard, 'a knowing place');
  seen = await page.evaluate(() => window.__dialogi.length - 1);
  await next(/./);
  await go(wizard.x, wizard.y + 10);
  await page.evaluate(() => window.__game.scene.getScene('game').story.talkToWizard());
  const intro = await next(/🧙/);
  assert.match(intro.text, /zwiadowcy/);
  assert.match(intro.text, /gang/);
  const gGang = await goal();
  console.log('goal', JSON.stringify(gGang));
  assert.match(gGang.text, /gang/);
  await page.screenshot({ path: 'work/proby-gang.png' });

  // 1. A gang broken up (counted like in the game) → the pigeon, next: the lesson.
  await page.evaluate(() => { window.__session.stats.gangs = (window.__session.stats.gangs ?? 0) + 1; });
  const note1 = await next(/gołąb/);
  assert.match(note1.text, /\+150 EXP/);
  assert.equal(await page.evaluate(() => window.__session.story.proby.k), 'lekcja');
  const gLesson = await goal();
  console.log('goal', JSON.stringify(gLesson));
  await go(gLesson.pos.x, gLesson.pos.y);
  // One wrong answer first: the same story again.
  const q1 = await next(/Lekcja/, 'Złote monety');
  await next(/Lekcja/);
  assert.match((await next(/Lekcja/, 'Ciepło do kotłów')).text, new RegExp(q1.text.slice(0, 20)));
  await next(/Lekcja/, 'Przez ludzką chciwość w Wojnie o Tryby');
  await page.screenshot({ path: 'work/proby-lekcja.png' });
  await next(/Lekcja/, 'Kometa');
  await next(/Lekcja/);
  const note2 = await next(/gołąb/);
  assert.match(note2.text, /\+120 EXP/);

  // 2. The burnt circle: the arrow only roughly, the circle shows up nearby.
  const proby = await page.evaluate(() => window.__session.story.proby);
  assert.equal(proby.k, 'krag');
  const gRing = await goal();
  assert(Math.hypot(gRing.pos.x - proby.spot.x, gRing.pos.y - proby.spot.y) <= 40 * 1.92 + 1);
  await go(proby.spot.x + 40, proby.spot.y + 30);
  await page.waitForFunction(() => window.__game.scene.getScene('game').story.ring, null, { timeout: 10000 });
  await page.screenshot({ path: 'work/proby-krag.png' });
  await go(proby.spot.x, proby.spot.y);
  await next(/krąg/);
  const note3 = await next(/gołąb/);
  assert.match(note3.text, /\+200 EXP/);

  // 3. The potion: too little fruit first, then enough.
  assert.equal(await page.evaluate(() => window.__session.story.proby.k), 'mikstura');
  const gPot = await goal();
  console.log('goal', JSON.stringify(gPot));
  await go(gPot.pos.x, gPot.pos.y);
  assert.match((await next(/⚗/)).text, /Masz \d+\. Wróć/);
  await page.evaluate(() => window.__gear.bag.push({ goods: 'owoce', counts: { jablko: 16 } }));
  await go(gPot.pos.x + 80, gPot.pos.y);
  await go(gPot.pos.x, gPot.pos.y);
  await next(/⚗/);
  const note4 = await next(/gołąb/);
  assert.match(note4.text, /ostatnia próba/);
  assert.equal(await page.evaluate(() => window.__session.mikstury), 1);
  const exp = await page.evaluate(() => window.__session.exp);
  assert.equal(exp, 30 + 150 + 120 + 200 + 100);
  assert.match((await goal()).text, /krzepy: poziom 4\/5/);
  await page.screenshot({ path: 'work/proby-krzepa.png' });

  // Level 5 from fighting: the pigeon says „back to the wizard”, the arrow points there.
  await page.evaluate(() => { window.__session.exp = 1000; });
  await next(/gołąb/);
  assert.match((await goal()).text, /Wróć do maga/);
  await page.evaluate(() => window.__game.scene.getScene('game').story.talkToWizard());
  await next(/🧙/);
  await page.waitForFunction(() => window.__session.story.st === 'smok', null, { timeout: 30000 });
  console.log('errors', errors);
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

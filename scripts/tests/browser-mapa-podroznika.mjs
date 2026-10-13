// The traveller's map (content/mapa.ts MAPA_PODROZNIKA): copied at a coachman (300 coins, no item), the map screen's „Okolica”
// keeps up to 6 stations/ports within 50 km (a mocked public/dworce cell + the region's own stations), a tap on an
// icon → „🧭 Prowadź” sets an extra arrow that doesn't count among the 3 quests. Lublin map, mocked server.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-mapa-podroznika.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1100, height: 820 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 1000, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  // One cell of the world's stations (until the „World stations” workflow has made the real ones).
  await context.route((u) => u.pathname.endsWith('/dworce/index.json'), (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ komorki: ['25_11'] }) }));
  await context.route((u) => u.pathname.endsWith('/dworce/25_11.json'), (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify([['Świdnik Miasto', 51.2236, 22.6966, 'k'], ['Dworzec Lublin', 51.2458, 22.5543, 'a'], ['Daleko Stąd', 50.2, 23.9, 'k']]) }));
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:4173/?lang=pl&pogoda=czysto${process.env.URL_EXTRA ?? ''}#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });

  // Without the map: the wide view says where to get one.
  await page.evaluate(() => window.__game.scene.getScene('ui').openMap());
  await page.waitForSelector('#minimap');
  await page.evaluate(() => { for (let i = 0; i < 6; i++) document.querySelectorAll('#minimap .mm-bar button')[1].click(); for (let i = 0; i < 3; i++) document.querySelector('#minimap .mm-bar button').click(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'work/mapa-bez.png' });
  await page.evaluate(() => [...document.querySelectorAll('#minimap .mm-bar button')].at(-1).click());

  // Buying it at a coachman (the dialog's button).
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
    s.openCoach(s.city.places.find((p) => p.kind === 'station'));
  });
  const coach = await page.evaluate(() => window.__dialogi.at(-1).buttons);
  console.log('coach', JSON.stringify(coach));
  const bi = coach.findIndex((b) => b.startsWith('🗺 Przepisz dworce'));
  assert(bi >= 0);
  await page.evaluate((i) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(i); }, bi);
  await page.evaluate(() => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(0); });
  await page.waitForFunction(() => window.__session.mapyPodroznika.length === 1, null, { timeout: 30000 });
  const copied = await page.evaluate(() => window.__session.mapyPodroznika[0].h);
  console.log('copied', JSON.stringify(copied));
  assert(copied.length <= 6 && copied.some((h) => h[3] === 'k') && copied.some((h) => h[3] === 'a'));
  assert(await page.evaluate(() => window.__game.scene.getScene('game').mamMapePodroznika()));
  assert.equal(await page.evaluate(() => window.__session.coins), 700);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__game.scene.getScene('ui').closeDialog?.());

  // The map screen's „Okolica”: the stations within 50 km.
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__game.scene.getScene('ui').openMap());
  await page.waitForSelector('#minimap');
  await page.evaluate(() => { for (let i = 0; i < 6; i++) document.querySelectorAll('#minimap .mm-bar button')[1].click(); for (let i = 0; i < 3; i++) document.querySelector('#minimap .mm-bar button').click(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'work/mapa-okolica.png' });
  // A tap on Świdnik's icon.
  const at = await page.evaluate(() => {
    const c = document.querySelector('#minimap canvas');
    const r = c.getBoundingClientRect();
    return { r: { x: r.left, y: r.top, w: r.width }, k: c.width / r.width };
  });
  const icons = await page.evaluate(() => window.__mm?.() ?? null);
  console.log('icons', JSON.stringify(icons));
  // At most 6, spread out, at least one of every kind there is (railway and bus here).
  assert(icons.length <= 6 && icons.length >= 2, `6 at most (${icons.length})`);
  const kinds = await page.evaluate(() => window.__mmKinds());
  assert(kinds.includes('kolej') && kinds.includes('autobus'), `kinds ${kinds}`);
  const sw = icons[icons.length - 1];
  // The nearest of each kind to the hero comes first.
  const nearest = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); const h = s.city.toLatLon(s.player.x, s.player.y); return h; });
  console.log('hero', JSON.stringify(nearest));
  assert(!icons.some((i) => i.nazwa === 'Daleko Stąd'), 'nothing past 50 km');
  await page.mouse.click(at.r.x + sw.x / at.k, at.r.y + sw.y / at.k);
  await page.waitForSelector('.mm-hub');
  await page.screenshot({ path: 'work/mapa-karta.png' });
  await page.click('.mm-hub button:first-child');
  await page.waitForFunction(() => !document.querySelector('#minimap'));
  const q = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { all: s.activeQuests().map((q) => q.id + ':' + q.text), n: s.questCount() }; });
  console.log('quests', JSON.stringify(q));
  assert(q.all.some((t) => t.startsWith('droga:') && t.includes(sw.nazwa)));
  assert(!q.all.filter((t) => !t.startsWith('droga')).length || q.n === q.all.length - 1);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'work/mapa-strzalka.png' });
  // The closest view: hubs out of sight sit at the edge with their distance, and can be tapped too.
  await page.evaluate(() => window.__game.scene.getScene('ui').openMap());
  await page.waitForSelector('#minimap');
  await page.evaluate(() => { for (let i = 0; i < 6; i++) document.querySelectorAll('#minimap .mm-bar button')[1].click(); });
  await page.waitForFunction(() => (window.__mm?.() ?? []).length >= 2, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'work/mapa-blisko.png' });
  const close = await page.evaluate(() => window.__mm());
  console.log('close', JSON.stringify(close.map((i) => i.nazwa)));
  const at2 = await page.evaluate(() => { const c = document.querySelector('#minimap canvas'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, k: c.width / r.width }; });
  const other = close.find((i) => i.nazwa !== sw.nazwa);
  await page.mouse.click(at2.x + other.x / at2.k, at2.y + other.y / at2.k);
  await page.waitForSelector('.mm-hub');
  await page.click('.mm-hub button:first-child');
  await page.waitForFunction(() => !document.querySelector('#minimap'));
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').drogaDo().nazwa), other.nazwa);
  // Walking there ends the guide.
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); const d = s.drogaDo(); const p = s.city.fromLatLon(d.lat, d.lon); s.player.setPosition(p.x, p.y + 20); });
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => !window.__game.scene.getScene('game').drogaDo(), null, { timeout: 90000 });
  // A map is the map of where it was bought: one from Lębork says nothing here, and the coachman offers this area's.
  await page.evaluate(() => { window.__session.mapyPodroznika = [{ lat: 54.54, lon: 17.75, h: [['Lębork', 54.5436, 17.7509, 'k']] }]; });
  assert(!(await page.evaluate(() => window.__game.scene.getScene('game').mamMapePodroznika())));
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); s.openCoach(s.city.places.find((p) => p.kind === 'station')); });
  assert((await page.evaluate(() => window.__dialogi.at(-1).buttons)).some((b) => b.startsWith('🗺 Przepisz dworce')));
  await page.evaluate(() => window.__game.scene.getScene('ui').closeDialog?.());
  await page.evaluate(() => window.__game.scene.getScene('ui').openMap());
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'work/mapa-inna-okolica.png' });
  console.log('errors', errors);
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

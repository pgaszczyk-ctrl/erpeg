// City boards (tablice z mapką miasta, scripts/tablice): a board stands by a station in Lublin, E / a click opens its
// map (ways out with two names, you are here, stations), a tap on a station → card → „🧭 Prowadź” sets the arrow.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-tablice.mjs   (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const index = require('../../public/map/lublin.json');
const [bx, by] = index.tablice.miejsca[Number(process.env.TABLICA ?? 7)];

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: bx, start_y: by + 14, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove()));
  const near = await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); return { n: s.city.tablice.length, hero: [s.player.x, s.player.y], at: !!s.tablicaAt(x, y - 6) }; }, [bx, by]);
  console.log('board', bx, by, JSON.stringify(near));
  assert(near.n > 10 && near.at, 'the board is there and can be hit');
  await page.screenshot({ path: `work/tablica-swiat${mobile ? '-tel' : ''}.png` });
  // E (AKCJA) right by it.
  await page.keyboard.press('e');
  await page.waitForSelector('#tablica', { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `work/tablica-mapa${mobile ? '-tel' : ''}.png` });
  // Today's note pinned to the board: open it big, accept it.
  await page.waitForSelector('#tablica .tb-kartka', { timeout: 5000 });
  const tytul = await page.evaluate(() => document.querySelector('#tablica .tb-kartka b').textContent);
  console.log('kartka', tytul);
  await page.click('#tablica .tb-kartka');
  await page.waitForSelector('#tablica .tb-kartka-duza .tb-papier');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `work/tablica-kartka${mobile ? '-tel' : ''}.png` });
  console.log('treść', await page.evaluate(() => document.querySelector('#tablica .tb-papier').innerText.replace(/\n+/g, ' / ')));
  await page.evaluate(() => [...document.querySelectorAll('#tablica .tb-papier button')].find((b) => b.textContent.includes('Przyjmuję')).click());
  await page.waitForSelector('#tablica', { state: 'detached' });
  await page.waitForTimeout(600);
  const przyjete = await page.evaluate(() => {
    const s = window.__session;
    const m = Object.values(s.gen).find((m) => m.id.startsWith('gen-tablica-'));
    return { m: m && { id: m.id, typ: m.zadanie.typ, cel: m.zadanie.cel, adres: m.adres }, stan: m && s.missions[m.id], daily: Object.keys(s.daily).filter((k) => k.startsWith('tablica:')) };
  });
  console.log('przyjęte', JSON.stringify(przyjete));
  assert(przyjete.m && przyjete.daily.length === 1, 'the note became a job and the board is used today');
  // The whole job: walk to the goal, then to the giver's door for the pay.
  if (przyjete.m.typ === 'idz') {
    const coins0 = await page.evaluate(() => window.__session.coins);
    const cel = await page.evaluate((id) => { const s = window.__game.scene.getScene('game'); const rm = s.missions.find((r) => r.m.id === id); return { t: rm.target, d: rm.door }; }, przyjete.m.id);
    await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.cameras.main.centerOn(x, y); }, [cel.t.x, cel.t.y]);
    await page.waitForTimeout(2500);
    await page.keyboard.press('e'); // live mode: quest spots go off on AKCJA
    await page.waitForFunction((id) => window.__session.missions[id] === 'goal' || window.__game.scene.getScene('ui').hasDialog, przyjete.m.id, { timeout: 30000 });
    await page.waitForTimeout(800);
    for (let i = 0; i < 4 && await page.evaluate(() => window.__game.scene.getScene('ui').hasDialog); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    console.log('pod adresem, stan', await page.evaluate((id) => window.__session.missions[id], przyjete.m.id));
    await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 6); s.cameras.main.centerOn(x, y); }, [cel.d.x, cel.d.y]);
    await page.waitForTimeout(1500);
    await page.keyboard.press('e');
    await page.waitForTimeout(1500);
    for (let i = 0; i < 6 && await page.evaluate(() => window.__game.scene.getScene('ui').hasDialog); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    const po = await page.evaluate((id) => ({ stan: window.__session.missions[id], coins: window.__session.coins }), przyjete.m.id);
    console.log('u zleceniodawcy', JSON.stringify(po), 'było', coins0);
    assert(po.stan === 'done' && po.coins > coins0, 'paid at the giver');
    await page.evaluate(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y); s.cameras.main.centerOn(x, y); }, [bx, by + 14]);
    await page.waitForTimeout(1500);
  }
  // The board again: the same note, now stamped as taken, no Accept.
  await page.keyboard.press('e');
  await page.waitForSelector('#tablica .tb-kartka.wzieta', { timeout: 5000 });
  await page.click('#tablica .tb-kartka');
  await page.waitForSelector('#tablica .tb-papier');
  assert(!(await page.evaluate(() => [...document.querySelectorAll('#tablica .tb-papier button')].some((b) => b.textContent.includes('Przyjmuję')))), 'no second accept today');
  await page.evaluate(() => [...document.querySelectorAll('#tablica .tb-papier button')].at(-1).click());
  const cele = await page.evaluate(() => window.__tablica);
  console.log('cele', cele.length, cele.filter((c) => c.rodzaj === 'wylot').map((c) => c.nazwa).join(' | '));
  assert(cele.filter((c) => c.rodzaj === 'wylot').length >= 5);
  assert(cele.some((c) => c.rodzaj === 'ty'));
  const ty = cele.find((c) => c.rodzaj === 'ty');
  const st = cele.filter((c) => c.rodzaj === 'kolej' && Math.hypot(c.x - ty.x, c.y - ty.y) > 60 && cele.every((d) => d === c || d.rodzaj === 'wylot' || Math.hypot(d.x - c.x, d.y - c.y) > 30))[0];
  assert(st, 'a station');
  const r = await page.evaluate(() => { const b = document.querySelector('#tablica canvas').getBoundingClientRect(); return { x: b.left, y: b.top }; });
  await page.mouse.click(r.x + st.x, r.y + st.y);
  await page.waitForSelector('#tablica .tb-karta');
  await page.screenshot({ path: `work/tablica-karta${mobile ? '-tel' : ''}.png` });
  console.log('karta', await page.evaluate(() => document.querySelector('#tablica .tb-karta').innerText.replace(/\n/g, ' / ')));
  await page.click('#tablica .tb-karta button');
  await page.waitForSelector('#tablica', { state: 'detached' });
  await page.waitForTimeout(800);
  const droga = await page.evaluate(() => window.__game.scene.getScene('game').drogaDo());
  console.log('droga', JSON.stringify(droga));
  assert(droga && droga.nazwa === st.nazwa);
  assert(await page.evaluate(() => window.__game.loop.running), 'the world runs again');
  await page.screenshot({ path: `work/tablica-strzalka${mobile ? '-tel' : ''}.png` });
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

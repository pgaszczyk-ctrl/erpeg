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

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = []; let submissions = 0; let offline = false; const payloads = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: bx, start_y: by + 14, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    if (path.endsWith('/submit_player_idea')) {
      payloads.push(route.request().postDataJSON());
      if (offline) return route.abort();
      submissions++; body = submissions <= 3 ? {ok:true, remaining:3-submissions} : {ok:false,blad:'limit'};
    }
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

  const button = page.locator('.tb-pomysl');
  assert(await button.isVisible());
  const rect = await button.boundingBox(); assert(rect.x >= 0 && rect.y >= 0 && rect.x+rect.width <= (mobile?844:1280));
  await button.click();
  const dialog = page.locator('.tb-pomysl-dialog');
  const input = dialog.locator('textarea'), send = dialog.getByRole('button', {name:'Wyślij pomysł'});
  await dialog.locator('select').selectOption('quest');
  await input.fill('Quest: uratuj zaginionego kartografa.');
  offline = true;
  await send.click();
  await page.waitForFunction(() => document.querySelector('.tb-pomysl-dialog [role=status]').textContent.includes('Nie udało'));
  assert.equal(await input.inputValue(), 'Quest: uratuj zaginionego kartografa.');
  offline = false;
  await send.click();
  await page.waitForFunction(() => document.querySelector('.tb-pomysl-dialog [role=status]').textContent.includes('Pozostało dziś: 2'));
  assert.equal(payloads.at(-1).p_kind, 'quest'); assert.equal(payloads.at(-1).p_token, 't');
  await dialog.locator('select').selectOption('rozwoj');
  await input.fill('Więcej możliwości rozbudowy domu.'); await send.click();
  await page.waitForFunction(() => document.querySelector('.tb-pomysl-dialog [role=status]').textContent.includes('Pozostało dziś: 1'));
  assert.equal(payloads.at(-1).p_kind, 'rozwoj');
  await input.fill('Trzeci pomysł'); await send.click();
  await page.waitForFunction(() => document.querySelector('.tb-pomysl-dialog [role=status]').textContent.includes('Pozostało dziś: 0'));
  assert(await send.isDisabled());
  await page.screenshot({path:`work/ideas/${mobile?'phone':'desktop'}-saved.png`});
  await dialog.getByRole('button',{name:'Zamknij',exact:true}).click(); await button.click();
  await input.fill('Czwarty pomysł'); await send.click();
  await page.waitForFunction(() => document.querySelector('.tb-pomysl-dialog [role=status]').textContent.includes('limit'));
  assert(await send.isDisabled());
  await page.keyboard.press('Escape'); assert.equal(await dialog.count(),0); assert(await page.locator('#tablica').isVisible());
  assert.deepEqual(errors, []);
  console.log('PASS ideas', mobile?'phone':'desktop', {submissions});
} finally { await browser.close(); }

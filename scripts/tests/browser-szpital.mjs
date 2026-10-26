// Death isn't final + start without the code screen (owner, 26 Oct 2026): a new character goes straight into the game
// with a short tutorial (walk, blow, talk → newsboy), the device remembers it (cookie) for „Kontynuuj”, the HUD
// portrait turns like a coin while there is no account, the first Kufer shows where the code is, and a defeat wakes
// the hero in a hospital without his backpack gold and half his level's progress. Old dead characters come back too.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-szpital.mjs  (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TELEFON = process.env.TELEFON === '1';
const URL0 = 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92, save: { coins: 250, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 6, konto: false, ...o });
try {
  const ctx = await browser.newContext(TELEFON
    ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, locale: 'pl-PL' }
    : { viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
  const rpc = [];
  let startXY = null;
  let martwy = false;
  await ctx.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const name = path.split('/').pop();
    rpc.push(name);
    let body = null;
    const req = route.request().postDataJSON?.() ?? {};
    if (name === 'create_character') { startXY = [req.p_start_x, req.p_start_y]; body = { token: 't', player: gracz({ start_x: req.p_start_x, start_y: req.p_start_y }) }; }
    if (name === 'login') body = { token: 't', player: gracz({ start_x: startXY?.[0] ?? 3000, start_y: startXY?.[1] ?? 3000, dead: martwy, exp: 450 }) };
    if (name === 'szpital_powrot') body = { token: 't2', player: gracz({ start_x: startXY?.[0] ?? 3000, start_y: startXY?.[1] ?? 3000, exp: 375, save: { coins: 0 } }) };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${URL0}?lang=pl&ostrosc=1`);
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.locator('.m-namerow input').fill('Zbyszko');
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  assert.equal(await page.getByText('Mam kod – graj').count(), 0, 'no code screen');
  const cookie = (await ctx.cookies()).find((c) => c.name === 'exp-postac');
  assert(cookie && decodeURIComponent(cookie.value).includes('ABCD1234'), 'character kept in a cookie');
  await page.waitForTimeout(3000);
  // Tutorial 1: walking.
  await page.waitForSelector('#samouczek-krok:not(.ukryty)', { timeout: 20000 });
  const krok = () => page.locator('#samouczek-krok').innerText();
  console.log('1:', await krok());
  await page.screenshot({ path: `work/samouczek-1${TELEFON ? '-tel' : ''}.png` });
  const game = () => page.evaluate(() => { const g = window.__game.scene.getScene('game'); return { x: g.player.x, y: g.player.y }; });
  if (TELEFON) {
    // Walk with a touch drag (the joystick appears under the thumb).
    const s = await page.context().newCDPSession(page);
    const t = (type, x, y) => s.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    for (const [dx, dy] of [[80, 0], [0, 80], [-80, 0], [0, -80]]) {
      await t('touchStart', 420, 200); await t('touchMove', 420 + dx, 200 + dy);
      await page.waitForTimeout(1400); await t('touchEnd');
    }
  } else {
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.down(k); await page.waitForTimeout(1300); await page.keyboard.up(k); }
  }
  await page.waitForFunction(() => /uderz|Uderzasz|uderzenie/i.test(document.querySelector('#samouczek-krok')?.textContent ?? ''), null, { timeout: 15000 });
  console.log('2:', await krok());
  if (TELEFON) await page.touchscreen.tap(420, 200); else await page.keyboard.press('Space');
  await page.waitForFunction(() => /pogadać/.test(document.querySelector('#samouczek-krok')?.textContent ?? ''), null, { timeout: 15000 });
  console.log('3:', await krok());
  await page.waitForTimeout(3000);
  const cel = await page.evaluate(() => window.__game.scene.getScene('game').activeQuests().find((q) => q.id === 'samouczek')?.text ?? null);
  console.log('arrow to:', cel);
  await page.screenshot({ path: `work/samouczek-3${TELEFON ? '-tel' : ''}.png` });
  // Coin with the warning.
  await page.evaluate(() => window.__moneta());
  await page.waitForTimeout(2400);
  await page.screenshot({ path: `work/moneta-tekst${TELEFON ? '-tel' : ''}.png` });
  assert(await page.locator('.moneta-napis.on').count() === 1, 'warning note on');
  await page.waitForTimeout(4500);
  // First Kufer: the spotlight on the code button.
  await page.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
  await page.waitForSelector('#samouczek', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `work/kufer-kod${TELEFON ? '-tel' : ''}.png` });
  const r = await page.locator('#character .k-kod-btn').boundingBox();
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#samouczek').count(), 0, 'spotlight closed');
  assert(await page.locator('#character .k-kod-menu:not([hidden])').count() === 1, 'the share menu opened');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.querySelector('#character .k-valve')?.click(); });
  await page.waitForTimeout(800);
  // Defeat → hospital.
  await page.evaluate(() => { const g = window.__game.scene.getScene('game'); const s = window.__session; s.coins = 321; s.exp = 450; g.player.hp = 0; g.onPlayerDeath(); });
  await page.waitForTimeout(4000);
  const po = await page.evaluate(() => {
    const g = window.__game.scene.getScene('game'); const s = window.__session;
    const h = g.city.places.filter((p) => p.kind === 'hospital').map((p) => Math.hypot(p.door.x - g.player.x, p.door.y - g.player.y)).sort((a, b) => a - b)[0];
    return { coins: s.coins, exp: s.exp, hp: g.player.hp, doSzpitala: Math.round(h), dialog: window.__game.scene.getScene('ui').dialogTitle?.() ?? null };
  });
  console.log('after defeat:', po);
  await page.screenshot({ path: `work/szpital${TELEFON ? '-tel' : ''}.png` });
  assert.equal(po.coins, 0);
  assert.equal(po.exp, 375, '450 EXP at level 3 (300): half of 150 lost');
  assert(po.hp > 0);
  assert(po.doSzpitala < 60, 'at a hospital door');
  // A reload: „Kontynuuj”.
  martwy = true;
  await page.evaluate(() => { window.onbeforeunload = null; });
  await page.goto(`${URL0}?lang=pl&ostrosc=1`);
  await page.waitForSelector('text=Kontynuuj: Zbyszko', { timeout: 30000 });
  assert.equal(await page.getByText('Tablica pamięci').count(), 0, 'no memorial board');
  await page.screenshot({ path: `work/menu-kontynuuj${TELEFON ? '-tel' : ''}.png` });
  await page.getByText('Kontynuuj: Zbyszko').click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game'), null, { timeout: 120000 });
  assert(rpc.includes('szpital_powrot'), 'a dead character came back through the hospital');
  assert(!rpc.includes('die'), 'die never called');
  console.log('errors:', errors);
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

// Przedmioty na ludziku i na ziemi (właściciel, 25.11.2026): założony złoty rogaty hełm ma być rogatym złotym hełmem,
// świecący miecz świeci, łup na ziemi to pikselowa miniaturka obrazka grafika. Zrzuty w work/miniatury/.
// Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-miniatury.mjs  (TELEFON=1 for a phone)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const TELEFON = process.env.TELEFON === '1';
const sfx = TELEFON ? '-tel' : '';
const URL0 = `http://127.0.0.1:${process.env.PORT || 4173}/`;
fs.mkdirSync('work/miniatury', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const ZESTAWY = [
  { helm: 'helm_rogaty', bron: 'swietlisty', dystans: 'tarcza_okuta', zbroja: 'plaszcz_cechmistrza', buty: 'zelazne_buty' },
  { helm: 'czapka_maga', bron: 'kostur_krysztalowy', dystans: 'ksiega_grimuar', zbroja: 'kolczuga', buty: 'buty_biegacza' },
  { helm: 'kapelusz', bron: 'dlugi_luk', dystans: 'kolczan_zloty', zbroja: 'skorzana_zbroja', buty: 'skorzane_buty' },
];
const gracz = (o = {}) => ({ name: 'Zbyszko', idik: 'ABCD1234', start_place: 'Plac Zamkowy', start_x: 0, start_y: 0, map_scale: 1.92,
  save: { coins: 250, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, magic: true, equip: ZESTAWY[0] }, exp: 450, dead: false, died_at: null, age: 6, konto: true, ...o });
try {
  const ctx = await browser.newContext(TELEFON
    ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, locale: 'pl-PL' }
    : { viewport: { width: 1280, height: 720 }, locale: 'pl-PL' });
  let startXY = null;
  await ctx.route('**/*.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const req = route.request().postDataJSON?.() ?? {};
    let body = null;
    if (name === 'create_character') { startXY = [req.p_start_x, req.p_start_y]; body = { token: 't', player: gracz({ start_x: req.p_start_x, start_y: req.p_start_y }) }; }
    if (name === 'login') body = { token: 't', player: gracz({ start_x: startXY?.[0] ?? 3000, start_y: startXY?.[1] ?? 3000 }) };
    if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
    if (name === 'game_settings') body = {};
    if (['heartbeat', 'save_game', 'logout', 'log_error'].includes(name)) body = true;
    if (name === 'server_now') body = new Date().toISOString();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${URL0}?lang=pl&ostrosc=1&live=0`);
  await page.getByRole('button', { name: 'Nowa postać' }).click();
  await page.getByPlaceholder('np. Zbyszko').fill('Zbyszko');
  await page.getByText('Mężczyzna', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Stwórz postać' }).click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  await page.waitForFunction(() => { const l = window.__game.scene.getScene('game').ludzik3d; return l?.widoczny && l.image?.visible; }, null, { timeout: 90000 });
  // closest zoom, so the miniatures can be seen on the screenshot
  await page.evaluate(() => { const g = window.__game.scene.getScene('game'); g.toggleZoom?.(); g.toggleZoom?.(); });
  const kadr = async (plik) => {
    const r = await page.evaluate(() => { const g = window.__game.scene.getScene('game'), c = g.cameras.main, p = g.player;
      return { x: (p.x - c.worldView.x) * c.zoomX / (window.devicePixelRatio > 1 ? 1 : 1), y: (p.y - c.worldView.y) * c.zoomY, z: c.zoomX }; });
    const o = await page.evaluate(() => window.__game.canvas.getBoundingClientRect().width / window.__game.canvas.width);
    const x = r.x * o, y = r.y * o, s = 26 * r.z * o;
    await page.screenshot({ path: plik, clip: { x: Math.max(0, x - s), y: Math.max(0, y - s * 1.4), width: s * 2, height: s * 2 } });
  };
  for (let i = 0; i < ZESTAWY.length; i++) {
    await page.evaluate((z) => { Object.assign(window.__gear.equip, z); window.__game.scene.getScene('game').gearChanged(); }, ZESTAWY[i]);
    await page.waitForTimeout(TELEFON ? 14000 : 10000);
    console.log('klatka', await page.evaluate(() => { const l = window.__game.scene.getScene('game').ludzik3d; return [l.image?.texture.key?.slice(0, 60), l.image?.displayHeight]; }));
    const eq = await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.strojO.eq);
    console.log('zestaw', i, Object.fromEntries(Object.entries(eq).map(([k, v]) => [k, v.ksztalt ?? v.kolor])));
    for (const m of ['helm', 'bron', 'druga', 'zbroja', 'buty']) assert.ok(eq[m], `${m} has its look in set ${i}`);
    if (i === 0) { assert.equal(eq.helm.rogi, '#ece4d4'); assert.equal(eq.helm.kolor, '#e0b048'); assert.ok(eq.bron.poswiata); }
    if (i === 1) assert.equal(eq.bron.ksztalt, 'kostur');
    if (i === 2) assert.equal(eq.druga.ksztalt, 'kolczan');
    await kadr(`work/miniatury/zestaw${i}${sfx}.png`);
  }
  // loot on the ground: the code-made miniature, not the shrunk icon; a glowing item glows
  const lup = await page.evaluate(() => {
    const g = window.__game.scene.getScene('game'), p = g.player;
    const ids = ['helm_rogaty', 'kolczan_lowcy', 'kostur_krysztalowy', 'ksiega_grimuar', 'swietlisty', 'kolczan_zloty'];
    ids.forEach((id, i) => g.upuscPrzedmiot(p.x - 30 + i * 12, p.y + 22, id));
    return ids.map((id) => { const it = g.pickups.find((q) => q.getData?.('kind') === `item:${id}`); return { id, tex: it?.texture.key, skala: it?.getData('skala') ?? null, w: it?.width }; });
  });
  console.log('lup', lup);
  for (const l of lup) { assert.equal(l.tex, `ziemia-${l.id}`); assert.equal(l.w, 22, `${l.id}: a 22 px miniature`); }
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.__game.scene.getScene('game'); g.player.y -= 0; });
  const r = await page.evaluate(() => { const g = window.__game.scene.getScene('game'), c = g.cameras.main, p = g.player, o = window.__game.canvas.getBoundingClientRect().width / window.__game.canvas.width;
    return { x: (p.x - c.worldView.x) * c.zoomX * o, y: (p.y + 22 - c.worldView.y) * c.zoomY * o, s: c.zoomX * o }; });
  await page.screenshot({ path: `work/miniatury/lup${sfx}.png`, clip: { x: Math.max(0, r.x - 42 * r.s), y: Math.max(0, r.y - 22 * r.s), width: 84 * r.s, height: 34 * r.s } });
  assert.deepEqual(errors, []);
  console.log('OK');
} finally { await browser.close(); }

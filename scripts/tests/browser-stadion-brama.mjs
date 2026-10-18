// Stadiums closed by their stands (Arena Lublin): a gate cut from the south lets the hero walk onto the pitch,
// and the Arena's banners in the country's colours stand by the gate (test server, turn fights on).
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-stadion-brama.mjs   (TELEFON=1)
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
    // Jam at home; teleported to just south of Arena Lublin's stands.
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
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  const g = (fn, arg) => page.evaluate(fn, arg);
  await g(() => { const s = window.__game.scene.getScene('game'); s.player.setPosition(13885, 13930); });
  await page.waitForFunction(() => window.__game.scene.getScene('game').city.buildings.some((b) => b.addresses.includes('Stadionowa 1') && b.rings.length), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const info = await g(() => {
    const s = window.__game.scene.getScene('game');
    const b = s.city.buildings.find((b) => b.addresses.includes('Stadionowa 1'));
    return b && { brama: b.brama, rings: b.rings.length };
  });
  console.log('stadion', JSON.stringify(info));
  assert(info?.brama, 'the stadium got its gate');
  const bx = (info.brama.x0 + info.brama.x1) / 2, by = Math.max(info.brama.y0, info.brama.y1);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.protectUntil = 0; s.player.setPosition(x, y + 40); }, [bx, by]);
  await page.waitForFunction(() => [...window.__game.scene.getScene('game').training.activeNpcs].some((n) => n.role === 'sedzia' && n.flagi?.length), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `work/stadion-${tag}-brama.png` });
  const flagi = await g(() => [...window.__game.scene.getScene('game').training.activeNpcs].filter((n) => n.role === 'sedzia').map((n) => n.flagi?.length ?? 0));
  console.log('flagi', JSON.stringify(flagi));
  console.log('tekstury', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); return [s.textures.exists('arena-choragiew'), s.textures.exists('arena-choragiew-maska'), s.textures.getTextureKeys().filter((k) => k.startsWith('arena')), [...s.training.activeNpcs].map((n) => n.flagi && n.flagi.length)]; })));
  console.log('ludzie', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); return { p: [s.player.x, s.player.y], n: [...s.training.people.values()].filter(Boolean).map((n) => [n.role, Math.round(n.x), Math.round(n.y), !!n.sprite]) }; })));
  assert(flagi.some((n) => n >= 2), 'banners by the gate');
  // Walk north through the gate onto the pitch.
  const y0 = await g(() => window.__game.scene.getScene('game').player.y);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(4000);
  await page.keyboard.up('ArrowUp');
  const p = await g(() => { const s = window.__game.scene.getScene('game'); return { x: s.player.x, y: s.player.y }; });
  console.log('od', y0, 'do', JSON.stringify(p));
  await page.screenshot({ path: `work/stadion-${tag}-boisko.png` });
  assert(p.y < by - 25, 'the hero walked in through the gate');
  const kukly = await g(() => { const s = window.__game.scene.getScene('game'); const b = s.city.buildings.find((b) => b.misa); return [...s.training.active].filter((q) => b && window.__pip?.(b.misa, q.x, q.y)).length + [...s.training.active].filter((q) => q.x > 13810 && q.x < 13960 && q.y > 13590 && q.y < 13811).length; });
  console.log('kukły w misie', kukly);
  assert.equal(kukly, 0, 'no training dummies in the stadium bowl');
  // An open pitch's arena: banners at its corners.
  const inny = await g(() => { const n = [...window.__game.scene.getScene('game').training.activeNpcs].find((n) => n.role === 'sedzia' && n.flagi?.length === 8); return n && { x: n.x, y: n.y }; });
  if (inny) {
    await g((q) => { const s = window.__game.scene.getScene('game'); const f = s.city.freeNear(q.x, q.y + 30); s.player.setPosition(f.x, f.y - 5); }, inny);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `work/stadion-${tag}-boisko-otwarte.png` });
  }
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

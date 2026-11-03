// Zrzut budynków generatora 09 na Starym Mieście (porównanie przed/po).
// Run: npx vite preview --port 4173 & PORT=4173 NAZWA=po node scripts/tests/browser-budynki-zrzut.mjs   (TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const MIEJSCA = [['rynek', 51.24795, 22.56765], ['grodzka', 51.24905, 22.56900], ['bramakrak', 51.24735, 22.56530]];
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const mobile = process.env.TELEFON === '1';
const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
await context.route('**/*.supabase.co/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  let body = null;
  if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Rynek 1, Lublin', map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9 } };
  if (path.endsWith('/game_settings')) body = {};
  if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
  if (path.endsWith('/server_now')) body = new Date().toISOString();
  if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
  if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=czysto&wiatr=0#postac=Jam&kod=ANGELIKA`);
await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 300000 });
await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove()));
for (const [n, lat, lon] of MIEJSCA) {
  await page.evaluate(([lat, lon]) => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(lat, lon); const f = s.city.freeNear ? s.city.freeNear(p.x, p.y) : p; s.player.setPosition(f.x, f.y); s.cameras.main.centerOn(f.x, f.y); }, [lat, lon]);
  await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 300000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `work/budynki-${n}-${process.env.NAZWA ?? 'x'}${mobile ? '-tel' : ''}.png` });
  console.log('zrzut', n);
}
await browser.close();

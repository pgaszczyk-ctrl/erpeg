// A short dialog on a phone held sideways (1000×445, the owner's screenshot, 27 Oct 2026) shows whole, without
// scrolling; a long one still scrolls. Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-dialog-bez-przewijania.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 1000, height: 445 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'pl-PL' });
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = true;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(12000);
  const pokaz = (text, n) => page.evaluate(([text, n]) => {
    const s = window.__game.scene.getScene('game');
    const buttons = n === 2 ? ['🕯 Schodzę', 'Nie teraz'] : Array.from({ length: n }, (_, i) => 'Opcja ' + (i + 1));
    s.dialog({ title: '🕯 Katakumby pod świątynią – Archikatedra Świętego Jana Chrzciciela i Świętego Jana Ewangelisty', text, buttons, onChoose: () => {} });
    const ui = window.__game.scene.getScene('ui');
    return { scrollMax: ui.scrollMax, h: ui.view.height };
  }, [text, n]);
  await page.waitForTimeout(300);
  const krotki = await pokaz('Za świątynią, pod murem, okute drzwiczki prowadzą do starych katakumb. Ktoś je niedawno wyważył…\n\nZejść do katakumb?', 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'work/dialog-poziomo-krotki.png' });
  console.log('krótki', krotki);
  assert.equal(krotki.scrollMax, 0, 'short dialog must not scroll');
  const dlugi = await pokaz('Długi tekst. '.repeat(10), 9);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'work/dialog-poziomo-dlugi.png' });
  console.log('długi', dlugi);
  assert(dlugi.scrollMax > 0, 'long dialog still scrolls');
  console.log('OK');
} finally { await browser.close(); }

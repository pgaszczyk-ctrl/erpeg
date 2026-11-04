// No limit of active quests (owner, 13 Oct 2026): 12 side quests at once all get their colour, arrow and quest-log line,
// and taking another is never refused. Lublin map, mocked server.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-bez-limitu-zadan.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 820 }, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 120000 });
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const { x, y } = s.player;
    s.sideQuests = () => Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, title: `Zadanie ${i + 1}`, text: `Zadanie ${i + 1}`, pos: { x: x + Math.cos(i / 2) * 900, y: y + Math.sin(i / 2) * 900 } }));
    s.emitHud();
    const q = s.activeQuests();
    return { n: q.length, colours: new Set(q.map((z) => z.color)).size, full: s.questsFull(), log: s.questLog().length };
  });
  await page.waitForTimeout(9000);
  const arrows = await page.evaluate(() => window.__game.scene.getScene('ui').arrows.filter((a) => a.visible).length);
  console.log(JSON.stringify({ ...r, arrows }));
  assert(r.n >= 12 && r.log === r.n && !r.full && r.colours >= 10 && arrows >= 12);
  await page.screenshot({ path: 'work/bez-limitu.png' });
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

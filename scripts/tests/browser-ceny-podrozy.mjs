// Travel prices and speeds (content/pociagi.ts WOZNICA / POCIAG, admin knobs in content/ustawienia.ts):
// the coachman's list prices a horse ride at 100 + 30/km and a long train 🚂 at 100 + 15/km (rounded up to 10),
// times at 80 / 120 km/h. A second run gives the knobs from the server (game_settings) and checks they win.
// Lublin map, mocked server.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-ceny-podrozy.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
const cena = (km, oplata, zaKm) => Math.ceil((oplata + km * zaKm) / 10) * 10;
const minuty = (km, kmh) => Math.round((km / kmh) * 60);
const naMinuty = (t) => {
  const g = /(\d+) godz\./.exec(t), m = /(\d+) min/.exec(t), d = /(\d+) dni/.exec(t);
  return (d ? +d[1] * 1440 : 0) + (g ? +g[1] * 60 : 0) + (m ? +m[1] : 0);
};

async function run(settings, expect) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 820 }, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 100000, story: { st: 'koniec', walked: 99 } }, exp: 0, dead: false, died_at: null, age: 9 } };
    if (path.endsWith('/game_settings')) body = settings;
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
  // Every station's coachman until one offers a long train.
  const lists = await page.evaluate(() => {
    const s = window.__game.scene.getScene('game');
    const out = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { out.push(req.text); };
    for (const p of s.city.places.filter((q) => q.kind === 'station')) s.openCoach(p);
    s.dialog = orig;
    return out;
  });
  let coach = 0, train = 0;
  for (const text of lists) {
    for (const line of text.split('\n').filter((l) => l.startsWith('• '))) {
      const m = /: (\d+) km, (.+?) – (\d+) monet/.exec(line);
      if (!m) continue;
      const isTrain = line.startsWith('• 🚂');
      const t = isTrain ? expect.pociag : expect.woznica;
      const priceText = +m[3];
      // The list rounds km for display; the price uses the real distance – allow one rounding step.
      const km = +m[1];
      const lo = cena(Math.max(0, km - 0.5), t.oplata, t.zaKm), hi = cena(km + 0.5, t.oplata, t.zaKm);
      assert(priceText >= lo && priceText <= hi, `price ${line} (expected ${lo}–${hi})`);
      const min = naMinuty(m[2]);
      assert(Math.abs(min - minuty(km, t.kmh)) <= Math.max(2, minuty(km, t.kmh) * 0.03), `time ${line} (expected ~${minuty(km, t.kmh)} min)`);
      isTrain ? train++ : coach++;
    }
  }
  const kmhText = lists.find((t) => /pociągiem/.test(t)) ?? '';
  assert(kmhText.includes(`Koniem jedziemy ok. ${expect.woznica.kmh} km/h`), 'coach speed in the text');
  assert(kmhText.includes(`pociągiem 🚂 ok. ${expect.pociag.kmh} km/h`), 'train speed in the text');
  console.log(`lines checked: ${coach} coach, ${train} train`, '\n  e.g.', lists.find((t) => /🚂/.test(t))?.split('\n').filter((l) => l.startsWith('•')).join('\n  '));
  assert(coach > 0 && train > 0);
  assert.deepEqual(errors, []);
  await context.close();
}

try {
  console.log('— defaults');
  await run({}, { woznica: { oplata: 100, zaKm: 30, kmh: 80 }, pociag: { oplata: 100, zaKm: 15, kmh: 120 } });
  console.log('— admin knobs');
  await run({ woznica_za_km: 40, woznica_kmh: 60, pociag_oplata: 200, pociag_za_km: 10, pociag_kmh: 150 }, { woznica: { oplata: 100, zaKm: 40, kmh: 60 }, pociag: { oplata: 200, zaKm: 10, kmh: 150 } });
  console.log('PASS travel prices');
} finally {
  await browser.close();
}

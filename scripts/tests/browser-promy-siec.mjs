// The ferry network (owner, 13 Oct 2026; public/promy-siec.json from scripts/promy-siec.py): every sea port sails to
// its country's flagship, flagships to the flagships next to them by sea, and the captain works out a way with
// changes to any country („Kenia” from Denmark ends at Dar es Salaam, Tanzania). Real porty.json, mocked server.
// Run: VITE_TEST=1 npm run build && npx vite preview --port 4173 & node scripts/tests/browser-promy-siec.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ locale: 'pl-PL' });
  await context.route('**/*.supabase.co/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/game_ports') ? [] : null) }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?lang=pl');
  await page.waitForFunction(() => window.__porty, null, { timeout: 60000 });
  const r = await page.evaluate(async () => {
    const P = window.__porty;
    await P.wczytajPorty();
    const at = (lat, lon) => P.portyBlisko({ lat, lon }, 5)[0];
    const opis = (p) => P.rejsyZ(p).map((q) => `${q.do.nazwa}[${q.siec ?? 'linia'}:${P.krajPortu(q.do)[0]}] ${q.km}`);
    const gdynia = at(54.535, 18.5), kop = P.portyBlisko({ lat: 55.68, lon: 12.6 }, 15)[0], hel = at(54.6, 18.8);
    const t = (p, x) => { const w = P.trasaDo(p, x); return w && { droga: w.hops.map((h) => h.nazwa).join(' → '), km: w.km, kraj: w.kraj, przez: w.przez }; };
    return {
      gdynia: gdynia && [gdynia.nazwa, P.krajPortu(gdynia), opis(gdynia)],
      hel: hel && [hel.nazwa, P.krajPortu(hel), opis(hel)],
      kop: kop && [kop.nazwa, P.krajPortu(kop), opis(kop)],
      kenia: kop && t(kop, 'Kenia'),
      japonia: gdynia && t(gdynia, 'japan'),
      ateny: gdynia && t(gdynia, 'Pireus'),
      bzdura: gdynia && t(gdynia, 'Atlantyda'),
    };
  });
  for (const [k, v] of Object.entries(r)) console.log(k, JSON.stringify(v));
  assert.equal(r.gdynia[2].filter((s) => /\[sasiad:/.test(s)).length, 2, 'Gdynia sails to two neighbouring countries');
  // At most 3 a port (owner, 14 Oct 2026): one at home if there is one, two foreign countries, one port each.
  for (const k of ['gdynia', 'hel', 'kop']) {
    const l = r[k][2], iso = r[k][1][0];
    assert(l.length <= 3, `${k}: ${l.length} lines`);
    const obce = l.map((s) => s.match(/:([A-Z]{2})\]/)?.[1]).filter((c) => c && c !== iso);
    assert.equal(new Set(obce).size, obce.length, `${k}: one port per country`);
  }
  assert(r.kenia && /Dar es Salaam$/.test(r.kenia.droga) && r.kenia.przez === 'Tanzania', 'Kenya via Tanzania');
  assert(r.japonia && r.japonia.km > 15000);
  assert.equal(r.bzdura, null);
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

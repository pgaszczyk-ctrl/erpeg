// Screenshots for the itch.io page: the hero on Giewont (Zakopane sample + local terrain), by the Vistula under
// Wawel (Kraków sample) and at Zamek Lubelski (Lublin map). Server calls are mocked.
// Run: npm run build && npx vite preview --port 4173 & node scripts/zrzuty-itch.mjs  (MIEJSCE=giewont|wisla|zamek, TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORT = process.env.PORT ?? 4173;
const OUT = process.env.OUT ?? 'work/itch';
await mkdir(OUT, { recursive: true });

const MIEJSCA = {
  giewont: { probka: 'zakopane', ll: [49.2508, 19.9335] },
  wisla: { probka: 'krakow', ll: [50.0530, 19.9320] },
  zamek: { probka: null, ll: [51.2496, 22.5715] },
};
const wybrane = process.env.MIEJSCE ? process.env.MIEJSCE.split(',') : Object.keys(MIEJSCA);
const mobile = process.env.TELEFON === '1';
const dsf = Number(process.env.DSF ?? 2);

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  for (const nazwa of wybrane) {
    const m = MIEJSCA[nazwa];
    const [lat, lon] = (process.env.LL ? process.env.LL.split(',').map(Number) : m.ll);
    const sample = m.probka ? await readFile(`data/world-sample/${m.probka}.pmtiles`) : null;
    const context = await browser.newContext({
      viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 },
      isMobile: mobile, hasTouch: mobile, deviceScaleFactor: dsf, locale: 'pl-PL', timezoneId: 'Europe/Warsaw',
    });
    await context.addInitScript(() => { try { localStorage.setItem('exp-przyblizenie', '1'); } catch {} });
    const at = m.probka ? { m: `w:${lat.toFixed(4)},${lon.toFixed(4)}`, x: 0, y: 0, s: 1.92 } : undefined;
    const save = { coins: 1240, diamenty: 2, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1, 'prolog.recruit.v1': 1 }, missions: { 'prolog.recruit.v1': 'done' }, ...(at ? { at } : {}) };
    await context.route('**/*.supabase.co/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = null;
      if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save, exp: 2600, dead: false, died_at: null, age: 9, konto: true, trudnosc_wybrana: true } };
      if (path.endsWith('/game_settings')) body = {};
      if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
      if (path.endsWith('/server_now')) body = new Date().toISOString();
      if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
      if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    if (sample) {
      await context.route((url) => url.pathname.endsWith('/sample.pmtiles'), async (route) => {
        const range = route.request().headers().range;
        const r = range && /bytes=(\d+)-(\d+)/.exec(range);
        if (!r) return route.fulfill({ status: 200, body: sample, contentType: 'application/octet-stream' });
        const a = Number(r[1]), b = Math.min(Number(r[2]), sample.length - 1);
        return route.fulfill({ status: 206, body: sample.subarray(a, b + 1), headers: { 'Content-Range': `bytes ${a}-${b}/${sample.length}`, 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' } });
      });
      await context.route((url) => url.pathname.startsWith('/teren/'), async (route) => {
        const p = new URL(route.request().url()).pathname.replace('/teren/', '');
        try { return route.fulfill({ status: 200, body: await readFile(`data/world-sample/terrarium/${p}`), contentType: 'image/png' }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      });
    }
    // Nothing of the outside world (R2, elevation server) in this sandbox.
    await context.route(/r2\.dev|amazonaws\.com/, (route) => route.fulfill({ status: 404, body: '' }));
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('pageerror', e.message));
    page.on('dialog', (d) => d.accept());
    const q = new URLSearchParams({ lang: 'pl', pogoda: 'czysto', miesiac: '7' });
    if (sample) { q.set('world', `http://127.0.0.1:${PORT}/sample.pmtiles`); q.set('terrain', `http://127.0.0.1:${PORT}/teren`); }
    await page.goto(`http://127.0.0.1:${PORT}/?${q}#postac=Jam&kod=ANGELIKA`);
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
    if (!sample) {
      await page.evaluate(([la, lo]) => {
        const s = window.__game.scene.getScene('game');
        const p = s.city.fromLatLon(la, lo);
        s.player.setPosition(p.x, p.y);
      }, [lat, lon]);
    }
    await page.waitForTimeout(3000);
    await page.waitForFunction(() => window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
    await page.waitForTimeout(Number(process.env.CZEKAJ ?? 9000));
    await page.evaluate(() => document.querySelectorAll('.m-screen, #samouczek-krok, .toast, #toast').forEach((e) => e.remove()));
    const info = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { map: s.city.id, x: Math.round(s.player.x), y: Math.round(s.player.y), fps: Math.round(window.__game.loop.actualFps) }; });
    console.log(nazwa, JSON.stringify(info));
    await page.screenshot({ path: `${OUT}/${nazwa}${mobile ? '-tel' : ''}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}

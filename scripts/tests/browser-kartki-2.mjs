// Board notes, step 2 (owner, 2 Nov 2026): scouting odd places, patrols along a path/bank and gathering by the weather.
// Counts which kinds the Lublin boards can give, then plays a scouting job and a patrol to the end (clues, an ambush if
// any, back to the giver for the pay). Run: npm run build && npx vite preview --port 4173 & node scripts/tests/browser-kartki-2.mjs
// (TELEFON=1 for a phone, POGODA=deszcz|snieg|czysto).
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const index = require('../../public/map/lublin.json');
const [bx, by] = index.tablice.miejsca[Number(process.env.TABLICA ?? 7)];
const pogoda = process.env.POGODA ?? 'deszcz';

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const mobile = process.env.TELEFON === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: bx, start_y: by + 14, map_scale: 1.92, save: { coins: 100, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 } }, exp: 200, dead: false, died_at: null, age: 9, immortal: true } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes') || path.endsWith('/game_ports')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/save_game') || path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 4173}/?lang=pl&pogoda=${pogoda}&ostrosc=1#postac=Jam&kod=ANGELIKA`);
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.querySelectorAll('.m-screen, #samouczek-krok').forEach((e) => e.remove());
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
  });
  // Which kinds each board can give (ground loaded round the hero only, so near boards).
  const przeglad = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('game');
    const K = window.__kartki;
    const out = {};
    const dzien = new Date().toISOString().slice(0, 10);
    for (const t of s.city.tablice) {
      if (Math.hypot(t.x - s.player.x, t.y - s.player.y) > 2500) continue;
      for (const r of ['polowanie', 'dostawa', 'zbieranie', 'zwiad', 'patrol']) {
        const k = K.kartkaTablicy(s.city, t, dzien, r);
        out[r] ??= { ile: 0, przyklad: '' };
        if (k) { out[r].ile++; out[r].przyklad ||= `${k.misja.tytul} | ${k.misja.opis} | etapy ${k.misja.etapy?.map((e) => e.typ).join('>') ?? k.misja.zadanie.typ}`; }
      }
    }
    return out;
  });
  console.log(JSON.stringify(przeglad, null, 1));
  assert(przeglad.zwiad.ile > 0 && przeglad.patrol.ile > 0, 'scouting and patrols exist near the boards');
  if (pogoda === 'deszcz') assert(/deszcz/i.test(przeglad.zbieranie.przyklad), 'after rain the gathering note is about mushrooms after rain');

  const g = (fn, a) => page.evaluate(fn, a);
  const czekajDialog = async (od, re) => {
    await page.waitForFunction(([n, r]) => window.__dialogi.length > n && (!r || new RegExp(r).test(window.__dialogi.at(-1).title + '\n' + window.__dialogi.at(-1).text)), [od, re?.source ?? null], { timeout: 20000 });
    return g(() => { const d = window.__dialogi.at(-1); return { title: d.title, text: d.text, buttons: d.buttons }; });
  };
  const wybierz = (i = 0) => g((i) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(i); }, i);
  const idzDo = (ll) => g((ll) => { const s = window.__game.scene.getScene('game'); const p = s.city.fromLatLon(ll.lat, ll.lon); s.player.setPosition(p.x, p.y + 3); s.player.vel?.set?.(0, 0); }, ll);

  for (const rodzaj of ['zwiad', 'patrol']) {
    // The nearest board that gives this kind; accept the note there.
    const m = await g((rodzaj) => {
      const s = window.__game.scene.getScene('game');
      const dzien = new Date().toISOString().slice(0, 10);
      const tabl = [...s.city.tablice].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y));
      for (const t of tabl) {
        if (!window.__kartki.kartkaTablicy(s.city, t, dzien, rodzaj)) continue;
        const k = s.kartkaNaTablicy(t, rodzaj);
        if (!k || k.stan !== 'nowa') continue;
        k.przyjmij();
        return Object.values(window.__session.gen).filter((m) => m.id.startsWith('gen-tablica-')).at(-1);
      }
      return null;
    }, rodzaj);
    assert(m, `${rodzaj}: a note accepted`);
    console.log(rodzaj, m.tytul, '|', m.opis, '|', m.etapy.map((e) => `${e.typ}${e.tropy ? `(${e.ile}/${e.tropy.length})` : ''}`).join(' > '));
    const coins0 = await g(() => window.__session.coins);
    for (let i = 0; i < m.etapy.length; i++) {
      const e = m.etapy[i];
      assert.equal(await g((id) => window.__session.etap[id] ?? 0, m.id), i, `${rodzaj}: at stage ${i}`);
      if (e.typ === 'badanie') {
        for (const t of e.tropy.slice(0, e.ile)) {
          await idzDo(t.miejsce);
          await page.waitForTimeout(700);
          const n = await g(() => window.__dialogi.length);
          await page.keyboard.press('e');
          const d = await czekajDialog(n);
          console.log('  trop:', d.title, '–', d.text, '[', d.buttons[0], ']');
          await wybierz(0);
          await page.waitForTimeout(300);
        }
        if (i === 0) await page.screenshot({ path: `work/kartka-${rodzaj}${mobile ? '-tel' : ''}.png` });
      } else if (e.typ === 'pokonaj') {
        await idzDo(e.miejsce);
        await page.waitForTimeout(1500);
        // Beat whatever was put there for this mission.
        await page.waitForFunction((id) => window.__game.scene.getScene('game').enemies.some((e) => e.missionId === id && !e.isDead), m.id, { timeout: 20000 });
        await g((id) => { const s = window.__game.scene.getScene('game'); for (const e of s.enemies.filter((q) => q.missionId === id)) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); } }, m.id);
        await page.waitForTimeout(800);
        console.log('  zasadzka pokonana');
      } else if (e.typ === 'idz') {
        await idzDo(e.miejsce);
        await page.waitForTimeout(800);
        const n = await g(() => window.__dialogi.length);
        await page.keyboard.press('e');
        await page.waitForTimeout(1200);
        const d = await g((n) => window.__dialogi.slice(n).map((d) => d.title + ': ' + d.text), n);
        console.log('  u zleceniodawcy:', d.join(' / '));
        await wybierz(0);
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(600);
    }
    const end = await g((id) => ({ stan: window.__session.missions[id], coins: window.__session.coins }), m.id);
    console.log(' ', rodzaj, JSON.stringify(end), 'było', coins0);
    assert.equal(end.stan, 'done', `${rodzaj} finished`);
    assert(end.coins > coins0, `${rodzaj} paid`);
  }
  assert.deepEqual(errors, []);
  console.log('OK');
} finally {
  await browser.close();
}

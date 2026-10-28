// Lochy (content/lochy.ts, src/loch/, scenes/Lochy.ts) + trzeci stopień przybliżenia (screen.ts):
//  - zoom: zwykły → ~30 % → 2× → zwykły (klawisz Z),
//  - zejście na cmentarzu i za świątynią widać na mapie, E (podwójne dotknięcie) pyta, „Schodzę” – osobna mapa lochu,
//  - w lochu: ciemno (lampa, pochodnie), potwory w komnatach walczą jak w „nowej walce”, skrzynia zamknięta, dopóki żyje
//    strażnik, potem otwarta raz; zapis w lochu trzyma miejsce przy wejściu; schody w górę wracają przy wejściu.
// Serwer udawany (route), mapa Lublina.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-lochy.mjs   (TELEFON=1)
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
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pl-PL' });
  const errors = [];
  const saves = [];
  await context.route('**/*.supabase.co/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 400, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings')) body = {};
    if (path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content') || path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) {
      try { saves.push(JSON.parse(req.postData() ?? '{}')); } catch { /* ignore */ }
      body = true;
    }
    if (path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_/.test(m.text()) && errors.push(m.text()));
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const hook = () => g(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi = [];
    if (s.__hooked) return;
    s.__hooked = true;
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
    window.__toasty = [];
    const ot = s.toast.bind(s);
    s.toast = (t, ms) => { window.__toasty.push(t); return ot(t, ms); };
  });
  const wybierz = (i) => g((k) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(k); }, i);

  // 2. The crypt by a cemetery (Cmentarz przy ul. Lipowej).
  await hook();
  await g(async () => {
    const s = window.__game.scene.getScene('game');
    const p = s.city.fromLatLon(51.2446, 22.5545);
    await s.city.ensure(p.x, p.y, 1200);
    s.player.setPosition(p.x, p.y);
  });
  await page.waitForFunction(() => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.rodzaj === 'krypta'), null, { timeout: 60000 });
  const wej = await g(() => {
    const s = window.__game.scene.getScene('game');
    const l = s.lochy.lista;
    const k = l.filter((w) => w.rodzaj === 'krypta').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    return { k, wszystkie: l.map((w) => w.rodzaj), podziemia: l.filter((w) => w.rodzaj === 'podziemia').length };
  });
  console.log('zejścia', JSON.stringify(wej));
  // Behind every second church: some found around (Śródmieście has many).
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 10); }, [wej.k.x, wej.k.y]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `work/lochy-${tag}-wejscie.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.length > 0, null, { timeout: 10000 });
  const d1 = await g(() => ({ title: window.__dialogi.at(-1).title, buttons: window.__dialogi.at(-1).buttons }));
  console.log('pytanie', JSON.stringify(d1));
  assert(/Krypta/.test(d1.title), 'the crypt asks first');
  const zapisowPrzed = saves.length;
  await wybierz(0);
  await page.waitForFunction(() => window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await hook();
  const wLochu = await g(() => {
    const s = window.__game.scene.getScene('game');
    return { id: s.city.id, enemies: s.enemies.length, zostalo: s.loch.zostalo, hero: { x: s.player.x, y: s.player.y }, blocked: s.city.isBlocked(s.player.x, s.player.y), lamp: s.weatherFx.lamp.visible, fogDark: s.fogView.podZiemia };
  });
  console.log('w lochu', JSON.stringify(wLochu));
  assert(wLochu.id.startsWith('loch:krypta:'), 'on the dungeon map');
  assert(!wLochu.blocked, 'the hero stands on the floor');
  assert(wLochu.enemies >= 3 && wLochu.enemies === wLochu.zostalo, 'monsters in the chambers');
  assert(wLochu.lamp && wLochu.fogDark, 'dark: the lamp burns');
  assert(saves.length > zapisowPrzed, 'saved before going down');
  const ostatni = saves.at(-1);
  console.log('zapis tu', JSON.stringify(ostatni?.p_save?.tu ?? ostatni?.tu ?? null));
  await page.screenshot({ path: `work/lochy-${tag}-start.png` });

  assert(!(await page.getByRole('button', { name: 'Ucieknij z lochu', exact: true }).isVisible()), 'no shortcut before clearing the floor');

  // 4. The chest is guarded until the guardian falls.
  const skrzynia = await g(() => { const s = window.__game.scene.getScene('game'); return { ...s.loch.skrzynia, pow: s.loch.skrzyniaPowod() }; });
  assert.equal(skrzynia.pow, 'pilnowana');
  await g(() => {
    const s = window.__game.scene.getScene('game');
    s.protectUntil = Infinity;
    window.__ostatniWLochu = s.enemies.at(-1);
    for (const e of s.enemies.slice(0, -1)) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); }
  });
  assert.equal(await g(() => window.__game.scene.getScene('game').loch.zostalo), 1, 'one monster remains');
  assert(!(await page.getByRole('button', { name: 'Ucieknij z lochu', exact: true }).isVisible()), 'last living monster keeps the shortcut hidden');
  await g(() => { const s = window.__game.scene.getScene('game'); const e = window.__ostatniWLochu; e.hp = 0; s.onEnemyKilled(e); e.destroy(); });
  assert.equal(await g(() => window.__game.scene.getScene('game').loch.zostalo), 0, 'all monsters beaten');
  assert(await page.getByRole('button', { name: 'Ucieknij z lochu', exact: true }).isVisible(), 'clearing the floor shows the exit bar before collecting the chest');
  const coins0 = await g(() => window.__session.coins);
  await g(([x, y]) => { const s = window.__game.scene.getScene('game'); s.player.setPosition(x, y + 12); }, [skrzynia.x, skrzynia.y]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `work/lochy-${tag}-skrzynia.png` });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__dialogi.some((d) => /Skrzynia/.test(d.title)), null, { timeout: 10000 }).catch(async () => {
    console.log('diagnoza', JSON.stringify(await g(() => { const s = window.__game.scene.getScene('game'); const h = s.player.hitPoint(); return { toasty: window.__toasty, przy: s.loch.przy(h.x, h.y), hp: [h.x, h.y], gracz: [s.player.x, s.player.y], sk: s.loch.skrzynia, pow: s.loch.skrzyniaPowod(), aktywna: window.__game.scene.isActive('game'), ui: window.__game.scene.getScene('ui').hasDialog }; })));
    throw new Error('skrzynia się nie otworzyła');
  });
  const nagroda = await g(() => window.__dialogi.at(-1).text);
  console.log('skrzynia', JSON.stringify(nagroda));
  await wybierz(0);
  const coins1 = await g(() => window.__session.coins);
  assert(coins1 > coins0, 'gold from the chest');
  assert.equal(await g(() => window.__session.stats.lochy), 1);
  await page.waitForTimeout(800);
  const tu = saves.at(-1)?.p_save?.tu ?? null;
  console.log('zapis w lochu → tu', JSON.stringify(tu));
  if (tu) assert(!String(tu.m).startsWith('loch:'), 'a save in a dungeon keeps the entrance on the surface');

  // 5. Cleared floor: return from the treasure room without walking to the stairs.
  // The chest's dialog pauses the game for a moment after it closes; the button acts only in a running game.
  await page.waitForFunction(() => window.__game.scene.isActive('game'), null, { timeout: 10000 });
  await page.waitForTimeout(1000); // the button fades in
  await page.getByRole('button', { name: 'Ucieknij z lochu', exact: true }).click();
  await page.waitForFunction(() => !window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const gora = await g(() => { const s = window.__game.scene.getScene('game'); return { id: s.city.id, x: s.player.x, y: s.player.y }; });
  console.log('na górze', JSON.stringify(gora));
  assert.equal(gora.id, 'lublin');
  assert.equal(await page.locator('#loch-wyjscie').count(), 0, 'exit bar is removed on the surface');
  assert(Math.hypot(gora.x - wej.k.x, gora.y - wej.k.y) < 60, 'back by the entrance');
  await page.screenshot({ path: `work/lochy-${tag}-powrot.png` });

  assert.deepEqual(errors.filter(e => !/Failed to fetch|NetworkError|ERR_/.test(e)), []);
  console.log('OK: cleared floor exit bar');
} finally { await browser.close(); }

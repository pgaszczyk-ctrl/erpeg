// „Czarci Wyrok” / „The Devil's Verdict” (docs/historie/czarci-wyrok.json): the whole ten-stage story in the browser,
// with both mission dungeons (Etap typ 'loch'), in Polish (default) or English (JEZYK=en). Server mocked (route).
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-czarci-wyrok.mjs  (JEZYK=en, TELEFON=1)
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work', { recursive: true });
const en = process.env.JEZYK === 'en';
const mobile = process.env.TELEFON === '1';
const tag = `${en ? 'en' : 'pl'}-${mobile ? 'tel' : 'pc'}`;
const [misja] = JSON.parse(await readFile(new URL('../../docs/historie/czarci-wyrok.json', import.meta.url), 'utf8'));
const L = (t) => (typeof t === 'string' ? t : en ? t.en : t.pl);

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false });
try {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 860 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: en ? 'en-GB' : 'pl-PL' });
  const errors = [];
  const saves = [];
  await context.route('**/*.supabase.co/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let body = null;
    if (path.endsWith('/login')) body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 500, story: { st: 'start', walked: 0 } }, exp: 1200, dead: false, died_at: null, age: 12 } };
    if (path.endsWith('/game_settings') || path.endsWith('/game_stwory')) body = {};
    if (path.endsWith('/game_content')) body = [misja];
    if (path.endsWith('/school_quizzes')) body = [];
    if (path.endsWith('/server_now')) body = new Date().toISOString();
    if (path.endsWith('/weather')) body = { cell: 'test', at: new Date().toISOString(), h: [] };
    if (path.endsWith('/settings')) body = { external: { google: false } };
    if (path.endsWith('/save_game')) { try { saves.push(JSON.parse(req.postData() ?? '{}')); } catch { /* ignore */ } body = true; }
    if (path.endsWith('/heartbeat')) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|WebGL|GL_/.test(m.text()) && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:4173/?lang=${en ? 'en' : 'pl'}&pogoda=czysto&ostrosc=1&live=1#postac=Jam&kod=ANGELIKA`);
  const gotowa = () => page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.() && !window.__game.scene.getScene('game').travelling, null, { timeout: 240000 });
  await gotowa();
  await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const hook = () => g(() => {
    const s = window.__game.scene.getScene('game');
    window.__dialogi ??= [];
    if (s.__hooked) return;
    s.__hooked = true;
    window.__dialogi = [];
    const orig = s.dialog.bind(s);
    s.dialog = (req) => { window.__dialogi.push(req); return orig(req); };
    s.protectUntil = Infinity;
  });
  await hook();
  /** Waits for a new dialog (after `od` dialogs were seen), returns it. */
  const dialog = async (od, re) => {
    await page.waitForFunction(([n, r]) => window.__dialogi.length > n && (!r || new RegExp(r).test(window.__dialogi.at(-1).title + '\n' + window.__dialogi.at(-1).text)), [od, re?.source ?? null], { timeout: 20000 }).catch(async () => {
      throw new Error(`no dialog ${re ?? ''}: ${JSON.stringify(await g(() => window.__dialogi.slice(-3).map((d) => d.title)))}`);
    });
    return g(() => { const d = window.__dialogi.at(-1); return { title: d.title, text: d.text, buttons: d.buttons }; });
  };
  const ile = () => g(() => window.__dialogi.length);
  const wybierz = (i) => g((k) => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog?.(); d.onChoose(k); }, i);
  const etap = () => g((id) => window.__session.etap[id] ?? 0, misja.id);
  const stan = () => g((id) => window.__session.missions[id], misja.id);
  const naMiejsce = async (x, y, dy = 0) => {
    await g(async ([px, py, d]) => {
      const s = window.__game.scene.getScene('game');
      await s.city.ensure(px, py, 600);
      s.player.setPosition(px, py + d);
    }, [x, y, dy]);
    await page.waitForTimeout(700);
  };
  const cel = () => g((id) => { const rm = window.__game.scene.getScene('game').missions.find((q) => q.m.id === id); return rm?.target ? { x: rm.target.x, y: rm.target.y } : null; }, misja.id);
  const E = async () => { await page.keyboard.press('KeyE'); await page.waitForTimeout(300); };
  /** Closes every dialog the stage change opens (komunikat, „Dalej”, the next stage's opening words). */
  const dalej = async (n = 2) => {
    for (let i = 0; i < n; i++) {
      const przed = await ile();
      await page.waitForTimeout(600);
      if ((await ile()) === przed && !(await g(() => window.__game.scene.getScene('ui').hasDialog))) break;
      await wybierz(0);
      await page.waitForTimeout(400);
    }
  };

  // 0. The offer at the Tribunal (Rynek 1): Widow Agata, in the player's language.
  const rm0 = await g((id) => { const s = window.__game.scene.getScene('game'); const rm = s.missions.find((q) => q.m.id === id); return rm && { x: rm.door.x, y: rm.door.y, tytul: rm.m.tytul, imie: rm.m.postac?.imie }; }, misja.id);
  console.log('misja', JSON.stringify(rm0));
  assert(rm0, 'the mission is on the Lublin map');
  assert.equal(rm0.tytul, L(misja.tytul));
  assert.equal(rm0.imie, L(misja.postac.imie));
  await naMiejsce(rm0.x, rm0.y, 6);
  let n = await ile();
  await g((id) => { const s = window.__game.scene.getScene('game'); s.openMissionDialog(s.missions.find((q) => q.m.id === id)); }, misja.id);
  const oferta = await dialog(n);
  console.log('oferta', oferta.title, '|', oferta.buttons.join(' / '));
  assert(oferta.text.startsWith(L(misja.opis).slice(0, 30)), 'offer text in the right language');
  assert(!/Nagroda|Reward/.test(oferta.text), 'no reward told up front');
  await wybierz(0);
  assert.equal(await stan(), 'active');

  for (let i = 0; i < misja.etapy.length; i++) {
    const z = misja.etapy[i];
    assert.equal(await etap(), i, `on stage ${i + 1}`);
    await page.waitForFunction(() => !window.__game.scene.getScene('ui').hasDialog && window.__game.scene.isActive('game'), null, { timeout: 15000 });
    const t = await cel();
    console.log(`etap ${i + 1} ${z.typ}`, JSON.stringify(t));
    if (z.typ === 'zagadka' || z.typ === 'rozmowa' || z.typ === 'paragraf' || z.typ === 'decyzja') {
      await naMiejsce(t.x, t.y, 4);
      n = await ile();
      await E();
      let d = await dialog(n);
      if (z.typ === 'zagadka') {
        assert(d.text.includes(L(z.pytanie).slice(0, 20)), 'the riddle in the right language');
        await wybierz(z.dobra);
      } else if (z.typ === 'rozmowa') {
        assert.equal(d.title, L(z.postac.imie));
        await wybierz(0);
      } else if (z.typ === 'paragraf') {
        for (let k = 0; k < z.strony.length; k++) {
          if (k) d = await dialog(n + k);
          assert(d.text.startsWith(L(z.strony[k].tekst).slice(0, 20)), `page ${k + 1}`);
          const w = z.strony[k].wybory;
          await wybierz(w ? w.findIndex((q) => q.dobry) : 0);
          await page.waitForTimeout(300);
        }
      } else {
        assert.equal(d.buttons[0], L(z.opcje[0].tekst));
        await wybierz(0);
      }
    } else if (z.typ === 'loch') {
      // The entrance appears near the stage's place; E asks, „go down” → the mission's own dungeon.
      await naMiejsce(t.x, t.y, 30);
      await page.waitForFunction((id) => (window.__game.scene.getScene('game').lochy?.lista ?? []).some((w) => w.id === id), `misja:${misja.id}:${i}`, { timeout: 60000 });
      const w = await g((id) => window.__game.scene.getScene('game').lochy.lista.find((q) => q.id === id), `misja:${misja.id}:${i}`);
      const wTarget = Math.round(Math.hypot(w.x - t.x, w.y - t.y));
      console.log('  wejście', Math.round(w.x), Math.round(w.y), wTarget, 'px od celu');
      assert(wTarget < 80, 'the entrance is by the stage place');
      const strz = await g((id) => window.__game.scene.getScene('game').etapy.arrowFor(id), misja.id);
      assert(strz && Math.hypot(strz.x - w.x, strz.y - w.y) < 1, 'the arrow points at the entrance');
      await naMiejsce(w.x, w.y, 10);
      if (i === 1) await page.screenshot({ path: `work/czarci-${tag}-wejscie.png` });
      n = await ile();
      await E();
      const pyt = await dialog(n);
      assert.equal(pyt.title, `🕯 ${L(z.loch.nazwa)}`);
      await wybierz(0);
      await page.waitForFunction(() => window.__game.scene.getScene('game').city?.loch && window.__game.scene.isActive('game'), null, { timeout: 30000 });
      await page.waitForTimeout(2500);
      await hook();
      const dol = await g(() => { const s = window.__game.scene.getScene('game'); return { id: s.city.id, nazwa: s.loch.opis.nazwa, zostalo: s.loch.zostalo, straznik: s.loch.opis.straznik, pow: s.loch.skrzyniaPowod() }; });
      console.log('  w lochu', JSON.stringify(dol));
      assert(dol.id.startsWith(`loch:misja:${z.loch.rodzaj}:`), 'a mission dungeon map');
      assert.equal(dol.nazwa, L(z.loch.nazwa));
      if (z.loch.straznik) assert.equal(dol.straznik, z.loch.straznik);
      assert.equal(dol.pow, 'pilnowana', 'the chest is guarded');
      if (i === 1) await page.screenshot({ path: `work/czarci-${tag}-loch.png` });
      await g(() => { const s = window.__game.scene.getScene('game'); for (const e of [...s.enemies]) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); } });
      const sk = await g(() => window.__game.scene.getScene('game').loch.skrzynia);
      await naMiejsce(sk.x, sk.y, 12);
      n = await ile();
      await E();
      const skr = await dialog(n);
      console.log('  skrzynia', JSON.stringify(skr.text.slice(-120)));
      assert(skr.text.includes(L(z.daje[0])), 'the story item lies in the chest');
      await wybierz(0);
      // Back up the stairs.
      await page.waitForFunction(() => window.__game.scene.isActive('game'), null, { timeout: 10000 });
      const sch = await g(() => window.__game.scene.getScene('game').loch.schody);
      await naMiejsce(sch.x, sch.y, 0);
      n = await ile();
      await E();
      await dialog(n);
      await wybierz(0);
      await gotowa();
      await page.waitForTimeout(1500);
      await hook();
      await page.waitForFunction((id) => (window.__session.etap[id] ?? 0) > 0 && window.__dialogi.length > 0, misja.id, { timeout: 20000 });
    } else if (z.typ === 'pokonaj') {
      await naMiejsce(t.x, t.y, 0);
      await page.waitForFunction((id) => window.__game.scene.getScene('game').enemies.some((e) => e.missionId === id && !e.isDead), misja.id, { timeout: 20000 });
      n = await ile();
      await g((id) => { const s = window.__game.scene.getScene('game'); for (const e of s.enemies.filter((q) => q.missionId === id)) { e.hp = 0; s.onEnemyKilled(e); e.destroy(); } }, misja.id);
    } else if (z.typ === 'badanie') {
      for (const c of z.tropy.slice(0, z.ile)) {
        const p = await g(([lat, lon]) => window.__game.scene.getScene('game').city.fromLatLon(lat, lon), c.miejsce.split(',').map(Number));
        await naMiejsce(p.x, p.y, 2);
        n = await ile();
        await E();
        const d = await dialog(n);
        assert.equal(d.title, L(c.tytul));
        await wybierz(0);
        await page.waitForTimeout(500);
      }
    } else if (z.typ === 'idz') {
      n = await ile();
      await naMiejsce(t.x, t.y, 0);
      await E(); // new controls: arriving only hints, ACT/E finishes the walk
    }
    if (i === misja.etapy.length - 1) break;
    // The stage's closing words, then the next one's opening words.
    await page.waitForFunction(([id, k]) => (window.__session.etap[id] ?? 0) > k || window.__game.scene.getScene('ui').hasDialog, [misja.id, i], { timeout: 20000 });
    await dalej(3);
    await page.waitForFunction(([id, k]) => (window.__session.etap[id] ?? 0) > k, [misja.id, i], { timeout: 20000 }).catch(async () => {
      throw new Error(`stage ${i + 1} not done: ${JSON.stringify(await g(() => window.__dialogi.slice(-3).map((d) => [d.title, d.buttons])))}`);
    });
    await dalej(2);
  }

  // The verdict: the mission ends at the castle (naMiejscu) with the reward.
  await page.waitForFunction((id) => window.__session.missions[id] === 'goal' || window.__session.missions[id] === 'done' || window.__game.scene.getScene('ui').hasDialog, misja.id, { timeout: 20000 });
  for (let k = 0; k < 4 && (await stan()) !== 'done'; k++) { await page.waitForTimeout(600); if (await g(() => window.__game.scene.getScene('ui').hasDialog)) await wybierz(0); }
  await page.screenshot({ path: `work/czarci-${tag}-koniec.png` });
  const koniec = await g((id) => ({ stan: window.__session.missions[id], tytul: window.__session.story.title, pioro: JSON.stringify(window.__gear).includes('pioro_trybunalu'), wyrok: window.__session.questResults[id]?.choices?.wyrok }), misja.id);
  console.log('koniec', JSON.stringify(koniec));
  assert.equal(koniec.stan, 'done');
  assert.equal(koniec.tytul, L(misja.tytul_bohatera));
  assert(koniec.pioro, 'the Tribunal Quill in the gear');
  assert.equal(koniec.wyrok, 'laska');
  const zle = errors.filter((e) => !/Failed to fetch|NetworkError|ERR_/.test(e));
  console.log('błędy', JSON.stringify(zle));
  assert.equal(zle.length, 0, 'no page errors');
  console.log('OK');
} finally {
  await browser.close();
}

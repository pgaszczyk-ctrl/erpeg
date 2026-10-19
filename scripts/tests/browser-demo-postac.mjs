// The QR demo as the new players' start (owner, 18 Oct 2026): the name form makes a real character, the dream
// is below Zamek Lubelski (apple trees, "Kliknij, żeby strącić owoce", the name remembered, the dragon in the
// castle wall's gap), waking up logs the character in for real in front of Targi Lublin, the HUD portrait is
// shown and opens the Kufer with the code and "Połącz z kontem". Server calls are mocked.
// Run: npx vite build && npx vite preview --port 4173 &  node scripts/tests/browser-demo-postac.mjs  (TELEFON=1 = phone)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('work', { recursive: true });
const phone = !!process.env.TELEFON;
const viewport = phone ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const name = phone ? 'phone' : 'desktop';
const HELA = {"id": "sz_jarmark", "opis": "Hela…", "adres": "Dworcowa 11", "seria": "Serce Zębatka", "tytul": "Jarmark Wynalazców", "postac": {"imie": "Hela Trybik", "kobieta": true}, "nagroda": 0, "zadanie": {"cel": "Znajdź maszynistę Bolka", "typ": "idz", "postac": {"imie": "Maszynista Bolek"}, "miejsce": "51.23177, 22.56962"}, "naMiejscu": true, "tylkoTest": true, "zakonczenie": "…", "doswiadczenie": 50};
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, locale: 'pl-PL', deviceScaleFactor: phone ? 2 : 1 });
  const calls = [];
  let made = null;
  await context.route('**/*.supabase.co/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const fn = path.split('/').pop();
    calls.push(fn);
    let body = null;
    const arg = (() => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } })();
    if (fn === 'game_settings') body = {};
    else if (fn === 'server_now') body = new Date().toISOString();
    else if (fn === 'weather') body = { cell: 'test', at: new Date().toISOString(), h: [] };
    else if (fn === 'settings') body = { external: { google: false } };
    else if (fn === 'game_content') { if (process.env.WOLNA) await new Promise((r) => setTimeout(r, Number(process.env.WOLNA))); body = [HELA]; }
    else if (fn === 'create_character') {
      made = { name: arg.p_name, idik: 'TESTKOD1', start_place: arg.p_start_place, start_x: arg.p_start_x, start_y: arg.p_start_y, map_scale: arg.p_scale, age: arg.p_age, save: { look: arg.p_look }, exp: 0, dead: false, died_at: null, konto: false };
      body = { token: 'tok-create', player: made };
    } else if (fn === 'login') {
      assert.equal(arg.p_name, made?.name);
      assert.equal(arg.p_idik, 'TESTKOD1');
      body = { token: 'tok-login', player: made };
    } else if (['heartbeat', 'save_game', 'logout'].includes(fn)) body = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.text().startsWith('T ')) console.log(m.text()); });
  page.on('dialog', (d) => d.accept());
  const tury = process.env.TURY !== '0';
  const PROD = !!process.env.PROD;
  await page.goto(`http://127.0.0.1:4173/?lang=pl&d=ShgD6aib8${process.env.TURY ? `&tury=${process.env.TURY}` : ''}`);

  // 1. The simplified form: only the name (and an optional account).
  await page.waitForSelector('#menu.m-demo input', { timeout: 90000 });
  // The address bar shows only …/demo (owner, 19 Oct 2026), the other parameters stay.
  const demoUrl = await page.evaluate(() => location.pathname + location.search);
  assert.equal(demoUrl, '/demo?lang=pl', `Address bar: ${demoUrl}`);
  await page.screenshot({ path: `work/onb-${name}-1-form.png` });
  assert.equal(await page.locator('#menu.m-demo input').count(), 1, 'Only the name field');
  await page.locator('#menu.m-demo input').fill('Zosia');
  await page.locator('#menu.m-demo button[type=submit]').click();
  await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').demoRun, null, { timeout: 120000 });
  assert(calls.includes('create_character'), 'The character is made on the form');
  assert.equal(await page.evaluate(() => window.__session.name), 'Zosia');
  const startLL = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { map: s.city.id, ...s.city.toLatLon(s.player.x, s.player.y) }; });
  assert.equal(startLL.map, 'lublin');
  assert(Math.hypot((startLL.lat - 51.24870) * 111320, (startLL.lon - 22.57120) * 69700) < 30, `Starts in the park ~150 m below the castle: ${JSON.stringify(startLL)}`);

  const choose = async (index) => {
    await page.waitForFunction(() => window.__game.scene.getScene('ui').dialogBox, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    const at = await page.evaluate((i) => { const r = window.__game.scene.getScene('ui').dialogButtons.find((b) => b.index === i).rect; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, index);
    await page.mouse.click(at.x, at.y);
  };
  await choose(0);

  // 2. Walk next to an apple tree: the hint shows over it.
  await page.waitForTimeout(800);
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'), t = s.demoRun.trees[0]; s.player.setPosition(t.x, t.y + 12); });
  await page.waitForFunction(() => window.__game.scene.getScene('game').demoRun.hint?.visible, null, { timeout: 10000 });
  await page.screenshot({ path: `work/onb-${name}-2-jablon.png` });
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').demoRun.hint.text), 'Kliknij, żeby strącić owoce');

  // 3. Apples → eat via the tutorial → the name is remembered → the dragon in the wall's gap.
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); let n = 0; for (const t of s.demoRun.trees) while (n < 5 && s.orchards.shake(t)) { s.dropFruit(t.x, t.y, t.fruit); n++; } });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return s.pickups.filter((i) => i.getData('kind') === 'fruit:jablko').length + window.__session.stats.fruit >= 5; }, null, { timeout: 30000 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); for (const i of [...s.pickups]) if (i.getData('kind') === 'fruit:jablko') s.collect(i); });
  // On the test server the demo has the telescope HUD too (owner, 18 Oct 2026).
  assert.equal(await page.evaluate(() => !!document.querySelector('#hud-tel')), tury && !PROD, 'Telescope HUD in the demo (test server only)');
  if (tury) {
    // Turn fights: 3/4 of life, the apples wait for the fight (no eating step).
    const zycie = await page.evaluate(() => ({ hp: window.__game.scene.getScene('game').player.hp, max: window.__session.hp }));
    console.log(name, 'życie na starcie', JSON.stringify(zycie));
  } else {
  }
  try {
    await page.waitForFunction(() => /uderzyło mnie w głowę![\s\S]*jestem Zosia/.test(document.getElementById('demo-big')?.textContent ?? ''), null, { timeout: 60000 });
  } catch (e) {
    console.log(await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return JSON.stringify({ hp: s.player.hp, healTo: s.demoRun.healTo, busy: s.demoRun.busy, phase: window.__demo?.phase, big: document.getElementById('demo-big')?.textContent, fps: window.__game.loop.actualFps }); }));
    await page.screenshot({ path: `work/onb-${name}-err.png` });
    throw e;
  }
  await page.screenshot({ path: `work/onb-${name}-3-imie.png` });
  await page.waitForFunction(() => window.__game.scene.getScene('game').demoRun.dragon, null, { timeout: 90000 });
  const smok = await page.evaluate(() => { const s = window.__game.scene.getScene('game'), d = s.demoRun.dragon; return s.city.toLatLon(d.x, d.y); });
  const dM = Math.hypot((smok.lat - 51.25050) * 111320, (smok.lon - 22.57245) * 69700);
  assert(dM < 15, `The dragon stands in the middle of the courtyard: ${dM.toFixed(1)} m away`);
  // Still until the hero comes through the gap; the arrow leads to the gap first.
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').demoRun.dragon.peaceful), true);
  const cel = await page.evaluate(() => window.__game.scene.getScene('game').demoRun.goal().text);
  assert(/wyłom/.test(cel), cel);
  // Outside the gap: still asleep; in the courtyard: awake.
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'), w = s.demoRun.wylom; s.player.setPosition(w.x, w.y); s.noHurtUntil = s.time.now + 120000; });
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').demoRun.dragon.peaceful), true, 'Outside the gap the dragon still waits');
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'), w = s.demoRun.wylom; s.player.setPosition(w.x - 40, w.y); });
  if (tury) {
    // 4. The turn fight with its tutorial: strike, heal (Specjalne → Lecz), strike until it flies off after 3 hits.
    await page.waitForSelector('#walka-panel', { timeout: 15000 });
    const rada = () => page.evaluate(() => ({ t: document.getElementById('demo-rada')?.textContent ?? '', w: document.getElementById('walka-panel')?.getAttribute('data-wskaz') ?? '' }));
    const hp0 = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { hp: s.player.hp, max: s.player.maxHp ?? null }; });
    await page.waitForFunction(() => /CIOS/.test(document.getElementById('demo-rada')?.textContent ?? ''), null, { timeout: 30000 });
    assert.equal((await rada()).w, 'cios');
    await page.screenshot({ path: `work/onb-${name}-4-walka-cios.png` });
    const smokNaEkranie = () => page.evaluate(() => {
      const s = window.__game.scene.getScene('game'), d = s.demoRun.dragon, cam = s.cameras.main, o = window.devicePixelRatio >= 2 ? 2 : 1;
      if (!d || !d.visible) return null;
      const k = cam.zoom / (cam.width / document.querySelector('#game canvas').getBoundingClientRect().width);
      return { x: (d.x - cam.worldView.x) * k, y: (d.y - 6 - cam.worldView.y) * k };
    });
    const klik = (x, y) => (phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
    const mojaTura = () => page.waitForFunction(() => { const p = document.getElementById('walka-panel'); return !p || (!p.classList.contains('czekaj')); }, null, { timeout: 60000 });
    const uderz = async () => {
      await mojaTura();
      const at = await smokNaEkranie();
      if (!at || !(await page.$('#walka-panel'))) return;
      await klik(at.x, at.y);
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        const b = document.querySelector('#walka-panel .wp-b.cios:not([disabled])') ?? document.querySelector('#walka-panel .wp-koniec:not(.wp-wroc)');
        b?.click();
      });
      await page.waitForTimeout(900);
    };
    if (process.env.UCIECZKA) {
      // Run away and wander off: after 300 m of the dream the hero wakes up anyway (owner, 18 Oct 2026).
      await mojaTura();
      await page.evaluate(() => document.querySelector('#walka-panel .wp-b.spec').click());
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelector('#walka-panel .wp-b.uciekaj').click());
      await page.waitForFunction(() => !document.getElementById('walka-panel'), null, { timeout: 5000 });
      await page.evaluate(() => { window.__game.scene.getScene('game').demoRun.dreamWalked += 600; });
    } else {
    await uderz();
    await page.waitForFunction(() => /SPECJALNE/.test(document.getElementById('demo-rada')?.textContent ?? ''), null, { timeout: 30000 });
    assert.equal((await rada()).w, 'spec');
    await page.screenshot({ path: `work/onb-${name}-4-walka-lecz.png` });
    await mojaTura();
    await page.evaluate(() => document.querySelector('#walka-panel .wp-b.spec').click());
    await page.waitForFunction(() => document.getElementById('walka-panel')?.getAttribute('data-wskaz') === 'lecz', null, { timeout: 5000 });
    const przed = await page.evaluate(() => window.__game.scene.getScene('game').player.hp);
    await page.evaluate(() => document.querySelector('#walka-panel .wp-b.lecz').click());
    await page.waitForFunction((h) => window.__game.scene.getScene('game').player.hp > h, przed, { timeout: 5000 });
    await page.waitForFunction(() => /Dobij/.test(document.getElementById('demo-rada')?.textContent ?? ''), null, { timeout: 5000 });
    for (let i = 0; i < 40 && await page.$('#walka-panel'); i++) await uderz();
    console.log(name, 'po walce', await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return JSON.stringify({ panel: !!document.getElementById('walka-panel'), big: document.getElementById('demo-big')?.textContent, trafien: s.demoRun?.trafien, walczy: s.demoRun?.walczy, busy: s.demoRun?.busy, hp: s.player.hp, dead: s.player.isDead, phase: window.__demo?.phase, frozen: s.demoRun?.frozen, black: !!document.getElementById('demo-black') }); }));
    await page.waitForFunction(() => /uciekł/.test(document.getElementById('demo-big')?.textContent ?? '') || document.getElementById('demo-black'), null, { timeout: 30000 });
    console.log(name, 'walka turowa OK', JSON.stringify(hp0));
    }
  } else {
    await page.waitForFunction(() => window.__game.scene.getScene('game').demoRun.dragon.peaceful === false, null, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `work/onb-${name}-4-smok.png` });
    // 4. Beat it: blackout, real login at home in front of Targi Lublin.
    await page.evaluate(() => { const s = window.__game.scene.getScene('game'), d = s.demoRun.dragon; s.dragons.get(d).destroy?.(); if (d.hit(s.player, s.time.now, d.hp + 1)) s.onEnemyKilled(d); });
  }
  // How long the screen stays black after the dragon (owner, 18 Oct 2026: it was annoying).
  await page.waitForFunction(() => { const b = document.getElementById('demo-black'); return b && getComputedStyle(b).opacity === '1'; }, null, { timeout: 30000 });
  const czarnyOd = Date.now();
  await page.waitForFunction(() => { const b = document.getElementById('demo-black'); return !b || Number(getComputedStyle(b).opacity) < 0.5; }, null, { timeout: 90000 });
  const czarnoMs = Date.now() - czarnyOd;
  console.log(name, 'czarny ekran ms', czarnoMs);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('game'); return s.sys.isActive() && !s.demoRun && window.__session.token === 'tok-login'; }, null, { timeout: 90000 });
  assert(calls.includes('login'));
  const awake = await page.evaluate(() => { const s = window.__game.scene.getScene('game'); return { exp: window.__session.exp, ...s.city.toLatLon(s.player.x, s.player.y), url: location.href }; });
  assert.equal(awake.exp, 0);
  assert(Math.hypot((awake.lat - 51.23471) * 111320, (awake.lon - 22.56526) * 69700) < 60, `Wakes up at Targi: ${JSON.stringify(awake)}`);
  assert(!awake.url.includes('d=ShgD6aib8'), 'The demo link is gone from the address bar');
  assert(new URL(awake.url).pathname === '/' && awake.url.includes('#postac=Zosia'), `After waking up the address loads the character: ${awake.url}`);
  await choose(0); // "Rozejrzę się"

  // 5. The portrait tutorial → the Kufer with the code and the account link.
  await page.waitForSelector('#samouczek', { timeout: 15000 });
  await page.screenshot({ path: `work/onb-${name}-5-portret.png` });
  const av = await page.evaluate(() => { const r = (document.querySelector('.tel-portret') ?? document.querySelector('#hud .hud-av')).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(av.x, av.y);
  // The code sits on Statystyki (on a phone its own tab).
  if (phone) await page.locator('#character button', { hasText: 'Statystyki' }).click();
  await page.waitForSelector('#character .k-kod-code', { timeout: 10000 });
  assert.equal((await page.locator('#character .k-kod-code').textContent()).replace(/\s/g, ''), 'TESTKOD1');
  await page.locator('#character .k-kod-btn').click();
  await page.waitForSelector('#character .k-kod-menu:not([hidden])');
  const opcje = await page.locator('#character .k-kod-opcja').allTextContents();
  assert(opcje.some((t) => /Wyślij/.test(t)) && opcje.some((t) => /kontem/.test(t)), `Send / link options: ${opcje}`);
  await page.screenshot({ path: `work/onb-${name}-6-kufer.png` });
  await page.locator('#character .k-kod-opcja', { hasText: 'Anuluj' }).click();
  // Close the Kufer: the hero walks freely, nothing ends after some metres.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').witam), false);
  assert.equal(await page.evaluate(() => !!document.getElementById('demo-end')), false);
  // Hela Trybik stands at Targi after waking up (owner, 18 Oct 2026: „zniknęła Hela Trybik”).
  await page.waitForFunction(() => window.__game.scene.getScene('game').etapy.givers.has('sz_jarmark'), null, { timeout: 20000 + Number(process.env.WOLNA || 0) }).catch(async () => {
    console.log(name, 'HELA BRAK', await page.evaluate(() => JSON.stringify({ extra: window.__session.extra?.map((m) => m.id), done: window.__session.missions })));
    throw new Error('Hela Trybik is missing after waking up');
  });
  await page.screenshot({ path: `work/onb-${name}-6b-hela.png` });
  console.log(name, 'HELA', await page.evaluate(() => { const s = window.__game.scene.getScene('game'); const g = s.etapy.givers.get('sz_jarmark'); return JSON.stringify({ wBud: s.city.buildingAt(g.x, g.y) !== undefined, widac: s.vision ? (function(p, x, y){ let c=false; for(let i=0,j=p.length-1;i<p.length;j=i++){ const a=p[i], b=p[j]; if((a.y>y)!==(b.y>y) && x < (b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) c=!c; } return c; })(s.vision, g.x, g.y) : null, x: g.x, y: g.y, hx: s.player.x, hy: s.player.y, who: g.who.map((w) => ({ v: w.visible, a: w.alpha, tex: w.texture?.key, d: w.depth })) }); }));
  // The hero walks after waking up (owner, 18 Oct 2026: the joystick didn't work in front of Targi).
  const gdzie = () => page.evaluate(() => { const p = window.__game.scene.getScene('game').player; return { x: p.x, y: p.y }; });
  const p0 = await gdzie();
  if (phone) {
    const cdp = await page.context().newCDPSession(page);
    const W = page.viewportSize();
    const x0 = W.width * 0.3, y0 = W.height * 0.6;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + i * 10, y: y0 }] }); await page.waitForTimeout(50); }
    await page.waitForTimeout(1500);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');
  }
  const p1 = await gdzie();
  assert(Math.hypot(p1.x - p0.x, p1.y - p0.y) > 5, `The hero walks after waking up: ${JSON.stringify({ p0, p1 })}`);
  assert.deepEqual(errors, []);
  console.log(name, 'OK', JSON.stringify({ startLL, smokM: dM.toFixed(1), czarnoMs, awake }));
} finally {
  await browser.close();
}

// Minimal model integration smoke test. Real built game/GLBs/input; isolated map and RPCs.
// VITE_TEST=1 npm run build
// node scripts/tests/browser-prolog-models.mjs (TELEFON=1 also checks portrait touch input)
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mobile = process.env.TELEFON === '1', tag = mobile ? 'phone' : 'desktop';
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'], chromiumSandbox: false })
  .catch(async e => { await new Promise(resolve => server.httpServer.close(resolve)); throw e; });
await mkdir('work/prolog-models', { recursive: true });
const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 },
  isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', reducedMotion: 'reduce' });
const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0];
const map = { unitsPerM: 1.92, w: 3000, h: 3000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 },
  boundary: [ring], areas: [['paved', ring]], lines: [['minor', 0, [0, 2880, 5760, 0], 'Test road']], buildings: [], pois: [], towns: [['Lublin', 2880, 2880]] };
let saved = { coins: 0, story: { st: 'koniec', walked: 99 }, flagi: { samouczek: 1 }, magic: true,
  equip: { bron: 'zelazny' }, bag: [{ item: 'luk_rekruta' }, { item: 'rozdzka_szkolna' }, { item: 'kapelusz_szkolny' }],
  strzaly: 20, look: { modul: { g: mobile ? '01' : '16', c: mobile ? '01' : '16', p: mobile ? 'k' : 'm', s: 0, w: 2, u: 2, u2: 1 } } };
await context.route('**/map/lublin.json', r => r.fulfill({ json: map }));
await context.route('**/map/world.json', r => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
await context.route('**/*.supabase.co/**', route => {
  const name = new URL(route.request().url()).pathname.split('/').pop();
  let body = null;
  if (name === 'login') body = { token: 'fixture', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin',
    start_x: 2880, start_y: 2880, map_scale: 1.92, save: saved, exp: 0, dead: false, age: 6, konto: true } };
  if (name === 'save_game') { saved = structuredClone(route.request().postDataJSON().p_save); body = true; }
  if (['heartbeat', 'logout', 'log_error'].includes(name)) body = true;
  if (['game_content', 'school_quizzes', 'game_ports', 'kurier_wiesci', 'my_characters', 'game_stwory'].includes(name)) body = [];
  if (name === 'game_settings') body = {};
  if (name === 'server_now') body = new Date().toISOString();
  return route.fulfill({ json: body });
});
const page = await context.newPage(), errors = [], warnings = [], loaded = new Set();
let releaseBow;
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (/Ludzik 3D:/.test(m.text())) warnings.push(m.text()); });
page.on('response', r => { if (r.ok() && /postacie3d\/.*\.glb/.test(r.url())) loaded.add(r.url().split('/').pop()); });
await page.addInitScript(() => { window.__dialogi = []; window.addEventListener('load', () => {
  const poll = setInterval(() => { if (!window.__game) return;
    window.__game.events.on('dialog', d => window.__dialogi.push(d)); clearInterval(poll);
  }, 5);
}); });
const choose = () => page.evaluate(() => { const d = window.__dialogi.at(-1); window.__game.scene.getScene('ui').closeDialog(); d.onChoose(0); });
const equip = async name => {
  await page.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
  const cell = page.locator('.sl-bag .sl-cell').and(page.locator(`[title^="${name}"]`)).first();
  if (mobile) await cell.tap(); else await cell.click();
  await page.getByRole('button', { name: 'Załóż', exact: true }).click();
  await page.getByRole('button', { name: 'Zamknij kufer' }).click();
};
const ready = key => page.waitForFunction(key => {
  const l = window.__game?.scene.getScene('game').ludzik3d;
  return l?.widoczny && !l.changing && l.equipmentKey === key;
}, key, { timeout: 30000 });
const attack = async (label, walking = false) => {
  await page.waitForTimeout(1100); // actual input cooldown; no direct fireShot/atakuj call
  await page.evaluate(() => { const s = window.__game.scene.getScene('game'); window.__frames = [];
    s.events.removeListener('postupdate', window.__sample);
    window.__sample = () => { const g = s.ludzik3d.g; if (!g) return;
      const a = g.atak.isRunning() ? g.atak : g.atakGora;
      window.__frames.push({ attack: a.isRunning(), time: a.time, walk: g.chodNogi.isRunning(), weapon: g.miecz.visible, equipment: s.ludzik3d.equipmentKey,
        hand: g.model.getObjectByName('handR').quaternion.toArray(), shots: s.shots.length });
      if (window.__frames.length > 200) window.__frames.shift();
    }; s.events.on('postupdate', window.__sample);
  });
  if (walking) { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); }
  if (mobile) await page.locator('.hs-atak').tap(); else await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__frames.some(f => f.attack && f.time > 0 && f.weapon), null, { timeout: 10000 });
  await page.screenshot({ path: `work/prolog-models/${tag}-${label}.png` });
  if (walking) await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => window.__frames.filter(f => f.attack && f.time > 0).length >= 2);
  const frames = await page.evaluate(() => window.__frames.filter(f => f.attack && f.time > 0));
  assert(frames.some(f => f.hand.some((v, i) => Math.abs(v - frames[0].hand[i]) > .001)), `${label}: animated hand moves`);
  if (walking) assert(frames.some(f => f.walk), `${label}: legs continue walking`);
  if (/bow|wand/.test(label)) assert(frames.some(f => f.shots > 0), `${label}: actual projectile`);
  await page.waitForFunction(() => { const g = window.__game.scene.getScene('game').ludzik3d.g;
    return !g.atak.isRunning() && !g.atakGora.isRunning() && !g.miecz.visible;
  });
};
try {
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(() => window.__game?.scene.getScene('game').ludzik3d?.widoczny && document.getElementById('loading-map')?.hidden !== false, null, { timeout: 120000 });
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.g.miecz.name), 'Sword_at_hand_grip');
  await attack('legacy');
  await page.evaluate(() => window.__game.scene.getScene('game').prolog.offerChief(() => {})); await choose();
  await page.waitForFunction(() => /Starszy strażnik/.test(window.__dialogi.at(-1)?.title)); await choose();
  await ready('miecz:false');
  const base = await page.evaluate(() => { const l = window.__game.scene.getScene('game').ludzik3d;
    return { file: l.modelFile, core: l.g.model.getObjectByName('core').geometry.uuid, head: l.g.model.getObjectByName('head').geometry.uuid };
  });
  assert.equal(base.file, `modele/postacie3d/${mobile ? '01' : '16'}.glb`, 'enrollment replaces legacy guard without relog');
  await attack('guard');
  // First bow download fails; loader must preserve the guard, retry, then animate the equipped bow.
  let bowRequests = 0;
  let retryRequested;
  const retry = new Promise(resolve => { retryRequested = resolve; });
  const download = new Promise(resolve => { releaseBow = resolve; });
  await page.route(`**/postacie3d/${mobile ? '18' : '12'}.glb`, async r => {
    if (++bowRequests === 1) return r.fulfill({ status: 503, body: 'fixture failure' });
    retryRequested(); await download; return r.continue();
  });
  await equip('Stary łuk');
  await Promise.race([retry, new Promise((_, reject) => setTimeout(() => reject(new Error('Bow retry was not requested')), 30000).unref())]);
  // Shoot while loading, then change weapon before the slow bow arrives. No stale bow pose/queued shot may win.
  if (mobile) await page.locator('.hs-atak').tap(); else await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('game').ludzik3d.pendingAim !== null);
  await equip('Różdżka'); await page.evaluate(() => { window.__frames = []; }); releaseBow(); await ready('magia:false');
  assert(await page.evaluate(() => window.__frames.every(f => f.equipment !== 'luk:false')), 'obsolete bow never installed');
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.pendingAim), null, 'obsolete queued shot discarded');
  await equip('Stary łuk'); await ready('luk:false'); assert.equal(bowRequests, 2);
  await attack('bow'); await attack('bow-walk', true);
  await equip('Różdżka'); await ready('magia:false');
  await equip('Kapelusz'); await ready('magia:true');
  await attack('wand'); await attack('wand-walk', true);
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.g.model.getObjectByName('core').geometry.uuid), base.core, 'uniform geometry preserved');
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.g.model.getObjectByName('head').material.type), 'MeshBasicMaterial');
  await equip('Miecz ćwiczebny'); await ready('miecz:true'); await attack('sword-return');
  // Unequipping headwear restores the same recruit head, not the donor's robe/body.
  await page.evaluate(() => window.__game.scene.getScene('ui').openCharacter('eq'));
  await page.locator('.sl-cell[data-zone="eq"][data-key="helm"]').click();
  await page.getByRole('button', { name: 'Zdejmij do plecaka' }).click();
  await page.getByRole('button', { name: 'Zamknij kufer' }).click(); await ready('miecz:false');
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('game').ludzik3d.g.model.getObjectByName('head').geometry.uuid), base.head);
  if (mobile) {
    await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
    await page.setViewportSize({ width: 390, height: 844 }); await attack('portrait-touch');
  }
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1, 'only the deliberate failed download warns');
  assert.deepEqual([...loaded].sort(), (mobile ? ['01.glb', '18.glb', 'mage_f.glb'] : ['11.glb', '12.glb', '16.glb']).sort());
  const result = { tag, browser: browser.version(), loaded: [...loaded], bowRequests, errors, expectedWarnings: warnings.length,
    checks: ['legacy fallback', 'enrollment m/f', 'sword/bow/wand input and animation', 'attack while walking', 'retry after 503', 'superseded download/queued shot', 'uniform', 'head material', 'return to sword/head', ...(mobile ? ['portrait touch'] : [])] };
  await writeFile(`work/prolog-models/${tag}.json`, JSON.stringify(result, null, 2)); console.log(result);
} catch (e) {
  console.error('Model test state', await page.evaluate(() => { const s = window.__game?.scene.getScene('game');
    return { stage: s?.prolog?.state, planning: s?.prolog?.planning, paused: s?.scene.isPaused(), dialogs: window.__dialogi.map(d => d.title), model: s?.ludzik3d?.modelFile, key: s?.ludzik3d?.equipmentKey };
  }), errors, warnings);
  await page.screenshot({ path: `work/prolog-models/${tag}-failure.png` }).catch(() => {}); throw e;
}
finally { releaseBow?.(); await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }

import type Phaser from 'phaser';
import { session, freshStats, freshChest, startSession, loadContent } from './quests';
import { api, offline, type LoginResult } from './api';
import { DEMO_KODY, SEN, PO_DEMO_START, type Pobudka } from './content/demo';
import { TRUDNOSCI } from './content/trudnosc';
import { PLAYER } from './objects/Player';
import { zyciePostaci } from './content/historia';
import { loadGear, pointsForLevel, type Gear } from './inventory';
import { MAKS_POZIOM } from './content/przedmioty';
import type { Look } from './look';
import { codeLink } from './ui/codeCard';
import { getMap, prepareMap } from './travel';
import { PX_PER_M, type CityMap } from './map/CityMap';
import { turyWDemo } from './walka/tryb';

// The QR demo: `?d=<code>` (content/demo.ts) – since 18 Oct 2026 the way new players start. The name form
// (ui/demoStart.ts) makes a real character first; then the dream plays offline (api.ts `offline`, nothing saved):
// 'jedzenie' (below Zamek Lubelski, eat apples) → 'smok' (the dragon in the castle wall's gap) → a blackout →
// the character logs in for real at home in front of Targi Lublin (`wakeUp`), the demo is over and GameScene
// shows where the hero's portrait is (`powitanie`). scenes/Demo.ts runs the dream in the game.

export type DemoPhase = 'jedzenie' | 'smok';

export const demo = {
  on: false, phase: 'jedzenie' as DemoPhase, pobudka: null as Pobudka | null,
  /** The character made on the name form (logged in for real on waking up). */
  postac: null as { name: string; idik: string } | null,
};

/** Set by `wakeUp`: the next GameScene starts behind the blackout with the welcome and the portrait tutorial. */
export const powitanie = { czeka: false };

/** The QR code of the demo: index.html moves it from `?d=` into window.__demoKod and leaves …/demo in the address bar. */
export function demoKod(): string | null {
  return (window as unknown as { __demoKod?: string }).__demoKod ?? new URLSearchParams(location.search).get('d');
}

/** The demo a link asks for (null: a normal game). */
export function demoFromLink(): Pobudka | null {
  const code = demoKod();
  return code ? DEMO_KODY[code] ?? null : null;
}

const mapId = (p: { lat: number; lon: number }) => `w:${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

/** The dream's map: Lublin (the castle), or a world map when `?sen=` moves it elsewhere for tests. */
export function dreamMap() {
  return new URLSearchParams(location.search).has('sen') ? mapId(dreamPlaces().start) : 'lublin';
}

/** Where the dream happens; `?sen=lat,lon` moves it for tests (the dragon keeps its distance). */
export function dreamPlaces() {
  const t = new URLSearchParams(location.search).get('sen')?.split(',').map(Number);
  const start = t?.length === 2 && t.every(Number.isFinite) ? { lat: t[0], lon: t[1] } : SEN.start;
  const dLat = start.lat - SEN.start.lat, dLon = start.lon - SEN.start.lon;
  const z = SEN.dziedziniec;
  return {
    start,
    smok: { lat: SEN.smok.lat + dLat, lon: SEN.smok.lon + dLon },
    wylom: { lat: SEN.wylom.lat + dLat, lon: SEN.wylom.lon + dLon },
    dziedziniec: { s: z.s + dLat, n: z.n + dLat, w: z.w + dLon, e: z.e + dLon },
  };
}

/** Loads a map around a spot and puts the scene's hero there (also its "home" point). */
async function arriveAt(game: Phaser.Game, city: CityMap, p: { x: number; y: number }) {
  await city.ensure(p.x, p.y, 600 * PX_PER_M);
  // The exact spot when it is free (freeNear snaps to the nearest path: below the castle that was its courtyard).
  const free = city.isFree(p.x, p.y, 6, 6) ? { x: p.x, y: p.y } : city.freeNear(p.x, p.y);
  session.arrive = free;
  session.startX = free.x;
  session.startY = free.y;
  await prepareMap(city);
  game.registry.set('city', city);
}

/** The dream: the new character at level 20 with the best gear, one heart short, below Zamek Lubelski. */
export async function startDemo(game: Phaser.Game, p: Pobudka, r: LoginResult, look: Look) {
  offline.demo = true;
  demo.on = true;
  demo.phase = 'jedzenie';
  demo.pobudka = p;
  demo.postac = { name: r.player.name, idik: r.player.idik };
  Object.assign(session, {
    token: '', idik: '', name: r.player.name, konto: !!r.player.konto,
    age: 6, level: { ...TRUDNOSCI[0], potwory: 0 }, exp: SEN.exp, coins: 0, missions: {}, fog: undefined, fogs: {},
    lokaty: [], story: { st: 'koniec', walked: 0 }, immortal: false, mikstury: 0, bezStrzalki: [], namioty: [], at: null,
    gen: {}, questResults: {}, libRiddles: 0, nonce: Math.floor(Math.random() * 1e9), abandoned: null, stats: freshStats(), extra: [],
    secrets: new Set<string>(), chest: freshChest(), riddles: {}, seen: {}, daily: {}, look: { ...look },
  });
  const pts = pointsForLevel(MAKS_POZIOM);
  loadGear({ equip: { ...SEN.ekwipunek } as Gear['equip'], skills: { miecz: pts, luk: pts, magia: pts }, magic: true });
  PLAYER.maxHp = zyciePostaci(session.level.serca, session.exp);
  // Test server (turn fights): 3/4 of life – the apples picked in the dream heal in the fight (owner, 18 Oct 2026).
  session.hp = turyWDemo() ? Math.round(PLAYER.maxHp * SEN.tury.zycie) : PLAYER.maxHp - 2;
  const { start } = dreamPlaces();
  const city = await getMap(dreamMap());
  await arriveAt(game, city, city.fromLatLon(start.lat, start.lon));
  game.scene.start('game');
}

/**
 * Waking up: the demo ends and the character made on the name form logs in for real – home in front of Targi
 * Lublin, level 1, a fresh save. From here on it is the ordinary game (saves, heartbeat, no metre limit).
 */
export async function wakeUp(scene: Phaser.Scene) {
  const { r, city } = await przygotujPobudke();
  demo.on = false;
  demo.pobudka = null;
  offline.demo = false;
  startSession(r);
  // A reload now loads this character, not the demo again (the boot clears the code from the address bar).
  const link = new URL(codeLink(r.player.name, r.player.idik));
  history.replaceState(null, '', link.pathname + link.hash);
  session.arrive = null;
  await city.ensure(session.startX, session.startY, 600 * PX_PER_M);
  await prepareMap(city);
  scene.game.registry.set('city', city);
  powitanie.czeka = true;
  scene.scene.stop('ui');
  scene.scene.restart();
}

/**
 * Everything waking up needs, started as soon as the dream is over (the dragon beaten, the hero fallen or walked
 * too far) – owner, 18 Oct 2026: the seconds of black screen after the dragon were annoying. The login and the
 * game's content go while the „Smok pokonany!” text is still on screen.
 */
let pobudka: Promise<{ r: LoginResult; city: CityMap }> | null = null;
export function przygotujPobudke() {
  pobudka ??= (async () => {
    const who = demo.postac;
    if (!who) throw new Error('Brak postaci');
    const city = await getMap('lublin');
    const [r] = await Promise.all([api.login(who.name, who.idik), loadContent(), wczytajTargi()]);
    return { r, city };
  })().catch((e) => { pobudka = null; throw e; });
  return pobudka;
}

/**
 * The square in front of Targi Lublin – where every character made from the demo wakes up – is fetched in the
 * background from the moment the demo starts (owner, 18 Oct 2026): the map tiles around it and the Targi pictures.
 */
let targi: Promise<unknown> | null = null;
export function wczytajTargi() {
  targi ??= (async () => {
    const city = await getMap('lublin');
    const at = city.fromLatLon(PO_DEMO_START.lat, PO_DEMO_START.lon);
    await city.ensure(at.x, at.y, 600 * PX_PER_M);
    for (const f of ['targi_lublin', 'rzezba_smok_d20', 'obrot_d20_12klatek', 'obrot_starfest_12klatek', 'obrot_targi_12klatek'].map((n) => `swiat/zabytki/targi/${n}.png`)) {
      const img = new Image();
      img.src = new URL(f, document.baseURI).href;
    }
  })().catch(() => { targi = null; });
  return targi;
}

// ---------------------------------------------------------------- screen effects (HTML over the game)

function layer(id: string, css: string) {
  document.getElementById(id)?.remove();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = `position:fixed;inset:0;z-index:50;pointer-events:none;${css}`;
  document.body.append(el);
  return el;
}

/** Fades the screen to black (true) or back (false). */
export function blackout(on: boolean, ms = 700) {
  let el = document.getElementById('demo-black');
  if (!el) {
    el = layer('demo-black', 'background:#000;opacity:0;');
    // While the next view is painting, a small spinning coin shows the game is working (like the demo's opening).
    const coin = new Image();
    coin.src = new URL('logo/odznaka.webp', document.baseURI).href;
    coin.alt = '';
    coin.style.cssText = 'position:absolute;left:50%;bottom:max(36px,env(safe-area-inset-bottom));width:56px;height:auto;opacity:0;transition:opacity .4s 1s;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6));';
    el.append(coin);
    coin.animate([{ transform: 'translateX(-50%) perspective(400px) rotateY(0deg)' }, { transform: 'translateX(-50%) perspective(400px) rotateY(360deg)' }], { duration: 1400, iterations: Infinity });
    requestAnimationFrame(() => (coin.style.opacity = '1'));
  }
  el.style.transition = `opacity ${ms}ms`;
  requestAnimationFrame(() => (el.style.opacity = on ? '1' : '0'));
  if (!on) setTimeout(() => el.remove(), ms + 50);
}

/** A big line of text in the middle of the screen for a while. */
export function bigText(text: string, ms = 2400) {
  const el = layer('demo-big', 'display:flex;align-items:center;justify-content:center;padding:16px;');
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = `white-space:pre-line;font:bold ${text.length > 30 ? 'clamp(22px,6vw,46px)' : 'clamp(28px,9vw,64px)'} monospace;color:#f7c531;text-align:center;text-shadow:0 0 0 #000,-3px -3px 0 #1e1a24,3px -3px 0 #1e1a24,-3px 3px 0 #1e1a24,3px 3px 0 #1e1a24,0 6px 0 #1e1a24;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .35s;`;
  el.append(t);
  requestAnimationFrame(() => {
    t.style.transform = 'scale(1)';
    t.style.opacity = '1';
  });
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, ms);
}

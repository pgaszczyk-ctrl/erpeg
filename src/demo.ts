import type Phaser from 'phaser';
import { session, freshStats, freshChest } from './quests';
import { offline } from './api';
import { DEMO_KODY, DEMO_IMIONA, DEMO_TEKSTY, SEN, type Pobudka } from './content/demo';
import { TRUDNOSCI } from './content/trudnosc';
import { PLAYER } from './objects/Player';
import { zyciePostaci } from './content/historia';
import { loadGear, pointsForLevel, type Gear } from './inventory';
import { MAKS_POZIOM } from './content/przedmioty';
import { randomLook } from './look';
import { getMap, prepareMap } from './travel';
import { PX_PER_M, type CityMap } from './map/CityMap';
import { pixelLogo } from './ui/logo';

// The QR demo: `?d=<code>` (content/demo.ts) plays without a character or a
// menu. Nothing is written on the server (api.ts `offline`). The phases:
// 'jedzenie' (by Wawel, eat fruit) → 'smok' (fight the Wawel dragon) →
// a blackout → 'jawa' (awake where the QR code sends, a while to walk) →
// 'koniec' (dimmed, "Zacznij własną przygodę"). scenes/Demo.ts runs them in the game.

export type DemoPhase = 'jedzenie' | 'smok' | 'jawa' | 'koniec';

export const demo = { on: false, phase: 'jedzenie' as DemoPhase, pobudka: null as Pobudka | null };

/** The demo a link asks for (null: a normal game). */
export function demoFromLink(): Pobudka | null {
  const code = new URLSearchParams(location.search).get('d');
  return code ? DEMO_KODY[code] ?? null : null;
}

const mapId = (p: { lat: number; lon: number }) => `w:${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

/** Where the dream happens; `?sen=lat,lon` moves it for tests (the dragon keeps its distance). */
export function dreamPlaces() {
  const t = new URLSearchParams(location.search).get('sen')?.split(',').map(Number);
  const start = t?.length === 2 && t.every(Number.isFinite) ? { lat: t[0], lon: t[1] } : SEN.start;
  return { start, smok: { lat: start.lat + SEN.smok.lat - SEN.start.lat, lon: start.lon + SEN.smok.lon - SEN.start.lon } };
}

/** Loads a map around a spot and puts the scene's hero there (also its "home" point). */
async function arriveAt(game: Phaser.Game, city: CityMap, p: { x: number; y: number }) {
  await city.ensure(p.x, p.y, 600 * PX_PER_M);
  const free = city.freeNear(p.x, p.y);
  session.arrive = free;
  session.startX = free.x;
  session.startY = free.y;
  await prepareMap(city);
  game.registry.set('city', city);
}

/** The dream: a nameless hero at level 20 with the best gear, one heart short, by Wawel. */
export async function startDemo(game: Phaser.Game, p: Pobudka) {
  offline.demo = true;
  demo.on = true;
  demo.phase = 'jedzenie';
  demo.pobudka = p;
  Object.assign(session, {
    token: '', idik: '', name: DEMO_IMIONA[Math.floor(Math.random() * DEMO_IMIONA.length)],
    age: 6, level: { ...TRUDNOSCI[0], potwory: 0 }, exp: SEN.exp, coins: 0, missions: {}, fog: undefined, fogs: {},
    lokaty: [], story: { st: 'koniec', walked: 0 }, kamienie: 0, immortal: false, mikstury: 0, bezStrzalki: [], namioty: [], at: null,
    gen: {}, libRiddles: 0, nonce: Math.floor(Math.random() * 1e9), abandoned: null, stats: freshStats(), extra: [],
    secrets: new Set<string>(), chest: freshChest(), riddles: {}, seen: {}, daily: {}, look: randomLook(),
  });
  const pts = pointsForLevel(MAKS_POZIOM);
  loadGear({ equip: { ...SEN.ekwipunek } as Gear['equip'], skills: { miecz: pts, luk: pts, magia: pts }, magic: true });
  PLAYER.maxHp = zyciePostaci(session.level.serca, session.exp);
  session.hp = PLAYER.maxHp - 2;
  const { start } = dreamPlaces();
  const city = await getMap(mapId(start));
  await arriveAt(game, city, city.fromLatLon(start.lat, start.lon));
  game.scene.start('game');
}

/** Awake: where the QR code sends, a plain hero (level 1, a stick, 10 coins) who can't die. */
export async function wakeUp(scene: Phaser.Scene) {
  const p = demo.pobudka!;
  session.exp = 0;
  session.coins = 10;
  session.immortal = true;
  session.level = { ...TRUDNOSCI[0] };
  loadGear({});
  PLAYER.maxHp = zyciePostaci(session.level.serca, 0);
  session.hp = PLAYER.maxHp;
  const city = await getMap('mapa' in p ? 'lublin' : mapId(p));
  const at = 'adres' in p ? city.findAnyStart(p.adres, p.adres) : city.fromLatLon(p.lat, p.lon);
  await arriveAt(scene.game, city, at ?? { x: session.startX, y: session.startY });
  demo.phase = 'jawa';
  scene.scene.stop('ui');
  scene.scene.restart();
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
  const el = document.getElementById('demo-black') ?? layer('demo-black', 'background:#000;opacity:0;');
  el.style.transition = `opacity ${ms}ms`;
  requestAnimationFrame(() => (el.style.opacity = on ? '1' : '0'));
  if (!on) setTimeout(() => el.remove(), ms + 50);
}

/** A big line of text in the middle of the screen for a while. */
export function bigText(text: string, ms = 2400) {
  const el = layer('demo-big', 'display:flex;align-items:center;justify-content:center;padding:16px;');
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = `font:bold clamp(28px,9vw,64px) monospace;color:#f7c531;text-align:center;text-shadow:0 0 0 #000,-3px -3px 0 #1e1a24,3px -3px 0 #1e1a24,-3px 3px 0 #1e1a24,3px 3px 0 #1e1a24,0 6px 0 #1e1a24;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .35s;`;
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

/** The end: the game dims, the name and the invitation stay. */
export function finale() {
  const el = layer('demo-end', 'background:rgba(10,8,14,0);transition:background 2.5s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;pointer-events:auto;font-family:monospace;');
  const logo = pixelLogo(undefined, 6);
  logo.style.cssText = 'image-rendering:pixelated;max-width:90vw;opacity:0;transition:opacity 1.5s 1s;';
  const btn = document.createElement('button');
  btn.textContent = DEMO_TEKSTY.koniec;
  btn.style.cssText = 'font:bold 22px monospace;padding:14px 22px;background:#3fa34d;color:#fff;border:3px solid #9be29b;border-radius:10px;cursor:pointer;opacity:0;transition:opacity 1s 2s;';
  btn.onclick = () => (location.href = location.origin + location.pathname);
  const sub = document.createElement('div');
  sub.textContent = DEMO_TEKSTY.koniecPodpis;
  sub.style.cssText = 'color:#ddd;font-size:16px;opacity:0;transition:opacity 1s 2.4s;';
  el.append(logo, btn, sub);
  requestAnimationFrame(() => {
    el.style.background = 'rgba(10,8,14,0.82)';
    for (const x of [logo, btn, sub]) x.style.opacity = '1';
  });
}

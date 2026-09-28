import type Phaser from 'phaser';
import { CityMap, PX_PER_M } from './map/CityMap';
import { PIES, MARGO, DZIADKOWIE, MARTIN } from './content/postacie';
import { addVillageCamps, pickHotels } from './hotels';
import { session } from './quests';
import { worldMap, worldOrigin } from './map/world';
import { DUZE_MIASTA, POWROT, WOZNICA } from './content/pociagi';
import { rng } from './rng';
import { showJourney, serverNow, syncClock } from './journey';

// Coachmen at railway stations take the hero to other maps: Lublin and the
// small town maps by the region's stations (public/map/world.json, made by
// scripts/build-maps.mjs). Where they can go comes from the train timetables
// (GTFS: which station follows which); without them, the nearest stations.

export interface Station { name: string; lon: number; lat: number }
interface World {
  lublin: Station[];
  towns: { id: string; name: string; stations: Station[] }[];
  /** Neighbouring stations along a railway line: "<map>|<station>" pairs. */
  edges: { from: string; to: string }[];
}

export interface Stop extends Station { key: string; mapId: string; mapName: string }
export interface Trip {
  to: Stop;
  km: number;
  /** A station on the way, for trips to the one after next. */
  via: string | null;
  price: number;
}

/** Coins for a ride: a fixed fee plus a bit per kilometre. */
export const COACH_FEE = 100;
export const COACH_PER_KM = 30;
/** How many destinations a coachman offers. */
const MAX_TRIPS = 5;

let world: World = { lublin: [], towns: [], edges: [] };
const stops = new Map<string, Stop>();
const maps = new Map<string, CityMap>();

export async function loadWorld() {
  try {
    const res = await fetch('map/world.json');
    if (res.ok) world = await res.json();
  } catch {
    // No towns: coachmen have nowhere to go.
  }
  stops.clear();
  for (const s of world.lublin) stops.set(`lublin|${s.name}`, { ...s, key: `lublin|${s.name}`, mapId: 'lublin', mapName: 'Lublin' });
  for (const t of world.towns) for (const s of t.stations) stops.set(`${t.id}|${s.name}`, { ...s, key: `${t.id}|${s.name}`, mapId: t.id, mapName: t.name });
}

export function rememberMap(city: CityMap) {
  pickHotels(city);
  addSecondCoachmen(city);
  addVillageCamps(city);
  maps.set(city.id, city);
}

export function cachedMap(id: string) {
  return maps.get(id);
}

/** Lublin or a town map, loaded once and kept (towns are small). */
export async function getMap(id: string) {
  const known = maps.get(id);
  if (known) return known;
  const w = worldOrigin(id);
  if (w) {
    // Made from the world map as the hero walks (places come with the tiles).
    const city = worldMap(w.lat, w.lon);
    maps.set(id, city);
    return city;
  }
  const city = await CityMap.load(id === 'lublin' ? 'map/lublin.json' : `map/towns/${id}.json`, id);
  rememberMap(city);
  return city;
}

/** How far around the hero the map is loaded (tiled maps). */
export const LOAD_RADIUS = 2000 * PX_PER_M;

/**
 * Loads the map tiles the scene needs right away: around where the hero
 * appears, home, an unfinished session's spot and the fixed characters'
 * streets (nothing to do for small maps without tiles).
 */
export async function prepareMap(city: CityMap) {
  // Around the hero now (the rest comes while playing, see GameScene.update).
  const near = 1000 * PX_PER_M;
  const pts: { x: number; y: number; r: number }[] = [];
  if (session.arrive) pts.push({ ...session.arrive, r: near });
  if (city.id === 'lublin') {
    pts.push({ x: session.startX, y: session.startY, r: near });
    for (const street of [...PIES.ulice, MARGO.ulica, DZIADKOWIE.ulica, MARTIN.ulica]) {
      const p = city.findStart(street);
      if (p) pts.push({ ...p, r: 400 * PX_PER_M });
    }
  }
  const a = session.abandoned;
  if (a && (a.m ?? 'lublin') === city.id) pts.push({ x: a.x, y: a.y, r: near });
  await Promise.all(pts.map((p) => city.ensure(p.x, p.y, p.r)));
}

/**
 * Starts the game where the character was last saved: the last hotel (on
 * its map), or home. There are no teleports.
 */
export async function enterWorld(game: Phaser.Game) {
  // Still on the way: the ride screen until the cart arrives (the load point is its station already).
  if (session.jazda) {
    await syncClock();
    if (serverNow() < session.jazda.end) await showJourney(session.jazda);
    session.jazda = null;
  }
  let city = maps.get('lublin')!;
  let at = session.at;
  if (at) {
    try {
      city = await getMap(at.m);
    } catch {
      at = null; // that map is gone: home
    }
  }
  session.arrive = at ? { x: at.x, y: at.y } : null;
  await prepareMap(city);
  game.registry.set('city', city);
  game.scene.start('game');
}

export function mapName(id: string) {
  if (worldOrigin(id)) return worldNames.get(id) ?? 'Daleko';
  return id === 'lublin' ? 'Lublin' : world.towns.find((t) => t.id === id)?.name ?? id;
}
const cityMapId = (c: { lat: number; lon: number }) => `w:${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
const worldNames = new Map<string, string>(DUZE_MIASTA.map((c) => [cityMapId(c), c.nazwa]));

export type Offer = Trip & { level?: number };

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A coachman's three rides (content/pociagi.ts WOZNICA), drawn again every
 * half hour: one of the nearest stations, one 10–50 km away and a long-distance
 * train to a big city 100+ km away. On a far city's map: back to Lublin and
 * another big city. `who` tells coachmen apart (a big station has two).
 */
export function coachOffers(mapId: string, at: { lat: number; lon: number }, stationName: string, who: string): Offer[] {
  const slot = Math.floor(Date.now() / (WOZNICA.zmianaCoMin * 60_000));
  const r = rng(hashStr(`${mapId}|${who}|${slot}`));
  const pick = <T,>(list: T[]) => (list.length ? list[Math.floor(r() * list.length)] : undefined);
  const here: Station = { name: stationName, ...at };
  const price = (d: number) => COACH_FEE + Math.round(d * COACH_PER_KM);
  const out: Offer[] = [];
  const far = (not?: string) => {
    const cities = DUZE_MIASTA.filter((c) => c.nazwa !== not && km(here, { name: c.nazwa, ...c }) >= WOZNICA.dalekoOdKm);
    const c = pick(cities);
    if (!c) return;
    const to: Stop = { name: c.nazwa, lat: c.lat, lon: c.lon, key: `w|${c.nazwa}`, mapId: cityMapId(c), mapName: c.nazwa };
    out.push({ to, km: km(here, to), via: null, price: WOZNICA.cenaDalekobiezny, level: WOZNICA.odPoziomu });
  };
  if (worldOrigin(mapId)) {
    const main = world.lublin.find((s) => /główny/i.test(s.name)) ?? world.lublin[0];
    if (main) out.push({ to: { ...main, key: `lublin|${main.name}`, mapId: 'lublin', mapName: POWROT.nazwa }, km: km(here, main), via: null, price: POWROT.cena });
    far(worldNames.get(mapId));
    return out;
  }
  const others = [...stops.values()].filter((s) => !(s.mapId === mapId && s.name === stationName) && km(here, s) > 0.3).sort((a, b) => km(here, a) - km(here, b));
  const near = pick(others.slice(0, WOZNICA.bliskichDoWyboru));
  if (near) out.push({ to: near, km: km(here, near), via: null, price: price(km(here, near)) });
  const mid = pick(others.filter((s) => s !== near && km(here, s) >= WOZNICA.srednioOdKm && km(here, s) <= WOZNICA.srednioDoKm));
  if (mid) out.push({ to: mid, km: km(here, mid), via: null, price: price(km(here, mid)) });
  far();
  return out;
}

/** Big stations get a second coachman (with other rides): "Główny" in the name or 3+ neighbouring stations. */
export function addSecondCoachmen(city: CityMap) {
  for (const p of [...city.places]) {
    if (p.kind !== 'station' || p.id.endsWith('#2')) continue;
    const key = `${city.id}|${p.name}`;
    const ways = world.edges.filter((e) => e.from === key || e.to === key).length;
    if (!/główn/i.test(p.name) && ways < 3) continue;
    if (city.places.some((q) => q.id === `${p.id}#2`)) continue;
    const door = city.freeNear(p.door.x + 14 * PX_PER_M, p.door.y + 4 * PX_PER_M);
    city.places.push({ ...p, id: `${p.id}#2`, building: null, door });
  }
}

const km = (a: Station, b: Station) => {
  const dy = (a.lat - b.lat) * 111.132;
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

/** The station a coachman stands at: by name on this map, else the nearest one. */
export function stopFor(mapId: string, name: string, lat?: number, lon?: number): Stop | null {
  const exact = stops.get(`${mapId}|${name}`);
  if (exact || lat === undefined || lon === undefined) return exact ?? null;
  let best: Stop | null = null;
  for (const s of stops.values()) if (s.mapId === mapId && (!best || km(s, { name, lat, lon }) < km(best, { name, lat, lon }))) best = s;
  return best;
}

/**
 * Where the coachman at `from` can go (he always waits, no timetable hours):
 * the next stations along the railway lines and the ones after them, or,
 * without timetable data, the nearest stations.
 */
export function tripsFrom(from: Stop): Trip[] {
  const price = (d: number) => COACH_FEE + Math.round(d * COACH_PER_KM);
  const out = new Map<string, Trip>();
  const add = (to: Stop | undefined, via: string | null) => {
    if (!to || to.key === from.key) return;
    const old = out.get(to.key);
    if (old && (old.via === null || via !== null)) return;
    const d = km(from, to);
    out.set(to.key, { to, km: d, via, price: price(d) });
  };
  const next = (key: string) => {
    const list = new Set<string>();
    for (const e of world.edges) {
      if (e.from === key) list.add(e.to);
      else if (e.to === key) list.add(e.from);
    }
    return list;
  };
  const first = next(from.key);
  for (const k of first) add(stops.get(k), null);
  for (const k of first) {
    for (const k2 of next(k)) if (!first.has(k2)) add(stops.get(k2), stops.get(k)?.name ?? null);
  }
  if (!out.size) {
    // No timetable here: the nearest stations on other maps, by coach.
    const near = [...stops.values()].filter((s) => s.mapId !== from.mapId).sort((a, b) => km(from, a) - km(from, b)).slice(0, 3);
    for (const s of near) add(s, null);
  }
  // Mostly other towns: at most two stations on the map we are on.
  const sorted = [...out.values()].sort((a, b) => a.km - b.km);
  const same = sorted.filter((t) => t.to.mapId === from.mapId).slice(0, 2);
  const other = sorted.filter((t) => t.to.mapId !== from.mapId).slice(0, MAX_TRIPS - same.length);
  return [...other, ...same].sort((a, b) => a.km - b.km);
}

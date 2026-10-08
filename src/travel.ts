import type Phaser from 'phaser';
import { CityMap, PX_PER_M } from './map/CityMap';
import { PIES, MARGO, DZIADKOWIE, MARTIN } from './content/postacie';
import { addVillageCamps, pickHotels } from './hotels';
import { session } from './quests';
import { worldMap, worldOrigin } from './map/world';
import { DUZE_MIASTA, POWROT, WOZNICA } from './content/pociagi';
import { rng } from './rng';
import { showJourney, serverNow, syncClock } from './journey';
import { takeResume } from './update';
import { TEST } from './version';

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

/** Stations, towns and rail links (the map screen's region view). */
export function worldInfo() {
  return { world, stops };
}

export function rememberMap(city: CityMap) {
  // The same station twice (a bus station is both a building and its outline in OSM): keep one.
  const keep = city.places.filter((p, i, all) => p.kind !== 'station' || !all.some((q, j) => j < i && q.kind === 'station' && q.name === p.name && Math.hypot(q.door.x - p.door.x, q.door.y - p.door.y) < 300 * PX_PER_M));
  if (keep.length !== city.places.length) city.places.splice(0, city.places.length, ...keep);
  // Stations on the map that the railway list doesn't know (bus stations): coachmen can drive there too.
  for (const p of city.places) {
    if (p.kind !== 'station' || /#\d+$/.test(p.id) || stops.has(`${city.id}|${p.name}`)) continue;
    const ll = city.toLatLon(p.door.x, p.door.y);
    stops.set(`${city.id}|${p.name}`, { name: p.name, ...ll, key: `${city.id}|${p.name}`, mapId: city.id, mapName: mapName(city.id) });
  }
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
    // Do not wait for remote neighbourhoods merely to create their walking NPCs.
    // Active return/collection quests still need their exact target at login.
    const fixedStreets = TEST ? [
      ...(['active', 'goal'].includes(session.missions['npc-pies']) ? PIES.ulice : []),
      ...(session.missions[MARTIN.zadanie.id] === 'active' ? [MARTIN.ulica] : []),
    ] : [...PIES.ulice, MARGO.ulica, DZIADKOWIE.ulica, MARTIN.ulica];
    for (const street of fixedStreets) {
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
  // Reloaded for a new version (update.ts): back where the hero stood, once.
  const back = takeResume(session.name);
  let at = back ?? session.at;
  if (at) {
    try {
      city = await getMap(at.m);
    } catch {
      at = null; // that map is gone: home
    }
  }
  session.arrive = at ? { x: at.x, y: at.y } : null;
  await prepareMap(city);
  // A far city's platform could be an island between tracks (saved before this was checked): walk-out spot.
  if (at && !back && worldOrigin(city.id) && session.arrive) session.arrive = city.reachableNear(session.arrive.x, session.arrive.y);
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

/** The four sides of the world a coachman can drive to. */
export type Strona = 'N' | 'S' | 'E' | 'W';
export const STRONY: Record<Strona, string> = { N: 'na północ', S: 'na południe', E: 'na wschód', W: 'na zachód' };

/** Price of a ride: the fee + per km, rounded up (content/pociagi.ts). */
export const ridePrice = (d: number) => Math.ceil((COACH_FEE + d * COACH_PER_KM) / WOZNICA.zaokraglenie) * WOZNICA.zaokraglenie;

const slotNow = () => Math.floor(Date.now() / (WOZNICA.zmianaCoMin * 60_000));

/**
 * At a big station each coachman drives one side of the world (drawn again
 * with the rides every half hour; one side stays without a coachman).
 * null = an ordinary station's only coachman, who goes anywhere.
 */
export function coachSide(mapId: string, who: string, big: boolean): Strona | null {
  if (!big) return null;
  const base = who.replace(/#\d+$/, '');
  const n = /#(\d+)$/.exec(who);
  const i = n ? Number(n[1]) - 1 : 0;
  const r = rng(hashStr(`${mapId}|${base}|strony|${slotNow()}`));
  const sides: Strona[] = ['N', 'S', 'E', 'W'];
  for (let k = sides.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [sides[k], sides[j]] = [sides[j], sides[k]];
  }
  return sides[i] ?? null;
}

/** Which side of the world `b` lies from `a`. */
function sideOf(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Strona {
  const dy = b.lat - a.lat;
  const dx = (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180);
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'N' : 'S';
}

/**
 * A coachman's three rides (content/pociagi.ts WOZNICA), drawn again every
 * half hour: one of the nearest stations, one 10–50 km away and a long-distance
 * train to a big city 100–400 km away, all priced by the km. With `side` only
 * destinations that way. On a far city's map: back to Lublin and another big
, or the nearest one
 * if none is within reach. `who` tells coachmen apart (a big station has three).
 */
export function coachOffers(mapId: string, at: { lat: number; lon: number }, stationName: string, who: string, side: Strona | null = null): Offer[] {
  const r = rng(hashStr(`${mapId}|${who}|${slotNow()}`));
  const pick = <T,>(list: T[]) => (list.length ? list[Math.floor(r() * list.length)] : undefined);
  const here: Station = { name: stationName, ...at };
  const way = (s: { lat: number; lon: number }) => !side || sideOf(here, s) === side;
  const out: Offer[] = [];
  const far = (not?: string) => {
    const cities = DUZE_MIASTA.filter((c) => {
      const d = km(here, { name: c.nazwa, ...c });
      return c.nazwa !== not && d >= WOZNICA.dalekoOdKm && d <= WOZNICA.maksKm && way(c);
    });
    const c = pick(cities);
    if (!c) return;
    const to: Stop = { name: c.nazwa, lat: c.lat, lon: c.lon, key: `w|${c.nazwa}`, mapId: cityMapId(c), mapName: c.nazwa };
    const d = km(here, to);
    out.push({ to, km: d, via: null, price: ridePrice(d), level: WOZNICA.odPoziomu });
  };
  if (worldOrigin(mapId)) {
    // A far city: rides to other cities within reach (Lublin is just one of them); no forced way home.
    const here2 = worldNames.get(mapId);
    const lublin = world.lublin.find((s) => /główny/i.test(s.name)) ?? world.lublin[0];
    const cands: Stop[] = DUZE_MIASTA.filter((c) => c.nazwa !== here2).map((c) => ({ name: c.nazwa, lat: c.lat, lon: c.lon, key: `w|${c.nazwa}`, mapId: cityMapId(c), mapName: c.nazwa }));
    if (lublin) cands.push({ ...lublin, key: `lublin|${lublin.name}`, mapId: 'lublin', mapName: POWROT.nazwa });
    const ok = cands.filter((c) => km(here, c) <= WOZNICA.maksKm && way(c)).sort((a, b) => km(here, a) - km(here, b));
    // Nobody within reach (a city beyond the limit, reached before it): the nearest one anyway.
    const list = ok.length ? ok : [...cands].sort((a, b) => km(here, a) - km(here, b)).slice(0, 1);
    const nearest = list[0];
    const other = pick(list.slice(1));
    for (const to of [nearest, other]) {
      if (!to) continue;
      const d = km(here, to);
      out.push({ to, km: d, via: null, price: ridePrice(d), level: to.mapId === 'lublin' ? undefined : WOZNICA.odPoziomu });
    }
    return out;
  }
  const others = [...stops.values()].filter((s) => !(s.mapId === mapId && s.name === stationName) && km(here, s) > 0.3 && way(s)).sort((a, b) => km(here, a) - km(here, b));
  const near = pick(others.slice(0, WOZNICA.bliskichDoWyboru));
  if (near) out.push({ to: near, km: km(here, near), via: null, price: ridePrice(km(here, near)) });
  const mid = pick(others.filter((s) => s !== near && km(here, s) >= WOZNICA.srednioOdKm && km(here, s) <= WOZNICA.srednioDoKm));
  if (mid) out.push({ to: mid, km: km(here, mid), via: null, price: ridePrice(km(here, mid)) });
  far();
  return out;
}

/** Is this a big station ("Główny" in the name or 3+ neighbouring stations)? */
export function bigStation(mapId: string, name: string) {
  const key = `${mapId}|${name}`;
  return /główn/i.test(name) || WOZNICA.dworzecAutobusowy.test(name) || world.edges.filter((e) => e.from === key || e.to === key).length >= 3;
}

/** Big stations get more coachmen (WOZNICA.woznicNaDuzejStacji), each driving one side of the world. */
export function addSecondCoachmen(city: CityMap) {
  for (const p of [...city.places]) {
    if (p.kind !== 'station' || /#\d+$/.test(p.id)) continue;
    if (!bigStation(city.id, p.name)) continue;
    for (let n = 2; n <= WOZNICA.woznicNaDuzejStacji; n++) {
      if (city.places.some((q) => q.id === `${p.id}#${n}`)) continue;
      const door = city.freeNear(p.door.x + (n - 1) * 42 * PX_PER_M, p.door.y + (n % 2 ? -4 : 4) * PX_PER_M);
      city.places.push({ ...p, id: `${p.id}#${n}`, building: null, door });
    }
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
  const price = ridePrice;
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

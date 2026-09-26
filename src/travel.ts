import type Phaser from 'phaser';
import { CityMap } from './map/CityMap';
import { pickHotels } from './hotels';
import { session } from './quests';

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
  maps.set(city.id, city);
}

export function cachedMap(id: string) {
  return maps.get(id);
}

/** Lublin or a town map, loaded once and kept (towns are small). */
export async function getMap(id: string) {
  const known = maps.get(id);
  if (known) return known;
  const city = await CityMap.load(id === 'lublin' ? 'map/lublin.json' : `map/towns/${id}.json`, id);
  rememberMap(city);
  return city;
}

/**
 * Starts the game where the character was last saved: the last hotel (on
 * its map), or home. There are no teleports.
 */
export async function enterWorld(game: Phaser.Game) {
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
  game.registry.set('city', city);
  game.scene.start('game');
}

export function mapName(id: string) {
  return id === 'lublin' ? 'Lublin' : world.towns.find((t) => t.id === id)?.name ?? id;
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

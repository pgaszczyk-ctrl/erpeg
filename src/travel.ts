import { CityMap } from './map/CityMap';

// Coachmen at railway stations take the hero to other maps: Lublin and the
// small town maps by the region's stations (public/map/world.json, made by
// scripts/build-maps.mjs). Where they go and how long it takes comes from the
// train timetables (GTFS); without them, the nearest stations by distance.

export interface Station { name: string; lon: number; lat: number }
interface World {
  lublin: Station[];
  towns: { id: string; name: string; stations: Station[] }[];
  /** "<map>|<station>" -> "<map>|<station>", train minutes, departures "HH:MM". */
  edges: { from: string; to: string; min: number; dep: string[] }[];
}

export interface Stop extends Station { key: string; mapId: string; mapName: string }
export interface Trip {
  to: Stop;
  km: number;
  /** Minutes by train (timetable) or by coach (no timetable). */
  min: number;
  /** Next train from here, "HH:MM", if the timetable knows. */
  dep: string | null;
  /** A station on the way, for trips to the one after next. */
  via: string | null;
  price: number;
}

/** Coins for a ride: a fixed fee plus a bit per kilometre. */
export const COACH_FEE = 10;
export const COACH_PER_KM = 3;
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
  maps.set(id, city);
  return city;
}

export function mapName(id: string) {
  return id === 'lublin' ? 'Lublin' : world.towns.find((t) => t.id === id)?.name ?? id;
}

const km = (a: Station, b: Station) => {
  const dy = (a.lat - b.lat) * 111.132;
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The first train after `now` (minutes since midnight), or the first one tomorrow. */
function nextDeparture(dep: string[], now: number) {
  if (!dep.length) return null;
  return dep.find((d) => minutes(d) >= now) ?? dep[0];
}

/** The station a coachman stands at: by name on this map, else the nearest one. */
export function stopFor(mapId: string, name: string, lat?: number, lon?: number): Stop | null {
  const exact = stops.get(`${mapId}|${name}`);
  if (exact || lat === undefined || lon === undefined) return exact ?? null;
  let best: Stop | null = null;
  for (const s of stops.values()) if (s.mapId === mapId && (!best || km(s, { name, lat, lon }) < km(best, { name, lat, lon }))) best = s;
  return best;
}

/**
 * Where the coachman at `from` can go: the next stations along the railway
 * lines and the ones after them (with the train's minutes and next departure),
 * or, without a timetable, the nearest stations.
 */
export function tripsFrom(from: Stop, now: number): Trip[] {
  const price = (d: number) => COACH_FEE + Math.round(d * COACH_PER_KM);
  const out = new Map<string, Trip>();
  const add = (to: Stop | undefined, min: number, dep: string | null, via: string | null) => {
    if (!to || to.key === from.key) return;
    const old = out.get(to.key);
    if (old && (old.via === null || via !== null)) return;
    const d = km(from, to);
    out.set(to.key, { to, km: d, min, dep, via, price: price(d) });
  };
  const next = (key: string) => {
    const list = new Map<string, { min: number; dep: string[] }>();
    for (const e of world.edges) {
      if (e.from === key) list.set(e.to, { min: e.min, dep: e.dep });
      else if (e.to === key && !list.has(e.from)) list.set(e.from, { min: e.min, dep: [] });
    }
    return list;
  };
  const first = next(from.key);
  for (const [k, e] of first) add(stops.get(k), e.min, nextDeparture(e.dep, now), null);
  for (const [k, e] of first) {
    for (const [k2, e2] of next(k)) {
      if (first.has(k2)) continue;
      add(stops.get(k2), e.min + e2.min, nextDeparture(e.dep, now), stops.get(k)?.name ?? null);
    }
  }
  if (!out.size) {
    // No timetable here: the nearest stations on other maps, by coach.
    const near = [...stops.values()].filter((s) => s.mapId !== from.mapId).sort((a, b) => km(from, a) - km(from, b)).slice(0, 3);
    for (const s of near) add(s, Math.round(km(from, s) * 4), null, null); // a horse does ~15 km/h
  }
  return [...out.values()].sort((a, b) => a.km - b.km).slice(0, MAX_TRIPS);
}

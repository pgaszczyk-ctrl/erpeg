// The traveller's map (content/mapa.ts MAPA_PODROZNIKA): railway and bus stations and ferry ports
// within its radius of the hero, for the map screen. Read only for players who own the map:
// stations from public/dworce/<cell>.json (2° × 2° cells from OpenStreetMap, scripts/dworce-osm.mjs),
// the region's own stations (world.json) and the ferry ports (porty.json).
import { worldInfo } from './travel';
import { wczytajPorty, portyBlisko, odleglosc } from './porty';

export type RodzajHuba = 'kolej' | 'autobus' | 'port';
export interface Hub { nazwa: string; lat: number; lon: number; rodzaj: RodzajHuba; km: number }

let indeks: Promise<Set<string>> | null = null;
const komorki = new Map<string, Promise<[string, number, number, string][]>>();

function znaneKomorki() {
  indeks ??= fetch('dworce/index.json')
    .then((r) => (r.ok ? r.json() : { komorki: [] }))
    .then((j: { komorki: string[] }) => new Set(j.komorki))
    .catch(() => new Set<string>());
  return indeks;
}

function komorka(key: string) {
  let p = komorki.get(key);
  if (!p) {
    p = fetch(`dworce/${key}.json`).then((r) => (r.ok ? r.json() : []));
    p.catch(() => komorki.delete(key));
    komorki.set(key, p);
  }
  return p;
}

/** Hubs within `km` of a point, the nearest first, at most `ile`. */
export async function hubyBlisko(at: { lat: number; lon: number }, km: number, ile: number): Promise<Hub[]> {
  const dLat = km / 111.32, dLon = km / (111.32 * Math.max(0.1, Math.cos((at.lat * Math.PI) / 180)));
  const keys: string[] = [];
  for (let a = Math.floor((at.lat - dLat) / 2); a <= Math.floor((at.lat + dLat) / 2); a++)
    for (let b = Math.floor((at.lon - dLon) / 2); b <= Math.floor((at.lon + dLon) / 2); b++) keys.push(`${a}_${b}`);
  const known = await znaneKomorki();
  const [lists] = await Promise.all([
    Promise.all(keys.filter((k) => known.has(k)).map((k) => komorka(k).catch(() => []))),
    wczytajPorty(),
  ]);
  const out: Hub[] = [];
  const add = (nazwa: string, lat: number, lon: number, rodzaj: RodzajHuba) => {
    const d = odleglosc(at, { lat, lon });
    if (d > km) return;
    // The same station from two lists (the region's own and OpenStreetMap's).
    if (out.some((h) => h.rodzaj !== 'port' && rodzaj !== 'port' && odleglosc(h, { lat, lon }) < 0.4)) return;
    out.push({ nazwa, lat, lon, rodzaj, km: d });
  };
  for (const s of worldInfo().stops.values()) add(s.name, s.lat, s.lon, /autobus|PKS|d\.a\./i.test(s.name) ? 'autobus' : 'kolej');
  for (const l of lists) for (const [nazwa, lat, lon, k] of l) add(nazwa, lat, lon, k === 'a' ? 'autobus' : 'kolej');
  for (const p of portyBlisko(at, km)) add(p.nazwa, p.lat, p.lon, 'port');
  return out.sort((a, b) => a.km - b.km).slice(0, ile);
}

export const IKONA_HUBA: Record<RodzajHuba, string> = { kolej: '🚂', autobus: '🚌', port: '⚓' };

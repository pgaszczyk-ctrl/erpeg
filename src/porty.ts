// Ferry ports of the world (public/porty.json from OpenStreetMap, scripts/promy-osm.mjs,
// plus content/porty.ts LINIE_DOPISANE). Loaded once, on the first world map.
import { LINIE_DOPISANE, PROM } from './content/porty';
import { nameWorldMap } from './travel';

export interface Port { id: number; nazwa: string; lat: number; lon: number; terminal: string | null }
export interface Rejs { do: Port; km: number; nazwa: string | null }

let porty: Port[] = [];
const linie = new Map<number, Rejs[]>();
let ladowanie: Promise<void> | null = null;

/** Reads the list once (an empty list when it's missing or offline – no captains then). */
export function wczytajPorty(): Promise<void> {
  ladowanie ??= (async () => {
    try {
      const res = await fetch('porty.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { porty: [number, string, number, number, string | null][]; linie: [number, number, number, string | null][] };
      porty = j.porty.map(([id, nazwa, lat, lon, terminal]) => ({ id, nazwa, lat, lon, terminal }));
      for (const [a, b, km, nazwa] of j.linie) dodaj(porty[a], porty[b], km, nazwa);
    } catch {
      // No ports today.
    }
    for (const [a, b, km, nazwa] of LINIE_DOPISANE) dodaj(znajdzLubDodaj(a), znajdzLubDodaj(b), km, nazwa);
    for (const p of porty) nameWorldMap(portMapId(p), p.nazwa);
  })();
  return ladowanie;
}

function dodaj(a: Port | undefined, b: Port | undefined, km: number, nazwa: string | null) {
  if (!a || !b || a === b) return;
  for (const [x, y] of [[a, b], [b, a]] as const) {
    const l = linie.get(x.id) ?? [];
    if (!l.some((r) => r.do === y)) l.push({ do: y, km, nazwa });
    linie.set(x.id, l);
  }
}

function znajdzLubDodaj(p: { nazwa: string; lat: number; lon: number }): Port {
  const blisko = porty.find((q) => odleglosc(q, p) < 3);
  if (blisko) return blisko;
  const nowy = { id: porty.length, nazwa: p.nazwa, lat: p.lat, lon: p.lon, terminal: null };
  porty.push(nowy);
  return nowy;
}

/** Straight distance, km. */
export function odleglosc(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dy = (a.lat - b.lat) * 111.132;
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** Ports within `km` of a point, the nearest first. */
export function portyBlisko(at: { lat: number; lon: number }, km: number): Port[] {
  return porty.filter((p) => Math.abs(p.lat - at.lat) < km / 100 + 0.1 && odleglosc(p, at) <= km).sort((a, b) => odleglosc(a, at) - odleglosc(b, at));
}

/** Where ferries from this port go, the shortest first. */
export function rejsyZ(p: Port): Rejs[] {
  return [...(linie.get(p.id) ?? [])].sort((a, b) => a.km - b.km);
}

export const portPoId = (id: number) => porty[id];

/** The world map a ferry lands on (its origin at the port, like far cities' maps). */
export const portMapId = (p: Port) => `w:${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

/** Ticket price. */
export const cenaRejsu = (km: number) => Math.ceil((PROM.oplata + km * PROM.zaKm) / PROM.zaokraglenie) * PROM.zaokraglenie;

/** The id the port's place has on a map. */
export const portKey = (p: Port) => `port:${p.id}`;

/** For tests. */
export const portyStan = () => ({ porty: porty.length, linie: [...linie.values()].reduce((s, l) => s + l.length, 0) / 2 });

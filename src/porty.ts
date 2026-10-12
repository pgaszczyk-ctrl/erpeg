// Ferry ports of the world (public/porty.json from OpenStreetMap, scripts/promy-osm.mjs,
// plus content/porty.ts LINIE_DOPISANE). Loaded once, on the first world map.
import { LINIE_DOPISANE, PROM } from './content/porty';
import { nameWorldMap } from './travel';
import { rpc } from './api';
import { TEST } from './version';
import { PORTY_Z_MAPY } from './map/world';

// Stage 1 is on the test server only: ferry landings of the world map get captains there.
PORTY_Z_MAPY.on = TEST && !new URLSearchParams(location.search).has('d'); // not in the QR demo

export interface Port { id: number; nazwa: string; lat: number; lon: number; terminal: string | null }
export interface Rejs { do: Port; km: number; nazwa: string | null; /** Added from a player's request (admin ⚓ Porty). */ zProsby?: boolean }

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
    // Lines added from players' requests (admin panel ⚓ Porty, table port_lines).
    try {
      const extra = await rpc<[string, number, number, string, number, number, number, string | null][]>('game_ports', { p_test: TEST });
      for (const [an, alat, alon, bn, blat, blon, km, nazwa] of extra ?? []) dodaj(znajdzLubDodaj({ nazwa: an, lat: alat, lon: alon }), znajdzLubDodaj({ nazwa: bn, lat: blat, lon: blon }), km, nazwa, true);
    } catch {
      // Offline: the known lines only.
    }
    for (const p of porty) nameWorldMap(portMapId(p), p.nazwa);
  })();
  return ladowanie;
}

function dodaj(a: Port | undefined, b: Port | undefined, km: number, nazwa: string | null, zProsby = false) {
  if (!a || !b || a === b) return;
  for (const [x, y] of [[a, b], [b, a]] as const) {
    const l = linie.get(x.id) ?? [];
    const old = l.find((r) => r.do === y);
    if (old) old.zProsby ||= zProsby;
    else l.push({ do: y, km, nazwa, zProsby });
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

/**
 * Where ferries from this port go: at most PROM.maksKierunkow – the lines added from players' requests first,
 * then the shortest real ones (a fixed list, like a timetable); shown shortest first.
 */
export function rejsyZ(p: Port): Rejs[] {
  const all = [...(linie.get(p.id) ?? [])].sort((a, b) => Number(!!b.zProsby) - Number(!!a.zProsby) || a.km - b.km);
  return all.slice(0, PROM.maksKierunkow).sort((a, b) => a.km - b.km);
}

export const portPoId = (id: number) => porty[id];

/** The world map a ferry lands on (its origin at the port, like far cities' maps). */
export const portMapId = (p: Port) => `w:${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

/** Ticket price. */
export const cenaRejsu = (km: number) => Math.ceil((PROM.oplata + km * PROM.zaKm) / PROM.zaokraglenie) * PROM.zaokraglenie;

/** The id the port's place has on a map. */
export const portKey = (p: Port) => `port:${p.id}`;

/** The catalogue port within 3 km of a point (a ferry landing on the map belongs to it). */
export function portPrzy(at: { lat: number; lon: number }): Port | null {
  return portyBlisko(at, 3)[0] ?? null;
}

export interface Prosba { id: number; at: string; port: string | null; lat: number | null; lon: number | null; text: string; status: 'nowe' | 'dodana' | 'odrzucona'; odpowiedz: string | null }
let prosby: Promise<Prosba[]> | null = null;
/** This character's destination requests and their answers (once per login; `odswiez` after a new one). */
export function mojeProsby(player: string, odswiez = false): Promise<Prosba[]> {
  if (!prosby || odswiez) prosby = rpc<Prosba[] | null>('port_answers', { p_player: player }).then((r) => (Array.isArray(r) ? r : [])).catch(() => []);
  return prosby;
}

/** Asks for a destination the port has no line to; false when the daily limit is reached. */
export function poprosOLinie(player: string, port: string, at: { lat: number; lon: number }, text: string) {
  return rpc<boolean>('port_request', { p_player: player, p_port: port, p_lat: at.lat, p_lon: at.lon, p_text: text }).catch(() => false);
}

/** For tests. */
export const portyStan = () => ({ porty: porty.length, linie: [...linie.values()].reduce((s, l) => s + l.length, 0) / 2 });

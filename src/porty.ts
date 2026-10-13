// Ferry ports of the world (public/porty.json from OpenStreetMap, scripts/promy-osm.mjs,
// plus content/porty.ts LINIE_DOPISANE). Loaded once, on the first world map.
import { LINIE_DOPISANE, PROM } from './content/porty';
import { nameWorldMap } from './travel';
import { rpc } from './api';
import { TEST } from './version';
import { PORTY_Z_MAPY } from './map/world';

// Stage 1 is on the test server only: ferry landings of the world map get captains there.
PORTY_Z_MAPY.on = !new URLSearchParams(location.search).has('d'); // not in the QR demo

export interface Port { id: number; nazwa: string; lat: number; lon: number; terminal: string | null }
export interface Rejs {
  do: Port; km: number; nazwa: string | null; /** Added from a player's request (admin ⚓ Porty). */ zProsby?: boolean;
  /** From the ferry network (public/promy-siec.json): to the country's flagship port, between flagships, or back. */
  siec?: 'flagowy' | 'sasiad' | 'liniowiec' | 'powrot';
}

/** The ferry network (owner, 13 Oct 2026; scripts/promy-siec.py): each country's flagship and its sea neighbours. */
interface Siec {
  kraje: Record<string, [string, string]>;
  porty: Record<string, [string | null, number]>;
  flagowe: Record<string, [string, number, number]>;
  polaczenia: [string, string, number][];
  bezPortu: Record<string, [string, number]>;
  /** Ocean liners between big ports (country pairs; also in polaczenia). */
  liniowce?: [string, string][];
}
let siec: Siec | null = null;
const flagowyPort = new Map<string, Port>();
const sasiedzi = new Map<string, { iso: string; km: number }[]>();

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
    // The network: flagships and their sea neighbours.
    try {
      const res = await fetch('promy-siec.json');
      if (res.ok) {
        siec = (await res.json()) as Siec;
        for (const [iso, [nazwa, lat, lon]] of Object.entries(siec.flagowe)) flagowyPort.set(iso, znajdzLubDodaj({ nazwa, lat, lon }));
        for (const [a, b, km] of siec.polaczenia) {
          for (const [x, y] of [[a, b], [b, a]]) sasiedzi.set(x, [...(sasiedzi.get(x) ?? []), { iso: y, km }]);
        }
      }
    } catch {
      // No network: the real lines only.
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
export function rejsyZ(p: Port, odwiedzone: { lat: number; lon: number }[] = []): Rejs[] {
  const all = [...(linie.get(p.id) ?? [])].sort((a, b) => Number(!!b.zProsby) - Number(!!a.zProsby) || a.km - b.km);
  const out: Rejs[] = all.slice(0, PROM.maksKierunkow);
  const add = (r: Rejs) => {
    if (r.do !== p && !out.some((q) => q.do === r.do || odleglosc(q.do, r.do) < 3)) out.push(r);
  };
  // The network (owner, 13 Oct 2026): every sea port sails to its country's flagship; a flagship sails to the
  // flagships of the countries next to it by sea, and back to the country's small ports the hero has been to.
  const [iso, morski] = krajPortu(p);
  const flag = iso ? flagowyPort.get(iso) : undefined;
  if (iso && flag && morski && flag !== p) add({ do: flag, km: kmMorzem(p, flag), nazwa: null, siec: 'flagowy' });
  if (iso && flag === p) {
    for (const s of sasiedzi.get(iso) ?? []) {
      const f = flagowyPort.get(s.iso);
      const liniowiec = siec?.liniowce?.some(([a, b]) => (a === iso && b === s.iso) || (b === iso && a === s.iso));
      if (f) add({ do: f, km: s.km, nazwa: null, siec: liniowiec ? 'liniowiec' : 'sasiad' });
    }
    for (const o of odwiedzone) {
      const q = portyBlisko(o, 1)[0];
      if (q && q !== p && krajPortu(q)[0] === iso && krajPortu(q)[1]) add({ do: q, km: kmMorzem(p, q), nazwa: null, siec: 'powrot' });
    }
  }
  return out.sort((a, b) => a.km - b.km);
}

/** A port's country (ISO) and whether it is on the open sea (else lakes/rivers: only its real lines). */
export function krajPortu(p: Port): [string | null, boolean] {
  const v = siec?.porty[`${p.lat.toFixed(4)},${p.lon.toFixed(4)}`];
  if (v) return [v[0], !!v[1]];
  // Ports added by hand or from requests: the nearest catalogue port's.
  const q = porty.find((x) => x !== p && odleglosc(x, p) < 5 && siec?.porty[`${x.lat.toFixed(4)},${x.lon.toFixed(4)}`]);
  return q ? krajPortu(q) : [null, false];
}

/** A country's name (Polish), by its ISO code. */
export const nazwaKraju = (iso: string | null) => (iso && siec?.kraje[iso]?.[0]) || '';

/** Sailing between two ports of one coast: the straight line × 1.3 (around capes and islands). */
const kmMorzem = (a: Port, b: Port) => Math.max(5, Math.round(odleglosc(a, b) * 1.3));

/** Diacritics off, lower case – for matching what the player typed. */
const bez = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9 ]+/g, ' ').trim();

/**
 * „🧭 Inne miejsce…”: the way by sea from port `od` to what the player typed (a country, Polish or English, or a
 * port's name): the hops (own flagship → flagships by sea → the destination), their km, and the country's name.
 * A country without ferries leads to the flagship nearest its capital. Null when the text means nothing to us.
 */
export function trasaDo(od: Port, tekst: string): { hops: Port[]; km: number; kraj: string; przez?: string } | null {
  if (!siec) return null;
  const t = bez(tekst);
  if (t.length < 3) return null;
  // A country?
  let iso = Object.keys(siec.kraje).find((k) => siec!.kraje[k].some((n) => bez(n) === t)) ??
    Object.keys(siec.kraje).find((k) => siec!.kraje[k].some((n) => bez(n).startsWith(t) || (t.length >= 5 && t.startsWith(bez(n)))));
  let cel: Port | undefined;
  let przez: string | undefined;
  if (!iso) {
    // A port's name.
    cel = porty.find((q) => bez(q.nazwa) === t) ?? porty.find((q) => t.length >= 4 && bez(q.nazwa).startsWith(t));
    if (!cel) return null;
    iso = krajPortu(cel)[0] ?? undefined;
    if (!iso) return null;
  }
  const kraj = siec.kraje[iso]?.[0] ?? iso;
  if (!flagowyPort.has(iso)) {
    const b = siec.bezPortu[iso];
    if (!b) return null;
    przez = siec.kraje[b[0]]?.[0];
    iso = b[0];
  }
  const [mojKraj] = krajPortu(od);
  const hops: Port[] = [];
  let total = 0;
  let start = mojKraj ? flagowyPort.get(mojKraj) : undefined;
  if (start && start !== od) {
    if (!krajPortu(od)[1]) return null; // a lake or river port: not on the sea network
    hops.push(start);
    total += kmMorzem(od, start);
  }
  if (!start) {
    // A port without a country of ours: the nearest flagship.
    start = [...flagowyPort.values()].sort((a, b) => odleglosc(a, od) - odleglosc(b, od))[0];
    if (!start) return null;
    hops.push(start);
    total += kmMorzem(od, start);
  }
  // Flagship to flagship: the shortest way through the neighbours.
  const startIso = [...flagowyPort.entries()].find(([, f]) => f === start)?.[0];
  if (startIso && startIso !== iso) {
    const dist = new Map<string, number>([[startIso, 0]]);
    const prev = new Map<string, string>();
    const todo = new Set<string>([startIso]);
    while (todo.size) {
      let u = '';
      for (const k of todo) if (!u || dist.get(k)! < dist.get(u)!) u = k;
      todo.delete(u);
      if (u === iso) break;
      for (const s of sasiedzi.get(u) ?? []) {
        const d = dist.get(u)! + s.km;
        if (d < (dist.get(s.iso) ?? Infinity)) {
          dist.set(s.iso, d);
          prev.set(s.iso, u);
          todo.add(s.iso);
        }
      }
    }
    if (!dist.has(iso)) return null;
    const droga: string[] = [];
    for (let k: string | undefined = iso; k && k !== startIso; k = prev.get(k)) droga.unshift(k);
    for (const k of droga) hops.push(flagowyPort.get(k)!);
    total += dist.get(iso)!;
  }
  if (cel && cel !== hops[hops.length - 1] && cel !== od) {
    total += kmMorzem(hops[hops.length - 1] ?? od, cel);
    hops.push(cel);
  }
  return { hops, km: Math.round(total), kraj, przez };
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

// For browser tests (test server only).
if (TEST) (window as unknown as { __porty: unknown }).__porty = { wczytajPorty, rejsyZ, trasaDo, portyBlisko, krajPortu, nazwaKraju };

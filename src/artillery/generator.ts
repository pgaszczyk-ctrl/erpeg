// Generated municipal artillery for every city worldwide (owner, 1 Nov 2026: „miasta zbliżone wielkością mają mieć
// system transportu, na całym świecie, oparte na generatorze”). One recipe turns a city (GeoNames centre + population,
// public/artillery/swiat.json built by scripts/artillery/swiat.py) into its cannon stations and links. The same recipe
// runs on the server (docs/sql/artillery-generator.sql, ma_siec), which checks every flight: keep both in step –
// scripts/tests/artillery-generator.mjs compares them.
// Nominal points only: the game moves each cannon to the nearest free spot by a road when its tiles are in (client.ts).

/** Places with at least this many people get a network. */
export const MIASTO_MIN = 100_000;
/** Rough built-up radius in metres (Lublin 360k ≈ 5.7 km); the outer ring stands just beyond it. */
export const promien = (pop: number) => 9.5 * Math.sqrt(pop);
export const GENERATOR = {
  /** Two central cannons, this share of the radius from the centre on opposite sides. */
  centrum: 0.08,
  /** Inner ring (districts) and outer ring (just past the city's edge), shares of the radius. */
  wewnatrz: 0.55,
  zewnatrz: 1.5,
  /** Airports with scheduled flights within max(airportKm, airportR × radius) of the centre and beyond airportOdR × radius. */
  airportKm: 25,
  airportR: 1.8,
  airportOdR: 0.3,
  maksLotnisk: 2,
  /** Coins per km of a flight, rounded. */
  zaKm: 13,
};

export type Miasto = [id: number, name: string, cc: string, lat: number, lon: number, pop: number];
export type Lotnisko = [ident: string, name: string, lat: number, lon: number];
export type Swiat = { wersja: number; miasta: Miasto[]; lotniska: Lotnisko[] };
export type Stacja = {
  id: string;
  k: number;
  lat: number;
  lon: number;
  rodzaj: 'centrum' | 'dzielnica' | 'rogatka' | 'lotnisko';
  kierunek: number; // 0..7 from north, clockwise
  nazwa?: string; // airport name
};
export type Siec = { miasto: Miasto; stacje: Stacja[]; krawedzie: [number, number][] };

/** Golden-ratio sequence: the same in JS and in PostgreSQL float8 (u(id, k) ∈ [0, 1)). */
export function u(id: number, k: number) {
  const v = id * 0.61803398875 + k * 0.7548776662;
  return v - Math.floor(v);
}
export const liczbaStacji = (pop: number) =>
  Math.min(20, Math.max(5, Math.floor(5 + 2.4 * Math.log2(pop / 100000) + 0.5)));

function punkt(lat: number, lon: number, r: number, a: number) {
  // a: radians clockwise from north
  return { lat: lat + (r * Math.cos(a)) / 111132, lon: lon + (r * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180)) };
}
/** Metres between two lat/lon points (local flat projection; same formula in SQL ma_m). */
export function metry(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const lat = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  return Math.hypot((b.lon - a.lon) * 111320 * Math.cos(lat), (b.lat - a.lat) * 111132);
}
export const cenaZaMetry = (m: number) => Math.max(1, Math.floor((m / 1000) * GENERATOR.zaKm + 0.5));
const kierunek = (a: number) => {
  const t = a / (2 * Math.PI);
  return Math.floor((t - Math.floor(t)) * 8 + 0.5) % 8;
};

export function generujSiec(m: Miasto, lotniska: Lotnisko[]): Siec {
  const [id, , , lat, lon, pop] = m;
  const R = promien(pop), n = liczbaStacji(pop), G = GENERATOR;
  const st: Stacja[] = [];
  const dodaj = (p: { lat: number; lon: number }, rodzaj: Stacja['rodzaj'], a: number, nazwa?: string) =>
    st.push({ id: `c${id}:${st.length}`, k: st.length, lat: p.lat, lon: p.lon, rodzaj, kierunek: kierunek(a), nazwa });
  const a0 = 2 * Math.PI * u(id, 1);
  dodaj(punkt(lat, lon, G.centrum * R, a0), 'centrum', a0);
  dodaj(punkt(lat, lon, G.centrum * R, a0 + Math.PI), 'centrum', a0 + Math.PI);
  const mIn = Math.floor((n - 2) / 3), mOut = n - 2 - mIn;
  const a1 = 2 * Math.PI * u(id, 2);
  const wew: number[] = [], zew: number[] = [];
  for (let j = 0; j < mIn; j++) {
    const a = a1 + (2 * Math.PI * j) / mIn;
    wew.push(st.length);
    dodaj(punkt(lat, lon, G.wewnatrz * R, a), 'dzielnica', a);
  }
  const a2 = 2 * Math.PI * u(id, 3);
  for (let j = 0; j < mOut; j++) {
    const a = a2 + (2 * Math.PI * j) / mOut + (u(id, 10 + j) - 0.5) * 0.35 * ((2 * Math.PI) / mOut);
    const r = G.zewnatrz * R * (1 + (u(id, 40 + j) - 0.5) * 0.12);
    zew.push(st.length);
    dodaj(punkt(lat, lon, r, a), 'rogatka', a);
  }
  // Airports: the nearest ones with scheduled flights, in ident order on ties.
  const srodek = { lat, lon };
  const lot = lotniska
    .map((l) => ({ l, d: metry(srodek, { lat: l[2], lon: l[3] }) }))
    .filter((x) => x.d <= Math.max(G.airportKm * 1000, G.airportR * R) && x.d >= G.airportOdR * R)
    .sort((a, b) => a.d - b.d || (a.l[0] < b.l[0] ? -1 : 1))
    .slice(0, G.maksLotnisk);
  const lotN: number[] = [];
  for (const { l } of lot) {
    lotN.push(st.length);
    const a = Math.atan2((l[3] - lon) * Math.cos((lat * Math.PI) / 180), l[2] - lat);
    dodaj({ lat: l[2], lon: l[3] }, 'lotnisko', a, l[1]);
  }
  // Links.
  const kr = new Set<string>();
  const lacz = (a: number, b: number) => {
    if (a !== b) kr.add(a < b ? `${a},${b}` : `${b},${a}`);
  };
  const najblizszy = (from: number, z: number[]) => {
    let best = z[0], bd = Infinity;
    for (const k of z) {
      const d = metry(st[from], st[k]);
      if (d < bd) (bd = d), (best = k);
    }
    return best;
  };
  lacz(0, 1);
  const pierscien = (r: number[]) => {
    if (r.length === 2) lacz(r[0], r[1]);
    else if (r.length > 2) for (let j = 0; j < r.length; j++) lacz(r[j], r[(j + 1) % r.length]);
  };
  pierscien(wew);
  pierscien(zew);
  for (const k of wew) lacz(k, najblizszy(k, [0, 1]));
  for (const k of zew) lacz(k, najblizszy(k, wew.length ? wew : [0, 1]));
  const miejskie = st.filter((s) => s.rodzaj !== 'lotnisko').map((s) => s.k);
  for (const k of lotN) {
    const bl = [...miejskie].sort((a, b) => metry(st[k], st[a]) - metry(st[k], st[b]) || a - b);
    lacz(k, bl[0]);
    lacz(k, bl[1]);
  }
  const krawedzie = [...kr].map((s) => s.split(',').map(Number) as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { miasto: m, stacje: st, krawedzie };
}

/** The city whose network serves a spot: the nearest kept city whose outer ring (+ 3 km) reaches it. */
export function miastoPrzy(swiat: Swiat, ll: { lat: number; lon: number }): Miasto | null {
  let best: Miasto | null = null, bd = Infinity;
  for (const m of swiat.miasta) {
    if (Math.abs(m[3] - ll.lat) > 0.6) continue;
    const d = metry(ll, { lat: m[3], lon: m[4] });
    if (d <= GENERATOR.zewnatrz * promien(m[5]) * 1.06 + 3000 && d / promien(m[5]) < bd) (bd = d / promien(m[5])), (best = m);
  }
  return best;
}

const KIERUNKI = {
  pl: ['północ', 'północny wschód', 'wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód'],
  en: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
};
/** A readable station name (PL/EN). */
export function nazwaStacji(s: Stacja, siec: Siec, en: boolean) {
  if (s.rodzaj === 'lotnisko') return (en ? 'Airport: ' : 'Lotnisko: ') + (s.nazwa ?? '');
  const kier = (en ? KIERUNKI.en : KIERUNKI.pl)[s.kierunek];
  const ta = siec.stacje.filter((x) => x.rodzaj === s.rodzaj && x.kierunek === s.kierunek);
  const nr = ta.length > 1 ? ' ' + (ta.indexOf(s) + 1) : '';
  if (s.rodzaj === 'centrum') return (en ? 'Centre – ' : 'Centrum – ') + kier + nr;
  if (s.rodzaj === 'dzielnica') return (en ? 'District – ' : 'Dzielnica – ') + kier + nr;
  return (en ? 'City gate – ' : 'Rogatka – ') + kier + nr;
}

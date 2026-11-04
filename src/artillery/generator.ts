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
  /** The longest flight, metres (owner, 2 Nov 2026: „max ok. 7 km”). Links longer than this are not made; stations are
   *  pulled in so every one keeps a link of at most `maksSkok × zapas` to the next one towards the centre. */
  maksSkok: 7000,
  zapas: 0.95,
};

/** woda = bitmask of the city's generated stations (order 0..n-1) that fall on sea/big lakes and are left out
 *  (scripts/artillery/woda.mjs, from Natural Earth land/lakes). */
export type Miasto = [id: number, name: string, cc: string, lat: number, lon: number, pop: number, woda?: number];
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
  kand?: number; // candidate number of a city station (bit of the `woda` mask)
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
  const [id, , , lat, lon, pop] = m, woda = m[6] ?? 0;
  const R = promien(pop), n = liczbaStacji(pop), G = GENERATOR;
  // Within reach of one flight: centres ≤ L apart, every district ≤ L from a centre, every gate ≤ L from a district.
  const L = G.maksSkok * G.zapas;
  const rCen = Math.min(G.centrum * R, L / 2);
  const rWew = Math.min(G.wewnatrz * R, Math.sqrt(Math.max(0, L * L - rCen * rCen)));
  const st: Stacja[] = [];
  let idx = 0; // candidate number, also for the ones on water (woda bits)
  const dodaj = (p: { lat: number; lon: number }, rodzaj: Stacja['rodzaj'], a: number, nazwa?: string) => {
    const kand = rodzaj === 'lotnisko' ? undefined : idx++;
    if (kand !== undefined && Math.floor(woda / 2 ** kand) % 2 === 1) return -1;
    st.push({ id: `c${id}:${st.length}`, k: st.length, lat: p.lat, lon: p.lon, rodzaj, kierunek: kierunek(a), nazwa, kand });
    return st.length - 1;
  };
  const cen: number[] = [], wew: number[] = [], zew: number[] = [];
  const wez = (lista: number[], k: number) => {
    if (k >= 0) lista.push(k);
  };
  const a0 = 2 * Math.PI * u(id, 1);
  wez(cen, dodaj(punkt(lat, lon, rCen, a0), 'centrum', a0));
  wez(cen, dodaj(punkt(lat, lon, rCen, a0 + Math.PI), 'centrum', a0 + Math.PI));
  const mIn = Math.floor((n - 2) / 3), mOut = n - 2 - mIn;
  const a1 = 2 * Math.PI * u(id, 2);
  for (let j = 0; j < mIn; j++) {
    const a = a1 + (2 * Math.PI * j) / mIn;
    wez(wew, dodaj(punkt(lat, lon, rWew, a), 'dzielnica', a));
  }
  const a2 = 2 * Math.PI * u(id, 3);
  const doZew = wew.length ? wew : cen;
  const najblizej = (p: { lat: number; lon: number }, z: number[]) => {
    let d = Infinity;
    for (const k of z) d = Math.min(d, metry(p, st[k]));
    return d;
  };
  for (let j = 0; j < mOut; j++) {
    const a = a2 + (2 * Math.PI * j) / mOut + (u(id, 10 + j) - 0.5) * 0.35 * ((2 * Math.PI) / mOut);
    let r = G.zewnatrz * R * (1 + (u(id, 40 + j) - 0.5) * 0.12);
    // Too far from every district: slide in along its direction (40 halvings, the same in SQL).
    if (doZew.length && najblizej(punkt(lat, lon, r, a), doZew) > L) {
      let lo = 0, hi = r;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (najblizej(punkt(lat, lon, mid, a), doZew) <= L) lo = mid;
        else hi = mid;
      }
      r = lo;
    }
    wez(zew, dodaj(punkt(lat, lon, r, a), 'rogatka', a));
  }
  // Airports: the nearest ones with scheduled flights, in ident order on ties – only those within one flight of a
  // city station.
  const srodek = { lat, lon };
  const miejskieTeraz = st.map((s) => s.k);
  const lot = lotniska
    .map((l) => ({ l, d: metry(srodek, { lat: l[2], lon: l[3] }) }))
    .filter((x) => x.d <= Math.max(G.airportKm * 1000, G.airportR * R) && x.d >= G.airportOdR * R)
    .sort((a, b) => a.d - b.d || (a.l[0] < b.l[0] ? -1 : 1))
    .filter((x) => najblizej({ lat: x.l[2], lon: x.l[3] }, miejskieTeraz) <= G.maksSkok)
    .slice(0, G.maksLotnisk);
  const lotN: number[] = [];
  for (const { l } of lot) {
    const a = Math.atan2((l[3] - lon) * Math.cos((lat * Math.PI) / 180), l[2] - lat);
    lotN.push(dodaj({ lat: l[2], lon: l[3] }, 'lotnisko', a, l[1]));
  }
  // Links.
  const kr = new Set<string>();
  const lacz = (a: number, b: number) => {
    if (a !== b && metry(st[a], st[b]) <= G.maksSkok) kr.add(a < b ? `${a},${b}` : `${b},${a}`);
  };
  const najblizszy = (from: number, z: number[]) => {
    let best = z[0], bd = Infinity;
    for (const k of z) {
      const d = metry(st[from], st[k]);
      if (d < bd) (bd = d), (best = k);
    }
    return best;
  };
  if (cen.length === 2) lacz(cen[0], cen[1]);
  const pierscien = (r: number[]) => {
    if (r.length === 2) lacz(r[0], r[1]);
    else if (r.length > 2) for (let j = 0; j < r.length; j++) lacz(r[j], r[(j + 1) % r.length]);
  };
  pierscien(wew);
  pierscien(zew);
  // Spokes: districts to the nearest centre, gates to the nearest district (each level falls back to the next one in).
  if (cen.length) for (const k of wew) lacz(k, najblizszy(k, cen));
  if (doZew.length) for (const k of zew) lacz(k, najblizszy(k, doZew));
  const miejskie = st.filter((s) => s.rodzaj !== 'lotnisko').map((s) => s.k);
  for (const k of lotN) {
    if (miejskie.length < 1) break;
    const bl = [...miejskie].sort((a, b) => metry(st[k], st[a]) - metry(st[k], st[b]) || a - b);
    lacz(k, bl[0]);
    if (bl.length > 1) lacz(k, bl[1]);
  }
  const surowe = [...kr].map((s) => s.split(',').map(Number) as [number, number]);
  // Only the biggest connected part stays (coastal cities lose inner stations to the sea, and nothing joins the rest
  // within 7 km); ties go to the part with the lowest station; fewer than 2 stations = no network. Same in SQL.
  const czesc = new Array<number>(st.length).fill(-1);
  let najw = -1, ile = 0;
  for (let s0 = 0; s0 < st.length; s0++) {
    if (czesc[s0] >= 0) continue;
    czesc[s0] = s0;
    let n0 = 1;
    for (let rosnie = true; rosnie; ) {
      rosnie = false;
      for (const [a, b] of surowe)
        if ((czesc[a] === s0) !== (czesc[b] === s0)) {
          czesc[a] = czesc[b] = s0;
          n0++;
          rosnie = true;
        }
    }
    if (n0 > ile) (ile = n0), (najw = s0);
  }
  if (ile < 2) return { miasto: m, stacje: [], krawedzie: [] };
  const nowy = new Array<number>(st.length).fill(-1);
  const stacje: Stacja[] = [];
  for (const s0 of st)
    if (czesc[s0.k] === najw) {
      nowy[s0.k] = stacje.length;
      stacje.push({ ...s0, id: `c${id}:${stacje.length}`, k: stacje.length });
    }
  const krawedzie = surowe
    .filter(([a]) => czesc[a] === najw)
    .map(([a, b]) => [nowy[a], nowy[b]] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { miasto: m, stacje, krawedzie };
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

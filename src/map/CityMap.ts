// The city map built from OpenStreetMap (see scripts/build-map.mjs).
// Only type imports here: scripts/split-map.mjs runs this file in Node as is.
// Holds all features in world pixels, a spatial grid for fast lookups,
// collision tests, address search and spawn-point picking.

import type { Terrain } from './terrain';
import type { PlanLochu } from '../loch/plan';

// World pixels per metre. Characters store the scale their start point was
// saved in (map_scale on the server), so changing this is safe.
/**
 * Bigger-world look „B” (src/skala.ts): ×1.5 px per metre only with `?swiat=15` (localStorage `exp-swiat`), else 1.
 * Defined here, not in skala.ts: split-map runs this file in Node, which can't import without a file extension.
 */
export const SKALA_SWIATA = (() => {
  if (typeof location === 'undefined' || typeof localStorage === 'undefined') return 1;
  try {
    const q = new URLSearchParams(location.search).get('swiat');
    if (q === '15') localStorage.setItem('exp-swiat', '15');
    else if (q !== null) localStorage.setItem('exp-swiat', '1');
    return localStorage.getItem('exp-swiat') === '15' ? 1.5 : 1;
  } catch {
    return 1;
  }
})();
/** Pixels per metre the map files' pixel values (index, signs) were made at. */
const PLIK_PX_PER_M = 1.92; // 20% bigger than 1.6, so narrow Old Town streets are passable
/** In-game pixels per metre: ×SKALA_SWIATA (1.5) in the bigger-world look (src/skala.ts). */
export const PX_PER_M = PLIK_PX_PER_M * SKALA_SWIATA;

// Widths in metres of line features.
const LINE_WIDTH_M: Record<string, number> = {
  major: 14, medium: 11, minor: 7, service: 4, track: 3, pedestrian: 6, path: 2.5, steps: 2.5,
  rail: 3, tram: 2.5, river: 14, stream: 3, ditch: 1.5, platform: 4,
};
export type Surface = 'asfalt' | 'sciezka' | 'trawa' | 'las' | 'piasek';
export const ROAD_KINDS = new Set(['major', 'medium', 'minor', 'service', 'track', 'pedestrian', 'path', 'steps']);
/** Roads walked at full speed (the rest are paths and dirt tracks). */
const PAVED_ROADS = new Set(['major', 'medium', 'minor', 'service', 'pedestrian']);
const BLOCKING_LINES = new Set(['river']);
const BLOCKING_AREAS = new Set(['water']);
/** World maps: only along paths (content/gory.ts skalyTylkoSzlakiem). */
const ROUGH_AREAS = new Set(['rock', 'glacier']);

interface Box { x0: number; y0: number; x1: number; y1: number }

/** `id`: the feature's index in the whole map (stable across tiles; seeds use it). */
export interface Area extends Box {
  kind: string;
  rings: number[][];
  id: number;
  /** A pitch inside a stadium's bowl (stadiumGate): the Arena's sand on the test server. */
  arena?: boolean;
}
/** Smallest width of a passage through a building (m). */
const PRZEJSCIE_M = 4;

export interface Line extends Box { kind: string; pts: number[]; width: number; bridge: boolean; pass: boolean; name: string | null; id: number }
export interface Building extends Box {
  rings: number[][];
  addresses: string[];
  name: string | null;
  levels: number;
  seed: number;
  id: number;
  /** Precomputed entrance (tiled maps: known before the building's tile is loaded). */
  door?: { x: number; y: number };
  /** A small shed or garage (world maps): drawn, but doesn't stop the hero or shots. */
  open?: boolean;
  /** A stadium's gate cut through its stands from the south: its two outer corners. */
  brama?: { x0: number; x1: number; y0: number; y1: number };
  /** The stadium's bowl (its hole before the gate was cut). */
  misa?: number[];
}

type RawMap = {
  unitsPerM: number;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  w: number;
  h: number;
  /** Where the map starts (metres, ≤ 0): Lublin reaches west/north of its original corner. */
  x0?: number;
  y0?: number;
  /** Projection origin (Lublin: fixed, so saved positions stay valid). */
  origin?: { lon: number; lat: number; lat0: number };
  boundary: number[][];
  areas: [string, ...number[][]][];
  lines: [string, number, number[], string | 0][];
  buildings: [number[][], string | 0, string | 0, number][];
  pois?: [string, string, number, number, string | 0][];
  /** Post offices, post boxes, parcel lockers (map units; the tiled index has them in px as postsPx). */
  posts?: [number, number][];
  postsPx?: [number, number][];
  /**
   * Tiled map (Lublin): only an index is loaded up front; the features are in
   * tiles of `tile` metres (map/<id>/<cx>_<cy>.json), fetched around the hero.
   * areas then carry their id first; `bld` lists buildings with an address or
   * a name [id, x0, y0, x1, y1, doorX, doorY, addresses, name] (px), `places`
   * [kind, name, placeId, buildingId, doorX, doorY], `streets` [name, x, y].
   */
  tile?: number;
  tiles?: string[];
  bld?: [number, number, number, number, number, number, number, string | 0, string | 0][];
  places?: [string, string, string, number, number, number][];
  streets?: [string, number, number][];
  /** Named towns on the map (split-map: Lublin's centre and lublin-area places): name, x, y. */
  towns?: [string, number, number][];
  /** Road signs (split-map): x, y, then 'Name|km' (the first is the way back to Lublin). */
  signs?: (number | string)[][];
};

export type RawTile = {
  a: [number, string, ...number[][]][];
  l: [number, string, number, number[], string | 0][];
  /** [id, rings, addresses, name, levels, open (world maps: a shed you walk through)] */
  b: [number, number[][], string | 0, string | 0, number, (0 | 1)?][];
  /** World map tiles only: places found there [kind, name, x, y] (px). */
  p?: [Place['kind'], string, number, number][];
  /** World map tiles only: mountain peaks [name, height m, x, y] (px). */
  k?: [string, number, number, number][];
  /** World maps: post offices, post boxes, parcel lockers (px). */
  q?: [number, number][];
};

/** Loads the features of one tile of a world map (see map/world.ts). */
export type WorldLoader = (box: Box) => Promise<RawTile>;

/** A shop or school on the map, with the building it is in and its door. */
export interface Place {
  kind: 'shop' | 'school' | 'church' | 'office' | 'hospital' | 'police' | 'library' | 'merchant' | 'station' | 'hotel' | 'bank' | 'university' | 'alchemist' | 'gear' | 'camp' | 'maker' | 'workshop' | 'port';
  name: string;
  id: string;
  building: Building | null;
  door: { x: number; y: number };
}

const CELL = 256; // px

/** A building's look seed from its id (world map ids go past 2^32). */
const seedOf = (id: number) => Math.imul((id % 2 ** 32) ^ Math.floor(id / 2 ** 32), 2654435761) >>> 0;

function decode(flat: number[], k: number) {
  const out = new Array<number>(flat.length);
  let x = 0;
  let y = 0;
  for (let i = 0; i < flat.length; i += 2) {
    x = i === 0 ? flat[0] : x + flat[i];
    y = i === 0 ? flat[1] : y + flat[i + 1];
    out[i] = x * k;
    out[i + 1] = y * k;
  }
  return out;
}

function bbox(pts: number[], pad = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i];
    if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1];
    if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/** Smallest stadium bowl (a building's hole with a pitch in it) that gets a gate (m²). */
const STADION_MISA_M2 = 3000;
/** Width of the gate cut through a stadium's stands, from the south (m). */
const STADION_BRAMA_M = 12;

function ringArea(r: number[]) {
  let s = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) s += (r[j] - r[i]) * (r[j + 1] + r[i + 1]);
  return Math.abs(s / 2);
}

type Cut = { seg: number; t: number; x: number; y: number };
/** Where the vertical line x = X crosses the ring (every crossing). */
function crossings(r: number[], X: number): Cut[] {
  const out: Cut[] = [];
  const n = r.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = r[i * 2], ay = r[i * 2 + 1], bx = r[((i + 1) % n) * 2], by = r[((i + 1) % n) * 2 + 1];
    if ((ax <= X) === (bx <= X)) continue;
    const t = (X - ax) / (bx - ax);
    out.push({ seg: i, t, x: X, y: ay + t * (by - ay) });
  }
  return out;
}
/** The ring's points from cut P forward to cut Q (both included). */
function arc(r: number[], P: Cut, Q: Cut): number[] {
  const n = r.length / 2;
  const out = [P.x, P.y];
  if (!(P.seg === Q.seg && P.t <= Q.t)) {
    let i = (P.seg + 1) % n;
    for (let k = 0; k < n; k++) {
      out.push(r[i * 2], r[i * 2 + 1]);
      if (i === Q.seg) break;
      i = (i + 1) % n;
    }
  }
  out.push(Q.x, Q.y);
  return out;
}
const inStrip = (pts: number[], a: number, b: number) => {
  for (let i = 2; i < pts.length - 2; i += 2) if (pts[i] < a - 0.5 || pts[i] > b + 0.5) return false;
  return true;
};
const reversed = (pts: number[]) => {
  const out: number[] = [];
  for (let i = pts.length - 2; i >= 0; i -= 2) out.push(pts[i], pts[i + 1]);
  return out;
};
/**
 * A stadium closed by its stands (a ring-shaped building, the pitch in its hole): cut a gate of
 * `w` px through the stands south of the hole, so the outer ring and the hole become one
 * C-shaped outline. Null when the shape doesn't allow a clean cut.
 */
export function stadiumGate(outer: number[], hole: number[], w: number, srodek?: number): { ring: number[]; a: Cut; b: Cut; ha: Cut; hb: Cut } | null {
  const hb = bbox(hole);
  const cx = srodek ?? (hb.x0 + hb.x1) / 2;
  w = Math.min(w, (hb.x1 - hb.x0) * 0.4);
  const a = cx - w / 2, b = cx + w / 2;
  const south = (cs: Cut[]) => cs.reduce<Cut | null>((m, c) => (!m || c.y > m.y ? c : m), null);
  const Ha = south(crossings(hole, a)), Hb = south(crossings(hole, b));
  if (!Ha || !Hb) return null;
  const below = (cs: Cut[], y: number) => cs.filter((c) => c.y > y).reduce<Cut | null>((m, c) => (!m || c.y < m.y ? c : m), null);
  const Oa = below(crossings(outer, a), Ha.y), Ob = below(crossings(outer, b), Hb.y);
  if (!Oa || !Ob) return null;
  // The short arcs (inside the gate's strip) go; the long ones stay.
  let oLong: number[];
  const oF = arc(outer, Oa, Ob);
  if (inStrip(oF, a, b)) oLong = arc(outer, Ob, Oa);
  else if (inStrip(arc(outer, Ob, Oa), a, b)) oLong = reversed(oF);
  else return null;
  let hLong: number[];
  const hF = arc(hole, Ha, Hb);
  if (inStrip(hF, a, b)) hLong = reversed(arc(hole, Hb, Ha));
  else if (inStrip(arc(hole, Hb, Ha), a, b)) hLong = hF;
  else return null;
  // Ob → (around the outside) → Oa → up the gate's west wall → Ha → (around the bowl) → Hb → down to Ob.
  return { ring: [...oLong, ...hLong], a: Oa, b: Ob, ha: Ha, hb: Hb };
}

/** Smallest courtyard (a building's hole) that gets a way out (m²; owner: „większy niż 50 m² plus minus”). */
const PODWORKO_M2 = 50;
/** Width of the hole cut through a courtyard's thinnest wall (m). */
const PODWORKO_PRZEJSCIE_M = 6;

const obroc = (r: number[], c: number, s: number) => {
  const out: number[] = [];
  for (let i = 0; i < r.length; i += 2) out.push(r[i] * c - r[i + 1] * s, r[i] * s + r[i + 1] * c);
  return out;
};
/**
 * A closed courtyard (owner, 18 Oct 2026: „unikaj zamkniętych budynków… zrób dziurę w ścianie”): find the
 * thinnest wall between the hole and the outside (the hole's point nearest to the outer ring), turn both
 * rings so that way points down, cut a gate there with stadiumGate and turn the C-shaped outline back.
 */
export function courtyardGate(outer: number[], hole: number[], w: number): number[] | null {
  // Every few px along the hole's edge: the nearest outer point (wall thickness) and the edge's own normal.
  const kandydaci: { d: number; px: number; py: number; kier: [number, number][] }[] = [];
  const n = hole.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = hole[i * 2], ay = hole[i * 2 + 1], bx = hole[((i + 1) % n) * 2], by = hole[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.5) continue;
    const kroki = Math.max(1, Math.ceil(len / 4));
    for (let k = 0; k < kroki; k++) {
      const x = ax + ((bx - ax) * (k + 0.5)) / kroki, y = ay + ((by - ay) * (k + 0.5)) / kroki;
      let best = Infinity, qx = 0, qy = 0;
      for (let j = 0, m = outer.length / 2; j < m; j++) {
        const cx = outer[j * 2], cy = outer[j * 2 + 1], dx = outer[((j + 1) % m) * 2] - cx, dy = outer[((j + 1) % m) * 2 + 1] - cy;
        const l2 = dx * dx + dy * dy;
        let t = l2 ? ((x - cx) * dx + (y - cy) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(cx + t * dx - x, cy + t * dy - y);
        if (d < best) { best = d; qx = cx + t * dx; qy = cy + t * dy; }
      }
      if (best < 0.01) continue;
      // Two ways through the wall: straight to the nearest outer point, and square to the courtyard's edge.
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      const sNorm: [number, number] = (qx - x) * nx + (qy - y) * ny >= 0 ? [nx, ny] : [-nx, -ny];
      kandydaci.push({ d: best, px: x, py: y, kier: [[(qx - x) / best, (qy - y) / best], sNorm] });
    }
  }
  kandydaci.sort((p, q) => p.d - q.d);
  for (const k of kandydaci.slice(0, 16)) {
    for (const [dx, dy] of k.kier) {
      const ring = gateAlong(outer, hole, w, k.px, k.py, dx, dy);
      if (ring) return ring;
    }
  }
  return null;
}

/** A yard counts as closed when its mouth is narrower than this (m): build-map's merging leaves cracks. */
const PODWORKO_GARDLO_M = 6;
/**
 * A yard closed but for a narrow crack (owner, 18 Oct 2026: a U-shaped school whose wings almost touch):
 * find two corners of the outline closer than PODWORKO_GARDLO_M but far apart along it, with the yard
 * (≥ minArea) behind them; close the crack and cut a proper gate with courtyardGate. Null when there is none.
 */
export function openNarrowYard(ring: number[], minArea: number, w: number): number[] | null {
  const n = ring.length / 2;
  if (n < 6 || n > 600) return null;
  const gardlo = PODWORKO_GARDLO_M * PX_PER_M;
  // Arc length to every vertex (to skip neighbours along the outline).
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(ring[(i % n) * 2] - ring[(i - 1) * 2], ring[(i % n) * 2 + 1] - ring[(i - 1) * 2 + 1]));
  const total = cum[n];
  const odcinek = (i: number, j: number) => { const out: number[] = []; for (let k = i; ; k = (k + 1) % n) { out.push(ring[k * 2], ring[k * 2 + 1]); if (k === j) break; } return out; };
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      const d = Math.hypot(ring[i * 2] - ring[j * 2], ring[i * 2 + 1] - ring[j * 2 + 1]);
      if (d > gardlo) continue;
      const luk = cum[j] - cum[i];
      if (luk < 20 * PX_PER_M || total - luk < 20 * PX_PER_M) continue;
      // The crack's middle is outside the building, and one side of it encloses a yard.
      if (pointInRings([ring], (ring[i * 2] + ring[j * 2]) / 2, (ring[i * 2 + 1] + ring[j * 2 + 1]) / 2)) continue;
      const a = odcinek(i, j), b = odcinek(j, i);
      const [kieszen, reszta] = ringArea(a) < ringArea(b) ? [a, b] : [b, a];
      if (ringArea(kieszen) < minArea) continue;
      const g = courtyardGate(reszta, kieszen, w);
      if (g) return g;
    }
  }
  return null;
}

/** One try: a gate of width w from the courtyard's edge point (px, py) in the direction (dx, dy). */
function gateAlong(outer: number[], hole: number[], w: number, px: number, py: number, dx: number, dy: number): number[] | null {
  // Turn so that (dx, dy) points along +y, cut there along two lines x = a, x = b, turn back.
  const f = Math.atan2(dx, dy), c = Math.cos(f), sn = Math.sin(f);
  const o2 = obroc(outer, c, sn), h2 = obroc(hole, c, sn);
  const X = px * c - py * sn, Y = px * sn + py * c;
  const hb = bbox(h2);
  w = Math.min(w, (hb.x1 - hb.x0) * 0.6, (hb.y1 - hb.y0) * 0.6);
  // Keep both lines inside the courtyard.
  const Xc = Math.min(Math.max(X, hb.x0 + w / 2 + 0.5), hb.x1 - w / 2 - 0.5);
  const g = cutGate(o2, h2, Xc - w / 2, Xc + w / 2, Y);
  if (!g) return null;
  // A sane result: the old wall area minus about the gate's own area (a cut through the wrong place removes much more).
  const przed = ringArea(o2) - ringArea(h2), po = ringArea(g.ring);
  if (!(po < przed + 1 && po > przed - 2 * w * g.glebokosc - 4)) return null;
  return obroc(g.ring, c, -sn);
}

const dlugosc = (pts: number[]) => {
  let l = 0;
  for (let i = 2; i < pts.length; i += 2) l += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return l;
};
/**
 * Joins a hole to its outer ring through a gate between the lines x = a and x = b, starting at the hole's edge
 * near y0 and going +y to the outside. The cut-out arcs are the short ones between the cut points.
 */
function cutGate(outer: number[], hole: number[], a: number, b: number, y0: number): { ring: number[]; glebokosc: number } | null {
  const naj = (cs: Cut[]) => cs.reduce<Cut | null>((m, q) => (!m || Math.abs(q.y - y0) < Math.abs(m.y - y0) ? q : m), null);
  const Ha = naj(crossings(hole, a)), Hb = naj(crossings(hole, b));
  if (!Ha || !Hb) return null;
  const ponizej = (cs: Cut[], y: number) => cs.filter((q) => q.y > y).reduce<Cut | null>((m, q) => (!m || q.y < m.y ? q : m), null);
  const Oa = ponizej(crossings(outer, a), Ha.y), Ob = ponizej(crossings(outer, b), Hb.y);
  if (!Oa || !Ob) return null;
  // Both sides of the gate go through the same wall (similar depth), else the cut would slice the building.
  const da = Oa.y - Ha.y, db = Ob.y - Hb.y;
  if (Math.abs(da - db) > Math.max(1.5 * PX_PER_M, 0.25 * Math.min(da, db))) return null;
  const oF = arc(outer, Oa, Ob), oB = arc(outer, Ob, Oa);
  const oLong = dlugosc(oF) < dlugosc(oB) ? oB : reversed(oF);
  const hF = arc(hole, Ha, Hb), hB = arc(hole, Hb, Ha);
  const hLong = dlugosc(hF) < dlugosc(hB) ? reversed(hB) : hF;
  const ring = [...oLong, ...hLong];
  // The gate must be open across its whole width, from the courtyard to the outside.
  for (let u = 0.15; u <= 0.86; u += 0.175) {
    const x = a + (b - a) * u;
    const y0g = Math.max(Ha.y, Hb.y), y1g = Math.min(Oa.y, Ob.y);
    for (const t of [0.25, 0.5, 0.75]) if (pointInRings([ring], x, y0g + (y1g - y0g) * t)) return null;
  }
  return { ring, glebokosc: (da + db) / 2 };
}

export function pointInRings(rings: number[][], x: number, y: number) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const yi = r[i + 1];
      const yj = r[j + 1];
      if (yi > y !== yj > y) {
        const xi = r[i];
        const xj = r[j];
        if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

export function distToPolyline(pts: number[], x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 2; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - x, ey = ay + t * dy - y;
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Lower-case, no "ul."/"al.", single spaces: used to compare addresses. */
export function normAddress(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(ul|al|pl|os)\.\s*/g, '')
    .replace(/\b(ulica|aleja|aleje)\s+/g, '')
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

class Grid<T extends Box> {
  private cells = new Map<number, T[]>();
  constructor(items: T[]) {
    for (const it of items) this.add(it);
  }
  add(it: T) {
    for (let cx = Math.floor(it.x0 / CELL); cx <= Math.floor(it.x1 / CELL); cx++)
      for (let cy = Math.floor(it.y0 / CELL); cy <= Math.floor(it.y1 / CELL); cy++) {
        const k = cx * 100000 + cy;
        let c = this.cells.get(k);
        if (!c) this.cells.set(k, (c = []));
        c.push(it);
      }
  }
  at(x: number, y: number): T[] {
    return this.cells.get(Math.floor(x / CELL) * 100000 + Math.floor(y / CELL)) ?? [];
  }
  query(b: Box): Set<T> {
    const out = new Set<T>();
    for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++)
      for (let cy = Math.floor(b.y0 / CELL); cy <= Math.floor(b.y1 / CELL); cy++) {
        const c = this.cells.get(cx * 100000 + cy);
        if (c) for (const it of c) if (it.x1 >= b.x0 && it.x0 <= b.x1 && it.y1 >= b.y0 && it.y0 <= b.y1) out.add(it);
      }
    return out;
  }
}

export class CityMap {
  readonly width: number;
  readonly height: number;
  readonly boundary: number[][];
  readonly areas: Area[];
  readonly lines: Line[];
  readonly buildings: Building[];
  private areaGrid: Grid<Area>;
  private lineGrid: Grid<Line>;
  private buildingGrid: Grid<Building>;
  private boundaryCells = new Map<number, 0 | 1 | 2>(); // 0 out, 1 in, 2 edge
  private byAddress = new Map<string, Building>();
  private origin: { lon: number; lat: number; lat0: number };
  /** The map spans minX..width and minY..height (px); minX/minY are ≤ 0. */
  readonly minX: number;
  readonly minY: number;
  readonly places: Place[] = [];
  /** Buildings with a name (for address search by name). */
  private named: Building[] = [];

  // Tiled maps (see RawMap.tile).
  private k = 1;
  private tilePx = 0;
  private tileSet: { has(k: number): boolean } | null = null;
  /** World maps (map/world.ts): every tile exists and is made from the world map. */
  private world: WorldLoader | null = null;
  /** World maps: heights of the ground (hill shading, steep slopes, slower uphill). */
  terrain: Terrain | null = null;
  private placeListeners = new Set<(p: Place[]) => void>();
  private loadedTiles = new Set<number>();
  private pendingTiles = new Map<number, Promise<void>>();
  private tileBase = '';
  private stubs = new Map<number, Building>();
  private haveArea = new Set<number>();
  private haveLine = new Set<number>();
  private haveBuilding = new Set<number>();
  private streets = new Map<string, { x: number; y: number }>();
  /** Post offices, post boxes and parcel lockers (decorations: the pneumatic post pillar). */
  readonly posts: { x: number; y: number }[] = [];
  /** Road signs on the roads out of town: where to and how many km along the roads. */
  readonly signs: { x: number; y: number; to: { name: string; km: number }[] }[] = [];
  /** World maps: named mountain peaks with their height (they come with the tiles). */
  readonly peaks: { name: string; ele: number; x: number; y: number }[] = [];
  private namedTowns: { name: string; x: number; y: number }[] = [];
  private tileListeners = new Set<(box: Box) => void>();

  /** 'lublin' or a town id (public/map/towns/<id>.json). */
  readonly id: string;

  constructor(raw: RawMap, id = 'lublin') {
    this.id = id;
    // Pixel values in the map files are at PLIK_PX_PER_M.
    const sp = PX_PER_M / PLIK_PX_PER_M;
    for (const [name, x, y] of raw.towns ?? []) this.namedTowns.push({ name, x: x * sp, y: y * sp });
    for (const [x, y, ...to] of raw.signs ?? [])
      this.signs.push({ x: (x as number) * sp, y: (y as number) * sp, to: (to as string[]).map((t) => ({ name: t.split('|')[0], km: Number(t.split('|')[1]) })) });
    this.origin = raw.origin ?? { lon: raw.bounds.minLon, lat: raw.bounds.maxLat, lat0: (raw.bounds.minLat + raw.bounds.maxLat) / 2 };
    const k = PX_PER_M / raw.unitsPerM;
    this.width = raw.w * PX_PER_M;
    this.height = raw.h * PX_PER_M;
    this.minX = (raw.x0 ?? 0) * PX_PER_M;
    this.minY = (raw.y0 ?? 0) * PX_PER_M;
    this.boundary = raw.boundary.map((r) => decode(r, k));
    this.k = k;
    this.areas = [];
    this.lines = [];
    this.buildings = [];
    this.areaGrid = new Grid<Area>([]);
    this.lineGrid = new Grid<Line>([]);
    this.buildingGrid = new Grid<Building>([]);

    for (const [ux, uy] of raw.posts ?? []) this.posts.push({ x: ux * k, y: uy * k });
    for (const [px, py] of raw.postsPx ?? []) this.posts.push({ x: px * sp, y: py * sp });
    if (raw.tiles) {
      this.initTiled(raw, id);
      return;
    }
    raw.areas.forEach(([kind, ...rings], i) => this.addArea(i, kind, rings));
    raw.lines.forEach(([kind, flags, pts, name], i) => this.addLine(i, kind, flags, pts, name));
    raw.buildings.forEach(([rings, addr, name, levels], i) => this.addBuilding(i, rings, addr, name, levels));
    this.cutStadiums();
    this.cutCourtyards();
    for (const b of this.buildings) {
      for (const a of b.addresses) {
        const key = normAddress(a);
        if (!this.byAddress.has(key)) this.byAddress.set(key, b);
      }
      if (b.name) this.named.push(b);
    }

    // Shops and schools: inside a building, or the nearest one close by.
    for (const [kind, name, ux, uy, addr] of raw.pois ?? []) this.addPlace(kind as Place['kind'], name, ux * k, uy * k, addr, `${kind}:${Math.round(ux)}:${Math.round(uy)}`);
  }

  /** An underground map (src/loch/mapa.ts): its maze plan; MapRenderer paints nothing, scenes/Lochy.ts does. */
  loch?: PlanLochu;

  private placeBuildings = new Set<Building>();
  /** A place at (x, y) px: in the building there, or the nearest one close by. */
  private addPlace(kind: Place['kind'], name: string, x: number, y: number, addr: string | 0 | undefined, key: string) {
    const id = `${this.id === 'lublin' ? '' : `${this.id}/`}${key}`;
    if (this.placeIds.has(id)) return null;
    // One station once (OSM often has it as a node, an area and a building).
    if (kind === 'station' && this.places.some((q) => q.kind === 'station' && q.name === name && Math.hypot(q.door.x - x, q.door.y - y) < 300 * PX_PER_M)) return null;
    // Travelling merchants and coachmen stand in the street, not in a building.
    // Two landings of one ferry port (a node and an area in OSM): one captain.
    if (kind === 'port' && this.places.some((q) => q.kind === 'port' && Math.hypot(q.door.x - x, q.door.y - y) < 300 * PX_PER_M)) return null;
    const street = kind === 'merchant' || kind === 'station' || kind === 'port';
    let b = street ? null : this.buildingAt(x, y) ?? (addr ? this.findBuilding(addr) : undefined) ?? null;
    if (!b && !street) {
      let best = 40 * PX_PER_M;
      for (const c of this.buildingGrid.query({ x0: x - best, y0: y - best, x1: x + best, y1: y + best })) {
        const d = Math.hypot((c.x0 + c.x1) / 2 - x, (c.y0 + c.y1 - 20) / 2 - y);
        if (d < best) {
          best = d;
          b = c;
        }
      }
    }
    // A maker may share an entrance; loading it first must not hide an existing shop.
    if (b && this.placeBuildings.has(b) && kind !== 'maker' && kind !== 'workshop'
      && this.places.some(p => p.building === b && p.kind !== 'maker' && p.kind !== 'workshop')) return null;
    if (b) this.placeBuildings.add(b);
    this.placeIds.add(id);
    const place: Place = { kind, name, id, building: b, door: b ? this.entranceOf(b) : kind === 'station' || kind === 'port' ? this.freeNear(x, y) : { x, y } };
    this.places.push(place);
    return place;
  }
  private placeIds = new Set<string>();

  /** Curated real businesses can be added without rebuilding the terrain/map extract. */
  addProducer(name: string, address: string, lat: number, lon: number, kind: 'maker' | 'workshop' = 'maker') {
    if (!this.hasLatLon(lat, lon)) return null;
    const p = this.fromLatLon(lat, lon);
    return this.addPlace(kind, name, p.x, p.y, address,
      `${kind}:${lat.toFixed(7)}:${lon.toFixed(7)}${kind === 'workshop' ? `:${name}` : ''}`);
  }

  /**
   * A ferry port from the world list (porty.ts): the captain stands on the nearest spot one can walk away
   * from (the terminal may be on the quay). Call once its tile is loaded.
   */
  addPort(key: string, name: string, lat: number, lon: number) {
    const id = `${this.id === 'lublin' ? '' : `${this.id}/`}${key}`;
    if (this.placeIds.has(id)) return null;
    const p = this.fromLatLon(lat, lon);
    this.placeIds.add(id);
    const place: Place = { kind: 'port', name, id, building: null, door: this.reachableNear(p.x, p.y) };
    this.places.push(place);
    return place;
  }

  /** World maps: called with the places each new tile brings. */
  onPlaces(f: (p: Place[]) => void) {
    this.placeListeners.add(f);
    return () => this.placeListeners.delete(f);
  }

  private addArea(id: number, kind: string, rings: number[][]) {
    if (this.haveArea.has(id)) return;
    this.haveArea.add(id);
    const abs = rings.map((r) => decode(r, this.k));
    const a: Area = { kind, rings: abs, id, ...bbox(abs[0]) };
    this.areas.push(a);
    this.areaGrid.add(a);
    if (kind === 'pitch') this.newPitches.push(a);
  }

  private addLine(id: number, kind: string, flags: number, pts: number[], name: string | 0) {
    if (this.haveLine.has(id)) return;
    this.haveLine.add(id);
    const abs = decode(pts, this.k);
    const width = (LINE_WIDTH_M[kind] ?? 3) * PX_PER_M;
    const l: Line = { kind, pts: abs, width, bridge: !!(flags & 1), pass: !!(flags & 2), name: name || null, id, ...bbox(abs, width / 2 + 2) };
    this.lines.push(l);
    this.lineGrid.add(l);
  }

  private addBuilding(id: number, rings: number[][], addr: string | 0, name: string | 0, levels: number, open?: 0 | 1) {
    if (this.haveBuilding.has(id)) return;
    this.haveBuilding.add(id);
    const abs = rings.map((r) => decode(r, this.k));
    // Pad the box downwards: walls are drawn below the footprint.
    const bb = bbox(abs[0], 2);
    const stub = this.stubs.get(id);
    const b: Building = stub ?? { rings: abs, addresses: addr ? addr.split(' | ') : [], name: name || null, levels, seed: seedOf(id), id, ...bb, y1: bb.y1 + 20 };
    if (stub) Object.assign(stub, { rings: abs, levels, ...bb, y1: bb.y1 + 20 });
    if (open) b.open = true;
    this.buildings.push(b);
    this.buildingGrid.add(b);
    if (abs.length > 1) this.newHoled.push(b);
    // Every building is checked once for closed yards (holes or narrow-mouthed pockets).
    if (!open) this.podworka.add(b);
  }

  private newPitches: Area[] = [];
  private newHoled: Building[] = [];
  /** Buildings whose courtyards still wait for a way out (cutCourtyards). */
  private podworka = new Set<Building>();
  private gated = new Set<Building>();
  /**
   * Stadiums closed by their stands (owner: „zrób wyrwę, zawsze od południa”): a ring-shaped
   * building whose hole holds a pitch gets a gate through its stands from the south.
   */
  private cutStadiums() {
    const pairs = new Set<[Building, Area]>();
    const tryPair = (b: Building, a: Area) => {
      if (this.gated.has(b)) {
        if (b.misa && pointInRings([b.misa], (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2)) a.arena = true;
      } else if (b.rings.length > 1) pairs.add([b, a]);
    };
    for (const a of this.newPitches) for (const b of this.buildingGrid.at((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2)) tryPair(b, a);
    for (const b of this.newHoled) for (const a of this.areaGrid.query(b)) if (a.kind === 'pitch') tryPair(b, a);
    for (const b of this.newHoled) this.podworka.add(b);
    this.newPitches = [];
    this.newHoled = [];
    for (const [b, a] of pairs) {
      if (this.gated.has(b)) continue;
      const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
      const hi = b.rings.findIndex((r, i) => i > 0 && ringArea(r) >= STADION_MISA_M2 * PX_PER_M * PX_PER_M && pointInRings([r], cx, cy));
      if (hi < 0) continue;
      const g = stadiumGate(b.rings[0], b.rings[hi], STADION_BRAMA_M * PX_PER_M);
      if (!g) continue;
      this.gated.add(b);
      b.misa = b.rings[hi];
      b.rings = [g.ring, ...b.rings.filter((_, i) => i > 0 && i !== hi)];
      b.brama = { x0: g.a.x, y0: g.a.y, x1: g.b.x, y1: g.b.y };
      for (const q of this.areaGrid.query(b)) if (q.kind === 'pitch' && pointInRings([b.misa], (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2)) q.arena = true;
      // A paved way through the gate (no tree grows in it, and it shows the way in).
      const gx = (g.a.x + g.b.x) / 2, gy = Math.max(g.a.y, g.b.y);
      const top = Math.min(g.ha.y, g.hb.y);
      const y0 = gy + 18 * PX_PER_M, y1 = top - 6 * PX_PER_M;
      this.addLine(-1 - b.id, 'pedestrian', 0, [gx / this.k, y0 / this.k, 0, (y1 - y0) / this.k], 0);
    }
  }

  /**
   * Courtyards (holes ≥ PODWORKO_M2) get a way out through their thinnest wall, so no closed yard traps the hero.
   * A hole big enough to be a stadium bowl waits until its tiles are in and no pitch lies in it (cutStadiums
   * gives those their southern gate).
   */
  private cutCourtyards() {
    const min = PODWORKO_M2 * PX_PER_M * PX_PER_M, misa = STADION_MISA_M2 * PX_PER_M * PX_PER_M;
    for (const b of [...this.podworka]) {
      let czeka = false;
      const pominiete = new Set<number[]>();
      for (let guard = 0; guard < 8; guard++) {
        const hi = b.rings.findIndex((r, i) => {
          if (i === 0 || pominiete.has(r) || ringArea(r) < min) return false;
          if (ringArea(r) < misa) return true;
          const bb = bbox(r);
          if (!this.ready(bb)) { czeka = true; return false; }
          return ![...this.areaGrid.query(bb)].some((a) => a.kind === 'pitch' && pointInRings([r], (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2));
        });
        if (hi < 0) break;
        const ring = courtyardGate(b.rings[0], b.rings[hi], PODWORKO_PRZEJSCIE_M * PX_PER_M);
        // Not cuttable cleanly: this hole stays as it is.
        if (!ring) { pominiete.add(b.rings[hi]); continue; }
        b.rings = [ring, ...b.rings.filter((_, i) => i > 0 && i !== hi)];
      }
      // Yards whose mouth is only a crack (merged wings almost touching).
      for (let guard = 0; guard < 4; guard++) {
        const r = openNarrowYard(b.rings[0], min, PODWORKO_PRZEJSCIE_M * PX_PER_M);
        if (!r) break;
        b.rings = [r, ...b.rings.slice(1)];
      }
      if (!czeka) this.podworka.delete(b);
    }
  }

  /** A tiled map: the index (boundary, big areas, addresses, places, streets). */
  private initTiled(raw: RawMap, id: string) {
    this.tilePx = raw.tile! * PX_PER_M;
    this.tileSet = new Set(raw.tiles!.map((t) => {
      const [cx, cy] = t.split(',').map(Number);
      return cx * 100000 + cy;
    }));
    for (const [aid, kind, ...rings] of raw.areas as unknown as [number, string, ...number[][]][]) this.addArea(aid, kind, rings);
    const sp = PX_PER_M / PLIK_PX_PER_M;
    for (const [bid, x0, y0, x1, y1, dx, dy, addr, name] of raw.bld ?? []) {
      const b: Building = { rings: [], addresses: addr ? addr.split(' | ') : [], name: name || null, levels: 1, seed: seedOf(bid), id: bid, x0: x0 * sp, y0: y0 * sp, x1: x1 * sp, y1: y1 * sp, door: { x: dx * sp, y: dy * sp } };
      this.stubs.set(bid, b);
      for (const a of b.addresses) {
        const key = normAddress(a);
        if (!this.byAddress.has(key)) this.byAddress.set(key, b);
      }
      if (b.name) this.named.push(b);
    }
    for (const [kind, name, pid, bid, dx, dy] of raw.places ?? []) {
      this.places.push({ kind: kind as Place['kind'], name, id: pid, building: this.stubs.get(bid) ?? null, door: { x: dx * sp, y: dy * sp } });
    }
    for (const [name, x, y] of raw.streets ?? []) this.streets.set(normAddress(name), { x: x * sp, y: y * sp });
    this.tileBase = `map/${id}/`;
  }

  private tileKey(x: number, y: number) {
    return Math.floor(x / this.tilePx) * 100000 + Math.floor(y / this.tilePx);
  }

  /** Is everything inside `box` loaded? (always true for maps without tiles) */
  ready(box: Box) {
    if (!this.tileSet) return true;
    for (let cx = Math.floor(box.x0 / this.tilePx); cx <= Math.floor(box.x1 / this.tilePx); cx++)
      for (let cy = Math.floor(box.y0 / this.tilePx); cy <= Math.floor(box.y1 / this.tilePx); cy++) {
        const k = cx * 100000 + cy;
        if (this.tileSet.has(k) && !this.loadedTiles.has(k)) return false;
      }
    return true;
  }

  /** Loads the tiles within `r` px of (x, y) (nothing to do for maps without tiles). */
  ensure(x: number, y: number, r: number): Promise<void> {
    if (!this.tileSet) return Promise.resolve();
    const jobs: Promise<void>[] = [];
    for (let cx = Math.floor((x - r) / this.tilePx); cx <= Math.floor((x + r) / this.tilePx); cx++)
      for (let cy = Math.floor((y - r) / this.tilePx); cy <= Math.floor((y + r) / this.tilePx); cy++) {
        const k = cx * 100000 + cy;
        if (this.loadedTiles.has(k)) continue;
        if (!this.tileSet.has(k)) {
          this.loadedTiles.add(k); // nothing there
          continue;
        }
        let job = this.pendingTiles.get(k);
        if (!job) {
          const box = { x0: cx * this.tilePx, y0: cy * this.tilePx, x1: (cx + 1) * this.tilePx, y1: (cy + 1) * this.tilePx };
          // Phones on mobile data sometimes drop a request ("Failed to fetch"): try again twice.
          const get = () =>
            this.world
              ? this.world(box)
              : fetch(`${this.tileBase}${cx}_${cy}.json`).then((res) => {
                  if (!res.ok) throw new Error(`Nie udało się wczytać kawałka mapy (${res.status})`);
                  return res.json() as Promise<RawTile>;
                });
          job = retry(get, 3)
            .then((t) => this.addTile(cx, cy, t))
            .finally(() => this.pendingTiles.delete(k));
          this.pendingTiles.set(k, job);
        }
        jobs.push(job);
      }
    return Promise.all(jobs).then(() => undefined);
  }

  private addTile(cx: number, cy: number, t: RawTile) {
    for (const [aid, kind, ...rings] of t.a) this.addArea(aid, kind, rings);
    for (const [lid, kind, flags, pts, name] of t.l) this.addLine(lid, kind, flags, pts, name);
    for (const [bid, rings, addr, name, levels, open] of t.b) {
      this.addBuilding(bid, rings, addr, name, levels, open);
      if (this.world && addr) {
        const b = this.buildings[this.buildings.length - 1];
        for (const a of b.addresses) if (!this.byAddress.has(normAddress(a))) this.byAddress.set(normAddress(a), b);
      }
    }
    this.cutStadiums();
    this.cutCourtyards();
    for (const [x, y] of t.q ?? []) this.posts.push({ x, y });
    for (const [name, ele, x, y] of t.k ?? []) {
      if (!this.peaks.some((q) => q.name === name && Math.abs(q.x - x) < 200 && Math.abs(q.y - y) < 200)) this.peaks.push({ name, ele, x, y });
    }
    // Loaded before its places are added: a door is picked among free spots, and an
    // unloaded tile counts as blocked – so every door fell back into the middle of its roof.
    this.loadedTiles.add(cx * 100000 + cy);
    if (t.p?.length) {
      const added = t.p.map(([kind, name, x, y]) => this.addPlace(kind, name, x, y, 0, `${kind}:${Math.round(x / this.k)}:${Math.round(y / this.k)}`)).filter((p): p is Place => !!p);
      if (added.length) for (const f of this.placeListeners) f(added);
    }
    this.surfaces.clear();
    const box = { x0: cx * this.tilePx, y0: cy * this.tilePx, x1: (cx + 1) * this.tilePx, y1: (cy + 1) * this.tilePx };
    for (const f of this.tileListeners) f(box);
  }

  /** Every building with an address (the whole map, loaded or not). */
  addressed(): Building[] {
    if (this.world) return this.buildings.filter((b) => b.addresses.length); // grows as tiles come
    this.addressedCache ??= (this.tileSet ? [...this.stubs.values()] : this.buildings).filter((b) => b.addresses.length);
    return this.addressedCache;
  }
  private addressedCache?: Building[];

  /**
   * Villages on the map: addresses without a street ("Jastków 12"), at least
   * 8 buildings, each at the door nearest the middle of its houses.
   */
  settlements(): { name: string; x: number; y: number }[] {
    if (this.settlementsCache) return this.settlementsCache;
    const streets = this.tileSet ? new Set(this.streets.keys()) : new Set(this.lines.filter((l) => l.name).map((l) => normAddress(l.name!)));
    const groups = new Map<string, { x: number; y: number }[]>();
    for (const b of this.addressed()) {
      const m = b.addresses[0].match(/^(.*\D)\s+\d+\S*$/);
      if (!m) continue;
      const name = m[1].trim();
      if (streets.has(normAddress(name))) continue;
      let g = groups.get(name);
      if (!g) groups.set(name, (g = []));
      g.push(this.entranceOf(b));
    }
    const out: { name: string; x: number; y: number }[] = [];
    for (const [name, pts] of groups) {
      if (pts.length < 8) continue;
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const mid = pts.reduce((a, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? p : a));
      out.push({ name, x: mid.x, y: mid.y });
    }
    this.settlementsCache = out;
    return out;
  }
  private settlementsCache?: { name: string; x: number; y: number }[];

  /** Called with the box of every tile that arrives (to redraw the map there). */
  onTile(f: (box: Box) => void) {
    this.tileListeners.add(f);
    return () => this.tileListeners.delete(f);
  }

  /**
   * A map of any place on Earth made from the world map as the hero walks
   * (map/world.ts): projected around `origin`, tiles of 1 km.
   */
  static world(id: string, origin: { lat: number; lon: number }, loader: (map: CityMap) => WorldLoader) {
    const far = 3_000_000; // metres each way: as good as endless
    const d = 0.01;
    const m = new CityMap({
      unitsPerM: 2, w: far, h: far, x0: -far, y0: -far,
      bounds: { minLat: origin.lat - d, maxLat: origin.lat + d, minLon: origin.lon - d, maxLon: origin.lon + d },
      origin: { lon: origin.lon, lat: origin.lat, lat0: origin.lat },
      boundary: [], areas: [], lines: [], buildings: [],
    }, id);
    m.tilePx = 1000 * PX_PER_M;
    m.tileSet = { has: () => true };
    m.world = loader(m);
    return m;
  }

  /** Map pixels per stored unit (half-metres). */
  get unitPx() {
    return this.k;
  }

  static async load(url: string, id = 'lublin') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Nie udało się wczytać mapy (${res.status})`);
    return new CityMap(await res.json(), id);
  }

  /** The walkable spot on a street or path nearest to (x, y). */
  freeNear(x: number, y: number): { x: number; y: number } {
    let best = { x, y, d: Infinity };
    for (let r = 20 * PX_PER_M; r <= 320 * PX_PER_M && best.d === Infinity; r *= 2) {
      for (const l of this.lineGrid.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })) {
        if (!ROAD_KINDS.has(l.kind)) continue;
        for (let i = 0; i + 3 < l.pts.length; i += 2) {
          const ax = l.pts[i], ay = l.pts[i + 1], bx = l.pts[i + 2], by = l.pts[i + 3];
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const steps = Math.ceil(len / 4);
          for (let s = 0; s <= steps; s++) {
            const px = ax + ((bx - ax) * s) / steps;
            const py = ay + ((by - ay) * s) / steps;
            const d = Math.hypot(px - x, py - y);
            if (d < best.d && d <= r && this.isFree(px, py, 4, 4)) best = { x: px, y: py, d };
          }
        }
      }
    }
    return { x: best.x, y: best.y };
  }

  /**
   * Can the hero walk from (x, y) at least `m` metres away? (A railway
   * platform between tracks or a fenced yard can look free but lead nowhere.)
   */
  reachesFar(x: number, y: number, m = 400): boolean {
    const step = 3 * PX_PER_M;
    const R = m * PX_PER_M;
    const seen = new Set<string>();
    const queue: [number, number][] = [[0, 0]];
    seen.add('0,0');
    while (queue.length && seen.size < 60000) {
      const [i, j] = queue.shift()!;
      if (Math.hypot(i, j) * step >= R) return true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        const k = `${ni},${nj}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (this.isFree(x + ni * step, y + nj * step, 3, 3)) queue.push([ni, nj]);
      }
    }
    return false;
  }

  /** Like freeNear, but a spot the hero can walk away from (the nearest road point that isn't a dead-end island). */
  reachableNear(x: number, y: number): { x: number; y: number } {
    if (this.isFree(x, y, 4, 4) && this.reachesFar(x, y)) return { x, y };
    const cands: { x: number; y: number; d: number }[] = [];
    const r = 400 * PX_PER_M;
    for (const l of this.lineGrid.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })) {
      if (!ROAD_KINDS.has(l.kind)) continue;
      for (let i = 0; i + 1 < l.pts.length; i += 2) {
        const px = l.pts[i], py = l.pts[i + 1];
        const d = Math.hypot(px - x, py - y);
        if (d <= r) cands.push({ x: px, y: py, d });
      }
    }
    cands.sort((a, b) => a.d - b.d);
    let tries = 0;
    for (const c of cands) {
      if (!this.isFree(c.x, c.y, 4, 4)) continue;
      if (this.reachesFar(c.x, c.y)) return { x: c.x, y: c.y };
      if (++tries > 25) break;
    }
    return this.freeNear(x, y);
  }

  /**
   * Where a long train drops the hero in a far city: its real station nearest
   * the city's point (within 2 km; the point itself can be a river island),
   * else that point, moved to a spot he can walk away from.
   */
  arrivalNear(x: number, y: number): { x: number; y: number } {
    let best: { x: number; y: number } | null = null;
    let bd = 2000 * PX_PER_M;
    for (const p of this.places) {
      if (p.kind !== 'station') continue;
      const d = Math.hypot(p.door.x - x, p.door.y - y);
      if (d < bd) { bd = d; best = p.door; }
    }
    const at = best ?? { x, y };
    return this.reachableNear(at.x, at.y);
  }

  /** Same projection as scripts/build-map.mjs, in world pixels. */
  fromLatLon(lat: number, lon: number) {
    const { lon: oLon, lat: oLat, lat0 } = this.origin;
    const mLat = 111132.954 - 559.822 * Math.cos((2 * lat0 * Math.PI) / 180);
    const mLon = 111412.84 * Math.cos((lat0 * Math.PI) / 180);
    return { x: (lon - oLon) * mLon * PX_PER_M, y: (oLat - lat) * mLat * PX_PER_M };
  }

  /** Is this latitude/longitude on this map (inside its boundary)? */
  hasLatLon(lat: number, lon: number) {
    const p = this.fromLatLon(lat, lon);
    return p.x >= this.minX && p.y >= this.minY && p.x <= this.width && p.y <= this.height && this.insideCity(p.x, p.y);
  }

  /**
   * The shortest way from `a` to `b` along streets and paths (A* over the road
   * lines around both points), as a flat [x0, y0, x1, y1, …] polyline from a
   * to b, or null when they are not connected.
   */
  roadPath(a: { x: number; y: number }, b: { x: number; y: number }): number[] | null {
    const m = 400;
    const box = { x0: Math.min(a.x, b.x) - m, y0: Math.min(a.y, b.y) - m, x1: Math.max(a.x, b.x) + m, y1: Math.max(a.y, b.y) + m };
    // Nodes are line points rounded to 2 px, so crossing streets share them.
    const key = (x: number, y: number) => `${Math.round(x / 2)}:${Math.round(y / 2)}`;
    const pos = new Map<string, [number, number]>();
    const adj = new Map<string, { k: string; d: number }[]>();
    const link = (k1: string, k2: string, d: number) => {
      if (!adj.has(k1)) adj.set(k1, []);
      adj.get(k1)!.push({ k: k2, d });
    };
    for (const l of this.lineGrid.query(box)) {
      if (!ROAD_KINDS.has(l.kind)) continue;
      for (let i = 0; i + 3 < l.pts.length; i += 2) {
        const x1 = l.pts[i], y1 = l.pts[i + 1], x2 = l.pts[i + 2], y2 = l.pts[i + 3];
        const k1 = key(x1, y1), k2 = key(x2, y2);
        if (k1 === k2) continue;
        pos.set(k1, [x1, y1]);
        pos.set(k2, [x2, y2]);
        const d = Math.hypot(x2 - x1, y2 - y1);
        link(k1, k2, d);
        link(k2, k1, d);
      }
    }
    const nearest = (p: { x: number; y: number }) => {
      let best: string | null = null;
      let bd = Infinity;
      for (const [k, [x, y]] of pos) {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      return best;
    };
    const s = nearest(a);
    const t = nearest(b);
    if (!s || !t) return null;
    const [tx, ty] = pos.get(t)!;
    const h = (k: string) => {
      const [x, y] = pos.get(k)!;
      return Math.hypot(x - tx, y - ty);
    };
    // A* with a small binary heap.
    const g = new Map<string, number>([[s, 0]]);
    const from = new Map<string, string>();
    const heap: [number, string][] = [[h(s), s]];
    const push = (item: [number, string]) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m2 = i;
          if (l < heap.length && heap[l][0] < heap[m2][0]) m2 = l;
          if (r < heap.length && heap[r][0] < heap[m2][0]) m2 = r;
          if (m2 === i) break;
          [heap[m2], heap[i]] = [heap[i], heap[m2]];
          i = m2;
        }
      }
      return top;
    };
    const done = new Set<string>();
    while (heap.length) {
      const [, k] = pop();
      if (k === t) break;
      if (done.has(k)) continue;
      done.add(k);
      const gk = g.get(k)!;
      for (const e of adj.get(k) ?? []) {
        const ng = gk + e.d;
        if (ng < (g.get(e.k) ?? Infinity)) {
          g.set(e.k, ng);
          from.set(e.k, k);
          push([ng + h(e.k), e.k]);
        }
      }
    }
    if (!g.has(t)) return null;
    const pts: number[] = [b.x, b.y];
    for (let k: string | undefined = t; k; k = from.get(k)) {
      const [x, y] = pos.get(k)!;
      pts.push(x, y);
    }
    pts.push(a.x, a.y);
    // Reverse into a → b order.
    const out: number[] = [];
    for (let i = pts.length - 2; i >= 0; i -= 2) out.push(pts[i], pts[i + 1]);
    return out;
  }

  /** Is an area of this kind at (x, y) or up to `r` px away (checked in 8 directions)? */
  areaNear(x: number, y: number, r: number, kind: string) {
    for (let i = -1; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = i < 0 ? x : x + Math.cos(a) * r;
      const py = i < 0 ? y : y + Math.sin(a) * r;
      if (this.areaKindsAt(px, py).includes(kind)) return true;
    }
    return false;
  }

  /** A river, stream, pond or lake within `r` px. */
  nearWater(x: number, y: number, r: number) {
    for (const l of this.lineGrid.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })) {
      if ((l.kind === 'river' || l.kind === 'stream') && distToPolyline(l.pts, x, y) <= r + l.width / 2) return true;
    }
    return this.areaNear(x, y, r, 'water');
  }

  /** The other way round: world pixels to latitude and longitude. */
  toLatLon(x: number, y: number) {
    const { lon: oLon, lat: oLat, lat0 } = this.origin;
    const mLat = 111132.954 - 559.822 * Math.cos((2 * lat0 * Math.PI) / 180);
    const mLon = 111412.84 * Math.cos((lat0 * Math.PI) / 180);
    return { lat: oLat - y / PX_PER_M / mLat, lon: oLon + x / PX_PER_M / mLon };
  }

  /**
   * What the hero walks on at (x, y), for the walking speed (content/podloze.ts):
   * a road for cars or a paved square, a path or dirt track, or else the
   * topmost area there (forest, sand, or grass for everything else).
   */
  surfaceAt(x: number, y: number): Surface {
    // Remembered on a 2 m grid (the big paved areas are slow to test); cleared when tiles arrive.
    const k = Math.floor(x / 4) * 4_000_000 + Math.floor(y / 4);
    let v = this.surfaces.get(k);
    if (!v) {
      v = this.surfaceNow(x, y);
      if (this.surfaces.size > 200_000) this.surfaces.clear();
      this.surfaces.set(k, v);
    }
    return v;
  }
  private surfaces = new Map<number, Surface>();

  private surfaceNow(x: number, y: number): Surface {
    let path = false;
    for (const l of this.lineGrid.at(x, y)) {
      if (!ROAD_KINDS.has(l.kind) || distToPolyline(l.pts, x, y) > l.width / 2) continue;
      if (PAVED_ROADS.has(l.kind)) return 'asfalt';
      path = true;
    }
    let top: Area | null = null;
    for (const a of this.areaGrid.at(x, y)) {
      if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1 || !pointInRings(a.rings, x, y)) continue;
      // Paved streets and squares win wherever they are in the draw order.
      if (a.kind === 'paved' || a.kind === 'plaza' || a.kind === 'parking') return 'asfalt';
      if (!top || a.id > top.id) top = a;
    }
    if (path) return 'sciezka';
    if (top && (top.kind === 'forest' || top.kind === 'scrub')) return 'las';
    if (top && top.kind === 'sand') return 'piasek';
    return 'trawa';
  }

  query(box: Box) {
    return {
      areas: [...this.areaGrid.query(box)],
      lines: [...this.lineGrid.query(box)],
      buildings: [...this.buildingGrid.query(box)],
    };
  }

  /**
   * Finds a building by address ("Zamkowa 9", "al. Racławickie 1") or by its
   * name ("Zamek w Lublinie"). Exact match first, then a looser one where the
   * house number must match and every word of the street must appear.
   */
  findBuilding(query: string): Building | undefined {
    const q = normAddress(query);
    const exact = this.byAddress.get(q);
    if (exact) return exact;
    const m = q.match(/^(.*\D)\s+(\d+[a-z]?)$/);
    if (m) {
      const words = m[1].split(' ').filter((w) => w.length > 1);
      for (const [addr, b] of this.byAddress) {
        const am = addr.match(/^(.*\D)\s+(\S+)$/);
        if (am && am[2] === m[2] && words.every((w) => am[1].includes(w))) return b;
      }
    }
    return this.named.find((b) => normAddress(b.name!) === q) ?? this.named.find((b) => normAddress(b.name!).includes(q));
  }

  buildingAt(x: number, y: number): Building | undefined {
    for (const b of this.buildingGrid.at(x, y)) {
      if (b.open) continue;
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && pointInRings(b.rings, x, y)) return b;
    }
    return undefined;
  }

  insideCity(x: number, y: number) {
    if (this.world) return true;
    const k = Math.floor(x / CELL) * 100000 + Math.floor(y / CELL);
    let s = this.boundaryCells.get(k);
    if (s === undefined) {
      const cx = Math.floor(x / CELL) * CELL;
      const cy = Math.floor(y / CELL) * CELL;
      const corners = [[cx, cy], [cx + CELL, cy], [cx, cy + CELL], [cx + CELL, cy + CELL]].map(([a, b]) => pointInRings(this.boundary, a, b));
      // Any boundary vertex inside the cell makes it an edge cell too.
      let edge = corners.some((c) => c !== corners[0]);
      if (!edge) {
        outer: for (const r of this.boundary)
          for (let i = 0; i < r.length; i += 2)
            if (r[i] >= cx && r[i] <= cx + CELL && r[i + 1] >= cy && r[i + 1] <= cy + CELL) {
              edge = true;
              break outer;
            }
      }
      s = edge ? 2 : corners[0] ? 1 : 0;
      this.boundaryCells.set(k, s);
    }
    return s === 2 ? pointInRings(this.boundary, x, y) : s === 1;
  }

  /** Nearest road line whose centre is within its own half-width of (x, y). */
  roadAt(x: number, y: number): Line | undefined {
    for (const l of this.lineGrid.at(x, y)) {
      if (!ROAD_KINDS.has(l.kind)) continue;
      if (distToPolyline(l.pts, x, y) <= l.width / 2) return l;
    }
    return undefined;
  }

  isBlocked(x: number, y: number): boolean {
    if (x < this.minX || y < this.minY || x > this.width || y > this.height || !this.insideCity(x, y)) return true;
    // Not loaded yet: nobody walks there until it is.
    if (this.tileSet && !this.loadedTiles.has(this.tileKey(x, y)) && this.tileSet.has(this.tileKey(x, y))) return true;
    const lines = this.lineGrid.at(x, y);
    let onBridge = false;
    let onPassage = false;
    for (const l of lines) {
      if (!(l.bridge || l.pass)) continue;
      const d = distToPolyline(l.pts, x, y);
      if (l.bridge && d <= l.width / 2) onBridge = true;
      // A gateway through a building: at least PRZEJSCIE_M wide whatever the path's class, so the hero's feet box
      // fits (a footway's 2.5 m left a strip of under a pixel – the owner saw the arch but couldn't get through).
      if (l.pass && d <= Math.max(l.width / 2, (PRZEJSCIE_M / 2) * PX_PER_M)) onPassage = true;
    }
    if (!onPassage && this.buildingAt(x, y)) return true;
    if (onBridge) return false;
    if (this.terrain && this.roughOffPath(x, y)) return true;
    // Water blocks, but a road or path over it always wins: many bridges,
    // footbridges and culverts aren't marked as bridges in the map data, and
    // paths on river banks brush the (drawn wider) river.
    for (const a of this.areaGrid.at(x, y)) {
      if (BLOCKING_AREAS.has(a.kind) && x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && pointInRings(a.rings, x, y)) return !this.onRoad(lines, x, y);
    }
    for (const l of lines) {
      if (BLOCKING_LINES.has(l.kind) && distToPolyline(l.pts, x, y) <= l.width / 2) return !this.onRoad(lines, x, y);
    }
    return false;
  }

  /** Is (x, y) on a road or path (one of `lines`)? */
  private onRoad(lines: Line[], x: number, y: number) {
    // 2 m beyond the drawn edge: a narrow footbridge left the hero's feet a 3 px wide strip over a river (report 64).
    for (const l of lines) if (ROAD_KINDS.has(l.kind) && distToPolyline(l.pts, x, y) <= l.width / 2 + 2 * PX_PER_M) return true;
    // Railway bridges too (bug report 65): the tracks over water can be walked along, a little wider than the track bed.
    for (const l of lines) if ((l.kind === 'rail' || l.kind === 'tram') && distToPolyline(l.pts, x, y) <= l.width / 2 + 1.5 * PX_PER_M) return true;
    return false;
  }

  /**
   * World maps: how much a steep slope off any path slows the walk (1 = not at all): from GORY.stromoBezSzlaku
   * it drops from naStromym to naStromymMin at the cliff (urwisko), where roughOffPath blocks.
   */
  steepFactor(x: number, y: number) {
    const t = this.terrain;
    if (!t) return 1;
    const s = t.slopeAt(x, y), st = t.steep;
    if (!(s > st.from)) return 1;
    if (this.nearPath(x, y)) return 1;
    const k = Math.min(1, (s - st.from) / (t.maxSlope - st.from));
    return st.slow + (st.min - st.slow) * k;
  }

  nearPath(x: number, y: number) {
    const m = 3 * PX_PER_M; // the hero's feet may stick out of a narrow path
    for (const l of this.lineGrid.query({ x0: x - m, y0: y - m, x1: x + m, y1: y + m }))
      if (ROAD_KINDS.has(l.kind) && distToPolyline(l.pts, x, y) <= l.width / 2 + m) return true;
    return false;
  }

  /** World maps: a cliff (GORY.urwisko), or rock/ice, and not on (or right by) a path or road. */
  private roughOffPath(x: number, y: number) {
    const t = this.terrain!;
    let rough = t.slopeAt(x, y) > t.maxSlope;
    if (!rough && t.rockOnlyPaths)
      for (const a of this.areaGrid.at(x, y))
        if (ROUGH_AREAS.has(a.kind) && x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && pointInRings(a.rings, x, y)) {
          rough = true;
          break;
        }
    if (!rough) return false;
    return !this.nearPath(x, y);
  }

  /** Is a feet box of the given half size free at (x, y)? */
  isFree(x: number, y: number, hw: number, hh: number) {
    return !(
      this.isBlocked(x - hw, y - hh) || this.isBlocked(x + hw, y - hh) ||
      this.isBlocked(x - hw, y + hh) || this.isBlocked(x + hw, y + hh)
    );
  }

  /** A random walkable spot on a street or footpath. */
  randomSpawn(rand = Math.random): { x: number; y: number } {
    const candidates = this.lines.filter((l) => l.kind === 'minor' || l.kind === 'path' || l.kind === 'pedestrian');
    for (let tries = 0; tries < 500; tries++) {
      const l = candidates[Math.floor(rand() * candidates.length)];
      const i = Math.floor(rand() * (l.pts.length / 2 - 1)) * 2;
      const t = rand();
      const x = l.pts[i] + (l.pts[i + 2] - l.pts[i]) * t;
      const y = l.pts[i + 1] + (l.pts[i + 3] - l.pts[i + 1]) * t;
      if (this.isFree(x, y, 4, 4)) return { x, y };
    }
    return { x: this.width / 2, y: this.height / 2 };
  }

  /** Point on the building outline closest to a street: where its door is. */
  entranceOf(b: Building): { x: number; y: number } {
    if (b.door) return b.door;
    const r = b.rings[0];
    let best = { x: (b.x0 + b.x1) / 2, y: b.y1 - 40, d: Infinity };
    // Nothing free around it yet (its neighbours not loaded, or walled in): at least a spot just
    // outside a wall, nearest a road – never the middle of the roof.
    let outside: { x: number; y: number; d: number } | null = null;
    let found = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const mx = (r[i] + r[j]) / 2;
      const my = (r[i + 1] + r[j + 1]) / 2;
      // Step slightly outside the wall, in both directions, and keep the free side.
      const nx = -(r[i + 1] - r[j + 1]);
      const ny = r[i] - r[j];
      const nl = Math.hypot(nx, ny) || 1;
      for (const s of [1, -1]) {
        const px = mx + (nx / nl) * 6 * s;
        const py = my + (ny / nl) * 6 * s;
        let d = Infinity;
        for (const l of this.lineGrid.at(px, py)) if (ROAD_KINDS.has(l.kind)) d = Math.min(d, distToPolyline(l.pts, px, py));
        if (this.isBlocked(px, py)) {
          if (!this.buildingAt(px, py) && (!outside || d < outside.d)) outside = { x: px, y: py, d };
          continue;
        }
        if (!found || d < best.d) best = { x: px, y: py, d };
        found = true;
      }
    }
    if (!found && outside) return { x: outside.x, y: outside.y };
    return { x: best.x, y: best.y };
  }

  /**
   * Start point for "Ulica" or "Ulica numer": a building's door if the
   * address exists, otherwise a free spot on the named street.
   */
  /**
   * The address of the house nearest (x, y) (works without map tiles: the index
   * knows every address and its door), with the nearby town added outside
   * Lublin – e.g. "Paryska 5" or "Kościelna 12, Garbów".
   */
  nearestAddress(x: number, y: number, maxM = 3000): string | null {
    let best: Building | null = null;
    let bd = maxM * PX_PER_M;
    for (const b of this.addressed()) {
      const e = this.entranceOf(b);
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (!best) return null;
    const addr = best.addresses[0];
    const town = this.namedTowns
      .filter((t) => t.name !== 'Lublin')
      .map((t) => ({ t, d: Math.hypot(t.x - x, t.y - y) }))
      .sort((a, b) => a.d - b.d)[0];
    // Street addresses near a named town get its name (village addresses already carry one).
    if (town && town.d < 4000 * PX_PER_M && !addr.startsWith(town.t.name) && /\D\s+\d/.test(addr)) {
      const lub = this.namedTowns.find((t) => t.name === 'Lublin');
      if (!lub || Math.hypot(lub.x - x, lub.y - y) > town.d) return `${addr}, ${town.t.name}`;
    }
    return addr;
  }

  /** Towns and villages a start address can name: the index's towns plus the villages. */
  townList(): { name: string; x: number; y: number }[] {
    const out = [...this.namedTowns];
    for (const s of this.settlements()) if (!out.some((t) => normAddress(t.name) === normAddress(s.name))) out.push(s);
    return out;
  }

  /**
   * A start address that may name a town: "Garbów", "Kościelna 5, Garbów",
   * "Garbów, Kościelna" or "Kościelna Garbów". Without a town it is Lublin
   * (`fallback` when nothing else is given). Streets are looked up nearest
   * the town, so the same street name in two places is not mixed up.
   */
  findAnyStart(query: string, fallback: string): { x: number; y: number } | null {
    const q = query.trim();
    if (/\d/.test(q)) {
      const b = this.findBuilding(q);
      if (b) return this.entranceOf(b);
    }
    const towns = this.townList();
    // Town names match without Polish letters too ("garbow").
    const fold = (t: string) => normAddress(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
    const parts = q.split(',').map((p) => p.trim()).filter(Boolean);
    let town: { name: string; x: number; y: number } | null = null;
    const rest: string[] = [];
    for (const p of parts) {
      const t: { name: string; x: number; y: number } | false | undefined = !town && towns.find((t) => fold(t.name) === fold(p));
      if (t) town = t;
      else rest.push(p);
    }
    if (!town) {
      // "Kościelna 5 Garbów": the town at the end, without a comma.
      const nq = fold(q);
      const t = towns.filter((t) => nq.endsWith(` ${fold(t.name)}`)).sort((a, b) => b.name.length - a.name.length)[0];
      if (t) {
        town = t;
        rest.length = 0;
        rest.push(q.slice(0, q.length - t.name.length).replace(/[,\s]+$/, ''));
      }
    }
    const street = rest.join(' ').trim();
    if (!town || fold(town.name) === 'lublin') return this.findStart(street || (town ? fallback : q) || fallback);
    if (!street) return { x: town.x, y: town.y };
    // The nearest building on that street (and with that number, if given) within 6 km of the town.
    const want = normAddress(street);
    const bare = want.replace(/\s+\d+[a-z]?$/, '');
    let best: Building | null = null;
    let bd = 6000 * PX_PER_M;
    let exact = false;
    for (const b of this.addressed()) {
      const hit = b.addresses.map(normAddress).find((a) => a === want || a.startsWith(`${bare} `));
      if (!hit) continue;
      const e = this.entranceOf(b);
      const d = Math.hypot(e.x - town.x, e.y - town.y);
      const isExact = hit === want;
      if (d < bd && (isExact || !exact)) {
        best = b;
        bd = d;
        exact = isExact;
      } else if (isExact && !exact && d < 6000 * PX_PER_M) {
        best = b;
        bd = d;
        exact = true;
      }
    }
    return best ? this.entranceOf(best) : null;
  }

  findStart(query: string): { x: number; y: number } | null {
    const q = normAddress(query);
    if (!q) return null;
    if (/\d/.test(q)) {
      const b = this.findBuilding(query);
      if (b) return this.entranceOf(b);
    }
    const street = q.replace(/\s+\d+[a-z]?$/, '');
    if (this.tileSet && !this.world) {
      const exact = this.streets.get(street);
      if (exact) return exact;
      for (const [n, p] of this.streets) if (n.includes(street)) return p;
      return null;
    }
    const lines = this.lines.filter((l) => l.name && ROAD_KINDS.has(l.kind) && normAddress(l.name) === street);
    const loose = lines.length ? lines : this.lines.filter((l) => l.name && ROAD_KINDS.has(l.kind) && normAddress(l.name).includes(street));
    if (!loose.length) return null;
    // Middle of the longest piece of that street, nudged until free.
    const len = (l: Line) => {
      let d = 0;
      for (let i = 2; i < l.pts.length; i += 2) d += Math.hypot(l.pts[i] - l.pts[i - 2], l.pts[i + 1] - l.pts[i - 1]);
      return d;
    };
    const l = loose.reduce((a, b) => (len(a) >= len(b) ? a : b));
    const n = l.pts.length / 2;
    for (let k = 0; k < n; k++) {
      const i = ((Math.floor(n / 2) + k) % n) * 2;
      if (this.isFree(l.pts[i], l.pts[i + 1], 4, 4)) return { x: l.pts[i], y: l.pts[i + 1] };
    }
    return { x: l.pts[0], y: l.pts[1] };
  }

  /** Kinds of areas covering a point (e.g. to hide the player in a forest). */
  areaKindsAt(x: number, y: number): string[] {
    const out: string[] = [];
    for (const a of this.areaGrid.at(x, y)) {
      if (x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && pointInRings(a.rings, x, y)) out.push(a.kind);
    }
    return out;
  }

  /** A human description of a place: street or nearest address. */
  describe(x: number, y: number): string {
    const b = this.buildingAt(x, y - 12) ?? this.buildingAt(x, y + 12);
    return b?.addresses[0] ?? this.streetNear(x, y, 200) ?? (this.id === 'lublin' ? 'bezdroża Lublina' : 'bezdroża');
  }

  /** Street name nearest to a point (for the HUD). */
  streetNear(x: number, y: number, radius = 60): string | null {
    let best: string | null = null;
    let bd = radius;
    const near = radius > CELL / 2 ? this.lineGrid.query({ x0: x - radius, y0: y - radius, x1: x + radius, y1: y + radius }) : this.lineGrid.at(x, y);
    for (const l of near) {
      if (!l.name || !ROAD_KINDS.has(l.kind)) continue;
      const d = distToPolyline(l.pts, x, y);
      if (d < bd) {
        bd = d;
        best = l.name;
      }
    }
    return best;
  }
}

/** Runs `fn` up to `times` times, waiting a bit longer after each failure. */
function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  return fn().catch((e) => {
    if (times <= 1) throw e;
    return new Promise<T>((ok, bad) => setTimeout(() => retry(fn, times - 1).then(ok, bad), 700));
  });
}

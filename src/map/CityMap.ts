// The city map built from OpenStreetMap (see scripts/build-map.mjs).
// Holds all features in world pixels, a spatial grid for fast lookups,
// collision tests, address search and spawn-point picking.

// World pixels per metre. Characters store the scale their start point was
// saved in (map_scale on the server), so changing this is safe.
export const PX_PER_M = 1.92; // 20% bigger than 1.6, so narrow Old Town streets are passable

// Widths in metres of line features.
const LINE_WIDTH_M: Record<string, number> = {
  major: 14, medium: 11, minor: 7, service: 4, track: 3, pedestrian: 6, path: 2.5, steps: 2.5,
  rail: 3, tram: 2.5, river: 14, stream: 3, ditch: 1.5,
};
export const ROAD_KINDS = new Set(['major', 'medium', 'minor', 'service', 'track', 'pedestrian', 'path', 'steps']);
const BLOCKING_LINES = new Set(['river']);
const BLOCKING_AREAS = new Set(['water']);

interface Box { x0: number; y0: number; x1: number; y1: number }

export interface Area extends Box { kind: string; rings: number[][] }
export interface Line extends Box { kind: string; pts: number[]; width: number; bridge: boolean; pass: boolean; name: string | null }
export interface Building extends Box {
  rings: number[][];
  addresses: string[];
  name: string | null;
  levels: number;
  seed: number;
}

type RawMap = {
  unitsPerM: number;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  w: number;
  h: number;
  boundary: number[][];
  areas: [string, ...number[][]][];
  lines: [string, number, number[], string | 0][];
  buildings: [number[][], string | 0, string | 0, number][];
  pois?: [string, string, number, number, string | 0][];
};

/** A shop or school on the map, with the building it is in and its door. */
export interface Place {
  kind: 'shop' | 'school' | 'church' | 'office' | 'hospital' | 'police' | 'library' | 'merchant' | 'station';
  name: string;
  id: string;
  building: Building | null;
  door: { x: number; y: number };
}

const CELL = 256; // px

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

function distToPolyline(pts: number[], x: number, y: number) {
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
    for (const it of items) {
      for (let cx = Math.floor(it.x0 / CELL); cx <= Math.floor(it.x1 / CELL); cx++)
        for (let cy = Math.floor(it.y0 / CELL); cy <= Math.floor(it.y1 / CELL); cy++) {
          const k = cx * 100000 + cy;
          let c = this.cells.get(k);
          if (!c) this.cells.set(k, (c = []));
          c.push(it);
        }
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
  private bounds: RawMap['bounds'];
  readonly places: Place[] = [];

  /** 'lublin' or a town id (public/map/towns/<id>.json). */
  readonly id: string;

  constructor(raw: RawMap, id = 'lublin') {
    this.id = id;
    this.bounds = raw.bounds;
    const k = PX_PER_M / raw.unitsPerM;
    this.width = raw.w * PX_PER_M;
    this.height = raw.h * PX_PER_M;
    this.boundary = raw.boundary.map((r) => decode(r, k));

    this.areas = raw.areas.map(([kind, ...rings]) => {
      const abs = rings.map((r) => decode(r, k));
      return { kind, rings: abs, ...bbox(abs[0]) };
    });
    this.lines = raw.lines.map(([kind, flags, pts, name]) => {
      const abs = decode(pts, k);
      const width = (LINE_WIDTH_M[kind] ?? 3) * PX_PER_M;
      return { kind, pts: abs, width, bridge: !!(flags & 1), pass: !!(flags & 2), name: name || null, ...bbox(abs, width / 2 + 2) };
    });
    this.buildings = raw.buildings.map(([rings, addr, name, levels], i) => {
      const abs = rings.map((r) => decode(r, k));
      // Pad the box downwards: walls are drawn below the footprint.
      const b = bbox(abs[0], 2);
      return {
        rings: abs,
        addresses: addr ? addr.split(' | ') : [],
        name: name || null,
        levels,
        seed: i * 2654435761 >>> 0,
        ...b,
        y1: b.y1 + 20,
      };
    });

    this.areaGrid = new Grid(this.areas);
    this.lineGrid = new Grid(this.lines);
    this.buildingGrid = new Grid(this.buildings);
    for (const b of this.buildings) for (const a of b.addresses) {
      const key = normAddress(a);
      if (!this.byAddress.has(key)) this.byAddress.set(key, b);
    }

    // Shops and schools: inside a building, or the nearest one close by.
    const seen = new Set<Building>();
    for (const [kind, name, ux, uy, addr] of raw.pois ?? []) {
      const x = ux * k;
      const y = uy * k;
      // Travelling merchants and coachmen stand in the street, not in a building.
      const street = kind === 'merchant' || kind === 'station';
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
      if (b && seen.has(b)) continue;
      if (b) seen.add(b);
      this.places.push({
        kind: kind as Place['kind'],
        name,
        id: `${id === 'lublin' ? '' : `${id}/`}${kind}:${Math.round(ux)}:${Math.round(uy)}`,
        building: b,
        door: b ? this.entranceOf(b) : kind === 'station' ? this.freeNear(x, y) : { x, y },
      });
    }
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

  /** Same projection as scripts/build-map.mjs, in world pixels. */
  fromLatLon(lat: number, lon: number) {
    const { minLat, maxLat, minLon } = this.bounds;
    const lat0 = (minLat + maxLat) / 2;
    const mLat = 111132.954 - 559.822 * Math.cos((2 * lat0 * Math.PI) / 180);
    const mLon = 111412.84 * Math.cos((lat0 * Math.PI) / 180);
    return { x: (lon - minLon) * mLon * PX_PER_M, y: (maxLat - lat) * mLat * PX_PER_M };
  }

  /** The other way round: world pixels to latitude and longitude. */
  toLatLon(x: number, y: number) {
    const { minLat, maxLat, minLon } = this.bounds;
    const lat0 = (minLat + maxLat) / 2;
    const mLat = 111132.954 - 559.822 * Math.cos((2 * lat0 * Math.PI) / 180);
    const mLon = 111412.84 * Math.cos((lat0 * Math.PI) / 180);
    return { lat: maxLat - y / PX_PER_M / mLat, lon: minLon + x / PX_PER_M / mLon };
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
    return this.buildings.find((b) => b.name && normAddress(b.name) === q) ?? this.buildings.find((b) => b.name && normAddress(b.name).includes(q));
  }

  buildingAt(x: number, y: number): Building | undefined {
    for (const b of this.buildingGrid.at(x, y)) {
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && pointInRings(b.rings, x, y)) return b;
    }
    return undefined;
  }

  insideCity(x: number, y: number) {
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
    if (x < 0 || y < 0 || x > this.width || y > this.height || !this.insideCity(x, y)) return true;
    const lines = this.lineGrid.at(x, y);
    let onBridge = false;
    let onPassage = false;
    for (const l of lines) {
      if (!(l.bridge || l.pass)) continue;
      if (distToPolyline(l.pts, x, y) <= l.width / 2) {
        if (l.bridge) onBridge = true;
        if (l.pass) onPassage = true;
      }
    }
    if (!onPassage && this.buildingAt(x, y)) return true;
    if (onBridge) return false;
    for (const a of this.areaGrid.at(x, y)) {
      if (BLOCKING_AREAS.has(a.kind) && x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && pointInRings(a.rings, x, y)) return true;
    }
    for (const l of lines) {
      if (BLOCKING_LINES.has(l.kind) && distToPolyline(l.pts, x, y) <= l.width / 2) return true;
    }
    return false;
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
    const r = b.rings[0];
    let best = { x: (b.x0 + b.x1) / 2, y: b.y1 - 40, d: Infinity };
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
        if (this.isBlocked(px, py)) continue;
        let d = Infinity;
        for (const l of this.lineGrid.at(px, py)) if (ROAD_KINDS.has(l.kind)) d = Math.min(d, distToPolyline(l.pts, px, py));
        if (d < best.d) best = { x: px, y: py, d };
      }
    }
    return { x: best.x, y: best.y };
  }

  /**
   * Start point for "Ulica" or "Ulica numer": a building's door if the
   * address exists, otherwise a free spot on the named street.
   */
  findStart(query: string): { x: number; y: number } | null {
    const q = normAddress(query);
    if (!q) return null;
    if (/\d/.test(q)) {
      const b = this.findBuilding(query);
      if (b) return this.entranceOf(b);
    }
    const street = q.replace(/\s+\d+[a-z]?$/, '');
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
    return b?.addresses[0] ?? this.streetNear(x, y, 200) ?? 'bezdroża Lublina';
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

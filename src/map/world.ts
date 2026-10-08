// Maps of any place on Earth, made from the Protomaps world map (one big
// file of OpenStreetMap vector tiles, read in small pieces). Our own maps
// (Lublin, the region's towns) are prepared ahead in build-map; a world map
// is made while the hero walks: each 1 km tile of the game is made from the
// zoom-15 world tiles under it (see CityMap.world).
//
// Where the world map lives: WORLD_BASE (Cloudflare R2, world.json names the
// current file). `?world=<url of a .pmtiles file>` overrides it for tests.

import { PMTiles, type Source, type RangeResponse } from 'pmtiles';
import { VectorTile, type VectorTileFeature } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { Terrain } from './terrain';
import { SZOPY } from '../content/budynki';
import { CityMap, PX_PER_M, type Place, type RawTile, type WorldLoader } from './CityMap';

/** The bucket with world.json and the world map file (set once the owner's Cloudflare R2 is ready). */
export const WORLD_BASE = 'https://pub-e885d1b5314941a1bc22df18bed8e25d.r2.dev';
const Z = 15;

let pm: Promise<PMTiles> | null = null;

/** The world map file (opened once). */
function worldFile(): Promise<PMTiles> {
  pm ??= (async () => {
    const override = new URLSearchParams(location.search).get('world');
    if (override) return new PMTiles(override);
    if (!WORLD_BASE) throw new Error('Mapa świata nie jest jeszcze gotowa');
    const res = await fetch(`${WORLD_BASE}/world.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Nie udało się wczytać mapy świata (${res.status})`);
    const { file } = (await res.json()) as { file: string };
    return new PMTiles(`${WORLD_BASE}/${file}`);
  })();
  pm.catch(() => (pm = null));
  return pm;
}

/** For tests in Node: read the world map from any source (e.g. a local file). */
export function useWorldSource(src: Source) {
  pm = Promise.resolve(new PMTiles(src));
}
export type { Source, RangeResponse };

/** A world map around (lat, lon). Its id carries the place, so saves can find it again. */
export function worldMap(lat: number, lon: number) {
  const id = `w:${lat.toFixed(4)},${lon.toFixed(4)}`;
  return CityMap.world(id, { lat, lon }, (map) => {
    map.terrain = new Terrain((x, y) => map.toLatLon(x, y), PX_PER_M);
    return worldLoader(map);
  });
}

/** The place a world map id stands for ('w:lat,lon'), or null for our own maps. */
export function worldOrigin(id: string) {
  const m = id.match(/^w:(-?[\d.]+),(-?[\d.]+)$/);
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

// ---------------------------------------------------------------- tiles

const n = 2 ** Z;
const tileX = (lon: number) => Math.floor(((lon + 180) / 360) * n);
const tileY = (lat: number) => Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
const lonOf = (x: number) => (x / n) * 360 - 180;
const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;

const ROAD: Record<string, string | null> = {
  motorway: 'major', trunk: 'major', primary: 'major', motorway_link: 'major', trunk_link: 'major', primary_link: 'major',
  secondary: 'medium', secondary_link: 'medium', tertiary: 'medium', tertiary_link: 'medium',
  residential: 'minor', unclassified: 'minor', living_street: 'minor', road: 'minor',
  service: 'service', driveway: 'service', track: 'track', pedestrian: 'pedestrian',
  footway: 'path', path: 'path', cycleway: 'path', bridleway: 'path', steps: 'steps',
  // Drawn along the roads already (build-map drops them too).
  sidewalk: null, crossing: null, corridor: null, platform: null,
};

const LANDUSE: Record<string, string> = {
  forest: 'forest', wood: 'forest', scrub: 'scrub', grass: 'grass', grassland: 'grass', meadow: 'grass',
  recreation_ground: 'grass', village_green: 'grass', heath: 'grass', park: 'park', garden: 'park',
  cemetery: 'cemetery', allotments: 'allotments', farmland: 'farmland', orchard: 'farmland', vineyard: 'farmland',
  pitch: 'pitch', stadium: 'pitch', track: 'pitch', playground: 'playground', parking: 'parking',
  pedestrian: 'plaza', wetland: 'wetland', marsh: 'wetland', swamp: 'wetland',
  bare_rock: 'rock', scree: 'rock', shingle: 'rock', glacier: 'glacier', sand: 'sand', beach: 'sand', dune: 'sand',
};

const WATER_LINE: Record<string, string> = { river: 'river', stream: 'stream', canal: 'stream', ditch: 'ditch', drain: 'ditch' };

/** World map point of interest → the game's place. */
function placeKind(p: Record<string, unknown>): Place['kind'] | null {
  if (import.meta.env?.VITE_TEST === '1' && /\bmc ?donald['’]?s\b/i.test(String(p.name ?? ''))) return 'maker';
  const kind = String(p.kind ?? '');
  const detail = String(p.kind_detail ?? '');
  const named = !!p.name;
  switch (kind) {
    case 'supermarket': return 'shop';
    case 'convenience': return named ? 'shop' : null;
    case 'school': return named ? 'school' : null;
    case 'place_of_worship': return named && (!detail || detail === 'christian') ? 'church' : null;
    case 'townhall': return named ? 'office' : null;
    case 'hospital': return named ? 'hospital' : null;
    case 'police': return 'police';
    case 'library': return 'library';
    case 'bank': return 'bank';
    case 'university': case 'college': return named ? 'university' : null;
    case 'fuel': return 'alchemist';
    case 'doityourself': case 'hardware': case 'sports': case 'outdoor': return 'gear';
    case 'hotel': case 'hostel': case 'guest_house': case 'motel': return 'hotel';
    case 'camp_site': case 'caravan_site': return 'camp';
    case 'station': case 'bus_station': return named ? 'station' : null;
    default: return null;
  }
}

const DEFAULT_NAME: Partial<Record<Place['kind'], string>> = {
  shop: 'Sklep', police: 'Komenda Policji', library: 'Biblioteka', bank: 'Bank', alchemist: 'Stacja paliw',
  gear: 'Market budowlany', hotel: 'Hotel', camp: 'Pole namiotowe',
};

/**
 * Turns a building around its middle so its longest wall lies at one of the 8 "pixel" angles (like build-map's G8 for
 * Lublin – owner, 6 Oct 2026: unturned buildings on world maps had ragged, stair-stepped sides). Rings in half-metres;
 * if a corner would land on a road (within 2 m of a road line it wasn't near before), it stays as it is.
 */
const KATY = [0, 26.565, 45, 63.435, 90, 116.565, 135, 153.435];
/** Road segments of a tile in a grid of KRATKA half-metres (each in every cell its box ± 2 m touches). */
const KRATKA = 32;
function roadGrid(segs: number[][]) {
  const g = new Map<number, number[][]>();
  for (const s of segs) {
    const x0 = Math.floor((Math.min(s[0], s[2]) - 4) / KRATKA), x1 = Math.floor((Math.max(s[0], s[2]) + 4) / KRATKA);
    const y0 = Math.floor((Math.min(s[1], s[3]) - 4) / KRATKA), y1 = Math.floor((Math.max(s[1], s[3]) + 4) / KRATKA);
    // A very long segment (a straight road across the tile) in many cells is fine: tiles are 1 km.
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const k = i * 100003 + j;
      let a = g.get(k);
      if (!a) g.set(k, (a = []));
      a.push(s);
    }
  }
  return g;
}

function straighten(rings: number[][][], roads: Map<number, number[][]>) {
  const r = rings[0];
  const n = r.length;
  if (n < 3) return;
  let best = -1, ang = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = r[i], [bx, by] = r[(i + 1) % n];
    const L = (bx - ax) ** 2 + (by - ay) ** 2;
    if (L > best) [best, ang] = [L, Math.atan2(by - ay, bx - ax)];
    cx += ax / n;
    cy += ay / n;
  }
  const deg = (((ang * 180) / Math.PI) % 180 + 180) % 180;
  let cel = 0, bd = 999;
  for (const k of [...KATY, 180]) if (Math.abs(deg - k) < bd) [bd, cel] = [Math.abs(deg - k), k % 180];
  if (bd < 0.5) return;
  const d = ((cel - deg) * Math.PI) / 180, co = Math.cos(d), si = Math.sin(d);
  const turn = ([x, y]: number[]) => [cx + (x - cx) * co - (y - cy) * si, cy + (x - cx) * si + (y - cy) * co];
  // Only the road segments in the corner's grid cell (all of a tile's were checked: 9 s in Kraków's demo, owner 7.10.2026).
  const near = (x: number, y: number) => (roads.get(Math.floor(x / KRATKA) * 100003 + Math.floor(y / KRATKA)) ?? []).some(([ax, ay, bx, by]) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    return Math.hypot(ax + dx * t - x, ay + dy * t - y) < 4; // 2 m
  });
  const turned = rings.map((ring) => ring.map(turn));
  for (let i = 0; i < n; i++) if (near(turned[0][i][0], turned[0][i][1]) && !near(r[i][0], r[i][1])) return;
  turned.forEach((ring, i) => (rings[i] = ring));
}

/** Signed area of a ring in tile coordinates (y down): > 0 for outer rings in vector tiles. */
function ringArea(r: { x: number; y: number }[]) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j].x - r[i].x) * (r[j].y + r[i].y);
  return a;
}

/** Polygons (outer ring first, then its holes) of a vector tile feature. */
function polygons(f: VectorTileFeature) {
  const out: { x: number; y: number }[][][] = [];
  for (const r of f.loadGeometry()) {
    if (r.length < 4) continue;
    const a = ringArea(r);
    if (a > 0 || !out.length) out.push([r]);
    else out[out.length - 1].push(r);
  }
  return out;
}

/** The game tile loader for a world map: converts the world tiles under each game tile. */
const areaOf = (r: number[][]) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
};

function worldLoader(map: CityMap): WorldLoader {
  const k = map.unitPx;
  // Each world tile is converted once; game tiles that share it reuse it.
  const done = new Map<number, Promise<RawTile>>();

  const convert = async (tx: number, ty: number): Promise<RawTile> => {
    const out: RawTile = { a: [], l: [], b: [], p: [], k: [], q: [] };
    const file = await worldFile();
    const t = await file.getZxy(Z, tx, ty);
    if (!t) return out;
    const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
    const lon0 = lonOf(tx), lon1 = lonOf(tx + 1), lat0 = latOf(ty), lat1 = latOf(ty + 1);
    // Tile coordinates → map units (half-metres), as CityMap stores them.
    const proj = (ext: number) => (q: { x: number; y: number }) => {
      const p = map.fromLatLon(lat0 + (lat1 - lat0) * (q.y / ext), lon0 + (lon1 - lon0) * (q.x / ext));
      return [Math.round(p.x / k), Math.round(p.y / k)];
    };
    const flat = (pts: number[][]) => {
      const o: number[] = [];
      let px = 0, py = 0;
      for (const [x, y] of pts) {
        if (o.length && x === px && y === py) continue;
        o.push(o.length ? x - px : x, o.length ? y - py : y);
        px = x;
        py = y;
      }
      return o;
    };
    // Stable ids: the world tile, the layer and the feature's number in it.
    const idOf = (layer: number, i: number) => ((tx * n + ty) * 8 + layer) * 2 ** 20 + (i % 2 ** 20);

    const layer = (name: string) => vt.layers[name];
    const each = (name: string, f: (feat: VectorTileFeature, i: number, pr: (q: { x: number; y: number }) => number[]) => void) => {
      const l = layer(name);
      if (!l) return;
      const pr = proj(l.extent);
      for (let i = 0; i < l.length; i++) f(l.feature(i), i, pr);
    };

    each('landuse', (f, i, pr) => {
      const kind = LANDUSE[String(f.properties.kind)];
      if (!kind || f.type !== 3) return;
      polygons(f).forEach((poly, j) => out.a.push([idOf(0, i * 8 + (j & 7)), kind, ...poly.map((r) => flat(r.map(pr)))]));
    });
    each('water', (f, i, pr) => {
      if (f.type === 3) polygons(f).forEach((poly, j) => out.a.push([idOf(1, i * 8 + (j & 7)), 'water', ...poly.map((r) => flat(r.map(pr)))]));
      else if (f.type === 2) {
        const kind = WATER_LINE[String(f.properties.kind)];
        if (kind) f.loadGeometry().forEach((g, j) => out.l.push([idOf(1, i * 8 + (j & 7)), kind, 0, flat(g.map(pr)), (f.properties.name as string) || 0]));
      }
    });
    const named: { pts: number[][]; name: string }[] = [];
    each('roads', (f, i, pr) => {
      if (f.type !== 2 || f.properties.is_tunnel) return;
      const p = f.properties;
      // Rails: only the main lines – sidings, yards and spurs made freight yards look like a giant station.
      const side = p.service === 'yard' || p.service === 'siding' || p.service === 'spur' || p.service === 'crossover';
      const kind = p.kind === 'rail' ? (p.kind_detail === 'tram' ? 'tram' : p.kind_detail === 'rail' && !side ? 'rail' : null) : ROAD[String(p.kind_detail ?? p.kind)];
      if (!kind) return;
      const flags = p.is_bridge ? 1 : 0;
      f.loadGeometry().forEach((g, j) => {
        const pts = g.map(pr);
        out.l.push([idOf(2, i * 8 + (j & 7)), kind, flags, flat(pts), (p.name as string) || 0]);
        if (p.name && kind !== 'rail' && kind !== 'tram') named.push({ pts, name: String(p.name) });
      });
    });
    // Buildings, then their house numbers (with the nearest named street).
    const blds: { rings: number[][][]; box: number[]; addr: string[]; levels: number; id: number }[] = [];
    const nums: { x: number; y: number; n: string }[] = [];
    each('buildings', (f, i, pr) => {
      if (f.type === 1 && f.properties.addr_housenumber) {
        const [x, y] = pr(f.loadGeometry()[0][0]);
        nums.push({ x, y, n: String(f.properties.addr_housenumber) });
      } else if (f.type === 3) {
        const h = Number(f.properties.height) || 0;
        polygons(f).forEach((poly, j) => {
          const rings = poly.map((r) => r.map(pr));
          const xs = rings[0].map((q) => q[0]), ys = rings[0].map((q) => q[1]);
          blds.push({ rings, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], addr: [], levels: h ? Math.max(1, Math.round(h / 3)) : SZOPY.domyslniePieter, id: idOf(3, i * 8 + (j & 7)) });
        });
      }
    });
    const inside = (r: number[][], x: number, y: number) => {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++)
        if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
      return c;
    };
    const streetNear = (x: number, y: number) => {
      let best = 60 * 2; // half-metres
      let name = '';
      for (const s of named)
        for (const [sx, sy] of s.pts) {
          const d = Math.hypot(sx - x, sy - y);
          if (d < best) [best, name] = [d, s.name];
        }
      return name;
    };
    for (const a of nums) {
      const b = blds.find((b) => a.x >= b.box[0] && a.x <= b.box[2] && a.y >= b.box[1] && a.y <= b.box[3] && inside(b.rings[0], a.x, a.y));
      const street = streetNear(a.x, a.y);
      if (b && street) b.addr.push(`${street} ${a.n}`);
    }
    const castles: { x: number; y: number; name: string }[] = [];
    // Places (shops, schools, …) in map pixels.
    each('pois', (f, _i, pr) => {
      if (f.type !== 1) return;
      const nm = (f.properties['name:pl'] as string) || (f.properties.name as string);
      if (f.properties.kind === 'peak' && nm && f.properties.elevation) {
        const [x, y] = pr(f.loadGeometry()[0][0]);
        out.k!.push([nm, Math.round(Number(f.properties.elevation)), x * k, y * k]);
        return;
      }
      if (['post_office', 'post_box', 'parcel_locker'].includes(String(f.properties.kind))) {
        const [qx, qy] = pr(f.loadGeometry()[0][0]);
        out.q!.push([qx * k, qy * k]);
        return;
      }
      // Castles and palaces: their building keeps its name (drawn whole, never cut into parts).
      if (['castle', 'fort', 'palace'].includes(String(f.properties.kind)) && nm) {
        const [cx, cy] = pr(f.loadGeometry()[0][0]);
        castles.push({ x: cx, y: cy, name: nm });
      }
      const kind = placeKind(f.properties);
      if (!kind) return;
      const [x, y] = pr(f.loadGeometry()[0][0]);
      const name = (f.properties['name:pl'] as string) || (f.properties.name as string) || DEFAULT_NAME[kind] || kind;
      out.p!.push([kind, name, x * k, y * k]);
    });
    // Tiny sheds and garages without an address (they made towns a maze, bug report 15): under
    // SZOPY.usunM2 dropped, under SZOPY.przejscieM2 drawn but walked through (last field 1).
    // Roads of this tile (half-metres) for the straightening check below: a turned building must not step onto one.
    const roadSegs: number[][] = [];
    for (const l of out.l) {
      if (l[1] === 'rail' || l[1] === 'tram') continue;
      // Points are stored as steps from the previous one (`flat`).
      const q = l[3] as number[];
      let x = q[0], y = q[1];
      for (let i = 2; i + 1 < q.length; i += 2) {
        roadSegs.push([x, y, x + q[i], y + q[i + 1]]);
        x += q[i];
        y += q[i + 1];
      }
    }
    const grid = roadGrid(roadSegs);
    for (const b of blds) {
      straighten(b.rings, grid);
      const m2 = Math.abs(areaOf(b.rings[0])) / 4; // half-metres²
      if (!b.addr.length && m2 < SZOPY.usunM2) continue;
      const open = !b.addr.length && m2 < SZOPY.przejscieM2 ? 1 : 0;
      const castle = castles.find((c) => c.x >= b.box[0] && c.x <= b.box[2] && c.y >= b.box[1] && c.y <= b.box[3] && inside(b.rings[0], c.x, c.y));
      out.b.push([b.id, b.rings.map(flat), b.addr.join(' | ') || 0, castle?.name || 0, b.levels, open]);
    }
    return out;
  };

  return async (box) => {
    // World tiles under this 1 km game tile.
    const a = map.toLatLon(box.x0, box.y0), b = map.toLatLon(box.x1, box.y1);
    const parts: Promise<RawTile>[] = [];
    for (let tx = tileX(a.lon); tx <= tileX(b.lon); tx++)
      for (let ty = tileY(a.lat); ty <= tileY(b.lat); ty++) {
        const key = tx * n + ty;
        let job = done.get(key);
        if (!job) {
          job = convert(tx, ty);
          done.set(key, job);
          job.catch(() => done.delete(key));
        }
        parts.push(job);
      }
    const [all] = await Promise.all([Promise.all(parts), map.terrain?.load(box)]);
    // Places belong to the game tile they stand in (each is added once).
    const inBox = (x: number, y: number) => x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
    return {
      a: all.flatMap((t) => t.a),
      l: all.flatMap((t) => t.l),
      b: all.flatMap((t) => t.b),
      p: all.flatMap((t) => t.p!.filter(([, , x, y]) => inBox(x, y))),
      k: all.flatMap((t) => t.k!),
      q: all.flatMap((t) => t.q!.filter(([x, y]) => inBox(x, y))),
    };
  };
}


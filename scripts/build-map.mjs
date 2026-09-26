// Converts the OpenStreetMap extract (data/lublin-osm.geojsonseq.gz, made by
// scripts/fetch-osm.sh) into the compact map the game loads:
// public/map/lublin.json. Runs automatically before `npm run dev/build`.
//
// Output coordinates are in half-metres (UNITS_PER_M = 2), x to the east and
// y to the south, with (0,0) at the north-west corner of the city boundary.
// Every polyline/ring is a flat [x0, y0, dx1, dy1, dx2, dy2, ...] array.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
const ClipperLib = createRequire(import.meta.url)('clipper-lib');

// Arguments (all optional; the default builds Lublin):
//   --src <file.geojsonseq.gz> --out <file.json> --bbox minLon,minLat,maxLon,maxLat
// With --bbox the map is that rectangle (towns by railway stations, see
// scripts/build-maps.mjs); without it, the Lublin city boundary.
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const SRC = arg('src') ?? 'data/lublin-osm.geojsonseq.gz';
const OUT = arg('out') ?? 'public/map/lublin.json';
const BBOX = arg('bbox')?.split(',').map(Number);
const UNITS_PER_M = 2;

if (existsSync(OUT) && statSync(OUT).mtimeMs > Math.max(statSync(SRC).mtimeMs, statSync(new URL(import.meta.url)).mtimeMs, statSync(new URL('./lublin-area.json', import.meta.url)).mtimeMs)) {
  console.log('map: up to date');
  process.exit(0);
}

// One GeoJSON feature per line (optionally prefixed with the RS character).
const features = gunzipSync(readFileSync(SRC))
  .toString('utf8')
  .split('\n')
  .map((l) => l.replace(/^\x1e/, '').trim())
  .filter(Boolean)
  .map((l) => JSON.parse(l));

/** All rings of a (Multi)Polygon as arrays of [lon, lat]; outer and holes alike (drawn even-odd). */
function polygonRings(g) {
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.flat();
  return [];
}

// ---------------------------------------------------------------- projection

const AREA = BBOX ? null : JSON.parse(readFileSync(new URL('./lublin-area.json', import.meta.url), 'utf8'));

/** The union of polygon rings (lon/lat) and circles of `km` around points. */
function withCircles(rings, extra) {
  const S = 1e7;
  const toPath = (r) => r.map(([lon, lat]) => ({ X: Math.round(lon * S), Y: Math.round(lat * S) }));
  const paths = rings.map(toPath);
  for (const e of extra) {
    const mLat = 111132.954 - 559.822 * Math.cos(2 * e.lat * Math.PI / 180);
    const mLon = 111412.84 * Math.cos(e.lat * Math.PI / 180);
    const circle = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      circle.push([e.lon + (Math.cos(a) * e.km * 1000) / mLon, e.lat + (Math.sin(a) * e.km * 1000) / mLat]);
    }
    paths.push(toPath(circle));
  }
  const c = new ClipperLib.Clipper();
  c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  const out = [];
  c.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  console.log(`map: city + ${extra.map((e) => `${e.name} (${e.km} km)`).join(', ')} → ${out.length} ring(s)`);
  return out.map((p) => { const r = p.map((q) => [q.X / S, q.Y / S]); r.push(r[0]); return r; });
}

let boundaryLL;
if (BBOX) {
  const [x0, y0, x1, y1] = BBOX;
  boundaryLL = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
} else {
  const isCity = (t) => t.boundary === 'administrative' && t.name === 'Lublin' && ['6', '7', '8'].includes(t.admin_level);
  const cityFeature = features.find((f) => isCity(f.properties || {}) && f.geometry && polygonRings(f.geometry).length);
  if (!cityFeature) throw new Error('City boundary of Lublin not found in the data');
  boundaryLL = polygonRings(cityFeature.geometry);
  // Plus circles around nearby places (scripts/lublin-area.json), all as one area.
  if (AREA) boundaryLL = withCircles(boundaryLL, AREA.extra);
}
let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
for (const r of boundaryLL) for (const [lon, lat] of r) {
  minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
}
// The projection origin: the north-west corner, or for Lublin the fixed
// anchor of the original city map (so saved positions stay where they were;
// areas west/north of it get negative coordinates).
const ORIGIN = AREA ? AREA.anchor : { lon: minLon, lat: maxLat, lat0: (minLat + maxLat) / 2 };
const lat0 = ORIGIN.lat0;
const M_PER_DEG_LAT = 111132.954 - 559.822 * Math.cos(2 * lat0 * Math.PI / 180);
const M_PER_DEG_LON = 111412.84 * Math.cos(lat0 * Math.PI / 180);
const proj = ([lon, lat]) => [
  Math.round((lon - ORIGIN.lon) * M_PER_DEG_LON * UNITS_PER_M),
  Math.round((ORIGIN.lat - lat) * M_PER_DEG_LAT * UNITS_PER_M),
];
// The map spans x0..w and y0..h metres (x0, y0 ≤ 0).
const X0 = Math.floor((minLon - ORIGIN.lon) * M_PER_DEG_LON);
const Y0 = Math.floor((ORIGIN.lat - maxLat) * M_PER_DEG_LAT);
const W = Math.ceil((maxLon - ORIGIN.lon) * M_PER_DEG_LON);
const H = Math.ceil((ORIGIN.lat - minLat) * M_PER_DEG_LAT);

function encode(geom, closed) {
  const pts = [];
  for (const g of geom) {
    const [x, y] = proj(g);
    const n = pts.length;
    if (n && pts[n - 2] === x && pts[n - 1] === y) continue;
    pts.push(x, y);
  }
  if (closed && pts.length > 2 && pts[0] === pts[pts.length - 2] && pts[1] === pts[pts.length - 1]) pts.length -= 2;
  if (pts.length < (closed ? 6 : 4)) return null;
  const out = [pts[0], pts[1]];
  for (let i = 2; i < pts.length; i += 2) out.push(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return out;
}

// Keep only what lies inside the city (tested on a feature's first point).
const boundaryXY = boundaryLL.map((r) => r.flatMap(proj));
function insideCity([x, y]) {
  let inside = false;
  for (const r of boundaryXY) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
function firstPoint(g) {
  if (g.type === 'Point') return g.coordinates;
  if (g.type === 'LineString') return g.coordinates[0];
  const rings = polygonRings(g);
  return rings.length ? rings[0][0] : null;
}

// ---------------------------------------------------------------- classification

const ROAD = {
  motorway: 'major', trunk: 'major', primary: 'major', motorway_link: 'major', trunk_link: 'major', primary_link: 'major',
  secondary: 'medium', secondary_link: 'medium', tertiary: 'medium', tertiary_link: 'medium',
  residential: 'minor', unclassified: 'minor', living_street: 'minor', road: 'minor',
  service: 'service', track: 'track',
  pedestrian: 'pedestrian',
  footway: 'path', path: 'path', cycleway: 'path', bridleway: 'path', steps: 'steps', corridor: null,
};

function areaKind(t) {
  if (t.natural === 'water' || t.landuse === 'reservoir' || t.landuse === 'basin') return 'water';
  if (t.natural === 'wetland') return 'wetland';
  if (t.natural === 'wood' || t.landuse === 'forest') return 'forest';
  if (t.natural === 'scrub') return 'scrub';
  if (t.landuse === 'cemetery') return 'cemetery';
  if (t.landuse === 'allotments') return 'allotments';
  if (t.landuse === 'farmland' || t.landuse === 'orchard') return 'farmland';
  if (t.leisure === 'pitch' || t.leisure === 'stadium' || t.leisure === 'track') return 'pitch';
  if (t.leisure === 'playground') return 'playground';
  if (t.leisure === 'park' || t.leisure === 'garden') return 'park';
  if (t.amenity === 'parking') return 'parking';
  if (t.highway === 'pedestrian' && t.area === 'yes') return 'plaza';
  if (t.landuse || t.natural || t.leisure) return 'grass';
  return null;
}

// Draw order: big soft areas first, small detailed ones last.
const AREA_ORDER = ['farmland', 'grass', 'scrub', 'wetland', 'forest', 'park', 'allotments', 'cemetery', 'pitch', 'playground', 'parking', 'plaza', 'water'];

// ---------------------------------------------------------------- collect

const areas = [];
const lines = [];
const buildings = [];
const addrNodes = [];
const pois = [];
const roundabouts = [];

// Every supermarket is an in-game shop, whatever the chain (Biedronka, Lidl,
// and abroad Albert Heijn, Edeka…); schools become skill schools.
function poiOf(t) {
  if (t.shop === 'supermarket' || t.shop === 'discount') return ['shop', t.brand || t.name || 'Supermarket'];
  // Towns and villages: a named grocery counts too (few supermarkets there).
  if (BBOX && t.shop === 'convenience' && t.name) return ['shop', t.name];
  // Real schools only: not driving or language schools.
  if (t.amenity === 'school' && t.name && /szko|liceum|technikum|gimnazjum|zespół|zespol|school/i.test(t.name) && !/auto|jazd|język|jezyk|tańc|tanc|muzy/i.test(t.name)) {
    return ['school', t.name];
  }
  if (t.amenity === 'place_of_worship' && t.name && (!t.religion || t.religion === 'christian') && /kości|kaplic|parafi|bazylik|katedr|cerk|klasztor|sanktuar/i.test(t.name)) return ['church', t.name];
  if ((t.amenity === 'townhall' || t.office === 'government') && t.name) return ['office', t.name];
  if (t.amenity === 'hospital' && t.name) return ['hospital', t.name];
  if (t.amenity === 'police') return ['police', t.name || 'Komenda Policji'];
  if (t.amenity === 'library') return ['library', t.name || 'Biblioteka'];
  // Universities and colleges: the story's wise men live there.
  if ((t.amenity === 'university' || t.amenity === 'college') && t.name) return ['university', t.name];
  // Town halls (for the story when a town has no university).
  if (t.amenity === 'townhall' && t.name) return ['office', t.name];
  // Petrol stations: the alchemist brews healing potions there.
  if (t.amenity === 'fuel') return ['alchemist', t.brand || t.name || 'Stacja paliw'];
  // Banks: deposits with interest.
  if (t.amenity === 'bank') return ['bank', t.name || t.brand || 'Bank'];
  // Hotels: save and load points (the game keeps one per 300 m square).
  if (['hotel', 'hostel', 'guest_house', 'motel'].includes(t.tourism)) return ['hotel', t.name || 'Hotel'];
  // Railway stations and halts: the coachman waits there.
  if ((t.railway === 'station' || t.railway === 'halt') && t.name && (!t.station || t.station === 'train')) return ['station', t.name];
  return null;
}
function centroidLL(g) {
  if (g.type === 'Point') return g.coordinates;
  const r = g.type === 'LineString' ? g.coordinates : polygonRings(g)[0];
  let x = 0, y = 0;
  for (const [lon, lat] of r) { x += lon; y += lat; }
  return [x / r.length, y / r.length];
}

const address = (t) => {
  const street = t['addr:street'] || t['addr:place'];
  const num = t['addr:housenumber'];
  return street && num ? `${street} ${num}` : null;
};

for (const f of features) {
  const t = f.properties || {};
  const g = f.geometry;
  if (!g || t.boundary === 'administrative') continue;
  const fp = firstPoint(g);
  if (!fp || !insideCity(proj(fp))) continue;

  const poi = poiOf(t);
  if (poi) pois.push({ kind: poi[0], name: poi[1], p: proj(centroidLL(g)), a: address(t) });

  if (g.type === 'Point') {
    const a = address(t);
    if (a) addrNodes.push({ p: proj(g.coordinates), a, name: t.name || null });
    continue;
  }
  const isArea = g.type === 'Polygon' || g.type === 'MultiPolygon';
  const areaRings = () => polygonRings(g).map((r) => encode(r, true)).filter(Boolean);

  if (t.building && t.building !== 'no') {
    if (!isArea || (t.layer || '').startsWith('-')) continue;
    const rings = areaRings();
    if (rings.length) buildings.push({ rings, a: address(t), name: t.name || null, levels: +(t['building:levels'] || 0) || 0, kind: t.building });
    continue;
  }

  if (t.highway && t.junction === 'roundabout' && g.type === 'LineString') {
    roundabouts.push({ pts: g.coordinates.map((c) => proj(c)), name: t.name || null });
  }
  if (t.highway) {
    if (isArea) {
      if (t.highway === 'pedestrian' || t.area === 'yes') {
        const rings = areaRings();
        if (rings.length) areas.push({ kind: 'plaza', rings });
      }
      continue;
    }
    // Sidewalks and crossings drawn as separate paths along roads only make a
    // mess at game scale: the road itself is drawn wide enough instead.
    if (t.footway === 'sidewalk' || t.footway === 'crossing' || t.path === 'sidewalk' || t.cycleway === 'crossing') continue;
    const cls = ROAD[t.highway];
    if (!cls || t.tunnel === 'yes' || (t.access === 'private' && cls === 'service')) continue;
    const l = encode(g.coordinates, false);
    if (!l) continue;
    lines.push({ kind: cls, pts: l, bridge: t.bridge && t.bridge !== 'no' ? 1 : 0, pass: t.tunnel === 'building_passage' || t.covered === 'yes' ? 1 : 0, name: t.name || null });
    continue;
  }

  if (t.railway && g.type === 'LineString') {
    if (t.tunnel === 'yes') continue;
    const l = encode(g.coordinates, false);
    if (l) lines.push({ kind: t.railway === 'rail' ? 'rail' : 'tram', pts: l, bridge: t.bridge && t.bridge !== 'no' ? 1 : 0, pass: 0 });
    continue;
  }

  if (t.waterway && g.type === 'LineString') {
    if (t.tunnel || (t.layer || '').startsWith('-')) continue;
    const kind = t.waterway === 'river' ? 'river' : t.waterway === 'stream' || t.waterway === 'canal' ? 'stream' : t.waterway === 'ditch' || t.waterway === 'drain' ? 'ditch' : null;
    if (!kind) continue;
    const l = encode(g.coordinates, false);
    if (l) lines.push({ kind, pts: l, bridge: 0, pass: 0 });
    continue;
  }

  const kind = isArea ? areaKind(t) : null;
  if (kind) {
    const rings = areaRings();
    if (rings.length) areas.push({ kind, rings });
  }
}

// ---------------------------------------------------------------- give address nodes to buildings

function decode(flat) {
  const out = [flat[0], flat[1]];
  for (let i = 2; i < flat.length; i += 2) out.push(out[i - 2] + flat[i], out[i - 1] + flat[i + 1]);
  return out;
}
function inRings(rings, x, y) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
const CELL = 100 * UNITS_PER_M;
const grid = new Map();
buildings.forEach((b, i) => {
  b.abs = b.rings.map(decode);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const r = b.abs[0];
  for (let k = 0; k < r.length; k += 2) { x0 = Math.min(x0, r[k]); x1 = Math.max(x1, r[k]); y0 = Math.min(y0, r[k + 1]); y1 = Math.max(y1, r[k + 1]); }
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
    for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const k = cx + ',' + cy;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
});
let matched = 0;
for (const n of addrNodes) {
  const cand = grid.get(Math.floor(n.p[0] / CELL) + ',' + Math.floor(n.p[1] / CELL)) || [];
  for (const i of cand) {
    const b = buildings[i];
    if (!inRings(b.abs, n.p[0], n.p[1])) continue;
    if (!b.a) b.a = n.a;
    else if (!b.a.split(' | ').includes(n.a)) b.a += ' | ' + n.a; // several entrances/addresses
    if (!b.name && n.name) b.name = n.name;
    matched++;
    break;
  }
}

// ---------------------------------------------------------------- merge buildings
// Cartoon look: every building grows by GROW_M metres on each side, and
// buildings that then touch or overlap become one block (with all their
// addresses). Collisions use these shapes too.

const GROW_M = 0.7; // less than before (1.2) so narrow passages between houses stay open
const CS = 4; // clipper works on integers: 1/4 of a half-metre
function ringArea(r) {
  let a = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) a += (r[j] + r[i]) * (r[j + 1] - r[i + 1]);
  return a / 2;
}
const toPath = (r) => {
  const p = [];
  for (let i = 0; i < r.length; i += 2) p.push({ X: r[i] * CS, Y: r[i + 1] * CS });
  return p;
};
const t0 = Date.now();
// Roofs, shelters and tiny sheds only clutter the streets at game scale.
const SKIP_KINDS = new Set(['roof', 'carport', 'shelter', 'transformer_tower', 'bicycle_parking', 'canopy']);
const MIN_M2 = 25;
const areaM2 = (r) => Math.abs(ringArea(r)) / (UNITS_PER_M * UNITS_PER_M);
const kept = buildings.filter((b) => !SKIP_KINDS.has(b.kind) && (b.a || b.name || areaM2(b.abs[0]) >= MIN_M2));
const grown = [];
for (const b of kept) {
  // Outer ring counter-clockwise, holes clockwise (what Clipper expects).
  const rings = b.abs.slice().sort((a, c) => Math.abs(ringArea(c)) - Math.abs(ringArea(a)));
  const paths = rings.map((r, i) => {
    const p = toPath(r);
    const outer = i === 0;
    if (ClipperLib.Clipper.Orientation(p) !== outer) p.reverse();
    return p;
  });
  const co = new ClipperLib.ClipperOffset(2, 0.25 * CS * UNITS_PER_M);
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out = new ClipperLib.Paths();
  co.Execute(out, GROW_M * UNITS_PER_M * CS);
  for (const p of out) grown.push(p);
}
// Streets stay clear: every road is cut out of the grown blocks, as wide as
// the game draws it (MapRenderer.trackWidth) plus a little margin.
const LINE_WIDTH_M = { major: 14, medium: 11, minor: 7, service: 4, track: 3, pedestrian: 6, path: 2.5, steps: 2.5 };
// One offset per width class keeps it simple: use the drawn half-width of each line.
const corridors = new ClipperLib.Paths();
{
  const byWidth = new Map();
  for (const l of lines) {
    const w = LINE_WIDTH_M[l.kind];
    if (!w || l.pass) continue;
    const half = (Math.max(w, 3) + 3) / 2 + 0.3;
    if (!byWidth.has(half)) byWidth.set(half, []);
    const abs = decode(l.pts);
    const path = [];
    for (let i = 0; i < abs.length; i += 2) path.push({ X: abs[i] * CS, Y: abs[i + 1] * CS });
    byWidth.get(half).push(path);
  }
  for (const [half, paths] of byWidth) {
    const o = new ClipperLib.ClipperOffset(2, 0.25 * CS * UNITS_PER_M);
    o.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
    const out = new ClipperLib.Paths();
    o.Execute(out, half * UNITS_PER_M * CS);
    for (const p of out) corridors.push(p);
  }
}
const clipper = new ClipperLib.Clipper();
clipper.AddPaths(grown, ClipperLib.PolyType.ptSubject, true);
clipper.AddPaths(corridors, ClipperLib.PolyType.ptClip, true);
const tree = new ClipperLib.PolyTree();
clipper.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
const blocks = [];
const walk = (node) => {
  for (const outer of node.Childs()) {
    if (outer.IsHole()) continue;
    const clean = (p) => ClipperLib.Clipper.CleanPolygon(p, 0.5 * CS * UNITS_PER_M);
    const outerPath = clean(outer.Contour());
    if (outerPath.length < 3) continue;
    // Slivers left between two streets are not buildings.
    if (Math.abs(ClipperLib.Clipper.Area(outerPath)) / (CS * CS * UNITS_PER_M * UNITS_PER_M) < 12) continue;
    const holes = outer.Childs().map((h) => clean(h.Contour())).filter((h) => h.length >= 3);
    const toFlat = (p) => p.flatMap((pt) => [Math.round(pt.X / CS), Math.round(pt.Y / CS)]);
    const abs = [toFlat(outerPath), ...holes.map(toFlat)];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < abs[0].length; i += 2) { x0 = Math.min(x0, abs[0][i]); x1 = Math.max(x1, abs[0][i]); y0 = Math.min(y0, abs[0][i + 1]); y1 = Math.max(y1, abs[0][i + 1]); }
    blocks.push({ abs, x0, y0, x1, y1, addrs: [], name: null, levels: 0 });
    // Islands inside courtyards.
    for (const h of outer.Childs()) walk(h);
  }
};
walk(tree);
// Give every original building's data to the block it ended up in.
const bgrid = new Map();
blocks.forEach((k, i) => {
  for (let cx = Math.floor(k.x0 / CELL); cx <= Math.floor(k.x1 / CELL); cx++)
    for (let cy = Math.floor(k.y0 / CELL); cy <= Math.floor(k.y1 / CELL); cy++) {
      const key = cx + ',' + cy;
      if (!bgrid.has(key)) bgrid.set(key, []);
      bgrid.get(key).push(i);
    }
});
const blockAt = (x, y) => (bgrid.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL)) || []).map((i) => blocks[i]).find((k) => inRings(k.abs, x, y));
for (const b of kept) {
  // The block it is in: try the middle, then its corners (a street may cut through it).
  const r = b.abs[0];
  let cx = 0, cy = 0;
  for (let i = 0; i < r.length; i += 2) { cx += r[i]; cy += r[i + 1]; }
  const n = r.length / 2;
  let k = blockAt(cx / n, cy / n);
  for (let i = 0; !k && i < r.length; i += 2) k = blockAt(r[i], r[i + 1]);
  if (!k) continue;
  if (b.a) for (const a of b.a.split(' | ')) if (!k.addrs.includes(a)) k.addrs.push(a);
  if (!k.name && b.name) k.name = b.name;
  k.levels = Math.max(k.levels, b.levels);
}
const encodeAbs = (r) => {
  const out = [r[0], r[1]];
  for (let i = 2; i < r.length; i += 2) out.push(r[i] - r[i - 2], r[i + 1] - r[i - 1]);
  return out;
};
const merged = blocks.map((k) => ({ rings: k.abs.map(encodeAbs), a: k.addrs.join(' | ') || null, name: k.name, levels: k.levels }));
console.log(`map: ${buildings.length} buildings merged into ${merged.length} blocks in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// ---------------------------------------------------------------- paved streets
// Car roads become one cobbled surface: every road as wide as the game draws
// it, merged, then gaps narrower than PAVE_GAP_M between them (parallel
// carriageways, tight corners) are closed, and buildings are cut back out.
// Thin roads and paths stay earthen tracks (drawn from the lines).
{
  const t1 = Date.now();
  const PAVED = { major: 14, medium: 11, minor: 7 };
  const PAVE_GAP_M = 12;
  const byHalf = new Map();
  for (const l of lines) {
    const w = PAVED[l.kind];
    if (!w || l.pass) continue;
    const half = (Math.max(w, 3) + 3) / 2;
    const abs = decode(l.pts);
    const path = [];
    for (let i = 0; i < abs.length; i += 2) path.push({ X: abs[i] * CS, Y: abs[i + 1] * CS });
    if (!byHalf.has(half)) byHalf.set(half, []);
    byHalf.get(half).push(path);
  }
  let roads = new ClipperLib.Paths();
  for (const [half, paths] of byHalf) {
    const o = new ClipperLib.ClipperOffset(2, 0.25 * CS * UNITS_PER_M);
    o.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
    const out = new ClipperLib.Paths();
    o.Execute(out, half * UNITS_PER_M * CS);
    for (const p of out) roads.push(p);
  }
  const union = (paths) => {
    const c = new ClipperLib.Clipper();
    c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    const out = new ClipperLib.Paths();
    c.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    return out;
  };
  const grow = (paths, m) => {
    const o = new ClipperLib.ClipperOffset(2, 0.25 * CS * UNITS_PER_M);
    o.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    const out = new ClipperLib.Paths();
    o.Execute(out, m * UNITS_PER_M * CS);
    return out;
  };
  roads = union(roads);
  const closed = grow(grow(roads, PAVE_GAP_M / 2), -PAVE_GAP_M / 2);
  const blockPaths = [];
  for (const k of blocks) for (const r of k.abs) blockPaths.push(toPath(r));
  const c = new ClipperLib.Clipper();
  c.AddPaths(union([...closed, ...roads]), ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(blockPaths, ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftEvenOdd);
  const toFlat = (p) => p.flatMap((pt) => [Math.round(pt.X / CS), Math.round(pt.Y / CS)]);
  const minArea = 6 * CS * CS * UNITS_PER_M * UNITS_PER_M;
  let n = 0;
  const walkPaved = (node) => {
    for (const outer of node.Childs()) {
      if (outer.IsHole()) continue;
      const clean = (p) => ClipperLib.Clipper.CleanPolygon(p, 0.4 * CS * UNITS_PER_M);
      const o = clean(outer.Contour());
      if (o.length < 3 || Math.abs(ClipperLib.Clipper.Area(o)) < minArea) continue;
      const holes = outer.Childs().map((h) => clean(h.Contour())).filter((h) => h.length >= 3 && Math.abs(ClipperLib.Clipper.Area(h)) >= minArea);
      areas.push({ kind: 'paved', rings: [o, ...holes].map((p) => encodeAbs(toFlat(p))) });
      n++;
      for (const h of outer.Childs()) walkPaved(h);
    }
  };
  walkPaved(tree);
  console.log(`map: ${n} paved street areas in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
}

// ---------------------------------------------------------------- travelling merchants
// One at every roundabout: its pieces are joined by shared ends, and the
// merchant stands on the ring road.
{
  const groups = [];
  for (const r of roundabouts) {
    const ends = [r.pts[0], r.pts[r.pts.length - 1]];
    const g = groups.find((g) => g.ends.some((e) => ends.some((f) => Math.hypot(e[0] - f[0], e[1] - f[1]) < 4)));
    if (g) {
      g.pts.push(...r.pts);
      g.ends.push(...ends);
      g.name ||= r.name;
    } else groups.push({ pts: [...r.pts], ends, name: r.name });
  }
  let n = 0;
  for (const g of groups) {
    const p = g.pts[Math.floor(g.pts.length / 2)];
    if (pois.some((q) => q.kind === 'merchant' && Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) < 60 * UNITS_PER_M)) continue;
    pois.push({ kind: 'merchant', name: g.name || 'Rondo', p, a: null });
    n++;
  }
  console.log(`map: ${n} travelling merchants at roundabouts`);
}

// ---------------------------------------------------------------- write

areas.sort((a, b) => AREA_ORDER.indexOf(a.kind) - AREA_ORDER.indexOf(b.kind));
const out = {
  v: 1,
  unitsPerM: UNITS_PER_M,
  w: W,
  h: H,
  x0: X0,
  y0: Y0,
  bounds: { minLat, maxLat, minLon, maxLon },
  origin: ORIGIN,
  boundary: boundaryLL.map((r) => encode(r, true)).filter(Boolean),
  areas: areas.map((a) => [a.kind, ...a.rings]),
  lines: lines.map((l) => [l.kind, l.bridge | (l.pass << 1), l.pts, l.name || 0]),
  buildings: merged.map((b) => [b.rings, b.a || 0, b.name || 0, b.levels]),
  // [kind, name, x, y, address]
  pois: pois.map((p) => [p.kind, p.name, p.p[0], p.p[1], p.a || 0]),
};
mkdirSync(OUT.replace(/\/[^/]*$/, ''), { recursive: true });
const json = JSON.stringify(out);
writeFileSync(OUT, json);
const withAddr = buildings.filter((b) => b.a).length;
console.log(`map: ${W - X0}x${H - Y0} m, pois: ${JSON.stringify(Object.fromEntries(['shop', 'school', 'church', 'office', 'hospital', 'police', 'library', 'merchant', 'station', 'hotel', 'bank', 'university', 'alchemist'].map((k) => [k, pois.filter((p) => p.kind === k).length])))}, ${buildings.length} buildings (${withAddr} with address, ${matched} address nodes matched), ${lines.length} lines, ${areas.length} areas, ${(json.length / 1e6).toFixed(1)} MB`);

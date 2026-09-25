// Converts the OpenStreetMap extract (data/lublin-osm.geojsonseq.gz, made by
// scripts/fetch-osm.sh) into the compact map the game loads:
// public/map/lublin.json. Runs automatically before `npm run dev/build`.
//
// Output coordinates are in half-metres (UNITS_PER_M = 2), x to the east and
// y to the south, with (0,0) at the north-west corner of the city boundary.
// Every polyline/ring is a flat [x0, y0, dx1, dy1, dx2, dy2, ...] array.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const SRC = 'data/lublin-osm.geojsonseq.gz';
const OUT = 'public/map/lublin.json';
const UNITS_PER_M = 2;

if (existsSync(OUT) && statSync(OUT).mtimeMs > Math.max(statSync(SRC).mtimeMs, statSync(new URL(import.meta.url)).mtimeMs)) {
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

const isCity = (t) => t.boundary === 'administrative' && t.name === 'Lublin' && ['6', '7', '8'].includes(t.admin_level);
const cityFeature = features.find((f) => isCity(f.properties || {}) && f.geometry && polygonRings(f.geometry).length);
if (!cityFeature) throw new Error('City boundary of Lublin not found in the data');
const boundaryLL = polygonRings(cityFeature.geometry);
let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
for (const r of boundaryLL) for (const [lon, lat] of r) {
  minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
}
const lat0 = (minLat + maxLat) / 2;
const M_PER_DEG_LAT = 111132.954 - 559.822 * Math.cos(2 * lat0 * Math.PI / 180);
const M_PER_DEG_LON = 111412.84 * Math.cos(lat0 * Math.PI / 180);
const proj = ([lon, lat]) => [
  Math.round((lon - minLon) * M_PER_DEG_LON * UNITS_PER_M),
  Math.round((maxLat - lat) * M_PER_DEG_LAT * UNITS_PER_M),
];
const W = Math.ceil((maxLon - minLon) * M_PER_DEG_LON);
const H = Math.ceil((maxLat - minLat) * M_PER_DEG_LAT);

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
    if (rings.length) buildings.push({ rings, a: address(t), name: t.name || null, levels: +(t['building:levels'] || 0) || 0 });
    continue;
  }

  if (t.highway) {
    if (isArea) {
      if (t.highway === 'pedestrian' || t.area === 'yes') {
        const rings = areaRings();
        if (rings.length) areas.push({ kind: 'plaza', rings });
      }
      continue;
    }
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

// ---------------------------------------------------------------- write

areas.sort((a, b) => AREA_ORDER.indexOf(a.kind) - AREA_ORDER.indexOf(b.kind));
const out = {
  v: 1,
  unitsPerM: UNITS_PER_M,
  w: W,
  h: H,
  bounds: { minLat, maxLat, minLon, maxLon },
  boundary: boundaryLL.map((r) => encode(r, true)).filter(Boolean),
  areas: areas.map((a) => [a.kind, ...a.rings]),
  lines: lines.map((l) => [l.kind, l.bridge | (l.pass << 1), l.pts, l.name || 0]),
  buildings: buildings.map((b) => [b.rings, b.a || 0, b.name || 0, b.levels]),
};
mkdirSync('public/map', { recursive: true });
const json = JSON.stringify(out);
writeFileSync(OUT, json);
const withAddr = buildings.filter((b) => b.a).length;
console.log(`map: ${W}x${H} m, ${buildings.length} buildings (${withAddr} with address, ${matched} address nodes matched), ${lines.length} lines, ${areas.length} areas, ${(json.length / 1e6).toFixed(1)} MB`);

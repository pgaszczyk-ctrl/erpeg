// Cuts the whole Lublin map (.cache/lublin-full.json, made by build-map; not published)
// into what the game loads: a small index (public/map/lublin.json: boundary,
// big areas, addresses with their doors, places, streets) and 1 km tiles
// (public/map/lublin/<cx>_<cy>.json) fetched around the hero. It uses the
// game's own CityMap for doors, places and street start points, so run it
// with: node --experimental-strip-types scripts/split-map.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { CityMap, PX_PER_M } from '../src/map/CityMap.ts';
import { signposts } from './signposts.mjs';

const SRC = '.cache/lublin-full.json';
const OUT = 'public/map/lublin.json';
const DIR = 'public/map/lublin';
const TILE_M = 1000;

const newest = Math.max(statSync(SRC).mtimeMs, statSync(new URL(import.meta.url)).mtimeMs, statSync(new URL('./signposts.mjs', import.meta.url)).mtimeMs, statSync(new URL('../src/map/CityMap.ts', import.meta.url)).mtimeMs);
if (existsSync(OUT) && statSync(OUT).mtimeMs > newest) {
  console.log('tiles: up to date');
  process.exit(0);
}

const full = JSON.parse(readFileSync(SRC, 'utf8'));
const city = new CityMap(full);
const T = TILE_M * PX_PER_M;
const r = (v) => Math.round(v);

const tiles = new Map();
const tile = (cx, cy) => {
  const k = `${cx},${cy}`;
  let t = tiles.get(k);
  if (!t) tiles.set(k, (t = { a: [], l: [], b: [] }));
  return t;
};
const put = (box, kind, item) => {
  for (let cx = Math.floor(box.x0 / T); cx <= Math.floor(box.x1 / T); cx++)
    for (let cy = Math.floor(box.y0 / T); cy <= Math.floor(box.y1 / T); cy++) tile(cx, cy)[kind].push(item);
};

// Areas: the merged pavements and anything bigger than a tile stay in the index.
const bigAreas = [];
city.areas.forEach((a) => {
  const raw = [a.id, ...full.areas[a.id]];
  if (a.kind === 'paved' || a.x1 - a.x0 > T || a.y1 - a.y0 > T) bigAreas.push(raw);
  else put(a, 'a', raw);
});
city.lines.forEach((l) => put(l, 'l', [l.id, ...full.lines[l.id]]));
city.buildings.forEach((b) => put(b, 'b', [b.id, ...full.buildings[b.id]]));

// Buildings with an address or a name, and those of places: known up front.
const inPlaces = new Set(city.places.map((p) => p.building).filter(Boolean));
const bld = city.buildings
  .filter((b) => b.addresses.length || b.name || inPlaces.has(b))
  .map((b) => {
    const d = city.entranceOf(b);
    return [b.id, r(b.x0), r(b.y0), r(b.x1), r(b.y1), r(d.x), r(d.y), b.addresses.join(' | ') || 0, b.name || 0];
  });
const places = city.places.map((p) => [p.kind, p.name, p.id, p.building ? p.building.id : -1, r(p.door.x), r(p.door.y)]);

// Every named street: where a character starting "on that street" stands.
const streets = [];
const seen = new Set();
for (const l of city.lines) {
  if (!l.name || seen.has(l.name)) continue;
  seen.add(l.name);
  const p = city.findStart(l.name);
  if (p) streets.push([l.name, r(p.x), r(p.y)]);
}

// Road signs every 5 km out of the city (towards the places of lublin-area.json and villages).
const area = JSON.parse(readFileSync(new URL('./lublin-area.json', import.meta.url), 'utf8'));
const signs = signposts(city, area.centre, area.extra);
// Towns a start address can name (villages come from the addresses in the game).
const towns = [['Lublin', area.centre], ...area.extra.map((t) => [t.name, t])].map(([name, t]) => {
  const p = city.fromLatLon(t.lat, t.lon);
  return [name, r(p.x), r(p.y)];
});

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
let bytes = 0;
for (const [k, t] of tiles) {
  const json = JSON.stringify(t);
  bytes += json.length;
  writeFileSync(`${DIR}/${k.replace(',', '_')}.json`, json);
}
const index = {
  v: 2,
  unitsPerM: full.unitsPerM,
  w: full.w,
  h: full.h,
  x0: full.x0,
  y0: full.y0,
  bounds: full.bounds,
  origin: full.origin,
  boundary: full.boundary,
  areas: bigAreas,
  lines: [],
  buildings: [],
  tile: TILE_M,
  tiles: [...tiles.keys()],
  bld,
  places,
  postsPx: city.posts.map((p) => [r(p.x), r(p.y)]),
  streets,
  signs,
  towns,
};
const json = JSON.stringify(index);
writeFileSync(OUT, json);
console.log(`tiles: ${tiles.size} tiles of ${TILE_M} m (${(bytes / 1e6).toFixed(1)} MB, ${(bytes / tiles.size / 1e3).toFixed(0)} kB each), index ${(json.length / 1e6).toFixed(1)} MB (${bld.length} buildings with address, ${places.length} places, ${streets.length} streets)`);

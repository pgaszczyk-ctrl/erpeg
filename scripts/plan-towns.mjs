// Plans the small maps around railway stations in the Lublin region.
// Input: a GeoJSON-seq of stations (railway=station|halt) and the Lublin
// data (for the city boundary: stations inside Lublin belong to its map).
// Output: data/towns.json (the list of towns and their stations) and an
// osmium "extract" config that cuts each town out of the region file.
// Usage: node scripts/plan-towns.mjs <stations.geojsonseq> <out-dir-for-town-pbfs> <extracts.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [stationsFile, townDir, extractsFile] = process.argv.slice(2);
const readSeq = (buf) => buf.toString('utf8').split('\n').map((l) => l.replace(/^\x1e/, '').trim()).filter(Boolean).map((l) => JSON.parse(l));

// Lublin city boundary (stations inside it are on the Lublin map).
const lublin = readSeq(gunzipSync(readFileSync('data/lublin-osm.geojsonseq.gz'))).find((f) => {
  const t = f.properties || {};
  return t.boundary === 'administrative' && t.name === 'Lublin' && ['6', '7', '8'].includes(t.admin_level);
});
const rings = lublin ? (lublin.geometry.type === 'Polygon' ? lublin.geometry.coordinates : lublin.geometry.coordinates.flat()) : [];
const inLublin = (lon, lat) => {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

const HALF_M = 1300; // each station gets a square of ~2.6 km
const JOIN_M = 2500; // stations closer than this share one town map
const M_LAT = 111132;
const mLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

const stations = [];
for (const f of readSeq(readFileSync(stationsFile))) {
  const t = f.properties || {};
  if (!t.name || f.geometry.type !== 'Point') continue;
  if (!(t.railway === 'station' || t.railway === 'halt')) continue;
  if (t.station && t.station !== 'train') continue;
  // Stations over the border (Ukraine, Belarus) are in the region file too.
  if (/[\u0400-\u04FF]/.test(t.name)) continue;
  const [lon, lat] = f.geometry.coordinates;
  if (stations.some((s) => s.name === t.name && Math.hypot((s.lon - lon) * mLon(lat), (s.lat - lat) * M_LAT) < 300)) continue;
  stations.push({ name: t.name, lon, lat, kind: t.railway });
}

const slug = (s) => s.toLowerCase()
  .replace(/[ąàá]/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l').replace(/ń/g, 'n')
  .replace(/[óò]/g, 'o').replace(/ś/g, 's').replace(/[źż]/g, 'z')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const lublinStations = stations.filter((s) => inLublin(s.lon, s.lat));
const others = stations.filter((s) => !inLublin(s.lon, s.lat)).sort((a, b) => (a.kind === 'station' ? 0 : 1) - (b.kind === 'station' ? 0 : 1));

// Greedy clustering: bigger stations first, nearby halts join them.
const towns = [];
for (const s of others) {
  const town = towns.find((t) => t.stations.some((o) => Math.hypot((o.lon - s.lon) * mLon(s.lat), (o.lat - s.lat) * M_LAT) < JOIN_M));
  if (town && town.stations.length < 4) town.stations.push(s);
  else towns.push({ stations: [s] });
}
const used = new Set(['lublin']);
const out = towns.map((t) => {
  const main = t.stations[0];
  let id = slug(main.name) || 'stacja';
  for (let i = 2; used.has(id); i++) id = `${slug(main.name)}-${i}`;
  used.add(id);
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  for (const s of t.stations) {
    const dLon = HALF_M / mLon(s.lat);
    const dLat = HALF_M / M_LAT;
    x0 = Math.min(x0, s.lon - dLon); x1 = Math.max(x1, s.lon + dLon);
    y0 = Math.min(y0, s.lat - dLat); y1 = Math.max(y1, s.lat + dLat);
  }
  const r = (v) => Math.round(v * 1e5) / 1e5;
  return { id, name: main.name, bbox: [r(x0), r(y0), r(x1), r(y1)], stations: t.stations.map(({ name, lon, lat }) => ({ name, lon, lat })) };
});

writeFileSync('data/towns.json', JSON.stringify({ lublin: lublinStations.map(({ name, lon, lat }) => ({ name, lon, lat })), towns: out }, null, 1));
writeFileSync(extractsFile, JSON.stringify({ directory: townDir, extracts: out.map((t) => ({ output: `${t.id}.pbf`, bbox: t.bbox })) }));
console.log(`towns: ${out.length} towns from ${others.length} stations, ${lublinStations.length} stations in Lublin`);

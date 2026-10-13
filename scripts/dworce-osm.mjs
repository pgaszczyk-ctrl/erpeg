#!/usr/bin/env node
// Railway and bus stations of the whole world from OpenStreetMap, for the traveller's map
// (run by the „World stations” workflow; the sandbox can't reach Overpass).
// The world map file has stations only at zoom 14 (~1.5 km pieces), so a 50 km circle would
// need thousands of pieces – hence this small list, cut into 2° × 2° cells and read by the
// game only for players who bought the map (src/huby.ts).
// Output: public/dworce/<floor(lat/2)>_<floor(lon/2)>.json = [[name, lat, lon, kind]]
//   kind 'k' = railway station, 'a' = bus station; plus public/dworce/index.json = the cells there are.
// `--from <file>` reads a saved answer (elements JSON) instead of asking Overpass, `--save <file>` keeps it.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
/** Stations of one name closer than this (km) are one station (platform nodes, station areas, both sides of a road). */
const DUPLIKAT_KM = 0.4;

async function overpass(q, name, tries = 2) {
  for (let round = 0; round < tries; round++) {
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'exp-lore.app world stations (github actions)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.remark && /runtime error|out of memory|timed out/i.test(json.remark)) throw new Error(json.remark);
        return json;
      } catch (e) {
        console.log(`[${name}] ${url} failed: ${e.message}`);
        await new Promise((r) => setTimeout(r, 15000 * (round + 1)));
      }
    }
  }
  return null;
}

// The world at once times out, so it is asked box by box (a box that still fails is split in four).
async function box(s, w, n, e, depth = 0) {
  const q = `[out:json][timeout:180][maxsize:536870912][bbox:${s},${w},${n},${e}];
(
  nwr[railway=station][name][station!~"^(subway|light_rail|monorail|funicular|miniature|tram)$"];
  nwr[railway=halt][name][train=yes];
  nwr[amenity=bus_station][name];
);
out center tags;`;
  const j = await overpass(q, `${s},${w},${n},${e}`, depth < 3 ? 1 : 2);
  if (j) {
    console.log(`box ${s},${w},${n},${e}: ${j.elements.length}`);
    return j.elements;
  }
  if (depth >= 4) throw new Error(`Overpass: box ${s},${w},${n},${e} failed`);
  const ms = (s + n) / 2, mw = (w + e) / 2, out = [];
  for (const [a, b, c, d] of [[s, w, ms, mw], [s, mw, ms, e], [ms, w, n, mw], [ms, mw, n, e]]) out.push(...(await box(a, b, c, d, depth + 1)));
  return out;
}

const arg = (k) => (process.argv.indexOf(k) >= 0 ? process.argv[process.argv.indexOf(k) + 1] : null);
let all;
if (arg('--from')) all = JSON.parse(readFileSync(arg('--from'), 'utf8'));
else {
  all = [];
  for (let s = -60; s < 80; s += 10) for (let w = -180; w < 180; w += 15) {
    all.push(...(await box(s, w, s + 10, w + 15)));
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (arg('--save')) writeFileSync(arg('--save'), JSON.stringify(all));
}

const seen = new Set();
const cells = new Map();
const km = (a, b) => Math.hypot((a[1] - b[1]) * 111.32, (a[2] - b[2]) * 111.32 * Math.cos((a[1] * Math.PI) / 180));
let n = 0;
for (const e of all) {
  if (seen.has(`${e.type}${e.id}`)) continue;
  seen.add(`${e.type}${e.id}`);
  const t = e.tags ?? {};
  if (t.disused || t['disused:railway'] || t.abandoned || /^(disused|abandoned|construction|proposed)$/.test(t.railway ?? '')) continue;
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
  if (lat === undefined || lon === undefined) continue;
  const kind = t.amenity === 'bus_station' ? 'a' : 'k';
  const name = String(t['name:pl'] ?? t.name).slice(0, 60);
  const s = [name, Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, kind];
  const key = `${Math.floor(lat / 2)}_${Math.floor(lon / 2)}`;
  const list = cells.get(key) ?? [];
  if (list.some((q) => q[3] === kind && q[0] === name && km(q, s) < DUPLIKAT_KM)) continue;
  list.push(s);
  cells.set(key, list);
  n++;
}
rmSync('public/dworce', { recursive: true, force: true });
mkdirSync('public/dworce', { recursive: true });
for (const [key, list] of cells) writeFileSync(`public/dworce/${key}.json`, JSON.stringify(list));
writeFileSync('public/dworce/index.json', JSON.stringify({ v: new Date().toISOString().slice(0, 10), komorki: [...cells.keys()].sort() }));
console.log(`${n} stations in ${cells.size} cells`);
for (const k of ['25_11', '26_9', '24_10']) console.log(k, (cells.get(k) ?? []).slice(0, 8).map((s) => `${s[3]}:${s[0]}`).join(', '));

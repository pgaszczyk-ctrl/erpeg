#!/usr/bin/env node
// Ferry lines of the whole world from OpenStreetMap (run by the „Ferry ports” workflow;
// the sandbox can't reach Overpass). Output: public/porty.json
//   { v, porty: [[id, name, lat, lon, terminal|null]], linie: [[a, b, km, name|null]] }
// - every route=ferry way longer than MIN_WAY_KM, joined end to end through nodes
//   that only two ways share (long routes are often split into several ways),
// - a line = a joined chain from MIN_KM to MAX_KM long (its real length on the water),
// - its ends are grouped into ports (within PORT_R_KM), each moved onto the nearest
//   ferry terminal (amenity=ferry_terminal, on land) within TERMINAL_KM,
// - a port is named after the nearest city/town within TOWN_KM, else the terminal,
//   else the line's name ("A – B").
// `node scripts/promy-osm.mjs --from <dir>` reads saved answers (ways.json,
// terminals.json, towns.json) instead of asking Overpass.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const MIN_WAY_KM = 1.5;
const MIN_KM = 12;
const MAX_KM = 2500;
const PORT_R_KM = 3;
const TERMINAL_KM = 2.5;
const TOWN_KM = 20;

const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

async function overpass(q, name) {
  for (let round = 0; round < 3; round++) {
    for (const url of SERVERS) {
      try {
        console.log(`[${name}] ${url}`);
        const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'exp-lore.app ferry ports (github actions)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.remark && !json.elements?.length) throw new Error(json.remark);
        console.log(`[${name}] ${json.elements.length} elements`);
        return json;
      } catch (e) {
        console.log(`[${name}] failed: ${e.message}`);
        await new Promise((r) => setTimeout(r, 20000));
      }
    }
  }
  throw new Error(`Overpass: ${name} failed`);
}

const from = process.argv.indexOf('--from') >= 0 ? process.argv[process.argv.indexOf('--from') + 1] : null;
const save = process.argv.indexOf('--save') >= 0 ? process.argv[process.argv.indexOf('--save') + 1] : null;
async function get(file, q) {
  if (from) return JSON.parse(readFileSync(`${from}/${file}`, 'utf8'));
  const j = await overpass(q, file);
  if (save) {
    mkdirSync(save, { recursive: true });
    writeFileSync(`${save}/${file}`, JSON.stringify(j));
  }
  return j;
}

const ways = await get('ways.json', `[out:json][timeout:1800][maxsize:2000000000];
way[route=ferry](if: length() > ${MIN_WAY_KM * 1000});
out body geom;`);
const terminals = await get('terminals.json', `[out:json][timeout:900];
nwr[amenity=ferry_terminal];
out center tags;`);
const towns = await get('towns.json', `[out:json][timeout:900];
node[place~"^(city|town)$"][name];
out tags;`);

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const dl = rad(b.lat - a.lat);
  const dn = rad(b.lon - a.lon);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A coarse grid for nearest-point searches (1° cells).
function grid(points) {
  const g = new Map();
  for (const p of points) {
    const k = `${Math.floor(p.lat)}|${Math.floor(p.lon)}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  }
  return (at, maxKm) => {
    let best = null;
    let bd = maxKm;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const p of g.get(`${Math.floor(at.lat) + dy}|${Math.floor(at.lon) + dx}`) ?? []) {
        const d = km(at, p);
        if (d < bd) (bd = d), (best = p);
      }
    }
    return best;
  };
}

const bad = (t) => t.access === 'private' || t.access === 'no' || t.foot === 'no' || /cargo|freight|towarow/i.test(t.name ?? '');

// ---------------------------------------------------------------- join the ways
const list = ways.elements.filter((w) => w.type === 'way' && w.geometry?.length >= 2 && w.nodes?.length >= 2 && !bad(w.tags ?? {}));
const len = (w) => w.geometry.reduce((s, p, i, a) => (i ? s + km(a[i - 1], p) : 0), 0);
const ends = new Map(); // node id → way indexes
list.forEach((w, i) => {
  w.km = len(w);
  for (const n of [w.nodes[0], w.nodes[w.nodes.length - 1]]) {
    if (!ends.has(n)) ends.set(n, []);
    ends.get(n).push(i);
  }
});
const terminalAt = grid(terminals.elements.map((e) => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, name: e.tags?.name ?? null })).filter((p) => p.lat !== undefined));
const used = new Set();
const chains = [];
// Join through a node only when exactly two ways meet there and no terminal is near it.
const joinable = (node, at) => ends.get(node)?.length === 2 && !terminalAt(at, 1);
for (let i = 0; i < list.length; i++) {
  if (used.has(i)) continue;
  used.add(i);
  let pts = [...list[i].geometry];
  let first = list[i].nodes[0];
  let last = list[i].nodes[list[i].nodes.length - 1];
  let total = list[i].km;
  const names = new Set([list[i].tags?.name].filter(Boolean));
  for (const side of ['end', 'start']) {
    for (;;) {
      const node = side === 'end' ? last : first;
      const at = side === 'end' ? pts[pts.length - 1] : pts[0];
      if (!joinable(node, at)) break;
      const j = ends.get(node).find((k) => !used.has(k));
      if (j === undefined) break;
      used.add(j);
      const w = list[j];
      const forward = w.nodes[0] === node;
      const g = forward ? w.geometry : [...w.geometry].reverse();
      const other = forward ? w.nodes[w.nodes.length - 1] : w.nodes[0];
      if (side === 'end') {
        pts = pts.concat(g.slice(1));
        last = other;
      } else {
        pts = [...g.reverse().slice(0, -1), ...pts];
        first = other;
      }
      total += w.km;
      if (w.tags?.name) names.add(w.tags.name);
      if (total > MAX_KM * 2) break;
    }
  }
  chains.push({ a: pts[0], b: pts[pts.length - 1], km: total, name: [...names][0] ?? null });
}
const lines = chains.filter((c) => c.km >= MIN_KM && c.km <= MAX_KM && km(c.a, c.b) >= MIN_KM * 0.5);
console.log(`ways ${list.length}, chains ${chains.length}, lines ${lines.length}`);

// ---------------------------------------------------------------- ports
const townAt = grid(towns.elements.map((e) => ({ lat: e.lat, lon: e.lon, name: e.tags['name:pl'] ?? e.tags.name, en: e.tags['name:en'] ?? e.tags.name })));
const ports = [];
const portAt = (p) => {
  for (const q of ports) if (km(q.end, p) < PORT_R_KM) return q;
  const q = { end: { lat: p.lat, lon: p.lon }, names: new Set() };
  ports.push(q);
  return q;
};
// A faster search over the ports made so far (they grow while lines are read).
const out = [];
for (const l of lines) {
  const a = portAt(l.a);
  const b = portAt(l.b);
  if (a === b) continue;
  if (l.name) {
    const parts = l.name.split(/\s+[–—-]\s+|\s*↔\s*/);
    if (parts.length === 2) a.names.add(parts[0].trim()), b.names.add(parts[1].trim());
  }
  out.push({ a, b, km: l.km, name: l.name });
}
const live = ports.filter((p) => out.some((l) => l.a === p || l.b === p));
live.forEach((p, i) => {
  p.id = i;
  const t = terminalAt(p.end, TERMINAL_KM);
  p.at = t ? { lat: t.lat, lon: t.lon } : p.end;
  p.terminal = t?.name ?? null;
  const town = townAt(p.at, TOWN_KM);
  p.name = town?.name ?? p.terminal ?? [...p.names][0] ?? `Port ${i}`;
});
// One line per pair of ports (the shortest way between them).
const pairs = new Map();
for (const l of out) {
  const k = l.a.id < l.b.id ? `${l.a.id}|${l.b.id}` : `${l.b.id}|${l.a.id}`;
  const old = pairs.get(k);
  if (!old || l.km < old.km) pairs.set(k, l);
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const json = {
  v: new Date().toISOString().slice(0, 10),
  porty: live.map((p) => [p.id, p.name, r4(p.at.lat), r4(p.at.lon), p.terminal]),
  linie: [...pairs.values()].map((l) => [l.a.id, l.b.id, Math.round(l.km), l.name]),
};
writeFileSync('public/porty.json', JSON.stringify(json));
console.log(`ports ${json.porty.length}, lines ${json.linie.length}, ${(JSON.stringify(json).length / 1024).toFixed(0)} kB`);
// A few the owner asked about, for the log.
for (const n of ['Gdynia', 'Gdańsk', 'Świnoujście', 'Karlskrona', 'Ystad', 'Rotterdam', 'Hoek van Holland', 'Barcelona', 'Palma', 'Genova', 'Palermo', 'Nagapattinam', 'Kankesanthurai', 'Jaffna', 'Rameswaram', 'Colombo']) {
  const ps = json.porty.filter((p) => p[1] === n || p[4]?.includes(n));
  for (const p of ps) {
    const dest = json.linie.filter((l) => l[0] === p[0] || l[1] === p[0]).map((l) => `${json.porty[l[0] === p[0] ? l[1] : l[0]][1]} ${l[2]} km`);
    console.log(`${n}: ${p[2]},${p[3]} [${p[4] ?? '-'}] → ${dest.join('; ') || '(none)'}`);
  }
  if (!ps.length) console.log(`${n}: no port`);
}

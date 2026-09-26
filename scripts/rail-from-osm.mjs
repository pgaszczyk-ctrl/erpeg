// Which game station follows which along the railway lines, for the
// coachmen: read from OpenStreetMap train routes (route=train relations list
// their stops in order), given as OPL (osmium cat -f opl). Stops are matched
// to the game's stations (data/towns.json) by position.
// Usage: node scripts/rail-from-osm.mjs <routes.opl>
import { readFileSync, writeFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync('data/towns.json', 'utf8'));
const ours = [
  ...plan.lublin.map((s) => ({ key: `lublin|${s.name}`, ...s })),
  ...plan.towns.flatMap((t) => t.stations.map((s) => ({ key: `${t.id}|${s.name}`, ...s }))),
];
const M_LAT = 111132;
const mLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const nearest = (lon, lat) => {
  let best = null;
  let bd = 600; // metres
  for (const s of ours) {
    const d = Math.hypot((s.lon - lon) * mLon(lat), (s.lat - lat) * M_LAT);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
};

// OPL: one object per line, fields split by spaces: id, v, …, T tags, M members, x/y.
const nodes = new Map(); // id -> [lon, lat]
const ways = new Map(); // id -> first node id
const routes = [];
for (const line of readFileSync(process.argv[2], 'utf8').split('\n')) {
  if (!line) continue;
  const f = Object.fromEntries(line.split(' ').map((p) => [p[0], p.slice(1)]));
  const kind = line[0];
  const id = line.slice(1, line.indexOf(' '));
  if (kind === 'n' && f.x) nodes.set(id, [Number(f.x), Number(f.y)]);
  else if (kind === 'w' && f.N) ways.set(id, f.N.split(',')[0].slice(1));
  else if (kind === 'r' && f.M) routes.push(f.M.split(','));
}

const edges = new Set();
for (const members of routes) {
  const seq = [];
  for (const m of members) {
    const [ref, role = ''] = m.split('@');
    if (!/^(stop|platform)/.test(role)) continue;
    const nid = ref[0] === 'n' ? ref.slice(1) : ref[0] === 'w' ? ways.get(ref.slice(1)) : null;
    const at = nid && nodes.get(nid);
    const s = at && nearest(at[0], at[1]);
    if (s && seq[seq.length - 1] !== s.key) seq.push(s.key);
  }
  for (let i = 0; i + 1 < seq.length; i++) if (seq[i] !== seq[i + 1]) edges.add(`${seq[i]}>${seq[i + 1]}`);
}

const out = [...edges].map((e) => {
  const [from, to] = e.split('>');
  return { from, to };
});
writeFileSync('data/rail.json', JSON.stringify({ source: 'osm', edges: out }));
console.log(`rail: ${routes.length} train routes, ${out.length} links between game stations`);

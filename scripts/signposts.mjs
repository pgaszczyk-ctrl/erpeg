// Road signs (kierunkowskazy) for the Lublin map, worked out by split-map from
// the whole map: a sign every 5 km of road from the city centre (the first ones
// on the city's outskirts), each listing up to 3 places that road leads to and
// the way back to Lublin, with real walking distances along the roads.
import { PX_PER_M } from '../src/map/CityMap.ts';

const STEP_M = 5000; // a sign every 5 km of road
const MIN_FROM_CENTRE_M = 4000; // not inside the city itself
const APART_M = 900; // signs closer than this are merged
const SIGN_ROADS = new Set(['major', 'medium', 'minor']); // signs stand on these
const WALK_ROADS = new Set(['major', 'medium', 'minor', 'service', 'track', 'pedestrian', 'path', 'steps']);
const MIN_HOUSES = 30; // villages worth a sign

class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
  get size() { return this.k.length; }
}

/** The walking graph: road points rounded to 2 px, so crossing roads share nodes. */
function graph(city) {
  const ids = new Map();
  const xs = [], ys = [];
  const edges = []; // [a, b, len, line]
  const node = (x, y) => {
    const k = `${Math.round(x / 2)}:${Math.round(y / 2)}`;
    let id = ids.get(k);
    if (id === undefined) {
      id = xs.length;
      ids.set(k, id);
      xs.push(x); ys.push(y);
    }
    return id;
  };
  for (const l of city.lines) {
    if (!WALK_ROADS.has(l.kind)) continue;
    for (let i = 0; i + 3 < l.pts.length; i += 2) {
      const a = node(l.pts[i], l.pts[i + 1]), b = node(l.pts[i + 2], l.pts[i + 3]);
      if (a !== b) edges.push([a, b, Math.hypot(xs[b] - xs[a], ys[b] - ys[a]), l]);
    }
  }
  const n = xs.length;
  const deg = new Int32Array(n + 1);
  for (const [a, b] of edges) { deg[a + 1]++; deg[b + 1]++; }
  for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
  const to = new Int32Array(deg[n]), len = new Float64Array(deg[n]);
  const fill = deg.slice();
  for (const [a, b, d] of edges) {
    to[fill[a]] = b; len[fill[a]++] = d;
    to[fill[b]] = a; len[fill[b]++] = d;
  }
  // Nearest node to a point (a coarse grid of nodes).
  const G = 200;
  const grid = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.floor(xs[i] / G)}:${Math.floor(ys[i] / G)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)).push(i);
  }
  const nearest = (x, y) => {
    for (let r = 0; r < 20; r++) {
      let best = -1, bd = Infinity;
      const cx = Math.floor(x / G), cy = Math.floor(y / G);
      for (let gx = cx - r; gx <= cx + r; gx++) for (let gy = cy - r; gy <= cy + r; gy++)
        for (const i of grid.get(`${gx}:${gy}`) ?? []) {
          const d = Math.hypot(xs[i] - x, ys[i] - y);
          if (d < bd) { bd = d; best = i; }
        }
      if (best >= 0) return best;
    }
    return -1;
  };
  const dijkstra = (src) => {
    const dist = new Float64Array(n).fill(Infinity);
    dist[src] = 0;
    const h = new Heap();
    h.push(0, src);
    while (h.size) {
      const u = h.pop();
      const du = dist[u];
      for (let e = deg[u]; e < deg[u + 1]; e++) {
        const v = to[e], dv = du + len[e];
        if (dv < dist[v]) { dist[v] = dv; h.push(dv, v); }
      }
    }
    return dist;
  };
  return { xs, ys, edges, nearest, dijkstra };
}

/**
 * @param city the whole Lublin map (CityMap)
 * @param towns named places with lat/lon (lublin-area.json extras) plus the centre
 * @returns [x, y, ...'Name|km'] – the first entry is the way back to Lublin
 */
export function signposts(city, centre, towns) {
  const t0 = Date.now();
  const g = graph(city);
  const M = PX_PER_M;
  const c = city.fromLatLon(centre.lat, centre.lon);
  const src = g.nearest(c.x, c.y);
  const d0 = g.dijkstra(src);

  // Places to point to: the named towns and the bigger villages.
  const dests = [];
  for (const t of towns) {
    const p = city.fromLatLon(t.lat, t.lon);
    dests.push({ name: t.name, x: p.x, y: p.y, big: true });
  }
  const houses = new Map();
  for (const b of city.addressed()) {
    const m = b.addresses[0].match(/^(.*\D)\s+\d+\S*$/);
    if (m) houses.set(m[1].trim(), (houses.get(m[1].trim()) ?? 0) + 1);
  }
  for (const s of city.settlements()) {
    if ((houses.get(s.name) ?? 0) < MIN_HOUSES) continue;
    if (dests.some((d) => d.name === s.name || Math.hypot(d.x - s.x, d.y - s.y) < 1500 * M)) continue;
    dests.push({ name: s.name, x: s.x, y: s.y, big: false });
  }
  for (const d of dests) {
    d.node = g.nearest(d.x, d.y);
    d.fromCentre = d0[d.node];
  }
  const reach = dests.filter((d) => Number.isFinite(d.fromCentre) && d.fromCentre > MIN_FROM_CENTRE_M * M);
  for (const d of reach) d.dist = g.dijkstra(d.node);

  // Where the road distance from the centre crosses 5, 10, 15… km.
  const step = STEP_M * M;
  const spots = [];
  for (const [a, b, , l] of g.edges) {
    if (!SIGN_ROADS.has(l.kind)) continue;
    const da = d0[a], db = d0[b];
    if (!Number.isFinite(da) || !Number.isFinite(db)) continue;
    const ka = Math.floor(da / step), kb = Math.floor(db / step);
    if (ka === kb) continue;
    const k = Math.max(ka, kb);
    const at = k * step;
    const f = (at - da) / (db - da);
    const x = g.xs[a] + (g.xs[b] - g.xs[a]) * f, y = g.ys[a] + (g.ys[b] - g.ys[a]) * f;
    if (Math.hypot(x - c.x, y - c.y) < MIN_FROM_CENTRE_M * M) continue;
    const rank = l.kind === 'major' ? 0 : l.kind === 'medium' ? 1 : 2;
    // Beside the road, to the right of the way out.
    const dx = g.xs[b] - g.xs[a], dy = g.ys[b] - g.ys[a];
    const len = Math.hypot(dx, dy) || 1;
    const out = db > da ? 1 : -1;
    const side = (l.width || 6) / 2 + 5;
    spots.push({ x: x - (dy / len) * out * side, y: y + (dx / len) * out * side, rx: x, ry: y, a, b, f, rank, at });
  }
  spots.sort((p, q) => p.rank - q.rank);
  const kept = [];
  for (const s of spots) if (!kept.some((k) => Math.hypot(k.x - s.x, k.y - s.y) < APART_M * M)) kept.push(s);

  const km = (px) => Math.max(1, Math.round(px / M / 1000));
  const out = [];
  for (const s of kept) {
    const ahead = [];
    for (const d of reach) {
      const ds = d.dist[s.a] + (d.dist[s.b] - d.dist[s.a]) * s.f;
      if (!Number.isFinite(ds) || ds < 800 * M) continue;
      // On the way: going through the sign costs little extra.
      if (s.at + ds > d.fromCentre * 1.08 + 600 * M) continue;
      ahead.push({ d, ds });
    }
    if (!ahead.length) continue;
    ahead.sort((p, q) => p.ds - q.ds);
    const pick = [];
    // The nearest village, then the towns further on.
    for (const a of ahead) if (pick.length < 1) pick.push(a);
    for (const a of ahead) if (pick.length < 3 && a.d.big && !pick.includes(a)) pick.push(a);
    for (const a of ahead) if (pick.length < 3 && !pick.includes(a)) pick.push(a);
    pick.sort((p, q) => p.ds - q.ds);
    const row = pick.map((p) => p.d.name).join();
    if (out.some((o) => o.row === row && Math.hypot(o[0] - s.x, o[1] - s.y) < 2500 * M)) continue;
    out.push([Math.round(s.x), Math.round(s.y), `Lublin|${km(s.at)}`, ...pick.map((p) => `${p.d.name}|${km(p.ds)}`)]);
    out[out.length - 1].row = row;
  }
  for (const o of out) delete o.row;
  console.log(`signs: ${out.length} (${g.xs.length} road nodes, ${reach.length} places, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return out;
}

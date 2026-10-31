/** Pure, metre-based planner. Map adapters must preserve access and grade separation. */
export type Point = { x: number; y: number };
export type Road = {
  id: string;
  name: string;
  points: Point[];
  width: number;
  level: string;
};
export type Obstacle = { kind: string; rings: Point[][] };
export type Input = {
  id: string;
  city?: {
    name: string;
    population: number;
    center: Point;
    boundary?: Point[][];
  };
  roads: Road[];
  buildings: Point[];
  obstacles: Obstacle[];
  airports: {
    id: string;
    name: string;
    entrances: Point[];
    complete: boolean;
    boundary?: Point[][];
    outsideOnly?: boolean;
  }[];
};
export type Stop = Point & {
  id: string;
  name: string;
  airport?: boolean;
  disabled?: boolean;
  anchor: string;
};
export type Network = {
  id: string;
  version: number;
  stops: Stop[];
  edges: [string, string][];
  diagnostics: {
    rejected: (Point & { reason: string })[];
    uncovered: Point[];
    covered: number;
    demands: number;
    maxWalkM: number;
    diameter: number;
    meanHops: number;
    missing: string[];
  };
};
export const RULES = {
  version: 2,
  minCityPopulation: 100000,
  cityStops: 0,
  maxStops: 0,
  maxCityStops: 40,
  centralStops: 2,
  centralRadiusM: 1800,
  candidateGridM: 400,
  walkMps: 70 / 3.6,
  walkSeconds: 90,
  sampleM: 220,
  minSpacingM: 600,
  attachM: 140,
  clearM: 7,
  maxDegree: 4,
  airportDegree: 2,
  airportMaxM: 22000,
  price: 5,
};
export type Rules = typeof RULES;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function inside(p: Point, rings: Point[][]) {
  let yes = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i],
        b = r[j];
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        yes = !yes;
    }
  return yes;
}
function segmentDistance(p: Point, a: Point, b: Point) {
  const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = d
    ? Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / d,
        ),
      )
    : 0;
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
/** Spatial index keeps large OSM extracts off the quadratic path. */
class Index<T> {
  cells = new Map<string, T[]>();
  constructor(readonly size = 200) {}
  add(p: Point, v: T) {
    const k = this.key(p);
    this.cells.set(k, [...(this.cells.get(k) ?? []), v]);
  }
  key(p: Point) {
    return `${Math.floor(p.x / this.size)},${Math.floor(p.y / this.size)}`;
  }
  near(p: Point, r: number) {
    const out: T[] = [];
    for (
      let x = Math.floor((p.x - r) / this.size);
      x <= Math.floor((p.x + r) / this.size);
      x++
    )
      for (
        let y = Math.floor((p.y - r) / this.size);
        y <= Math.floor((p.y + r) / this.size);
        y++
      )
        out.push(...(this.cells.get(`${x},${y}`) ?? []));
    return out;
  }
}
export function safety(input: Input, walking = false) {
  const index = new Index<Obstacle>();
  for (const o of input.obstacles) {
    if (walking && o.kind === "carriageway") continue;
    const ps = o.rings.flat();
    if (!ps.length) continue;
    const x0 = Math.min(...ps.map((p) => p.x)),
      y0 = Math.min(...ps.map((p) => p.y)),
      x1 = Math.max(...ps.map((p) => p.x)),
      y1 = Math.max(...ps.map((p) => p.y));
    for (let x = Math.floor(x0 / 200); x <= Math.floor(x1 / 200); x++)
      for (let y = Math.floor(y0 / 200); y <= Math.floor(y1 / 200); y++)
        index.add({ x: x * 200, y: y * 200 }, o);
  }
  return (p: Point, clear = 0): string | null => {
    for (const o of new Set(index.near(p, clear))) {
      if (inside(p, o.rings)) return o.kind;
      if (clear)
        for (const r of o.rings)
          for (let i = 0; i < r.length; i++)
            if (segmentDistance(p, r[i], r[(i + 1) % r.length]) < clear)
              return o.kind;
    }
    return null;
  };
}
type Node = Point & {
  id: string;
  adj: Map<string, number>;
  name: string;
  end?: boolean;
};
/** Dijkstra with a binary heap, bounded for coverage queries. */
function paths(
  nodes: Map<string, Node>,
  starts: [string, number][],
  limit = Infinity,
) {
  const d = new Map<string, number>(),
    heap: [number, string][] = [];
  const push = (v: [number, string]) => {
    heap.push(v);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= v[0]) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = v;
  };
  for (const [k, v] of starts) {
    d.set(k, v);
    push([v, k]);
  }
  while (heap.length) {
    const [cost, k] = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let j = i;
        for (const c of [i * 2 + 1, i * 2 + 2])
          if (c < heap.length && heap[c][0] < heap[j][0]) j = c;
        if (i === j) break;
        [heap[i], heap[j]] = [heap[j], heap[i]];
        i = j;
      }
    }
    if (cost !== d.get(k) || cost > limit) continue;
    for (const [next, len] of nodes.get(k)!.adj) {
      const v = cost + len;
      if (v <= limit && v < (d.get(next) ?? Infinity)) {
        d.set(next, v);
        push([v, next]);
      }
    }
  }
  return d;
}
export function route(
  n: Pick<Network, "stops" | "edges">,
  from: string,
  to: string,
): string[] | null {
  const active = new Set(n.stops.filter((s) => !s.disabled).map((s) => s.id));
  if (!active.has(from) || !active.has(to)) return null;
  const prev = new Map<string, string | null>([[from, null]]),
    q = [from];
  for (let i = 0; i < q.length; i++)
    for (const [a, b] of n.edges) {
      const v = a === q[i] ? b : b === q[i] ? a : null;
      if (v && active.has(v) && !prev.has(v)) {
        prev.set(v, q[i]);
        q.push(v);
      }
    }
  if (!prev.has(to)) return null;
  const out = [to];
  while (out[0] !== from) out.unshift(prev.get(out[0])!);
  return out;
}
/** Degree-bounded connected backbone, then chords with maximum all-pairs hop reduction. */
export function connect(
  stops: Stop[],
  rules: Rules = RULES,
): [string, string][] {
  const active = stops
    .filter((s) => !s.disabled)
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges: [string, string][] = [],
    edgeKeys = new Set<string>(),
    degree = new Map(active.map((s) => [s.id, 0])),
    group = new Map(active.map((s) => [s.id, s.id]));
  const root = (s: string): string => {
    const p = group.get(s)!;
    return p === s ? s : root(p);
  };
  const pairs = active
    .flatMap((a, i) =>
      active.slice(i + 1).map((b) => ({ a, b, d: distance(a, b) })),
    )
    .filter(
      ({ a, b, d }) =>
        !(a.airport && b.airport) &&
        (!(a.airport || b.airport) || d <= rules.airportMaxM),
    )
    .sort(
      (a, b) =>
        a.d - b.d ||
        a.a.id.localeCompare(b.a.id) ||
        a.b.id.localeCompare(b.b.id),
    );
  const room = (s: Stop) =>
    (degree.get(s.id) ?? 0) <
    (s.airport ? rules.airportDegree : rules.maxDegree);
  const add = (a: Stop, b: Stop) => {
    edges.push([a.id, b.id]);
    edgeKeys.add(`${a.id}|${b.id}`);
    degree.set(a.id, degree.get(a.id)! + 1);
    degree.set(b.id, degree.get(b.id)! + 1);
  };
  // Build city backbone first: airports must never be bridges joining separate cities.
  for (const { a, b } of pairs.filter((p) => !p.a.airport && !p.b.airport))
    if (root(a.id) !== root(b.id) && room(a) && room(b)) {
      group.set(root(b.id), root(a.id));
      add(a, b);
    }
  for (const airport of active.filter((s) => s.airport))
    for (const { a, b } of pairs
      .filter(
        (p) => (p.a === airport || p.b === airport) && room(p.a) && room(p.b),
      )
      .slice(0, rules.airportDegree))
      if (room(a) && room(b)) {
        add(a, b);
        group.set(root(airport.id), root(a === airport ? b.id : a.id));
      }
  // A degree-bounded MST can exhaust a cut. Deterministic path fallback guarantees connectivity for city stops.
  const cities = active.filter((s) => !s.airport);
  if (new Set(cities.map((s) => root(s.id))).size > 1) {
    edges.splice(0, edges.length, ...connectPath(active, rules));
    edgeKeys.clear();
    for (const [a, b] of edges) edgeKeys.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    for (const s of active)
      degree.set(s.id, edges.filter((e) => e.includes(s.id)).length);
  }
  for (;;) {
    const n = { stops: active, edges },
      eligible = pairs.filter(
        ({ a, b }) =>
          !a.airport &&
          !b.airport &&
          room(a) &&
          room(b) &&
          !edgeKeys.has(`${a.id}|${b.id}`),
      );
    let best: (typeof eligible)[number] | undefined,
      bestGain = 0;
    const hops = new Map<string, number>(),
      adj = new Map(active.map((s) => [s.id, [] as string[]]));
    for (const [a, b] of n.edges) {
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
    for (const a of cities) {
      const q = [a.id],
        ds = new Map([[a.id, 0]]);
      for (let i = 0; i < q.length; i++)
        for (const b of adj.get(q[i]) ?? [])
          if (!ds.has(b)) {
            ds.set(b, ds.get(q[i])! + 1);
            q.push(b);
          }
      for (const b of cities)
        hops.set(`${a.id}|${b.id}`, ds.get(b.id) ?? Infinity);
    }
    for (const p of eligible) {
      const direct = hops.get(`${p.a.id}|${p.b.id}`) ?? 0;
      const score = (direct - 1) / (1 + p.d / 30000);
      if (direct > 2 && score > bestGain) {
        bestGain = score;
        best = p;
      }
    }
    if (!best || bestGain <= 0) break;
    add(best.a, best.b);
  }
  return edges;
}
function connectPath(stops: Stop[], rules: Rules): [string, string][] {
  const remaining = stops.filter((s) => !s.airport),
    ordered: Stop[] = [];
  if (remaining.length) ordered.push(remaining.shift()!);
  while (remaining.length) {
    remaining.sort(
      (a, b) =>
        distance(a, ordered.at(-1)!) - distance(b, ordered.at(-1)!) ||
        a.id.localeCompare(b.id),
    );
    ordered.push(remaining.shift()!);
  }
  const edges: [string, string][] = ordered
    .slice(1)
    .map((s, i) => [ordered[i].id, s.id]);
  for (const a of stops.filter((s) => s.airport)) {
    const s = ordered
      .filter(
        (s) =>
          distance(a, s) <= rules.airportMaxM &&
          edges.filter((e) => e.includes(s.id)).length < rules.maxDegree,
      )
      .sort((b, c) => distance(a, b) - distance(a, c))[0];
    if (s) edges.push([a.id, s.id]);
  }
  // This is reported as a degraded topology by the diagnostic diameter, never hidden.
  return edges;
}
export function generate(
  input: Input,
  previous?: Network,
  overrides: Record<string, Partial<Stop>> = {},
  rules: Rules = RULES,
  progress: (
    s: string,
    stops?: Stop[],
    diagnostics?: Network["diagnostics"],
  ) => void = () => {},
): Network {
  if (
    rules.maxDegree < 3 ||
    rules.maxDegree > 5 ||
    rules.airportDegree < 1 ||
    rules.airportDegree > 2
  )
    throw Error("Invalid artillery degree limits");
  if (!input.city || input.city.population < rules.minCityPopulation)
    return {
      id: input.id,
      version: rules.version,
      stops: [],
      edges: [],
      diagnostics: {
        rejected: [],
        uncovered: input.buildings,
        covered: 0,
        demands: input.buildings.length,
        maxWalkM: rules.walkMps * rules.walkSeconds,
        diameter: 0,
        meanHops: 0,
        missing: [
          "No qualifying large city (population threshold " +
            rules.minCityPopulation +
            ")",
        ],
      },
    };
  const rejected: Network["diagnostics"]["rejected"] = [],
    missing: string[] = [],
    safe = safety(input),
    walkSafe = safety(input, true),
    nodes = new Map<string, Node>(),
    ni = new Index<Node>(25);
  const node = (p: Point, level: string, name: string) => {
    const id = `${level}:${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    let n = nodes.get(id);
    if (!n) {
      n = { ...p, id, adj: new Map(), name };
      nodes.set(id, n);
      ni.add(p, n);
    }
    return n;
  };
  const candidates: Stop[] = [],
    candidateCells = new Set<string>(),
    candidateTries = new Map<string, number>();
  for (const road of [...input.roads].sort((a, b) => a.id.localeCompare(b.id)))
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        len = distance(a, b),
        steps = Math.max(1, Math.ceil(len / rules.sampleM));
      let last = node(a, road.level, road.name);
      if (i === 1) last.end = true;
      for (let k = 1; k <= steps; k++) {
        const p = {
            x: a.x + ((b.x - a.x) * k) / steps,
            y: a.y + ((b.y - a.y) * k) / steps,
          },
          n = node(p, road.level, road.name);
        if (i === road.points.length - 1 && k === steps) n.end = true;
        last.adj.set(n.id, distance(last, n));
        n.adj.set(last.id, distance(last, n));
        last = n;
      }
    }
  const clearPath = (a: Point, b: Point) => {
    const steps = Math.ceil(distance(a, b) / 2);
    for (let i = 0; i <= steps; i++)
      if (
        walkSafe(
          {
            x: a.x + ((b.x - a.x) * i) / (steps || 1),
            y: a.y + ((b.y - a.y) * i) / (steps || 1),
          },
          1,
        )
      )
        return false;
    return true;
  };
  // Join separately mapped sidewalks only where there is physically clear ground. No bridge/layer mixing.
  progress(`road graph: ${nodes.size} nodes; joining open ends`);
  for (const n of nodes.values())
    if (n.adj.size < 2 || n.end)
      for (const b of ni.near(n, 12))
        if (
          n.id < b.id &&
          (n.id.split(":")[0] === b.id.split(":")[0] ||
            (n.end && b.end && distance(n, b) < 0.2)) &&
          distance(n, b) <= 12 &&
          clearPath(n, b)
        ) {
          n.adj.set(b.id, distance(n, b));
          b.adj.set(n.id, distance(n, b));
        }
  progress(`foot graph: ${nodes.size} nodes`);
  const near = (p: Point, r: number) =>
    ni
      .near(p, r)
      .filter((n) => distance(n, p) <= r)
      .sort(
        (a, b) => distance(a, p) - distance(b, p) || a.id.localeCompare(b.id),
      );
  for (const road of [...input.roads].sort((a, b) => a.id.localeCompare(b.id)))
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        len = distance(a, b);
      if (!len) continue;
      // Use segment midpoints to avoid putting the installation on a junction.
      const steps = Math.max(1, Math.ceil(len / rules.sampleM));
      for (let k = 0; k < steps; k++)
        for (const sign of [-1, 1]) {
          const t = (k + 0.5) / steps,
            offset = road.width / 2 + rules.clearM + 2;
          const p = {
            x: a.x + (b.x - a.x) * t - ((sign * (b.y - a.y)) / len) * offset,
            y: a.y + (b.y - a.y) * t + ((sign * (b.x - a.x)) / len) * offset,
          };
          const cell = `${Math.floor(p.x / rules.sampleM)},${Math.floor(p.y / rules.sampleM)}:${road.level}:${sign}`;
          if (candidateCells.has(cell)) continue;
          const tried = candidateTries.get(cell) ?? 0;
          if (tried >= 16) continue;
          candidateTries.set(cell, tried + 1);
          const reason = safe(p, rules.clearM);
          if (reason) {
            rejected.push({ ...p, reason });
            continue;
          }
          const attach = near(p, rules.sampleM)[0];
          if (!attach || !clearPath(p, attach)) {
            rejected.push({ ...p, reason: "no-foot-access" });
            continue;
          }
          candidateCells.add(cell);
          candidates.push({
            ...p,
            id: `${input.id}:r${road.id}:${i}:${k}:${sign}`,
            name: road.name || `MAP ${candidates.length + 1}`,
            anchor: attach.id,
          });
        }
    }
  progress(`safe candidates: ${candidates.length}`);
  // Demand is sampled by occupied cells, rather than by administration or a single city centre.
  const demand = new Map<
      string,
      { p: Point; anchor: string; offset: number }
    >(),
    uncovered: Point[] = [];
  for (const p of [...input.buildings]
    .filter(
      (p) => !input.city?.boundary?.length || inside(p, input.city.boundary),
    )
    .sort((a, b) => a.x - b.x || a.y - b.y)) {
    const key = `${Math.floor(p.x / 200)},${Math.floor(p.y / 200)}`;
    if (demand.has(key)) continue;
    // A building centroid is blocked: start at the nearest foot node; its offset is conservative.
    const n = near(p, rules.attachM)[0];
    if (n) demand.set(key, { p, anchor: n.id, offset: distance(p, n) });
    else {
      demand.set(key, { p, anchor: "", offset: Infinity });
      uncovered.push(p);
    }
  }
  const city = input.city;
  const cityBudget =
    rules.cityStops ||
    Math.min(
      rules.maxCityStops,
      Math.max(5, Math.ceil((city.population / 100000) * 2)),
    );
  const totalBudget = rules.maxStops || cityBudget + input.airports.length;
  const stops = (previous?.stops ?? []).map((s) => ({
    ...s,
    ...overrides[s.id],
    id: s.id,
  }));
  if (stops.filter((s) => !s.disabled).length > totalBudget)
    throw Error(
      "Active registry exceeds new budget: explicit migration required; IDs were preserved",
    );
  const target = rules.walkMps * rules.walkSeconds,
    covered = new Set<string>();
  const anchorDemand = new Map<string, { key: string; offset: number }[]>();
  for (const [key, d] of demand) {
    const list = anchorDemand.get(d.anchor) ?? [];
    list.push({ key, offset: d.offset });
    anchorDemand.set(d.anchor, list);
  }
  const coverage = (s: Stop) => {
    const n = near(s, rules.attachM).find((n) => clearPath(s, n));
    const out = new Set<string>();
    if (!n) return out;
    const ds = paths(nodes, [[n.id, distance(n, s)]], target);
    for (const [node, cost] of ds)
      for (const d of anchorDemand.get(node) ?? [])
        if (cost + d.offset <= target) out.add(d.key);
    return out;
  };
  for (const s of stops.filter((s) => !s.disabled && !s.airport))
    for (const key of coverage(s)) covered.add(key);
  // Large-city budget comes first. Two central stops, then spread the remaining coverage toward outer districts.
  const cityCandidates = candidates.filter(
    (c) => !city.boundary?.length || inside(c, city.boundary),
  );
  const central = cityCandidates
    .filter((c) => distance(c, city.center) <= rules.centralRadiusM)
    .sort(
      (a, b) =>
        distance(a, city.center) - distance(b, city.center) ||
        a.id.localeCompare(b.id),
    );
  const room = (c: Stop) =>
    !stops.some((s) => !s.disabled && distance(s, c) < rules.minSpacingM) &&
    !overrides[c.id]?.disabled;
  const take = (candidate: Stop) => {
    const s = { ...candidate, ...overrides[candidate.id], id: candidate.id };
    stops.push(s);
    for (const key of coverage(s)) covered.add(key);
  };
  const countCity = () => stops.filter((s) => !s.disabled && !s.airport).length;
  for (const candidate of central) {
    if (countCity() >= Math.min(rules.centralStops, cityBudget, totalBudget))
      break;
    if (room(candidate)) take(candidate);
  }
  const sampled = new Map<string, Stop>();
  for (const c of cityCandidates) {
    const k = `${Math.floor(c.x / rules.candidateGridM)},${Math.floor(c.y / rules.candidateGridM)}`;
    if (!sampled.has(k)) sampled.set(k, c);
  }
  const options = [...sampled.values()].filter(
    (c) => distance(c, city.center) > rules.centralRadiusM,
  );
  const reach = new Map<string, Set<string>>();
  while (
    countCity() < cityBudget &&
    stops.filter((s) => !s.disabled).length < totalBudget
  ) {
    let best: Stop | undefined,
      bestGain = -1,
      bestSpread = -1;
    for (const c of options) {
      if (!room(c)) continue;
      let cells = reach.get(c.id);
      if (!cells) {
        cells = coverage(c);
        reach.set(c.id, cells);
      }
      const gain = [...cells].filter((key) => !covered.has(key)).length;
      const spread = Math.min(
        ...stops.filter((s) => !s.disabled).map((s) => distance(s, c)),
      );
      if (gain > bestGain || (gain === bestGain && spread > bestSpread)) {
        best = c;
        bestGain = gain;
        bestSpread = spread;
      }
    }
    if (!best) break;
    take(best);
  }
  for (const a of input.airports) {
    if (stops.some((s) => s.id === `${input.id}:airport:${a.id}`)) continue;
    if (stops.filter((s) => !s.disabled).length >= totalBudget) {
      missing.push(`${a.name}: city stop budget exhausted`);
      continue;
    }
    if (!a.complete) {
      missing.push(`${a.name}: incomplete runway/access data`);
      continue;
    }
    const s = candidates
      .filter(
        (c) =>
          (!a.outsideOnly || !a.boundary?.length || !inside(c, a.boundary)) &&
          a.entrances.some((e) => distance(e, c) < 300),
      )
      .sort(
        (b, c) =>
          Math.min(...a.entrances.map((e) => distance(e, b))) -
          Math.min(...a.entrances.map((e) => distance(e, c))),
      )[0];
    if (!s) {
      missing.push(`${a.name}: no safe landside candidate`);
      continue;
    }
    if (
      !stops.some(
        (b) => !b.airport && !b.disabled && distance(b, s) <= rules.airportMaxM,
      )
    ) {
      missing.push(`${a.name}: no city within attachment range`);
      continue;
    }
    const id = `${input.id}:airport:${a.id}`;
    stops.push({ ...s, name: a.name, airport: true, ...overrides[id], id });
  }
  for (const [key, d] of demand)
    if (!covered.has(key) && !uncovered.includes(d.p)) uncovered.push(d.p);
  stops.forEach((s, i) => {
    if (/^MAP \d+$/.test(s.name)) s.name = `MAP ${i + 1}`;
  });
  progress(
    `coverage selected ${stops.length} stops for ${demand.size} occupied cells`,
    stops,
    {
      rejected,
      uncovered,
      covered: covered.size,
      demands: demand.size,
      maxWalkM: target,
      diameter: 0,
      meanHops: 0,
      missing,
    },
  );
  const edges = connect(stops, rules),
    network = {
      id: input.id,
      version: rules.version,
      stops,
      edges,
      diagnostics: {
        rejected,
        uncovered,
        covered: covered.size,
        demands: demand.size,
        maxWalkM: target,
        diameter: 0,
        meanHops: 0,
        missing,
      },
    };
  let hops = 0,
    pairs = 0;
  const active = stops.filter((s) => !s.disabled),
    adj = new Map(active.map((s) => [s.id, [] as string[]]));
  for (const [a, b] of edges) {
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }
  for (const a of active) {
    const q = [a.id],
      ds = new Map([[a.id, 0]]);
    for (let i = 0; i < q.length; i++)
      for (const b of adj.get(q[i]) ?? [])
        if (!ds.has(b)) {
          ds.set(b, ds.get(q[i])! + 1);
          q.push(b);
        }
    for (const b of active)
      if (a !== b) {
        const n = ds.get(b.id);
        if (n === undefined) missing.push(`disconnected: ${a.id} → ${b.id}`);
        else {
          network.diagnostics.diameter = Math.max(
            network.diagnostics.diameter,
            n,
          );
          hops += n;
          pairs++;
        }
      }
  }
  network.diagnostics.meanHops = pairs ? hops / pairs : 0;
  return network;
}

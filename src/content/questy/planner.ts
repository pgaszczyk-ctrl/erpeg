import { PX_PER_M, type CityMap } from '../../map/CityMap';
import type { Misja } from '../fabula';
import catalog from './catalog.json';
import { CITY_SCENARIOS, materializeScenario, scenarioPending, type CityBinding } from './scenarios';

interface Point { x: number; y: number }
/** Check the actual collision footprint along every edge, including bridges and water. */
export function clearSegment(city: Pick<CityMap, 'isFree'>, a: Point, b: Point) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (2 * PX_PER_M)));
  for (let i = 0; i <= n; i++) if (!city.isFree(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, 4, 4)) return false;
  return true;
}
/** Bounded A*: uncertain or overly long routes are omitted, never accepted on radius alone. */
export function routeDistance(city: Pick<CityMap, 'isFree'>, a: Point, b: Point, budgetM: number): number | null {
  const direct = Math.hypot(b.x - a.x, b.y - a.y) / PX_PER_M;
  if (direct > budgetM || !city.isFree(a.x, a.y, 4, 4) || !city.isFree(b.x, b.y, 4, 4)) return null;
  if (clearSegment(city, a, b)) return direct;
  const step = 6 * PX_PER_M, padding = 90 * PX_PER_M;
  const minX = Math.min(a.x, b.x) - padding, minY = Math.min(a.y, b.y) - padding;
  const maxX = Math.max(a.x, b.x) + padding, maxY = Math.max(a.y, b.y) + padding;
  type Node = Point & { i: number; j: number; g: number; f: number };
  const heap: Node[] = [], costs = new Map<string, number>();
  const push = (v: Node) => { heap.push(v); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p].f <= v.f) break; heap[k] = heap[p]; k = p; } heap[k] = v; };
  const pop = () => { const v = heap[0], last = heap.pop()!; if (heap.length) { let k = 0; while (k * 2 + 1 < heap.length) { let c = k * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (last.f <= heap[c].f) break; heap[k] = heap[c]; k = c; } heap[k] = last; } return v; };
  push({ ...a, i: 0, j: 0, g: 0, f: direct }); costs.set('0,0', 0);
  for (let visited = 0; heap.length && visited < 12000; visited++) {
    const p = pop(); if (p.g !== costs.get(`${p.i},${p.j}`)) continue;
    const left = Math.hypot(b.x - p.x, b.y - p.y) / PX_PER_M;
    if (p.g + left > budgetM) continue;
    if (left <= 10 && clearSegment(city, p, b)) return p.g + left;
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const i = p.i + di, j = p.j + dj, x = a.x + i * step, y = a.y + j * step;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const g = p.g + Math.hypot(di, dj) * 6, key = `${i},${j}`;
      if (g >= (costs.get(key) ?? Infinity) || !clearSegment(city, p, { x, y })) continue;
      const f = g + Math.hypot(b.x - x, b.y - y) / PX_PER_M;
      if (f > budgetM) continue;
      costs.set(key, g); push({ x, y, i, j, g, f });
    }
  }
  return null;
}
function safePoint(city: CityMap, at: Point): Point | null {
  if (city.isFree(at.x, at.y, 4, 4)) return at;
  // A nearby helper may stand outside the door; don't silently move to a distant district.
  for (let m = 3; m <= 30; m += 3) for (let n = 0; n < 12; n++) {
    const angle = n * Math.PI / 6, p = { x: at.x + Math.cos(angle) * m * PX_PER_M, y: at.y + Math.sin(angle) * m * PX_PER_M };
    if (city.isFree(p.x, p.y, 4, 4)) return p;
  }
  return null;
}
/** Density is a capability check, not a fabricated population count. Works in any country. */
export async function planCityQuests(city: CityMap, near: Point, mapName: string, states: Record<string, string>, taken: Record<string, Misja>): Promise<Misja[]> {
  const radius = 1000 * PX_PER_M;
  await city.ensure(near.x, near.y, radius);
  const places = city.places.filter(p => Math.hypot(p.door.x - near.x, p.door.y - near.y) <= radius);
  const unique = places.filter((p, i) => places.findIndex(q => Math.hypot(p.door.x - q.door.x, p.door.y - q.door.y) < 12 * PX_PER_M) === i);
  if (unique.length < 6 || new Set(unique.map(p => p.kind)).size < 2) return [];
  const candidates = unique.map(p => ({ p, at: safePoint(city, p.door) })).filter((p): p is typeof p & { at: Point } => !!p.at).sort((a, b) => a.p.id.localeCompare(b.p.id));
  if (candidates.length < 3) return [];
  const out: Misja[] = [], cells = new Map<string, number>(), pairCache = new Map<string, number | null>();
  for (let i = 0; i < CITY_SCENARIOS.length; i++) {
    const def = CITY_SCENARIOS[i];
    if (!scenarioPending(def.id, states, taken) || def.requires.some(id => states[id] !== 'done')) continue;
    const source = catalog.quests.find(q => q.id === def.id)!;
    const givers = candidates.filter(c => def.giverKinds.includes(c.p.kind));
    for (let attempt = 0; attempt < Math.min(8, givers.length); attempt++) {
      const giver = givers[(i * 3 + attempt) % givers.length];
      // Shop sketch really needs a shop, not a made-up railway station or lake.
      if (def.id === 'quest.tea_map' && !candidates.some(c => c.p.kind === 'shop' || c.p.kind === 'merchant')) break;
      const cell = `${Math.floor(giver.at.x / radius)},${Math.floor(giver.at.y / radius)}`;
      if ((cells.get(cell) ?? 0) >= 4) continue;
      const others = candidates.filter(c => c !== giver && Math.hypot(c.at.x - giver.at.x, c.at.y - giver.at.y) > 30 * PX_PER_M).sort((a,b) => Math.hypot(a.at.x-giver.at.x,a.at.y-giver.at.y)-Math.hypot(b.at.x-giver.at.x,b.at.y-giver.at.y));
      if (def.id === 'quest.tea_map') others.sort((a,b) => Number(b.p.kind === 'shop' || b.p.kind === 'merchant') - Number(a.p.kind === 'shop' || a.p.kind === 'merchant'));
      let points = [giver.at, ...others.slice(0, def.anchorCount - 1).map(c => c.at)];
      if (points.length !== def.anchorCount) continue;
      if (def.id === 'quest.tea_map' && !['shop','merchant'].includes(others[0]?.p.kind)) continue;
      if (def.green) {
        const greens = city.query({ x0: giver.at.x-radius/2, y0:giver.at.y-radius/2,x1:giver.at.x+radius/2,y1:giver.at.y+radius/2 }).areas.filter(a => ['grass','park','garden','orchard'].includes(a.kind));
        const green = greens.map(a => safePoint(city, { x:(a.x0+a.x1)/2, y:(a.y0+a.y1)/2 })).find(p => p && city.areaKindsAt(p.x,p.y).some(k => ['grass','park','garden','orchard'].includes(k)));
        if (!green) continue;
        points = [giver.at, points[1], green];
      }
      const chain = [0, ...def.stages.map(s => s.anchor)]; let distance = 0, valid = true;
      for (let n = 1; n < chain.length; n++) {
        const a = points[chain[n-1]], b = points[chain[n]];
        const key = [a.x,a.y,b.x,b.y].join(',');
        if (!pairCache.has(key)) pairCache.set(key, routeDistance(city, a, b, source.routeBudgetM));
        const d = pairCache.get(key)!;
        if (d === null) { valid = false; break; } distance += d;
      }
      if (!valid || distance > source.routeBudgetM) continue;
      const binding: CityBinding = { version:1, mapId:city.id, mapName, giverName:giver.p.name, anchors: points.map(p => city.toLatLon(p.x,p.y)), choices:{}, routeM:Math.ceil(distance) };
      out.push(materializeScenario(def.id, binding)); cells.set(cell,(cells.get(cell)??0)+1); break;
    }
    // Yield between scenarios so fetching/planning never monopolises a frame.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return out;
}

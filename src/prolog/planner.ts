import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import type { WejscieLochu } from '../scenes/Lochy';
import type { Anchor, AnchorKind } from './state';

type Pt = { x: number; y: number };
/** Bounded flood fill of actual walkable ground; no straight-line assumptions over walls or rivers. */
export function localRoutes(city: Pick<CityMap, 'isFree'>, home: Pt, radius: number, step = 6 * PX_PER_M, maxNodes = 14000) {
  const key = (x: number, y: number) => `${x},${y}`;
  const nodes = [{ ...home, gx: 0, gy: 0, distance: 0 }];
  const seen = new Map([[key(0, 0), nodes[0]]]);
  const free = (x: number, y: number) => city.isFree(x, y + 4, 3, 2);
  const line = (a: Pt, b: Pt) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 3));
    for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
    return true;
  };
  for (let i = 0; i < nodes.length && nodes.length < maxNodes; i++) {
    const a = nodes[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const gx = a.gx + dx, gy = a.gy + dy, k = key(gx, gy);
      if (seen.has(k) || Math.hypot(gx * step, gy * step) > radius) continue;
      const b = { x: home.x + gx * step, y: home.y + gy * step, gx, gy, distance: a.distance + step };
      if (b.distance > radius * 1.8 || !line(a, b)) continue;
      seen.set(k, b); nodes.push(b);
    }
  }
  const route = (p: Pt) => {
    const gx = Math.round((p.x - home.x) / step), gy = Math.round((p.y - home.y) / step);
    let best: { distance: number; point: Pt } | null = null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = seen.get(key(gx + dx, gy + dy));
      if (!n || !line(n, p)) continue;
      const distance = n.distance + Math.hypot(n.x - p.x, n.y - p.y);
      if (!best || distance < best.distance) best = { distance, point: p };
    }
    return best;
  };
  return { nodes, route };
}

/**
 * Owner 30 Oct 2026: every next character of the guard duty is at least ~20 s of walking away
 * (walking speed 70 km/h ≈ 19.4 m/s → ~390 m of real route), not a few steps from the last one.
 */
export const PROLOG_MARSZ_M = 380;
/** How far the planner looks (flood fill radius, metres). */
export const PROLOG_PROMIEN_M = 760;

export function planAnchors(city: CityMap, home: Pt, entrances: WejscieLochu[], mapName: string) {
  const radius = PROLOG_PROMIEN_M * PX_PER_M;
  const routes = localRoutes(city, home, radius, 10 * PX_PER_M, 26000);
  if (routes.nodes.length < 4) throw new Error('Brak przechodniego miejsca zbiórki.');
  const MIN = PROLOG_MARSZ_M * PX_PER_M, MAX = MIN * 1.7;
  const anchor = (p: Pt, id: string, name: string, fallback: boolean): Anchor => ({ ...city.toLatLon(p.x, p.y), id, name, fallback });
  const choose = (kinds: string[], max: number, min = 0) => city.places.filter(p => kinds.includes(p.kind))
    .map(p => ({ p, r: routes.route(p.door) })).filter(q => q.r && q.r.distance >= min && q.r.distance <= max)
    .sort((a, b) => a.r!.distance - b.r!.distance)[0]?.p;
  /** Reachable points in the [MIN, MAX] route band; when the walkable area is small, the farthest ones there are. */
  const farthest = routes.nodes.reduce((m, n) => Math.max(m, n.distance), 0);
  const lo = Math.min(MIN, farthest * 0.75), hi = Math.max(MAX, lo + 1);
  const band = routes.nodes.filter(p => p.distance >= lo && p.distance <= hi);
  const pool = band.length ? band : [routes.nodes.at(-1)!];
  /** The band point farthest (straight line) from every point already used: the characters spread around. */
  const apart = (used: Pt[]) => pool.reduce((best, p) => {
    const d = Math.min(...used.map(u => Math.hypot(p.x - u.x, p.y - u.y)));
    return d > best.d ? { p, d } : best;
  }, { p: pool[0] as Pt, d: -1 }).p;
  const post = choose(['police'], hi * 1.3, lo) ?? choose(['office'], hi, lo);
  const out = post?.door ?? apart([home]);
  const ambush = apart([out]);
  const near = (p: Pt) => routes.nodes.filter(q => Math.hypot(q.x-p.x,q.y-p.y) > 12 * PX_PER_M && Math.hypot(q.x-p.x,q.y-p.y) < 25 * PX_PER_M)[0] ?? p;
  const entrance = entrances.map(w => ({ w, r: routes.route(w) })).filter(q => q.r && q.r.distance >= lo && q.r.distance < hi * 1.4)
    .sort((a,b) => a.r!.distance - b.r!.distance)[0]?.w;
  const cellarPoint = apart([out, ambush]);
  const dungeon: WejscieLochu = entrance ?? { id: `prolog:${city.id}:cellar`, rodzaj: 'podziemia', ...cellarPoint, seed: 1, przy: 'Punkt patrolowy / Patrol post' };
  const library = choose(['library'], hi * 1.3, lo);
  const office = library ?? choose(['office', 'school'], hi, lo);
  const librarianPoint = apart([out, ambush, dungeon]);
  const anchors: Record<AnchorKind, Anchor> = {
    mentor: anchor(near(home), 'prolog:mentor', 'Starszy strażnik', true),
    outpost: anchor(out, post?.id ?? 'prolog:outpost', post?.name ?? 'Punkt straży / Guard post', !post || post.kind !== 'police'),
    ambush: anchor(ambush, 'prolog:ambush', 'Wołanie o pomoc / A call for help', true),
    bowPractice: anchor(near(ambush), 'prolog:target', 'Cel treningowy / Practice target', true),
    dungeonEntrance: anchor(dungeon, dungeon.id, entrance ? (entrance.przy ?? 'Wejście do lochu / Dungeon entrance') : 'Piwnica patrolowa / Patrol cellar', !entrance),
    library: anchor(office?.door ?? librarianPoint, office?.id ?? 'prolog:library', library?.name ?? 'Dyżur bibliotekarza / Visiting librarian', !library),
  };
  const r = (p: Pt) => routes.route(p)?.distance ?? 0;
  return { anchors, dungeon, mapName, walkM: (r(out) * 2 + r(ambush) * 2 + r(dungeon) * 2 + r(office?.door ?? librarianPoint)) / PX_PER_M };
}

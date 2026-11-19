import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import type { WejscieLochu } from '../scenes/Lochy';
import type { Anchor, AnchorKind } from './state';

type Pt = { x: number; y: number };
export function clearWalk(city: Pick<CityMap, 'isFree'>, a: Pt, b: Pt) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
  for (let i = 1; i <= n; i++) {
    if (!city.isFree(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n + 4, 3, 2)) return false;
  }
  return true;
}
/** Bounded flood fill of actual walkable ground; no straight-line assumptions over walls or rivers. */
export function localRoutes(city: Pick<CityMap, 'isFree'>, home: Pt, radius: number, step = 6 * PX_PER_M) {
  const key = (x: number, y: number) => `${x},${y}`;
  const nodes = [{ ...home, gx: 0, gy: 0, distance: 0 }];
  const seen = new Map([[key(0, 0), nodes[0]]]);
  const parents = new Map<Pt, Pt>();
  const line = (a: Pt, b: Pt) => clearWalk(city, a, b);
  for (let i = 0; i < nodes.length && nodes.length < 14000; i++) {
    const a = nodes[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const gx = a.gx + dx, gy = a.gy + dy, k = key(gx, gy);
      if (seen.has(k) || Math.hypot(gx * step, gy * step) > radius) continue;
      const b = { x: home.x + gx * step, y: home.y + gy * step, gx, gy, distance: a.distance + step };
      if (b.distance > radius * 1.8 || !line(a, b)) continue;
      seen.set(k, b); nodes.push(b); parents.set(b, a);
    }
  }
  const route = (p: Pt) => {
    const gx = Math.round((p.x - home.x) / step), gy = Math.round((p.y - home.y) / step);
    let best: { distance: number; point: Pt } | null = null;
    let last: Pt | undefined;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = seen.get(key(gx + dx, gy + dy));
      if (!n || !line(n, p)) continue;
      const distance = n.distance + Math.hypot(n.x - p.x, n.y - p.y);
      if (!best || distance < best.distance) { best = { distance, point: p }; last = n; }
    }
    return best && { ...best, next: () => {
      let next = p;
      let node = last;
      while (node && node !== nodes[0]) {
        if (line(home, node)) return line(home, next) ? next : node;
        next = node;
        node = parents.get(node);
      }
      return next;
    } };
  };
  return { nodes, route };
}

export function planAnchors(city: CityMap, home: Pt, entrances: WejscieLochu[], mapName: string) {
  const radius = 480 * PX_PER_M;
  const routes = localRoutes(city, home, radius);
  if (routes.nodes.length < 4) throw new Error('Brak przechodniego miejsca zbiórki.');
  const anchor = (p: Pt, id: string, name: string, fallback: boolean): Anchor => ({ ...city.toLatLon(p.x, p.y), id, name, fallback });
  const choose = (kinds: string[], max: number, min = 0) => city.places.filter(p => kinds.includes(p.kind))
    .map(p => ({ p, r: routes.route(p.door) })).filter(q => q.r && q.r.distance >= min && q.r.distance <= max)
    .sort((a, b) => a.r!.distance - b.r!.distance)[0]?.p;
  const points = routes.nodes.filter(p => p.distance > 55 * PX_PER_M && p.distance < 160 * PX_PER_M);
  const first = points[0] ?? routes.nodes.at(-1)!;
  const post = choose(['police'], 120 * PX_PER_M, 55 * PX_PER_M) ?? choose(['office'], 100 * PX_PER_M, 55 * PX_PER_M);
  const out = post?.door ?? first;
  const v = { x: out.x - home.x, y: out.y - home.y };
  const candidates = routes.nodes.filter(p => p.distance > 55 * PX_PER_M && p.distance < 110 * PX_PER_M);
  const score = (p: Pt) => ((p.x - home.x) * v.x + (p.y - home.y) * v.y) / Math.max(1, Math.hypot(p.x - home.x, p.y - home.y) * Math.hypot(v.x, v.y));
  const ambush = candidates.sort((a,b) => score(a) - score(b) || a.distance - b.distance)[0] ?? routes.nodes.at(-1)!;
  const near = (p: Pt) => routes.nodes.filter(q => Math.hypot(q.x-p.x,q.y-p.y) > 12 * PX_PER_M && Math.hypot(q.x-p.x,q.y-p.y) < 25 * PX_PER_M)[0] ?? p;
  const library = choose(['library'], 220 * PX_PER_M);
  const librarianPoint = routes.nodes.find(p => p.distance > 35*PX_PER_M && p.distance < 50*PX_PER_M) ?? first;
  const office = library ?? choose(['office', 'school'], 160 * PX_PER_M);
  const entrance = entrances.map(w => ({ w, r: routes.route(w) })).filter(q => q.r && q.r.distance < 350 * PX_PER_M)
    .sort((a,b) => a.r!.distance - b.r!.distance)[0]?.w;
  const cellarPoint = routes.nodes.filter(p => p.distance > 100*PX_PER_M && p.distance < 150*PX_PER_M).at(-1) ?? first;
  const dungeon: WejscieLochu = entrance ?? { id: `prolog:${city.id}:cellar`, rodzaj: 'podziemia', ...cellarPoint, seed: 1, przy: 'Punkt patrolowy / Patrol post' };
  const anchors: Record<AnchorKind, Anchor> = {
    mentor: anchor(near(home), 'prolog:mentor', 'Starszy strażnik', true),
    outpost: anchor(out, post?.id ?? 'prolog:outpost', post?.name ?? 'Punkt straży / Guard post', !post || post.kind !== 'police'),
    ambush: anchor(ambush, 'prolog:ambush', 'Wołanie o pomoc / A call for help', true),
    bowPractice: anchor(near(ambush), 'prolog:target', 'Cel treningowy / Practice target', true),
    dungeonEntrance: anchor(dungeon, dungeon.id, entrance ? (entrance.przy ?? 'Wejście do lochu / Dungeon entrance') : 'Piwnica patrolowa / Patrol cellar', !entrance),
    library: anchor(office?.door ?? librarianPoint, office?.id ?? 'prolog:library', library?.name ?? 'Dyżur bibliotekarza / Visiting librarian', !library),
  };
  return { anchors, dungeon, mapName, walkM: (routes.route(out)!.distance * 2 + routes.route(ambush)!.distance * 2 + routes.route(dungeon)!.distance * 2 + (routes.route(office?.door ?? librarianPoint)?.distance ?? 0)) / PX_PER_M };
}

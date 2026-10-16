// DOM/Phaser-free rules. Never asks the fog to reveal a preview.
export interface Point { x: number; y: number }
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Sample the entire swept footprint, not just the destination or grid corners. */
export function clearSegment(a: Point, b: Point, free: (x: number, y: number) => boolean) {
  const n = Math.max(1, Math.ceil(distance(a, b)));
  for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
  return true;
}

/** Bounded Dijkstra. The length includes both exact endpoints; diagonal corners cannot be cut. */
export function route(from: Point, to: Point, budget: number, free: (x: number, y: number) => boolean, grid = 3): Point[] | null {
  if (distance(from, to) > budget || !free(to.x, to.y)) return null;
  if (clearSegment(from, to, free)) return [{ ...from }, { ...to }];
  const nodes = new Map<string, { x: number; y: number; cost: number; prev?: string; done?: boolean }>();
  nodes.set('0,0', { ...from, cost: 0 });
  const limit = Math.ceil(budget / grid);
  while (true) {
    let key = '', best = Infinity;
    for (const [k, p] of nodes) if (!p.done && p.cost < best) { key = k; best = p.cost; }
    if (!key) return null;
    const p = nodes.get(key)!;
    p.done = true;
    const tail = distance(p, to);
    if (tail <= grid * 1.5 && p.cost + tail <= budget && clearSegment(p, to, free)) {
      const path: Point[] = [{ ...to }];
      let k: string | undefined = key;
      while (k) { const q: { x: number; y: number; prev?: string } = nodes.get(k)!; path.push({ x: q.x, y: q.y }); k = q.prev; }
      return path.reverse();
    }
    const [ix, iy] = key.split(',').map(Number);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nx = ix + dx, ny = iy + dy;
      if (Math.abs(nx) > limit || Math.abs(ny) > limit) continue;
      const next = { x: from.x + nx * grid, y: from.y + ny * grid };
      const cost = p.cost + grid * Math.hypot(dx, dy), nk = `${nx},${ny}`;
      if (cost + distance(next, to) > budget + 1e-6 || cost >= (nodes.get(nk)?.cost ?? Infinity)) continue;
      if (!clearSegment(p, next, free)) continue;
      nodes.set(nk, { ...next, cost, prev: key });
    }
  }
}

export function pathLength(path: Point[]) { return path.slice(1).reduce((n, p, i) => n + distance(path[i], p), 0); }

/** Persisted PRNG state: previews never consume it, reloading never rerolls it. */
export function roll(state: { rng: number }) {
  let t = state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

export function incoming(random: () => number, dodge: number, block: number): 'unik' | 'blok' | 'hit' {
  if (random() < dodge) return 'unik';
  return block > 0 && random() < block ? 'blok' : 'hit';
}

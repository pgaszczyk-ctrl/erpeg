// Searching real ways on the map for the turn fight: from a point, every grid
// cell reachable along free ground within a length (Dijkstra, 8 neighbours).
// Pure logic, no Phaser.

export interface Kratka {
  x: number;
  y: number;
  /** Way length from the start (px). */
  d: number;
  /** Previous cell's key ('' at the start). */
  p: string;
}

export type Zasieg = Map<string, Kratka>;

const klucz = (i: number, j: number) => `${i},${j}`;

/** All cells reachable from (x, y) within `max` px of way, on a grid of `krok` px aligned to the start. */
export function zasieg(x: number, y: number, max: number, krok: number, wolne: (x: number, y: number) => boolean): Zasieg {
  const out: Zasieg = new Map();
  out.set(klucz(0, 0), { x, y, d: 0, p: '' });
  // A small binary heap of [d, i, j].
  const heap: [number, number, number][] = [[0, 0, 0]];
  const push = (e: [number, number, number]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const diag = krok * Math.SQRT2;
  const wolneK = new Map<string, boolean>();
  const czyWolne = (i: number, j: number) => {
    const k = klucz(i, j);
    let v = wolneK.get(k);
    if (v === undefined) {
      v = wolne(x + i * krok, y + j * krok);
      wolneK.set(k, v);
    }
    return v;
  };
  while (heap.length) {
    const [d, i, j] = pop();
    const k = klucz(i, j);
    if ((out.get(k)?.d ?? Infinity) < d) continue;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const nd = d + (di && dj ? diag : krok);
      if (nd > max) continue;
      const ni = i + di, nj = j + dj;
      // No cutting corners past a wall on diagonals.
      if (di && dj && (!czyWolne(i + di, j) || !czyWolne(i, j + dj))) continue;
      if (!czyWolne(ni, nj)) continue;
      const nk = klucz(ni, nj);
      if ((out.get(nk)?.d ?? Infinity) <= nd) continue;
      out.set(nk, { x: x + ni * krok, y: y + nj * krok, d: nd, p: k });
      push([nd, ni, nj]);
    }
  }
  return out;
}

/** The way (points from the start to the cell). */
export function droga(z: Zasieg, k: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let c = z.get(k);
  while (c) {
    pts.push({ x: c.x, y: c.y });
    c = c.p ? z.get(c.p) : undefined;
  }
  return pts.reverse();
}

/** The reachable cell nearest to (x, y) within `r` px (null if none). */
export function najblizsza(z: Zasieg, x: number, y: number, r = Infinity): string | null {
  let best: string | null = null;
  let bd = r;
  for (const [k, c] of z) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) [best, bd] = [k, d];
  }
  return best;
}

/** Drops points on a straight free run (fewer, smoother steps in the animation). */
export function uprosc(pts: { x: number; y: number }[], prosto: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !prosto(pts[a], pts[b])) b--;
    out.push(pts[b]);
    a = b;
  }
  return out;
}

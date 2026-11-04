import type { Point, Rectangle, Road } from './types';

export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return h >>> 0;
}
export const random = (id: string, salt: string) => hash(`${id}:${salt}`) / 4294967296;
export function ringArea(r: Point[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return a / 2;
}
export function contains(r: Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  return inside;
}
export function centroid(r: Point[]): Point {
  let x = 0, y = 0, a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const k = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += k;
    x += (r[j][0] + r[i][0]) * k; y += (r[j][1] + r[i][1]) * k;
  }
  return Math.abs(a) > 1e-6 ? [x / (3 * a), y / (3 * a)] : [r[0]?.[0] ?? 0, r[0]?.[1] ?? 0];
}
export function closest(p: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [a[0] + t * dx, a[1] + t * dy];
}
export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function principalAngle(r: Point[]) {
  // The fourth harmonic treats perpendicular sides as the same architectural axis.
  let x = 0, y = 0;
  for (let i = 0; i < r.length; i++) {
    const b = r[(i + 1) % r.length], a = r[i], length = distance(a, b);
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    x += Math.cos(4 * angle) * length; y += Math.sin(4 * angle) * length;
  }
  return Math.atan2(y, x) / 4;
}
export function rotate(p: Point, angle: number): Point {
  return [p[0] * Math.cos(angle) - p[1] * Math.sin(angle), p[0] * Math.sin(angle) + p[1] * Math.cos(angle)];
}
export function rectangleRing(r: Rectangle, center: Point, angle: number, margin = 0): Point[] {
  return [[r.x - margin, r.y - margin], [r.x + r.w + margin, r.y - margin], [r.x + r.w + margin, r.y + r.d + margin], [r.x - margin, r.y + r.d + margin]].map(p => {
    const q = rotate(p as Point, angle); return [q[0] + center[0], q[1] + center[1]];
  });
}
/** Simplify and orthogonalize onto a local metre grid, then partition without filling holes.
 * Scanline rectangles are merged only across identical runs: no jagged roof facets. */
export function decompose(rings: Point[][], center: Point): { rectangles: Rectangle[]; angle: number } {
  if (!rings[0]?.length) return { rectangles: [], angle: 0 };
  const angle = principalAngle(rings[0]);
  const local = rings.map(r => r.map(p => rotate([p[0] - center[0], p[1] - center[1]], -angle)));
  const xs = local[0].map(p => p[0]), ys = local[0].map(p => p[1]);
  const step = Math.max(0.75, Math.ceil(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 128));
  const x0 = Math.floor(Math.min(...xs) / step) * step, y0 = Math.floor(Math.min(...ys) / step) * step;
  const w = Math.ceil((Math.max(...xs) - x0) / step), h = Math.ceil((Math.max(...ys) - y0) / step);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p: Point = [x0 + (x + .5) * step, y0 + (y + .5) * step];
    mask[y * w + x] = Number(contains(local[0], p) && !local.slice(1).some(r => contains(r, p)));
  }
  // Remove protruding one-cell teeth; never close a courtyard or enlarge the source envelope.
  const clean = mask.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (mask[i] && mask[i - 1] + mask[i + 1] + mask[i - w] + mask[i + w] <= 1) clean[i] = 0;
  }
  const rectangles: Rectangle[] = [];
  // Largest-rectangle greedy partition avoids thin horizontal strips on slanted OSM noise.
  while (true) {
    const heights = new Int32Array(w); let best = { x: 0, y: 0, w: 0, h: 0, area: 0 };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) heights[x] = clean[y * w + x] ? heights[x] + 1 : 0;
      const stack: number[] = [];
      for (let x = 0; x <= w; x++) {
        while (stack.length && (x === w || heights[stack[stack.length - 1]] > heights[x])) {
          const j = stack.pop()!, left = stack.length ? stack[stack.length - 1] + 1 : 0;
          const area = heights[j] * (x - left);
          if (area > best.area) best = { x: left, y: y - heights[j] + 1, w: x - left, h: heights[j], area };
        }
        stack.push(x);
      }
    }
    if (best.area * step * step < 4 || Math.min(best.w, best.h) * step < 1.5 || rectangles.length === 16) break;
    rectangles.push({ x: x0 + best.x * step, y: y0 + best.y * step, w: best.w * step, d: best.h * step });
    for (let y = best.y; y < best.y + best.h; y++) clean.fill(0, y * w + best.x, y * w + best.x + best.w);
  }
  // Rasterized near-right angles can leave tiny staircase strips beside the main wing.
  // They are survey noise, not separate roof volumes. Preserve substantial L/U-shaped wings.
  const main=rectangles[0];
  const cleanRectangles=main?rectangles.filter((r,i)=>i===0||(r.w*r.d>=main.w*main.d*.035&&Math.min(r.w,r.d)>=Math.min(3,Math.min(main.w,main.d)*.25))):rectangles;
  return { rectangles: cleanRectangles, angle };
}
export function nearestRoad(p: Point, roads: Road[]) {
  let best = { distance: Infinity, point: p, angle: 0, normal: [0, 1] as Point, id: 'none' };
  for (const r of roads) for (let i = 0; i + 1 < r.points.length; i++) {
    const a = r.points[i], b = r.points[i + 1]; if (distance(a, b) < .01) continue;
    const q = closest(p, a, b), d = distance(p, q);
    let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if(angle<0)angle+=Math.PI;if(angle>=Math.PI)angle-=Math.PI;
    const tie=r.id.localeCompare(best.id)||angle-best.angle||q[0]-best.point[0]||q[1]-best.point[1];
    if (d < best.distance-1e-8 || (Math.abs(d-best.distance)<=1e-8 && tie<0)) {
      const n: Point = [-Math.sin(angle), Math.cos(angle)];
      const sign = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1] < 0 ? -1 : 1;
      best = { distance: d, point: q, angle, normal: [n[0] * sign, n[1] * sign], id: r.id };
    }
  }
  return best;
}
/** SAT for convex rectangles, with an actual gap rather than bounding-box overlap. */
export function overlap(a: Point[], b: Point[], gap = .15): boolean {
  for (const r of [a, b]) for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length], l = distance(p, q) || 1;
    const axis: Point = [(p[1] - q[1]) / l, (q[0] - p[0]) / l];
    const aa = a.map(p => p[0] * axis[0] + p[1] * axis[1]);
    const bb = b.map(p => p[0] * axis[0] + p[1] * axis[1]);
    if (Math.max(...aa) + gap <= Math.min(...bb) || Math.max(...bb) + gap <= Math.min(...aa)) return false;
  }
  return true;
}
export function roadCollision(ring: Point[], roads: Road[]): boolean {
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  for (const r of roads) for (let i = 0; i + 1 < r.points.length; i++) {
    const a = r.points[i], b = r.points[i + 1], len = distance(a, b); if (!len) continue;
    const radius = r.width / 2 + .4;
    if(Math.max(a[0],b[0])+radius<x0||Math.min(a[0],b[0])-radius>x1||Math.max(a[1],b[1])+radius<y0||Math.min(a[1],b[1])-radius>y1)continue;
    const nx = -(b[1] - a[1]) / len * radius, ny = (b[0] - a[0]) / len * radius;
    if (overlap(ring, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], 0)) return true;
    if ([a, b].some(p => contains(ring, p) || ring.some((v, j) => distance(p, closest(p, v, ring[(j + 1) % ring.length])) < radius))) return true;
  }
  return false;
}
/** Canonical geographic key is independent of ring start, winding, map origin and load order. */
export function geometryId(rings: Point[][]): string {
  const key = rings.map(r => [...new Set(r.map(p => `${Math.round(p[0] * 1e7)},${Math.round(p[1] * 1e7)}`))].sort().join(';')).sort().join('|');
  return `geometry:${hash(key).toString(16)}:${hash(key.split('').reverse().join('')).toString(16)}`;
}

import { dlugosc, hash, trasaPrzyDrodze } from '../gen';

export interface Kociol09 { x: number; y: number; pipeX: number; pipeY: number }
export interface Rura09 { pts: number[]; seed: number; kotly?: Kociol09[] }

/** Whole selected streets, with underground breaks only where clearance is lost.
 * Station cadence follows the original route, never resets at obstacles/chunk edges.
 * Map scale is supplied by the caller: 500 real metres, not 500 screen pixels.
 */
export function ruryPrzyUlicy(road: number[], id: number, width: number,
  free: (x: number, y: number, radius?: number) => boolean, interval = 500 * 1.92): Rura09[] {
  if (hash(id, 0, 932) > 0.3) return [];
  const length = dlugosc(road);
  if (length < 35) return [];
  const side = hash(id, 1, 932) < 0.5 ? -1 : 1;
  const path = trasaPrzyDrodze(road, 6, length - 6, side * (width / 2 + 7));
  const out: Rura09[] = [];
  let run: number[] = [], kotly: Kociol09[] = [];
  let distance = 0, station = hash(id, 2, 936) * interval;
  const finish = () => {
    if (run.length >= 4 && dlugosc(run) >= 24)
      out.push({ pts: run, seed: Math.floor(hash(id, 0, 935) * 1e9), kotly });
    run = []; kotly = [];
  };
  for (let i = 0; i + 3 < path.pts.length; i += 2) {
    const ax = path.pts[i], ay = path.pts[i + 1], dx = path.pts[i + 2] - ax, dy = path.pts[i + 3] - ay;
    const span = Math.hypot(dx, dy);
    if (!span) continue;
    const steps = Math.max(1, Math.ceil(span / 2));
    for (let j = i ? 1 : 0; j <= steps; j++) {
      const x = ax + dx * j / steps, y = ay + dy * j / steps;
      const open = free(x, y, 4);
      if (open) run.push(x, y); else finish();
      const at = distance + span * j / steps;
      if (at >= station) {
        station += interval;
        if (!open) continue;
        // Place the boiler away from the road; reserve its entire raised silhouette.
        for (const offset of [22, 30, 38]) {
          const bx = x - dy / span * side * offset, by = y + dx / span * side * offset;
          if (!free(bx, by - 8, 18)) continue;
          let connected = true;
          for (let t = 0; t <= 1; t += .125)
            if (!free(x + (bx - x) * t, y + (by - y) * t, 4)) { connected = false; break; }
          if (connected) { kotly.push({ x: bx, y: by, pipeX: x, pipeY: y }); break; }
        }
      }
    }
    distance += span;
  }
  finish();
  return out;
}

import { dlugosc, hash, trasaPrzyDrodze } from '../gen';

export interface Rura09 { pts: number[]; seed: number }

/** Stable road-side sections in map units. Obstacles split them at underground ends. */
export function ruryPrzyUlicy(road: number[], id: number, width: number, free: (x: number, y: number) => boolean): Rura09[] {
  if (hash(id, 0, 932) > 0.3) return [];
  const length = dlugosc(road);
  if (length < 35) return [];
  const side = hash(id, 1, 932) < 0.5 ? -1 : 1;
  const n = length > 300 ? 2 : 1;
  const out: Rura09[] = [];
  for (let k = 0; k < n; k++) {
    const window = length / n;
    const size = Math.min(window - 12, 60 + hash(id, k, 933) * 140);
    const start = k * window + 6 + hash(id, k, 934) * Math.max(0, window - size - 12);
    const path = trasaPrzyDrodze(road, start, start + size, side * (width / 2 + 7));
    let run: number[] = [];
    const finish = () => {
      if (run.length >= 4 && dlugosc(run) >= 24) out.push({ pts: run, seed: Math.floor(hash(id, k, 935) * 1e9) });
      run = [];
    };
    for (let i = 0; i + 3 < path.pts.length; i += 2) {
      const ax = path.pts[i], ay = path.pts[i + 1], dx = path.pts[i + 2] - ax, dy = path.pts[i + 3] - ay;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
      for (let j = i ? 1 : 0; j <= steps; j++) {
        const x = ax + dx * j / steps, y = ay + dy * j / steps;
        if (free(x, y)) run.push(x, y);
        else finish();
      }
    }
    finish();
  }
  return out;
}

import { T } from './art';
import { rng } from './rng';

export const MAP_W = 80;
export const MAP_H = 60;

// Smooth value noise in [0,1], sampled on a coarse grid of `cell` tiles.
function valueNoise(w: number, h: number, cell: number, rand: () => number) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = Array.from({ length: gh }, () => Array.from({ length: gw }, rand));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smooth(gx - x0);
    const ty = smooth(gy - y0);
    const a = grid[y0][x0] + (grid[y0][x0 + 1] - grid[y0][x0]) * tx;
    const b = grid[y0 + 1][x0] + (grid[y0 + 1][x0 + 1] - grid[y0 + 1][x0]) * tx;
    return a + (b - a) * ty;
  };
}

export interface World {
  tiles: number[][];
  spawn: { x: number; y: number }; // in tiles
}

// Builds the overworld: meadows, lakes with sandy shores, forests,
// a crossroads of paths through the middle and a solid tree border.
export function generateWorld(seed = 1234): World {
  const rand = rng(seed);
  const water = valueNoise(MAP_W, MAP_H, 12, rand);
  const forest = valueNoise(MAP_W, MAP_H, 7, rand);
  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);

  const tiles: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      const w = water(x, y);
      const f = forest(x, y);
      const r = rand();
      let t: number = T.GRASS;
      if (w < 0.22) t = T.WATER;
      else if (w < 0.27) t = T.SAND;
      else if (f > 0.68) t = r < 0.8 ? T.TREE : T.BUSH;
      else if (r < 0.015) t = T.ROCK;
      else if (r < 0.03) t = T.BUSH;
      else if (r < 0.1) t = T.FLOWERS;
      row.push(t);
    }
    tiles.push(row);
  }

  // Wobbly paths crossing at the centre, cutting through anything.
  const carve = (x: number, y: number) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx > 0 && ty > 0 && tx < MAP_W - 1 && ty < MAP_H - 1) {
        tiles[ty][tx] = tiles[ty][tx] === T.WATER ? T.SAND : T.PATH;
      }
    }
  };
  let py = cy;
  for (let x = 1; x < MAP_W - 1; x++) {
    if (rand() < 0.25) py += rand() < 0.5 ? -1 : 1;
    py = Math.max(3, Math.min(MAP_H - 4, py));
    carve(x, py);
  }
  let px = cx;
  for (let y = 1; y < MAP_H - 1; y++) {
    if (rand() < 0.25) px += rand() < 0.5 ? -1 : 1;
    px = Math.max(3, Math.min(MAP_W - 4, px));
    carve(px, y);
  }

  // Clear meadow around the spawn point.
  for (let y = cy - 4; y <= cy + 4; y++) {
    for (let x = cx - 5; x <= cx + 5; x++) {
      const t = tiles[y][x];
      if (t !== T.PATH) tiles[y][x] = rand() < 0.15 ? T.FLOWERS : T.GRASS;
    }
  }

  // Tree border so the player can't walk off the map.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) tiles[y][x] = T.TREE;
    }
  }

  return { tiles, spawn: { x: cx, y: cy } };
}

export function isWalkable(t: number) {
  return t === T.GRASS || t === T.FLOWERS || t === T.PATH || t === T.SAND;
}

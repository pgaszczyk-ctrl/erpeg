// „Stos warstw” (sprite stacking) w rzucie generatora: obiekt to siatka voxeli (1 voxel = 1 piksel świata),
// rysowana warstwa po warstwie od dołu, każda o piksel wyżej i o skos w lewo – jak ściany budynków
// (w górę = (−SKOS, −1)). Obrót o dowolny kąt robi się przez próbkowanie warstw wstecz, więc obiekt obraca się
// płynnie, a światło (z północnego zachodu, jak dachy) liczone jest po obrocie z normalnych voxeli – cienie zostają
// na właściwej stronie przy każdym kącie. Na koniec obrys #1e1a24 (sylwetka + krawędzie zasłaniania) i cień na ziemi
// na południowy wschód. Bez DOM-u – działa w Workerze i w Node.

import { INK, SKOS } from './bryly';

/** Rodzina kolorów: 5 tonów od najciemniejszego do najjaśniejszego (ton 1 – cień, 4 – światło). */
export type Rodzina = [number, number, number, number, number];

export interface Model {
  /** Wymiary siatki: x w prawo, y na południe (do oka), z w górę. Środek obrotu = środek X/Y, podstawa z = 0. */
  X: number;
  Y: number;
  Z: number;
  /** 0 = pusto, inaczej numer rodziny + 1. */
  rod: Uint8Array;
  /** Przesunięcie tonu voxela (−2..2) – faktura: deski, żyłki, mech. */
  odc: Int8Array;
  rodziny: Rodzina[];
}

export function nowyModel(X: number, Y: number, Z: number, rodziny: Rodzina[]): Model {
  const n = X * Y * Z;
  return { X, Y, Z, rod: new Uint8Array(n), odc: new Int8Array(n), rodziny };
}

const idx = (m: Model, x: number, y: number, z: number) => (z * m.Y + y) * m.X + x;

/** Ustawia voxel (współrzędne względem środka podstawy: x, y od środka, z od ziemi). */
export function voxel(m: Model, x: number, y: number, z: number, rodzina: number, odcien = 0) {
  const ix = Math.round(x + m.X / 2 - 0.5), iy = Math.round(y + m.Y / 2 - 0.5), iz = Math.round(z);
  if (ix < 0 || iy < 0 || iz < 0 || ix >= m.X || iy >= m.Y || iz >= m.Z) return;
  const i = idx(m, ix, iy, iz);
  m.rod[i] = rodzina + 1;
  m.odc[i] = odcien;
}

/** Wypełnia bryłę funkcją: f(x, y, z) → [rodzina, odcień] albo null; x, y względem środka, z od ziemi (środki voxeli). */
export function wypelnij(m: Model, box: [number, number, number, number, number, number], f: (x: number, y: number, z: number) => [number, number] | null) {
  const [x0, y0, z0, x1, y1, z1] = box;
  for (let z = Math.floor(z0); z <= Math.ceil(z1); z++)
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const r = f(x, y, z);
        if (r) voxel(m, x, y, z, r[0], r[1]);
      }
}

/** Normalne voxeli z gradientu zajętości (okno 5×5×5, ważone) – gładkie jak na bryłach z generatora. */
function normalne(m: Model) {
  const { X, Y, Z, rod } = m;
  const n = new Float32Array(X * Y * Z * 3);
  const zaj = (x: number, y: number, z: number) => (x < 0 || y < 0 || x >= X || y >= Y || z >= Z ? 0 : z < 0 ? 1 : rod[idx(m, x, y, z)] ? 1 : 0);
  const R = 2;
  for (let z = 0; z < Z; z++) for (let y = 0; y < Y; y++) for (let x = 0; x < X; x++) {
    const i = idx(m, x, y, z);
    if (!rod[i]) continue;
    // Tylko voxele na powierzchni dostaną światło; środek bryły i tak nie jest widoczny.
    if (zaj(x + 1, y, z) && zaj(x - 1, y, z) && zaj(x, y + 1, z) && zaj(x, y - 1, z) && zaj(x, y, z + 1)) continue;
    let gx = 0, gy = 0, gz = 0;
    for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (!dx && !dy && !dz) continue;
      if (zaj(x + dx, y + dy, z + dz)) continue;
      const w = 1 / (dx * dx + dy * dy + dz * dz);
      gx += dx * w; gy += dy * w; gz += dz * w;
    }
    const d = Math.hypot(gx, gy, gz) || 1;
    n[i * 3] = gx / d; n[i * 3 + 1] = gy / d; n[i * 3 + 2] = gz / d;
  }
  return n;
}

const SWIATLO = (() => { const v = [-0.5, -0.6, 0.75]; const d = Math.hypot(v[0], v[1], v[2]); return v.map((a) => a / d); })();

export interface Obraz {
  w: number;
  h: number;
  /** 0xAARRGGBB (jak w ziemia09). */
  px: Uint32Array;
  /** Gdzie na obrazie leży środek podstawy (punkt w świecie). */
  ox: number;
  oy: number;
}

export interface OpcjeStosu {
  /** Cień na ziemi (alfa 0..1); 0 = bez. */
  cien?: number;
  /** Próg skoku głębi na krawędź zasłaniania (piksele). */
  prog?: number;
}

/** Przygotowuje model do rysowania (normalne liczone raz); zwraca funkcję kąt (radiany, 0 = przód na południe) → obraz. */
export function stos(m: Model, opt: OpcjeStosu = {}) {
  const N = normalne(m);
  const { X, Y, Z, rod, odc, rodziny } = m;
  const cien = opt.cien ?? 0.42, prog = opt.prog ?? 2.5;
  const promien = Math.ceil(Math.hypot(X, Y) / 2) + 1;
  return (kat: number): Obraz => {
    const c = Math.cos(kat), s = Math.sin(kat);
    const pad = 2;
    const w = promien * 2 + Math.ceil(Z * SKOS) + pad * 2 + Math.ceil(Z * 0.6);
    const h = promien * 2 + Z + pad * 2 + 2;
    const ox = pad + Math.ceil(Z * SKOS) + promien, oy = pad + Z + promien;
    const kolor = new Int32Array(w * h).fill(-1);
    const glebia = new Float32Array(w * h).fill(-1e9);
    const warstwa = new Int16Array(w * h).fill(-1);
    const cx = X / 2, cy = Y / 2;
    // Cień: rzut sylwetki na ziemię kierunkiem światła (na SE), rysowany pod spodem.
    const cienMaska = new Uint8Array(w * h);
    for (let z = 0; z < Z; z++) {
      const sx = -SKOS * z, sy = -z;
      const ciX = z * 0.55, ciY = z * 0.4;
      for (let py = -promien; py <= promien; py++) for (let px = -promien; px <= promien; px++) {
        // Wstecz: piksel warstwy → punkt modelu przed obrotem.
        const u = c * px + s * py + cx, v = -s * px + c * py + cy;
        const ix = Math.floor(u), iy = Math.floor(v);
        if (ix < 0 || iy < 0 || ix >= X || iy >= Y) continue;
        const i = idx(m, ix, iy, z);
        if (!rod[i]) continue;
        if (cien > 0) {
          const qx = Math.round(ox + px + ciX), qy = Math.round(oy + py + ciY);
          if (qx >= 0 && qy >= 0 && qx < w && qy < h) cienMaska[qy * w + qx] = 1;
        }
        const tx = Math.round(ox + px + sx), ty = Math.round(oy + py + sy);
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        const o = ty * w + tx;
        // Warstwy od dołu: wyższa zawsze bliżej oka (wzdłuż linii wzroku y i z rosną razem).
        // Normalna po obrocie (obrót wokół z): nx' = c·nx − s·ny, ny' = s·nx + c·ny.
        const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
        let k = 2;
        if (nx || ny || nz) {
          const rx = c * nx - s * ny, ry = s * nx + c * ny;
          k = Math.round(2.2 + 2 * (rx * SWIATLO[0] + ry * SWIATLO[1] + nz * SWIATLO[2]));
        }
        k = Math.max(0, Math.min(4, Math.max(1, k) + odc[i]));
        kolor[o] = rodziny[rod[i] - 1][k];
        glebia[o] = SKOS * px + py + z;
        warstwa[o] = z;
      }
    }
    const out = new Uint32Array(w * h);
    if (cien > 0) {
      const a = Math.round(cien * 255);
      for (let i = 0; i < w * h; i++) if (cienMaska[i]) out[i] = ((a << 24) | 0x1e1a24) >>> 0;
    }
    const S = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = (i / w) | 0;
      if (kolor[i] >= 0) {
        let tusz = false;
        for (const [dx, dy] of S) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (kolor[j] >= 0 && glebia[j] > glebia[i] + prog) { tusz = true; break; }
        }
        out[i] = ((255 << 24) | (tusz ? INK : kolor[i])) >>> 0;
      } else {
        for (const [dx, dy] of S) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && kolor[yy * w + xx] >= 0) { out[i] = ((255 << 24) | INK) >>> 0; break; }
        }
      }
    }
    return { w, h, px: out, ox, oy };
  };
}

/** Szum wartości 3D (deterministyczny) do faktur i nierównych brzegów. */
export function szum3(x: number, y: number, z: number, seed: number) {
  const h = (a: number, b: number, c: number) => {
    let n = (a * 374761393 + b * 668265263 + c * 2147483647 + seed * 144269504) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const sm = (t: number) => t * t * (3 - 2 * t);
  const ux = sm(fx), uy = sm(fy), uz = sm(fz);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  return L(
    L(L(h(xi, yi, zi), h(xi + 1, yi, zi), ux), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), ux), uy),
    L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), ux), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), ux), uy),
    uz,
  );
}

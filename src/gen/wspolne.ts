// Generator świata Exp-lore – wspólne narzędzia.
// Wszystko działa na prostych tablicach pikseli (Uint32, kolejność bajtów RGBA w pamięci = ABGR w liczbie),
// bez Phasera i bez DOM-u (poza `doImageData`/`doCanvas`), więc działa też w Web Workerze.
// Skala: 1 px obrazu = 0,5 px mapy (DOTS 2 → 1:1 z płótnem kawałka mapy).

export interface Obraz { w: number; h: number; px: Uint32Array }

export const nowy = (w: number, h: number): Obraz => ({ w, h, px: new Uint32Array(w * h) });

const cl = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
export const rgb = (r: number, g: number, b: number, a = 255) => ((cl(a) << 24) | (cl(b) << 16) | (cl(g) << 8) | cl(r)) >>> 0;
export const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
export const skladowe = (c: number): [number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
export const alfa = (c: number) => c >>> 24;

/** Ciemniej i chłodniej (cienie, chmury): jak `dk` w makiecie. */
export const ciemniej = (c: number) => { const [r, g, b] = skladowe(c); return rgb(r * 0.6 + 6, g * 0.64 + 8, b * 0.76 + 24, alfa(c)); };
/** Jaśniej i cieplej (podmuch na łące). */
export const jasniej = (c: number) => { const [r, g, b] = skladowe(c); return rgb(r + (226 - r) * 0.24, g + (238 - g) * 0.24, b + (150 - b) * 0.2, alfa(c)); };
export const mieszaj = (a: number, b: number, t: number) => {
  const [r1, g1, b1] = skladowe(a), [r2, g2, b2] = skladowe(b);
  return rgb(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

export const OBRYS = hex('#1e1a24');

/** Deterministyczny hash 0..1 z liczb całkowitych (ten sam co w makiecie). */
export function hash(x: number, y: number, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Generator liczb losowych z ziarna (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NT = new Float32Array(64 * 64);
{ const r = rng(7); for (let i = 0; i < NT.length; i++) NT[i] = r(); }
/** Szum wartości 0..1, powtarzalny co 64 jednostki (ciągły między kawałkami mapy, bo liczony we współrzędnych świata). */
export function szum(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const x0 = xi & 63, y0 = yi & 63, x1 = (x0 + 1) & 63, y1 = (y0 + 1) & 63;
  const a = NT[y0 * 64 + x0], b = NT[y0 * 64 + x1], c = NT[y1 * 64 + x0], d = NT[y1 * 64 + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Macierz Bayera 4×4 (0..1) – dithering krawędzi, zawsze we współrzędnych świata. */
export const bayer = (x: number, y: number) => BAY[((y & 3) << 2) | (x & 3)];

export const ustaw = (o: Obraz, x: number, y: number, c: number) => {
  if (x >= 0 && y >= 0 && x < o.w && y < o.h) o.px[y * o.w + x] = c;
};
export const wez = (o: Obraz, x: number, y: number) => (x >= 0 && y >= 0 && x < o.w && y < o.h ? o.px[y * o.w + x] : 0);

/** Nakłada obraz `src` na `dst` w (x, y), tylko nieprzezroczyste piksele. */
export function naloz(dst: Obraz, src: Obraz, x: number, y: number) {
  for (let j = 0; j < src.h; j++) {
    const yy = y + j; if (yy < 0 || yy >= dst.h) continue;
    for (let i = 0; i < src.w; i++) {
      const c = src.px[j * src.w + i]; if (!(c >>> 24)) continue;
      const xx = x + i; if (xx < 0 || xx >= dst.w) continue;
      dst.px[yy * dst.w + xx] = c;
    }
  }
}

export function doImageData(o: Obraz) {
  const d = new Uint8ClampedArray(o.w * o.h * 4); d.set(new Uint8Array(o.px.buffer, o.px.byteOffset, o.px.byteLength)); return new ImageData(d, o.w, o.h);
}
export function doCanvas(o: Obraz) {
  const c = document.createElement('canvas'); c.width = o.w; c.height = o.h;
  c.getContext('2d')!.putImageData(doImageData(o), 0, 0);
  return c;
}

/** Obrys: piksele obiektu stykające się z pustym tłem dostają kolor obrysu; od strony światła (lewa/góra) jaśniejszy „selektywny”. */
export function obrysuj(o: Obraz, ciemny = OBRYS, odSwiatla?: (c: number) => number) {
  const out = o.px.slice();
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const c = o.px[y * o.w + x]; if (!(c >>> 24)) continue;
    const up = wez(o, x, y - 1), lf = wez(o, x - 1, y), dn = wez(o, x, y + 1), rt = wez(o, x + 1, y);
    if (!(dn >>> 24) || !(rt >>> 24)) out[y * o.w + x] = ciemny;
    else if (!(up >>> 24) || !(lf >>> 24)) out[y * o.w + x] = odSwiatla ? odSwiatla(c) : ciemny;
  }
  o.px.set(out);
}

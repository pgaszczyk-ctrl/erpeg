// Proste bryły 3D rysowane piksel po pikselu w rzucie generatora (jak ściany budynków: w górę = (−skos, −1) piksela
// na piksel wysokości), z buforem głębi, odrzucaniem ścian tyłem do oka, tonami światła z północnego zachodu
// i obrysem #1e1a24 (sylwetka + krawędzie zasłaniania). Bez DOM-u poza ImageData – działa też w Workerze.
// Używa tego armata (src/artillery/armata3d.ts); zejścia do lochów mają podobny, starszy rysownik.

export type V = [number, number, number];
/** Wzór powierzchni: (s, t) w pikselach wzdłuż krawędzi ściany, ton 0..4, punkt w świecie → kolor 0xRRGGBB albo null (dziura). */
export type Wzor = (s: number, t: number, ton: number, p: V) => number | null;

export interface Sciana {
  p: V;
  e1: V;
  e2: V;
  /** Trójkąt (p, p+e1, p+e2) zamiast równoległoboku. */
  tri?: boolean;
  n: V;
  wzor: Wzor;
  /** Widoczna z obu stron (siatka, płomień). */
  oba?: boolean;
  /** Bez tuszu na krawędziach (płomień, dym). */
  bezObrysu?: boolean;
}

export const INK = 0x1e1a24;
export const SKOS = 0.35;
/** Kierunek do oka: punkty na tej prostej trafiają w ten sam piksel (x − skos·z, y − z). */
const OKO: V = [SKOS, 1, 1];
const SWIATLO: V = (() => { const v: V = [-0.5, -0.6, 0.75]; const d = Math.hypot(...v); return [v[0] / d, v[1] / d, v[2] / d]; })();

export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V): V => { const d = len(a) || 1; return [a[0] / d, a[1] / d, a[2] / d]; };
export const hex = (s: string) => parseInt(s.slice(1), 16);
/** Ton 0..4 ze światła z północnego zachodu i z góry (najciemniejszy 1 – jak u budynków). */
export const ton = (n: V) => Math.max(1, Math.min(4, Math.round(2.2 + 2 * dot(n, SWIATLO))));
/** Rzut punktu świata na płótno (piksele świata). */
export const rzut = (p: V): [number, number] => [p[0] - SKOS * p[2], p[1] - p[2]];

export class Bryly {
  readonly sciany: Sciana[] = [];

  quad(p: V, e1: V, e2: V, n: V, wzor: Wzor, opt: Partial<Sciana> = {}) {
    this.sciany.push({ p, e1, e2, n: norm(n), wzor, ...opt });
  }

  tri(p: V, e1: V, e2: V, n: V, wzor: Wzor, opt: Partial<Sciana> = {}) {
    this.sciany.push({ p, e1, e2, n: norm(n), wzor, tri: true, ...opt });
  }

  /** Prostopadłościan o narożniku `o` i krawędziach ax, ay, az (dowolnie obrócony); `wz(bok)` daje wzór ściany. */
  box(o: V, ax: V, ay: V, az: V, wz: (bok: 'x0' | 'x1' | 'y0' | 'y1' | 'z0' | 'z1') => Wzor) {
    const c = add(o, mul(add(add(ax, ay), az), 0.5));
    const sciana = (p: V, e1: V, e2: V, bok: 'x0' | 'x1' | 'y0' | 'y1' | 'z0' | 'z1') => {
      let n = norm(cross(e1, e2));
      const srodek = add(p, mul(add(e1, e2), 0.5));
      if (dot(n, sub(srodek, c)) < 0) n = mul(n, -1);
      this.quad(p, e1, e2, n, wz(bok));
    };
    sciana(o, ay, az, 'x0');
    sciana(add(o, ax), ay, az, 'x1');
    sciana(o, ax, az, 'y0');
    sciana(add(o, ay), ax, az, 'y1');
    sciana(o, ax, ay, 'z0');
    sciana(add(o, az), ax, ay, 'z1');
  }

  /** Walec (albo stożek ścięty) od punktu `a` wzdłuż wektora `os`, promienie r0 → r1, `boki` ścianek.
   *  Wzór boku dostaje s = obwód (px), t = wzdłuż osi (px); dna – wzór z punktem świata. */
  walec(a: V, os: V, r0: number, r1: number, boki: number, bok: Wzor, dno0?: Wzor | null, dno1?: Wzor | null, opt: Partial<Sciana> = {}) {
    const L = len(os), u = norm(os);
    // Dwa wektory prostopadłe do osi.
    const pom: V = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const v1 = norm(cross(u, pom)), v2 = cross(u, v1);
    const b = add(a, os);
    const obw0 = 2 * Math.PI * r0;
    for (let i = 0; i < boki; i++) {
      const k0 = (i / boki) * Math.PI * 2, k1 = ((i + 1) / boki) * Math.PI * 2;
      const d0 = add(mul(v1, Math.cos(k0)), mul(v2, Math.sin(k0)));
      const d1 = add(mul(v1, Math.cos(k1)), mul(v2, Math.sin(k1)));
      const p00 = add(a, mul(d0, r0)), p01 = add(a, mul(d1, r0)), p10 = add(b, mul(d0, r1));
      const dm = norm(add(d0, d1));
      // Normalna ścianki stożka: radialna przechylona o spadek promienia.
      const n = norm(add(dm, mul(u, (r0 - r1) / (L || 1))));
      const s0 = (i / boki) * obw0;
      // Równoległobok przybliża ściankę (dla stożka ściętego różnica < piksel przy wąskich ściankach).
      this.quad(p00, sub(p01, p00), sub(p10, p00), n, (s, t, k, p) => bok(s0 + s, t, k, p), opt);
    }
    const dno = (c: V, r: number, n: V, wz: Wzor) => {
      for (let i = 0; i < boki; i++) {
        const k0 = (i / boki) * Math.PI * 2, k1 = ((i + 1) / boki) * Math.PI * 2;
        const d0 = add(mul(v1, Math.cos(k0) * r), mul(v2, Math.sin(k0) * r));
        const d1 = add(mul(v1, Math.cos(k1) * r), mul(v2, Math.sin(k1) * r));
        this.tri(c, d0, d1, n, wz, opt);
      }
    };
    if (dno0) dno(a, r0, mul(u, -1), dno0);
    if (dno1) dno(b, r1, u, dno1);
  }
}

/** Rasteryzuje ściany do bufora kolorów (−1 = pusto) z głębią; ox, oy = gdzie na płótnie leży punkt (0, 0, 0). */
export function rasteruj(sciany: Sciana[], w: number, h: number, ox: number, oy: number) {
  const kolor = new Int32Array(w * h).fill(-1);
  const glebia = new Float32Array(w * h).fill(-1e9);
  const id = new Int16Array(w * h).fill(-1);
  const bezObr = new Uint8Array(sciany.length);
  sciany.forEach((f, fi) => {
    const widac = dot(f.n, OKO);
    if (widac <= 0.02 && !f.oba) return;
    if (f.bezObrysu) bezObr[fi] = 1;
    const k = ton(widac > 0 ? f.n : mul(f.n, -1));
    const p: [number, number] = [f.p[0] - SKOS * f.p[2] + ox, f.p[1] - f.p[2] + oy];
    const a: [number, number] = [f.e1[0] - SKOS * f.e1[2], f.e1[1] - f.e1[2]];
    const b: [number, number] = [f.e2[0] - SKOS * f.e2[2], f.e2[1] - f.e2[2]];
    const det = a[0] * b[1] - a[1] * b[0];
    if (Math.abs(det) < 0.02) return;
    const L1 = len(f.e1), L2 = len(f.e2);
    const xs = f.tri ? [p[0], p[0] + a[0], p[0] + b[0]] : [p[0], p[0] + a[0], p[0] + b[0], p[0] + a[0] + b[0]];
    const ys = f.tri ? [p[1], p[1] + a[1], p[1] + b[1]] : [p[1], p[1] + a[1], p[1] + b[1], p[1] + a[1] + b[1]];
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - p[0], dy = y + 0.5 - p[1];
      const s = (dx * b[1] - dy * b[0]) / det, t = (a[0] * dy - a[1] * dx) / det;
      if (s < 0 || t < 0 || (f.tri ? s + t > 1 : s > 1 || t > 1)) continue;
      const P: V = [f.p[0] + s * f.e1[0] + t * f.e2[0], f.p[1] + s * f.e1[1] + t * f.e2[1], f.p[2] + s * f.e1[2] + t * f.e2[2]];
      const d = dot(P, OKO);
      const i = y * w + x;
      if (d <= glebia[i]) continue;
      const c = f.wzor(s * L1, t * L2, k, P);
      if (c === null) continue;
      glebia[i] = d;
      kolor[i] = c;
      id[i] = fi;
    }
  });
  return { kolor, glebia, id, bezObr };
}

/** Wpisuje bufor do ImageData (w miejscu x0) z obrysem: sylwetka o piksel na zewnątrz + krawędzie zasłaniania. */
export function wpisz(img: ImageData, x0: number, w: number, h: number, r: ReturnType<typeof rasteruj>, prog = 2.5) {
  const { kolor, glebia, id, bezObr } = r;
  const put = (i: number, c: number, al: number) => {
    const x = i % w, y = (i / w) | 0, o = (y * img.width + x0 + x) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = al;
  };
  const S = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    if (kolor[i] >= 0) {
      let tusz = false;
      if (!bezObr[id[i]]) for (const [ddx, ddy] of S) {
        const xx = x + ddx, yy = y + ddy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (kolor[j] >= 0 && id[j] !== id[i] && !bezObr[id[j]] && glebia[j] > glebia[i] + prog) { tusz = true; break; }
      }
      put(i, tusz ? INK : kolor[i], 255);
    } else {
      for (const [ddx, ddy] of S) {
        const xx = x + ddx, yy = y + ddy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
          const j = yy * w + xx;
          if (kolor[j] >= 0 && !bezObr[id[j]]) { put(i, INK, 255); break; }
        }
      }
    }
  }
}

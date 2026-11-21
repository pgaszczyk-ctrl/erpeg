// Zejścia do lochów rysowane kodem na siatce świata (właściciel, 21 Nov 2026: „to, co rysujesz w kodzie, jest spójne;
// zejścia to nałożone placki w innej rozdzielczości”; potem: „unikaj symboli religijnych, a same obiekty pochyl do kąta
// świata/drogi/budynku”). Zejście to mała bryła 3D (kamienna obudowa, tylna ścianka z latarnią albo mosiężnym
// wywietrznikiem, klapa z dwóch skrzydeł) obrócona do jednego z 8 pikselowych kątów budynków (KATY_PIKSELOWE)
// i rzutowana jak ściany generatora: w górę = (−0,35, −1) piksela na piksel wysokości. Rysowana piksel po pikselu
// z buforem głębi, światło z północnego zachodu, obrys #1e1a24, kolory z palety świata. Piksel płótna = piksel świata
// = pół piksela mapy (pokazywane w skali 1/2, NEAREST).
//
// Klatki (poziomy pas): 0 zamknięte, 1 zamknięte z błyskiem w szczelinie (pukanie), 2 uchylone, 3 otwarte.
import type { RodzajLochu } from '../content/lochy';
import { KATY_PIKSELOWE } from '../gen/budynki';

export const KLATEK_ZEJSCIA = 4;
/** Przechył ścian generatora (WALL_SKEW). */
const SKOS = 0.35;
const INK = 0x1e1a24;

type V = [number, number, number];
/** Wzór ściany: (s, t) w pikselach wzdłuż krawędzi ściany, ton 0..4 ze światła → kolor albo null (dziura). */
type Wzor = (s: number, t: number, ton: number) => number | null;
interface Sciana { p: V; e1: V; e2: V; n: V; wzor: Wzor }

export interface ObrazZejscia {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  /** Próg (punkt zaczepienia, stopy bohatera) w klatce. */
  progX: number;
  progY: number;
  /** Środek szczeliny klapy w klatce (poświata, kurz). */
  szczX: number;
  szczY: number;
  /** Środek podstawy obudowy w klatce (tu stoi punkt zejścia na mapie). */
  srX: number;
  srY: number;
}

const hex = (s: string) => parseInt(s.slice(1), 16);
const KAMIEN = {
  krypta: ['#38383e', '#68686e', '#949098', '#b4aea8', '#c6c2c6'].map(hex),
  podziemia: ['#3a3440', '#7c756d', '#9a9490', '#b5a286', '#cdbd9c'].map(hex),
};
const MOSIADZ = ['#4a3216', '#9a6420', '#c8963e', '#e9c56a', '#f2d888'].map(hex);
const DREWNO = ['#3e2a1c', '#563724', '#6a4426', '#8a613f', '#a57a52'].map(hex);
const ZELAZO = ['#1e1b20', '#2a2a2e', '#46464c', '#68686e', '#949098'].map(hex);
const SCHODY = ['#141216', '#1f2130', '#2c2f42', '#3c4256', '#525a70'].map(hex);
/** Światło z północnego zachodu i z góry. */
const SWIATLO: V = (() => { const v: V = [-0.5, -0.6, 0.75]; const d = Math.hypot(...v); return [v[0] / d, v[1] / d, v[2] / d]; })();
/** Kierunek do oka: punkty na tej prostej trafiają w ten sam piksel (x − 0,35 z, y − z). */
const OKO: V = [SKOS, 1, 1];

const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ton = (n: V) => Math.max(1, Math.min(4, Math.round(2.2 + 2 * dot(n, SWIATLO))));

/**
 * Pas klatek zejścia. `kat` = indeks w KATY_PIKSELOWE (oś szerokości zejścia), `przod` = ±1: po której stronie tej osi
 * jest wejście (przód obudowy, próg).
 */
export function obrazZejscia(rodzaj: RodzajLochu, kat: number, przod: 1 | -1): ObrazZejscia {
  const a = (KATY_PIKSELOWE[((kat % 8) + 8) % 8] * Math.PI) / 180;
  const u: V = [Math.cos(a), Math.sin(a), 0];
  const n: V = [-u[1] * przod, u[0] * przod, 0];
  const Z: V = [0, 0, 1];
  // Lokalnie (szer. wzdłuż u, gł. wzdłuż n – dodatnia ku przodowi, wys.) → świat.
  const P = (x: number, y: number, z: number): V => [x * u[0] + y * n[0], x * u[1] + y * n[1], z];
  const W = (x: number, y: number, z: number): V => [x * u[0] + y * n[0], x * u[1] + y * n[1], z];
  const neg = (v: V): V => [-v[0], -v[1], -v[2]];
  const krypta = rodzaj === 'krypta';
  const K = KAMIEN[krypta ? 'krypta' : 'podziemia'];

  // Wymiary (piksele świata).
  const SZ = 20, GL = 12, HK = 4;       // obudowa: pół szerokości, pół głębokości, wysokość krawężnika
  const OS = 14, OP = 7, OT = -7;       // otwór: pół szerokości, krawędź przednia i tylna (gł.)
  const DOL = 7;                         // głębokość otworu pod krawężnikiem

  const sciany: Sciana[] = [];
  const dodaj = (p: V, e1: V, e2: V, nn: V, wzor: Wzor) => sciany.push({ p, e1, e2, n: nn, wzor });
  /** Prostopadłościan (bez spodu); `wz` dostaje stronę ('g' góra, 'p' przód, 't' tył, 'l', 'r'). */
  const bryla = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, wz: (bok: string) => Wzor) => {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    dodaj(P(x0, y0, z1), W(dx, 0, 0), W(0, dy, 0), Z, wz('g'));
    dodaj(P(x0, y1, z0), W(dx, 0, 0), W(0, 0, dz), n, wz('p'));
    dodaj(P(x0, y0, z0), W(dx, 0, 0), W(0, 0, dz), neg(n), wz('t'));
    dodaj(P(x0, y0, z0), W(0, dy, 0), W(0, 0, dz), neg(u), wz('l'));
    dodaj(P(x1, y0, z0), W(0, dy, 0), W(0, 0, dz), u, wz('r'));
  };
  const kamien = (spoinaCo = 4): Wzor => (s, t, k) => {
    // Kamienne bloki z przesuniętymi spoinami (rzędy co `spoinaCo`, bloki co 8).
    const rz = Math.floor(t / spoinaCo);
    const spoina = t % spoinaCo < 1 || (s + (rz % 2) * 4) % 8 < 1;
    return K[Math.max(0, k - (spoina ? 1 : 0))];
  };

  // 1. Krawężnik obudowy: góra z dziurą na otwór, boki.
  bryla(-SZ, SZ, -GL, GL, 0, HK, (bok) => {
    if (bok !== 'g') return kamien(2);
    return (s, t, k) => {
      const x = -SZ + s, y = -GL + t;
      if (Math.abs(x) < OS && y > OT && y < OP) return null;
      const brzeg = Math.abs(x) >= OS && Math.abs(x) < OS + 1 || (y <= OT && y > OT - 1) || (y >= OP && y < OP + 1);
      return K[brzeg ? 4 : k] ;
    };
  });
  // 2. Otwór: ścianki w głąb i schody (im dalej, tym głębiej i ciemniej).
  const schody: Wzor = (s, t) => {
    const i = Math.min(4, Math.max(0, Math.floor(((t) / (OP - OT)) * 5)));
    const krok = (t % ((OP - OT) / 5)) < 1 && i > 0;
    return krok ? SCHODY[Math.min(4, i + 1)] : SCHODY[i];
  };
  dodaj(P(-OS, OT, HK - DOL), W(2 * OS, 0, 0), W(0, OP - OT, 0), Z, schody);
  dodaj(P(-OS, OT, HK - DOL), W(2 * OS, 0, 0), W(0, 0, DOL), n, (s, t) => SCHODY[t > DOL - 2 ? 2 : 0]);
  dodaj(P(-OS, OT, HK - DOL), W(0, OP - OT, 0), W(0, 0, DOL), u, () => SCHODY[1]);
  dodaj(P(OS, OT, HK - DOL), W(0, OP - OT, 0), W(0, 0, DOL), neg(u), () => SCHODY[0]);
  dodaj(P(-OS, OP, HK - DOL), W(2 * OS, 0, 0), W(0, 0, DOL), neg(n), () => SCHODY[0]);

  // 3. Tylna ścianka (stoi na krawężniku za otworem).
  const SW = 16, ST0 = -GL, ST1 = -GL + 3, SH = 13;
  bryla(-SW, SW, ST0, ST1, HK, HK + SH, (bok) => {
    if (bok === 'g') return (_s, _t, k) => K[Math.min(4, k + 1)];
    if (bok !== 'p' || krypta) return kamien();
    // Katakumby: łuk nad przejściem (jaśniejszy kamień) z mosiężnym zwornikiem.
    return (s, t, k) => {
      const x = s - SW, y = SH - t;
      const r = Math.hypot(x, (y - 2) * 1.3);
      if (r < 1.5 && y > 1) return MOSIADZ[3];
      if (r >= 6 && r < 8 && y > 1) return K[4];
      if (r < 6 && y > 1) return K[1];
      return kamien()(s, t, k);
    };
  });
  if (krypta) {
    // Kamienny cokół z mosiężną latarnią gazową (zamiast krzyża – bez symboli religijnych).
    bryla(-2, 2, -GL, -GL + 3, HK + SH, HK + SH + 3, () => (_s, _t, k) => K[k]);
    bryla(-0.6, 0.6, -GL + 1, -GL + 2, HK + SH + 3, HK + SH + 6, () => (_s, _t, k) => ZELAZO[k]);
    bryla(-2, 2, -GL + 0.5, -GL + 2.5, HK + SH + 6, HK + SH + 10, (bok) =>
      bok === 'g' ? (_s, _t, k) => MOSIADZ[k] : (s, t) => (s < 0.8 || s > 3.2 || t < 0.8 || t > 3.2 ? MOSIADZ[2] : hex(t > 2 ? '#fff6c8' : '#f2d888')));
    bryla(-2.5, 2.5, -GL, -GL + 3, HK + SH + 10, HK + SH + 11, () => (_s, _t, k) => MOSIADZ[k]);
  } else {
    // Mosiężny wywietrznik przy prawym końcu ścianki, z kołnierzem.
    bryla(SW - 6, SW - 3, -GL + 0.5, -GL + 2.5, HK + SH, HK + SH + 7, () => (s, _t, k) => MOSIADZ[Math.min(4, k + (s < 1 ? 1 : 0))]);
    bryla(SW - 7, SW - 2, -GL, -GL + 3, HK + SH + 7, HK + SH + 8, () => (_s, _t, k) => MOSIADZ[k]);
  }

  // 4. Klapa: dwa skrzydła na zawiasach przy bokach otworu, obracają się w górę (kąt φ).
  const skrzydla = (phi: number, blysk: boolean): Sciana[] => {
    const out: Sciana[] = [];
    const L = OS, gl = OP - OT;
    for (const strona of [-1, 1] as const) {
      // Zawias na x = strona·OS; skrzydło sięga do środka (x = 0) przy φ = 0.
      const kier: V = W(-strona * L * Math.cos(phi), 0, L * Math.sin(phi));
      const p0 = P(strona * OS, OT, HK + 0.2);
      const e2 = W(0, gl, 0);
      // Normalna lica (góra przy φ = 0).
      const nx = strona * Math.sin(phi), nz = Math.cos(phi);
      const nl: V = [nx * u[0], nx * u[1], nz];
      const lico: Wzor = (s, t, k) => {
        const doSrodka = L - s; // 0 przy szczelinie
        if (blysk && doSrodka < 1) return hex(t > gl / 2 - 1 && t < gl / 2 + 1 ? '#ece6d6' : '#aaaab8');
        if (blysk && doSrodka < 2 && t > 2 && t < gl - 2) return hex('#6a8aa0');
        if (krypta) {
          // Żelazna krata: pręty co 3 px, poprzeczki przy końcach, mosiężny rygiel przy szczelinie.
          if (doSrodka < 2 && Math.abs(t - gl / 2) < 1) return MOSIADZ[3];
          const pret = s % 3 < 1 || t < 1.2 || t > gl - 1.2 || Math.abs(t - gl / 2) < 0.6;
          return pret ? ZELAZO[Math.min(4, k + 1)] : ZELAZO[0];
        }
        // Deski z mosiężnymi okuciami i żelaznym kółkiem.
        if (doSrodka < 3 && Math.abs(t - gl / 2) < 1.5) return doSrodka < 1.5 ? ZELAZO[3] : INK;
        if (t > 2 && t < 3 || t > gl - 3 && t < gl - 2) return MOSIADZ[Math.min(4, k + (s % 6 < 1 ? 1 : 0))];
        return s % 4 < 1 ? DREWNO[Math.max(0, k - 2)] : DREWNO[k];
      };
      out.push({ p: p0, e1: kier, e2, n: nl, wzor: lico });
      out.push({ p: p0, e1: kier, e2, n: neg(nl), wzor: (s, _t, k) => krypta ? (s % 3 < 1 ? ZELAZO[Math.min(4, k + 1)] : ZELAZO[1]) : DREWNO[Math.max(1, k - 1)] });
    }
    return out;
  };

  // Rzut: x − 0,35 z, y − z. Rozmiar płótna z najdalszych punktów wszystkich klatek.
  const klatki = [skrzydla(0, false), skrzydla(0, true), skrzydla(0.75, false), skrzydla(1.62, false)];
  const rzut = (v: V): [number, number] => [v[0] - SKOS * v[2], v[1] - v[2]];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const f of [...sciany, ...klatki.flat()]) for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const [sx, sy] = rzut([f.p[0] + i * f.e1[0] + j * f.e2[0], f.p[1] + i * f.e1[1] + j * f.e2[1], f.p[2] + i * f.e1[2] + j * f.e2[2]]);
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  const M = 4; // margines na obrys i cień
  const ox = Math.floor(x0) - M, oy = Math.floor(y0) - M;
  const w = Math.ceil(x1) + M + 3 - ox, h = Math.ceil(y1) + M + 2 - oy;
  const canvas = document.createElement('canvas');
  canvas.width = w * KLATEK_ZEJSCIA;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, h);

  klatki.forEach((sk, k) => maluj(img, k * w, w, h, ox, oy, [...sciany, ...sk], P(-SZ, -GL, 0), W(2 * SZ, 0, 0), W(0, 2 * GL, 0)));
  ctx.putImageData(img, 0, 0);
  const [px, py] = rzut(P(0, GL + 2, 0));
  const [cx, cy] = rzut(P(0, (OP + OT) / 2, HK));
  return { canvas, w, h, progX: px - ox, progY: py - oy, szczX: cx - ox, szczY: cy - oy, srX: -ox, srY: -oy };
}

/** Maluje jedną klatkę: ściany z buforem głębi, cień obudowy na ziemi, obrys sylwetki i krawędzi zasłaniania. */
function maluj(img: ImageData, x0: number, w: number, h: number, ox: number, oy: number, sciany: Sciana[], cp: V, ce1: V, ce2: V) {
  const kolor = new Int32Array(w * h).fill(-1);
  const glebia = new Float32Array(w * h).fill(-1e9);
  const id = new Int16Array(w * h).fill(-1);
  sciany.forEach((f, fi) => {
    if (dot(f.n, OKO) <= 0.02) return; // tyłem do oka
    const k = ton(f.n);
    const p: [number, number] = [f.p[0] - SKOS * f.p[2] - ox, f.p[1] - f.p[2] - oy];
    const a: [number, number] = [f.e1[0] - SKOS * f.e1[2], f.e1[1] - f.e1[2]];
    const b: [number, number] = [f.e2[0] - SKOS * f.e2[2], f.e2[1] - f.e2[2]];
    const det = a[0] * b[1] - a[1] * b[0];
    if (Math.abs(det) < 0.05) return;
    const L1 = Math.hypot(...f.e1), L2 = Math.hypot(...f.e2);
    const xs = [p[0], p[0] + a[0], p[0] + b[0], p[0] + a[0] + b[0]], ys = [p[1], p[1] + a[1], p[1] + b[1], p[1] + a[1] + b[1]];
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(h - 1, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(w - 1, Math.ceil(Math.max(...xs))); x++) {
        const dx = x + 0.5 - p[0], dy = y + 0.5 - p[1];
        const s = (dx * b[1] - dy * b[0]) / det, t = (a[0] * dy - a[1] * dx) / det;
        if (s < 0 || s > 1 || t < 0 || t > 1) continue;
        const X = f.p[0] + s * f.e1[0] + t * f.e2[0], Y = f.p[1] + s * f.e1[1] + t * f.e2[1], Zz = f.p[2] + s * f.e1[2] + t * f.e2[2];
        const d = dot([X, Y, Zz], OKO);
        const i = y * w + x;
        if (d <= glebia[i]) continue;
        const c = f.wzor(s * L1, t * L2, k);
        if (c === null) continue;
        glebia[i] = d;
        kolor[i] = c;
        id[i] = fi;
      }
  });
  // Cień obudowy: jej podstawa przesunięta na południowy wschód (jak cienie budynków), tylko tam, gdzie nic nie stoi.
  const cien = new Uint8Array(w * h);
  const det = ce1[0] * ce2[1] - ce1[1] * ce2[0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x + 0.5 + ox - 3, Y = y + 0.5 + oy - 2.5;
    const dx = X - cp[0], dy = Y - cp[1];
    const s = (dx * ce2[1] - dy * ce2[0]) / det, t = (ce1[0] * dy - ce1[1] * dx) / det;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) cien[y * w + x] = 1;
  }
  const put = (i: number, c: number, al: number) => {
    const x = i % w, y = (i / w) | 0, o = (y * img.width + x0 + x) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = al;
  };
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    if (kolor[i] >= 0) {
      // Krawędź zasłaniania: sąsiad z innej ściany wyraźnie dalej od oka → ten dalszy dostaje tusz (tu: sprawdzamy siebie).
      let tusz = false;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + ddx, yy = y + ddy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) { tusz = true; break; }
        const j = yy * w + xx;
        if (kolor[j] < 0) { tusz = true; break; }
        if (id[j] !== id[i] && glebia[j] > glebia[i] + 2.5) { tusz = true; break; }
      }
      put(i, tusz ? INK : kolor[i], 255);
    } else {
      // Obrys o piksel na zewnątrz sylwetki.
      let obok = false;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + ddx, yy = y + ddy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && kolor[yy * w + xx] >= 0) { obok = true; break; }
      }
      if (obok) put(i, INK, 255);
      else if (cien[i]) put(i, 0x14121a, 82);
    }
  }
}

/** Kurz/para z pukania: mała pikselowa chmurka (2 klatki, 10×8). */
export function plotnoKurzu(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 20;
  c.height = 8;
  const x = c.getContext('2d')!;
  const wz = [
    ['..xxx.....', '.xoooxx...', 'xooooooxx.', 'xoooooooox', '.xxooooxx.', '...xxxx...'],
    ['..........', '...xx.....', '..xooxx...', '.xooooox..', '..xxoxx...', '....x.....'],
  ];
  wz.forEach((rows, f) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    x.fillStyle = ch === 'x' ? '#949098' : '#c6c2c6';
    x.fillRect(f * 10 + i, j + 1, 1, 1);
  })));
  return c;
}

/** Zimna poświata w pikselach (twarde pasma + szachownica Bayera), biała – barwiona przy pokazywaniu. */
export function plotnoPoswiaty(): HTMLCanvasElement {
  const W = 72, H = 52;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const img = x.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const dx = (i + 0.5 - W / 2) / (W / 2), dy = (j + 0.5 - H / 2) / (H / 2);
    const d = Math.hypot(dx, dy);
    if (d >= 1) continue;
    const v = (1 - d) * 3;
    const pasmo = Math.floor(v);
    const p = pasmo + ((v - pasmo) * 16 > bayer[(j & 3) * 4 + (i & 3)] ? 1 : 0);
    if (!p) continue;
    const o = (j * W + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = [0, 70, 140, 210][Math.min(3, p)];
  }
  x.putImageData(img, 0, 0);
  return c;
}

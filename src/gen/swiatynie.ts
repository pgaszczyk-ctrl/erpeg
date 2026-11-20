// Świątynie według wyznania (raport 19.11.2026: jeden wygląd wszędzie). Na dachu gotowego obrazu budynku:
// cerkiew – cebulaste kopuły na bębnach z krzyżem, meczet – kopuła i minaret. Kościół zostaje jak był.
// Kopuły rysowane kodem w palecie świata (obrys #1e1a24, światło z północnego zachodu). Bez DOM-u.
import { type Obraz, nowy, ustaw, wez, rgb, hex, OBRYS, hash } from './wspolne';

export type Swiatynia = 'cerkiew' | 'meczet';

const ZLOTO = ['#6b4a12', '#9a6c1c', '#c99a30', '#e8c45a', '#fbe7a0'].map(hex);
const ZIELEN = ['#1d3b34', '#2b5a4c', '#3f7c66', '#5fa088', '#8ac6ad'].map(hex);
const NIEBO = ['#1d3550', '#2b4c72', '#3f6c98', '#5f8fbc', '#8cb6dc'].map(hex);
const TYNK = ['#8a8270', '#a89e88', '#c6bca4', '#ddd4bc', '#f0e9d6'].map(hex);

/** Fills a shape given by its half-width at each row, shaded from the north-west, with an ink outline. */
function bryla(o: Obraz, cx: number, gora: number, wysokosc: number, polSzer: (t: number) => number, paleta: number[]) {
  // Whole pixels only: a fractional row index writes nowhere in a typed array.
  gora = Math.round(gora); wysokosc = Math.round(wysokosc);
  for (let j = 0; j < wysokosc; j++) {
    const t = (j + 0.5) / wysokosc, w = polSzer(t);
    for (let i = Math.floor(cx - w); i <= Math.ceil(cx + w); i++) {
      const u = (i + 0.5 - cx) / Math.max(0.5, w);
      if (Math.abs(u) > 1) continue;
      const swiatlo = -u * 0.55 - (t - 0.5) * 0.5;
      const k = Math.max(0, Math.min(4, Math.round(2 + swiatlo * 2.2)));
      ustaw(o, i, gora + j, paleta[k]);
    }
  }
}

/** One-pixel ink outline around everything opaque that was drawn after `przed` (a snapshot of the picture). */
function obrysujNowe(o: Obraz, przed: Uint32Array) {
  const dodaj: number[] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const k = y * o.w + x;
    if (o.px[k] >>> 24) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= o.w || yy >= o.h) continue;
      const kk = yy * o.w + xx;
      if (o.px[kk] >>> 24 && o.px[kk] !== przed[kk]) { dodaj.push(k); break; }
    }
  }
  for (const k of dodaj) o.px[k] = OBRYS;
}

function cebula(o: Obraz, cx: number, dol: number, r: number, paleta: number[]) {
  // Drum (a short plastered cylinder) under the onion, then the onion with its pointed top, then a cross.
  const beben = Math.max(2, Math.round(r * 0.7));
  bryla(o, cx, dol - beben, beben, () => r * 0.62, TYNK);
  const h = Math.round(r * 2.1);
  bryla(o, cx, dol - beben - h, h, (t) => r * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75) * (t < 0.2 ? t / 0.2 * 0.6 + 0.4 : 1), paleta);
  const szczyt = dol - beben - h;
  const zl = ZLOTO[3];
  for (let j = 1; j <= Math.max(3, Math.round(r * 0.6)); j++) ustaw(o, Math.round(cx), Math.round(szczyt) - j, zl);
  const ramie = Math.max(1, Math.round(r * 0.25));
  for (let i = -ramie; i <= ramie; i++) ustaw(o, Math.round(cx) + i, Math.round(szczyt) - Math.round(r * 0.35), zl);
}

/**
 * Domes and a minaret on a building picture. `pierscien` = the outline in the picture's own coordinates (x0/y0 of
 * the picture subtracted). Returns a picture with room added above (and how much was added), so tall parts fit.
 */
export function swiatyniaNaDachu(obraz: Obraz, pierscien: number[], rodzaj: Swiatynia, seed: number): { obraz: Obraz; gora: number } {
  let sx = 0, sy = 0, n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < pierscien.length; i += 2) {
    const x = pierscien[i], y = pierscien[i + 1];
    sx += x; sy += y; n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (!n) return { obraz, gora: 0 };
  const rozmiar = Math.min(x1 - x0, y1 - y0);
  const r = Math.max(4, Math.min(16, Math.round(rozmiar * 0.16)));
  const gora = Math.round(r * 6);
  const out = nowy(obraz.w, obraz.h + gora);
  out.px.set(obraz.px, out.w * gora);
  const przed = out.px.slice();
  const cx = Math.round(sx / n), cy = Math.round(sy / n) + gora;
  if (rodzaj === 'cerkiew') {
    const paleta = hash(seed, 3, 7) < 0.55 ? ZLOTO : hash(seed, 4, 7) < 0.6 ? ZIELEN : NIEBO;
    // Small onions at the ends of the longer axis first (they stand behind), then the big one in the middle.
    const wzdluz = x1 - x0 >= y1 - y0;
    const d = (wzdluz ? x1 - x0 : y1 - y0) * 0.3;
    if (rozmiar > 18) for (const s of [-1, 1]) cebula(out, Math.round(wzdluz ? cx + s * d : cx), Math.round(wzdluz ? cy : cy + s * d), Math.max(3, Math.round(r * 0.6)), paleta);
    cebula(out, cx, cy, r, paleta);
  } else {
    const paleta = hash(seed, 5, 9) < 0.5 ? ZIELEN : NIEBO;
    const R = r * 1.45, beben = Math.max(2, Math.round(r * 0.55)), h = Math.round(R * 0.95);
    bryla(out, cx, cy - beben, beben, () => R * 0.92, TYNK);
    bryla(out, cx, cy - beben - h, h, (t) => R * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 2))), paleta);
    ustaw(out, Math.round(cx), cy - beben - h - 1, ZLOTO[3]);
    ustaw(out, Math.round(cx), cy - beben - h - 2, ZLOTO[3]);
    // Minaret at the outline's north-east corner: a slim plastered tower with a balcony and a pointed cap.
    let mx = x1 - 2, my = y0 + gora + 2, best = -Infinity;
    for (let i = 0; i + 1 < pierscien.length; i += 2) {
      const s = pierscien[i] - pierscien[i + 1];
      if (s > best) { best = s; mx = Math.round(pierscien[i]) - 2; my = Math.round(pierscien[i + 1]) + gora + 2; }
    }
    const wys = Math.round(r * 4.2), szer = Math.max(2, Math.round(r * 0.32));
    bryla(out, mx, my - wys, wys, () => szer, TYNK);
    bryla(out, mx, my - Math.round(wys * 0.72), 2, () => szer + 1.5, TYNK);
    bryla(out, mx, my - wys - Math.round(r * 1.1), Math.round(r * 1.1), (t) => szer * t, paleta);
    ustaw(out, Math.round(mx), my - wys - Math.round(r * 1.1) - 1, ZLOTO[3]);
  }
  obrysujNowe(out, przed);
  return { obraz: out, gora };
}

/** Is this point's colour opaque (for tests). */
export const nieprzezroczysty = (o: Obraz, x: number, y: number) => !!(wez(o, x, y) >>> 24);
export const _rgb = rgb;

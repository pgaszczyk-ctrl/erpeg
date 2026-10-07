import { hash, rgb, szum, type Obraz } from '../gen';
import { KOLORY_MOZAIKI } from '../content/mozaiki';

/** Mozaika w px generatora: środek, obrót (radiany), px generatora na piksel obrazka, bok kostki (px generatora). */
export interface Mozaika09 { cx: number; cy: number; kat: number; skala: number; kostka: number; obraz: string[] }

/** Czy punkt (px generatora) leży na obrazku mozaiki (żeby straganów targu tam nie stawiać). */
export function naMozaice(m: Mozaika09, x: number, y: number, zapas = 6) {
  const W = m.obraz[0].length, H = m.obraz.length;
  const dx = x - m.cx, dy = y - m.cy, c = Math.cos(-m.kat), s = Math.sin(-m.kat);
  const u = (dx * c - dy * s) / m.skala + W / 2, v = (dx * s + dy * c) / m.skala + H / 2;
  const z = zapas / m.skala;
  return u >= -z && v >= -z && u < W + z && v < H + z;
}

/** Piasek, którym mozaika jest przysypana (właściciel 7.10.2026: „przysyp delikatnie piaskiem, żeby nie była naklejką”). */
const PIASEK: [number, number, number] = [196, 172, 128];

/**
 * Obrazek z kolorowej kostki w posadzce, wtopiony w otoczenie: każdy piksel kawałka cofnięty o obrót do układu obrazka;
 * kostki w obróconej siatce, każda w swoim odcieniu, fugi ciemniejsze; kolor zmieszany z brukiem pod spodem (wyblakły),
 * przysypany plamami piasku (szum w świecie, więc ciągły między kawałkami), brzegi postrzępione, bez obwódki.
 */
export function malujMozaike(o: Obraz, X0: number, Y0: number, N: number, m: Mozaika09) {
  const W = m.obraz[0].length, H = m.obraz.length;
  const c = Math.cos(-m.kat), s = Math.sin(-m.kat);
  const R = (Math.hypot(W, H) / 2) * m.skala + 2;
  const xa = Math.max(X0, Math.floor(m.cx - R)), xb = Math.min(X0 + N, Math.ceil(m.cx + R));
  const ya = Math.max(Y0, Math.floor(m.cy - R)), yb = Math.min(Y0 + N, Math.ceil(m.cy + R));
  const at = (u: number, v: number) => {
    const i = Math.floor(u), j = Math.floor(v);
    return i >= 0 && j >= 0 && i < W && j < H ? m.obraz[j][i] : '.';
  };
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const dx = x + 0.5 - m.cx, dy = y + 0.5 - m.cy;
    const ru = dx * c - dy * s, rv = dx * s + dy * c; // px generatora w układzie obrazka
    // Postrzępiony brzeg: punkt próbkowania lekko przesunięty szumem.
    const jx = (szum(x / 9, y / 9) - 0.5) * 2.4, jy = (szum(x / 9 + 31, y / 9 + 17) - 0.5) * 2.4;
    const u = (ru + jx) / m.skala + W / 2, v = (rv + jy) / m.skala + H / 2;
    const ch = at(u, v);
    const k = KOLORY_MOZAIKI[ch];
    if (!k) continue;
    const i = (y - Y0) * o.w + (x - X0);
    if (x - X0 < 0 || y - Y0 < 0 || x - X0 >= o.w || y - Y0 >= o.h) continue;
    const pod = o.px[i];
    const [br, bg, bb] = [pod & 255, (pod >>> 8) & 255, (pod >>> 16) & 255];
    // Kostka w obróconej siatce: odcień z ziarna kostki, fuga (z brukiem spod spodu) na jej krawędzi.
    const ku = ru / m.kostka, kv = rv / m.kostka;
    const fu = ku - Math.floor(ku), fv = kv - Math.floor(kv);
    const f = 0.88 + hash(Math.floor(ku), Math.floor(kv), 41) * 0.2;
    const fuga = fu < 0.16 || fv < 0.16;
    // Kolor wyblakły: pół na pół z brukiem, fugi bardziej brukiem.
    let t = fuga ? 0.34 : 0.66;
    // Piasek: duże miękkie plamy + drobne ziarno; mocniej przy brzegach obrazka.
    const brzeg = Math.min(u, v, W - u, H - v) / 6; // 0 na brzegu, 1 w głębi
    const plama = szum(x / 23 + 5, y / 23 + 9) * 0.75 + szum(x / 7, y / 7) * 0.25;
    let piach = Math.max(0, (plama - 0.42) * 1.9) + Math.max(0, 0.45 - Math.min(1, brzeg)) * 0.8;
    piach = Math.min(0.85, piach + (hash(x, y, 77) < 0.08 ? 0.25 : 0));
    t *= 1 - piach * 0.9;
    const mix = (a: number, b: number) => a + (b - a) * t;
    let r = mix(br, k[0] * f), g = mix(bg, k[1] * f), b = mix(bb, k[2] * f);
    r += (PIASEK[0] - r) * piach * 0.75; g += (PIASEK[1] - g) * piach * 0.75; b += (PIASEK[2] - b) * piach * 0.75;
    o.px[i] = rgb(r, g, b);
  }
}

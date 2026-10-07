import { hash, rgb, ustaw, type Obraz } from '../gen';
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

/**
 * Obrazek z kolorowej kostki w posadzce: każdy piksel kawałka cofnięty o obrót do układu obrazka; kostki w obróconej
 * siatce, każda w swoim odcieniu (±10 %), fugi ciemniejsze, brzeg obrazka obwiedziony ciemną kostką.
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
    const u = ru / m.skala + W / 2, v = rv / m.skala + H / 2;
    const ch = at(u, v);
    if (ch === '.') {
      // Ciemny brzeg wokół obrazka (kostka obrzeża).
      const e = 1 / m.skala;
      if (at(u + e, v) !== '.' || at(u - e, v) !== '.' || at(u, v + e) !== '.' || at(u, v - e) !== '.') ustaw(o, x - X0, y - Y0, rgb(52, 48, 50));
      continue;
    }
    const k = KOLORY_MOZAIKI[ch];
    if (!k) continue;
    // Kostka w obróconej siatce: odcień z ziarna kostki, fuga na jej krawędzi.
    const ku = ru / m.kostka, kv = rv / m.kostka;
    const fu = ku - Math.floor(ku), fv = kv - Math.floor(kv);
    let f = 0.9 + hash(Math.floor(ku), Math.floor(kv), 41) * 0.2;
    if (fu < 0.18 || fv < 0.18) f *= 0.72;
    else if (fu > 0.82 || fv > 0.82) f *= 1.08; // jaśniejsza krawędź od światła
    ustaw(o, x - X0, y - Y0, rgb(k[0] * f, k[1] * f, k[2] * f));
  }
}

// Generator świata Exp-lore – śnieg (właściciel 27.11.2026: „w Zakopanem jest mnóstwo śniegu, odwzorowujemy to?”).
// Pokrycie 0..1 liczone z grubości śniegu (cm), plamy z szumu we współrzędnych świata (ciągłe między kawałkami),
// kolor śniegu z jasności tego, co pod spodem: faktura (rzędy dachówek, cienie, kępy) zostaje, tylko w bieli.

import { hash, hex, skladowe, szum, type Obraz } from './wspolne';
import type { Rodzaj } from './podloze';

/** Pięć tonów śniegu od cienia (chłodny błękit) do pełnego światła. */
export const SNIEG = ['#7f91ae', '#a8b8d0', '#cbd7e6', '#e6edf6', '#f9fbff'].map(hex);

/** Ile śniegu (0..1 pokrycia) daje grubość w cm: 1 cm – pierwsze plamy, 5 cm – większość, 15+ cm – wszystko. */
export const pokrycieZCm = (cm: number) => (cm <= 0.3 ? 0 : Math.min(1, 1 - Math.exp(-(cm - 0.3) / 4.5)));

/** Ile śniegu zostaje na danym podłożu (drogi odśnieżone i rozjeżdżone, woda bez śniegu). */
const NA_PODLOZU: Partial<Record<Rodzaj, number>> = {
  droga: 0.55, bruk: 0.55, chodnik: 0.65, plac: 0.75, parking: 0.7, tory: 0.6, klepisko: 0.65,
  bloto: 0.45, woda: 0, plycizna: 0, skala: 0.8, las_lisciasty: 0.85, las_iglasty: 0.75,
};

const UBITY = new Set<Rodzaj>(['droga', 'bruk', 'parking', 'plac']);

const jasnosc = (c: number) => { const [r, g, b] = skladowe(c); return (r * 0.3 + g * 0.59 + b * 0.11) / 255; };

/** Szum plam śniegu 0..1 (duże plamy + drobna ziarnistość), ten sam dla ziemi i dachów. */
export function szumSniegu(x: number, y: number) {
  return szum(x / 26, y / 26) * 0.58 + szum(x / 7, y / 7 + 31) * 0.3 + hash(x >> 1, y >> 1, 4243) * 0.12;
}

/**
 * Pokrywa ziemię kawałka śniegiem. `pokrycie(x, y)` = 0..1 w danym punkcie (w górach rośnie z wysokością).
 * Wywoływać po podłożu, wodzie, runie, polach i torach, przed budynkami i drzewami.
 */
export function osniezPodloze(o: Obraz, x0: number, y0: number, rodzajW: (x: number, y: number) => Rodzaj | null, pokrycie: (x: number, y: number) => number) {
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const k = j * o.w + i, c = o.px[k];
    if (!(c >>> 24)) continue;
    const x = x0 + i, y = y0 + j;
    const r = rodzajW(x, y);
    const m = r ? NA_PODLOZU[r] ?? 1 : 1;
    if (!m) continue;
    const p = pokrycie(x, y) * m;
    if (p <= 0) continue;
    const prog = p * 1.12, n = szumSniegu(x, y);
    if (n >= prog) continue;
    // ton z jasności podłoża (ciemne – cień w śniegu), brzeg plamy o ton ciemniejszy
    const L = jasnosc(c);
    let t = L < 0.16 ? 1 : L < 0.28 ? 2 : L < 0.5 ? 3 : 4;
    if (prog - n < 0.035 && p < 0.95) t = Math.max(0, t - 1);
    // Ubity, rozjeżdżony śnieg na jezdniach i placach: szarawy, w smugach (koleiny) zamiast białego puchu.
    if (r && UBITY.has(r)) t = hash(x >> 2, y, 4249) < 0.35 ? 1 : 2;
    o.px[k] = SNIEG[t];
  }
}

/**
 * Śnieg na dachu budynku (piksele `kind === 1`). Ton z jasności dachu względem najjaśniejszego/najciemniejszego
 * piksela tego dachu, więc połać w cieniu jest szaroniebieska, kalenice i kosze zostają widoczne.
 */
export function osniezDach(o: Obraz, kind: Uint8Array, x0: number, y0: number, pokrycie: number) {
  if (pokrycie <= 0) return;
  let lo = 1, hi = 0;
  for (let k = 0; k < kind.length; k++) if (kind[k] === 1 && o.px[k] >>> 24) { const L = jasnosc(o.px[k]); if (L < lo) lo = L; if (L > hi) hi = L; }
  if (hi < lo) return;
  const zakres = Math.max(0.05, hi - lo), prog = pokrycie * 1.15;
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const k = j * o.w + i, c = o.px[k];
    if (kind[k] !== 1 || !(c >>> 24)) continue;
    const x = x0 + i, y = y0 + j;
    if (szum(x / 9 + 17, y / 9) * 0.75 + hash(x, y, 4251) * 0.25 >= prog) continue;
    const u = (jasnosc(c) - lo) / zakres;
    o.px[k] = SNIEG[Math.min(4, Math.max(0, Math.round(u * 3.4 + 0.6)))];
  }
}

/**
 * Czapa śniegu na koronie drzewa: piksele, nad którymi jest pusto (górne krawędzie liści i gałęzi), plus
 * część jaśniejszych pikseli od światła. Obraz zmieniany w miejscu.
 */
export function osniezKorone(kor: Obraz, pokrycie: number, ziarno = 0) {
  if (pokrycie <= 0) return;
  const { w, h, px } = kor, src = px.slice();
  const pelny = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && (src[j * w + i] >>> 24) > 0;
  const grubosc = pokrycie > 0.7 ? 2 : 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, c = src[k];
    if (!(c >>> 24)) continue;
    let gora = false;
    for (let d = 1; d <= grubosc; d++) if (!pelny(i, j - d)) gora = true;
    const L = jasnosc(c);
    const los = hash(i, j, 911 + ziarno);
    if (gora && los < 0.35 + pokrycie * 0.65) px[k] = SNIEG[L > 0.3 ? 4 : 3];
    else if (L > 0.32 && los < pokrycie * 0.45) px[k] = SNIEG[L > 0.45 ? 3 : 2];
    else if (pokrycie > 0.6 && los < (pokrycie - 0.6) * 0.5) px[k] = SNIEG[1];
  }
}


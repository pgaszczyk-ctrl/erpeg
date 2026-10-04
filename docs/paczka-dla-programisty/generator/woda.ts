// Woda i brzegi: stopniowana głębokość (płycizna → głębia), piana przy brzegu, uskok brzegu,
// a na lądzie przy KAŻDYM zbiorniku pas brzegu: szuwary (trzciny, błoto, bujna trawa) albo plaża (mokry i suchy piasek),
// przy utwardzonych powierzchniach kamienne nabrzeże. Wzór: staw z makiety (makieta/zywy-swiat.html, pondD).
//
// Wywołać PO malujPodloze (nadpisuje wodę i pas lądu przy wodzie). Liczy odległość od linii brzegu w oknie
// powiększonym o margines M, czytając rodzajW także poza kawałkiem – dzięki temu sąsiednie kawałki łączą się bez szwów.
// Zwraca miejsca trzcin (w kawałku), które gra rysuje jako runo 'trzcina' (z wiatrem) – albo od razu: runo(o, x, y, 'trzcina', seed).
import { Obraz, hex, hash, szum, bayer, ciemniej, mieszaj } from './wspolne';
import { Rodzaj, rodzajPostrzepiony } from './podloze';

export type Brzeg = 'szuwary' | 'plaza' | 'nabrzeze';

const P = (a: string[]) => a.map(hex);
const WODA = {
  glebia: P(['#204a66', '#245170']),
  srednia: P(['#25506a', '#2e6380']),
  plytka: P(['#3b7892', '#4a8aa2']),
  plycizna_piasek: P(['#5e9c9a', '#6eaaa2']), // nad piaskiem: jasna, zielonkawa
  plycizna_mul: P(['#3e6e62', '#4a7a66']),    // przy szuwarach: mętna, zielona
  piana: hex('#9cc6cc'), fala: hex('#7fb0bd'), blysk: hex('#d4eef2'), uskok: hex('#16324a'),
  lilia: P(['#3f7a3a', '#5a9a48', '#e8e0f0']),
};
const LAD = {
  piasek_mokry: P(['#8f7d55', '#9c8a5e']),
  piasek: P(['#b39b69', '#c7ae7b', '#d6bf8d']),
  mul: P(['#4a4430', '#5a5236', '#4a5a30']),
  bujna: P(['#3a6229', '#45702f', '#527d36']),
  kamien: P(['#5e5a60', '#7f7a80', '#a8a2a2', '#3a3540']),
};
const TWARDE: Rodzaj[] = ['bruk', 'chodnik', 'plac', 'droga', 'parking', 'tory', 'skala'];
const DZIKIE: Rodzaj[] = ['mokradlo', 'zarosla', 'las_lisciasty', 'las_iglasty', 'laka'];

/** Jaki brzeg w danym miejscu: z rodzaju lądu, a dla trawy/parku – z dużego szumu (odcinki plaży i szuwarów na zmianę). */
export function rodzajBrzegu(lad: Rodzaj, x: number, y: number): Brzeg {
  if (lad === 'piasek') return 'plaza';
  if (TWARDE.includes(lad)) return 'nabrzeze';
  if (DZIKIE.includes(lad)) return szum(x / 90 + 3, y / 90) > 0.8 ? 'plaza' : 'szuwary';
  return szum(x / 70 + 11, y / 70 + 5) > 0.5 ? 'plaza' : 'szuwary';
}

const pick = (t: number[], v: number) => t[Math.max(0, Math.min(t.length - 1, Math.floor(v * t.length)))];

/**
 * Odległość od linii brzegu (w px obrazu, ograniczona do M) dla wody i dla lądu, w oknie kawałka.
 * Chamfer 2-przebiegowy (1 / 1,41) – ok. 30 ms na kawałek 1024² na komputerze, ~0,1 s na średnim telefonie;
 * kawałek bez wody w zasięgu M jest pomijany od razu.
 */
export function odlegloscBrzegu(x0: number, y0: number, w: number, h: number, rodzajW: (x: number, y: number) => Rodzaj | null, M = 32) {
  const W = w + 2 * M, H = h + 2 * M, n = W * H;
  const woda = new Uint8Array(n);
  let jest = false, sucho = false;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const r = rodzajPostrzepiony(rodzajW, x0 + i - M, y0 + j - M);
    if (r === 'woda') { woda[j * W + i] = 1; jest = true; } else sucho = true;
  }
  if (!jest || !sucho) return { jest, W, H, M, woda, dW: null as Float32Array | null, dL: null as Float32Array | null };
  const BIG = 1e4;
  const pas = (cel: number) => {
    const d = new Float32Array(n);
    for (let k = 0; k < n; k++) d[k] = woda[k] === cel ? BIG : 0; // 0 = po drugiej stronie brzegu
    const D = Math.SQRT2;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; let v = d[k]; if (!v) continue;
      if (i > 0) v = Math.min(v, d[k - 1] + 1); if (j > 0) { v = Math.min(v, d[k - W] + 1); if (i > 0) v = Math.min(v, d[k - W - 1] + D); if (i < W - 1) v = Math.min(v, d[k - W + 1] + D); } d[k] = v; }
    for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; let v = d[k]; if (!v) continue;
      if (i < W - 1) v = Math.min(v, d[k + 1] + 1); if (j < H - 1) { v = Math.min(v, d[k + W] + 1); if (i < W - 1) v = Math.min(v, d[k + W + 1] + D); if (i > 0) v = Math.min(v, d[k + W - 1] + D); } d[k] = v; }
    for (let k = 0; k < n; k++) if (d[k] > M) d[k] = M;
    return d;
  };
  return { jest, W, H, M, woda, dW: pas(1), dL: pas(0) };
}

/** Maluje wodę ze stopniowaną głębią i brzegi. Zwraca punkty trzcin [x, y] (współrzędne świata). */
export function malujWode(o: Obraz, x0: number, y0: number, rodzajW: (x: number, y: number) => Rodzaj | null): [number, number][] {
  const f = odlegloscBrzegu(x0, y0, o.w, o.h, rodzajW);
  const trzciny: [number, number][] = [];
  if (!f.jest || !f.dW || !f.dL) return trzciny;
  const { W, M, woda, dW, dL } = f;
  // jaki brzeg najbliżej (dla wody: rodzaj lądu, który ją otacza; bierzemy z szumu + rodzaju sąsiada w promieniu ~6 px)
  const ladObok = (x: number, y: number): Rodzaj => {
    for (let r = 2; r <= 10; r += 2) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
      const q = rodzajW(x + dx, y + dy); if (q && q !== 'woda') return q;
    }
    return 'trawa';
  };
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const x = x0 + i, y = y0 + j, k = (j + M) * W + i + M, h = hash(x, y, 41), n1 = szum(x / 11, y / 11), n2 = szum(x / 4 + 9, y / 4 + 3);
    if (woda[k]) {
      const d = dW[k] + (n1 - 0.5) * 4;            // postrzępione granice pasów głębokości
      const brzeg = d < 8 ? rodzajBrzegu(ladObok(x, y), x, y) : 'plaza';
      let c: number;
      if (d < 1.4) c = bayer(x, y) < 0.7 ? WODA.piana : WODA.fala;
      else if (d < 5) c = pick(brzeg === 'szuwary' ? WODA.plycizna_mul : brzeg === 'plaza' ? WODA.plycizna_piasek : WODA.plytka, n2);
      else if (d < 7) c = bayer(x, y) < (d - 5) / 2 ? WODA.plytka[0] : pick(brzeg === 'szuwary' ? WODA.plycizna_mul : WODA.plycizna_piasek, n2); // przejście ditherem
      else if (d < 13) c = pick(WODA.plytka, n2 * 0.6 + n1 * 0.4);
      else if (d < 25) c = pick(WODA.srednia, n2 * 0.6 + n1 * 0.4);
      else c = pick(WODA.glebia, n2 * 0.5 + n1 * 0.5);
      // zmarszczki: krótkie jasne kreski w pasach średnim i płytkim
      if (d >= 7 && (y + Math.floor(n1 * 7)) % 6 === 0 && h < 0.45) c = d < 13 ? WODA.piana : d < 25 ? WODA.fala : WODA.plytka[0];
      if (d >= 9 && h > 0.9975) c = WODA.blysk;
      // uskok: woda tuż pod lądem po stronie północnej (widać ścianę brzegu)
      const kN = k - W, kN2 = k - 2 * W;
      if (!woda[kN] || !woda[kN2]) c = brzeg === 'nabrzeze' ? WODA.uskok : ciemniej(c);
      // lilie wodne przy szuwarach
      if (brzeg === 'szuwary' && d > 3 && d < 10 && szum(x / 7, y / 7) > 0.72) {
        const hl = hash(x >> 2, y >> 1, 43);
        if (hl < 0.18) c = (hash(x, y, 44) < 0.06) ? WODA.lilia[2] : WODA.lilia[(x + y) & 1];
      }
      // trzciny w płyciźnie
      if (brzeg === 'szuwary' && d > 1 && d < 4 && hash(x, y, 45) < 0.05) trzciny.push([x, y]);
      o.px[j * o.w + i] = c;
    } else {
      const dl = dL[k];
      if (dl >= 10) continue;
      const r = rodzajPostrzepiony(rodzajW, x, y);
      if (!r) continue;
      const b = rodzajBrzegu(r, x, y), d = dl + (n1 - 0.5) * 3;
      if (b === 'plaza') {
        if (d < 2) o.px[j * o.w + i] = pick(LAD.piasek_mokry, n2);
        else if (d < 6) o.px[j * o.w + i] = h < 0.01 ? LAD.kamien[2] : pick(LAD.piasek, n1 * 0.5 + n2 * 0.5 + Math.sin((x + y * 0.3) * 0.5 + n1 * 6) * 0.1);
        else if (d < 8 && bayer(x, y) < (8 - d) / 2) o.px[j * o.w + i] = pick(LAD.piasek, n2); // piasek wchodzi w trawę ditherem
      } else if (b === 'szuwary') {
        if (d < 2.5) o.px[j * o.w + i] = pick(LAD.mul, n2);
        else if (d < 8) o.px[j * o.w + i] = d < 5 || bayer(x, y) < (8 - d) / 3 ? pick(LAD.bujna, n2 * 0.7 + h * 0.3) : o.px[j * o.w + i];
        if (d < 6 && hash(x, y, 46) < 0.035) trzciny.push([x, y]);
      } else { // nabrzeże: krawężnik z kamieni
        if (dl < 1.5) o.px[j * o.w + i] = LAD.kamien[3];
        else if (dl < 4) { const kam = hash(Math.floor((x + (Math.floor(y / 3) & 1) * 2) / 4), Math.floor(y / 3), 47); o.px[j * o.w + i] = (x % 4 === 0 || y % 3 === 0) ? LAD.kamien[0] : mieszaj(LAD.kamien[1], LAD.kamien[2], kam); }
      }
    }
  }
  return trzciny;
}

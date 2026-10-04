// Generator drzew i krzaków: korona, pień (też z zaciosem), pieniek, sadzonka, warstwa owoców, klatki wiatru.
// Port `buildCrown` z makiety, przeskalowany do docelowej wielkości (duży dąb ok. 96×112 px).
import { Obraz, nowy, hex, rng, hash, ustaw, wez, OBRYS, obrysuj, mieszaj } from './wspolne';

export type Ksztalt = 'kepy' | 'pietra' | 'zwisajaca' | 'kolumna' | 'plaska';
export type Kora = 'braz' | 'szary' | 'brzoza' | 'rudy' | 'ciemny';

export interface Gatunek {
  plotno: [number, number];
  r: number;          // promień korony (px)
  fy: number;         // spłaszczenie/wydłużenie korony w pionie
  kepy: number;       // ile kęp na obwodzie
  ksztalt: Ksztalt;
  pienH: number;      // ile pnia widać pod koroną
  pienW: number;      // szerokość pnia
  kora: Kora | null;
  paleta: string[];   // 5 odcieni liści od najciemniejszego
  sztywnosc: number;  // mnożnik wychylenia na wietrze
  owoc?: string;      // kolor owoców (drzewa owocowe)
  kwiaty?: string;    // kolor kwiatków (krzak kwitnący)
  sciecie: boolean;   // czy gatunek bywa do ścięcia (dostaje pień z zaciosem)
}

const L = {
  dab: ['#1f3826', '#2d4f2f', '#3f6b38', '#5a8a44', '#7da556'],
  buk: ['#213a25', '#30562f', '#44743a', '#61924a', '#86b05c'],
  lipa: ['#28482b', '#3a6634', '#52853f', '#70a24f', '#98c066'],
  brzoza: ['#355c2c', '#4c843a', '#6ca64c', '#94c467', '#bcdc86'],
  olcha: ['#1d3424', '#2b4a2e', '#3c6436', '#567f44', '#739a52'],
  wierzba: ['#3a5a2e', '#557c3c', '#73a04c', '#98bf62', '#bcd884'],
  owocowe: ['#28492b', '#3b6936', '#548a42', '#72a652', '#97c46a'],
  sosna: ['#1a3433', '#264a43', '#376452', '#4f7e62', '#6c9a74'],
  swierk: ['#122826', '#1c3b35', '#294f43', '#3a6753', '#54826a'],
  jodla: ['#16302d', '#22443c', '#305a4b', '#43735d', '#5f8f74'],
  krzak: ['#25412a', '#365e34', '#4c7c3e', '#69994d', '#8db766'],
};

export const GATUNKI: Record<string, Gatunek> = {
  dab:     { plotno: [96, 112], r: 38, fy: 0.82, kepy: 12, ksztalt: 'kepy', pienH: 24, pienW: 9, kora: 'braz', paleta: L.dab, sztywnosc: 1.3, sciecie: true },
  buk:     { plotno: [96, 112], r: 36, fy: 0.95, kepy: 13, ksztalt: 'kepy', pienH: 22, pienW: 8, kora: 'szary', paleta: L.buk, sztywnosc: 1.2, sciecie: true },
  lipa:    { plotno: [88, 112], r: 33, fy: 1.15, kepy: 12, ksztalt: 'kepy', pienH: 20, pienW: 8, kora: 'braz', paleta: L.lipa, sztywnosc: 1.3, sciecie: false },
  brzoza:  { plotno: [64, 104], r: 23, fy: 1.35, kepy: 10, ksztalt: 'kepy', pienH: 26, pienW: 5, kora: 'brzoza', paleta: L.brzoza, sztywnosc: 2.1, sciecie: true },
  olcha:   { plotno: [72, 96],  r: 25, fy: 1.25, kepy: 10, ksztalt: 'kepy', pienH: 20, pienW: 6, kora: 'ciemny', paleta: L.olcha, sztywnosc: 1.4, sciecie: true },
  wierzba: { plotno: [96, 104], r: 34, fy: 0.75, kepy: 11, ksztalt: 'zwisajaca', pienH: 20, pienW: 9, kora: 'szary', paleta: L.wierzba, sztywnosc: 2.3, sciecie: false },
  jablon:  { plotno: [64, 72],  r: 25, fy: 0.8,  kepy: 10, ksztalt: 'kepy', pienH: 14, pienW: 6, kora: 'braz', paleta: L.owocowe, sztywnosc: 1.4, owoc: '#c8463a', sciecie: false },
  grusza:  { plotno: [64, 88],  r: 23, fy: 1.2,  kepy: 10, ksztalt: 'kepy', pienH: 16, pienW: 6, kora: 'ciemny', paleta: L.owocowe, sztywnosc: 1.4, owoc: '#c9b240', sciecie: false },
  sliwa:   { plotno: [56, 68],  r: 22, fy: 0.85, kepy: 9,  ksztalt: 'kepy', pienH: 13, pienW: 5, kora: 'ciemny', paleta: L.owocowe, sztywnosc: 1.5, owoc: '#5b3a7a', sciecie: false },
  sosna:   { plotno: [72, 120], r: 30, fy: 0.55, kepy: 10, ksztalt: 'plaska', pienH: 50, pienW: 6, kora: 'rudy', paleta: L.sosna, sztywnosc: 1.0, sciecie: true },
  swierk:  { plotno: [56, 112], r: 26, fy: 1, kepy: 7, ksztalt: 'pietra', pienH: 8, pienW: 4, kora: 'ciemny', paleta: L.swierk, sztywnosc: 0.8, sciecie: true },
  jodla:   { plotno: [60, 116], r: 28, fy: 1, kepy: 8, ksztalt: 'pietra', pienH: 9, pienW: 5, kora: 'szary', paleta: L.jodla, sztywnosc: 0.8, sciecie: true },
  kosodrzewina: { plotno: [64, 40], r: 28, fy: 0.42, kepy: 9, ksztalt: 'plaska', pienH: 0, pienW: 0, kora: null, paleta: L.swierk, sztywnosc: 0.9, sciecie: false },
  jalowiec:{ plotno: [28, 48],  r: 11, fy: 2.0, kepy: 0,  ksztalt: 'kolumna', pienH: 0, pienW: 0, kora: null, paleta: L.sosna, sztywnosc: 0.7, sciecie: false },
  krzak:   { plotno: [40, 32],  r: 16, fy: 0.75, kepy: 7, ksztalt: 'kepy', pienH: 0, pienW: 0, kora: null, paleta: L.krzak, sztywnosc: 1.7, sciecie: false },
  krzak_kwitnacy: { plotno: [40, 32], r: 15, fy: 0.75, kepy: 7, ksztalt: 'kepy', pienH: 0, pienW: 0, kora: null, paleta: L.krzak, sztywnosc: 1.7, kwiaty: '#e8a0c0', sciecie: false },
};

const KORA: Record<Kora, string[]> = {
  braz: ['#2e211b', '#46321f', '#5e4430', '#7a5a3e', '#97754f'],
  szary: ['#34302e', '#4c4744', '#67615b', '#847d74', '#a39b90'],
  brzoza: ['#3a3631', '#9a9488', '#c9c3b5', '#e2dccf', '#f3efe5'],
  rudy: ['#3d231b', '#5e3424', '#844a2f', '#a6633d', '#c4824f'],
  ciemny: ['#241a16', '#382a21', '#4c392c', '#634b39', '#7c614b'],
};
const DREWNO = ['#8f6638', '#c79a5c', '#e2c08a', '#f1dcae'];

export interface Drzewo {
  korona: Obraz; pien: Obraz; pienZacios: Obraz | null; pieniek: Obraz; sadzonka: Obraz; owoce: Obraz | null;
  /** punkt stania (środek podstawy pnia) w płótnie */ kotwica: [number, number];
  /** wiersz górny i dolny korony (do klatek wiatru) */ koronaGora: number; koronaDol: number;
}

interface Ksztaltka { x: number; y: number; rx: number; ry: number; tier?: number }

/** Korona: kępy (koła) albo piętra (świerk), cieniowane z lewej-góry, z ciemną linią pod kępami i obrysem. */
function korona(g: Gatunek, w: number, h: number, cx: number, cy: number, r: number, seed: number) {
  const R = rng(seed);
  const o = nowy(w, h);
  const own = new Int16Array(w * h).fill(-1);
  const val = new Float32Array(w * h);
  const P = g.paleta.map(hex);
  let ks: Ksztaltka[] = [];
  if (g.ksztalt === 'pietra') {
    const n = g.kepy, ry = Math.max(4, r * 0.32), krok = (r * 2.6) / n;
    for (let i = n - 1; i >= 0; i--) ks.push({ x: cx, y: cy + r * 0.9 - i * krok, rx: Math.max(3, r * (1 - i / (n + 0.4))), ry, tier: i });
  } else if (g.ksztalt === 'kolumna') {
    for (let i = 0; i < 5; i++) ks.push({ x: cx + (R() - 0.5) * 2, y: cy - r * 1.4 + i * r * 0.7, rx: r * (0.75 + 0.15 * Math.sin(i)), ry: r * 0.75 });
  } else {
    const fy = g.fy;
    ks.push({ x: cx, y: cy, rx: r * 0.62, ry: r * 0.62 * fy });
    for (let i = 0; i < g.kepy; i++) {
      const a = (i / g.kepy) * Math.PI * 2 + R() * 0.5, rr = r * (0.3 + R() * 0.16), d = r - rr;
      ks.push({ x: cx + Math.cos(a) * d * 0.96, y: cy + Math.sin(a) * d * fy, rx: rr, ry: rr * Math.max(0.75, Math.min(1.15, fy)) });
    }
    for (let i = 0; i < Math.round(g.kepy / 2); i++) {
      const a = R() * Math.PI * 2, rr = r * (0.26 + R() * 0.12), d = r * 0.4 * R();
      ks.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * fy - r * 0.15, rx: rr, ry: rr * Math.min(1.1, fy) });
    }
    ks.sort((a, b) => a.y - b.y);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5, py = y + 0.5, k = y * w + x;
    for (let s = 0; s < ks.length; s++) {
      const c = ks[s];
      const nx = (px - c.x) / c.rx, ny = (py - c.y) / c.ry;
      let inside = nx * nx + ny * ny < 1;
      if (c.tier !== undefined) inside = nx * nx + ny * ny < 1 + (hash(x >> 1, c.tier, seed) - 0.5) * 0.35 && ny > -1.5 && !(ny > 0.3 && (x + c.tier) % 4 === 0 && hash(x, c.tier, seed + 9) < 0.5);
      if (!inside) continue;
      own[k] = s;
      let v = -(nx * 0.6 + ny * 0.8) + (hash(x, y, seed) - 0.5) * 0.3;
      if (c.tier === undefined) v -= ((py - cy) / r) * 0.32 + 0.12;
      val[k] = v;
    }
  }
  // wierzba: zwisające pędy
  if (g.ksztalt === 'zwisajaca') {
    for (let x = Math.floor(cx - r * 0.95); x < cx + r * 0.95; x += 2) {
      let ystart = -1;
      for (let y = h - 1; y >= 0; y--) if (own[y * w + x] >= 0) { ystart = y; break; }
      if (ystart < 0) continue;
      const len = 6 + Math.floor(hash(x, 3, seed) * 18);
      for (let j = 1; j <= len; j++) {
        const yy = ystart + j, xx = x + Math.round(Math.sin(j * 0.35 + x) * 0.6);
        if (yy >= h || xx < 0 || xx >= w) break;
        own[yy * w + xx] = ks.length; val[yy * w + xx] = (j % 3 === 0 ? 0.35 : 0.05) - (j / len) * 0.4 - (xx > cx ? 0.25 : 0);
      }
    }
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : own[y * w + x]);
  let gora = h, dol = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, s = own[k]; if (s < 0) continue;
    gora = Math.min(gora, y); dol = Math.max(dol, y);
    const v = val[k];
    let t = v > 0.62 ? 4 : v > 0.28 ? 3 : v > -0.08 ? 2 : v > -0.48 ? 1 : 0;
    // faktura liści: skupiska 2×2 jaśniejsze/ciemniejsze
    const lh = hash(x >> 1, y >> 1, seed + 3);
    if (t < 4 && v > -0.3 && lh < 0.16) t++;
    else if (t > 0 && lh > 0.9) t--;
    const below = at(x, y + 1);
    if (below > s && below < ks.length && v < 0.25 && hash(x >> 2, y, seed + 4) < 0.7) t = Math.max(0, t - 2); // cień nad kępą z przodu (przerywany, nie ciągła kreska)
    o.px[k] = P[t];
  }
  if (g.kwiaty) {
    const K = hex(g.kwiaty);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (own[y * w + x] >= 0 && hash(x, y, seed + 21) < 0.05 && val[y * w + x] > -0.3) o.px[y * w + x] = K;
  }
  obrysuj(o, OBRYS, () => P[0]);
  return { o, own, val, gora, dol };
}

function pien(g: Gatunek, w: number, h: number, cx: number, gora: number, seed: number, zacios: boolean) {
  const o = nowy(w, h);
  if (!g.kora) return o;
  const K = KORA[g.kora].map(hex), tw = g.pienW, x0 = Math.round(cx - tw / 2), dol = h - 1;
  for (let y = gora; y <= dol; y++) {
    const korzen = y > dol - 3 ? (y - (dol - 3)) : 0; // rozszerzenie u podstawy
    for (let i = -korzen; i < tw + korzen; i++) {
      const x = x0 + i, f = (i + korzen) / Math.max(1, tw + 2 * korzen - 1);
      let t = f < 0.25 ? 3 : f < 0.6 ? 2 : f < 0.85 ? 1 : 0;
      if (g.kora === 'brzoza') { t = f < 0.3 ? 4 : f < 0.8 ? 3 : 2; if (hash(x, y >> 1, seed) < 0.18) t = 0; }
      else if (hash(x, y >> 2, seed) < 0.22) t = Math.max(0, t - 1);
      if (g.kora === 'rudy' && y < gora + (dol - gora) * 0.7 && t > 1) t = Math.min(4, t + 1);
      ustaw(o, x, y, K[t]);
    }
  }
  if (g.kora === 'rudy') { // kilka sęków/gałązek sosny
    for (let b = 0; b < 3; b++) {
      const y = gora + 6 + Math.floor(hash(b, 1, seed) * (dol - gora) * 0.5), dir = b % 2 ? 1 : -1;
      for (let j = 1; j <= 3; j++) ustaw(o, x0 + (dir > 0 ? tw - 1 + j : -j), y - j, K[1]);
    }
  }
  if (zacios) {
    const W = DREWNO.map(hex), y0 = dol - 11;
    for (let j = 0; j < 6; j++) {
      const szer = Math.max(1, Math.round(Math.min(j + 1, 6 - j) * 0.8 * Math.min(1, tw / 6)) + 1);
      for (let i = 0; i < szer; i++) ustaw(o, x0 + i, y0 + j, j === 0 ? W[3] : j === 5 ? W[0] : i === szer - 1 ? W[1] : W[2]);
    }
  }
  obrysuj(o, OBRYS, (c) => c);
  return o;
}

function pieniek(g: Gatunek, w: number, h: number, cx: number, seed: number) {
  const o = nowy(w, h);
  if (!g.kora) return o;
  const K = KORA[g.kora].map(hex), W = DREWNO.map(hex), tw = g.pienW + 2, x0 = Math.round(cx - tw / 2), dol = h - 1;
  for (let y = dol - 4; y <= dol; y++) for (let i = 0; i < tw; i++) ustaw(o, x0 + i, y, K[i === 0 ? 3 : i === tw - 1 ? 0 : 2]);
  for (let i = 0; i < tw; i++) for (let j = 0; j < 3; j++) {
    const dx = (i - (tw - 1) / 2) / (tw / 2), dy = (j - 1) / 1.6, d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 1.05) ustaw(o, x0 + i, dol - 7 + j, d < 0.35 ? W[0] : d < 0.7 ? W[2] : W[1]);
  }
  obrysuj(o, OBRYS, (c) => c);
  return o;
}

/** Całe drzewo danego gatunku i wariantu (ziarno = wariant albo hash pozycji). */
/** Decyzja właściciela 4.10: drzewa 0,6 rozmiarów bazowych z GATUNKI (proporcje względem budynków) i gęściej. */
export const SKALA_DRZEW = 0.6;

export function drzewo(nazwa: string, seed: number, skala = SKALA_DRZEW): Drzewo {
  const g0 = GATUNKI[nazwa];
  const g: Gatunek = skala === 1 ? g0 : { ...g0, plotno: [Math.round(g0.plotno[0] * skala), Math.round(g0.plotno[1] * skala)], r: g0.r * skala, pienH: Math.round(g0.pienH * skala), pienW: Math.max(g0.pienW ? 2 : 0, Math.round(g0.pienW * skala)), kepy: Math.max(g0.ksztalt === 'pietra' ? 4 : 6, Math.round(g0.kepy * (0.5 + skala / 2))) };
  const [w, h] = g.plotno, R = rng(seed);
  const r = g.r * (0.92 + R() * 0.12);
  const cx = w / 2;
  const kepy = g.ksztalt === 'pietra';
  const cy = kepy ? h - g.pienH - r * 1.25 : g.ksztalt === 'kolumna' ? h - r * 2.3 : h - g.pienH - r * g.fy * 0.85;
  const k = korona(g, w, h, cx, cy, r, seed);
  const gornyPnia = Math.round(kepy ? h - g.pienH - 6 : cy);
  const owoce = g.owoc ? warstwaOwocow(g, k.o, w, h, seed) : null;
  const sg: Gatunek = { ...g, r: g.r * 0.32, pienH: 6, pienW: Math.max(2, Math.round(g.pienW / 3)) };
  const sad = nowy(w, h);
  if (g.kora) {
    const ss = korona(sg, w, h, cx, h - 6 - sg.r * Math.max(0.8, g.fy) * 0.85, sg.r, seed + 5);
    const sp = pien(sg, w, h, cx, Math.round(h - 6 - sg.r * 0.4), seed, false);
    for (let i = 0; i < sad.px.length; i++) sad.px[i] = ss.o.px[i] || sp.px[i];
  }
  return {
    korona: k.o,
    pien: pien(g, w, h, cx, gornyPnia, seed, false),
    pienZacios: g.sciecie ? pien(g, w, h, cx, gornyPnia, seed, true) : null,
    pieniek: pieniek(g, w, h, cx, seed),
    sadzonka: sad,
    owoce,
    kotwica: [Math.floor(cx), h - 1],
    koronaGora: k.gora, koronaDol: k.dol,
  };
}

function warstwaOwocow(g: Gatunek, kor: Obraz, w: number, h: number, seed: number) {
  const o = nowy(w, h), F = hex(g.owoc!), Fj = mieszaj(F, hex('#ffffff'), 0.45), Fc = mieszaj(F, hex('#1e1a24'), 0.45);
  let n = 0;
  for (let y = 2; y < h - 2 && n < 40; y++) for (let x = 2; x < w - 2; x++) {
    if (!(wez(kor, x, y) >>> 24) || !(wez(kor, x + 1, y + 1) >>> 24) || hash(x, y, seed + 11) > 0.018) continue;
    ustaw(o, x, y, Fj); ustaw(o, x + 1, y, F); ustaw(o, x, y + 1, F); ustaw(o, x + 1, y + 1, Fc); n++;
  }
  return o;
}

/** 5 klatek wiatru (−2…+2): wiersze korony przesunięte o całe piksele, góra najbardziej. Płótno szersze o 2×margines. */
export function klatkiWiatru(kor: Obraz, gora: number, dol: number, sztywnosc: number, margines = 6): Obraz[] {
  const out: Obraz[] = [];
  for (const k of [-2, -1, 0, 1, 2]) {
    const o = nowy(kor.w + 2 * margines, kor.h);
    for (let y = 0; y < kor.h; y++) {
      const rf = Math.max(0, Math.min(1, (dol - y) / Math.max(1, dol - gora)));
      const dx = Math.round(k * sztywnosc * (0.3 + 0.95 * rf));
      for (let x = 0; x < kor.w; x++) { const c = kor.px[y * kor.w + x]; if (c >>> 24) o.px[y * o.w + x + margines + dx] = c; }
    }
    out.push(o);
  }
  return out;
}

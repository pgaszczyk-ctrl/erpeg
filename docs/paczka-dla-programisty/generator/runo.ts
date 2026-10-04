// Runo: kępki trawy, wysoka trawa, trzciny, paprocie, kwiaty, kamienie, grzyby.
// Rysowane od podstawy (x, y = punkt, z którego roślina wyrasta). `wiatr` = przesunięcie wierzchołka w px
// (program liczy je z pogody i odległości od postaci; 0 = bez ruchu). Port `genTufts` z makiety.
import { Obraz, hex, hash, szum, ustaw, mieszaj, OBRYS } from './wspolne';

export type Runo = 'trawa_niska' | 'trawa_wysoka' | 'trzcina' | 'paproc' | 'wrzos' | 'kwiaty' | 'kamyk' | 'glaz' | 'grzyb';

const C = {
  trawa: ['#3f6a2e', '#558039', '#70994a', '#8fb35c'].map(hex),
  wysoka: ['#5c8a3c', '#6a9643', '#80a952', '#a4c264', '#c4bb6c'].map(hex),
  trzcina: ['#4a6530', '#5c7a38', '#7a9a48', '#5a3a24', '#7a5232'].map(hex),
  paproc: ['#2f5a2a', '#3f6a32', '#5a8a40', '#77a552'].map(hex),
  wrzos: ['#5a4a6a', '#8a5a9a', '#b07ac0'].map(hex),
  kwiaty: ['#e05050', '#e8c84a', '#7a9ae8', '#f0f0f0', '#d97aa0'].map(hex),
  kamien: ['#4e4a50', '#6c676c', '#8a8488', '#a8a2a2'].map(hex),
  grzyb: ['#e9dcc0', '#7a4a2a', '#c8402a', '#f2f2f2'].map(hex),
};

function zdzblo(o: Obraz, bx: number, by: number, h: number, lean: number, wiatr: number, kol: number[], tip: number) {
  for (let j = 0; j < h; j++) {
    const t = j / Math.max(1, h - 1);
    const x = bx + Math.round(lean * t + wiatr * t * t);
    ustaw(o, x, by - j, j === h - 1 ? tip : j === 0 ? kol[0] : kol[Math.min(kol.length - 1, 1 + Math.floor(t * (kol.length - 1)))]);
  }
}

export function runo(o: Obraz, x: number, y: number, rodzaj: Runo, seed: number, wiatr = 0) {
  const r = (k: number) => hash(seed, k, 77);
  switch (rodzaj) {
    case 'trawa_niska': {
      const n = 3 + Math.floor(r(0) * 3);
      for (let b = 0; b < n; b++) zdzblo(o, x - 2 + b + Math.floor(r(b + 1) * 2), y, 3 + Math.floor(r(b + 5) * 4), (r(b + 9) - 0.5) * 3, wiatr * 0.6, C.trawa.slice(0, 3), C.trawa[3]);
      break;
    }
    case 'trawa_wysoka': {
      const n = 4 + Math.floor(r(0) * 4);
      for (let b = 0; b < n; b++) zdzblo(o, x - 3 + b + Math.floor(r(b + 1) * 2), y, 8 + Math.floor(r(b + 5) * 8), (r(b + 9) - 0.5) * 4, wiatr, C.wysoka.slice(0, 3), r(b + 13) < 0.35 ? C.wysoka[4] : C.wysoka[3]);
      break;
    }
    case 'trzcina': {
      const n = 3 + Math.floor(r(0) * 3);
      for (let b = 0; b < n; b++) {
        const h = 14 + Math.floor(r(b + 5) * 9), lean = (r(b + 9) - 0.5) * 3, bx = x - 2 + b * 2;
        zdzblo(o, bx, y, h, lean, wiatr * 1.2, C.trzcina.slice(0, 3), C.trzcina[2]);
        if (r(b + 20) < 0.6) { const tx = bx + Math.round(lean + wiatr * 1.2); for (let k = 0; k < 4; k++) ustaw(o, tx, y - h + 1 + k, k === 0 ? C.trzcina[4] : C.trzcina[3]); }
      }
      break;
    }
    case 'paproc': {
      for (let b = -3; b <= 3; b++) zdzblo(o, x + b, y, 4 + (3 - Math.abs(b)), b * 1.4, wiatr * 0.4, C.paproc.slice(0, 3), C.paproc[3]);
      break;
    }
    case 'wrzos': {
      for (let b = -2; b <= 2; b++) zdzblo(o, x + b, y, 3 + (b & 1), b * 0.6, wiatr * 0.3, [C.paproc[0], C.paproc[1]], C.wrzos[1 + (b & 1)]);
      break;
    }
    case 'kwiaty': {
      const k = C.kwiaty[Math.floor(r(0) * C.kwiaty.length)];
      for (let b = 0; b < 3; b++) {
        const bx = x - 2 + b * 2, h = 3 + Math.floor(r(b + 1) * 3);
        zdzblo(o, bx, y, h, (r(b + 4) - 0.5) * 2, wiatr * 0.6, [C.trawa[0], C.trawa[1]], k);
        ustaw(o, bx + Math.round((r(b + 4) - 0.5) * 2 + wiatr * 0.6) + 1, y - h + 1, mieszaj(k, hex('#ffffff'), 0.3));
      }
      break;
    }
    case 'kamyk': case 'glaz': {
      const w = rodzaj === 'kamyk' ? 2 + Math.floor(r(0) * 3) : 8 + Math.floor(r(0) * 8), h = Math.max(2, Math.round(w * 0.65));
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const dx = (i + 0.5 - w / 2) / (w / 2), dy = (j + 0.5 - h / 2) / (h / 2);
        if (dx * dx + dy * dy > 1.05) continue;
        const v = -(dx * 0.6 + dy * 0.8) + (hash(i, j, seed) - 0.5) * 0.4;
        const edge = dx * dx + dy * dy > 0.7 && (dy > 0 || dx > 0);
        ustaw(o, x - (w >> 1) + i, y - h + 1 + j, edge && rodzaj === 'glaz' ? OBRYS : C.kamien[v > 0.4 ? 3 : v > 0 ? 2 : v > -0.4 ? 1 : 0]);
      }
      break;
    }
    case 'grzyb': {
      const czerw = r(0) < 0.3;
      ustaw(o, x, y, C.grzyb[0]); ustaw(o, x, y - 1, C.grzyb[0]);
      for (let i = -2; i <= 2; i++) ustaw(o, x + i, y - 2, czerw ? C.grzyb[2] : C.grzyb[1]);
      for (let i = -1; i <= 1; i++) ustaw(o, x + i, y - 3, czerw ? C.grzyb[2] : C.grzyb[1]);
      if (czerw) { ustaw(o, x - 1, y - 2, C.grzyb[3]); ustaw(o, x + 1, y - 3, C.grzyb[3]); }
      break;
    }
  }
}

export interface Kepka { x: number; y: number; rodzaj: Runo; seed: number }

/**
 * Rozsiewa runo w prostokącie świata – deterministycznie (ten sam wynik na każdym telefonie i w każdym kawałku).
 * Gęstości jak w makiecie: trawa „żyje” – gęste niskie kępki, plamy wysokiej trawy (szum), kwiatki, kamyki;
 * łąka gęsta i wysoka; las: paprocie i grzyby. Trzciny przy wodzie dodaje malujWode().
 * Zwraca listę od góry do dołu (gra rysuje je jako małe sprite'y z wiatrem albo maluje w kawałek).
 */
export function posiejRuno(x0: number, y0: number, w: number, h: number, rodzajW: (x: number, y: number) => string | null): Kepka[] {
  const out: Kepka[] = [];
  const krok = 3, sx = Math.ceil(x0 / krok) * krok, sy = Math.ceil(y0 / krok) * krok;
  for (let y = sy; y < y0 + h; y += krok) for (let x = sx; x < x0 + w; x += krok) {
    const k = rodzajW(x, y); if (!k) continue;
    const hh = hash(x, y, 9), seed = (x * 7919 + y * 104729) | 0;
    const wys = szum(x / 60 + 2, y / 60 + 7); // plamy wysokiej trawy
    let r: Runo | null = null;
    if (k === 'trawa' || k === 'park') {
      if (wys > 0.66 && k === 'trawa') r = hh < 0.16 ? 'trawa_wysoka' : hh < 0.2 ? 'trawa_niska' : null;
      else r = hh < 0.075 ? 'trawa_niska' : hh < 0.079 ? 'kwiaty' : hh < 0.081 ? 'kamyk' : null;
    } else if (k === 'laka') r = hh < 0.2 ? 'trawa_wysoka' : hh < 0.27 ? 'trawa_niska' : hh < 0.295 ? 'kwiaty' : null;
    else if (k === 'zarosla' || k === 'mokradlo') r = hh < 0.14 ? (k === 'mokradlo' && hh < 0.06 ? 'trzcina' : 'trawa_wysoka') : null;
    else if (k === 'las_lisciasty') r = hh < 0.02 ? 'paproc' : hh < 0.024 ? 'grzyb' : hh < 0.03 ? 'trawa_niska' : null;
    else if (k === 'las_iglasty') r = hh < 0.012 ? 'paproc' : hh < 0.018 ? 'wrzos' : hh < 0.021 ? 'grzyb' : null;
    else if (k === 'cmentarz') r = hh < 0.04 ? 'trawa_niska' : null;
    if (r) out.push({ x: x + Math.floor(hash(x, y, 10) * krok), y, rodzaj: r, seed });
  }
  return out;
}


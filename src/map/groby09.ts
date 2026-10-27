// Groby na cmentarzach (właściciel, 27.10.2026: „przy Unickiej jest duży cmentarz, a narysowałeś park” – generator
// malował cmentarz fakturą parku). Rzędy kwater w siatce świata (ciągłe między kawałkami), alejka co kilka kolumn
// i szerszy przejazd co kilka rzędów; w kwaterze płyta z nagrobkiem albo krzyżem, czasem znicz/kwiaty, czasem stary
// ziemny grób z drewnianym krzyżem. Tylko tam, gdzie cała kwatera leży na cmentarzu. Bez DOM-u (Web Worker).
import { hash, hex, mieszaj, type Obraz, type Rodzaj } from '../gen';

/** Kwatera (px generatora: 2 na px mapy): szerokość × wysokość z odstępem; co `alejkaCo` kolumna i co `przejazdCo` rząd puste. */
const GROB = { kx: 12, ky: 20, alejkaCo: 5, przejazdCo: 4, zajete: 0.86 };

const KAMIENIE = ['#8c8f96', '#62666e', '#34353c', '#b3a88f', '#a7aab0', '#7d7468'].map(hex);
const JASNY = ['#b4b7bd', '#878b93', '#55575f', '#d3c8ae', '#c9ccd1', '#9e9586'].map(hex);
const KRAWEDZ = hex('#26242b');
const CIEN = hex('#1e1a24');
const ZIEMIA = hex('#6b4a2e'), ZIEMIA_J = hex('#83603c');
const DREWNO = hex('#5e3a20');
const ZNICZ = hex('#b8322a'), PLOMYK = hex('#ffd36a');
const KWIATY = ['#e05a4e', '#f1c40f', '#f2efe6', '#a66bc4', '#ff9a3c'].map(hex);

export function malujGroby(o: Obraz, X0: number, Y0: number, N: number, rodzajW: (x: number, y: number) => Rodzaj | null) {
  const { kx, ky } = GROB;
  const set = (x: number, y: number, c: number) => {
    const i = x - X0, j = y - Y0;
    if (i >= 0 && j >= 0 && i < N && j < N) o.px[j * N + i] = c;
  };
  const cien = (x: number, y: number, t: number) => {
    const i = x - X0, j = y - Y0;
    if (i >= 0 && j >= 0 && i < N && j < N) o.px[j * N + i] = mieszaj(o.px[j * N + i], CIEN, t);
  };
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) set(x + a, y + b, c);
  };
  // Kwatery dotykające kawałka (z zapasem na cień).
  for (let gy = Math.floor((Y0 - ky) / ky); gy <= Math.floor((Y0 + N) / ky); gy++) {
    if (((gy % GROB.przejazdCo) + GROB.przejazdCo) % GROB.przejazdCo === 0) continue;
    for (let gx = Math.floor((X0 - kx) / kx); gx <= Math.floor((X0 + N) / kx); gx++) {
      if (((gx % GROB.alejkaCo) + GROB.alejkaCo) % GROB.alejkaCo === 0) continue;
      if (hash(gx, gy, 4401) > GROB.zajete) continue;
      const x = gx * kx + 2, y = gy * ky + 3;
      const w = 8, h = 14;
      // Cała kwatera (z obrzeżem) na cmentarzu – nie na ścieżce, drodze ani w budynku.
      if (![[-1, -1], [w, -1], [-1, h], [w, h], [w >> 1, h >> 1]].every(([a, b]) => rodzajW(x + a, y + b) === 'cmentarz')) continue;
      const r = hash(gx, gy, 4402);
      if (r < 0.14) {
        // Stary ziemny grób z drewnianym krzyżem.
        for (let b = 5; b < h; b++) for (let a = 0; a < w; a++) {
          const brzeg = a === 0 || a === w - 1 || b === 5 || b === h - 1;
          if (brzeg && (a === 0 || a === w - 1) && (b === 5 || b === h - 1)) continue;
          set(x + a, y + b, brzeg ? KRAWEDZ : b < 8 ? ZIEMIA_J : ZIEMIA);
        }
        for (let b = 0; b < 7; b++) set(x + 3, y + b, DREWNO), set(x + 4, y + b, DREWNO);
        rect(x + 1, y + 2, 6, 1, DREWNO);
        for (let b = 1; b < 8; b++) cien(x + 5, y + b, 0.3);
        continue;
      }
      const k = Math.floor(hash(gx, gy, 4403) * KAMIENIE.length);
      const kam = KAMIENIE[k], jas = JASNY[k];
      // Cień płyty i nagrobka (światło z północnego zachodu).
      for (let b = 1; b <= h; b++) cien(x + w, y + b, 0.35);
      for (let a = 1; a <= w; a++) cien(x + a, y + h, 0.35);
      // Płyta z obwódką i jaśniejszą krawędzią od góry.
      for (let b = 4; b < h; b++) for (let a = 0; a < w; a++) {
        const brzeg = a === 0 || a === w - 1 || b === 4 || b === h - 1;
        set(x + a, y + b, brzeg ? KRAWEDZ : b === 5 ? jas : kam);
      }
      if (r < 0.42) {
        // Krzyż w głowie grobu.
        for (let b = 0; b < 6; b++) { set(x + 3, y + b, jas); set(x + 4, y + b, kam); }
        rect(x + 1, y + 1, 6, 1, jas);
        rect(x + 1, y + 2, 6, 1, kam);
        set(x + 2, y + 6, KRAWEDZ); set(x + 5, y + 6, KRAWEDZ);
      } else {
        // Nagrobek: zaokrąglona tablica.
        for (let b = 0; b < 5; b++) for (let a = 0; a < w; a++) {
          if (b === 0 && (a < 2 || a > w - 3)) continue;
          const brzeg = a === 0 || a === w - 1 || b === 0 || (b === 1 && (a === 1 || a === w - 2));
          set(x + a, y + b, brzeg ? KRAWEDZ : b === 1 ? jas : kam);
        }
        // Napis (dwie kreski).
        rect(x + 2, y + 2, 4, 1, mieszaj(kam, KRAWEDZ, 0.45));
      }
      // Znicz albo kwiaty.
      const s = hash(gx, gy, 4404);
      if (s < 0.38) {
        set(x + 3 + (s < 0.2 ? 0 : 1), y + 8, ZNICZ);
        set(x + 3 + (s < 0.2 ? 0 : 1), y + 9, ZNICZ);
        set(x + 3 + (s < 0.2 ? 0 : 1), y + 7, PLOMYK);
      } else if (s < 0.68) {
        for (let q = 0; q < 3; q++) {
          const a = 1 + Math.floor(hash(gx, gy, 4410 + q) * (w - 2)), b = 7 + Math.floor(hash(gx, gy, 4420 + q) * 5);
          set(x + a, y + b, KWIATY[Math.floor(hash(gx, gy, 4430 + q) * KWIATY.length)]);
        }
      }
    }
  }
}

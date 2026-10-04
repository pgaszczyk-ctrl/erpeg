import { malujPodloze, malujWode, posiejRuno, runo, nowy, hash, type Rodzaj } from '../gen';

// Ziemia kawałka z generatora (overhaul 09) – bez DOM-u, więc liczy się też w Web Workerze (ziemia09.worker.ts).

/** Piksele generatora na piksel mapy (art: 1 px = 0,5 px mapy). */
export const GEN_DOTS = 2;
/** Margines mapy rodzajów dookoła kawałka (woda czyta rodzaj do 32 px od brzegu, granice drżą o ±2). */
export const MARGINES = 40;

export const RODZAJE: Rodzaj[] = [
  'trawa', 'laka', 'park', 'las_lisciasty', 'las_iglasty', 'bruk', 'chodnik', 'plac', 'droga', 'piasek', 'woda',
  'pole_orka', 'pole_zboze', 'zarosla', 'parking', 'cmentarz', 'mokradlo', 'skala', 'tory',
];

/**
 * `ids`: mapa rodzajów S×S (indeksy RODZAJE), lewy-górny róg = (X0 − MARGINES, Y0 − MARGINES) w px generatora.
 * Zwraca piksele N×N (RGBA w kolejności bajtów ImageData).
 */
export function ziemia(ids: Uint8Array, S: number, X0: number, Y0: number, N: number): Uint32Array {
  const rodzajW = (x: number, y: number): Rodzaj | null => {
    const i = x - X0 + MARGINES, j = y - Y0 + MARGINES;
    if (i < 0 || j < 0 || i >= S || j >= S) return null;
    return RODZAJE[ids[j * S + i]];
  };
  const obraz = nowy(N, N);
  malujPodloze(obraz, X0, Y0, rodzajW);
  const trzciny = malujWode(obraz, X0, Y0, rodzajW);
  for (const k of posiejRuno(X0, Y0, N, N, rodzajW)) runo(obraz, k.x - X0, k.y - Y0, k.rodzaj, k.seed, 0);
  for (const [x, y] of trzciny) runo(obraz, x - X0, y - Y0, 'trzcina', (hash(x, y, 77) * 1e6) | 0, 0);
  return obraz.px;
}

import { malujPodloze, malujWode, posiejRuno, runo, nowy, hash, hex, ciemniej, jasniej, budynek, cienBudynku, MATERIALY, OBRYS, type Rodzaj, type Obraz } from '../gen';

// Ziemia i budynki kawałka z generatora (overhaul 09) – bez DOM-u, więc liczy się też w Web Workerze (ziemia09.worker.ts).

/** Piksele generatora na piksel mapy (art: 1 px = 0,5 px mapy). */
export const GEN_DOTS = 2;
/** Margines mapy rodzajów dookoła kawałka (woda czyta rodzaj do 32 px od brzegu, granice drżą o ±2). */
export const MARGINES = 40;

export const RODZAJE: Rodzaj[] = [
  'trawa', 'laka', 'park', 'las_lisciasty', 'las_iglasty', 'bruk', 'chodnik', 'plac', 'droga', 'piasek', 'woda',
  'pole_orka', 'pole_zboze', 'zarosla', 'parking', 'cmentarz', 'mokradlo', 'skala', 'tory',
];

/** Budynek do namalowania (współrzędne w px generatora = px mapy × GEN_DOTS). */
export interface Budynek09 {
  r: number[];
  dziury: number[][];
  h: number;
  seed: number;
  drzwi?: [number, number];
  /** Kolory miejsc wyróżnionych w grze (sklep, szkoła, misja): dach i ściana. */
  hl?: [string, string];
}

export interface Zlecenie { ids: Uint8Array; S: number; X0: number; Y0: number; N: number; budynki: Budynek09[]; noc: boolean }

const DACHY: [string, number][] = [['dachowka_czerwona', 34], ['dachowka_brazowa', 24], ['lupek', 16], ['gont', 9], ['blacha_zielona', 7], ['papa', 10]];
const SCIANY: [string, number][] = [['tynk_kremowy', 30], ['tynk_zolty', 18], ['tynk_szary', 15], ['cegla', 27], ['kamien', 6], ['drewno', 4]];
const losuj = (lista: [string, number][], u: number) => {
  const suma = lista.reduce((s, [, w]) => s + w, 0);
  let t = u * suma;
  for (const [k, w] of lista) if ((t -= w) < 0) return k;
  return lista[0][0];
};

/** Materiał w kolorze wyróżnienia (pięć tonów od ciemnego do jasnego), zapamiętany pod kluczem koloru. */
function materialZKoloru(kolor: string, wzor: 'dachowka' | 'gladki') {
  const klucz = `hl_${wzor}_${kolor}`;
  if (!MATERIALY[klucz]) {
    const c = hex(kolor);
    MATERIALY[klucz] = { tony: [ciemniej(ciemniej(c)), ciemniej(c), c, jasniej(c), jasniej(jasniej(c))], krawedz: jasniej(jasniej(c)), wzor };
  }
  return klucz;
}

function wPierscieniu(r: number[], x: number, y: number) {
  let w = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
    if ((r[i + 1] > y) !== (r[j + 1] > y) && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) w = !w;
  return w;
}

/** Gotowe obrazy budynków (duży budynek leży w kilku kawałkach mapy; liczony raz). Najdawniej użyte wypadają. */
const pamiec = new Map<string, ReturnType<typeof budynek>>();
const PAMIEC_PX = 3_000_000; // ok. 12 MB na każdy Web Worker
let pamiecPx = 0;
function zapamietaj(klucz: string, b: ReturnType<typeof budynek>) {
  const px = b.obraz.w * b.obraz.h;
  if (px > PAMIEC_PX / 2) return;
  pamiec.set(klucz, b);
  pamiecPx += px;
  for (const [k, v] of pamiec) {
    if (pamiecPx <= PAMIEC_PX) break;
    pamiec.delete(k);
    pamiecPx -= v.obraz.w * v.obraz.h;
  }
}

/** Budynki: cienie na ziemi, potem bryły od północy na południe (dach kopertowy z kalenicami, ściany, okna). */
function malujBudynki(o: Obraz, X0: number, Y0: number, budynki: Budynek09[], noc: boolean) {
  const cien = new Uint8Array(o.w * o.h);
  for (const b of budynki) cienBudynku(b.r, b.h, cien, o.w, o.h, X0, Y0);
  for (let k = 0; k < cien.length; k++) if (cien[k] && o.px[k]) o.px[k] = ciemniej(o.px[k]);
  for (const b of budynki) {
    const u = hash(b.seed, 3, 91), v = hash(b.seed, 5, 17);
    const dach = b.hl ? materialZKoloru(b.hl[0], 'dachowka') : losuj(DACHY, u);
    const sciana = b.hl ? materialZKoloru(b.hl[1], 'gladki') : losuj(SCIANY, v);
    const klucz = `${b.seed}|${b.h}|${dach}|${sciana}|${noc ? 1 : 0}|${b.drzwi ?? ''}|${b.r.length}|${b.r[0]},${b.r[1]}`;
    let gotowy = pamiec.get(klucz);
    if (gotowy) { pamiec.delete(klucz); pamiec.set(klucz, gotowy); }
    else {
      gotowy = budynek(b.r, { wysokosc: b.h, dach, sciana, seed: b.seed, noc, drzwi: b.drzwi, komin: hash(b.seed, 7, 3) < 0.4, rura: hash(b.seed, 9, 5) < 0.25 });
      zapamietaj(klucz, gotowy);
    }
    const { obraz, x0, y0 } = gotowy;
    for (let j = 0; j < obraz.h; j++) {
      const yy = y0 + j - Y0;
      if (yy < 0 || yy >= o.h) continue;
      for (let i = 0; i < obraz.w; i++) {
        const c = obraz.px[j * obraz.w + i];
        if (!c) continue;
        const xx = x0 + i - X0;
        if (xx < 0 || xx >= o.w) continue;
        // Podwórka (dziury w obrysie) zostają ziemią; obrys dziury ciemny.
        if (b.dziury.length && b.dziury.some((d) => wPierscieniu(d, x0 + i + 0.5, y0 + j + 0.5))) continue;
        o.px[yy * o.w + xx] = c;
      }
    }
    for (const d of b.dziury) obrysujDziure(o, X0, Y0, d);
  }
}

/** Ciemna linia wzdłuż brzegu podwórka. */
function obrysujDziure(o: Obraz, X0: number, Y0: number, r: number[]) {
  for (let i = 0; i < r.length; i += 2) {
    const ax = r[i], ay = r[i + 1], bx = r[(i + 2) % r.length], by = r[(i + 3) % r.length];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + ((bx - ax) * k) / n) - X0, y = Math.round(ay + ((by - ay) * k) / n) - Y0;
      if (x >= 0 && y >= 0 && x < o.w && y < o.h) o.px[y * o.w + x] = OBRYS;
    }
  }
}

/**
 * `ids`: mapa rodzajów S×S (indeksy RODZAJE), lewy-górny róg = (X0 − MARGINES, Y0 − MARGINES) w px generatora.
 * Zwraca piksele N×N (RGBA w kolejności bajtów ImageData).
 */
export function ziemia(z: Zlecenie): Uint32Array {
  const { ids, S, X0, Y0, N } = z;
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
  if (z.budynki.length) malujBudynki(obraz, X0, Y0, z.budynki, z.noc);
  return obraz.px;
}

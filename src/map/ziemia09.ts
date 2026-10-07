import { rozstawDrzewa, drzewoZ, idDrzewa, type Drzewo09 } from './drzewa09';
import { tor, kolorPodloza } from '../gen';
import { wyposazPeron, type Peron09 } from './dworzec09';
import { stragany } from './targ09';
import { pasyPola, uprawaPasa, malujPas, type Sprite, type DoZebrania } from '../gen';
import { malujPodloze, malujWode, posiejRuno, runo, nowy, hash, hex, ciemniej, jasniej, budynek, cienBudynku, MATERIALY, poziomSteampunku, poleM2, type WielkoscMiasta, type ZrodloPary, type Rodzaj, type Obraz } from '../gen';

// Ziemia i budynki kawałka z generatora (overhaul 09) – bez DOM-u, więc liczy się też w Web Workerze (ziemia09.worker.ts).

/** Piksele generatora na piksel mapy (art: 1 px = 0,5 px mapy). */
export const GEN_DOTS = 2;
/** Margines mapy rodzajów dookoła kawałka (woda czyta rodzaj do 32 px od brzegu, granice drżą o ±2). */
export const MARGINES = 40;

/** Rodzaje w mapie rodzajów: podłoża generatora i peron (dla generatora to chodnik, krawędź dorysowujemy sami). */
export type Rodzaj09 = Rodzaj | 'peron' | 'targ';
export const RODZAJE: Rodzaj09[] = [
  'trawa', 'laka', 'park', 'las_lisciasty', 'las_iglasty', 'bruk', 'chodnik', 'plac', 'droga', 'piasek', 'woda',
  'pole_orka', 'pole_zboze', 'zarosla', 'parking', 'cmentarz', 'mokradlo', 'skala', 'tory', 'peron', 'targ',
];
const PERON_ID = RODZAJE.indexOf('peron'), TORY_ID = RODZAJE.indexOf('tory'), TARG_ID = RODZAJE.indexOf('targ');

/** Budynek do namalowania (współrzędne w px generatora = px mapy × GEN_DOTS). */
export interface Budynek09 {
  r: number[];
  dziury: number[][];
  h: number;
  seed: number;
  drzwi?: [number, number];
  /** Kolory miejsc wyróżnionych w grze (sklep, szkoła, misja): dach i ściana. */
  hl?: [string, string];
  /** Wysokość jednego poziomu gry (px generatora, `ksztaltBudynku`): duże okna, drzwi, mur pruski. */
  poziom?: number;
  /** Wysoki budynek (od POZIOMY.osobnoOd): w kawałku tylko jego cień, sam budynek gra stawia jako osobny obrazek z prześwitem. */
  osobno?: boolean;
  /** Część zabytku od grafika (G12): w kawałku tylko jej cień, obraz zabytku stawia gra (Zabytki.ts). */
  zabytek?: boolean;
  /** Id budynku z mapy (wysokie budynki gra trzyma pod nim). */
  id?: number;
}

export interface Zlecenie {
  ids: Uint8Array; S: number; X0: number; Y0: number; N: number; budynki: Budynek09[]; noc: boolean;
  /** Drzewa ścięte w tej sesji (idDrzewa): zamiast pnia pieniek, bez korony i cienia. */
  sciete: string[];
  /** Tory (kolej i tramwaj) w okolicy kawałka, px generatora. */
  tory: number[][];
  /** Perony w okolicy (do steampunkowego wyposażenia, dworzec09.ts). */
  perony: Peron09[];
  /** Pola uprawne i działki sięgające kawałka (pełny obrys w px generatora, ziarno = id obszaru OSM). */
  pola: Pole09[];
  /** Miesiąc gracza (0–11): wygląd upraw. */
  miesiac: number;
  /** Rośliny zebrane w tej sesji (idRosliny): dołek po zbiorze. */
  zebrane: string[];
  /** Udział roślin dojrzałych do zebrania (pokrętło admina pola_dojrzale). */
  dojrzale: number;
  /** Wielkość miejscowości (Lublin = duże): ile steampunku na budynkach (GENERATOR_SWIATA 0.10). */
  miasto: WielkoscMiasta;
}

/** Pole (farmland) albo działki (allotments) do obsiania pasami (src/gen/pola.ts, zadanie G11). */
export interface Pole09 { r: number[]; seed: number; dz: boolean }

/** Rysunki roślin od grafika (public/uprawy, zamówienie 12), wysłane do Web Workera raz przy starcie gry. */
let RYSUNKI: Record<string, Sprite> | undefined;
export function ustawRysunkiUpraw(r: Record<string, Sprite>) {
  RYSUNKI = r;
}

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

/** Budynki i pnie drzew: cienie na ziemi, potem wszystko od północy na południe (dach kopertowy z kalenicami, ściany, okna; pień). */
function malujBudynki(o: Obraz, X0: number, Y0: number, budynki: Budynek09[], drzewa: Drzewo09[], noc: boolean, sciete: Set<string>, miasto: WielkoscMiasta, wyrzuty: ZrodloPary[]) {
  const cien = new Uint8Array(o.w * o.h);
  for (const b of budynki) cienBudynku(b.r, b.h, cien, o.w, o.h, X0, Y0);
  for (const t of drzewa) if (!sciete.has(idDrzewa(t))) cienDrzewa(t, cien, o.w, o.h, X0, Y0);
  for (let k = 0; k < cien.length; k++) if (cien[k] && o.px[k]) o.px[k] = ciemniej(o.px[k]);
  const lista: [number, Budynek09 | Drzewo09][] = [
    ...budynki.map((b) => [dolBudynku(b), b] as [number, Budynek09]),
    ...drzewa.map((t) => [t.y, t] as [number, Drzewo09]),
  ];
  lista.sort((a, b) => a[0] - b[0]);
  for (const [, rzecz] of lista) {
    if ('osobno' in rzecz && (rzecz.osobno || rzecz.zabytek)) continue;
    if ('g' in rzecz) {
      const d = drzewoZ(rzecz.g, rzecz.w);
      const pien = sciete.has(idDrzewa(rzecz)) ? d.pieniek : rzecz.c && d.pienZacios ? d.pienZacios : d.pien;
      naloz(o, pien, rzecz.x - d.kotwica[0] - X0, rzecz.y - d.kotwica[1] - Y0);
      continue;
    }
    malujBudynek(o, X0, Y0, rzecz, noc, miasto, wyrzuty);
  }
}

function dolBudynku(b: Budynek09) {
  let m = -Infinity;
  for (let i = 1; i < b.r.length; i += 2) m = Math.max(m, b.r[i]);
  return m;
}

/** Cień korony: owal przesunięty w prawo-w dół od pnia (słońce z lewej-góry). */
function cienDrzewa(t: Drzewo09, cien: Uint8Array, w: number, h: number, X0: number, Y0: number) {
  const d = drzewoZ(t.g, t.w);
  const rx = d.korona.w * 0.36, ry = rx * 0.45, cx = t.x + rx * 0.45 - X0, cy = t.y - ry * 0.3 - Y0;
  for (let j = Math.floor(cy - ry); j <= cy + ry; j++) {
    if (j < 0 || j >= h) continue;
    for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
      if (i < 0 || i >= w) continue;
      const u = (i - cx) / rx, v = (j - cy) / ry;
      if (u * u + v * v <= 1) cien[j * w + i] = 1;
    }
  }
}

/** Nakłada obraz (pomijając przezroczyste piksele). */
function naloz(o: Obraz, src: Obraz, x: number, y: number) {
  for (let j = 0; j < src.h; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= o.h) continue;
    for (let i = 0; i < src.w; i++) {
      const c = src.px[j * src.w + i];
      if (!(c >>> 24)) continue;
      const xx = x + i;
      if (xx >= 0 && xx < o.w) o.px[yy * o.w + xx] = c;
    }
  }
}

function malujBudynek(o: Obraz, X0: number, Y0: number, b: Budynek09, noc: boolean, miasto: WielkoscMiasta, wyrzuty: ZrodloPary[]) {
  const { obraz, x0, y0, para } = obrazBudynku(b, noc, miasto);
  naloz(o, obraz, x0 - X0, y0 - Y0);
  // Para z tego budynku: tylko wyloty w tym kawałku (budynek na kilku kawałkach nie da jej dwa razy).
  for (const z of para) if (z.okres && z.x >= X0 && z.y >= Y0 && z.x < X0 + o.w && z.y < Y0 + o.h) wyrzuty.push(z);
}

/** Obraz jednego budynku (z pamięci, jeśli już był liczony): też dla wysokich budynków stawianych przez grę osobno. */
export function obrazBudynku(b: Budynek09, noc: boolean, miasto: WielkoscMiasta) {
  const u = hash(b.seed, 3, 91), v = hash(b.seed, 5, 17);
  const dach = b.hl ? materialZKoloru(b.hl[0], 'dachowka') : losuj(DACHY, u);
  const sciana = b.hl ? materialZKoloru(b.hl[1], 'gladki') : losuj(SCIANY, v);
  // Steampunk wg wielkości miasta i budynku (właściciel 5.10.2026, GENERATOR_SWIATA 0.10): rury, kotły, lunety, para.
  const steampunk = poziomSteampunku(miasto, poleM2(b.r), b.seed);
  const klucz = `${b.seed}|${b.h}|${b.poziom ?? ''}|${dach}|${sciana}|${noc ? 1 : 0}|${steampunk}|${b.drzwi ?? ''}|${b.r.length}|${b.r[0]},${b.r[1]}`;
  let gotowy = pamiec.get(klucz);
  if (gotowy) { pamiec.delete(klucz); pamiec.set(klucz, gotowy); }
  else {
    gotowy = budynek(b.r, { wysokosc: b.h, poziom: b.poziom, dach, sciana, seed: b.seed, noc, drzwi: b.drzwi, dziury: b.dziury, komin: hash(b.seed, 7, 3) < 0.4, rura: hash(b.seed, 9, 5) < 0.25, steampunk });
    zapamietaj(klucz, gotowy);
  }
  // Ściany stoją na obrysie (wygląd 09 z poziomami): obraz w górę o wysokość ściany i w lewo o jej przechył,
  // więc podstawa ściany leży na krawędzi obrysu, a dach wystaje na północ (za nim można stanąć).
  const dx = -Math.round(b.h * SKOS), dy = -b.h;
  return { obraz: gotowy.obraz, x0: gotowy.x0 + dx, y0: gotowy.y0 + dy, para: gotowy.para.map((z) => ({ ...z, x: z.x + dx, y: z.y + dy })) };
}

/** Przechył ścian w generatorze (domyślny `skos` budynku, WALL_SKEW). */
const SKOS = 0.35;

const KRAWEDZ_PERONU = [hex('#e6dfcd'), hex('#d4ccb8')], LINIA_PERONU = hex('#e2b53c');

/** Perony: płyty chodnika na całym peronie (też tam, gdzie zachodzi podsypka), jasna krawędź od toru i żółta linia. */
function malujPerony(o: Obraz, ids: Uint8Array, S: number, X0: number, Y0: number) {
  const N = o.w;
  const at = (i: number, j: number) => ids[(j + MARGINES) * S + i + MARGINES];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (at(i, j) !== PERON_ID) continue;
    // Odległość (w kratkach) do najbliższego piksela poza peronem i czy tam leży tor.
    let d = 9, przyTorze = false;
    for (let r = 1; r <= 12 && !przyTorze && (d === 9 || r <= d + 6); r++)
      for (let k = -r; k <= r; k++)
        for (const [a, b] of [[i + k, j - r], [i + k, j + r], [i - r, j + k], [i + r, j + k]]) {
          const q = at(a, b);
          if (q !== PERON_ID && d === 9) d = r;
          if (q === TORY_ID) przyTorze = true;
        }
    if (d === 9) d = 7;
    const x = X0 + i, y = Y0 + j;
    let c = kolorPodloza('chodnik', x, y);
    if (d <= 2) c = KRAWEDZ_PERONU[d - 1];
    else if (przyTorze && d === 5 && hash(x >> 1, y >> 1, 5) < 0.85) c = LINIA_PERONU;
    o.px[j * N + i] = c;
  }
}

/**
 * `ids`: mapa rodzajów S×S (indeksy RODZAJE), lewy-górny róg = (X0 − MARGINES, Y0 − MARGINES) w px generatora.
 * Zwraca piksele N×N (RGBA w kolejności bajtów ImageData).
 */
export function ziemia(z: Zlecenie): { px: Uint32Array; drzewa: Drzewo09[]; para: [number, number][]; fale: [number, number][]; zbior: DoZebrania[]; wyrzuty: ZrodloPary[] } {
  const { ids, S, X0, Y0, N } = z;
  const rodzajW = (x: number, y: number): Rodzaj | null => {
    const i = x - X0 + MARGINES, j = y - Y0 + MARGINES;
    if (i < 0 || j < 0 || i >= S || j >= S) return null;
    const r = RODZAJE[ids[j * S + i]];
    return r === 'peron' ? 'chodnik' : r === 'targ' ? 'plac' : r;
  };
  const obraz = nowy(N, N);
  malujPodloze(obraz, X0, Y0, rodzajW);
  const trzciny = malujWode(obraz, X0, Y0, rodzajW);
  for (const k of posiejRuno(X0, Y0, N, N, rodzajW)) runo(obraz, k.x - X0, k.y - Y0, k.rodzaj, k.seed, 0);
  for (const [x, y] of trzciny) runo(obraz, x - X0, y - Y0, 'trzcina', (hash(x, y, 77) * 1e6) | 0, 0);
  // Pola uprawne: całe obsiane pasami (uprawa wg pasa i miesiąca), część warzyw dojrzała do zebrania.
  const zbior: DoZebrania[] = [];
  const wycinek = { x0: X0 - 2, y0: Y0 - 2, x1: X0 + N + 2, y1: Y0 + N + 2 };
  const zebrane = new Set(z.zebrane);
  for (const p of z.pola) for (const pas of pasyPola(p.r, p.seed, p.dz)) {
    const u = uprawaPasa(pas.seed, p.dz);
    for (const q of malujPas(obraz, pas, u, z.miesiac, X0, Y0, 0, { wycinek, rysunki: RYSUNKI, zebrane, dojrzale: z.dojrzale }))
      if (q.x >= X0 && q.y >= Y0 && q.x < X0 + N && q.y < Y0 + N) zbior.push(q);
  }
  // Tory: podsypka, podkłady, szyny (generator), potem perony na wierzchu (płyty z jasną krawędzią i żółtą linią).
  for (const t of z.tory) tor(obraz, t, X0, Y0);
  malujPerony(obraz, ids, S, X0, Y0);
  stragany(obraz, X0, Y0, (x, y) => { const i = x - X0 + MARGINES, j = y - Y0 + MARGINES; return i >= 0 && j >= 0 && i < S && j < S && ids[j * S + i] === TARG_ID; });
  const para: [number, number][] = [];
  for (const p of z.perony) for (const q of wyposazPeron(obraz, X0, Y0, p)) if (q[0] >= X0 && q[1] >= Y0 && q[0] < X0 + N && q[1] < Y0 + N) para.push(q);
  // Drzewa: pnie z okolicy kawałka (korona wysoka, więc też z pasa poniżej), w kawałku tylko te, których podstawa jest w nim.
  const ramki = z.budynki.map((b) => {
    let a = Infinity, c = Infinity, e = -Infinity, f = -Infinity;
    for (let i = 0; i < b.r.length; i += 2) { a = Math.min(a, b.r[i]); c = Math.min(c, b.r[i + 1]); e = Math.max(e, b.r[i]); f = Math.max(f, b.r[i + 1]); }
    return [a, c, e, f];
  });
  // Drzewa nie w budynkach ani na ich podwórkach i nie tuż przy ścianie (korona nie wchodzi na dach).
  const wObrysie = (x: number, y: number) => z.budynki.some((b, i) => {
    const r = ramki[i];
    return x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3] && wPierscieniu(b.r, x + 0.5, y + 0.5);
  });
  const OD_SCIAN = 12;
  const drzewa = rozstawDrzewa(X0 - 48, Y0 - 8, N + 96, N + 96, rodzajW, (x, y) =>
    !wObrysie(x, y) && ![[OD_SCIAN, 0], [-OD_SCIAN, 0], [0, OD_SCIAN], [0, -OD_SCIAN], [0, -2 * OD_SCIAN], [OD_SCIAN, -OD_SCIAN], [-OD_SCIAN, -OD_SCIAN]].some(([dx, dy]) => wObrysie(x + dx, y + dy)));
  const sciete = new Set(z.sciete);
  const wyrzuty: ZrodloPary[] = [];
  if (z.budynki.length || drzewa.length) malujBudynki(obraz, X0, Y0, z.budynki, drzewa, z.noc, sciete, z.miasto ?? 'srednie', wyrzuty);
  const swoje = drzewa.filter((t) => t.x >= X0 && t.y >= Y0 && t.x < X0 + N && t.y < Y0 + N && !sciete.has(idDrzewa(t)));
  // Zmarszczki na wodzie (gra je animuje): kratka 14 px, z dala od brzegu, co trzecia–czwarta.
  const fale: [number, number][] = [];
  const K = 14;
  for (let y = Math.ceil(Y0 / K) * K; y < Y0 + N; y += K) for (let x = Math.ceil(X0 / K) * K; x < X0 + N; x += K) {
    const fx = x + Math.floor(hash(x, y, 901) * K), fy = y + Math.floor(hash(x, y, 902) * K);
    if (hash(x, y, 903) > 0.32 || fx >= X0 + N || fy >= Y0 + N) continue;
    if ([[0, 0], [7, 0], [-7, 0], [0, 6], [0, -6]].every(([dx, dy]) => rodzajW(fx + dx, fy + dy) === 'woda')) fale.push([fx, fy]);
  }
  return { px: obraz.px, drzewa: swoje, para, fale, zbior, wyrzuty };
}

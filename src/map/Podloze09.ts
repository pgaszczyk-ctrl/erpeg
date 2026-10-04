import { malujPodloze, malujWode, posiejRuno, runo, nowy, doCanvas, hash, type Rodzaj, type Obraz } from '../gen';
import type { Area, Line } from './CityMap';

// Ziemia z generatora (overhaul 09, ?wyglad=09): zamiast wzorów z plików grafika każdy piksel kawałka mapy
// liczy generator z `src/gen`. Obszary OSM trafiają najpierw na pomocnicze płótno „mapy rodzajów”
// (każdy rodzaj = swój kolor-identyfikator), z którego generator czyta rodzaj podłoża w punkcie.

export const WYGLAD_09 = new URLSearchParams(location.search).get('wyglad') === '09';

/** Piksele generatora na piksel mapy (art: 1 px = 0,5 px mapy). */
export const GEN_DOTS = 2;
/** Margines mapy rodzajów dookoła kawałka (woda czyta rodzaj do 32 px od brzegu, granice drżą o ±2). */
const MARGINES = 40;

const RODZAJE: Rodzaj[] = [
  'trawa', 'laka', 'park', 'las_lisciasty', 'las_iglasty', 'bruk', 'chodnik', 'plac', 'droga', 'piasek', 'woda',
  'pole_orka', 'pole_zboze', 'zarosla', 'parking', 'cmentarz', 'mokradlo', 'skala', 'tory',
];
const ID = Object.fromEntries(RODZAJE.map((r, i) => [r, i])) as Record<Rodzaj, number>;
/** Kolory-identyfikatory: kod z trzech kanałów, więc pośrednie piksele (wygładzone brzegi) rozpoznajemy po braku dopasowania. */
const KOD = RODZAJE.map((_, i) => [(i * 37 + 11) & 255, (i * 91 + 53) & 255, (i * 151 + 97) & 255] as const);
const KOD_NA_ID = new Map<number, number>(KOD.map(([r, g, b], i) => [(r << 16) | (g << 8) | b, i]));
const kolor = (r: Rodzaj) => `rgb(${KOD[ID[r]].join(',')})`;

/** Rodzaj podłoża z rodzaju obszaru OSM (leśne i pola zmieniają odmianę wg id obszaru). */
function rodzajObszaru(a: Area): Rodzaj {
  switch (a.kind) {
    case 'grass': return 'trawa';
    case 'park': return 'park';
    case 'forest': return a.id % 3 === 0 ? 'las_iglasty' : 'las_lisciasty';
    case 'scrub': return 'zarosla';
    case 'wetland': return 'mokradlo';
    case 'water': return 'woda';
    case 'farmland': return a.id % 2 ? 'pole_orka' : 'pole_zboze';
    case 'cemetery': return 'cmentarz';
    case 'allotments': return 'park';
    case 'pitch': return 'trawa';
    case 'playground': return 'plac';
    case 'parking': return 'parking';
    case 'plaza': return 'plac';
    case 'paved': return 'bruk';
    case 'sand': return 'piasek';
    case 'rock': case 'glacier': return 'skala';
    default: return 'trawa';
  }
}


let rodzajeCanvas: HTMLCanvasElement | null = null;

function sciezkaObszaru(ctx: CanvasRenderingContext2D, rings: number[][]) {
  ctx.beginPath();
  for (const r of rings) {
    ctx.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
    ctx.closePath();
  }
}

/**
 * Maluje ziemię kawałka (x0, y0, `rozmiar` px mapy) do `ctx` (transformacja mapy już ustawiona).
 * `szerokoscDrogi` = jak gruba ma być droga na mapie (px mapy); `poza` rysuje kształt poza granicą miasta (czyli las).
 * Zwraca kępki runa (do namalowania nad ziemią).
 */
export function maluj09(
  ctx: CanvasRenderingContext2D,
  areas: Area[],
  lines: Line[],
  szerokoscDrogi: (l: Line) => number,
  poza: ((c: CanvasRenderingContext2D) => void) | null,
  x0: number,
  y0: number,
  rozmiar: number,
) {
  const N = rozmiar * GEN_DOTS;
  const S = N + 2 * MARGINES;
  if (!rodzajeCanvas) rodzajeCanvas = document.createElement('canvas');
  const rc = rodzajeCanvas;
  if (rc.width !== S) { rc.width = S; rc.height = S; }
  const g = rc.getContext('2d', { willReadFrequently: true })!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = kolor('trawa');
  g.fillRect(0, 0, S, S);
  g.setTransform(GEN_DOTS, 0, 0, GEN_DOTS, MARGINES - x0 * GEN_DOTS, MARGINES - y0 * GEN_DOTS);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  for (const a of areas) {
    if (a.kind === 'paved') continue;
    sciezkaObszaru(g, a.rings);
    g.fillStyle = kolor(rodzajObszaru(a));
    g.fill('evenodd');
  }
  for (const l of lines) {
    const woda = l.kind === 'river' || l.kind === 'stream' || l.kind === 'ditch';
    const tor = l.kind === 'rail' || l.kind === 'tram';
    let r: Rodzaj | null = null;
    if (woda) r = 'woda';
    else if (tor) r = 'tory';
    else if (l.kind === 'pedestrian') r = 'chodnik';
    else if (l.kind in SZEROKOSC_LINII) r = 'droga';
    if (!r) continue;
    g.beginPath();
    g.moveTo(l.pts[0], l.pts[1]);
    for (let i = 2; i < l.pts.length; i += 2) g.lineTo(l.pts[i], l.pts[i + 1]);
    g.strokeStyle = kolor(r);
    g.lineWidth = woda ? l.width : tor ? Math.max(l.width, 4) : szerokoscDrogi(l);
    g.stroke();
  }
  for (const a of areas) {
    if (a.kind !== 'paved') continue;
    sciezkaObszaru(g, a.rings);
    g.fillStyle = kolor('bruk');
    g.fill('evenodd');
  }
  if (poza) { g.fillStyle = kolor('las_iglasty'); poza(g); }

  // Odczyt rodzajów; piksele „pośrednie” dostają rodzaj sąsiada z lewej albo z góry.
  const dane = g.getImageData(0, 0, S, S).data;
  const ids = new Uint8Array(S * S);
  const pewne = new Uint8Array(S * S);
  for (let k = 0; k < S * S; k++) {
    const id = KOD_NA_ID.get((dane[4 * k] << 16) | (dane[4 * k + 1] << 8) | dane[4 * k + 2]);
    if (id !== undefined) { ids[k] = id; pewne[k] = 1; }
  }
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = j * S + i;
    if (pewne[k]) continue;
    ids[k] = i > 0 ? ids[k - 1] : j > 0 ? ids[k - S] : 0;
  }
  const X0 = x0 * GEN_DOTS, Y0 = y0 * GEN_DOTS;
  const rodzajW = (x: number, y: number): Rodzaj | null => {
    const i = x - X0 + MARGINES, j = y - Y0 + MARGINES;
    if (i < 0 || j < 0 || i >= S || j >= S) return null;
    return RODZAJE[ids[j * S + i]];
  };

  const obraz: Obraz = nowy(N, N);
  malujPodloze(obraz, X0, Y0, rodzajW);
  const trzciny = malujWode(obraz, X0, Y0, rodzajW);
  const kepki = posiejRuno(X0, Y0, N, N, rodzajW);
  for (const k of kepki) runo(obraz, k.x - X0, k.y - Y0, k.rodzaj, k.seed, 0);
  for (const [x, y] of trzciny) runo(obraz, x - X0, y - Y0, 'trzcina', hash(x, y, 77) * 1e6 | 0, 0);

  const c = doCanvas(obraz);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, x0, y0, rozmiar, rozmiar);
  ctx.restore();
}

const SZEROKOSC_LINII: Record<string, number> = { major: 1, medium: 1, minor: 1, service: 1, track: 1, path: 1, steps: 1 };

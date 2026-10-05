import type { Rodzaj } from '../gen';
import type { Area, Line } from './CityMap';
import { GEN_DOTS, MARGINES, RODZAJE, ziemia, type Zlecenie } from './ziemia09';
import type { Drzewo09 } from './drzewa09';

// Ziemia z generatora (overhaul 09, ?wyglad=09): zamiast wzorów z plików grafika każdy piksel kawałka mapy
// liczy generator z `src/gen`. Obszary OSM trafiają najpierw na pomocnicze płótno „mapy rodzajów”
// (każdy rodzaj = swój kolor-identyfikator), z którego generator czyta rodzaj podłoża w punkcie.

export const WYGLAD_09 = new URLSearchParams(location.search).get('wyglad') === '09';

const ID = Object.fromEntries(RODZAJE.map((r, i) => [r, i])) as Record<Rodzaj, number>;
/** Kolory-identyfikatory: kod z trzech kanałów, więc pośrednie piksele (wygładzone brzegi) rozpoznajemy po braku dopasowania. */
const KOD = RODZAJE.map((_, i) => [(i * 37 + 11) & 255, (i * 91 + 53) & 255, (i * 151 + 97) & 255] as const);
/** Rodzaj po czerwonym kanale (kody mają różne R) i pełny kod jako liczba (kolejność bajtów ImageData). */
const PO_R = new Int16Array(256).fill(-1);
KOD.forEach(([r], i) => (PO_R[r] = i));
const KOD_32 = KOD.map(([r, g, b]) => (b << 16) | (g << 8) | r);
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

/** Granice pierścieni (liczone raz), żeby pomijać dziury i obszary poza kawałkiem. */
const ramki = new WeakMap<number[], [number, number, number, number]>();
function ramka(r: number[]) {
  let b = ramki.get(r);
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < b[0]) b[0] = r[i];
      if (r[i + 1] < b[1]) b[1] = r[i + 1];
      if (r[i] > b[2]) b[2] = r[i];
      if (r[i + 1] > b[3]) b[3] = r[i + 1];
    }
    ramki.set(r, b);
  }
  return b;
}

function sciezkaObszaru(ctx: CanvasRenderingContext2D, rings: number[][], x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath();
  for (const r of rings) {
    const b = ramka(r);
    if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue;
    ctx.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
    ctx.closePath();
  }
}

/**
 * Mapa rodzajów kawałka (x0, y0, `rozmiar` px mapy): obszary, drogi, woda i tory na pomocniczym płótnie.
 * `szerokoscDrogi` = jak gruba ma być droga na mapie (px mapy); `poza` rysuje kształt poza granicą miasta (las).
 */
export function mapaRodzajow(
  areas: Area[],
  lines: Line[],
  szerokoscDrogi: (l: Line) => number,
  poza: ((c: CanvasRenderingContext2D) => void) | null,
  x0: number,
  y0: number,
  rozmiar: number,
): Omit<Zlecenie, 'budynki' | 'noc'> {
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
  const m = MARGINES / GEN_DOTS + 2;
  const bx0 = x0 - m, by0 = y0 - m, bx1 = x0 + rozmiar + m, by1 = y0 + rozmiar + m;

  for (const a of areas) {
    if (a.kind === 'paved') continue;
    sciezkaObszaru(g, a.rings, bx0, by0, bx1, by1);
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
    else if (DROGI.has(l.kind)) r = 'droga';
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
    sciezkaObszaru(g, a.rings, bx0, by0, bx1, by1);
    g.fillStyle = kolor('bruk');
    g.fill('evenodd');
  }
  if (poza) { g.fillStyle = kolor('las_iglasty'); poza(g); }

  // Odczyt rodzajów; piksele „pośrednie” (wygładzone brzegi) dostają rodzaj sąsiada z lewej albo z góry.
  const dane = new Uint32Array(g.getImageData(0, 0, S, S).data.buffer);
  const ids = new Uint8Array(S * S);
  let ost = 0;
  for (let k = 0; k < S * S; k++) {
    const v = dane[k];
    const id = PO_R[v & 255];
    // Pewne tylko przy zgodnych wszystkich trzech kanałach; inaczej rodzaj sąsiada z lewej (albo z góry na początku wiersza).
    if (id >= 0 && (v & 0xffffff) === KOD_32[id]) ost = id;
    else ost = k % S ? ost : k >= S ? ids[k - S] : 0;
    ids[k] = ost;
  }
  return { ids, S, X0: x0 * GEN_DOTS, Y0: y0 * GEN_DOTS, N };
}


/** Piksele ziemi → płótno N×N. */
function naPlotno(px: Uint32Array, N: number) {
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px.buffer as ArrayBuffer, px.byteOffset, px.byteLength), N, N), 0, 0);
  return c;
}

/**
 * Ziemia liczona w tle: dwa Web Workery (po kolei zlecenia), a gdy przeglądarka ich nie da – od razu w grze.
 */
/** Gotowy kawałek: ziemia z budynkami i pniami oraz drzewa, którym gra stawia korony. */
export interface Gotowe { ziemia: HTMLCanvasElement; drzewa: Drzewo09[] }

class ZiemiaWTle {
  private workery: Worker[] = [];
  private czeka = new Map<number, (g: Gotowe) => void>();
  private nr = 0;
  private kolej = 0;
  private wymiar = new Map<number, number>();

  constructor() {
    try {
      const ile = Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1));
      for (let i = 0; i < ile; i++) {
        const w = new Worker(new URL('./ziemia09.worker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<{ nr: number; px: Uint32Array; drzewa: Drzewo09[] }>) => {
          const gotowe = this.czeka.get(e.data.nr);
          const N = this.wymiar.get(e.data.nr)!;
          this.czeka.delete(e.data.nr);
          this.wymiar.delete(e.data.nr);
          gotowe?.({ ziemia: naPlotno(e.data.px, N), drzewa: e.data.drzewa });
        };
        this.workery.push(w);
      }
    } catch {
      this.workery = [];
    }
  }

  policz(z: Zlecenie): Promise<Gotowe> {
    if (!this.workery.length) {
      const { px, drzewa } = ziemia(z);
      return Promise.resolve({ ziemia: naPlotno(px, z.N), drzewa });
    }
    const nr = ++this.nr;
    const w = this.workery[this.kolej++ % this.workery.length];
    return new Promise((ok) => {
      this.czeka.set(nr, ok);
      this.wymiar.set(nr, z.N);
      w.postMessage({ nr, ...z }, [z.ids.buffer]);
    });
  }
}

let wTle: ZiemiaWTle | null = null;
export const ziemiaWTle = () => (wTle ??= new ZiemiaWTle());

/** Gotowa ziemia na kawałek (transformacja mapy już ustawiona w ctx). */
export function rysujZiemie(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, x0: number, y0: number, rozmiar: number) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, x0, y0, rozmiar, rozmiar);
  ctx.restore();
}

const DROGI = new Set(['major', 'medium', 'minor', 'service', 'track', 'path', 'steps']);

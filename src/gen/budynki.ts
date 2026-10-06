// Budynki z obrysu OSM liczone piksel po pikselu (port makiety + `dachy_roofs.py`, uogólnione na dowolny wielokąt).
// Konwencja gry zostaje: dach = obrys, ściany „wiszą” pod obrysem i są przesunięte w prawo (WALL_SKEW 0,35).
// Wszystkie miary w px obrazu (0,5 px mapy): ściany 8 / 12 / 16 px.
import { Obraz, nowy, hex, hash, rng, OBRYS, mieszaj } from './wspolne';

export interface Material { tony: number[]; krawedz: number; wzor: 'dachowka' | 'lupek' | 'gont' | 'blacha' | 'gladki' | 'cegla' | 'deski' | 'kamien' }
const M = (t: string[], k: string, wzor: Material['wzor']): Material => ({ tony: t.map(hex), krawedz: hex(k), wzor });
export const MATERIALY: Record<string, Material> = {
  dachowka_czerwona: M(['#4e1f1c', '#6e2c24', '#8f3a2c', '#ad5036', '#c86a44'], '#d98a58', 'dachowka'),
  dachowka_brazowa: M(['#3e2519', '#563724', '#704a30', '#8a613f', '#a57a52'], '#bf9466', 'dachowka'),
  lupek: M(['#1f2130', '#2c2f42', '#3c4256', '#525a70', '#6c7790'], '#c8963e', 'lupek'),
  gont: M(['#3a2a1e', '#523c2a', '#6c5038', '#866648', '#a08058'], '#b89468', 'gont'),
  blacha_zielona: M(['#1f3a30', '#2c4f40', '#3c6652', '#538068', '#6e9a80'], '#8ab09a', 'blacha'),
  miedz_patyna: M(['#24463e', '#356256', '#4a8070', '#66a08c', '#8cc0aa'], '#c8963e', 'blacha'),
  papa: M(['#2a2a2e', '#38383e', '#46464c', '#56565c', '#68686e'], '#7a7a80', 'gladki'),
  tynk_kremowy: M(['#6e5c4c', '#93806a', '#b5a286', '#cdbd9c', '#e0d4b6'], '#5a4a3c', 'gladki'),
  tynk_zolty: M(['#7a6236', '#a08448', '#c2a45c', '#d8bc72', '#e8d08c'], '#5e4a2a', 'gladki'),
  tynk_szary: M(['#58565a', '#77747a', '#949098', '#aeaab0', '#c6c2c6'], '#46444a', 'gladki'),
  cegla: M(['#4e2723', '#6e362c', '#8a4836', '#a5644a', '#bc7c5c'], '#3a1e1a', 'cegla'),
  drewno: M(['#3e2a1c', '#5a3e28', '#765436', '#926c46', '#ae8858'], '#2e2016', 'deski'),
  kamien: M(['#4c4848', '#666060', '#807a78', '#9a9490', '#b4aea8'], '#3a3636', 'kamien'),
};
const MOSIADZ = ['#6b4a22', '#9a6420', '#c8963e', '#e9c56a'].map(hex);
const SZYBA = ['#2a3450', '#56709a'].map(hex), SWIATLO = ['#d9a84a', '#f2d888'].map(hex);

export interface OpcjeBudynku {
  wysokosc: number;            // wysokość ścian w px (8 / 12 / 16)
  dach: string; sciana: string; // klucze MATERIALY
  seed: number;
  skos?: number;               // WALL_SKEW, domyślnie 0,35
  noc?: boolean;               // część okien świeci
  rura?: boolean;              // mosiężna rura na ścianie
  komin?: boolean;
  drzwi?: [number, number];    // punkt drzwi (we współrzędnych pierścienia) – drzwi na najbliższej ścianie
  dziury?: number[][];         // podwórka (pierścienie wewnątrz obrysu): dach spada też w ich stronę, od podwórka widać ściany
  /** Poziom steampunku 0–3 (patrz `poziomSteampunku`): 1 rura + komin z parą, 2 + kocioł na dachu, więcej rur, manometr, okno-bulaj, 3 + rurociąg po dachu, wentylator, dodatkowe kominy, duża para. */
  steampunk?: 0 | 1 | 2 | 3;
  /** Wymuszony zestaw ozdób (nazwy z `OZDOBY_STEAMPUNK`) zamiast losowania – do podglądu i miejsc specjalnych. */
  ozdoby?: string[];
  /** Dach płaski z attyką (domyślnie tylko przy 3 poziomach gry). */
  plaski?: boolean;
  /** Wysokość jednego poziomu gry w px (z `ksztaltBudynku`); ściana = poziomy × poziom. Bez niej stary układ małych okienek. */
  poziom?: number;
}

/** Dachy płaskie: żwir jasny, papa, zielony dach, blacha (wybór z ziarna budynku). */
const DACHY_PLASKIE = [['#5c5a5e', '#77747a', '#8f8c90', '#a6a3a6', '#c0bdbd'], ['#2a2a2e', '#38383e', '#46464c', '#5a5a62', '#74747c'], ['#2f4a2c', '#3d5c34', '#4c6e3c', '#5e8248', '#8aa868'], ['#4a5058', '#5e6670', '#727c88', '#8a96a2', '#a8b2bc']].map((t) => t.map(hex));

/**
 * Poziomy gry zamiast pięter (decyzja właściciela 6.10: dużo pięter i okienek gryzie się z dużym ludzikiem; blok z wielkiej płyty
 * ma być dwupoziomową karczmą, nie pomniejszonym molochem): 1–3 piętra OSM = 1 poziom, 4–14 = 2, 15+ = 3.
 * Wysokość poziomu rośnie z wielkością budynku, ale łagodnie: 100 m² → 16 px, 400 → 20, 1600+ → 24 (przy bohaterce 48 px).
 */
export function ksztaltBudynku(pietraOSM: number, powierzchniaM2: number): { poziomy: number; poziom: number; wysokosc: number } {
  const poziomy = pietraOSM <= 3 ? 1 : pietraOSM <= 14 ? 2 : 3;
  const poziom = Math.round(Math.min(24, Math.max(16, 16 + 2 * Math.log2(Math.max(1, powierzchniaM2 / 100)))));
  return { poziomy, poziom, wysokosc: poziomy * poziom };
}


/** Katalog ozdób steampunku (nazwy do `OpcjeBudynku.ozdoby`). */
export const OZDOBY_STEAMPUNK = ['manometr', 'zawor', 'lampa', 'rurki_poziome', 'rura_spod_ziemi', 'kratka_z_para', 'zebatka', 'zegar', 'zbiornik_przy_scianie', 'poczta_pneumatyczna', 'kociol', 'wentylator', 'swietlik_zebaty', 'luneta', 'kopula_obserwatorium', 'zbiornik_wody', 'antena_tesli', 'komin_zelazny', 'anemometr'];

export type WielkoscMiasta = 'duze' | 'srednie' | 'wies';
/** Wielkość miejscowości z OSM: place=city albo population > 100 tys. → duże; town / 10–100 tys. → średnie; reszta → wieś. Mapa Lublina = duże. */
export const wielkoscMiasta = (place?: string, ludnosc?: number): WielkoscMiasta =>
  (ludnosc ?? 0) > 100000 || place === 'city' ? 'duze' : (ludnosc ?? 0) > 10000 || place === 'town' ? 'srednie' : 'wies';
/**
 * Ile steampunku na budynku (decyzja właściciela 5.10): w dużych miastach 3/4 dużych budynków (≥ 600 m²) mocno, 1/3 średnich (150–600 m²),
 * 1/5 małych; w średnich miastach połowa dużych, 1/4 średnich, 15 % małych; na wsi 1/5 wszystkich, lekko. Deterministycznie z ziarna budynku.
 */
export function poziomSteampunku(miasto: WielkoscMiasta, powierzchniaM2: number, seed: number): 0 | 1 | 2 | 3 {
  const duzy = powierzchniaM2 >= 600, sredni = powierzchniaM2 >= 150, r = hash(seed, 17, 401);
  if (miasto === 'duze') return duzy ? (r < 0.75 ? 3 : 0) : sredni ? (r < 0.33 ? 2 : 0) : (r < 0.2 ? 1 : 0);
  if (miasto === 'srednie') return duzy ? (r < 0.5 ? (r < 0.25 ? 3 : 2) : 0) : sredni ? (r < 0.25 ? 2 : 0) : (r < 0.15 ? 1 : 0);
  return r < 0.2 ? (duzy || sredni ? 2 : 1) : 0;
}
/** Pole obrysu w m² (px obrazu: 3,84 px = 1 m). */
export const poleM2 = (pierscien: number[]) => { let a = 0; const n = pierscien.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += pierscien[2 * i] * pierscien[2 * j + 1] - pierscien[2 * j] * pierscien[2 * i + 1]; } return Math.abs(a) / 2 / (3.84 * 3.84); };

/** Źródło pary: miejsce w świecie, wielkość obłoczka (16/24/32) i rytm krótkich wyrzutów (okres 0 = nieczynne). */
export interface ZrodloPary { x: number; y: number; rozmiar: number; okres: number; faza: number; czas: number }
/**
 * Para „pryska” krótko i rzadko (decyzja właściciela 5.10: było jej za dużo): tylko ok. 40 % wylotów działa (na poziomie 3 ok. 55 %),
 * każdy co 5–14 s wyrzuca jeden obłoczek na 0,8–1,6 s. Zwraca klatkę animacji `para()` (0–5) albo −1, gdy w tej chwili nic nie leci.
 */
export function klatkaPary(z: ZrodloPary, tSek: number): number {
  if (!z.okres) return -1;
  const tt = (((tSek + z.faza) % z.okres) + z.okres) % z.okres;
  return tt < z.czas ? Math.min(5, Math.floor((tt / z.czas) * 6)) : -1;
}
/** `pierscien` = [x0, y0, x1, y1, …] w px obrazu (świat). Zwraca obraz budynku i jego lewy-górny róg w świecie. */
/** Zwraca też `para`: źródła pary (patrz `ZrodloPary`, `klatkaPary`) – gra stawia tam animowane obłoczki `para()` tylko w chwili wyrzutu. */
export function budynek(pierscien: number[], op: OpcjeBudynku): { obraz: Obraz; x0: number; y0: number; para: ZrodloPary[] } {
  const H = op.wysokosc, sk = op.skos ?? 0.35;
  const PLASKI = op.plaski ?? Math.round(H / Math.max(10, op.poziom ?? H)) >= 3; // dach płaski tylko na najwyższych (3 poziomy gry)
  // Obrys z podwórkami (dziury): maska ścian i dachu bierze wszystkie pierścienie (parzysto-nieparzyście).
  // Drobne „zęby” z zaokrąglonych narożników (pogrubianie i łączenie budynków w build-map) wygładzone,
  // żeby krawędzie szły równymi schodkami pikseli (właściciel 5.10.2026: domy wyglądały na poszarpane).
  const pierscienie = [pierscien, ...(op.dziury ?? [])].map((r) => (r.length > 8 ? uprosc(r, 1.6) : r));
  const P: [number, number][] = []; for (let i = 0; i < pierscien.length / 2; i++) P.push([pierscien[2 * i], pierscien[2 * i + 1]]);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const [x, y] of P) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const ST = (op.steampunk ?? 0) > 0 || !!op.ozdoby, mL = ST ? 10 : 2, mT = ST ? 20 : 2, mB = ST ? 12 : 3; // zapas na ozdoby wystające za obrys
  const x0 = Math.floor(minX) - mL, y0 = Math.floor(minY) - mT, W = Math.ceil(maxX + H * sk) - x0 + mB, Hh = Math.ceil(maxY + H) - y0 + mB;
  // maska obrysu (scanline)
  const mask = new Uint8Array(W * Hh);
  for (let j = 0; j < Hh; j++) {
    const py = y0 + j + 0.5, xs: number[] = [];
    for (const r of pierscienie) { const m = r.length / 2; for (let i = 0; i < m; i++) { const ax = r[2 * i], ay = r[2 * i + 1], bx = r[(2 * i + 2) % r.length], by = r[(2 * i + 3) % r.length]; if ((ay > py) !== (by > py)) xs.push(ax + ((py - ay) * (bx - ax)) / (by - ay)); } }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) { const i = x - x0; if (i >= 0 && i < W) mask[j * W + i] = 1; }
  }
  const inFP = (x: number, y: number) => { const i = x - x0, j = y - y0; return i >= 0 && j >= 0 && i < W && j < Hh && mask[j * W + i] === 1; };
  // Krawędzie z normalnymi na zewnątrz bryły (przy podwórku: w stronę podwórka). Dach liczy się z bryły
  // uproszczonej, gdy obrys jest „dziwny” (bryla()), ściany i maska zostają na prawdziwym obrysie.
  const geo = bryla(pierscienie);
  // Budynek prawie okrągły (rotunda, wieża): dach stożkowy z wierzchołkiem w środku, cieniowany dookoła,
  // zamiast płatów z uproszczonego wielokąta (właściciel 5.10.2026: „okrągły budynek mógłby być piękny”).
  const stozek = okragly(pierscienie[0], pierscienie.length);
  type Kraw = { ax: number; ay: number; ux: number; uy: number; L: number; nx: number; ny: number; p: number; n: number };
  const E: Kraw[] = [];
  geo.forEach((r, ri) => {
    const m = r.length / 2, baza = E.length;
    let area = 0; for (let i = 0; i < m; i++) { const ax = r[2 * i], ay = r[2 * i + 1], bx = r[(2 * i + 2) % r.length], by = r[(2 * i + 3) % r.length]; area += ax * by - bx * ay; }
    const s = (area > 0 ? 1 : -1) * (ri === 0 ? 1 : -1);
    for (let i = 0; i < m; i++) {
      const ax = r[2 * i], ay = r[2 * i + 1], bx = r[(2 * i + 2) % r.length], by = r[(2 * i + 3) % r.length];
      const L = Math.hypot(bx - ax, by - ay) || 1; const ux = (bx - ax) / L, uy = (by - ay) / L;
      E.push({ ax, ay, ux, uy, L, nx: uy * s, ny: -ux * s, p: baza + ((i + m - 1) % m), n: baza + ((i + 1) % m) });
    }
  });
  // Łuki (rotundy, zaokrąglone narożniki): ściany pod łagodnym kątem do sąsiadek cieniujemy płynnie,
  // normalna przechodzi wzdłuż ściany od średniej z poprzednią do średniej z następną (bez widocznych płatów).
  const LAGODNIE = 0.8;
  const gladkaNormalna = (e: Kraw, x: number, y: number): [number, number] => {
    const a = E[e.p], b = E[e.n];
    const da = a.nx * e.nx + a.ny * e.ny, db = b.nx * e.nx + b.ny * e.ny;
    if (da < LAGODNIE && db < LAGODNIE) return [e.nx, e.ny];
    const t = Math.max(0, Math.min(1, ((x - e.ax) * e.ux + (y - e.ay) * e.uy) / e.L));
    const n0x = da >= LAGODNIE ? (a.nx + e.nx) / 2 : e.nx, n0y = da >= LAGODNIE ? (a.ny + e.ny) / 2 : e.ny;
    const n1x = db >= LAGODNIE ? (b.nx + e.nx) / 2 : e.nx, n1y = db >= LAGODNIE ? (b.ny + e.ny) / 2 : e.ny;
    let nx = n0x + (n1x - n0x) * t, ny = n0y + (n1y - n0y) * t;
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    return [nx, ny];
  };
  // Dwie najbliższe krawędzie punktu. Krawędzie są w siatce kratek, więc przeszukujemy tylko okolicę
  // (kratki pierścieniami, aż reszta musi być dalej). Wynik taki sam jak przy sprawdzaniu wszystkich po kolei:
  // przy równej odległości wygrywa krawędź o niższym numerze.
  const KR = 8, gx0 = Math.floor(minX / KR) - 1, gy0 = Math.floor(minY / KR) - 1;
  const GW = Math.floor(maxX / KR) + 2 - gx0, GH = Math.floor(maxY / KR) + 2 - gy0;
  const kratki: number[][] = Array.from({ length: GW * GH }, () => []);
  E.forEach((e, i) => {
    const bx = e.ax + e.ux * e.L, by = e.ay + e.uy * e.L;
    const cx0 = Math.max(0, Math.floor((Math.min(e.ax, bx) - 1) / KR) - gx0), cx1 = Math.min(GW - 1, Math.floor((Math.max(e.ax, bx) + 1) / KR) - gx0);
    const cy0 = Math.max(0, Math.floor((Math.min(e.ay, by) - 1) / KR) - gy0), cy1 = Math.min(GH - 1, Math.floor((Math.max(e.ay, by) + 1) / KR) - gy0);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) kratki[cy * GW + cx].push(i);
  });
  const znak = new Int32Array(E.length);
  let stempel = 0;
  // Wynik ostatniego wyszukiwania (bez tworzenia obiektów na każdy piksel).
  let d1 = 1e9, i1 = 0, d2 = 1e9, i2 = 0, qx = 0, qy = 0;
  const wez = (i: number) => {
    if (znak[i] === stempel) return;
    znak[i] = stempel;
    const e = E[i];
    const t = Math.max(0, Math.min(e.L, (qx - e.ax) * e.ux + (qy - e.ay) * e.uy));
    const dx = e.ax + e.ux * t - qx, dy = e.ay + e.uy * t - qy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < d1 || (d === d1 && i < i1)) { d2 = d1; i2 = i1; d1 = d; i1 = i; }
    else if (d < d2 || (d === d2 && i < i2)) { d2 = d; i2 = i; }
  };
  const najblizsze = (px: number, py: number) => {
    d1 = 1e9; i1 = 0; d2 = 1e9; i2 = 0; qx = px; qy = py;
    stempel++;
    const cx = Math.floor(px / KR) - gx0, cy = Math.floor(py / KR) - gy0;
    for (let R = 0; ; R++) {
      // Gdy kratek do przejrzenia robi się więcej niż krawędzi: po prostu wszystkie krawędzie.
      if ((2 * R + 1) * (2 * R + 1) > 2 * E.length) { for (let i = 0; i < E.length; i++) wez(i); break; }
      for (let y = cy - R; y <= cy + R; y++) {
        if (y < 0 || y >= GH) continue;
        const brzeg = y === cy - R || y === cy + R;
        for (let x = cx - R; x <= cx + R; x += brzeg ? 1 : 2 * R || 1) {
          if (x < 0 || x >= GW) continue;
          const k = kratki[y * GW + x];
          for (let m = 0; m < k.length; m++) wez(k[m]);
        }
      }
      // Krawędzie spoza przeszukanego kwadratu są dalej niż jego brzeg.
      const granica = Math.min(px - (gx0 + cx - R) * KR, (gx0 + cx + R + 1) * KR - px, py - (gy0 + cy - R) * KR, (gy0 + cy + R + 1) * KR - py);
      if (d2 < granica) break;
      if (cx - R <= 0 && cy - R <= 0 && cx + R >= GW - 1 && cy + R >= GH - 1) break;
    }
  };
  const D = MATERIALY[op.dach], S = MATERIALY[op.sciana];
  const SP = op.steampunk ?? 0;
  // rury na ścianach: [indeks krawędzi, położenie wzdłuż] – ściany widoczne (południe/wschód), dłuższe niż 14 px
  const rury: [number, number, boolean][] = [];
  { const R = rng(op.seed * 7 + 3), wid = E.map((e, i) => [e, i] as const).filter(([e]) => (e.ny > 0.5 || e.nx > 0.5) && e.L > 14);
    const ile = SP >= 3 ? 4 : SP === 2 ? 2 : (SP === 1 || op.rura) ? 1 : 0;
    for (let k = 0; k < ile && wid.length; k++) { const [e, i] = wid[Math.floor(R() * wid.length)]; rury.push([i, 3 + Math.floor(R() * (e.L - 8)), SP >= 2 && R() < 0.6]); } }
  let drzwiI1 = -1;
  if (op.drzwi) { najblizsze(op.drzwi[0], op.drzwi[1]); drzwiI1 = i1; }
  const o = nowy(W, Hh);
  const kind = new Uint8Array(W * Hh); // 1 dach, 2 ściana
  const sOf = new Int16Array(W * Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i, y = y0 + j;
    if (mask[j * W + i]) { kind[j * W + i] = 1; continue; }
    for (let s = 1; s <= H; s++) if (inFP(Math.round(x - s * sk), y - s)) { kind[j * W + i] = 2; sOf[j * W + i] = s; break; }
  }
  const K = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= Hh ? 0 : kind[j * W + i]);
  let maxD = 0; const dd = new Float32Array(W * Hh);
  const qI1 = new Int32Array(W * Hh), qI2 = new Int32Array(W * Hh), qD1 = new Float64Array(W * Hh), qD2 = new Float64Array(W * Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1) { najblizsze(x0 + i + 0.5, y0 + j + 0.5); const k = j * W + i; qI1[k] = i1; qI2[k] = i2; qD1[k] = d1; qD2[k] = d2; const d = d1; dd[j * W + i] = d; maxD = Math.max(maxD, d); }
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const k = kind[j * W + i]; if (!k) continue;
    const x = x0 + i, y = y0 + j; let c: number;
    if (k === 1 && stozek) {
      const dx = x + 0.5 - stozek.cx, dy = y + 0.5 - stozek.cy, r = Math.hypot(dx, dy) || 0.01;
      const nx = dx / r, ny = dy / r, d = Math.max(0, stozek.r - r);
      const lum = -(nx * 0.6 + ny * 0.8);
      let t = lum > 0.45 ? 4 : lum > 0.05 ? 3 : lum > -0.45 ? 2 : 1;
      // Rzędy dachówek w kręgach, spoiny wzdłuż obwodu co ~4 px (gęściej przy okapie, rzadziej przy szczycie).
      const kat = Math.atan2(dy, dx), along = kat * stozek.r;
      if (D.wzor === 'dachowka' || D.wzor === 'gont') { if (Math.floor(d) % 3 === 2 || (Math.floor(along + Math.floor(d / 3) * 2) % 4 === 0 && d > 1)) t = Math.max(0, t - 1); }
      else if (D.wzor === 'lupek') { if (Math.floor(d) % 2 === 1) t = Math.max(0, t - 1); }
      else if (D.wzor === 'blacha') { if (Math.floor(along) % 4 === 0) t = Math.min(4, t + 1); }
      c = D.tony[t];
      if (r < 1.2) c = D.krawedz; // szpic
      if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j - 1) === 0 || K(i - 1, j - 1) === 0 || K(i + 1, j - 1) === 0 || K(i - 1, j + 1) === 0 || K(i + 1, j + 1) === 0 || K(i, j + 1) === 2) c = OBRYS;
    } else if (k === 1) {
      const k = j * W + i, q = { i1: qI1[k], i2: qI2[k], d1: qD1[k], d2: qD2[k] }, e = E[q.i1], d = q.d1;
      const [gnx, gny] = gladkaNormalna(e, x + 0.5, y + 0.5);
      const lum = -(gnx * 0.6 + gny * 0.8);
      let t = lum > 0.45 ? 4 : lum > 0.05 ? 3 : lum > -0.45 ? 2 : 1;
      const along = (x + 0.5 - e.ax) * e.ux + (y + 0.5 - e.ay) * e.uy;
      switch (D.wzor) {
        case 'dachowka': if (Math.floor(d) % 3 === 2) t = Math.max(0, t - 1); else if (Math.floor(along + Math.floor(d / 3) * 2) % 4 === 0 && d > 1) t = Math.max(0, t - 1); break;
        case 'lupek': if (Math.floor(d) % 2 === 1 || Math.floor(along + (Math.floor(d / 2) % 2) * 2 + 400) % 4 === 0) t = Math.max(0, t - 1); break;
        case 'gont': if (Math.floor(d) % 2 === 1 || Math.floor(along + (Math.floor(d / 2) % 3)) % 3 === 0) t = Math.max(0, t - 1); break;
        case 'blacha': if (Math.floor(along) % 4 === 0) t = Math.min(4, t + 1); break;
      }
      c = D.tony[t];
      if (PLASKI) { // dach płaski (wysokie budynki): attyka – jasny brzeg, ciemny pas cienia pod nią, papa z lekką fakturą, świetliki
        const P = DACHY_PLASKIE[op.seed % DACHY_PLASKIE.length];
        c = d < 1.5 ? P[4] : d < 2.5 ? (lum > 0.05 ? P[3] : P[0]) : d < 3.5 && lum > 0.05 ? P[1] : (hash(x >> 1, y >> 1, op.seed) < 0.08 ? P[3] : P[2]);
        if (d > 6 && Math.floor(x / 9) % 3 === 0 && Math.floor(y / 6) % 4 === 1 && (x % 9) < 4 && (y % 6) < 3) c = (y % 6) === 0 ? P[4] : SZYBA[1];
      } else {
      const ea = E[q.i1], eb = E[q.i2], dot = ea.nx * eb.nx + ea.ny * eb.ny;
      if (Math.abs(q.d1 - q.d2) < 0.75 && d > 1 && dot < LAGODNIE) c = dot < -0.5 ? D.krawedz : D.tony[Math.min(4, t + 1)]; // kalenica / naroże (na łuku bez linii)
      if (dot > -0.5 && dot < 0.5 && Math.abs(q.d1 - q.d2) < 0.75 && ((ea.nx * (eb.ax - ea.ax) + ea.ny * (eb.ay - ea.ay)) > 0)) c = D.tony[0]; // kosz (wklęsły narożnik L/U)
      }
      // Obrys domknięty także po skosie (na ukośnych krawędziach nie wychodzi przerywany).
      if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j - 1) === 0 || K(i - 1, j - 1) === 0 || K(i + 1, j - 1) === 0 || K(i - 1, j + 1) === 0 || K(i + 1, j + 1) === 0 || K(i, j + 1) === 2) c = OBRYS;
    } else {
      const s = sOf[j * W + i], hh = H - s, px = x - s * sk, py = y - s;
      najblizsze(px + 0.5, py + 0.5); const q = { i1 }, e = E[q.i1];
      let t = e.nx < -0.35 ? 3 : e.nx > 0.35 ? 1 : 2;
      const along = (px - e.ax) * e.ux + (py - e.ay) * e.uy;
      if (S.wzor === 'cegla') { if (hh % 3 === 0 || (Math.floor(along + (Math.floor(hh / 3) % 2) * 2) % 4 === 0 && hash(Math.floor(along), hh, 7) < 0.6)) t = Math.max(0, t - 1); }
      else if (S.wzor === 'deski') { if (Math.floor(along) % 3 === 0) t = Math.max(0, t - 1); }
      else if (S.wzor === 'kamien') { if ((hh % 4 === 0) || Math.floor(along + (Math.floor(hh / 4) % 2) * 3) % 6 === 0) t = Math.max(0, t - 1); }
      else if (hash(x, y, op.seed) < 0.1) t = Math.min(4, t + 1);
      c = S.tony[t];
      let okno = false;
      if (op.poziom === undefined) { // stary układ: rzędy małych okien co 7 px wysokości, co 7 px wzdłuż ściany, z dala od narożników
        const pietra = H >= 14 ? 2 : 1;
        for (let f = 0; f < pietra; f++) {
          const lo = 3 + f * 7, m = Math.floor(along + (op.seed % 5)) % 7;
          if (hh >= lo && hh <= lo + 3 && m >= 2 && m <= 4 && along > 3 && along < e.L - 3) {
            const id = Math.floor((along + (op.seed % 5)) / 7) * 3 + f, swieci = !!op.noc && hash(id, f, op.seed) < 0.45;
            c = swieci ? (hh === lo + 3 || m === 2 ? SWIATLO[1] : SWIATLO[0]) : (hh === lo + 3 && m === 2 ? SZYBA[1] : SZYBA[0]);
            okno = true;
          }
          if (hh === lo - 1 && m >= 2 && m <= 4 && along > 3 && along < e.L - 3) c = S.tony[4];
        }
        if (op.drzwi) { const [dx, dy] = op.drzwi; if (drzwiI1 === q.i1) { const da = (dx - e.ax) * e.ux + (dy - e.ay) * e.uy; if (Math.abs(along - da) <= 2 && hh <= 6) { c = hh === 6 || Math.abs(along - da) > 1.5 ? hex('#3a2416') : hex('#6a4426'); okno = true; } } }
      } else {
      // ——— poziomy gry (decyzja właściciela 6.10): 1–3 piętra OSM = jeden duży poziom; okna wielkie jak dla bohatera ———
      const L = Math.max(10, op.poziom), NP = Math.max(1, Math.round(H / L));
      const f = Math.min(NP - 1, Math.floor(hh / L)), hl = hh - f * L;
      const ww = Math.max(4, Math.round(L * 0.4)), wh = Math.max(5, Math.round(L * 0.55)), wb = Math.round(L * 0.24) + (f === 0 ? 1 : 0);
      const pt = Math.max(ww + 6, Math.round(L * 1.15)), off = op.seed % pt, al = Math.floor(along);
      const m = (((al + off) % pt) + pt) % pt, wx = Math.floor((pt - ww) / 2), u = m - wx, v = hl - wb, nr = Math.floor((al + off) / pt);
      const okCale = al - u > 2 && al - u + ww < e.L - 2;
      const ciemnaSciana = S.wzor === 'cegla' || S.wzor === 'kamien' || S.wzor === 'deski';
      const RAMA = ciemnaSciana ? hex('#e6dcc6') : hex('#4e3424'), BELKA = [hex('#3a2618'), hex('#5a3c26')];
      const szach = !PLASKI && S.wzor === 'gladki' && hash(op.seed, 3, 11) < 0.45; // mur pruski (karczma)
      const okiennice = !PLASKI && !szach && L <= 21 && hash(op.seed, 5, 13) < 0.5, OKIENNICA = [hex('#2f4a36'), hex('#3f6046'), hex('#6a3a2a'), hex('#8a4c34')];
      const ok = op.seed % 2 ? 0 : 2;
      // drzwi (parter): łukowe, z desek, w kamiennej opasce – okna obok drzwi znikają
      let przyDrzwiach = false;
      if (op.drzwi && f === 0 && drzwiI1 === q.i1) {
        const [dx, dy] = op.drzwi;
        const da = (dx - e.ax) * e.ux + (dy - e.ay) * e.uy, dw = Math.max(5, Math.round(L * 0.5)) | 1, dh = Math.round(L * 0.8), du = along - (da - dw / 2);
        if (Math.abs(al - u + ww / 2 - da) < (ww + dw) / 2 + 3) przyDrzwiach = true;
        const lukY = dh - dw / 2, wDrzwiach = (pd: number) => du >= -pd && du < dw + pd && (hh < lukY || Math.hypot(du - (dw - 1) / 2, hh - lukY) <= dw / 2 + pd);
        if (wDrzwiach(1)) { okno = true; c = wDrzwiach(0) ? (Math.floor(du) % 3 === 0 ? BELKA[0] : hex('#6a4426')) : S.tony[4];
          if (wDrzwiach(0) && Math.floor(du) === dw - 2 && hh === Math.round(dh * 0.45)) c = MOSIADZ[3]; if (hh === 0) c = hex('#8a847c'); } }
      if (!okno) {
        if (hh <= 1) c = hh === 0 ? hex('#4c4848') : hex('#6a6462'); // cokół
        else if (f < NP - 1 && hl === L - 1) c = S.tony[0]; // gzyms między poziomami
        else if (f < NP - 1 && hl === L - 2) c = S.tony[4];
        if (szach && hh > 1 && !(u >= -1 && u <= ww && v >= -1 && v <= wh)) { // belki: poziome na granicach, słupki przy oknach, zastrzały między nimi
          const gx = m - (wx + ww + 2), g = pt - ww - 4;
          if (hl <= 1 || hl >= L - 2 || u === -2 || u === ww + 1) c = BELKA[hl <= 1 || u === -2 ? 0 : 1];
          else if (g >= 4 && gx >= 0 && gx < g && Math.abs(((nr % 2 ? gx : g - 1 - gx) / (g - 1)) * (L - 4) - (hl - 2)) < 0.9) c = BELKA[0];
        }
        if (okiennice && okCale && !przyDrzwiach && v >= 0 && v < wh && (u === -3 || u === -2 || u === ww + 1 || u === ww + 2)) c = OKIENNICA[ok + (v % 2 ? 0 : 1)];
        if (okCale && !(przyDrzwiach && f === 0)) {
          if (u >= 0 && u < ww && v >= 0 && v < wh) { okno = true;
            const bul = SP >= 2 && f >= 1 && hash(nr, f, op.seed + 5) < 0.3;
            if (bul) { const d = Math.hypot(u - (ww - 1) / 2, v - (wh - 1) / 2), r = Math.min(ww, wh) / 2; c = d > r ? c : d > r - 1.3 ? MOSIADZ[u + v < ww ? 3 : 1] : op.noc ? SWIATLO[0] : SZYBA[d < r * 0.5 && u < ww / 2 ? 1 : 0]; if (d > r) okno = false; }
            else if (u === 0 || u === ww - 1 || v === 0 || v === wh - 1 || u === ww >> 1 || v === Math.floor(wh * 0.55)) c = RAMA;
            else { const swieci = !!op.noc && hash(nr, f, op.seed) < 0.45; c = swieci ? (u + (wh - v) < 5 ? SWIATLO[1] : SWIATLO[0]) : (u - 1 + (wh - 2 - v) < 3 ? SZYBA[1] : SZYBA[0]); }
          } else if (v === -1 && u >= -1 && u <= ww) c = S.tony[4]; // parapet
          else if (v === -2 && u >= 0 && u < ww) c = S.tony[0];
          else if (v === wh && u >= -1 && u <= ww) c = ciemnaSciana ? S.tony[0] : S.tony[1]; // nadproże
        }
      }
      }
      // rura
      for (const [ei, ra, zawor] of rury) if (ei === q.i1 && along >= ra && along < ra + 3) { c = MOSIADZ[along < ra + 1 ? 3 : along < ra + 2 ? 2 : 0]; if (hh % 5 === 2) c = MOSIADZ[0]; if (zawor && hh === Math.floor(H / 2)) c = hex('#b2453a'); if (zawor && hh === Math.floor(H / 2) + 1 && along < ra + 1) c = hex('#ece6d6'); okno = true; }
      // okno-bulaj (okrągłe, mosiężne) na budynkach steampunkowych
      if (op.poziom === undefined && okno && SP >= 2 && c !== MOSIADZ[0] && c !== MOSIADZ[1] && c !== MOSIADZ[3]) { const m = Math.floor(along + (op.seed % 5)) % 7, f = H >= 14 && hh > 9 ? 1 : 0, lo = 3 + f * 7;
        if (hh >= lo && hh <= lo + 3 && m >= 2 && m <= 4 && hash(Math.floor((along + (op.seed % 5)) / 7), f, op.seed + 5) < 0.3) { const cx = 3, cy = lo + 1.5, d = Math.hypot(m - cx, hh - cy); c = d > 1.2 ? MOSIADZ[2] : (op.noc ? SWIATLO[0] : SZYBA[1]); } }
      if (!okno && K(i, j - 1) === 1) c = S.tony[0];
      if (hh === 0) c = S.tony[0];
      if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j + 1) === 0 || K(i - 1, j + 1) === 0 || K(i + 1, j + 1) === 0) c = OBRYS;
    }
    o.px[j * W + i] = c;
  }
  if (op.komin && maxD > 6) { // komin ceglany w ok. 1/3 od lewej-góry
    let best = -1, bx = 0, by = 0;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1 && dd[j * W + i] > 3 && dd[j * W + i] < maxD - 1.5) { const sc = -Math.abs(i - W * 0.4) - Math.abs(j - Hh * 0.3) + hash(i, j, op.seed) * 6; if (sc > best) { best = sc; bx = i; by = j; } }
    const C = MATERIALY.cegla.tony;
    for (let j = -5; j <= 0; j++) for (let i = 0; i < 4; i++) {
      const c = j === -5 ? OBRYS : i === 0 ? C[3] : i === 3 ? C[1] : j === -4 ? C[0] : C[2];
      const yy = by + j, xx = bx + i; if (yy >= 0 && xx < W) o.px[yy * W + xx] = (i === 0 || i === 3) && j > -5 ? mieszaj(c, OBRYS, i === 3 ? 0.5 : 0) : c;
    }
  }
  const para: [number, number, number][] = [];
  const put = (i: number, j: number, c: number) => { if (i >= 0 && j >= 0 && i < W && j < Hh) o.px[j * W + i] = c; };
  /** Pionowa rura wystająca ponad dach (3 px), z kołnierzem i kolanem; opcjonalnie para z wylotu. */
  const rurka = (i: number, j: number, wys: number, wPrawo: boolean, zPara: number) => {
    for (let k = 0; k < wys; k++) { put(i - 1, j - k, OBRYS); put(i, j - k, MOSIADZ[3]); put(i + 1, j - k, MOSIADZ[2]); put(i + 2, j - k, MOSIADZ[0]); put(i + 3, j - k, OBRYS); if (k % 5 === 3) { put(i, j - k, MOSIADZ[1]); put(i + 1, j - k, MOSIADZ[1]); put(i + 2, j - k, MOSIADZ[0]); } }
    const t = j - wys, d = wPrawo ? 1 : -1;
    for (let k = 0; k < 5; k++) { const ii = i + 1 + d * k; put(ii, t - 1, OBRYS); put(ii, t, MOSIADZ[3]); put(ii, t + 1, MOSIADZ[1]); put(ii, t + 2, OBRYS); }
    const ko = i + 1 + d * 5; for (let k = -1; k <= 2; k++) put(ko, t + k, MOSIADZ[k === -1 || k === 2 ? 0 : 2]);
    if (zPara) para.push([x0 + ko, y0 + t - 1, zPara]);
  };
  // rury ze ścian wystają ponad krawędź dachu
  if (SP >= 1) rury.forEach(([ei, ra], k) => { const e = E[ei]; const px = e.ax + e.ux * (ra + 1), py = e.ay + e.uy * (ra + 1);
    rurka(Math.round(px - x0) - 1, Math.round(py - y0), SP >= 3 ? 12 : 8, k % 2 === 0, SP >= 2 && k % 2 === 0 ? (SP >= 3 ? 32 : 24) : 0); });
  if (op.komin && maxD > 6 && SP >= 1) { /* para z komina ceglanego: szukamy jego miejsca jeszcze raz (ten sam wybór) */
    let best = -1, bx = 0, by = 0;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1 && dd[j * W + i] > 3 && dd[j * W + i] < maxD - 1.5) { const sc = -Math.abs(i - W * 0.4) - Math.abs(j - Hh * 0.3) + hash(i, j, op.seed) * 6; if (sc > best) { best = sc; bx = i; by = j; } }
    para.push([x0 + bx + 2, y0 + by - 7, SP >= 3 ? 32 : SP === 2 ? 24 : 16]);
  }
  if (SP >= 1 || op.ozdoby) ozdoby();
  const RP = rng(op.seed * 61 + 5), czynne = (op.steampunk ?? 0) >= 3 ? 0.55 : 0.4;
  const zrodla: ZrodloPary[] = para.map(([x, y, r]) => { const dziala = RP() < czynne; return { x, y, rozmiar: r, okres: dziala ? 5 + RP() * 9 : 0, faza: RP() * 14, czas: 0.8 + RP() * 0.8 }; });
  return { obraz: o, x0, y0, para: zrodla };

  /**
   * Katalog ozdób steampunku (decyzja właściciela 5.10: „nie ograniczaj się do rur”). Losowany zestaw wg poziomu:
   * 1 → 1–2 drobne, 2 → 3–5, 3 → 6–9 (w tym duże na dachu). Każda ozdoba w rzucie gry, z obrysem, światło z lewej-góry.
   */
  function ozdoby() {
    const R = rng(op.seed * 131 + 7);
    const I = hex('#2a2630'), I2 = hex('#3a3440'), I3 = hex('#55505c'), I4 = hex('#6e6878'), CZ = hex('#b2453a'), CZ2 = hex('#7a2a24'), BIEL = hex('#ece6d6'),
      MIEDZ = [hex('#5a2e18'), hex('#8a4a26'), hex('#b8683a'), hex('#d89058')], SZKLO = hex('#8ab8c8'), SZKLO2 = hex('#4a7088');
    const pd = E.map((e, i) => ({ e, i })).filter(({ e }) => e.ny > 0.5 && e.L > 9); // ściany od południa (najlepiej widać)
    const sciany = pd.length ? pd : E.map((e, i) => ({ e, i })).filter(({ e }) => e.nx > 0.5 && e.L > 9);
    const dach: [number, number][] = []; for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1 && dd[j * W + i] > 3.5) dach.push([i, j]);
    const zajete: [number, number][] = [];
    const wolne = (i: number, j: number, r: number) => !zajete.some(([a, b]) => Math.abs(a - i) < r && Math.abs(b - j) < r);
    /** punkt na ścianie (krawędź, położenie wzdłuż, wysokość nad ziemią) → piksel obrazu */
    const wpt = (e: typeof E[number], along: number, hh: number): [number, number] => [Math.round(e.ax + e.ux * along + (H - hh) * sk - x0), Math.round(e.ay + e.uy * along + (H - hh) - y0)];
    const naScianie = (): [typeof E[number], number] | null => { if (!sciany.length) return null; for (let k = 0; k < 6; k++) { const { e } = sciany[Math.floor(R() * sciany.length)]; const al = 3 + R() * (e.L - 6); const [i, j] = wpt(e, al, H / 2); if (wolne(i, j, 6)) { zajete.push([i, j]); return [e, al]; } } return null; };
    const naDachu = (r: number): [number, number] | null => { for (let k = 0; k < 10 && dach.length; k++) { const [i, j] = dach[Math.floor(R() * dach.length)]; if (wolne(i, j, r)) { zajete.push([i, j]); return [i, j]; } } return null; };
    const kolo = (ci: number, cj: number, r: number, f: (d: number, i: number, j: number) => number | 0) => { for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { const d = Math.hypot(i, j); if (d > r + 0.3) continue; const c = f(d, i, j); if (c) put(ci + i, cj + j, c); } };

    // ——— na ścianie ———
    const manometr = () => { const w = naScianie(); if (!w) return; const [i, j] = wpt(w[0], w[1], Math.max(5, H - 5));
      for (let k = 1; k <= 3; k++) put(i, j + k, MOSIADZ[1]);
      kolo(i, j, 3.6, (d, a, b) => d > 3.1 ? OBRYS : d > 2.2 ? (a + b < 0 ? MOSIADZ[3] : MOSIADZ[1]) : (a === 1 && b === -1) || (a === 0 && b === 0) || (a === 2 && b === -2) ? CZ2 : BIEL); };
    const zawor = () => { const w = naScianie(); if (!w) return; const [i, j] = wpt(w[0], w[1], 3 + Math.floor(R() * 4));
      for (let k = 0; k < 4; k++) { put(i + k - 4, j + 2, MOSIADZ[2]); put(i + k - 4, j + 3, MOSIADZ[0]); } kolo(i, j - 1, 3.6, (d, a, b) => d > 3.1 ? OBRYS : d > 2.1 ? (a + b < 0 ? hex('#d86a52') : CZ) : (a === 0 || b === 0 || a === b) ? CZ2 : 0); put(i, j - 1, MOSIADZ[3]); };
    const zegar = () => { const w = naScianie(); if (!w || H < 10) return; const [i, j] = wpt(w[0], w[1], H - 5);
      kolo(i, j, 4.4, (d, a, b) => d > 4 ? OBRYS : d > 3 ? (a + b < 0 ? MOSIADZ[3] : MOSIADZ[1]) : (a === 0 && b <= 0 && b >= -3) || (b === 0 && a >= 0 && a <= 2) ? OBRYS : hex('#f2ead2')); };
      const zebatka = () => { const w = naScianie(); if (!w) return; const [i, j] = wpt(w[0], w[1], H / 2);
      kolo(i, j, 4.8, (d, a, b) => { const ang = Math.atan2(b, a), zab = Math.cos(ang * 8) > 0.3; if (d > (zab ? 4.6 : 3.6)) return 0; if (d < 1.4) return OBRYS; return d > 3.2 ? MOSIADZ[a + b < 0 ? 2 : 0] : MOSIADZ[a + b < 0 ? 3 : 1]; }); };
    const lampa = () => { const w = naScianie(); if (!w) return; const [i, j] = wpt(w[0], w[1], Math.max(5, H - 3));
      for (let a = 0; a < 4; a++) put(i + a, j, I); put(i + 3, j - 1, I); for (let b = 1; b <= 6; b++) for (let a = 1; a <= 5; a++) put(i + a, j + b, a === 1 || a === 5 || b === 1 || b === 6 ? OBRYS : b === 2 ? MOSIADZ[2] : op.noc ? SWIATLO[1] : (a === 2 ? hex('#fff0b0') : hex('#e8d090'))); put(i + 3, j + 7, MOSIADZ[0]); };
    const rurkiPoziome = () => { const w = naScianie(); if (!w) return; const [e, al] = w, hh = 2 + Math.floor(R() * 3), dl = Math.min(e.L - al - 2, 10 + R() * 14);
      for (let t = 0; t < dl; t++) { const [i, j] = wpt(e, al + t, hh); put(i, j - 1, OBRYS); put(i, j, MOSIADZ[3]); put(i, j + 1, MOSIADZ[1]); put(i, j + 2, OBRYS); if (Math.floor(t) % 6 === 0) { put(i, j, MOSIADZ[0]); put(i, j + 1, MOSIADZ[0]); } } };
    const spodZiemi = () => { const w = naScianie(); if (!w) return; const [e, al] = w; const [gi, gj] = wpt(e, al, 0); const bi = gi + Math.round(e.nx * 4), bj = gj + Math.round(Math.max(e.ny, 0.3) * 4);
      kolo(bi, bj + 1, 2.6, (d) => (d > 2 ? OBRYS : d > 1.2 ? I3 : hex('#14121a')));
      for (let k = 0; k <= 4; k++) { put(bi - 1, bj - k, OBRYS); put(bi, bj - k, MOSIADZ[3]); put(bi + 1, bj - k, MOSIADZ[1]); put(bi + 2, bj - k, OBRYS); }
      for (let t = 0; t <= 4; t++) { const ii = bi + Math.round((gi - bi) * t / 4), jj = bj - 4 + Math.round((gj - 4 - (bj - 4)) * t / 4); put(ii, jj - 1, OBRYS); put(ii, jj, MOSIADZ[2]); put(ii, jj + 1, MOSIADZ[0]); }
      put(bi, bj - 2, MOSIADZ[0]); put(bi + 1, bj - 2, MOSIADZ[0]); if (R() < 0.5) para.push([x0 + bi, y0 + bj - 2, 16]); };
    const zbiornik = () => { const w = naScianie(); if (!w) return; const [e, al] = w; const [gi, gj] = wpt(e, al, 0); const bi = gi + Math.round(e.nx * 4) - 3, bj = gj + 3;
      for (let b = -12; b <= 0; b++) for (let a = 0; a < 7; a++) { const kraw = a === 0 || a === 6 || b === -12 || b === 0; const t = a < 2 ? 3 : a < 4 ? 2 : a < 6 ? 1 : 0; put(bi + a, bj + b, kraw ? OBRYS : (b === -9 || b === -3) ? MOSIADZ[0] : (b === -10 && a % 2) ? MOSIADZ[3] : MOSIADZ[t]); }
      for (let a = 1; a < 6; a++) put(bi + a, bj - 13, MOSIADZ[a < 3 ? 3 : 1]); put(bi + 3, bj - 14, OBRYS);
      kolo(bi + 3, bj - 6, 1.6, (d) => (d > 1.2 ? OBRYS : BIEL)); };
    const kratka = () => { const w = naScianie(); if (!w) return; const [e, al] = w; const [gi, gj] = wpt(e, al, 0); const bi = gi + Math.round(e.nx * 5), bj = gj + 4;
      for (let b = 0; b < 5; b++) for (let a = 0; a < 9; a++) put(bi + a, bj + b, a === 0 || b === 0 || a === 8 || b === 4 ? OBRYS : a % 2 ? I : I3); para.push([x0 + bi + 3, y0 + bj, 16]); };
    const poczta = () => { const w = naScianie(); if (!w) return; const [e, al] = w;
      for (let hh = 0; hh <= H; hh++) { const [i, j] = wpt(e, al, hh); put(i - 1, j, OBRYS); put(i, j, hh % 4 === 0 ? MOSIADZ[2] : SZKLO); put(i + 1, j, hh % 4 === 0 ? MOSIADZ[0] : SZKLO2); put(i + 2, j, OBRYS); }
      const [i, j] = wpt(e, al, 3); for (let b = -1; b <= 2; b++) for (let a = -1; a <= 3; a++) put(i + a, j + b, a === -1 || a === 3 || b === -1 || b === 2 ? OBRYS : MOSIADZ[b < 1 ? 3 : 1]); };
    // ——— na dachu ———
    const kociol = () => { const m = naDachu(10); if (!m) return; const [ki, kj] = m, kw = SP >= 3 ? 16 : 12, kh = SP >= 3 ? 9 : 7;
      for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++) { const brzeg = j === 0 || j === kh - 1 || i === 0 || i === kw - 1; const t = j < kh * 0.3 ? 3 : j < kh * 0.55 ? 2 : j < kh * 0.8 ? 1 : 0;
        put(ki - 6 + i, kj - 7 + j, brzeg ? OBRYS : (i === 3 || i === kw - 4) ? MOSIADZ[0] : (j === 2 && i % 3 === 1) ? MOSIADZ[3] : MOSIADZ[t]); }
      put(ki - 4, kj, OBRYS); put(ki + 3, kj, OBRYS); kolo(ki - 2, kj - 4, 1.6, (d) => (d > 1.2 ? OBRYS : BIEL));
      rurka(ki + kw - 8, kj - kh, 7, true, SP >= 3 ? 32 : 24); };
    const kominZel = () => { const m = naDachu(6); if (!m) return; const [ri, rj] = m;
      for (let jj = -14; jj <= 0; jj++) for (let ii = -1; ii < 4; ii++) put(ri + ii - 1, rj + jj, ii === -1 || ii === 3 ? OBRYS : jj <= -13 ? MOSIADZ[3] : jj === -6 ? MOSIADZ[1] : ii === 0 ? I4 : ii === 2 ? I : I2);
      para.push([x0 + ri, y0 + rj - 15, 32]); };
    const wentylator = () => { const m = naDachu(6); if (!m) return; const [wi, wj] = m;
      kolo(wi, wj, 5, (d, ii, jj) => (d > 4.5 ? OBRYS : d > 3.6 ? MOSIADZ[ii + jj < 0 ? 3 : 1] : d < 1 ? MOSIADZ[2] : (Math.abs(ii - jj) <= 0.5 || Math.abs(ii + jj) <= 0.5 || ii === 0 || jj === 0) ? I4 : I)); };
    const luneta = () => { const m = naDachu(8); if (!m) return; const [i, j] = m;
      for (const [a, b] of [[-3, 0], [3, 0], [0, 2]]) for (let k = 0; k <= 4; k++) put(i + Math.round(a * k / 4), j - 4 + Math.round((b + 4) * k / 4), I); // trójnóg
      for (let k = 0; k < 16; k++) { const ii = i - 5 + k, jj = j - 4 - Math.round(k * 0.55); const g = k > 10 ? 1 : 0; put(ii, jj - 1 - g, OBRYS); put(ii, jj - g, MOSIADZ[3]); put(ii, jj, k < 4 ? MOSIADZ[1] : MOSIADZ[2]); put(ii, jj + 1, MOSIADZ[0]); put(ii, jj + 2, OBRYS); if (k % 5 === 4) { put(ii, jj, MOSIADZ[0]); put(ii, jj + 1, OBRYS); } }
      put(i + 11, j - 13, SZKLO); put(i + 11, j - 12, SZKLO2); put(i + 11, j - 11, SZKLO2); put(i - 6, j - 3, OBRYS); put(i - 6, j - 4, MOSIADZ[0]); };
    const kopula = () => { const m = naDachu(11); if (!m) return; const [i, j] = m;
      for (let b = -2; b <= 0; b++) for (let a = -7; a <= 7; a++) put(i + a, j + b, a === -7 || a === 7 || b === 0 ? OBRYS : I3);
      kolo(i, j - 3, 6.4, (d, a, b) => (b > 0 ? 0 : d > 5.9 ? OBRYS : (a === 1 || a === 2) && b < -1 ? hex('#14121a') : MIEDZ[Math.max(0, Math.min(3, Math.round(1.6 - (a + b) / 4)))])); };
    const zbiornikWody = () => { const m = naDachu(8); if (!m) return; const [i, j] = m;
      for (const a of [-3, 3]) for (let k = 0; k < 6; k++) put(i + a, j - k, I);
      for (let b = -14; b <= -6; b++) for (let a = -4; a <= 4; a++) put(i + a, j + b, a === -4 || a === 4 || b === -14 || b === -6 ? OBRYS : (b === -12 || b === -8) ? I2 : hex(['#765436', '#926c46', '#ae8858', '#5a3e28'][a < -1 ? 2 : a < 2 ? 1 : 0])); };
    const antena = () => { const m = naDachu(6); if (!m) return; const [i, j] = m;
      for (let k = 0; k < 14; k++) { put(i - 2, j - k, OBRYS); put(i - 1, j - k, k % 2 ? MIEDZ[3] : MIEDZ[1]); put(i, j - k, k % 2 ? MIEDZ[3] : MIEDZ[1]); put(i + 1, j - k, k % 2 ? MIEDZ[2] : MIEDZ[0]); put(i + 2, j - k, OBRYS); }
      kolo(i, j - 17, 3.2, (d, a, b) => (d > 2.7 ? OBRYS : a + b < -1 ? hex('#f0f4ff') : SZKLO)); for (const [a, b] of [[4, -20], [5, -21], [-4, -18], [-5, -19], [3, -14]]) put(i + a, j + b, hex('#d8e8ff')); };
    const swietlik = () => { const m = naDachu(7); if (!m) return; const [i, j] = m;
      kolo(i, j, 5.6, (d, a, b) => { const zab = Math.cos(Math.atan2(b, a) * 10) > 0.2; if (d > (zab ? 5.6 : 4.6)) return 0; return d > 3.8 ? MOSIADZ[a + b < 0 ? 3 : 1] : d > 3.2 ? OBRYS : (a + b < -1 ? SZKLO : SZKLO2); }); };
    const anemometr = () => { const m = naDachu(6); if (!m) return; const [i, j] = m;
      for (let k = 0; k < 13; k++) { put(i, j - k, I3); put(i + 1, j - k, I); }
      for (let a = -5; a <= 6; a++) put(i + a, j - 13, I3);
      for (const [a, b] of [[-6, -14], [6, -14], [0, -17]]) kolo(i + a, j + b, 1.8, (d, x) => (d > 1.4 ? OBRYS : x < 0 ? MOSIADZ[3] : MOSIADZ[1])); };

    const drobne = [manometr, zawor, lampa, rurkiPoziome, spodZiemi, kratka, zebatka];
    const srednie = [zegar, zbiornik, poczta, kociol, wentylator, swietlik, spodZiemi, manometr];
    const duze = [luneta, kopula, zbiornikWody, antena, kominZel, anemometr, kociol];
    const losuj = (lista: (() => void)[], n: number) => { const l = lista.slice(); for (let k = 0; k < n && l.length; k++) l.splice(Math.floor(R() * l.length), 1)[0](); };
    if (op.ozdoby) { const mapa: Record<string, () => void> = { manometr, zawor, lampa, rurki_poziome: rurkiPoziome, rura_spod_ziemi: spodZiemi, kratka_z_para: kratka, zebatka, zegar, zbiornik_przy_scianie: zbiornik, poczta_pneumatyczna: poczta, kociol, wentylator, swietlik_zebaty: swietlik, luneta, kopula_obserwatorium: kopula, zbiornik_wody: zbiornikWody, antena_tesli: antena, komin_zelazny: kominZel, anemometr }; op.ozdoby.forEach((n) => mapa[n]?.()); return; }
    if (SP === 1) losuj(drobne, 1 + (R() < 0.5 ? 1 : 0));
    if (SP === 2) { losuj(srednie, 2 + Math.floor(R() * 2)); losuj(drobne, 1 + Math.floor(R() * 2)); }
    if (SP === 3) { losuj(duze, 2 + Math.floor(R() * 2)); losuj(srednie, 2 + Math.floor(R() * 2)); losuj(drobne, 2 + Math.floor(R() * 2)); }
  }
}

/** Cień rzucany w prawo-w dół: wpisuje 1 do `maska` (w×h, lewy-górny róg w świecie = (mx, my)) tam, gdzie pada cień budynku.
 *  Liczone przez rasteryzację obrysu i przesuwanie maski – szybkie (tylko obszar budynku). */
export function cienBudynku(pierscien: number[], wysokosc: number, maska: Uint8Array, mw: number, mh: number, mx: number, my: number) {
  const n = pierscien.length / 2;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i < n; i++) { minX = Math.min(minX, pierscien[2 * i]); maxX = Math.max(maxX, pierscien[2 * i]); minY = Math.min(minY, pierscien[2 * i + 1]); maxY = Math.max(maxY, pierscien[2 * i + 1]); }
  const x0 = Math.floor(minX), y0 = Math.floor(minY), W = Math.ceil(maxX) - x0 + 1, H = Math.ceil(maxY) - y0 + 1;
  const fp = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    const py = y0 + j + 0.5, xs: number[] = [];
    for (let i = 0; i < n; i++) { const ax = pierscien[2 * i], ay = pierscien[2 * i + 1], bx = pierscien[(2 * i + 2) % (2 * n)], by = pierscien[(2 * i + 3) % (2 * n)]; if ((ay > py) !== (by > py)) xs.push(ax + ((py - ay) * (bx - ax)) / (by - ay)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) { const i = x - x0; if (i >= 0 && i < W) fp[j * W + i] = 1; }
  }
  const Hs = Math.round(wysokosc * 0.9);
  for (let k = 1; k <= Hs; k++) {
    const dx = k, dy = Math.round(k * 0.5);
    for (let j = 0; j < H; j++) { const yy = y0 + j + dy - my; if (yy < 0 || yy >= mh) continue;
      for (let i = 0; i < W; i++) { if (!fp[j * W + i]) continue; const xx = x0 + i + dx - mx; if (xx >= 0 && xx < mw) maska[yy * mw + xx] = 1; } }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (fp[j * W + i]) { const yy = y0 + j - my, xx = x0 + i - mx; if (xx >= 0 && yy >= 0 && xx < mw && yy < mh) maska[yy * mw + xx] = 0; }
}

/** Kąty „pikselowe” (stopnie): krawędzie pod tymi kątami wychodzą w pixel arcie jako równe schodki. */
export const KATY_PIKSELOWE = [0, 26.565, 45, 63.435, 90, 116.565, 135, 153.435];

/**
 * Przyciąga budynek z OSM do najbliższego dozwolonego kąta (obrót wokół środka) i opcjonalnie
 * zamienia obrys na prostokąt o wymiarach zaokrąglonych do siatki (`siatka` px) – budynki stają się
 * powtarzalnymi „klockami”. Zwraca nowy pierścień. Najlepiej liczyć raz w build-map, nie w telefonie.
 */
export function przyciagnij(pierscien: number[], opcje: { katy?: number[]; prostokat?: boolean; siatka?: number } = {}) {
  const katy = opcje.katy ?? KATY_PIKSELOWE, siatka = opcje.siatka ?? 4, n = pierscien.length / 2;
  let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += pierscien[2 * i]; cy += pierscien[2 * i + 1]; } cx /= n; cy /= n;
  // kierunek budynku = kierunek najdłuższej ściany
  let best = -1, ang = 0;
  for (let i = 0; i < n; i++) { const dx = pierscien[(2 * i + 2) % (2 * n)] - pierscien[2 * i], dy = pierscien[(2 * i + 3) % (2 * n)] - pierscien[2 * i + 1]; const L = dx * dx + dy * dy; if (L > best) { best = L; ang = Math.atan2(dy, dx); } }
  let deg = ((ang * 180) / Math.PI % 180 + 180) % 180, cel = katy[0], bd = 999;
  for (const k of katy.concat([180])) { const d = Math.abs(deg - k); if (d < bd) { bd = d; cel = k % 180; } }
  const delta = ((cel - deg) * Math.PI) / 180, co = Math.cos(delta), si = Math.sin(delta);
  const out: number[] = [];
  for (let i = 0; i < n; i++) { const x = pierscien[2 * i] - cx, y = pierscien[2 * i + 1] - cy; out.push(cx + x * co - y * si, cy + x * si + y * co); }
  if (!opcje.prostokat) return out;
  // prostokąt w obróconym układzie: wymiary z rzutów, zaokrąglone do siatki, ta sama powierzchnia ±
  const a = (cel * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (let i = 0; i < n; i++) { const x = out[2 * i] - cx, y = out[2 * i + 1] - cy, u = x * ux + y * uy, v = x * vx + y * vy; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const W = Math.max(siatka * 2, Math.round((u1 - u0) / siatka) * siatka), H = Math.max(siatka * 2, Math.round((v1 - v0) / siatka) * siatka);
  const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
  const P = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
  return P.flatMap(([u, v]) => [cx + (mu + u) * ux + (mv + v) * vx, cy + (mu + u) * uy + (mv + v) * vy]);
}

/** Upraszcza zamknięty pierścień (Douglas–Peucker): punkty bliżej niż `tol` od prostej znikają. */
export function uprosc(r: number[], tol: number): number[] {
  const n = r.length / 2;
  if (n <= 4) return r;
  // Dzielimy w najdalszym od pierwszego punkcie, każdą połowę upraszczamy osobno.
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (r[2 * i] - r[0]) ** 2 + (r[2 * i + 1] - r[1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
  const dp = (a: number, b: number) => {
    const ax = r[2 * a], ay = r[2 * a + 1], bx = r[2 * (b % n)], by = r[2 * (b % n) + 1];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - r[2 * i + 1]) - (ax - r[2 * i]) * (by - ay)) / L; if (d > best) { best = d; bi = i; } }
    if (best > tol) { keep[bi] = 1; dp(a, bi); dp(bi, b); }
  };
  dp(0, far); dp(far, n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(r[2 * i], r[2 * i + 1]);
  return out.length >= 6 ? out : r;
}

/**
 * Ile wyraźnych załamań ma obrys po zgubieniu drobnych schodków (3 px): liczą się tylko ostre (skręt > 25°),
 * więc łuk rotundy z wieloma łagodnymi kątami nie jest „dziwny” (jej dach cieniuje się płynnie, `gladkaNormalna`).
 */
export const zalaman = (r: number[]) => {
  const u = uprosc(r, 3), n = u.length / 2;
  let ile = 0;
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, b = (i + 1) % n;
    const x1 = u[2 * i] - u[2 * a], y1 = u[2 * i + 1] - u[2 * a + 1], x2 = u[2 * b] - u[2 * i], y2 = u[2 * b + 1] - u[2 * i + 1];
    const c = (x1 * x2 + y1 * y2) / ((Math.hypot(x1, y1) * Math.hypot(x2, y2)) || 1);
    if (c < Math.cos((25 * Math.PI) / 180)) ile++;
  }
  return ile;
};
/** Granica „dziwności”: obrys z większą liczbą załamań dostaje dach z bryły uproszczonej (prosta kamienica ma 4–12). */
export const MAKS_ZALAMAN = 14;

/**
 * Bryła, z której liczy się dach: zwykły budynek – jego obrys; „dziwny” (poszarpany, zrośnięty z wielu części) –
 * obrys wygładzony (wygladz): łuki płynne, schodki i wypustki znikają, małe podwórka też.
 */
export function bryla(pierscienie: number[][]): number[][] {
  if (zalaman(pierscienie[0]) <= MAKS_ZALAMAN) return pierscienie;
  // „Dziwny” obrys (poszarpany, łuki, zrośnięte części): wygładzony jak ręką – łuki płynne (cieniują się
  // gładko, `gladkaNormalna`), długie ściany zostają proste, schodki i wypustki znikają; małe podwórka też.
  const z = wygladz(pierscienie[0]);
  const dz = pierscienie.slice(1).map(wygladz).filter((d) => d.length >= 6 && Math.abs(pole(d)) > 400);
  return [z, ...dz];
}

/** Pierścień próbkowany co 3 px, uśredniony dwa razy oknem ±4 próbek, potem bez zbędnych punktów (1 px). */
export function wygladz(r: number[]): number[] {
  const n = r.length / 2, pr: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1];
    const k = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 3));
    for (let q = 0; q < k; q++) pr.push(ax + ((bx - ax) * q) / k, ay + ((by - ay) * q) / k);
  }
  let p = pr;
  const m = p.length / 2;
  if (m < 8) return r;
  for (let pass = 0; pass < 2; pass++) {
    const o: number[] = new Array(p.length);
    for (let i = 0; i < m; i++) {
      let sx = 0, sy = 0;
      for (let w = -4; w <= 4; w++) { const j = (i + w + m) % m; sx += p[2 * j]; sy += p[2 * j + 1]; }
      o[2 * i] = sx / 9; o[2 * i + 1] = sy / 9;
    }
    p = o;
  }
  return uprosc(p, 1);
}

function pole(r: number[]) { let a = 0; for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; }

/** Czy obrys jest prawie kołem (dużo wierzchołków, promień prawie stały, bez podwórek): środek i średni promień. */
export function okragly(r: number[], pierscieni: number): { cx: number; cy: number; r: number } | null {
  const n = r.length / 2;
  if (pierscieni > 1 || n < 10) return null;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += r[2 * i]; cy += r[2 * i + 1]; }
  cx /= n; cy /= n;
  let s = 0, s2 = 0;
  for (let i = 0; i < n; i++) { const d = Math.hypot(r[2 * i] - cx, r[2 * i + 1] - cy); s += d; s2 += d * d; }
  const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m));
  return sd / m < 0.09 && m > 6 ? { cx, cy, r: m } : null;
}

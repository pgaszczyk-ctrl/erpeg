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
  /** Poziom steampunku 0–3 (patrz `poziomSteampunku`): 1 rura + komin z parą, 2 + kocioł na dachu, więcej rur, manometr, okno-bulaj, 3 + rurociąg po dachu, wentylator, dodatkowe kominy, duża para. */
  steampunk?: 0 | 1 | 2 | 3;
}

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

/** `pierscien` = [x0, y0, x1, y1, …] w px obrazu (świat). Zwraca obraz budynku i jego lewy-górny róg w świecie. */
/** Zwraca też `para`: miejsca (w świecie) i wielkość obłoczków pary (16/24/32) – gra stawia tam animowane sprite'y `para()`. */
export function budynek(pierscien: number[], op: OpcjeBudynku): { obraz: Obraz; x0: number; y0: number; para: [number, number, number][] } {
  const H = op.wysokosc, sk = op.skos ?? 0.35;
  const n = pierscien.length / 2;
  const P: [number, number][] = []; for (let i = 0; i < n; i++) P.push([pierscien[2 * i], pierscien[2 * i + 1]]);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const [x, y] of P) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const x0 = Math.floor(minX) - 2, y0 = Math.floor(minY) - 2, W = Math.ceil(maxX + H * sk) - x0 + 3, Hh = Math.ceil(maxY + H) - y0 + 3;
  // maska obrysu (scanline)
  const mask = new Uint8Array(W * Hh);
  for (let j = 0; j < Hh; j++) {
    const py = y0 + j + 0.5, xs: number[] = [];
    for (let i = 0; i < n; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % n]; if ((ay > py) !== (by > py)) xs.push(ax + ((py - ay) * (bx - ax)) / (by - ay)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) { const i = x - x0; if (i >= 0 && i < W) mask[j * W + i] = 1; }
  }
  const inFP = (x: number, y: number) => { const i = x - x0, j = y - y0; return i >= 0 && j >= 0 && i < W && j < Hh && mask[j * W + i] === 1; };
  // krawędzie z normalnymi na zewnątrz
  let area = 0; for (let i = 0; i < n; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % n]; area += ax * by - bx * ay; }
  const E = P.map(([ax, ay], i) => { const [bx, by] = P[(i + 1) % n]; const L = Math.hypot(bx - ax, by - ay) || 1; const ux = (bx - ax) / L, uy = (by - ay) / L; const s = area > 0 ? 1 : -1; return { ax, ay, ux, uy, L, nx: uy * s, ny: -ux * s }; });
  const najblizsze = (px: number, py: number) => {
    let d1 = 1e9, i1 = 0, d2 = 1e9, i2 = 0;
    E.forEach((e, i) => { const t = Math.max(0, Math.min(e.L, (px - e.ax) * e.ux + (py - e.ay) * e.uy)); const d = Math.hypot(e.ax + e.ux * t - px, e.ay + e.uy * t - py);
      if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; i2 = i; } });
    return { d1, i1, d2, i2 };
  };
  const D = MATERIALY[op.dach], S = MATERIALY[op.sciana];
  const SP = op.steampunk ?? 0;
  // rury na ścianach: [indeks krawędzi, położenie wzdłuż] – ściany widoczne (południe/wschód), dłuższe niż 14 px
  const rury: [number, number, boolean][] = [];
  { const R = rng(op.seed * 7 + 3), wid = E.map((e, i) => [e, i] as const).filter(([e]) => (e.ny > 0.5 || e.nx > 0.5) && e.L > 14);
    const ile = SP >= 3 ? 4 : SP === 2 ? 2 : (SP === 1 || op.rura) ? 1 : 0;
    for (let k = 0; k < ile && wid.length; k++) { const [e, i] = wid[Math.floor(R() * wid.length)]; rury.push([i, 3 + Math.floor(R() * (e.L - 8)), SP >= 2 && R() < 0.6]); } }
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
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1) { const d = najblizsze(x0 + i + 0.5, y0 + j + 0.5).d1; dd[j * W + i] = d; maxD = Math.max(maxD, d); }
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const k = kind[j * W + i]; if (!k) continue;
    const x = x0 + i, y = y0 + j; let c: number;
    if (k === 1) {
      const q = najblizsze(x + 0.5, y + 0.5), e = E[q.i1], d = q.d1;
      const lum = -(e.nx * 0.6 + e.ny * 0.8);
      let t = lum > 0.45 ? 4 : lum > 0.05 ? 3 : lum > -0.45 ? 2 : 1;
      const along = (x + 0.5 - e.ax) * e.ux + (y + 0.5 - e.ay) * e.uy;
      switch (D.wzor) {
        case 'dachowka': if (Math.floor(d) % 3 === 2) t = Math.max(0, t - 1); else if (Math.floor(along + Math.floor(d / 3) * 2) % 4 === 0 && d > 1) t = Math.max(0, t - 1); break;
        case 'lupek': if (Math.floor(d) % 2 === 1 || Math.floor(along + (Math.floor(d / 2) % 2) * 2 + 400) % 4 === 0) t = Math.max(0, t - 1); break;
        case 'gont': if (Math.floor(d) % 2 === 1 || Math.floor(along + (Math.floor(d / 2) % 3)) % 3 === 0) t = Math.max(0, t - 1); break;
        case 'blacha': if (Math.floor(along) % 4 === 0) t = Math.min(4, t + 1); break;
      }
      c = D.tony[t];
      const ea = E[q.i1], eb = E[q.i2], dot = ea.nx * eb.nx + ea.ny * eb.ny;
      if (Math.abs(q.d1 - q.d2) < 0.75 && d > 1) c = dot < -0.5 ? D.krawedz : D.tony[Math.min(4, t + 1)]; // kalenica / naroże
      if (dot > -0.5 && dot < 0.5 && Math.abs(q.d1 - q.d2) < 0.75 && ((ea.nx * (eb.ax - ea.ax) + ea.ny * (eb.ay - ea.ay)) > 0)) c = D.tony[0]; // kosz (wklęsły narożnik L/U)
      if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j - 1) === 0 || K(i, j + 1) === 2) c = OBRYS;
    } else {
      const s = sOf[j * W + i], hh = H - s, px = x - s * sk, py = y - s;
      const q = najblizsze(px + 0.5, py + 0.5), e = E[q.i1];
      let t = e.nx < -0.35 ? 3 : e.nx > 0.35 ? 1 : 2;
      const along = (px - e.ax) * e.ux + (py - e.ay) * e.uy;
      if (S.wzor === 'cegla') { if (hh % 3 === 0 || (Math.floor(along + (Math.floor(hh / 3) % 2) * 2) % 4 === 0 && hash(Math.floor(along), hh, 7) < 0.6)) t = Math.max(0, t - 1); }
      else if (S.wzor === 'deski') { if (Math.floor(along) % 3 === 0) t = Math.max(0, t - 1); }
      else if (S.wzor === 'kamien') { if ((hh % 4 === 0) || Math.floor(along + (Math.floor(hh / 4) % 2) * 3) % 6 === 0) t = Math.max(0, t - 1); }
      else if (hash(x, y, op.seed) < 0.1) t = Math.min(4, t + 1);
      c = S.tony[t];
      // okna: rzędy co 7 px wysokości, co 7 px wzdłuż ściany, z dala od narożników
      let okno = false;
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
      // drzwi
      if (op.drzwi) { const [dx, dy] = op.drzwi; const dq = najblizsze(dx, dy); if (dq.i1 === q.i1) { const da = (dx - e.ax) * e.ux + (dy - e.ay) * e.uy; if (Math.abs(along - da) <= 2 && hh <= 6) { c = hh === 6 || Math.abs(along - da) > 1.5 ? hex('#3a2416') : hex('#6a4426'); okno = true; } } }
      // rura
      for (const [ei, ra, zawor] of rury) if (ei === q.i1 && along >= ra && along < ra + 3) { c = MOSIADZ[along < ra + 1 ? 3 : along < ra + 2 ? 2 : 0]; if (hh % 5 === 2) c = MOSIADZ[0]; if (zawor && hh === Math.floor(H / 2)) c = hex('#b2453a'); if (zawor && hh === Math.floor(H / 2) + 1 && along < ra + 1) c = hex('#ece6d6'); okno = true; }
      // okno-bulaj (okrągłe, mosiężne) na budynkach steampunkowych
      if (okno && SP >= 2 && c !== MOSIADZ[0] && c !== MOSIADZ[1] && c !== MOSIADZ[3]) { const m = Math.floor(along + (op.seed % 5)) % 7, f = H >= 14 && hh > 9 ? 1 : 0, lo = 3 + f * 7;
        if (hh >= lo && hh <= lo + 3 && m >= 2 && m <= 4 && hash(Math.floor((along + (op.seed % 5)) / 7), f, op.seed + 5) < 0.3) { const cx = 3, cy = lo + 1.5, d = Math.hypot(m - cx, hh - cy); c = d > 1.2 ? MOSIADZ[2] : (op.noc ? SWIATLO[0] : SZYBA[1]); } }
      if (!okno && K(i, j - 1) === 1) c = S.tony[0];
      if (hh === 0) c = S.tony[0];
      if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j + 1) === 0) c = OBRYS;
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
  if (SP >= 2 && maxD > 5) {
    const miejsca: [number, number][] = [];
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1 && dd[j * W + i] > 5) miejsca.push([i, j]);
    const R = rng(op.seed * 13 + 1), wez = () => miejsca[Math.floor(R() * miejsca.length)];
    if (miejsca.length) {
      // kocioł: leżący walec z nitami, na nóżkach
      const [ki, kj] = wez(), kw = SP >= 3 ? 16 : 12, kh = SP >= 3 ? 9 : 7;
      for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++) { const brzeg = j === 0 || j === kh - 1 || i === 0 || i === kw - 1; const t = j < kh * 0.3 ? 3 : j < kh * 0.55 ? 2 : j < kh * 0.8 ? 1 : 0;
        put(ki - 6 + i, kj - 7 + j, brzeg ? OBRYS : (i === 3 || i === kw - 4) ? MOSIADZ[0] : (j === 2 && i % 3 === 1) ? MOSIADZ[3] : MOSIADZ[t]); }
      put(ki - 4, kj, OBRYS); put(ki + 3, kj, OBRYS);
      if (SP >= 2) { put(ki - 3, kj - 4, hex('#ece6d6')); put(ki - 2, kj - 4, hex('#ece6d6')); put(ki - 3, kj - 3, hex('#ece6d6')); put(ki - 2, kj - 3, OBRYS); } // manometr
      rurka(ki + kw - 8, kj - kh, 7, true, SP >= 3 ? 32 : 24);
      if (SP >= 3) {
        // rurociąg po dachu od kotła do drugiego komina, wentylator, żelazne kominy
        const [ri, rj] = wez();
        let i = ki + 6, j = kj - 4; while (i !== ri || j !== rj) { put(i, j, MOSIADZ[2]); put(i, j + 1, MOSIADZ[0]); if (i !== ri) i += Math.sign(ri - i); else j += Math.sign(rj - j); }
        for (let jj = -14; jj <= 0; jj++) for (let ii = -1; ii < 4; ii++) put(ri + ii - 1, rj + jj, ii === -1 || ii === 3 ? OBRYS : jj <= -13 ? MOSIADZ[3] : jj === -6 ? MOSIADZ[1] : ii === 0 ? hex('#6e6878') : ii === 2 ? hex('#2a2630') : hex('#3a3440'));
        para.push([x0 + ri, y0 + rj - 15, 32]);
        const [r2i, r2j] = wez(); rurka(r2i, r2j, 10, false, 24);
        const [wi, wj] = wez();
        for (let jj = -3; jj <= 3; jj++) for (let ii = -3; ii <= 3; ii++) { const d = Math.hypot(ii, jj); if (d > 3.3) continue; put(wi + ii, wj + jj, d > 2.5 ? MOSIADZ[1] : (ii === 0 || jj === 0 || ii === jj || ii === -jj) ? hex('#2a2630') : hex('#6e6878')); }
      }
    }
  }
  return { obraz: o, x0, y0, para };
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

// Budynki z obrysu OSM liczone piksel po pikselu (port makiety + `dachy_roofs.py`, uogólnione na dowolny wielokąt).
// Konwencja gry zostaje: dach = obrys, ściany „wiszą” pod obrysem i są przesunięte w prawo (WALL_SKEW 0,35).
// Wszystkie miary w px obrazu (0,5 px mapy): ściany 8 / 12 / 16 px.
import { Obraz, nowy, hex, hash, OBRYS, mieszaj } from './wspolne';

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
}

/** `pierscien` = [x0, y0, x1, y1, …] w px obrazu (świat). Zwraca obraz budynku i jego lewy-górny róg w świecie. */
export function budynek(pierscien: number[], op: OpcjeBudynku): { obraz: Obraz; x0: number; y0: number } {
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
      if (op.rura && e.ny > 0.5 && e.L > 14) { const ra = e.L - 4; if (along >= ra && along < ra + 2) { c = MOSIADZ[along < ra + 1 ? 3 : 1]; if (hh % 5 === 2) c = MOSIADZ[0]; okno = true; } }
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
  return { obraz: o, x0, y0 };
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

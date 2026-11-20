// Dachy z pola wysokości (właściciel 20.11.2026: „nie muszą mieć zawsze 4-spadowych dachów; na terenach górzystych domy
// bardziej drewniane, z wyższymi, spiczastymi dachami; wymyśl jeszcze kilka wersji”). Nad obrysem liczymy wysokość
// dachu w każdym punkcie (dwuspadowy, stromy góralski, mansardowy, szedowy fabryczny), próbkujemy go co ćwierć piksela,
// rzutujemy w górę ekranu z buforem głębokości i cieniujemy z normalnej. Szczyty dwuspadowych dachów i boki szedów to
// pionowe ściany z materiału budynku (z okienkiem na strychu), szedy mają przeszklone pionowe pasy. Bez DOM-u.
import { type Obraz, nowy, hex, OBRYS, hash } from './wspolne';
import { MATERIALY, type OpcjeBudynku } from './budynki';
import { dachSwiatyni, zwienczenie } from './dachySwiatyn';

export type FormaKsztaltu = 'stromy' | 'dwuspadowy' | 'mansarda' | 'szed' | 'dworzec' | 'ogrod';

const SK = 0.35;
const OKNO = hex('#2c2c3a'), RAMA = hex('#e8dfc8');
const SZKLO = ['#24324a', '#3a5070', '#5a7a9c', '#86a6c4'].map(hex);
const TRAWA = ['#2a4a24', '#36602c', '#467636', '#5a8c42', '#76a656'].map(hex);
const ZIELEN_KRZAK = ['#1a3420', '#24482a', '#305e34', '#3e7640', '#56904e'].map(hex);
const ZWIR = ['#6a645a', '#847c70', '#9c9486', '#b4ac9c', '#ccc4b2'].map(hex);
const MOSIADZ_K = ['#4a3410', '#7a5a1c', '#a8822c', '#d0a848', '#f0d27e'].map(hex);
const KAMIEN_K = ['#4c4848', '#666060', '#807a78', '#9a9490', '#b4aea8'].map(hex);
const CEGLA_K = ['#4e2723', '#6e362c', '#8a4836', '#a5644a', '#bc7c5c'].map(hex);

/** A round corner turret (slate cone) on a mansard tenement, at its south-east corner, when it fits inside. */
function wiezyczka(o: Obraz, r: number[], gora: number, seed: number, R: number) {
  let best = -Infinity, ki = 0;
  for (let i = 0; i < r.length; i += 2) { const sc = r[i] + r[i + 1] * 0.7; if (sc > best) { best = sc; ki = i; } }
  // Inside the corner along its bisector, far enough to touch neither wall.
  const n = r.length, kx = r[ki], ky = r[ki + 1];
  const px = r[(ki - 2 + n) % n], py = r[(ki - 1 + n) % n], qx = r[(ki + 2) % n], qy = r[(ki + 3) % n];
  const l1 = Math.hypot(px - kx, py - ky) || 1, l2 = Math.hypot(qx - kx, qy - ky) || 1;
  const u1x = (px - kx) / l1, u1y = (py - ky) / l1, u2x = (qx - kx) / l2, u2y = (qy - ky) / l2;
  let bx = u1x + u2x, by = u1y + u2y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
  const sin = Math.abs(u1x * by - u1y * bx), d = (R + 1.5) / Math.max(0.3, sin);
  const cx = kx + bx * d, cy = ky + by * d;
  if (!wnetrze(r, cx, cy)) return;
  const ring: number[] = [];
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; ring.push(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
  for (let i = 0; i < ring.length; i += 2) if (!wnetrze(r, ring[i], ring[i + 1])) return;
  const { cx: tx, szczyt } = dachSwiatyni(o, ring, 'wiezyczka', seed, gora);
  zwienczenie(o, tx, szczyt, 'wiezyczka', R);
}

/** A vertical column standing on screen point (x, y) with the walls' lean: w = half-width, tones 5 dark→light. */
function kolumna(o: Obraz, x: number, y: number, H: number, w: number, t: number[]) {
  const put = (i: number, j: number, c: number) => { if (i >= 0 && j >= 0 && i < o.w && j < o.h) o.px[j * o.w + i] = c; };
  for (let z = 0; z < H; z++) {
    const X = Math.round(x - z * SK), Y = y - z;
    for (let i = -w - 1; i <= w + 1; i++) put(X + i, Y, i === -w - 1 || i === w + 1 ? OBRYS : t[i < 0 ? 3 : i === 0 ? 2 : 1]);
  }
  const X = Math.round(x - H * SK), Y = y - H;
  for (let i = -w - 2; i <= w + 2; i++) { put(X + i, Y + 1, t[4]); put(X + i, Y, OBRYS); }
  put(X - w - 2, Y + 1, OBRYS); put(X + w + 2, Y + 1, OBRYS);
  return [X, Y] as const;
}

/** A brick factory chimney at the hall's north-east corner with a brass band; returns its top (for the steam). */
function komin(o: Obraz, r: number[], gora: number, hSzed: number) {
  let best = -Infinity, kx = 0, ky = 0, sx = 0, sy = 0, n = 0;
  for (let i = 0; i < r.length; i += 2) {
    sx += r[i]; sy += r[i + 1]; n++;
    const sc = r[i] - r[i + 1];
    if (sc > best) { best = sc; kx = r[i]; ky = r[i + 1]; }
  }
  const dx = sx / n - kx, dy = sy / n - ky, dl = Math.hypot(dx, dy) || 1;
  const x = Math.round(kx + (dx / dl) * 6), y = Math.round(ky + (dy / dl) * 6) + gora;
  const H = Math.round(hSzed + 22);
  const top = kolumna(o, x, y, H, 2, CEGLA_K);
  // Brass bands two thirds up and under the cap.
  for (const z of [Math.round(H * 0.62), H - 3]) {
    const X = Math.round(x - z * SK), Y = y - z;
    for (let i = -2; i <= 2; i++) if (X + i >= 0 && Y >= 0 && X + i < o.w && Y < o.h) o.px[Y * o.w + X + i] = MOSIADZ_K[i < 0 ? 4 : 2];
  }
  return top;
}

/** Body under the roof: a flat plate (it is covered), no chimneys/pipes/ornaments poking through. */
export function opcjeKsztaltu(op: OpcjeBudynku, forma: FormaKsztaltu): OpcjeBudynku {
  return { ...op, plaski: true, dachPlaski: 'papa', komin: false, rura: false, steampunk: 0, ozdoby: [], okap: 0, azja: false, sciana: forma === 'stromy' ? 'drewno' : op.sciana };
}

/** How close the outline is to its own rectangle along its longest wall (1 = a rectangle). */
export function prostokatnosc(r: number[]) {
  const { u0, u1, v0, v1, pole } = osie(r);
  return pole / Math.max(1e-6, (u1 - u0) * (v1 - v0));
}

function wnetrze(r: number[], x: number, y: number) {
  let w = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ay = r[j + 1], by = r[i + 1];
    if ((ay > y) !== (by > y) && x < r[j] + ((y - ay) * (r[i] - r[j])) / (by - ay)) w = !w;
  }
  return w;
}

function osie(r: number[]) {
  let best = 0, ux = 1, uy = 0, pole = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const dx = r[i] - r[j], dy = r[i + 1] - r[j + 1], L = Math.hypot(dx, dy);
    if (L > best) { best = L; ux = dx / L; uy = dy / L; }
    pole += (r[j] - r[i]) * (r[j + 1] + r[i + 1]) / 2;
  }
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) {
    const u = r[i] * ux + r[i + 1] * uy, v = -r[i] * uy + r[i + 1] * ux;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  // The ridge runs along the longer side.
  if (v1 - v0 > u1 - u0) return { ux: -uy, uy: ux, u0: -v1, u1: -v0, v0: u0, v1: u1, pole: Math.abs(pole), swap: true };
  return { ux, uy, u0, u1, v0, v1, pole: Math.abs(pole), swap: false };
}

/** Roof of the given form over the outline, on the building's picture (from `opcjeKsztaltu`). */
export function ksztaltNaDachu(obraz: Obraz, pierscien: number[], forma: FormaKsztaltu, seed: number, op: OpcjeBudynku): { obraz: Obraz; gora: number; para: [number, number, number][] } {
  const r = pierscien, n = r.length / 2;
  if (n < 3) return { obraz, gora: 0, para: [] };
  const A = osie(r);
  const ux = A.ux, uy = A.uy, vc = (A.v0 + A.v1) / 2, polW = (A.v1 - A.v0) / 2;
  const U = (x: number, y: number) => x * ux + y * uy, V = (x: number, y: number) => -x * uy + y * ux;
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 1; i < r.length; i += 2) { ymin = Math.min(ymin, r[i]); ymax = Math.max(ymax, r[i]); }
  // Distance to the outline (mansard) and the along-wall coordinate of the nearest wall (dormers).
  const odl = (x: number, y: number): [number, number] => {
    let d = Infinity, wz = 0;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const ax = r[j], ay = r[j + 1], ex = r[i] - ax, ey = r[i + 1] - ay, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2));
      const dd = Math.hypot(ax + ex * t - x, ay + ey * t - y);
      if (dd < d) { d = dd; wz = t * Math.sqrt(L2); }
    }
    return [d, wz];
  };
  const spadek = forma === 'stromy' ? 1.35 : 0.72;
  const mansA = Math.min(polW * 0.4, 8), mansMax = mansA * 2.1 + Math.max(0, polW - mansA) * 0.3;
  const okres = 16, hSzed = Math.min(12, okres * 0.7);
  const hHali = polW * 0.75;
  // Green roof: low bushes on a world grid, none on the parapet (2 px from the edge).
  const krzak = (x: number, y: number) => {
    const cx = Math.floor(x / 7), cy = Math.floor(y / 7);
    let best = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      if (hash(gx, gy, seed) > 0.42) continue;
      const px = gx * 7 + 1.5 + hash(gx, gy, seed + 1) * 4, py = gy * 7 + 1.5 + hash(gx, gy, seed + 2) * 4, rr = 1.6 + hash(gx, gy, seed + 3) * 1.4;
      const d = Math.hypot(x - px, y - py);
      if (d < rr) best = Math.max(best, 2.6 * (1 - (d / rr) ** 2));
    }
    return best;
  };
  const wys = (x: number, y: number): number => {
    switch (forma) {
      case 'dworzec': { const v = (V(x, y) - vc) / polW; return hHali * Math.sqrt(Math.max(0, 1 - v * v)); }
      case 'ogrod': return odl(x, y)[0] < 2.2 ? 0 : krzak(x, y);
      case 'mansarda': { const d = odl(x, y)[0]; return d < mansA ? d * 2.1 : mansA * 2.1 + (d - mansA) * 0.3; }
      case 'szed': { const f = ((y - ymin) / okres) % 1; return hSzed * f; }
      default: return Math.max(0, spadek * (polW - Math.abs(V(x, y) - vc)));
    }
  };
  const hMax = forma === 'mansarda' ? mansMax : forma === 'szed' ? hSzed : forma === 'dworzec' ? hHali : forma === 'ogrod' ? 3 : spadek * polW;
  // Room above: the roof, plus a corner turret on mansards and a factory chimney on saw-tooth halls.
  const gora = Math.ceil(Math.max(hMax, forma === 'mansarda' ? 34 : forma === 'szed' ? hSzed + 28 : 0)) + 3;
  const out = nowy(obraz.w, obraz.h + gora);
  for (let y = 0; y < obraz.h; y++) out.px.set(obraz.px.subarray(y * obraz.w, (y + 1) * obraz.w), (y + gora) * out.w);
  const W = out.w, Hh = out.h;
  const glebia = new Float32Array(W * Hh).fill(-Infinity);
  const sciana = new Int8Array(W * Hh); // 0 none, 1.. roof face, 9 wall, 8 glass
  const kolor = new Uint32Array(W * Hh);
  const D = forma === 'stromy' ? MATERIALY.gont : forma === 'szed' ? MATERIALY.blacha_falista : forma === 'mansarda' ? MATERIALY.lupek : (MATERIALY[op.dach] ?? MATERIALY.dachowka_czerwona);
  const GORA_M = MATERIALY.papa;
  const S = MATERIALY[forma === 'stromy' ? 'drewno' : op.sciana] ?? MATERIALY.tynk_kremowy;
  const L = [-0.55, -0.45, 0.7];
  const ton = (t: number[], lum: number) => t[Math.max(0, Math.min(4, Math.round(1.8 + lum * 2.4)))];
  const postaw = (x: number, y: number, z: number, d: number, c: number, sc: number) => {
    // Same lean as the building's walls (skos 0.35): going up moves left, so east gables show like east walls.
    const X = Math.round(x - z * SK), Y = Math.round(y - z) + gora;
    if (X < 0 || Y < 0 || X >= W || Y >= Hh) return;
    const id = Y * W + X;
    if (d <= glebia[id]) return;
    glebia[id] = d; kolor[id] = c; sciana[id] = sc;
  };
  // Roof surface, sampled every quarter pixel inside the outline (scanlines).
  const K = 0.25;
  for (let y = ymin + K / 2; y < ymax; y += K) {
    const xs: number[] = [];
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const ay = r[j + 1], by = r[i + 1];
      if ((ay > y) !== (by > y)) xs.push(r[j] + ((y - ay) * (r[i] - r[j])) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = xs[k] + K / 2; x < xs[k + 1]; x += K) {
      const h = wys(x, y), e = 0.3;
      const gx = (wys(x + e, y) - wys(x - e, y)) / (2 * e), gy = (wys(x, y + e) - wys(x, y - e)) / (2 * e);
      let nx = -gx, ny = -gy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      let lum = nx * L[0] + ny * L[1] + nz * L[2];
      let c: number, sc = 1;
      if (forma === 'mansarda') {
        const [d, wz] = odl(x, y);
        if (d < mansA) {
          sc = 1;
          if (Math.floor(d * 1.5) % 2 === 1) lum -= 0.12;
          c = ton(D.tony, lum);
          // Dormer windows in the steep slate, one every 11 px along the wall.
          const m = wz % 11;
          if (Math.floor(wz / 11) % 2 === 1) {
            // Steampunk bull's-eye dormer: a brass ring round a dark round pane.
            const rr = Math.hypot(m - 6, (d - mansA * 0.55) * 1.4);
            if (rr < 2.6) c = rr > 1.7 ? MOSIADZ_K[rr > 2.2 ? 1 : 3] : OKNO;
          } else if (d > mansA * 0.25 && d < mansA * 0.8 && m > 4 && m < 8) c = (m < 4.7 || m > 7.3 || d < mansA * 0.33) ? RAMA : OKNO;
          if (d < 0.6) c = D.krawedz;
        } else { sc = 2; c = ton(GORA_M.tony, lum * 1.2 + 0.25); }
      } else if (forma === 'dworzec') {
        // Glass barrel vault on iron ribs (across every 6 px) and purlins (along, every few px of arc).
        const u = U(x, y), v = V(x, y) - vc;
        const luk = Math.asin(Math.max(-1, Math.min(1, v / polW))) * polW;
        const zebro = Math.floor(u + 400) % 6 === 0, platew = Math.floor(luk + 400) % 4 === 0;
        const mos = zebro && Math.floor((u + 400) / 6) % 3 === 0;
        c = mos ? MOSIADZ_K[lum > 0.3 ? 3 : lum > 0 ? 2 : 1] : zebro || platew ? (lum > 0.3 ? hex('#4a4e58') : hex('#2c2e36')) : SZKLO[Math.max(0, Math.min(3, Math.round(1.2 + lum * 2.2 + (hash(Math.floor(u / 6), Math.floor(luk / 4), seed) < 0.15 ? 1 : 0))))];
        if (Math.abs(v) > polW - 0.6) c = hex('#2c2e36');
      } else if (forma === 'ogrod') {
        const d = odl(x, y)[0];
        if (d < 2.2) { sc = 2; c = ton(MATERIALY.kamien.tony, d < 0.8 ? 0.6 : 0.1); }
        else if (h > 0.05) c = ton(ZIELEN_KRZAK, lum);
        else if (Math.abs(U(x, y) - (A.u0 + A.u1) / 2) < 1.2 || Math.abs(V(x, y) - vc) < 1.2) c = ton(ZWIR, 0.2 + (hash(Math.floor(x), Math.floor(y), seed) - 0.5) * 0.4);
        else c = ton(TRAWA, 0.15 + (hash(Math.floor(x / 2), Math.floor(y / 2), seed + 9) - 0.5) * 0.5);
      } else if (forma === 'szed') {
        const u = U(x, y);
        if (Math.floor(u) % 3 === 0) lum += 0.1;
        c = ton(D.tony, lum);
      } else {
        sc = V(x, y) < vc ? 1 : 2;
        const odOkapu = polW - Math.abs(V(x, y) - vc);
        const rz = D.wzor === 'lupek' ? 2 : 3;
        if (Math.floor(odOkapu * (forma === 'stromy' ? 1.6 : 1)) % rz === rz - 1) lum -= 0.14;
        else if (D.wzor !== 'blacha' && Math.floor(odOkapu) % rz === 0 && Math.floor(U(x, y) + Math.floor(odOkapu / rz) * 2) % 5 === 0) lum -= 0.12;
        c = ton(D.tony, lum);
        if (odOkapu < 0.5) c = D.krawedz;
      }
      postaw(x, y, h, y + SK * x * 0.5, c, sc);
    }
  }
  // Vertical faces: gable ends / sides of the saw teeth (walls on the outline), saw-tooth glazing.
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ax = r[j], ay = r[j + 1], ex = r[i] - ax, ey = r[i + 1] - ay, Lk = Math.hypot(ex, ey);
    if (Lk < 0.5) continue;
    let nx = ey / Lk, ny = -ex / Lk;
    if (wnetrze(r, ax + ex / 2 + nx * 0.6, ay + ey / 2 + ny * 0.6)) { nx = -nx; ny = -ny; }
    const lum0 = nx * -0.55 + ny * -0.45 + 0.35;
    for (let s = 0; s <= Lk; s += K) {
      const x = ax + (ex * s) / Lk, y = ay + (ey * s) / Lk;
      const h = wys(x - nx * 0.3, y - ny * 0.3);
      if (h < 0.6) continue;
      for (let z = 0; z <= h; z += K * 2) {
        let c = forma === 'dworzec'
          ? (Math.floor(s + 400) % 4 === 0 || z < 0.8 ? hex('#2c2e36') : SZKLO[z > h * 0.6 ? 2 : 1])
          : ton(S.tony, lum0 + (S.wzor === 'deski' && Math.floor(s) % 3 === 0 ? -0.15 : 0));
        // An attic window in the middle of a gable.
        if (forma !== 'szed' && forma !== 'dworzec' && Math.abs(V(x, y) - vc) < 1.6 && z > h * 0.3 && z < h * 0.3 + 3) c = Math.abs(V(x, y) - vc) > 1.1 || z < h * 0.3 + 0.6 ? RAMA : OKNO;
        postaw(x, y, z, y + SK * x * 0.5 + 0.002, c, 9);
      }
    }
  }
  if (forma === 'szed') {
    for (let yb = ymin + okres; yb < ymax; yb += okres) {
      const xs: number[] = [];
      for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        const ay = r[j + 1], by = r[i + 1];
        if ((ay > yb) !== (by > yb)) xs.push(r[j] + ((yb - ay) * (r[i] - r[j])) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = xs[k] + K; x < xs[k + 1]; x += K) for (let z = 0; z <= hSzed; z += K * 2) {
        const sl = z < 0.8 ? MOSIADZ_K[z < 0.4 ? 1 : 3] : Math.floor(x) % 5 === 0 ? MATERIALY.blacha_falista.tony[1] : SZKLO[Math.min(3, Math.floor((z / hSzed) * 4))];
        postaw(x, yb - 0.01, z, yb + SK * x * 0.5 + 0.001, sl, 8);
      }
    }
  }
  // Paint; ink outline round the roof, a ridge line between faces of a different kind.
  for (let i = 0; i < W * Hh; i++) if (sciana[i]) out.px[i] = kolor[i];
  const ink: number[] = [], kraw: number[] = [];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, s = sciana[i];
    if (!s) {
      if ((x > 0 && sciana[i - 1]) || (x < W - 1 && sciana[i + 1]) || (y > 0 && sciana[i - W]) || (y < Hh - 1 && sciana[i + W])) ink.push(i);
      continue;
    }
    const a = x < W - 1 ? sciana[i + 1] : 0, b = y < Hh - 1 ? sciana[i + W] : 0;
    if ((a && a !== s && (a === 9 || s === 9)) || (b && b !== s && (b === 9 || s === 9))) ink.push(i);
    else if ((a && a !== s && a < 8 && s < 8) || (b && b !== s && b < 8 && s < 8)) kraw.push(i);
  }
  for (const i of ink) out.px[i] = OBRYS;
  for (const i of kraw) out.px[i] = forma === 'ogrod' ? ZIELEN_KRZAK[0] : D.krawedz;
  // ——— steampunk (owner, 20 Nov 2026: „pamiętaj o steampunku”): brass pipes, vents and steam on every form ———
  const para: [number, number, number][] = [];
  const pkt = (u: number, v: number) => { const x = u * ux - v * uy, y = u * uy + v * ux; return { x, y, z: wys(x, y) }; };
  const naEkranie = (p: { x: number; y: number; z: number }) => [Math.round(p.x - p.z * SK), Math.round(p.y - p.z) + gora] as const;
  if (forma === 'mansarda' && polW >= 12 && hash(seed, 31, 7) < 0.7) wiezyczka(out, r, gora, seed, Math.min(9, polW * 0.45));
  if (forma === 'szed') { const [X, Y] = komin(out, r, gora, hSzed); para.push([X, Y - 2, 32]); }
  if (forma === 'dworzec') {
    // Brass steam vents along the vault's ridge.
    for (let u = A.u0 + 14; u < A.u1 - 10; u += 26) {
      const [X, Y] = naEkranie(pkt(u, vc));
      kolumna(out, X, Y, 5, 1, MOSIADZ_K);
      para.push([X, Y - 6, 16]);
    }
  }
  if (forma === 'stromy' || forma === 'dwuspadowy') {
    // A chimney on the ridge: stone with smoke in the mountains, a brass steam stack in towns.
    if (hash(seed, 41, 3) < (forma === 'stromy' ? 0.9 : 0.6)) {
      const [X, Y] = naEkranie(pkt(A.u0 + (A.u1 - A.u0) * (0.22 + hash(seed, 42, 3) * 0.2), vc));
      if (forma === 'stromy') kolumna(out, X, Y + 2, 6, 2, KAMIEN_K); else { kolumna(out, X, Y + 1, 6, 1, MOSIADZ_K); }
      para.push([X, Y - 6, forma === 'stromy' ? 24 : 16]);
    }
  }
  if (forma === 'ogrod') {
    // A brass steam fountain where the garden's paths cross.
    const p0 = pkt((A.u0 + A.u1) / 2, vc), [X, Y] = naEkranie(p0);
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const d = Math.hypot(i, j * 1.3);
      if (d > 3.2) continue;
      const k = (Y + j) * out.w + X + i;
      if (k >= 0 && k < out.px.length) out.px[k] = d > 2.4 ? OBRYS : d > 1.5 ? MOSIADZ_K[i + j < 0 ? 3 : 1] : SZKLO[2];
    }
    para.push([X, Y - 2, 16]);
  }
  return { obraz: out, gora, para };
}

// Dachy z pola wysokości (właściciel 20.11.2026: „nie muszą mieć zawsze 4-spadowych dachów; na terenach górzystych domy
// bardziej drewniane, z wyższymi, spiczastymi dachami; wymyśl jeszcze kilka wersji”). Nad obrysem liczymy wysokość
// dachu w każdym punkcie (dwuspadowy, stromy góralski, mansardowy, szedowy fabryczny), próbkujemy go co ćwierć piksela,
// rzutujemy w górę ekranu z buforem głębokości i cieniujemy z normalnej. Szczyty dwuspadowych dachów i boki szedów to
// pionowe ściany z materiału budynku (z okienkiem na strychu), szedy mają przeszklone pionowe pasy. Bez DOM-u.
import { type Obraz, nowy, hex, OBRYS, hash } from './wspolne';
import { MATERIALY, type OpcjeBudynku } from './budynki';

export type FormaKsztaltu = 'stromy' | 'dwuspadowy' | 'mansarda' | 'szed';

const SK = 0.35;
const OKNO = hex('#2c2c3a'), RAMA = hex('#e8dfc8');
const SZKLO = ['#24324a', '#3a5070', '#5a7a9c', '#86a6c4'].map(hex);

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
export function ksztaltNaDachu(obraz: Obraz, pierscien: number[], forma: FormaKsztaltu, seed: number, op: OpcjeBudynku): { obraz: Obraz; gora: number } {
  const r = pierscien, n = r.length / 2;
  if (n < 3) return { obraz, gora: 0 };
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
  const wys = (x: number, y: number): number => {
    switch (forma) {
      case 'mansarda': { const d = odl(x, y)[0]; return d < mansA ? d * 2.1 : mansA * 2.1 + (d - mansA) * 0.3; }
      case 'szed': { const f = ((y - ymin) / okres) % 1; return hSzed * f; }
      default: return Math.max(0, spadek * (polW - Math.abs(V(x, y) - vc)));
    }
  };
  const hMax = forma === 'mansarda' ? mansMax : forma === 'szed' ? hSzed : spadek * polW;
  const gora = Math.ceil(hMax) + 3;
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
          if (d > mansA * 0.25 && d < mansA * 0.8 && m > 4 && m < 8) c = (m < 4.7 || m > 7.3 || d < mansA * 0.33) ? RAMA : OKNO;
          if (d < 0.6) c = D.krawedz;
        } else { sc = 2; c = ton(GORA_M.tony, lum * 1.2 + 0.25); }
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
        let c = ton(S.tony, lum0 + (S.wzor === 'deski' && Math.floor(s) % 3 === 0 ? -0.15 : 0));
        // An attic window in the middle of a gable.
        if (forma !== 'szed' && Math.abs(V(x, y) - vc) < 1.6 && z > h * 0.3 && z < h * 0.3 + 3) c = Math.abs(V(x, y) - vc) > 1.1 || z < h * 0.3 + 0.6 ? RAMA : OKNO;
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
        const sl = Math.floor(x) % 5 === 0 || z < 0.8 ? MATERIALY.blacha_falista.tony[1] : SZKLO[Math.min(3, Math.floor((z / hSzed) * 4))];
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
  for (const i of kraw) out.px[i] = D.krawedz;
  void hash; void seed;
  return { obraz: out, gora };
}

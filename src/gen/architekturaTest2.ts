/**
 * Próba architektury /test2. Wyłącznie jednorazowe malowanie obrazu budynku:
 * nie zmienia obrysu OSM, drzwi, kolizji, pary ani współrzędnych świata.
 * Wywołać po budynek(), PRZED przesunięciem obrazu do podstawy ścian.
 * Dach dzielimy na skrzydła według geometrii, a nie losowe pasy tekstury.
 */
import { MATERIALY, uprosc, type OpcjeBudynku, type ZrodloPary } from './budynki';
import { hash, hex, mieszaj, OBRYS, type Obraz } from './wspolne';

export interface WynikBudynkuTest2 { obraz: Obraz; x0: number; y0: number; para: ZrodloPary[] }

interface Skrzydlo { u0: number; v0: number; u1: number; v1: number; seed: number }
interface Os { ux: number; uy: number; vx: number; vy: number; x: number; y: number }
const SIATKA = 6;
const mod = (n: number, d: number) => ((n % d) + d) % d;

/**
 * Ten sam wynik i rozmiar obrazu, piksele zmieniane w miejscu.
 * Pamięć pomocnicza: 2 bajty / piksel + mała siatka co 6 px.
 * Czas: liniowy w powierzchni obrazu; najwyżej 12 przebiegów małej siatki.
 * Brak DOM-u, Phasera, losowania zależnego od klatki i dodatkowych tekstur.
 */
export function stylizujBudynekTest2<T extends WynikBudynkuTest2>(pierscien: number[], op: OpcjeBudynku, wynik: T): T {
  const { obraz: o, x0, y0 } = wynik;
  const dach = MATERIALY[op.dach], sciana = MATERIALY[op.sciana];
  if (!dach || !sciana || pierscien.length < 6 || !o.w || !o.h) return wynik;
  const rings = [pierscien, ...(op.dziury ?? [])].map((r) => r.length > 8 ? uprosc(r, 1.6) : r);
  const mask = maskaDachu(rings, o, x0, y0);
  // Rysunki ozdób i ich cienie pozostają: wolno nadpisywać tylko podstawowe
  // kolory materiału. Wewnętrzne ciemne kontury nie są materiałem dachu.
  const roofColors = new Set([...dach.tony, dach.krawedz]);
  const wallColors = new Set(sciana.tony);
  const malowalne = new Uint8Array(mask.length);
  let ileDachu = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    ileDachu++;
    if (roofColors.has(o.px[i])) malowalne[i] = 1;
  }
  if (ileDachu < 24) return wynik;
  const os = osBudynku(rings[0]);
  const plaski = op.plaski ?? Math.round(op.wysokosc / Math.max(10, op.poziom ?? op.wysokosc)) >= 3;
  // Rotundy zachowują istniejący dach stożkowy, zamiast dostawać prostokątne połacie.
  const prostokatnosc = pole(rings[0]) / poleRamki(rings[0], os);
  const okragly = rings.length === 1 && rings[0].length >= 16 && prostokatnosc > 0.72 && prostokatnosc < 0.86 && lagodneNarozniki(rings[0]);
  const plan = !plaski && !okragly ? podzielDach(mask, o, x0, y0, os, op.seed) : null;
  const brzeg = (x: number, y: number) => x < 0 || y < 0 || x >= o.w || y >= o.h ? 0 : mask[y * o.w + x];
  const tony = dach.tony;
  const jasnyOkap = mieszaj(dach.krawedz, hex('#e0caa2'), 0.16);
  const ciemnyOkap = mieszaj(tony[0], OBRYS, 0.28);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const k = y * o.w + x;
    if (!mask[k]) continue;
    const gora = !brzeg(x, y - 1), lewo = !brzeg(x - 1, y), dol = !brzeg(x, y + 1), prawo = !brzeg(x + 1, y);
    if (gora || lewo || dol || prawo) {
      // Kontur zewnętrzny jest selektywny; ciemny od dołu, jasny od światła.
      if (malowalne[k] || o.px[k] === OBRYS) o.px[k] = dol || prawo ? ciemnyOkap : jasnyOkap;
      continue;
    }
    if (!malowalne[k]) continue;
    if (!brzeg(x, y - 2) || !brzeg(x - 2, y)) { o.px[k] = tony[4]; continue; }
    if (!brzeg(x, y + 2) || !brzeg(x + 2, y)) { o.px[k] = tony[0]; continue; }
    if (!plan) continue;
    const dx = x0 + x + 0.5 - os.x, dy = y0 + y + 0.5 - os.y;
    const u = dx * os.ux + dy * os.uy, v = dx * os.vx + dy * os.vy;
    const gx = Math.floor((u - plan.u0) / SIATKA), gy = Math.floor((v - plan.v0) / SIATKA);
    if (gx < 0 || gy < 0 || gx >= plan.w || gy >= plan.h) continue;
    const nr = plan.ids[gy * plan.w + gx];
    if (!nr) continue; // drobne skosy obrysu zachowują oryginalny dach
    const s = plan.skrzydla[nr - 1];
    const dl = u - s.u0, dp = s.u1 - u, dg = v - s.v0, dd = s.v1 - v;
    const d = Math.min(dl, dp, dg, dd);
    let nx = 0, ny = 0, along = 0;
    if (d === dl) { nx = -os.ux; ny = -os.uy; along = v; }
    else if (d === dp) { nx = os.ux; ny = os.uy; along = v; }
    else if (d === dg) { nx = -os.vx; ny = -os.vy; along = u; }
    else { nx = os.vx; ny = os.vy; along = u; }
    const lum = -(nx * 0.6 + ny * 0.8);
    let t = lum > 0.5 ? 4 : lum > 0 ? 3 : lum > -0.5 ? 2 : 1;
    // Grubsze dachówki: dłuższe kreski, bez ziarnistego szumu w każdym pikselu.
    const row = Math.floor(d / 4), col = Math.floor((along + (row & 1) * 3) / 7);
    const faza = mod(Math.floor(d), 4), szew = mod(Math.floor(along + (row & 1) * 3), 7);
    if (dach.wzor === 'blacha') {
      if (mod(Math.floor(along), 9) === 0) t = Math.min(4, t + 1);
      else if (mod(Math.floor(along), 9) === 1) t = Math.max(0, t - 1);
    } else {
      if (faza === 3) t = Math.max(0, t - 1);
      else if (faza === 0 && szew > 0 && szew < 6 && hash(col, row, s.seed) > 0.3) t = Math.min(4, t + 1);
      if (szew === 0 && faza > 0) t = Math.max(0, t - 1);
    }
    let c = tony[t];
    // Wewnętrzne styki skrzydeł to kosze dachu, nie płaskie kolorowe pasy.
    if (d < 1.1) c = ciemnyOkap;
    else if (d < 2.1) c = tony[lum > 0 ? 3 : 1];
    // Second-smallest distance, without allocating arrays in the pixel loop.
    const druga = Math.min(Math.max(dl, dp), Math.max(dg, dd), Math.max(Math.min(dl, dp), Math.min(dg, dd)));
    if (d > 3 && Math.abs(druga - d) < 0.9) c = lum > -0.2 ? jasnyOkap : tony[3];
    o.px[k] = c;
  }
  malujGzymsy(o, mask, rings, x0, y0, op, wallColors);
  if (plan) lukarny(o, mask, malowalne, x0, y0, os, plan.skrzydla, op);
  return wynik;
}

/** Ta sama parzysto-nieparzysta maska co w budynek(); dziedzińce pozostają otwarte. */
function maskaDachu(rings: number[][], o: Obraz, x0: number, y0: number) {
  const mask = new Uint8Array(o.w * o.h);
  for (let y = 0; y < o.h; y++) {
    const py = y0 + y + 0.5, xs: number[] = [];
    for (const r of rings) for (let i = 0, n = r.length / 2; i < n; i++) {
      const j = (i + 1) % n, ax = r[i * 2], ay = r[i * 2 + 1], bx = r[j * 2], by = r[j * 2 + 1];
      if ((ay > py) !== (by > py)) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const l = Math.max(0, Math.ceil(xs[i] - 0.5) - x0), r = Math.min(o.w, Math.ceil(xs[i + 1] - 0.5) - x0);
      if (r > l) mask.fill(1, y * o.w + l, y * o.w + r);
    }
  }
  return mask;
}

function osBudynku(r: number[]): Os {
  let best = 0, ux = 1, uy = 0;
  for (let i = 0; i < r.length; i += 2) {
    const j = (i + 2) % r.length, dx = r[j] - r[i], dy = r[j + 1] - r[i + 1], d = dx * dx + dy * dy;
    if (d > best) { best = d; const l = Math.sqrt(d); ux = dx / l; uy = dy / l; }
  }
  if (ux < 0 || (ux === 0 && uy < 0)) { ux = -ux; uy = -uy; }
  return { ux, uy, vx: -uy, vy: ux, x: r[0], y: r[1] };
}
function pole(r: number[]) {
  let a = 0;
  for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; a += r[i] * r[j + 1] - r[j] * r[i + 1]; }
  return Math.abs(a) / 2;
}
function poleRamki(r: number[], os: Os) {
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) {
    const dx = r[i] - os.x, dy = r[i + 1] - os.y, u = dx * os.ux + dy * os.uy, v = dx * os.vx + dy * os.vy;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  return Math.max(1, (u1 - u0) * (v1 - v0));
}
function lagodneNarozniki(r: number[]) {
  const n = r.length / 2;
  let ostre = 0;
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, b = (i + 1) % n;
    const ax = r[i * 2] - r[a * 2], ay = r[i * 2 + 1] - r[a * 2 + 1], bx = r[b * 2] - r[i * 2], by = r[b * 2 + 1] - r[i * 2 + 1];
    if ((ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1) < 0.7) ostre++;
  }
  return ostre < 3;
}

function podzielDach(mask: Uint8Array, o: Obraz, x0: number, y0: number, os: Os, seed: number) {
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (mask[y * o.w + x]) {
    const dx = x0 + x + 0.5 - os.x, dy = y0 + y + 0.5 - os.y, u = dx * os.ux + dy * os.uy, v = dx * os.vx + dy * os.vy;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  u0 = Math.floor(u0 / SIATKA) * SIATKA; v0 = Math.floor(v0 / SIATKA) * SIATKA;
  const w = Math.max(1, Math.ceil((u1 - u0 + 1) / SIATKA)), h = Math.max(1, Math.ceil((v1 - v0 + 1) / SIATKA));
  const zajete = new Uint8Array(w * h), ids = new Uint8Array(w * h), skrzydla: Skrzydlo[] = [];
  const wewnatrz = (u: number, v: number) => {
    const x = Math.floor(os.x + u * os.ux + v * os.vx - x0), y = Math.floor(os.y + u * os.uy + v * os.vy - y0);
    return x >= 0 && y >= 0 && x < o.w && y < o.h && mask[y * o.w + x];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = u0 + (x + 0.5) * SIATKA, v = v0 + (y + 0.5) * SIATKA;
    if (wewnatrz(u, v) && wewnatrz(u - 2, v - 2) && wewnatrz(u + 2, v + 2)) zajete[y * w + x] = 1;
  }
  // Maksymalny prostokąt w masce, O(w*h) na skrzydło, bez testowania wszystkich par narożników.
  const wysokosci = new Int32Array(w), stosX = new Int32Array(w + 1), stosH = new Int32Array(w + 1);
  for (let iter = 0; iter < 12; iter++) {
    wysokosci.fill(0);
    let best = 0, bx = 0, by = 0, bw = 0, bh = 0;
    for (let y = 0; y < h; y++) {
      let ile = 0;
      for (let x = 0; x <= w; x++) {
        const hh = x === w ? 0 : (wysokosci[x] = zajete[y * w + x] ? wysokosci[x] + 1 : 0);
        let start = x;
        while (ile && stosH[ile - 1] > hh) {
          ile--; const sh = stosH[ile], sx = stosX[ile], area = sh * (x - sx);
          if (sh >= 2 && x - sx >= 2 && area > best) { best = area; bx = sx; by = y - sh + 1; bw = x - sx; bh = sh; }
          start = sx;
        }
        if (hh && (!ile || stosH[ile - 1] < hh)) { stosX[ile] = start; stosH[ile] = hh; ile++; }
      }
    }
    if (best < 6 || skrzydla.length >= 48) break;
    // Duże hale i zrośnięte kamienice: kilka czytelnych dachów zamiast jednego kopca.
    // Rozmiar sekcji wynika z geometrii, seed zmienia tylko materiał w lukarnie.
    const nx = Math.min(4, Math.max(1, Math.floor(bw * SIATKA / 92))), ny = Math.min(3, Math.max(1, Math.floor(bh * SIATKA / 80)));
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const ax = bx + Math.floor(i * bw / nx), ex = bx + Math.floor((i + 1) * bw / nx), ay = by + Math.floor(j * bh / ny), ey = by + Math.floor((j + 1) * bh / ny);
      skrzydla.push({ u0: u0 + ax * SIATKA, v0: v0 + ay * SIATKA, u1: u0 + ex * SIATKA, v1: v0 + ey * SIATKA, seed: seed + skrzydla.length * 37 });
      const id = skrzydla.length;
      for (let y = ay; y < ey; y++) for (let x = ax; x < ex; x++) { zajete[y * w + x] = 0; ids[y * w + x] = id; }
    }
  }
  return { u0, v0, w, h, ids, skrzydla };
}

function malujGzymsy(o: Obraz, mask: Uint8Array, rings: number[][], x0: number, y0: number, op: OpcjeBudynku, wallColors: Set<number>) {
  const S = MATERIALY[op.sciana], H = op.wysokosc, sk = op.skos ?? 0.35;
  const jasny = mieszaj(S.tony[4], hex('#d2c2a4'), 0.28), ciemny = mieszaj(S.tony[0], OBRYS, 0.25);
  const maluj = (wx: number, wy: number, c: number) => {
    const x = Math.round(wx - x0), y = Math.round(wy - y0);
    if (x < 0 || y < 0 || x >= o.w || y >= o.h) return;
    const k = y * o.w + x;
    if (!mask[k] && wallColors.has(o.px[k])) o.px[k] = c;
  };
  for (const r of rings) {
    let orientacja = 0;
    for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; orientacja += r[i] * r[j + 1] - r[j] * r[i + 1]; }
    const kier = orientacja > 0 ? 1 : -1;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length, dx = r[j] - r[i], dy = r[j + 1] - r[i + 1], L = Math.hypot(dx, dy);
      if (L < 7) continue;
      const ux = dx / L, uy = dy / L, nx = uy * kier, ny = -ux * kier;
      if (nx * sk + ny < 0.08) continue; // odwrócona ściana jest niewidoczna
      const swiatlo = nx * -0.6 + ny * -0.8;
      for (let t = 1; t < L - 1; t += 0.65) {
        const ax = r[i] + ux * t, ay = r[i + 1] + uy * t;
        for (const [s, c] of [[1, ciemny], [2, swiatlo > -0.6 ? jasny : S.tony[2]], [3, S.tony[0]]] as const) maluj(ax + s * sk, ay + s, c);
        // Kamienne naroża nie zmieniają okien: zapis tylko na kolorach ściany.
        if (t < 4 || t > L - 4) for (let s = 4; s < H - 2; s++) {
          const stone = Math.floor((H - s) / 3) % 2;
          if ((stone === 0 && (t < 3 || t > L - 3)) || stone === 1) maluj(ax + s * sk, ay + s, swiatlo > -0.6 ? jasny : S.tony[2]);
        }
      }
    }
  }
}

/** Kilka lukarn osadzonych na połaci. Każda sprawdza cały rysowany obszar. */
function lukarny(o: Obraz, mask: Uint8Array, malowalne: Uint8Array, x0: number, y0: number, os: Os, skrzydla: Skrzydlo[], op: OpcjeBudynku) {
  const D = MATERIALY[op.dach], S = MATERIALY[op.sciana], rama = hex('#463020'), szyba = hex(op.noc ? '#ecc86b' : '#354b62');
  const dodatnie = os.vx * 0.35 + os.vy > 0 ? 1 : -1;
  let ile = 0;
  for (const s of skrzydla) {
    if (ile >= 4) break;
    const du = s.u1 - s.u0, dv = s.v1 - s.v0;
    if (du < 38 || dv < 28) continue;
    const u = (s.u0 + s.u1) / 2, v = (s.v0 + s.v1) / 2 + dodatnie * dv * 0.23;
    const cx = Math.round(os.x + u * os.ux + v * os.vx - x0), cy = Math.round(os.y + u * os.uy + v * os.vy - y0);
    // Cały niewielki obiekt musi być na dachu, z daleka od istniejących ozdób.
    let wolne = true;
    for (let y = cy - 11; y <= cy + 2 && wolne; y++) for (let x = cx - 8; x <= cx + 8; x++) {
      if (x < 0 || y < 0 || x >= o.w || y >= o.h || !mask[y * o.w + x] || !malowalne[y * o.w + x]) { wolne = false; break; }
    }
    if (!wolne) continue;
    // Dwupołaciowy daszek i pionowa fasadka. Paleta materiałów tego budynku.
    for (let y = -8; y <= 1; y++) for (let x = -5; x <= 5; x++) {
      let c = 0;
      if (y <= -4) {
        const half = y + 9;
        if (Math.abs(x) <= half) c = Math.abs(x) === half ? OBRYS : x < 0 ? D.tony[4] : D.tony[1];
        if (x === 0 && y < -4) c = D.krawedz;
      } else if (Math.abs(x) <= 4) {
        c = x === -4 || x === 4 || y === 1 ? rama : S.tony[x < 0 ? 4 : 2];
        if (x >= -2 && x <= 2 && y >= -2 && y <= 0) c = x === -2 || x === 2 || x === 0 || y === -2 ? rama : szyba;
      }
      if (c) o.px[(cy + y) * o.w + cx + x] = c;
    }
    // Krótki cień kontaktowy od dołu; nie oddzielna tekstura.
    for (let x = -4; x <= 5; x++) o.px[(cy + 2) * o.w + cx + x] = D.tony[0];
    ile++;
  }
}

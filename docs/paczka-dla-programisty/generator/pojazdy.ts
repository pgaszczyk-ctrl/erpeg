// Pojazdy kolejowe z prostego modelu 3D, rysowane w KAŻDYM kierunku tą samą metodą co budynki:
// rzut jak w grze (góra obiektu przesunięta w lewo-górę o WALL_SKEW, wysokość ściśnięta jak ściany),
// światło z lewej-góry, 5 odcieni na materiał (bez gradientów i wygładzania), obrys #1e1a24.
// Dzięki temu lokomotywa w 16 kierunkach jest spójna klatka w klatkę i pasuje do domów, drzew i torów z generatora.
import { Obraz, nowy, hex, ustaw, wez, OBRYS } from './wspolne';

type Mat = 'mosiadz' | 'mosiadz_c' | 'zelazo' | 'zelazo_c' | 'czerwien' | 'kabina' | 'kabina_b' | 'dach' | 'szklo' | 'lampa' | 'wegiel' | 'drewno';
const R = (a: string[]) => a.map(hex);
/** Palety z generatora: mosiądz rur, żelazo, czerwień zaworów, patyna/bordo z dachów, łupek. */
export const PALETY_POJAZDOW: Record<Mat, number[]> = {
  mosiadz: R(['#4a3216', '#6b4a22', '#9a6420', '#c8963e', '#e9c56a']),
  mosiadz_c: R(['#3a2610', '#4a3216', '#6b4a22', '#9a6420', '#c8963e']),
  zelazo: R(['#1e1b24', '#2a2630', '#3a3440', '#55505c', '#6e6878']),
  zelazo_c: R(['#17141c', '#1e1b24', '#2a2630', '#3a3440', '#55505c']),
  czerwien: R(['#4e1a17', '#6e2420', '#8f322a', '#b2453a', '#cc6a52']),
  kabina: R(['#1f3a30', '#24463e', '#356256', '#4a8070', '#66a08c']),   // patyna (miedz_patyna)
  kabina_b: R(['#3a1418', '#521c22', '#6e2a2e', '#8a3a3a', '#a65450']), // bordo wagonu
  dach: R(['#1f2130', '#2c2f42', '#3c4256', '#525a70', '#6c7790']),     // łupek
  szklo: R(['#141c26', '#1c2836', '#2a3a4c', '#3e5468', '#6a8aa0']),
  lampa: R(['#8a6a20', '#c89a30', '#f0c850', '#fbe58a', '#fff6c8']),
  wegiel: R(['#141216', '#1e1b20', '#2a262c', '#3a3540', '#4e4852']),
  drewno: R(['#3e2a1c', '#5a3e28', '#765436', '#926c46', '#ae8858']),
};

/** Trafienie w model: materiał i normalna (w układzie modelu). */
export type Traf = [Mat, number, number, number];
export type Model = (x: number, y: number, z: number) => Traf | 0;

// bryły z normalnymi liczonymi wprost (bez szumu schodków)
const box = (m: Mat, x: number, y: number, z: number, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Traf | 0 => {
  if (x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1) return 0;
  const d = [x - x0, x1 - x, y - y0, y1 - y, z - z0, z1 - z], i = d.indexOf(Math.min(...d));
  return [m, i === 0 ? -1 : i === 1 ? 1 : 0, i === 2 ? -1 : i === 3 ? 1 : 0, i === 4 ? -1 : i === 5 ? 1 : 0];
};
/** Walec wzdłuż osi x (kocioł) albo y (koło). */
const walecX = (m: Mat, x: number, y: number, z: number, x0: number, x1: number, cy: number, cz: number, r: number): Traf | 0 => {
  const dy = y - cy, dz = z - cz, d = Math.hypot(dy, dz); if (x < x0 || x > x1 || d > r) return 0;
  if (x1 - x < 0.6) return [m, 1, 0, 0]; if (x - x0 < 0.6) return [m, -1, 0, 0];
  return [m, 0, dy / (d || 1), dz / (d || 1)];
};
const walecY = (m: Mat, x: number, y: number, z: number, y0: number, y1: number, cx: number, cz: number, r: number): Traf | 0 => {
  const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz); if (y < y0 || y > y1 || d > r) return 0;
  if (y1 - y < 0.6) return [m, 0, 1, 0]; if (y - y0 < 0.6) return [m, 0, -1, 0];
  return [m, dx / (d || 1), 0, dz / (d || 1)];
};
const walecZ = (m: Mat, x: number, y: number, z: number, z0: number, z1: number, cx: number, cy: number, r: number): Traf | 0 => {
  const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy); if (z < z0 || z > z1 || d > r) return 0;
  if (z1 - z < 0.6) return [m, 0, 0, 1];
  return [m, dx / (d || 1), dy / (d || 1), 0];
};
const kula = (m: Mat, x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number): Traf | 0 => {
  const dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz); if (d > r) return 0; return [m, dx / (d || 1), dy / (d || 1), dz / (d || 1)];
};
const pierwszy = (...t: (Traf | 0)[]) => { for (const v of t) if (v) return v; return 0 as const; };
const kolaPary = (x: number, y: number, z: number, xs: number[], r: number, y0: number, y1: number): Traf | 0 => {
  for (const cx of xs) for (const sg of [-1, 1]) {
    const t = walecY('czerwien', x, y * sg, z, y0, y1, cx, r, r); if (!t) continue;
    const d = Math.hypot(x - cx, z - r); const m: Mat = d > r - 1 ? 'zelazo' : d < 1.2 ? 'mosiadz' : 'czerwien';
    return [m, t[1], t[2] * sg, t[3]];
  }
  return 0;
};

/** Lokomotywa: x = wzdłuż (przód +x), y = w poprzek, z = w górę; jednostka = 1 px świata. Długość ok. 58 px. */
export const lokomotywa: Model = (x, y, z) => {
  const ay = Math.abs(y), sy = y < 0 ? -1 : 1;
  const zg = (x > 25 && x < 31 && z >= 1 && z < 6 && ay < (31 - x) * 1.3 + 1) ? ['czerwien', 0.6, 0, 0.8] as Traf : 0; // zgarniacz
  const kocio = walecX('mosiadz', x, y, z, -9, 21, 0, 13.5, 6);
  const kociol: Traf | 0 = kocio && [0, 13].some((c) => Math.abs(x - c) < 0.6) ? ['mosiadz_c', kocio[1], kocio[2], kocio[3]] : kocio;
  const komin = walecZ(z > 27 ? 'mosiadz' : 'zelazo', x, y, z, 18, 28, 22.5, 0, z > 24.5 ? 3.4 : 2.3);
  const kabinaS = box('kabina', x, y, z, -26, -10, -6.6, 6.6, 7, 21);
  const kab: Traf | 0 = kabinaS && z > 14 && z < 19 && ((ay > 5.8 && x > -23 && x < -13) || (x > -11 && ay > 1.4 && ay < 5)) ? ['szklo', kabinaS[1], kabinaS[2], kabinaS[3]] : kabinaS;
  const dachH = 23.4 - (ay / 7.6) ** 2 * 1.8;
  const dach: Traf | 0 = x >= -27.5 && x <= -8.5 && ay <= 7.6 && z > 21 && z <= dachH ? ['dach', 0, sy * (ay / 7.6) * 0.8, 1] : 0;
  return pierwszy(
    zg, kolaPary(x, y, z, [-15, -4, 7], 5.2, 3.2, 5.4), kolaPary(x, y, z, [18.5, 24], 3, 3, 4.8),
    x >= -15 && x <= 7 && Math.abs(z - 4) < 0.9 && ay > 5.4 && ay < 6.3 ? ['mosiadz', 0, sy, 0.3] : 0,     // korbowód
    box('zelazo', x, y, z, -27, 27, -5.8, 5.8, 5, 7.5),                                                  // rama
    kociol, walecX('zelazo', x, y, z, 21, 26, 0, 13.5, 6.3),                                             // dymnica
    x > 25.5 && x < 27.8 && Math.hypot(y, z - 17.5) < 1.9 ? ['lampa', 1, 0, 0.3] : 0,
    komin, kula('mosiadz', x, y, z, 7, 0, 19, 3.4), kula('mosiadz', x, y, z, -3, 0, 19.4, 2.2),
    x > -8 && x < 20 && ay > 6 && ay < 6.9 && Math.abs(z - 11) < 0.6 ? ['mosiadz_c', 0, sy, 0.4] : 0,
    kab, dach,
  );
};

/** Tender: węgiel i woda. Długość ok. 30 px. */
export const tender: Model = (x, y, z) => {
  const ay = Math.abs(y), sy = y < 0 ? -1 : 1;
  const sk = box('kabina', x, y, z, -14, 14, -6.4, 6.4, 6.5, 15);
  const skrz: Traf | 0 = sk && ([-13.5, 13.5].some((c) => Math.abs(x - c) < 0.8) || z > 14.2) ? ['zelazo', sk[1], sk[2], sk[3]] : sk;
  const hw = 15 + 3.2 * (1 - (x / 12) ** 2) * (1 - (ay / 5.4) ** 2) + 0.6;
  const wegiel: Traf | 0 = x >= -12 && x <= 12 && ay <= 5.4 && z > 15 && z <= hw ? ['wegiel', -x / 40, sy * ay / 14, 1] : 0;
  return pierwszy(kolaPary(x, y, z, [-8, 8], 3.4, 3, 4.8), box('zelazo', x, y, z, -15, 15, -5.8, 5.8, 4, 6.5), wegiel, skrz);
};

/** Wagon osobowy (kolor: 'kabina' = zielony, 'kabina_b' = bordo). Długość ok. 56 px. */
export const wagonOsobowy = (kolor: 'kabina' | 'kabina_b' = 'kabina_b'): Model => (x, y, z) => {
  const ay = Math.abs(y), sy = y < 0 ? -1 : 1;
  const ps = box(kolor, x, y, z, -26, 26, -6.6, 6.6, 6.5, 18);
  let pud: Traf | 0 = ps;
  if (ps) {
    if (ay > 5.8 && z > 11 && z < 15.5 && Math.abs(((x + 26) % 8) - 4) < 2.4 && x > -23 && x < 23) pud = ['szklo', ps[1], ps[2], ps[3]];
    else if (z < 8.2 || [-25.5, 25.5].some((c) => Math.abs(x - c) < 0.7)) pud = ['drewno', ps[1], ps[2], ps[3]];
  }
  const dachH = 20.8 - (ay / 7.4) ** 2 * 2;
  const dach: Traf | 0 = x >= -27.5 && x <= 27.5 && ay <= 7.4 && z > 18 && z <= dachH ? ['dach', 0, sy * (ay / 7.4) * 0.9, 1] : 0;
  return pierwszy(kolaPary(x, y, z, [-21, -15, 15, 21], 3, 3, 4.8), box('zelazo', x, y, z, -27, 27, -5.8, 5.8, 4, 6.5), dach, pud);
};

export interface OpcjePojazdu { skos?: number; sciskZ?: number; rozmiar?: number; zMax?: number }

/**
 * Rysuje model w kierunku `katDeg` (0 = jedzie w prawo, zgodnie z ruchem wskazówek zegara, jak tor na mapie).
 * Punkt (rozmiar/2, 0,58·rozmiar) klatki = środek pojazdu na torze. Zwraca klatkę `rozmiar`×`rozmiar` (domyślnie 96) z obrysem.
 * Rzut: punkt (x, y, z) świata trafia w (x − skos·z′, y − z′), z′ = z·sciskZ – tak jak ściany budynków (dach u góry, ściany pod nim).
 */
export function rysujPojazd(model: Model, katDeg: number, op: OpcjePojazdu = {}): Obraz {
  const S = op.rozmiar ?? 96, sk = op.skos ?? 0.35, kz = op.sciskZ ?? 0.85, zMax = op.zMax ?? 30;
  const o = nowy(S, S), c = S / 2, cyy = S * 0.58, th = (katDeg * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
  const mat = new Array<Mat | 0>(S * S).fill(0), tone = new Uint8Array(S * S), dep = new Float32Array(S * S);
  const L = [-0.5, -0.62, 0.6], Ln = Math.hypot(L[0], L[1], L[2]);
  const at = (wx: number, wy: number, z: number) => { const mx = wx * co + wy * si, my = -wx * si + wy * co; return model(mx, my, z); };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const sx = i + 0.5 - c, sy = j + 0.5 - cyy;
    for (let z = zMax; z >= 0; z -= 0.25) {
      const zp = z * kz, wx = sx + sk * zp, wy = sy + zp, m = at(wx, wy, z);
      if (!m) continue;
      const [mm, ax, ay2, az] = m;
      const nx = ax * co - ay2 * si, ny = ax * si + ay2 * co, nz = az;
      const nl = Math.hypot(nx, ny, nz) || 1, lum = (nx * L[0] + ny * L[1] + nz * L[2]) / nl / Ln;
      const t = mm === 'lampa' ? 3 + (lum > 0.3 ? 1 : 0) : lum > 0.72 ? 4 : lum > 0.38 ? 3 : lum > 0.02 ? 2 : lum > -0.4 ? 1 : 0;
      mat[j * S + i] = mm; tone[j * S + i] = t; dep[j * S + i] = z; break;
    }
  }
  // linie wewnętrzne: zmiana materiału albo skok głębokości → piksel dalszy o 2 odcienie ciemniej
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = j * S + i, m = mat[k]; if (!m) continue;
    let t = tone[k];
    for (const [di, dj] of [[0, -1], [-1, 0]]) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0) continue; const q = jj * S + ii; if (!mat[q]) continue;
      if ((mat[q] !== m && m !== 'lampa' && m !== 'szklo') || dep[k] < dep[q] - 3) t = Math.max(0, t - 2);
    }
    o.px[k] = PALETY_POJAZDOW[m][t];
  }
  obrysOkolo(o);
  return o;
}

/** Obrys na zewnątrz sylwetki (1 px, kolor gry #1e1a24). */
function obrysOkolo(o: Obraz) {
  const add: number[] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    if (wez(o, x, y) >>> 24) continue;
    if ((wez(o, x + 1, y) | wez(o, x - 1, y) | wez(o, x, y + 1) | wez(o, x, y - 1)) >>> 24) add.push(x, y);
  }
  for (let i = 0; i < add.length; i += 2) ustaw(o, add[i], add[i + 1], OBRYS);
}

/** Cień pojazdu na ziemi (czarna sylwetka do przyciemnienia podłoża), ta sama siatka co klatka. */
export function cienPojazdu(model: Model, katDeg: number, op: OpcjePojazdu = {}): Obraz {
  const S = op.rozmiar ?? 96, c = S / 2, cyy = S * 0.58, th = (katDeg * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
  const o = nowy(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const wx = i + 0.5 - c - 3, wy = j + 0.5 - cyy - 1.5; // przesunięcie w prawo-dół jak cienie domów
    const mx = wx * co + wy * si, my = -wx * si + wy * co;
    for (let z = 2; z < 20; z += 3) if (model(mx, my, z)) { o.px[j * S + i] = 0xff000000; break; }
  }
  return o;
}

/** Klatka dla kąta toru: lokomotywa i tender 16 kierunków, wagony 8 (symetryczne). */
export const klatkaKierunku = (katDeg: number, kierunkow: 16 | 8) =>
  kierunkow === 16 ? Math.round((((katDeg % 360) + 360) % 360) / 22.5) % 16 : Math.round((((katDeg % 180) + 180) % 180) / 22.5) % 8;

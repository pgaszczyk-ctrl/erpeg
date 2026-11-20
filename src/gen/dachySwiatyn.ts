// Dachy-bryły generowane nad obrysem (właściciel 20.11.2026: najpierw świątynie – „musisz znaleźć inny sposób na
// rysowanie takich dachów”, potem: „o rewelacja… wymyśl, jak od-nudzić wygląd budynków”). Dach NIE jest obrazkiem na
// dachu: to powierzchnia obrotowa zbudowana nad obrysem budynku. Każdy przekrój na wysokości t to obrys przeskalowany
// ku środkowi (u dołu dokładnie ściany), wyżej coraz bardziej okrągły. Profil formy decyduje o kształcie, strefy –
// o materiale (połać, bęben z oknami, kopuła, spirala, zegar, hełm, maszt z cewką). Powierzchnia jest próbkowana w 3D,
// rzutowana pionowo w górę ekranu z buforem głębokości i cieniowana z normalnej (światło z północnego zachodu).
// Formy: cerkiew, meczet (świątynie), biblioteka (wieża ze spiralą), obserwatorium (uczelnia), ratusz (wieża zegarowa
// z hełmem), antena (maszt z cewką na płaskim dachu wieżowca). Bez DOM-u.
import { type Obraz, ustaw, hex, OBRYS, hash } from './wspolne';

export type RodzajDachu = 'cerkiew' | 'meczet' | 'biblioteka' | 'obserwatorium' | 'ratusz' | 'antena';

const P = (a: string[]) => a.map(hex);
const BLACHY: Record<string, number[]> = {
  zloto: P(['#5a3c0e', '#8a6018', '#b98a28', '#dcb44c', '#f6e08e']),
  zielen: P(['#173229', '#24493c', '#346650', '#4f8a6c', '#7cb295']),
  niebo: P(['#172d47', '#25466a', '#376391', '#5687b7', '#86b1d8']),
  olow: P(['#33373e', '#4b5059', '#666d78', '#8890a0', '#b4bac6']),
  patyna: P(['#1f3f38', '#2e5a50', '#437a6a', '#62a08a', '#8ec4ad']),
  lupek: P(['#1e2030', '#2b2e41', '#3b4155', '#51596f', '#6b768f']),
  dachowka: P(['#4e1f1c', '#6e2c24', '#8f3a2c', '#ad5036', '#c86a44']),
  mosiadz: P(['#4a3410', '#7a5a1c', '#a8822c', '#d0a848', '#f0d27e']),
  zelazo: P(['#1c1c22', '#2a2a32', '#3c3c46', '#54545e', '#70707c']),
};
const TYNK = P(['#7e7868', '#a49c88', '#c6bea8', '#ddd6c2', '#f1ecdc']);
const CEGLA = P(['#4e2723', '#6e362c', '#8a4836', '#a5644a', '#bc7c5c']);
const OKNO = hex('#2c2c3a');
const TARCZA = hex('#f4efe0');

type Strefa = 'polac' | 'beben' | 'kopula' | 'spirala' | 'zegar' | 'helm' | 'maszt' | 'kula';
interface Przekroj { s: number; k: number; z: Strefa }
interface Forma {
  /** Height of the whole roof in radii of the roof's equal-area circle. */
  wys: number;
  /** Largest radius used (map px of the picture) – a tower block's mast must not grow with the block. */
  rMaks?: number;
  profil: (t: number) => Przekroj;
  polac: (seed: number) => number[];
  kopula: (seed: number) => number[];
  /** Windows of the drum: how many, and the drum's t from–to. */
  okna?: [number, number, number];
  szczyt?: 'krzyz' | 'polksiezyc' | 'iglica' | 'kula' | null;
  /** A dark slit along the southern meridian (observatory). */
  szczelina?: boolean;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
const kul = (u: number) => Math.sqrt(Math.max(0, 1 - u * u));

const FORMY: Record<RodzajDachu, Forma> = {
  cerkiew: {
    wys: 1.75, szczyt: 'krzyz', okna: [12, 0.2, 0.38],
    polac: () => BLACHY.zielen,
    kopula: (s) => (hash(s, 3, 7) < 0.55 ? BLACHY.zloto : hash(s, 4, 7) < 0.55 ? BLACHY.niebo : BLACHY.zielen),
    profil: (t) => {
      if (t < 0.2) return { s: lerp(1, 0.46, t / 0.2), k: lerp(0, 1, t / 0.2), z: 'polac' };
      if (t < 0.38) return { s: 0.46, k: 1, z: 'beben' };
      if (t < 0.42) return { s: lerp(0.46, 0.4, (t - 0.38) / 0.04), k: 1, z: 'kopula' };
      if (t < 0.78) { const u = (t - 0.42) / 0.36; return { s: 0.4 + 0.24 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)), k: 1, z: 'kopula' }; }
      const u = (t - 0.78) / 0.22, s78 = 0.4 + 0.24 * Math.sin(Math.PI * 0.95);
      return { s: s78 * Math.pow(1 - u, 1.7), k: 1, z: 'kopula' };
    },
  },
  meczet: {
    wys: 1.0, szczyt: 'polksiezyc', okna: [16, 0.14, 0.32],
    polac: () => BLACHY.olow,
    kopula: (s) => (hash(s, 5, 9) < 0.5 ? BLACHY.olow : BLACHY.niebo),
    profil: (t) => {
      if (t < 0.14) return { s: lerp(1, 0.78, t / 0.14), k: lerp(0, 1, t / 0.14), z: 'polac' };
      if (t < 0.32) return { s: 0.78, k: 1, z: 'beben' };
      return { s: 0.82 * kul((t - 0.32) / 0.68), k: 1, z: 'kopula' };
    },
  },
  // Library: a slate roof rising into a round tower wound with a brass spiral, ending in a patinated spire.
  biblioteka: {
    wys: 2.5, rMaks: 30, szczyt: 'kula',
    polac: () => BLACHY.lupek,
    kopula: () => BLACHY.patyna,
    profil: (t) => {
      if (t < 0.1) return { s: lerp(1, 0.4, t / 0.1), k: lerp(0, 1, t / 0.1), z: 'polac' };
      if (t < 0.64) return { s: 0.4, k: 1, z: 'spirala' };
      if (t < 0.67) return { s: lerp(0.4, 0.47, (t - 0.64) / 0.03), k: 1, z: 'helm' };
      return { s: 0.47 * (1 - (t - 0.67) / 0.33), k: 1, z: 'helm' };
    },
  },
  // University: an observatory dome of patinated copper on a low drum, the telescope's slit facing south.
  obserwatorium: {
    wys: 0.8, rMaks: 34, szczyt: 'kula', okna: [10, 0.12, 0.3], szczelina: true,
    polac: () => BLACHY.lupek,
    kopula: () => BLACHY.patyna,
    profil: (t) => {
      if (t < 0.12) return { s: lerp(1, 0.7, t / 0.12), k: lerp(0, 1, t / 0.12), z: 'polac' };
      if (t < 0.3) return { s: 0.7, k: 1, z: 'beben' };
      return { s: 0.72 * kul((t - 0.3) / 0.7), k: 1, z: 'kopula' };
    },
  },
  // Town hall: a tiled hip roof rising into a brick clock tower with a copper bulb helmet and an iron spire.
  ratusz: {
    wys: 2.5, rMaks: 34, szczyt: 'iglica',
    polac: (s) => (hash(s, 8, 3) < 0.5 ? BLACHY.dachowka : BLACHY.lupek),
    kopula: () => BLACHY.patyna,
    profil: (t) => {
      if (t < 0.22) return { s: lerp(1, 0.3, t / 0.22), k: 0, z: 'polac' };
      if (t < 0.6) return { s: 0.3, k: 0.15, z: 'zegar' };
      if (t < 0.64) return { s: lerp(0.3, 0.34, (t - 0.6) / 0.04), k: 0.6, z: 'helm' };
      if (t < 0.84) { const u = (t - 0.64) / 0.2; return { s: 0.22 + 0.14 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.1)), k: 1, z: 'helm' }; }
      return { s: 0.1 * Math.pow(1 - (t - 0.84) / 0.16, 1.2), k: 1, z: 'helm' };
    },
  },
  // Tower block: on its flat roof an iron mast wound with a brass coil, a brass ball on top.
  antena: {
    wys: 2.6, rMaks: 14, szczyt: null,
    polac: () => BLACHY.zelazo,
    kopula: () => BLACHY.mosiadz,
    profil: (t) => {
      if (t < 0.06) return { s: 0.42, k: 1, z: 'polac' };
      if (t < 0.88) return { s: lerp(0.16, 0.07, (t - 0.06) / 0.82), k: 1, z: 'maszt' };
      return { s: 0.2 * kul((t - 0.94) / 0.06), k: 1, z: 'kula' };
    },
  },
};

/** Distance from the centre to the outline along an angle (the farthest crossing). */
function promienObrysu(r: number[], cx: number, cy: number, a: number) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let best = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ax = r[j] - cx, ay = r[j + 1] - cy, bx = r[i] - cx, by = r[i + 1] - cy;
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best;
}

/** Equal-area radius (capped by the form) and the height of a form's roof over this outline. */
export function wymiaryDachu(pierscien: number[], rodzaj: RodzajDachu) {
  let pole = 0;
  for (let i = 0, j = pierscien.length - 2; i < pierscien.length; j = i, i += 2) pole += (pierscien[j] - pierscien[i]) * (pierscien[j + 1] + pierscien[i + 1]) / 2;
  const F = FORMY[rodzaj];
  const rKolo = Math.min(Math.sqrt(Math.abs(pole) / Math.PI), F.rMaks ?? Infinity);
  return { rKolo, H: rKolo * F.wys };
}

/**
 * Builds the roof over the outline on the building's picture. `pierscien` = the outline in the picture's
 * coordinates; `gora` = rows of room the caller added above. Returns where the finial goes.
 */
export function dachSwiatyni(o: Obraz, pierscien: number[], rodzaj: RodzajDachu, seed: number, gora: number, polac?: number[]): { cx: number; szczyt: number } {
  const F = FORMY[rodzaj];
  // Middle of the outline's area (not of its corners: a corner-heavy side would pull the roof towards it).
  let sx = 0, sy = 0, a2 = 0;
  for (let i = 0, j = pierscien.length - 2; i < pierscien.length; j = i, i += 2) {
    const c = pierscien[j] * pierscien[i + 1] - pierscien[i] * pierscien[j + 1];
    a2 += c; sx += (pierscien[j] + pierscien[i]) * c; sy += (pierscien[j + 1] + pierscien[i + 1]) * c;
  }
  const cx = sx / (3 * a2), cy = sy / (3 * a2);
  const KATY = 180;
  const rho = new Float64Array(KATY);
  for (let k = 0; k < KATY; k++) rho[k] = promienObrysu(pierscien, cx, cy, (k / KATY) * Math.PI * 2);
  const rMax = Math.max(...rho);
  const rKolo = Math.min(wymiaryDachu(pierscien, rodzaj).rKolo, rMax);
  const H = Math.round(rKolo * F.wys);
  const tonyKopuly = F.kopula(seed), tonyPolaci = polac ?? F.polac(seed);
  const glebia = new Float32Array(o.w * o.h).fill(-Infinity);
  const zrodlo = new Int8Array(o.w * o.h).fill(-1);
  const kolor = new Uint32Array(o.w * o.h);
  const Lx = -0.55, Ly = -0.45, Lz = 0.7;
  const krokT = 0.22 / Math.max(8, H);
  const punkt = (k: number, t: number) => {
    const { s, k: okr } = F.profil(t);
    const r = s * ((1 - okr) * rho[k] + okr * rKolo);
    const a = (k / KATY) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, t * H];
  };
  const nastepne = (t: number) => {
    let dt = krokT;
    while (dt > 1e-5 && Math.abs(F.profil(Math.min(1, t + dt)).s - F.profil(t).s) * rMax > 0.35) dt /= 2;
    return t + dt;
  };
  for (let t = 0; t <= 1; t = nastepne(t)) {
    const { s, k: okr, z: strefa } = F.profil(t);
    const obwod = Math.PI * 2 * s * ((1 - okr) * rMax + okr * rKolo);
    const krokA = Math.max(1, Math.ceil(obwod / 0.45));
    for (let q = 0; q < krokA; q++) {
      const kf = (q / krokA) * KATY, k0 = Math.floor(kf) % KATY, k1 = (k0 + 1) % KATY, f = kf - Math.floor(kf);
      const p0 = punkt(k0, t), p1 = punkt(k1, t);
      const x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f, z = p0[2];
      const pu = punkt(k0, Math.min(1, t + 0.01)), pd = punkt(k0, Math.max(0, t - 0.01));
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1];
      const ux = pu[0] - pd[0], uy = pu[1] - pd[1], uz = pu[2] - pd[2];
      let nx = ay * uz, ny = -ax * uz, nz = ax * uy - ay * ux;
      const dl = Math.hypot(nx, ny, nz);
      if (dl < 1e-9 || F.profil(Math.min(1, t + 0.02)).s < 0.04) {
        const rx = x - cx, ry = y - cy, rl = Math.hypot(rx, ry) || 1;
        nx = (rx / rl) * 0.3; ny = (ry / rl) * 0.3; nz = 0.95;
      } else { nx /= dl; ny /= dl; nz /= dl; }
      if (nx * (x - cx) + ny * (y - cy) < 0 && nz < 0.99) { nx = -nx; ny = -ny; nz = -nz; }
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const X = Math.round(x), Y = Math.round(y - z) + gora;
      if (X < 0 || Y < 0 || X >= o.w || Y >= o.h) continue;
      const d = y + z * 0.01, id = Y * o.w + X;
      if (d <= glebia[id]) continue;
      glebia[id] = d;
      let jas = nx * Lx + ny * Ly + nz * Lz;
      const ton = (tony: number[], j = jas) => tony[Math.max(0, Math.min(4, Math.round(1.8 + j * 2.4)))];
      const kat = (k0 + f) / KATY; // 0..1 around; 0.25 = south (screen down)
      switch (strefa) {
        case 'beben': {
          const [ile, od, doo] = F.okna ?? [12, 0, 1], fa = kat * ile;
          const okno = Math.abs(fa - Math.round(fa)) < 0.12 && t > od + 0.03 && t < doo - 0.04;
          kolor[id] = okno ? OKNO : t > doo - 0.015 ? TYNK[4] : ton(TYNK, jas * 0.9 + 0.1);
          break;
        }
        case 'spirala': {
          // A brass band wound round the plastered tower, narrow windows between the turns.
          const fsp = (kat * 1 + t * 5 + 10) % 1;
          const okno = Math.abs(((kat * 8) % 1) - 0.5) < 0.07 && fsp > 0.45 && fsp < 0.75;
          kolor[id] = fsp < 0.22 ? ton(BLACHY.mosiadz, jas + 0.15) : okno ? OKNO : ton(TYNK, jas * 0.9 + 0.1);
          break;
        }
        case 'zegar': {
          // Brick tower, a clock face on its southern side under the helmet.
          const u = (kat - 0.25) / 0.07, v = (t - 0.5) / 0.065, r2 = u * u + v * v;
          if (r2 < 1) kolor[id] = r2 > 0.62 ? ton(BLACHY.mosiadz) : (Math.abs(u) < 0.14 && v > -0.05) || (Math.abs(v) < 0.14 && u > -0.05 && u < 0.55) ? OBRYS : TARCZA;
          else kolor[id] = ton(CEGLA, jas * 0.9);
          break;
        }
        case 'maszt': {
          const fsp = (kat + t * 16) % 1;
          kolor[id] = fsp < 0.4 ? ton(BLACHY.mosiadz, jas + 0.2) : ton(BLACHY.zelazo);
          break;
        }
        case 'kula': kolor[id] = ton(BLACHY.mosiadz, jas + 0.3); break;
        default: {
          // Sheet metal / tiles: seams along the meridians on domes and helmets, a darker eave on the skirt.
          const krok = KATY / 24, zebro = Math.round(kf / krok) * krok;
          if ((strefa === 'kopula' || strefa === 'helm') && Math.abs(kf - zebro) < 0.5 && t < 0.88) jas -= 0.2;
          if (strefa === 'polac' && t < 0.02) jas -= 0.3;
          if (F.szczelina && strefa === 'kopula' && Math.abs(kat - 0.25) < 0.016 && t > 0.33) { kolor[id] = OKNO; break; }
          kolor[id] = ton(strefa === 'polac' ? tonyPolaci : tonyKopuly);
        }
      }
      zrodlo[id] = 1;
    }
  }
  let szczyt = o.h;
  for (let i = 0; i < o.w * o.h; i++) if (zrodlo[i] > 0) { o.px[i] = kolor[i]; szczyt = Math.min(szczyt, Math.floor(i / o.w)); }
  const dodaj: number[] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const i = y * o.w + x;
    if (zrodlo[i] > 0) continue;
    if ((x > 0 && zrodlo[i - 1] > 0) || (x < o.w - 1 && zrodlo[i + 1] > 0) || (y > 0 && zrodlo[i - o.w] > 0) || (y < o.h - 1 && zrodlo[i + o.w] > 0)) dodaj.push(i);
  }
  for (const i of dodaj) o.px[i] = OBRYS;
  return { cx: Math.round(cx), szczyt };
}

/** The finial: a gold cross, a crescent-topped spike, an iron spire or a brass ball. */
export function zwienczenie(o: Obraz, x: number, szczyt: number, rodzaj: RodzajDachu, r: number) {
  const typ = FORMY[rodzaj].szczyt;
  if (!typ) return;
  const zl = BLACHY.zloto[3], h = Math.max(4, Math.round(r * 0.5));
  if (typ === 'kula') {
    for (let j = 1; j <= 3; j++) ustaw(o, x, szczyt - j, BLACHY.mosiadz[2]);
    for (const [dx, dy, c] of [[0, -4, 3], [-1, -5, 4], [0, -5, 4], [1, -5, 2], [-1, -6, 4], [0, -6, 3], [1, -6, 2], [0, -7, 3]]) ustaw(o, x + dx, szczyt + dy, BLACHY.mosiadz[c]);
    return;
  }
  const kol = typ === 'iglica' ? BLACHY.zelazo[3] : zl;
  for (let j = 1; j <= h; j++) ustaw(o, x, szczyt - j, kol);
  if (typ === 'krzyz') {
    const ramie = Math.max(1, Math.round(r * 0.18));
    for (let i = -ramie; i <= ramie; i++) ustaw(o, x + i, szczyt - Math.round(h * 0.65), zl);
  } else if (typ === 'polksiezyc') { ustaw(o, x - 1, szczyt - h, zl); ustaw(o, x + 1, szczyt - h, zl); }
  else { ustaw(o, x - 1, szczyt - Math.round(h * 0.4), kol); ustaw(o, x + 1, szczyt - Math.round(h * 0.4), kol); ustaw(o, x, szczyt - h - 1, zl); }
}

/** Largest radius a form uses (Infinity = no cap). */
export const rMaksFormy = (rodzaj: RodzajDachu) => FORMY[rodzaj].rMaks ?? Infinity;

/**
 * The most regular part of an outline (owner, 20 Nov 2026: on an irregular block „find the most regular part of the
 * roof, put the dome there and twist only that part”): the biggest rectangle, square-ish (sides at most 1.5:1) and no
 * bigger than the form needs, lying wholly inside the outline, turned along the building's longest wall. Returns its
 * ring, or null when nothing usable fits.
 */
export function czescRegularna(r: number[], rMaks: number): number[] | null {
  let best = 0, ux = 1, uy = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const dx = r[i] - r[j], dy = r[i + 1] - r[j + 1], L = Math.hypot(dx, dy);
    if (L > best) { best = L; ux = dx / L; uy = dy / L; }
  }
  // Outline in the wall-aligned frame (u along the wall, v across).
  const q: number[] = [];
  for (let i = 0; i < r.length; i += 2) q.push(r[i] * ux + r[i + 1] * uy, -r[i] * uy + r[i + 1] * ux);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < q.length; i += 2) { u0 = Math.min(u0, q[i]); u1 = Math.max(u1, q[i]); v0 = Math.min(v0, q[i + 1]); v1 = Math.max(v1, q[i + 1]); }
  const C = Math.max(1, Math.max(u1 - u0, v1 - v0) / 140); // grid cell
  const NU = Math.ceil((u1 - u0) / C), NV = Math.ceil((v1 - v0) / C);
  const wew = new Uint8Array(NU * NV);
  for (let j = 0; j < NV; j++) {
    const v = v0 + (j + 0.5) * C, xs: number[] = [];
    for (let i = 0, k = q.length - 2; i < q.length; k = i, i += 2) {
      const ay = q[k + 1], by = q[i + 1];
      if ((ay > v) !== (by > v)) xs.push(q[k] + ((v - ay) * (q[i] - q[k])) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let i = Math.ceil((xs[k] - u0) / C - 0.5 + 0.5); i < Math.floor((xs[k + 1] - u0) / C - 0.5); i++) if (i >= 0 && i < NU) wew[j * NU + i] = 1;
  }
  // Biggest rectangle of inside cells (histogram method), sides clipped to 1.5:1 and to the form's size.
  const maxBok = Math.max(4, (rMaks * 2.4) / C);
  const wys = new Int32Array(NU);
  let pole = 0, R: [number, number, number, number] | null = null;
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) wys[i] = wew[j * NU + i] ? wys[i] + 1 : 0;
    for (let i = 0; i < NU; i++) {
      let h = Infinity;
      for (let k = i; k >= 0 && wys[k] > 0; k--) {
        h = Math.min(h, wys[k]);
        let w = i - k + 1, hh = h;
        w = Math.min(w, hh * 1.5, maxBok); hh = Math.min(hh, w * 1.5, maxBok);
        if (w * hh > pole) {
          pole = w * hh;
          // Centre the clipped rectangle inside the free one.
          const cu = (k + i + 1) / 2, cv = j + 1 - h / 2;
          R = [cu - w / 2, cv - hh / 2, cu + w / 2, cv + hh / 2];
        }
      }
    }
  }
  if (!R || pole * C * C < 400 || R[2] - R[0] < 4 || R[3] - R[1] < 4) return null;
  const [a, b, c, d] = [R[0] + 1, R[1] + 1, R[2] - 1, R[3] - 1].map((v, i) => (i % 2 ? v0 : u0) + v * C);
  const out: number[] = [];
  for (const [u, v] of [[a, b], [c, b], [c, d], [a, d]]) out.push(u * ux - v * uy, u * uy + v * ux);
  return out;
}

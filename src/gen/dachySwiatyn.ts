// Dachy świątyń generowane jako bryła (właściciel 20.11.2026: „wciąż rysujesz tak jak wcześniej i dodajesz obrazek –
// musisz znaleźć inny sposób na rysowanie takich dachów”). Dach NIE jest obrazkiem na dachu: to powierzchnia obrotowa
// zbudowana nad obrysem budynku. Każdy przekrój na wysokości t to obrys przeskalowany ku środkowi; u dołu dokładnie
// ściany budynku, wyżej coraz bardziej okrągły. Profil decyduje o kształcie: cerkiew = cebula (prosty pas, brzuch,
// wklęsły szpic), meczet = kopuła na niskim bębnie. Powierzchnia jest próbkowana w 3D, rzutowana jak reszta świata
// (w górę = w górę ekranu, przechył ścian 0,35), z buforem głębokości, cieniowana z normalnej (światło z
// północnego zachodu) tonami blachy i z żebrami/pasami blachy. Bez DOM-u.
import { type Obraz, ustaw, hex, OBRYS, hash } from './wspolne';

export type RodzajDachu = 'cerkiew' | 'meczet';

const BLACHY: Record<string, number[]> = {
  zloto: ['#5a3c0e', '#8a6018', '#b98a28', '#dcb44c', '#f6e08e'].map(hex),
  zielen: ['#173229', '#24493c', '#346650', '#4f8a6c', '#7cb295'].map(hex),
  niebo: ['#172d47', '#25466a', '#376391', '#5687b7', '#86b1d8'].map(hex),
  olow: ['#33373e', '#4b5059', '#666d78', '#8890a0', '#b4bac6'].map(hex),
};
/** Things rising above a roof stand upright, like trees and people (walls keep their own lean). */
const SKOS = 0;
const TYNK = ['#7e7868', '#a49c88', '#c6bea8', '#ddd6c2', '#f1ecdc'].map(hex);
const OKNO = hex('#2c2c3a');

/** Zones of the roof (each its own material): sloping roof, plastered drum with windows, the dome. */
type Strefa = 'polac' | 'beben' | 'kopula';
/**
 * Profile: scale of the cross-section at height t ∈ [0, 1] (1 = the walls' outline), how round it is there
 * (0 = the outline, 1 = a circle) and the zone. One continuous surface from the eaves to the tip.
 */
function profil(rodzaj: RodzajDachu, t: number): { s: number; k: number; z: Strefa } {
  const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
  if (rodzaj === 'cerkiew') {
    if (t < 0.2) return { s: lerp(1, 0.46, t / 0.2), k: lerp(0, 1, t / 0.2), z: 'polac' };      // roof skirt
    if (t < 0.38) return { s: 0.46, k: 1, z: 'beben' };                                         // drum
    if (t < 0.42) return { s: lerp(0.46, 0.4, (t - 0.38) / 0.04), k: 1, z: 'kopula' };          // neck
    if (t < 0.78) { const u = (t - 0.42) / 0.36; return { s: 0.4 + 0.24 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)), k: 1, z: 'kopula' }; }
    const u = (t - 0.78) / 0.22, s78 = 0.4 + 0.24 * Math.sin(Math.PI * 0.95);
    return { s: s78 * Math.pow(1 - u, 1.7), k: 1, z: 'kopula' };                                 // onion's tip
  }
  if (t < 0.14) return { s: lerp(1, 0.78, t / 0.14), k: lerp(0, 1, t / 0.14), z: 'polac' };
  if (t < 0.32) return { s: 0.78, k: 1, z: 'beben' };
  const u = (t - 0.32) / 0.68;
  return { s: 0.82 * Math.sqrt(Math.max(0, 1 - u * u)), k: 1, z: 'kopula' };
}

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

/**
 * Builds the temple's roof over the outline on the building's picture (its flat roof plate is covered). `pierscien` =
 * the outline in the picture's coordinates; `gora` = rows of room the caller added above. Returns the top of the roof
 * (picture row) for the cross / finial.
 */
export function dachSwiatyni(o: Obraz, pierscien: number[], rodzaj: RodzajDachu, seed: number, gora: number): { cx: number; szczyt: number } {
  let sx = 0, sy = 0, n = 0, pole = 0;
  for (let i = 0, j = pierscien.length - 2; i < pierscien.length; j = i, i += 2) {
    sx += pierscien[i]; sy += pierscien[i + 1]; n++;
    pole += (pierscien[j] - pierscien[i]) * (pierscien[j + 1] + pierscien[i + 1]) / 2;
  }
  const cx = sx / n, cy = sy / n;
  const KATY = 180;
  const rho = new Float64Array(KATY);
  for (let k = 0; k < KATY; k++) rho[k] = promienObrysu(pierscien, cx, cy, (k / KATY) * Math.PI * 2);
  // Round part: the radius of a circle of the same area (cross-shaped plans get a smaller dome).
  const rKolo = Math.min(Math.sqrt(Math.abs(pole) / Math.PI), Math.max(...rho));
  const H = Math.round(rKolo * (rodzaj === 'cerkiew' ? 1.75 : 1.0));
  const tonyKopuly = rodzaj === 'cerkiew'
    ? (hash(seed, 3, 7) < 0.55 ? BLACHY.zloto : hash(seed, 4, 7) < 0.55 ? BLACHY.niebo : BLACHY.zielen)
    : (hash(seed, 5, 9) < 0.5 ? BLACHY.olow : BLACHY.niebo);
  const tonyPolaci = rodzaj === 'cerkiew' ? BLACHY.zielen : BLACHY.olow;
  // Depth buffer: the nearer point is the one standing further south (larger ground y), then higher.
  const glebia = new Float32Array(o.w * o.h).fill(-Infinity);
  const zrodlo = new Int8Array(o.w * o.h).fill(-1);
  const kolor = new Uint32Array(o.w * o.h);
  // Light from the north-west and above (screen axes: x right, y down = south, z up).
  const Lx = -0.55, Ly = -0.45, Lz = 0.7;
  const krokT = 0.22 / Math.max(8, H), punkt = (k: number, t: number) => {
    const { s, k: okr } = profil(rodzaj, t);
    const r = s * ((1 - okr) * rho[k] + okr * rKolo);
    const a = (k / KATY) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, t * H];
  };
  const rMax = Math.max(...rho);
  // Adaptive step: rows never further apart than ~0.35 px, in height or in radius (dome tops change radius fast).
  const nastepne = (t: number) => {
    let dt = krokT;
    while (dt > 1e-5 && Math.abs(profil(rodzaj, Math.min(1, t + dt)).s - profil(rodzaj, t).s) * rMax > 0.35) dt /= 2;
    return t + dt;
  };
  for (let t = 0; t <= 1; t = nastepne(t)) {
    const { s, k: okr } = profil(rodzaj, t);
    const obwod = Math.PI * 2 * s * ((1 - okr) * Math.max(...rho) + okr * rKolo);
    const krokA = Math.max(1, Math.ceil(obwod / 0.45));
    for (let q = 0; q < krokA; q++) {
      const kf = (q / krokA) * KATY, k0 = Math.floor(kf) % KATY, k1 = (k0 + 1) % KATY, f = kf - Math.floor(kf);
      const p0 = punkt(k0, t), p1 = punkt(k1, t);
      const x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f, z = p0[2];
      // Normal from the surface's two tangents (around and up).
      const pa = punkt(k1, t), pu = punkt(k0, Math.min(1, t + 0.01)), pd = punkt(k0, Math.max(0, t - 0.01));
      const ax = pa[0] - p0[0], ay = pa[1] - p0[1], az = 0;
      const ux = pu[0] - pd[0], uy = pu[1] - pd[1], uz = pu[2] - pd[2];
      let nx = ay * uz - az * uy, ny = az * ux - ax * uz, nz = ax * uy - ay * ux;
      const dl = Math.hypot(nx, ny, nz);
      if (dl < 1e-9 || profil(rodzaj, Math.min(1, t + 0.02)).s < 0.06) {
        // At the very top the tangents collapse: the normal tilts gently outwards from straight up.
        const rx = x - cx, ry = y - cy, rl = Math.hypot(rx, ry) || 1;
        nx = (rx / rl) * 0.3; ny = (ry / rl) * 0.3; nz = 0.95;
      } else { nx /= dl; ny /= dl; nz /= dl; }
      // Make the normal point outwards (away from the axis).
      if (nx * (x - cx) + ny * (y - cy) < 0 && nz < 0.99) { nx = -nx; ny = -ny; nz = -nz; }
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      // Seen from the south and above: surfaces facing north and down are hidden behind the front.
      const X = Math.round(x - z * SKOS), Y = Math.round(y - z) + gora;
      if (X < 0 || Y < 0 || X >= o.w || Y >= o.h) continue;
      const d = y + z * 0.01;
      const id = Y * o.w + X;
      if (d <= glebia[id]) continue;
      glebia[id] = d;
      let jas = nx * Lx + ny * Ly + nz * Lz;
      const strefa = profil(rodzaj, t).z;
      if (strefa === 'beben') {
        // Plastered drum: tall narrow windows around it, a cornice line on top.
        const okna = rodzaj === 'cerkiew' ? 12 : 16, fa = (kf / KATY) * okna, wTop = rodzaj === 'cerkiew' ? 0.38 : 0.32, wBot = rodzaj === 'cerkiew' ? 0.2 : 0.14;
        const okno = Math.abs(fa - Math.round(fa)) < 0.12 && t > wBot + 0.03 && t < wTop - 0.04;
        kolor[id] = okno ? OKNO : t > wTop - 0.015 ? TYNK[4] : TYNK[Math.max(0, Math.min(4, Math.round(2 + jas * 2.2)))];
      } else {
        // Sheet metal: seams along the meridians (dome) or along the slope (roof skirt).
        // Dome: seams along the meridians (not near the tip, where they bunch up). Roof skirt: no seams, a darker eave.
        const krok = KATY / 24, zebro = Math.round(kf / krok) * krok;
        if (strefa === 'kopula' && Math.abs(kf - zebro) < 0.5 && t < 0.88) jas -= 0.2;
        if (strefa === 'polac' && t < 0.02) jas -= 0.3;
        const tony = strefa === 'kopula' ? tonyKopuly : tonyPolaci;
        kolor[id] = tony[Math.max(0, Math.min(4, Math.round(1.8 + jas * 2.4)))];
      }
      zrodlo[id] = 1;
    }
  }
  // Paint, then a one-pixel ink outline where the roof meets anything not roof (sky above, or the building's walls).
  let szczyt = o.h;
  for (let i = 0; i < o.w * o.h; i++) if (zrodlo[i] > 0) { o.px[i] = kolor[i]; szczyt = Math.min(szczyt, Math.floor(i / o.w)); }
  const dodaj: number[] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const i = y * o.w + x;
    if (zrodlo[i] > 0) continue;
    if ((x > 0 && zrodlo[i - 1] > 0) || (x < o.w - 1 && zrodlo[i + 1] > 0) || (y > 0 && zrodlo[i - o.w] > 0) || (y < o.h - 1 && zrodlo[i + o.w] > 0)) dodaj.push(i);
  }
  for (const i of dodaj) o.px[i] = OBRYS;
  const topX = Math.round(cx - H * SKOS);
  void TYNK;
  return { cx: topX, szczyt };
}

/** The finial: a gold cross (cerkiew) or a crescent-topped spike (mosque). */
export function zwienczenie(o: Obraz, x: number, szczyt: number, rodzaj: RodzajDachu, r: number) {
  const zl = BLACHY.zloto[3], h = Math.max(4, Math.round(r * 0.5));
  for (let j = 1; j <= h; j++) ustaw(o, x, szczyt - j, zl);
  if (rodzaj === 'cerkiew') {
    const ramie = Math.max(1, Math.round(r * 0.18));
    for (let i = -ramie; i <= ramie; i++) ustaw(o, x + i, szczyt - Math.round(h * 0.65), zl);
  } else { ustaw(o, x - 1, szczyt - h, zl); ustaw(o, x + 1, szczyt - h, zl); }
}

// Modele „stosu warstw” (src/gen/stos.ts) budowane kodem: głaz, złoże rudy, wóz konny.
// Jednostka = piksel świata (½ punktu mapy); ludzik ma ok. 27 px wzrostu.

import { nowyModel, wypelnij, szum3, type Model, type Rodzina } from './stos';
import { hex } from './bryly';

const r = (...k: string[]) => k.map(hex) as Rodzina;

export const RODZINY = {
  kamien: r('#24232a', '#45444d', '#686872', '#8f8f99', '#b7b7c0'),
  mech: r('#1f3a30', '#2c4f40', '#466a3a', '#648a44', '#86a858'),
  ruda: r('#3a1c10', '#6a3418', '#9a5a28', '#c88a3a', '#e8c070'),
  drewno: r('#2e2016', '#4a3220', '#6b4a2c', '#8c6a40', '#b08a58'),
  deska: r('#3a2818', '#5a3e24', '#7e5a34', '#a07a48', '#c49e66'),
  zelazo: r('#1e1b24', '#2c2f42', '#4a4e60', '#6e7284', '#9aa0ae'),
  mosiadz: r('#4a3410', '#7a5a1c', '#b08a30', '#d8b450', '#f4dc8a'),
  skora: r('#22140c', '#3c2416', '#5a3820', '#7a4e2c', '#9a6a40'),
  worek: r('#4a3e2a', '#6e5e40', '#948058', '#b8a478', '#d8c89c'),
  kon_brazowy: r('#2a160c', '#4a2a16', '#6e4022', '#94603a', '#b8845a'),
  kon_czarny: r('#141216', '#22202a', '#363440', '#4e4c5a', '#6a6878'),
  kon_szary: r('#3a3a42', '#5e5e68', '#86868e', '#acacb2', '#d0d0d4'),
  grzywa: r('#141216', '#1e1b24', '#2e2a30', '#463e3c', '#5e5450'),
};

type Nazwa = keyof typeof RODZINY;
const lista = (n: Nazwa[]) => ({ rodziny: n.map((k) => RODZINY[k]), nr: Object.fromEntries(n.map((k, i) => [k, i])) as Record<Nazwa, number> });

/** Głaz: elipsoida z nierównym, szumowym brzegiem, płaskawy spód, mech na wierzchu od północy. */
export function glaz(seed: number, rozmiar = 1, mech = true): Model {
  const { rodziny, nr } = lista(['kamien', 'mech', 'ruda']);
  const rx = 9 * rozmiar, ry = 7 * rozmiar, rz = 7.5 * rozmiar;
  const m = nowyModel(Math.ceil(rx * 2.6), Math.ceil(ry * 2.6), Math.ceil(rz * 1.5), rodziny);
  wypelnij(m, [-rx * 1.3, -ry * 1.3, 0, rx * 1.3, ry * 1.3, rz * 1.4], (x, y, z) => {
    const d = Math.hypot(x / rx, y / ry, (z + rz * 0.15) / rz);
    const brzeg = 0.78 + 0.42 * szum3(x * 0.22, y * 0.22, z * 0.22, seed) + 0.12 * szum3(x * 0.6, y * 0.6, z * 0.6, seed + 9);
    if (d > brzeg) return null;
    const f = szum3(x * 0.5, y * 0.5, z * 0.5, seed + 3);
    const pek = szum3(x * 0.35, y * 0.9, z * 0.35, seed + 5) > 0.82 ? -1 : 0;
    if (mech && z > rz * 0.55 && y < ry * 0.3 && szum3(x * 0.4, y * 0.4, z * 0.4, seed + 7) > 0.55) return [nr.mech, f > 0.6 ? 1 : 0];
    return [nr.kamien, pek || (f > 0.8 ? 1 : 0)];
  });
  return m;
}

/** Złoże rudy żelaza: głaz z rdzawymi żyłami i błyskami. */
export function zloze(seed: number): Model {
  const m = glaz(seed, 1.7, false);
  const nr = 2; // 'ruda' w liście głazu
  for (let z = 0; z < m.Z; z++) for (let y = 0; y < m.Y; y++) for (let x = 0; x < m.X; x++) {
    const i = (z * m.Y + y) * m.X + x;
    if (!m.rod[i]) continue;
    const zyla = Math.abs(szum3(x * 0.18, y * 0.18, z * 0.3, seed + 11) - 0.5);
    if (zyla < 0.06) { m.rod[i] = nr + 1; m.odc[i] = szum3(x, y, z, seed + 13) > 0.85 ? 2 : 0; }
  }
  return m;
}

export type Ladunek = 'pusty' | 'beczki' | 'worki';
export type Masc = 'brazowy' | 'czarny' | 'szary';

/** Wóz konny: skrzynia na 4 kołach ze szprychami, kozioł, dyszel, koń w uprzęży, ładunek. Przód (koń) na +y. */
export function woz(ladunek: Ladunek, masc: Masc, seed = 1): Model {
  const kon = `kon_${masc}` as Nazwa;
  const { rodziny, nr } = lista(['drewno', 'deska', 'zelazo', 'mosiadz', 'skora', 'worek', kon, 'grzywa']);
  const m = nowyModel(30, 96, 34, rodziny);
  const rodzinaKonia = nr[kon];
  // Skrzynia: dno z = 8..9, burty do z = 15, deski co 2 px wzdłuż (faktura), okucia mosiężne na rogach.
  wypelnij(m, [-10, -21, 8, 10, 7, 15], (x, y, z) => {
    const burta = Math.abs(x) >= 9 || y <= -20 || y >= 6;
    if (!burta && z > 9) return null;
    const rog = (Math.abs(x) >= 9 && (y <= -19 || y >= 5)) && z >= 13;
    if (rog) return [nr.mosiadz, 0];
    const deska = burta ? ((z >> 1) & 1 ? 0 : -1) : ((x >> 1) & 1 ? 0 : -1);
    return [nr.deska, deska + (szum3(x * 0.7, y * 0.15, z, seed) > 0.75 ? 1 : 0)];
  });
  // Oś i rama pod spodem.
  wypelnij(m, [-11, -15, 6, 11, -13, 7], () => [nr.zelazo, 0]);
  wypelnij(m, [-11, 2, 6, 11, 4, 7], () => [nr.zelazo, 0]);
  // Koła: tarcza w płaszczyźnie y–z, obręcz żelazna, 6 szprych, piasta.
  const kolo = (wx: number, wy: number, rr: number) => {
    const wz = rr;
    wypelnij(m, [wx - 1, wy - rr, 0, wx + 1, wy + rr, wz * 2], (x, y, z) => {
      const dy = y - wy, dz = z - wz, d = Math.hypot(dy, dz);
      if (d > rr + 0.4) return null;
      if (d > rr - 1.2) return [nr.zelazo, 0];
      if (d < 1.8) return Math.abs(x - wx) <= 1 ? [nr.mosiadz, 0] : null;
      if (Math.abs(x - wx) > 0.5) return null;
      const a = Math.atan2(dz, dy), k = Math.PI / 3;
      const odl = Math.abs(((a % k) + k) % k - k / 2);
      return odl > k / 2 - 0.28 ? [nr.drewno, 0] : null;
    });
  };
  kolo(-11, -14, 7.5); kolo(11, -14, 7.5); kolo(-11, 3, 6); kolo(11, 3, 6);
  // Kozioł woźnicy z przodu skrzyni.
  wypelnij(m, [-8, 3, 15, 8, 6, 17], (x, y, z) => (z === 17 || y === 6 ? [nr.drewno, 0] : null));
  // Dyszel: dwa drągi do konia.
  wypelnij(m, [-6, 7, 9, 6, 30, 10], (x) => (Math.abs(Math.abs(x) - 5) < 0.6 ? [nr.drewno, 0] : null));
  // Koń: tułów, nogi, szyja, głowa, grzywa, ogon, chomąto.
  const kon0 = 26;
  wypelnij(m, [-6, kon0 - 12, 10, 6, kon0 + 12, 24], (x, y, z) => {
    const d = Math.hypot(x / 5.6, (y - kon0) / 11.5, (z - 17.5) / 6.2);
    if (d > 1) return null;
    const pas = Math.abs(y - (kon0 + 5)) < 1 && z > 13; // popręg
    return pas ? [nr.skora, 0] : [rodzinaKonia, 0];
  });
  for (const [lx, ly] of [[-3, kon0 - 8], [3, kon0 - 8], [-3, kon0 + 8], [3, kon0 + 8]] as const) {
    wypelnij(m, [lx - 2, ly - 2, 0, lx + 2, ly + 2, 15], (x, y, z) => {
      const rr = z < 3 ? 1.6 : z > 9 ? 1.9 : 1.3;
      if (Math.hypot(x - lx, y - ly) > rr) return null;
      return z < 2 ? [nr.grzywa, 0] : [rodzinaKonia, 0];
    });
  }
  // Szyja: odcinek (0, kon0+9, 20) → (0, kon0+15, 28), promień 3.
  const A = [0, kon0 + 8, 19], B = [0, kon0 + 14, 25];
  wypelnij(m, [-4, kon0 + 4, 15, 4, kon0 + 18, 29], (x, y, z) => {
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ap = [x - A[0], y - A[1], z - A[2]];
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
    const d = Math.hypot(x - (A[0] + ab[0] * t), y - (A[1] + ab[1] * t), z - (A[2] + ab[2] * t));
    if (d > 3.4 - t * 0.7) return null;
    if (Math.abs(x) < 0.8 && y < A[1] + ab[1] * t - 1.4 && d > 2.2) return [nr.grzywa, 0];
    if (t < 0.25 && d > 2.4) return [nr.skora, 1]; // chomąto
    return [rodzinaKonia, 0];
  });
  // Głowa: wydłużona, pochylona w dół do przodu.
  wypelnij(m, [-4, kon0 + 11, 17, 4, kon0 + 24, 30], (x, y, z) => {
    const t = (y - (kon0 + 12)) / 10; // 0 przy potylicy, 1 przy chrapach
    if (t < 0 || t > 1) return null;
    const cz = 26 - t * 4, rz = 3 - t * 0.7, rx = 2.6 - t * 0.8;
    if ((x / rx) ** 2 + ((z - cz) / rz) ** 2 > 1) return null;
    if (t > 0.85) return [nr.grzywa, 1];
    return [rodzinaKonia, 0];
  });
  // Uszy.
  wypelnij(m, [-2, kon0 + 12, 28, 2, kon0 + 13, 30], (x) => (Math.abs(x) >= 1 ? [rodzinaKonia, 0] : null));
  // Ogon.
  wypelnij(m, [-1, kon0 - 14, 8, 1, kon0 - 10, 20], (x, y, z) => (Math.abs(x) < 0.8 && Math.abs(y - (kon0 - 11 - (20 - z) * 0.15)) < 1.2 ? [nr.grzywa, 0] : null));
  // Ładunek.
  if (ladunek === 'beczki') {
    for (const [bx, by] of [[-5, -16], [4, -16], [-5, -8], [4, -8], [0, -1]] as const) {
      wypelnij(m, [bx - 4, by - 4, 10, bx + 4, by + 4, 19], (x, y, z) => {
        const brzuch = 3.4 + 0.5 * Math.sin(((z - 10) / 9) * Math.PI);
        const d = Math.hypot(x - bx, y - by);
        if (d > brzuch) return null;
        if (z === 12 || z === 17) return [nr.zelazo, 0];
        if (z === 19 && d < brzuch - 0.8) return [nr.drewno, 1];
        return [nr.drewno, ((Math.atan2(y - by, x - bx) * 3) | 0) & 1 ? 0 : -1];
      });
    }
  } else if (ladunek === 'worki') {
    for (const [bx, by, bz] of [[-4, -16, 10], [4, -15, 10], [-4, -8, 10], [4, -7, 10], [0, -12, 15], [0, -1, 10]] as const) {
      wypelnij(m, [bx - 5, by - 4, bz, bx + 5, by + 4, bz + 7], (x, y, z) => {
        const d = Math.hypot((x - bx) / 4.4, (y - by) / 3.4, (z - bz - 2.8) / 3.2);
        if (d > 1) return null;
        return [nr.worek, szum3(x * 0.8, y * 0.8, z * 0.8, seed + bx * 7 + by) > 0.7 ? 1 : 0];
      });
    }
  }
  return m;
}

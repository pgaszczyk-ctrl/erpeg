// Rurociągi (moduły 8×8 łączone po siatce), obłoczki pary i tory kolejowe – wszystko generowane.
import { Obraz, nowy, hex, hash, ustaw, OBRYS, rgb } from './wspolne';

const MOS = ['#4a3216', '#6b4a22', '#9a6420', '#c8963e', '#e9c56a'].map(hex);
const ZEL = ['#2a2630', '#3a3440', '#55505c'].map(hex);
const CZERW = hex('#b2453a'), BIEL = hex('#ece6d6');

export interface Kier { n?: boolean; e?: boolean; s?: boolean; w?: boolean }

/** Jeden moduł rury 8×8: rura 4 px grubości środkiem do zaznaczonych krawędzi, kołnierze, opcjonalny zawór/manometr/podpora. */
export function modulRury(k: Kier, dodatek?: 'zawor' | 'manometr' | 'podpora' | 'kolnierz'): Obraz {
  const o = nowy(8, 8);
  const poz = (x: number, y: number) => ustaw(o, x, y, y === 2 ? MOS[1] : y === 3 ? MOS[4] : y === 4 ? MOS[3] : MOS[2]); // przekrój poziomy y 2..5
  const pion = (x: number, y: number) => ustaw(o, x, y, x === 2 ? MOS[4] : x === 3 ? MOS[3] : x === 4 ? MOS[2] : MOS[1]);
  for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) (k.e || k.w) && !(k.n || k.s) ? poz(x, y) : pion(x, y);
  if (k.w) for (let x = 0; x < 2; x++) for (let y = 2; y <= 5; y++) poz(x, y);
  if (k.e) for (let x = 6; x < 8; x++) for (let y = 2; y <= 5; y++) poz(x, y);
  if (k.n) for (let y = 0; y < 2; y++) for (let x = 2; x <= 5; x++) pion(x, y);
  if (k.s) for (let y = 6; y < 8; y++) for (let x = 2; x <= 5; x++) pion(x, y);
  // obrys z boków rury
  const o2 = o.px.slice();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (!(o.px[y * 8 + x] >>> 24)) continue;
    const pusty = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < 8 && yy < 8 && !(o.px[yy * 8 + xx] >>> 24);
    if (pusty(x + 1, y) || pusty(x, y + 1) || pusty(x - 1, y) || pusty(x, y - 1)) o2[y * 8 + x] = MOS[0];
  }
  o.px.set(o2);
  if (dodatek === 'kolnierz') { for (let i = 1; i <= 6; i++) { if (k.e || k.w) ustaw(o, 4, i, MOS[1]); else ustaw(o, i, 4, MOS[1]); } }
  if (dodatek === 'zawor') { for (let i = 2; i <= 5; i++) { ustaw(o, i, 0, CZERW); ustaw(o, i, 2, CZERW); } ustaw(o, 2, 1, CZERW); ustaw(o, 5, 1, CZERW); ustaw(o, 3, 1, ZEL[1]); ustaw(o, 4, 1, ZEL[1]); }
  if (dodatek === 'manometr') { for (let y = 0; y <= 3; y++) for (let x = 2; x <= 5; x++) ustaw(o, x, y, (x === 2 || x === 5 || y === 0 || y === 3) ? MOS[0] : BIEL); ustaw(o, 4, 1, OBRYS); }
  if (dodatek === 'podpora') { for (let y = 6; y < 8; y++) { ustaw(o, 2, y, ZEL[2]); ustaw(o, 5, y, ZEL[0]); } }
  return o;
}

/** Rurociąg po siatce 8 px: `komorki` = kolejne komórki trasy [cx, cy] (sąsiednie w pionie/poziomie). */
export function rurociag(o: Obraz, komorki: [number, number][], ox: number, oy: number, seed: number) {
  const set = new Set(komorki.map(([x, y]) => `${x},${y}`));
  komorki.forEach(([cx, cy], i) => {
    const k: Kier = { n: set.has(`${cx},${cy - 1}`), s: set.has(`${cx},${cy + 1}`), e: set.has(`${cx + 1},${cy}`), w: set.has(`${cx - 1},${cy}`) };
    const prosty = (k.e && k.w && !k.n && !k.s) || (k.n && k.s && !k.e && !k.w);
    const h = hash(cx, cy, seed);
    const dod = prosty && h < 0.12 ? 'zawor' : prosty && h < 0.2 ? 'manometr' : prosty && (i % 3 === 0) ? 'podpora' : prosty && h > 0.8 ? 'kolnierz' : undefined;
    const m = modulRury(k, dod as any);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const c = m.px[y * 8 + x]; if (c >>> 24) ustaw(o, cx * 8 + x - ox, cy * 8 + y - oy, c); }
  });
}

/** Klatka obłoczka pary (rozmiar 16/24/32, klatka 0..5): rośnie i rzednie, krawędź z ditheringu, 3 stopnie przezroczystości. */
export function para(rozmiar: number, klatka: number, seed = 0): Obraz {
  const o = nowy(rozmiar, rozmiar), t = klatka / 5;
  const kul = [[0.5, 0.8, 0.22], [0.38, 0.62, 0.2], [0.62, 0.6, 0.2], [0.5, 0.45, 0.24]];
  for (let y = 0; y < rozmiar; y++) for (let x = 0; x < rozmiar; x++) {
    let v = 0;
    for (const [kx, ky, kr] of kul) {
      const cx = kx * rozmiar, cy = (ky - t * 0.35) * rozmiar, r = kr * rozmiar * (0.55 + t * 0.7);
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; v = Math.max(v, 1 - d);
    }
    v -= t * 0.35 + (hash(x, y, seed + klatka) - 0.5) * 0.25;
    if (v <= 0) continue;
    const a = v > 0.45 ? 255 : v > 0.22 ? 150 : 75;
    ustaw(o, x, y, rgb(241 - (y > rozmiar * 0.6 ? 18 : 0), 237 - (y > rozmiar * 0.6 ? 18 : 0), 228, a));
  }
  return o;
}

/** Tor wzdłuż łamanej (px świata): podsypka, podkłady co 4 px, dwie szyny z połyskiem. Rysuje w obraz z przesunięciem (ox, oy). */
export function tor(o: Obraz, pts: number[], ox: number, oy: number) {
  const seg: { ax: number; ay: number; ux: number; uy: number; L: number }[] = [];
  for (let i = 0; i + 3 < pts.length; i += 2) { const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], L = Math.hypot(dx, dy); if (L > 0) seg.push({ ax: pts[i], ay: pts[i + 1], ux: dx / L, uy: dy / L, L }); }
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - ox), Math.round(y - oy), c);
  const podsyp = [hex('#6c6660'), hex('#7c756d'), hex('#8c847a')], drewno = [hex('#5a3e28'), hex('#765436')];
  for (const pass of [0, 1, 2]) {
    let s0 = 0;
    for (const g of seg) {
      for (let t = 0; t < g.L; t += 0.5) {
        const x = g.ax + g.ux * t, y = g.ay + g.uy * t, nx = -g.uy, ny = g.ux, s = s0 + t;
        if (pass === 0) for (let k = -7; k <= 7; k += 0.5) put(x + nx * k, y + ny * k, podsyp[Math.floor(hash(Math.round(x + nx * k), Math.round(y + ny * k), 3) * 3)]);
        if (pass === 1 && Math.floor(s) % 4 === 0) for (let k = -5; k <= 5; k += 0.5) { put(x + nx * k, y + ny * k, drewno[1]); put(x + nx * k + g.ux, y + ny * k + g.uy, drewno[0]); }
        if (pass === 2) { put(x + nx * -3, y + ny * -3, ZEL[1]); put(x + nx * 3, y + ny * 3, ZEL[1]); put(x + nx * -2, y + ny * -2, hex('#aaaab8')); put(x + nx * 4, y + ny * 4, ZEL[0]); }
      }
      s0 += g.L;
    }
  }
}

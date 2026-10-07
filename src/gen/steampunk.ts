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
    if (v <= 0) continue; // poza obłoczkiem: szum nie może dorysować kropek na całym kwadracie (właściciel 6.10: „kwadratowa otoczka”)
    v -= t * 0.35 + (hash(x, y, seed + klatka) - 0.5) * 0.25;
    if (v <= 0) continue;
    const a = v > 0.45 ? 255 : v > 0.22 ? 150 : 75;
    ustaw(o, x, y, rgb(241 - (y > rozmiar * 0.6 ? 18 : 0), 237 - (y > rozmiar * 0.6 ? 18 : 0), 228, a));
  }
  return o;
}

/**
 * Tor wzdłuż łamanej (px świata): podsypka, podkłady co 4 px, dwie szyny z połyskiem. Rysuje w obraz z przesunięciem (ox, oy).
 * `woda(x, y)`: gdzie po obu stronach toru jest woda, zamiast podsypki stoi most (właściciel 7.10.2026: „mosty dla pociągów”):
 * cień na wodzie, pomost z belek, kratownice z nitami po obu stronach i przyczółki na brzegach.
 */
export function tor(o: Obraz, pts: number[], ox: number, oy: number, woda?: (x: number, y: number) => boolean) {
  const seg: { ax: number; ay: number; ux: number; uy: number; L: number }[] = [];
  for (let i = 0; i + 3 < pts.length; i += 2) { const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], L = Math.hypot(dx, dy); if (L > 0) seg.push({ ax: pts[i], ay: pts[i + 1], ux: dx / L, uy: dy / L, L }); }
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - ox), Math.round(y - oy), c);
  const podsyp = [hex('#6c6660'), hex('#7c756d'), hex('#8c847a')], drewno = [hex('#5a3e28'), hex('#765436')];
  const pomost = [hex('#4a3324'), hex('#5c4030')], krata = [hex('#3a3440'), hex('#55505c'), hex('#7a7482')], nit = hex('#b08a48'), cien = rgb(16, 30, 48, 120);
  const przyczolek = [hex('#7a7268'), hex('#948b7e')];
  // Most tam, gdzie po obu stronach (9 i 13 px od osi) jest woda; wydłużony o 6 px na brzegi (przyczółki).
  const most = (x: number, y: number, nx: number, ny: number) =>
    !!woda && ((woda(Math.round(x + nx * 10), Math.round(y + ny * 10)) && woda(Math.round(x - nx * 10), Math.round(y - ny * 10))) ||
      (woda(Math.round(x + nx * 14), Math.round(y + ny * 14)) && woda(Math.round(x - nx * 14), Math.round(y - ny * 14))));
  // Najpierw zaznacz odcinki mostu (co 0,5 px łuku), z zapasem na przyczółki.
  const naMoscie: boolean[][] = seg.map((g) => {
    const n = Math.ceil(g.L / 0.5) + 1, m: boolean[] = new Array(n).fill(false);
    for (let i = 0; i < n; i++) { const t = i * 0.5; if (most(g.ax + g.ux * t, g.ay + g.uy * t, -g.uy, g.ux)) for (let k = Math.max(0, i - 12); k <= Math.min(n - 1, i + 12); k++) m[k] = true; }
    return m;
  });
  for (const pass of [0, 1, 2, 3]) {
    let s0 = 0;
    seg.forEach((g, gi) => {
      for (let t = 0, i = 0; t < g.L; t += 0.5, i++) {
        const x = g.ax + g.ux * t, y = g.ay + g.uy * t, nx = -g.uy, ny = g.ux, s = s0 + t;
        const nm = naMoscie[gi][i];
        if (pass === 0) {
          if (!nm) for (let k = -7; k <= 7; k += 0.5) put(x + nx * k, y + ny * k, podsyp[Math.floor(hash(Math.round(x + nx * k), Math.round(y + ny * k), 3) * 3)]);
          else {
            // Cień mostu na wodzie (w prawo-dół), potem pomost z belek; na brzegu kamienny przyczółek.
            for (let k = -8; k <= 8; k += 0.5) put(x + nx * k + 3, y + ny * k + 5, cien);
            const brzeg = !most(x, y, nx, ny);
            for (let k = -8; k <= 8; k += 0.5) put(x + nx * k, y + ny * k, brzeg ? przyczolek[Math.floor(hash(Math.round(x + nx * k), Math.round(y + ny * k), 9) * 2)] : pomost[Math.floor(s) % 3 === 0 ? 0 : 1]);
          }
        }
        if (pass === 1 && Math.floor(s) % 4 === 0) for (let k = -5; k <= 5; k += 0.5) { put(x + nx * k, y + ny * k, drewno[1]); put(x + nx * k + g.ux, y + ny * k + g.uy, drewno[0]); }
        if (pass === 2) { put(x + nx * -3, y + ny * -3, ZEL[1]); put(x + nx * 3, y + ny * 3, ZEL[1]); put(x + nx * -2, y + ny * -2, hex('#aaaab8')); put(x + nx * 4, y + ny * 4, ZEL[0]); }
        if (pass === 3 && nm) {
          // Kratownica po obu stronach: dolny i górny pas, ukośne zastrzały co 8 px, nity na węzłach, obrys na zewnątrz.
          for (const side of [-1, 1]) {
            const k0 = side * 7.5;
            put(x + nx * k0, y + ny * k0, krata[0]);
            put(x + nx * (k0 + side), y + ny * (k0 + side), OBRYS);
            put(x + nx * (k0 - side * 0.5), y + ny * (k0 - side * 0.5), krata[side < 0 ? 2 : 1]);
            const f = ((s % 8) + 8) % 8;
            if (f < 0.5) put(x + nx * k0, y + ny * k0, nit);
          }
        }
      }
      s0 += g.L;
    });
  }
}

/**
 * Tor tramwajowy wtopiony w jezdnię (właściciel 7.10.2026: „tramwajowe to po prostu koleiny w szosie”): bez podsypki
 * i podkładów, tylko dwie wąskie, ciemne bruzdy szyn z jasnym połyskiem stali, na tym, co już leży (bruk, asfalt).
 */
export function koleiny(o: Obraz, pts: number[], ox: number, oy: number) {
  const ciemna = rgb(46, 42, 44, 255), polysk = hex('#9a98a2');
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], dx = pts[i + 2] - ax, dy = pts[i + 3] - ay, L = Math.hypot(dx, dy);
    if (!L) continue;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    for (let t = 0; t < L; t += 0.5) {
      const x = ax + ux * t, y = ay + uy * t;
      for (const k of [-2.6, 2.6]) {
        ustaw(o, Math.round(x + nx * k - ox), Math.round(y + ny * k - oy), ciemna);
        if (Math.floor(t * 2) % 3 === 0) ustaw(o, Math.round(x + nx * (k + 0.8) - ox), Math.round(y + ny * (k + 0.8) - oy), polysk);
      }
    }
  }
}

// ───────────────────────── Rurociąg wzdłuż drogi (zastępuje trasy „po siatce” w świecie) ─────────────────────────
// Zasada właściciela: rura nie wędruje po trawie zygzakiem. Biegnie RÓWNOLEGLE do drogi, w stałym odsunięciu
// (za chodnikiem), tym samym łukiem co droga, a na końcach wchodzi do budynku albo pod ziemię (studzienka).

/** Łamana równoległa do `pts` w odległości `d` (d > 0 = po prawej stronie kierunku jazdy, czyli „na południe” dla drogi biegnącej w prawo). Narożniki ze ściętym ostrzem (miter ≤ 2d). */
export function rownolegla(pts: number[], d: number): number[] {
  const n = pts.length / 2, out: number[] = [];
  const nrm = (i: number) => { const dx = pts[2 * i + 2] - pts[2 * i], dy = pts[2 * i + 3] - pts[2 * i + 1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? nrm(i - 1) : nrm(0), b = i < n - 1 ? nrm(i) : nrm(n - 2);
    let mx = a[0] + b[0], my = a[1] + b[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const cos = mx * b[0] + my * b[1], k = Math.min(2, 1 / Math.max(0.5, cos));
    out.push(pts[2 * i] + mx * d * k, pts[2 * i + 1] + my * d * k);
  }
  return out;
}

/** Wycinek łamanej od długości łuku s0 do s1. */
export function wycinek(pts: number[], s0: number, s1: number): number[] {
  const out: number[] = []; let s = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3], L = Math.hypot(bx - ax, by - ay);
    const p = (t: number) => [ax + ((bx - ax) * t) / L, ay + ((by - ay) * t) / L];
    if (s + L >= s0 && s <= s1) {
      if (!out.length) out.push(...p(Math.max(0, s0 - s)));
      out.push(...p(Math.min(L, s1 - s)));
    }
    s += L;
  }
  return out;
}

/** Długość łamanej. */
export const dlugosc = (pts: number[]) => { let s = 0; for (let i = 0; i + 3 < pts.length; i += 2) s += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]); return s; };

/** Zaokrągla narożniki łamanej łukiem o promieniu r (tak rura gnie się jak prawdziwa, bez ostrych kątów). */
export function zaokraglij(pts: number[], r: number): number[] {
  const n = pts.length / 2; if (n < 3) return pts.slice();
  const out = [pts[0], pts[1]];
  for (let i = 1; i < n - 1; i++) {
    const px = pts[2 * i], py = pts[2 * i + 1];
    const ax = pts[2 * i - 2] - px, ay = pts[2 * i - 1] - py, bx = pts[2 * i + 2] - px, by = pts[2 * i + 3] - py;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by), rr = Math.min(r, la / 2, lb / 2);
    const s1x = px + (ax / la) * rr, s1y = py + (ay / la) * rr, s2x = px + (bx / lb) * rr, s2y = py + (by / lb) * rr;
    for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; out.push(u * u * s1x + 2 * u * t * px + t * t * s2x, u * u * s1y + 2 * u * t * py + t * t * s2y); } // krzywa Béziera przez narożnik
  }
  out.push(pts[2 * n - 2], pts[2 * n - 1]);
  return out;
}

export type KoniecRury = 'ziemia' | 'dom' | 'nic';

/**
 * Rysuje rurociąg (rura 4 px, mosiądz) wzdłuż dowolnej łamanej – pod dowolnym kątem, płynnie po łuku.
 * Cień na ziemi, kołnierze co ~16 px, wsporniki co ~24 px, czasem zawór lub manometr, na końcach:
 *  - 'ziemia': kołnierz + kolano w dół do żeliwnej studzienki (rura znika pod ziemią),
 *  - 'dom': kołnierz i obejma przy ścianie; ostatnie 3 px wchodzą w obrys, który przykryje budynek (rysować rurę PRZED budynkami),
 *  - 'nic': koniec ucięty kołnierzem (gdy rura biegnie dalej w sąsiednim kawałku – wtedy ta sama trasa jest liczona w obu kawałkach).
 * Zwraca punkty, z których może iść para (przecieki przy kołnierzach i studzienkach) – sprite'y w widoku.
 */
export function rurociagWzdluz(o: Obraz, pts: number[], ox: number, oy: number, seed: number, poczatek: KoniecRury = 'ziemia', koniec: KoniecRury = 'dom'): [number, number][] {
  const para: [number, number][] = [];
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - ox), Math.round(y - oy), c);
  const juz = new Set<number>();
  const ciemn = (x: number, y: number) => { const xx = Math.round(x - ox), yy = Math.round(y - oy); if (xx < 0 || yy < 0 || xx >= o.w || yy >= o.h) return; const id = yy * o.w + xx; if (juz.has(id)) return; juz.add(id); const c = o.px[yy * o.w + xx]; const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; o.px[yy * o.w + xx] = rgb(r * 0.6 + 6, g * 0.64 + 8, b * 0.76 + 24); };
  const seg: { ax: number; ay: number; ux: number; uy: number; L: number }[] = [];
  for (let i = 0; i + 3 < pts.length; i += 2) { const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], L = Math.hypot(dx, dy); if (L > 0.01) seg.push({ ax: pts[i], ay: pts[i + 1], ux: dx / L, uy: dy / L, L }); }
  if (!seg.length) return para;
  const Lx = -0.6, Ly = -0.8; // światło z lewej-góry
  const calk = seg.reduce((a, g) => a + g.L, 0);
  // przebieg 0: cień (przesunięty w prawo-dół), 1: rura, 2: dodatki
  for (const pass of [0, 1, 2]) {
    let s0 = 0;
    for (const g of seg) {
      let nx = -g.uy, ny = g.ux; if (nx * Lx + ny * Ly < 0) { nx = -nx; ny = -ny; } // n wskazuje stronę oświetloną
      for (let t = 0; t < g.L; t += 0.35) {
        const x = g.ax + g.ux * t, y = g.ay + g.uy * t, s = s0 + t;
        if (pass === 0) { for (let k = -2; k <= 2; k += 0.5) { ciemn(x + nx * k + 2, y + ny * k + 3); } continue; }
        if (pass === 1) {
          const kol = Math.abs((s % 16) - 8) < 0.9 && s > 4 && s < calk - 4; // kołnierz
          for (let k = -2.5; k <= 2.5; k += 0.5) {
            const a = Math.abs(k);
            if (a > 2 && !kol) continue;
            let c: number;
            if (a >= 2) c = MOS[0];
            else { const v = 0.45 + 0.3 * (k / 1.5) + 0.25 * (1 - a / 1.5); c = MOS[v > 0.82 ? 4 : v > 0.58 ? 3 : v > 0.36 ? 2 : 1]; if (kol) c = a < 0.9 ? MOS[4] : MOS[0]; }
            put(x + nx * k, y + ny * k, c);
          }
          continue;
        }
        // pass 2: wspornik co 24 px (ciemne nóżki po stronie cienia), zawór/manometr na prostych odcinkach
        const kraw = s > 10 && s < calk - 10;
        if (kraw && Math.abs((s % 24) - 12) < 0.2) for (let j = 2.5; j <= 4; j += 0.5) { put(x - nx * j - g.ux, y - ny * j - g.uy + 1, ZEL[0]); put(x - nx * j + g.ux, y - ny * j + g.uy + 1, ZEL[1]); }
        if (kraw && Math.abs((s % 48) - 30) < 0.2) {
          const h = hash(Math.floor(s / 48), seed, 61);
          if (h < 0.35) { for (let i = -2; i <= 2; i++) { put(x + nx * 4 + g.ux * i, y + ny * 4 + g.uy * i, CZERW); } put(x + nx * 3, y + ny * 3, ZEL[1]); put(x + nx * 5, y + ny * 5, CZERW); }
          else if (h < 0.6) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + nx * (4 + j) + g.ux * i, y + ny * (4 + j) + g.uy * i, (i === 0 && j === 0) ? OBRYS : BIEL); put(x + nx * 2.5, y + ny * 2.5, MOS[1]); }
          else if (h < 0.75) para.push([Math.round(x), Math.round(y)]);
        }
      }
      s0 += g.L;
    }
  }
  // końce
  const koniecRury = (rodz: KoniecRury, x: number, y: number, ux: number, uy: number) => {
    let nx = -uy, ny = ux; if (nx * Lx + ny * Ly < 0) { nx = -nx; ny = -ny; }
    for (let k = -3; k <= 3; k += 0.5) for (let t = 0; t <= 1; t += 0.5) put(x - ux * t + nx * k, y - uy * t + ny * k, Math.abs(k) > 2.4 ? MOS[0] : t === 0 ? MOS[1] : MOS[3]);
    if (rodz === 'ziemia') { // studzienka: żeliwny pierścień 11×7, ciemny środek, rura wchodzi w nią
      const cx = x + ux * 4, cy = y + uy * 4;
      for (let j = -4; j <= 4; j++) for (let i = -6; i <= 6; i++) { const d = (i / 6) ** 2 + (j / 4) ** 2; if (d > 1) continue; put(cx + i, cy + j, d > 0.62 ? (j < 0 ? ZEL[2] : ZEL[0]) : d > 0.35 ? ZEL[1] : hex('#14121a')); }
      for (let i = -3; i <= 3; i += 2) put(cx + i, cy, ZEL[2]); // kratka
      para.push([Math.round(cx), Math.round(cy - 2)]);
    }
    if (rodz === 'dom') { // obejma przy ścianie + rura wchodzi 3 px w obrys (przykryje ją budynek)
      for (let t = 1; t <= 4; t += 0.35) for (let k = -1.5; k <= 1.5; k += 0.5) put(x + ux * t + nx * k, y + uy * t + ny * k, MOS[Math.abs(k) > 1 ? 1 : 3]);
      for (let k = -3.5; k <= 3.5; k += 0.5) put(x + ux * 1 + nx * k, y + uy * 1 + ny * k, ZEL[1]);
    }
  };
  const g0 = seg[0], gN = seg[seg.length - 1];
  if (poczatek !== 'nic') koniecRury(poczatek, g0.ax, g0.ay, -g0.ux, -g0.uy); else koniecRury('nic', g0.ax, g0.ay, -g0.ux, -g0.uy);
  const ex = gN.ax + gN.ux * gN.L, ey = gN.ay + gN.uy * gN.L;
  koniecRury(koniec, ex, ey, gN.ux, gN.uy);
  return para;
}

/**
 * Trasa rury przy drodze: odcinek drogi [s0, s1] (długość łuku), przesunięty równolegle o `odsuniecie`
 * (połowa szerokości jezdni + chodnik + 4–6 px trawy), z zaokrąglonymi łukami. Jeśli podano `dom` (punkt na ścianie
 * budynku, najbliższy końcowi), rura skręca łukiem prostopadle od drogi i wchodzi w ten punkt; inaczej idzie pod ziemię.
 */
export function trasaPrzyDrodze(droga: number[], s0: number, s1: number, odsuniecie: number, dom?: [number, number]): { pts: number[]; koniec: KoniecRury } {
  let pts = wycinek(rownolegla(droga, odsuniecie), s0, s1);
  if (dom) {
    const n = pts.length, ex = pts[n - 2], ey = pts[n - 1];
    const dx = dom[0] - ex, dy = dom[1] - ey;
    // ostatni odcinek: kierunek drogi; skręt w stronę domu po łuku (prosto od drogi, potem do ściany)
    const ux = pts[n - 2] - pts[n - 4], uy = pts[n - 1] - pts[n - 3], ul = Math.hypot(ux, uy) || 1;
    const wzdl = (dx * ux + dy * uy) / ul; // ile jeszcze wzdłuż drogi
    if (wzdl > 0) pts.push(ex + (ux / ul) * wzdl, ey + (uy / ul) * wzdl);
    pts.push(dom[0], dom[1]);
  }
  return { pts: zaokraglij(pts, 10), koniec: dom ? 'dom' : 'ziemia' };
}

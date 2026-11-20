// Świątynie według wyznania (raport 19.11.2026; właściciel 20.11.2026: „dla takich budynków musisz zupełnie inaczej
// generować dachy, a nie dorysować kopułę”). Budynek dostaje własną bryłę: płaski dach (gra przestawia materiały
// w `opcjeSwiatyni`), a nad nim to, co jest dachem świątyni – cerkiew: bęben z oknami i wielka cebulasta kopuła
// pośrodku, cztery mniejsze na krzyż; meczet: wielka kopuła na bębnie z dwiema półkopułami, minaret stojący na ziemi
// przy narożniku. Rysowane kodem w palecie świata (obrys #1e1a24, światło z północnego zachodu). Bez DOM-u.
import { type Obraz, nowy, ustaw, hex, OBRYS, hash } from './wspolne';
import type { OpcjeBudynku } from './budynki';

export type Swiatynia = 'cerkiew' | 'meczet';

const ZLOTO = ['#6b4a12', '#9a6c1c', '#c99a30', '#e8c45a', '#fbe7a0'].map(hex);
const ZIELEN = ['#1d3b34', '#2b5a4c', '#3f7c66', '#5fa088', '#8ac6ad'].map(hex);
const NIEBO = ['#1d3550', '#2b4c72', '#3f6c98', '#5f8fbc', '#8cb6dc'].map(hex);
const OLOW = ['#3a3e46', '#555a64', '#737a86', '#959ca8', '#bcc2cc'].map(hex);
const TYNK = ['#8a8270', '#a89e88', '#c6bca4', '#ddd4bc', '#f0e9d6'].map(hex);
const OKNO = hex('#2a2a38');

/** The body under the domes: a flat roof and walls of the temple's own materials (no chimneys, pipes, steampunk). */
export function opcjeSwiatyni(op: OpcjeBudynku, rodzaj: Swiatynia): OpcjeBudynku {
  return {
    ...op,
    // Cerkiew: a sheet-metal roof the domes grow out of; mosque: a flat stone roof under the great dome.
    plaski: rodzaj === 'meczet',
    dach: 'blacha_zielona',
    dachPlaski: rodzaj === 'meczet' ? 'kamien' : undefined,
    sciana: 'tynk_bialy',
    komin: false, rura: false, steampunk: 0, okap: 0, azja: false, ozdoby: [],
  };
}

/** Fills a shape given by its half-width at each row, shaded from the north-west. Whole pixels only. */
function bryla(o: Obraz, cx: number, gora: number, wysokosc: number, polSzer: (t: number) => number, paleta: number[]) {
  cx = Math.round(cx); gora = Math.round(gora); wysokosc = Math.round(wysokosc);
  for (let j = 0; j < wysokosc; j++) {
    const t = (j + 0.5) / wysokosc, w = polSzer(t);
    if (!(w > 0)) continue;
    for (let i = Math.floor(cx - w); i <= Math.ceil(cx + w); i++) {
      const u = (i + 0.5 - cx) / Math.max(0.5, w);
      if (Math.abs(u) > 1) continue;
      const swiatlo = -u * 0.6 - (t - 0.5) * 0.45;
      ustaw(o, i, gora + j, paleta[Math.max(0, Math.min(4, Math.round(2 + swiatlo * 2.3)))]);
    }
  }
}

/** One-pixel ink outline around everything drawn after `przed` (a snapshot). */
function obrysujNowe(o: Obraz, przed: Uint32Array) {
  const dodaj: number[] = [];
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const k = y * o.w + x;
    if (o.px[k] >>> 24) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= o.w || yy >= o.h) continue;
      const kk = yy * o.w + xx;
      if (o.px[kk] >>> 24 && o.px[kk] !== przed[kk]) { dodaj.push(k); break; }
    }
  }
  for (const k of dodaj) o.px[k] = OBRYS;
}

/** A plastered drum with dark window slits (the base of every dome). */
function beben(o: Obraz, cx: number, dol: number, polSzer: number, wys: number) {
  cx = Math.round(cx); dol = Math.round(dol);
  bryla(o, cx, dol - wys, wys, () => polSzer, TYNK);
  const okna = Math.max(2, Math.round(polSzer / 3));
  for (let k = 0; k < okna; k++) {
    const x = Math.round(cx - polSzer * 0.7 + ((k + 0.5) / okna) * polSzer * 1.4);
    for (let j = Math.round(wys * 0.3); j < Math.round(wys * 0.8); j++) ustaw(o, x, dol - wys + j, OKNO);
  }
  for (let i = Math.round(cx - polSzer); i <= Math.round(cx + polSzer); i++) ustaw(o, i, dol - wys, TYNK[4]);
}

function krzyz(o: Obraz, cx: number, szczyt: number, r: number) {
  const zl = ZLOTO[3], h = Math.max(4, Math.round(r * 0.7)), ramie = Math.max(1, Math.round(r * 0.28));
  for (let j = 1; j <= h; j++) ustaw(o, Math.round(cx), szczyt - j, zl);
  for (let i = -ramie; i <= ramie; i++) ustaw(o, Math.round(cx) + i, szczyt - Math.round(h * 0.65), zl);
}

/** Onion dome: bulging, pointed, on a drum, with a cross. `r` = the onion's half-width. */
function cerkiewnaKopula(o: Obraz, cx: number, dol: number, r: number, paleta: number[]) {
  dol = Math.round(dol);
  const wysB = Math.max(3, Math.round(r * 0.95));
  beben(o, cx, dol, r * 0.72, wysB);
  const h = Math.round(r * 2.2);
  const gora = dol - wysB - h;
  bryla(o, cx, gora, h, (t) => {
    if (t < 0.35) return r * Math.pow(t / 0.35, 1.6) * 0.75;
    if (t < 0.7) return r * (0.75 + 0.25 * Math.sin(((t - 0.35) / 0.35) * Math.PI / 2));
    return r * (1 - 0.32 * ((t - 0.7) / 0.3));
  }, paleta);
  krzyz(o, cx, gora, r);
}

/** Hemispherical dome, optionally on a drum (mosque). Returns its top row. */
function kopulaMeczetu(o: Obraz, cx: number, dol: number, r: number, paleta: number[], wysBebna: number) {
  dol = Math.round(dol);
  if (wysBebna > 0) beben(o, cx, dol, r * 0.95, wysBebna);
  const h = Math.round(r * 0.9);
  bryla(o, cx, dol - wysBebna - h, h, (t) => r * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 2))), paleta);
  return dol - wysBebna - h;
}

/** Is (x, y) inside the outline (even-odd)? Small domes stand only where there is roof under them. */
function wObrysie(r: number[], x: number, y: number) {
  let w = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w;
  }
  return w;
}

/**
 * The temple's roof on its building picture (made with `opcjeSwiatyni`). `pierscien` = the outline in the picture's
 * own coordinates; `wysokoscScian` = how far the walls hang below the roof in the picture (the minaret stands on the
 * ground there). Returns a picture with room added above for the domes, and how much was added.
 */
export function swiatyniaNaDachu(obraz: Obraz, pierscien: number[], rodzaj: Swiatynia, seed: number, wysokoscScian = 0): { obraz: Obraz; gora: number } {
  let sx = 0, sy = 0, n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < pierscien.length; i += 2) {
    const x = pierscien[i], y = pierscien[i + 1];
    sx += x; sy += y; n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (!n) return { obraz, gora: 0 };
  let pole = 0;
  for (let i = 0, j = pierscien.length - 2; i < pierscien.length; j = i, i += 2) pole += (pierscien[j] - pierscien[i]) * (pierscien[j + 1] + pierscien[i + 1]) / 2;
  // Size from the roof's real area (a cross-shaped plan has much less roof than its bounding box).
  const szer = x1 - x0, glab = y1 - y0, rozmiar = Math.min(szer, glab, Math.sqrt(Math.abs(pole)) * 0.9);
  const R = rodzaj === 'cerkiew' ? Math.max(7, Math.min(34, Math.round(rozmiar * 0.3))) : Math.max(9, Math.min(46, Math.round(rozmiar * 0.4)));
  const minaret = rodzaj === 'meczet' ? Math.round(wysokoscScian + R * 3.6) : 0;
  const gora = Math.max(Math.round(R * 4.6), minaret - Math.round(glab * 0.6) + 8);
  const dodatek = rodzaj === 'meczet' ? 12 : 0;
  const out = nowy(obraz.w + dodatek, obraz.h + gora);
  for (let y = 0; y < obraz.h; y++) out.px.set(obraz.px.subarray(y * obraz.w, (y + 1) * obraz.w), (y + gora) * out.w);
  const przed = out.px.slice();
  const cx = Math.round(sx / n), cy = Math.round(sy / n) + gora;
  if (rodzaj === 'cerkiew') {
    const paleta = hash(seed, 3, 7) < 0.55 ? ZLOTO : hash(seed, 4, 7) < 0.6 ? ZIELEN : NIEBO;
    // Four smaller onions at the roof's corners around the great one; the northern pair first (they stand behind).
    const dx = Math.round(szer * 0.3), dy = Math.round(glab * 0.26), r2 = Math.max(4, Math.round(R * 0.5));
    const male = rozmiar > 30;
    const naDachu = (ox: number, oy: number) => wObrysie(pierscien, cx + ox, cy + oy - gora);
    if (male) for (const [ox, oy] of [[-dx, -dy], [dx, -dy]]) if (naDachu(ox, oy)) cerkiewnaKopula(out, cx + ox, cy + oy, r2, paleta);
    cerkiewnaKopula(out, cx, cy + Math.round(glab * 0.06), R, paleta);
    if (male) for (const [ox, oy] of [[-dx, dy], [dx, dy]]) if (naDachu(ox, oy)) cerkiewnaKopula(out, cx + ox, cy + oy, r2, paleta);
  } else {
    const paleta = hash(seed, 5, 9) < 0.45 ? OLOW : hash(seed, 6, 9) < 0.6 ? NIEBO : ZIELEN;
    const wzdluz = szer >= glab;
    // Half-domes leaning on the great dome along the longer axis (same base line), small domes at the corners.
    const hd = Math.round(R * 0.68), baza0 = cy + Math.round(R * 0.25);
    const dx = Math.round(szer * 0.36), dy = Math.round(glab * 0.32), rm = Math.max(3, Math.round(R * 0.22));
    const naDachu = (ox: number, oy: number) => wObrysie(pierscien, cx + ox, cy + oy - gora);
    for (const [ox, oy] of [[-dx, -dy], [dx, -dy]]) if (naDachu(ox, oy)) kopulaMeczetu(out, cx + ox, cy + oy, rm, paleta, 0);
    for (const s of [-1, 1]) {
      const px = wzdluz ? cx + s * Math.round(R * 0.85) : cx, py = wzdluz ? baza0 : baza0 + s * Math.round(R * 0.6);
      kopulaMeczetu(out, px, py, hd, paleta, 0);
    }
    const szczyt = kopulaMeczetu(out, cx, baza0, R, paleta, Math.max(3, Math.round(R * 0.25)));
    for (const [ox, oy] of [[-dx, dy], [dx, dy]]) if (naDachu(ox, oy)) kopulaMeczetu(out, cx + ox, cy + oy, rm, paleta, 0);
    const igla = Math.max(3, Math.round(R * 0.35));
    for (let j = 1; j <= igla; j++) ustaw(out, cx, szczyt - j, ZLOTO[3]);
    ustaw(out, cx - 1, szczyt - igla, ZLOTO[3]); ustaw(out, cx + 1, szczyt - igla, ZLOTO[3]);
    // Minaret on the ground at the south-east corner, beside the wall (drawn last: it stands in front).
    let mx = x1, my = y1, best = -Infinity;
    for (let i = 0; i + 1 < pierscien.length; i += 2) {
      const s = pierscien[i] + pierscien[i + 1] * 0.6;
      if (s > best) { best = s; mx = pierscien[i]; my = pierscien[i + 1]; }
    }
    const baza = Math.round(my) + gora + Math.round(wysokoscScian), sz = Math.max(2, Math.round(R * 0.26)), x = Math.round(mx + wysokoscScian * 0.35) + sz + 2;
    bryla(out, x, baza - minaret, minaret, () => sz, TYNK);
    for (const f of [0.55, 0.82]) bryla(out, x, baza - Math.round(minaret * f), 2, () => sz + 1.5, TYNK);
    const czapka = Math.round(R * 0.9);
    bryla(out, x, baza - minaret - czapka, czapka, (t) => sz * t, paleta);
    ustaw(out, x, baza - minaret - czapka - 1, ZLOTO[3]);
  }
  obrysujNowe(out, przed);
  return { obraz: out, gora };
}

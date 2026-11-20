// Świątynie według wyznania (raport 19.11.2026; właściciel 20.11.2026: „dla takich budynków musisz zupełnie inaczej
// generować dachy, a nie dorysować kopułę”). Budynek dostaje własną bryłę: płaski dach (gra przestawia materiały
// w `opcjeSwiatyni`), a nad nim to, co jest dachem świątyni – cerkiew: bęben z oknami i wielka cebulasta kopuła
// pośrodku, cztery mniejsze na krzyż; meczet: wielka kopuła na bębnie z dwiema półkopułami, minaret stojący na ziemi
// przy narożniku. Rysowane kodem w palecie świata (obrys #1e1a24, światło z północnego zachodu). Bez DOM-u.
import { type Obraz, nowy, ustaw, hex, OBRYS, hash } from './wspolne';
import type { OpcjeBudynku } from './budynki';
import { dachSwiatyni, zwienczenie } from './dachySwiatyn';

export type Swiatynia = 'cerkiew' | 'meczet';

const ZLOTO = ['#6b4a12', '#9a6c1c', '#c99a30', '#e8c45a', '#fbe7a0'].map(hex);
const NIEBO = ['#1d3550', '#2b4c72', '#3f6c98', '#5f8fbc', '#8cb6dc'].map(hex);
const OLOW = ['#3a3e46', '#555a64', '#737a86', '#959ca8', '#bcc2cc'].map(hex);
const TYNK = ['#8a8270', '#a89e88', '#c6bca4', '#ddd4bc', '#f0e9d6'].map(hex);

/** The body under the domes: a flat roof and walls of the temple's own materials (no chimneys, pipes, steampunk). */
export function opcjeSwiatyni(op: OpcjeBudynku, rodzaj: Swiatynia): OpcjeBudynku {
  return {
    ...op,
    // Cerkiew: a sheet-metal roof the domes grow out of; mosque: a flat stone roof under the great dome.
    // A flat plate under the generated dome roof (it is covered by it).
    plaski: true,
    dachPlaski: 'kamien',
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

/**
 * The temple's roof on its building picture (made with `opcjeSwiatyni`). `pierscien` = the outline in the picture's
 * own coordinates; `wysokoscScian` = how far the walls hang below the roof in the picture (the minaret stands on the
 * ground there). Returns a picture with room added above for the domes, and how much was added.
 */
export function swiatyniaNaDachu(obraz: Obraz, pierscien: number[], rodzaj: Swiatynia, seed: number, wysokoscScian = 0): { obraz: Obraz; gora: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, pole = 0;
  for (let i = 0, j = pierscien.length - 2; i < pierscien.length; j = i, i += 2) {
    x0 = Math.min(x0, pierscien[i]); x1 = Math.max(x1, pierscien[i]); y0 = Math.min(y0, pierscien[i + 1]); y1 = Math.max(y1, pierscien[i + 1]);
    pole += (pierscien[j] - pierscien[i]) * (pierscien[j + 1] + pierscien[i + 1]) / 2;
  }
  if (!isFinite(x0)) return { obraz, gora: 0 };
  const rKolo = Math.sqrt(Math.abs(pole) / Math.PI);
  const H = rKolo * (rodzaj === 'cerkiew' ? 1.75 : 1.0);
  const minaret = rodzaj === 'meczet' ? Math.round(wysokoscScian + rKolo * 2.4) : 0;
  const gora = Math.max(Math.round(H + rKolo * 0.6 + 12), minaret - Math.round((y1 - y0) * 0.5) + 14);
  const dodatek = rodzaj === 'meczet' ? 14 : 0;
  const out = nowy(obraz.w + dodatek, obraz.h + gora);
  for (let y = 0; y < obraz.h; y++) out.px.set(obraz.px.subarray(y * obraz.w, (y + 1) * obraz.w), (y + gora) * out.w);
  // The roof itself is generated over the outline (src/gen/dachySwiatyn.ts) – it covers the body's flat roof plate.
  const { cx, szczyt } = dachSwiatyni(out, pierscien, rodzaj, seed, gora);
  zwienczenie(out, cx, szczyt, rodzaj, Math.max(6, rKolo * 0.5));
  if (rodzaj === 'meczet') {
    const przed = out.px.slice();
    const paleta = hash(seed, 5, 9) < 0.5 ? OLOW : NIEBO;
    // Minaret on the ground at the south-east corner, beside the wall (drawn last: it stands in front).
    let mx = x1, my = y1, best = -Infinity;
    for (let i = 0; i + 1 < pierscien.length; i += 2) {
      const sc = pierscien[i] + pierscien[i + 1] * 0.6;
      if (sc > best) { best = sc; mx = pierscien[i]; my = pierscien[i + 1]; }
    }
    const R = Math.max(8, rKolo * 0.7);
    const baza = Math.round(my) + gora + Math.round(wysokoscScian), sz = Math.max(2, Math.round(R * 0.26)), x = Math.round(mx + wysokoscScian * 0.35) + sz + 2;
    bryla(out, x, baza - minaret, minaret, () => sz, TYNK);
    for (const f of [0.55, 0.82]) bryla(out, x, baza - Math.round(minaret * f), 2, () => sz + 1.5, TYNK);
    const czapka = Math.round(R * 0.9);
    bryla(out, x, baza - minaret - czapka, czapka, (t) => sz * t, paleta);
    ustaw(out, x, baza - minaret - czapka - 1, ZLOTO[3]);
    obrysujNowe(out, przed);
  }
  return { obraz: out, gora };
}

// Świątynie według wyznania (raport 19.11.2026; właściciel 20.11.2026: „dla takich budynków musisz zupełnie inaczej
// generować dachy, a nie dorysować kopułę”). Budynek dostaje własną bryłę: płaski dach (gra przestawia materiały
// w `opcjeSwiatyni`), a nad nim to, co jest dachem świątyni – cerkiew: bęben z oknami i wielka cebulasta kopuła
// pośrodku, cztery mniejsze na krzyż; meczet: wielka kopuła na bębnie z dwiema półkopułami, minaret stojący na ziemi
// przy narożniku. Rysowane kodem w palecie świata (obrys #1e1a24, światło z północnego zachodu). Bez DOM-u.
import { type Obraz, nowy, ustaw, hex, OBRYS, hash } from './wspolne';
import type { OpcjeBudynku } from './budynki';
import { dachSwiatyni, zwienczenie, wymiaryDachu, type RodzajDachu, type OpcjeDachu } from './dachySwiatyn';

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

/** Roof-forms of the same generator for other buildings (library spiral tower, observatory, town-hall clock, antenna). */
export type FormaObrotowa = 'biblioteka' | 'obserwatorium' | 'ratusz' | 'antena' | 'dzwonnica' | 'wiezyczka';

/** Body for those: its own walls, a flat plate under the roof form, nothing poking through it. */
export function opcjeObrotowe(op: OpcjeBudynku, forma: FormaObrotowa): OpcjeBudynku {
  return { ...op, plaski: true, dachPlaski: forma === 'antena' ? (op.dachPlaski ?? 'papa') : 'papa', komin: false, rura: forma === 'antena' ? op.rura : false, steampunk: forma === 'antena' ? op.steampunk : 0, okap: 0, azja: false, ozdoby: forma === 'antena' ? op.ozdoby : [] };
}

/** The roof form on its building picture; returns the picture with room added above. */
export function brylaNaDachu(obraz: Obraz, pierscien0: number[], forma: RodzajDachu, seed: number, polac?: number[], opt: OpcjeDachu = {}): { obraz: Obraz; gora: number; lewo: number; para: [number, number, number][] } {
  const { rKolo, H } = wymiaryDachu(pierscien0, forma);
  if (!(rKolo > 0)) return { obraz, gora: 0, lewo: 0, para: [] };
  const SK = opt.skos ?? 0;
  // Room above for the roof form, and on the left for its lean (going up moves left like the walls).
  const gora = Math.max(0, Math.round(H + rKolo * 0.6 + 12)), lewo = SK ? Math.ceil(H * SK) + 4 : 0;
  const pierscien = pierscien0.map((v, i) => (i % 2 ? v : v + lewo));
  const out = nowy(obraz.w + lewo, obraz.h + gora);
  for (let y = 0; y < obraz.h; y++) out.px.set(obraz.px.subarray(y * obraz.w, (y + 1) * obraz.w), (y + gora) * out.w + lewo);
  // Flat-roof clutter of a tower block goes under the mast (drawn first).
  if (forma === 'antena') dachTechniczny(out, pierscien, gora, seed, SK);
  const { cx, szczyt } = dachSwiatyni(out, pierscien, forma, seed, gora, polac, opt);
  zwienczenie(out, cx, szczyt, forma, Math.max(6, rKolo * 0.5));
  const nizej = (dz: number) => cx + dz * SK; // x of the tower's axis dz rows below its top
  // ——— steampunk details (owner, 20 Nov 2026: „pamiętaj o steampunku”) ———
  const para: [number, number, number][] = [];
  const przed = out.px.slice();
  const MOS = ['#4a3410', '#7a5a1c', '#a8822c', '#d0a848', '#f0d27e'].map(hex);
  const put = (i: number, j: number, c: number) => { i = Math.round(i); j = Math.round(j); if (i >= 0 && j >= 0 && i < out.w && j < out.h) out.px[j * out.w + i] = c; };
  if (forma === 'obserwatorium') {
    // A brass telescope poking out of the slit towards the sky (south-west, up).
    const y0 = szczyt + Math.round(H * 0.32), n = Math.round(rKolo * 0.55), cx0 = nizej(H * 0.32);
    for (let k = 0; k < n; k++) { const x = cx0 + 1 - k * 0.6, y = y0 - k; put(x, y, MOS[3]); put(x + 1, y, MOS[1]); put(x - 1, y, MOS[4]); }
    const ex = cx0 + 1 - n * 0.6, ey = y0 - n;
    for (let i = -2; i <= 2; i++) put(ex + i, ey, MOS[i < 0 ? 4 : 2]);
    obrysujNowe(out, przed);
  } else if (forma === 'ratusz') {
    // Twin steam whistles on the helmet's shoulder.
    const y0 = szczyt + Math.round(H * 0.24), cw = nizej(H * 0.24);
    for (const dx of [-3, 3]) { for (let k = 0; k < 4; k++) { put(cw + dx - k * SK, y0 - k, MOS[k === 3 ? 4 : 2]); put(cw + dx + 1 - k * SK, y0 - k, MOS[1]); } para.push([Math.round(cw + dx - 5 * SK), y0 - 5, 16]); }
    obrysujNowe(out, przed);
  } else if (forma === 'antena') {
    // The coil's crackle: three short pale-blue arcs off the brass ball.
    const ISKRA = hex('#cfefff'), ISKRA2 = hex('#7ec8f0');
    for (const [kx, ky] of [[1, -1], [-1, -1], [1, 0.4]] as const) {
      let x = cx, y = szczyt + 3;
      for (let k = 0; k < 5; k++) { x += kx * (1 + (hash(seed, k, kx) > 0.5 ? 1 : 0)); y += ky + (hash(seed, k, ky) > 0.5 ? -1 : 0); put(x, y, k % 2 ? ISKRA2 : ISKRA); }
    }
  } else if (forma === 'biblioteka') {
    // The spiral tower breathes a little steam from a brass pipe under its cone.
    const y0 = szczyt + Math.round(H * 0.38), x0 = Math.round(nizej(H * 0.38) + rKolo * 0.38);
    for (let k = 0; k < 5; k++) { put(x0 - k * SK, y0 - k, MOS[k === 4 ? 4 : 2]); put(x0 + 1 - k * SK, y0 - k, MOS[1]); }
    para.push([Math.round(x0 - 6 * SK), y0 - 6, 16]);
    obrysujNowe(out, przed);
  }
  return { obraz: out, gora, lewo, para };
}

function wewnatrz(r: number[], x: number, y: number) {
  let w = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ay = r[j + 1], by = r[i + 1];
    if ((ay > y) !== (by > y) && x < r[j] + ((y - ay) * (r[i] - r[j])) / (by - ay)) w = !w;
  }
  return w;
}

/**
 * The flat roof of a tower block (owner, 20 Nov 2026: „wysil się”): a wooden water tank on legs with iron hoops and a
 * shingled cap, a brass-framed skylight, two small brick stacks and a brass pipe from the tank to the mast.
 */
function dachTechniczny(o: Obraz, r: number[], gora: number, seed: number, SK: number) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sx = 0, sy = 0, n = 0;
  for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); sx += r[i]; sy += r[i + 1]; n++; }
  const cx = sx / n, cy = sy / n, w = x1 - x0, h = y1 - y0;
  if (w < 24 || h < 18) return;
  const przed = o.px.slice();
  const put = (i: number, j: number, c: number) => { i = Math.round(i); j = Math.round(j); if (i >= 0 && j >= 0 && i < o.w && j < o.h) o.px[j * o.w + i] = c; };
  const DREWNO = ['#3e2a1c', '#5a3e28', '#765436', '#926c46', '#ae8858'].map(hex), GONT = ['#3a2a1e', '#523c2a', '#6c5038', '#866648'].map(hex);
  const MOS = ['#4a3410', '#7a5a1c', '#a8822c', '#d0a848', '#f0d27e'].map(hex), CEG = ['#4e2723', '#6e362c', '#8a4836', '#a5644a'].map(hex);
  const ZEL = hex('#2a2a32'), SZK = ['#2a3450', '#56709a', '#86a6c4'].map(hex);
  const miejsce = (fx: number, fy: number) => { const x = x0 + w * fx, y = y0 + h * fy; return wewnatrz(r, x, y) && Math.hypot(x - cx, y - cy) > 8 ? [x, y] : null; };
  // Brass pipe on the roof from the tank towards the mast (flat, slightly raised), flanges every 5 px.
  const zb = miejsce(0.24, 0.3) ?? miejsce(0.7, 0.3);
  if (zb) {
    const [tx, ty] = zb, L = Math.hypot(cx - tx, cy - ty);
    for (let k = 0; k <= L; k++) { const x = tx + ((cx - tx) * k) / L, y = ty + ((cy - ty) * k) / L + gora - 1; put(x, y, MOS[k % 5 === 0 ? 4 : 2]); put(x, y + 1, MOS[1]); }
    // Water tank: two legs, a stave barrel with iron hoops, a shingled cone cap.
    const bx = Math.round(tx), by = Math.round(ty) + gora;
    const kol = (dx: number, z: number, c: number) => put(bx + dx - z * SK, by - z, c);
    for (let z = 0; z < 6; z++) for (const dx of [-5, -4, 4, 5]) kol(dx, z, DREWNO[dx < 0 ? 2 : 0]);
    for (let z = 3; z < 5; z++) for (let dx = -5; dx <= 5; dx++) if ((dx + z) % 3 === 0) kol(dx, z, DREWNO[1]);
    for (let z = 6; z < 18; z++) for (let dx = -6; dx <= 6; dx++) kol(dx, z, z === 7 || z === 12 || z === 16 ? ZEL : DREWNO[dx < -2 ? 4 : dx < 1 ? (dx % 2 ? 2 : 3) : dx < 4 ? (dx % 2 ? 1 : 2) : 0]);
    for (let z = 18; z < 24; z++) { const sz = 7 - (z - 18) * 1.25; for (let dx = -Math.ceil(sz); dx <= Math.ceil(sz); dx++) kol(dx, z, GONT[dx < 0 ? 3 : dx < 2 ? 2 : 1]); }
    kol(0, 24, MOS[4]); kol(0, 25, MOS[3]);
  }
  // Skylight: a brass frame round two panes, flat on the roof.
  const sw = miejsce(0.72, 0.62) ?? miejsce(0.3, 0.7);
  if (sw) {
    const [ex, ey] = sw;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 14; i++) put(ex - 7 + i - SK, ey - 4 + j + gora - 1, j === 0 || j === 7 || i === 0 || i === 13 || i === 7 ? MOS[j === 0 || i === 0 ? 3 : 1] : SZK[j < 4 && i < 7 ? 2 : j < 4 ? 1 : 0]);
  }
  // Two small brick stacks.
  for (const [fx, fy] of [[0.18, 0.78], [0.82, 0.22]]) {
    const p = miejsce(fx, fy); if (!p) continue;
    const bx = Math.round(p[0]), by = Math.round(p[1]) + gora;
    for (let z = 0; z < 6; z++) for (let dx = -1; dx <= 1; dx++) put(bx + dx - z * SK, by - z, CEG[dx < 0 ? 3 : dx === 0 ? 2 : 1]);
    for (let dx = -2; dx <= 2; dx++) put(bx + dx - 6 * SK, by - 6, CEG[0]);
  }
  void hash(seed, 1, 1);
  obrysujNowe(o, przed);
}

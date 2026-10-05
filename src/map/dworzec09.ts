import { rurociagWzdluz, rownolegla, dlugosc, wycinek, hash, hex, ustaw, OBRYS, type Obraz } from '../gen';

// Steampunkowe wyposażenie peronów (overhaul 09, właściciel 5.10.2026: „peron/dworzec musi być bardziej
// steampunkowy: rury, para, soczewki, lunety”). Wszystko liczone w px generatora, bez DOM-u (Web Worker):
// mosiężny rurociąg wzdłuż tylnej krawędzi peronu (zawory, manometry, studzienki – z nich para), latarnie
// sygnałowe z kolorowymi soczewkami, luneta na trójnogu na końcu peronu i parowy zegar-manometr pośrodku.

/** Peron do wyposażenia: oś (łamana), po której stronie leży tor (+1 = po prawej od kierunku osi), szerokość. */
export interface Peron09 { os: number[]; tor: 1 | -1; szer: number; seed: number }

export const DWORZEC = {
  /** Co ile px generatora latarnia z soczewką. */
  latarniaCo: 44,
  /** Rura: odsunięcie od tylnej krawędzi peronu (px generatora). */
  rnaOdKrawedzi: 4,
};

const MOS = ['#4a3216', '#6b4a22', '#9a6420', '#c8963e', '#e9c56a'].map(hex);
const ZEL = ['#24222a', '#3a3842', '#56545e'].map(hex);
const SOCZEWKI = [['#7a2a1e', '#d8503a', '#ffb09a'], ['#1f5a3a', '#3fae6a', '#b8f0c8'], ['#6a4a10', '#e2a93a', '#fff0b0']].map((t) => t.map(hex));

/** Maluje wyposażenie peronu; zwraca miejsca, z których bucha para (px generatora). */
export function wyposazPeron(o: Obraz, X0: number, Y0: number, p: Peron09): [number, number][] {
  const L = dlugosc(p.os);
  if (L < 40) return [];
  const tyl = -p.tor; // strona z dala od toru
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - X0), Math.round(y - Y0), c);
  // 1. Rurociąg wzdłuż tylnej krawędzi, oba końce w studzienkach.
  const rura = rownolegla(wycinek(p.os, 10, L - 10), tyl * (p.szer / 2 - DWORZEC.rnaOdKrawedzi));
  const para = rurociagWzdluz(o, rura, X0, Y0, p.seed, 'ziemia', 'ziemia');
  // 2. Żeliwno-szklana wiata nad środkiem peronu (gdy peron jest dość długi i szeroki).
  const w0 = L * 0.32, w1 = L * 0.68;
  const wiata = L > 100 && p.szer > 14;
  if (wiata) malujWiate(o, X0, Y0, p.os, w0, w1, p.szer / 2 - 2, p.seed);
  // 3. Latarnie sygnałowe z soczewkami (bliżej toru, rzędem, poza wiatą), kolory na zmianę; co druga paruje.
  const linia = rownolegla(p.os, p.tor * (p.szer / 2 - 7));
  let n = 0;
  for (let s = 22; s < L - 22; s += DWORZEC.latarniaCo, n++) {
    if (wiata && s > w0 - 6 && s < w1 + 6) continue;
    const [x, y] = punkt(linia, s);
    latarnia(put, x, y, SOCZEWKI[(n + (p.seed & 1)) % SOCZEWKI.length]);
    if (n % 2 === 0) para.push([Math.round(x), Math.round(y - 25)]);
  }
  // 4. Parowy zegar-manometr na słupie (tył, przy rurze; przy wiacie – przed nią) – z niego też para.
  {
    const [x, y] = punkt(rownolegla(p.os, tyl * (p.szer / 2 - 11)), wiata ? w0 - 14 : L / 2);
    zegar(put, x, y);
    para.push([Math.round(x + 4), Math.round(y - 22)]);
  }
  // 5. Luneta na trójnogu na jednym końcu peronu, patrzy wzdłuż toru.
  {
    const s = hash(p.seed, 3, 9) < 0.5 ? 14 : L - 14;
    const [x, y] = punkt(p.os, s);
    const [x2] = punkt(p.os, s + (s < L / 2 ? -6 : 6));
    luneta(put, x, y, Math.sign(x2 - x) || 1);
  }
  return para;
}

/** Punkt łamanej w długości łuku s. */
function punkt(pts: number[], s: number): [number, number] {
  let acc = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3], l = Math.hypot(bx - ax, by - ay);
    if (acc + l >= s && l > 0) { const t = (s - acc) / l; return [ax + (bx - ax) * t, ay + (by - ay) * t]; }
    acc += l;
  }
  return [pts[pts.length - 2], pts[pts.length - 1]];
}

type Put = (x: number, y: number, c: number) => void;

/** Latarnia sygnałowa: żeliwny słup, mosiężna obudowa, okrągła kolorowa soczewka z blaskiem; (x, y) = podstawa. */
function latarnia(put: Put, x: number, y: number, s: number[]) {
  x = Math.round(x); y = Math.round(y);
  // podstawa i słup
  for (let i = -2; i <= 2; i++) { put(x + i, y, OBRYS); put(x + i, y - 1, i === -2 ? MOS[3] : MOS[1]); }
  for (let j = 2; j <= 15; j++) { put(x - 1, y - j, OBRYS); put(x, y - j, j % 5 === 0 ? MOS[3] : ZEL[2]); put(x + 1, y - j, ZEL[1]); put(x + 2, y - j, OBRYS); }
  // obudowa 7×7 z daszkiem
  const ty = y - 23;
  for (let j = 0; j < 8; j++) for (let i = -3; i <= 4; i++) {
    const brzeg = i === -3 || i === 4 || j === 0 || j === 7;
    put(x + i, ty + j, brzeg ? OBRYS : i === -2 || j === 1 ? MOS[4] : i === 3 ? MOS[1] : MOS[2]);
  }
  for (let i = -4; i <= 5; i++) put(x + i, ty - 1, i === -4 || i === 5 ? OBRYS : MOS[3]);
  for (let i = -2; i <= 3; i++) put(x + i, ty - 2, OBRYS);
  // soczewka: koło średnicy 4 w środku obudowy, jasny błysk w lewym górnym
  const cx = x + 0.5, cy = ty + 3.5;
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
    const d = Math.hypot(i, j);
    if (d > 2.3) continue;
    put(cx + i, cy + j, d > 1.6 ? s[0] : i < 0 && j < 0 ? s[2] : s[1]);
  }
}

/** Parowy zegar-manometr: słup z mosiężną tarczą, wskazówka, zawór u góry; (x, y) = podstawa. */
function zegar(put: Put, x: number, y: number) {
  x = Math.round(x); y = Math.round(y);
  for (let i = -3; i <= 3; i++) { put(x + i, y, OBRYS); put(x + i, y - 1, MOS[1]); }
  for (let j = 2; j <= 12; j++) { put(x - 2, y - j, OBRYS); put(x - 1, y - j, MOS[3]); put(x, y - j, MOS[2]); put(x + 1, y - j, MOS[1]); put(x + 2, y - j, OBRYS); }
  // tarcza: koło promienia 6
  const cx = x, cy = y - 18;
  for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
    const d = Math.hypot(i, j);
    if (d > 6.4) continue;
    put(cx + i, cy + j, d > 5.4 ? OBRYS : d > 4.4 ? (i + j < 0 ? MOS[4] : MOS[2]) : hex('#efe6cc'));
  }
  // podziałka i wskazówka
  for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) { const k = (a / 8) * Math.PI * 2; put(cx + Math.round(Math.cos(k) * 3.6), cy + Math.round(Math.sin(k) * 3.6), hex('#7a6a50')); }
  for (let t = 0; t <= 3; t++) put(cx + Math.round(t * 0.8), cy - Math.round(t * 0.6), hex('#7a1e18'));
  put(cx, cy, OBRYS);
  // zawór z kołem na czubku
  for (let i = -2; i <= 2; i++) put(cx + i, cy - 8, i === 0 ? MOS[4] : MOS[2]);
  put(cx, cy - 7, MOS[1]); put(cx, cy - 9, OBRYS);
}

/** Mosiężna luneta na trójnogu, skierowana w lewo (−1) albo w prawo (+1); (x, y) = środek nóg. */
function luneta(put: Put, x: number, y: number, kier: number) {
  x = Math.round(x); y = Math.round(y);
  // trzy nogi
  for (let t = 0; t <= 9; t++) { put(x - Math.round(t * 0.5), y - 9 + t, ZEL[1]); put(x + Math.round(t * 0.5), y - 9 + t, ZEL[1]); put(x, y - 9 + Math.round(t * 0.8), ZEL[2]); }
  put(x - 5, y, OBRYS); put(x + 5, y, OBRYS); put(x, y - 1, OBRYS);
  // tubus ukośnie w górę, trzy człony zwężające się ku okularowi
  for (let t = -6; t <= 9; t++) {
    const tx = x + kier * t, ty = y - 10 - Math.round(t * 0.45);
    const gr = t > 4 ? 1 : t > -1 ? 2 : 1;
    for (let k = -gr; k <= gr; k++) put(tx, ty + k, k === -gr ? MOS[4] : k === gr ? MOS[1] : t === 4 || t === -1 ? MOS[1] : MOS[3]);
    put(tx, ty - gr - 1, OBRYS); put(tx, ty + gr + 1, OBRYS);
  }
  // soczewka obiektywu z błyskiem
  const ox = x + kier * 10, oy = y - 15;
  for (let k = -2; k <= 2; k++) put(ox, oy + k, k === -1 ? hex('#d8f0ff') : hex('#4a7aa8'));
  put(ox + kier, oy, OBRYS);
}

const SZKLO = ['#5a7488', '#7896aa', '#a8c4d4', '#d8ecf4'].map(hex);

/**
 * Wiata: żeliwna rama z szybami nad odcinkiem peronu od s0 do s1 (oś `os`), pół szerokości `pol`.
 * Szyby z odbiciem nieba (jaśniejsze ukośne pasy), szprosy co 10 px wzdłuż i 2 poprzeczne, mosiężny okap z nitami,
 * cień na peronie po prawej-niżej.
 */
function malujWiate(o: Obraz, X0: number, Y0: number, os: number[], s0: number, s1: number, pol: number, seed: number) {
  const odc = wycinek(os, s0, s1);
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - X0), Math.round(y - Y0), c);
  const ciemn = (x: number, y: number) => { const xx = Math.round(x - X0), yy = Math.round(y - Y0); if (xx < 0 || yy < 0 || xx >= o.w || yy >= o.h) return; const c = o.px[yy * o.w + xx]; o.px[yy * o.w + xx] = (c & 0xff000000) | ((((c >>> 16) & 255) * 0.7) << 16) | ((((c >>> 8) & 255) * 0.68) << 8) | ((c & 255) * 0.62); };
  const seg: { ax: number; ay: number; ux: number; uy: number; L: number }[] = [];
  for (let i = 0; i + 3 < odc.length; i += 2) { const dx = odc[i + 2] - odc[i], dy = odc[i + 3] - odc[i + 1], L = Math.hypot(dx, dy); if (L > 0.01) seg.push({ ax: odc[i], ay: odc[i + 1], ux: dx / L, uy: dy / L, L }); }
  const Lw = seg.reduce((a, g) => a + g.L, 0);
  for (const pass of [0, 1]) {
    let acc = 0;
    for (const g of seg) {
      for (let t = 0; t < g.L; t += 0.5) {
        const s = acc + t, x = g.ax + g.ux * t, y = g.ay + g.uy * t, nx = -g.uy, ny = g.ux;
        for (let k = -pol; k <= pol; k += 0.5) {
          const px = x + nx * k, py = y + ny * k;
          if (pass === 0) { ciemn(px + 4, py + 3); continue; } // cień
          const brzeg = Math.abs(k) > pol - 1.5 || s < 1.5 || s > Lw - 1.5;
          const szpros = Math.floor(s) % 10 === 0 || Math.abs(Math.abs(k) - pol * 0.45) < 0.5 || Math.abs(k) < 0.5;
          let c: number;
          if (brzeg) c = Math.abs(k) > pol - 0.75 || s < 0.75 || s > Lw - 0.75 ? OBRYS : (Math.floor(s) % 6 === 0 ? MOS[4] : MOS[2]);
          else if (szpros) c = ZEL[1];
          else {
            // odbicie nieba: ukośne pasy w siatce świata
            const b = ((Math.round(px) + Math.round(py) * 2 + (seed & 7)) % 23 + 23) % 23;
            c = b < 2 ? SZKLO[3] : b < 6 ? SZKLO[2] : k < 0 ? SZKLO[1] : SZKLO[0];
          }
          put(px, py, c);
        }
      }
      acc += g.L;
    }
  }
}

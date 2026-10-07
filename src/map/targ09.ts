import { hash, hex, ustaw, OBRYS, type Obraz } from '../gen';
import { rysunekOzdoby, type RysunekOzdoby } from '../gen/budynki';

// Stragany na placach (overhaul 09, właściciel 5.10.2026: „na placu Zamkowym zrobiłeś parking – lepiej stragany”).
// Parkingi z OSM malujemy jak brukowany plac (rodzaj `targ` w mapie rodzajów), a na nich rzędy straganów:
// pasiasta markiza na mosiężnych słupkach, stół z towarem, cień. Px generatora, bez DOM-u (Web Worker).

export const TARG = {
  /** Rozstaw miejsc na placu (px generatora). */
  co: [30, 28] as [number, number],
  /** Dawne stragany: dziś nie stawiamy (paczka „smoki_swinka_dekoracje”, 7.10.2026: dekoracje zamiast straganów). */
  szansa: 0,
  /** Dekoracje od grafika w części miejsc (≈ 30 %), z ich udziałami. */
  dekoracje: 0.3,
  mieszanka: [['donica_miedziana', 30], ['lawka_trybiki', 25], ['zegar_uliczny', 15], ['gablota_ogloszen', 15], ['pompa_parowa', 10], ['teleskop', 5]] as [string, number][],
};

/** Stragany albo dekoracje na pikselach rodzaju `targ`: `jestTarg(x, y)` w px generatora (współrzędne świata). */
export function stragany(o: Obraz, X0: number, Y0: number, jestTarg: (x: number, y: number) => boolean) {
  const [sx, sy] = TARG.co, M = 50;
  // Co druga kolumna miejsc (przejścia między nimi), w niej część miejsc: odstęp ≥ 2 miejsca w rzędzie.
  const dek = (gx: number, gy: number) => ((gx + (gy >> 1)) & 1) === 0 && hash(gx, gy, 821) < TARG.dekoracje * 2;
  const suma = TARG.mieszanka.reduce((t, [, w]) => t + w, 0);
  for (let gy = Math.floor((Y0 - M) / sy); gy <= Math.floor((Y0 + o.h + M) / sy); gy++)
    for (let gx = Math.floor((X0 - M) / sx); gx <= Math.floor((X0 + o.w + M) / sx); gx++) {
      const x = gx * sx + (gy & 1 ? sx >> 1 : 0) + Math.floor(hash(gx, gy, 812) * 6) - 3, y = gy * sy + Math.floor(hash(gx, gy, 813) * 5);
      if (dek(gx, gy)) {
        let r = hash(gx, gy, 822) * suma, n = TARG.mieszanka[0][0];
        for (const [k, w] of TARG.mieszanka) if ((r -= w) <= 0) { n = k; break; }
        const rys = rysunekOzdoby(`plac_${n}`);
        if (!rys) continue;
        const pw = Math.ceil(rys.o.w / 2) + 3;
        // Cała podstawa i trochę wokół na placu (nie przy jezdni, nie w budynku).
        if (![[-pw, 0], [pw, 0], [0, 4], [-pw, -6], [pw, -6], [0, -Math.min(rys.o.h, 30)]].every(([dx, dy]) => jestTarg(x + dx, y + dy))) continue;
        dekoracja(o, X0, Y0, x, y, rys, hash(gx, gy, 823) < 0.5);
        continue;
      }
      if (hash(gx, gy, 811) >= TARG.szansa) continue;
      // Cały stragan (markiza, stół, cień) na placu.
      if (![[-15, 0], [15, 0], [-15, -22], [15, -22], [0, -11], [0, 3], [18, 3]].every(([dx, dy]) => jestTarg(x + dx, y + dy))) continue;
      stragan(o, X0, Y0, x, y, Math.floor(hash(gx, gy, 814) * 1e6));
    }
}

const PASY = [['#b2453a', '#efe6cc'], ['#3c6652', '#efe6cc'], ['#3c4256', '#e9c56a'], ['#9a6420', '#efe6cc'], ['#6e2a2e', '#e9c56a']].map((p) => p.map(hex));
const MOS = ['#6b4a22', '#9a6420', '#c8963e', '#e9c56a'].map(hex);
const STOL = ['#3e2a1c', '#5a3e28', '#765436', '#926c46'].map(hex);
const TOWAR = [['#8f322a', '#cc6a52'], ['#c9b240', '#e8d878'], ['#3f6b38', '#70994a'], ['#5b3a7a', '#8a64a8'], ['#765436', '#a07a50']].map((p) => p.map(hex));

/** Dekoracja od grafika stojąca na placu: podstawa w (x, y), krótki cień w prawo-dół, czasem lustrem. */
function dekoracja(o: Obraz, X0: number, Y0: number, x: number, y: number, r: RysunekOzdoby, lustro: boolean) {
  const ox = x - r.bx, oy = y - r.by;
  const pel = (a: number, b: number) => a >= 0 && b >= 0 && a < r.o.w && b < r.o.h && (r.o.px[b * r.o.w + (lustro ? r.o.w - 1 - a : a)] >>> 24) > 0;
  // cień: dolna część sylwetki położona na ziemi w prawo-dół
  for (let b = r.o.h - 6; b < r.o.h + 2; b++) for (let a = 0; a < r.o.w + 3; a++) {
    if (!pel(a - 3, b - 2) || pel(a, b)) continue;
    const i = ox + a - X0, j = oy + b - Y0;
    if (i < 0 || j < 0 || i >= o.w || j >= o.h) continue;
    const c = o.px[j * o.w + i];
    o.px[j * o.w + i] = (c & 0xff000000) | ((((c >>> 16) & 255) * 0.66) << 16) | ((((c >>> 8) & 255) * 0.64) << 8) | ((c & 255) * 0.6);
  }
  for (let b = 0; b < r.o.h; b++) for (let a = 0; a < r.o.w; a++) {
    const c = r.o.px[b * r.o.w + (lustro ? r.o.w - 1 - a : a)];
    if (c >>> 24) ustaw(o, ox + a - X0, oy + b - Y0, c);
  }
}

/** Jeden stragan; (x, y) = środek przedniej krawędzi stołu przy ziemi. */
function stragan(o: Obraz, X0: number, Y0: number, x: number, y: number, seed: number) {
  const put = (px: number, py: number, c: number) => ustaw(o, px - X0, py - Y0, c);
  const ciemn = (px: number, py: number) => {
    const i = px - X0, j = py - Y0;
    if (i < 0 || j < 0 || i >= o.w || j >= o.h) return;
    const c = o.px[j * o.w + i];
    o.px[j * o.w + i] = (c & 0xff000000) | ((((c >>> 16) & 255) * 0.66) << 16) | ((((c >>> 8) & 255) * 0.64) << 8) | ((c & 255) * 0.6);
  };
  const pasy = PASY[seed % PASY.length];
  // cień w prawo-dół
  for (let j = -12; j <= 2; j++) for (let i = -10; i <= 16; i++) ciemn(x + i + 4, y + j + 3);
  // słupki z mosiądzu
  for (const sx of [-12, 12]) for (let j = 0; j <= 17; j++) { put(x + sx, y - j, j % 6 === 0 ? MOS[3] : MOS[1]); put(x + sx + 1, y - j, OBRYS); }
  // stół: blat i przód
  for (let j = -7; j <= -1; j++) for (let i = -11; i <= 11; i++) put(x + i, y + j, j === -7 ? STOL[3] : j === -1 ? OBRYS : i === -11 || i === 11 ? STOL[0] : (i + 40) % 6 === 0 ? STOL[1] : STOL[2]);
  // towar na blacie: kopczyki owoców, warzyw, beczułka
  for (let k = 0; k < 4; k++) {
    const t = TOWAR[(seed >> (k * 3)) % TOWAR.length], cx = x - 8 + k * 5;
    for (let j = 0; j < 3; j++) for (let i = -2 + j; i <= 2 - j; i++) put(cx + i, y - 8 - j, j === 2 || i < 0 ? t[1] : t[0]);
    put(cx - 2, y - 8, OBRYS); put(cx + 2, y - 8, OBRYS);
  }
  // markiza w paski, z falbaną u dołu
  const top = y - 25;
  for (let j = 0; j <= 8; j++) for (let i = -14; i <= 14; i++) {
    let c = Math.floor((i + 14) / 3) % 2 ? pasy[1] : pasy[0];
    if (j === 0 || i === -14 || i === 14) c = OBRYS;
    put(x + i, top + j, c);
  }
  for (let i = -14; i <= 14; i++) { const fal = (i + 14) % 3 === 1 ? 2 : 1; for (let j = 1; j <= fal; j++) put(x + i, top + 8 + j, j === fal ? OBRYS : Math.floor((i + 14) / 3) % 2 ? pasy[1] : pasy[0]); }
  // mosiężna kulka na szczycie
  put(x, top - 1, MOS[3]); put(x, top - 2, MOS[2]); put(x - 1, top - 1, OBRYS); put(x + 1, top - 1, OBRYS);
}

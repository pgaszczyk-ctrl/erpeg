// Obrazy konstrukcji siedlisk liczone kodem, w pikselach generatora (1 px = 0,5 px mapy – ta sama gęstość co
// budynki i drzewa). Bez DOM-u (testy w Node). Rzut jak w budynkach 09: punkt (x, y, z) → (x + 0,35·z, y − z),
// światło z północnego zachodu (lewa/górna strona jaśniejsza, wschodnie ściany w cieniu), obrys #1e1a24.
// Skala względem bohatera (zasada właściciela: rzeczy „wielkości człowieka” mierzone postacią): bohater ≈ 27 px.
import { nowy, hex, hash, ustaw, obrysuj, ciemniej, jasniej, mieszaj, OBRYS, type Obraz } from '../gen/wspolne';
import type { Namiot, Pal, RodzajRekwizytu } from './typy';

/** Wysokości (px generatora). Bohater ma ok. 27 px. */
export const WYS = { pal: 24, slupBramy: 33, namiot: 22, namiotSzefa: 28, wieza: 44, martwe: 46 };
const SKOS = 0.35;

/** Obraz z kotwicą: punkt świata (px generatora) leży w (kx, ky) obrazu. */
export interface Rysunek { o: Obraz; kx: number; ky: number }

const KORA = [hex('#4a3220'), hex('#5e4129'), hex('#6f4e31'), hex('#86603c'), hex('#9c7448')];
const CIECIE = hex('#c9a46a');
const MOSIADZ = [hex('#7a5a22'), hex('#b8893a'), hex('#e0b860')];
const PLOTNO = [hex('#7d6c50'), hex('#a99670'), hex('#c4b388'), hex('#d8c9a3')];
const LATA = [hex('#8c6a46'), hex('#6f7a5a'), hex('#9a6250')];
const CZERWIEN = [hex('#6e2a22'), hex('#93382b'), hex('#b8503a')];

/** Wypełnia wielokąt (pary x, y w px obrazu) kolorem z funkcji – środki pikseli, parzysto-nieparzyście. */
export function wielokat(o: Obraz, pts: number[], kolor: (x: number, y: number) => number) {
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
  const n = pts.length / 2;
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(o.h - 1, Math.ceil(y1)); y++) {
    const py = y + 0.5, xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[(2 * i + 2) % (2 * n)], by = pts[(2 * i + 3) % (2 * n)];
      if ((ay > py) !== (by > py)) xs.push(ax + ((py - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(o.w, xs[k + 1] - 0.5); x++) o.px[y * o.w + x] = kolor(x, y);
  }
}

function linia(o: Obraz, ax: number, ay: number, bx: number, by: number, c: number) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
  for (let i = 0; i <= n; i++) ustaw(o, Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by - ay) * i) / n), c);
}

/** Jeden pal: pionowy pień o szerokości w, zaostrzony, z mosiężną obręczą. (bx, by) = podstawa w obrazie. */
function pal(o: Obraz, bx: number, by: number, w: number, h: number, seed: number, brama: boolean) {
  const x0 = bx - Math.floor(w / 2);
  const ostrze = brama ? 0 : Math.ceil(w / 2) + 1;
  for (let j = 0; j < h; j++) {
    const y = by - j;
    const zwez = j >= h - ostrze ? j - (h - ostrze) + 1 : 0;
    for (let c = zwez; c < w - zwez; c++) {
      const x = x0 + c;
      let k = c === zwez ? 3 : c === w - 1 - zwez ? 0 : 1 + (hash(c, Math.floor(j / 3), seed) < 0.35 ? 1 : 0);
      if (j < 2) k = Math.max(0, k - 1); // ziemia przy podstawie
      let col = KORA[k];
      if (zwez > 0 || (brama && j >= h - 2)) col = c === zwez ? jasniej(CIECIE) : CIECIE;
      ustaw(o, x, y, col);
    }
  }
  // Mosiężna obręcz (steampunk) na 3/5 wysokości; słupy bram – dwie i nit.
  for (const f of brama ? [0.3, 0.72] : [0.6]) {
    const yy = by - Math.round(h * f);
    for (let c = 0; c < w; c++) { ustaw(o, x0 + c, yy, MOSIADZ[c === 0 ? 2 : c === w - 1 ? 0 : 1]); ustaw(o, x0 + c, yy + 1, MOSIADZ[0]); }
  }
}

/** Odcinek palisady (kilka pali), pale w px generatora świata. */
export function rysujOdcinek(pale: Pal[]): Rysunek {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pale) {
    const h = p.brama ? WYS.slupBramy + 8 : WYS.pal + 2;
    x0 = Math.min(x0, p.x - 6); x1 = Math.max(x1, p.x + 8); y0 = Math.min(y0, p.y - h - 2); y1 = Math.max(y1, p.y + 3);
  }
  const ox = Math.floor(x0), oy = Math.floor(y0);
  const o = nowy(Math.ceil(x1) - ox + 1, Math.ceil(y1) - oy + 1);
  for (const p of [...pale].sort((a, b) => a.y - b.y)) {
    const bx = Math.round(p.x) - ox, by = Math.round(p.y) - oy;
    const v = hash(p.seed, 1, 77);
    if (p.brama) {
      pal(o, bx, by, 6, WYS.slupBramy, p.seed, true);
      // Mosiężna latarnia na ramieniu (gazowe światło obozu).
      const ly = by - WYS.slupBramy + 3;
      linia(o, bx + 3, ly, bx + 6, ly, KORA[0]);
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) ustaw(o, bx + 5 + i, ly + 1 + j, j === 0 || j === 4 ? MOSIADZ[1] : i === 1 ? hex('#ffd77a') : hex('#e8a040'));
    } else pal(o, bx, by, v < 0.3 ? 3 : 4, WYS.pal - Math.floor(v * 4), p.seed, false);
  }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.45));
  return { o, kx: -ox, ky: -oy };
}

/** Namiot dwuspadowy: kalenica północ–południe, trójkątny szczyt z wejściem od południa (do widza). Podstawa w px generatora (w × d). */
export function rysujNamiot(n: Namiot): Rysunek {
  const w = Math.round(n.w), d = Math.round(n.d), H = n.szef ? WYS.namiotSzefa : WYS.namiot;
  const pad = 12;
  const W = w + Math.ceil(H * SKOS) + pad * 2, Hh = H + d + pad * 2;
  const o = nowy(W, Hh);
  const cx = pad + w / 2, cy = pad + H + d / 2; // (0,0,0) = środek podstawy
  const P = (x: number, y: number, z: number) => [cx + x + z * SKOS, cy + y - z];
  const kol = n.szef ? CZERWIEN : PLOTNO;
  const lata = LATA[n.wariant % LATA.length];
  const plotno = (ton: number, pasy: boolean) => (x: number, y: number) => {
    let c = pasy && Math.floor((y + x * 0.5 + 40) / 4) % 2 ? PLOTNO[Math.min(3, ton + 1)] : kol[Math.min(kol.length - 1, ton)];
    if (!pasy && hash(Math.floor(x / 5), Math.floor(y / 4), n.wariant + 11) < 0.07) c = lata; // łaty
    if (hash(x, y, 91) < 0.04) c = ciemniej(c);
    return c;
  };
  // Wschodni spad (w cieniu), zachodni spad (w świetle), szczyt od południa.
  wielokat(o, [...P(w / 2, -d / 2, 0), ...P(w / 2, d / 2, 0), ...P(0, d / 2, H), ...P(0, -d / 2, H)], plotno(0, false));
  wielokat(o, [...P(-w / 2, -d / 2, 0), ...P(-w / 2, d / 2, 0), ...P(0, d / 2, H), ...P(0, -d / 2, H)], plotno(2, !!n.szef));
  // Szwy płótna na zachodnim spadzie: od kalenicy do okapu.
  for (let v = -d / 2 + 5; v < d / 2 - 1; v += 5) {
    const [ax, ay] = P(0, v, H), [bx, by] = P(-w / 2, v, 0);
    linia(o, ax, ay, bx, by, n.szef ? CZERWIEN[0] : PLOTNO[1]);
  }
  wielokat(o, [...P(-w / 2, d / 2, 0), ...P(w / 2, d / 2, 0), ...P(0, d / 2, H)], plotno(n.szef ? 2 : 3, false));
  // Wejście: ciemny trójkąt, jedna poła odchylona.
  const wys = Math.round(H * 0.68);
  wielokat(o, [...P(-w * 0.2, d / 2, 0), ...P(w * 0.22, d / 2, 0), ...P(0, d / 2, wys)], () => hex('#2a2224'));
  wielokat(o, [...P(w * 0.22, d / 2, 0), ...P(w * 0.36, d / 2, 0), ...P(0, d / 2, wys)], () => (n.szef ? CZERWIEN[0] : PLOTNO[1]));
  // Kalenica (drąg), maszty na końcach i linki z kołkami.
  const [rx0, ry0] = P(0, -d / 2, H), [rx1, ry1] = P(0, d / 2, H);
  linia(o, rx0, ry0, rx1, ry1, n.szef ? CZERWIEN[0] : PLOTNO[0]);
  linia(o, rx1, ry1, rx1, ry1 - 3, KORA[0]);
  const LINKA = hex('#9c8a68');
  for (const sx of [-1, 1]) {
    const [gx, gy] = P(sx * (w / 2 + 5), d / 2 + 4, 0);
    linia(o, rx1, ry1, gx, gy, LINKA);
    ustaw(o, Math.round(gx), Math.round(gy), KORA[0]);
  }
  if (n.szef) {
    // Mosiężne kule na końcach kalenicy i proporzec na tylnym maszcie.
    for (const [qx, qy] of [[rx0, ry0], [rx1, ry1 - 3]]) for (const [dx, dy, c] of [[0, -1, 2], [-1, -1, 1], [0, -2, 1], [-1, -2, 0]]) ustaw(o, Math.round(qx) + dx, Math.round(qy) + dy, MOSIADZ[c]);
    linia(o, rx0, ry0 - 2, rx0, ry0 - 11, KORA[0]);
    for (let j = 0; j < 4; j++) for (let i = 1; i < 7 - j; i++) ustaw(o, Math.round(rx0) + i, Math.round(ry0) - 11 + j, j === 0 ? CZERWIEN[2] : CZERWIEN[1]);
  }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.45));
  return { o, kx: cx, ky: cy };
}

/** Prostopadłościan (skrzynia, pomost): podstawa w×d o środku (bx, by), wysokość h. */
function bryla(o: Obraz, bx: number, by: number, w: number, d: number, h: number, gora: (x: number, y: number) => number, front: (x: number, y: number) => number, bok: (x: number, y: number) => number, z0 = 0) {
  const P = (x: number, y: number, z: number) => [bx + x + z * SKOS, by + y - z];
  wielokat(o, [...P(-w / 2, d / 2, z0), ...P(w / 2, d / 2, z0), ...P(w / 2, d / 2, z0 + h), ...P(-w / 2, d / 2, z0 + h)], front);
  wielokat(o, [...P(w / 2, -d / 2, z0), ...P(w / 2, d / 2, z0), ...P(w / 2, d / 2, z0 + h), ...P(w / 2, -d / 2, z0 + h)], bok);
  wielokat(o, [...P(-w / 2, -d / 2, z0 + h), ...P(w / 2, -d / 2, z0 + h), ...P(w / 2, d / 2, z0 + h), ...P(-w / 2, d / 2, z0 + h)], gora);
}

const DESKI = [hex('#5c3f26'), hex('#7a5634'), hex('#946a40'), hex('#ad8250')];

/** Wieża strażnicza: cztery nogi, pomost z barierką, daszek z gontu i mosiężna luneta. */
export function rysujWieze(): Rysunek {
  const H = WYS.wieza;
  const W = 52, Hh = H + 40;
  const o = nowy(W, Hh);
  const bx = 18, by = Hh - 10;
  const P = (x: number, y: number, z: number) => [bx + x + z * SKOS, by + y - z];
  const noga = (x: number, y: number, sz: number) => {
    for (let s = 0; s < sz; s++) {
      const [ax, ay] = P(x + s, y, 0), [cx, cy] = P(x + s, y, H);
      linia(o, ax, ay, cx, cy, s === 0 ? KORA[3] : KORA[1]);
    }
  };
  noga(-10, -7, 2); noga(9, -7, 2);
  // Krzyżulce między przednimi nogami.
  { const [a, b] = P(-10, 7, 4), [c, d] = P(10, 7, H - 6), [e, f] = P(10, 7, 4), [g, h] = P(-10, 7, H - 6); linia(o, a, b, c, d, KORA[2]); linia(o, e, f, g, h, KORA[2]); }
  { const [a, b] = P(10, -7, 4), [c, d] = P(10, 7, H - 6); linia(o, a, b, c, d, KORA[1]); }
  noga(-10, 7, 2); noga(9, 7, 2);
  // Pomost.
  bryla(o, bx, by, 26, 18, 3, (x, y) => DESKI[2 + ((x + y) % 5 === 0 ? 1 : 0)], () => DESKI[1], () => DESKI[0], H);
  // Barierka (słupki + poręcz) na południu i wschodzie.
  for (const [x, y] of [[-13, 9], [0, 9], [13, 9], [13, 0], [13, -9]]) { const [a, b] = P(x, y, H + 3), [c, d] = P(x, y, H + 9); linia(o, a, b, c, d, KORA[1]); }
  { const [a, b] = P(-13, 9, H + 9), [c, d] = P(13, 9, H + 9), [e, f] = P(13, -9, H + 9); linia(o, a, b, c, d, KORA[3]); linia(o, c, d, e, f, KORA[2]); }
  // Daszek: ostrosłup z gontu (południowa i wschodnia połać).
  const z1 = H + 13, z2 = H + 24;
  const gont = (ton: number) => (x: number, y: number) => (y % 3 === 0 ? DESKI[0] : DESKI[Math.min(3, ton + (hash(Math.floor(x / 3), y, 5) < 0.3 ? 1 : 0))]);
  wielokat(o, [...P(-16, 12, z1), ...P(16, 12, z1), ...P(0, 0, z2)], gont(2));
  wielokat(o, [...P(16, -12, z1), ...P(16, 12, z1), ...P(0, 0, z2)], gont(0));
  { const [a, b] = P(-12, 9, H + 3), [c, d] = P(-12, 9, z1); linia(o, a, b, c, d, KORA[0]); const [e, f] = P(12, 9, H + 3), [g, h] = P(12, 9, z1); linia(o, e, f, g, h, KORA[0]); }
  // Mosiężna luneta wystająca na wschód.
  { const [a, b] = P(10, 2, H + 8); for (let i = 0; i < 8; i++) { ustaw(o, Math.round(a) + i, Math.round(b) - Math.floor(i / 3), MOSIADZ[i % 3 === 0 ? 2 : 1]); ustaw(o, Math.round(a) + i, Math.round(b) - Math.floor(i / 3) + 1, MOSIADZ[0]); } }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.45));
  return { o, kx: bx, ky: by };
}

/** Rekwizyt pod palisadą. */
export function rysujRekwizyt(rodzaj: RodzajRekwizytu, seed: number): Rysunek {
  const o = nowy(24, 22);
  const bx = 10, by = 17;
  if (rodzaj === 'skrzynia') {
    bryla(o, bx, by, 10, 7, 8, (x) => DESKI[x % 4 === 0 ? 1 : 3], (_x, y) => (y % 3 === 0 ? DESKI[0] : DESKI[2]), () => DESKI[1]);
    for (const [dx, dy] of [[-5, 3], [4, 3], [-5, -4], [4, -4]]) ustaw(o, bx + dx, by + dy, MOSIADZ[2]);
  } else if (rodzaj === 'beczka') {
    for (let j = 0; j < 11; j++) for (let i = -4; i <= 4; i++) {
      const brzuch = j > 2 && j < 8 ? 0 : 1;
      if (Math.abs(i) > 4 - brzuch) continue;
      const obr = j === 2 || j === 8;
      ustaw(o, bx + i, by - j, obr ? MOSIADZ[i < 0 ? 2 : 1] : DESKI[i < -2 ? 3 : i > 2 ? 0 : (i + 8) % 3 === 0 ? 1 : 2]);
    }
    for (let i = -3; i <= 3; i++) ustaw(o, bx + i, by - 11, DESKI[3]);
  } else if (rodzaj === 'pienek') {
    // Kłoda do siedzenia przy ognisku: leży na boku, czoło (słoje) do widza.
    for (let j = 0; j < 5; j++) for (let i = -5; i <= 4; i++) ustaw(o, bx + i, by - j, KORA[j === 0 ? 0 : j === 4 ? 3 : 1 + (hash(i, j, seed) < 0.3 ? 1 : 0)]);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) { const e = Math.hypot(i - 1.5, j - 2); if (e <= 2.2) ustaw(o, bx + 4 + i, by - j, e < 0.9 ? KORA[2] : e < 1.6 ? CIECIE : jasniej(CIECIE)); }
  } else if (rodzaj === 'zwoje') {
    // Ukradzione zwoje miedzianego drutu: dwa-trzy kręgi jeden na drugim, z dziurą w środku.
    const MIEDZ = [hex('#7a3a1e'), hex('#a8552c'), hex('#cf7a44'), hex('#f0b070')];
    for (const [dx, dy, rr] of [[-3, 0, 5], [3, 0, 4.5], [0, -4, 4.5]] as [number, number, number][]) {
      for (let j = -4; j <= 4; j++) for (let i = -6; i <= 6; i++) {
        const e = Math.hypot(i / rr, j / (rr * 0.55));
        if (e > 1 || e < 0.45) continue;
        const k = (i + j * 2 + 40) % 3 === 0 ? 0 : j < 0 ? 3 - (e > 0.8 ? 1 : 0) : e > 0.8 ? 1 : 2;
        ustaw(o, bx + dx + i, by - 3 + dy + j, MIEDZ[k]);
      }
    }
  } else if (rodzaj === 'rury') {
    // Wiązka ukradzionych mosiężnych rur z kołnierzami, związana sznurem.
    for (const [dy, dx] of [[0, 0], [0, 4], [-3, 2]] as [number, number][]) {
      for (let i = -7; i <= 6; i++) for (let j = 0; j < 3; j++) ustaw(o, bx + dx + i - 2, by - 2 + dy - j, MOSIADZ[j === 2 ? 2 : j === 1 ? 1 : 0]);
      for (let j = -1; j < 4; j++) ustaw(o, bx + dx + 5, by - 2 + dy - j + 1, MOSIADZ[2]);
      ustaw(o, bx + dx - 9, by - 3 + dy, hex('#2a2224'));
    }
    for (let j = 0; j < 7; j++) ustaw(o, bx + 1, by - j, hex('#9c8a68'));
  } else if (rodzaj === 'lup') {
    // Otwarta skrzynia pełna łupów: trybiki, mosiężne części, połyskujące monety.
    bryla(o, bx, by, 10, 7, 6, () => hex('#2a2018'), (_x, y) => (y % 3 === 0 ? DESKI[0] : DESKI[2]), () => DESKI[1]);
    for (const [dx, dy, c] of [[-3, -8, 2], [-1, -9, 1], [1, -8, 2], [3, -9, 0], [0, -10, 2], [-2, -10, 1]] as [number, number, number][]) ustaw(o, bx + dx + 2, by + dy, MOSIADZ[c]);
    // Trybik wystający ze skrzyni.
    for (let a = 0; a < 16; a++) { const r0 = a % 2 ? 3 : 2.2; ustaw(o, Math.round(bx - 2 + Math.cos((a / 16) * 6.28) * r0), Math.round(by - 10 + Math.sin((a / 16) * 6.28) * r0), MOSIADZ[a % 2 ? 1 : 2]); }
    ustaw(o, bx - 2, by - 10, hex('#2a2224'));
  } else {
    // Stos drewna: trzy warstwy szczap czołami do widza.
    for (const [dx, dz] of [[-6, 0], [-1, 0], [4, 0], [-4, 4], [1, 4], [-1, 8]]) {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
        const e = Math.hypot(i - 2, j - 1.5);
        if (e > 2.5) continue;
        ustaw(o, bx + dx + i, by - dz - j, e < 1 ? CIECIE : e < 1.8 ? jasniej(CIECIE) : KORA[2 + (hash(i, j, seed) < 0.5 ? 1 : 0)]);
      }
    }
  }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.45));
  return { o, kx: bx, ky: by };
}

/** Ognisko: skrzyżowane polana i płomień (klatka 0–2). Kamienie i popiół są już w podłożu. */
export function rysujOgien(klatka: number): Rysunek {
  const o = nowy(22, 26);
  const bx = 10, by = 20;
  linia(o, bx - 6, by + 1, bx + 6, by - 2, KORA[1]);
  linia(o, bx - 6, by, bx + 6, by - 3, KORA[3]);
  linia(o, bx - 5, by - 3, bx + 5, by + 1, KORA[0]);
  linia(o, bx - 5, by - 2, bx + 5, by + 2, KORA[2]);
  const wys = [11, 13, 10][klatka % 3];
  const ZOL = hex('#fff1a0'), POM = hex('#ffb340'), CZE = hex('#e0582a');
  for (let j = 0; j < wys; j++) {
    const pol = Math.round((1 - j / wys) * 4.2 + Math.sin(j * 0.9 + klatka * 2.1) * 0.8);
    const sx = Math.round(Math.sin(j * 0.6 + klatka) * 1.2);
    for (let i = -pol; i <= pol; i++) {
      const e = Math.abs(i) / (pol + 0.5);
      ustaw(o, bx + i + sx, by - 1 - j, e < 0.4 && j < wys * 0.7 ? ZOL : e < 0.75 ? POM : CZE);
    }
  }
  for (let k = 0; k < 3; k++) ustaw(o, bx - 3 + Math.floor(hash(k, klatka, 3) * 7), by - wys - 2 - k * 2, k % 2 ? POM : ZOL);
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.35));
  return { o, kx: bx, ky: by };
}

const KAMIEN_G = [hex('#4a4650'), hex('#5f5a63'), hex('#77717a'), hex('#8f8891'), hex('#a8a1a8')];
const MECH = [hex('#4f6a36'), hex('#62803f')];

/**
 * Głaz rumowiska: nieregularna bryła (zaokrąglony wielokąt o kilku ściankach) o wysokości ~0,9 promienia,
 * ścianki oświetlone z północnego zachodu, pęknięcia, mech od północy. `r` = promień podstawy w px generatora.
 */
export function rysujGlaz(r: number, seed: number): Rysunek {
  const h = r * (0.75 + hash(seed, 3, 1) * 0.45);
  const W = Math.ceil(r * 2 + h * SKOS) + 8, H = Math.ceil(r * 1.3 + h) + 8;
  const o = nowy(W, H);
  const bx = 4 + r, by = H - 4 - r * 0.6;
  const n = 7 + Math.floor(hash(seed, 1, 2) * 4);
  // Wierzchołki podstawy i szczytu (szczyt mniejszy, przesunięty do góry w rzucie).
  const kat = (i: number) => (i / n) * Math.PI * 2 + hash(seed, i, 5) * 0.4;
  const pr = (i: number) => 0.8 + hash(seed, i, 6) * 0.25;
  const pod: number[] = [], szc: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = kat(i), p = pr(i);
    pod.push(bx + Math.cos(a) * r * p, by + Math.sin(a) * r * 0.6 * p);
    szc.push(bx + Math.cos(a) * r * p * 0.55 + h * SKOS, by + Math.sin(a) * r * 0.6 * p * 0.55 - h);
  }
  // Ścianki boczne (każda krawędź podstawy ze szczytem), od tylnych do przednich; jasność z normalnej w rzucie.
  const sciany = [...Array(n).keys()].sort((a, b) => Math.sin(kat(a)) - Math.sin(kat(b)));
  for (const i of sciany) {
    const j = (i + 1) % n;
    const am = (kat(i) + kat(j)) / 2 + (j === 0 ? Math.PI : 0);
    const swiatlo = -Math.cos(am) * 0.6 - Math.sin(am) * 0.5; // NW jasno
    const k = Math.max(0, Math.min(3, Math.round(1.5 + swiatlo * 1.6)));
    wielokat(o, [pod[i * 2], pod[i * 2 + 1], pod[j * 2], pod[j * 2 + 1], szc[j * 2], szc[j * 2 + 1], szc[i * 2], szc[i * 2 + 1]], (x, y) => (hash(x, y, seed) < 0.06 ? KAMIEN_G[Math.max(0, k - 1)] : KAMIEN_G[k]));
  }
  // Wierzch (najjaśniejszy) z mchem od północy.
  wielokat(o, szc, (x, y) => (y < by - h - r * 0.15 && hash(x >> 1, y >> 1, seed) < 0.45 ? MECH[hash(x, y, 2) < 0.5 ? 0 : 1] : hash(x, y, seed + 1) < 0.08 ? KAMIEN_G[3] : KAMIEN_G[4]));
  // Pęknięcie.
  const cx = Math.round(bx + h * SKOS * 0.5), cy = Math.round(by - h * 0.5);
  for (let i = 0; i < Math.max(3, h * 0.5); i++) ustaw(o, cx + Math.round(Math.sin(i + seed) * 1.2), cy - Math.round(h * 0.3) + i, KAMIEN_G[0]);
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.45));
  return { o, kx: bx, ky: by };
}

const MARTWE = [hex('#3e3530'), hex('#544840'), hex('#6c5e52'), hex('#857565')];

/** Martwe drzewo bagna: szary, pochylony pień z kilkoma nagimi konarami, bez liści. */
export function rysujMartwe(seed: number): Rysunek {
  const H = WYS.martwe;
  const o = nowy(40, H + 8);
  const bx = 20, by = H + 4;
  const pochyl = (hash(seed, 1, 9) - 0.5) * 0.5;
  const galaz = (x: number, y: number, a: number, len: number, gr: number, g: number) => {
    for (let i = 0; i < len; i++) {
      const px = x + Math.cos(a) * i, py = y + Math.sin(a) * i;
      for (let w = 0; w < gr; w++) ustaw(o, Math.round(px) + w, Math.round(py), MARTWE[w === 0 ? 3 : w === gr - 1 ? 0 : 1 + (hash(i, w, seed) < 0.3 ? 1 : 0)]);
      if (g > 0 && i > len * 0.5 && hash(i, g, seed + 7) < 0.12) galaz(px, py, a + (hash(i, g, seed) < 0.5 ? -0.7 : 0.7), len * 0.5, Math.max(1, gr - 1), g - 1);
    }
  };
  // Pień (od dołu do góry), korzenie przy ziemi.
  galaz(bx - 2, by, -Math.PI / 2 + pochyl, H * 0.85, 4, 0);
  for (const [a, l] of [[-0.3, 6], [Math.PI + 0.3, 6], [0.15, 4]] as [number, number][]) galaz(bx - 1, by - 1, a, l, 2, 0);
  const tx = bx - 2 + Math.cos(-Math.PI / 2 + pochyl) * H * 0.85, ty = by + Math.sin(-Math.PI / 2 + pochyl) * H * 0.85;
  for (let k = 0; k < 4; k++) {
    const u = 0.45 + k * 0.15;
    const px = bx - 2 + (tx - bx + 2) * u, py = by + (ty - by) * u;
    galaz(px, py, -Math.PI / 2 + (k % 2 ? 0.9 : -0.9) + (hash(seed, k, 3) - 0.5) * 0.5, 9 + hash(seed, k, 4) * 7, 2, 1);
  }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.4));
  return { o, kx: bx, ky: by };
}

/**
 * Co wisi nad ogniskiem (rysowane na ogniu, klatka 0–2): żelazny gar na trójnogu z bulgoczącym gulaszem
 * albo rożen na dwóch rozwidlonych kijach z obracającą się pieczenią.
 */
export function rysujNadOgniem(wariant: 'gar' | 'rozen', klatka: number): Rysunek {
  const o = nowy(34, 34);
  const bx = 17, by = 27;
  if (wariant === 'gar') {
    // Trójnóg (trzy kije schodzące się nad ogniem) i łańcuch.
    const apex = [bx + 1, by - 25];
    linia(o, bx - 10, by + 1, apex[0], apex[1], KORA[2]);
    linia(o, bx + 11, by + 1, apex[0], apex[1], KORA[1]);
    linia(o, bx + 2, by - 4, apex[0], apex[1], KORA[0]);
    for (let j = apex[1] + 1; j < by - 15; j++) ustaw(o, apex[0], j, j % 2 ? hex('#4a4a50') : hex('#77777f'));
    // Gar: czarny brzuch, jaśniejszy brzeg, gulasz z bańkami.
    for (let j = 0; j < 9; j++) for (let i = -6; i <= 6; i++) {
      const w = j < 2 ? 6 : Math.round(6 - (j - 2) * 0.55);
      if (Math.abs(i) > w) continue;
      ustaw(o, bx + i + 1, by - 15 + j, j === 0 ? hex('#5a5a62') : i < -2 ? hex('#3c3c44') : hex('#24242a'));
    }
    for (let i = -5; i <= 5; i++) ustaw(o, bx + i + 1, by - 15, hex('#6b8a3a'));
    for (const [dx, f] of [[-3, 0], [1, 1], [4, 2]] as [number, number][]) if ((klatka + f) % 3 !== 2) ustaw(o, bx + dx + 1, by - 16 - ((klatka + f) % 3), hex('#9ab85a'));
    ustaw(o, bx - 5, by - 13, hex('#77777f')); ustaw(o, bx + 7, by - 13, hex('#77777f'));
  } else {
    // Rożen: dwa rozwidlone kije, poprzeczny pręt, pieczeń obracana (cień przesuwa się z klatką).
    for (const sx of [-11, 11]) {
      linia(o, bx + sx, by + 1, bx + sx, by - 14, KORA[1]);
      ustaw(o, bx + sx - 1, by - 15, KORA[2]); ustaw(o, bx + sx + 1, by - 15, KORA[2]);
      ustaw(o, bx + sx - 1, by - 16, KORA[2]); ustaw(o, bx + sx + 1, by - 16, KORA[2]);
    }
    linia(o, bx - 13, by - 14, bx + 14, by - 14, hex('#77777f'));
    ustaw(o, bx + 15, by - 15, hex('#77777f')); ustaw(o, bx + 15, by - 13, hex('#77777f'));
    const MIESO = [hex('#5a2a18'), hex('#8a4424'), hex('#b8682e'), hex('#e0a050')];
    for (let j = -4; j <= 4; j++) for (let i = -7; i <= 7; i++) {
      const e = Math.hypot(i / 7, j / 4.2);
      if (e > 1) continue;
      const s = Math.sin((i * 0.5) + klatka * 2.1) * 0.5 + (j < 0 ? 0.6 : -0.2);
      ustaw(o, bx + i, by - 14 + j, MIESO[Math.max(0, Math.min(3, Math.round(1.4 + s * 1.4 - e)))]);
    }
    ustaw(o, bx - 8, by - 13, hex('#e8dcbc')); ustaw(o, bx + 8, by - 13, hex('#e8dcbc')); // kostki
  }
  obrysuj(o, OBRYS, (c) => mieszaj(c, OBRYS, 0.4));
  return { o, kx: bx, ky: by };
}

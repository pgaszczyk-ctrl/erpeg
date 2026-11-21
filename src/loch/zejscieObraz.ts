// Zejścia do lochów rysowane kodem na siatce świata (właściciel, 21 Nov 2026: „to, co rysujesz w kodzie, jest spójne;
// zejścia to nałożone placki w innej rozdzielczości”). Jeden piksel płótna = piksel świata = pół piksela mapy
// (pokazywane w skali 1/2, NEAREST), obrys #1e1a24, światło z północnego zachodu, kolory z palety świata.
//
// Klatki (poziomy pas): 0 zamknięte, 1 zamknięte z błyskiem w szczelinie (pukanie), 2 uchylone, 3 otwarte.
import type { RodzajLochu } from '../content/lochy';

export const ZEJSCIE = {
  /** Rozmiar klatki w pikselach świata. */
  w: 56,
  h: 46,
  /** Próg (stopy bohatera przy wejściu) – punkt zaczepienia obrazka. */
  progX: 28,
  progY: 41,
  klatek: 4,
};

const INK = '#1e1a24';

type Ctx = CanvasRenderingContext2D;

/** Rysuje pas klatek zejścia na nowym płótnie. */
export function plotnoZejscia(rodzaj: RodzajLochu): HTMLCanvasElement {
  const { w, h, klatek } = ZEJSCIE;
  const c = document.createElement('canvas');
  c.width = w * klatek;
  c.height = h;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  for (let k = 0; k < klatek; k++) {
    x.save();
    x.translate(k * w, 0);
    klatka(x, rodzaj, k);
    x.restore();
  }
  return c;
}

function klatka(c: Ctx, rodzaj: RodzajLochu, k: number) {
  const r = (x: number, y: number, w: number, h: number, kol: string) => { c.fillStyle = kol; c.fillRect(x, y, w, h); };
  const p = (x: number, y: number, kol: string) => r(x, y, 1, 1, kol);
  const krypta = rodzaj === 'krypta';
  // Kamień obudowy: krypta szara, katakumby cieplejszy piaskowiec.
  const k0 = krypta ? '#38383e' : '#3a3440';
  const k1 = krypta ? '#68686e' : '#7c756d';
  const k2 = krypta ? '#949098' : '#9a9490';
  const k3 = krypta ? '#b4aea8' : '#b5a286';
  const k4 = krypta ? '#c6c2c6' : '#cdbd9c';

  // Cień na ziemi (na południowy wschód, twardy, półprzezroczysty – jak cienie budynków).
  c.fillStyle = 'rgba(20,18,26,0.32)';
  c.fillRect(11, 40, 40, 3);
  c.fillRect(47, 18, 4, 24);

  // Tylna ściana z nadprożem (stoi pionowo za otworem): krypta z krzyżem, katakumby z łukiem i mosiężnym wywietrznikiem.
  r(12, 6, 32, 14, INK);
  r(13, 7, 30, 12, k2);
  r(13, 7, 30, 2, k3);
  r(13, 7, 1, 12, k3);
  r(42, 7, 1, 12, k1);
  // Spoiny kamieni.
  for (const [sx, sy, sw] of [[13, 11, 30], [13, 15, 30]] as const) r(sx, sy, sw, 1, k1);
  for (const sx of [20, 31, 38]) r(sx, 7, 1, 4, k1);
  for (const sx of [17, 26, 35]) r(sx, 11, 1, 4, k1);
  for (const sx of [22, 33]) r(sx, 15, 1, 4, k1);
  if (krypta) {
    // Kamienny krzyż na szczycie.
    r(26, 0, 5, 9, INK); r(23, 2, 11, 4, INK);
    r(27, 1, 3, 7, k3); r(24, 3, 9, 2, k3);
    p(27, 1, k4); p(24, 3, k4); r(29, 3, 1, 5, k1);
    // Mech w szczelinach.
    r(14, 17, 3, 1, '#538068'); p(40, 9, '#538068'); p(41, 9, '#3c6652');
  } else {
    // Łuk nad wejściem + mosiężny wywietrznik z boku (steampunk).
    r(22, 2, 13, 6, INK);
    r(23, 3, 11, 4, k3); r(24, 2, 9, 1, INK); r(25, 3, 7, 1, k4);
    r(27, 4, 3, 2, '#c8963e'); p(27, 4, '#e9c56a');
    r(39, 1, 4, 7, INK); r(40, 2, 2, 5, '#9a6420'); p(40, 2, '#e9c56a');
    r(38, 0, 6, 2, INK); r(39, 0, 4, 1, '#c8963e');
  }

  // Kamienna obudowa otworu (widok trochę z góry): wierzch jaśniejszy, przód ciemniejszy.
  r(8, 18, 40, 23, INK);
  r(9, 19, 38, 18, k2);
  r(9, 19, 38, 1, k4);
  r(9, 19, 1, 18, k3);
  r(46, 19, 1, 18, k1);
  r(9, 36, 38, 4, k1);
  r(9, 36, 38, 1, k0);
  for (const sx of [17, 27, 37]) r(sx, 37, 1, 3, k0);
  p(10, 20, k4); p(45, 35, k0);

  // Otwór: schody w dół – najbliższy stopień najjaśniejszy, głębiej coraz ciemniej.
  const L = 14, T = 22, W = 28, H = 13;
  r(L - 1, T - 1, W + 2, H + 2, INK);
  const stopnie = ['#141216', '#1f2130', '#2c2f42', '#3c4256', '#525a70'];
  for (let i = 0; i < stopnie.length; i++) {
    const y0 = T + Math.round((i * H) / stopnie.length);
    const y1 = T + Math.round(((i + 1) * H) / stopnie.length);
    r(L, y0, W, y1 - y0, stopnie[i]);
    if (i > 0) r(L, y0, W, 1, i > 2 ? '#6c7790' : '#3e5468');
  }
  // Zimne światło z dołu (lekko).
  r(L + 9, T, 10, 2, '#2a3a4c');

  // Skrzydła klapy.
  const deska = krypta ? null : ['#3e2a1c', '#6a4426', '#8a613f', '#a57a52'];
  const skrzydlo = (x0: number, y0: number, w: number, hh: number, lewe: boolean, uniesione: boolean) => {
    r(x0 - 1, y0 - 1, w + 2, hh + 2, INK);
    if (krypta) {
      // Żelazna krata: ciemne pręty na prawie czarnym tle, jasne nity.
      r(x0, y0, w, hh, '#2a2a2e');
      for (let i = x0 + 1; i < x0 + w; i += 3) r(i, y0, 1, hh, uniesione ? '#56565c' : '#77747a');
      for (const yy of [y0 + 1, y0 + hh - 2]) r(x0, yy, w, 1, '#56565c');
      r(x0, y0, w, 1, '#949098');
      p(lewe ? x0 + w - 2 : x0 + 1, y0 + (hh >> 1), '#c8963e');
    } else {
      // Deski z mosiężnymi okuciami.
      r(x0, y0, w, hh, deska![uniesione ? 1 : 2]);
      for (let i = x0 + 3; i < x0 + w; i += 4) r(i, y0, 1, hh, deska![0]);
      r(x0, y0, w, 1, deska![3]);
      for (const yy of [y0 + 2, y0 + hh - 3]) { r(x0, yy, w, 1, '#9a6420'); p(x0 + 1, yy, '#e9c56a'); p(x0 + w - 2, yy, '#e9c56a'); }
      // Żelazne kółko przy szczelinie.
      const kx = lewe ? x0 + w - 3 : x0 + 1;
      r(kx, y0 + (hh >> 1) - 1, 2, 3, INK); p(kx + (lewe ? 0 : 1), y0 + (hh >> 1), '#77747a');
    }
  };
  const polowa = W >> 1;
  if (k <= 1) {
    skrzydlo(L, T, polowa, H, true, false);
    skrzydlo(L + polowa, T, polowa, H, false, false);
    r(L + polowa, T, 1, H, INK);
    if (k === 1) {
      // Błysk w szczelinie: coś tam w dole puka.
      r(L + polowa, T + 1, 1, H - 2, '#aaaab8');
      p(L + polowa, T + (H >> 1), '#ece6d6');
      r(L + polowa - 1, T + 3, 1, H - 6, '#6a8aa0');
      r(L + polowa + 1, T + 3, 1, H - 6, '#6a8aa0');
    }
  } else if (k === 2) {
    // Uchylone: skrzydła uniesione (skrócone i podniesione), w środku ciemna szpara ze światłem.
    const ww = 9;
    skrzydlo(L, T - 3, ww, H, true, true);
    skrzydlo(L + W - ww, T - 3, ww, H, false, true);
    r(L + ww + 1, T + 2, W - 2 * ww - 2, 1, '#6a8aa0');
  } else {
    // Otwarte: skrzydła stoją pionowo przy zawiasach (widać ich grubość i lico).
    const st = (x0: number, jasne: boolean) => {
      r(x0 - 1, T - 11, 5, H + 12, INK);
      if (krypta) {
        r(x0, T - 10, 3, H + 10, '#2a2a2e');
        for (let y = T - 9; y < T + H; y += 3) r(x0, y, 3, 1, jasne ? '#949098' : '#56565c');
      } else {
        r(x0, T - 10, 3, H + 10, jasne ? deska![2] : deska![1]);
        r(x0, T - 10, 3, 1, deska![3]);
        for (const yy of [T - 7, T + H - 4]) r(x0, yy, 3, 1, jasne ? '#c8963e' : '#9a6420');
      }
      r(x0 + (jasne ? 0 : 2), T - 10, 1, H + 10, jasne ? (krypta ? '#77747a' : deska![3]) : INK);
    };
    st(L - 3, true);
    st(L + W, false);
  }
}

/** Kurz/para z pukania: mała pikselowa chmurka (2 klatki, 10×8). */
export function plotnoKurzu(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 20;
  c.height = 8;
  const x = c.getContext('2d')!;
  const wz = [
    ['..xxx.....', '.xoooxx...', 'xooooooxx.', 'xoooooooox', '.xxooooxx.', '...xxxx...'],
    ['..........', '...xx.....', '..xooxx...', '.xooooox..', '..xxoxx...', '....x.....'],
  ];
  wz.forEach((rows, f) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    x.fillStyle = ch === 'x' ? '#949098' : '#c6c2c6';
    x.fillRect(f * 10 + i, j + 1, 1, 1);
  })));
  return c;
}

/** Zimna poświata w pikselach (twarde pasma + szachownica Bayera), biała – barwiona przy pokazywaniu. */
export function plotnoPoswiaty(): HTMLCanvasElement {
  const W = 72, H = 52;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const img = x.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const dx = (i + 0.5 - W / 2) / (W / 2), dy = (j + 0.5 - H / 2) / (H / 2);
    const d = Math.hypot(dx, dy);
    if (d >= 1) continue;
    const v = (1 - d) * 3; // 0..3 – trzy pasma
    const pasmo = Math.floor(v);
    const resz = v - pasmo;
    const p = pasmo + (resz * 16 > bayer[(j & 3) * 4 + (i & 3)] ? 1 : 0);
    if (!p) continue;
    const o = (j * W + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = [0, 70, 140, 210][Math.min(3, p)];
  }
  x.putImageData(img, 0, 0);
  return c;
}

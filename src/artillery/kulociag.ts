// Kulociąg Parowy hall (artist's pack 48-G001, owner 2 Nov 2026): the underground station of the pinball ride. The
// artist's flattened hall + moving layers (springs, pistons, gauge, glass ball, steam) and his lane state machine
// (docs/poczta/od-grafika/48_kulociag/src/kulociag.js) ported as is: board → compress → hold (until the destination is
// ready) → release (constant 3800 px/s, no ease-in) → recoil → empty; arrive → brake → settle → exit → idle.
// The game adds: the station name on the wall sign, a mosaic in the country's flag colours on the floor, passengers
// (the hero in lane 0, townsfolk in lanes 1–2 that come and go on their own). Coordinates = the source canvas 1672×941.
import { FLAGI, FLAGA_NIEZNANA, KOLORY_FLAG } from '../content/flagi';

const BAZA = `${import.meta.env.BASE_URL || '/'}swiat/kulociag/`;
export const HALA = { w: 1672, h: 941 };
const D: Record<string, number> = { board: .4, compress: 1.35, hold: .3, release: .2, recoil: .5, arrive: 1.6, brake: .8, settle: .9, exit: .7 };
const NEXT: Record<string, string> = { board: 'compress', compress: 'hold', hold: 'release', release: 'recoil', recoil: 'empty', arrive: 'brake', brake: 'settle', settle: 'exit', exit: 'idle' };
const WOLNE = ['idle', 'empty'];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
/** Free inner areas of the wall sign and the floor mosaic frame (manifest.json regions). */
const TABLICA = { x: 478, y: 67, w: 317, h: 59 };
const MOZAIKA = { x: 424, y: 396, w: 339, h: 84 };
/** Townsfolk sheets used as passengers in the other lanes (front standing frame). */
const PASAZEROWIE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14];

/** A passenger picture: the image and its opaque box (so any sheet or 3D frame fits the ball the same way). */
export interface Postac { img: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }

export class Tor {
  phase = 'idle';
  elapsed = 0;
  passenger: Postac[] | null = null;
  ready = false;
  constructor(readonly id: number, readonly x: number) {}
  private change(p: string) {
    this.phase = p;
    this.elapsed = 0;
    if (p === 'idle') this.passenger = null;
  }
  depart(p: Postac[] | null, ready = false) {
    if (!WOLNE.includes(this.phase)) return false;
    this.passenger = p;
    this.ready = ready;
    this.change('board');
    return true;
  }
  arrive(p: Postac[] | null) {
    if (!WOLNE.includes(this.phase)) return false;
    this.passenger = p;
    this.change('arrive');
    return true;
  }
  update(dt: number) {
    let left = Math.max(0, dt);
    for (let n = 0; n < 20; n++) {
      if (WOLNE.includes(this.phase)) return;
      if (this.phase === 'hold' && !this.ready) {
        this.elapsed = Math.min(D.hold, this.elapsed + left);
        return;
      }
      const take = Math.min(left, Math.max(0, D[this.phase] - this.elapsed));
      this.elapsed += take;
      left -= take;
      if (this.elapsed < D[this.phase] - 1e-9) return;
      this.change(NEXT[this.phase]);
      if (left <= 0) return;
    }
  }
  pose() {
    const p = this.phase, u = clamp(this.elapsed / (D[p] || 1));
    let compression = 0, y = 530, exit = 0, release = 0;
    const visible = !['empty', 'recoil', 'idle'].includes(p);
    if (p === 'compress') { compression = smooth(u); y = 530 + 73 * compression; }
    else if (p === 'hold') { compression = 1; y = 603; }
    else if (p === 'release') { compression = Math.max(0, 1 - u / .22); y = 603 - 760 * u; release = u; }
    else if (p === 'recoil') compression = Math.max(0, .1 * Math.sin(u * 22) * Math.exp(-u * 5));
    else if (p === 'arrive') y = -55 + 585 * (1 - (1 - u) * (1 - u));
    else if (p === 'brake') { compression = 60 / 73 * Math.sin(u * Math.PI / 2); y = 530 + 73 * compression; }
    else if (p === 'settle') { compression = 60 / 73 * (1 - smooth(u)); y = 530 + 73 * compression; }
    else if (p === 'exit') exit = u;
    return { phase: p, u, compression, y, visible, exit, release };
  }
}

const NAZWY = ['station/hala.webp', 'station/foreground_bands.png', 'rig/trough.png', 'rig/gauge_face.png', 'rig/gauge_needle.png',
  'rig/side_steps.png', 'ball/back.png', 'ball/front.png', 'ball/shadow.png', 'ball/hatch_open.png', 'fx/trail.png',
  ...[0, 1, 2, 3, 4].flatMap((i) => [`rig/spring_${i}.png`, `rig/pistons_${i}.png`]),
  ...[0, 1, 2, 3].map((i) => `ball/reflection_${i}.png`), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `fx/steam_${i}.png`)];
const OBRAZY: Record<string, HTMLImageElement> = {};
const BRAKI = new Set<string>();
let wczytywanie: Promise<boolean> | null = null;
const obraz = (src: string) => new Promise<HTMLImageElement>((ok, zle) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = () => zle(Error('Brak obrazka: ' + src));
  i.src = src;
});
/** Loads the hall's pictures once per page (also called early when a hatch appears on the map). */
export function wczytajKulociag(): Promise<boolean> {
  return (wczytywanie ??= Promise.all(NAZWY.map(async (n) => { OBRAZY[n.replace(/\.\w+$/, '')] = await obraz(BAZA + n); }))
    .then(() => true, () => { wczytywanie = null; return false; }));
}
export const kulociagGotowy = () => !!OBRAZY['station/hala'] && Object.keys(OBRAZY).length >= NAZWY.length;

/** The opaque box of a picture (computed once). */
export function postacZ(img: HTMLImageElement | HTMLCanvasElement, cut?: { x: number; y: number; w: number; h: number }): Postac {
  const c = cut ?? { x: 0, y: 0, w: (img as HTMLImageElement).naturalWidth || img.width, h: (img as HTMLImageElement).naturalHeight || img.height };
  const k = document.createElement('canvas');
  k.width = c.w;
  k.height = c.h;
  const g = k.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
  const d = g.getImageData(0, 0, c.w, c.h).data;
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (d[(y * c.w + x) * 4 + 3] > 40) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { img, sx: c.x, sy: c.y, sw: c.w, sh: c.h };
  return { img, sx: c.x + x0, sy: c.y + y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1 };
}

let mieszkancy: Postac[] | null = null;
async function wczytajMieszkancow() {
  if (mieszkancy) return mieszkancy;
  const lista: Postac[] = [];
  await Promise.all(PASAZEROWIE.map(async (n) => {
    try {
      const i = await obraz(`${import.meta.env.BASE_URL || '/'}postacie/mieszkaniec_${String(n).padStart(2, '0')}.png`);
      lista.push(postacZ(i, { x: 64, y: 0, w: 64, h: 64 }));
    } catch { /* a missing sheet just isn't used */ }
  }));
  return (mieszkancy = lista);
}

export class Hala {
  readonly tory = [1028, 1251, 1474].map((x, i) => new Tor(i, x));
  czas = 0;
  nazwa = '';
  kraj: string | null = null;
  private tlo: HTMLCanvasElement | null = null;
  private tloKlucz = '';
  private ludzie: Postac[] = [];
  private zegary = [0, 2.5, 5.5];
  constructor(private ruchTla = true) {
    void wczytajMieszkancow().then((l) => (this.ludzie = l));
  }
  /** The station shown: its name on the wall sign, its country's flag in the floor mosaic. */
  stacja(nazwa: string, kraj: string | null) {
    this.nazwa = nazwa;
    this.kraj = kraj;
  }
  update(dt: number) {
    this.czas += Math.max(0, dt);
    for (const t of this.tory) t.update(dt);
    if (!this.ruchTla || !this.ludzie.length) return;
    // The other lanes live on their own: now and then someone leaves or arrives.
    for (let i = 1; i < 3; i++) {
      const t = this.tory[i];
      if (!WOLNE.includes(t.phase)) continue;
      this.zegary[i] -= dt;
      if (this.zegary[i] > 0) continue;
      this.zegary[i] = 3 + Math.random() * 6;
      const kto = [this.ludzie[Math.floor(Math.random() * this.ludzie.length)]];
      if (Math.random() < 0.5) t.depart(kto, true);
      else t.arrive(kto);
    }
  }

  /** Static background with the name and the mosaic baked in (redrawn only when the station changes). */
  private tloStacji() {
    const klucz = `${this.nazwa}|${this.kraj}`;
    if (this.tlo && this.tloKlucz === klucz) return this.tlo;
    const c = (this.tlo ??= document.createElement('canvas'));
    c.width = HALA.w;
    c.height = HALA.h;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(OBRAZY['station/hala'], 0, 0);
    mozaika(g, this.kraj);
    tablica(g, this.nazwa);
    this.tloKlucz = klucz;
    return c;
  }

  /** Draws the hall in source coordinates (the caller sets the transform). */
  draw(g: CanvasRenderingContext2D) {
    const im = (n: string, x: number, y: number) => {
      const o = OBRAZY[n];
      if (o) g.drawImage(o, Math.round(x), Math.round(y));
      else if (!BRAKI.has(n)) { BRAKI.add(n); console.warn('Kulociąg: brak warstwy ' + n); }
    };
    g.drawImage(this.tloStacji(), 0, 0);
    const para: [number, number][] = [];
    for (const t of this.tory) {
      const x = t.x, p = t.pose(), f = p.phase === 'release' ? 4 : Math.round(clamp(p.compression) * 3);
      // Holding the full spring: a slight shiver, so a long wait for the destination still looks alive.
      const drzy = p.phase === 'hold' ? Math.round(Math.sin(this.czas * 47) * 0.6) : 0;
      im('rig/trough', x - 64, 520);
      im(`rig/spring_${f}`, x - 64 + drzy, 520);
      im(`rig/pistons_${f}`, x - 64, 520);
      im('rig/side_steps', x - 95, 534);
      im('rig/gauge_face', x + 60, 635);
      g.save();
      g.translate(x + 80, 655);
      g.rotate(-1.8 + p.compression * 2.9 + (p.phase === 'hold' ? Math.sin(this.czas * 31) * 0.04 : 0));
      im('rig/gauge_needle', -20, -20);
      g.restore();
      if (p.visible) {
        g.save();
        g.globalAlpha = p.y < 140 ? clamp((p.y - 20) / 120) : 1;
        im('ball/shadow', x - 40, p.y - 40);
        im('ball/back', x - 40, p.y - 40);
        if (t.passenger && p.phase !== 'exit') {
          g.save();
          g.beginPath();
          g.arc(x, p.y, 29, 0, 7);
          g.clip();
          rysujPostac(g, t.passenger, this.czas, x, p.y + 18, 40);
          g.restore();
        }
        im('ball/front', x - 40, p.y - 40);
        im(`ball/reflection_${Math.floor(this.czas * 5) % 4}`, x - 40, p.y - 40);
        if (p.phase === 'board' || p.phase === 'exit') im('ball/hatch_open', x - 72, p.y - 40);
        g.restore();
      }
      if (p.phase === 'exit' && t.passenger) rysujPostac(g, t.passenger, this.czas, x - 83 * p.exit, 552 + 16 * p.exit, 44);
      if (p.phase === 'release') {
        g.save();
        g.globalAlpha = .7;
        im('fx/trail', x - 40, p.y + 35);
        g.restore();
        para.push([x, Math.floor(p.u * 5)]);
      }
      if (p.phase === 'recoil') para.push([x, Math.min(7, 2 + Math.floor(p.u * 6))]);
      if (p.phase === 'brake') para.push([x, Math.floor(p.u * 7)]);
      if ((p.phase === 'compress' || p.phase === 'hold') && Math.floor(this.czas * 5) % 4 === 0) para.push([x, 2]);
    }
    im('station/foreground_bands', 0, 0);
    for (const [x, f] of para) im(`fx/steam_${f}`, x - 224, 570);
  }
}

/** A passenger with its feet at (x, y), scaled to `wys` px tall; several pictures = an animation. */
function rysujPostac(g: CanvasRenderingContext2D, klatki: Postac[], czas: number, x: number, y: number, wys: number) {
  const k = klatki[Math.floor(czas * 8) % klatki.length];
  if (!k) return;
  const s = Math.min(wys / k.sh, 42 / k.sw);
  const w = k.sw * s, h = k.sh * s;
  g.drawImage(k.img, k.sx, k.sy, k.sw, k.sh, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
}

/** The station name on the enamel sign, as big as fits. */
function tablica(g: CanvasRenderingContext2D, nazwa: string) {
  if (!nazwa) return;
  const R = TABLICA;
  let px = 40;
  const font = (n: number) => `700 ${n}px 'Alegreya Sans', 'Georgia', serif`;
  g.font = font(px);
  while (px > 14 && g.measureText(nazwa).width > R.w - 24) g.font = font(--px);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const x = R.x + R.w / 2, y = R.y + R.h / 2 + 2;
  g.fillStyle = '#0c1612';
  g.fillText(nazwa, x + 2, y + 2);
  g.fillStyle = '#f0dca8';
  g.fillText(nazwa, x, y);
}

/** Floor mosaic in the colours of the country's flag: small stones with joints, laid into the paving. */
function mozaika(g: CanvasRenderingContext2D, kraj: string | null) {
  const flaga = (kraj && FLAGI[kraj]) || null;
  const R = MOZAIKA, K = 7;
  const cols = Math.floor(R.w / K), rows = Math.floor(R.h / K);
  const x0 = R.x + Math.floor((R.w - cols * K) / 2), y0 = R.y + Math.floor((R.h - rows * K) / 2);
  const wzor = flaga ?? FLAGA_NIEZNANA;
  g.save();
  g.globalAlpha = 0.82;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const fy = Math.min(wzor.length - 1, Math.floor((r / rows) * wzor.length));
    const fx = Math.min(wzor[0].length - 1, Math.floor((c / cols) * wzor[0].length));
    const z = wzor[fy][fx];
    let kol = KOLORY_FLAG[z] ?? (flaga ? '#6b5233' : '#8a6a3c');
    if (z === '.') kol = '#6b5233';
    // Each stone its own shade (fixed by position), worn darker at the edges.
    const h = ((c * 73856093) ^ (r * 19349663)) >>> 0;
    const jit = ((h % 21) - 10) / 100 - (r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? 0.12 : 0);
    g.fillStyle = cieniuj(kol, jit - 0.08);
    g.fillRect(x0 + c * K, y0 + r * K, K - 1, K - 1);
  }
  g.restore();
}
function cieniuj(hex: string, o: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(o >= 0 ? v + (255 - v) * o : v * (1 + o))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

import Phaser from 'phaser';
import { klatkiWiatru, GATUNKI, type Obraz } from '../gen';
import { drzewoZ, type Drzewo09 } from './drzewa09';
import { GEN_DOTS } from './ziemia09';
import { weather } from '../weather';
import { KORONY } from '../content/korony';

// Korony drzew overhaulu 09 (SPEC_09 punkt 3.2, wariant A): każda korona to sprite stojący na pniu namalowanym
// w kawałku mapy, z głębią = podstawa pnia (postać za drzewem chowa się pod koroną).
// Wiatr: 5 gotowych klatek „ścięcia” (wiersze przesunięte o całe piksele, u góry najbardziej), klatka wybierana
// z funkcji wiatru z makiety (docs/paczka-dla-programisty/dane/wiatr.json), siła z prawdziwej pogody.
// Prześwit: korona zasłaniająca postać dostaje własną kopię klatki z dziurą wokół postaci; krawędź dziury
// z szachownicy Bayera liczonej w siatce świata, więc nie „pływa”, gdy postać idzie.

const MARGINES = 6; // klatki wiatru są szersze o 2 × margines
const KLATKI = [-2, -1, 0, 1, 2];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

interface Arkusz { key: string; klatki: Obraz[]; w: number; h: number; kx: number; ky: number }

export interface Korona {
  t: Drzewo09;
  im: Phaser.GameObjects.Image;
  a: Arkusz;
  /** Która klatka wiatru teraz (indeks w KLATKI). */
  k: number;
  /** Promień prześwitu (px generatora) i własna tekstura z dziurą, gdy > 0. */
  r: number;
  wlasna?: Phaser.Textures.CanvasTexture;
  /** Ostatnio namalowana dziura (żeby nie malować tego samego). */
  ostatnia?: string;
  /** Szelest po wejściu postaci (gaśnie). */
  szelest: number;
  ziarno: number;
}

let licznik = 0;

export class Korony {
  private wszystkie = new Set<Korona>();
  private arkusze = new Map<string, Arkusz>();

  constructor(private scene: Phaser.Scene) {}

  /** Tekstura z 5 klatkami wiatru dla gatunku i wariantu (owoce kołyszą się razem z koroną). */
  private arkusz(g: string, w: number): Arkusz {
    const key = `drz09-${g}-${w}`;
    let a = this.arkusze.get(key);
    if (a) return a;
    const d = drzewoZ(g, w);
    const kor: Obraz = { w: d.korona.w, h: d.korona.h, px: d.korona.px.slice() };
    if (d.owoce) for (let i = 0; i < kor.px.length; i++) if (d.owoce.px[i] >>> 24) kor.px[i] = d.owoce.px[i];
    const klatki = klatkiWiatru(kor, d.koronaGora, d.koronaDol, GATUNKI[g].sztywnosc, MARGINES);
    const W = klatki[0].w, H = klatki[0].h;
    if (!this.scene.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = W * klatki.length;
      c.height = H;
      const ctx = c.getContext('2d')!;
      klatki.forEach((k, i) => ctx.putImageData(obrazDanych(k), i * W, 0));
      const tex = this.scene.textures.addCanvas(key, c)!;
      KLATKI.forEach((k, i) => tex.add(`w${k}`, 0, i * W, 0, W, H));
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    a = { key, klatki, w: W, h: H, kx: d.kotwica[0] + MARGINES, ky: d.kotwica[1] + 1 };
    this.arkusze.set(key, a);
    return a;
  }

  make(t: Drzewo09): Korona {
    const a = this.arkusz(t.g, t.w);
    const x = t.x / GEN_DOTS, y = t.y / GEN_DOTS;
    const im = this.scene.add.image(x, y, a.key, 'w0').setOrigin(a.kx / a.w, a.ky / a.h).setScale(1 / GEN_DOTS).setDepth(y);
    const k: Korona = { t, im, a, k: 2, r: 0, szelest: 0, ziarno: (t.x * 7919 + t.y * 104729) % 1000 };
    this.wszystkie.add(k);
    return k;
  }

  drop(k: Korona) {
    this.wszystkie.delete(k);
    this.zdejmijDziure(k);
    k.im.destroy();
  }

  /** Co klatkę gry: wiatr i prześwit koron w widoku. `hx, hy` = stopy postaci (px mapy). */
  update(now: number, dt: number, cam: Phaser.Geom.Rectangle, hx: number, hy: number) {
    const T = now / 1000;
    const S = Math.max(0.1, Math.min(2.2, weather.wind / 7));
    // Środek postaci w px generatora.
    const px = hx * GEN_DOTS, py = (hy - KORONY.srodekPostaci) * GEN_DOTS;
    const m = 40;
    for (const k of this.wszystkie) {
      const im = k.im;
      if (im.x < cam.x - m || im.x > cam.right + m || im.y < cam.y - m || im.y > cam.bottom + 2 * m) continue;
      // Prześwit: tylko korona przed postacią (podstawa niżej niż stopy), gdy postać stoi pod jej liśćmi.
      const lx = Math.round(px - (k.t.x - k.a.kx)), ly = Math.round(py - (k.t.y - k.a.ky));
      const pod = k.t.y > hy * GEN_DOTS && lx >= 0 && ly >= 0 && lx < k.a.w && ly < k.a.h && zaslania(k.a.klatki[2], lx, ly);
      const cel = pod ? KORONY.promien : 0;
      if (pod && k.r < 0.5) k.szelest = 1;
      k.r += (cel - k.r) * Math.min(1, dt * KORONY.szybkoscPrzeswitu);
      if (!pod && k.r < 0.5) k.r = 0;
      k.szelest *= Math.exp(-2.4 * dt);
      // Wiatr (dane/wiatr.json) + szelest; klatki mają już w sobie sztywność gatunku.
      const xf = k.t.x, yf = k.t.y - k.a.ky / 2;
      const p = (((xf * 0.8 + yf * 0.35) * 0.0055 - T * 0.26) % 1 + 1) % 1;
      const poryw = Math.exp(-(((p - 0.5) * 6) ** 2));
      let w = (S * (0.32 * Math.sin(T * 2.1 + xf * 0.07 + yf * 0.03) + 0.14 * Math.sin(T * 3.4 - xf * 0.05 + yf * 0.06) + 1.25 * poryw)) / 1.25;
      if (k.szelest > 0.02) w += Math.sin(T * 26 + k.ziarno) * k.szelest * 1.4;
      const idx = Math.max(0, Math.min(4, Math.round(w) + 2));
      if (k.r > 0) this.dziura(k, idx, px, py);
      else {
        if (k.wlasna) this.zdejmijDziure(k);
        if (idx !== k.k || im.texture.key !== k.a.key) im.setTexture(k.a.key, `w${KLATKI[idx]}`);
      }
      k.k = idx;
    }
  }

  /** Własna kopia klatki z dziurą wokół postaci (krawędź z szachownicy w siatce świata). */
  private dziura(k: Korona, idx: number, px: number, py: number) {
    const R = k.r, pas = KORONY.pas;
    const ox = k.t.x - k.a.kx, oy = k.t.y - k.a.ky;
    const sx = Math.round(px), sy = Math.round(py);
    const znak = `${idx}|${sx}|${sy}|${Math.round(R * 2)}`;
    if (znak === k.ostatnia && k.wlasna) return;
    k.ostatnia = znak;
    if (!k.wlasna) {
      k.wlasna = this.scene.textures.createCanvas(`drz09-p${licznik++}`, k.a.w, k.a.h)!;
      k.wlasna.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const src = k.a.klatki[idx];
    const dane = new Uint32Array(src.px);
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const o = j * src.w + i;
      if (!dane[o]) continue;
      const X = ox + i, Y = oy + j;
      const d = Math.hypot(X + 0.5 - px, (Y + 0.5 - py) * 1.05);
      if (d >= R) continue;
      if (d < R - pas || BAYER[((Y & 3) << 2) | (X & 3)] < (R - d) / pas) dane[o] = 0;
    }
    const ctx = k.wlasna.getContext();
    ctx.clearRect(0, 0, k.a.w, k.a.h);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(dane.buffer), src.w, src.h), 0, 0);
    k.wlasna.refresh();
    if (k.im.texture !== k.wlasna) k.im.setTexture(k.wlasna.key);
  }

  private zdejmijDziure(k: Korona) {
    if (!k.wlasna) return;
    const key = k.wlasna.key;
    k.wlasna = undefined;
    k.ostatnia = undefined;
    if (k.im.active) k.im.setTexture(k.a.key, `w${KLATKI[k.k]}`);
    this.scene.textures.remove(key);
  }
}

/** Czy w otoczeniu punktu (lx, ly) są liście (nie zostawiamy dziury w pustym miejscu przy brzegu korony). */
function zaslania(o: Obraz, lx: number, ly: number) {
  let n = 0;
  for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
    const x = lx + dx, y = ly + dy;
    if (x >= 0 && y >= 0 && x < o.w && y < o.h && o.px[y * o.w + x] >>> 24) n++;
  }
  return n >= 6;
}

function obrazDanych(o: Obraz) {
  return new ImageData(new Uint8ClampedArray(o.px.buffer as ArrayBuffer, o.px.byteOffset, o.px.byteLength).slice(), o.w, o.h);
}

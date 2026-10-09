import Phaser from 'phaser';
import { ziemiaWTle, przygotujRysunkiUpraw } from './Podloze09';
import { GEN_DOTS, type Budynek09 } from './ziemia09';
import type { WielkoscMiasta } from '../gen';
import { PRZESWIT_BUDYNKU, POZIOMY } from '../content/budynki';
import { SKALA_POSTACI } from '../skala';
import type { Korony } from './Korony';

// Wysokie budynki (od POZIOMY.osobnoOd poziomów gry, wygląd 09): nie w kawałku mapy, tylko osobne obrazki sortowane
// z postaciami po linii podstawy południowej ściany. Gdy bohater stoi za takim budynkiem, budynek dostaje prześwit –
// wariant E wybrany przez właściciela 6.10.2026: duże wycięcie wokół postaci, w środku budynek prawie znika, kontur zostaje.

/** Kolor obrysu generatora #1e1a24 zapisany jak piksel w ImageData (ABGR, bez alfy). */
const OBRYS = 0x241a1e;
/** Rozmiary z makiety (bohaterka 48 px) przeliczone na ludzika w grze. */
const K = (56 * 0.36 * SKALA_POSTACI * GEN_DOTS) / POZIOMY.wzorBohatera;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

interface Wysoki {
  b: Budynek09;
  noc: boolean;
  /** Kawałki mapy, które go trzymają (obiekty Chunk z MapRenderer). */
  refs: Set<object>;
  /** Liczy się (pierwszy raz albo po zmianie dnia i nocy). */
  czeka: boolean;
  error?: Error;
  im?: Phaser.GameObjects.Image;
  tex?: Phaser.Textures.CanvasTexture;
  /** Piksele bez prześwitu (ABGR). */
  orig?: Uint32Array;
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Linia podstawy (px generatora): najdalej na południe wysunięty punkt obrysu. */
  dol: number;
  /** Obszar obrazu zmieniony przez prześwit [x0, y0, x1, y1) i znak położenia postaci. */
  wyciete?: [number, number, number, number];
  znak?: string;
  para: Phaser.GameObjects.Image[];
}

let licznik = 0;

export class Wysokie {
  private wszystkie = new Map<number, Wysoki>();

  constructor(private scene: Phaser.Scene, private korony: Korony) {}

  /** Kawałek mapy `c` pokazuje te budynki (w kolejnym kawałku ten sam budynek liczy się tylko raz). */
  trzymaj(c: object, lista: Budynek09[], noc: boolean, miasto: WielkoscMiasta) {
    for (const b of lista) {
      const id = b.id ?? b.seed;
      let w = this.wszystkie.get(id);
      if (!w) {
        let dol = -Infinity;
        for (let i = 1; i < b.r.length; i += 2) dol = Math.max(dol, b.r[i]);
        w = { b, noc, refs: new Set(), czeka: false, x0: 0, y0: 0, w: 0, h: 0, dol, para: [] };
        this.wszystkie.set(id, w);
        this.licz(id, w, miasto);
      } else if (w.noc !== noc && !w.czeka) {
        w.noc = noc;
        this.licz(id, w, miasto);
      }
      w.refs.add(c);
    }
  }

  /** Kawałek `c` już ich nie pokazuje: budynek bez żadnego kawałka znika. */
  pusc(c: object, lista: Budynek09[]) {
    for (const b of lista) {
      const id = b.id ?? b.seed;
      const w = this.wszystkie.get(id);
      if (!w) continue;
      w.refs.delete(c);
      if (!w.refs.size) this.usun(id, w);
    }
  }

  destroy() {
    for (const [id, w] of this.wszystkie) this.usun(id, w);
  }

  /** Only buildings reaching the first view need to be ready before it is revealed. */
  firstViewReady(view: Phaser.Geom.Rectangle) {
    const G = GEN_DOTS;
    for (const w of this.wszystkie.values()) {
      const xs = w.b.r.filter((_, i) => i % 2 === 0), ys = w.b.r.filter((_, i) => i % 2 === 1);
      // While its image is being drawn, use the footprint plus walls and roof decorations.
      const x0 = w.im ? w.x0 / G : (Math.min(...xs) - w.b.h * 0.35 - 40) / G;
      const y0 = w.im ? w.y0 / G : (Math.min(...ys) - w.b.h - 80) / G;
      const x1 = w.im ? (w.x0 + w.w) / G : (Math.max(...xs) + 40) / G;
      const y1 = w.im ? (w.y0 + w.h) / G : (Math.max(...ys) + 40) / G;
      if (x1 <= view.x || x0 >= view.right || y1 <= view.y || y0 >= view.bottom) continue;
      if (w.error) throw w.error;
      if (w.czeka || !w.im) return false;
    }
    return true;
  }

  private usun(id: number, w: Wysoki) {
    this.wszystkie.delete(id);
    w.refs.clear();
    this.zdejmij(w);
  }

  private zdejmij(w: Wysoki) {
    w.im?.destroy();
    w.im = undefined;
    if (w.tex) this.scene.textures.remove(w.tex);
    w.tex = undefined;
    for (const p of w.para) this.korony.dropSteam(p);
    w.para = [];
  }

  private licz(id: number, w: Wysoki, miasto: WielkoscMiasta) {
    w.czeka = true;
    w.error = undefined;
    const noc = w.noc;
    void przygotujRysunkiUpraw().then(() => ziemiaWTle().budynek(w.b, noc, miasto)).then((g) => {
      w.czeka = false;
      if (this.wszystkie.get(id) !== w || !this.scene.sys.isActive()) return;
      if (w.noc !== noc) return this.licz(id, w, miasto);
      this.zdejmij(w);
      const key = `bud09-${licznik++}`;
      const tex = this.scene.textures.addCanvas(key, g.obraz);
      if (!tex) throw new Error('Nie udało się narysować budynku');
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const ctx = tex.getContext();
      const dane = ctx.getImageData(0, 0, g.obraz.width, g.obraz.height);
      Object.assign(w, {
        tex, x0: g.x0, y0: g.y0, w: g.obraz.width, h: g.obraz.height,
        orig: new Uint32Array(dane.data.buffer.slice(0)), wyciete: undefined, znak: undefined,
      });
      w.im = this.scene.add.image(g.x0 / GEN_DOTS, g.y0 / GEN_DOTS, key).setOrigin(0).setScale(1 / GEN_DOTS).setDepth(w.dol / GEN_DOTS);
      w.para = g.wyrzuty.map((z) => this.korony.wyrzut(z));
      for (const p of w.para) p.setDepth(Math.max(p.depth, w.dol / GEN_DOTS + 0.5));
    }).catch((error: unknown) => {
      if (this.wszystkie.get(id) !== w) return;
      w.czeka = false;
      w.error = error instanceof Error ? error : new Error(String(error));
    });
  }

  /** Co klatkę: tylko budynki w widoku są rysowane; ten, za którym stoi bohater (stopy hx, hy w px mapy), dostaje prześwit. */
  update(cam: Phaser.Geom.Rectangle, hx: number, hy: number) {
    const G = GEN_DOTS, m = 20;
    const P = PRZESWIT_BUDYNKU;
    const sx = hx * G, sy = hy * G - P.srodekNadStopami * K;
    for (const w of this.wszystkie.values()) {
      const im = w.im;
      if (!im || !w.orig) continue;
      const x = w.x0 / G, y = w.y0 / G;
      const widac = x + w.w / G > cam.x - m && x < cam.right + m && y + w.h / G > cam.y - m && y < cam.bottom + m;
      if (im.visible !== widac) im.setVisible(widac);
      if (!widac) continue;
      // Za budynkiem: stopy na północ od podstawy, a budynek zakrywa ciało postaci (środek, głowa albo stopy).
      const za = hy * G < w.dol && [[sx, sy], [sx, hy * G - 2], [sx, sy - P.srodekNadStopami * K * 0.8]].some(([px, py]) => this.pelny(w, Math.round(px - w.x0), Math.round(py - w.y0)));
      if (za) this.wytnij(w, sx, sy);
      else if (w.wyciete) this.przywroc(w);
    }
  }

  private pelny(w: Wysoki, i: number, j: number) {
    return i >= 0 && j >= 0 && i < w.w && j < w.h && (w.orig![j * w.w + i] >>> 24) !== 0;
  }

  /** Oddaje obrazowi pierwotne piksele z obszaru prześwitu. */
  private przywroc(w: Wysoki) {
    const r = w.wyciete!;
    w.wyciete = undefined;
    w.znak = undefined;
    this.wstaw(w, r, w.orig!);
    w.tex!.refresh();
  }

  private wstaw(w: Wysoki, [a, b, c, d]: [number, number, number, number], px: Uint32Array) {
    const ww = c - a, hh = d - b;
    if (ww <= 0 || hh <= 0) return;
    const kawalek = new Uint32Array(ww * hh);
    for (let j = 0; j < hh; j++) kawalek.set(px.subarray((b + j) * w.w + a, (b + j) * w.w + c), j * ww);
    w.tex!.getContext().putImageData(new ImageData(new Uint8ClampedArray(kawalek.buffer), ww, hh), a, b);
  }

  /** Wariant E: elipsa wokół postaci, ditherowany brzeg; wnętrze prawie przezroczyste, kontur budynku półprzezroczysty. */
  private wytnij(w: Wysoki, cx: number, cy: number) {
    const P = PRZESWIT_BUDYNKU;
    const R = P.promien * K, B = P.brzeg * K, rx = (R + B) * P.rozciag;
    const znak = `${Math.round(cx)}|${Math.round(cy)}`;
    if (znak === w.znak) return;
    w.znak = znak;
    const lx = cx - w.x0, ly = cy - w.y0;
    const nowe: [number, number, number, number] = [
      Math.max(0, Math.floor(lx - rx)), Math.max(0, Math.floor(ly - R - B)),
      Math.min(w.w, Math.ceil(lx + rx) + 1), Math.min(w.h, Math.ceil(ly + R + B) + 1),
    ];
    const stare = w.wyciete;
    // Najpierw stary obszar wraca do pierwotnego wyglądu, potem nowy dostaje dziurę.
    if (stare) this.wstaw(w, stare, w.orig!);
    w.wyciete = nowe;
    const o = w.orig!, W = w.w;
    const px = o.slice();
    const pelny = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < w.h && (o[j * W + i] >>> 24) !== 0;
    for (let j = nowe[1]; j < nowe[3]; j++) for (let i = nowe[0]; i < nowe[2]; i++) {
      const k = j * W + i, c = o[k];
      if (!(c >>> 24)) continue;
      const X = w.x0 + i, Y = w.y0 + j;
      const d = Math.hypot((i - lx) / P.rozciag, j - ly);
      if (!(d < R || (d < R + B && BAYER[((Y & 3) << 2) | (X & 3)] < (R + B - d) / B))) continue;
      const ob = (c & 0xffffff) === OBRYS;
      const kontur = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !pelny(i + a, j + b) || ((o[(j + b) * W + i + a] & 0xffffff) === OBRYS) !== ob);
      px[k] = ((c & 0x00ffffff) | ((kontur ? P.alfaKonturu : P.alfaWnetrza) << 24)) >>> 0;
    }
    this.wstaw(w, nowe, px);
    w.tex!.refresh();
  }
}

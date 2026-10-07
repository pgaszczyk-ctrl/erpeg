import Phaser from 'phaser';
import { PX_PER_M, type CityMap, type Building } from './CityMap';
import { WYGLAD_09 } from './Podloze09';
import { ZABYTKI, type Zabytek } from '../content/zabytki';
import type { MapRenderer } from './MapRenderer';

// Zabytki od grafika (G12, wygląd 09): obraz namalowany na szkielecie z OSM stoi dokładnie na obrysie, jako jeden obiekt
// sortowany z postaciami po południowej krawędzi obrysu. Budynków pod nim generator nie rysuje (tylko ich cień);
// zderzenia, drzwi i mgła zostają z obrysów. Gdy bohater stoi za zabytkiem (np. na dziedzińcu), obraz robi się przejrzysty.

interface Stoi {
  z: Zabytek;
  im: Phaser.GameObjects.Image;
  /** Nieprzezroczyste piksele obrazu (1 bajt na piksel). */
  maska: Uint8Array;
  w: number;
  h: number;
  /** px mapy na px obrazu. */
  f: number;
  /** Środek obrysu w mapie. */
  cx: number;
  cy: number;
  /** Lewy-górny róg obrazu w mapie (już podniesiony o ściany). */
  x0: number;
  y0: number;
  dol: number;
}

/** px generatora szkieletu na metr (2 na punkt mapy przy 1,92 punktu na metr). */
const SZKIELET_PX_NA_M = 3.84;

export class Zabytki {
  private stoja: Stoi[] = [];

  constructor(private scene: Phaser.Scene, city: CityMap, private view: MapRenderer) {
    if (!WYGLAD_09) return;
    view.zabytekCovers = (b) => this.covers(b);
    for (const z of ZABYTKI) {
      if (z.mapa !== city.id) continue;
      const b = city.findBuilding(z.budynek);
      if (!b) continue;
      const key = `zabytek-${z.id}`;
      const go = () => this.postaw(z, b, key);
      if (scene.textures.exists(key)) go();
      else {
        scene.load.image(key, z.plik);
        scene.load.once(`filecomplete-image-${key}`, go);
        scene.load.start();
      }
    }
  }

  private postaw(z: Zabytek, b: Building, key: string) {
    if (!this.scene.sys.isActive() && !this.scene.sys.isPaused()) return;
    const f = PX_PER_M / SZKIELET_PX_NA_M;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    // Ściany stoją na obrysie (jak budynki 09): obraz w górę o ściany i w lewo o ich przechył.
    const x0 = cx + (z.rog[0] - z.srodek[0]) * f - z.sciany * 0.35 * f;
    const y0 = cy + (z.rog[1] - z.srodek[1]) * f - z.sciany * f;
    const tex = this.scene.textures.get(key);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const src = tex.getSourceImage() as HTMLImageElement;
    const w = src.width, h = src.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    const maska = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) maska[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    const im = this.scene.add.image(x0, y0, key).setOrigin(0, 0).setScale(f).setDepth(b.y1);
    this.stoja.push({ z, im, maska, w, h, f, cx, cy, x0, y0, dol: b.y1 });
    // Kawałki pod zabytkiem malujemy jeszcze raz – już bez zwykłego bloku z generatora.
    for (let x = x0; x <= x0 + w * f + 64; x += 64) for (let y = y0; y <= y0 + h * f + 64; y += 64) this.view.redrawAround(x, y);
  }

  /**
   * Czy budynek z mapy leży pod obrazem zabytku: większość punktów siatki wewnątrz jego obrysu wypada na nieprzezroczystych
   * pikselach szkieletu (środek prostokąta nie wystarcza – u zamku to pusty dziedziniec).
   */
  covers(b: Building): boolean {
    const r = b.rings[0];
    if (!r || r.length < 6) return false;
    for (const s of this.stoja) {
      if (b.x1 < s.x0 || b.y1 < s.y0 || b.x0 > s.x0 + s.w * s.f || b.y0 > s.y0 + s.h * s.f + s.z.sciany * s.f) continue;
      const krok = Math.max(1, Math.min(b.x1 - b.x0, b.y1 - b.y0) / 8);
      let w = 0, n = 0;
      for (let y = b.y0 + krok / 2; y < b.y1; y += krok) for (let x = b.x0 + krok / 2; x < b.x1; x += krok) {
        if (!wPierscieniu(r, x, y)) continue;
        n++;
        // W układzie obrazu przed podniesieniem o ściany: tam obrys leży na dachu szkieletu.
        const i = Math.floor((x - s.cx) / s.f + s.z.srodek[0] - s.z.rog[0]);
        const j = Math.floor((y - s.cy) / s.f + s.z.srodek[1] - s.z.rog[1]);
        if (i >= 0 && j >= 0 && i < s.w && j < s.h && s.maska[j * s.w + i]) w++;
      }
      if (n && w / n >= 0.6) return true;
    }
    return false;
  }

  /** Bohater za zabytkiem (stopy na północ od jego podstawy, na jego obrazie): obraz przejrzysty. */
  update(hx: number, hy: number) {
    for (const s of this.stoja) {
      const i = Math.floor((hx - s.x0) / s.f), j = Math.floor((hy - 6 - s.y0) / s.f);
      const za = hy < s.dol && i >= 0 && j >= 0 && i < s.w && j < s.h && s.maska[j * s.w + i] === 1;
      const a = za ? s.z.przeswit : 1;
      if (s.im.alpha !== a) s.im.setAlpha(a);
    }
  }
}

function wPierscieniu(r: number[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ax = r[i], ay = r[i + 1], bx = r[j], by = r[j + 1];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c;
  }
  return c;
}

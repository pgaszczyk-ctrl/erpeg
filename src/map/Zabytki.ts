import Phaser from 'phaser';
import { PX_PER_M, type CityMap, type Building } from './CityMap';
import { WYGLAD_09 } from './Podloze09';
import { ZABYTKI, type Zabytek } from '../content/zabytki';
import type { MapRenderer } from './MapRenderer';
import { SKALA_POSTACI } from '../skala';

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
  /** Per picture column: the map y of its lowest painted pixel (−Infinity: an empty column). */
  podstawa: Float32Array;
  /** Layers on the landmark (sculptures, turning signs), drawn just above it and faded with it. */
  warstwy: { im: Phaser.GameObjects.Image; klatki: number; fps: number; faza: number }[];
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
      if (!b && !z.naMapie) continue;
      const key = `zabytek-${z.id}`;
      const go = () => this.postaw(z, b ?? null, key);
      if (scene.textures.exists(key)) {
        // During create() the scene is not active yet. Cached landmarks must wait for CREATE,
        // otherwise postaw() skips them after a journey or another scene restart.
        if (scene.sys.isActive() || scene.sys.isPaused()) go();
        else scene.sys.events.once(Phaser.Scenes.Events.CREATE, go);
      } else {
        scene.load.image(key, z.plik);
        scene.load.once(`filecomplete-image-${key}`, go);
        scene.load.start();
      }
    }
  }

  private postaw(z: Zabytek, b: Building | null, key: string) {
    if (!this.scene.sys.isActive() && !this.scene.sys.isPaused()) return;
    const f = PX_PER_M / SZKIELET_PX_NA_M;
    let cx: number, cy: number, x0: number, y0: number;
    if (z.naMapie) {
      // Placed by the skeleton's own map corner (file map px → map px), then moved as the artist drew it.
      const k = PX_PER_M / 1.92;
      x0 = z.naMapie[0] * k + (z.przesun?.[0] ?? 0) * f;
      y0 = z.naMapie[1] * k + (z.przesun?.[1] ?? 0) * f;
      cx = x0;
      cy = y0;
    } else {
      cx = (b!.x0 + b!.x1) / 2;
      cy = (b!.y0 + b!.y1) / 2;
      // Ściany stoją na obrysie (jak budynki 09): obraz w górę o ściany i w lewo o ich przechył.
      x0 = cx + (z.rog![0] - z.srodek![0]) * f - z.sciany * 0.35 * f;
      y0 = cy + (z.rog![1] - z.srodek![1]) * f - z.sciany * f;
    }
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
    const podstawa0 = (() => { for (let j = h - 1; j >= 0; j--) for (let i = 0; i < w; i++) if (maska[j * w + i]) return y0 + (j + 1) * f; return y0 + h * f; })();
    const dol = b && !z.naMapie ? b.y1 : podstawa0;
    const im = this.scene.add.image(x0, y0, key).setOrigin(0, 0).setScale(f).setDepth(dol);
    const podstawa = new Float32Array(w).fill(-Infinity);
    for (let i = 0; i < w; i++) for (let j = h - 1; j >= 0; j--) if (maska[j * w + i]) { podstawa[i] = y0 + (j + 1) * f; break; }
    const st: Stoi = { z, im, maska, w, h, f, cx, cy, x0, y0, dol, podstawa, warstwy: [] };
    this.stoja.push(st);
    this.warstwy(st);
    // Kawałki pod zabytkiem malujemy jeszcze raz – już bez zwykłego bloku z generatora.
    for (let x = x0; x <= x0 + w * f + 64; x += 64) for (let y = y0; y <= y0 + h * f + 64; y += 64) this.view.redrawAround(x, y);
  }

  /** Loads and places the landmark's layers (Zabytek.warstwy); animated sheets get their frames cut once. */
  private warstwy(s: Stoi) {
    for (const [n, w] of (s.z.warstwy ?? []).entries()) {
      const key = `zabytek-${s.z.id}-w${n}`;
      const put = () => {
        if (!this.scene.sys.isActive() && !this.scene.sys.isPaused()) return;
        const tex = this.scene.textures.get(key);
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        const src = tex.getSourceImage() as HTMLImageElement;
        let klatki = 1;
        if (w.klatka) {
          klatki = Math.max(1, Math.floor(src.width / w.klatka));
          for (let i = 0; i < klatki; i++) if (!tex.has(`k${i}`)) tex.add(`k${i}`, 0, i * w.klatka, 0, w.klatka, src.height);
        }
        const im = this.scene.add.image(s.x0 + w.x * s.f, s.y0 + w.y * s.f, key, w.klatka ? 'k0' : undefined).setOrigin(0, 0).setScale(s.f).setDepth(s.im.depth + 0.01);
        s.warstwy.push({ im, klatki, fps: w.fps ?? 8, faza: w.faza ?? 0 });
      };
      if (this.scene.textures.exists(key)) put();
      else {
        this.scene.load.image(key, w.plik);
        this.scene.load.once(`filecomplete-image-${key}`, put);
        this.scene.load.start();
      }
    }
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
        // W układzie obrazu przed podniesieniem o ściany: tam obrys leży na dachu szkieletu (obraz postawiony na mapie: wprost).
        const i = s.z.naMapie ? Math.floor((x - s.x0) / s.f) : Math.floor((x - s.cx) / s.f + s.z.srodek![0] - s.z.rog![0]);
        const j = s.z.naMapie ? Math.floor((y - s.y0) / s.f) : Math.floor((y - s.cy) / s.f + s.z.srodek![1] - s.z.rog![1]);
        if (i >= 0 && j >= 0 && i < s.w && j < s.h && s.maska[j * s.w + i]) w++;
      }
      if (n && w / n >= 0.6) return true;
    }
    return false;
  }

  /** Bohater za zabytkiem (stopy na północ od jego podstawy, na jego obrazie): obraz przejrzysty. */
  update(hx: number, hy: number) {
    const t = performance.now() / 1000;
    for (const s of this.stoja) {
      const i = Math.floor((hx - s.x0) / s.f), j = Math.floor((hy - 6 - s.y0) / s.f);
      const kol = i >= 0 && i < s.w ? s.podstawa[i] : -Infinity;
      // In front of the wall in this column (owner 7.10.2026: „zamek niepotrzebnie znika” when walking past its south
      // walls): drawn over the castle, which stays whole; behind it (courtyard, north side): see-through where it covers her.
      // fitHd places the feet 8 * SKALA_POSTACI below the hero's position. Compare the wall with the feet,
      // not the body anchor: beside Targi the anchor can still overlap the wall while the feet are in front.
      if (hy + 8 * SKALA_POSTACI >= kol - 1) {
        const d = Math.min(s.dol, hy - 0.5);
        if (s.im.depth !== d) s.im.setDepth(d);
        if (s.im.alpha !== 1) s.im.setAlpha(1);
      } else {
        if (s.im.depth !== s.dol) s.im.setDepth(s.dol);
        const za = j >= 0 && j < s.h && i >= 0 && i < s.w && s.maska[j * s.w + i] === 1;
        const a = za ? s.z.przeswit : 1;
        if (s.im.alpha !== a) s.im.setAlpha(a);
      }
      // Keep roof decorations with their building in this frame, after its depth and alpha were updated.
      for (const w of s.warstwy) {
        if (w.klatki > 1) w.im.setFrame(`k${Math.floor(t * w.fps + w.faza) % w.klatki}`);
        if (w.im.depth !== s.im.depth + 0.01) w.im.setDepth(s.im.depth + 0.01);
        if (w.im.alpha !== s.im.alpha) w.im.setAlpha(s.im.alpha);
      }
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

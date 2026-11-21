// Konstrukcje siedlisk jako obiekty świata (jak korony drzew i zabytki): każdy odcinek palisady, namiot, wieża,
// rekwizyt i ognisko to osobny obraz z głębią = podstawa, więc bohater chowa się za nimi i wychodzi przed nie.
// Obrazy liczy kod (rysunki.ts) w pikselach generatora, NEAREST, skala 1/GEN_DOTS. Tworzone, gdy bohater jest
// blisko (WIDOK_M), sprzątane daleko. Podłoże (klepisko, ścieżki, cienie, palenisko) maluje generator kawałków.
import Phaser from 'phaser';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { GEN_DOTS } from '../map/ziemia09';
import { doCanvas } from '../gen/wspolne';
import { rysujOdcinek, rysujNamiot, rysujWieze, rysujRekwizyt, rysujOgien, rysujGlaz, rysujMartwe, rysujNadOgniem, type Rysunek } from './rysunki';
import type { Pal, Siedlisko } from './typy';

const WIDOK_M = 320, ZNIKA_M = 480;
const G = GEN_DOTS;

interface Postawione { obrazy: Phaser.GameObjects.Image[]; tekstury: string[]; ognie: Phaser.GameObjects.Image[]; nad: (Phaser.GameObjects.Image | null)[]; rodzajNad: ('gar' | 'rozen' | null)[] }

export class WidokSiedlisk {
  private postawione = new Map<string, Postawione>();
  private klatka = 0;
  private nastepnaKlatka = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    scene.events.once('shutdown', () => this.destroy());
  }

  private tekstura(klucz: string, r: Rysunek) {
    if (!this.scene.textures.exists(klucz)) {
      const t = this.scene.textures.addCanvas(klucz, doCanvas(r.o))!;
      t.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  /** Obraz w świecie: kotwica rysunku (px generatora) w punkcie mapy (x, y), głębia = podstawa. */
  private obraz(klucz: string, r: Rysunek, x: number, y: number, glebia: number) {
    this.tekstura(klucz, r);
    return this.scene.add.image(x, y, klucz).setOrigin(r.kx / r.o.w, r.ky / r.o.h).setScale(1 / G).setDepth(glebia);
  }

  private postaw(s: Siedlisko): Postawione {
    const obrazy: Phaser.GameObjects.Image[] = [];
    const tekstury: string[] = [];
    const wlasna = (klucz: string, r: Rysunek, x: number, y: number, glebia: number) => {
      tekstury.push(klucz);
      obrazy.push(this.obraz(klucz, r, x, y, glebia));
    };
    // Palisada odcinkami (do 4 pali): obraz z pali w px generatora, kotwica = lewy-górny róg w świecie.
    const odc = new Map<number, Pal[]>();
    for (const p of s.pale) {
      const l = odc.get(p.odc) ?? [];
      l.push({ ...p, x: p.x * G, y: p.y * G });
      odc.set(p.odc, l);
    }
    for (const [n, l] of odc) {
      const r = rysujOdcinek(l);
      const glebia = Math.max(...l.map((p) => p.y)) / G;
      // r.kx/r.ky = minus lewy-górny róg obrazu w px generatora świata: obraz stawiamy lewym-górnym rogiem.
      wlasna(`siedl:${s.id}:p${n}`, { ...r, kx: 0, ky: 0 }, -r.kx / G, -r.ky / G, glebia);
    }
    for (const [i, n] of s.namioty.entries()) {
      const r = rysujNamiot({ ...n, x: 0, y: 0, w: n.w * G, d: n.d * G });
      wlasna(`siedl:${s.id}:n${i}`, r, n.x, n.y, n.y + n.d / 2);
    }
    for (const w of s.wieze) obrazy.push(this.obraz('siedl:wieza', rysujWiezeRaz(), w.x, w.y, w.y + 1.9 * PX_PER_M));
    for (const q of s.rekwizyty) {
      const k = `siedl:rek:${q.rodzaj}:${q.seed % 3}`;
      obrazy.push(this.obraz(k, rysujRekwizyt(q.rodzaj, q.seed % 3), q.x, q.y, q.y));
    }
    // Rumowisko: głazy (każdy swój rysunek – różne bryły); bagno: martwe drzewa.
    for (const [i, g] of (s.glazy ?? []).entries()) wlasna(`siedl:${s.id}:g${i}`, rysujGlaz(g.r * G, g.seed), g.x, g.y, g.y + g.r * 0.5);
    for (const m of s.martwe ?? []) {
      const k = `siedl:martwe:${m.seed % 5}`;
      obrazy.push(this.obraz(k, rysujMartwe(m.seed % 5), m.x, m.y, m.y));
    }
    for (let f = 0; f < 3; f++) this.tekstura(`siedl:ogien${f}`, rysujOgien(f));
    const rg = rysujOgien(0);
    const ognie = s.ogniska.map((o) => this.obraz('siedl:ogien0', rg, o.x, o.y, o.y + 1));
    obrazy.push(...ognie);
    // Gar albo rożen nad ogniem (3 klatki: bulgotanie / obracanie pieczeni).
    const rodzajNad = s.nadOgniem ?? s.ogniska.map(() => null);
    const nad = s.ogniska.map((o, i) => {
      const w = rodzajNad[i];
      if (!w) return null;
      for (let f = 0; f < 3; f++) this.tekstura(`siedl:${w}${f}`, rysujNadOgniem(w, f));
      const im = this.obraz(`siedl:${w}0`, rysujNadOgniem(w, 0), o.x, o.y, o.y + 2);
      obrazy.push(im);
      return im;
    });
    return { obrazy, tekstury, ognie, nad, rodzajNad };
  }

  private zdejmij(id: string) {
    const p = this.postawione.get(id);
    if (!p) return;
    for (const o of p.obrazy) o.destroy();
    for (const k of p.tekstury) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.postawione.delete(id);
  }

  /** Co klatkę: stawia/sprząta siedliska wg odległości, animuje ogień, ukrywa obiekty poza ekranem. */
  update(px: number, py: number, now: number, widok: Phaser.Geom.Rectangle) {
    const blisko = WIDOK_M * PX_PER_M, daleko = ZNIKA_M * PX_PER_M;
    for (const s of this.city.siedliska) {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < blisko && !this.postawione.has(s.id)) this.postawione.set(s.id, this.postaw(s));
      else if (d > daleko && this.postawione.has(s.id)) this.zdejmij(s.id);
    }
    if (now >= this.nastepnaKlatka) {
      this.klatka = (this.klatka + 1) % 3;
      this.nastepnaKlatka = now + 140 + Math.random() * 60;
    }
    for (const p of this.postawione.values()) {
      for (const o of p.obrazy) {
        const b = o.getBounds();
        o.setVisible(b.right > widok.x && b.x < widok.right && b.bottom > widok.y && b.y < widok.bottom);
      }
      for (const [i, o] of p.ognie.entries()) {
        if (!o.visible) continue;
        o.setTexture(`siedl:ogien${(this.klatka + i) % 3}`);
        const n = p.nad[i];
        if (n) n.setTexture(`siedl:${p.rodzajNad[i]}${(this.klatka + i) % 3}`);
        // Dym z ogniska, a znad garu biała para – rzadkie kłębki unoszące się i znikające.
        if (Math.random() < 0.06) this.klab(o.x + (Math.random() - 0.5) * 3, o.y - (n ? 14 : 8), p.rodzajNad[i] === 'gar' ? 0xf2f0e8 : 0x8a8580);
      }
    }
  }

  private klab(x: number, y: number, kolor: number) {
    if (!this.scene.textures.exists('siedl:klab')) {
      const c = document.createElement('canvas');
      c.width = c.height = 8;
      const g = c.getContext('2d')!;
      g.fillStyle = '#ffffff';
      g.fillRect(2, 1, 4, 6); g.fillRect(1, 2, 6, 4);
      this.scene.textures.addCanvas('siedl:klab', c)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const k = this.scene.add.image(x, y, 'siedl:klab').setTint(kolor).setAlpha(0.55).setScale(0.35).setDepth(y + 30);
    this.scene.tweens.add({ targets: k, y: y - 14, x: x + 3 + Math.random() * 3, alpha: 0, scale: 0.8, duration: 1600 + Math.random() * 600, onComplete: () => k.destroy() });
  }

  destroy() {
    for (const id of [...this.postawione.keys()]) this.zdejmij(id);
  }
}

let wieza: Rysunek | null = null;
const rysujWiezeRaz = () => (wieza ??= rysujWieze());

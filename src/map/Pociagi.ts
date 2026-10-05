import Phaser from 'phaser';
import { dlugosc, klatkaKierunku, hash } from '../gen';
import { punkt } from './dworzec09';
import { ziemiaWTle } from './Podloze09';
import { GEN_DOTS } from './ziemia09';
import { GROUND_DEPTH, type MapRenderer } from './MapRenderer';
import type { Line, Place } from './CityMap';

// Parowe składy na stacjach kolejowych (overhaul 09, SPEC_09 punkt 7): lokomotywa, tender i 1–4 wagony stoją na
// torze przy stacji, każdy pojazd osobno obrócony wzdłuż łuku toru (klatka z kąta stycznej: lokomotywa i tender
// 16 kierunków, wagony 8). Do czasu arkuszy grafika – zaślepki z modelu 3D (src/gen/pojazdy.ts), liczone w tle.

/** Długości pojazdów w px generatora (z modeli) i odstęp między nimi. */
const DLUGOSC: Record<string, number> = { lokomotywa: 58, tender: 30, wagon_bordo: 55, wagon_zielony: 55 };
const ODSTEP = 4;
/** Komin lokomotywy w modelu (x wzdłuż, z w górę) i rzut jak w generatorze (skos 0,35, ściśnięcie 0,85). */
const KOMIN = { x: 22.5, z: 29 }, SKOS = 0.35, SCISK = 0.85;

const klatki = new Map<string, Promise<void>>();

export class Pociagi {
  constructor(private scene: Phaser.Scene, private map: MapRenderer) {}

  /** Tekstury klatki pojazdu (obraz + cień), liczone raz w tle. */
  private klatka(typ: string, kat: number): Promise<void> {
    const key = `poj-${typ}-${kat}`;
    let p = klatki.get(key);
    if (p && this.scene.textures.exists(key)) return p;
    p = ziemiaWTle().pojazd(typ, kat).then(({ obraz, cien }) => {
      if (!this.scene.textures.exists(key)) this.scene.textures.addCanvas(key, obraz)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!this.scene.textures.exists(`${key}-c`)) this.scene.textures.addCanvas(`${key}-c`, cien)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
    klatki.set(key, p);
    return p;
  }

  /** Stawia skład na torze `tor` przy stacji `p` (środek składu naprzeciw drzwi stacji). */
  postaw(p: Place, tor: { l: Line; s: number }) {
    let h = 0;
    for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
    const wagonow = 1 + (h % 4);
    const kolor = hash(h, 1, 5) < 0.5 ? 'wagon_bordo' : 'wagon_zielony';
    const typy = ['lokomotywa', 'tender', ...Array.from({ length: wagonow }, () => kolor)];
    const dl = (t: string) => DLUGOSC[t] / GEN_DOTS;
    const caly = typy.reduce((a, t) => a + dl(t), 0) + ((typy.length - 1) * ODSTEP) / GEN_DOTS;
    const L = dlugosc(tor.l.pts);
    if (L < caly + 4) return;
    // Lokomotywa z przodu; kierunek jazdy (w stronę rosnącego łuku albo odwrotnie) z ziarna stacji.
    const naprzod = hash(h, 2, 7) < 0.5 ? 1 : -1;
    const srodek = Math.max(caly / 2 + 2, Math.min(L - caly / 2 - 2, tor.s));
    let s = srodek + (naprzod * caly) / 2;
    for (const typ of typy) {
      const d = dl(typ);
      const sc = s - (naprzod * d) / 2;
      s -= naprzod * (d + ODSTEP / GEN_DOTS);
      const [ax, ay] = punkt(tor.l.pts, sc - (naprzod * d) / 2), [bx, by] = punkt(tor.l.pts, sc + (naprzod * d) / 2);
      const [x, y] = punkt(tor.l.pts, sc);
      const kat = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      const kier = typ.startsWith('wagon') ? klatkaKierunku(kat, 8) : klatkaKierunku(kat, 16);
      const katKlatki = kier * 22.5;
      void this.klatka(typ, katKlatki).then(() => this.pokaz(typ, katKlatki, x, y));
    }
  }

  private pokaz(typ: string, kat: number, x: number, y: number) {
    if (!this.scene.sys.isActive()) return;
    const key = `poj-${typ}-${kat}`;
    this.scene.add.image(x, y, `${key}-c`).setOrigin(0.5, 0.58).setScale(1 / GEN_DOTS).setAlpha(0.3).setDepth(GROUND_DEPTH + 5);
    this.scene.add.image(x, y, key).setOrigin(0.5, 0.58).setScale(1 / GEN_DOTS).setDepth(y + 2);
    if (typ !== 'lokomotywa') return;
    // Para z komina: punkt komina w rzucie gry.
    const r = (kat * Math.PI) / 180, zp = KOMIN.z * SCISK;
    const gx = x * GEN_DOTS + KOMIN.x * Math.cos(r) - SKOS * zp, gy = y * GEN_DOTS + KOMIN.x * Math.sin(r) - zp;
    this.map.korony.steam(gx, gy, y + 3);
  }
}

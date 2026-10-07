import Phaser from 'phaser';
import { dlugosc, hash } from '../gen';
import { punkt } from './dworzec09';
import { ziemiaWTle } from './Podloze09';
import { GEN_DOTS } from './ziemia09';
import { GROUND_DEPTH, type MapRenderer } from './MapRenderer';
import { PX_PER_M, type Line, type Place } from './CityMap';

// Parowe składy na stacjach kolejowych (overhaul 09, SPEC_09 punkt 7): lokomotywa, tender i 1–4 wagony stoją na
// torze przy stacji, każdy pojazd osobno obrócony wzdłuż łuku toru (klatka z kąta stycznej: lokomotywa i tender
// 16 kierunków, wagony 8). Do czasu arkuszy grafika – zaślepki z modelu 3D (src/gen/pojazdy.ts), liczone w tle.

/** Długości pojazdów w px generatora (z modeli) i odstęp między nimi. */
const DLUGOSC: Record<string, number> = { lokomotywa: 58, tender: 30, wagon_bordo: 55, wagon_zielony: 55 };
const ODSTEP = 4;
/** Najwięcej, o ile tor pod pojazdem może odchodzić od jego prostej sylwetki (px mapy). */
const MAKS_ODSTEP = 1.6;
/** Komin lokomotywy w modelu (x wzdłuż, z w górę) i rzut jak w generatorze (skos 0,35, ściśnięcie 0,85). */
const KOMIN = { x: 22.5, z: 29 }, SKOS = 0.35, SCISK = 0.85;

const klatki = new Map<string, Promise<void>>();

export class Pociagi {
  /** Every shown vehicle with its station, so a swing or click anywhere on the train finds the conductor. */
  private pojazdy: { p: Place; img: Phaser.GameObjects.Image }[] = [];

  constructor(private scene: Phaser.Scene, private map: MapRenderer) {}

  /**
   * The station whose train has a painted pixel within `margin` map px of (x, y) (owner 7.10.2026: „kliknąć
   * gdziekolwiek w wagon/lokomotywę”): the frames are drawn at an angle, so the test reads the picture's alpha.
   */
  /** Has this station a steam train (then its coachman is a conductor)? */
  ma(p: Place) {
    return this.pojazdy.some((v) => v.p.id === p.id);
  }

  stacjaPrzy(x: number, y: number, margin = 4): Place | null {
    const tex = this.scene.textures;
    for (const { p, img } of this.pojazdy) {
      if (!img.active) continue;
      const w = img.width, h = img.height, k = 1 / img.scaleX;
      for (let dy = -margin; dy <= margin; dy += 2) for (let dx = -margin; dx <= margin; dx += 2) {
        const lx = (x + dx - img.x) * k + img.originX * w, ly = (y + dy - img.y) * k + img.originY * h;
        if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
        if ((tex.getPixelAlpha(Math.floor(lx), Math.floor(ly), img.texture.key) ?? 0) > 100) return p;
      }
    }
    return null;
  }

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
    const kolor = hash(h, 1, 5) < 0.5 ? 'wagon_bordo' : 'wagon_zielony';
    const L = dlugosc(tor.l.pts);
    // Lokomotywa z przodu; kierunek jazdy (w stronę rosnącego łuku albo odwrotnie) z ziarna stacji.
    const naprzod = hash(h, 2, 7) < 0.5 ? 1 : -1;
    // Najpierw pełny skład (1–4 wagony z ziarna) naprzeciw drzwi, potem przesunięty po torze o kilkanaście metrów;
    // gdy tor jest zbyt kręty (właściciel 5.10.2026: „zbyt długie, niedopasowane do torów”), coraz mniej wagonów, aż do jednego.
    const PRZESUN = [0, 10, -10, 20, -20, 30, -30].map((m) => m * PX_PER_M);
    for (let wagonow = 1 + (h % 4); wagonow >= 1; wagonow--) {
      const typy = ['lokomotywa', 'tender', ...Array.from({ length: wagonow }, () => kolor)];
      for (const dx of PRZESUN) {
        const uklad = this.uloz(typy, tor.l.pts, L, tor.s + dx, naprzod);
        if (uklad && (uklad.pasuje || (wagonow === 1 && dx === PRZESUN[PRZESUN.length - 1]))) {
          for (const v of uklad.pojazdy) void this.klatka(v.typ, v.kat).then(() => this.pokaz(p, v.typ, v.kat, v.x, v.y));
          return;
        }
      }
    }
  }

  /**
   * Układa skład wzdłuż toru wokół łuku `s`: każdy pojazd w środku swojego odcinka, obrócony wzdłuż cięciwy.
   * `pasuje` = żaden pojazd nie odstaje od toru o więcej niż MAKS_ODSTEP px mapy (tor prawie prosty pod nim).
   */
  private uloz(typy: string[], pts: number[], L: number, s0: number, naprzod: number) {
    const dl = (t: string) => DLUGOSC[t] / GEN_DOTS;
    const caly = typy.reduce((a, t) => a + dl(t), 0) + ((typy.length - 1) * ODSTEP) / GEN_DOTS;
    if (L < caly + 4) return null;
    const srodek = Math.max(caly / 2 + 2, Math.min(L - caly / 2 - 2, s0));
    let s = srodek + (naprzod * caly) / 2;
    let pasuje = true;
    const pojazdy: { typ: string; kat: number; x: number; y: number }[] = [];
    for (const typ of typy) {
      const d = dl(typ);
      const sc = s - (naprzod * d) / 2;
      s -= naprzod * (d + ODSTEP / GEN_DOTS);
      const [ax, ay] = punkt(pts, sc - (naprzod * d) / 2), [bx, by] = punkt(pts, sc + (naprzod * d) / 2);
      const [x, y] = punkt(pts, sc);
      // Jak daleko tor pod pojazdem odchodzi od jego prostej sylwetki.
      const cl = Math.hypot(bx - ax, by - ay) || 1;
      for (let t = -d / 2; t <= d / 2; t += 2) {
        const [qx, qy] = punkt(pts, sc + t);
        if (Math.abs((bx - ax) * (ay - qy) - (ax - qx) * (by - ay)) / cl > MAKS_ODSTEP) pasuje = false;
      }
      const kat = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      // Zaślepki z modelu 3D można narysować pod każdym kątem: 64 kierunki (wagony symetryczne – połowa).
      const KROK = 360 / 64;
      const k = typ.startsWith('wagon') ? (Math.round((((kat % 180) + 180) % 180) / KROK) * KROK) % 180 : (Math.round((((kat % 360) + 360) % 360) / KROK) * KROK) % 360;
      pojazdy.push({ typ, kat: k, x, y });
    }
    return { pasuje, pojazdy };
  }


  private pokaz(p: Place, typ: string, kat: number, x: number, y: number) {
    if (!this.scene.sys.isActive()) return;
    const key = `poj-${typ}-${kat}`;
    this.scene.add.image(x, y, `${key}-c`).setOrigin(0.5, 0.58).setScale(1 / GEN_DOTS).setAlpha(0.3).setDepth(GROUND_DEPTH + 5);
    const img = this.scene.add.image(x, y, key).setOrigin(0.5, 0.58).setScale(1 / GEN_DOTS).setDepth(y + 2);
    this.pojazdy.push({ p, img });
    if (typ !== 'lokomotywa') return;
    // Para z komina: punkt komina w rzucie gry.
    const r = (kat * Math.PI) / 180, zp = KOMIN.z * SCISK;
    const gx = x * GEN_DOTS + KOMIN.x * Math.cos(r) - SKOS * zp, gy = y * GEN_DOTS + KOMIN.x * Math.sin(r) - zp;
    this.map.korony.steam(gx, gy, y + 3);
  }
}

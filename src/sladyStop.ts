// Footprints and grass under the boots (owner, 25 Nov 2026: „ślady stóp po błocie, które znikają ~50 m za nim; czy
// trawa pod nogami może się ruszać”). Called on every footfall of the hero (LudzikChibi/Ludzik3D onKrok):
//  – on mud (and on sand, a dirt path in the rain, any soft ground under snow) a pair of little prints stays behind,
//    fading as the hero walks away and gone SLADY.znikaM metres behind him (or after zyjeMs when he stands);
//  – on grass a few blades are pressed down outwards and spring back up with a little wobble, then melt into the
//    painted grass again.
// Everything is drawn in world pixels (½ map px) into three Graphics (prints on the ground; blades behind and in front
// of the hero), redrawn only while something is alive. Nothing here touches movement or collisions.
import Phaser from 'phaser';
import type { Surface } from './map/CityMap';
import { PX_PER_M } from './map/CityMap';
import { SKALA_POSTACI } from './skala';
import { weather, isWet } from './weather';

export const SLADY = {
  /** Prints vanish this far behind the hero (m); they start fading at znikaOdM. */
  znikaM: 50,
  znikaOdM: 30,
  /** …or this long after being made, when the hero stays around (ms). */
  zyjeMs: 9000,
  /** Prints kept at once (oldest go first). */
  maks: 60,
  /** Print colour and strength per ground. */
  kolor: { bloto: 0x2a1e12, piasek: 0x8a6c3e, sciezka: 0x4a3826, snieg: 0x7d93ab } as Record<string, number>,
  alfa: { bloto: 0.75, piasek: 0.6, sciezka: 0.6, snieg: 0.65 } as Record<string, number>,
  /** The pushed-up rim at the toe (lighter). */
  rant: { bloto: 0x7a6348, piasek: 0xf2dfae, sciezka: 0x8a7458, snieg: 0xf4f8ff } as Record<string, number>,
  /** Grass: blades per step, their life (ms), length (map px). */
  zdzbla: 7,
  zdzbloMs: 800,
  zdzbloDl: [2.2, 3.6] as [number, number],
  /** A blade: dark foot, lighter tip, so its bending reads against the painted grass. */
  kolorTrawy: [[0x2f5426, 0x8fb35c], [0x3f6a2e, 0xa4c264], [0x2f5426, 0x93b75a], [0x3f6a2e, 0xb8d070]] as [number, number][],
};

const PIKSEL = 0.5; // one world pixel in map px
const DEPTH_ZIEMIA = -1e7 + 0.5; // above the map, under creature shadows (-1e7 + 1)

interface Odcisk { x: number; y: number; kat: number; od: number; kolor: number; rant: number; alfa: number }
interface Zdzblo { x: number; y: number; kat: number; dl: number; od: number; kolor: [number, number]; faza: number }

/** What ground leaves a print right now (null = none). */
export function sladNa(pod: Surface): string | null {
  if (pod === 'bloto') return 'bloto';
  if (pod === 'brod' || pod === 'asfalt') return null; // water closes over a print; streets are swept
  if (weather.snowLevel > 0) return 'snieg';
  if (pod === 'piasek') return 'piasek';
  if (pod === 'sciezka' && isWet()) return 'sciezka';
  return null;
}

export class SladyStop {
  private odciski: Odcisk[] = [];
  private zdzbla: Zdzblo[] = [];
  private ziemia: Phaser.GameObjects.Graphics;
  private tyl: Phaser.GameObjects.Graphics;
  private przod: Phaser.GameObjects.Graphics;
  private lewa = false;
  private czysto = true;
  private zniszczony = false;
  private readonly cichy: boolean;

  constructor(private scene: Phaser.Scene) {
    this.ziemia = scene.add.graphics().setDepth(DEPTH_ZIEMIA);
    this.tyl = scene.add.graphics();
    this.przod = scene.add.graphics();
    this.cichy = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.events.once('shutdown', () => this.destroy());
  }

  /** One footfall at the hero's position, walking along (vx, vy). */
  krok(x: number, y: number, vx: number, vy: number, pod: Surface) {
    if (this.zniszczony) return;
    const now = this.scene.time.now;
    const kat = Math.atan2(vy, vx);
    this.lewa = !this.lewa;
    const stopy = y + 8 * SKALA_POSTACI;
    // The foot sits a little to its side of the walking line.
    const bok = this.lewa ? -1 : 1, nx = -Math.sin(kat), ny = Math.cos(kat);
    const fx = x + nx * bok * 1.1, fy = stopy + ny * bok * 0.8;
    const s = sladNa(pod);
    if (s) {
      this.odciski.push({ x: fx, y: fy, kat, od: now, kolor: SLADY.kolor[s], rant: SLADY.rant[s], alfa: SLADY.alfa[s] });
      if (this.odciski.length > SLADY.maks) this.odciski.splice(0, this.odciski.length - SLADY.maks);
    }
    if (pod === 'trawa' && !this.cichy) {
      for (let i = 0; i < SLADY.zdzbla; i++) {
        // Around the foot, each blade pushed away from it.
        const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 1.6;
        this.zdzbla.push({
          x: fx + Math.cos(a) * r, y: fy + Math.sin(a) * r * 0.6, kat: Math.cos(a) >= 0 ? 1 : -1,
          dl: SLADY.zdzbloDl[0] + Math.random() * (SLADY.zdzbloDl[1] - SLADY.zdzbloDl[0]),
          od: now + Math.random() * 40, kolor: SLADY.kolorTrawy[(Math.random() * SLADY.kolorTrawy.length) | 0], faza: Math.random() * 0.6,
        });
      }
      if (this.zdzbla.length > 80) this.zdzbla.splice(0, this.zdzbla.length - 80);
    }
  }

  update(hx: number, hy: number, heroDepth: number) {
    if (this.zniszczony) return;
    const now = this.scene.time.now;
    const daleko = SLADY.znikaM * PX_PER_M, odM = SLADY.znikaOdM * PX_PER_M;
    this.odciski = this.odciski.filter(o => now - o.od < SLADY.zyjeMs && Math.hypot(o.x - hx, o.y - hy) < daleko);
    this.zdzbla = this.zdzbla.filter(z => now - z.od < SLADY.zdzbloMs);
    if (!this.odciski.length && !this.zdzbla.length) {
      if (!this.czysto) { this.ziemia.clear(); this.tyl.clear(); this.przod.clear(); this.czysto = true; }
      return;
    }
    this.czysto = false;
    const g = this.ziemia;
    g.clear();
    for (const o of this.odciski) {
      const d = Math.hypot(o.x - hx, o.y - hy);
      const wiek = (now - o.od) / SLADY.zyjeMs;
      const a = o.alfa * Math.min(1, (daleko - d) / (daleko - odM)) * Math.min(1, (1 - wiek) / 0.25);
      if (a <= 0.01) continue;
      this.odcisk(g, o, Math.min(o.alfa, a));
    }
    // Blades: behind the hero's feet (north of them) under him, the others over him.
    const stopy = hy + 8 * SKALA_POSTACI;
    this.tyl.clear().setDepth(heroDepth - 0.1);
    this.przod.clear().setDepth(heroDepth + 0.1);
    for (const z of this.zdzbla) {
      const t = (now - z.od) / SLADY.zdzbloMs;
      if (t < 0) continue;
      this.zdzblo(z.y < stopy ? this.tyl : this.przod, z, t);
    }
  }

  /** A boot print in whole world pixels, turned along the walk: a sole 4 px long and 2 wide, a gap, a heel, and a
   * lighter rim of pushed-up ground in front of the toe. */
  private odcisk(g: Phaser.GameObjects.Graphics, o: Odcisk, a: number) {
    const c = Math.cos(o.kat), s = Math.sin(o.kat);
    const zajete = new Set<string>();
    const kropka = (u: number, v: number) => {
      const px = Math.round((o.x + c * u - s * v) / PIKSEL) * PIKSEL, py = Math.round((o.y + s * u + c * v) / PIKSEL) * PIKSEL;
      const k = px + ',' + py;
      if (zajete.has(k)) return;
      zajete.add(k);
      g.fillRect(px, py, PIKSEL, PIKSEL);
    };
    g.fillStyle(o.kolor, a);
    for (const u of [0.5, 1, 1.5, 2]) for (const v of [-0.25, 0.25]) kropka(u, v);
    for (const v of [-0.25, 0.25]) kropka(-0.5, v);
    g.fillStyle(o.rant, a * 0.7);
    for (const v of [-0.25, 0.25]) kropka(2.5, v);
  }

  /** One blade: flattened outwards at the step, rising back with a damped wobble, then fading into the painted grass. */
  private zdzblo(g: Phaser.GameObjects.Graphics, z: Zdzblo, t: number) {
    const ugiecie = 1.25 * Math.exp(-4.2 * t) * Math.cos(9 * t + z.faza) + 0.08 * Math.sin(14 * t + z.faza * 5) * (1 - t);
    const kat = -Math.PI / 2 + z.kat * ugiecie; // upright = straight up the screen
    const a = t < 0.08 ? t / 0.08 : t > 0.6 ? (1 - t) / 0.4 : 1;
    const n = Math.max(2, Math.round(z.dl / PIKSEL));
    let px = NaN, py = NaN;
    for (let i = 0; i < n; i++) {
      // A blade curves more towards its tip.
      const u = i / (n - 1), k = -Math.PI / 2 + (kat + Math.PI / 2) * (0.4 + 0.6 * u);
      const x = Math.round((z.x + Math.cos(k) * z.dl * u) / PIKSEL) * PIKSEL;
      const y = Math.round((z.y + Math.sin(k) * z.dl * u) / PIKSEL) * PIKSEL;
      if (x === px && y === py) continue;
      px = x; py = y;
      g.fillStyle(z.kolor[u < 0.5 ? 0 : 1], a);
      g.fillRect(x, y, PIKSEL, PIKSEL);
    }
  }

  destroy() {
    if (this.zniszczony) return;
    this.zniszczony = true;
    this.ziemia.destroy(); this.tyl.destroy(); this.przod.destroy();
    this.odciski = []; this.zdzbla = [];
  }
}

import Phaser from 'phaser';
import { HERO_DIRS, makeLookTexture, redOutline } from '../art';
import { PX_PER_M, type CityMap, type Line } from '../map/CityMap';
import { MIESZKANCY } from '../content/mieszkancy';
import { rng } from '../rng';
import { Walker } from './FixedNpcs';

// People strolling along the cobbled (car) streets: 2 per 200 m. Most only
// say hello; some challenge the hero to a duel or accept one (GameScene).
// They are made per 1 km square near the hero, always the same ones.

export type FolkRole = 'wita' | 'wyzywa' | 'przyjmuje';

export interface Folk {
  id: string;
  role: FolkRole;
  name: string;
  /** Picture: `folk<n>`. */
  tex: string;
  walker: Walker;
  sprite?: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  /** Beaten in a duel this session (then only says hello). */
  beaten?: boolean;
  /** In a duel right now (the fighter stands in for it). */
  away?: boolean;
  /** Off on an errand: a street route, its running lengths and how far along. */
  route?: number[];
  cum?: number[];
  along?: number;
  /** Arrived and went in (gone for this session). */
  gone?: boolean;
}

/** Night by the phone's clock (fewer people, more monsters). */
export function isNight(d = new Date()) {
  const h = d.getHours();
  const n = MIESZKANCY.noc;
  return n.od > n.do ? h >= n.od || h < n.do : h >= n.od && h < n.do;
}

const PAVED = new Set(['major', 'medium', 'minor']);
const LOOKS = 10;
const CELL = 1000 * PX_PER_M;
const NEAR = 460;
const SPEED = 14; // px/s, an easy stroll

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function lengthM(l: Line) {
  let d = 0;
  for (let i = 2; i < l.pts.length; i += 2) d += Math.hypot(l.pts[i] - l.pts[i - 2], l.pts[i + 1] - l.pts[i - 1]);
  return d / PX_PER_M;
}

export class Townsfolk {
  private cells = new Map<string, Folk[]>();
  private active = new Set<Folk>();
  private next = 0;
  /** Where the story's dragon is: nobody goes near it. */
  fear: { x: number; y: number } | null = null;

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    // A few looks to share (drawn like the hero).
    const r = rng(12345);
    for (let i = 0; i < LOOKS; i++) {
      const key = `folk${i}`;
      const look = {
        head: Math.floor(r() * 3), build: Math.floor(r() * 4), outfit: Math.floor(r() * 6), hair: Math.floor(r() * 6),
        skin: Math.floor(r() * 6), hairColor: Math.floor(r() * 8), top: Math.floor(r() * 10), bottom: Math.floor(r() * 10),
      };
      // A red-outlined copy for when they turn into an opponent in a duel.
      const red = `${key}-red`;
      const had = scene.textures.exists(red);
      makeLookTexture(scene, key, look);
      makeLookTexture(scene, red, look);
      if (!had) redOutline(scene, red);
      for (const k of [key, red]) {
        for (const dir of HERO_DIRS) {
          const anim = `${k}-walk-${dir}`;
          if (!scene.anims.exists(anim)) scene.anims.create({ key: anim, frames: [1, 0, 2, 0].map((f) => ({ key: k, frame: `${dir}-${f}` })), frameRate: k === key ? 6 : 10, repeat: -1 });
        }
      }
    }
  }

  /** The people of one 1 km square: along paved streets that start in it. */
  private folkOf(cx: number, cy: number): Folk[] {
    const key = `${cx}:${cy}`;
    let list = this.cells.get(key);
    if (list) return list;
    list = [];
    const box = { x0: cx * CELL, y0: cy * CELL, x1: (cx + 1) * CELL, y1: (cy + 1) * CELL };
    // Not loaded yet: nobody now, and don't remember it.
    if (!this.city.ready(box)) return [];
    const r = rng(hash(`${this.city.id}:folk:${key}`));
    // Busy centre or quiet housing estate: by how many places (shops, offices,
    // churches…) the square has. At night even fewer.
    const places = this.city.places.filter((p) => p.door.x >= box.x0 && p.door.x < box.x1 && p.door.y >= box.y0 && p.door.y < box.y1).length;
    const district = MIESZKANCY.dzielnice.find((d) => places >= d.miejsc)?.mnoznik ?? 0.25;
    const share = district * (isNight() ? MIESZKANCY.noc.ludzi : 1);
    for (const l of this.city.query(box).lines) {
      if (!PAVED.has(l.kind) || l.pts.length < 4) continue;
      if (l.pts[0] < box.x0 || l.pts[0] >= box.x1 || l.pts[1] < box.y0 || l.pts[1] >= box.y1) continue;
      const want = (lengthM(l) / 200) * MIESZKANCY.na200m * share;
      const n = Math.floor(want) + (r() < want % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const walker = new Walker([l.pts], SPEED * (0.7 + r() * 0.6), r);
        const roll = r();
        const role: FolkRole = roll < MIESZKANCY.tylkoWita ? 'wita' : roll < MIESZKANCY.tylkoWita + MIESZKANCY.wyzywa ? 'wyzywa' : 'przyjmuje';
        list.push({
          id: `${key}:${list.length}`, role, walker, x: walker.x, y: walker.y,
          name: MIESZKANCY.imiona[Math.floor(r() * MIESZKANCY.imiona.length)],
          tex: `folk${Math.floor(r() * LOOKS)}`,
        });
      }
    }
    this.cells.set(key, list);
    return list;
  }

  update(dt: number, px: number, py: number, now: number, visible: (x: number, y: number) => boolean) {
    if (now >= this.next) {
      this.next = now + 500;
      for (const f of [...this.active]) {
        if (Math.abs(f.x - px) < NEAR * 1.5 && Math.abs(f.y - py) < NEAR * 1.5) continue;
        f.sprite?.destroy();
        f.sprite = undefined;
        this.active.delete(f);
      }
      const c0x = Math.floor((px - NEAR) / CELL), c1x = Math.floor((px + NEAR) / CELL);
      const c0y = Math.floor((py - NEAR) / CELL), c1y = Math.floor((py + NEAR) / CELL);
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          for (const f of this.folkOf(cx, cy)) {
            if (this.active.has(f) || Math.abs(f.x - px) > NEAR || Math.abs(f.y - py) > NEAR) continue;
            f.sprite = this.scene.add.sprite(f.x, f.y, f.tex, 'down-0').setOrigin(0.5, 0.6);
            this.active.add(f);
          }
        }
      }
    }
    const fearR = MIESZKANCY.strachPrzedSmokiem * PX_PER_M;
    for (const f of this.active) {
      if (f.away || f.gone || !f.sprite) continue;
      const ox = f.x, oy = f.y;
      if (f.route && f.cum) {
        // On an errand: along the streets to the place, then in through the door.
        f.along = (f.along ?? 0) + SPEED * 1.4 * dt;
        const total = f.cum[f.cum.length - 1];
        let i = 1;
        while (i < f.cum.length - 1 && f.cum[i] < f.along) i++;
        const t = Math.max(0, Math.min(1, (f.along - f.cum[i - 1]) / ((f.cum[i] - f.cum[i - 1]) || 1)));
        f.x = f.route[(i - 1) * 2] + (f.route[i * 2] - f.route[(i - 1) * 2]) * t;
        f.y = f.route[(i - 1) * 2 + 1] + (f.route[i * 2 + 1] - f.route[(i - 1) * 2 + 1]) * t;
        if (f.along >= total) {
          f.gone = true;
          const s = f.sprite;
          this.scene.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.setVisible(false) });
          continue;
        }
      } else {
        f.walker.step(dt);
        f.x = f.walker.x;
        f.y = f.walker.y;
      }
      const scared = !!this.fear && Math.hypot(f.x - this.fear.x, f.y - this.fear.y) < fearR;
      const dx = f.x - ox, dy = f.y - oy;
      const s = f.sprite;
      s.setPosition(f.x, f.y).setDepth(f.y).setVisible(!scared && visible(f.x, f.y));
      if (Math.abs(dx) + Math.abs(dy) < 0.01) {
        s.anims.stop();
        s.setFrame('down-0');
      } else {
        const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
        s.setFlipX(dir === 'side' && dx > 0);
        s.anims.play(`${f.tex}-walk-${dir}`, true);
      }
    }
  }

  /** Someone to talk to near (x, y). */
  at(x: number, y: number, r: number): Folk | null {
    for (const f of this.active) if (!f.away && !f.gone && !f.route && f.sprite?.visible && Math.abs(f.x - x) < r && Math.abs(f.y - y) < r + 4) return f;
    return null;
  }

  /** Off to a place along the streets (after telling the hero about it). */
  sendTo(f: Folk, route: number[]) {
    const cum = [0];
    for (let i = 2; i < route.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(route[i] - route[i - 2], route[i + 1] - route[i - 1]));
    f.route = route;
    f.cum = cum;
    f.along = 0;
  }

  /** Steps out for a duel (a fighter takes its place) and back after it. */
  away(f: Folk, on: boolean, at?: { x: number; y: number }) {
    f.away = on;
    f.sprite?.setVisible(!on);
    if (!on && at) {
      // Back on its street, next to where the duel ended.
      f.sprite?.setPosition(f.x, f.y);
    }
  }
}

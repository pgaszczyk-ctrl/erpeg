import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, pointInRings, type CityMap, type Area, type Line } from '../map/CityMap';
import { DRZEWA, type Owoc } from '../content/sklepy';
import type { RodzajWroga } from '../content/fabula';
import { rng } from '../rng';

// Things that fill the city around the hero as they walk: fruit trees on
// green areas and enemies around narrow streets. Both are created only near
// the hero and removed again far away.

const FRUIT_AREAS: Record<string, Owoc[]> = {
  allotments: ['jablko', 'sliwka', 'winogrono'],
  park: ['jablko', 'sliwka'],
  grass: ['jablko', 'sliwka', 'winogrono'],
  farmland: ['jablko', 'sliwka'],
};
const TREE_TEX: Record<Owoc, string> = { jablko: TEX.treeApple, sliwka: TEX.treePlum, winogrono: TEX.vine };
const NEAR = 520; // px: create things closer than this
const FAR = 900; // px: remove things farther than this

export interface FruitTree {
  id: string;
  x: number;
  y: number;
  fruit: Owoc;
  sprite?: Phaser.GameObjects.Image;
  left: number;
}

function ringsArea(r: number[]) {
  let a = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) a += (r[j] + r[i]) * (r[j + 1] - r[i + 1]);
  return Math.abs(a / 2);
}

export class Orchards {
  private generated = new Map<Area, FruitTree[]>();
  private active = new Set<FruitTree>();
  private next = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap) {}

  /** Trees on one green area, always in the same places. */
  private treesOf(a: Area, index: number): FruitTree[] {
    let list = this.generated.get(a);
    if (list) return list;
    list = [];
    const kinds = FRUIT_AREAS[a.kind];
    const m2 = ringsArea(a.rings[0]) / (PX_PER_M * PX_PER_M);
    if (kinds && m2 >= DRZEWA.minimalnyObszarM2) {
      const n = Math.min(DRZEWA.maksNaObszar, Math.round((m2 / 1000) * DRZEWA.na1000m2));
      const r = rng(index * 7919 + 17);
      for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
        const x = a.x0 + r() * (a.x1 - a.x0);
        const y = a.y0 + r() * (a.y1 - a.y0);
        const fruit = kinds[Math.floor(r() * kinds.length)];
        const hits = 2 + Math.floor(r() * 4);
        if (!pointInRings(a.rings, x, y) || !this.city.isFree(x, y, 6, 6) || this.city.roadAt(x, y)) continue;
        if (list.some((t) => Math.hypot(t.x - x, t.y - y) < 14)) continue;
        list.push({ id: `${index}:${i}`, x, y, fruit, left: hits });
        i++;
      }
    }
    this.generated.set(a, list);
    return list;
  }

  update(px: number, py: number, now: number) {
    if (now < this.next) return;
    this.next = now + 500;
    for (const t of [...this.active]) {
      if (Math.hypot(t.x - px, t.y - py) > FAR) {
        t.sprite?.destroy();
        t.sprite = undefined;
        this.active.delete(t);
      }
    }
    const { areas } = this.city.query({ x0: px - NEAR, y0: py - NEAR, x1: px + NEAR, y1: py + NEAR });
    for (const a of areas) {
      if (!FRUIT_AREAS[a.kind]) continue;
      for (const t of this.treesOf(a, this.city.areas.indexOf(a))) {
        if (t.sprite || Math.hypot(t.x - px, t.y - py) > NEAR) continue;
        t.sprite = this.scene.add
          .image(t.x, t.y, TREE_TEX[t.fruit], t.left > 0 ? 'full' : 'bare')
          .setOrigin(0.5, 0.92)
          .setDepth(t.y);
        this.active.add(t);
      }
    }
  }

  /** Fruit trees near (x, y), with the width of their crown in px (sprites not needed). */
  treesNear(x: number, y: number, r: number) {
    const out: { x: number; y: number; w: number }[] = [];
    for (const a of this.city.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }).areas) {
      if (!FRUIT_AREAS[a.kind]) continue;
      for (const t of this.treesOf(a, this.city.areas.indexOf(a))) {
        if (Math.hypot(t.x - x, t.y - y) <= r) out.push({ x: t.x, y: t.y, w: this.scene.textures.getFrame(TREE_TEX[t.fruit], 'full').width });
      }
    }
    return out;
  }

  /** Is a point inside a tree trunk? (for collisions) */
  blocked(x: number, y: number) {
    for (const t of this.active) if (Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 2.5) return true;
    return false;
  }

  /** The nearest tree a sword swing at (x, y) hits, if any. */
  hitAt(x: number, y: number, reach: number): FruitTree | null {
    let best: FruitTree | null = null;
    let bd = reach;
    for (const t of this.active) {
      const d = Math.hypot(t.x - x, t.y - 6 - y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  /** Shakes the tree and takes one fruit off it; false when it's bare. */
  shake(t: FruitTree): boolean {
    if (t.sprite) {
      this.scene.tweens.add({ targets: t.sprite, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 1, onComplete: () => t.sprite?.setAngle(0) });
    }
    if (t.left <= 0) return false;
    t.left--;
    if (t.left === 0) t.sprite?.setFrame('bare');
    return true;
  }
}

// ---------------------------------------------------------------- street enemies

const NARROW = new Set(['service', 'path', 'steps', 'track']);
const KM = 1000 * PX_PER_M;

export interface StreetSpawn {
  x: number;
  y: number;
  kind: RodzajWroga;
}

/**
 * Decides where enemies live: per 1×1 km square, 0–20 of them depending on
 * how many narrow streets and paths it has, in small groups.
 */
export class StreetEnemies {
  private spawned = new Map<string, unknown[]>();
  private next = 0;

  constructor(
    private city: CityMap,
    private spawn: (s: StreetSpawn, cell: string) => unknown,
    private despawn: (e: unknown) => boolean,
  ) {}

  private cellPlan(cx: number, cy: number): StreetSpawn[] {
    const box = { x0: cx * KM, y0: cy * KM, x1: (cx + 1) * KM, y1: (cy + 1) * KM };
    const lines = this.city.query(box).lines.filter((l) => NARROW.has(l.kind));
    const len = (l: Line) => {
      let d = 0;
      for (let i = 2; i < l.pts.length; i += 2) d += Math.hypot(l.pts[i] - l.pts[i - 2], l.pts[i + 1] - l.pts[i - 1]);
      return d;
    };
    const lengths = lines.map(len);
    const total = lengths.reduce((a, b) => a + b, 0) / PX_PER_M;
    const count = Math.min(20, Math.round(total / 350));
    const out: StreetSpawn[] = [];
    for (let tries = 0; out.length < count && tries < 200; tries++) {
      // A random spot on a narrow line (longer lines more likely)...
      let pick = Math.random() * lengths.reduce((a, b) => a + b, 0);
      let li = 0;
      while (li < lines.length - 1 && pick > lengths[li]) pick -= lengths[li++];
      const l = lines[li];
      if (!l) break;
      const seg = Math.floor(Math.random() * (l.pts.length / 2 - 1)) * 2;
      const t = Math.random();
      const x = l.pts[seg] + (l.pts[seg + 2] - l.pts[seg]) * t;
      const y = l.pts[seg + 1] + (l.pts[seg + 3] - l.pts[seg + 1]) * t;
      if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1 || !this.city.isFree(x, y, 4, 4)) continue;
      // ...with a small group: when you meet one, another follows.
      const group = Math.min(count - out.length, 1 + Math.floor(Math.random() * 3));
      const kind: RodzajWroga = Math.random() < 0.1 ? 'bandyta' : 'glut';
      for (let g = 0; g < group; g++) out.push({ x: x + (g ? (Math.random() - 0.5) * 16 : 0), y: y + (g ? (Math.random() - 0.5) * 16 : 0), kind });
    }
    return out;
  }

  update(px: number, py: number, now: number) {
    if (now < this.next) return;
    this.next = now + 1000;
    const pcx = Math.floor(px / KM);
    const pcy = Math.floor(py / KM);
    for (const [key, list] of this.spawned) {
      const [cx, cy] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) <= 2 && Math.abs(cy - pcy) <= 2) continue;
      // Far away: let them go (unless they are chasing the hero).
      const kept = list.filter((e) => !this.despawn(e));
      if (kept.length) this.spawned.set(key, kept);
      else this.spawned.delete(key);
    }
    for (let cx = pcx - 1; cx <= pcx + 1; cx++) {
      for (let cy = pcy - 1; cy <= pcy + 1; cy++) {
        const key = `${cx},${cy}`;
        if (this.spawned.has(key)) continue;
        this.spawned.set(key, this.cellPlan(cx, cy).map((s) => this.spawn(s, key)));
      }
    }
  }
}

// ---------------------------------------------------------------- training grounds

export type StationKind = 'miecz' | 'luk' | 'magia';
const STATION_TEX: Record<StationKind, string> = { miecz: TEX.dummy, luk: TEX.target, magia: TEX.crystal };

export interface Station {
  kind: StationKind;
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Image;
}

/** On sports pitches: a dummy (sword), a target (bow) and a crystal (magic). */
export class Training {
  private generated = new Map<Area, Station[]>();
  private active = new Set<Station>();
  private next = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap) {}

  private stationsOf(a: Area): Station[] {
    let list = this.generated.get(a);
    if (list) return list;
    list = [];
    const m2 = ringsArea(a.rings[0]) / (PX_PER_M * PX_PER_M);
    if (m2 >= 300) {
      // Centre of the pitch, nudged until the three stations stand free.
      const cx = (a.x0 + a.x1) / 2;
      const cy = (a.y0 + a.y1) / 2;
      const kinds: StationKind[] = ['miecz', 'luk', 'magia'];
      for (let tries = 0; tries < 30 && !list.length; tries++) {
        const ox = cx + (tries ? (Math.sin(tries * 7.1) * (a.x1 - a.x0)) / 3 : 0);
        const oy = cy + (tries ? (Math.cos(tries * 3.7) * (a.y1 - a.y0)) / 3 : 0);
        const spots = kinds.map((k, i) => ({ kind: k, x: ox + (i - 1) * 18, y: oy }));
        if (spots.every((p) => pointInRings(a.rings, p.x, p.y) && this.city.isFree(p.x, p.y, 5, 5))) list = spots;
      }
    }
    this.generated.set(a, list);
    return list;
  }

  update(px: number, py: number, now: number) {
    if (now < this.next) return;
    this.next = now + 600;
    for (const s of [...this.active]) {
      if (Math.hypot(s.x - px, s.y - py) > FAR) {
        s.sprite?.destroy();
        s.sprite = undefined;
        this.active.delete(s);
      }
    }
    const { areas } = this.city.query({ x0: px - NEAR, y0: py - NEAR, x1: px + NEAR, y1: py + NEAR });
    for (const a of areas) {
      if (a.kind !== 'pitch') continue;
      for (const s of this.stationsOf(a)) {
        if (s.sprite || Math.hypot(s.x - px, s.y - py) > NEAR) continue;
        s.sprite = this.scene.add.image(s.x, s.y, STATION_TEX[s.kind]).setOrigin(0.5, 0.92).setDepth(s.y);
        this.active.add(s);
      }
    }
  }

  blocked(x: number, y: number) {
    for (const s of this.active) if (Math.abs(s.x - x) < 4 && Math.abs(s.y - y) < 3) return true;
    return false;
  }

  /** The station of that kind hit at (x, y), if any; it wobbles. */
  hitAt(x: number, y: number, reach: number, kind: StationKind): Station | null {
    for (const s of this.active) {
      if (s.kind !== kind || Math.hypot(s.x - x, s.y - 7 - y) > reach) continue;
      if (s.sprite) this.scene.tweens.add({ targets: s.sprite, angle: { from: -8, to: 8 }, duration: 50, yoyo: true, onComplete: () => s.sprite?.setAngle(0) });
      return s;
    }
    return null;
  }

  /** Any station of any kind (projectiles hitting the wrong one just stop). */
  anyAt(x: number, y: number, reach: number): Station | null {
    for (const s of this.active) if (Math.hypot(s.x - x, s.y - 7 - y) <= reach) return s;
    return null;
  }
}

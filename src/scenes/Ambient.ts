import Phaser from 'phaser';
import { TEX, HERO_DIRS, makeLookTexture } from '../art';
import { PX_PER_M, pointInRings, type CityMap, type Area, type Line } from '../map/CityMap';
import { DRZEWA, LAS, type Owoc } from '../content/sklepy';
import { SPORT } from '../content/sport';
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
const TREE_TEX: Partial<Record<Owoc, string>> = { jablko: TEX.treeApple, sliwka: TEX.treePlum, winogrono: TEX.vine };
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
          .image(t.x, t.y, TREE_TEX[t.fruit]!, t.left > 0 ? 'full' : 'bare')
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
        if (Math.hypot(t.x - x, t.y - y) <= r) out.push({ x: t.x, y: t.y, w: this.scene.textures.getFrame(TREE_TEX[t.fruit]!, 'full').width });
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

// ---------------------------------------------------------------- forest

export interface ForestSpot {
  id: string;
  x: number;
  y: number;
  kind: 'grzyb' | 'drzewo';
  /** Hits left for a tree. */
  left: number;
  sprite?: Phaser.GameObjects.Image;
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Mushrooms and pines to cut in forests: the forest is split into small
 * squares and each may hold one of each, always in the same places. Picked
 * mushrooms and felled trees come back at the next login.
 */
export class Forest {
  private cells = new Map<string, ForestSpot[]>();
  private active = new Set<ForestSpot>();
  private gone = new Set<string>();
  private next = 0;
  private cell = LAS.kratkaM * PX_PER_M;

  /** `spawn` puts a mushroom on the ground as a pickup, `remove` takes it away. */
  constructor(
    private scene: Phaser.Scene,
    private city: CityMap,
    private spawn: (s: ForestSpot) => Phaser.GameObjects.Image,
    private remove: (img: Phaser.GameObjects.Image) => void,
  ) {}

  private spotsOf(cx: number, cy: number): ForestSpot[] {
    const key = `${cx}:${cy}`;
    let list = this.cells.get(key);
    if (list) return list;
    list = [];
    const r = rng(hashStr(`${this.city.id}:${key}`));
    // The tree first (same spots as before), then several tries for mushrooms.
    const tries: ['grzyb' | 'drzewo', number, string][] = [['drzewo', LAS.szansaDrzewo, `drzewo:${key}`]];
    for (let i = 0; i < LAS.grzybowNaKratke; i++) tries.push(['grzyb', LAS.szansaGrzyb, i ? `grzyb:${key}:${i}` : `grzyb:${key}`]);
    for (const [kind, chance, id] of tries) {
      const roll = r();
      const x = (cx + 0.1 + r() * 0.8) * this.cell;
      const y = (cy + 0.1 + r() * 0.8) * this.cell;
      if (roll >= chance) continue;
      if (!this.city.areaKindsAt(x, y).includes('forest')) continue;
      if (!this.city.isFree(x, y, 5, 5) || this.city.roadAt(x, y)) continue;
      // Not right on top of another mushroom or the tree.
      if (list.some((o) => Math.abs(o.x - x) < 8 && Math.abs(o.y - y) < 8)) continue;
      list.push({ id, x, y, kind, left: LAS.uderzenNaDrzewo });
    }
    this.cells.set(key, list);
    return list;
  }

  update(px: number, py: number, now: number) {
    if (now < this.next) return;
    this.next = now + 500;
    for (const s of [...this.active]) {
      if (Math.hypot(s.x - px, s.y - py) <= FAR) continue;
      if (s.sprite) (s.kind === 'grzyb' ? this.remove(s.sprite) : s.sprite.destroy());
      s.sprite = undefined;
      this.active.delete(s);
    }
    const c0x = Math.floor((px - NEAR) / this.cell);
    const c1x = Math.floor((px + NEAR) / this.cell);
    const c0y = Math.floor((py - NEAR) / this.cell);
    const c1y = Math.floor((py + NEAR) / this.cell);
    // Only where there is forest at all.
    const { areas } = this.city.query({ x0: px - NEAR, y0: py - NEAR, x1: px + NEAR, y1: py + NEAR });
    if (!areas.some((a) => a.kind === 'forest')) return;
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        for (const s of this.spotsOf(cx, cy)) {
          if (s.sprite || Math.hypot(s.x - px, s.y - py) > NEAR) continue;
          if (s.kind === 'grzyb') {
            if (this.gone.has(s.id)) continue;
            s.sprite = this.spawn(s);
          } else {
            s.sprite = this.scene.add.image(s.x, s.y, TEX.pine, this.gone.has(s.id) ? 'stump' : 'full').setOrigin(0.5, 0.92).setDepth(s.y);
          }
          this.active.add(s);
        }
      }
    }
  }

  /** A mushroom was picked up: it stays gone until the next login. */
  picked(id: string) {
    this.gone.add(id);
    for (const s of this.active) if (s.id === id) {
      s.sprite = undefined;
      this.active.delete(s);
    }
  }

  /** Is a point inside a standing trunk? (for collisions) */
  blocked(x: number, y: number) {
    for (const s of this.active) if (s.kind === 'drzewo' && !this.gone.has(s.id) && Math.abs(s.x - x) < 3 && Math.abs(s.y - y) < 2.5) return true;
    return false;
  }

  /** The nearest standing tree a swing at (x, y) hits. */
  hitAt(x: number, y: number, reach: number): ForestSpot | null {
    let best: ForestSpot | null = null;
    let bd = reach;
    for (const s of this.active) {
      if (s.kind !== 'drzewo' || this.gone.has(s.id)) continue;
      const d = Math.hypot(s.x - x, s.y - 8 - y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** One axe blow; true when the tree falls (and gives wood). */
  chop(s: ForestSpot): boolean {
    if (s.sprite) this.scene.tweens.add({ targets: s.sprite, angle: { from: -5, to: 5 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => s.sprite?.setAngle(0) });
    if (--s.left > 0) return false;
    this.gone.add(s.id);
    s.sprite?.setFrame('stump');
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
    /** More or fewer enemies (difficulty). */
    private density = 1,
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
    const count = Math.min(Math.round(20 * this.density), Math.round((total / 350) * this.density));
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
      const kind = this.kindAt(x, y);
      for (let g = 0; g < group; g++) out.push({ x: x + (g ? (Math.random() - 0.5) * 16 : 0), y: y + (g ? (Math.random() - 0.5) * 16 : 0), kind });
    }
    return out;
  }

  /** Who lives here: dryads in forests, skeletons by cemeteries, zombies by water, else imps (and a few bandits). */
  private kindAt(x: number, y: number): RodzajWroga {
    if (Math.random() < 0.1) return 'bandyta';
    if (this.city.areaKindsAt(x, y).includes('forest')) return 'driada';
    if (this.city.areaNear(x, y, 30 * PX_PER_M, 'cemetery')) return 'szkielet';
    if (this.city.nearWater(x, y, 30 * PX_PER_M)) return 'zombie';
    return 'glut';
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
  /** The second dummy at the far end of a big pitch (the coach's challenge). */
  far?: boolean;
}

/** The sporty people: a coach by the dummies of big pitches, a runner on small ones. */
export interface SportNpc {
  id: string;
  role: 'trener' | 'biegacz';
  x: number;
  y: number;
  area: Area;
  sprite?: Phaser.GameObjects.Sprite;
}

export const SPORTY_TEX = 'sporty';

/**
 * Big pitches (content/sport.ts): a dummy (sword), a target (bow), a crystal
 * (magic), a second dummy far away and the coach. Small pitches: a runner.
 */
export class Training {
  private generated = new Map<Area, Station[]>();
  private people = new Map<Area, SportNpc | null>();
  private runnerPitch = new Map<string, Area | null>();
  private active = new Set<Station>();
  private activeNpcs = new Set<SportNpc>();
  private next = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    // The sporty look: red shirt, white shorts.
    makeLookTexture(scene, SPORTY_TEX, { head: 0, build: 2, outfit: 0, hair: 2, skin: 2, hairColor: 1, top: 2, bottom: 6 });
    for (const dir of HERO_DIRS) {
      const key = `${SPORTY_TEX}-walk-${dir}`;
      if (!scene.anims.exists(key)) scene.anims.create({ key, frames: [1, 0, 2, 0].map((f) => ({ key: SPORTY_TEX, frame: `${dir}-${f}` })), frameRate: 12, repeat: -1 });
    }
  }

  static sizeM2(a: Area) {
    return ringsArea(a.rings[0]) / (PX_PER_M * PX_PER_M);
  }

  /** Dummies on a pitch from `kuklyOdM2`, but of neighbouring pitches only on the biggest one. */
  private hasStations(a: Area) {
    const m2 = Training.sizeM2(a);
    if (m2 < SPORT.kuklyOdM2) return false;
    const r = SPORT.sasiedziM * PX_PER_M;
    const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
    for (const b of this.city.query({ x0: a.x0 - r, y0: a.y0 - r, x1: a.x1 + r, y1: a.y1 + r }).areas) {
      if (b === a || b.kind !== 'pitch') continue;
      // Near: the gap between the two pitches' boxes is under `sasiedziM`.
      const gx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1), gy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
      if (Math.hypot(gx, gy) > r) continue;
      const bm2 = Training.sizeM2(b);
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      if (bm2 > m2 || (bm2 === m2 && (bx < cx || (bx === cx && by < cy)))) return false;
    }
    return true;
  }

  private stationsOf(a: Area): Station[] {
    let list = this.generated.get(a);
    if (list) return list;
    list = [];
    if (this.hasStations(a)) {
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
      // The second dummy (the coach's challenge, big pitches only): as far along the pitch as fits (up to ~60 m).
      if (list.length && Training.sizeM2(a) >= SPORT.duzeBoiskoM2) {
        const a0 = list[0];
        let far: Station | null = null;
        for (let d = 60 * PX_PER_M; d > 15 * PX_PER_M && !far; d -= 5 * PX_PER_M) {
          for (let k = 0; k < 16 && !far; k++) {
            const ang = (k / 16) * Math.PI * 2;
            const x = a0.x + Math.cos(ang) * d;
            const y = a0.y + Math.sin(ang) * d;
            if (pointInRings(a.rings, x, y) && this.city.isFree(x, y, 6, 6)) far = { kind: 'miecz', x, y, far: true };
          }
        }
        if (far) list.push(far);
      }
    }
    this.generated.set(a, list);
    return list;
  }

  /**
   * At most one runner per 1 km square: of the small pitches whose centre lies
   * in the square, the one nearest the square's middle (always the same one).
   */
  private runnerPitchOf(a: Area): Area | null {
    const cell = 1000 * PX_PER_M;
    const kx = Math.floor((a.x0 + a.x1) / 2 / cell);
    const ky = Math.floor((a.y0 + a.y1) / 2 / cell);
    const key = `${kx}:${ky}`;
    if (this.runnerPitch.has(key)) return this.runnerPitch.get(key)!;
    const mx = (kx + 0.5) * cell, my = (ky + 0.5) * cell;
    let best: Area | null = null;
    let bestD = Infinity;
    for (const b of this.city.query({ x0: kx * cell, y0: ky * cell, x1: (kx + 1) * cell, y1: (ky + 1) * cell }).areas) {
      if (b.kind !== 'pitch') continue;
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      if (Math.floor(bx / cell) !== kx || Math.floor(by / cell) !== ky) continue;
      const m2 = Training.sizeM2(b);
      if (m2 < SPORT.maleBoiskoM2 || m2 >= SPORT.duzeBoiskoM2) continue;
      const d = Math.hypot(bx - mx, by - my);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    this.runnerPitch.set(key, best);
    return best;
  }

  private personOf(a: Area): SportNpc | null {
    if (this.people.has(a)) return this.people.get(a)!;
    let npc: SportNpc | null = null;
    const m2 = Training.sizeM2(a);
    const id = `sport:${this.city.id}:${Math.round(a.x0)}:${Math.round(a.y0)}`;
    if (m2 >= SPORT.duzeBoiskoM2) {
      const st = this.stationsOf(a).find((s) => s.kind === 'miecz' && !s.far);
      if (st) {
        for (const [dx, dy] of [[0, 18], [0, -18], [24, 10], [-24, 10]]) {
          if (this.city.isFree(st.x + dx, st.y + dy + 5, 3, 2)) {
            npc = { id, role: 'trener', x: st.x + dx, y: st.y + dy, area: a };
            break;
          }
        }
      }
    } else if (m2 >= SPORT.maleBoiskoM2 && this.runnerPitchOf(a) === a) {
      const cx = (a.x0 + a.x1) / 2;
      const cy = (a.y0 + a.y1) / 2;
      const p = this.city.isFree(cx, cy + 5, 3, 2) ? { x: cx, y: cy } : this.city.freeNear(cx, cy);
      npc = { id, role: 'biegacz', x: p.x, y: p.y, area: a };
    }
    this.people.set(a, npc);
    return npc;
  }

  /** The two dummies of a coach's pitch. */
  dummiesOf(a: Area) {
    const list = this.stationsOf(a);
    return { a: list.find((s) => s.kind === 'miecz' && !s.far) ?? null, b: list.find((s) => s.far) ?? null };
  }

  /** Other pitches between `min` and `max` px from (x, y), for a race. */
  pitchesAround(x: number, y: number, min: number, max: number) {
    return this.city.query({ x0: x - max, y0: y - max, x1: x + max, y1: y + max }).areas
      .filter((a) => a.kind === 'pitch')
      .map((a) => ({ a, x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 }))
      .filter((p) => {
        const d = Math.hypot(p.x - x, p.y - y);
        return d >= min && d <= max;
      });
  }

  npcAt(x: number, y: number, r: number): SportNpc | null {
    for (const n of this.activeNpcs) if (n.sprite?.visible && n.sprite.alpha > 0 && Math.abs(n.x - x) < r && Math.abs(n.y - y) < r + 4) return n;
    return null;
  }

  /** Sports people the hero can see (for talk bubbles). */
  visibleNpcs() {
    return [...this.activeNpcs].filter((n) => n.sprite?.visible && n.sprite.alpha > 0);
  }

  /** Hides a runner while it races (a racing copy runs instead). */
  setAway(n: SportNpc, away: boolean) {
    n.sprite?.setAlpha(away ? 0 : 1);
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
    for (const n of [...this.activeNpcs]) {
      if (Math.hypot(n.x - px, n.y - py) <= FAR) continue;
      n.sprite?.destroy();
      n.sprite = undefined;
      this.activeNpcs.delete(n);
    }
    const { areas } = this.city.query({ x0: px - NEAR, y0: py - NEAR, x1: px + NEAR, y1: py + NEAR });
    for (const a of areas) {
      if (a.kind !== 'pitch') continue;
      for (const s of this.stationsOf(a)) {
        if (s.sprite || Math.hypot(s.x - px, s.y - py) > NEAR) continue;
        s.sprite = this.scene.add.image(s.x, s.y, STATION_TEX[s.kind]).setOrigin(0.5, 0.92).setDepth(s.y);
        this.active.add(s);
      }
      const n = this.personOf(a);
      if (n && !n.sprite && Math.hypot(n.x - px, n.y - py) <= NEAR) {
        n.sprite = this.scene.add.sprite(n.x, n.y, SPORTY_TEX, 'down-0').setOrigin(0.5, 0.6).setDepth(n.y);
        // A little jog on the spot, so they look sporty.
        this.scene.tweens.add({ targets: n.sprite, y: n.y - 1.5, duration: 260, yoyo: true, repeat: -1 });
        this.activeNpcs.add(n);
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

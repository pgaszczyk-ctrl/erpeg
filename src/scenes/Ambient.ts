import Phaser from 'phaser';
import { SKLAD_GANGOW } from '../content/pogoda';
import { GROUND_DEPTH } from '../map/MapRenderer';
import { WYGLAD_09 } from '../map/Podloze09';
import { TEX, HERO_DIRS, makeLookTexture, artScale } from '../art';
import { TRENING } from '../content/swiat';
import { PX_PER_M, pointInRings, type CityMap, type Area } from '../map/CityMap';
import { DRZEWA, LAS, WARZYWA, type Owoc } from '../content/sklepy';
import { SPORT } from '../content/sport';
import type { RodzajWroga } from '../content/fabula';
import { GANGI, GANG_OD_MIEJSC_M, GANG_CZLONEK_OD_DRZWI_M, GANG_POWROT_S, GANG_MGLA, GANG_MUSZKI, GANG_WIES, BERSERKER, OBSTAWA_HERSZTA, stanGangu, type RodzajGangu } from '../content/gangi';
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

  /** Trees planted by hand (the QR demo), shown whatever the ground. */
  private planted: FruitTree[] = [];

  constructor(private scene: Phaser.Scene, private city: CityMap) {}

  plant(x: number, y: number, fruit: Owoc, left: number): FruitTree {
    const t: FruitTree = { id: `p:${this.planted.length}`, x, y, fruit, left };
    this.planted.push(t);
    this.next = 0;
    return t;
  }

  /** Trees on one green area, always in the same places. */
  private treesOf(a: Area, index: number): FruitTree[] {
    let list = this.generated.get(a);
    if (list) return list;
    // Not before the pitch and its surroundings have loaded: spots tested against missing
    // buildings came out "not free" and the pitch stayed empty for good (Katowice, a world map).
    if (!this.city.ready({ x0: a.x0 - 40, y0: a.y0 - 40, x1: a.x1 + 40, y1: a.y1 + 40 })) return [];
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
    // Overhaul 09: fruit trees come from the generator's trees (map/Korony.ts); only the planted ones stay.
    const lists = WYGLAD_09 ? [] : areas.filter((a) => FRUIT_AREAS[a.kind]).map((a) => this.treesOf(a, a.id));
    lists.push(this.planted);
    for (const list of lists) {
      for (const t of list) {
        if (t.sprite || Math.hypot(t.x - px, t.y - py) > NEAR) continue;
        t.sprite = this.scene.add
          .image(t.x, t.y, TREE_TEX[t.fruit]!, t.left > 0 ? 'full' : 'bare')
          .setOrigin(0.5, 0.92)
          .setScale(artScale(TREE_TEX[t.fruit]!))
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
      for (const t of this.treesOf(a, a.id)) {
        if (Math.hypot(t.x - x, t.y - y) <= r) out.push({ x: t.x, y: t.y, w: this.scene.textures.getFrame(TREE_TEX[t.fruit]!, 'full').width * artScale(TREE_TEX[t.fruit]!) });
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
  kind: 'grzyb' | 'drzewo' | 'warzywo';
  /** Which vegetable (kind 'warzywo'). */
  veg?: Owoc;
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
    // Not loaded yet: nothing now, and don't remember it.
    if (!this.city.ready({ x0: cx * this.cell, y0: cy * this.cell, x1: (cx + 1) * this.cell, y1: (cy + 1) * this.cell })) return [];
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
      // Overhaul 09: trees to chop are the generator's trees with a notch (map/Korony.ts).
      if (kind === 'drzewo' && WYGLAD_09) continue;
      if (!this.city.areaKindsAt(x, y).includes('forest')) continue;
      if (!this.city.isFree(x, y, 5, 5) || this.city.roadAt(x, y)) continue;
      // Not right on top of another mushroom or the tree.
      if (list.some((o) => Math.abs(o.x - x) < 8 && Math.abs(o.y - y) < 8)) continue;
      list.push({ id, x, y, kind, left: LAS.uderzenNaDrzewo });
    }
    // Vegetables on allotments and fields: a bed of rows of one kind.
    {
      const roll = r();
      const x = (cx + 0.15 + r() * 0.3) * this.cell;
      const y = (cy + 0.15 + r() * 0.4) * this.cell;
      const veg = WARZYWA.rodzaje[Math.floor(r() * WARZYWA.rodzaje.length)];
      // Overhaul 09: whole fields are sown in strips with ripe vegetables to pick (src/gen/pola.ts) – no beds.
      if (roll < WARZYWA.szansa && !WYGLAD_09) {
        for (let row = 0; row < WARZYWA.rzedow; row++)
          for (let i = 0; i < WARZYWA.wRzedzie; i++) {
            const vx = x + i * 8;
            const vy = y + row * 9;
            const kinds = this.city.areaKindsAt(vx, vy);
            if (!(kinds.includes('allotments') || kinds.includes('farmland')) || !this.city.isFree(vx, vy, 3, 3) || this.city.roadAt(vx, vy)) continue;
            list.push({ id: `warzywo:${key}:${row}:${i}`, x: vx, y: vy, kind: 'warzywo', veg, left: 1 });
          }
      }
    }
    this.cells.set(key, list);
    return list;
  }

  update(px: number, py: number, now: number) {
    if (now < this.next) return;
    this.next = now + 500;
    for (const s of [...this.active]) {
      if (Math.hypot(s.x - px, s.y - py) <= FAR) continue;
      if (s.sprite) (s.kind !== 'drzewo' ? this.remove(s.sprite) : s.sprite.destroy());
      s.sprite = undefined;
      this.active.delete(s);
    }
    const c0x = Math.floor((px - NEAR) / this.cell);
    const c1x = Math.floor((px + NEAR) / this.cell);
    const c0y = Math.floor((py - NEAR) / this.cell);
    const c1y = Math.floor((py + NEAR) / this.cell);
    // Only where there is forest at all.
    const { areas } = this.city.query({ x0: px - NEAR, y0: py - NEAR, x1: px + NEAR, y1: py + NEAR });
    if (!areas.some((a) => a.kind === 'forest' || a.kind === 'allotments' || a.kind === 'farmland')) return;
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        for (const s of this.spotsOf(cx, cy)) {
          if (s.sprite || Math.hypot(s.x - px, s.y - py) > NEAR) continue;
          if (s.kind !== 'drzewo') {
            if (this.gone.has(s.id)) continue;
            s.sprite = this.spawn(s);
          } else {
            s.sprite = this.scene.add.image(s.x, s.y, TEX.pine, this.gone.has(s.id) ? 'stump' : 'full').setOrigin(0.5, 0.92).setScale(artScale(TEX.pine)).setDepth(s.y);
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

  /** The nearest vegetable (not picked, not being picked) a swing at (x, y) reaches. */
  vegAt(x: number, y: number, reach: number, busy: Set<string>): ForestSpot | null {
    let best: ForestSpot | null = null;
    let bd = reach;
    for (const s of this.active) {
      if (s.kind !== 'warzywo' || this.gone.has(s.id) || busy.has(s.id)) continue;
      const d = Math.hypot(s.x - x, s.y - 3 - y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
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

// ---------------------------------------------------------------- monster gangs

const KM = 1000 * PX_PER_M;

export interface StreetSpawn {
  x: number;
  y: number;
  kind: RodzajWroga;
  /** A berserker (content/gangi.ts BERSERKER). */
  berserk?: boolean;
}

/** One gang: its territory, where its members stand, who is still alive, its boss. */
export interface Gang {
  id: string;
  kind: RodzajGangu;
  x: number;
  y: number;
  /** Territory radius (px). */
  r: number;
  /** Member spots, made once the territory is loaded. */
  spots: StreetSpawn[] | null;
  /** Indexes of spots whose member is still alive. */
  alive: Set<number>;
  /** Spawned members (spot index → enemy). */
  members: Map<number, unknown>;
  boss: 'none' | 'out' | 'dead';
  bossObj?: unknown;
  /** When it was broken up (scene time), 0 while active. */
  clearedAt: number;
  fog?: Phaser.GameObjects.Graphics;
  /** The last descriptive counter shown (content/gangi.ts stanGangu). */
  said?: string;
}

function hashStr2(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Monsters live in gangs (content/gangi.ts): random territories per 1 km
 * square (new each login), away from important places; members stand at
 * their spots and come out when they see the hero. The last one falling
 * brings out the boss; beating him breaks the gang up.
 */
export class StreetEnemies {
  private gangs: Gang[] = [];
  private planned = new Set<string>();
  private next = 0;

  constructor(
    private scene: Phaser.Scene,
    private city: CityMap,
    /** Places to keep gangs away from (doors, home). */
    private avoid: { x: number; y: number }[],
    private spawn: (s: StreetSpawn, gang: Gang) => unknown,
    private despawn: (e: unknown) => boolean,
    /** More or fewer gangs (difficulty, night). */
    private density = 1,
    /** Per-login seed: new gangs every time. */
    private seed = 0,
    private events: { bossOut: (g: Gang) => void; cleared: (g: Gang) => void; stan?: (g: Gang, text: string) => void; heroLevel?: () => number; pora?: () => { noc: boolean; mokro: boolean } } = { bossOut: () => {}, cleared: () => {} },
  ) {}

  private nearAvoid(x: number, y: number, m: number) {
    const d = m * PX_PER_M;
    return this.avoid.some((p) => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d && Math.hypot(p.x - x, p.y - y) < d);
  }

  /** The gangs whose centre lies in one 1 km square. */
  private planCell(cx: number, cy: number) {
    const key = `${cx},${cy}`;
    if (this.planned.has(key)) return;
    this.planned.add(key);
    const r = rng(hashStr2(`${this.city.id}:gangs:${this.seed}:${key}`));
    // Out in the villages and fields (few places) more gangs, or walks there are empty.
    const box = { x0: cx * KM, y0: cy * KM, x1: (cx + 1) * KM, y1: (cy + 1) * KM };
    const places = this.city.places.filter((p) => p.door.x >= box.x0 && p.door.x < box.x1 && p.door.y >= box.y0 && p.door.y < box.y1).length;
    const extra = places < GANG_WIES.miejscMniejNiz ? GANG_WIES.mnoznik : 1;
    GANGI.forEach((kind, ki) => {
      const want = kind.naKm2 * this.density * extra;
      const n = Math.floor(want) + (r() < want % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < 12; t++) {
          const x = (cx + r()) * KM;
          const y = (cy + r()) * KM;
          if (this.city.isBlocked(x, y) || this.nearAvoid(x, y, GANG_OD_MIEJSC_M)) continue;
          // Mostly by a road, so walkers come across them.
          if (t < 9 && !this.nearRoad(x, y, GANG_WIES.odDrogiM * PX_PER_M)) continue;
          // Not on top of another gang.
          if (this.gangs.some((g) => Math.hypot(g.x - x, g.y - y) < (g.r + kind.promienM * PX_PER_M) * 0.6)) continue;
          this.gangs.push({ id: `${key}:${ki}:${i}`, kind, x, y, r: kind.promienM * PX_PER_M, spots: null, alive: new Set(), members: new Map(), boss: 'none', clearedAt: 0 });
          break;
        }
      }
    });
  }

  private nearRoad(x: number, y: number, r: number) {
    return this.city.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }).lines.some((l) => l.kind === 'major' || l.kind === 'medium' || l.kind === 'minor' || l.kind === 'track');
  }

  /** Where the members stand, once the territory is loaded. */
  private makeSpots(g: Gang) {
    const r = rng(hashStr2(`${g.id}:${this.seed}:spots`));
    const [lo, hi] = g.kind.czlonkow;
    const want = lo + Math.floor(r() * (hi - lo + 1));
    const spots: StreetSpawn[] = [];
    for (let t = 0; spots.length < want && t < want * 40; t++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * g.r * 0.9;
      const x = g.x + Math.cos(a) * d;
      const y = g.y + Math.sin(a) * d;
      if (!this.city.isFree(x, y, 4, 4) || this.nearAvoid(x, y, GANG_CZLONEK_OD_DRZWI_M)) continue;
      spots.push({ x, y, kind: this.kindAt(x, y) });
    }
    // Some gangs have one berserker.
    if (spots.length && r() < BERSERKER.szansa) spots[Math.floor(r() * spots.length)].berserk = true;
    g.spots = spots;
    spots.forEach((_, i) => g.alive.add(i));
  }

  /** Who lives here: dryads in forests, skeletons by cemeteries, zombies by water, else imps (and a few bandits). */
  private kindAt(x: number, y: number): RodzajWroga {
    if (this.city.areaKindsAt(x, y).includes('forest')) return 'driada';
    if (this.city.areaNear(x, y, 30 * PX_PER_M, 'cemetery')) return 'szkielet';
    if (this.city.nearWater(x, y, 30 * PX_PER_M)) return 'zombie';
    return 'glut';
  }

  /**
   * Who stands on an imp's spot right now (content/pogoda.ts SKLAD_GANGOW): at night mostly bandits;
   * in the rain water blobs, and every few of them their master, a wodnik. Fixed per spot (no reshuffling on every respawn).
   */
  private forNow(s: StreetSpawn, i: number, g: Gang): StreetSpawn {
    if (s.kind !== 'glut') return s;
    const pora = this.events.pora?.() ?? { noc: false, mokro: false };
    const h = hashStr2(`${g.id}:${i}:kto`) / 4294967296;
    const S = SKLAD_GANGOW;
    if (h < (pora.noc ? S.bandyciNoc : S.bandyciDzien)) return { ...s, kind: 'bandyta' };
    if (pora.mokro) return { ...s, kind: i % S.blobowNaWodnika === 0 ? 'wodnik' : 'blob' };
    return s;
  }

  /** Is this point inside a gang's territory where people shouldn't be (active, or broken up less than a minute ago)? */
  blocks(x: number, y: number) {
    const now = this.scene.time.now;
    for (const g of this.gangs) {
      if (g.clearedAt && now - g.clearedAt > GANG_POWROT_S * 1000) continue;
      if (Math.abs(g.x - x) < g.r && Math.abs(g.y - y) < g.r && Math.hypot(g.x - x, g.y - y) < g.r) return true;
    }
    return false;
  }

  /** The active gang whose territory the point is in, if any. */
  gangAt(x: number, y: number) {
    return this.gangs.find((g) => !g.clearedAt && Math.hypot(g.x - x, g.y - y) < g.r) ?? null;
  }

  /** A gang member or boss was killed. */
  killed(e: unknown) {
    for (const g of this.gangs) {
      if (g.bossObj === e) {
        g.boss = 'dead';
        g.bossObj = undefined;
        g.clearedAt = this.scene.time.now;
        g.fog?.destroy();
        g.fog = undefined;
        this.events.cleared(g);
        return;
      }
      for (const [i, m] of g.members) {
        if (m !== e) continue;
        g.members.delete(i);
        g.alive.delete(i);
        this.tell(g);
        if (!g.alive.size && g.boss === 'none') {
          g.boss = 'out';
          const p = this.city.isFree(g.x, g.y, 6, 6) ? { x: g.x, y: g.y } : this.city.freeNear(g.x, g.y);
          g.bossObj = this.spawn({ x: p.x, y: p.y, kind: g.kind.herszt }, g);
          this.spawnEscort(g, p);
          this.events.bossOut(g);
        }
        return;
      }
    }
  }

  /** The boss's guards: one more per level threshold the hero has passed; from a higher level one may be a berserker. */
  private spawnEscort(g: Gang, at: { x: number; y: number }) {
    const lvl = this.events.heroLevel?.() ?? 1;
    const O = OBSTAWA_HERSZTA;
    const n = O.progi.filter((p) => lvl >= p).length;
    const berserk = lvl >= O.berserkerOd && Math.random() < O.szansaBerserkera ? Math.floor(Math.random() * n) : -1;
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + Math.PI / 4;
      const x = at.x + Math.cos(a) * 16, y = at.y + Math.sin(a) * 12;
      const p = this.city.isFree(x, y, 4, 4) ? { x, y } : this.city.freeNear(x, y);
      this.spawn(this.forNow({ x: p.x, y: p.y, kind: this.kindAt(p.x, p.y), berserk: i === berserk }, 1000 + i, g), g);
    }
  }

  /** The descriptive counter: says how the gang is doing when that changes. */
  private tell(g: Gang) {
    const t = stanGangu(g.alive.size, g.spots?.length ?? g.alive.size);
    if (!t || t === g.said) return;
    g.said = t;
    this.events.stan?.(g, t);
  }

  update(px: number, py: number, now: number) {
    this.drawFlies(now);
    if (now < this.next) return;
    this.next = now + 700;
    const pcx = Math.floor(px / KM);
    const pcy = Math.floor(py / KM);
    for (let cx = pcx - 2; cx <= pcx + 2; cx++) for (let cy = pcy - 2; cy <= pcy + 2; cy++) {
      if (this.city.ready({ x0: cx * KM, y0: cy * KM, x1: (cx + 1) * KM, y1: (cy + 1) * KM })) this.planCell(cx, cy);
    }
    for (const g of this.gangs) {
      const d = Math.hypot(g.x - px, g.y - py);
      // The red mist over an active territory near the hero.
      if (!g.clearedAt && d < g.r + 1500 * PX_PER_M) {
        if (!g.fog) {
          g.fog = this.scene.add.graphics().setDepth(GROUND_DEPTH + 1);
          g.fog.fillStyle(GANG_MGLA.kolor, GANG_MGLA.alfa).fillCircle(g.x, g.y, g.r);
          g.fog.lineStyle(4, GANG_MGLA.kolor, Math.min(1, GANG_MGLA.alfa * 2.5)).strokeCircle(g.x, g.y, g.r);
        }
      } else if (g.fog) {
        g.fog.destroy();
        g.fog = undefined;
      }
      if (g.clearedAt) continue;
      // Walking into a territory: say how many are there.
      if (d < g.r && g.spots && !g.said) this.tell(g);
      const near = d < g.r + 350 * PX_PER_M;
      if (near) {
        if (!g.spots) {
          if (!this.city.ready({ x0: g.x - g.r, y0: g.y - g.r, x1: g.x + g.r, y1: g.y + g.r })) continue;
          this.makeSpots(g);
        }
        for (const i of g.alive) {
          if (g.members.has(i)) continue;
          g.members.set(i, this.spawn(this.forNow(g.spots![i], i, g), g));
        }
      } else if (d > g.r + 700 * PX_PER_M) {
        // Far away: the members go home (unless chasing), still alive for later.
        for (const [i, m] of g.members) if (this.despawn(m)) g.members.delete(i);
      }
    }
  }

  private flies?: Phaser.GameObjects.Graphics;

  /** One-pixel flies buzzing over the misty territories in view (fixed spots on a grid, so they don't follow the hero). */
  private drawFlies(now: number) {
    // Only over active territories (never outside the red mist).
    const misty = this.gangs.filter((g) => g.fog && !g.clearedAt);
    if (!misty.length) {
      this.flies?.clear();
      return;
    }
    const f = (this.flies ??= this.scene.add.graphics().setDepth(GROUND_DEPTH + 2));
    f.clear().fillStyle(GANG_MUSZKI.kolor, 1);
    const v = this.scene.cameras.main.worldView;
    const c = GANG_MUSZKI.coPx;
    const t = now / 1000;
    for (let gx = Math.floor(v.x / c); gx <= Math.floor(v.right / c); gx++)
      for (let gy = Math.floor(v.y / c); gy <= Math.floor(v.bottom / c); gy++) {
        const h = hashStr2(`${gx},${gy}`);
        if (h % GANG_MUSZKI.coIleKratek) continue;
        const ph = (h >>> 8) % 628 / 100;
        const sp = 1.5 + ((h >>> 4) % 20) / 10;
        const x = Math.round(gx * c + ((h >>> 12) % c) + Math.sin(t * sp + ph) * 7 + Math.sin(t * sp * 2.7) * 2);
        const y = Math.round(gy * c + ((h >>> 20) % c) + Math.cos(t * sp * 1.3 + ph) * 5);
        // A bit inside the edge, so none buzz just outside the mist.
        if (misty.some((g) => (x - g.x) ** 2 + (y - g.y) ** 2 < (g.r - 12) ** 2)) f.fillRect(x, y, 1, 1);
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
    if (!SPORT.ludzie) return null;
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

  /** `hide`: sports people stay away from where it says (monster gangs' territories). */
  update(px: number, py: number, now: number, hide: (x: number, y: number) => boolean = () => false) {
    if (now < this.next) return;
    this.next = now + 600;
    for (const n of this.activeNpcs) n.sprite?.setVisible(!hide(n.x, n.y));
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
        const key = s.far && this.scene.textures.exists(TEX.dummyFar) ? TEX.dummyFar : STATION_TEX[s.kind];
        const art = this.scene.textures.get(key).has('0');
        s.sprite = this.scene.add.image(s.x, s.y + (art ? 3 : 0), key, art ? '0' : undefined).setOrigin(0.5, art ? 1 : 0.92).setScale(artScale(key)).setDepth(s.y);
        this.active.add(s);
      }
      const n = this.personOf(a);
      if (n && !n.sprite && Math.hypot(n.x - px, n.y - py) <= NEAR) {
        n.sprite = this.scene.add.sprite(n.x, n.y, SPORTY_TEX, 'down-0').setOrigin(0.5, 0.6).setDepth(n.y);
        // A little jog on the spot, so they look sporty.
        this.scene.tweens.add({ targets: n.sprite, y: n.y - 1.5, duration: 260, yoyo: true, repeat: -1 });
        n.sprite.setVisible(!hide(n.x, n.y));
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
      const img = s.sprite;
      if (img?.texture.has('1')) {
        // The artist's frames: hit (leans back) → coming back → standing.
        img.setFrame('1');
        this.scene.time.delayedCall(TRENING.klatkaMs * 2, () => img.active && img.setFrame('2'));
        this.scene.time.delayedCall(TRENING.klatkaMs * 4, () => img.active && img.setFrame('0'));
      } else if (img) this.scene.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 50, yoyo: true, onComplete: () => img.setAngle(0) });
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

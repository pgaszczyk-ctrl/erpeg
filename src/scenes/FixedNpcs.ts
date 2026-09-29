import Phaser from 'phaser';
import { TEX } from '../art';
import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import { rng } from '../rng';
import { tr, tx } from '../i18n';
import { PIES, MARGO, DZIADKOWIE, GRAZYNKA, LUIGI, MARTIN, type ZagadkaPL } from '../content/postacie';
import { session, earn, type MissionState } from '../quests';
import { groupCount, takeGroup, groupValue, sellGroup, fruitCount, takeFruit } from '../inventory';
import { levelForAge } from './Npcs';
import type { Place } from '../map/CityMap';
import { today } from './Npcs';
import { fixedSprite, isHd, walkHd } from '../sprites';

// The fixed characters from content/postacie.ts: a dog on Guliwera/Cyda that
// lost its piggy, Sister Margo on Orlanda and Grandpa Marek or Grandma Iwonka
// by Śnieżyńskiego 19–27, Grandma Grażynka on Kościelna in Garbów. They
// stroll slowly along their streets.

/** Grandma Grażynka's quest steps (saved in session.missions / session.daily). */
export type GrazynkaStep = 'new' | 'owoce' | 'sklep' | 'powrot' | 'zagadki' | 'done';

export interface FixedHost {
  dialog(req: { title: string; text: string; buttons: string[]; onChoose: (i: number) => void }): void;
  toast(text: string, ms?: number): void;
  riddle(title: string, intro: string, z: ZagadkaPL, exp: number, seed: string, after: (right: boolean) => void, opts?: { coins?: number; then?: (right: boolean) => void; retry?: boolean }): void;
  /** No room for another quest? (says so) */
  questsFull(): boolean;
  /** The main story: has the hero seen the dragon's shadow (and not finished)? */
  storyOn(): boolean;
  /** Martin sends the hero to the wizard. */
  storyExpert(title: string, text: string, later: string): void;
  hud(): void;
  gainExp(n: number): void;
  save(): void;
  /** Fruit trees near a point (x, y of the trunk, crown width). */
  trees(x: number, y: number, r: number): { x: number; y: number; w: number }[];
}

type Pt = { x: number; y: number };
const HIDE_IN = new Set(['forest', 'scrub', 'wetland']);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Walks slowly back and forth along a set of polylines, with little stops. */
export class Walker {
  li = 0;
  seg = 0;
  t = 0;
  dir = 1;
  pauseLeft = 0;
  nextPause = 4;
  x = 0;
  y = 0;
  constructor(private lines: number[][], private speed: number, private r: () => number) {
    this.li = Math.floor(r() * lines.length);
    const n = lines[this.li].length / 2;
    this.seg = Math.floor(r() * Math.max(1, n - 1));
    this.t = r();
    this.place();
  }
  private pt(i: number): Pt {
    const l = this.lines[this.li];
    return { x: l[i * 2], y: l[i * 2 + 1] };
  }
  private place() {
    const a = this.pt(this.seg);
    const b = this.pt(this.seg + 1);
    this.x = a.x + (b.x - a.x) * this.t;
    this.y = a.y + (b.y - a.y) * this.t;
  }
  /** At an end of the line: carry on along a line that starts here, or turn round. */
  private atEnd(p: Pt) {
    const options: [number, number][] = [];
    this.lines.forEach((l, i) => {
      if (i === this.li) return;
      if (Math.hypot(l[0] - p.x, l[1] - p.y) < 15) options.push([i, 1]);
      if (Math.hypot(l[l.length - 2] - p.x, l[l.length - 1] - p.y) < 15) options.push([i, -1]);
    });
    if (options.length && this.r() < 0.8) {
      const [i, dir] = options[Math.floor(this.r() * options.length)];
      this.li = i;
      this.dir = dir;
      const n = this.lines[i].length / 2;
      this.seg = dir > 0 ? 0 : n - 2;
      this.t = dir > 0 ? 0 : 1;
    } else this.dir = -this.dir;
  }
  step(dt: number): number {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return 0;
    }
    this.nextPause -= dt;
    if (this.nextPause <= 0) {
      this.pauseLeft = 1 + this.r() * 2.5;
      this.nextPause = 4 + this.r() * 6;
    }
    const ox = this.x;
    let d = this.speed * dt;
    for (let guard = 0; d > 0 && guard < 20; guard++) {
      const n = this.lines[this.li].length / 2;
      if (n < 2) break;
      const a = this.pt(this.seg);
      const b = this.pt(this.seg + 1);
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 0.001;
      const left = this.dir > 0 ? (1 - this.t) * L : this.t * L;
      if (d < left) {
        this.t += (this.dir * d) / L;
        d = 0;
      } else {
        d -= left;
        if (this.dir > 0) {
          if (this.seg + 1 >= n - 1) this.atEnd(b);
          else {
            this.seg++;
            this.t = 0;
          }
        } else if (this.seg <= 0) this.atEnd(a);
        else {
          this.seg--;
          this.t = 1;
        }
      }
    }
    this.place();
    return this.x - ox;
  }
}

interface Walking {
  id: string;
  walker: Walker | null;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  x: number;
  y: number;
  gone?: boolean;
}

export class FixedNpcs {
  private list: Walking[] = [];
  private piggy: Phaser.GameObjects.Image | null = null;
  private piggyAt: (Pt & { behind?: boolean }) | null = null;
  private barkAt = 0;
  private r = rng(hash(`fixed:${today()}`));
  private grandIndex = hash(`dziadkowie:${today()}`) % DZIADKOWIE.osoby.length;
  /** Grandma Grażynka's village centre; she appears once her street is loaded. */
  private grazynkaHome: Pt | null = null;
  private grazynkaTry = 0;
  private luigiHome: Pt | null = null;
  private luigiTry = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap, private host: FixedHost) {
    // They all live in Lublin (Garbów is part of its map).
    if (city.id !== 'lublin') return;
    this.grazynkaHome = city.fromLatLon(GRAZYNKA.miejscowosc.lat, GRAZYNKA.miejscowosc.lon);
    const lb = city.findBuilding(LUIGI.adres);
    this.luigiHome = lb ? city.entranceOf(lb) : null;
    const streetLines = (names: string[]) =>
      city.lines.filter((l) => l.name && names.includes(l.name) && l.pts.length >= 4).map((l) => l.pts);

    // Martin, the dragon expert, on Irysowa.
    const martinLines = streetLines([MARTIN.ulica]);
    if (martinLines.length) {
      const w = new Walker(martinLines, MARTIN.predkosc * PX_PER_M, this.r);
      const sprite = fixedSprite(scene, w.x, w.y, 'martin', TEX.hero, 0xd08050);
      this.list.push({ id: 'martin', walker: w, sprite, x: w.x, y: w.y });
    }

    // The dog (unless it already got its piggy back).
    const dogLines = streetLines(PIES.ulice);
    if (dogLines.length && this.state('npc-pies') !== 'done') {
      const w = new Walker(dogLines, PIES.predkosc * PX_PER_M, this.r);
      const sprite = scene.add.image(w.x, w.y, TEX.dog);
      const label = scene.add.text(w.x, w.y - 14, '', { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 }).setOrigin(0.5, 1).setAlpha(0);
      this.list.push({ id: 'pies', walker: w, sprite, label, x: w.x, y: w.y });
      this.piggyAt = this.findPiggySpot(dogLines);
    }

    // Sister Margo.
    const nunLines = streetLines([MARGO.ulica]);
    if (nunLines.length) {
      const w = new Walker(nunLines, MARGO.predkosc * PX_PER_M, this.r);
      const sprite = fixedSprite(scene, w.x, w.y, 'margo', TEX.hero, 0x9a9aa6);
      this.list.push({ id: 'margo', walker: w, sprite, x: w.x, y: w.y });
    }

    // Grandpa or grandma, by their block on Śnieżyńskiego.
    const block = DZIADKOWIE.adresy.map((a) => city.findBuilding(a)).find(Boolean);
    if (block) {
      const door = city.entranceOf(block);
      const near = streetLines([DZIADKOWIE.ulica]).map((pts) => {
        // The longest run of points near the block.
        let best: number[] = [];
        let run: number[] = [];
        for (let i = 0; i < pts.length; i += 2) {
          if (Math.hypot(pts[i] - door.x, pts[i + 1] - door.y) < 90 * PX_PER_M) run.push(pts[i], pts[i + 1]);
          else {
            if (run.length > best.length) best = run;
            run = [];
          }
        }
        return run.length > best.length ? run : best;
      }).filter((l) => l.length >= 4);
      const lines = near.length ? near : [[door.x, door.y, door.x + 1, door.y]];
      const w = new Walker(lines, DZIADKOWIE.predkosc * PX_PER_M, this.r);
      const sprite = fixedSprite(scene, w.x, w.y, this.grandIndex === 0 ? 'marek' : 'iwonka', TEX.hero, this.grandIndex === 0 ? 0xb8c8e0 : 0xf2b8d8);
      this.list.push({ id: 'dziadkowie', walker: w, sprite, x: w.x, y: w.y });
    }
  }

  /**
   * Luigi strolls Nałęczowska between Aleja Kraśnicka and Morwowa (made once
   * the tiles around there are loaded: the street's start is kilometres away).
   */
  private placeLuigi(px: number, py: number, now: number) {
    const home = this.luigiHome;
    if (!home || now < this.luigiTry) return;
    this.luigiTry = now + 1000;
    if (Math.hypot(px - home.x, py - home.y) > 1500 * PX_PER_M) return;
    const near = 800 * PX_PER_M;
    const around = (l: { pts: number[] }) => Math.hypot(l.pts[0] - home.x, l.pts[1] - home.y) < near + l.pts.length * 20;
    const street = this.city.lines.filter((l) => l.name === LUIGI.ulica && l.pts.length >= 4 && around(l));
    // Where each cross street meets it.
    const ends = LUIGI.miedzy.map((name) => {
      let best: Pt | null = null;
      let bd = 12 * PX_PER_M;
      for (const c of this.city.lines) {
        if (c.name !== name || !around(c)) continue;
        for (const a of street) {
          for (let i = 0; i < a.pts.length; i += 2) {
            for (let k = 0; k < c.pts.length; k += 2) {
              const d = Math.hypot(a.pts[i] - c.pts[k], a.pts[i + 1] - c.pts[k + 1]);
              if (d < bd) [bd, best] = [d, { x: a.pts[i], y: a.pts[i + 1] }];
            }
          }
        }
      }
      return best;
    });
    const [A, B] = ends;
    if (!A || !B) return;
    // Runs of the street's points that lie between the two crossings.
    const dx = B.x - A.x, dy = B.y - A.y, len2 = dx * dx + dy * dy || 1;
    const between = (x: number, y: number) => {
      const t = ((x - A.x) * dx + (y - A.y) * dy) / len2;
      const off = Math.abs((x - A.x) * dy - (y - A.y) * dx) / Math.sqrt(len2);
      return t >= -0.01 && t <= 1.01 && off < 60 * PX_PER_M;
    };
    const lines: number[][] = [];
    for (const a of street) {
      let run: number[] = [];
      for (let i = 0; i <= a.pts.length; i += 2) {
        if (i < a.pts.length && between(a.pts[i], a.pts[i + 1])) run.push(a.pts[i], a.pts[i + 1]);
        else {
          if (run.length >= 4) lines.push(run);
          run = [];
        }
      }
    }
    if (!lines.length) return;
    this.luigiHome = null;
    const w = new Walker(lines, LUIGI.predkosc * PX_PER_M, this.r);
    const sprite = fixedSprite(this.scene, w.x, w.y, 'luigi', TEX.hero, 0xd0463c);
    this.list.push({ id: 'luigi', walker: w, sprite, x: w.x, y: w.y });
  }

  private state(id: string): MissionState {
    return session.missions[id] ?? 'new';
  }

  /** Bushes next to the playground between the dog's streets. */
  private findPiggySpot(lines: number[][]): (Pt & { behind?: boolean }) | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const l of lines) for (let i = 0; i < l.length; i += 2) {
      sx += l[i];
      sy += l[i + 1];
      n++;
    }
    const mid = { x: sx / n, y: sy / n };
    const centre = (a: { x0: number; y0: number; x1: number; y1: number }) => ({ x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 });
    const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
    const playground = this.city.areas.filter((a) => a.kind === 'playground').sort((a, b) => dist(centre(a), mid) - dist(centre(b), mid))[0];
    const at = playground ? centre(playground) : mid;
    // Best: hidden behind the tree nearest the playground, only a third peeking out.
    const tree = this.host.trees(at.x, at.y, 80 * PX_PER_M).sort((a, b) => dist(a, at) - dist(b, at))[0];
    if (tree) {
      // The crown is a circle of ~9 px around 13 px above the trunk's foot;
      // the piggy sits behind its middle with a third of it sticking out.
      const edge = tree.x + Math.min(9, tree.w / 2 - 2);
      const w = this.scene.textures.getFrame(TEX.piggy).width;
      return { x: edge - w / 2 + w / 3, y: tree.y - 12, behind: true };
    }
    const r = rng(hash('piggy'));
    // Try bushes within ~60 m of the playground, then the playground's edge.
    for (const want of [true, false]) {
      for (let t = 0; t < 600; t++) {
        const a = r() * Math.PI * 2;
        const d = r() * 60 * PX_PER_M;
        const x = at.x + Math.cos(a) * d;
        const y = at.y + Math.sin(a) * d;
        if (!this.city.isFree(x, y, 2, 2)) continue;
        if (want && !this.city.areaKindsAt(x, y).some((k) => HIDE_IN.has(k))) continue;
        return { x, y };
      }
    }
    return at;
  }

  /** Grandma Grażynka walks Kościelna nearest her village centre (made when its tiles are there). */
  private placeGrazynka(px: number, py: number, now: number) {
    const home = this.grazynkaHome;
    if (!home || now < this.grazynkaTry) return;
    this.grazynkaTry = now + 1000;
    const r = GRAZYNKA.miejscowosc.promienKm * 1000 * PX_PER_M;
    if (Math.hypot(px - home.x, py - home.y) > r + 1500 * PX_PER_M) return;
    const lines = this.city.lines
      .filter((l) => l.name === GRAZYNKA.ulica && l.pts.length >= 4 && Math.hypot(l.pts[0] - home.x, l.pts[1] - home.y) < r)
      .map((l) => l.pts);
    if (!lines.length) return;
    this.grazynkaHome = null;
    const w = new Walker(lines, GRAZYNKA.predkosc * PX_PER_M, this.r);
    const sprite = fixedSprite(this.scene, w.x, w.y, 'grazynka', TEX.hero, 0xc8e6a0);
    this.list.push({ id: 'grazynka', walker: w, sprite, x: w.x, y: w.y });
  }

  update(dt: number, px: number, py: number, now: number, visible: (x: number, y: number) => boolean) {
    this.placeGrazynka(px, py, now);
    this.placeLuigi(px, py, now);
    for (const w of this.list) {
      if (w.gone || !w.walker) continue;
      const near = Math.abs(w.x - px) < 500 && Math.abs(w.y - py) < 500;
      if (!near) {
        w.sprite.setVisible(false);
        continue;
      }
      const dx = w.walker.step(dt);
      const my = w.walker.y - w.y;
      w.x = w.walker.x;
      w.y = w.walker.y;
      w.sprite.setPosition(w.x, w.y).setDepth(w.y);
      // The dog is drawn facing right, people's side frame faces left; the artist's people walk by direction.
      if (w.sprite instanceof Phaser.GameObjects.Sprite && isHd(w.sprite.texture.key)) walkHd(w.sprite, dx, my);
      else if (dx && w.sprite instanceof Phaser.GameObjects.Sprite) w.sprite.setFrame('side-0').setFlipX(dx > 0);
      else if (dx) w.sprite.setFlipX(dx < 0);
      const v = visible(w.x, w.y);
      w.sprite.setVisible(v);
      if (w.label) {
        w.label.setPosition(w.x, w.y - 8).setDepth(1_050_000).setVisible(v);
        if (v && now > this.barkAt) {
          this.barkAt = now + 4000 + Math.random() * 5000;
          w.label.setText(tr(PIES.szczek)).setAlpha(1);
          this.scene.tweens.add({ targets: w.label, alpha: 0, delay: 1400, duration: 400 });
        }
      }
    }
    // The piggy: only once the dog asked for it.
    const st = this.state('npc-pies');
    if (this.piggyAt && st === 'active') {
      // Behind a tree: drawn just under the tree (trees are drawn at their trunk's y).
      if (!this.piggy) this.piggy = this.scene.add.image(this.piggyAt.x, this.piggyAt.y, TEX.piggy).setDepth(this.piggyAt.behind ? this.piggyAt.y + 11 : this.piggyAt.y);
      this.piggy.setVisible(visible(this.piggyAt.x, this.piggyAt.y));
      if (Math.hypot(px - this.piggyAt.x, py + 5 - this.piggyAt.y) < (this.piggyAt.behind ? 18 : 10)) {
        session.missions['npc-pies'] = 'goal';
        this.piggy.destroy();
        this.piggy = null;
        this.host.toast(tr(PIES.znaleziono), 2500);
      }
    }
  }

  /** The fixed character next to (x, y), if any. */
  at(x: number, y: number, radius: number) {
    return this.list.find((w) => !w.gone && Math.hypot(w.x - x, w.y - y) < radius);
  }

  /** Where the characters are (for the map screen and tests). */
  positions() {
    return this.list.filter((w) => !w.gone).map((w) => ({ id: w.id, x: w.x, y: w.y }));
  }

  piggySpot() {
    return this.piggyAt;
  }

  talk(w: Walking) {
    if (w.id === 'pies') return this.talkDog(w);
    if (w.id === 'margo') return this.talkMargo();
    if (w.id === 'grazynka') return this.talkGrazynka();
    if (w.id === 'luigi') return this.talkLuigi();
    if (w.id === 'martin') return this.talkMartin();
    return this.talkGrand();
  }

  private talkDog(w: Walking) {
    const st = this.state('npc-pies');
    const title = `🐕 ${tr(PIES.imie)}`;
    if (st === 'goal') {
      session.missions['npc-pies'] = 'done';
      this.host.gainExp(PIES.exp);
      this.host.dialog({ title, text: `${tr(PIES.podziekowanie)}\n\n+${PIES.exp} EXP`, buttons: [tx('Pa, piesku!', 'Bye, doggy!')], onChoose: () => {} });
      // Runs off happily and is gone for this character.
      w.gone = true;
      this.scene.tweens.add({ targets: [w.sprite, w.label!], x: w.x + 160, alpha: 0, duration: 1800, onComplete: () => { w.sprite.destroy(); w.label?.destroy(); } });
      this.host.save();
      return;
    }
    if (st === 'active') {
      this.host.dialog({ title, text: `${tr(PIES.szczek)}\n\n${tr(PIES.dalejSzuka)}`, buttons: ['OK'], onChoose: () => {} });
      return;
    }
    this.host.dialog({
      title,
      text: `${tr(PIES.szczek)}\n\n${tr(PIES.prosba)}`,
      buttons: [tx('Poszukam! 🔍', 'I will look for it! 🔍'), tx('Nie teraz', 'Not now')],
      onChoose: (i) => {
        if (i !== 0) return;
        session.missions['npc-pies'] = 'active';
        this.host.save();
      },
    });
  }

  /** Where to show a talk bubble: characters with something (a riddle, a request) for today. */
  important(): { x: number; y: number }[] {
    const day = today();
    const out: { x: number; y: number }[] = [];
    for (const w of this.list) {
      if (w.gone || !w.sprite.visible) continue;
      const d = session.daily[w.id];
      const a = d && d.d === day ? d.a : 0;
      const has =
        w.id === 'pies' ? this.state('npc-pies') !== 'done'
        : w.id === 'margo' ? a < MARGO.zagadekDziennie
        : w.id === 'grazynka' ? this.grazynkaStep() !== 'done' && this.grazynkaStep() !== 'sklep'
        : w.id === 'luigi' ? a < 3 || this.host.storyOn()
        : w.id === 'martin' ? this.host.storyOn() || this.state(MARTIN.zadanie.id) !== 'done'
        : a < 1;
      if (has) out.push({ x: w.x, y: w.y });
    }
    return out;
  }

  private daily(id: string) {
    const day = today();
    const d = session.daily[id];
    if (!d || d.d !== day) session.daily[id] = { d: day, n: 0, a: 0 };
    return session.daily[id];
  }

  // ---------------------------------------------------------------- Grandma Grażynka

  /** Where her quest stands. */
  grazynkaStep(): GrazynkaStep {
    const m = this.state('npc-grazynka');
    if (m === 'new') return 'new';
    if (m === 'done') return 'done';
    const t = session.missions['npc-grazynka-narzedzia'];
    if (!t) return 'owoce';
    return t === 'active' ? 'sklep' : t === 'goal' ? 'powrot' : 'zagadki';
  }

  /** A counter kept in the save for good (not reset daily). */
  private counter(id: string) {
    return (session.daily[id] ??= { d: '', n: 0, a: 0 });
  }

  /** Fruit she already got (they can be brought a bit at a time). */
  grazynkaFruit() {
    return this.counter('grazynka-owoce').n;
  }

  /** The shop with her garden tools: the one nearest her village centre. */
  grazynkaShop(): Place | null {
    const c = this.city.fromLatLon(GRAZYNKA.miejscowosc.lat, GRAZYNKA.miejscowosc.lon);
    const shops = this.city.places.filter((p) => p.kind === 'shop');
    return shops.reduce<Place | null>((a, p) => (!a || Math.hypot(p.door.x - c.x, p.door.y - c.y) < Math.hypot(a.door.x - c.x, a.door.y - c.y) ? p : a), null);
  }

  /** At the shop: take the tools (true if they were waiting there). */
  pickUpTools(): boolean {
    if (this.grazynkaStep() !== 'sklep') return false;
    session.missions['npc-grazynka-narzedzia'] = 'goal';
    this.host.save();
    return true;
  }

  /** Her quest for the quest log and arrows (null when there is nothing to do). */
  grazynkaQuest(): { text: string; pos: Pt | null } | null {
    const step = this.grazynkaStep();
    if (step === 'new' || step === 'done') return null;
    const her = this.list.find((w) => w.id === 'grazynka');
    const pos = her ? { x: her.x, y: her.y } : this.city.fromLatLon(GRAZYNKA.miejscowosc.lat, GRAZYNKA.miejscowosc.lon);
    if (step === 'owoce') {
      const n = this.grazynkaFruit() + groupCount('owoce');
      return { text: tx(`Owoce dla babci (${Math.min(n, GRAZYNKA.owocow)}/${GRAZYNKA.owocow})`, `Fruit for grandma (${Math.min(n, GRAZYNKA.owocow)}/${GRAZYNKA.owocow})`), pos: n >= GRAZYNKA.owocow ? pos : null };
    }
    if (step === 'sklep') {
      const shop = this.grazynkaShop();
      return { text: tx(`Odbierz narzędzia w sklepie${shop ? `: ${shop.name}` : ''}`, `Pick up the tools at the shop${shop ? `: ${shop.name}` : ''}`), pos: shop ? shop.door : pos };
    }
    if (step === 'powrot') return { text: tx('Zanieś narzędzia babci Grażynce', 'Take the tools to Grandma Grażynka'), pos };
    return { text: tx(`Zagadki babci (${this.counter('grazynka-zagadki').n}/${GRAZYNKA.zagadek})`, `Grandma's riddles (${this.counter('grazynka-zagadki').n}/${GRAZYNKA.zagadek})`), pos };
  }

  private talkGrazynka() {
    const title = `👵 ${tr(GRAZYNKA.imie)}`;
    const step = this.grazynkaStep();
    const say = (text: string, buttons = ['OK'], onChoose: (i: number) => void = () => {}) => this.host.dialog({ title, text, buttons, onChoose });
    if (step === 'new') {
      say(tr(GRAZYNKA.prosba), [tx('Przyniosę! 🍎', 'I will bring it! 🍎'), tx('Nie teraz', 'Not now')], (i) => {
        if (i !== 0 || this.host.questsFull()) return;
        session.missions['npc-grazynka'] = 'active';
        this.host.save();
        this.host.hud();
      });
      return;
    }
    if (step === 'owoce') {
      const got = this.counter('grazynka-owoce');
      const need = GRAZYNKA.owocow - got.n;
      const have = groupCount('owoce');
      if (!have) return say(`${tr(GRAZYNKA.jeszczeNie)} (${got.n}/${GRAZYNKA.owocow})`);
      const give = takeGroup('owoce', Math.min(need, have));
      got.n += give;
      if (got.n < GRAZYNKA.owocow) {
        this.host.save();
        this.host.hud();
        return say(tx(`Dziękuję za ${give} owoców! Mam już ${got.n} z ${GRAZYNKA.owocow}. Przynieś resztę, kochanie.`, `Thank you for ${give} pieces of fruit! I have ${got.n} of ${GRAZYNKA.owocow} now. Bring the rest, sweetie.`));
      }
      session.missions['npc-grazynka-narzedzia'] = 'active';
      this.host.gainExp(GRAZYNKA.expOwoce);
      this.host.save();
      return say(`${tr(GRAZYNKA.dziekujeOwoce)}\n\n+${GRAZYNKA.expOwoce} EXP`);
    }
    if (step === 'sklep') {
      const shop = this.grazynkaShop();
      return say(`${tr(GRAZYNKA.czekaNaNarzedzia)}${shop ? `\n\n🛒 ${shop.name}` : ''}`);
    }
    if (step === 'powrot') {
      session.missions['npc-grazynka-narzedzia'] = 'done';
      this.host.gainExp(GRAZYNKA.expNarzedzia);
      this.host.save();
      return say(`${tr(GRAZYNKA.dziekujeNarzedzia)}\n\n+${GRAZYNKA.expNarzedzia} EXP`, [tx('Pytaj, babciu!', 'Ask away, grandma!'), tx('Później', 'Later')], (i) => {
        if (i === 0) this.grazynkaRiddle();
      });
    }
    if (step === 'zagadki') return this.grazynkaRiddle();
    // Done: she buys fruit.
    const value = groupValue('owoce');
    if (!value) return say(tr(GRAZYNKA.brakOwocow));
    say(tr(GRAZYNKA.skup), [tx(`Sprzedaj owoce – ${value} monet`, `Sell fruit – ${value} coins`), tx('Nie teraz', 'Not now')], (i) => {
      if (i !== 0) return;
      const v = sellGroup('owoce');
      earn(v);
      this.host.save();
      this.host.hud();
      this.host.toast(tx(`Babcia Grażynka kupiła owoce za ${v} monet!`, `Grandma Grażynka bought your fruit for ${v} coins!`));
    });
  }

  /** Her next botany riddle (a wrong answer: another one next time). */
  private grazynkaRiddle() {
    const c = this.counter('grazynka-zagadki');
    const pool = GRAZYNKA.zagadki[levelForAge(session.age)];
    const order = [...pool.keys()].sort((a, b) => hash(`grazynka:${session.idik}:${a}`) - hash(`grazynka:${session.idik}:${b}`));
    const z = pool[order[(c.n + c.a) % pool.length]];
    const title = `👵 ${tr(GRAZYNKA.imie)}`;
    this.host.riddle(title, `${tr(GRAZYNKA.zagadkaWstep)} (${c.n + 1}/${GRAZYNKA.zagadek})`, z, 0, `grazynka:${c.n}:${c.a}`, (right) => {
      if (right) c.n++;
      else c.a++;
    }, {
      retry: true,
      then: (right) => {
        if (!right) return;
        if (c.n < GRAZYNKA.zagadek) return this.grazynkaRiddle();
        session.missions['npc-grazynka'] = 'done';
        earn(GRAZYNKA.nagroda.monety);
        this.host.gainExp(GRAZYNKA.nagroda.exp);
        this.host.save();
        this.host.dialog({ title, text: `${tr(GRAZYNKA.koniec)}\n\n+${GRAZYNKA.nagroda.monety} ${tx('monet', 'coins')}, +${GRAZYNKA.nagroda.exp} EXP`, buttons: ['OK'], onChoose: () => {} });
      },
    });
  }

  /** Luigi: 3 riddles a day (chess, then Pokémon or Magic, then the other one), one try each. */
  private talkLuigi() {
    const d = this.daily('luigi');
    const title = `♟ ${tr(LUIGI.imie)}`;
    const opts: [string, () => void][] = [];
    if (d.a < 3) opts.push([tx('🧩 Zagadka', '🧩 A riddle'), () => this.luigiRiddle()]);
    if (this.host.storyOn()) opts.push([tx('🐉 Zapytaj o cień', '🐉 Ask about the shadow'), () => this.host.dialog({ title, text: tr(LUIGI.cien), buttons: [tx('Gracias, Luigi!', 'Gracias, Luigi!')], onChoose: () => {} })]);
    opts.push([tx('🍺 Co słychać?', '🍺 What is new?'), () => this.host.dialog({ title, text: tr(LUIGI.tawerna), buttons: ['¡Adiós!'], onChoose: () => {} })]);
    this.host.dialog({
      title,
      text: d.a < 3 ? tr(LUIGI.powitanie) : tr(LUIGI.koniec),
      buttons: [...opts.map(([l]) => l), '¡Adiós!'],
      onChoose: (i) => opts[i]?.[1](),
    });
  }

  private luigiRiddle() {
    const d = this.daily('luigi');
    const title = `♟ ${tr(LUIGI.imie)}`;
    const h = hash(`luigi:${d.d}`);
    const cards = h % 2 ? [LUIGI.pokemony, LUIGI.magic] : [LUIGI.magic, LUIGI.pokemony];
    const pools = [LUIGI.szachy, cards[0], cards[1]];
    const pool = pools[d.a];
    const z = pool[(h >>> 3) % pool.length];
    this.host.riddle(title, `${tr(LUIGI.powitanie)} (${d.a + 1}/3)`, z, LUIGI.expZaZagadke, `luigi:${d.d}:${d.a}`, (right) => {
      d.a++;
      if (right) d.n++; // d.n = right answers today
    }, {
      then: () => {
        if (d.a === 3 && d.n === 3) {
          this.host.gainExp(LUIGI.premiaZaTrzy);
          this.host.save();
          this.host.dialog({ title, text: `${tr(LUIGI.brawoTrzy)}\n\n+${LUIGI.premiaZaTrzy} EXP`, buttons: ['¡Gracias!'], onChoose: () => {} });
        }
      },
    });
  }

  /** Martin's quest for the quest log (null when not taken or done). */
  martinQuest(): { text: string; pos: Pt | null } | null {
    const z = MARTIN.zadanie;
    if (this.state(z.id) !== 'active') return null;
    const n = fruitCount(z.towar);
    const him = this.list.find((w) => w.id === 'martin');
    return {
      text: n >= z.ile ? tx(`Zanieś drewno Martinowi (Irysowa)`, 'Take the wood to Martin (Irysowa)') : tx(`Drewno na smoczy kocioł (${n}/${z.ile})`, `Wood for the dragon cauldron (${n}/${z.ile})`),
      pos: n >= z.ile && him ? { x: him.x, y: him.y } : null,
    };
  }

  private martinTask(title: string) {
    const z = MARTIN.zadanie;
    const st = this.state(z.id);
    const t = `${title} – ${tr(z.tytul)}`;
    if (st === 'new') {
      this.host.dialog({
        title: t, text: `${tr(z.opis)}\n\n${tx('Nagroda', 'Reward')}: ${z.monety} ${tx('monet', 'coins')}, ${z.exp} EXP.`,
        buttons: [tx('Przyniosę drewno! 🪵', 'I will bring the wood! 🪵'), tx('Nie teraz', 'Not now')],
        onChoose: (i) => {
          if (i !== 0 || this.host.questsFull()) return;
          session.missions[z.id] = 'active';
          this.host.hud();
          this.host.save();
        },
      });
      return;
    }
    if (!takeFruit(z.towar, z.ile)) {
      this.host.dialog({ title: t, text: tx(`Potrzebuję ${z.ile} drewna – masz ${fruitCount(z.towar)}. Sosny w lesie dają kłody po kilku ciosach.`, `I need ${z.ile} wood – you have ${fruitCount(z.towar)}. Pines in the forest give logs after a few blows.`), buttons: ['OK'], onChoose: () => {} });
      return;
    }
    session.missions[z.id] = 'done';
    earn(z.monety);
    session.stats.missions++;
    this.host.gainExp(z.exp);
    this.host.save();
    this.host.dialog({ title: t, text: `${tr(z.zakonczenie)}\n\n+${z.monety} ${tx('monet', 'coins')}, +${z.exp} EXP`, buttons: [tx('Dziękuję!', 'Thank you!')], onChoose: () => {} });
  }

  private talkMartin() {
    const title = `🐉 ${tr(MARTIN.imie)}`;
    const opts: [string, () => void][] = [];
    if (this.state(MARTIN.zadanie.id) !== 'done') opts.push([`❄ ${tr(MARTIN.zadanie.tytul)}`, () => this.martinTask(title)]);
    if (this.host.storyOn()) opts.push([tx('🐉 Zapytaj o cień', '🐉 Ask about the shadow'), () => this.host.storyExpert(title, tr(MARTIN.cien), tr(MARTIN.pozniej))]);
    opts.push([tx('🍺 O tawernie', '🍺 About the tavern'), () => this.host.dialog({ title, text: tr(MARTIN.tawerna), buttons: [tx('Zajrzę!', 'I will drop in!')], onChoose: () => {} })]);
    this.host.dialog({ title, text: tr(MARTIN.powitanie), buttons: [...opts.map(([l]) => l), tx('Bywaj', 'Farewell')], onChoose: (i) => opts[i]?.[1]() });
  }

  private talkMargo() {
    const d = this.daily('margo');
    d.n++;
    const title = `✝ ${tr(MARGO.imie)}`;
    if (d.n < MARGO.zagadkaZaRazem) {
      this.host.dialog({ title, text: tr(MARGO.zbywa[Math.min(d.n - 1, MARGO.zbywa.length - 1)]), buttons: ['OK'], onChoose: () => {} });
      return;
    }
    if (d.a >= MARGO.zagadekDziennie) {
      this.host.dialog({ title, text: tr(MARGO.koniec), buttons: ['OK'], onChoose: () => {} });
      return;
    }
    // First the winter riddle, then good manners (different ones each day).
    const r = rng(hash(`margo:${d.d}`));
    const pool = [...MARGO.maniery].sort(() => r() - 0.5);
    const z = d.a === 0 ? MARGO.pierwsza : pool[(d.a - 1) % pool.length];
    this.host.riddle(title, tx('No dobrze, dziecko. Powiedz mi…', 'All right, child. Tell me…'), z, MARGO.exp, `margo:${d.d}:${d.a}`, () => {
      d.a++;
    });
  }

  private talkGrand() {
    const who = DZIADKOWIE.osoby[this.grandIndex];
    const d = this.daily('dziadkowie');
    const title = `${this.grandIndex === 0 ? '👴' : '👵'} ${tr(who.imie)}`;
    if (d.a >= 1) {
      this.host.dialog({ title, text: tr(DZIADKOWIE.jutro), buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const z = DZIADKOWIE.zagadki[hash(`dziadkowie-z:${d.d}`) % DZIADKOWIE.zagadki.length];
    this.host.riddle(title, tr(who.powitanie), z, DZIADKOWIE.exp, `dziadkowie:${d.d}`, () => {
      d.a++;
    });
  }
}

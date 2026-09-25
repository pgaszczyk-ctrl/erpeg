import Phaser from 'phaser';
import { TEX } from '../art';
import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import { rng } from '../rng';
import { tr, tx } from '../i18n';
import { PIES, MARGO, DZIADKOWIE, type ZagadkaPL } from '../content/postacie';
import { session, type MissionState } from '../quests';
import { today } from './Npcs';

// The fixed characters from content/postacie.ts: a dog on Guliwera/Cyda that
// lost its piggy, Sister Margo on Orlanda and Grandpa Marek or Grandma Iwonka
// by Śnieżyńskiego 19–27. They stroll slowly along their streets.

export interface FixedHost {
  dialog(req: { title: string; text: string; buttons: string[]; onChoose: (i: number) => void }): void;
  toast(text: string, ms?: number): void;
  riddle(title: string, intro: string, z: ZagadkaPL, exp: number, seed: string, after: (right: boolean) => void): void;
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
class Walker {
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

  constructor(private scene: Phaser.Scene, private city: CityMap, private host: FixedHost) {
    const streetLines = (names: string[]) =>
      city.lines.filter((l) => l.name && names.includes(l.name) && l.pts.length >= 4).map((l) => l.pts);

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
      const sprite = scene.add.sprite(w.x, w.y, TEX.hero, 'down-0').setTint(0x9a9aa6);
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
      const sprite = scene.add.sprite(w.x, w.y, TEX.hero, 'down-0').setTint(this.grandIndex === 0 ? 0xb8c8e0 : 0xf2b8d8);
      this.list.push({ id: 'dziadkowie', walker: w, sprite, x: w.x, y: w.y });
    }
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

  update(dt: number, px: number, py: number, now: number, visible: (x: number, y: number) => boolean) {
    for (const w of this.list) {
      if (w.gone || !w.walker) continue;
      const near = Math.abs(w.x - px) < 500 && Math.abs(w.y - py) < 500;
      if (!near) {
        w.sprite.setVisible(false);
        continue;
      }
      const dx = w.walker.step(dt);
      w.x = w.walker.x;
      w.y = w.walker.y;
      w.sprite.setPosition(w.x, w.y).setDepth(w.y);
      // The dog is drawn facing right, people's side frame faces left.
      if (dx && w.sprite instanceof Phaser.GameObjects.Sprite) w.sprite.setFrame('side-0').setFlipX(dx > 0);
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

  private daily(id: string) {
    const day = today();
    const d = session.daily[id];
    if (!d || d.d !== day) session.daily[id] = { d: day, n: 0, a: 0 };
    return session.daily[id];
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

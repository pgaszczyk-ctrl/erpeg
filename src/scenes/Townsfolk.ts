import { tr } from '../i18n';
import Phaser from 'phaser';
import { hdOn, isHd, fitHd, hdFolkLooks, personOf, ensureHd } from '../sprites';
import { HERO_DIRS, makeLookTexture, redOutline } from '../art';
import { PX_PER_M, distToPolyline, type CityMap, type Line } from '../map/CityMap';
import { MIESZKANCY } from '../content/mieszkancy';
import { GAZETA } from '../content/gazeta';
import { LUDZIE_W_DESZCZU } from '../content/pogoda';
import { rng } from '../rng';
import { rownolegla } from '../gen';
import { Walker } from './FixedNpcs';

// People strolling along the cobbled (car) streets: 2 per 200 m. Most only
// say hello; some challenge the hero to a duel or accept one (GameScene).
// They are made per 1 km square near the hero, always the same ones.

export type FolkRole = 'wita' | 'wyzywa' | 'przyjmuje' | 'gazeciarz';

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
  /** Waiting for the hero to bring back what imps stole (stands still). */
  waiting?: boolean;
  /** An umbrella over the head in the rain (drawn by code until the artist's one). */
  umbrella?: Phaser.GameObjects.Graphics;
  /** A newsboy's rolled-paper sign over the head. */
  sign?: Phaser.GameObjects.Image;
}

/** Night by the phone's clock (fewer people, more monsters). */
export function isNight(d = new Date()) {
  const h = d.getHours();
  const n = MIESZKANCY.noc;
  return n.od > n.do ? h >= n.od || h < n.do : h >= n.od && h < n.do;
}

const PAVED = new Set(['major', 'medium', 'minor']);
const LOOKS = 10;
/** With the new characters: every hero in every clothes colour. */
const HD_LOOKS = hdOn ? hdFolkLooks() : [];
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
    // A few looks to share (drawn like the hero). The new characters are made in sprites.ts.
    if (hdOn) return;
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
    // Villages have few places but many houses: count those too.
    const houses = this.city.addressed().filter((b) => b.x0 >= box.x0 && b.x0 < box.x1 && b.y0 >= box.y0 && b.y0 < box.y1).length;
    const village = MIESZKANCY.wsie.find((d) => houses >= d.domow)?.mnoznik ?? 0;
    const district = Math.max(village, MIESZKANCY.dzielnice.find((d) => places >= d.miejsc)?.mnoznik ?? 0.25);
    const share = district * (isNight() ? MIESZKANCY.noc.ludzi : 1);
    const q = this.city.query(box);
    const tory = q.lines.filter((t) => t.kind === 'tram' || t.kind === 'rail');
    for (const l of q.lines) {
      if (!PAVED.has(l.kind) || l.pts.length < 4) continue;
      if (l.pts[0] < box.x0 || l.pts[0] >= box.x1 || l.pts[1] < box.y0 || l.pts[1] >= box.y1) continue;
      const want = (lengthM(l) / 200) * MIESZKANCY.na200m * share;
      const n = Math.floor(want) + (r() < want % 1 ? 1 : 0);
      // A street with tram rails along it (Kraków): people walk on its side, not on the rails (owner, 7 Oct 2026).
      let mid = 0;
      for (let i = 0; i + 1 < l.pts.length; i += 2) if (tory.some((t) => distToPolyline(t.pts, l.pts[i], l.pts[i + 1]) < 3 * PX_PER_M)) mid++;
      const zTorami = tory.length > 0 && mid * 2 >= l.pts.length / 2;
      for (let i = 0; i < n; i++) {
        const pts = zTorami ? rownolegla(l.pts, (r() < 0.5 ? -1 : 1) * (l.width / 2 + PX_PER_M)) : l.pts;
        const walker = new Walker([pts], SPEED * (0.7 + r() * 0.6), r);
        const roll = r();
        const role: FolkRole = roll < MIESZKANCY.tylkoWita ? 'wita' : roll < MIESZKANCY.tylkoWita + MIESZKANCY.wyzywa ? 'wyzywa' : 'przyjmuje';
        const tex = hdOn ? HD_LOOKS[Math.floor(r() * HD_LOOKS.length)] : `folk${Math.floor(r() * LOOKS)}`;
        // A name that fits the look (a woman isn't "Pan Rysiek", a boy isn't "Pani Ewa").
        const who = personOf(tex);
        const names = who?.plec ? MIESZKANCY.imionaWg[who.plec][who.wiek ?? 'dorosly'] : MIESZKANCY.imiona;
        list.push({
          id: `${key}:${list.length}`, role, walker, x: walker.x, y: walker.y,
          name: names[Math.floor(r() * names.length)],
          tex,
        });
      }
    }
    // Newsboys (owner, 11 Oct 2026): in every town, more of them where there are more places.
    const papers = GAZETA.ilu.find((g) => places >= g.miejsc)?.ile ?? 0;
    const streets = q.lines.filter((l) => PAVED.has(l.kind) && l.pts.length >= 4 && l.pts[0] >= box.x0 && l.pts[0] < box.x1 && l.pts[1] >= box.y0 && l.pts[1] < box.y1)
      .sort((a, b) => lengthM(b) - lengthM(a));
    const rp = rng(hash(`${this.city.id}:gazeta:${key}`));
    for (let i = 0; i < papers && streets.length; i++) {
      const l = streets[Math.min(streets.length - 1, Math.floor(rp() * Math.min(streets.length, 6)))];
      const walker = new Walker([l.pts], SPEED * 0.9, rp);
      // They stand on a corner (the artist's trial has standing frames only): somewhere along the street.
      walker.step(rp() * 120);
      list.push({
        id: `${key}:gazeta${i}`, role: 'gazeciarz', walker, x: walker.x, y: walker.y,
        name: tr(GAZETA.imiona[Math.floor(rp() * GAZETA.imiona.length)]),
        tex: hdOn ? GAZETA.wyglad : `folk${Math.floor(rp() * LOOKS)}`,
      });
    }
    list.push(...(this.extra.get(key) ?? []));
    this.extra.delete(key);
    this.cells.set(key, list);
    return list;
  }

  /**
   * A newsboy placed on purpose (owner, 11 Oct 2026: the demo's wake-up in front of Targi Lublin gets one
   * close by, so the player is curious at once). Joins that square's people; the square must be loaded.
   */
  newsboyAt(x: number, y: number) {
    const key = `${Math.floor(x / CELL)}:${Math.floor(y / CELL)}`;
    const id = `${key}:gazeta-demo`;
    const walker = new Walker([[x, y, x + 1, y]], 0, rng(hash(id)));
    walker.x = x;
    walker.y = y;
    const f: Folk = {
      id, role: 'gazeciarz', walker, x, y,
      name: tr(GAZETA.imiona[hash(id) % GAZETA.imiona.length]),
      tex: hdOn ? GAZETA.wyglad : 'folk0',
    };
    // The square's people may not be made yet (its tiles still loading): then he joins them when they are.
    const list = this.cells.get(key);
    if (list) { if (!list.some((g) => g.id === id)) list.push(f); }
    else this.extra.set(key, [...(this.extra.get(key) ?? []).filter((g) => g.id !== id), f]);
    this.next = 0;
  }
  /** People placed on purpose in squares not made yet (newsboyAt). */
  private extra = new Map<string, Folk[]>();

  /** A small rolled newspaper drawn by code (until the artist's newsboy, order 32). */
  private paperTexture() {
    const key = 'gazeta-znak';
    if (this.scene.textures.exists(key)) return key;
    const c = document.createElement('canvas');
    c.width = 14; c.height = 11;
    const g = c.getContext('2d')!;
    const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    px(1, 1, 12, 9, '#1e1a24');
    px(2, 2, 10, 7, '#efe4c4');
    px(3, 3, 8, 1, '#1e1a24');
    for (const y of [5, 7]) { px(3, y, 3, 1, '#7a6a55'); px(7, y, 4, 1, '#7a6a55'); }
    px(2, 2, 10, 1, '#ffffff');
    this.scene.textures.addCanvas(key, c);
    return key;
  }

  /** The weather changed: people strolling around are made again (fewer and with umbrellas in the rain, or back out after it). */
  rethink() {
    for (const f of [...this.active]) {
      if (f.away || f.waiting || f.route || f.gone) continue;
      f.sprite?.destroy();
      f.sprite = undefined;
      f.umbrella?.destroy();
      f.umbrella = undefined;
      f.sign?.destroy();
      f.sign = undefined;
      this.active.delete(f);
    }
    this.next = 0;
  }

  /** Is it raining now (set by GameScene from the weather). */
  wet: () => boolean = () => false;

  /** A simple open umbrella seen a little from above (placeholder until the artist's picture). */
  private makeUmbrella(seed: number) {
    const C = LUDZIE_W_DESZCZU.kolory;
    const col = C[seed % C.length];
    const g = this.scene.add.graphics();
    // Canopy viewed from above: cover the head and shoulders, leave the legs visible.
    g.lineStyle(1, 0x1e1a24, 1).lineBetween(2, 0, 4, 9);
    const points = [[-9,0],[-6,-4],[0,-6],[6,-4],[9,0],[6,4],[0,6],[-6,4]].map(([x,y]) => new Phaser.Math.Vector2(x,y));
    g.fillStyle(col, 1).fillPoints(points, true);
    g.fillStyle(0x1e1a24, 0.25).fillPoints(points.slice(2, 7), true);
    g.lineStyle(0.6, 0x1e1a24, 0.8).strokePoints(points, true);
    for (const p of points) g.lineBetween(0, 0, p.x, p.y);
    g.fillStyle(0xe8e0d0, 1).fillRect(-0.5, -0.5, 1, 1);
    return g;
  }

  update(dt: number, px: number, py: number, now: number, visible: (x: number, y: number) => boolean) {
    if (now >= this.next) {
      this.next = now + 500;
      for (const f of [...this.active]) {
        if (Math.abs(f.x - px) < NEAR * 1.5 && Math.abs(f.y - py) < NEAR * 1.5) continue;
        f.sprite?.destroy();
        f.sprite = undefined;
        f.umbrella?.destroy();
        f.umbrella = undefined;
        f.sign?.destroy();
        f.sign = undefined;
        this.active.delete(f);
      }
      // The rain stopped: umbrellas closed.
      if (!this.wet()) for (const f of this.active) if (f.umbrella) { f.umbrella.destroy(); f.umbrella = undefined; }
      const c0x = Math.floor((px - NEAR) / CELL), c1x = Math.floor((px + NEAR) / CELL);
      const c0y = Math.floor((py - NEAR) / CELL), c1y = Math.floor((py + NEAR) / CELL);
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          for (const f of this.folkOf(cx, cy)) {
            if (this.active.has(f) || Math.abs(f.x - px) > NEAR || Math.abs(f.y - py) > NEAR) continue;
            // In the rain fewer people are out (always the same ones stay at home).
            const wet = this.wet();
            if (wet && f.role !== 'gazeciarz' && (hash(`${f.id}:deszcz`) % 1000) / 1000 >= LUDZIE_W_DESZCZU.ilu && !f.waiting) continue;
            if (isHd(f.tex)) f.tex = ensureHd(this.scene, f.tex);
            f.sprite = this.scene.add.sprite(f.x, f.y, f.tex, 'down-0').setOrigin(0.5, 0.6);
            if (isHd(f.tex)) fitHd(f.sprite);
            if (wet && (hash(`${f.id}:parasol`) % 1000) / 1000 < LUDZIE_W_DESZCZU.parasol) f.umbrella = this.makeUmbrella(hash(f.id));
            if (f.role === 'gazeciarz') f.sign = this.scene.add.image(f.x, f.y, this.paperTexture()).setScale(0.5);
            this.active.add(f);
          }
        }
      }
    }
    const fearR = MIESZKANCY.strachPrzedSmokiem * PX_PER_M;
    for (const f of this.active) {
      if (f.away || f.gone || !f.sprite) {
        f.umbrella?.setVisible(false);
        f.sign?.setVisible(false);
        continue;
      }
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
      } else if (f.role === 'gazeciarz') {
        // A newsboy stands still and turns towards the hero (front, or the side mirrored).
        const s = f.sprite;
        const hx = px - f.x, hy = py - f.y;
        const near = Math.hypot(hx, hy) < 160;
        const side = near && Math.abs(hx) > Math.abs(hy) * 1.2;
        // Hero to the north: the newsboy turns his back to us (up-0 = the front copy until the artist's back frame).
        s.anims.stop();
        s.setFrame(side ? 'side-0' : near && hy < 0 ? 'up-0' : 'down-0').setFlipX(side && hx > 0);
        s.setPosition(f.x, f.y).setDepth(f.y).setVisible(visible(f.x, f.y));
        f.sign?.setPosition(Math.round(f.x), Math.round(f.y - s.displayHeight * s.originY - 3 + Math.sin(now / 260) * 0.8)).setDepth(1_150_000).setVisible(s.visible);
        continue;
      } else if (!f.waiting) {
        f.walker.step(dt);
        f.x = f.walker.x;
        f.y = f.walker.y;
      }
      const scared = !!this.fear && Math.hypot(f.x - this.fear.x, f.y - this.fear.y) < fearR;
      const dx = f.x - ox, dy = f.y - oy;
      const s = f.sprite;
      s.setPosition(f.x, f.y).setDepth(f.y).setVisible(!scared && visible(f.x, f.y));
      const canopyY = f.y - s.displayHeight * s.originY + s.displayHeight * 0.3;
      f.umbrella?.setPosition(f.x, canopyY).setDepth(s.depth + 0.5).setAlpha(s.alpha).setVisible(s.visible && s.alpha > 0.5);
      // The newsboy's paper sign bobs over the head (above the fog like the talk bubbles).
      f.sign?.setPosition(Math.round(f.x), Math.round(f.y - s.displayHeight * s.originY - 3 + Math.sin(now / 260) * 0.8)).setDepth(1_150_000).setVisible(s.visible);
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

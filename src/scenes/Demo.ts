import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { SEN, JAWA_SEKUND, DEMO_TEKSTY } from '../content/demo';
import { demo, dreamPlaces, blackout, bigText, finale, wakeUp } from '../demo';
import { session } from '../quests';
import { meleeDamage, totalFruit } from '../inventory';
import type { Slime } from '../objects/Slime';
import type { Player } from '../objects/Player';
import type { Orchards, FruitTree } from './Ambient';
import type { DialogRequest } from './GameScene';

// The QR demo inside the game (the phases are described in src/demo.ts):
// fruit trees by the start, the goal line and arrow, the "I know who I am!"
// moment, the Wawel dragon (stays close, backs off after two blows and spits
// fire), the blackout, the walk after waking up and the dimmed end.

export interface DemoHost {
  player: Player;
  city: CityMap;
  orchards: Orchards;
  dialog: (req: DialogRequest) => void;
  toast: (text: string, ms?: number) => void;
  spawnDragon: (x: number, y: number) => Slime;
  /** A fireball reached the hero. */
  hurt: (from: Phaser.Math.Vector2, damage: number) => void;
  hud: () => void;
}

const FIRE_TEX = 'demo-fireball';

export class DemoRun {
  /** The hero stands still (a big moment on screen). */
  busy = false;
  /** Nothing moves any more (the blackout, the end). */
  frozen = false;
  private trees: FruitTree[] = [];
  private healTo = 0;
  private dragon: Slime | null = null;
  private dragonSpot: { x: number; y: number } | null = null;
  private hpSeen = 0;
  private blows = 0;
  private mode: 'czeka' | 'idzie' | 'cofa' | 'pauza' = 'czeka';
  private modeUntil = 0;
  private balls: { img: Phaser.GameObjects.Image; vx: number; vy: number; left: number }[] = [];
  private endsAt = 0;

  constructor(private scene: Phaser.Scene, private host: DemoHost) {}

  start() {
    this.fireTexture();
    const p = this.host.player;
    if (demo.phase === 'jedzenie') {
      this.plantTrees();
      this.healTo = p.hp + 2;
      this.scene.time.delayedCall(600, () =>
        this.host.dialog({ title: DEMO_TEKSTY.przebudzenieTytul, text: DEMO_TEKSTY.przebudzenie, buttons: ['Rozejrzę się'], onChoose: () => {} }),
      );
    } else if (demo.phase === 'jawa') {
      blackout(false, 900);
      const miasto = demo.pobudka?.miasto ?? '';
      this.scene.time.delayedCall(900, () =>
        this.host.dialog({
          title: DEMO_TEKSTY.pobudkaTytul,
          text: DEMO_TEKSTY.pobudka(miasto),
          buttons: ['Rozejrzę się'],
          onChoose: () => (this.endsAt = this.scene.time.now + JAWA_SEKUND * 1000),
        }),
      );
    }
  }

  /** The goal line and where its arrow points. */
  goal(): { text: string; pos: { x: number; y: number } | null } | null {
    const p = this.host.player;
    if (this.busy) return null;
    if (demo.phase === 'jedzenie') {
      const n = SEN.owocowNaSerce;
      if (totalFruit() >= n) return { text: DEMO_TEKSTY.celZjedz, pos: null };
      const left = this.trees.filter((t) => t.left > 0);
      const near = left.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      return { text: DEMO_TEKSTY.celZbierz(totalFruit(), n), pos: near ? { x: near.x, y: near.y } : null };
    }
    if (demo.phase === 'smok' && this.dragonSpot) {
      const d = this.dragon;
      return { text: DEMO_TEKSTY.celSmok, pos: d && d.active && !d.isDead ? { x: d.x, y: d.y } : this.dragonSpot };
    }
    if (demo.phase === 'jawa' && this.endsAt) {
      return { text: DEMO_TEKSTY.celJawa(Math.max(0, Math.ceil((this.endsAt - this.scene.time.now) / 1000))), pos: null };
    }
    return null;
  }

  update(now: number, dt: number) {
    if (this.frozen) return;
    if (demo.phase === 'jedzenie' && !this.busy && this.host.player.hp >= this.healTo) this.remember();
    if (this.dragon) this.dragonFight(now);
    this.updateBalls(now, dt);
    if (demo.phase === 'jawa' && this.endsAt && now >= this.endsAt) {
      demo.phase = 'koniec';
      this.frozen = true;
      this.host.player.vel.set(0, 0);
      this.host.player.anims.stop();
      finale();
    }
  }

  /** The hero died in the dream: it was only a dream. Returns true if the demo took care of it. */
  onDeath() {
    if (demo.phase !== 'jedzenie' && demo.phase !== 'smok') return false;
    this.scene.time.delayedCall(900, () => this.sleep());
    return true;
  }

  isDragon(e: Slime) {
    return e === this.dragon;
  }

  onDragonKilled() {
    this.dragon = null;
    for (const b of this.balls) b.img.destroy();
    this.balls = [];
    bigText(DEMO_TEKSTY.smokPokonany, 1800);
    this.scene.time.delayedCall(2000, () => this.sleep());
  }

  // ------------------------------------------------------------ the dream

  private plantTrees() {
    const p = this.host.player;
    const { ile, owocow, odM, doM } = SEN.drzewa;
    for (let i = 0, tries = 0; i < ile && tries < 400; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = (odM + Math.random() * (doM - odM)) * PX_PER_M;
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      if (!this.host.city.isFree(x, y, 6, 6) || (tries < 300 && this.host.city.roadAt(x, y))) continue;
      if (this.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 16)) continue;
      this.trees.push(this.host.orchards.plant(x, y, 'jablko', owocow));
      i++;
    }
  }

  /** Healed: "!", the screen shakes, "OOooo, już wiem kim jestem!" – then the dragon. */
  private remember() {
    this.busy = true;
    const p = this.host.player;
    p.vel.set(0, 0);
    p.anims.stop();
    const ex = this.scene.add.image(p.x, p.y - 24, TEX.exclaim).setDepth(1_300_000);
    this.scene.tweens.add({ targets: ex, y: ex.y - 3, duration: 200, yoyo: true, repeat: 5 });
    this.scene.cameras.main.shake(600, 0.012);
    bigText(DEMO_TEKSTY.olsnienie, 2600);
    this.scene.time.delayedCall(2800, () => {
      ex.destroy();
      this.busy = false;
      demo.phase = 'smok';
      this.placeDragon();
      this.host.toast(DEMO_TEKSTY.kimJestem(session.name), 4500);
      this.host.hud();
    });
  }

  private placeDragon() {
    const { smok } = dreamPlaces();
    const at = this.host.city.fromLatLon(smok.lat, smok.lon);
    this.host.city.ensure(at.x, at.y, 200 * PX_PER_M).catch(() => {});
    const spot = this.host.city.freeNear(at.x, at.y);
    this.dragonSpot = spot;
    const d = this.host.spawnDragon(spot.x, spot.y);
    d.hp = SEN.ciosow * meleeDamage();
    d.heavy = true;
    d.brain = () => {};
    this.hpSeen = d.hp;
    this.dragon = d;
  }

  /** Stays at sword's length; after every two blows backs off and spits fireballs. */
  private dragonFight(now: number) {
    const d = this.dragon!;
    if (!d.active || d.isDead) return;
    const p = this.host.player;
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (d.hp < this.hpSeen) {
      this.hpSeen = d.hp;
      this.blows++;
      if (this.blows % SEN.ciosyDoOgnia === 0) {
        this.mode = 'cofa';
        this.modeUntil = now + 650;
      }
    }
    const speed = d.kind.chaseSpeed * 1.2;
    if (this.mode === 'czeka') {
      d.vel.set(0, 0);
      if (dist < 160) this.mode = 'idzie';
    } else if (this.mode === 'idzie') {
      if (dist > d.size + 4) d.vel.set((dx / dist) * speed, (dy / dist) * speed);
      else d.vel.set(0, 0);
    } else if (this.mode === 'cofa') {
      d.vel.set((-dx / dist) * 110, (-dy / dist) * 110);
      if (now >= this.modeUntil) {
        d.vel.set(0, 0);
        this.spit(d, dx / dist, dy / dist);
        this.mode = 'pauza';
        this.modeUntil = now + 800;
      }
    } else if (now >= this.modeUntil) this.mode = 'idzie';
    else d.vel.set(0, 0);
  }

  private spit(d: Slime, ux: number, uy: number) {
    const { ile, rozrzutStopni, predkosc } = SEN.kule;
    const base = Math.atan2(uy, ux);
    for (let i = 0; i < ile; i++) {
      const a = base + (((i - (ile - 1) / 2) * rozrzutStopni) * Math.PI) / 180;
      const img = this.scene.add.image(d.x, d.y - 8, FIRE_TEX).setDepth(1_200_000);
      this.balls.push({ img, vx: Math.cos(a) * predkosc, vy: Math.sin(a) * predkosc, left: 2.2 });
    }
    this.scene.cameras.main.shake(150, 0.004);
  }

  private updateBalls(now: number, dt: number) {
    const p = this.host.player;
    this.balls = this.balls.filter((b) => {
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      b.img.rotation += dt * 8;
      b.left -= dt;
      if (Math.hypot(b.img.x - p.x, b.img.y - (p.y - 2)) < 8) {
        this.host.hurt(new Phaser.Math.Vector2(b.img.x, b.img.y), SEN.kule.obrazenia);
        b.img.destroy();
        return false;
      }
      if (b.left <= 0 || this.host.city.isBlocked(b.img.x, b.img.y)) {
        b.img.destroy();
        return false;
      }
      return true;
    });
    void now;
  }

  /** Blackout, then waking up for real where the QR code sends. */
  private sleep() {
    if (this.frozen) return;
    this.frozen = true;
    this.host.player.vel.set(0, 0);
    blackout(true, 700);
    this.scene.time.delayedCall(2000, () => {
      wakeUp(this.scene).catch(() => {
        // The map didn't load: at least show the end.
        blackout(false);
        demo.phase = 'koniec';
        finale();
      });
    });
  }

  private fireTexture() {
    if (this.scene.textures.exists(FIRE_TEX)) return;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x1e1a24, 1).fillCircle(5, 5, 5);
    g.fillStyle(0xe43b44, 1).fillCircle(5, 5, 4);
    g.fillStyle(0xf7a531, 1).fillCircle(5, 5, 2.8);
    g.fillStyle(0xfff3a0, 1).fillCircle(5, 5, 1.4);
    g.generateTexture(FIRE_TEX, 10, 10);
    g.destroy();
  }
}

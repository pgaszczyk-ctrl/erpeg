import Phaser from 'phaser';
import type { Slime } from './Slime';
import type { Player } from './Player';

// How a dragon fights (the story's dragon and the QR demo's Wawel dragon):
// it walks up slowly and claws at sword's length; after every two blows it
// takes it quickly backs off and breathes fire three times, three balls each;
// then it comes back for more.

export const SMOK = {
  /** Walking up (px/s) – a bit slower than before. */
  predkosc: 15,
  /** Backing off after two blows: speed (px/s) and how long (ms). */
  ucieczka: { predkosc: 85, ms: 800 },
  /** Blows it takes before backing off. */
  ciosyDoOgnia: 2,
  /** Claw: reach beyond its body (px), wind-up (ms) and pause between strikes (ms), damage in half-hearts. */
  pazur: { zasieg: 8, zamach: 380, przerwa: 900, obrazenia: 2 },
  /** Fire: volleys, balls per volley, spread (degrees), gap between volleys (ms), speed (px/s), damage in half-hearts. */
  ogien: { serii: 3, kul: 3, rozrzut: 18, przerwa: 550, predkosc: 80, obrazenia: 2 },
};

export interface DragonHost {
  player: Player;
  /** The hero was hit by a claw or a fireball. */
  hurt: (from: Phaser.Math.Vector2, halfHearts: number) => void;
  blocked: (x: number, y: number) => boolean;
}

const FIRE_TEX = 'dragon-fireball';

export class DragonBrain {
  private mode: 'podchodzi' | 'zamach' | 'ucieka' | 'zieje' = 'podchodzi';
  private until = 0;
  private nextClaw = 0;
  private volleys = 0;
  private hpSeen: number;
  private blows = 0;
  private balls: { img: Phaser.GameObjects.Image; vx: number; vy: number; left: number }[] = [];

  constructor(private scene: Phaser.Scene, readonly d: Slime, private host: DragonHost) {
    this.hpSeen = d.hp;
    d.heavy = true;
    d.brain = () => {};
    fireTexture(scene);
  }

  update(now: number, dt: number) {
    this.updateBalls(dt);
    const d = this.d;
    if (!d.active || d.isDead) return;
    const p = this.host.player;
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    d.chasing = true;
    if (d.hp < this.hpSeen) {
      this.hpSeen = d.hp;
      if (++this.blows % SMOK.ciosyDoOgnia === 0) {
        this.mode = 'ucieka';
        this.until = now + SMOK.ucieczka.ms;
      }
    }
    const reach = d.size + SMOK.pazur.zasieg;
    if (this.mode === 'podchodzi') {
      if (dist > reach - 2) d.vel.set(ux * SMOK.predkosc, uy * SMOK.predkosc);
      else d.vel.set(0, 0);
      if (dist < reach && now >= this.nextClaw) {
        // Wind-up: the dragon flashes, then strikes where the hero was.
        this.mode = 'zamach';
        this.until = now + SMOK.pazur.zamach;
        d.setTint(0xffb0a0);
      }
    } else if (this.mode === 'zamach') {
      d.vel.set(0, 0);
      if (now >= this.until) {
        d.clearTint();
        if (dist < reach + 3) {
          this.host.hurt(new Phaser.Math.Vector2(d.x, d.y), SMOK.pazur.obrazenia);
          this.slash(d.x + ux * d.size, d.y + uy * d.size, Math.atan2(uy, ux));
        }
        this.nextClaw = now + SMOK.pazur.przerwa;
        this.mode = 'podchodzi';
      }
    } else if (this.mode === 'ucieka') {
      d.clearTint();
      d.vel.set(-ux * SMOK.ucieczka.predkosc, -uy * SMOK.ucieczka.predkosc);
      if (now >= this.until) {
        this.mode = 'zieje';
        this.volleys = 0;
        this.until = now;
      }
    } else {
      d.vel.set(0, 0);
      if (now >= this.until) {
        this.spit(ux, uy);
        this.until = now + SMOK.ogien.przerwa;
        if (++this.volleys >= SMOK.ogien.serii) {
          this.mode = 'podchodzi';
          this.nextClaw = now + SMOK.ogien.przerwa;
        }
      }
    }
  }

  destroy() {
    for (const b of this.balls) b.img.destroy();
    this.balls = [];
  }

  private spit(ux: number, uy: number) {
    const { kul, rozrzut, predkosc } = SMOK.ogien;
    const base = Math.atan2(uy, ux);
    for (let i = 0; i < kul; i++) {
      const a = base + ((i - (kul - 1) / 2) * rozrzut * Math.PI) / 180;
      const img = this.scene.add.image(this.d.x, this.d.y - 8, FIRE_TEX).setDepth(1_200_000);
      this.balls.push({ img, vx: Math.cos(a) * predkosc, vy: Math.sin(a) * predkosc, left: 2.4 });
    }
    this.scene.cameras.main.shake(120, 0.003);
  }

  private updateBalls(dt: number) {
    const p = this.host.player;
    this.balls = this.balls.filter((b) => {
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      b.img.rotation += dt * 8;
      b.left -= dt;
      if (Math.hypot(b.img.x - p.x, b.img.y - (p.y - 2)) < 8) {
        this.host.hurt(new Phaser.Math.Vector2(b.img.x, b.img.y), SMOK.ogien.obrazenia);
        b.img.destroy();
        return false;
      }
      if (b.left <= 0 || this.host.blocked(b.img.x, b.img.y)) {
        b.img.destroy();
        return false;
      }
      return true;
    });
  }

  /** Three claw marks where the strike landed. */
  private slash(x: number, y: number, a: number) {
    const g = this.scene.add.graphics().setDepth(1_200_000);
    g.lineStyle(2, 0xffffff, 1);
    for (let i = -1; i <= 1; i++) {
      const ox = Math.cos(a + Math.PI / 2) * i * 4;
      const oy = Math.sin(a + Math.PI / 2) * i * 4;
      g.lineBetween(x + ox - Math.cos(a) * 5, y + oy - Math.sin(a) * 5, x + ox + Math.cos(a) * 5, y + oy + Math.sin(a) * 5);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }
}

function fireTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(FIRE_TEX)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1e1a24, 1).fillCircle(5, 5, 5);
  g.fillStyle(0xe43b44, 1).fillCircle(5, 5, 4);
  g.fillStyle(0xf7a531, 1).fillCircle(5, 5, 2.8);
  g.fillStyle(0xfff3a0, 1).fillCircle(5, 5, 1.4);
  g.generateTexture(FIRE_TEX, 10, 10);
  g.destroy();
}

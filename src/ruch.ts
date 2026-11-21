// Movement feel (owner, 21 Nov 2026: „wszystko chodzi sztywno, powoli”; tried and true from action games: the speed
// stays 70 km/h, the life comes from the way it moves). Three things, all only presentation of the same walking:
//  - a short run-up and braking (≈ 0.1 s) instead of a light switch, with a skid of dust on a sharp turn or stop;
//  - the camera looks ahead: it slides a little the way the hero walks, so more of what's in front shows;
//  - (in ludzik3d.ts) the run lean, the bigger bob and breathing; footsteps by the ground (GameScene + syntezaWalki).
// Collisions, reach and fights don't change: GameScene moves the hero by the smoothed speed as before.
import type Phaser from 'phaser';
import type { Player } from './objects/Player';
import { trzesienieWlaczone } from './ustawieniaGracza';

export const RUCH = {
  /** Time to full speed / to a stop (s, exponential). */
  rozpedS: 0.09,
  hamowanieS: 0.07,
  /** Turning: how fast the direction follows the stick (s). */
  skretS: 0.05,
  /** Below this speed (px/s) a stopping hero simply stands. */
  stoi: 2,
  /** Camera look-ahead: share of the shorter view side, reached in `kameraS`, back to the middle in `kameraWracaS`. */
  kameraUdzial: 0.12,
  kameraS: 0.45,
  kameraWracaS: 0.9,
  /** A skid: a turn of more than this (radians) or a stop from at least `poslizgOd` of the base speed raises dust. */
  zwrot: 1.9,
  poslizgOd: 0.75,
  kurzCoMs: 220,
};

export interface RuchHost {
  /** Dust at the feet (map px), towards `kat`. */
  kurz: (x: number, y: number, kat: number, sila: number) => void;
  /** Look-ahead allowed now (not underground, not in a turn fight, not during a cannon/panorama). */
  kameraWolna: () => boolean;
}

export class DynamikaRuchu {
  private vx = 0;
  private vy = 0;
  private ox = 0;
  private oy = 0;
  private ostatniKurz = 0;
  /** Tests / switch: `?ruch=0` keeps the old instant walking and fixed camera. */
  readonly wlaczony = typeof location === 'undefined' || new URLSearchParams(location.search).get('ruch') !== '0';

  constructor(private scene: Phaser.Scene, private host: RuchHost) {
    (window as unknown as { __ruch?: DynamikaRuchu }).__ruch = this;
  }

  /** Smooths the hero's velocity (already scaled by ground, slope, vehicle…) towards what the controls ask for. */
  wygladz(p: Player, dt: number, now: number) {
    if (!this.wlaczony || dt <= 0) return;
    // Knocked back or stunned: the push is the game's own; start again from it.
    if (now < p.stunnedUntil) { this.vx = p.vel.x; this.vy = p.vel.y; return; }
    const tx = p.vel.x, ty = p.vel.y;
    const cel = Math.hypot(tx, ty), teraz = Math.hypot(this.vx, this.vy), baza = Math.max(1, p.speed);
    // A skid: sharp turn while fast, or a sudden stop from (nearly) full speed.
    if (now - this.ostatniKurz > RUCH.kurzCoMs && teraz > baza * RUCH.poslizgOd) {
      const zwrot = cel > 1 ? Math.abs(Math.atan2(this.vx * ty - this.vy * tx, this.vx * tx + this.vy * ty)) : Math.PI;
      if (zwrot > RUCH.zwrot) {
        this.ostatniKurz = now;
        this.host.kurz(p.x, p.y + 3, Math.atan2(this.vy, this.vx), cel > 1 ? 1 : 0.8);
      }
    }
    // Start from standing: a little dust from the back foot.
    if (teraz < RUCH.stoi && cel > baza * 0.5 && now - this.ostatniKurz > RUCH.kurzCoMs) {
      this.ostatniKurz = now;
      this.host.kurz(p.x, p.y + 3, Math.atan2(-ty, -tx), 0.6);
    }
    const tau = cel < 1 ? RUCH.hamowanieS : cel > teraz ? RUCH.rozpedS : RUCH.skretS;
    const k = 1 - Math.exp(-dt / tau);
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;
    if (cel < 1 && Math.hypot(this.vx, this.vy) < RUCH.stoi) { this.vx = 0; this.vy = 0; }
    p.vel.set(this.vx, this.vy);
  }

  /** The camera slides ahead the way the hero walks (after he moved this frame). */
  kamera(p: Player, dt: number) {
    const cam = this.scene.cameras.main;
    const wolno = this.wlaczony && trzesienieWlaczone() && this.host.kameraWolna()
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tx = 0, ty = 0;
    const v = Math.hypot(p.vel.x, p.vel.y);
    if (wolno && v > 1) {
      const L = Math.min(cam.width / cam.zoomX, cam.height / cam.zoomY) * RUCH.kameraUdzial * Math.min(1, v / Math.max(1, p.speed));
      tx = (p.vel.x / v) * L;
      ty = (p.vel.y / v) * L;
    }
    const k = 1 - Math.exp(-dt / (v > 1 ? RUCH.kameraS : RUCH.kameraWracaS));
    this.ox += (tx - this.ox) * k;
    this.oy += (ty - this.oy) * k;
    if (!wolno && Math.hypot(this.ox, this.oy) < 0.5) { this.ox = 0; this.oy = 0; }
    // Phaser centres on target − offset: a negative offset looks ahead.
    cam.setFollowOffset(-this.ox, -this.oy);
  }

  /** After a jump (travel, teleport, dungeon): no slide from the old place. */
  zeruj() { this.vx = this.vy = this.ox = this.oy = 0; }
}

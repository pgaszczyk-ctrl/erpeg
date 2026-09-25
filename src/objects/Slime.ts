import Phaser from 'phaser';
import { TEX } from '../art';

export const SLIME = {
  hp: 3,
  wanderSpeed: 22,
  chaseSpeed: 42,
  sightRange: 70,
  loseRange: 110,
};

export function createSlimeAnims(scene: Phaser.Scene) {
  scene.anims.create({
    key: 'slime-hop',
    frames: [{ key: TEX.slime, frame: 'f0' }, { key: TEX.slime, frame: 'f1' }],
    frameRate: 4,
    repeat: -1,
  });
}

export class Slime extends Phaser.GameObjects.Sprite {
  vel = new Phaser.Math.Vector2();
  hp = SLIME.hp;
  /** Where it was placed; it wanders around this spot. */
  home: Phaser.Math.Vector2;
  private chasing = false;
  private nextThink = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.slime, 'f0');
    scene.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);
    this.anims.play({ key: 'slime-hop', startFrame: Phaser.Math.Between(0, 1) });
  }

  get isDead() {
    return this.hp <= 0;
  }

  think(target: Phaser.Math.Vector2, now: number) {
    if (this.isDead || now < this.stunnedUntil) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (!this.chasing && dist < SLIME.sightRange) this.chasing = true;
    if (this.chasing && dist > SLIME.loseRange) this.chasing = false;

    if (this.chasing) {
      const v = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y).normalize();
      this.vel.set(v.x * SLIME.chaseSpeed, v.y * SLIME.chaseSpeed);
      this.anims.timeScale = 2;
    } else if (now > this.nextThink) {
      this.nextThink = now + Phaser.Math.Between(800, 2200);
      this.anims.timeScale = 1;
      if (Math.random() < 0.35) {
        this.vel.set(0, 0);
      } else if (Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y) > 60) {
        // Wandered too far: head back home.
        const v = new Phaser.Math.Vector2(this.home.x - this.x, this.home.y - this.y).normalize();
        this.vel.set(v.x * SLIME.wanderSpeed, v.y * SLIME.wanderSpeed);
      } else {
        const a = Math.random() * Math.PI * 2;
        this.vel.set(Math.cos(a) * SLIME.wanderSpeed, Math.sin(a) * SLIME.wanderSpeed);
      }
    }
  }

  /** Returns true if this hit killed the slime. */
  hit(from: Phaser.Math.Vector2, now: number, damage = 1): boolean {
    if (this.isDead) return false;
    this.hp -= damage;
    this.chasing = true;
    this.stunnedUntil = now + 300;
    const push = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize().scale(200);
    this.vel.set(push.x, push.y);

    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => this.setTintMode(Phaser.TintModes.MULTIPLY).clearTint());

    if (this.isDead) {
      this.vel.set(0, 0);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.6,
        scaleY: 0.3,
        alpha: 0,
        delay: 120,
        duration: 220,
        onComplete: () => this.destroy(),
      });
      return true;
    }
    return false;
  }
}

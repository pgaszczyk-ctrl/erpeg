import Phaser from 'phaser';
import { TEX } from '../art';

export const SLIME = {
  hp: 2,
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

export class Slime extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp = SLIME.hp;
  private chasing = false;
  private nextThink = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.slime, 'f0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(12, 8).setOffset(2, 6);
    this.setCollideWorldBounds(true);
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
      this.body.setVelocity(v.x * SLIME.chaseSpeed, v.y * SLIME.chaseSpeed);
      this.anims.timeScale = 2;
    } else if (now > this.nextThink) {
      this.nextThink = now + Phaser.Math.Between(800, 2200);
      this.anims.timeScale = 1;
      if (Math.random() < 0.35) {
        this.body.setVelocity(0, 0);
      } else {
        const a = Math.random() * Math.PI * 2;
        this.body.setVelocity(Math.cos(a) * SLIME.wanderSpeed, Math.sin(a) * SLIME.wanderSpeed);
      }
    }
  }

  /** Returns true if this hit killed the slime. */
  hit(from: Phaser.Math.Vector2, now: number): boolean {
    if (this.isDead) return false;
    this.hp -= 1;
    this.chasing = true;
    this.stunnedUntil = now + 300;
    const push = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize().scale(200);
    this.body.setVelocity(push.x, push.y);

    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => this.setTintMode(Phaser.TintModes.MULTIPLY).clearTint());

    if (this.isDead) {
      this.body.enable = false;
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

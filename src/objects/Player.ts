import Phaser from 'phaser';
import { TEX, HERO_DIRS, type Dir } from '../art';

export const PLAYER = {
  speed: 85,
  maxHp: 6,
  attackCooldown: 320, // ms
  attackReach: 13, // px from the centre to the middle of the swing
  attackRadius: 11,
  hurtInvulnerable: 1000, // ms
};

export function createHeroAnims(scene: Phaser.Scene) {
  for (const dir of HERO_DIRS) {
    scene.anims.create({
      key: `hero-walk-${dir}`,
      frames: [1, 0, 2, 0].map((f) => ({ key: TEX.hero, frame: `${dir}-${f}` })),
      frameRate: 9,
      repeat: -1,
    });
  }
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp = PLAYER.maxHp;
  facing = new Phaser.Math.Vector2(0, 1);
  private lastAttack = -Infinity;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.hero, 'down-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Small hitbox at the feet so the head can overlap trees, like in Zelda.
    this.body.setSize(10, 7).setOffset(3, 8);
    this.setCollideWorldBounds(true);
  }

  get dirName(): Dir {
    if (Math.abs(this.facing.x) > Math.abs(this.facing.y)) return 'side';
    return this.facing.y < 0 ? 'up' : 'down';
  }

  get isDead() {
    return this.hp <= 0;
  }

  /** Move with an input vector (length 0..1). */
  move(ix: number, iy: number, now: number) {
    if (now < this.stunnedUntil) return;
    const v = new Phaser.Math.Vector2(ix, iy);
    const len = v.length();
    if (len > 1) v.scale(1 / len);

    if (len > 0.15) {
      this.facing.set(v.x, v.y).normalize();
      this.body.setVelocity(v.x * PLAYER.speed, v.y * PLAYER.speed);
      this.setFlipX(this.dirName === 'side' && this.facing.x > 0);
      this.anims.play(`hero-walk-${this.dirName}`, true);
    } else {
      this.body.setVelocity(0, 0);
      this.anims.stop();
      this.setFrame(`${this.dirName}-0`);
    }
  }

  /** Returns the centre of the sword swing, or null if still on cooldown. */
  tryAttack(now: number): Phaser.Math.Vector2 | null {
    if (now - this.lastAttack < PLAYER.attackCooldown || now < this.stunnedUntil) return null;
    this.lastAttack = now;

    // Snap the swing to the 4 main directions so it matches the sprite.
    const snap =
      this.dirName === 'side'
        ? new Phaser.Math.Vector2(Math.sign(this.facing.x), 0)
        : new Phaser.Math.Vector2(0, Math.sign(this.facing.y));
    const hit = new Phaser.Math.Vector2(this.x, this.y + 2).add(snap.clone().scale(PLAYER.attackReach));

    const slash = this.scene.add.image(hit.x, hit.y, TEX.slash).setDepth(this.depth + 1);
    slash.setRotation(snap.angle());
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.2,
      duration: 160,
      onComplete: () => slash.destroy(),
    });
    return hit;
  }

  /** Returns true if damage was taken. */
  hurt(from: Phaser.Math.Vector2, now: number): boolean {
    if (now < this.invulnerableUntil || this.isDead) return false;
    this.hp -= 1;
    this.invulnerableUntil = now + PLAYER.hurtInvulnerable;
    this.stunnedUntil = now + 180;

    const push = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize().scale(170);
    this.body.setVelocity(push.x, push.y);

    this.scene.cameras.main.shake(120, 0.004);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(PLAYER.hurtInvulnerable / 180) - 1,
      onComplete: () => this.setAlpha(1),
    });
    return true;
  }

  heal(amount: number) {
    this.hp = Math.min(PLAYER.maxHp, this.hp + amount);
  }
}

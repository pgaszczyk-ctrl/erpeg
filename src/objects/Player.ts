import Phaser from 'phaser';
import { TEX, HERO_DIRS, type Dir } from '../art';

export const PLAYER = {
  speed: 60, // 30% slower than it was (85)
  maxHp: 6,
  attackCooldown: 320, // ms
  attackReach: 9, // px from the centre to the middle of the swing (close, easier to aim)
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

export class Player extends Phaser.GameObjects.Sprite {
  /** Velocity in px/s; GameScene moves the player with map collisions. */
  vel = new Phaser.Math.Vector2();
  hp = PLAYER.maxHp;
  facing = new Phaser.Math.Vector2(0, 1);
  private lastAttack = -Infinity;
  /** Set from the sword-fighting skill (content/sklepy.ts). */
  attackCooldown = PLAYER.attackCooldown;
  reach = 1;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;

  /** `texture`/`anim`: the player's own drawn hero ('hero-me' / 'me'), or the default one. */
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = TEX.hero, private anim = 'hero') {
    super(scene, x, y, texture, 'down-0');
    scene.add.existing(this);
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
      this.vel.set(v.x * PLAYER.speed, v.y * PLAYER.speed);
      this.setFlipX(this.dirName === 'side' && this.facing.x > 0);
      this.anims.play(`${this.anim}-walk-${this.dirName}`, true);
    } else {
      this.vel.set(0, 0);
      this.anims.stop();
      this.setFrame(`${this.dirName}-0`);
    }
  }

  /** Returns the centre of the sword swing, or null if still on cooldown. */
  tryAttack(now: number): Phaser.Math.Vector2 | null {
    if (now - this.lastAttack < this.attackCooldown || now < this.stunnedUntil) return null;
    this.lastAttack = now;

    // Exactly the way the hero was walking (diagonals too), not snapped to 4 sides.
    const snap = this.facing.lengthSq() > 0 ? this.facing.clone().normalize() : new Phaser.Math.Vector2(0, 1);
    const hit = new Phaser.Math.Vector2(this.x, this.y + 2).add(snap.clone().scale(PLAYER.attackReach * this.reach));

    const slash = this.scene.add.image(hit.x, hit.y, TEX.slash).setDepth(this.depth + 1);
    slash.setRotation(snap.angle()).setScale(this.reach);
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.2 * this.reach,
      duration: 160,
      onComplete: () => slash.destroy(),
    });
    return hit;
  }

  /** Returns true if damage was taken. */
  hurt(from: Phaser.Math.Vector2, now: number, damage = 1): boolean {
    if (now < this.invulnerableUntil || this.isDead) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnerableUntil = now + PLAYER.hurtInvulnerable;
    this.stunnedUntil = now + 180;

    const push = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize().scale(170);
    this.vel.set(push.x, push.y);

    this.scene.cameras.main.shake(120, 0.004);
    // Blink by hiding (alpha is used for hiding in bushes).
    this.scene.time.addEvent({
      delay: 90,
      repeat: Math.floor(PLAYER.hurtInvulnerable / 90) - 1,
      callback: () => this.setVisible(!this.visible),
    });
    this.scene.time.delayedCall(PLAYER.hurtInvulnerable + 10, () => this.setVisible(true));
    return true;
  }

  heal(amount: number) {
    this.hp = Math.min(PLAYER.maxHp, this.hp + amount);
  }
}

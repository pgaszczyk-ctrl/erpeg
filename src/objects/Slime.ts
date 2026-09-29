import Phaser from 'phaser';
import { TEX, HERO_DIRS } from '../art';
import type { RodzajWroga } from '../content/fabula';
import { hdOn, fitHd, enemyTexture } from '../sprites';
import { PLAYER } from './Player';

// Enemy kinds. `glut` is the basic slime; `wielki_glut` a boss-sized one;
// `bandyta` a masked villain (police bounties).
export interface EnemyKind {
  name: string;
  hp: number;
  wanderSpeed: number;
  chaseSpeed: number;
  sightRange: number;
  loseRange: number;
  scale: number;
  /** Hearts' halves taken per hit. */
  damage: number;
  exp: number;
  tint?: number;
}

export const ENEMY_KINDS: Record<RodzajWroga, EnemyKind> = {
  glut: { name: 'Chochlik', hp: 3, wanderSpeed: 20, chaseSpeed: 38, sightRange: 70, loseRange: 110, scale: 1, damage: 1, exp: 5 },
  wielki_glut: { name: 'Wielki chochlik', hp: 18, wanderSpeed: 13, chaseSpeed: 33, sightRange: 90, loseRange: 180, scale: 2.2, damage: 2, exp: 40 },
  bandyta: { name: 'Bandyta', hp: 6, wanderSpeed: 30, chaseSpeed: 64, sightRange: 80, loseRange: 150, scale: 1, damage: 1, exp: 15 },
  // By place: dryads in forests, blue zombies by water, skeletons by cemeteries.
  driada: { name: 'Driada', hp: 3, wanderSpeed: 18, chaseSpeed: 36, sightRange: 70, loseRange: 110, scale: 1, damage: 1, exp: 5 },
  zombie: { name: 'Zombiak', hp: 4, wanderSpeed: 14, chaseSpeed: 32, sightRange: 65, loseRange: 110, scale: 1, damage: 1, exp: 6 },
  szkielet: { name: 'Szkielet', hp: 3, wanderSpeed: 20, chaseSpeed: 40, sightRange: 75, loseRange: 120, scale: 1, damage: 1, exp: 6 },
  // A townsman in a duel (his strength and life are set by the duel itself).
  wojownik: { name: 'Wojownik', hp: 6, wanderSpeed: 20, chaseSpeed: 44, sightRange: 250, loseRange: 500, scale: 1, damage: 1, exp: 0 },
  // Gang bosses: come out when the last gang member falls (content/gangi.ts).
  herszt: { name: 'Herszt gangu', hp: 14, wanderSpeed: 14, chaseSpeed: 40, sightRange: 120, loseRange: 260, scale: 1.8, damage: 2, exp: 40, tint: 0xff8a8a },
  wielki_herszt: { name: 'Wielki herszt', hp: 36, wanderSpeed: 12, chaseSpeed: 38, sightRange: 140, loseRange: 320, scale: 2.5, damage: 2, exp: 100, tint: 0xff5a5a },
  // The story's dragon (its reward comes from content/historia.ts).
  smok: { name: 'Smok', hp: 60, wanderSpeed: 8, chaseSpeed: 34, sightRange: 140, loseRange: 400, scale: 1, damage: 2, exp: 0 },
};

/** Kept for code that only knows slimes. */
export const SLIME = ENEMY_KINDS.glut;

/** Enemy speeds above were set for a hero walking 60 px/s; they keep the same proportion to the hero's speed now. */
export const PREDKOSC_WROGOW = PLAYER.speed / 60;


/** Pictures of the little creatures (all but the bandit). */
const CRITTER_TEX: Partial<Record<RodzajWroga, string>> = { glut: TEX.slime, wielki_glut: TEX.slime, herszt: TEX.slime, wielki_herszt: TEX.slime, driada: TEX.dryad, zombie: TEX.zombie, szkielet: TEX.skeleton, smok: TEX.dragon };

export function createSlimeAnims(scene: Phaser.Scene) {
  for (const key of [TEX.slime, TEX.dryad, TEX.zombie, TEX.skeleton]) {
    scene.anims.create({ key: `${key}-hop`, frames: [{ key, frame: 'f0' }, { key, frame: 'f1' }], frameRate: 4, repeat: -1 });
  }
  scene.anims.create({ key: 'dragon-flap', frames: [{ key: TEX.dragon, frame: 'f0' }, { key: TEX.dragon, frame: 'f1' }], frameRate: 3, repeat: -1 });
  for (const dir of HERO_DIRS) {
    scene.anims.create({
      key: `bandit-walk-${dir}`,
      frames: [1, 0, 2, 0].map((f) => ({ key: TEX.bandit, frame: `${dir}-${f}` })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

export class Slime extends Phaser.GameObjects.Sprite {
  /** How fast enemies move on this difficulty level (1 = normal). */
  static tempo = 1;
  vel = new Phaser.Math.Vector2();
  hp: number;
  readonly kind: EnemyKind;
  readonly kindId: RodzajWroga;
  /** Where it was placed; it wanders around this spot. */
  home: Phaser.Math.Vector2;
  /** Chasing the hero (others nearby join in, see GameScene). */
  chasing = false;
  /** How far from home it wanders (px). */
  roam = 60;
  /** A gang member never leaves its territory: it gives up once the hero (or it) is outside. */
  leash: { x: number; y: number; r: number } | null = null;
  /** Not pushed back by blows (the demo's Wawel dragon). */
  heavy = false;
  /** Its own way of moving, called instead of think() (the demo's Wawel dragon). */
  brain?: (now: number) => void;
  private nextThink = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: RodzajWroga = 'glut') {
    const k = ENEMY_KINDS[kind];
    const person = kind === 'bandyta' || kind === 'wojownik';
    // The artist's detailed enemies (content/wyglad.ts), with a red glow; townsfolk in duels bring their own picture.
    const hdTex = hdOn && kind !== 'wojownik' ? enemyTexture(scene, kind) : null;
    const hd = !!hdTex && scene.textures.exists(hdTex);
    super(scene, x, y, hd ? hdTex! : person ? TEX.bandit : CRITTER_TEX[kind] ?? TEX.slime, person || hd ? 'down-0' : 'f0');
    scene.add.existing(this);
    this.kind = k;
    this.kindId = kind;
    this.hp = k.hp;
    this.hd = hd;
    if (hd) {
      fitHd(this, k.scale);
      this.walkAnim = `${hdTex}-walk`;
    } else {
      this.setScale(k.scale);
      this.setOrigin(0.5, 1 - 0.5 / k.scale); // grow upwards from the feet
    }
    if (k.tint && !(hd && kind === 'herszt')) this.setTint(k.tint); // the drawn boss has his own look; the big one stays redder
    this.home = new Phaser.Math.Vector2(x, y);
    if (hd) this.setFrame('down-0');
    else if (kind === 'smok') this.anims.play('dragon-flap');
    else if (kind !== 'bandyta' && kind !== 'wojownik') this.anims.play({ key: `${CRITTER_TEX[kind] ?? TEX.slime}-hop`, startFrame: Phaser.Math.Between(0, 1) });
  }

  /** How far from its centre a sword swing or a touch reaches it. */
  get size() {
    if (this.kindId === 'smok') return 14;
    return 6 * this.kind.scale;
  }

  /** Bandits turn to face where they walk. */
  /** Walk animations for people (bandits, townsfolk in duels) and the new imps. */
  walkAnim = 'bandit-walk';
  /** Drawn as one of the new detailed characters (walks in 4 directions). */
  hd = false;

  private face() {
    if (this.kindId === 'smok') {
      if (Math.abs(this.vel.x) > 1) this.setFlipX(this.vel.x > 0);
      return;
    }
    if (this.kindId !== 'bandyta' && this.kindId !== 'wojownik' && !this.hd) return;
    const v = this.vel;
    if (v.lengthSq() < 1) {
      this.anims.stop();
      if (this.hd) this.setFrame(`${this.frame.name.split('-')[0]}-0`);
      return;
    }
    const dir = Math.abs(v.x) > Math.abs(v.y) ? 'side' : v.y < 0 ? 'up' : 'down';
    this.setFlipX(dir === 'side' && v.x > 0);
    this.anims.play(`${this.walkAnim}-${dir}`, true);
  }

  get isDead() {
    return this.hp <= 0;
  }

  think(target: Phaser.Math.Vector2, now: number) {
    if (this.isDead || now < this.stunnedUntil) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (!this.chasing && dist < this.kind.sightRange) this.chasing = true;
    if (this.chasing && dist > this.kind.loseRange) this.chasing = false;
    const l = this.leash;
    if (this.chasing && l && (Math.hypot(target.x - l.x, target.y - l.y) > l.r || Math.hypot(this.x - l.x, this.y - l.y) > l.r)) {
      // Past the border of its gang's land: back home.
      this.chasing = false;
      this.nextThink = 0;
    }

    if (this.chasing) {
      // Stop at the hero's edge instead of pushing into them.
      if (dist < this.size + 3) {
        this.vel.set(0, 0);
        return;
      }
      const v = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y).normalize();
      const speed = this.kind.chaseSpeed * Slime.tempo * PREDKOSC_WROGOW;
      this.vel.set(v.x * speed, v.y * speed);
      this.anims.timeScale = 2;
    } else if (now > this.nextThink) {
      this.nextThink = now + Phaser.Math.Between(800, 2200);
      this.anims.timeScale = 1;
      if (Math.random() < 0.35) {
        this.vel.set(0, 0);
      } else if (Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y) > this.roam) {
        // Wandered too far: head back home.
        const v = new Phaser.Math.Vector2(this.home.x - this.x, this.home.y - this.y).normalize();
        const w = this.kind.wanderSpeed * Slime.tempo * PREDKOSC_WROGOW;
        this.vel.set(v.x * w, v.y * w);
      } else {
        const a = Math.random() * Math.PI * 2;
        const w = this.kind.wanderSpeed * Slime.tempo * PREDKOSC_WROGOW;
        this.vel.set(Math.cos(a) * w, Math.sin(a) * w);
      }
    }
  }

  /** Call after think(); keeps the sprite facing its movement. */
  updateLook() {
    this.face();
  }

  /** Returns true if this hit killed the slime. */
  hit(from: Phaser.Math.Vector2, now: number, damage = 1): boolean {
    if (this.isDead) return false;
    this.hp -= damage;
    this.chasing = true;
    this.stunnedUntil = now + 300;
    const push = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize().scale(this.heavy ? 0 : this.kindId === 'smok' ? 30 : 200 / this.kind.scale);
    this.vel.set(push.x, push.y);

    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => {
      this.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
      if (this.kind.tint) this.setTint(this.kind.tint);
    });

    if (this.isDead) {
      this.vel.set(0, 0);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.scaleX * 1.6,
        scaleY: this.scaleY * 0.3,
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

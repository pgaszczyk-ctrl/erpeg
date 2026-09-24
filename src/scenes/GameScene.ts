import Phaser from 'phaser';
import { TEX, TILE, SOLID_TILES } from '../art';
import { generateWorld, isWalkable, MAP_W, MAP_H } from '../world';
import { touchInput } from '../controls';
import { Player, PLAYER } from '../objects/Player';
import { Slime } from '../objects/Slime';

const MAX_SLIMES = 14;
const SLIME_RESPAWN_MS = 4000;
const HEART_DROP_CHANCE = 0.25;

export interface HudState {
  hp: number;
  maxHp: number;
  coins: number;
  dead: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private slimes!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private tiles!: number[][];
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'attack' | 'attack2', Phaser.Input.Keyboard.Key>;
  private coins = 0;

  constructor() {
    super('game');
  }

  create() {
    this.coins = 0;
    this.physics.resume(); // paused on death; restart keeps the same world
    const world = generateWorld();
    this.tiles = world.tiles;

    const map = this.make.tilemap({ data: world.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(TEX.tiles, TEX.tiles, TILE, TILE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision(SOLID_TILES);

    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.player = new Player(this, (world.spawn.x + 0.5) * TILE, (world.spawn.y + 0.5) * TILE);
    this.slimes = this.physics.add.group();
    this.pickups = this.physics.add.group();
    for (let i = 0; i < MAX_SLIMES; i++) this.spawnSlime();

    this.physics.add.collider(this.player, layer);
    this.physics.add.collider(this.slimes, layer);
    this.physics.add.overlap(this.player, this.slimes, (_p, s) => {
      const slime = s as Slime;
      if (slime.isDead) return;
      if (this.player.hurt(new Phaser.Math.Vector2(slime.x, slime.y), this.time.now)) {
        this.emitHud();
        if (this.player.isDead) this.onPlayerDeath();
      }
    });
    this.physics.add.overlap(this.player, this.pickups, (_p, item) => this.collect(item as Phaser.Physics.Arcade.Image));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
      attack: K.SPACE, attack2: K.J,
    }) as typeof this.keys;

    this.scene.launch('ui');
    this.emitHud();
  }

  /** Integer zoom so pixels stay crisp; aims for ~11 tiles on the short screen side. */
  private fitZoom() {
    const short = Math.min(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(Math.max(2, Math.floor(short / (TILE * 11))));
  }

  update(now: number) {
    if (this.player.isDead) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const k = this.keys;
    let ix = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let iy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (ix === 0 && iy === 0) {
      ix = touchInput.x;
      iy = touchInput.y;
    }
    this.player.move(ix, iy, now);

    const attackPressed =
      Phaser.Input.Keyboard.JustDown(k.attack) || Phaser.Input.Keyboard.JustDown(k.attack2) || touchInput.attack;
    touchInput.attack = false;
    if (attackPressed) {
      const hit = this.player.tryAttack(now);
      if (hit) this.resolveAttack(hit, now);
    }

    const target = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const s of this.slimes.getChildren() as Slime[]) {
      s.think(target, now);
      s.setDepth(s.y);
    }
    this.player.setDepth(this.player.y);
  }

  private resolveAttack(hit: Phaser.Math.Vector2, now: number) {
    for (const s of [...this.slimes.getChildren()] as Slime[]) {
      if (Phaser.Math.Distance.Between(hit.x, hit.y, s.x, s.y) > PLAYER.attackRadius + 6) continue;
      if (s.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now)) {
        this.dropLoot(s.x, s.y);
        this.slimes.remove(s);
        this.time.delayedCall(SLIME_RESPAWN_MS, () => this.spawnSlime());
      }
    }
  }

  private spawnSlime() {
    if (this.slimes.getLength() >= MAX_SLIMES) return;
    // Pick a walkable tile that is not right next to the player.
    for (let tries = 0; tries < 50; tries++) {
      const tx = Phaser.Math.Between(1, MAP_W - 2);
      const ty = Phaser.Math.Between(1, MAP_H - 2);
      if (!isWalkable(this.tiles[ty][tx])) continue;
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 120) continue;
      this.slimes.add(new Slime(this, x, y));
      return;
    }
  }

  private dropLoot(x: number, y: number) {
    const heart = Math.random() < HEART_DROP_CHANCE && this.player.hp < PLAYER.maxHp;
    const item = this.physics.add.image(x, y, heart ? TEX.pickupHeart : TEX.coin);
    item.setData('kind', heart ? 'heart' : 'coin').setDepth(y - 8);
    this.pickups.add(item);
    this.tweens.add({ targets: item, y: y - 3, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Loot fades away if not picked up.
    this.time.delayedCall(9000, () => {
      if (!item.active) return;
      this.tweens.add({ targets: item, alpha: 0, duration: 300, onComplete: () => item.destroy() });
    });
  }

  private collect(item: Phaser.Physics.Arcade.Image) {
    if (!item.active) return;
    if (item.getData('kind') === 'heart') this.player.heal(2);
    else this.coins += 1;
    item.destroy();
    this.emitHud();
  }

  private onPlayerDeath() {
    this.player.anims.stop();
    this.player.setFrame('down-0');
    this.tweens.add({ targets: this.player, angle: 90, duration: 300 });
    this.physics.pause();
  }

  private emitHud() {
    const state: HudState = {
      hp: this.player.hp,
      maxHp: PLAYER.maxHp,
      coins: this.coins,
      dead: this.player.isDead,
    };
    // Stored in the registry too, so UIScene can read it when it starts.
    this.registry.set('hud', state);
    this.game.events.emit('hud', state);
  }
}

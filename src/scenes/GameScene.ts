import Phaser from 'phaser';
import { TEX } from '../art';
import { touchInput, keyboardDir, consumeAttack } from '../controls';
import { Player, PLAYER } from '../objects/Player';
import { Slime } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { MapRenderer } from '../map/MapRenderer';
import { WROGOWIE } from '../content/fabula';
import {
  session, saveNow, missionState, setMissionState, missionExp, resolveMissions, resolvePlace,
  type ResolvedMission, type Place,
} from '../quests';
import { api, type Snapshot } from '../api';
import { showMenu } from '../ui/menu';

const HEART_DROP_CHANCE = 0.25;
const RESPAWN_MS = 20000;
const DOOR_RADIUS = 14;
const GOAL_RADIUS = 40;
const EXP_PER_ENEMY = 5;
const HEARTBEAT_MS = 3000;
/** How long a character stays on the street after the game was closed without "Wyjdź". */
const LINGER_MS = 10000;
const HIDE_IN = new Set(['forest', 'scrub', 'wetland']);
// Feet collision box (half sizes) relative to the sprite centre.
const FEET = { dy: 5, hw: 3, hh: 2 };

export interface HudState {
  hp: number;
  maxHp: number;
  coins: number;
  exp: number;
  dead: boolean;
  /** Seconds left while the character is stuck after an unfinished session. */
  lingering: number | null;
  street: string | null;
  goal: string | null;
  /** World position the arrow points to, if any. */
  goalPos: { x: number; y: number } | null;
}

export interface DialogRequest {
  title: string;
  text: string;
  buttons: string[];
  onChoose: (index: number) => void;
}

type Enemy = Slime & { missionId?: string; temp?: boolean };

export class GameScene extends Phaser.Scene {
  city!: CityMap;
  player!: Player;
  private mapView!: MapRenderer;
  private enemies: Enemy[] = [];
  private pickups: Phaser.GameObjects.Image[] = [];
  private missions: ResolvedMission[] = [];
  private markers = new Map<string, Phaser.GameObjects.Image>();
  private nearDoor: string | null = null;
  private hudTimer = 0;
  private lingerUntil = 0;
  private leaving = false;

  constructor() {
    super('game');
  }

  create() {
    this.city = this.registry.get('city') as CityMap;
    this.enemies = [];
    this.pickups = [];
    this.markers = new Map();
    this.nearDoor = null;
    this.leaving = false;
    this.lingerUntil = 0;
    this.mapView = new MapRenderer(this, this.city);

    this.player = new Player(this, session.startX, session.startY);
    this.player.hp = session.hp;

    // Missions: gold roofs and "!" over their doors.
    const { missions, missing } = resolveMissions(this.city);
    this.missions = missions;
    for (const rm of missions) {
      if (rm.door.building) this.mapView.highlight.add(rm.door.building);
      const img = this.add.image(rm.door.x, rm.door.y - 14, TEX.marker).setDepth(100000);
      this.tweens.add({ targets: img, y: img.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.markers.set(rm.m.id, img);
      if (missionState(rm.m) === 'active') this.startMissionGoal(rm);
    }
    this.refreshMarkers();

    // Fixed enemy spots.
    for (const w of WROGOWIE) {
      const p = resolvePlace(this.city, w.miejsce);
      if (!p) {
        missing.push(typeof w.miejsce === 'string' ? w.miejsce : JSON.stringify(w.miejsce));
        continue;
      }
      this.spawnGroup(p, w.ile);
    }
    if (missing.length) console.warn('Nie znaleziono na mapie:', missing);
    this.registry.set('missing', missing);

    this.replayAbandoned();

    // Tell the server where we are, so closing the tab can't dodge a fight.
    const beat = () => {
      if (!this.leaving && !this.player.isDead) api.heartbeat(session.token, this.snapshot()).catch(() => {});
    };
    this.time.addEvent({ delay: HEARTBEAT_MS, loop: true, callback: beat });
    window.addEventListener('pagehide', beat);
    this.events.once('shutdown', () => window.removeEventListener('pagehide', beat));
    beat();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.city.width, this.city.height);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#1f4d24');
    this.fitZoom();
    cam.centerOn(this.player.x, this.player.y);
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    // Draw the first chunks right away so the start isn't blank.
    cam.preRender();
    this.mapView.update(cam, 16);

    this.scene.launch('ui');
    this.emitHud();
  }

  /** Integer zoom so pixels stay crisp; aims for ~11 tiles on the short screen side. */
  private fitZoom() {
    const short = Math.min(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(Math.max(2, Math.floor(short / 176)));
  }

  // ------------------------------------------------------------------ loop

  update(now: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.mapView.update(this.cameras.main);
    if (this.player.isDead || this.leaving) return;

    const lingering = now < this.lingerUntil;
    if (this.lingerUntil && !lingering) this.endLinger();
    const kd = keyboardDir();
    const moving = kd.x !== 0 || kd.y !== 0;
    if (lingering) this.player.move(0, 0, now);
    else this.player.move(moving ? kd.x : touchInput.x, moving ? kd.y : touchInput.y, now);
    this.moveActor(this.player, dt);
    // Hiding in the bushes: see-through under trees.
    const hidden = this.city.areaKindsAt(this.player.x, this.player.y + FEET.dy).some((k) => HIDE_IN.has(k));
    this.player.setAlpha(hidden ? 0.5 : 1);

    if (consumeAttack() && !lingering) {
      const hit = this.player.tryAttack(now);
      if (hit) this.resolveAttack(hit, now);
    }

    const target = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const s of this.enemies) {
      if (s.isDead) continue;
      s.think(target, now);
      this.moveActor(s, dt);
      s.setDepth(s.y);
      if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 11) {
        if (this.player.hurt(new Phaser.Math.Vector2(s.x, s.y), now)) {
          this.emitHud();
          if (this.player.isDead) this.onPlayerDeath();
        }
      }
    }
    this.player.setDepth(this.player.y);

    for (const item of [...this.pickups]) {
      if (Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y + 4) < 10) this.collect(item);
    }

    if (!lingering) {
      this.checkDoors();
      this.checkGoals();
    }

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 400;
      this.emitHud();
    }
  }

  /** Moves a sprite by its velocity, sliding along walls, buildings and water. */
  private moveActor(a: Player | Slime, dt: number) {
    const dx = a.vel.x * dt;
    const dy = a.vel.y * dt;
    const fy = a.y + FEET.dy;
    if (dx && this.city.isFree(a.x + dx, fy, FEET.hw, FEET.hh)) a.x += dx;
    if (dy && this.city.isFree(a.x, fy + dy, FEET.hw, FEET.hh)) a.y += dy;
  }

  // ------------------------------------------------------------------ combat

  private resolveAttack(hit: Phaser.Math.Vector2, now: number) {
    for (const s of [...this.enemies]) {
      if (s.isDead || Phaser.Math.Distance.Between(hit.x, hit.y, s.x, s.y) > PLAYER.attackRadius + 6) continue;
      if (s.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now)) this.onEnemyKilled(s);
    }
  }

  private onEnemyKilled(s: Enemy) {
    this.dropLoot(s.x, s.y);
    this.enemies = this.enemies.filter((e) => e !== s);
    session.exp += EXP_PER_ENEMY;
    this.emitHud();
    if (s.temp) return;
    if (s.missionId) {
      const rm = this.missions.find((r) => r.m.id === s.missionId);
      if (rm && !this.enemies.some((e) => e.missionId === s.missionId)) {
        setMissionState(rm.m, 'goal');
        this.refreshMarkers();
        this.toast(`Zadanie wykonane! Wróć do: ${rm.m.adres}`);
      }
    } else {
      // Fixed spots come back after a while.
      const home = s.home.clone();
      this.time.delayedCall(RESPAWN_MS, () => this.spawnEnemy(home.x, home.y));
    }
  }

  private spawnGroup(p: Place, count: number, missionId?: string) {
    for (let i = 0; i < count; i++) {
      // Spread them around the spot, on free ground.
      for (let t = 0; t < 40; t++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * 40;
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (!this.city.isFree(x, y + FEET.dy, FEET.hw, FEET.hh)) continue;
        this.spawnEnemy(x, y, missionId);
        break;
      }
    }
  }

  private spawnEnemy(x: number, y: number, missionId?: string) {
    const s = new Slime(this, x, y) as Enemy;
    s.missionId = missionId;
    this.enemies.push(s);
    return s;
  }

  private dropLoot(x: number, y: number) {
    const heart = Math.random() < HEART_DROP_CHANCE && this.player.hp < PLAYER.maxHp;
    const item = this.add.image(x, y, heart ? TEX.pickupHeart : TEX.coin).setDepth(y - 8);
    item.setData('kind', heart ? 'heart' : 'coin');
    this.pickups.push(item);
    this.tweens.add({ targets: item, y: y - 3, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.delayedCall(15000, () => {
      if (!item.active) return;
      this.tweens.add({ targets: item, alpha: 0, duration: 300, onComplete: () => this.removePickup(item) });
    });
  }

  private removePickup(item: Phaser.GameObjects.Image) {
    this.pickups = this.pickups.filter((p) => p !== item);
    item.destroy();
  }

  private collect(item: Phaser.GameObjects.Image) {
    if (item.getData('kind') === 'heart') this.player.heal(2);
    else session.coins += 1;
    this.removePickup(item);
    this.emitHud();
  }

  private onPlayerDeath() {
    this.lingerUntil = 0;
    this.player.anims.stop();
    this.player.setFrame('down-0');
    this.tweens.add({ targets: this.player, angle: 90, duration: 300 });
    this.emitHud();
    // Death is final: the character goes to the memorial board.
    const place = this.city.describe(this.player.x, this.player.y);
    const report = () =>
      api.die(session.token, session.exp, place).catch(() => this.time.delayedCall(3000, report));
    report();
  }

  // ------------------------------------------------------------------ sessions

  /** What the server keeps in case this tab is closed without "Wyjdź". */
  private snapshot(): Snapshot {
    const near = this.enemies.filter(
      (e) => !e.isDead && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 200,
    );
    return {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      hp: this.player.hp,
      enemies: near.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), hp: e.hp })),
    };
  }

  /**
   * The last session ended without "Wyjdź": the character is back where it was,
   * with the enemies that were around, and can't move for 10 seconds.
   */
  private replayAbandoned() {
    const a = session.abandoned;
    session.abandoned = null;
    if (!a || !a.enemies?.length) return;
    this.player.setPosition(a.x, a.y);
    this.player.hp = Math.max(1, Math.min(PLAYER.maxHp, a.hp));
    for (const e of a.enemies) {
      const s = this.spawnEnemy(e.x, e.y);
      s.temp = true;
      s.hp = e.hp;
    }
    this.lingerUntil = this.time.now + LINGER_MS;
    this.toast('Gra została zamknięta bez wyjścia – twoja postać stoi bezbronna na ulicy przez 10 sekund!', 5000);
  }

  private endLinger() {
    this.lingerUntil = 0;
    // Survived: the lingering foes leave and the character goes home.
    this.enemies.filter((e) => e.temp).forEach((e) => e.destroy());
    this.enemies = this.enemies.filter((e) => !e.temp);
    this.player.setPosition(session.startX, session.startY);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.toast('Przetrwałeś! Wracasz do punktu startowego.');
    this.emitHud();
  }

  /** Is any enemy close enough to be fighting us? */
  inCombat() {
    return this.enemies.some((e) => !e.isDead && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 120);
  }

  /** "Wyjdź": close the session properly and go back to the start screen. */
  async leave() {
    if (this.leaving) return;
    this.leaving = true;
    try {
      await api.logout(session.token);
    } catch {
      // Offline: the server will treat it as an abandoned session.
    }
    this.backToMenu();
  }

  backToMenu() {
    const game = this.game;
    game.scene.stop('ui');
    game.scene.stop('game');
    showMenu(this.city).then(() => game.scene.start('game'));
  }

  private save() {
    saveNow(this.player.hp)
      .then(() => this.toast('Gra zapisana'))
      .catch((e: Error) => this.toast(`Nie udało się zapisać: ${e.message}`));
  }

  // ------------------------------------------------------------------ missions

  private refreshMarkers() {
    for (const rm of this.missions) {
      const img = this.markers.get(rm.m.id);
      if (!img) continue;
      const st = missionState(rm.m);
      img.setTexture(st === 'done' ? TEX.markerDone : TEX.marker);
      img.setAlpha(st === 'active' ? 0.5 : 1);
    }
  }

  private startMissionGoal(rm: ResolvedMission) {
    const z = rm.m.zadanie;
    if (z.typ === 'pokonaj' && rm.target) {
      this.enemies.filter((e) => e.missionId === rm.m.id).forEach((e) => e.destroy());
      this.enemies = this.enemies.filter((e) => e.missionId !== rm.m.id);
      this.spawnGroup(rm.target, z.ile ?? 3, rm.m.id);
    }
  }

  private checkDoors() {
    let near: ResolvedMission | null = null;
    for (const rm of this.missions) {
      if (Phaser.Math.Distance.Between(rm.door.x, rm.door.y, this.player.x, this.player.y + FEET.dy) < DOOR_RADIUS) near = rm;
    }
    const id = near?.m.id ?? null;
    if (id === this.nearDoor) return;
    this.nearDoor = id;
    if (near) {
      this.save(); // entering a building is a save point
      this.openMissionDialog(near);
    }
  }

  private openMissionDialog(rm: ResolvedMission) {
    const m = rm.m;
    const st = missionState(m);
    if (st === 'new') {
      this.dialog({
        title: m.tytul,
        text: m.opis,
        buttons: ['Przyjmuję', 'Nie teraz'],
        onChoose: (i) => {
          if (i !== 0) return;
          setMissionState(m, 'active');
          this.startMissionGoal(rm);
          this.refreshMarkers();
          this.emitHud();
          this.save();
        },
      });
    } else if (st === 'active') {
      this.dialog({ title: m.tytul, text: `Jeszcze nie skończyłeś.\n\nCel: ${m.zadanie.cel}`, buttons: ['OK'], onChoose: () => {} });
    } else if (st === 'goal') {
      this.dialog({
        title: m.tytul,
        text: `${m.zakonczenie}\n\nNagroda: ${m.nagroda} monet i ${missionExp(m)} EXP`,
        buttons: ['Dziękuję!'],
        onChoose: () => {
          session.coins += m.nagroda;
          session.exp += missionExp(m);
          setMissionState(m, 'done');
          this.refreshMarkers();
          this.emitHud();
          this.save(); // finishing a mission is a save point
        },
      });
    } else {
      this.dialog({ title: m.tytul, text: 'Dziękujemy jeszcze raz za pomoc!', buttons: ['OK'], onChoose: () => {} });
    }
  }

  private checkGoals() {
    for (const rm of this.missions) {
      if (rm.m.zadanie.typ !== 'idz' || missionState(rm.m) !== 'active' || !rm.target) continue;
      if (Phaser.Math.Distance.Between(rm.target.x, rm.target.y, this.player.x, this.player.y) < GOAL_RADIUS) {
        setMissionState(rm.m, 'goal');
        this.refreshMarkers();
        this.toast(`Dotarłeś! Wróć do: ${rm.m.adres}`);
      }
    }
  }

  /** The mission the arrow should point at, and where. */
  private currentGoal(): { text: string; pos: { x: number; y: number } } | null {
    const px = this.player.x;
    const py = this.player.y;
    const dist = (p: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, px, py);
    for (const rm of this.missions) {
      const st = missionState(rm.m);
      if (st === 'active' && rm.target) {
        // For fights, point at the nearest remaining enemy of that mission.
        const foes = this.enemies.filter((e) => e.missionId === rm.m.id);
        const pos = foes.length ? foes.reduce((a, b) => (dist(a) < dist(b) ? a : b)) : rm.target;
        return { text: rm.m.zadanie.cel, pos: { x: pos.x, y: pos.y } };
      }
      if (st === 'goal') return { text: `Wróć do: ${rm.m.adres}`, pos: rm.door };
    }
    return null;
  }

  private dialog(req: DialogRequest) {
    this.player.vel.set(0, 0);
    this.player.anims.stop();
    this.scene.pause();
    this.game.events.emit('dialog', {
      ...req,
      onChoose: (i: number) => {
        consumeAttack(); // the tap/key that closed the dialog shouldn't swing the sword
        this.scene.resume();
        req.onChoose(i);
      },
    } satisfies DialogRequest);
  }

  private toast(text: string, ms?: number) {
    this.game.events.emit('toast', text, ms);
  }

  private emitHud() {
    const goal = this.currentGoal();
    const state: HudState = {
      hp: this.player.hp,
      maxHp: PLAYER.maxHp,
      coins: session.coins,
      exp: session.exp,
      dead: this.player.isDead,
      lingering: this.lingerUntil ? Math.max(0, Math.ceil((this.lingerUntil - this.time.now) / 1000)) : null,
      street: this.city.streetNear(this.player.x, this.player.y),
      goal: goal?.text ?? null,
      goalPos: goal?.pos ?? null,
    };
    this.registry.set('hud', state);
    this.game.events.emit('hud', state);
  }
}

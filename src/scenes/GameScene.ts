import Phaser from 'phaser';
import { TEX } from '../art';
import { touchInput, keyboardDir, consumeAttack } from '../controls';
import { Player, PLAYER } from '../objects/Player';
import { Slime } from '../objects/Slime';
import { CityMap, PX_PER_M } from '../map/CityMap';
import { MapRenderer } from '../map/MapRenderer';
import { Explored, FogView, visionPolygon, pointInPolygon } from '../map/Fog';
import { WROGOWIE, type RodzajWroga } from '../content/fabula';
import { BRONIE, WALKA_MIECZEM } from '../content/sklepy';
import type { Place as CityPlace } from '../map/CityMap';
import {
  session, saveNow, currentSword, currentSwordSkill, missionForPlace, missionState, setMissionState, missionExp, resolveMissions, resolvePlace,
  type ResolvedMission, type Place,
} from '../quests';
import { api, type Snapshot } from '../api';
import { showMenu } from '../ui/menu';

const HEART_DROP_CHANCE = 0.25;
const RESPAWN_MS = 20000;
const DOOR_RADIUS = 14;
const GOAL_RADIUS = 40;
const HEARTBEAT_MS = 3000;
/** How long a character stays on the street after the game was closed without "Wyjdź". */
const LINGER_MS = 10000;
const HIDE_IN = new Set(['forest', 'scrub', 'wetland']);
/** How far from the given spot a wanted villain may hide (px). */
const SEARCH_RADIUS = 90;
const PLACE_LOOK = {
  shop: { roof: '#3f7fd8', wall: '#dbe6f5', sign: TEX.signShop },
  school: { roof: '#b84a3a', wall: '#f0d9c8', sign: TEX.signSchool },
  church: { roof: '#7a5ab8', wall: '#e6ddf3', sign: TEX.signChurch },
  office: { roof: '#8d8f99', wall: '#eeeef2', sign: TEX.signOffice },
  hospital: { roof: '#f2f2f2', wall: '#ffe6e6', sign: TEX.signHospital },
  police: { roof: '#2b3f8a', wall: '#d7def2', sign: TEX.signPolice },
} as const;
// Feet collision box (half sizes) relative to the sprite centre.
const FEET = { dy: 5, hw: 2, hh: 1.5 };

export interface HudState {
  hp: number;
  maxHp: number;
  coins: number;
  exp: number;
  /** Sword name and skill level, for the HUD. */
  sword: string;
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
  explored = new Explored();
  private fogView!: FogView;
  /** What the hero sees right now (world polygon). */
  vision: number[] = [];
  private lastVision = { x: NaN, y: NaN, a: NaN };
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
    this.explored = new Explored();
    this.explored.load(session.fog);
    this.fogView = new FogView(this, this.explored);
    this.vision = [];
    this.lastVision = { x: NaN, y: NaN, a: NaN };

    this.player = new Player(this, session.startX, session.startY);
    this.player.hp = session.hp;

    // Missions: gold roofs and "!" over their doors.
    const { missions, missing } = resolveMissions(this.city);
    this.missions = [];
    for (const rm of missions) this.addMission(rm, true);
    // Random missions taken earlier (churches, offices, police) and not finished.
    for (const m of Object.values(session.gen)) {
      const place = this.city.places.find((p) => p.id === m.placeId);
      if (place) this.addMission({ m, door: { ...place.door, building: place.building ?? undefined }, target: resolvePlace(this.city, m.zadanie.miejsce) }, false);
    }
    this.refreshMarkers();

    // Shops and schools: coloured roofs and signs (under the fog, so they
    // are discovered by exploring).
    for (const p of this.city.places) {
      const look = PLACE_LOOK[p.kind];
      if (p.building && !this.mapView.highlight.has(p.building)) this.mapView.highlight.set(p.building, { roof: look.roof, wall: look.wall });
      this.add.image(p.door.x, p.door.y - 10, look.sign).setDepth(900_000);
    }
    this.applySkill();

    // Fixed enemy spots.
    for (const w of WROGOWIE) {
      const p = resolvePlace(this.city, w.miejsce);
      if (!p) {
        missing.push(typeof w.miejsce === 'string' ? w.miejsce : JSON.stringify(w.miejsce));
        continue;
      }
      this.spawnGroup(p, w.ile, undefined, w.wrog);
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
      s.updateLook();
      s.setDepth(s.y);
      if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 5 + s.size) {
        if (this.player.hurt(new Phaser.Math.Vector2(s.x, s.y), now, s.kind.damage)) {
          this.emitHud();
          if (this.player.isDead) this.onPlayerDeath();
        }
      }
    }
    this.player.setDepth(this.player.y);
    this.updateFog();

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

  /** Recomputes what the hero sees and hides whatever is outside of it. */
  private updateFog() {
    const p = this.player;
    const a = Math.atan2(p.facing.y, p.facing.x);
    const lv = this.lastVision;
    // (written as !(<=) so the first frame, with NaN, always computes)
    if (!this.vision.length || !(Math.abs(p.x - lv.x) <= 0.5 && Math.abs(p.y - lv.y) <= 0.5 && Math.abs(a - lv.a) <= 0.01)) {
      this.vision = visionPolygon(this.city, this.explored, p.x, p.y + 2, a);
      this.lastVision = { x: p.x, y: p.y, a };
    }
    this.fogView.update(this.cameras.main, this.vision);
    for (const e of this.enemies) if (!e.isDead) e.setVisible(pointInPolygon(this.vision, e.x, e.y));
    for (const i of this.pickups) i.setVisible(pointInPolygon(this.vision, i.x, i.y));
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
      if (s.isDead || Phaser.Math.Distance.Between(hit.x, hit.y, s.x, s.y) > PLAYER.attackRadius * this.player.reach + s.size) continue;
      if (s.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now, currentSword().obrazenia)) this.onEnemyKilled(s);
    }
  }

  private onEnemyKilled(s: Enemy) {
    this.dropLoot(s.x, s.y);
    this.enemies = this.enemies.filter((e) => e !== s);
    session.exp += s.kind.exp;
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
      const kind = s.kindId;
      this.time.delayedCall(RESPAWN_MS, () => this.spawnEnemy(home.x, home.y, undefined, kind));
    }
  }

  private spawnGroup(p: Place, count: number, missionId?: string, kind: RodzajWroga = 'glut', spread = 40) {
    for (let i = 0; i < count; i++) {
      // Spread them around the spot, on free ground.
      for (let t = 0; t < 60; t++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * spread;
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (!this.city.isFree(x, y + FEET.dy, FEET.hw, FEET.hh)) continue;
        this.spawnEnemy(x, y, missionId, kind);
        break;
      }
    }
  }

  spawnEnemy(x: number, y: number, missionId?: string, kind: RodzajWroga = 'glut') {
    const s = new Slime(this, x, y, kind) as Enemy;
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
      s: PX_PER_M,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      hp: this.player.hp,
      enemies: near.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, k: e.kindId })),
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
      const s = this.spawnEnemy(e.x, e.y, undefined, e.k ?? 'glut');
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
    session.fog = this.explored.serialize();
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
      // A wanted villain hides somewhere around the spot, not right on it.
      this.spawnGroup(rm.target, z.ile ?? 3, rm.m.id, z.wrog ?? 'glut', z.szukaj ? SEARCH_RADIUS : 40);
    }
  }

  private checkDoors() {
    const fx = this.player.x;
    const fy = this.player.y + FEET.dy;
    let id: string | null = null;
    let open: (() => void) | null = null;
    for (const rm of this.missions) {
      if (Phaser.Math.Distance.Between(rm.door.x, rm.door.y, fx, fy) < DOOR_RADIUS) {
        id = rm.m.id;
        open = () => this.openMissionDialog(rm);
      }
    }
    if (!id) {
      for (const p of this.city.places) {
        if (Math.abs(p.door.x - fx) > DOOR_RADIUS || Math.abs(p.door.y - fy) > DOOR_RADIUS) continue;
        if (Phaser.Math.Distance.Between(p.door.x, p.door.y, fx, fy) < DOOR_RADIUS) {
          id = p.id;
          open = () => this.openPlace(p);
        }
      }
    }
    if (id === this.nearDoor) return;
    this.nearDoor = id;
    if (open) {
      this.save(); // entering a building is a save point
      open();
    }
  }

  /** Adds a mission to the game: gold "!" over its door, goal enemies. */
  private addMission(rm: ResolvedMission, highlight: boolean) {
    this.missions.push(rm);
    if (highlight && rm.door.building) this.mapView.highlight.set(rm.door.building, { roof: '#e8b923', wall: '#f3e2a0' });
    // Above the fog: mission doors are always shown.
    const img = this.add.image(rm.door.x, rm.door.y - 14, TEX.marker).setDepth(1_100_000);
    this.tweens.add({ targets: img, y: img.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.markers.set(rm.m.id, img);
    if (missionState(rm.m) === 'active') this.startMissionGoal(rm);
  }

  private openPlace(p: CityPlace) {
    if (p.kind === 'shop') return this.openShop(p);
    if (p.kind === 'school') return this.openSchool(p);
    if (p.kind === 'hospital') return this.openHospital(p);
    // Church, office, police: a random mission.
    const known = this.missions.find((rm) => rm.m.placeId === p.id && (rm.m.id.endsWith(`-${session.nonce}`) || session.gen[rm.m.id]));
    if (known) return this.openMissionDialog(known);
    const m = missionForPlace(this.city, p);
    if (!m) {
      this.dialog({ title: p.name, text: 'Dziś nie mamy dla ciebie żadnego zadania.', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const rm: ResolvedMission = { m, door: { ...p.door, building: p.building ?? undefined }, target: resolvePlace(this.city, m.zadanie.miejsce) };
    this.openMissionDialog(rm, () => {
      session.gen[m.id] = m;
      this.addMission(rm, false);
      // Same door as the place we're standing in: not a new entrance.
      this.nearDoor = m.id;
    });
  }

  private openHospital(p: CityPlace) {
    const hurt = this.player.hp < PLAYER.maxHp;
    this.player.heal(PLAYER.maxHp);
    this.emitHud();
    this.dialog({
      title: `🏥 ${p.name}`,
      text: hurt ? 'Lekarz opatrzył twoje rany. Zdrowie w pełni – i to za darmo!' : 'Lekarz cię obejrzał: jesteś zdrowy jak ryba. Wróć, gdy coś cię boli.',
      buttons: ['Dziękuję'],
      onChoose: () => {},
    });
    if (hurt) this.save();
  }

  /** Swing speed and reach from the sword-fighting level. */
  private applySkill() {
    const sk = currentSwordSkill();
    this.player.attackCooldown = sk.przerwa;
    this.player.reach = sk.zasieg;
  }

  private openShop(p: CityPlace) {
    const mine = currentSword();
    const idx = BRONIE.indexOf(mine);
    const better = BRONIE.slice(idx + 1);
    const text =
      `Kowal za ladą ${p.name} poleca swój towar.\n\n` +
      `Twój miecz: ${mine.nazwa} (obrażenia ${mine.obrazenia}).\nMasz ${session.coins} monet.` +
      (better.length ? '' : '\n\nMasz już najlepszy miecz, jaki tu mają!');
    this.dialog({
      title: `🛒 ${p.name}`,
      text,
      buttons: [...better.map((b) => `${b.nazwa} – ${b.cena} monet (obrażenia ${b.obrazenia})`), 'Wyjdź'],
      onChoose: (i) => {
        const b = better[i];
        if (!b) return;
        if (session.coins < b.cena) {
          this.toast(`Za mało monet – ${b.nazwa} kosztuje ${b.cena}.`);
          return;
        }
        session.coins -= b.cena;
        session.sword = b.id;
        this.emitHud();
        this.toast(`Kupiłeś: ${b.nazwa}!`);
        this.save();
      },
    });
  }

  private openSchool(p: CityPlace) {
    const lvl = session.swordSkill;
    const next = WALKA_MIECZEM[lvl + 1];
    const text =
      `Nauczyciel szermierki wita cię w szkole.\n\nWalka mieczem: poziom ${lvl} – ${WALKA_MIECZEM[lvl].opis}.\nMasz ${session.coins} monet.` +
      (next ? `\n\nNastępny poziom (${lvl + 1}): ${next.opis}.` : '\n\nNauczyłeś się już wszystkiego, co tu uczą!');
    this.dialog({
      title: `🏫 ${p.name}`,
      text,
      buttons: next ? [`Ucz się – ${next.cena} monet`, 'Wyjdź'] : ['Wyjdź'],
      onChoose: (i) => {
        if (!next || i !== 0) return;
        if (session.coins < next.cena) {
          this.toast(`Za mało monet – nauka kosztuje ${next.cena}.`);
          return;
        }
        session.coins -= next.cena;
        session.swordSkill = lvl + 1;
        this.applySkill();
        this.emitHud();
        this.toast(`Walka mieczem: poziom ${lvl + 1}! ${next.opis}.`);
        this.save();
      },
    });
  }

  /** For automated browser checks. */
  debugSession() {
    return session;
  }

  /** Shops and schools for the map screen. */
  placeMarkers() {
    return this.city.places.map((p) => ({ x: p.door.x, y: p.door.y, kind: p.kind }));
  }

  /** `onAccept` is for random missions: they join the game only when taken. */
  private openMissionDialog(rm: ResolvedMission, onAccept?: () => void) {
    const m = rm.m;
    const st = missionState(m);
    if (st === 'new') {
      this.dialog({
        title: m.tytul,
        text: `${m.opis}\n\nNagroda: ${m.nagroda} monet.`,
        buttons: ['Przyjmuję', 'Nie teraz'],
        onChoose: (i) => {
          if (i !== 0) return;
          setMissionState(m, 'active');
          if (onAccept) onAccept(); // adds it, which also spawns its enemies
          else this.startMissionGoal(rm);
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

  /** Mission doors for the map screen. */
  missionMarkers() {
    return this.missions.map((rm) => ({ x: rm.door.x, y: rm.door.y, done: missionState(rm.m) === 'done' }));
  }

  goalPosition() {
    return this.currentGoal()?.pos ?? null;
  }

  /** Radius (px) of the area to search, for wanted villains; 0 otherwise. */
  goalRadius() {
    const rm = this.missions.find((r) => missionState(r.m) === 'active');
    return rm?.m.zadanie.szukaj ? SEARCH_RADIUS + 10 : 0;
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
        const foes = rm.m.zadanie.szukaj ? [] : this.enemies.filter((e) => e.missionId === rm.m.id);
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
      sword: `${currentSword().nazwa} · walka ${session.swordSkill}`,
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

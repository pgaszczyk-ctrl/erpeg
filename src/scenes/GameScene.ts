import Phaser from 'phaser';
import { TEX, PLAYER_TEX, makePlayerTexture } from '../art';
import { LOOK_TOP, LOOK_H } from '../look';
import { touchInput, keyboardDir, consumeAttack } from '../controls';
import { Player, PLAYER } from '../objects/Player';
import { Slime } from '../objects/Slime';
import { CityMap, PX_PER_M } from '../map/CityMap';
import { MapRenderer } from '../map/MapRenderer';
import { Explored, FogView, visionPolygon, pointInPolygon, markBuilding } from '../map/Fog';
import { WROGOWIE, type RodzajWroga, type Misja } from '../content/fabula';
import { askText } from '../ui/prompt';
import { showChest } from '../ui/chest';
import { Npcs, riddleFor, today, type Npc } from './Npcs';
import { FixedNpcs } from './FixedNpcs';
import { HOTEL_CENA } from '../content/hotele';
import { cachedMap, enterWorld, getMap, mapName, stopFor, tripsFrom, type Trip } from '../travel';
import type { ZagadkaPL } from '../content/postacie';
import { tr, tx } from '../i18n';
import { rng } from '../rng';
import { OWOCE, LECZENIE_OWOCAMI, type Owoc } from '../content/sklepy';
import { PRZEDMIOTY, NAUKA_MAGII, LEKCJA, UMIEJETNOSCI, SWIATLO, PLECAK, MAKS_POZIOM, PIORUNY, type Przedmiot, type Umiejetnosc } from '../content/przedmioty';
import {
  gear, item, addItem, addFruit, fruitCount, fruitValue, sellAllFruit, practice, cooldown, skillLevel, skillProgress,
  meleeDamage, rangedWeapon, weaponEffect, eatFruit as eatInventoryFruit, blockChance, availableSkills, owns,
} from '../inventory';
import { hold, mouse, consumeRelease } from '../controls';
import { Orchards, StreetEnemies, Training } from './Ambient';
import type { Place as CityPlace, Building } from '../map/CityMap';
import {
  session, saveNow, earn, spend, missionForPlace, missionState, setMissionState, missionExp, resolveMissions, resolvePlace,
  type ResolvedMission, type Place,
} from '../quests';
import { api, type Snapshot } from '../api';
import { showMenu } from '../ui/menu';

const HEART_DROP_CHANCE = 0.25;
const RESPAWN_MS = 20000;
const DOOR_RADIUS = 14;
/** How close one has to come to a riddle-giver to talk. */
const NPC_RADIUS = 12;

/** Distance from (px, py) to the segment (ax, ay)–(bx, by). */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
/** Pause after any dialog before a character can be talked to again (ms). */
const NPC_DELAY_MS = 5000;
/** No enemies this close to home (metres). */
const HOME_SAFE_M = 40;
const GOAL_RADIUS = 40;
const HEARTBEAT_MS = 3000;
/** How long a character stays on the street after the game was closed without "Wyjdź". */
const LINGER_MS = 10000;
const HIDE_IN = new Set(['forest', 'scrub', 'wetland']);
/** Hold the attack this long (ms) to aim a ranged attack. */
const AIM_DELAY = 250;
const ARROW_SPEED = 260;
const ARROW_RANGE = 170;
const MAGIC_SPEED = 180;
const MAGIC_RANGE = 140;
/** How far from the given spot a wanted villain may hide (px). */
const SEARCH_RADIUS = 90;
const PLACE_LOOK = {
  shop: { roof: '#3f7fd8', wall: '#dbe6f5', sign: TEX.signShop },
  school: { roof: '#b84a3a', wall: '#f0d9c8', sign: TEX.signSchool },
  church: { roof: '#7a5ab8', wall: '#e6ddf3', sign: TEX.signChurch },
  office: { roof: '#8d8f99', wall: '#eeeef2', sign: TEX.signOffice },
  hospital: { roof: '#f2f2f2', wall: '#ffe6e6', sign: TEX.signHospital },
  police: { roof: '#2b3f8a', wall: '#d7def2', sign: TEX.signPolice },
  library: { roof: '#2f8a6a', wall: '#d9efe6', sign: TEX.signLibrary },
  merchant: { roof: '', wall: '', sign: TEX.cart },
  station: { roof: '', wall: '', sign: TEX.coach },
  hotel: { roof: '#8a3a6a', wall: '#f3dce9', sign: TEX.signHotel },
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
  fruits: string;
  /** Apples, plums, grapes in the backpack (the HUD shows them with the fruit pictures). */
  fruitN: [number, number, number];
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

interface Shot {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  left: number;
  damage: number;
  skill: 'luk' | 'magia';
}

type Enemy = Slime & { missionId?: string; temp?: boolean; ambient?: boolean };

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
  private orchards!: Orchards;
  private training!: Training;
  private shots: Shot[] = [];
  private aimLine!: Phaser.GameObjects.Graphics;
  private lastShot = -Infinity;
  /** Part of a heart of damage not taken yet (easy levels). */
  private damageCarry = 0;
  private npcReadyAt = 0;
  /** Resolves once the server knows about the death. */
  deathSaved: Promise<void> = Promise.resolve();
  private glow!: Phaser.GameObjects.Graphics;
  private npcs!: Npcs;
  private fixed!: FixedNpcs;
  private wornKey = '';
  private home: Building | null = null;
  /** Buildings in sight now, and ever (so each is marked explored once). */
  private seenNow = new Set<Building>();
  private seenEver = new Set<Building>();
  private homeAt = { x: 0, y: 0 };
  private lastBolt = 0;
  private streets!: StreetEnemies;
  explored = new Explored();
  private fogView!: FogView;
  /** What the hero sees right now (world polygon). */
  vision: number[] = [];
  private lastVision = { x: NaN, y: NaN, a: NaN };
  private leaving = false;
  private travelling = false;
  private justRode = false;
  private safeAt = { x: 0, y: 0 };

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
    const inLublin = this.city.id === 'lublin';
    session.mapId = this.city.id;
    this.explored.load(inLublin ? session.fog : session.fogs[this.city.id]);
    this.fogView = new FogView(this, this.explored);
    this.vision = [];
    this.lastVision = { x: NaN, y: NaN, a: NaN };

    // Home: the nearest real house to the start point (hit it to go in).
    this.home = null;
    this.homeAt = { x: -1e6, y: -1e6 };
    if (inLublin) this.setUpHome();
    makePlayerTexture(this, session.look, this.worn());
    this.wornKey = JSON.stringify(this.worn());
    // After a coach ride: at the station of the new map.
    const at = session.arrive ?? { x: session.startX, y: session.startY };
    session.arrive = null;
    this.travelling = false;
    // No enemies by home (or, in a town, by the station the coach stopped at).
    this.safeAt = inLublin ? { x: session.startX, y: session.startY } : { ...at };
    this.player = new Player(this, at.x, at.y, PLAYER_TEX, 'me');
    // Taller frames (room for hair and hats): keep the feet where a 16×16 hero has them.
    this.player.setOrigin(0.5, (8 + LOOK_TOP) / LOOK_H);
    this.player.hp = session.hp;
    Slime.tempo = session.level.tempo;
    this.npcs = new Npcs(this, this.city, today());
    this.orchards = new Orchards(this, this.city);
    this.fixed = new FixedNpcs(this, this.city, {
      dialog: (req) => this.dialog(req),
      toast: (t, ms) => this.toast(t, ms),
      riddle: (title, intro, z, exp, seed, after) => this.askRiddle(title, intro, z, exp, seed, after),
      gainExp: (n) => {
        session.exp += n;
        this.emitHud();
      },
      save: () => this.save(),
      trees: (x, y, r) => this.orchards.treesNear(x, y, r),
    });

    // Missions: gold roofs and "!" over their doors.
    // Story and admin missions are written for Lublin's addresses.
    const { missions, missing } = inLublin ? resolveMissions(this.city) : { missions: [], missing: [] as string[] };
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

    this.training = new Training(this, this.city);
    this.shots = [];
    this.aimLine = this.add.graphics().setDepth(1_050_000);
    this.glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    for (let r = 26; r > 4; r -= 4) {
      this.glow.fillStyle(0xfff3a0, 0.07);
      this.glow.fillCircle(0, 0, r);
    }
    this.lastBolt = 0;
    this.streets = new StreetEnemies(
      this.city,
      (sp) => {
        const e = this.spawnEnemy(sp.x, sp.y, undefined, sp.kind);
        e.ambient = true;
        e.roam = 150; // they come out of their alleys
        return e;
      },
      (u) => {
        const e = u as Enemy;
        if (!e.active || e.isDead) return true;
        if (e.chasing) return false;
        this.enemies = this.enemies.filter((x) => x !== e);
        e.destroy();
        return true;
      },
      session.level.potwory,
    );

    // Fixed enemy spots.
    for (const w of inLublin ? WROGOWIE : []) {
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
    // Starting in a doorway (a station after a ride, a hotel after loading):
    // don't open it until the hero walks away and comes back.
    this.nearDoor = this.city.places.find((p) => Math.hypot(p.door.x - this.player.x, p.door.y - (this.player.y + FEET.dy)) < DOOR_RADIUS)?.id ?? null;
    if (this.justRode) this.toast(`🐴 Witaj w miejscowości ${mapName(this.city.id)}! Woźnica czeka przy stacji, gdy zechcesz wracać.`, 5000);
    this.justRode = false;

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
    if (this.player.isDead || this.leaving || this.travelling) return;

    const lingering = now < this.lingerUntil;
    if (this.lingerUntil && !lingering) this.endLinger();
    const kd = keyboardDir();
    const moving = kd.x !== 0 || kd.y !== 0;
    if (lingering) this.player.move(0, 0, now);
    else this.player.move(moving ? kd.x : touchInput.x, moving ? kd.y : touchInput.y, now);
    const bx = this.player.x;
    const by = this.player.y;
    this.moveActor(this.player, dt);
    session.stats.m += Math.hypot(this.player.x - bx, this.player.y - by) / PX_PER_M;
    // Hiding in the bushes: see-through under trees.
    const hidden = this.city.areaKindsAt(this.player.x, this.player.y + FEET.dy).some((k) => HIDE_IN.has(k));
    this.player.setAlpha(hidden ? 0.5 : 1);

    if (consumeAttack() && !lingering) {
      const hit = this.player.tryAttack(now);
      if (hit) this.resolveAttack(hit, now);
    }
    this.updateRanged(now, lingering);
    this.updateShots(dt);

    const target = new Phaser.Math.Vector2(this.player.x, this.player.y);
    this.orchards.update(this.player.x, this.player.y, now);
    this.training.update(this.player.x, this.player.y, now);
    this.streets.update(this.player.x, this.player.y, now);
    this.clearHomeArea();
    const chasers = this.enemies.filter((e) => e.chasing && !e.isDead);
    for (const s of this.enemies) {
      if (s.isDead) continue;
      // Far from the hero: asleep (saves work on phones).
      if (Math.abs(s.x - this.player.x) > 380 || Math.abs(s.y - this.player.y) > 380) continue;
      // Where one goes, its friends follow.
      if (!s.chasing && chasers.some((c) => Math.abs(c.x - s.x) < 70 && Math.abs(c.y - s.y) < 70)) s.chasing = true;
      s.think(target, now);
      this.moveActor(s, dt);
      s.updateLook();
      s.setDepth(s.y);
      if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 5 + s.size) {
        const blocked = Math.random() < blockChance();
        // Difficulty scales the damage; fractions add up over hits.
        const pending = this.damageCarry + s.kind.damage * session.level.obrazenia;
        const dmg = Math.floor(pending);
        if (this.player.hurt(new Phaser.Math.Vector2(s.x, s.y), now, blocked ? 0 : dmg)) {
          if (!blocked) this.damageCarry = pending - dmg;
          if (blocked) this.toast('Zbroja zatrzymała cios!', 700);
          this.emitHud();
          if (this.player.isDead) this.onPlayerDeath();
        }
      }
    }
    this.player.setDepth(this.player.y);
    this.updateMythic(now);
    this.fixed.update(dt, this.player.x, this.player.y, now, (x, y) => pointInPolygon(this.vision, x, y));
    this.npcs.update(this.player.x, this.player.y, (x, y) => pointInPolygon(this.vision, x, y), (n) => session.riddles[n.id] === today());
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

  /** No enemies around home: any that come near vanish in a puff (no loot, no harm). */
  private clearHomeArea() {
    const r = HOME_SAFE_M * PX_PER_M;
    for (const e of this.enemies) {
      const { x, y } = this.safeAt;
      if (e.isDead || e.missionId || Math.abs(e.x - x) > r || Math.abs(e.y - y) > r) continue;
      if (Math.hypot(e.x - x, e.y - y) > r) continue;
      this.enemies = this.enemies.filter((x) => x !== e);
      this.tweens.add({ targets: e, alpha: 0, scale: 0.2, duration: 250, onComplete: () => e.destroy() });
    }
  }

  /** Mythic weapons: the glowing sword shines, the thunder sword strikes by itself. */
  private updateMythic(now: number) {
    const fx = weaponEffect();
    this.glow.setVisible(fx === 'swiatlo');
    if (fx === 'swiatlo') {
      this.glow.setPosition(this.player.x, this.player.y);
      this.glow.setAlpha(0.55 + 0.15 * Math.sin(now / 250));
      this.glow.setDepth(this.player.y - 1);
    }
    if (fx !== 'pioruny' || now - this.lastBolt < PIORUNY.co) return;
    const range = PIORUNY.zasiegM * PX_PER_M;
    // The weakest enemy in reach (so strikes finish foes off), nearest first on a tie.
    let foe: Enemy | null = null;
    let best = Infinity;
    for (const e of this.enemies) {
      if (e.isDead || !e.visible) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d > range) continue;
      const score = e.hp * 1000 + d;
      if (score < best) {
        best = score;
        foe = e;
      }
    }
    if (!foe) return;
    this.lastBolt = now;
    this.drawBolt(foe.x, foe.y);
    if (foe.hit(new Phaser.Math.Vector2(foe.x, foe.y - 10), now, PIORUNY.obrazenia)) this.onEnemyKilled(foe);
  }

  /** A zigzag of light from the sky onto (x, y). */
  private drawBolt(x: number, y: number) {
    const g = this.add.graphics().setDepth(1_060_000);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 7; i++) pts.push([x + (i === 7 ? 0 : (Math.random() - 0.5) * 14), y - 90 + (i * 90) / 7]);
    for (const [w, c] of [[5, 0x6fb7ff], [2, 0xffffff]] as const) {
      g.lineStyle(w, c, 1);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.strokePath();
    }
    g.fillStyle(0xcfe6ff, 0.7);
    g.fillCircle(x, y, 7);
    this.cameras.main.flash(60, 180, 210, 255, false);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** Recomputes what the hero sees and hides whatever is outside of it. */
  private updateFog() {
    const p = this.player;
    const a = Math.atan2(p.facing.y, p.facing.x);
    const lv = this.lastVision;
    // (written as !(<=) so the first frame, with NaN, always computes)
    if (!this.vision.length || !(Math.abs(p.x - lv.x) <= 0.5 && Math.abs(p.y - lv.y) <= 0.5 && Math.abs(a - lv.a) <= 0.01)) {
      this.seenNow = new Set();
      this.vision = visionPolygon(this.city, this.explored, p.x, p.y + 2, a, weaponEffect() === 'swiatlo' ? SWIATLO : 1, this.seenNow, session.level.tyl);
      for (const b of this.seenNow) {
        if (this.seenEver.has(b)) continue;
        this.seenEver.add(b);
        markBuilding(this.explored, this.city, b);
      }
      this.lastVision = { x: p.x, y: p.y, a };
    }
    this.fogView.update(this.cameras.main, this.vision, this.seenNow);
    for (const e of this.enemies) if (!e.isDead) e.setVisible(pointInPolygon(this.vision, e.x, e.y));
    for (const i of this.pickups) i.setVisible(pointInPolygon(this.vision, i.x, i.y));
  }

  /** Moves a sprite by its velocity, sliding along walls, buildings and water. */
  private moveActor(a: Player | Slime, dt: number) {
    const dx = a.vel.x * dt;
    const dy = a.vel.y * dt;
    const fy = a.y + FEET.dy;
    const free = (x: number, y: number) =>
      this.city.isFree(x, y, FEET.hw, FEET.hh) && !this.orchards.blocked(x, y) && !this.training.blocked(x, y);
    if (dx && free(a.x + dx, fy)) a.x += dx;
    if (dy && free(a.x, fy + dy)) a.y += dy;
  }

  // ------------------------------------------------------------------ combat

  private resolveAttack(hit: Phaser.Math.Vector2, now: number) {
    if (this.hitsHome(hit.x, hit.y) && !this.inCombat()) {
      session.at = null; // the next login starts at home
      this.save();
      this.openHome();
      return;
    }
    let hits = 0;
    // Easy levels: the sword sweeps a wide arc around the hero.
    const arc = (session.level.miecz * Math.PI) / 180;
    const aim = Math.atan2(hit.y - (this.player.y + 2), hit.x - this.player.x);
    const reach = (PLAYER.attackReach + PLAYER.attackRadius) * this.player.reach;
    const inArc = (s: Enemy) => {
      if (!arc) return false;
      const dx = s.x - this.player.x;
      const dy = s.y - (this.player.y + 2);
      if (Math.hypot(dx, dy) > reach + s.size) return false;
      const d = Math.abs(((Math.atan2(dy, dx) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return d <= arc / 2;
    };
    if (arc) this.drawSweep(aim, arc, reach);
    // An enemy right on top of the hero is always hit too.
    const onHero = (s: Enemy) => Phaser.Math.Distance.Between(this.player.x, this.player.y + 2, s.x, s.y) < s.size + 7;
    for (const s of [...this.enemies]) {
      if (s.isDead) continue;
      if (Phaser.Math.Distance.Between(hit.x, hit.y, s.x, s.y) > PLAYER.attackRadius * this.player.reach + s.size && !inArc(s) && !onHero(s)) continue;
      hits++;
      if (s.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now, meleeDamage())) this.onEnemyKilled(s);
    }
    // Fruit trees: each swing knocks one fruit down.
    // Fruit trees don't count as sword practice.
    const tree = this.orchards.hitAt(hit.x, hit.y, 12 * this.player.reach);
    if (tree && this.orchards.shake(tree)) this.dropFruit(tree.x, tree.y, tree.fruit);
    if (this.training.hitAt(hit.x, hit.y, 12 * this.player.reach, 'miecz')) hits++;
    if (hits) this.practiced('miecz');
  }

  /** A white swoosh along the sword's arc. */
  private drawSweep(aim: number, arc: number, reach: number) {
    const g = this.add.graphics().setDepth(this.player.depth + 1);
    const cx = this.player.x;
    const cy = this.player.y + 2;
    g.lineStyle(4, 0xffffff, 0.35);
    g.beginPath();
    g.arc(cx, cy, reach * 0.8, aim - arc / 2, aim + arc / 2);
    g.strokePath();
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.beginPath();
    g.arc(cx, cy, reach * 0.8, aim - arc / 2, aim + arc / 2);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private dropFruit(x: number, y: number, fruit: Owoc) {
    const tex = fruit === 'jablko' ? TEX.fruitApple : fruit === 'sliwka' ? TEX.fruitPlum : TEX.fruitGrape;
    const tx = x + (Math.random() - 0.5) * 16;
    const ty = y + 4 + Math.random() * 8;
    const item = this.add.image(x, y - 10, tex).setDepth(ty);
    item.setData('kind', `fruit:${fruit}`);
    // Falls from the crown to the ground, then can be picked up.
    this.tweens.add({ targets: item, x: tx, y: ty, duration: 280, ease: 'Bounce.Out', onComplete: () => this.pickups.push(item) });
  }

  private onEnemyKilled(s: Enemy) {
    this.dropLoot(s.x, s.y);
    this.enemies = this.enemies.filter((e) => e !== s);
    session.exp += s.kind.exp;
    session.stats.kills[s.kindId] = (session.stats.kills[s.kindId] ?? 0) + 1;
    this.emitHud();
    if (s.temp || s.ambient) return;
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
      // Spread them around the spot on free ground, preferably on a street
      // or path (so they can't end up shut in a courtyard).
      for (let t = 0; t < 120; t++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * spread;
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (!this.city.isFree(x, y + FEET.dy, FEET.hw, FEET.hh)) continue;
        if (t < 80 && !this.city.roadAt(x, y)) continue;
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
    const kind = item.getData('kind') as string;
    if (kind === 'heart') this.player.heal(2);
    else if (kind.startsWith('fruit:')) {
      const f = kind.slice(6) as Owoc;
      if (!addFruit(f)) {
        // Stays on the ground; don't keep complaining every frame.
        if (!item.getData('warned')) this.toast('Plecak pełny!', 1200);
        item.setData('warned', true);
        return;
      }
      session.stats.fruit++;
      this.toast(`+1 ${OWOCE[f].nazwa}`, 800);
    } else earn(1);
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
    const inLublin = this.city.id === 'lublin';
    const place = inLublin ? this.city.describe(this.player.x, this.player.y) : `${mapName(this.city.id)}, ${this.city.describe(this.player.x, this.player.y)}`;
    // The ghost screen shows Lublin: someone who died in a town haunts home.
    const x = Math.round(inLublin ? this.player.x : session.startX);
    const y = Math.round(inLublin ? this.player.y : session.startY);
    this.deathSaved = new Promise<void>((done) => {
      const report = () =>
        api.die(session.token, session.exp, place, x, y, PX_PER_M, session.stats)
          .then(() => done())
          .catch(() => setTimeout(report, 3000));
      report();
    });
  }

  // ------------------------------------------------------------------ sessions

  /** What the server keeps in case this tab is closed without "Wyjdź". */
  private snapshot(): Snapshot {
    const near = this.enemies.filter(
      (e) => !e.isDead && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 200,
    );
    return {
      s: PX_PER_M,
      m: this.city.id,
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
    // Left on another map than the one we start on: nothing to replay.
    if (!a || !a.enemies?.length || (a.m ?? 'lublin') !== this.city.id) return;
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
    // Back to the last save point: the hotel slept in, or home.
    const back = session.at && session.at.m === this.city.id ? session.at : { x: session.startX, y: session.startY };
    this.player.setPosition(back.x, back.y);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.toast(session.at ? 'Przetrwałeś! Wracasz do hotelu, w którym ostatnio spałeś.' : 'Przetrwałeś! Wracasz do domu.');
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

  /** `reopen`: show this character right away (the ghost screen after dying). */
  backToMenu(reopen?: { name: string; code: string }) {
    const game = this.game;
    this.keepFog();
    game.scene.stop('ui');
    game.scene.stop('game');
    // Every session starts in Lublin, at home.
    const lublin = cachedMap('lublin') ?? this.city;
    game.registry.set('city', lublin);
    showMenu(lublin, reopen).then(() => enterWorld(game));
  }

  /** Puts what was explored on this map into the session (saved with the game). */
  private keepFog() {
    if (this.city.id === 'lublin') session.fog = this.explored.serialize();
    else session.fogs[this.city.id] = this.explored.serialize();
  }

  private save() {
    this.keepFog();
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
    let savePoint = true;
    const fixed = this.fixed.at(fx, fy - FEET.dy, NPC_RADIUS);
    if (!id && fixed) {
      id = `fixed-${fixed.id}`;
      open = () => this.fixed.talk(fixed);
      savePoint = false;
    }
    const npc = this.npcs.at(fx, fy - FEET.dy, NPC_RADIUS);
    if (!id && npc) {
      id = npc.id;
      open = () => this.openRiddle(npc);
      savePoint = false; // saved after the answer
    }
    // Characters wait a few seconds after the last talk, so bumping into one
    // right after a dialog doesn't start another by accident.
    if (id && (fixed || npc) && performance.now() < this.npcReadyAt) {
      this.nearDoor = id; // walk away and come back to talk
      return;
    }
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
          savePoint = p.kind !== 'hotel'; // the hotel saves itself, with its spot
        }
      }
    }
    if (id === this.nearDoor) return;
    this.nearDoor = id;
    if (open) {
      if (savePoint) this.save(); // entering a building is a save point
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
    if (p.kind === 'shop' || p.kind === 'merchant') return this.openShop(p);
    if (p.kind === 'station') return this.openCoach(p);
    if (p.kind === 'hotel') return this.openHotel(p);
    if (p.kind === 'school') return this.openSchool(p);
    if (p.kind === 'hospital') return this.openHospital(p);
    if (p.kind === 'library') return this.openLibrary(p);
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

  /** The coachman at a railway station: rides to the next stations for coins. */
  private openCoach(p: CityPlace) {
    const lat = this.city.toLatLon(p.door.x, p.door.y);
    const from = stopFor(this.city.id, p.name, lat.lat, lat.lon);
    const trips = from ? tripsFrom(from) : [];
    const title = `🐴 Woźnica – ${p.name}`;
    if (!trips.length) {
      this.dialog({ title, text: 'Woźnica karmi konia. „Dziś nigdzie nie jadę, koń odpoczywa.”', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const where = (t: Trip) => (t.to.mapName === t.to.name || t.to.name.startsWith(t.to.mapName) ? t.to.name : `${t.to.name} (${t.to.mapName})`);
    const lines = trips.map((t) => `• ${where(t)}${t.via ? ` (przez ${t.via})` : ''}: ${t.km.toFixed(0)} km – ${t.price} monet`);
    this.dialog({
      title,
      text: `„Wio, koniku! Zawiozę cię do następnej stacji albo jeszcze dalej.” Masz ${session.coins} monet.\n\n${lines.join('\n')}`,
      buttons: [...trips.map((t) => `${where(t)} – ${t.price} 💰`), 'Zostaję'],
      onChoose: (i) => {
        const t = trips[i];
        if (!t) return;
        if (session.coins < t.price) {
          this.toast(`Za mało monet: przejazd kosztuje ${t.price}.`);
          return;
        }
        this.travel(t);
      },
    });
  }

  /** A hotel: saves the game here, and the next login starts at this door. */
  private openHotel(p: CityPlace) {
    const here = session.at && session.at.m === this.city.id && Math.hypot(session.at.x - p.door.x, session.at.y - p.door.y) < 4;
    const title = `🏨 ${p.name}`;
    if (session.coins < HOTEL_CENA) {
      this.dialog({ title, text: `Nocleg kosztuje ${HOTEL_CENA} monet, a masz ${session.coins}. Recepcjonista kręci głową.`, buttons: ['OK'], onChoose: () => {} });
      return;
    }
    this.dialog({
      title,
      text: `Nocleg z zapisem gry kosztuje ${HOTEL_CENA} monet (masz ${session.coins}). Po wczytaniu postaci zaczniesz właśnie tutaj.${here ? '\n\nTo twój obecny hotel.' : ''}`,
      buttons: [`🛏 Śpię tu (${HOTEL_CENA} 💰)`, 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0) return;
        spend(HOTEL_CENA);
        session.at = { m: this.city.id, x: p.door.x, y: p.door.y };
        this.player.heal(PLAYER.maxHp);
        this.emitHud();
        this.save();
        this.toast('🛏 Wyspany! Gra zapisana w hotelu.', 3000);
      },
    });
  }

  /** Rides to another station: loads its map and starts there. */
  private travel(t: Trip) {
    if (this.travelling) return;
    this.travelling = true;
    spend(t.price);
    this.emitHud();
    this.keepFog();
    this.toast(`🐴 Jedziemy do: ${t.to.name}…`, 3000);
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    Promise.all([getMap(t.to.mapId), new Promise((ok) => this.time.delayedCall(1000, ok))])
      .then(([city]) => {
        const st = city.places.find((q) => q.kind === 'station' && q.name === t.to.name);
        session.arrive = st ? { ...st.door } : city.freeNear(city.fromLatLon(t.to.lat, t.to.lon).x, city.fromLatLon(t.to.lat, t.to.lon).y);
        session.hp = this.player.hp;
        this.justRode = true;
        this.game.registry.set('city', city);
        this.scene.stop('ui');
        this.scene.restart();
      })
      .catch((e: Error) => {
        // Could not load that map: the money comes back.
        earn(t.price);
        session.stats.earned -= t.price;
        session.stats.spent -= t.price;
        this.travelling = false;
        cam.fadeIn(300);
        this.toast(`Woźnica nie znalazł drogi: ${e.message}`);
        this.emitHud();
      });
  }

  /** Finds the hero's house next to the start point and marks it. */
  private setUpHome() {
    const sx = session.startX;
    const sy = session.startY;
    const R = 40 * PX_PER_M;
    let best: Building | null = null;
    let bestD = Infinity;
    for (const b of this.city.query({ x0: sx - R, y0: sy - R, x1: sx + R, y1: sy + R }).buildings) {
      const d = this.city.entranceOf(b);
      const dist = Math.hypot(d.x - sx, d.y - sy);
      if (dist < bestD) {
        bestD = dist;
        best = b;
      }
    }
    this.home = best;
    let at = { x: sx, y: sy - 3 };
    if (best) {
      // A house-sized building gets a homely red roof; a big block keeps its own.
      if (best.x1 - best.x0 < 30 * PX_PER_M && best.y1 - best.y0 < 30 * PX_PER_M) this.mapView.highlight.set(best, { roof: '#c75b4a', wall: '#f3e2a0' });
      const cx = (best.x0 + best.x1) / 2;
      const cy = (best.y0 + best.y1) / 2;
      // On the roof: the middle of the house if that is inside it, else by the door.
      // On the roof just inside the edge nearest the start point: walk from
      // the start towards the house until we are over its roof.
      let found = false;
      for (const t of [{ x: cx, y: cy }, this.city.entranceOf(best)]) {
        const dx = t.x - sx;
        const dy = t.y - sy;
        const len = Math.hypot(dx, dy) || 1;
        for (let d = 0; d < len + 40 && !found; d += 2) {
          const x = sx + (dx / len) * d;
          const y = sy + (dy / len) * d;
          if (this.city.buildingAt(x, y) === best) {
            at = { x: x + (dx / len) * 5, y: y + (dy / len) * 5 };
            if (this.city.buildingAt(at.x, at.y) !== best) at = { x, y };
            found = true;
          }
        }
        if (found) break;
      }
    }
    this.homeAt = at;
    // A small, soft house sign sitting on the roof.
    this.add.image(at.x, at.y, TEX.home).setScale(0.55).setAlpha(0.85).setDepth(1_100_000);
  }

  /** A swing that lands on the house (or right by it) opens the door. */
  private hitsHome(x: number, y: number) {
    if (this.home && this.city.buildingAt(x, y) === this.home) return true;
    return Math.hypot(x - this.homeAt.x, y - this.homeAt.y) < 12;
  }

  /** Home: full health, the chest and money kept there. */
  private openHome() {
    const hurt = this.player.hp < PLAYER.maxHp;
    this.player.heal(PLAYER.maxHp);
    this.emitHud();
    this.dialog({
      title: '🏠 Twój domek',
      text: `${hurt ? 'Odpocząłeś w domu – zdrowie w pełni!' : 'Dom, słodki dom.'}\n\nW skrzyni masz ${session.chest.coins} monet i ${session.chest.slots.filter(Boolean).length} rzeczy.`,
      buttons: ['📦 Otwórz skrzynię', 'Wyjdź'],
      onChoose: (i) => {
        if (i !== 0) return;
        this.scene.pause();
        showChest(() => {
          this.scene.resume();
          consumeAttack();
          this.gearChanged();
          this.save();
        });
      },
    });
  }

  /** A riddle with one try (fixed characters); answers are shuffled by `seed`. */
  private askRiddle(title: string, intro: string, z: ZagadkaPL, exp: number, seed: string, after: (right: boolean) => void) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    const r = rng(h >>> 0);
    const order = z.odpowiedzi.map((_, i) => i).sort(() => r() - 0.5);
    const answers = order.map((i) => tr(z.odpowiedzi[i]));
    const correct = order.indexOf(0);
    this.dialog({
      title,
      text: `${intro}\n\n${tr(z.pytanie)}\n\n${tx(`Nagroda: ${exp} EXP. Tylko jedna próba!`, `Reward: ${exp} EXP. Only one try!`)}`,
      buttons: [...answers, tx('Później', 'Later')],
      onChoose: (i) => {
        if (i >= answers.length) return;
        const right = i === correct;
        after(right);
        if (right) {
          session.exp += exp;
          session.stats.riddles = (session.stats.riddles ?? 0) + 1;
          this.emitHud();
        }
        this.dialog({
          title: right ? tx('🎉 Brawo!', '🎉 Well done!') : tx('😕 Niestety…', '😕 Not quite…'),
          text: right ? `+${exp} EXP` : tx(`Dobra odpowiedź to: ${answers[correct]}.`, `The right answer is: ${answers[correct]}.`),
          buttons: ['OK'],
          onChoose: () => {},
        });
        this.save();
      },
    });
  }

  /** A riddle-giver: one riddle a day, one try. */
  private openRiddle(n: Npc) {
    const day = today();
    if (session.riddles[n.id] === day) {
      this.dialog({ title: n.name, text: 'Na dziś to wszystko! Wróć jutro po nową zagadkę.', buttons: ['Do jutra!'], onChoose: () => {} });
      return;
    }
    const r = riddleFor(n, day, session.age);
    this.dialog({
      title: `❓ ${n.name}`,
      text: `${n.greeting}\n\n${r.question}\n\nNagroda: ${r.reward} monet i ${r.reward} EXP. Tylko jedna próba!`,
      buttons: [...r.answers, 'Później'],
      onChoose: (i) => {
        if (i >= r.answers.length) return;
        // Remember only today's answers.
        for (const [k, v] of Object.entries(session.riddles)) if (v !== day) delete session.riddles[k];
        session.riddles[n.id] = day;
        session.stats.riddles = (session.stats.riddles ?? 0) + (i === r.correct ? 1 : 0);
        if (i === r.correct) {
          earn(r.reward);
          session.exp += r.reward;
          this.emitHud();
        }
        this.dialog({
          title: i === r.correct ? '🎉 Brawo!' : '😕 Niestety…',
          text: i === r.correct
            ? `Dobra odpowiedź! Dostajesz ${r.reward} monet i ${r.reward} EXP.`
            : `Dobra odpowiedź to: ${r.answers[r.correct]}.\nWróć jutro po nową zagadkę!`,
          buttons: ['OK'],
          onChoose: () => {},
        });
        this.save();
      },
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
    this.refreshLook();
    const lvl = skillLevel('miecz');
    this.player.attackCooldown = cooldown('miecz');
    this.player.reach = 1 + (lvl - 1) * 0.04;
  }

  /** One use of a skill; tells the player when it levels up. */
  private practiced(skill: Umiejetnosc, points = 1) {
    const up = practice(skill, points);
    const pr = skillProgress(skill);
    this.game.events.emit('practice', { skill, ...pr, max: pr.level >= MAKS_POZIOM });
    if (up) {
      this.toast(`${UMIEJETNOSCI[skill].nazwa}: poziom ${up}! Szybsze ataki.`, 2200);
      this.applySkill();
      this.emitHud();
    }
  }

  // ------------------------------------------------------------------ ranged

  /** Direction of the current aim, or null when not aiming. */
  private aimDirection(): { x: number; y: number } | null {
    if (!hold.active) return null;
    const held = performance.now() - hold.start;
    if (held < AIM_DELAY && !hold.dragged) return null;
    return this.dirFor(hold.mode, hold.dx, hold.dy, hold.dragged);
  }

  private dirFor(mode: 'touch' | 'mouse' | 'key', dx: number, dy: number, dragged: boolean) {
    let v = { x: this.player.facing.x, y: this.player.facing.y };
    if (mode === 'touch' && dragged) v = { x: dx, y: dy };
    if (mode === 'mouse') {
      const cam = this.cameras.main;
      v = { x: mouse.x - (this.player.x - cam.worldView.x) * cam.zoom, y: mouse.y - (this.player.y - cam.worldView.y) * cam.zoom };
    }
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  }

  /** Press and hold to aim, let go to shoot (bow or magic). */
  private updateRanged(now: number, lingering: boolean) {
    const weapon = rangedWeapon();
    const aim = weapon && !lingering ? this.aimDirection() : null;
    this.aimLine.clear();
    if (aim) {
      // Dotted aim line.
      const range = weapon!.rodzaj === 'magia' ? MAGIC_RANGE : ARROW_RANGE;
      this.aimLine.fillStyle(weapon!.rodzaj === 'magia' ? 0x9be7ff : 0xffffff, 0.85);
      for (let d = 10; d < range; d += 7) this.aimLine.fillRect(this.player.x + aim.x * d - 1, this.player.y + aim.y * d - 1, 2, 2);
      this.player.facing.set(aim.x, aim.y);
    }
    const r = consumeRelease();
    if (!r || !weapon || lingering) return;
    if (r.held < AIM_DELAY && !r.dragged) return; // a plain click: melee only
    const skill = weapon.rodzaj === 'magia' ? 'magia' : 'luk';
    if (now - this.lastShot < cooldown(skill)) return;
    this.lastShot = now;
    const dir = this.dirFor(r.mode, r.dx, r.dy, r.dragged);
    const speed = skill === 'magia' ? MAGIC_SPEED : ARROW_SPEED;
    // Starts at the hero, so nothing standing right next to them is skipped.
    const sprite = this.add
      .image(this.player.x, this.player.y, skill === 'magia' ? TEX.magicShot : TEX.arrowShot)
      .setRotation(Math.atan2(dir.y, dir.x))
      .setDepth(1_040_000);
    this.shots.push({ sprite, vx: dir.x * speed, vy: dir.y * speed, left: skill === 'magia' ? MAGIC_RANGE : ARROW_RANGE, damage: weapon.moc, skill });
  }

  private updateShots(dt: number) {
    const now = this.time.now;
    for (const shot of [...this.shots]) {
      const step = Math.hypot(shot.vx, shot.vy) * dt;
      const sp = shot.sprite;
      const ox = sp.x;
      const oy = sp.y;
      sp.x += shot.vx * dt;
      sp.y += shot.vy * dt;
      shot.left -= step;
      // Check the whole path of this frame (walls and enemies), so a shot
      // never slips through.
      let done = shot.left <= 0;
      for (let t = 0.25; t <= 1 && !done; t += 0.25) {
        if (this.city.buildingAt(ox + (sp.x - ox) * t, oy + (sp.y - oy) * t) !== undefined) done = true;
      }
      if (!done) {
        const foe = this.enemies.find((e) => !e.isDead && distToSegment(e.x, e.y, ox, oy, sp.x, sp.y) < e.size + 3);
        if (foe) {
          done = true;
          this.practiced(shot.skill);
          if (foe.hit(new Phaser.Math.Vector2(sp.x - shot.vx, sp.y - shot.vy), now, shot.damage)) this.onEnemyKilled(foe);
        } else if (this.training.hitAt(sp.x, sp.y, 8, shot.skill)) {
          done = true;
          this.practiced(shot.skill);
        } else if (this.training.anyAt(sp.x, sp.y, 6)) done = true;
      }
      if (done) {
        this.shots = this.shots.filter((x) => x !== shot);
        this.tweens.add({ targets: sp, alpha: 0, duration: 120, onComplete: () => sp.destroy() });
      }
    }
  }

  // ------------------------------------------------------------------ shops, schools, library

  /** Buys an item: pays, equips it or puts it in the backpack. */
  private buy(p: Przedmiot) {
    if (session.coins < p.cena) {
      this.toast(`Za mało monet – ${p.nazwa} kosztuje ${p.cena}.`);
      return;
    }
    const where = addItem(p.id);
    if (!where) {
      this.toast('Plecak pełny! Zrób miejsce w karcie postaci.');
      return;
    }
    spend(p.cena);
    this.applySkill();
    this.emitHud();
    this.toast(where === 'equipped' ? `Kupiłeś i założyłeś: ${p.nazwa}!` : `Kupiłeś: ${p.nazwa} (w plecaku).`);
    this.save();
  }

  /** The next better item of each kind this place sells. */
  private offers(where: 'sklep' | 'biblioteka') {
    const out: Przedmiot[] = [];
    const groups: [Przedmiot['miejsce'], Przedmiot['rodzaj']?][] =
      where === 'biblioteka' ? [['dystans', 'magia'], ['helm']] : [['bron'], ['dystans', 'luk'], ['zbroja'], ['helm'], ['buty']];
    for (const [miejsce, rodzaj] of groups) {
      const all = PRZEDMIOTY.filter((p) => p.miejsce === miejsce && p.rodzaj === rodzaj && p.cena > 0 && (p.gdzie ?? 'sklep') === where);
      if (miejsce === 'helm') {
        // Headwear is also about looks: every one not owned yet is on offer.
        out.push(...all.filter((p) => !owns(p.id)));
        continue;
      }
      const best = Math.max(0, ...all.filter((p) => owns(p.id)).map((p) => p.moc), miejsce === 'bron' ? meleeDamage() : 0);
      const next = all.filter((p) => p.moc > best).sort((a, b) => a.moc - b.moc)[0];
      if (next) out.push(next);
    }
    return out;
  }

  private label(p: Przedmiot) {
    const what = p.miejsce === 'bron' || p.miejsce === 'dystans' ? `obrażenia ${p.moc}` : `obrona ${p.moc}`;
    return `${p.nazwa} – ${p.cena} monet (${what})`;
  }

  private openShop(p: CityPlace) {
    const offers = this.offers('sklep');
    const value = fruitValue();
    const sell = value > 0 ? [`Sprzedaj owoce – ${value} monet`] : [];
    this.dialog({
      title: p.kind === 'merchant' ? `🛒 Obwoźny kupiec (${p.name})` : `🛒 ${p.name}`,
      text: (p.kind === 'merchant' ? `Kupiec z wozem zatrzymał się na rondzie. Masz ${session.coins} monet.` : `Kowal za ladą poleca swój towar. Masz ${session.coins} monet.`) + (offers.length ? '' : '\n\nMasz już najlepsze rzeczy, jakie tu mają!'),
      buttons: [...sell, ...offers.map((o) => this.label(o)), 'Wyjdź'],
      onChoose: (i) => {
        if (sell.length && i === 0) {
          const v = sellAllFruit();
          earn(v);
          this.emitHud();
          this.toast(`Sprzedałeś owoce za ${v} monet!`);
          this.save();
          return;
        }
        const o = offers[i - sell.length];
        if (o) this.buy(o);
      },
    });
  }

  /** Schools give lessons: coins for practice in the skills you have. */
  private openSchool(p: CityPlace) {
    const skills = availableSkills();
    const lines = skills.map((k) => `${UMIEJETNOSCI[k].nazwa}: poziom ${skillLevel(k)}`).join('\n');
    this.dialog({
      title: `🏫 ${p.name}`,
      text: `Nauczyciel poprawi twoją technikę.\n\n${lines}\n\nMasz ${session.coins} monet.`,
      buttons: [...skills.map((k) => `Lekcja: ${UMIEJETNOSCI[k].nazwa} – ${LEKCJA.cena} monet (+${LEKCJA.punkty})`), 'Wyjdź'],
      onChoose: (i) => {
        const k = skills[i];
        if (!k) return;
        if (session.coins < LEKCJA.cena) {
          this.toast(`Za mało monet – lekcja kosztuje ${LEKCJA.cena}.`);
          return;
        }
        spend(LEKCJA.cena);
        this.practiced(k, LEKCJA.punkty);
        this.emitHud();
        this.toast(`Lekcja zaliczona: +${LEKCJA.punkty} punktów (${UMIEJETNOSCI[k].nazwa}).`);
        this.save();
      },
    });
  }

  /** Libraries teach magic and sell magic items. */
  private openLibrary(p: CityPlace) {
    const offers = gear.magic ? this.offers('biblioteka') : [];
    const learn = gear.magic ? [] : [`Naucz się magii – ${NAUKA_MAGII} monet`];
    this.dialog({
      title: `📚 ${p.name}`,
      text: gear.magic
        ? `Bibliotekarka szepcze: magii nie ćwiczy się w ciszy. Masz ${session.coins} monet.`
        : `W starych księgach zapisano sztukę magii. Po nauce będziesz też magiem: przytrzymaj atak z różdżką, kulą albo księgą w ręce, by rzucać zaklęcia. Masz ${session.coins} monet.`,
      buttons: [...learn, ...offers.map((o) => this.label(o)), 'Wyjdź'],
      onChoose: (i) => {
        if (learn.length && i === 0) {
          if (session.coins < NAUKA_MAGII) {
            this.toast(`Za mało monet – nauka kosztuje ${NAUKA_MAGII}.`);
            return;
          }
          spend(NAUKA_MAGII);
          gear.magic = true;
          this.emitHud();
          this.toast('Jesteś teraz także magiem! Kup różdżkę, by rzucać zaklęcia.', 3000);
          this.save();
          return;
        }
        const o = offers[i - learn.length];
        if (o) this.buy(o);
      },
    });
  }

  /** Eating fruit (character sheet): 20 fruit = one heart. Returns the new health, or null. */
  eatFruit(): number | null {
    if (this.player.isDead || this.player.hp >= PLAYER.maxHp) return null;
    if (!eatInventoryFruit(LECZENIE_OWOCAMI.owocow)) return null;
    this.player.heal(2 * LECZENIE_OWOCAMI.serduszek);
    this.emitHud();
    this.toast('Mniam! +1 ❤', 1200);
    return this.player.hp;
  }

  /** After things were put on or off in the character sheet. */
  /** What the hero wears that shows on the sprite. */
  private worn() {
    return { helm: gear.equip.helm, armor: gear.equip.zbroja, boots: gear.equip.buty };
  }

  /** Redraws the hero when a helmet, armour or boots go on or off. */
  private refreshLook() {
    const w = JSON.stringify(this.worn());
    if (w === this.wornKey) return;
    this.wornKey = w;
    const frame = this.player.frame.name;
    makePlayerTexture(this, session.look, this.worn());
    this.player.setTexture(PLAYER_TEX, frame);
  }

  gearChanged() {
    this.applySkill();
    this.vision = []; // a glowing sword changes how far we see
    this.emitHud();
  }

  /** For automated browser checks. */
  debugSession() {
    return session;
  }

  debugGear() {
    return gear;
  }

  debugAddFruit(f: Owoc) {
    return addFruit(f);
  }

  /** Shops and schools for the map screen. */
  placeMarkers() {
    return this.city.places.map((p) => ({ x: p.door.x, y: p.door.y, kind: p.kind }));
  }

  /** `onAccept` is for random missions: they join the game only when taken. */
  private openMissionDialog(rm: ResolvedMission, onAccept?: () => void) {
    const m = rm.m;
    const st = missionState(m);
    if (m.zadanie.typ === 'brak') {
      // Just a place (e.g. a partner with a secret code on a flyer).
      this.missionDialog(m, { title: m.tytul, text: m.opis, buttons: ['Do widzenia'], onChoose: () => {} });
    } else if (st === 'new') {
      this.missionDialog(m, {
        title: m.tytul,
        text: `${m.opis}\n\nNagroda: ${m.nagroda} monet${m.przedmiot ? ` + ${item(m.przedmiot)?.nazwa}` : ''}.`,
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
      this.missionDialog(m, { title: m.tytul, text: `Jeszcze nie skończyłeś.\n\nCel: ${m.zadanie.cel}`, buttons: ['OK'], onChoose: () => {} });
    } else if (st === 'goal') {
      this.missionDialog(m, {
        title: m.tytul,
        text: `${m.zakonczenie}\n\nNagroda: ${m.nagroda} monet i ${missionExp(m)} EXP` + (m.przedmiot ? ` oraz ${item(m.przedmiot)?.nazwa}` : ''),
        buttons: ['Dziękuję!'],
        onChoose: () => {
          earn(m.nagroda);
          session.stats.missions++;
          session.exp += missionExp(m);
          if (m.przedmiot) {
            const where = addItem(m.przedmiot);
            this.toast(where ? `Dostałeś: ${item(m.przedmiot)?.nazwa}!` : `Plecak pełny – ${item(m.przedmiot)?.nazwa} przepadł.`, 2500);
            this.applySkill();
          }
          setMissionState(m, 'done');
          this.refreshMarkers();
          this.emitHud();
          this.save(); // finishing a mission is a save point
        },
      });
    } else {
      this.missionDialog(m, { title: m.tytul, text: 'Dziękujemy jeszcze raz za pomoc!', buttons: ['OK'], onChoose: () => {} });
    }
  }

  /** A mission dialog; where a secret code can be told, it gets one more button. */
  private missionDialog(m: Misja, req: DialogRequest) {
    if (!session.secrets.has(m.id)) return this.dialog(req);
    const secret = '🤫 Psst, mam tajemne hasło';
    this.dialog({
      ...req,
      buttons: [...req.buttons.slice(0, -1), secret, ...req.buttons.slice(-1)],
      onChoose: (i) => {
        const at = req.buttons.length - 1;
        if (i === at) this.tellSecret(m);
        else req.onChoose(i > at ? i - 1 : i);
      },
    });
  }

  /** Asks for a code (from a flyer in the real place) and gives its reward. */
  private async tellSecret(m: Misja) {
    if (gear.bag.length >= PLECAK.miejsc) {
      this.toast('Zrób najpierw miejsce w plecaku – nagroda musi się zmieścić!', 3000);
      return;
    }
    this.scene.pause();
    const code = await askText('🤫 Tajemne hasło', 'Ktoś tu nachyla się i szepcze: „Znasz hasło?”', 'hasło z ulotki');
    this.scene.resume();
    consumeAttack();
    if (!code) return;
    try {
      const { reward } = await api.redeem(session.token, m.id, code);
      const p = item(reward);
      if (!p || !addItem(reward)) throw new Error('Nie udało się odebrać nagrody.');
      session.stats.codes++;
      this.gearChanged();
      this.dialog({
        title: '✨ Hasło przyjęte!',
        text: `Dostajesz: ${p.nazwa}!${p.opis ? `\n\n${p.opis}` : ''}`,
        buttons: ['Wow, dzięki!'],
        onChoose: () => {},
      });
      this.save();
    } catch (e) {
      this.toast((e as Error).message, 3000);
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
        this.npcReadyAt = performance.now() + NPC_DELAY_MS;
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
      sword: `${item(gear.equip.bron)?.nazwa ?? 'Kijek'} · poz. ${skillLevel('miecz')}` + (rangedWeapon() ? `  🏹 ${rangedWeapon()!.nazwa}` : ''),
      fruits: `🍎${fruitCount('jablko')} 🟣${fruitCount('sliwka')} 🍇${fruitCount('winogrono')}`,
      fruitN: [fruitCount('jablko'), fruitCount('sliwka'), fruitCount('winogrono')],
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

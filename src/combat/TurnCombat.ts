import type Phaser from 'phaser';
import type { Player } from '../objects/Player';
import type { Enemy, DialogRequest } from '../scenes/GameScene';
import type { Gang } from '../scenes/Ambient';
import { SPOTKANIA as C, ruchyPoziomu, kosztRuchow, aktywnaFala } from '../content/spotkania';
import { WALKA } from '../content/walka';
import { PX_PER_M } from '../map/CityMap';
import { PLAYER } from '../objects/Player';
import { PIORUNY } from '../content/przedmioty';
import { session } from '../quests';
import { tx, lang } from '../i18n';
import { gear, rangedWeapon, meleeDamage, shotDamage, hitChance, strongFactor, instaKillChance, blockChance, gearAimBonus, weaponEffect, saveGear } from '../inventory';
import { resetTouch, resetKeys, cancelPress, typingInField, setCombatInput } from '../controls';
import { clearSegment, distance, pathLength, route, roll, incoming, type Point } from './rules';
import { storeCombat, type CombatSave, type SavedEnemy, type CombatLoot } from './state';
import '../ui/turnCombat.css';
import { itemPictureUrl } from '../ui/itemIcon';

export interface TurnHost {
  scene: Phaser.Scene; player: Player; map: string;
  enemies(): Enemy[]; visible(p: Point): boolean; free(x: number, y: number): boolean;
  hit(e: Enemy, damage: number, skill: 'miecz' | 'luk' | 'magia' | null, strong: boolean): void;
  hurt(e: Enemy, damage: number): void;
  ammo(): boolean; heal(): boolean; canHeal(): boolean;
  neutral(): { id: string; point: Point; talk(): void } | null;
  talkDragon(e: Enemy): void;
  mist(p: Point, neutral: boolean): Phaser.GameObjects.Image;
  restore(state: CombatSave): Enemy[];
  loot(): CombatLoot[];
  duel(e: Enemy): SavedEnemy['duel'];
  life(): [number, number];
  save(state: CombatSave | null): Promise<unknown>;
  hud(): void; menu(): void; blocked(): boolean;
}

type Mode = 'attack' | 'move' | 'special';
type Intent = Point & { angle: number; reach: number };

/** TEST-only owner of all combat simulation; scenery can keep rendering. */
export class TurnCombat {
  active = false;
  prompting = false;
  private phase: 'hero' | 'enemy' = 'hero';
  private round = 1;
  private moves = 0;
  private max = 0;
  rng = Math.floor(Math.random() * 4294967296) >>> 0;
  private mode: Mode = 'attack';
  private special: 'strong' | 'heal' = 'strong';
  private group: Enemy[] = [];
  private wave: Enemy[] = [];
  private responded = new Set<number>();
  private stunned = new Set<number>();
  private intents = new Map<number, Intent>();
  private ids = new WeakMap<Enemy, number>();
  private nextId = 1;
  private gang?: Gang;
  private target?: Enemy;
  private path: Point[] | null = null;
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private mapInput: HTMLDivElement;
  private g: Phaser.GameObjects.Graphics;
  private ignored = new Map<string, Point>();
  private mists = new Map<string, Phaser.GameObjects.Image>();
  private nextScan = 0;
  private locked = false;
  private saved = true;
  private animation = 0;
  private motion?: { actor: Player | Enemy; path: Point[]; done: number; length: number };
  private message = '';
  private luckUntil = 0;
  private pending = session.testCombat;
  private nextLuck: 'krytyk' | 'unik' | 'blok' | 'dodatkowy' | null = null;
  private destroyed = false;
  private origin = '';

  constructor(private h: TurnHost) {
    document.getElementById('turn-combat')?.remove();
    this.root = document.createElement('div'); this.root.id = 'turn-combat'; this.root.hidden = true;
    this.mapInput = document.createElement('div'); this.mapInput.className = 'tc-map';
    this.panel = document.createElement('div'); this.panel.className = 'tc-panel'; this.panel.setAttribute('aria-label', tx('Walka', 'Combat'));
    const menu = document.createElement('button'); menu.textContent='☰'; menu.setAttribute('aria-label','Menu');
    menu.style.cssText='position:absolute;top:8px;left:8px;pointer-events:auto';menu.onclick=()=>{this.root.hidden=true;this.h.menu();};
    this.root.append(this.mapInput, this.panel, menu); document.body.append(this.root);
    this.mapInput.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (this.ready()) this.pick(this.world(e.clientX, e.clientY)); });
    this.g = h.scene.add.graphics().setDepth(999_500); // under the actual fog of war
    window.addEventListener('keydown', this.key, true);
    window.addEventListener('exp-session-expired',this.expired);
    h.scene.events.once('shutdown', () => this.destroy());
  }

  private id(e: Enemy) { let n = this.ids.get(e); if (!n) { n = this.nextId++; this.ids.set(e, n); } return n; }
  private expired=()=>{storeCombat(session.name,null);session.testCombat=null;};
  private live(e: Enemy) { return e.active && !e.isDead; }
  private ready() { return this.active && this.phase === 'hero' && !this.locked && this.h.scene.scene.isActive() && !document.getElementById('sesja-wygasla'); }
  get held() { return this.active || this.prompting || !!this.pending; }

  /** Deterministic hooks available only because this class is instantiated on TEST. */
  forceLuck(k: 'krytyk' | 'unik' | 'blok' | 'dodatkowy') { this.nextLuck = k; }
  defeat() { if(this.active)this.finish(); }
  inspect() { return { active: this.active, phase: this.phase, round: this.round, moves: this.moves, max: this.max, locked: this.locked, rng: this.rng, wave: this.wave.map((e) => ({ id: this.id(e), hp: e.hp, x: e.x, y: e.y })), intents: [...this.intents] }; }

  private key = (e: KeyboardEvent) => {
    if (!this.active || this.h.blocked() || typingInField(e) || !this.h.scene.scene.isActive() || document.getElementById('sesja-wygasla')) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.path || this.target) { this.path = null; this.target = undefined; this.render(); }
      else this.h.menu();
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation(); cancelPress(); resetTouch(); resetKeys();
    if (e.repeat || !this.ready()) return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === 'a') this.choose('attack');
    else if (k === '2' || k === 'r') this.choose('move');
    else if (k === '3' || k === 's') this.choose('special');
    else if (k === 'h') { this.choose('special'); this.special = 'heal'; this.render(); }
    else if (k === 'e') this.endTurn();
    else if (k === 'enter' || k === ' ') this.confirm();
    else if (k === 'tab') { const es = this.wave.filter((q) => this.live(q) && this.h.visible(q)); this.target = es[(es.indexOf(this.target!) + 1) % es.length]; this.render(); }
    else if (k.startsWith('arrow') && this.mode === 'move') {
      const p = this.path?.at(-1) ?? this.h.player, d = C.siatkaPx;
      this.pick({ x: p.x + (k === 'arrowright' ? d : k === 'arrowleft' ? -d : 0), y: p.y + (k === 'arrowdown' ? d : k === 'arrowup' ? -d : 0) });
    }
  };

  private world(x: number, y: number) {
    const canvas = this.h.scene.game.canvas, rect = canvas.getBoundingClientRect();
    const cam = this.h.scene.cameras.main;
    return cam.getWorldPoint((x - rect.left) * canvas.width / rect.width, (y - rect.top) * canvas.height / rect.height);
  }

  private visibleEnemies() { return this.h.enemies().filter((e) => this.live(e) && this.h.visible(e)); }
  private groupKey(e: Enemy) { return e.gang ? `g:${e.gang.id}` : e.missionId ? `m:${e.missionId}` : `e:${this.id(e)}`; }

  /** Called before the old player/AI loop; a held turn runs no real-time game mechanics. */
  update(now: number, dt: number) {
    if (this.pending) {
      const s = this.pending; this.pending = null;
      if (s.map === this.h.map && s.scale === PX_PER_M) this.resume(s);
    }
    if (this.active) {
      if(this.h.blocked()){this.root.hidden=true;setCombatInput(false);return;}
      setCombatInput(true);
      this.root.hidden=false;
      cancelPress(); resetTouch(); resetKeys();
      if (this.h.player.isDead) { this.finish(); return; }
      if (this.motion) {
        const m = this.motion; m.done = Math.min(m.length, m.done + dt * m.length / (C.animacjaMs / 1000));
        let left = m.done;
        for (let i = 1; i < m.path.length; i++) {
          const a = m.path[i - 1], b = m.path[i], d = distance(a, b);
          if (left <= d || i === m.path.length - 1) {
            m.actor.setPosition(a.x + (b.x - a.x) * Math.min(1, left / (d || 1)), a.y + (b.y - a.y) * Math.min(1, left / (d || 1)));
            m.actor.setDepth(m.actor.y); break;
          }
          left -= d;
        }
        if (m.done >= m.length) { m.actor.vel.set(0, 0); this.motion = undefined; }
      }
      this.animation -= dt * 1000;
      if (this.locked && this.saved && this.animation <= 0 && !this.motion) { this.locked = false; this.render(); }
      this.syncGroup();
      this.draw();
      if (this.locked || !this.h.scene.scene.isActive()) return;
      if (!this.wave.some((e) => this.live(e))) {
        if (this.group.some((e) => this.live(e))) { this.nextWave(); this.newTurn(); this.commit(); }
        else this.finish();
        return;
      }
      if (this.phase === 'enemy') this.enemyAction();
      else if (this.moves < Math.min(...Object.values(C.koszt))) this.endTurn();
      return;
    }
    if (this.prompting || now < this.nextScan) return;
    this.nextScan = now + 350;
    const hero = this.h.player;
    for (const [key, at] of this.ignored) if (distance(hero, at) > C.interakcjaM * PX_PER_M * 1.6) this.ignored.delete(key);
    const es = this.visibleEnemies();
    const found = new Set<string>();
    for (const e of es) {
      const key = this.groupKey(e); found.add(key);
      let mist = this.mists.get(key);
      if (!mist) { mist = this.h.mist(e, !!e.peaceful); this.mists.set(key, mist); }
      const at = e.gang?.formation ?? e;
      mist.setPosition(at.x, at.y).setVisible(distance(hero, e) < 180 * PX_PER_M);
    }
    for (const [key, im] of this.mists) if (!found.has(key)) { im.destroy(); this.mists.delete(key); }
    const e = es.sort((a, b) => distance(hero, a) - distance(hero, b)).find((q) => !this.ignored.has(this.groupKey(q)) && distance(hero, q) < C.interakcjaM * PX_PER_M && this.approachable(q));
    if (e) this.offer(e);
    else {
      const n = this.h.neutral();
      if (n && !this.ignored.has(n.id) && distance(hero, n.point) < C.interakcjaM * PX_PER_M && this.approachable(n.point)) this.offerTalk(n.id, n.point, n.talk);
    }
  }

  private approachable(p: Point) {
    // No scripted approach/teleport: interaction from a reachable, visible point on the same passage.
    return !!route(this.h.player, p, C.interakcjaM * PX_PER_M * 1.6, this.h.free, C.siatkaPx);
  }

  offerTalk(key: string, point: Point, talk: () => void) {
    if (this.held) return;
    this.prompting = true; resetTouch(); resetKeys(); this.h.player.vel.set(0, 0);
    this.h.scene.game.events.emit('dialog', {
      title: tx('Spotkanie', 'Encounter'), text: tx('Widzisz kogoś w pobliżu. Możesz podejść i porozmawiać.', 'Someone is nearby. You can approach and talk.'),
      buttons: [tx('Podejdź bliżej', 'Approach'), tx('Uniknij', 'Avoid')],
      onChoose: (i: number) => { this.prompting = false; this.ignored.set(key, { ...point }); cancelPress(); resetTouch(); resetKeys(); if (i === 0) talk(); },
    } satisfies DialogRequest);
  }

  offer(e: Enemy) {
    if (this.held || !this.live(e)) return;
    const key = this.groupKey(e);
    if (e.peaceful) return this.offerTalk(key, e, () => this.h.talkDragon(e));
    this.prompting = true; resetTouch(); resetKeys(); this.h.player.vel.set(0, 0);
    const known = this.visibleEnemies().filter((q) => this.groupKey(q) === key);
    const strong = known.some((q) => ['smok','herszt','wielki_herszt','koziol','wielki_glut'].includes(q.kindId));
    this.h.scene.game.events.emit('dialog', {
      title: tx('Spotkanie', 'Encounter'),
      text: (known.length > 1 ? tx('Widzisz zwartą grupkę przeciwników.', 'You see a close group of opponents.') : tx(`W pobliżu: ${e.kind.name}.`, `Nearby: ${e.kindId === 'smok' ? 'a dragon' : 'an opponent'}.`)) + '\n\n' + tx('Ta grupa jest wroga. Podejście rozpocznie starcie.', 'They are hostile. Approaching starts combat.') + (strong ? '\n⚠ ' + tx('To silniejszy przeciwnik.', 'This is a stronger opponent.') : ''),
      buttons: [tx('Podejdź bliżej', 'Approach'), tx('Uniknij', 'Avoid')],
      onChoose: (i: number) => { this.prompting = false; this.ignored.set(key, { x: e.x, y: e.y }); cancelPress(); resetTouch(); resetKeys(); if (i === 0 && this.live(e)) this.start(e); },
    } satisfies DialogRequest);
  }

  start(e: Enemy) {
    if (this.active) return;
    this.origin=session.testCombatBase;
    this.gang = e.gang;
    const key = this.groupKey(e);
    this.group = this.h.enemies().filter((q) => this.live(q) && !q.peaceful && (this.groupKey(q) === key || !q.gang && !q.missionId && !e.gang && !e.missionId && distance(q, e) < C.grupaM * PX_PER_M * 2));
    this.active = true; this.round = 1; this.intents.clear(); this.stunned.clear(); this.nextWave(); this.newTurn();
    this.message = tx('W swojej turze wydajesz ruchy na atak, przemieszczenie i zdolności.', 'Spend moves on attacks, repositioning and abilities during your turn.');
    document.body.classList.add('turn-combat'); this.root.hidden = false; setCombatInput(true);
    this.commit();
  }

  private syncGroup() {
    if (this.gang) for (const e of this.h.enemies()) if (e.gang === this.gang && this.live(e) && !this.group.includes(e)) {
      this.group.push(e); this.id(e);
      this.message = tx('Nadchodzi następna faza: herszt i jego obstawa czekają w kolejce.', 'Next phase: the boss and escort are waiting in the queue.');
    }
  }
  private nextWave() {
    this.wave = this.group.filter((e) => this.live(e)).sort((a,b)=>Number(this.h.visible(b))-Number(this.h.visible(a))||distance(a,this.h.player)-distance(b,this.h.player)).slice(0, aktywnaFala(PLAYER.maxHp));
    this.target = this.wave.find((e) => this.h.visible(e)); this.mode = 'attack'; this.path = null;
  }
  private newTurn() {
    this.phase = 'hero'; this.responded.clear(); this.max = ruchyPoziomu(importLevel()); this.moves = this.max;
    const forced = this.nextLuck === 'dodatkowy';
    if (forced || roll(this) < C.szczescie.dodatkowy) { if (forced) this.nextLuck = null; this.moves++; this.max++; this.luck(tx('+1 ruch', '+1 move')); }
    // Automatic lightning is resolved once at the beginning of a hero turn, never by a frame timer.
    if (weaponEffect() === 'pioruny') {
      const e = this.wave.find((q) => this.live(q) && this.h.visible(q) && distance(q, this.h.player) <= PIORUNY.zasiegM * PX_PER_M && this.line(q));
      if (e) this.h.hit(e, PIORUNY.obrazenia, null, false);
    }
  }

  choose(mode: Mode) { if (!this.ready()) return; this.mode = mode; this.path = null; this.message = ''; this.render(); }
  private pick(p: Point) {
    if (this.mode === 'move') {
      this.path = route(this.h.player, p, C.krokM * PX_PER_M, this.h.free, C.siatkaPx);
      if(this.path&&pathLength(this.path)<1)this.path=null;
      this.message = this.path ? `${(pathLength(this.path) / PX_PER_M).toFixed(1)} m · ${this.cost(C.koszt.ruch)}` : tx('Nie ma dostępnej drogi w zasięgu. Ruchy pozostają bez zmian.', 'No reachable route in range. No moves spent.');
    } else {
      this.target = this.wave.filter((e) => this.live(e) && this.h.visible(e)).sort((a,b) => distance(a,p)-distance(b,p)).find((e) => distance(e,p) < e.size + 14);
      this.message = this.target ? '' : tx('Wskaż widocznego przeciwnika.', 'Choose a visible opponent.');
    }
    this.render();
  }
  private cost(n: number) { return kosztRuchow(n, lang === 'en'); }
  private line(e: Point) { return clearSegment(this.h.player, e, (x,y) => this.h.free(x,y)); }
  private reach(strong: boolean) {
    const weapon = rangedWeapon();
    return weapon ? (weapon.rodzaj === 'magia' ? C.magiaM : C.lukM) * PX_PER_M : (PLAYER.attackReach + PLAYER.attackRadius) * this.h.player.reach * (strong ? WALKA.zasiegMiecz : 1);
  }
  private reason() {
    if (!this.ready()) return tx('Poczekaj na swoją turę.', 'Wait for your turn.');
    const heal = this.mode === 'special' && this.special === 'heal';
    const cost = this.mode === 'move' ? C.koszt.ruch : heal ? C.koszt.leczenie : this.mode === 'special' ? C.koszt.mocny : C.koszt.atak;
    if (this.moves < cost) return tx('Za mało ruchów.', 'Not enough moves.');
    if (heal) return this.h.canHeal() ? '' : tx('Pełne zdrowie lub brak zapasów leczenia.', 'Full health or no healing supplies.');
    if (this.mode === 'move') return this.path ? '' : tx('Wskaż dostępną pozycję na mapie.', 'Choose a reachable position on the map.');
    const e = this.target;
    if (!e || !this.live(e) || !this.wave.includes(e) || !this.h.visible(e)) return tx('Wybierz widoczny cel.', 'Choose a visible target.');
    if (e.inAir || distance(this.h.player, e) > this.reach(this.mode === 'special') + e.size || !this.line(e)) return tx('Cel poza zasięgiem lub za przeszkodą.', 'Target out of range or behind an obstacle.');
    const w = rangedWeapon();
    if (w?.rodzaj === 'luk' && gear.ammo[w.amunicja ?? 'strzaly'] <= 0) return tx('Brak amunicji.', 'No ammunition.');
    return '';
  }

  confirm() {
    const reason = this.reason(); if (reason) { this.message = reason; this.render(); return; }
    this.locked = true; // lock before any damage, reward callback or save can run
    if (this.mode === 'move') {
      const path = this.path!;
      if (!path.every((p,i) => i === 0 || clearSegment(path[i-1],p,this.h.free))) { this.locked = false; this.path = null; this.message = tx('Droga jest zablokowana.', 'The route is blocked.'); this.render(); return; }
      this.moves -= C.koszt.ruch;
      session.stats.m += pathLength(path) / PX_PER_M;
      this.animateMove(this.h.player, path);
    } else if (this.mode === 'special' && this.special === 'heal') {
      if (!this.h.heal()) { this.locked = false; return; }
      this.moves -= C.koszt.leczenie;
    } else {
      const e = this.target!, strong = this.mode === 'special', w = rangedWeapon();
      if (w?.rodzaj === 'luk' && !this.h.ammo()) { this.locked = false; return; }
      const skill = w ? w.rodzaj === 'magia' ? 'magia' : 'luk' : 'miecz';
      this.moves -= strong ? C.koszt.mocny : C.koszt.atak;
      this.h.player.face(e.x - this.h.player.x, e.y - this.h.player.y);
      const critical = this.nextLuck === 'krytyk' || roll(this) < C.szczescie.krytyk;
      if (this.nextLuck === 'krytyk') this.nextLuck = null;
      if (roll(this) < hitChance(skill, strong, session.level.celnosc + gearAimBonus())) {
        const instant=skill==='luk'&&!WALKA.bezNatychmiast.includes(e.kindId)&&roll(this)<instaKillChance();
        const damage = instant?e.hp:(w ? shotDamage(w) : meleeDamage()) * (strong ? strongFactor(skill) : 1) * (critical ? C.szczescie.mnoznik : 1);
        this.h.hit(e, damage, skill, strong);
        if ((strong || e.isDazed(this.h.scene.time.now)) && e.kindId !== 'smok') this.stunned.add(this.id(e));
        if (critical) this.luck(tx('Krytyk', 'Critical hit'));
      } else { this.h.hit(e, 0, skill, strong); this.message = tx('Pudło!', 'Miss!'); }
    }
    this.path = null; this.h.hud(); this.syncGroup(); this.commit();
  }

  endTurn() {
    if (!this.ready()) return;
    this.phase = 'enemy'; this.path = null; this.responded.clear(); this.commit();
  }

  private enemyAction() {
    const e = this.wave.find((q) => this.live(q) && !this.responded.has(this.id(q)));
    if (!e) { this.round++; this.newTurn(); this.commit(); return; }
    this.responded.add(this.id(e));
    const id = this.id(e), hero = this.h.player;
    if (this.stunned.delete(id)) { this.message = tx('Ogłuszony przeciwnik pomija ruch.', 'A stunned opponent skips its move.'); this.commit(); return; }
    const reach = 5 + e.size;
    const intent = this.intents.get(id);
    if (intent) {
      this.intents.delete(id);
      const a = Math.atan2(hero.y - intent.y, hero.x - intent.x);
      const diff = Math.abs(Math.atan2(Math.sin(a - intent.angle), Math.cos(a - intent.angle)));
      if (distance(hero, intent) <= intent.reach && diff <= C.stozekStopnie * Math.PI / 360 && clearSegment(intent,hero,this.h.free)) this.strike(e, C.mocnyWroga);
      else this.message = tx('Silny cios minął bohatera!', 'The heavy strike missed!');
    } else if (distance(e, hero) <= reach && clearSegment(e, hero, this.h.free)) {
      if (['smok','herszt','wielki_herszt','koziol'].includes(e.kindId) && this.round % 2 === 1) {
        this.intents.set(id, { x: e.x, y: e.y, angle: Math.atan2(hero.y-e.y,hero.x-e.x), reach: reach + 12 });
        this.message = tx('Przeciwnik przygotowuje silny cios. Odsuń się od zaznaczonego obszaru.', 'The opponent prepares a heavy strike. Step out of the marked area.');
      } else this.strike(e, 1);
    } else {
      const a = Math.atan2(e.y-hero.y,e.x-hero.x), r = Math.max(4, reach-1);
      const goal = { x: hero.x + Math.cos(a)*r, y: hero.y + Math.sin(a)*r };
      const full = route(e, goal, Math.min(180, distance(e,goal)*1.6+20), this.h.free, C.siatkaPx);
      if (full) {
        const path: Point[] = [full[0]]; let left = C.krokWrogaM * PX_PER_M;
        for (let i=1;i<full.length && left>0;i++) { const p=path.at(-1)!, q=full[i], d=distance(p,q); path.push(d<=left?q:{x:p.x+(q.x-p.x)*left/d,y:p.y+(q.y-p.y)*left/d}); left-=d; }
        this.animateMove(e,path);
      }
      this.message = tx('Przeciwnik wydaje swój ruch na podejście. Nie atakuje w tym samym ruchu.', 'The opponent spends its move approaching. It cannot attack with the same move.');
    }
    this.h.hud(); this.commit();
  }

  private strike(e: Enemy, factor: number) {
    let result: 'unik' | 'blok' | 'hit';
    if (this.nextLuck === 'unik') { result = 'unik'; this.nextLuck = null; }
    else if (this.nextLuck === 'blok' && blockChance() > 0) { result = 'blok'; this.nextLuck = null; }
    else result = incoming(() => roll(this), C.szczescie.unik, blockChance());
    if (result === 'unik') this.luck(tx('Unik', 'Dodge'));
    else if (result === 'blok') this.luck(tx('Blok', 'Block'));
    else this.h.hurt(e, e.kind.damage * (e.power ?? 1) * session.level.obrazenia * C.obrazeniaWroga * factor);
  }

  private animateMove(actor: Player | Enemy, path: Point[]) {
    if (path.length < 2) return;
    this.motion = { actor, path, done: 0, length: pathLength(path) };
    actor.vel.set(path[1].x-path[0].x,path[1].y-path[0].y);
    if ('face' in actor) (actor as Player).face(path[1].x-path[0].x,path[1].y-path[0].y);
    actor.setPosition(path.at(-1)!.x,path.at(-1)!.y); // checkpoint contains the paid destination
  }

  private luck(text: string) {
    this.root.querySelector('.tc-luck')?.remove();
    const el = document.createElement('div'); el.className = 'tc-luck'; el.setAttribute('role','status');
    el.textContent = '🍀 ' + tx('Szczęście! ', 'Lucky! ') + text; this.root.append(el); this.luckUntil = performance.now()+1800;
  }

  private serialize(): CombatSave {
    const enemies: SavedEnemy[] = this.group.filter((e)=>this.live(e)).map((e)=>({id:this.id(e),x:e.x,y:e.y,hp:e.hp,kind:e.kindId,missionId:e.missionId,temp:e.temp,ambient:e.ambient,folkQuest:e.folkQuest,carrier:e.carrier,gatunek:e.gatunek,berserk:e.berserk,power:e.power,slot:this.gang ? [...this.gang.members].find(([,m])=>m===e)?.[0] : undefined,boss:this.gang?.bossObj===e,duel:this.h.duel(e)}));
    const g=this.gang, p=this.h.player;
    return {version:1,origin:this.origin,stamp:Date.now(),map:this.h.map,scale:PX_PER_M,nonce:session.nonce,phase:this.phase,round:this.round,moves:this.moves,max:this.max,rng:this.rng,active:this.wave.map((e)=>this.id(e)),responded:[...this.responded],enemies,hero:{x:p.x,y:p.y,hp:p.hp,extra:p.extra,extraUntil:p.extraUntil},intents:[...this.intents],stunned:[...this.stunned],loot:this.h.loot(),gang:g?{id:g.id,kind:g.kind,x:g.x,y:g.y,r:g.r,spots:g.spots,alive:[...g.alive],boss:g.boss,formation:g.formation}:undefined,progress:structuredClone({exp:session.exp,coins:session.coins,stats:session.stats,missions:session.missions,story:session.story,mikstury:session.mikstury,etap:session.etap,fabula:session.fabula,flagi:session.flagi,gear:saveGear()})};
  }

  private commit() {
    if(!this.active)return;
    this.locked = true; this.saved = false; this.animation = C.animacjaMs;
    this.syncGroup();
    const state=this.serialize(); session.testCombat=state; storeCombat(session.name,state);
    // The snapshot and ordinary save contain the same action result. Inputs stay locked on failure.
    this.h.save(state).then(()=>{if(!this.destroyed){this.saved=true;this.render();}},()=>{
      if(this.destroyed)return;
      this.message=tx('Nie udało się zapisać ruchu. Sprawdź połączenie i ponów zapis.', 'Could not save the move. Check your connection and retry.');this.render(true);
    });
    this.render();
    if(this.motion) this.motion.actor.setPosition(this.motion.path[0].x,this.motion.path[0].y);
  }

  private resume(s: CombatSave) {
    this.origin=s.origin;
    this.group=this.h.restore(s); this.group.forEach((e,i)=>this.ids.set(e,s.enemies[i].id)); this.nextId=Math.max(0,...s.enemies.map(e=>e.id))+1;
    this.gang=this.group.find(e=>e.gang)?.gang; this.wave=s.active.map(id=>this.group.find(e=>this.id(e)===id)).filter((e):e is Enemy=>!!e);
    this.active=true; this.phase=s.phase; this.round=s.round; this.moves=s.moves; this.max=s.max; this.rng=s.rng;
    this.responded=new Set(s.responded);this.intents=new Map(s.intents);this.stunned=new Set(s.stunned);
    this.target=this.wave.find(e=>this.h.visible(e));this.message=tx('Wracasz do przerwanego starcia. Pozostałe ruchy i wyniki losowań są zachowane.', 'Resuming your encounter. Remaining moves and random results are preserved.');
    this.root.hidden=false;document.body.classList.add('turn-combat');setCombatInput(true);this.render();
  }

  private finish() {
    this.active=false;setCombatInput(false);this.g.clear();this.root.hidden=true;document.body.classList.remove('turn-combat');session.testCombat=null;
    this.group.forEach(e=>{e.vel.set(0,0);this.ignored.set(this.groupKey(e),{x:e.x,y:e.y});});
    cancelPress();resetTouch();resetKeys();this.h.player.vel.set(0,0);this.h.hud();
    // Clear the local recovery checkpoint after the server has acknowledged completion.
    const name=session.name;
    this.h.save(null).then(()=>storeCombat(name,null),()=>{});
  }

  private render(retry=false) {
    if(!this.active)return;
    this.panel.replaceChildren();
    const row=document.createElement('div');row.className='tc-status';
    const title=document.createElement('h2');title.textContent=this.phase==='hero'?tx('Twoja tura','Your turn'):tx('Ruch przeciwników','Opponents’ turn');
    const count=document.createElement('span');count.textContent=`${tx('Ruchy','Moves')}: ${this.moves}/${this.max}`;row.append(title,count);this.panel.append(row);
    const life=document.createElement('span');const [hp,maxHp]=this.h.life();life.textContent=`♥ ${Math.ceil(hp)}/${maxHp}`;row.append(life);
    const info=document.createElement('p');info.setAttribute('role','status');info.textContent=this.message||this.reason()||tx('Zatwierdź wybrane działanie.','Confirm the selected action.');this.panel.append(info);
    if(this.group.some(e=>this.live(e)&&!this.wave.includes(e)&&this.h.visible(e))){const q=document.createElement('small');q.textContent=tx('Pozostali widoczni przeciwnicy czekają na następną falę.','The other visible opponents are waiting for the next wave.');this.panel.append(q);}
    const buttons=(cls='tc-actions')=>{const el=document.createElement('div');el.className=cls;this.panel.append(el);return el;};
    const button=(parent:HTMLElement,label:string,fn:()=>void,disabled=false,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.setAttribute('aria-pressed',String(active));b.onclick=(e)=>{e.stopPropagation();fn();};parent.append(b);return b;};
    const actions=buttons(), w=rangedWeapon(), attackIcon=w?.rodzaj==='magia'?'✨':w?'🏹':'⚔';
    for(const [m,label,cost] of [['attack',`${attackIcon} ${tx('Atak','Attack')}`,C.koszt.atak],['move',`↗ ${tx('Ruch','Move')}`,C.koszt.ruch],['special',`✦ ${tx('Specjalne','Special')}`,C.koszt.leczenie]] as const){
      const b=button(actions,label,()=>this.choose(m),!this.ready(),this.mode===m);
      if(m==='attack'){const url=itemPictureUrl(gear.equip.bron??'kijek');if(url){b.textContent=tx('Atak','Attack');const img=document.createElement('img');img.src=url;img.alt='';img.className='tc-wpn';b.prepend(img);}}
      const small=document.createElement('small');small.textContent=m==='special'?`${this.cost(cost)}–${this.cost(C.koszt.mocny)}`:this.cost(cost);b.append(small);
    }
    if(this.mode==='special'){
      const r=buttons();button(r,`${tx('Mocny atak','Heavy attack')} · ${this.cost(C.koszt.mocny)}`,()=>{this.special='strong';this.render();},!this.ready(),this.special==='strong');
      button(r,`${tx('Leczenie','Heal')} · ${this.cost(C.koszt.leczenie)}`,()=>{this.special='heal';this.render();},!this.ready(),this.special==='heal');
    }
    if(this.mode!=='move' && !(this.mode==='special'&&this.special==='heal')){
      const targets=buttons();for(const e of this.wave.filter(e=>this.live(e)&&this.h.visible(e)))button(targets,`${lang==='pl'?e.kind.name:tx('Przeciwnik','Opponent')} · ${Math.ceil(e.hp)} ♥`,()=>{this.target=e;this.render();},!this.ready(),this.target===e);
    }
    const footer=buttons();
    if(retry)button(footer,tx('Ponów zapis','Retry save'),()=>this.commit());
    else button(footer,tx('Zatwierdź','Confirm'),()=>this.confirm(),!!this.reason());
    button(footer,tx('Anuluj wybór','Cancel selection'),()=>{this.path=null;this.target=undefined;this.message='';this.render();},!this.ready()).className='tc-minor';
    button(footer,tx('Zakończ turę','End turn'),()=>this.endTurn(),!this.ready()).className='tc-minor';
    this.mapInput.style.bottom=`${this.panel.getBoundingClientRect().height+24}px`;
  }

  private draw() {
    this.g.clear();
    if(performance.now()>this.luckUntil)this.root.querySelector('.tc-luck')?.remove();
    const p=this.h.player;
    if(this.mode==='move'){
      this.g.lineStyle(.7,0xf5d18e,.75).strokeCircle(p.x,p.y,C.krokM*PX_PER_M);
      if(this.path){this.g.lineStyle(1.3,0x9bdfbf,1);this.g.beginPath();this.g.moveTo(this.path[0].x,this.path[0].y);for(const q of this.path.slice(1))this.g.lineTo(q.x,q.y);this.g.strokePath();const q=this.path.at(-1)!;this.g.strokeCircle(q.x,q.y,3);}
    }
    for(const e of this.wave){if(!this.live(e)||!this.h.visible(e))continue;this.g.lineStyle(e===this.target?1.4:.7,e===this.target?0xffdf88:0xb4c9c2,.9).strokeCircle(e.x,e.y,e.size+3);}
    for(const [id,t] of this.intents){const e=this.wave.find(q=>this.id(q)===id);if(!e||!this.live(e)||!this.h.visible(e))continue;const half=C.stozekStopnie*Math.PI/360;this.g.fillStyle(0xe97845,.22);this.g.beginPath();this.g.moveTo(t.x,t.y);this.g.arc(t.x,t.y,t.reach,t.angle-half,t.angle+half);this.g.closePath();this.g.fillPath();this.g.lineStyle(.8,0xffba80,.9);this.g.strokePath();}
  }

  destroy() {this.destroyed=true;setCombatInput(false);window.removeEventListener('keydown',this.key,true);window.removeEventListener('exp-session-expired',this.expired);this.root.remove();this.g.destroy();for(const im of this.mists.values())im.destroy();document.body.classList.remove('turn-combat');cancelPress();resetTouch();resetKeys();}
}

// Avoid importing the entire scene or a second copy of the level curve.
import { poziomPostaci } from '../content/historia';
const importLevel=()=>poziomPostaci(session.exp);

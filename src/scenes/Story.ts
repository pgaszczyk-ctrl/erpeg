import { SKALA_POSTACI } from '../skala';
import { TEST } from '../version';
import Phaser from 'phaser';
import { TEX, makeLookTexture } from '../art';
import { fitHd, ensureHd } from '../sprites';
import { PX_PER_M, type CityMap, type Place } from '../map/CityMap';
import { HISTORIA, MELODIA, poziomPostaci, imieMedrca, expNaPoziom } from '../content/historia';
import { TRUDNOSCI } from '../content/trudnosc';
import { playMelody } from '../ui/melody';
import { showBrag } from '../ui/brag';
import { consumeAttack } from '../controls';
import { session, earn, krotkaNazwa, type Story as StoryState } from '../quests';
import { PROBY_MAGA, type Proba } from '../content/probyMaga';
import { addFruit, totalFruit, eatFruit } from '../inventory';
import { screech } from '../sfx';
import type { Slime } from '../objects/Slime';
import type { DialogRequest } from './GameScene';

// The main story, "Cień smoka" (content/historia.ts): the dragon's shadow
// after a minute of walking, asking around at schools and churches, the
// wizard by the university and the dragon itself (fight it or talk to it).
// Before the required level the wizard hands out trials (content/probyMaga.ts):
// a gang, a lesson about dragons, a burnt circle, a potion – each with a note.

type Dragon = Slime & { peaceful?: boolean; missionId?: string };

export interface StoryHost {
  player: Phaser.GameObjects.Sprite;
  dialog: (req: DialogRequest) => void;
  toast: (text: string, ms?: number) => void;
  save: () => void;
  hud: () => void;
  visible: (x: number, y: number) => boolean;
  spawnDragon: (x: number, y: number) => Dragon;
  /** Nearby enemies run away in fear. */
  scare: (x: number, y: number) => void;
  /** The nearest active monster gang (the wizard's first trial). */
  nearestGang: (x: number, y: number, maxPx: number) => { x: number; y: number; r: number } | null;
  /** A free spot for a gang of that kind about `m` metres away, and placing one there (the gang trial). */
  gangSpot: (x: number, y: number, m: number, kind: string) => { x: number; y: number } | null;
  placeGang: (id: string, x: number, y: number, kind: string) => void;
  /** A quiet spot in fields or a wood 300–900 m away (the burnt circle). */
  questSpot: (x: number, y: number) => { x: number; y: number } | null;
}

/** Puts values into a text's {placeholders}. */
function fill(t: string, v: Record<string, string | number>) {
  return t.replace(/\{(\w+)\}/g, (all, k: string) => (k in v ? String(v[k]) : all));
}

const WIZARD_LOOK = { head: 1, build: 0, outfit: 1, hair: 3, skin: 1, hairColor: 5, top: 4, bottom: 4 };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class Story {
  /** A scene is playing (the hero can't move). */
  busy = false;
  private wizard?: Phaser.GameObjects.Sprite;
  private wizardLabel?: Phaser.GameObjects.Text;
  private dragon?: Dragon;
  private met = false;
  /** The scale from the shadow, lying on the ground. */
  private scale?: Phaser.GameObjects.GameObject[];
  /** The burnt circle of the trial „krag”, once the hero is near. */
  private ring?: Phaser.GameObjects.GameObject[];
  /** Trial checks run a few times a second. */
  private trialAt = 0;
  /** The place whose trial dialog was shown (shown again after walking away). */
  private shownAt: string | null = null;
  /** The trial's gang was put on this scene's map. */
  private gangPlaced = false;

  constructor(private scene: Phaser.Scene, private city: CityMap, private host: StoryHost) {
    const st = this.state;
    if (st.target && st.target.m === city.id && st.st !== 'start' && st.st !== 'cien') this.placeWizard();
    if (st.st === 'smok' && st.dragon && st.dragon.m === city.id) this.placeDragon();
    if (st.luska && !st.luska.done && st.luska.m === city.id) this.placeScale();
  }

  private get state(): StoryState {
    return session.story;
  }

  get dragonSprite() {
    return this.dragon;
  }

  /** Called every frame; `moving` = the hero walked this frame. */
  update(dt: number, moving: boolean) {
    const st = this.state;
    if (st.st === 'start' && moving && !this.busy) {
      st.walked += dt;
      if (st.walked >= HISTORIA.sekundDoCienia) this.dragonShadow();
    }
    const p = this.host.player;
    if (!this.busy) this.trials(p);
    if (this.wizard) {
      const v = this.host.visible(this.wizard.x, this.wizard.y);
      this.wizard.setVisible(v);
      this.wizardLabel?.setVisible(v && Math.hypot(this.wizard.x - p.x, this.wizard.y - p.y) < 90);
    }
    const d = this.dragon;
    if (!d || !d.active || d.isDead || this.busy) return;
    const dist = Math.hypot(d.x - p.x, d.y - p.y);
    if (!TEST && st.st === 'smok' && !st.choice && !this.met && dist < 110 && this.host.visible(d.x, d.y)) this.meetDragon();
    else if (!TEST && st.st === 'smok' && st.choice === 'zbadaj' && dist < 30) this.talkToDragon();
  }

  approachDragon() {
    if (this.busy || !this.dragon) return;
    if (!this.state.choice) this.meetDragon();
    else if (this.state.choice === 'zbadaj') this.talkToDragon();
    else this.host.dialog({ title:'🐉 Smok', text:'Smok spokojnie przygląda się twojej mapie.', buttons:['OK'], onChoose:()=>{} });
  }

  // ---------------------------------------------------------------- 1. the shadow

  private exclaim(): Phaser.GameObjects.Image {
    const p = this.host.player;
    const img = this.scene.add.image(p.x, p.y - 24 * SKALA_POSTACI, TEX.exclaim).setDepth(1_300_000);
    this.scene.tweens.add({ targets: img, y: img.y - 3, duration: 250, yoyo: true, repeat: -1 });
    return img;
  }

  private dragonShadow() {
    this.busy = true;
    const p = this.host.player;
    const ex = this.exclaim();
    p.anims.stop();
    // Looking around.
    const looks: [string, boolean][] = [['side-0', false], ['side-0', true], ['up-0', false], ['side-0', false], ['down-0', false]];
    looks.forEach(([f, flip], i) => this.scene.time.delayedCall(300 + i * 450, () => p.setFrame(f).setFlipX(flip)));
    // The shadow passes over, from one side of the screen to the other.
    this.scene.time.delayedCall(700, () => {
      screech();
      this.host.scare(p.x, p.y);
      const view = this.scene.cameras.main.worldView;
      // Seen from above, head first in the direction of flight (left to right).
      const shadow = this.scene.add.image(view.x - 150, p.y - 70, TEX.dragonShadow, 'f0')
        .setAlpha(0.55).setScale(5).setDepth(1_250_000);
      shadow.setRotation(Math.atan2(p.y + 30 - (p.y - 70), view.right + 150 - (view.x - 150)));
      const flap = this.scene.time.addEvent({ delay: 220, loop: true, callback: () => shadow.setFrame(shadow.frame.name === 'f0' ? 'f1' : 'f0') });
      this.scene.tweens.add({
        targets: shadow, x: view.right + 150, y: p.y + 30, duration: 2600, ease: 'Sine.inOut',
        onComplete: () => {
          flap.remove();
          shadow.destroy();
        },
      });
    });
    this.scene.time.delayedCall(3400, () => {
      ex.destroy();
      this.host.dialog({
        title: '❗',
        text: HISTORIA.cien,
        buttons: ['Muszę się dowiedzieć'],
        onChoose: () => {
          this.busy = false;
          this.state.st = 'cien';
          this.dropScale();
          this.host.hud();
          this.host.save();
        },
      });
    });
  }

  // ---------------------------------------------------------------- 2. asking around

  /** The extra button at schools and churches, while the story is on. */
  askLabel(): string | null {
    return this.state.st === 'start' || this.state.st === 'koniec' ? null : HISTORIA.pytanie;
  }

  ask(place: Place) {
    const st = this.state;
    const knows = hash(`${place.id}:cien`) % 1000 < HISTORIA.ktoWie * 1000;
    const target = knows ? this.findTarget() : null;
    if (!target) {
      this.host.dialog({ title: place.name, text: HISTORIA.nieWiedza[hash(place.id) % HISTORIA.nieWiedza.length], buttons: ['Dziękuję'], onChoose: () => {} });
      return;
    }
    const again = st.target?.m === this.city.id && st.target.id === target.id;
    st.target = { m: this.city.id, id: target.id, name: target.name, x: target.door.x, y: target.door.y, s: PX_PER_M };
    if (st.st === 'cien') st.st = 'uczelnia';
    if (!again) this.placeWizard();
    const text = HISTORIA.wiedza[hash(`${place.id}:w`) % HISTORIA.wiedza.length].replace('{cel}', target.name);
    this.host.dialog({ title: place.name, text, buttons: ['Idę tam!'], onChoose: () => {
      this.host.hud();
      this.host.save();
    } });
  }

  /** Where the story stands, for characters who comment on it. */
  get stage() {
    return this.state.st;
  }

  /**
   * Someone who surely knows (Martin): sends the hero to the wizard like a
   * knowing school would. `text` may use {cel} for the place.
   */
  expert(title: string, text: string, later: string) {
    const st = this.state;
    if (st.st !== 'cien' && st.st !== 'uczelnia') {
      this.host.dialog({ title, text: later, buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const target = this.findTarget();
    if (!target) {
      this.host.dialog({ title, text: text.replace('{cel}', `${this.sageName()}, jak go znajdziesz`), buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const again = st.target?.m === this.city.id && st.target.id === target.id;
    st.target = { m: this.city.id, id: target.id, name: target.name, x: target.door.x, y: target.door.y, s: PX_PER_M };
    if (st.st === 'cien') st.st = 'uczelnia';
    if (!again) this.placeWizard();
    this.host.dialog({ title, text: text.replace('{cel}', target.name), buttons: ['Idę tam!'], onChoose: () => {
      this.host.hud();
      this.host.save();
    } });
  }

  /** A university on this map (the nearest), else the town hall. */
  private findTarget(): Place | null {
    const p = this.host.player;
    const near = (list: Place[]) => list.sort((a, b) => Math.hypot(a.door.x - p.x, a.door.y - p.y) - Math.hypot(b.door.x - p.x, b.door.y - p.y))[0] ?? null;
    return near(this.city.places.filter((q) => q.kind === 'university'))
      ?? near(this.city.places.filter((q) => q.kind === 'office' && /ratusz|urząd (miasta|gminy|miejski)/i.test(q.name)))
      ?? near(this.city.places.filter((q) => q.kind === 'office'));
  }

  // ---------------------------------------------------------------- 3. the wizard

  private placeWizard() {
    const t = this.state.target;
    if (!t) return;
    this.wizard?.destroy();
    this.wizardLabel?.destroy();
    makeLookTexture(this.scene, TEX.wizard, WIZARD_LOOK, { helm: 'czapka_maga' });
    const k = PX_PER_M / (t.s || PX_PER_M);
    const tx = t.x * k;
    const ty = t.y * k;
    // On the street by the door (where the hero can see and reach him).
    const at = this.city.freeNear(tx, ty + 6);
    const pace = this.city.isFree(at.x + 8, at.y + 5, 3, 2) ? 8 : this.city.isFree(at.x - 8, at.y + 5, 3, 2) ? -8 : 0;
    const hd = this.scene.textures.exists(ensureHd(this.scene, 'hd-mag'));
    this.wizard = (hd ? fitHd(this.scene.add.sprite(at.x, at.y, 'hd-mag', 'down-0')) : this.scene.add.sprite(at.x, at.y, TEX.wizard, 'down-0').setOrigin(0.5, 0.6)).setDepth(at.y);
    this.wizardLabel = this.scene.add.text(at.x, at.y - 16, this.sageName(), { fontFamily: 'monospace', fontSize: '8px', color: '#e8d8ff', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 })
      .setOrigin(0.5, 1).setDepth(1_100_000).setVisible(false);
    // He paces a little, looking around.
    if (pace) {
      this.scene.tweens.add({ targets: [this.wizard], x: at.x + pace, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut', onYoyo: () => this.wizard?.setFrame('side-0').setFlipX(pace < 0), onRepeat: () => this.wizard?.setFrame('side-0').setFlipX(pace > 0) });
      this.scene.tweens.add({ targets: [this.wizardLabel], x: at.x + pace, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  /** Where the dragon lies (on this map, until the story ends): people keep away. */
  dragonAt() {
    const d = this.state.dragon;
    if (this.state.st !== 'smok' || !d || d.m !== this.city.id) return null;
    const k = PX_PER_M / (d.s || PX_PER_M);
    return { x: d.x * k, y: d.y * k };
  }

  /** Where the wizard stands, while he has something to tell (for the talk bubble). */
  wizardSpot() {
    const w = this.wizard;
    return w?.visible && this.state.st === 'uczelnia' ? { x: w.x, y: w.y } : null;
  }

  wizardAt(x: number, y: number, r: number) {
    const w = this.wizard;
    return !!w && Math.abs(w.x - x) < r && Math.abs(w.y - y) < r + 4;
  }

  /** Mag Albrecht in Lublin, a travelling sage elsewhere (named by the country). */
  private sageName() {
    const c = this.city.toLatLon((this.city.minX + this.city.width) / 2, (this.city.minY + this.city.height) / 2);
    const w = this.city.id.startsWith('w:') ? this.city.id.slice(2).split(',').map(Number) : null;
    return imieMedrca(this.city.id, w ? w[0] : c.lat, w ? w[1] : c.lon);
  }

  talkToWizard() {
    const st = this.state;
    const m = { ...HISTORIA.mag, imie: this.sageName() };
    if (st.st === 'koniec') {
      this.host.dialog({ title: `🧙 ${m.imie}`, text: `Słyszałem o tobie, ${session.name}, ${st.title}! Smoki jeszcze o tobie usłyszą.`, buttons: ['Do zobaczenia'], onChoose: () => {} });
      return;
    }
    if (poziomPostaci(session.exp) < m.wymaganyPoziom) {
      if (st.st === 'uczelnia') this.wizardTrials(m.imie);
      else this.host.dialog({ title: `🧙 ${m.imie}`, text: m.zaSlaby.replace('{poziom}', String(m.wymaganyPoziom)), buttons: ['Wrócę silniejszy'], onChoose: () => {} });
      return;
    }
    this.host.dialog({
      title: `🧙 ${m.imie}`,
      text: m.tekst,
      buttons: ['Ruszam na smoka!'],
      onChoose: async () => {
        if (st.st !== 'smok' || !st.dragon || st.dragon.m !== this.city.id) {
          // Tiled maps: load the land away from the town centre, where the dragon will lie.
          const w = this.wizard ?? this.host.player;
          const c = this.townCentre();
          const d = Math.hypot(w.x - c.x, w.y - c.y) || 1;
          const far = 3000 * PX_PER_M;
          await this.city.ensure(w.x + ((w.x - c.x) / d) * far, w.y + ((w.y - c.y) / d) * far, far).catch(() => {});
          const spot = this.dragonSpot();
          st.dragon = { m: this.city.id, x: Math.round(spot.x), y: Math.round(spot.y), s: PX_PER_M };
          st.choice = undefined;
          st.st = 'smok';
          this.placeDragon();
        }
        this.host.hud();
        this.host.save();
      },
    });
  }

  /**
   * A free spot far from houses (ideally 500 m) and far from the town centre
   * (where the shops, offices and churches are), 0.5–6 km from the wizard.
   */
  /** The middle of the town: the mean of all places (shops, offices, churches…). */
  private townCentre() {
    const places = this.city.places;
    return places.length
      ? { x: places.reduce((a, p) => a + p.door.x, 0) / places.length, y: places.reduce((a, p) => a + p.door.y, 0) / places.length }
      : { x: this.city.width / 2, y: this.city.height / 2 };
  }

  private dragonSpot() {
    const w = this.wizard ?? this.host.player;
    const want = HISTORIA.smokOdBudynkow * PX_PER_M;
    const centre = this.townCentre();
    let best = { x: w.x + 500 * PX_PER_M, y: w.y, score: -Infinity };
    const r = Math.random;
    for (let i = 0; i < 900; i++) {
      const x = this.city.minX + r() * (this.city.width - this.city.minX);
      const y = this.city.minY + r() * (this.city.height - this.city.minY);
      const d = Math.hypot(x - w.x, y - w.y) / PX_PER_M;
      if (d < 500 || d > 6000 || !this.city.isFree(x, y, 10, 6)) continue;
      const fromCentre = Math.hypot(x - centre.x, y - centre.y) / PX_PER_M;
      let near = want;
      for (const b of this.city.query({ x0: x - want, y0: y - want, x1: x + want, y1: y + want }).buildings) {
        const dx = Math.max(b.x0 - x, 0, x - b.x1);
        const dy = Math.max(b.y0 - y, 0, y - b.y1);
        near = Math.min(near, Math.hypot(dx, dy));
      }
      const score = near * 10 + fromCentre * 2 - Math.max(0, d - 3000);
      if (score > best.score) best = { x, y, score };
    }
    return best;
  }

  // ---------------------------------------------------------------- 4. the dragon

  private placeDragon() {
    const t = this.state.dragon;
    if (!t) return;
    const k = PX_PER_M / (t.s || PX_PER_M);
    this.dragon = this.host.spawnDragon(t.x * k, t.y * k);
    this.dragon.peaceful = this.state.choice !== 'zabij';
    this.dragon.missionId = 'story-smok';
    this.dragon.roam = 20;
    if (!this.dragon.peaceful) this.dragon.chasing = true;
  }

  private meetDragon() {
    this.met = true;
    this.busy = true;
    const ex = this.exclaim();
    this.host.player.anims.stop();
    screech();
    this.scene.time.delayedCall(900, () => {
      ex.destroy();
      this.host.dialog({
        title: '❗ Smok!',
        text: HISTORIA.spotkanie,
        buttons: [HISTORIA.zabij, HISTORIA.zbadaj],
        onChoose: (i) => {
          this.busy = false;
          const d = this.dragon!;
          if (i === 0) {
            this.state.choice = 'zabij';
            d.peaceful = false;
            d.chasing = true;
          } else {
            this.state.choice = 'zbadaj';
            this.host.toast(HISTORIA.poZbadaj, 4000);
          }
          this.host.hud();
          this.host.save();
        },
      });
    });
  }

  private talkToDragon() {
    this.busy = true;
    const pages = HISTORIA.rozmowa;
    const show = (i: number) => this.host.dialog({
      title: '🐉 Smok',
      text: pages[i],
      buttons: [i < pages.length - 1 ? 'Słucham dalej…' : '🎵 Zagram waszą melodię'],
      onChoose: () => (i < pages.length - 1 ? show(i + 1) : this.melody()),
    });
    show(0);
  }

  /** The dragons' melody: repeat the notes, then the pact is renewed. */
  private async melody() {
    const lvl = Math.max(0, TRUDNOSCI.indexOf(session.level));
    this.scene.scene.pause();
    await playMelody(MELODIA.nut[lvl] ?? 4);
    this.scene.scene.resume();
    consumeAttack();
    this.host.dialog({ title: '🐉 Smok', text: HISTORIA.poMelodii, buttons: ['Zostańmy przyjaciółmi!'], onChoose: () => this.finish(HISTORIA.tytulBrat, true) });
  }

  /** The dragon fell in battle. */
  dragonKilled() {
    this.busy = true;
    this.host.dialog({ title: '⚔ Zwycięstwo!', text: HISTORIA.wygrana, buttons: ['Hurra!'], onChoose: () => this.finish(HISTORIA.tytulPogromca, false) });
  }

  private finish(title: string, friend: boolean) {
    const st = this.state;
    st.title = title;
    st.st = 'koniec';
    session.exp += HISTORIA.nagroda.exp;
    earn(HISTORIA.nagroda.monety);
    const d = this.dragon;
    if (friend && d?.active) {
      // The dragon flies off into the sky.
      d.peaceful = true;
      this.scene.tweens.add({ targets: d, y: d.y - 200, alpha: 0, scale: 2, duration: 2500, onComplete: () => d.destroy() });
    }
    this.host.dialog({
      title: '🏅 Nowy tytuł!',
      text: `Od dziś jesteś: ${session.name}, ${title}!\n\nNagroda: ${HISTORIA.nagroda.monety} monet i ${HISTORIA.nagroda.exp} EXP.\n\nCiąg dalszy historii nastąpi…`,
      buttons: ['Wspaniale!', '📸 Pochwal się'],
      onChoose: (i) => {
        this.busy = false;
        this.host.hud();
        this.host.save();
        if (i === 1) {
          // A square picture of this moment for Instagram / WhatsApp.
          this.scene.scene.pause();
          void showBrag(this.scene.game, session.name, { top: 'Gratulacje!', title, sub: `poziom ${poziomPostaci(session.exp)}` }).then(() => {
            this.scene.scene.resume();
            consumeAttack();
          });
        }
      },
    });
  }

  // ---------------------------------------------------------------- 3b. the wizard's trials (content/probyMaga.ts)

  /** Right after the shadow something falls nearby: a still warm scale. */
  private dropScale() {
    const p = this.host.player;
    const [lo, hi] = PROBY_MAGA.luska.odlegloscM;
    let at: { x: number; y: number } | null = null;
    for (let t = 0; t < 60 && !at; t++) {
      const a = Math.random() * Math.PI * 2;
      const d = (lo + Math.random() * (hi - lo)) * PX_PER_M;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (this.city.isFree(x, y + 5, 3, 2)) at = { x, y };
    }
    at ??= this.city.freeNear(p.x + lo * PX_PER_M, p.y);
    this.state.luska = { m: this.city.id, x: Math.round(at.x), y: Math.round(at.y), s: PX_PER_M };
    this.placeScale();
  }

  private placeScale() {
    const l = this.state.luska!;
    const k = PX_PER_M / (l.s || PX_PER_M);
    this.scale = this.glowing(l.x * k, l.y * k);
  }

  /** A scale on the ground with a pulsing golden glow. */
  private glowing(x: number, y: number) {
    const glow = this.scene.add.circle(x, y, 9, 0xffc94a, 0.7).setDepth(y - 0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 1.8, alpha: 0.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const img = this.scene.add.image(x, y, 'goods-luska').setScale(1.5).setDepth(y - 0.5);
    this.scene.tweens.add({ targets: img, y: y - 1.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return [glow, img];
  }

  private nearest(kinds: Place['kind'][]) {
    const p = this.host.player;
    let best: Place | null = null;
    let bd = Infinity;
    for (const q of this.city.places) {
      if (!kinds.includes(q.kind)) continue;
      const d = Math.hypot(q.door.x - p.x, q.door.y - p.y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best ? { place: best, d: bd } : null;
  }

  private trialName(k: Proba) {
    return fill(PROBY_MAGA[k].nazwa, { ile: PROBY_MAGA.mikstura.ile });
  }

  private trialOrder(k: Proba) {
    return fill(PROBY_MAGA[k].zlecenie, { ile: PROBY_MAGA.mikstura.ile });
  }

  /** Can this trial be done here? Sets it up when it can. */
  private setUpTrial(k: Proba): boolean {
    const pr = this.state.proby!;
    if (k === 'gang') {
      // The game makes a gang of its own for this, a walk away (owner, 13 Oct 2026).
      pr.g0 = session.stats.gangs ?? 0;
      pr.gang = undefined;
      this.gangPlaced = false;
      this.trialGang();
      return true;
    }
    if (k === 'lekcja') return !!this.nearest(['school', 'library']);
    if (k === 'mikstura') {
      const a = this.nearest(['alchemist']);
      return !!a && a.d < PROBY_MAGA.mikstura.maksKm * 1000 * PX_PER_M;
    }
    return this.newSpot();
  }

  /** The burnt circle somewhere in the fields; the arrow shows only roughly where. */
  private newSpot(): boolean {
    const p = this.host.player;
    const spot = this.host.questSpot(p.x, p.y);
    if (!spot) return false;
    const a = Math.random() * Math.PI * 2;
    const off = Math.random() * PROBY_MAGA.krag.mylenieM * PX_PER_M;
    this.state.proby!.spot = { m: this.city.id, x: Math.round(spot.x), y: Math.round(spot.y), fx: Math.round(spot.x + Math.cos(a) * off), fy: Math.round(spot.y + Math.sin(a) * off), s: PX_PER_M };
    return true;
  }

  /** The next trial that can be done here; skipped ones pass their EXP on. */
  private assignNext(): Proba | undefined {
    const pr = this.state.proby!;
    pr.k = undefined;
    for (const k of PROBY_MAGA.kolejnosc) {
      if (pr.done.includes(k)) continue;
      if (this.setUpTrial(k)) {
        pr.k = k;
        return k;
      }
      pr.done.push(k);
      pr.carry += PROBY_MAGA[k].exp;
    }
    return undefined;
  }

  /** The wizard to a hero below the required level: hands out trials. */
  private wizardTrials(imie: string) {
    const st = this.state;
    const need = HISTORIA.mag.wymaganyPoziom;
    const title = `🧙 ${imie}`;
    if (!st.proby) {
      st.proby = { done: [], carry: 0 };
      const k = this.assignNext();
      const intro = fill(st.luska?.done ? PROBY_MAGA.wstep : PROBY_MAGA.wstepBez, { poziom: need });
      const text = k ? `${intro}\n\n${fill(PROBY_MAGA.nastepna, { proba: this.trialName(k) })}\n${this.trialOrder(k)}` : `${intro}\n\n${fill(PROBY_MAGA.poProbach, { brak: expNaPoziom(need) - session.exp, poziom: need })}`;
      this.host.dialog({ title, text, buttons: ['Zrobię to!'], onChoose: () => {
        this.host.hud();
        this.host.save();
      } });
      return;
    }
    const k = st.proby.k;
    const text = k
      ? `${fill(PROBY_MAGA.wTrakcie, { proba: this.trialName(k), poziomTeraz: poziomPostaci(session.exp), poziom: need })}\n\n${this.trialOrder(k)}`
      : fill(PROBY_MAGA.poProbach, { brak: expNaPoziom(need) - session.exp, poziom: need });
    this.host.dialog({ title, text, buttons: ['Dobrze'], onChoose: () => {} });
  }

  /** A trial done: EXP, the pigeon's note with a bit of the story, the next trial. */
  private completeTrial(k: Proba) {
    const pr = this.state.proby!;
    const exp = PROBY_MAGA[k].exp + pr.carry;
    pr.carry = 0;
    pr.done.push(k);
    pr.k = undefined;
    pr.spot = undefined;
    this.clearRing();
    session.exp += exp;
    const need = HISTORIA.mag.wymaganyPoziom;
    const ready = poziomPostaci(session.exp) >= need;
    const next = ready ? undefined : this.assignNext();
    if (ready) pr.gotowy = true;
    const tail = ready
      ? fill(PROBY_MAGA.gotowy, { poziom: need, cel: this.state.target?.name ?? this.sageName() })
      : next
        ? `${fill(PROBY_MAGA.nastepna, { proba: this.trialName(next) })}\n${this.trialOrder(next)}`
        : fill(PROBY_MAGA.koniecProb, { poziom: need });
    this.busy = true;
    this.host.dialog({
      title: PROBY_MAGA.golab,
      text: `${PROBY_MAGA[k].liscik}\n\n+${exp} EXP\n\n${tail}`,
      buttons: ['Dalej!'],
      onChoose: () => {
        this.busy = false;
        this.host.hud();
        this.host.save();
      },
    });
    this.host.hud();
  }

  /** Checks of the scale and the current trial (a few times a second). */
  private trials(p: Phaser.GameObjects.Sprite) {
    const now = this.scene.time.now;
    if (now < this.trialAt) return;
    this.trialAt = now + 250;
    const st = this.state;
    const reach = PROBY_MAGA.podejdzM * PX_PER_M;
    // The scale from the shadow.
    const l = st.luska;
    if (l && !l.done && l.m === this.city.id && this.scale) {
      const k = PX_PER_M / (l.s || PX_PER_M);
      if (Math.hypot(l.x * k - p.x, l.y * k - p.y) < reach) {
        l.done = true;
        for (const o of this.scale) o.destroy();
        this.scale = undefined;
        addFruit('luska');
        session.exp += PROBY_MAGA.luska.exp;
        this.busy = true;
        this.host.dialog({ title: '🐉 Łuska', text: `${PROBY_MAGA.luska.znalezione}\n\n+${PROBY_MAGA.luska.exp} EXP`, buttons: ['Popytam o cienie'], onChoose: () => {
          this.busy = false;
          this.host.hud();
          this.host.save();
        } });
        return;
      }
    }
    const pr = st.proby;
    if (st.st !== 'uczelnia' || !pr) return;
    const need = HISTORIA.mag.wymaganyPoziom;
    if (poziomPostaci(session.exp) >= need) {
      // Strong enough (fighting, quizzes…) before the trials are over: back to the wizard.
      this.clearRing();
      if (!pr.gotowy) {
        pr.gotowy = true;
        this.busy = true;
        this.host.dialog({ title: PROBY_MAGA.golab, text: fill(PROBY_MAGA.gotowy, { poziom: need, cel: st.target?.name ?? this.sageName() }), buttons: ['Ruszam!'], onChoose: () => {
          this.busy = false;
          this.host.hud();
          this.host.save();
        } });
      }
      return;
    }
    const k = pr.k;
    if (!k) return;
    if (k === 'gang') {
      if ((session.stats.gangs ?? 0) > (pr.g0 ?? 0)) this.completeTrial('gang');
      else this.trialGang();
      return;
    }
    if (k === 'krag') {
      if (!pr.spot || pr.spot.m !== this.city.id) {
        if (!this.newSpot()) return;
      }
      const s = pr.spot!;
      const kk = PX_PER_M / (s.s || PX_PER_M);
      const d = Math.hypot(s.x * kk - p.x, s.y * kk - p.y);
      if (d < 160 && !this.ring) this.drawRing(s.x * kk, s.y * kk);
      if (d < reach) {
        addFruit('luska');
        this.busy = true;
        this.host.dialog({ title: '🔥 Wypalony krąg', text: PROBY_MAGA.krag.znalezione, buttons: ['Dalej'], onChoose: () => {
          this.busy = false;
          this.completeTrial('krag');
        } });
      }
      return;
    }
    const at = this.nearest(k === 'lekcja' ? ['school', 'library'] : ['alchemist']);
    if (!at) return;
    if (at.d > reach * 3) {
      if (this.shownAt === at.place.id) this.shownAt = null;
      return;
    }
    if (at.d > reach || this.shownAt === at.place.id) return;
    this.shownAt = at.place.id;
    if (k === 'lekcja') this.lesson(at.place, 0);
    else this.potion(at.place);
  }

  /** The trial's own gang: found once (about PROBY_MAGA.gang.odlegloscM away) and put back on every visit to its map. */
  private trialGang() {
    const pr = this.state.proby!;
    const G = PROBY_MAGA.gang;
    if (!pr.gang || pr.gang.m !== this.city.id) {
      const p = this.host.player;
      const at = this.host.gangSpot(p.x, p.y, G.odlegloscM, G.rodzaj);
      if (!at) return;
      pr.gang = { m: this.city.id, x: at.x, y: at.y, s: PX_PER_M };
      this.gangPlaced = false;
    }
    if (this.gangPlaced) return;
    const k = PX_PER_M / (pr.gang.s || PX_PER_M);
    this.host.placeGang(`proba:${pr.gang.x},${pr.gang.y}`, pr.gang.x * k, pr.gang.y * k, G.rodzaj);
    this.gangPlaced = true;
  }

  private drawRing(x: number, y: number) {
    const g = this.scene.add.graphics().setDepth(-1e7);
    g.fillStyle(0x2a1d12, 0.55).fillEllipse(x, y, 34, 26);
    g.fillStyle(0x15100a, 0.5).fillEllipse(x, y, 20, 15);
    g.lineStyle(2, 0xd9772b, 0.55).strokeEllipse(x, y, 34, 26);
    this.ring = [g, ...this.glowing(x, y)];
  }

  private clearRing() {
    for (const o of this.ring ?? []) o.destroy();
    this.ring = undefined;
  }

  /** The lesson about dragons: a story, a question; a wrong answer = hear it again. */
  private lesson(place: Place, i: number) {
    const L = PROBY_MAGA.lekcja;
    const r = L.rundy[i];
    // Answers in a fixed shuffled order (the first one in the content is the right one).
    const order = r.odpowiedzi.map((_, j) => j).sort((a, b) => hash(`${place.id}:${i}:${a}`) - hash(`${place.id}:${i}:${b}`));
    this.busy = true;
    this.host.dialog({
      title: `${L.tytul} – ${krotkaNazwa(place.name) ?? place.name}`,
      text: `${r.opowiesc}\n\n${r.pytanie}`,
      buttons: order.map((j) => r.odpowiedzi[j]),
      odpowiedzi: true,
      onChoose: (b) => {
        if (order[b] !== 0) {
          this.host.dialog({ title: L.tytul, text: L.zle, buttons: ['Słucham'], onChoose: () => this.lesson(place, i) });
          return;
        }
        if (i + 1 < L.rundy.length) {
          this.lesson(place, i + 1);
          return;
        }
        this.host.dialog({ title: L.tytul, text: L.koniec, buttons: ['Dziękuję!'], onChoose: () => {
          this.busy = false;
          this.completeTrial('lekcja');
        } });
      },
    });
  }

  /** The alchemist brews the wizard's potion from the hero's fruit or mushrooms. */
  private potion(place: Place) {
    const M = PROBY_MAGA.mikstura;
    const masz = totalFruit();
    if (masz < M.ile) {
      this.host.dialog({ title: `⚗ ${place.name}`, text: fill(M.zaMalo, { ile: M.ile, masz }), buttons: ['Uzbieram'], onChoose: () => {} });
      return;
    }
    eatFruit(M.ile);
    session.mikstury++;
    this.busy = true;
    this.host.dialog({ title: `⚗ ${place.name}`, text: M.zrobione, buttons: ['Dziękuję!'], onChoose: () => {
      this.busy = false;
      this.completeTrial('mikstura');
    } });
  }

  private trialGoal(k: Proba): { text: string; pos: { x: number; y: number } | null } {
    const p = this.host.player;
    if (k === 'gang') {
      const own = this.state.proby?.gang;
      if (own && own.m === this.city.id) {
        const kk = PX_PER_M / (own.s || PX_PER_M);
        return { text: PROBY_MAGA.gang.cel, pos: { x: own.x * kk, y: own.y * kk } };
      }
      const g = this.host.nearestGang(p.x, p.y, 3000 * PX_PER_M);
      return g ? { text: PROBY_MAGA.gang.cel, pos: { x: g.x, y: g.y } } : { text: PROBY_MAGA.gang.szukaj, pos: null };
    }
    if (k === 'krag') {
      const s = this.state.proby?.spot;
      if (!s || s.m !== this.city.id) return { text: PROBY_MAGA.krag.cel, pos: null };
      const kk = PX_PER_M / (s.s || PX_PER_M);
      return { text: PROBY_MAGA.krag.cel, pos: { x: s.fx * kk, y: s.fy * kk } };
    }
    if (k === 'lekcja') {
      const at = this.nearest(['school', 'library']);
      return { text: fill(PROBY_MAGA.lekcja.cel, { miejsce: at ? krotkaNazwa(at.place.name) ?? at.place.name : 'szkoła albo biblioteka' }), pos: at ? { ...at.place.door } : null };
    }
    const at = this.nearest(['alchemist']);
    return { text: fill(PROBY_MAGA.mikstura.cel, { ile: PROBY_MAGA.mikstura.ile, masz: totalFruit() }), pos: at ? { ...at.place.door } : null };
  }

  /** Where the story arrow points (when no mission is on). */
  goal(): { text: string; pos: { x: number; y: number } | null } | null {
    const st = this.state;
    const k = (s: number) => PX_PER_M / (s || PX_PER_M);
    if (st.st === 'cien' && st.luska && !st.luska.done && st.luska.m === this.city.id) {
      return { text: PROBY_MAGA.luska.cel, pos: { x: st.luska.x * k(st.luska.s), y: st.luska.y * k(st.luska.s) } };
    }
    if (st.st === 'cien') return { text: 'Popytaj o cienie w szkołach i świątyniach', pos: null };
    const lvl = poziomPostaci(session.exp);
    const need = HISTORIA.mag.wymaganyPoziom;
    if (st.st === 'uczelnia' && st.proby && lvl < need) {
      if (st.proby.k) return this.trialGoal(st.proby.k);
      return { text: fill(PROBY_MAGA.krzepa, { teraz: lvl, poziom: need, brak: expNaPoziom(need) - session.exp }), pos: null };
    }
    if (st.st === 'uczelnia' && st.target && st.proby && st.target.m === this.city.id) {
      return { text: fill(PROBY_MAGA.wroc, { cel: st.target.name }), pos: { x: st.target.x * k(st.target.s), y: st.target.y * k(st.target.s) } };
    }
    if (st.st === 'uczelnia' && st.target) {
      if (st.target.m !== this.city.id) return { text: `Wróć i idź do: ${st.target.name}`, pos: null };
      return { text: `Idź do: ${st.target.name}`, pos: { x: st.target.x * k(st.target.s), y: st.target.y * k(st.target.s) } };
    }
    if (st.st === 'smok' && st.dragon && st.dragon.m === this.city.id) {
      const d = this.dragon;
      const pos = d?.active ? { x: d.x, y: d.y } : { x: st.dragon.x * k(st.dragon.s), y: st.dragon.y * k(st.dragon.s) };
      return { text: st.choice === 'zbadaj' ? 'Podejdź do smoka' : st.choice === 'zabij' ? 'Pokonaj smoka!' : 'Odszukaj smoka za miastem', pos };
    }
    return null;
  }
}

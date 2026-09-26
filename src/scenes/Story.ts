import Phaser from 'phaser';
import { TEX, makeLookTexture } from '../art';
import { PX_PER_M, type CityMap, type Place } from '../map/CityMap';
import { HISTORIA, poziomPostaci } from '../content/historia';
import { session, earn, type Story as StoryState } from '../quests';
import { screech } from '../sfx';
import type { Slime } from '../objects/Slime';
import type { DialogRequest } from './GameScene';

// The main story, "Cień smoka" (content/historia.ts): the dragon's shadow
// after a minute of walking, asking around at schools and churches, the
// wizard by the university and the dragon itself (fight it or talk to it).

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

  constructor(private scene: Phaser.Scene, private city: CityMap, private host: StoryHost) {
    const st = this.state;
    if (st.target && st.target.m === city.id && st.st !== 'start' && st.st !== 'cien') this.placeWizard();
    if (st.st === 'smok' && st.dragon && st.dragon.m === city.id) this.placeDragon();
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
    if (this.wizard) {
      const v = this.host.visible(this.wizard.x, this.wizard.y);
      this.wizard.setVisible(v);
      this.wizardLabel?.setVisible(v && Math.hypot(this.wizard.x - p.x, this.wizard.y - p.y) < 90);
    }
    const d = this.dragon;
    if (!d || !d.active || d.isDead || this.busy) return;
    const dist = Math.hypot(d.x - p.x, d.y - p.y);
    if (st.st === 'smok' && !st.choice && !this.met && dist < 110 && this.host.visible(d.x, d.y)) this.meetDragon();
    else if (st.st === 'smok' && st.choice === 'zbadaj' && dist < 30) this.talkToDragon();
  }

  // ---------------------------------------------------------------- 1. the shadow

  private exclaim(): Phaser.GameObjects.Image {
    const p = this.host.player;
    const img = this.scene.add.image(p.x, p.y - 24, TEX.exclaim).setDepth(1_300_000);
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
    this.wizard = this.scene.add.sprite(at.x, at.y, TEX.wizard, 'down-0').setOrigin(0.5, 0.6).setDepth(at.y);
    this.wizardLabel = this.scene.add.text(at.x, at.y - 16, HISTORIA.mag.imie, { fontFamily: 'monospace', fontSize: '8px', color: '#e8d8ff', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 })
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

  talkToWizard() {
    const st = this.state;
    const m = HISTORIA.mag;
    if (st.st === 'koniec') {
      this.host.dialog({ title: `🧙 ${m.imie}`, text: `Słyszałem o tobie, ${session.name}, ${st.title}! Smoki jeszcze o tobie usłyszą.`, buttons: ['Do zobaczenia'], onChoose: () => {} });
      return;
    }
    if (poziomPostaci(session.exp) < m.wymaganyPoziom) {
      this.host.dialog({ title: `🧙 ${m.imie}`, text: m.zaSlaby.replace('{poziom}', String(m.wymaganyPoziom)), buttons: ['Wrócę silniejszy'], onChoose: () => {} });
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
      buttons: [i < pages.length - 1 ? 'Słucham dalej…' : 'Zostańmy przyjaciółmi!'],
      onChoose: () => (i < pages.length - 1 ? show(i + 1) : this.finish(HISTORIA.tytulBrat, true)),
    });
    show(0);
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
      buttons: ['Wspaniale!'],
      onChoose: () => {
        this.busy = false;
        this.host.hud();
        this.host.save();
      },
    });
  }

  /** Where the story arrow points (when no mission is on). */
  goal(): { text: string; pos: { x: number; y: number } | null } | null {
    const st = this.state;
    const k = (s: number) => PX_PER_M / (s || PX_PER_M);
    if (st.st === 'cien') return { text: 'Popytaj o cienie w szkołach i kościołach', pos: null };
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

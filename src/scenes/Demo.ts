import { SKALA_POSTACI } from '../skala';
import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { SEN, DEMO_TEKSTY } from '../content/demo';
import { demo, dreamPlaces, blackout, bigText, wakeUp } from '../demo';
import { session } from '../quests';
import { meleeDamage, totalFruit } from '../inventory';
import { pokazOdlot, zaladujSmoka } from '../objects/smokRysunki';
import type { Slime } from '../objects/Slime';
import type { Player } from '../objects/Player';
import type { Orchards, FruitTree } from './Ambient';
import type { DialogRequest } from './GameScene';
import { pokazGdzieKliknac } from '../ui/samouczek';
import { loadingMapVisible } from '../ui/loadingMap';

// The QR demo's dream inside the game (the phases are described in src/demo.ts): apple trees south of
// Zamek Lubelski with "Kliknij, żeby strącić owoce" over the nearest one, the goal line and arrow, the
// "I know who I am!" moment with the player's name, the dragon in the castle wall's gap with its airborne
// retreats, then the blackout and waking up for real (src/demo.ts wakeUp).

export interface DemoHost {
  player: Player;
  city: CityMap;
  orchards: Orchards;
  dialog: (req: DialogRequest) => void;
  toast: (text: string, ms?: number) => void;
  spawnDragon: (x: number, y: number) => Slime;
  /** A fireball reached the hero. */
  hurt: (from: Phaser.Math.Vector2, damage: number) => void;
  hud: () => void;
  heal: () => void;
  ready: () => boolean;
}


export class DemoRun {
  /** The hero stands still (a big moment on screen). */
  busy = false;
  /** Nothing moves any more (the blackout, the end). */
  frozen = false;
  private trees: FruitTree[] = [];
  private healTo = 0;
  private fruitHintShown = false;
  /** Closes the eating spotlight (tutorial). */
  private zamknijSamouczek: (() => void) | null = null;
  private dragon: Slime | null = null;
  private dragonSpot: { x: number; y: number } | null = null;
  /** "Kliknij, żeby strącić owoce" over the apple tree next to the hero. */
  private hint: Phaser.GameObjects.Text | null = null;
  /** Metres walked in the dream (owner, 12 Oct 2026: after SEN.limitM the hero wakes up anyway, dragon or not). */
  private dreamWalked = 0;
  private dreamLast: { x: number; y: number } | null = null;

  constructor(private scene: Phaser.Scene, private host: DemoHost) {}

  start() {
    const p = this.host.player;
    this.plantTrees();
    this.healTo = p.hp + 2;
    // The first words only once the opening (logo over the world map) has gone.
    const hello = () => {
      if (loadingMapVisible()) { this.scene.time.delayedCall(150, hello); return; }
      this.scene.time.delayedCall(600, () =>
        this.host.dialog({ title: DEMO_TEKSTY.przebudzenieTytul, text: DEMO_TEKSTY.przebudzenie, buttons: ['Rozejrzę się'], onChoose: () => {} }));
    };
    hello();
  }

  /** The goal line and where its arrow points. */
  goal(): { text: string; pos: { x: number; y: number } | null } | null {
    const p = this.host.player;
    if (this.busy) return null;
    if (demo.phase === 'jedzenie') {
      const n = SEN.owocowNaSerce;
      if (totalFruit() >= n) return { text: DEMO_TEKSTY.celZjedz, pos: null };
      const left = this.trees.filter((t) => t.left > 0);
      const near = left.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      return { text: DEMO_TEKSTY.celZbierz(totalFruit(), n), pos: near ? { x: near.x, y: near.y } : null };
    }
    if (demo.phase === 'smok' && this.dragonSpot) {
      const d = this.dragon;
      return { text: DEMO_TEKSTY.celSmok, pos: d && d.active && !d.isDead ? { x: d.x, y: d.y } : this.dragonSpot };
    }
    return null;
  }

  update(now: number, dt: number) {
    void now;
    void dt;
    if (this.frozen) return;
    if (demo.phase === 'jedzenie' && !this.busy && !this.fruitHintShown && totalFruit() >= SEN.owocowNaSerce && this.host.player.hp < this.healTo) {
      // The demo is the first tutorial: the player eats the apples alone (owner, 11 Oct 2026 – a dialog button
      // here got pressed by the taps on the tree). Everything else goes dark, the heal control is shown.
      this.fruitHintShown = true;
      this.busy = true;
      this.host.player.vel.set(0, 0);
      this.host.player.anims.stop();
      this.scene.time.delayedCall(450, () => {
        if (this.frozen) return;
        this.zamknijSamouczek = pokazGdzieKliknac('#hud .hud-heal', DEMO_TEKSTY.jablka + (matchMedia('(pointer: coarse)').matches ? '' : DEMO_TEKSTY.jablkaKlawisz), () => this.host.heal());
      });
      return;
    }
    if (this.zamknijSamouczek && this.host.player.hp >= this.healTo) {
      this.zamknijSamouczek();
      this.zamknijSamouczek = null;
      this.busy = false;
    }
    if (demo.phase === 'jedzenie' && !this.busy && this.host.player.hp >= this.healTo) this.remember();
    this.showHint();
    const p = this.host.player;
    if ((demo.phase === 'jedzenie' || demo.phase === 'smok') && !this.busy) {
      const l = this.dreamLast;
      const step = l ? Math.hypot(p.x - l.x, p.y - l.y) : 0;
      if (step < 40) this.dreamWalked += step; // a jump (unstick, landing) isn't walking
      this.dreamLast = { x: p.x, y: p.y };
      if (this.dreamWalked >= SEN.limitM * PX_PER_M) {
        this.busy = true;
        this.hint?.setVisible(false);
        bigText(DEMO_TEKSTY.zaDaleko, 1800);
        this.scene.time.delayedCall(2000, () => this.sleep());
        return;
      }
    }
  }

  /** The hero died in the dream: it was only a dream. Returns true if the demo took care of it. */
  onDeath() {
    if (demo.phase !== 'jedzenie' && demo.phase !== 'smok') return false;
    this.scene.time.delayedCall(900, () => this.sleep());
    return true;
  }

  isDragon(e: Slime) {
    return e === this.dragon;
  }

  onDragonKilled(d: Slime) {
    this.busy = true;
    this.host.player.vel.set(0, 0);
    // Replace the generic squashed-enemy death with takeoff and visible ascent.
    pokazOdlot(this.scene, d, 'gorski');
    d.setVisible(false);
    this.dragon = null;
    bigText(DEMO_TEKSTY.smokPokonany, 1800);
    this.scene.time.delayedCall(2000, () => this.sleep());
  }

  /** The apple-tree hint: over the nearest tree with fruit while the hero stands close and still needs apples. */
  private showHint() {
    const p = this.host.player;
    const want = demo.phase === 'jedzenie' && !this.busy && totalFruit() < SEN.owocowNaSerce;
    const t = want ? this.trees.filter((q) => q.left > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : undefined;
    if (!t || Math.hypot(t.x - p.x, t.y - p.y) > SEN.podpowiedzM * PX_PER_M) {
      this.hint?.setVisible(false);
      return;
    }
    if (!this.hint) {
      this.hint = this.scene.add.text(0, 0, DEMO_TEKSTY.podpowiedz, {
        fontFamily: '"Alegreya Sans", sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff2a8',
        stroke: '#1e1a24', strokeThickness: 5, align: 'center', resolution: 3,
      }).setOrigin(0.5, 0).setDepth(1_250_000).setScale(1 / 3);
      this.scene.tweens.add({ targets: this.hint, alpha: 0.55, duration: 650, yoyo: true, repeat: -1 });
    }
    // Under the trunk: toasts and the goal arrow already sit above the hero and the crown.
    this.hint.setVisible(true).setPosition(t.x, t.y + 3 + Math.sin(this.scene.time.now / 300) * 1.5);
  }

  // ------------------------------------------------------------ the dream

  private plantTrees() {
    const p = this.host.player;
    const { ile, owocow, odM, doM } = SEN.drzewa;
    for (let i = 0, tries = 0; i < ile && tries < 400; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = (odM + Math.random() * (doM - odM)) * PX_PER_M;
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      if (!this.host.city.isFree(x, y, 6, 6) || (tries < 300 && this.host.city.roadAt(x, y))) continue;
      if (this.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 16)) continue;
      this.trees.push(this.host.orchards.plant(x, y, 'jablko', owocow));
      i++;
    }
  }

  /** Healed: "!", the screen shakes, "OOooo, już wiem kim jestem!" – then the dragon. */
  private remember() {
    this.busy = true;
    const p = this.host.player;
    p.vel.set(0, 0);
    p.anims.stop();
    const ex = this.scene.add.image(p.x, p.y - 24 * SKALA_POSTACI, TEX.exclaim).setDepth(1_300_000);
    this.scene.tweens.add({ targets: ex, y: ex.y - 3, duration: 200, yoyo: true, repeat: 5 });
    // A light tremor (owner, 11 Oct 2026: still too dramatic at 500 ms / 0.003).
    this.scene.cameras.main.shake(300, 0.0012);
    bigText(DEMO_TEKSTY.olsnienie, 2400);
    this.scene.time.delayedCall(2600, () => bigText(DEMO_TEKSTY.imie(session.name), 2200));
    this.scene.time.delayedCall(5000, () => {
      ex.destroy();
      demo.phase = 'smok';
      void this.placeDragon().then(() => {
        if (!this.scene.sys.isActive() || this.frozen) return;
        this.busy = false;
        this.host.toast(DEMO_TEKSTY.kimJestem(session.name), 5500);
        this.host.hud();
      }).catch(() => {
        this.busy = false;
        this.host.dialog({ title: 'Nie udało się wczytać smoka', text: 'Spróbuj ponownie.',
          buttons: ['Spróbuj ponownie'], onChoose: () => this.remember() });
      });
    });
  }

  private async placeDragon() {
    const { smok } = dreamPlaces();
    const at = this.host.city.fromLatLon(smok.lat, smok.lon);
    await this.host.city.ensure(at.x, at.y, 200 * PX_PER_M);
    await zaladujSmoka(this.scene, 'gorski');
    if (!this.scene.sys.isActive() || this.frozen) return;
    // Exactly in the wall's gap when it is free (freeNear would snap to the courtyard's path).
    const spot = this.host.city.isFree(at.x, at.y, 8, 8) ? at : this.host.city.freeNear(at.x, at.y);
    this.dragonSpot = spot;
    const d = this.host.spawnDragon(spot.x, spot.y);
    // GameScene gives the demo dragon SmokAI's airborne-retreat options.
    d.hp = SEN.ciosow * meleeDamage();
    this.dragon = d;
  }

  /** Blackout, then waking up for real where the QR code sends. */
  private sleep() {
    if (this.frozen) return;
    this.frozen = true;
    this.host.player.vel.set(0, 0);
    blackout(true, 700);
    this.scene.time.delayedCall(2000, () => {
      wakeUp(this.scene).catch(() => {
        blackout(false);
        this.host.dialog({ title: 'Nie udało się wczytać postaci', text: 'Spróbuj ponownie, żeby obudzić się przed Targami Lublin.',
          buttons: ['Spróbuj ponownie'], onChoose: () => { this.frozen = false; this.sleep(); } });
      });
    });
  }


}

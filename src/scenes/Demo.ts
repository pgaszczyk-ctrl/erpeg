import { SKALA_POSTACI } from '../skala';
import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { SEN, JAWA, DEMO_TEKSTY } from '../content/demo';
import { demo, dreamPlaces, blackout, bigText, finale, wakeUp, preloadLublin } from '../demo';
import { meleeDamage, totalFruit } from '../inventory';
import { pokazOdlot, zaladujSmoka } from '../objects/smokRysunki';
import type { Slime } from '../objects/Slime';
import type { Player } from '../objects/Player';
import type { Orchards, FruitTree } from './Ambient';
import type { DialogRequest } from './GameScene';
import { pokazGdzieKliknac } from '../ui/samouczek';
import { loadingMapVisible } from '../ui/loadingMap';

// The QR demo inside the game (the phases are described in src/demo.ts):
// fruit trees by the start, the goal line and arrow, the "I know who I am!"
// moment, the Wawel dragon's airborne retreats, the blackout, a few steps
// in front of Targi Lublin and the invitation to create a character.

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
  /** Puts a newsboy at a spot (the wake-up in front of Targi Lublin). */
  newsboy: (x: number, y: number) => void;
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
  /** Last position while walking after waking up. */
  private wokeAt: { x: number; y: number } | null = null;
  private walked = 0;
  /** Metres walked in the dream (owner, 12 Oct 2026: after SEN.limitM the hero wakes up anyway, dragon or not). */
  private dreamWalked = 0;
  private dreamLast: { x: number; y: number } | null = null;

  constructor(private scene: Phaser.Scene, private host: DemoHost) {}

  start() {
    const p = this.host.player;
    if (demo.phase === 'jedzenie') {
      this.plantTrees();
      // Lublin is needed when the dream ends: fetch it now, a moment after the dream's own first view.
      this.scene.time.delayedCall(6000, () => void preloadLublin());
      this.healTo = p.hp + 2;
      // The first words only once the opening (logo over the world map) has gone.
      const hello = () => {
        if (loadingMapVisible()) { this.scene.time.delayedCall(150, hello); return; }
        this.scene.time.delayedCall(600, () =>
          this.host.dialog({ title: DEMO_TEKSTY.przebudzenieTytul, text: DEMO_TEKSTY.przebudzenie, buttons: ['Rozejrzę się'], onChoose: () => {} }));
      };
      hello();
    } else if (demo.phase === 'jawa') {
      this.busy = true;
      // Keep the blackout until ground, building and roof layers are ready.
      const reveal = () => {
        if (!this.host.ready()) { this.scene.time.delayedCall(100, reveal); return; }
        this.placeNewsboy();
        blackout(false, 900);
        this.scene.time.delayedCall(900, () => this.host.dialog({
          title: DEMO_TEKSTY.pobudkaTytul,
          text: DEMO_TEKSTY.pobudka,
          buttons: ['Rozejrzę się'],
          onChoose: () => {
            this.busy = false;
            this.wokeAt = { x: p.x, y: p.y };
          },
        }));
      };
      this.scene.time.delayedCall(100, reveal);
    }
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
    const w = this.wokeAt;
    const p = this.host.player;
    if ((demo.phase === 'jedzenie' || demo.phase === 'smok') && !this.busy) {
      const l = this.dreamLast;
      const step = l ? Math.hypot(p.x - l.x, p.y - l.y) : 0;
      if (step < 40) this.dreamWalked += step; // a jump (unstick, landing) isn't walking
      this.dreamLast = { x: p.x, y: p.y };
      if (this.dreamWalked >= SEN.limitM * PX_PER_M) {
        this.busy = true;
        bigText(DEMO_TEKSTY.zaDaleko, 1800);
        this.scene.time.delayedCall(2000, () => this.sleep());
        return;
      }
    }
    if (demo.phase === 'jawa' && w) {
      // Count actual steps, also when turning back or walking around a tree.
      this.walked += Math.hypot(p.x - w.x, p.y - w.y);
      this.wokeAt = { x: p.x, y: p.y };
    }
    if (demo.phase === 'jawa' && w && this.walked >= JAWA.koniecM * PX_PER_M) {
      demo.phase = 'koniec';
      this.frozen = true;
      this.host.player.vel.set(0, 0);
      this.host.player.anims.stop();
      finale();
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

  /** A newsboy a few steps from the hero after waking up: something to be curious about at once. */
  private placeNewsboy() {
    const p = this.host.player;
    const at = this.host.city.fromLatLon(JAWA.gazeciarz.lat, JAWA.gazeciarz.lon);
    if (this.host.city.isFree(at.x, at.y, 4, 4) && Math.hypot(at.x - p.x, at.y - p.y) < 80 * PX_PER_M) {
      this.host.newsboy(at.x, at.y);
      return;
    }
    const m = JAWA.gazeciarzM * PX_PER_M;
    for (const [dx, dy] of [[1, 0.3], [-1, 0.3], [0.4, 1], [-0.4, 1], [0.6, -0.8], [-0.6, -0.8]]) {
      const x = p.x + dx * m, y = p.y + dy * m;
      if (!this.host.city.isFree(x, y, 4, 4) || this.host.city.buildingAt(x, y)) continue;
      this.host.newsboy(x, y);
      return;
    }
    const q = this.host.city.freeNear(p.x + m, p.y);
    this.host.newsboy(q.x, q.y);
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
    bigText(DEMO_TEKSTY.olsnienie, 2600);
    this.scene.time.delayedCall(2800, () => {
      ex.destroy();
      demo.phase = 'smok';
      void this.placeDragon().then(() => {
        if (!this.scene.sys.isActive() || this.frozen) return;
        this.busy = false;
        this.host.toast(DEMO_TEKSTY.kimJestem, 4500);
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
    const spot = this.host.city.freeNear(at.x, at.y);
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
        this.host.dialog({ title: 'Nie udało się wczytać Lublina', text: 'Spróbuj ponownie, żeby obudzić się przed Targami Lublin.',
          buttons: ['Spróbuj ponownie'], onChoose: () => { this.frozen = false; this.sleep(); } });
      });
    });
  }


}

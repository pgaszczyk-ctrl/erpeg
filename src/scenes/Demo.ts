import { SKALA_POSTACI } from '../skala';
import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { SEN, DEMO_TEKSTY } from '../content/demo';
import { demo, dreamPlaces, blackout, bigText, wakeUp, przygotujPobudke } from '../demo';
import { session } from '../quests';
import { totalFruit } from '../inventory';
import { pokazOdlot, zaladujSmoka, ubierzSmoka } from '../objects/smokRysunki';
import type { Slime } from '../objects/Slime';
import type { Player } from '../objects/Player';
import type { Orchards, FruitTree } from './Ambient';
import type { DialogRequest } from './GameScene';
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
  spawnDragon: (x: number, y: number) => Slime & { peaceful?: boolean };
  /** A fireball reached the hero. */
  hurt: (from: Phaser.Math.Vector2, damage: number) => void;
  hud: () => void;
  heal: () => void;
  /** Puts every fruit lying on the ground into the backpack. */
  zbierzOwoce: () => void;
  /** Fruit pickups lying on the ground. */
  owoceNaZiemi: () => number;
  ready: () => boolean;
  /** The dragon flies off for good (out of the fight and the map). */
  odlot: (d: Slime) => void;
}


export class DemoRun {
  /** The hero stands still (a big moment on screen). */
  busy = false;
  /** Nothing moves any more (the blackout, the end). */
  frozen = false;
  private trees: FruitTree[] = [];
  private dragon: (Slime & { peaceful?: boolean }) | null = null;
  private dragonSpot: { x: number; y: number } | null = null;
  /** "Kliknij, żeby strącić owoce" over the apple tree next to the hero. */
  private hint: Phaser.GameObjects.Text | null = null;
  /** Metres walked in the dream (owner, 12 Oct 2026: after SEN.limitM the hero wakes up anyway, dragon or not). */
  private dreamWalked = 0;
  private dreamLast: { x: number; y: number } | null = null;
  /** Hits the dragon took: after SEN.ciosowDoOdlotu it flies off, never beaten (owner, 19 Oct 2026). */
  private trafien = 0;
  private naTrafienie = (t: { cel: unknown }) => {
    const d = this.dragon;
    if (!d || t.cel !== d || this.busy) return;
    this.trafien++;
    if (this.trafien >= SEN.ciosowDoOdlotu) this.host.odlot(d);
  };

  constructor(private scene: Phaser.Scene, private host: DemoHost) {}

  start() {
    this.plantTrees();
    this.scene.events.on('trafienie', this.naTrafienie);
    this.scene.events.once('shutdown', () => this.scene.events.off('trafienie', this.naTrafienie));
    // The first words only once the opening (logo over the world map) has gone.
    const hello = () => {
      if (loadingMapVisible()) { this.scene.time.delayedCall(150, hello); return; }
      this.scene.time.delayedCall(600, () =>
        this.host.dialog({ title: DEMO_TEKSTY.przebudzenieTytul, text: DEMO_TEKSTY.przebudzenie, buttons: ['Rozejrzę się'], onChoose: () => this.klawisze(true) }));
    };
    hello();
  }

  /**
   * On a computer: „Chodzisz strzałkami albo W A S D” at the bottom until the hero has walked a few metres (owner,
   * 19 Oct 2026). Phones have the joystick under the thumb, so nothing there.
   */
  private klawisze(pokaz: boolean) {
    const el = document.getElementById('demo-klawisze');
    if (!pokaz) return el?.remove();
    if (el || matchMedia('(pointer: coarse)').matches) return;
    const d = document.createElement('div');
    d.id = 'demo-klawisze';
    d.setAttribute('aria-live', 'polite');
    d.textContent = DEMO_TEKSTY.sterowanie;
    Object.assign(d.style, {
      position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', zIndex: '8', pointerEvents: 'none',
      font: "600 18px/1.3 'Alegreya Sans', sans-serif", color: '#fff4d0', background: '#1e1a24e8', border: '2px solid #e9c46a',
      borderRadius: '12px', padding: '10px 16px', boxShadow: '0 4px 14px #0009', whiteSpace: 'nowrap',
    });
    document.body.append(d);
    this.klawiszeOd = this.dreamWalked;
  }
  private klawiszeOd: number | null = null;

  /** The goal line and where its arrow points. */
  goal(): { text: string; pos: { x: number; y: number } | null } | null {
    const p = this.host.player;
    if (this.busy) return null;
    if (demo.phase === 'jedzenie') {
      const n = SEN.owocowNaSerce;
      const masz = totalFruit() + this.host.owoceNaZiemi();
      const left = this.trees.filter((t) => t.left > 0);
      const near = left.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      return { text: DEMO_TEKSTY.celZbierz(Math.min(masz, n), n), pos: near ? { x: near.x, y: near.y } : null };
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
    // The 5th apple knocked down falls on the hero's head – and he remembers who he is (owner, 18 Oct 2026: no
    // eating step any more; the apples go to the backpack and heal in the dragon fight).
    if (demo.phase === 'jedzenie' && !this.busy && totalFruit() + this.host.owoceNaZiemi() >= SEN.owocowNaSerce) {
      this.remember();
      return;
    }
    this.showHint();
    this.wakeDragon();
    const p = this.host.player;
    if ((demo.phase === 'jedzenie' || demo.phase === 'smok') && !this.busy) {
      const l = this.dreamLast;
      const step = l ? Math.hypot(p.x - l.x, p.y - l.y) : 0;
      if (step < 40) this.dreamWalked += step; // a jump (unstick, landing) isn't walking
      if (this.klawiszeOd !== null && this.dreamWalked - this.klawiszeOd > 12 * PX_PER_M) {
        this.klawiszeOd = null;
        this.klawisze(false);
      }
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

  /** Where people must keep away from in the dream: the dragon's spot until it has flown off. */
  smokDoOminiecia() {
    return (demo.phase === 'jedzenie' || demo.phase === 'smok') && !this.frozen ? this.dragonSpot : null;
  }

  przySmoku(x: number, y: number) {
    const s = this.smokDoOminiecia();
    return !!s && Math.hypot(x - s.x, y - s.y) < SEN.bezLudziM * PX_PER_M;
  }

  isDragon(e: Slime) {
    return e === this.dragon;
  }

  onDragonKilled(d: Slime, uciekl = false) {
    this.busy = true;
    this.host.player.vel.set(0, 0);
    // Replace the generic squashed-enemy death with takeoff and visible ascent.
    pokazOdlot(this.scene, d, 'gorski');
    d.setVisible(false);
    this.dragon = null;
    bigText(uciekl ? DEMO_TEKSTY.smokUciekl : DEMO_TEKSTY.smokPokonany, 1800);
    void przygotujPobudke().catch(() => {});
    this.scene.time.delayedCall(2000, () => this.sleep());
  }

  /** The dragon waits, still, until the hero walks into its square – then the fight starts. */
  private wakeDragon() {
    const d = this.dragon;
    if (demo.phase !== 'smok' || this.busy || !d?.peaceful || !d.active) return;
    const p = this.host.player;
    const z = dreamPlaces().dziedziniec;
    const ll = this.host.city.toLatLon(p.x, p.y);
    if (ll.lat < z.s || ll.lat > z.n || ll.lon < z.w || ll.lon > z.e) return;
    this.klawisze(false);
    d.peaceful = false;
    d.chasing = true;
    this.host.toast(DEMO_TEKSTY.wPrzod, 2500);
    this.host.hud();
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
    this.host.zbierzOwoce();
    bigText(DEMO_TEKSTY.jablkoWGlowe(session.name), 3600);
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
    // Exactly on its spot when it is free (freeNear would snap to the nearest path).
    const spot = this.host.city.isFree(at.x, at.y, 8, 8) ? at : this.host.city.freeNear(at.x, at.y);
    this.dragonSpot = spot;
    const d = this.host.spawnDragon(spot.x, spot.y);
    // Never beaten: it flies off after SEN.ciosowDoOdlotu hits (naTrafienie), whatever they deal.
    d.hp = 1e6;
    d.peaceful = true;
    ubierzSmoka(this.scene, d, 'gorski', 0xffffff, 1);
    this.dragon = d;
  }


  /** Blackout, then waking up for real where the QR code sends. */
  private sleep() {
    if (this.frozen) return;
    this.frozen = true;
    this.klawisze(false);
    this.host.player.vel.set(0, 0);
    void przygotujPobudke().catch(() => {});
    blackout(true, 600);
    // Just the fade to black, then straight on (the login and the map were started already).
    this.scene.time.delayedCall(650, () => {
      wakeUp(this.scene).catch(() => {
        blackout(false);
        this.host.dialog({ title: 'Nie udało się wczytać postaci', text: 'Spróbuj ponownie, żeby obudzić się przed Targami Lublin.',
          buttons: ['Spróbuj ponownie'], onChoose: () => { this.frozen = false; this.sleep(); } });
      });
    });
  }
}

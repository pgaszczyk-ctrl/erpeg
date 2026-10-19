import { SKALA_POSTACI } from '../skala';
import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { SEN, DEMO_TEKSTY } from '../content/demo';
import { demo, dreamPlaces, blackout, bigText, wakeUp, przygotujPobudke } from '../demo';
import { session } from '../quests';
import { meleeDamage, totalFruit } from '../inventory';
import { pokazOdlot, zaladujSmoka, ubierzSmoka } from '../objects/smokRysunki';
import type { Slime } from '../objects/Slime';
import type { Player } from '../objects/Player';
import type { Orchards, FruitTree } from './Ambient';
import type { DialogRequest } from './GameScene';
import { teleskop } from '../ui/hud';
import { pokazGdzieKliknac } from '../ui/samouczek';
import { turyNaSerwerze } from '../walka/tryb';
import { PLAYER } from '../objects/Player';
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
  ready: () => boolean;
  /** Starts the turn fight with the dragon (test server); false when there are no turn fights. */
  walcz: (d: Slime) => boolean;
}

const RADA_CSS = `
#demo-rada { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(max(6px, env(safe-area-inset-bottom)) + 178px);
  width: min(400px, calc(100vw - 24px)); z-index: 8; pointer-events: none; text-align: center;
  font: 600 16px/1.25 'Alegreya Sans', sans-serif; color: #fff4d0; background: #1e1a24e8; border: 2px solid #e9c46a;
  border-radius: 12px; padding: 9px 12px; box-shadow: 0 4px 14px #0009; }
#demo-rada::after { content: '👇'; position: absolute; left: 50%; bottom: -24px; transform: translateX(-50%); font-size: 20px; }
@keyframes demo-wskaz { 0%, 100% { box-shadow: 0 0 0 2px #ffd34a, 0 0 10px 2px #ffd34a99; } 50% { box-shadow: 0 0 0 4px #fff1a8, 0 0 18px 6px #ffd34acc; } }
#walka-panel[data-wskaz="cios"] .wp-b.cios, #walka-panel[data-wskaz="spec"] .wp-b.spec,
#walka-panel[data-wskaz="lecz"] .wp-b.lecz { border-color: #ffd34a; animation: demo-wskaz 0.9s ease-in-out infinite; }
`;


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
  private dragon: (Slime & { peaceful?: boolean }) | null = null;
  private dragonSpot: { x: number; y: number } | null = null;
  /** Just outside the gap in the castle's east wall. */
  private wylom: { x: number; y: number } | null = null;
  /** "Kliknij, żeby strącić owoce" over the apple tree next to the hero. */
  private hint: Phaser.GameObjects.Text | null = null;
  /** Metres walked in the dream (owner, 12 Oct 2026: after SEN.limitM the hero wakes up anyway, dragon or not). */
  private dreamWalked = 0;
  private dreamLast: { x: number; y: number } | null = null;
  /** Test server: the dragon fights in turns, flies off after SEN.tury.ciosow hits, the fight has its own tutorial. */
  private tury = turyNaSerwerze();
  private walczy = false;
  /** The hero ran away from the turn fight: it starts again only after he left the courtyard. */
  private czekaWyjscie = false;
  private trafien = 0;
  private rada: 'start' | 'lecz' | 'dobij' | null = null;

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
    if (this.walczy) return null;
    if (demo.phase === 'smok' && this.dragonSpot) {
      const d = this.dragon;
      // First through the gap in the east wall (the arrow straight at the dragon led into the castle's walls).
      if (d?.peaceful && this.wylom) return { text: DEMO_TEKSTY.celWylom, pos: this.wylom };
      return { text: DEMO_TEKSTY.celSmok, pos: d && d.active && !d.isDead ? { x: d.x, y: d.y } : this.dragonSpot };
    }
    return null;
  }

  update(now: number, dt: number) {
    void now;
    void dt;
    if (this.frozen) return;
    // Turn fights: the apples are kept for healing in the fight – picked them, remembered who I am.
    if (this.tury && demo.phase === 'jedzenie' && !this.busy && totalFruit() >= SEN.owocowNaSerce) {
      this.remember();
      return;
    }
    if (!this.tury && demo.phase === 'jedzenie' && !this.busy && !this.fruitHintShown && totalFruit() >= SEN.owocowNaSerce && this.host.player.hp < this.healTo) {
      // The demo is the first tutorial: the player eats the apples alone (owner, 11 Oct 2026 – a dialog button
      // here got pressed by the taps on the tree). Everything else goes dark, the heal control is shown.
      this.fruitHintShown = true;
      this.busy = true;
      this.host.player.vel.set(0, 0);
      this.host.player.anims.stop();
      this.scene.time.delayedCall(450, () => {
        if (this.frozen) return;
        const klawisz = matchMedia('(pointer: coarse)').matches ? '' : DEMO_TEKSTY.jablkaKlawisz;
        if (!teleskop()) {
          this.zamknijSamouczek = pokazGdzieKliknac('#hud .hud-heal', DEMO_TEKSTY.jablka + klawisz, () => this.host.heal());
          return;
        }
        // The telescope HUD (test server) shows no life at all, so the demo puts its own apple button where the
        // spotlight can point at it.
        const b = document.createElement('button');
        b.type = 'button';
        b.id = 'demo-zjedz';
        b.textContent = DEMO_TEKSTY.jablkaPrzycisk;
        Object.assign(b.style, { position: 'fixed', left: '50%', bottom: '22%', transform: 'translateX(-50%)', zIndex: '6',
          font: '600 20px "Alegreya Sans", sans-serif', padding: '12px 22px', borderRadius: '24px', cursor: 'pointer',
          color: '#2b1a0c', background: 'linear-gradient(#f3d27a, #c8963a)', border: '2px solid #6b4a1c', boxShadow: '0 3px 8px #0008' });
        document.body.append(b);
        const zamknij = pokazGdzieKliknac('#demo-zjedz', DEMO_TEKSTY.jablkaTeleskop + klawisz, () => this.host.heal());
        this.zamknijSamouczek = () => { zamknij(); b.remove(); };
      });
      return;
    }
    if (this.zamknijSamouczek && this.host.player.hp >= this.healTo) {
      this.zamknijSamouczek();
      this.zamknijSamouczek = null;
      this.busy = false;
    }
    if (!this.tury && demo.phase === 'jedzenie' && !this.busy && this.host.player.hp >= this.healTo) this.remember();
    this.showHint();
    this.wakeDragon();
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

  onDragonKilled(d: Slime, uciekl = false) {
    this.busy = true;
    this.walczy = false;
    this.pokazRade(null);
    this.host.player.vel.set(0, 0);
    // Replace the generic squashed-enemy death with takeoff and visible ascent.
    pokazOdlot(this.scene, d, 'gorski');
    d.setVisible(false);
    this.dragon = null;
    bigText(uciekl ? DEMO_TEKSTY.smokUciekl : DEMO_TEKSTY.smokPokonany, 1800);
    void przygotujPobudke().catch(() => {});
    this.scene.time.delayedCall(2000, () => this.sleep());
  }

  /** The dragon waits, still, until the hero walks into the courtyard through the gap – then the fight starts. */
  private wakeDragon() {
    const d = this.dragon;
    if (demo.phase !== 'smok' || this.busy || this.walczy || !d?.peaceful || !d.active) return;
    const p = this.host.player;
    const z = dreamPlaces().dziedziniec;
    const ll = this.host.city.toLatLon(p.x, p.y);
    const wSrodku = !(ll.lat < z.s || ll.lat > z.n || ll.lon < z.w || ll.lon > z.e);
    if (this.czekaWyjscie) {
      if (!wSrodku) this.czekaWyjscie = false;
      return;
    }
    if (!wSrodku) return;
    if (this.tury) {
      // The dragon stays "peaceful" for the live loop: the turn fight moves it.
      this.walczy = true;
      this.rada = null;
      this.host.toast(DEMO_TEKSTY.wPrzod, 2500);
      if (this.host.walcz(d)) return;
      this.walczy = false;
      this.tury = false;
    }
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
    const { smok, wylom } = dreamPlaces();
    const at = this.host.city.fromLatLon(smok.lat, smok.lon);
    await this.host.city.ensure(at.x, at.y, 200 * PX_PER_M);
    await zaladujSmoka(this.scene, 'gorski');
    if (!this.scene.sys.isActive() || this.frozen) return;
    // Exactly in the courtyard's middle when it is free (freeNear would snap to the nearest path).
    const spot = this.host.city.isFree(at.x, at.y, 8, 8) ? at : this.host.city.freeNear(at.x, at.y);
    this.dragonSpot = spot;
    this.wylom = this.host.city.fromLatLon(wylom.lat, wylom.lon);
    const d = this.host.spawnDragon(spot.x, spot.y);
    // GameScene gives the demo dragon SmokAI's airborne-retreat options once it wakes up (wakeDragon).
    d.hp = SEN.ciosow * meleeDamage();
    if (this.tury) {
      // Turn fight: it flies off after SEN.tury.ciosow hits whatever they deal (trafiony keeps its bar honest).
      d.hp = 1e6;
      d.setData('smokZycie', true);
    }
    d.peaceful = true;
    ubierzSmoka(this.scene, d, 'gorski', 0xffffff, 1);
    this.dragon = d;
  }

  // ------------------------------------------------------------ the turn fight (test server)

  /** The dragon took a hit in the turn fight: its bar drops by a third; true after the last one (it flies off). */
  trafiony(e: Slime, hp0: number) {
    if (e !== this.dragon) return false;
    this.trafien++;
    const n = SEN.tury.ciosow;
    if (this.trafien >= n) {
      this.busy = true; // nothing restarts the fight before it has flown off
      return true;
    }
    e.hp = Math.max(1, (hp0 * (n - this.trafien)) / n);
    return false;
  }

  /** The fight is over without the dragon flying off: ran away (try again after leaving the courtyard). */
  poWalce(wynik: string) {
    if (!this.walczy) return;
    this.walczy = false;
    this.pokazRade(null);
    if (wynik === 'ucieczka') this.czekaWyjscie = true;
  }

  /** The tutorial inside the turn fight: how to strike, then how to heal, then finish the dragon. */
  krokWalki(co: 'tura' | 'cios' | 'specjalne' | 'wroc' | 'lecz') {
    if (!this.walczy) return;
    const p = this.host.player;
    const ranny = p.hp < PLAYER.maxHp;
    const zostalo = SEN.tury.ciosow - this.trafien;
    if (co === 'lecz' || (this.rada === 'lecz' && !ranny)) {
      this.rada = 'dobij';
      return this.pokazRade(DEMO_TEKSTY.walkaDobij(zostalo), 'cios');
    }
    if (this.rada === null && co === 'tura') {
      this.rada = 'start';
      return this.pokazRade(DEMO_TEKSTY.walkaStart, 'cios');
    }
    if (this.rada === 'start' && co === 'cios') {
      if (!ranny) {
        this.rada = 'dobij';
        return this.pokazRade(DEMO_TEKSTY.walkaDobij(zostalo), 'cios');
      }
      this.rada = 'lecz';
      return this.pokazRade(DEMO_TEKSTY.walkaLecz, 'spec');
    }
    if (this.rada === 'lecz') {
      if (co === 'specjalne') return this.pokazRade(DEMO_TEKSTY.walkaLeczTeraz, 'lecz');
      if (co === 'wroc' || co === 'tura') return this.pokazRade(DEMO_TEKSTY.walkaLecz, 'spec');
    }
    if (this.rada === 'dobij' && (co === 'cios' || co === 'tura')) {
      return this.pokazRade(co === 'tura' ? DEMO_TEKSTY.walkaDobij(zostalo) : DEMO_TEKSTY.walkaRuchy, 'cios');
    }
  }

  private pokazRade(tekst: string | null, wskaz?: 'cios' | 'spec' | 'lecz') {
    if (!document.getElementById('demo-rada-css')) {
      const st = document.createElement('style');
      st.id = 'demo-rada-css';
      st.textContent = RADA_CSS;
      document.head.append(st);
    }
    const panel = document.getElementById('walka-panel');
    let el = document.getElementById('demo-rada');
    if (!tekst) {
      el?.remove();
      panel?.removeAttribute('data-wskaz');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-rada';
      el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.textContent = tekst;
    // Just above the fight panel, whatever its height (one row, the special row, a phone).
    const nad = () => {
      const e = document.getElementById('demo-rada');
      if (!e) return;
      const top = document.getElementById('walka-panel')?.getBoundingClientRect().top;
      if (top) e.style.bottom = `${Math.round(innerHeight - top + 30)}px`;
      requestAnimationFrame(nad);
    };
    if (!el.dataset.sledzi) {
      el.dataset.sledzi = '1';
      nad();
    }
    if (wskaz) panel?.setAttribute('data-wskaz', wskaz);
    else panel?.removeAttribute('data-wskaz');
  }

  /** Blackout, then waking up for real where the QR code sends. */
  private sleep() {
    if (this.frozen) return;
    this.frozen = true;
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

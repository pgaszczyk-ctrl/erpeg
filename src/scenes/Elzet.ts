import Phaser from 'phaser';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { session } from '../quests';
import { fixedSprite, hdOn, ensureRed, fitHd } from '../sprites';
import { SKALA_POSTACI } from '../skala';
import { PLAYER } from '../objects/Player';
import type { Slime } from '../objects/Slime';
import type { RodzajWroga } from '../content/fabula';
import { cooldown, meleeDamage, rangedWeapon, shotDamage } from '../inventory';
import { ELZET, ELZET_TEKSTY as T, KROK } from '../content/elzet';
import type { DialogRequest } from './GameScene';

// Elzet 10 – the owner's robot quest (30 Oct 2026; texts and numbers in content/elzet.ts). One class runs it all:
// the sitting robot on Kryształowa, the imps circling the cog at the Lidl, the cog, both fights (its own brain:
// red telegraphs, life and blows scaled from the hero, stopping at 10 % of life) and the walk round the lakeside
// house with the jokes. State: session.flagi.elzet (step, KROK) and session.flagi.elzet_zarty (jokes heard).

const M = PX_PER_M;
const CZERWONY = 0xff3b1f;

type Wrog = Slime & { elzet?: boolean; temp?: boolean; peaceful?: boolean; lowiskoHome?: { x: number; y: number; r: number; krazy?: number } };

export interface ElzetHost {
  scene: Phaser.Scene;
  city: CityMap;
  player: Phaser.GameObjects.Sprite & { speed: number; hp: number; isDead: boolean };
  dialog(req: DialogRequest): void;
  toast(text: string, ms?: number): void;
  spawn(x: number, y: number, kind: RodzajWroga): Wrog;
  /** Takes an enemy off the list (and destroys it). */
  usun(s: Wrog): void;
  /** Half-hearts of damage on the hero (armour applies to physical blows). */
  hurt(from: Phaser.Math.Vector2, polowki: number, fizyczne: boolean): void;
  sciana(x: number, y: number): boolean;
  widac(x: number, y: number): boolean;
  save(): void;
  hud(): void;
  /** Loot like the creatures' (items into the backpack with a toast). */
  lup(x: number, y: number, lup: { co: string; ile: number }[]): void;
}

type Pt = { x: number; y: number };

function krok() {
  return session.flagi.elzet ?? KROK.nic;
}

function ustaw(k: number) {
  session.flagi.elzet = k;
}

/** The cog the imps guard: a code-drawn brass gear. */
function teksturaKolka(scene: Phaser.Scene) {
  const key = 'elzet-kolko';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const c = 8, R = 6.4, r = 4.6, zebow = 8;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < zebow * 4; i++) {
    const a = (i / (zebow * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? R : r;
    pts.push(new Phaser.Math.Vector2(c + Math.cos(a) * rr, c + Math.sin(a) * rr));
  }
  g.fillStyle(0x1e1a24, 1);
  g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(c + (p.x - c) * 1.15, c + (p.y - c) * 1.15)), true);
  g.fillStyle(0xd8a040, 1);
  g.fillPoints(pts, true);
  g.fillStyle(0xf4d27a, 1);
  g.fillCircle(c - 1, c - 1, 2.6);
  g.fillStyle(0x1e1a24, 1);
  g.fillCircle(c, c, 1.6);
  g.generateTexture(key, 16, 16);
  g.destroy();
  return key;
}

/** One fight with the robot (its brain). */
class Walka {
  readonly s: Wrog;
  private stan: 'idzie' | 'zapowiedz' | 'odpoczynek' | 'koniec' = 'idzie';
  private until = 0;
  private kat = 0;
  private akcje: ('miecz' | 'czar' | 'przerwa')[];
  private i = 0;
  private gfx: Phaser.GameObjects.Graphics;
  private gfxPociski: Phaser.GameObjects.Graphics;
  private pasek: Phaser.GameObjects.Graphics;
  private pociski: { x: number; y: number; vx: number; vy: number; zostalo: number }[] = [];
  private readonly cios: number;
  private readonly predkosc: number;
  private readonly odstepMiecz: number;
  private readonly odstepCzar: number;
  private readonly maxHp: number;
  readonly srodek: Pt;

  constructor(private h: ElzetHost, x: number, y: number, readonly faza: 1 | 2, private poProgu: (w: Walka) => void) {
    const sc = h.scene;
    const P = faza === 1 ? ELZET.walka1 : ELZET.walka2;
    this.srodek = { x, y };
    const s = h.spawn(x, y, 'elzet');
    this.s = s;
    s.elzet = true;
    s.heavy = true;
    s.roam = 0;
    // Looks like the Mechanical Gladiator (the owner: „możesz tymczasowo użyć sprita robotycznego gladiatora”).
    if (hdOn) {
      const key = ensureRed(sc, 'hd-gladiator');
      if (sc.textures.exists(key)) {
        s.anims.stop();
        s.setTexture(key, 'down-0');
        fitHd(s, s.kind.scale);
        s.hd = true;
        s.walkAnim = `${key}-walk`;
      }
    }
    // Scaled from the hero: a copy of the hero would fall after ELZET.ciosowNaKopie of his own blows.
    const r = rangedWeapon();
    const D = Math.max(1, meleeDamage(), r ? shotDamage(r) : 0);
    this.maxHp = Math.max(4, Math.round(P.zycie * ELZET.ciosowNaKopie * D));
    s.hp = this.maxHp;
    s.prog = { hp: Math.max(1, Math.round(this.maxHp * ELZET.prog)), fn: () => this.dosc() };
    // Its blow: the copy's blow (the hero's life ÷ blows to fall) × sila; difficulty's own factor is left out.
    this.cios = (P.sila * PLAYER.maxHp) / ELZET.ciosowNaKopie / Math.max(0.1, session.level.obrazenia);
    this.predkosc = h.player.speed * P.predkosc;
    this.odstepMiecz = cooldown('miecz') / P.tempo;
    this.odstepCzar = cooldown('magia') / P.tempo;
    const C = ELZET.czary;
    this.akcje = faza === 1 ? ['miecz']
      : [...Array.from({ length: C.serii }, () => [...Array(C.naSerie).fill('czar'), 'przerwa']).flat(), ...Array(C.ciosow).fill('miecz'), 'przerwa'];
    s.brain = (now) => this.mysl(now);
    this.gfx = sc.add.graphics().setDepth(1_000_000);
    this.gfxPociski = sc.add.graphics().setDepth(1_000_001);
    this.pasek = sc.add.graphics().setDepth(1_150_000);
  }

  get trwa() {
    return this.stan !== 'koniec';
  }

  destroy() {
    this.gfx.destroy();
    this.gfxPociski.destroy();
    this.pasek.destroy();
    this.pociski = [];
  }

  /** 10 % of life left: it stops (Slime.prog). */
  private dosc() {
    this.stan = 'koniec';
    this.s.vel.set(0, 0);
    this.s.peaceful = true;
    this.gfx.clear();
    this.gfxPociski.clear();
    this.pociski = [];
    this.poProgu(this);
  }

  private mysl(now: number) {
    const s = this.s, p = this.h.player;
    const dt = this.h.scene.game.loop.delta / 1000;
    this.lot(dt);
    this.rysujPasek();
    if (this.stan === 'koniec') return;
    const dist = Math.hypot(p.x - s.x, p.y - s.y);
    const akcja = this.akcje[this.i % this.akcje.length];
    const C = ELZET.czary;
    switch (this.stan) {
      case 'idzie': {
        if (akcja === 'przerwa') {
          this.dalej(now, C.przerwaSeriiMs);
          return;
        }
        if (akcja === 'miecz') {
          if (dist > (ELZET.mieczM * 0.8) * M + s.size) return this.idz(p.x, p.y, 1);
          return this.zapowiedz(now);
        }
        // A spell: keep some distance, then cast.
        if (dist > C.zasiegM * 0.85 * M) return this.idz(p.x, p.y, 1);
        if (dist < C.trzymaM * 0.6 * M) return this.idz(s.x * 2 - p.x, s.y * 2 - p.y, 1);
        return this.zapowiedz(now);
      }
      case 'zapowiedz':
        s.vel.set(0, 0);
        this.rysujZapowiedz(now, akcja);
        if (now >= this.until) this.uderz(now, akcja);
        return;
      case 'odpoczynek':
        s.vel.set(0, 0);
        if (now >= this.until) this.stan = 'idzie';
        return;
    }
  }

  private idz(x: number, y: number, ile: number) {
    const s = this.s;
    const d = new Phaser.Math.Vector2(x - s.x, y - s.y);
    if (d.lengthSq() < 1) return void s.vel.set(0, 0);
    d.normalize().scale(this.predkosc * ile);
    s.vel.set(d.x, d.y);
  }

  private zapowiedzMs(akcja: string) {
    return Math.min(ELZET.zapowiedzMs, (akcja === 'czar' ? this.odstepCzar : this.odstepMiecz) * 0.6);
  }

  private zapowiedz(now: number) {
    const s = this.s, p = this.h.player;
    this.stan = 'zapowiedz';
    this.kat = Math.atan2(p.y - s.y, p.x - s.x);
    this.until = now + this.zapowiedzMs(this.akcje[this.i % this.akcje.length]);
    s.vel.set(0, 0);
  }

  private rysujZapowiedz(now: number, akcja: string) {
    const s = this.s, g = this.gfx, a = this.kat;
    const puls = 0.55 + 0.35 * Math.sin(now / 70);
    g.clear();
    if (akcja === 'miecz') {
      const dl = ELZET.mieczM * M + s.size, pol = ELZET.mieczKat;
      g.fillStyle(CZERWONY, 0.14 + 0.14 * puls);
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.arc(s.x, s.y, dl, a - pol, a + pol, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, CZERWONY, 0.6 + 0.3 * puls);
      g.strokePath();
    } else {
      const dl = ELZET.czary.zasiegM * M;
      g.lineStyle(5, CZERWONY, 0.1 + 0.12 * puls);
      g.lineBetween(s.x, s.y - 6, s.x + Math.cos(a) * dl, s.y - 6 + Math.sin(a) * dl);
      g.lineStyle(1, 0x9fd8ff, 0.6 + 0.3 * puls);
      g.strokeCircle(s.x, s.y - 8, 3 + puls * 2);
    }
  }

  private uderz(now: number, akcja: string) {
    const s = this.s, p = this.h.player;
    this.gfx.clear();
    if (akcja === 'miecz') {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      const a = Math.atan2(p.y - s.y, p.x - s.x);
      if (d <= ELZET.mieczM * M + s.size + 4 && (d < s.size + 3 || Math.abs(Phaser.Math.Angle.Wrap(a - this.kat)) <= ELZET.mieczKat + 0.12))
        this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), this.cios, true);
      this.blysk(s);
      this.dalej(now, this.odstepMiecz - this.zapowiedzMs('miecz'));
    } else {
      const v = ELZET.czary.predkoscM * M;
      this.pociski.push({ x: s.x + Math.cos(this.kat) * 6, y: s.y - 6 + Math.sin(this.kat) * 6, vx: Math.cos(this.kat) * v, vy: Math.sin(this.kat) * v, zostalo: ELZET.czary.zasiegM * M });
      this.dalej(now, this.odstepCzar - this.zapowiedzMs('czar'));
    }
  }

  private dalej(now: number, ms: number) {
    this.i++;
    this.stan = 'odpoczynek';
    this.until = now + Math.max(80, ms);
  }

  private blysk(s: Wrog) {
    const sw = this.h.scene.add.graphics().setDepth(s.depth + 1);
    const r = ELZET.mieczM * M + s.size;
    sw.lineStyle(2, 0xffe6b0, 0.9);
    sw.beginPath();
    sw.arc(s.x, s.y - 2, r * 0.8, this.kat - ELZET.mieczKat, this.kat + ELZET.mieczKat);
    sw.strokePath();
    this.h.scene.tweens.add({ targets: sw, alpha: 0, duration: 180, onComplete: () => sw.destroy() });
  }

  /** Magic bolts: blue, stopped by walls, hit at most once. */
  private lot(dt: number) {
    const g = this.gfxPociski, p = this.h.player;
    g.clear();
    this.pociski = this.pociski.filter((q) => {
      const krok = Math.hypot(q.vx, q.vy) * dt;
      const n = Math.max(1, Math.ceil(krok / 3));
      for (let i = 0; i < n; i++) {
        q.x += (q.vx * dt) / n;
        q.y += (q.vy * dt) / n;
        if (this.h.sciana(q.x, q.y + 6)) return false;
        if (Math.hypot(q.x - p.x, q.y - (p.y - 4)) <= 5) {
          this.h.hurt(new Phaser.Math.Vector2(q.x, q.y), this.cios, false);
          return false;
        }
      }
      q.zostalo -= krok;
      if (q.zostalo <= 0) return false;
      g.fillStyle(0x1e1a24, 1);
      g.fillCircle(q.x, q.y, 2.6);
      g.fillStyle(0x6fc8ff, 1);
      g.fillCircle(q.x, q.y, 2);
      g.fillStyle(0xe8f8ff, 1);
      g.fillCircle(q.x - 0.5, q.y - 0.5, 0.9);
      return true;
    });
  }

  /** Its life over its head, with a mark where it gives up (10 %). */
  private rysujPasek() {
    const g = this.pasek, s = this.s;
    g.clear();
    if (!s.active || !s.visible) return;
    const w = 22, x = s.x - w / 2, y = s.y - 30 * SKALA_POSTACI * s.kind.scale;
    g.fillStyle(0x1e1a24, 1).fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle(0x4a3a3a, 1).fillRect(x, y, w, 2);
    g.fillStyle(0xe05a3a, 1).fillRect(x, y, Math.max(0, (w * s.hp) / this.maxHp), 2);
    g.fillStyle(0xf4d27a, 1).fillRect(x + w * ELZET.prog, y - 1, 1, 4);
  }
}

export class Elzet {
  /** The robot standing about (not in a fight): sitting at the start, awake later. */
  private npc?: Phaser.GameObjects.Sprite;
  private napis?: Phaser.GameObjects.Text;
  private paraAt = 0;
  private walka?: Walka;
  private chochliki: Wrog[] = [];
  private kolko?: Phaser.GameObjects.Image;
  private pilnujaPowiedziane = false;
  /** The lake walk: points round the house and where along it he is. */
  private trasa: Pt[] = [];
  private naTrasie = 0;
  /** Busy with a short scene (standing up, walking away): nothing else starts. */
  private zajety = false;

  constructor(private h: ElzetHost) {}

  destroy() {
    this.usunNpc();
    this.walka?.destroy();
    if (this.walka) this.h.usun(this.walka.s);
    this.walka = undefined;
    for (const c of this.chochliki) if (c.active) this.h.usun(c);
    this.chochliki = [];
    this.kolko?.destroy();
    this.kolko = undefined;
  }

  private pt(ll: { lat: number; lon: number }) {
    return this.h.city.fromLatLon(ll.lat, ll.lon);
  }

  private blisko(p: Pt, m: number) {
    const pl = this.h.player;
    return Math.hypot(p.x - pl.x, p.y - pl.y) < m * M;
  }

  private gotowe(p: Pt, r = 60) {
    return this.h.city.ready({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
  }

  /** Where the robot should be now (null: nowhere on this map yet). */
  private miejsce(): Pt | null {
    const k = krok();
    if (k <= KROK.walka1) return this.pt(ELZET.start);
    if (k === KROK.walka2) return this.pt(ELZET.naleczowska);
    return this.pt(ELZET.jezioro);
  }

  update(now: number) {
    if (this.h.player.isDead) return;
    this.chochlikiILidl(now);
    const k = krok();
    const gdzie = this.miejsce();
    if (!gdzie) return;
    // Only near the hero (the tiles there must be in).
    const tu = this.blisko(gdzie, 700) && this.gotowe(gdzie);
    if (this.walka) {
      if (!this.walka.trwa) return;
      // Ran far away or died: the fight starts again from the beginning next time.
      if (!this.blisko(this.walka.srodek, ELZET.ucieczkaM) || !this.walka.s.active) this.przerwijWalke();
      return;
    }
    if (!tu) {
      this.usunNpc();
      return;
    }
    if (!this.npc) this.postawNpc(gdzie, k);
    this.npcKazdaKlatka(now, k);
    if (this.zajety) return;
    // Awake and waiting: coming near starts (or restarts) the fight.
    if ((k === KROK.walka1 || k === KROK.walka2) && this.npc && this.blisko(this.npc, ELZET.zaczepM)) {
      const p = { x: this.npc.x, y: this.npc.y };
      if (k === KROK.walka1) {
        this.h.toast(`🤖 ${T.wracaDoWalki}`, 2500);
        this.zacznijWalke(p, 1);
      } else {
        this.zajety = true;
        this.h.dialog({
          title: `🤖 ${ELZET.imie}`, text: T.spotkanie2, buttons: [T.walcz],
          onChoose: () => { this.zajety = false; this.zacznijWalke(p, 2); },
        });
      }
    }
  }

  // ------------------------------------------------------------------ the robot standing about

  private postawNpc(p: Pt, k: number) {
    const sc = this.h.scene;
    const at = k === KROK.jezioro || k === KROK.koniec ? (this.trasaJeziora(p), this.trasa[0] ?? p) : this.h.city.freeNear(p.x, p.y);
    const s = fixedSprite(sc, at.x, at.y, 'gladiator', TEX.hero, 0xd8a860);
    s.setFrame('down-0');
    this.npc = s;
    if (k < KROK.walka1) {
      // Sitting, switched off: lower, greyed, tilted.
      s.setScale(s.scaleX, s.scaleY * 0.78).setAngle(-6).setTint(0xa8a4a0);
    }
    const imie = k >= KROK.szuka ? ELZET.imie : 'Robot';
    this.napis = sc.add.text(at.x, at.y - 30 * SKALA_POSTACI, imie, { fontFamily: 'monospace', fontSize: '7px', color: '#fff8e0', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 })
      .setOrigin(0.5, 1).setDepth(1_150_000);
  }

  private usunNpc() {
    this.npc?.destroy();
    this.npc = undefined;
    this.napis?.destroy();
    this.napis = undefined;
  }

  private npcKazdaKlatka(now: number, k: number) {
    const s = this.npc!;
    const widac = this.h.widac(s.x, s.y);
    s.setVisible(widac).setDepth(s.y);
    this.napis?.setVisible(widac).setPosition(s.x, s.y - 30 * SKALA_POSTACI);
    // Steam from the pipe on its back while it sits (and now and then later).
    if (widac && now >= this.paraAt) {
      this.paraAt = now + (k < KROK.walka1 ? 380 : 1400) + Math.random() * 300;
      this.dymek(s.x + 3, s.y - 15 * SKALA_POSTACI);
    }
    if ((k === KROK.jezioro || k === KROK.koniec) && !this.zajety) this.spacer();
  }

  private dymek(x: number, y: number) {
    const sc = this.h.scene;
    const g = sc.add.circle(x, y, 1.6, 0xf0f0f0, 0.75).setDepth(y + 200);
    sc.tweens.add({ targets: g, y: y - 10, x: x + 2 + Math.random() * 3, scale: 2.6, alpha: 0, duration: 1100, ease: 'Sine.out', onComplete: () => g.destroy() });
  }

  /** Round the lakeside house: the nearest ring of free points around the given spot. */
  private trasaJeziora(p: Pt) {
    if (this.trasa.length) return;
    const city = this.h.city;
    for (const rM of [9, 12, 15, 19, 24, 30]) {
      const pts: Pt[] = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const q = { x: p.x + Math.cos(a) * rM * M, y: p.y + Math.sin(a) * rM * M };
        if (city.isFree(q.x, q.y + 5, 2, 1.5)) pts.push(q);
      }
      if (pts.length >= 14) {
        this.trasa = pts;
        return;
      }
    }
    this.trasa = [city.freeNear(p.x, p.y)];
  }

  private spacer() {
    const s = this.npc!;
    if (this.trasa.length < 2) return;
    // Stands still while the hero talks to him from close by.
    if (this.blisko(s, 3)) return void s.anims.stop();
    const cel = this.trasa[(this.naTrasie + 1) % this.trasa.length];
    const dx = cel.x - s.x, dy = cel.y - s.y, d = Math.hypot(dx, dy);
    const v = (this.h.player.speed * ELZET.spacer * this.h.scene.game.loop.delta) / 1000;
    if (d <= v) {
      this.naTrasie = (this.naTrasie + 1) % this.trasa.length;
      return;
    }
    s.x += (dx / d) * v;
    s.y += (dy / d) * v;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    s.setFlipX(dir === 'side' && dx > 0);
    const anim = `${s.texture.key}-walk-${dir}`;
    if (s.scene.anims.exists(anim)) s.anims.play(anim, true);
  }

  // ------------------------------------------------------------------ talking

  /** A talk with the robot when it stands within `r` of (x, y). */
  talkAt(x: number, y: number, r: number): (() => void) | null {
    const s = this.npc;
    if (!s || this.walka || this.zajety || !s.visible || Math.hypot(s.x - x, s.y - (y + 2)) >= r + 4) return null;
    return () => this.rozmowa();
  }

  private rozmowa() {
    const k = krok();
    const tytul = `🤖 ${k >= KROK.szuka ? ELZET.imie : 'Robot'}`;
    const bzzt = T.bzzt[Math.floor(Math.random() * T.bzzt.length)];
    if (k === KROK.nic) {
      ustaw(KROK.szuka);
      this.napis?.setText(ELZET.imie);
      this.h.save();
      return this.h.dialog({ title: tytul, text: `„${bzzt}”\n\n${T.ogledziny}`, buttons: ['Rozejrzę się za tą częścią'], onChoose: () => this.h.hud() });
    }
    if (k === KROK.szuka) return this.h.dialog({ title: tytul, text: `„${bzzt}”\n\nW boku robota wciąż brakuje zębatki.`, buttons: ['OK'], onChoose: () => {} });
    if (k === KROK.kolko) {
      return this.h.dialog({
        title: tytul, text: `„${bzzt}”`, buttons: [T.wloz, 'Jeszcze nie'],
        onChoose: (i) => { if (i === 0) this.wlozKolko(); },
      });
    }
    if (k === KROK.jezioro || k === KROK.koniec) return this.zart();
    this.h.dialog({ title: tytul, text: `„${bzzt}”`, buttons: ['OK'], onChoose: () => {} });
  }

  private wlozKolko() {
    const s = this.npc;
    if (!s) return;
    session.fabula = session.fabula.filter((f) => f !== 'Zębate kółko');
    ustaw(KROK.walka1);
    this.h.save();
    this.zajety = true;
    this.h.toast(`⚙ ${T.wkladasz}`, 2500);
    const sc = this.h.scene;
    const sx = s.scaleX;
    s.clearTint();
    // Stands up, then turns round on the spot.
    sc.tweens.add({
      targets: s, scaleY: sx, angle: 0, duration: 700, ease: 'Back.out',
      onComplete: () => {
        const kolej: [string, boolean][] = [['side', false], ['up', false], ['side', true], ['down', false]];
        let i = 0;
        sc.time.addEvent({
          delay: 140, repeat: kolej.length * 2 - 1,
          callback: () => {
            if (!s.active) return;
            const [dir, flip] = kolej[i++ % kolej.length];
            s.setFrame(`${dir}-0`).setFlipX(flip);
            this.dymek(s.x + 3, s.y - 15 * SKALA_POSTACI);
            if (i === kolej.length * 2) {
              const p = { x: s.x, y: s.y };
              this.h.dialog({
                title: `🤖 ${ELZET.imie}`, text: T.wstal, buttons: [T.walcz],
                onChoose: () => { this.zajety = false; this.zacznijWalke(p, 1); this.h.hud(); },
              });
            }
          },
        });
      },
    });
  }

  private zart() {
    const n = session.flagi.elzet_zarty ?? 0;
    const tytul = `🤖 ${ELZET.imie}`;
    if (n >= T.zarty.length) {
      const z = T.zarty[Math.floor(Math.random() * T.zarty.length)];
      return this.h.dialog({ title: tytul, text: `${T.potem}\n\n(Powtórka:) ${z}`, buttons: [T.pa], onChoose: () => {} });
    }
    this.h.dialog({
      title: tytul, text: n === 0 ? T.powitanie : 'BZZT. Kolejny test humoru?', buttons: [T.posluchaj, T.pa],
      onChoose: (i) => {
        if (i !== 0) return;
        const m = n + 1;
        session.flagi.elzet_zarty = m;
        let text = T.zarty[n];
        const pl = this.h.player;
        if (m === ELZET.jablkaPo) {
          text += `\n\n…\n\n${T.jedz}`;
          this.h.lup(pl.x, pl.y, [{ co: 'jablko', ile: ELZET.jablek }]);
        }
        if (m === ELZET.butyPo) {
          text += `\n\n…\n\n${T.buty}`;
          this.h.lup(pl.x, pl.y, [{ co: 'buty_biegacza', ile: 1 }]);
          ustaw(KROK.koniec);
        }
        this.h.save();
        this.h.hud();
        this.h.dialog({ title: tytul, text, buttons: m < T.zarty.length ? ['Ha… ha.', 'Jeszcze jeden!'] : ['Dzięki, Elzet!'], onChoose: (j) => { if (j === 1) this.zart(); } });
      },
    });
  }

  // ------------------------------------------------------------------ fights

  private zacznijWalke(p: Pt, faza: 1 | 2) {
    this.usunNpc();
    this.walka = new Walka(this.h, p.x, p.y, faza, (w) => this.h.scene.time.delayedCall(250, () => this.koniecWalki(w)));
  }

  /** The hero ran away (or fell): the robot stands awake where it fought, at full life. */
  private przerwijWalke() {
    const w = this.walka;
    if (!w) return;
    w.destroy();
    this.h.usun(w.s);
    this.walka = undefined;
  }

  private koniecWalki(w: Walka) {
    const s = w.s;
    const faza = w.faza;
    const exp = faza === 1 ? ELZET.walka1.exp : ELZET.walka2.exp;
    session.exp += exp;
    if (faza === 1) ustaw(KROK.walka2);
    else {
      ustaw(KROK.jezioro);
      this.h.lup(s.x, s.y, [{ co: 'zlota_pilka', ile: 1 }]);
      this.h.toast(T.pilka, 3000);
    }
    this.h.save();
    this.h.hud();
    this.h.dialog({
      title: `🤖 ${ELZET.imie}`, text: `${faza === 1 ? T.przerwa1 : T.przerwa2}\n\n(+${exp} EXP)`, buttons: ['…'],
      onChoose: () => {
        // Walks away from the hero and fades.
        const p = this.h.player;
        const a = Math.atan2(s.y - p.y, s.x - p.x);
        s.vel.set(0, 0);
        s.brain = () => s.vel.set(Math.cos(a) * 18, Math.sin(a) * 18);
        this.h.scene.tweens.add({
          targets: s, alpha: 0, duration: 2600, ease: 'Sine.in',
          onComplete: () => {
            w.destroy();
            this.h.usun(s);
            if (this.walka === w) this.walka = undefined;
          },
        });
      },
    });
  }

  // ------------------------------------------------------------------ the imps and the cog at the Lidl

  private chochlikiILidl(now: number) {
    const k = krok();
    if (k !== KROK.szuka) {
      if (this.kolko) { this.kolko.destroy(); this.kolko = undefined; }
      return;
    }
    const lidl = this.pt(ELZET.lidl);
    const C = ELZET.chochliki;
    if (!this.blisko(lidl, C.znikajOdM)) {
      for (const c of this.chochliki) if (c.active) this.h.usun(c);
      this.chochliki = [];
      this.kolko?.destroy();
      this.kolko = undefined;
      return;
    }
    if (!this.kolko) {
      if (!this.blisko(lidl, C.pojawiajOdM) || !this.gotowe(lidl, 80)) return;
      // The upper edge of the parking in front of the Lidl (owner, 30 Oct 2026).
      const city = this.h.city;
      const miejsce = this.pt(ELZET.kolko);
      const at = city.freeNear(miejsce.x, miejsce.y);
      this.kolko = this.h.scene.add.image(at.x, at.y, teksturaKolka(this.h.scene)).setScale(1.1).setDepth(at.y);
      const blask = this.h.scene.add.circle(at.x, at.y, 9, 0xffd76a, 0.28).setDepth(at.y - 1).setBlendMode(Phaser.BlendModes.ADD);
      this.h.scene.tweens.add({ targets: blask, alpha: 0.08, scale: 1.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.kolko.once('destroy', () => blask.destroy());
      this.h.scene.tweens.add({ targets: this.kolko, angle: 360, duration: 6000, repeat: -1 });
      this.chochliki = [];
      for (let i = 0; i < C.ile; i++) {
        let x = at.x, y = at.y;
        for (let t = 0; t < 24; t++) {
          const a = ((i + t * 0.37) / C.ile) * Math.PI * 2, r = C.krazaM * M * (1 - (t % 3) * 0.25);
          const q = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
          if (city.isFree(q.x, q.y + 5, 2, 1.5)) { x = q.x; y = q.y; break; }
        }
        const e = this.h.spawn(x, y, 'glut');
        e.temp = true;
        e.roam = 6;
        e.lowiskoHome = { x: at.x, y: at.y, r: 40 * M, krazy: C.krazaM * M };
        this.chochliki.push(e);
      }
    }
    const c = this.kolko;
    c.setVisible(this.h.widac(c.x, c.y));
    this.chochliki = this.chochliki.filter((e) => e.active && !e.isDead);
    const pl = this.h.player;
    if (Math.hypot(c.x - pl.x, c.y - (pl.y + 4)) > 10) return;
    if (this.chochliki.length) {
      if (!this.pilnujaPowiedziane) this.h.toast(`😈 ${T.pilnuja}`, 2500);
      this.pilnujaPowiedziane = true;
      return;
    }
    c.destroy();
    this.kolko = undefined;
    ustaw(KROK.kolko);
    if (!session.fabula.includes('Zębate kółko')) session.fabula.push('Zębate kółko');
    this.h.toast(T.mamKolko, 3500);
    this.h.save();
    this.h.hud();
    void now;
  }

  /** One of ours died (true = it was an imp guarding the cog: nothing else to do for it). */
  zabity(s: Slime) {
    return this.chochliki.includes(s as Wrog);
  }

  // ------------------------------------------------------------------ the quest log

  quest(): { id: string; title: string; text: string; pos: Pt | null; start: string } | null {
    const k = krok();
    if (k === KROK.nic || k === KROK.koniec) return null;
    const base = { id: 'elzet', title: `🤖 ${ELZET.imie}`, start: 'Kryształowa' };
    const pl = this.h.player;
    const najblizszy = (l: Pt[]) => l.reduce<Pt | null>((a, b) => (!a || Math.hypot(b.x - pl.x, b.y - pl.y) < Math.hypot(a.x - pl.x, a.y - pl.y) ? b : a), null);
    switch (k) {
      case KROK.szuka: {
        const zywe = this.chochliki.filter((e) => e.active && !e.isDead);
        const pos = zywe.length ? najblizszy(zywe) : this.kolko ?? this.pt(ELZET.lidl);
        return { ...base, text: zywe.length ? `${T.celSzukaj} (${ELZET.chochliki.ile - zywe.length}/${ELZET.chochliki.ile})` : T.celSzukaj, pos: pos && { x: pos.x, y: pos.y } };
      }
      case KROK.kolko:
        return { ...base, text: T.celWroc, pos: this.npc ? { x: this.npc.x, y: this.npc.y } : this.pt(ELZET.start) };
      case KROK.walka1:
        return { ...base, text: T.celWalka1, pos: this.walka ? { x: this.walka.s.x, y: this.walka.s.y } : this.npc ? { x: this.npc.x, y: this.npc.y } : this.pt(ELZET.start) };
      case KROK.walka2:
        return { ...base, text: T.celNaleczowska, pos: this.walka ? { x: this.walka.s.x, y: this.walka.s.y } : this.pt(ELZET.naleczowska) };
      case KROK.jezioro: {
        const n = session.flagi.elzet_zarty ?? 0;
        return { ...base, text: n ? T.celZarty(n) : T.celJezioro, pos: this.npc ? { x: this.npc.x, y: this.npc.y } : this.pt(ELZET.jezioro) };
      }
    }
    return null;
  }

  /** The robot is fighting (save points and „Wyjdź” wait). */
  get walczy() {
    return !!this.walka?.trwa;
  }
}

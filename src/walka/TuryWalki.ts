// The turn fight on the map (MVP 1, test server; content/walkaTurowa.ts).
// Walking stays live; once the hero chooses to fight a group, the game stops
// the live loop and runs turns here: the group spreads out like in HoMM
// (melee in a shallow arc in front, ranged behind, the boss in the middle at
// the back), the hero spends moves (Cios / Ruch / Specjalne), targets are
// picked by tapping them on the map, then the enemies answer one action each.
// Damage, loot, EXP, practice and wear go through GameScene's usual code.

import Phaser from 'phaser';
import { WALKA_TUROWA as WT, ROLA_WROGA, SPOTKANIA, type RolaWWalce } from '../content/walkaTurowa';
import { W } from './tryb';
import { zasieg, droga, najblizsza, uprosc, type Zasieg } from './siatka';
import { PLAYER, type Player } from '../objects/Player';
import type { Slime } from '../objects/Slime';
import { TEX } from '../art';
import { OSTROSC } from '../screen';
import { session } from '../quests';
import {
  meleeDamage, shotDamage, hitChance, strongFactor, instaKillChance, gearAimBonus, blockChance, rangedWeapon, gear,
  ammoOf, takeAmmo,
} from '../inventory';
import { AMUNICJA } from '../content/zuzycie';
import { WALKA } from '../content/walka';
import { WalkaPanel, type StanPanelu } from '../ui/walkaPanel';

export type WrogWalki = Slime & { power?: number; duel?: unknown; peaceful?: boolean };

export interface Uczestnik {
  e: WrogWalki;
  rola: RolaWWalce;
  /** Ground radius (px): no two living figures overlap. */
  r: number;
  /** Stunned by a strong blow: skips its next action. */
  oglusz: boolean;
  /** Life at the start of the fight (bars, and the rest after the hero runs away). */
  hp0: number;
}

export type WynikWalki = 'wygrana' | 'ucieczka' | 'smierc' | 'przerwana';

export interface WalkaHost {
  scene: Phaser.Scene;
  player: Player;
  /** Can a figure stand here (sprite position; map, trees, stations, landmarks)? */
  wolne(x: number, y: number): boolean;
  /** Nothing built between the two points. */
  widac(ax: number, ay: number, bx: number, by: number): boolean;
  /** An enemy fell (loot, EXP, gangs, quests). */
  zabity(e: WrogWalki): void;
  cwiczenie(skill: 'miecz' | 'luk' | 'magia', pkt: number): void;
  zuzyj(id: string | null | undefined): void;
  hud(): void;
  toast(t: string, ms?: number): void;
  /** Heals with what the hero has (potion, fruit, food); false when nothing to heal with. */
  lecz(): boolean;
  /** Damage to the hero (half-hearts); true if the fight must end (death, lost duel). */
  ranBohatera(e: WrogWalki, dmg: number): boolean;
  /** The fight is over (UI already gone). */
  koniec(wynik: WynikWalki, uczestnicy: WrogWalki[]): void;
  pudlo(x: number, y: number): void;
  napis(x: number, y: number, text: string, color: string, ms?: number): void;
  zamach(aim: number, strong: boolean): void;
  wzmocnienie(e: WrogWalki): number;
  nasycenie(e: WrogWalki, now: number): void;
  /** The usual camera zoom (fitZoom). */
  zoomZwykly(): number;
  /** Back to following the hero at the usual zoom. */
  wrocKamere(): void;
  poziom(): number;
  /** Hotel bonus active (more luck, one more move). */
  wyspany(): boolean;
}

type Tryb = 'cios' | 'mocny' | 'ruch' | null;

const HERO_R = 0.3 * W;
const GLEB_ZIEMI = -1e8 + 3;
const GLEB_GORA = 1_050_000;

export class TuryWalki {
  aktywna = true;
  /** The hero's life when the fight began (a closed tab mid-fight comes back with it). */
  readonly hpPrzed: number;
  private u: Uczestnik[] = [];
  private ruchy = 0;
  private maxRuchy = 0;
  private faza: 'rozstaw' | 'gracz' | 'wrogowie' | 'koniec' = 'rozstaw';
  private tryb: Tryb = null;
  private cel: Uczestnik | null = null;
  private punkt: { k: string; x: number; y: number } | null = null;
  private zas: Zasieg | null = null;
  private busy = false;
  private carry = 0;
  private gfx: Phaser.GameObjects.Graphics;
  private gfxTop: Phaser.GameObjects.Graphics;
  private etykieta: Phaser.GameObjects.Text;
  private panel: WalkaPanel;
  private podmenu = false;
  private podpowiedz = '';
  private wszyscy: WrogWalki[];

  constructor(private h: WalkaHost, wrogowie: WrogWalki[]) {
    const s = h.scene;
    this.hpPrzed = h.player.hp;
    this.wszyscy = [...wrogowie];
    for (const e of wrogowie) {
      const rola = ROLA_WROGA[e.kindId] ?? 'wrecz';
      // Turn fights are shorter: less life (once per creature; a duel sets its own).
      const t = e as WrogWalki & { turyZycie?: boolean };
      if (!t.turyZycie && !e.duel) e.hp = Math.max(1, Math.round(e.hp * WT.wrog.zycie));
      t.turyZycie = true;
      this.u.push({ e, rola, r: Math.max(3, e.size * 0.7), oglusz: false, hp0: e.hp });
    }
    this.gfx = s.add.graphics().setDepth(GLEB_ZIEMI);
    this.gfxTop = s.add.graphics().setDepth(GLEB_GORA);
    this.etykieta = s.add.text(0, 0, '', { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '7px', color: '#fff4d0', stroke: '#1e1a24', strokeThickness: 2.5, resolution: 6 })
      .setOrigin(0.5, 1).setDepth(GLEB_GORA + 1).setVisible(false);
    h.player.move(0, 0, s.time.now);
    this.panel = new WalkaPanel({
      cios: () => this.przycisk('cios'),
      ruch: () => this.przycisk('ruch'),
      specjalne: () => this.ustawPodmenu(true),
      mocny: () => this.przycisk('mocny'),
      lecz: () => this.lecz(),
      ucieczka: () => this.uciekaj(),
      wroc: () => this.anuluj(),
      koniecTury: () => this.koniecTury(),
    });
    document.body.classList.add('walka-tur');
    void this.rozstaw();
  }

  // ------------------------------------------------------------------ helpers

  private get zywi() {
    return this.u.filter((q) => !q.e.isDead && q.e.active);
  }

  private dist(ax: number, ay: number, bx: number, by: number) {
    return Math.hypot(ax - bx, ay - by);
  }

  /** Free for a figure of radius r at (x, y), not overlapping any living figure except `bez`. */
  private miejsce(x: number, y: number, r: number, bez: WrogWalki | 'hero' | null) {
    if (!this.h.wolne(x, y)) return false;
    const p = this.h.player;
    if (bez !== 'hero' && this.dist(x, y, p.x, p.y) < r + HERO_R + WT.odstepPx) return false;
    for (const q of this.zywi) {
      if (q.e === bez) continue;
      if (this.dist(x, y, q.e.x, q.e.y) < r + q.r + WT.odstepPx) return false;
    }
    return true;
  }

  private tween(targets: object, props: Record<string, unknown>, ms: number) {
    return new Promise<void>((done) => {
      this.h.scene.tweens.add({ targets, ...props, duration: ms, onComplete: () => done() });
    });
  }

  private czekaj(ms: number) {
    return new Promise<void>((done) => this.h.scene.time.delayedCall(ms, () => done()));
  }

  /** Turns an enemy figure towards a point (the artist's sheets: rows down/side/up, side looks left). */
  private patrz(e: WrogWalki, dx: number, dy: number, idzie = false) {
    if (e.ownLook) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    const person = e.hd || e.kindId === 'bandyta' || e.kindId === 'wojownik';
    if (!person) return;
    e.setFlipX(dir === 'side' && dx > 0);
    if (idzie) e.anims.play(`${e.walkAnim}-${dir}`, true);
    else {
      e.anims.stop();
      e.setFrame(`${dir}-0`);
    }
  }

  /** Walks a figure along a way (points), with its walk animation. */
  private async idz(kto: WrogWalki | Player, pts: { x: number; y: number }[]) {
    const p = this.h.player;
    const now = this.h.scene.time.now;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = this.dist(a.x, a.y, b.x, b.y);
      if (len < 0.5) continue;
      if (kto === p) p.move((b.x - a.x) / len, (b.y - a.y) / len, now);
      else this.patrz(kto as WrogWalki, b.x - a.x, b.y - a.y, true);
      await this.tween(kto, { x: b.x, y: b.y }, Math.max(80, (len / W) * 170));
      if (kto !== p) (kto as WrogWalki).setDepth(b.y + (kto as WrogWalki).depthOff);
      else p.setDepth(p.y);
    }
    if (kto === p) p.move(0, 0, this.h.scene.time.now);
  }

  private prosto(r: number, bez: WrogWalki | 'hero') {
    return (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const d = this.dist(a.x, a.y, b.x, b.y);
      for (let s = 0; s <= d; s += 2) if (!this.miejsce(a.x + ((b.x - a.x) * s) / Math.max(d, 1e-6), a.y + ((b.y - a.y) * s) / Math.max(d, 1e-6), r, bez)) return false;
      return true;
    };
  }

  // ------------------------------------------------------------------ set-up

  private async rozstaw() {
    const p = this.h.player;
    const zywi = this.zywi;
    const cx = zywi.reduce((s, q) => s + q.e.x, 0) / zywi.length;
    const cy = zywi.reduce((s, q) => s + q.e.y, 0) / zywi.length;
    let dx = cx - p.x, dy = cy - p.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    if (dl < 1) [dx, dy] = [0, -1];
    const px = -dy, py = dx;
    const R = WT.rozstaw;
    const grupy: Record<RolaWWalce, Uczestnik[]> = { wrecz: [], dystans: [], szef: [] };
    for (const q of zywi) grupy[q.rola].push(q);
    // Who stands where: melee in a shallow arc, ranged further back on the sides, the boss in the middle at the back.
    const chcialby = new Map<Uczestnik, { x: number; y: number }>();
    const linia = (lista: Uczestnik[], odl: number, przesun = 0) => {
      const n = lista.length;
      lista.forEach((q, i) => {
        const o = (i - (n - 1) / 2) * R.bokW * W + przesun;
        const lift = Math.abs(o) * 0.18; // the arc bends back at its ends
        chcialby.set(q, { x: p.x + dx * (odl - lift) + px * o, y: p.y + dy * (odl - lift) + py * o });
      });
    };
    linia(grupy.wrecz, R.wreczW * W);
    linia(grupy.szef, R.szefW * W);
    if (grupy.szef.length && grupy.dystans.length) {
      // Ranged on both sides of the boss.
      grupy.dystans.forEach((q, i) => {
        const side = i % 2 ? -1 : 1;
        const o = side * (Math.floor(i / 2) + 1) * R.bokW * W * 1.1;
        chcialby.set(q, { x: p.x + dx * R.dystansW * W + px * o, y: p.y + dy * R.dystansW * W + py * o });
      });
    } else linia(grupy.dystans, R.dystansW * W);

    // Reserve every spot first (reachable along the map from where each one stands), then walk there.
    const zajete: { x: number; y: number; r: number }[] = [];
    const krok = WT.kratkaPx;
    const ruchy: Promise<void>[] = [];
    const wolneDla = (q: Uczestnik) => (x: number, y: number) => {
      if (!this.h.wolne(x, y)) return false;
      if (this.dist(x, y, p.x, p.y) < q.r + HERO_R + WT.odstepPx) return false;
      return true;
    };
    for (const q of [...grupy.wrecz, ...grupy.szef, ...grupy.dystans]) {
      const want = chcialby.get(q)!;
      const z = zasieg(q.e.x, q.e.y, 9 * W, krok, wolneDla(q));
      let best: string | null = null;
      let bd = Infinity;
      for (const [k, c] of z) {
        if (zajete.some((o) => this.dist(c.x, c.y, o.x, o.y) < q.r + o.r + WT.odstepPx * 2)) continue;
        // Not standing right on the hero's doorstep: the line keeps a little room.
        if (this.dist(c.x, c.y, p.x, p.y) < q.r + HERO_R + 0.9 * W) continue;
        const d = this.dist(c.x, c.y, want.x, want.y) + c.d * 0.05;
        if (d < bd) [best, bd] = [k, d];
      }
      const cel = best ? z.get(best)! : { x: q.e.x, y: q.e.y };
      zajete.push({ x: cel.x, y: cel.y, r: q.r });
      if (best) ruchy.push(this.idz(q.e, uprosc(droga(z, best), (a, b) => {
        const d = this.dist(a.x, a.y, b.x, b.y);
        for (let s = 0; s <= d; s += 2) if (!this.h.wolne(a.x + ((b.x - a.x) * s) / Math.max(d, 1e-6), a.y + ((b.y - a.y) * s) / Math.max(d, 1e-6))) return false;
        return true;
      })).then(() => this.patrz(q.e, p.x - q.e.x, p.y - q.e.y)));
    }
    for (const q of zywi) {
      q.e.vel.set(0, 0);
      q.e.chasing = false;
    }
    p.face(dx, dy);
    this.kadruj(true);
    await Promise.all(ruchy);
    this.nowaTuraGracza();
  }

  /** Frames the fight: everyone in view above the panel, one zoom step closer when they fit. */
  private kadruj(zoom = false) {
    const cam = this.h.scene.cameras.main;
    const p = this.h.player;
    const pts = [{ x: p.x, y: p.y }, ...this.zywi.map((q) => ({ x: q.e.x, y: q.e.y }))];
    const x0 = Math.min(...pts.map((q) => q.x)) - W, x1 = Math.max(...pts.map((q) => q.x)) + W;
    const y0 = Math.min(...pts.map((q) => q.y)) - 1.6 * W, y1 = Math.max(...pts.map((q) => q.y)) + W;
    const zw = this.h.zoomZwykly();
    cam.stopFollow();
    let z = cam.zoom;
    if (zoom) {
      // CSS px of the view; the panel covers the bottom.
      const fit = (zz: number) => (x1 - x0) * zz / OSTROSC < cam.width / OSTROSC - 24 && (y1 - y0) * zz / OSTROSC < cam.height / OSTROSC - WT.panelPx - 90;
      z = fit(zw + OSTROSC) ? zw + OSTROSC : zw;
      cam.zoomTo(z, 350);
    }
    // The panel takes the bottom: centre the fight in the part above it.
    const shift = (WT.panelPx / 2 - 30) * OSTROSC / z;
    cam.pan((x0 + x1) / 2, (y0 + y1) / 2 + shift, 350, 'Sine.easeInOut');
  }

  // ------------------------------------------------------------------ turns

  private tura = 0;

  private nowaTuraGracza() {
    if (!this.aktywna) return;
    if (this.tura++ > 0) this.kadruj();
    const lvl = this.h.poziom();
    let n = 0;
    for (const [od, ile] of WT.ruchy) if (lvl >= od) n = ile;
    if (this.h.wyspany()) n += WT.hotel.ruchow;
    this.maxRuchy = n;
    this.ruchy = n;
    this.faza = 'gracz';
    if (Math.random() < WT.szczescie.dodatkowyRuch * this.szczescie()) {
      this.ruchy++;
      this.maxRuchy++;
      this.koniczynka('+1 ruch');
    }
    this.tryb = null;
    this.punkt = null;
    this.ustawPodmenu(false);
    if (this.cel && (this.cel.e.isDead || !this.cel.e.active)) this.cel = null;
    this.podpowiedz = this.cel ? '' : 'Dotknij przeciwnika na mapie, żeby go wybrać.';
    this.przelicz();
  }

  private szczescie() {
    return this.h.wyspany() ? WT.hotel.szczescieRazy : 1;
  }

  private koniczynka(co: string) {
    const p = this.h.player;
    this.h.napis(p.x, p.y - 1.2 * W, `☘ ${co}`, '#7dffa0', 1100);
  }

  /** The hero's reachable cells for the current moves (one Ruch). */
  private przelicz() {
    const p = this.h.player;
    this.zas = zasieg(p.x, p.y, WT.ruchW * W, WT.kratkaPx, (x, y) => this.miejsce(x, y, HERO_R, 'hero'));
    this.odswiez();
  }

  private koniecTury() {
    if (this.faza !== 'gracz' || this.busy) return;
    void this.turaWrogow();
  }

  private async turaWrogow() {
    this.faza = 'wrogowie';
    this.tryb = null;
    this.punkt = null;
    this.ustawPodmenu(false);
    this.podpowiedz = '';
    this.odswiez();
    const p = this.h.player;
    await this.czekaj(250);
    const kolej = [...this.zywi].sort((a, b) => this.dist(a.e.x, a.e.y, p.x, p.y) - this.dist(b.e.x, b.e.y, p.x, p.y));
    // At most two melee attackers (those already in reach first), and a limited volley of shots.
    const wZasiegu = (q: Uczestnik) => this.dist(q.e.x, q.e.y, p.x, p.y) <= q.e.size + HERO_R + 0.35 * W && this.h.widac(q.e.x, q.e.y, p.x, p.y);
    const wrecz = kolej.filter((q) => q.rola !== 'dystans');
    const natarcie = new Set([...wrecz.filter(wZasiegu), ...wrecz.filter((q) => !wZasiegu(q))].slice(0, WT.wrog.natarcieWrecz));
    let salwa = WT.wrog.salwa;
    for (const q of kolej) {
      if (!this.aktywna) return;
      if (q.e.isDead || !q.e.active) continue;
      if (q.oglusz) {
        q.oglusz = false;
        this.h.napis(q.e.x, q.e.y - 1.1 * W, '💫', '#ffe08a', 700);
        await this.czekaj(300);
        continue;
      }
      if (q.rola === 'dystans') {
        const d = this.dist(q.e.x, q.e.y, p.x, p.y);
        if (salwa > 0 && d <= WT.wrog.strzalW * W && this.h.widac(q.e.x, q.e.y, p.x, p.y)) {
          salwa--;
          if (await this.strzalWroga(q)) return;
        } else await this.podejdzWrog(q, 'dystans');
        continue;
      }
      if (natarcie.has(q)) {
        if (wZasiegu(q)) {
          if (await this.ciosWroga(q)) return;
        } else await this.podejdzWrog(q, 'natarcie');
      } else await this.podejdzWrog(q, 'czeka');
    }
    await this.czekaj(150);
    if (this.aktywna) this.nowaTuraGracza();
  }

  /** One enemy walks: up to the hero (natarcie), to a waiting ring (czeka), or into shooting range (dystans). */
  private async podejdzWrog(q: Uczestnik, cel: 'natarcie' | 'czeka' | 'dystans') {
    const p = this.h.player;
    const z = zasieg(q.e.x, q.e.y, WT.wrog.ruchW * W, WT.kratkaPx, (x, y) => this.miejsce(x, y, q.r, q.e));
    const reach = q.e.size + HERO_R + 0.35 * W;
    let best: string | null = null;
    let bd = Infinity;
    for (const [k, c] of z) {
      const d = this.dist(c.x, c.y, p.x, p.y);
      let score: number;
      if (cel === 'natarcie') score = d <= reach && this.h.widac(c.x, c.y, p.x, p.y) ? c.d * 0.01 : d;
      else if (cel === 'czeka') score = Math.abs(d - 2.3 * W) + c.d * 0.02;
      else {
        const lepiej = d <= (WT.wrog.strzalW - 1) * W && this.h.widac(c.x, c.y, p.x, p.y);
        score = (lepiej ? 0 : 1000) + Math.abs(d - 4.5 * W) + c.d * 0.02;
      }
      if (score < bd) [best, bd] = [k, score];
    }
    if (!best || best === '0,0') {
      this.patrz(q.e, p.x - q.e.x, p.y - q.e.y);
      return;
    }
    await this.idz(q.e, uprosc(droga(z, best), this.prosto(q.r, q.e)));
    this.patrz(q.e, p.x - q.e.x, p.y - q.e.y);
  }

  /** A melee blow at the hero; true if the fight ended. */
  private async ciosWroga(q: Uczestnik) {
    const p = this.h.player;
    const e = q.e;
    this.patrz(e, p.x - e.x, p.y - e.y);
    const sx = e.x, sy = e.y;
    const k = 0.35;
    await this.tween(e, { x: sx + (p.x - sx) * k, y: sy + (p.y - sy) * k }, 120);
    const koniec = this.trafBohatera(q);
    await this.tween(e, { x: sx, y: sy }, 160);
    await this.czekaj(140);
    return koniec;
  }

  private async strzalWroga(q: Uczestnik) {
    const p = this.h.player;
    const e = q.e;
    this.patrz(e, p.x - e.x, p.y - e.y);
    const s = this.h.scene;
    const tex = e.kindId === 'wodnik' ? TEX.magicShot : TEX.arrowShot;
    const pocisk = s.add.image(e.x, e.y - 0.4 * W, tex).setDepth(GLEB_GORA).setRotation(Math.atan2(p.y - e.y, p.x - e.x));
    if (e.kindId === 'wodnik') pocisk.setTint(0x7fd4ff);
    await this.tween(pocisk, { x: p.x, y: p.y - 0.4 * W }, Math.max(160, this.dist(e.x, e.y, p.x, p.y) * 4));
    pocisk.destroy();
    const koniec = this.trafBohatera(q);
    await this.czekaj(220);
    return koniec;
  }

  /** Does an enemy's attack land? Luck, armour, then damage (fractions add up). True if the fight ended. */
  private trafBohatera(q: Uczestnik) {
    const p = this.h.player;
    if (Math.random() < WT.szczescie.unik * this.szczescie()) {
      this.koniczynka('Unik!');
      return false;
    }
    if (Math.random() >= WT.wrog.trafienie) {
      this.h.pudlo(p.x, p.y - 0.3 * W);
      return false;
    }
    if (q.e.duel) {
      // A duel's purple hearts are counted by the game (GameScene).
      this.h.napis(p.x, p.y - 1.1 * W, '−💜', '#d9a0ff', 800);
      const end = this.h.ranBohatera(q.e, 0);
      this.odswiez();
      if (end) this.zakoncz('przerwana');
      return end;
    }
    if (Math.random() < blockChance()) {
      this.h.napis(p.x, p.y - 1.1 * W, '🛡 Blok', '#cfe6ff', 800);
      return false;
    }
    const pending = this.carry + q.e.kind.damage * (q.e.power ?? 1) * session.level.obrazenia * WT.wrog.obrazenia;
    const dmg = Math.floor(pending);
    this.carry = pending - dmg;
    if (dmg <= 0) {
      this.h.napis(p.x, p.y - 1.1 * W, 'draśnięcie', '#ffd0c0', 700);
      return false;
    }
    this.h.scene.cameras.main.shake(110, 0.003);
    p.setTint(0xff6a6a);
    this.h.scene.time.delayedCall(140, () => p.clearTint());
    this.h.napis(p.x, p.y - 1.1 * W, `−${dmg % 2 ? (dmg / 2).toFixed(1) : dmg / 2} ♥`, '#ff8a8a', 900);
    const end = this.h.ranBohatera(q.e, dmg);
    this.odswiez();
    if (end) {
      this.zakoncz(p.hp <= 0 ? 'smierc' : 'przerwana');
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ the hero's actions

  private przycisk(t: Exclude<Tryb, null>) {
    if (this.faza !== 'gracz' || this.busy) return;
    if (t === 'ruch') {
      if (this.tryb === 'ruch' && this.punkt) return void this.wykonajRuch();
      this.tryb = 'ruch';
      this.punkt = null;
      this.podpowiedz = this.ruchy < WT.koszt.ruch ? 'Brak ruchów – zakończ turę.' : 'Wskaż miejsce w podświetlonym zasięgu.';
      this.odswiez();
      return;
    }
    if (this.tryb === t && this.cel) return void this.wykonajCios(t === 'mocny');
    this.tryb = t;
    this.punkt = null;
    if (t === 'mocny') this.ustawPodmenu(false);
    if (this.cel) {
      this.podpowiedz = this.opisCiosu(this.cel, t === 'mocny').tekst + ' – dotknij jeszcze raz, żeby zatwierdzić.';
      this.odswiez();
      return;
    }
    this.podpowiedz = 'Wskaż postać na mapie.';
    this.odswiez();
  }

  private anuluj() {
    if (this.podmenu) {
      this.ustawPodmenu(false);
      if (this.tryb === 'mocny') this.tryb = null;
    } else {
      this.tryb = null;
      this.punkt = null;
    }
    this.podpowiedz = '';
    this.odswiez();
  }

  private ustawPodmenu(on: boolean) {
    if (on && (this.faza !== 'gracz' || this.busy)) return;
    this.podmenu = on;
    if (on) this.podpowiedz = 'Mocny cios, leczenie albo ucieczka.';
    this.odswiez();
  }

  /** Weapon in hand decides the attack: sword (melee with a short hop) or a shot (bow/wand). */
  private broni() {
    return rangedWeapon();
  }

  /** Where the hero would strike from (a cell within the short hop) and the cost, or why not. */
  private planCiosu(q: Uczestnik, mocny: boolean): { ok: boolean; z?: { x: number; y: number; k: string } | null; tekst: string } {
    const p = this.h.player;
    const koszt = mocny ? WT.koszt.mocny : WT.koszt.cios;
    const bron = this.broni();
    if (bron) {
      const d = this.dist(p.x, p.y, q.e.x, q.e.y);
      if (d > WT.strzalW * W) return { ok: false, tekst: 'Za daleko na strzał – podejdź bliżej' };
      if (!this.h.widac(p.x, p.y, q.e.x, q.e.y)) return { ok: false, tekst: 'Coś zasłania cel' };
      const ammo = ammoOf(bron);
      if (ammo && (gear.ammo[ammo] ?? 0) <= 0) return { ok: false, tekst: `Brak: ${AMUNICJA[ammo].nazwa.toLowerCase()}` };
      return { ok: this.ruchy >= koszt, z: null, tekst: `${bron.rodzaj === 'magia' ? 'Czar' : 'Strzał'}${mocny ? ' mocny' : ''} · ${koszt} ${koszt === 1 ? 'ruch' : 'ruchy'}` };
    }
    const reach = PLAYER.attackReach + PLAYER.attackRadius + q.e.size;
    const etykieta = `${mocny ? 'Mocny cios' : 'Cios'} · ${koszt} ${koszt === 1 ? 'ruch' : 'ruchy'}`;
    if (this.dist(p.x, p.y, q.e.x, q.e.y) <= reach && this.h.widac(p.x, p.y, q.e.x, q.e.y)) return { ok: this.ruchy >= koszt, z: null, tekst: etykieta };
    // A short hop: the nearest cell within WT.doskokW from which the target is in reach (no blows through walls).
    const z = this.zas;
    let best: string | null = null;
    let bd = Infinity;
    if (z) for (const [k, c] of z) {
      if (c.d > WT.doskokW * W) continue;
      if (this.dist(c.x, c.y, q.e.x, q.e.y) > reach - 2 || !this.h.widac(c.x, c.y, q.e.x, q.e.y)) continue;
      if (c.d < bd) [best, bd] = [k, c.d];
    }
    if (!best) return { ok: false, tekst: 'Podejdź bliżej (Ruch)' };
    const c = z!.get(best)!;
    return { ok: this.ruchy >= koszt, z: { x: c.x, y: c.y, k: best }, tekst: etykieta };
  }

  private opisCiosu(q: Uczestnik, mocny: boolean) {
    return this.planCiosu(q, mocny);
  }

  private async wykonajCios(mocny: boolean) {
    const q = this.cel;
    if (!q || this.busy) return;
    const plan = this.planCiosu(q, mocny);
    if (!plan.ok) {
      this.podpowiedz = this.ruchy < (mocny ? WT.koszt.mocny : WT.koszt.cios) ? 'Za mało ruchów.' : plan.tekst;
      this.odswiez();
      return;
    }
    this.busy = true;
    this.ruchy -= mocny ? WT.koszt.mocny : WT.koszt.cios;
    this.odswiez();
    const p = this.h.player;
    const bron = this.broni();
    if (bron) await this.strzal(q, bron, mocny);
    else {
      const start = { x: p.x, y: p.y };
      if (plan.z && this.zas) await this.idz(p, uprosc(droga(this.zas, plan.z.k), this.prosto(HERO_R, 'hero')));
      p.face(q.e.x - p.x, q.e.y - (p.y + 2));
      const aim = Math.atan2(q.e.y - (p.y + 2), q.e.x - p.x);
      this.h.zamach(aim, mocny);
      // A small lunge with the blow.
      const sx = p.x, sy = p.y;
      await this.tween(p, { x: sx + Math.cos(aim) * 3, y: sy + Math.sin(aim) * 3 }, 90);
      this.rozstrzygnijCios(q, mocny);
      await this.tween(p, { x: sx, y: sy }, 90);
      if (plan.z) await this.idz(p, [{ x: p.x, y: p.y }, start]);
    }
    this.busy = false;
    this.po();
  }

  private rozstrzygnijCios(q: Uczestnik, mocny: boolean) {
    const p = this.h.player;
    const e = q.e;
    const now = this.h.scene.time.now;
    this.h.cwiczenie('miecz', WT.cwiczenie);
    if (Math.random() >= hitChance('miecz', mocny, session.level.celnosc + gearAimBonus())) {
      this.h.pudlo(e.x, e.y - 4 * e.kind.scale);
      return;
    }
    let dmg = meleeDamage() * (mocny ? strongFactor('miecz') : 1) * this.h.wzmocnienie(e);
    if (Math.random() < WT.szczescie.krytyk * this.szczescie()) {
      dmg *= WT.szczescie.krytykMnoznik;
      this.koniczynka('Krytyk!');
    }
    this.h.zuzyj(gear.equip.bron);
    this.trafWroga(q, dmg, new Phaser.Math.Vector2(p.x, p.y), now, mocny);
  }

  private async strzal(q: Uczestnik, bron: NonNullable<ReturnType<typeof rangedWeapon>>, mocny: boolean) {
    const p = this.h.player;
    const e = q.e;
    const skill = bron.rodzaj === 'magia' ? 'magia' : 'luk';
    const ammo = ammoOf(bron);
    if (ammo && !takeAmmo(ammo)) return;
    if (ammo) this.h.zuzyj(bron.id);
    p.face(e.x - p.x, e.y - p.y);
    const pocisk = this.h.scene.add.image(p.x, p.y, skill === 'magia' ? TEX.magicShot : TEX.arrowShot)
      .setRotation(Math.atan2(e.y - p.y, e.x - p.x)).setDepth(GLEB_GORA);
    if (mocny) pocisk.setScale(1.5).setTint(0xffd84a);
    await this.tween(pocisk, { x: e.x, y: e.y }, Math.max(140, this.dist(p.x, p.y, e.x, e.y) * 3));
    pocisk.destroy();
    this.h.cwiczenie(skill, WT.cwiczenie);
    if (Math.random() >= hitChance(skill, mocny, session.level.celnosc + gearAimBonus())) {
      this.h.pudlo(e.x, e.y - 4 * e.kind.scale);
      return;
    }
    const now = this.h.scene.time.now;
    const natychmiast = skill === 'luk' && !WALKA.bezNatychmiast.includes(e.kindId) && !e.duel && Math.random() < instaKillChance();
    let dmg = natychmiast ? e.hp : shotDamage(bron) * (mocny ? strongFactor(skill) : 1) * this.h.wzmocnienie(e);
    if (!natychmiast && Math.random() < WT.szczescie.krytyk * this.szczescie()) {
      dmg *= WT.szczescie.krytykMnoznik;
      this.koniczynka('Krytyk!');
    }
    this.trafWroga(q, dmg, new Phaser.Math.Vector2(p.x, p.y), now, mocny);
  }

  private trafWroga(q: Uczestnik, dmg: number, from: Phaser.Math.Vector2, now: number, mocny: boolean) {
    const e = q.e;
    const x = e.x, y = e.y;
    const zabity = e.hit(from, now, dmg);
    // No knock-back in turns: everyone keeps their spot.
    e.vel.set(0, 0);
    e.setPosition(x, y);
    this.h.napis(x, y - 1.2 * W * e.kind.scale, `−${Math.round(dmg * 10) / 10}`, '#ffe3a0', 800);
    if (zabity) {
      if (this.cel === q) this.cel = null;
      this.h.zabity(e);
      return;
    }
    this.h.nasycenie(e, now);
    if (mocny && e.kindId !== 'smok') q.oglusz = true;
  }

  private async wykonajRuch() {
    const pt = this.punkt;
    if (!pt || !this.zas || this.busy) return;
    if (this.ruchy < WT.koszt.ruch) {
      this.podpowiedz = 'Za mało ruchów.';
      this.odswiez();
      return;
    }
    this.busy = true;
    this.ruchy -= WT.koszt.ruch;
    this.punkt = null;
    this.odswiez();
    await this.idz(this.h.player, uprosc(droga(this.zas, pt.k), this.prosto(HERO_R, 'hero')));
    this.busy = false;
    this.tryb = this.cel ? 'cios' : null;
    this.po();
  }

  private lecz() {
    if (this.faza !== 'gracz' || this.busy) return;
    if (this.ruchy < WT.koszt.lecz) {
      this.podpowiedz = 'Za mało ruchów.';
      return this.odswiez();
    }
    if (this.h.player.hp >= PLAYER.maxHp) {
      this.podpowiedz = 'Masz pełne życie.';
      return this.odswiez();
    }
    if (!this.h.lecz()) {
      this.podpowiedz = 'Nie masz czym się leczyć (mikstura, owoce, jedzenie).';
      return this.odswiez();
    }
    this.ruchy -= WT.koszt.lecz;
    this.ustawPodmenu(false);
    this.podpowiedz = '';
    this.po();
  }

  private uciekaj() {
    if (this.faza !== 'gracz' || this.busy) return;
    const p = this.h.player;
    p.hp = Math.max(1, p.hp - WT.ucieczkaPolowek);
    this.h.toast(`🏃 ${SPOTKANIA.ucieczka}`, 2500);
    // They rest: back to full life.
    for (const q of this.zywi) q.e.hp = Math.max(q.e.hp, q.hp0);
    this.zakoncz('ucieczka');
  }

  /** After an action: won? out of moves? */
  private po() {
    if (!this.aktywna) return;
    if (!this.zywi.length) return this.zakoncz('wygrana');
    this.przelicz();
    if (this.ruchy <= 0) {
      this.podpowiedz = '';
      this.odswiez();
      this.h.scene.time.delayedCall(350, () => {
        if (this.aktywna && this.faza === 'gracz' && !this.busy) void this.turaWrogow();
      });
    }
  }

  // ------------------------------------------------------------------ taps on the map

  /** A tap on the map (world px); `promien` = the finger's area in world px. */
  tap(x: number, y: number, promien: number) {
    if (!this.aktywna || this.faza !== 'gracz' || this.busy) return;
    // The nearest figure whose tap area holds the point (one point = at most one candidate).
    let kto: Uczestnik | null = null;
    let bd = Infinity;
    for (const q of this.zywi) {
      if (!q.e.visible) continue;
      // Body centre is above the feet.
      const d = Math.min(this.dist(x, y, q.e.x, q.e.y - 0.4 * W * q.e.kind.scale), this.dist(x, y, q.e.x, q.e.y));
      if (d < Math.max(promien, q.r + 4) && d < bd) [kto, bd] = [q, d];
    }
    if (kto) {
      const again = this.cel === kto && (this.tryb === 'cios' || this.tryb === 'mocny');
      this.cel = kto;
      this.punkt = null;
      if (again) return void this.wykonajCios(this.tryb === 'mocny');
      if (this.tryb !== 'mocny') this.tryb = 'cios';
      const plan = this.planCiosu(kto, this.tryb === 'mocny');
      this.podpowiedz = plan.ok ? `${plan.tekst} – dotknij celu jeszcze raz albo „${this.tryb === 'mocny' ? 'Mocny' : this.broni() ? (this.broni()!.rodzaj === 'magia' ? 'Czar' : 'Strzał') : 'Cios'}”.` : plan.tekst;
      this.odswiez();
      return;
    }
    if (this.tryb === 'ruch' && this.zas) {
      const k = najblizsza(this.zas, x, y, Math.max(6, promien * 0.5));
      if (!k || k === '0,0') {
        this.podpowiedz = 'Brak przejścia albo za daleko.';
        this.h.napis(x, y, '✕', '#ff9a9a', 600);
        this.odswiez();
        return;
      }
      const c = this.zas.get(k)!;
      if (this.punkt && this.dist(this.punkt.x, this.punkt.y, c.x, c.y) < Math.max(6, promien * 0.5)) return void this.wykonajRuch();
      this.punkt = { k, x: c.x, y: c.y };
      this.podpowiedz = 'Ruch · 1 ruch – dotknij jeszcze raz albo „Ruch”.';
      this.odswiez();
      return;
    }
    // A tap on empty ground clears the preview, never spends anything.
    if (this.cel || this.punkt) {
      this.cel = null;
      this.punkt = null;
      this.podpowiedz = '';
      this.odswiez();
    }
  }

  // ------------------------------------------------------------------ drawing

  /** Called every frame while the fight is on. */
  update() {
    if (!this.aktywna) return;
    this.rysuj();
  }

  private odswiez() {
    if (!this.aktywna) return;
    const p = this.h.player;
    const st: StanPanelu = {
      hp: p.hp,
      maxHp: PLAYER.maxHp,
      extra: p.extra,
      ruchy: this.ruchy,
      maxRuchy: this.maxRuchy,
      tura: this.faza === 'gracz' ? 'gracz' : this.faza === 'wrogowie' ? 'wrogowie' : 'rozstaw',
      tryb: this.tryb,
      podmenu: this.podmenu,
      podpowiedz: this.podpowiedz,
      bron: this.broni()?.rodzaj ?? null,
      bronId: gear.equip.bron ?? null,
      celOk: !!this.cel && this.planCiosu(this.cel, this.tryb === 'mocny').ok,
      punkt: !!this.punkt,
      busy: this.busy,
      koszt: WT.koszt,
    };
    this.panel.ustaw(st);
    this.rysuj();
  }

  private rysuj() {
    const g = this.gfx, t = this.gfxTop;
    g.clear();
    t.clear();
    const p = this.h.player;
    const feet = (y: number) => y + 5;
    // The hero's ring.
    g.lineStyle(1.2, 0x7fe0ff, 0.95).strokeEllipse(p.x, feet(p.y), HERO_R * 2 + 4, HERO_R + 3);
    // Reachable ground for a move.
    if (this.faza === 'gracz' && this.tryb === 'ruch' && this.zas && this.ruchy >= WT.koszt.ruch) {
      g.fillStyle(0x59c8ff, 0.18);
      const k = WT.kratkaPx;
      for (const c of this.zas.values()) g.fillRect(c.x - k / 2, feet(c.y) - k / 2, k, k);
      if (this.punkt) {
        const pts = droga(this.zas, this.punkt.k);
        g.fillStyle(0xbfeaff, 0.9);
        pts.forEach((q, i) => i % 2 === 0 && g.fillCircle(q.x, feet(q.y), 0.9));
        g.lineStyle(1.2, 0xbfeaff, 1).strokeEllipse(this.punkt.x, feet(this.punkt.y), HERO_R * 2 + 4, HERO_R + 3);
      }
    }
    for (const q of this.zywi) {
      const e = q.e;
      const sel = q === this.cel;
      g.lineStyle(sel ? 1.6 : 1, sel ? 0xffd34a : 0xff6a5a, sel ? 1 : 0.7).strokeEllipse(e.x, feet(e.y), q.r * 2 + 4, q.r + 3);
      // A small life bar over each, bigger over the chosen one.
      const w = sel ? 14 : 9;
      const top = e.y - (e.hd ? 20 * 0.66 : 9) * e.kind.scale - 3;
      const part = Math.max(0, e.hp) / Math.max(e.hp, q.hp0, 1);
      t.fillStyle(0x1e1a24, 0.9).fillRect(e.x - w / 2 - 0.5, top - 0.5, w + 1, sel ? 2.6 : 2);
      t.fillStyle(sel ? 0xff5a4a : 0xc23a30, 1).fillRect(e.x - w / 2, top, w * Math.min(1, part), sel ? 1.6 : 1);
      if (q.oglusz) t.fillStyle(0xffe08a, 1).fillCircle(e.x + w / 2 + 2, top + 0.5, 1);
    }
    // The chosen target: the short way of the hop and the label with the cost.
    const c = this.cel;
    if (c && this.faza === 'gracz') {
      const plan = this.planCiosu(c, this.tryb === 'mocny');
      if (plan.z && this.zas) {
        g.fillStyle(0xffe08a, 0.95);
        for (const q of droga(this.zas, plan.z.k)) g.fillCircle(q.x, feet(q.y), 0.8);
      }
      this.etykieta.setText(plan.tekst).setPosition(c.e.x, c.e.y - 22 * 0.66 * c.e.kind.scale - 4).setVisible(true).setColor(plan.ok ? '#fff4d0' : '#ffb0a0');
    } else this.etykieta.setVisible(false);
  }

  // ------------------------------------------------------------------ the end

  zakoncz(wynik: WynikWalki) {
    if (!this.aktywna) return;
    this.aktywna = false;
    this.faza = 'koniec';
    this.gfx.destroy();
    this.gfxTop.destroy();
    this.etykieta.destroy();
    this.panel.zamknij();
    document.body.classList.remove('walka-tur');
    this.h.player.move(0, 0, this.h.scene.time.now);
    this.h.wrocKamere();
    this.h.koniec(wynik, this.wszyscy);
  }
}

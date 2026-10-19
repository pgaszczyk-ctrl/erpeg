// A dragon in the turn fight (owner, 18 Oct 2026: „walka ze smokiem też ma być turowa”; docs/walka/SMOK_TUROWY.md).
// At the end of its turn the dragon announces its special attack as a red area on the ground; the hero gets a
// turn to step out, strike or take cover (Osłona); at the start of the dragon's next turn the attack lands there.
// Fire and acid leave burning ground and puddles, the poison cloud stays a few turns, a flight makes the dragon
// unhittable and it lands on its shadow, stunned for a turn. Numbers: content/walkaTurowa.ts SMOK_W_TURACH.

import Phaser from 'phaser';
import { SMOK_W_TURACH as S } from '../content/walkaTurowa';
import { GATUNKI_SMOKOW, RYSUNKI_SMOKOW, TRUDNOSC_SMOKOW, type GatunekId } from '../content/smoki';
import { TRUDNOSCI } from '../content/trudnosc';
import { session } from '../quests';
import { W } from './tryb';
import { kluczSmoka, maAnimacje, pokazOdlot } from '../objects/smokRysunki';
import { TEX } from '../art';
import type { Player } from '../objects/Player';
import type { Uczestnik, WrogWalki } from './TuryWalki';

type Specjal = 'ogien' | 'kwas' | 'dym' | 'lot';
export type Ksztalt = { typ: 'kolo'; x: number; y: number; r: number } | { typ: 'stozek'; x: number; y: number; kat: number; dl: number; pol: number };
interface Pole { k: Ksztalt; rodzaj: 'ogien' | 'kaluza' | 'dym'; tur: number; obr: number }
interface Zapowiedz { atak: Specjal; ksztalty: Ksztalt[]; cien?: Phaser.GameObjects.Image }
interface Stan { zap: Zapowiedz | null; odpoczynek: number; ostatni: Specjal | null }

export interface SmokHostTur {
  scene: Phaser.Scene;
  player: Player;
  /** Free for a figure of radius r (not overlapping anyone but `bez`). */
  miejsce(x: number, y: number, r: number, bez: WrogWalki | 'hero' | null): boolean;
  napis(x: number, y: number, t: string, color: string, ms?: number): void;
  czekaj(ms: number): Promise<void>;
  /** The dragon's share of the hero's full life as damage (luck, Osłona, difficulty); true if the fight ended. */
  ran(e: WrogWalki, czesc: number): boolean;
  /** Is the hero within the dragon's bite? */
  wZasiegu(q: Uczestnik): boolean;
  /** One bite (a lunge); true if the fight ended. */
  ugryz(q: Uczestnik, czesc: number): Promise<boolean>;
  /** The dragon walks up to the hero (its own range, W). */
  podejdz(q: Uczestnik, ruchW: number): Promise<void>;
}

const czerwony = 0xff3a2a;

export function wKsztalcie(k: Ksztalt, x: number, y: number) {
  if (k.typ === 'kolo') return Math.hypot(x - k.x, y - k.y) <= k.r;
  const d = Math.hypot(x - k.x, y - k.y);
  if (d > k.dl || d < 1) return d < 1;
  let a = Math.atan2(y - k.y, x - k.x) - k.kat;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return Math.abs(a) <= k.pol;
}

export class SmokWTurach {
  private stany = new Map<Uczestnik, Stan>();
  private pola: Pole[] = [];
  /** Moves the poison takes from the hero's next turn. */
  zatrucie = 0;
  private fx: Phaser.GameObjects.Graphics;

  constructor(private h: SmokHostTur) {
    this.fx = h.scene.add.graphics().setDepth(1_050_000 - 1);
  }

  private stan(q: Uczestnik) {
    let s = this.stany.get(q);
    if (!s) this.stany.set(q, (s = { zap: null, odpoczynek: 0, ostatni: null }));
    return s;
  }

  private gatunek(q: Uczestnik): GatunekId {
    return (q.e as WrogWalki & { gatunek?: GatunekId }).gatunek ?? 'lesny';
  }

  /** The announcement the hero should read at the start of his turn (or ''). */
  tekst() {
    for (const s of this.stany.values()) if (s.zap) return S.zapowiedzi[s.zap.atak];
    return '';
  }

  /** The artist's dragon: an animation by direction (side looks left, mirrored right), when the sheet has it. */
  private graj(q: Uczestnik, akcja: string, vx: number, vy: number) {
    const e = q.e;
    const g = this.gatunek(q);
    const r = RYSUNKI_SMOKOW[g];
    if (!r || !e.ownLook) return;
    const sc = this.h.scene;
    let k = 'bok', lustro = vx > 0;
    if (!(Math.abs(vx) >= Math.abs(vy) * 0.8 || r.tylkoBok || (vy < 0 && r.tylJakBok))) [k, lustro] = [vy > 0 ? 'przod' : 'tyl', false];
    if (!maAnimacje(sc, g, akcja, k)) k = maAnimacje(sc, g, akcja, 'przod') ? 'przod' : 'bok';
    if (!maAnimacje(sc, g, akcja, k)) return;
    e.setFlipX(k === 'bok' && lustro);
    e.anims.play(`${kluczSmoka(g)}-${akcja}_${k}`, true);
  }

  private stoj(q: Uczestnik) {
    const p = this.h.player;
    this.graj(q, 'stoi', p.x - q.e.x, p.y - q.e.y);
  }

  /** The dragon's whole turn; true if the fight ended. */
  async tura(q: Uczestnik): Promise<boolean> {
    const st = this.stan(q);
    const e = q.e;
    if (q.oglusz) {
      q.oglusz = false;
      this.h.napis(e.x, e.y - 1.4 * W, '💫', '#ffe08a', 800);
      await this.h.czekaj(450);
      return false;
    }
    let akcje = S.akcje;
    if (st.zap) {
      const z = st.zap;
      st.zap = null;
      akcje--;
      if (await this.wykonaj(q, z)) return true;
      st.odpoczynek = S.odpoczynek;
      if (z.atak === 'lot') {
        // Landed hard: stunned for its next turn (a chance for strong blows).
        q.oglusz = S.lot.ogluszenieTur > 0;
        this.h.napis(e.x, e.y - 1.6 * W, S.napisy.ogluszony, '#ffe08a', 1200);
        return false;
      }
    }
    const p = this.h.player;
    let ugryzl = false;
    while (akcje > 0 && e.active && !e.isDead) {
      akcje--;
      // At most one bite a turn; the other action only brings it closer.
      if (this.h.wZasiegu(q)) {
        if (ugryzl) break;
        ugryzl = true;
        this.graj(q, 'ugryzienie', p.x - e.x, p.y - e.y);
        if (await this.h.ugryz(q, S.ugryzienie.obrazenia)) return true;
      } else {
        this.graj(q, 'idzie', p.x - e.x, p.y - e.y);
        await this.h.podejdz(q, S.ruchW);
      }
      this.stoj(q);
    }
    if (st.odpoczynek > 0) st.odpoczynek--;
    else {
      const a = this.wybierz(q, st);
      if (a) await this.zapowiedz(q, st, a);
    }
    return false;
  }

  /** A weighted special of the species (the story dragon by phases), not the same twice in a row. */
  private wybierz(q: Uczestnik, st: Stan): Specjal | null {
    const G = GATUNKI_SMOKOW[this.gatunek(q)];
    let ataki = G.ataki;
    const czesc = q.e.hp / Math.max(1, q.hp0);
    for (const f of G.fazy ?? []) if (czesc <= f.odZycia) ataki = f.ataki;
    const lista = (Object.entries(ataki) as [Specjal, number][]).filter(([, w]) => w > 0);
    if (!lista.length) return null;
    const bez = lista.length > 1 ? lista.filter(([a]) => a !== st.ostatni) : lista;
    let r = Math.random() * bez.reduce((s, [, w]) => s + w, 0);
    for (const [a, w] of bez) if ((r -= w) <= 0) return a;
    return bez[bez.length - 1][0];
  }

  private poziom() {
    return Math.max(0, TRUDNOSCI.indexOf(session.level));
  }

  private async zapowiedz(q: Uczestnik, st: Stan, atak: Specjal) {
    const e = q.e, p = this.h.player;
    const kat = Math.atan2(p.y - e.y, p.x - e.x);
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const ksztalty: Ksztalt[] = [];
    if (atak === 'ogien') {
      ksztalty.push({ typ: 'stozek', x: e.x, y: e.y, kat, dl: S.ogien.dlugoscW * W + q.r, pol: (S.ogien.polkat * Math.PI) / 180 });
      this.graj(q, 'ziej', p.x - e.x, p.y - e.y);
      e.anims.pause();
    } else if (atak === 'kwas') {
      const n = 1 + (TRUDNOSC_SMOKOW.kulKwasu[this.poziom()] ?? 1);
      const r = S.kwas.promienW * W;
      ksztalty.push({ typ: 'kolo', x: p.x, y: p.y, r });
      for (let i = 1, proby = 0; i < n && proby < 40; proby++) {
        const a = Math.random() * Math.PI * 2, o = r * 1.2 + Math.random() * S.kwas.rozrzutW * W;
        const x = p.x + Math.cos(a) * o, y = p.y + Math.sin(a) * o;
        if (ksztalty.some((k) => k.typ === 'kolo' && Math.hypot(k.x - x, k.y - y) < r * 1.5)) continue;
        ksztalty.push({ typ: 'kolo', x, y, r });
        i++;
      }
      this.graj(q, 'pluj', p.x - e.x, p.y - e.y);
      e.anims.pause();
    } else if (atak === 'dym') {
      const o = Math.min(d, S.dym.odSmokaW * W + S.dym.promienW * W * 0.4);
      ksztalty.push({ typ: 'kolo', x: e.x + Math.cos(kat) * o, y: e.y + Math.sin(kat) * o, r: S.dym.promienW * W });
      this.graj(q, 'dmuch', p.x - e.x, p.y - e.y);
      e.anims.pause();
    } else {
      ksztalty.push({ typ: 'kolo', x: p.x, y: p.y, r: S.lot.promienW * W });
    }
    const z: Zapowiedz = { atak, ksztalty };
    st.zap = z;
    st.ostatni = atak;
    this.h.napis(e.x, e.y - 1.6 * W, '❗', '#ff7a6a', 900);
    if (atak === 'lot') {
      // Up into the sky: unhittable until it lands; its shadow circles over the spot.
      const sc = this.h.scene;
      if (e.ownLook) pokazOdlot(sc, e, this.gatunek(q), 400);
      await this.h.czekaj(e.ownLook ? 500 : 150);
      e.setVisible(false);
      e.inAir = true;
      const k = ksztalty[0] as Extract<Ksztalt, { typ: 'kolo' }>;
      const cien = sc.add.image(k.x, k.y + 5, TEX.dragonShadow).setDepth(-1e8 + 5).setAlpha(0.45);
      cien.setScale((k.r * 2) / Math.max(1, cien.width));
      sc.tweens.add({ targets: cien, alpha: 0.7, duration: 700, yoyo: true, repeat: -1 });
      z.cien = cien;
    }
    await this.h.czekaj(350);
  }

  /** The announced attack lands; true if the fight ended. */
  private async wykonaj(q: Uczestnik, z: Zapowiedz): Promise<boolean> {
    const e = q.e, p = this.h.player;
    const sc = this.h.scene;
    const trafia = z.ksztalty.filter((k) => wKsztalcie(k, p.x, p.y)).length;
    e.anims.resume();
    if (z.atak === 'ogien') {
      this.blysk(z.ksztalty, 0xff9a2a, 0.75, 520);
      sc.cameras.main.shake(160, 0.0025);
      this.h.napis(e.x, e.y - 1.4 * W, S.napisy.ogien, '#ffb060', 900);
      for (const k of z.ksztalty) this.pola.push({ k, rodzaj: 'ogien', tur: S.ogien.plonieTur, obr: S.ogien.plonieObrazenia });
      await this.h.czekaj(300);
      if (trafia && this.h.ran(e, S.ogien.obrazenia)) return true;
    } else if (z.atak === 'kwas') {
      this.h.napis(e.x, e.y - 1.4 * W, S.napisy.kwas, '#d8f060', 900);
      await Promise.all(z.ksztalty.map((k, i) => new Promise<void>((done) => {
        const kula = sc.add.circle(e.x, e.y - 0.6 * W, 2.4, 0xc8e04a).setStrokeStyle(1, 0x1e1a24).setDepth(1_050_000 - 2);
        sc.tweens.add({ targets: kula, x: k.x, y: k.y, delay: i * 90, duration: 380, ease: 'Quad.In', onComplete: () => { kula.destroy(); done(); } });
      })));
      this.blysk(z.ksztalty, 0xc8e04a, 0.7, 420);
      for (const k of z.ksztalty) this.pola.push({ k, rodzaj: 'kaluza', tur: S.kwas.kaluzaTur, obr: S.kwas.kaluzaObrazenia });
      for (let i = 0; i < trafia; i++) if (this.h.ran(e, S.kwas.obrazenia)) return true;
    } else if (z.atak === 'dym') {
      this.h.napis(e.x, e.y - 1.4 * W, S.napisy.dym, '#d0a8ff', 900);
      this.blysk(z.ksztalty, 0x9a6ad0, 0.55, 600);
      for (const k of z.ksztalty) this.pola.push({ k, rodzaj: 'dym', tur: S.dym.tur, obr: S.dym.obrazenia });
      await this.h.czekaj(300);
      if (trafia) {
        this.zatrucie = S.dym.ruchowMniej;
        if (this.h.ran(e, S.dym.obrazenia)) return true;
      }
    } else {
      // Landing on the shadow: the nearest free spot to its middle.
      const k = z.ksztalty[0] as Extract<Ksztalt, { typ: 'kolo' }>;
      z.cien?.destroy();
      let gdzie = { x: k.x, y: k.y };
      let best = Infinity;
      for (let r = 0; r <= k.r + 2 * W && best === Infinity; r += 3) {
        for (let i = 0; i < Math.max(1, Math.round(r / 2)); i++) {
          const a = (i / Math.max(1, Math.round(r / 2))) * Math.PI * 2;
          const x = k.x + Math.cos(a) * r, y = k.y + Math.sin(a) * r;
          if (this.h.miejsce(x, y, q.r, e)) {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < best) [best, gdzie] = [d, { x, y }];
          }
        }
      }
      e.setPosition(gdzie.x, gdzie.y);
      e.inAir = false;
      e.setVisible(true).setAlpha(0);
      e.setScale(e.scaleX * 1.6);
      await new Promise<void>((done) => sc.tweens.add({ targets: e, alpha: 1, scaleX: e.scaleX / 1.6, scaleY: e.scaleY / 1.6, duration: 320, ease: 'Quad.In', onComplete: () => done() }));
      this.graj(q, 'ladowanie', p.x - e.x, p.y - e.y);
      sc.cameras.main.shake(320, 0.006);
      this.blysk(z.ksztalty, 0xd8c8a8, 0.7, 500);
      this.h.napis(e.x, e.y - 1.6 * W, S.napisy.lot, '#ffe0b0', 900);
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      if (d <= k.r) {
        const czesc = S.lot.obrazeniaSrodek - (S.lot.obrazeniaSrodek - S.lot.obrazeniaBrzeg) * (d / k.r);
        if (this.h.ran(e, czesc)) return true;
      }
      await this.h.czekaj(350);
    }
    await this.h.czekaj(250);
    this.stoj(q);
    return false;
  }

  /** A short bright flash over the shapes (the attack itself; code-drawn until the artist's effects). */
  private blysk(ks: Ksztalt[], kolor: number, alfa: number, ms: number) {
    const g = this.h.scene.add.graphics().setDepth(1_050_000 - 3);
    g.fillStyle(kolor, 1);
    for (const k of ks) this.ksztalt(g, k);
    g.setAlpha(alfa);
    this.h.scene.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
  }

  private ksztalt(g: Phaser.GameObjects.Graphics, k: Ksztalt, dy = 5) {
    if (k.typ === 'kolo') {
      g.fillCircle(k.x, k.y + dy, k.r);
      return;
    }
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(k.x, k.y + dy)];
    for (let i = 0; i <= 12; i++) {
      const a = k.kat - k.pol + (2 * k.pol * i) / 12;
      pts.push(new Phaser.Math.Vector2(k.x + Math.cos(a) * k.dl, k.y + dy + Math.sin(a) * k.dl));
    }
    g.fillPoints(pts, true);
  }

  private obrys(g: Phaser.GameObjects.Graphics, k: Ksztalt, dy = 5) {
    if (k.typ === 'kolo') {
      g.strokeCircle(k.x, k.y + dy, k.r);
      return;
    }
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(k.x, k.y + dy)];
    for (let i = 0; i <= 12; i++) {
      const a = k.kat - k.pol + (2 * k.pol * i) / 12;
      pts.push(new Phaser.Math.Vector2(k.x + Math.cos(a) * k.dl, k.y + dy + Math.sin(a) * k.dl));
    }
    g.strokePoints(pts, true, true);
  }

  /**
   * Start of the enemies' turn: the hero ended his turn standing in burning ground, a puddle or the cloud – he pays;
   * then every lasting area gets one turn older. True if the fight ended.
   */
  async tik(kogo: WrogWalki): Promise<boolean> {
    const p = this.h.player;
    for (const f of this.pola) {
      if (!wKsztalcie(f.k, p.x, p.y)) continue;
      const t = f.rodzaj === 'ogien' ? '🔥' : f.rodzaj === 'kaluza' ? '🧪' : '☠';
      this.h.napis(p.x, p.y - 1.4 * W, t, '#ffd0a0', 700);
      if (f.rodzaj === 'dym') this.zatrucie = S.dym.ruchowMniej;
      if (this.h.ran(kogo, f.obr)) return true;
      await this.h.czekaj(250);
    }
    for (const f of this.pola) f.tur--;
    this.pola = this.pola.filter((f) => f.tur > 0);
    return false;
  }

  /** Every frame: announced areas (red, pulsing) and the lasting ones (fire, acid, poison). */
  rysuj(now: number) {
    const g = this.fx;
    g.clear();
    const puls = 0.5 + 0.5 * Math.sin(now / 180);
    for (const f of this.pola) {
      const [kol, a] = f.rodzaj === 'ogien' ? [0xff6a1a, 0.34 + 0.12 * Math.sin(now / 90 + f.k.x)] : f.rodzaj === 'kaluza' ? [0xb8d84a, 0.38] : [0x8a5ac0, 0.34];
      g.fillStyle(kol, a);
      this.ksztalt(g, f.k);
      g.lineStyle(1, kol, 0.8);
      this.obrys(g, f.k);
    }
    for (const s of this.stany.values()) {
      if (!s.zap) continue;
      g.fillStyle(czerwony, 0.16 + 0.16 * puls);
      for (const k of s.zap.ksztalty) this.ksztalt(g, k);
      g.lineStyle(1.4, czerwony, 0.6 + 0.4 * puls);
      for (const k of s.zap.ksztalty) this.obrys(g, k);
    }
  }

  /** The fight is over: the dragon back on the ground, no areas left. */
  zakoncz() {
    for (const [q, s] of this.stany) {
      s.zap?.cien?.destroy();
      if (q.e.active && q.e.inAir) {
        q.e.inAir = false;
        q.e.setVisible(true);
      }
    }
    this.stany.clear();
    this.pola = [];
    this.fx.destroy();
  }
}

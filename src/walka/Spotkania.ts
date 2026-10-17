// Meeting a group on the map (turn fight MVP 1, test server). Monsters don't
// chase anybody: they sit in tight groups, each with its "close space" (a soft
// violet ring). Walking into it stops the game: Podejdź or Odejdź. Odejdź is
// free and steps the hero back a few metres; the question comes back only
// after walking well away. Podejdź: a dragon talks, the talkative ones
// (bandits, bosses) talk or take a fee, the hot-headed ones fight at once.

import Phaser from 'phaser';
import { WALKA_TUROWA as WT, ROZMOWNI, SPOTKANIA } from '../content/walkaTurowa';
import { W } from './tryb';
import type { WrogWalki } from './TuryWalki';
import type { Player } from '../objects/Player';
import { ENEMY_KINDS } from '../objects/Slime';
import { GATUNKI_SMOKOW, type GatunekId } from '../content/smoki';

export type WrogSpotkania = WrogWalki & { spokojny?: boolean; gatunek?: GatunekId; missionId?: string; temp?: boolean };

export interface SpotkaniaHost {
  scene: Phaser.Scene;
  player: Player;
  /** Every enemy on the map now. */
  wrogowie(): WrogSpotkania[];
  /** Can meet this one (alive, seen, not the story's dragon…). */
  mozna(e: WrogSpotkania): boolean;
  wolne(x: number, y: number): boolean;
  dialog(req: { title: string; text: string; buttons: string[]; onChoose: (i: number) => void }): void;
  /** No meetings now (a dialog, the story, lingering, a fight already on). */
  zajety(): boolean;
  walcz(kto: WrogSpotkania[]): void;
  /** The group took the fee and leaves (no loot, no EXP). */
  odchodza(kto: WrogSpotkania[]): void;
  monety(): number;
  zaplac(n: number): void;
  poziom(): number;
  toast(t: string, ms?: number): void;
}

interface Grupka {
  kto: WrogSpotkania[];
  x: number;
  y: number;
  /** Ring radius (px). */
  r: number;
}

export class Spotkania {
  /** Groups the hero walked away from: no question until he is far away. */
  private unikniete = new WeakSet<WrogSpotkania>();
  private gfx: Phaser.GameObjects.Graphics;
  private next = 0;
  private grupki: Grupka[] = [];

  constructor(private h: SpotkaniaHost) {
    this.gfx = h.scene.add.graphics().setDepth(-1e8 + 3);
  }

  destroy() {
    this.gfx.destroy();
  }

  /** No rings while a fight is on (they come back with the next update after it). */
  ukryj() {
    this.gfx.clear();
  }

  /** The groups near the hero (chains of members close to one another). */
  private zbierz(): Grupka[] {
    const p = this.h.player;
    const wolni = this.h.wrogowie().filter((e) => e.spokojny && !e.isDead && e.active && this.h.mozna(e) && Math.abs(e.x - p.x) < 260 && Math.abs(e.y - p.y) < 260);
    const lancuch = WT.grupkaLancuchW * W;
    const out: Grupka[] = [];
    const zostali = new Set(wolni);
    for (const e of wolni) {
      if (!zostali.has(e)) continue;
      zostali.delete(e);
      const kto = [e];
      for (let i = 0; i < kto.length; i++) {
        for (const o of [...zostali]) {
          if (Math.hypot(o.x - kto[i].x, o.y - kto[i].y) <= lancuch * (kto[i].kindId === 'smok' || o.kindId === 'smok' ? 2 : 1)) {
            zostali.delete(o);
            kto.push(o);
          }
        }
      }
      const x = kto.reduce((s, q) => s + q.x, 0) / kto.length;
      const y = kto.reduce((s, q) => s + q.y, 0) / kto.length;
      const r = Math.max(...kto.map((q) => Math.hypot(q.x - x, q.y - y) + q.size)) + WT.bliskoW * W;
      out.push({ kto, x, y, r });
    }
    return out;
  }

  /** Every frame: rings around nearby groups; walking into one asks Podejdź / Odejdź. */
  update(now: number) {
    const p = this.h.player;
    if (now >= this.next) {
      this.next = now + 150;
      this.grupki = this.zbierz();
      // Far enough from a group walked away from: it may ask again.
      for (const g of this.grupki) {
        if (Math.hypot(p.x - g.x, p.y - g.y) > g.r + WT.powrotW * W) for (const e of g.kto) this.unikniete.delete(e);
      }
      if (!this.h.zajety()) {
        const g = this.grupki.find((q) => q.kto.some((e) => e.visible) && !q.kto.some((e) => this.unikniete.has(e)) && Math.hypot(p.x - q.x, p.y - q.y) < q.r);
        if (g) this.zapytaj(g);
      }
    }
    this.rysuj(now);
  }

  private rysuj(now: number) {
    const g = this.gfx;
    g.clear();
    if (this.h.zajety() && !this.grupki.length) return;
    const puls = 0.75 + 0.25 * Math.sin(now / 420);
    for (const q of this.grupki) {
      if (!q.kto.some((e) => e.visible)) continue;
      const off = q.kto.some((e) => this.unikniete.has(e));
      const smok = q.kto.some((e) => e.kindId === 'smok');
      const kolor = smok ? 0x8fe0a0 : 0xb07cff;
      g.fillStyle(kolor, (off ? 0.03 : 0.07) * puls).fillEllipse(q.x, q.y + 5, q.r * 2, q.r * 1.7);
      // A dashed rim (drawn as short arcs), like the mock-up's circle.
      const n = Math.max(18, Math.round(q.r / 3));
      g.lineStyle(1.2, kolor, (off ? 0.28 : 0.7) * puls);
      for (let i = 0; i < n; i += 2) {
        const a0 = (i / n) * Math.PI * 2 + now / 4000, a1 = ((i + 1) / n) * Math.PI * 2 + now / 4000;
        g.beginPath();
        g.moveTo(q.x + Math.cos(a0) * q.r, q.y + 5 + Math.sin(a0) * q.r * 0.85);
        g.lineTo(q.x + Math.cos(a1) * q.r, q.y + 5 + Math.sin(a1) * q.r * 0.85);
        g.strokePath();
      }
    }
  }

  /** A swing or a shot at a group member: the same question at once. */
  zaczep(e: WrogSpotkania) {
    if (this.h.zajety()) return;
    const g = this.zbierz().find((q) => q.kto.includes(e));
    if (g) this.zapytaj(g, true);
  }

  private opis(g: Grupka) {
    const ile = new Map<string, number>();
    for (const e of g.kto) {
      const n = e.kindId === 'smok' && e.gatunek ? GATUNKI_SMOKOW[e.gatunek]?.nazwa ?? 'Smok' : ENEMY_KINDS[e.kindId].name;
      ile.set(n, (ile.get(n) ?? 0) + 1);
    }
    return [...ile].map(([n, k]) => (k > 1 ? `${k} × ${n}` : n)).join(', ');
  }

  private zapytaj(g: Grupka, zaczepka = false) {
    const p = this.h.player;
    p.move(0, 0, this.h.scene.time.now);
    const smok = g.kto.find((e) => e.kindId === 'smok');
    const rozmowni = !smok && (g.kto.some((e) => e.kindId === 'herszt' || e.kindId === 'wielki_herszt') || g.kto.filter((e) => ROZMOWNI.includes(e.kindId)).length * 2 >= g.kto.length);
    const kto = this.opis(g);
    const text = smok ? SPOTKANIA.smok(kto) : rozmowni ? SPOTKANIA.rozmowni(kto) : SPOTKANIA.narwani(kto);
    this.h.dialog({
      title: smok ? '🐉 Smok przy drodze' : '⚔ Grupka na drodze',
      text: zaczepka ? `${text}\n\nZaczepiłeś ich – zauważyli cię.` : text,
      buttons: ['🚶 Podejdź', '↩ Odejdź'],
      onChoose: (i) => {
        if (i !== 0) return this.odejdz(g);
        if (smok) return this.rozmowaSmoka(g, smok);
        if (rozmowni) return this.rozmowa(g);
        this.h.walcz(this.wybierz(g));
      },
    });
  }

  /** At most WT.maksUczestnikow fight at once: the ones nearest the hero. */
  private wybierz(g: Grupka) {
    const p = this.h.player;
    return [...g.kto].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, WT.maksUczestnikow);
  }

  private rozmowa(g: Grupka) {
    const misja = g.kto.some((e) => e.missionId || e.temp);
    const okup = Math.round(WT.okupZaCzlonka * g.kto.length * Math.max(1, this.h.poziom() / 2));
    const linia = SPOTKANIA.rozmowa[Math.floor(Math.random() * SPOTKANIA.rozmowa.length)];
    const buttons = [...(misja ? [] : [`💰 Zapłać okup (${okup})`]), '⚔ Walcz', '↩ Odejdź'];
    this.h.dialog({
      title: '🗣 Rozmowa',
      text: linia,
      buttons,
      onChoose: (i) => {
        const b = buttons[i];
        if (b.startsWith('💰')) {
          if (this.h.monety() < okup) {
            this.h.dialog({ title: '🗣 Rozmowa', text: SPOTKANIA.okupBrak(okup, this.h.monety()), buttons: ['⚔ Walcz', '↩ Odejdź'], onChoose: (j) => (j === 0 ? this.h.walcz(this.wybierz(g)) : this.odejdz(g)) });
            return;
          }
          this.h.zaplac(okup);
          this.h.odchodza(g.kto);
          this.h.toast(`💰 ${SPOTKANIA.okupOk}`, 3500);
          return;
        }
        if (b.startsWith('⚔')) return this.h.walcz(this.wybierz(g));
        this.odejdz(g);
      },
    });
  }

  private rozmowaSmoka(g: Grupka, smok: WrogSpotkania) {
    const linia = SPOTKANIA.smokMowi[Math.floor(Math.random() * SPOTKANIA.smokMowi.length)];
    const nazwa = smok.gatunek ? GATUNKI_SMOKOW[smok.gatunek]?.nazwa ?? 'Smok' : 'Smok';
    this.h.dialog({ title: `🐉 ${nazwa}`, text: linia, buttons: ['Dziękuję, idę dalej'], onChoose: () => this.odejdz(g, false) });
  }

  /** Steps the hero back out of the ring (free); the group won't ask again until he is far. */
  odejdz(g: Grupka, odsun = true) {
    for (const e of g.kto) this.unikniete.add(e);
    if (!odsun) return;
    const p = this.h.player;
    let dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const dalej = g.r + WT.odsunW * W;
    // Straight back first, then turned a little either way, then a bit closer.
    for (const k of [1, 0.85, 0.7]) for (const t of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
      const c = Math.cos(t), s = Math.sin(t);
      const ux = dx * c - dy * s, uy = dx * s + dy * c;
      const x = g.x + ux * dalej * k, y = g.y + uy * dalej * k;
      if (this.h.wolne(x, y) && Math.hypot(x - g.x, y - g.y) > Math.hypot(p.x - g.x, p.y - g.y)) {
        p.setPosition(x, y);
        return;
      }
    }
  }

  /** Lets the group go after a fight the hero ran from. */
  uniknij(kto: WrogSpotkania[]) {
    const g = this.zbierz().find((q) => q.kto.some((e) => kto.includes(e)));
    if (g) this.odejdz(g);
    else for (const e of kto) this.unikniete.add(e);
  }
}

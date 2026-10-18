// Arena Cechu (asynchronous PvP, content/arena.ts): a round sand floor outside the map, the same for everyone,
// with a brass railing, wooden stands full of spectators and steam vents. The hero fights another player's
// ghost (or the Mechanical Gladiator) in turns (walka/TuryWalki.ts); the GameScene waits paused under it.

import Phaser from 'phaser';
import { Player, PLAYER } from '../objects/Player';
import { Slime } from '../objects/Slime';
import { TuryWalki, type WrogWalki, type DuchWalki } from '../walka/TuryWalki';
import { W } from '../walka/tryb';
import { WALKA_TUROWA as WT } from '../content/walkaTurowa';
import { ARENA, ARENA_TEKSTY } from '../content/arena';
import { OSTROSC } from '../screen';
import { mapaWalki, resetTouch, resetKeys } from '../controls';
import { hdOn, useHdHero, fitHd, ensureRed, heroSkin } from '../sprites';
import { PLAYER_TEX } from '../art';
import type { DuchAreny } from '../api';
import { FLAGI, FLAGA_NIEZNANA, KOLORY_FLAG } from '../content/flagi';
import { ARENY_WYGLADY } from '../content/arena';

export interface ArenaDane {
  /** The rival (a ghost's snapshot, or the Gladiator made for this level). */
  rywal: DuchAreny;
  gladiator: boolean;
  poziom: number;
  hero: { postac?: number; name: string };
  /** Where the hero came from: the country's flags fly around the arena, the town's name is on the plaque. */
  kraj: string | null;
  miasto: string | null;
  zoom: number;
  cwiczenie: (skill: 'miecz' | 'luk' | 'magia', pkt: number) => void;
  toast: (t: string, ms?: number) => void;
  /** The fight is over: won or not (giving up counts as a loss). */
  koniec: (wygrana: boolean) => void;
}

export class ArenaScene extends Phaser.Scene {
  private walka: TuryWalki | null = null;
  private dane!: ArenaDane;
  private player!: Player;
  private leczenie = true;
  private R = 0;

  constructor() {
    super('arena');
  }

  init(d: ArenaDane) {
    this.dane = d;
    this.leczenie = true;
  }

  create() {
    const d = this.dane;
    this.R = ARENA.promienW * W;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#2a1d14');
    cam.setZoom(d.zoom);
    cam.centerOn(0, 0);
    this.rysujArene();

    // The hero (the player's own picture, full life: the real hero's life is untouched).
    const start = (ARENA.startW * W) / 2;
    if (hdOn) {
      this.player = new Player(this, 0, start, useHdHero(this, d.hero.postac, d.hero.name), 'me');
      fitHd(this.player);
    } else this.player = new Player(this, 0, start, PLAYER_TEX, 'me');
    this.player.hp = PLAYER.maxHp;
    this.player.setDepth(start);

    // The rival: the ghost in its owner's look with the enemies' red glow; the Gladiator as a bronze knight.
    const r = d.rywal;
    const e = new Slime(this, 0, -start, 'wojownik') as WrogWalki;
    if (hdOn) {
      const key = ensureRed(this, `hd-${heroSkin(r.postac, r.name).id}`);
      e.setTexture(key, 'down-0');
      fitHd(e);
      e.walkAnim = `${key}-walk`;
    }
    if (d.gladiator) e.setTint(0xd8a860);
    e.hp = Math.max(4, Math.round(r.maxHp * ARENA.jednostka));
    let akcje = 0;
    for (const [od, ile] of WT.ruchy) if (r.poziom >= od) akcje = ile;
    const duch: DuchWalki = { atak: r.atak, trafienie: r.trafienie, blok: r.blok, mocny: r.mocny, akcje, leczenie: true, strzal: r.strzal };
    e.pvp = duch;
    e.setDepth(-start);
    // The name over the ghost.
    const napis = this.add.text(0, -start - 16, `${r.name} · poz. ${r.poziom}`, { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '7px', color: '#ffd9a0', stroke: '#1e1a24', strokeThickness: 2.5, resolution: 6 })
      .setOrigin(0.5, 0).setDepth(1_050_100);
    this.events.on('update', () => {
      if (!e.active) return napis.setVisible(false);
      // Under the feet: over the head stand the life bar, the cost and the damage numbers.
      napis.setPosition(e.x, e.y + 9);
    });

    resetTouch();
    resetKeys();
    const naSwiat = (x: number, y: number) => ({ x: (x * OSTROSC) / cam.zoom + cam.worldView.x, y: (y * OSTROSC) / cam.zoom + cam.worldView.y, r: (22 * OSTROSC) / cam.zoom });
    mapaWalki.fn = (x, y) => {
      const w = naSwiat(x, y);
      this.walka?.tap(w.x, w.y, w.r);
    };
    mapaWalki.drag = (x0, y0, x, y, koniec) => {
      const a = naSwiat(x0, y0), b = naSwiat(x, y);
      this.walka?.przeciagnij(a.x, a.y, b.x, b.y, koniec, a.r);
    };

    const R = this.R;
    this.walka = new TuryWalki({
      scene: this,
      player: this.player,
      wolne: (x, y) => Math.hypot(x, y + 5) < R - 6,
      widac: () => true,
      zabity: () => {},
      cwiczenie: (s, p) => d.cwiczenie(s, p),
      zuzyj: () => {},
      hud: () => {},
      toast: (t, ms) => d.toast(t, ms),
      // The shared kit: one heal per fight, whatever is in the backpack.
      lecz: () => {
        if (!this.leczenie || this.player.hp >= PLAYER.maxHp) return false;
        this.leczenie = false;
        this.player.heal(Math.ceil(PLAYER.maxHp * ARENA.leczenie));
        this.napis(this.player.x, this.player.y - 18, '✚', '#9dff9a', 900);
        return true;
      },
      ranBohatera: (_e, dmg) => {
        this.player.drain(dmg);
        return this.player.hp <= 0;
      },
      koniec: (wynik) => this.koniec(wynik === 'wygrana'),
      pudlo: (x, y) => this.napis(x, y, 'pudło!', '#e8e4f0', 650),
      napis: (x, y, t, c, ms) => this.napis(x, y, t, c, ms),
      zamach: (aim) => this.zamach(aim),
      wzmocnienie: () => 1,
      nasycenie: () => {},
      zoomZwykly: () => d.zoom,
      wrocKamere: () => {},
      poziom: () => d.poziom,
      wyspany: () => false,
    }, [e], { pvp: true });
    d.toast(d.gladiator ? `⚙ ${ARENA_TEKSTY.gladiator} wchodzi na arenę!` : `⚔ Duch ${r.name} wchodzi na arenę!`, 2500);
  }

  update() {
    this.walka?.update();
    if (this.player) this.player.setDepth(this.player.y + 200_000);
  }

  private koniec(wygrana: boolean) {
    this.walka = null;
    mapaWalki.fn = null;
    mapaWalki.drag = null;
    // A short moment to see the end, then back to the map.
    this.time.delayedCall(700, () => this.dane.koniec(wygrana));
  }

  private napis(x: number, y: number, t: string, c: string, ms = 900) {
    const tx = this.add.text(x, y, t, { fontFamily: 'monospace', fontSize: '7px', color: c, stroke: '#1e1a24', strokeThickness: 3, resolution: 4 }).setOrigin(0.5, 1).setDepth(1_060_000);
    this.tweens.add({ targets: tx, y: y - 10, alpha: 0, duration: ms, onComplete: () => tx.destroy() });
  }

  private zamach(aim: number) {
    const g = this.add.graphics().setDepth(this.player.depth + 1);
    const r = (PLAYER.attackReach + PLAYER.attackRadius) * 0.9;
    g.lineStyle(1.5, 0xffffff, 0.8).beginPath().arc(this.player.x, this.player.y - 2, r, aim - 0.9, aim + 0.9).strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  /**
   * The arena drawn by code: sand with speckles and raked rings, a railing with rivets, stands with spectators,
   * steam, flags of the country around and the town's name on a plaque. Its look (ARENY_WYGLADY) is fixed per town.
   */
  private rysujArene() {
    const R = this.R;
    const d = this.dane;
    let h = 0;
    for (const ch of d.miasto ?? d.kraj ?? 'arena') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const wyg = ARENY_WYGLADY[h % ARENY_WYGLADY.length];
    this.cameras.main.setBackgroundColor(wyg.tlo);
    const g = this.add.graphics().setDepth(-1e8);
    // Stands: rings with rows of spectators (seeded dots).
    for (let k = 0; k < 4; k++) {
      const rr = R + 10 + k * 9;
      g.lineStyle(9, wyg.trybuny[k % 2], 1).strokeCircle(0, 0, rr);
    }
    let s = 12345 + (h % 1000);
    const los = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const kolory = [0xc84a3a, 0x3a7ac8, 0xe8c45a, 0x6ab45a, 0xd8d0c0, 0x8a5ac8, 0xe08a3a];
    for (let k = 0; k < 4; k++) {
      const rr = R + 10 + k * 9;
      const n = Math.round((Math.PI * 2 * rr) / 4.2);
      for (let i = 0; i < n; i++) {
        if (los() < 0.22) continue;
        const a = (i / n) * Math.PI * 2 + los() * 0.05;
        g.fillStyle(kolory[Math.floor(los() * kolory.length)], 1).fillRect(Math.round(Math.cos(a) * rr) - 1, Math.round(Math.sin(a) * rr) - 1, 2, 2);
        g.fillStyle(0xe8c8a0, 1).fillRect(Math.round(Math.cos(a) * rr) - 1, Math.round(Math.sin(a) * rr) - 2, 2, 1);
      }
    }
    // Sand floor, speckles and raked rings.
    g.fillStyle(wyg.piasek[0], 1).fillCircle(0, 0, R + 2);
    for (let i = 0; i < 900; i++) {
      const a = los() * Math.PI * 2, dd = Math.sqrt(los()) * R;
      g.fillStyle(los() < 0.5 ? wyg.piasek[1] : wyg.piasek[2], 1).fillRect(Math.round(Math.cos(a) * dd), Math.round(Math.sin(a) * dd), 1, 1);
    }
    for (let k = 1; k < 4; k++) g.lineStyle(0.6, wyg.piasek[1], 0.6).strokeCircle(0, 0, (R * k) / 4);
    // The Cech's emblem in the middle: a cog drawn into the sand.
    g.lineStyle(1, 0xa47e48, 0.8).strokeCircle(0, 0, 9);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.fillStyle(0xa47e48, 0.8).fillRect(Math.round(Math.cos(a) * 11) - 1, Math.round(Math.sin(a) * 11) - 1, 2, 2);
    }
    // Brass railing with rivets.
    g.lineStyle(3, wyg.barierka[0], 1).strokeCircle(0, 0, R + 4);
    g.lineStyle(1.5, wyg.barierka[1], 1).strokeCircle(0, 0, R + 4);
    const n = Math.round((Math.PI * 2 * R) / 10);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.fillStyle(0xffe08a, 1).fillRect(Math.round(Math.cos(a) * (R + 4)), Math.round(Math.sin(a) * (R + 4)), 1, 1);
    }
    // Flags of the country the hero came from on eight poles around the railing, waving.
    const wzor = (d.kraj && FLAGI[d.kraj]) || FLAGA_NIEZNANA;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.round(Math.cos(a) * (R + 8)), y = Math.round(Math.sin(a) * (R + 8));
      const f = this.add.graphics().setDepth(1_030_000 + y);
      f.fillStyle(0x3a2a1a, 1).fillRect(x, y - 16, 1, 16);
      f.fillStyle(0xffe08a, 1).fillRect(x, y - 17, 1, 1);
      wzor.forEach((row, ry) => [...row].forEach((c, rx) => {
        const kol = KOLORY_FLAG[c];
        if (kol) f.fillStyle(Number.parseInt(kol.slice(1), 16), 1).fillRect(x + 1 + rx * 1.5, y - 16 + ry * 1.5, 1.5, 1.5);
      }));
      this.tweens.add({ targets: f, scaleY: 0.96, duration: 700 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // The plaque over the north gate: the Cech's arena in this town.
    const tablica = `ARENA CECHU${d.miasto ? ` · ${d.miasto.toUpperCase()}` : ''}`;
    const tw = this.add.text(0, -R - 44, tablica, { fontFamily: '"Pixelify Sans", monospace', fontSize: '8px', color: '#2a1d14', resolution: 6 }).setOrigin(0.5).setDepth(1_030_001);
    const pl = this.add.graphics().setDepth(1_030_000);
    pl.fillStyle(wyg.barierka[0], 1).fillRect(-tw.width / 2 - 5, -R - 50, tw.width + 10, 12);
    pl.fillStyle(wyg.barierka[1], 1).fillRect(-tw.width / 2 - 4, -R - 49, tw.width + 8, 10);
    // Steam vents at four points of the railing.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * (R + 6), y = Math.sin(a) * (R + 6);
      g.fillStyle(0x5a4a3a, 1).fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
      const puff = () => {
        if (!this.sys.isActive()) return;
        const p = this.add.circle(x, y - 2, 2, 0xe8e4f0, 0.6).setDepth(1_040_000);
        this.tweens.add({ targets: p, y: y - 18, scale: 2.4, alpha: 0, duration: 1400, onComplete: () => p.destroy() });
        this.time.delayedCall(900 + i * 230 + los() * 900, puff);
      };
      this.time.delayedCall(i * 400, puff);
    }
  }
}

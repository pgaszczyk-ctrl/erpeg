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
import { ARENY_WYGLADY, HERBY_ARENY, GODLO_W_PIASKU, ARENA_RYSUNEK } from '../content/arena';

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
  /** Drawn from the artist's pictures (else the old code-drawn arena). */
  private rysunek = false;

  constructor() {
    super('arena');
  }

  init(d: ArenaDane) {
    this.dane = d;
    this.leczenie = true;
  }

  preload() {
    // The artist's arena (38-G001): the sand floor and the back stands, both 640×600 with one common anchor.
    const base = import.meta.env.BASE_URL;
    if (!this.textures.exists('arena-plyta')) this.load.image('arena-plyta', `${base}${ARENA_RYSUNEK.plyta}`);
    if (!this.textures.exists('arena-tyl')) this.load.image('arena-tyl', `${base}${ARENA_RYSUNEK.tyl}`);
  }

  create() {
    const d = this.dane;
    this.R = ARENA.promienW * W;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#2a1d14');
    cam.setZoom(d.zoom);
    cam.centerOn(0, 0);
    if (this.textures.exists('arena-plyta') && this.textures.exists('arena-tyl')) this.rysujArene();
    else this.rysujAreneKodem();

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
      const key = ensureRed(this, d.gladiator ? 'hd-gladiator' : `hd-${heroSkin(r.postac, r.name).id}`);
      e.setTexture(key, 'down-0');
      fitHd(e);
      e.walkAnim = `${key}-walk`;
    }
    if (d.gladiator && !hdOn) e.setTint(0xd8a860);
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
      // The artist's floor is an ellipse (height = spłaszczenie × width); the code-drawn one was a circle.
      wolne: (x, y) => {
        const ry = (this.rysunek ? R * ARENA_RYSUNEK.spłaszczenie : R) - 6;
        return (x / (R - 6)) ** 2 + ((y + (this.rysunek ? 0 : 5)) / ry) ** 2 < 1;
      },
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
      // The artist's arena: the whole floor across, the gate and its plaque on top.
      kadr: () => this.rysunek ? { x0: -R - 4, x1: R + 4, y0: (ARENA_RYSUNEK.gora - ARENA_RYSUNEK.srodek[1]) * R / ARENA_RYSUNEK.polosX, y1: R * ARENA_RYSUNEK.spłaszczenie + 4 } : null,
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
   * The artist's arena (38-G001): sand floor at the very bottom, the town's arms (or the Exp-lore logo) raked into
   * it, then the back stands with the gate. Both pictures share one frame; the floor's middle lies ARENA_RYSUNEK.srodek
   * in it, so the fight's centre (0, 0) is that point. Country flags on the stand posts, the town on the gate's plaque.
   */
  private rysujArene() {
    const d = this.dane;
    const R = this.R;
    const A = ARENA_RYSUNEK;
    this.rysunek = true;
    const K = R / A.polosX;
    const [cx, cy] = A.srodek;
    const naSwiat = (px: number, py: number) => ({ x: (px - cx) * K, y: (py - cy) * K });
    const o = naSwiat(A.plotno[0] / 2, A.plotno[1] / 2);
    this.cameras.main.setBackgroundColor(A.tlo);
    this.add.image(o.x, o.y, 'arena-plyta').setScale(K).setDepth(-1e8);
    // Behind the fighters (they stand at y + 200 000), over the floor and the arms.
    this.add.image(o.x, o.y, 'arena-tyl').setScale(K).setDepth(1000);
    // The sand's own colour, so the arms mix into exactly this sand.
    const c = this.textures.getPixel(cx, cy + 40, 'arena-plyta');
    this.godloWPiasku([c ? (c.red << 16) | (c.green << 8) | c.blue : 0xe8c890], R);
    // Country flags on the tops of the stand posts and the gate's pillars, waving.
    const wzor = (d.kraj && FLAGI[d.kraj]) || FLAGA_NIEZNANA;
    A.maszty.forEach(([px, py], i) => {
      const { x, y } = naSwiat(px, py);
      const f = this.add.graphics().setDepth(1001 + i);
      f.fillStyle(0x3a2a1a, 1).fillRect(x, y - 12, 1, 12);
      f.fillStyle(0xffe08a, 1).fillRect(x, y - 13, 1, 1);
      wzor.forEach((row, ry) => [...row].forEach((ch, rx) => {
        const kol = KOLORY_FLAG[ch];
        if (kol) f.fillStyle(Number.parseInt(kol.slice(1), 16), 1).fillRect(x + 1 + rx * 1.2, y - 12 + ry * 1.2, 1.2, 1.2);
      }));
      this.tweens.add({ targets: f, scaleY: 0.97, duration: 700 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    // The empty plaque over the gate gets the town's name (else the Cech's).
    const p = naSwiat(A.tabliczka[0], A.tabliczka[1]);
    const tw = this.add.text(p.x, p.y, (d.miasto ?? 'Arena Cechu').toUpperCase(), { fontFamily: '"Pixelify Sans", monospace', fontSize: '8px', color: '#2a1d14', resolution: 8 })
      .setOrigin(0.5).setDepth(1100);
    tw.setScale(Math.min(1, (A.tabliczka[2] * K) / tw.width));
  }

  /**
   * The arena drawn by code: sand with speckles and raked rings, a railing with rivets, stands with spectators,
   * steam, flags of the country around and the town's name on a plaque. Its look (ARENY_WYGLADY) is fixed per town.
   */
  /** The emblem pressed into the sand like the Targi Lublin mosaic: blurred, mixed with the sand, drifted over, ragged edge. */
  private godloWPiasku(piasek: number[], R: number) {
    const herb = this.dane.miasto ? HERBY_ARENY[this.dane.miasto] : undefined;
    const plik = herb ?? GODLO_W_PIASKU.logo;
    const klucz = `arena-godlo:${plik}`;
    const poloz = () => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return;
      const src = this.textures.get(klucz).getSourceImage() as HTMLImageElement;
      const D = Math.round(R * 2 * GODLO_W_PIASKU.srednica), K = 2;
      const N = D * K;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const ctx = c.getContext('2d')!;
      ctx.filter = `blur(${GODLO_W_PIASKU.rozmycie * K}px)`;
      ctx.drawImage(src, 0, 0, N, N);
      ctx.filter = 'none';
      const img = ctx.getImageData(0, 0, N, N);
      const px = img.data;
      const sr = (piasek[0] >> 16) & 255, sg = (piasek[0] >> 8) & 255, sb = piasek[0] & 255;
      const szum = (x: number, y: number) => {
        const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };
      // Soft value noise for sand drifts.
      const fala = (x: number, y: number) => 0.5 + 0.25 * Math.sin(x * 0.09 + Math.sin(y * 0.05) * 2) + 0.25 * Math.sin(y * 0.11 - x * 0.03);
      const mieszaj = GODLO_W_PIASKU.mieszanie;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        const a = px[i + 3] / 255;
        if (a < 0.02) { px[i + 3] = 0; continue; }
        const dx = x / N - 0.5, dy = y / N - 0.5;
        // Square-ish edge, so a shield's corners stay (the round logo is transparent outside its circle anyway).
        const r = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
        const brzeg = Math.max(0, Math.min(1, (1 - r) / 0.18 + (szum(x, y) - 0.5) * 0.8));
        const nasyp = Math.max(0, fala(x, y) - 0.45) * GODLO_W_PIASKU.nasyp * 2;
        const ziarno = szum(x * 1.7, y * 2.3);
        const k = mieszaj * (1 - nasyp) * (ziarno < 0.25 ? 0.55 : 1);
        px[i] = sr + (px[i] - sr) * k;
        px[i + 1] = sg + (px[i + 1] - sg) * k;
        px[i + 2] = sb + (px[i + 2] - sb) * k;
        px[i + 3] = 255 * a * brzeg * (ziarno < 0.03 ? 0 : 1);
      }
      ctx.putImageData(img, 0, 0);
      const t = `arena-piasek:${plik}:${piasek[0]}:${D}`;
      if (!this.textures.exists(t)) this.textures.addCanvas(t, c);
      this.add.image(0, 0, t).setScale(1 / K, (1 / K) * ARENA_RYSUNEK.spłaszczenie).setDepth(-1e8 + 1).setAlpha(GODLO_W_PIASKU.krycie);
    };
    if (this.textures.exists(klucz)) poloz();
    else {
      this.load.image(klucz, `${import.meta.env.BASE_URL}${plik}`);
      this.load.once(Phaser.Loader.Events.COMPLETE, poloz);
      this.load.start();
    }
  }

  private rysujAreneKodem() {
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
    // In the middle the town's coat of arms raked into the sand (HERBY_ARENY), else the Exp-lore emblem.
    this.godloWPiasku(wyg.piasek, R);
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

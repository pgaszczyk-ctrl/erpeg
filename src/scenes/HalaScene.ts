// The walkable hall of the Kulociąg Parowy (pack 48-G002 v2, content/halaKulociagu.ts). Going down a pinball hatch
// opens this scene over the street map, which stays where it was, hidden and idle (GameScene.wHali): talks and the
// shop still open through the GameScene (their windows freeze the hall), a reload starts by the hatch, and buying
// a ticket at a launcher hands over to the usual pinball ride. Units = the hall picture's pixels.

import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { HALA_CHODZENIE as H } from '../content/halaKulociagu';
import { OSTROSC } from '../screen';
import {
  keyboardDir, touchInput, consumeInteraction, consumeAttack, consumeStrong, consumeRelease, consumeHeal,
  resetKeys, resetTouch, worldInteraction, type WorldInteraction,
} from '../controls';
import { hdOn, useHdHero, fitHd, ensureHd } from '../sprites';
import { PLAYER_TEX } from '../art';
import { Ludzik3D, ludzik3d } from '../ludzik3d';
import { GAZETA } from '../content/gazeta';
import { ustawInterakcjeHud } from '../ui/hudLive';
import { nazwaIMozaika } from '../artillery/kulociag';
import { tx } from '../i18n';
import type { ModulLook } from '../ui/modulPostac';

const BAZA = `${import.meta.env.BASE_URL || '/'}swiat/kulociag/hala/`;
const W = 1672, Hh = 941;

export interface HalaDane {
  nazwa: string;
  kraj: string | null;
  /** Fixes where the newsboy and the trader stand (the same at every visit of this station). */
  seed: number;
  hero: { postac?: number; name: string; look?: { modul?: ModulLook } };
  /** A window of the game is open (dialog, shop, newspaper, ticket list): the hall waits. */
  stoi: () => boolean;
  gazeciarz: () => void;
  straganiarz: () => void;
  bilet: (tor: number) => void;
  wyjdz: () => void;
}

type Cel = { x: number; y: number; r: number; napis: string; kind: WorldInteraction['kind']; run: () => void };

export class HalaScene extends Phaser.Scene {
  private d!: HalaDane;
  private player!: Player;
  private maska: Uint8Array | null = null;
  private przeszkody: [number, number, number, number][] = [];
  private cele: Cel[] = [];
  private napis!: Phaser.GameObjects.Text;
  private gazeciarz?: Phaser.GameObjects.Sprite;
  private sprzedawca?: Phaser.GameObjects.Sprite;
  private uzbrojone = false;
  private wyszedl = false;
  private nastepneMachanie = 0;
  private poprzednieAt: typeof worldInteraction.at = null;

  constructor() {
    super('hala');
  }

  init(d: HalaDane) {
    this.d = d;
    this.maska = null;
    this.przeszkody = [];
    this.cele = [];
    this.uzbrojone = false;
    this.wyszedl = false;
    this.gazeciarz = this.sprzedawca = undefined;
  }

  preload() {
    const L = this.load;
    if (!this.textures.exists('hala-obraz')) L.image('hala-obraz', `${BAZA}hala.webp`);
    if (!this.textures.exists('hala-maska')) L.image('hala-maska', `${BAZA}maska.png`);
    if (!this.textures.exists('hala-stragan')) L.image('hala-stragan', `${BAZA}stragan.png`);
    if (!this.textures.exists('hala-straganiarz')) L.spritesheet('hala-straganiarz', `${BAZA}straganiarz.png`, { frameWidth: 64, frameHeight: 64 });
    if (!this.textures.exists('hala-straganiarz-macha')) L.image('hala-straganiarz-macha', `${BAZA}straganiarz_macha.png`);
    for (const [, plik] of H.przod) if (!this.textures.exists(`hala-p-${plik}`)) L.image(`hala-p-${plik}`, `${BAZA}przod/${plik}.png`);
  }

  create() {
    const d = this.d;
    resetKeys();
    resetTouch();
    const cam = this.cameras.main;
    cam.setBackgroundColor('#141216');
    cam.setBounds(0, 0, W, Hh);
    cam.setRoundPixels(true);
    this.dopasujZoom();
    this.scale.on('resize', this.dopasujZoom, this);

    // The hall with this station's name and its country's mosaic.
    const src = this.textures.get('hala-obraz').getSourceImage() as HTMLImageElement;
    const klucz = `hala-tlo-${d.nazwa}|${d.kraj}`;
    if (!this.textures.exists(klucz)) {
      const t = this.textures.createCanvas(klucz, W, Hh)!;
      const g = t.getContext();
      g.imageSmoothingEnabled = false;
      g.drawImage(src, 0, 0);
      nazwaIMozaika(g, d.nazwa, d.kraj);
      t.refresh();
      t.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.image(0, 0, klucz).setOrigin(0).setDepth(-1e6);
    for (const [, plik, x, y, base] of H.przod) {
      const k = `hala-p-${plik}`;
      if (this.textures.exists(k)) this.add.image(x, y, k).setOrigin(0).setDepth(base);
    }
    this.czytajMaske();

    // The hero: his own picture at the hall's scale (1 hall px = 1 px of his frame).
    const [ex, ey] = H.wejscie;
    if (hdOn) {
      this.player = new Player(this, ex, ey, useHdHero(this, d.hero.postac, d.hero.name, d.hero.look), 'me');
      fitHd(this.player, H.hallNaMape);
    } else this.player = new Player(this, ex, ey, PLAYER_TEX, 'me').setScale(H.hallNaMape);
    this.player.facing.set(0, 1);
    this.player.setDepth(ey);
    cam.startFollow(this.player, true);
    // The same 3D model as on the street and in dungeons (its own texture: the street's hero still exists).
    if (ludzik3d()) {
      const l = new Ludzik3D(this, { klucz: 'ludzik3d-hala', skala: H.hallNaMape });
      this.ludzik = l;
      l.ukryjNaStart(this.player);
      const krok = (_t: number, d: number) => l.update(this.player, Math.min(0.05, d / 1000));
      this.events.on('postupdate', krok);
      this.events.once('shutdown', () => { this.events.off('postupdate', krok); l.destroy(); if (this.ludzik === l) this.ludzik = undefined; });
    }

    this.ustawLudzi();
    this.napis = this.add.text(0, 0, '', {
      fontFamily: '"Alegreya Sans", sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffe6b0',
      stroke: '#1e1a24', strokeThickness: 4, resolution: 2,
    }).setOrigin(0.5, 1).setDepth(1e6).setVisible(false);
    for (const [x, y] of H.wyrzutnie) {
      const t = this.add.text(x, y - 74, '🎫', { fontSize: '18px', resolution: 2 }).setOrigin(0.5).setDepth(1e6 - 1).setAlpha(0.85);
      this.tweens.add({ targets: t, y: y - 80, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Taps/clicks on the newsboy, the stall or a launcher (the same as AKCJA next to them).
    this.poprzednieAt = worldInteraction.at;
    worldInteraction.at = (sx, sy) => {
      const p = this.naSwiat(sx, sy);
      const c = this.celPrzy(p.x, p.y, 28) ?? null;
      return c && this.zasieg(c) ? { kind: c.kind, run: c.run } : null;
    };
    this.events.once('shutdown', () => {
      worldInteraction.at = this.poprzednieAt;
      ustawInterakcjeHud(false);
      this.scale.off('resize', this.dopasujZoom, this);
    });
  }

  /** Whole canvas px per hall px; at the default on phones the hall's 2×2 pixels land on whole screen pixels. */
  private dopasujZoom() {
    const cam = this.cameras.main;
    const z = Math.max(1, Math.round(Math.min(this.scale.width / W, this.scale.height / Hh) * 1.15));
    cam.setZoom(z);
  }

  private naSwiat(sx: number, sy: number) {
    const cam = this.cameras.main;
    return { x: cam.worldView.x + (sx * OSTROSC) / cam.zoom, y: cam.worldView.y + (sy * OSTROSC) / cam.zoom };
  }

  private czytajMaske() {
    const img = this.textures.get('hala-maska').getSourceImage() as HTMLImageElement;
    if (!img?.width) return;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, W, Hh).data;
    const m = new Uint8Array(W * Hh);
    for (let i = 0; i < m.length; i++) m[i] = px[i * 4] > 127 ? 1 : 0;
    this.maska = m;
  }

  /** The mask is already shrunk by the feet's radius: one point test per step is enough. */
  private wolne(x: number, y: number) {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= W || iy >= Hh) return false;
    if (this.maska && !this.maska[iy * W + ix]) return false;
    for (const [x0, y0, x1, y1] of this.przeszkody) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false;
    return true;
  }

  /** The newsboy and the trader with his stall on the free floor on the left, fixed by the station. */
  private ustawLudzi() {
    let s = this.d.seed >>> 0 || 1;
    const los = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const poly = H.npc;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const wPoly = (x: number, y: number) => {
      let w = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w;
      }
      return w;
    };
    const [ex, ey] = H.wejscie;
    const zajete: { x: number; y: number }[] = [];
    // Never on the floor mosaic (the station's flag) – a box around the figure must miss it.
    const [mx, my, mw, mh] = H.mozaika;
    const naMozaice = (x0: number, y0: number, x1: number, y1: number) => x1 > mx && x0 < mx + mw && y1 > my && y0 < my + mh;
    const szukaj = (ok: (x: number, y: number) => boolean) => {
      for (let n = 0; n < 400; n++) {
        const x = Math.round(x0 + los() * (x1 - x0)) & ~1, y = Math.round(y0 + los() * (y1 - y0)) & ~1;
        if (!wPoly(x, y) || Math.hypot(x - ex, y - ey) < H.odWejscia) continue;
        if (zajete.some((p) => Math.hypot(p.x - x, p.y - y) < H.npcOdstep)) continue;
        if (ok(x, y)) {
          zajete.push({ x, y });
          return { x, y };
        }
      }
      return null;
    };

    // The trader behind his stall: the stall's footprint must lie on free floor.
    const st = szukaj((x, y) => !naMozaice(x - 62, y - 82, x + 62, y + 22) && [[-56, -26], [56, -26], [-56, 6], [56, 6], [0, 18]].every(([dx, dy]) => this.wolne(x + dx, y + dy)));
    if (st && this.textures.exists('hala-stragan')) {
      const cien = this.add.graphics().setDepth(st.y - 40);
      cien.fillStyle(0x1e1a24, 0.32).fillEllipse(st.x + 4, st.y + 2, 118, 20);
      if (this.textures.exists('hala-straganiarz')) {
        this.sprzedawca = this.add.sprite(st.x, st.y - 46, 'hala-straganiarz', 1).setOrigin(32 / 64, 63 / 64).setDepth(st.y - 46).setTint(H.swiatlo);
        this.nastepneMachanie = this.time.now + 2500;
      }
      // Stall image: 128×128, its base at (64, 103) on the floor.
      this.add.image(st.x, st.y, 'hala-stragan').setOrigin(64 / 128, 103 / 128).setDepth(st.y).setTint(H.swiatlo);
      this.przeszkody.push([st.x - 60, st.y - 30, st.x + 60, st.y + 8]);
      this.cele.push({ x: st.x, y: st.y + 22, r: H.straganR, napis: tx('🛒 Straganiarz', '🛒 Stall'), kind: 'use', run: () => this.d.straganiarz() });
    }

    // The newsboy as he looks on the streets (owner: the current one, not the new drawing).
    const gz = szukaj((x, y) => !naMozaice(x - 14, y - 58, x + 14, y + 6) && this.wolne(x, y) && this.wolne(x, y + 10));
    if (gz && hdOn) {
      const key = ensureHd(this, GAZETA.wyglad);
      if (this.textures.exists(key)) {
        this.gazeciarz = fitHd(this.add.sprite(gz.x, gz.y, key, 'down-1'), H.hallNaMape).setDepth(gz.y);
        this.przeszkody.push([gz.x - 9, gz.y - 6, gz.x + 9, gz.y + 4]);
        this.cele.push({ x: gz.x, y: gz.y, r: H.rozmowaR, napis: tx('📰 Gazeciarz', '📰 Newsboy'), kind: 'talk', run: () => this.d.gazeciarz() });
      }
    }

    // Tickets at the launchers.
    H.wyrzutnie.forEach(([x, y, r], i) => {
      this.cele.push({ x, y, r, napis: tx('🎫 Bilet', '🎫 Ticket'), kind: 'use', run: () => this.d.bilet(i) });
    });
  }

  private zasieg(c: Cel) {
    return Math.hypot(this.player.x - c.x, this.player.y - c.y) <= c.r;
  }

  /** The target nearest a point (a tap), if one lies within `r`. */
  private celPrzy(x: number, y: number, r: number) {
    let best: Cel | null = null, d = Infinity;
    for (const c of this.cele) {
      const e = Math.hypot(c.x - x, c.y - y - (c.kind === 'talk' ? 20 : 0));
      if (e < Math.max(r, c.kind === 'talk' ? 26 : 50) && e < d) { d = e; best = c; }
    }
    return best;
  }

  /** The target within reach of the hero, nearest first. */
  private celBohatera() {
    let best: Cel | null = null, d = Infinity;
    for (const c of this.cele) {
      const e = Math.hypot(this.player.x - c.x, this.player.y - c.y);
      if (e <= c.r && e < d) { d = e; best = c; }
    }
    return best;
  }

  /** The hero as the 3D model (src/ludzik3d.ts); none = his drawn sheet. */
  ludzik?: Ludzik3D;

  update(now: number, delta: number) {
    if (this.wyszedl) return;
    // No weapons down here: presses are swallowed so they don't pile up for the street.
    consumeAttack();
    consumeStrong();
    consumeRelease();
    consumeHeal();
    const p = this.player;
    if (this.d.stoi()) {
      p.move(0, 0, now);
      consumeInteraction();
      ustawInterakcjeHud(false);
      this.napis.setVisible(false);
      return;
    }
    const kd = keyboardDir();
    const klaw = kd.x !== 0 || kd.y !== 0;
    p.move(klaw ? kd.x : touchInput.x, klaw ? kd.y : touchInput.y, now);
    const dt = Math.min(0.05, delta / 1000);
    // vel = map px/s (level and hotel bonuses included); 1 map px = hallNaMape hall px.
    const dx = p.vel.x * dt * H.hallNaMape * H.tempo, dy = p.vel.y * dt * H.hallNaMape * H.tempo;
    if (dx || dy) {
      if (this.wolne(p.x + dx, p.y + dy)) p.setPosition(p.x + dx, p.y + dy);
      else if (dx && this.wolne(p.x + dx, p.y)) p.setX(p.x + dx);
      else if (dy && this.wolne(p.x, p.y + dy)) p.setY(p.y + dy);
    }
    p.setDepth(p.y);

    // The newsboy turns to the hero when he comes near; the trader now and then waves.
    if (this.gazeciarz) {
      const ox = p.x - this.gazeciarz.x, oy = p.y - this.gazeciarz.y;
      const blisko = Math.hypot(ox, oy) < 140;
      const bok = blisko && Math.abs(ox) > Math.abs(oy) * 1.2;
      this.gazeciarz.setFrame(bok ? 'side-1' : blisko && oy < -10 ? 'up-1' : 'down-1').setFlipX(bok && ox > 0);
    }
    if (this.sprzedawca && now > this.nastepneMachanie) {
      const macha = this.sprzedawca.texture.key !== 'hala-straganiarz-macha' && this.textures.exists('hala-straganiarz-macha');
      if (macha) this.sprzedawca.setTexture('hala-straganiarz-macha');
      else this.sprzedawca.setTexture('hala-straganiarz', 1);
      this.nastepneMachanie = now + (macha ? 700 : 3500 + Math.random() * 4000);
    }

    // What the hero can do here: a label over it and AKCJA lit.
    const cel = this.celBohatera();
    ustawInterakcjeHud(!!cel);
    if (cel) this.napis.setText(cel.napis).setPosition(cel.x, cel.y - (cel.kind === 'talk' ? 44 : 56)).setVisible(true);
    else this.napis.setVisible(false);
    const i = consumeInteraction();
    if (i) {
      const c = i.x >= 0 ? this.celPrzy(this.naSwiat(i.x, i.y).x, this.naSwiat(i.x, i.y).y, 40) ?? cel : cel;
      if (c && this.zasieg(c)) {
        p.move(0, 0, now);
        c.run();
      }
    }

    // Back up the stairs: walk away from the landing first, then into it again.
    const [ex, ey] = H.wejscie;
    const odWejscia = Math.hypot(p.x - ex, p.y - ey);
    if (odWejscia > H.uzbrojenieR) this.uzbrojone = true;
    else if (this.uzbrojone && odWejscia < H.wyjscieR) {
      this.wyszedl = true;
      p.move(0, 0, now);
      this.d.wyjdz();
    }
  }
}

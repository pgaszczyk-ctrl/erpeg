// Combat presentation (owner, 20 Nov 2026: „walka jest nudna… każde trafienie powinno mieć widoczny i słyszalny
// efekt, ale ekran musi pozostać czytelny”). Combat event → animation → effects → sound → numbers: the game's own
// combat code decides every hit (Slime.hit emits 'trafienie' AFTER the damage is done); this file only shows it.
// Nothing here changes damage, cooldowns, ranges or the AI.
//
// Everything is drawn into three Graphics redrawn each frame from a short list of live effects (no objects made per
// hit, nothing to leak): `swiatlo` (ADD, glows: magic cores and flashes), `gora` (sparks, splinters, death motes)
// and `smugaG` (the hero's blade trail, following his depth so a blade behind his body is behind it).
import Phaser from 'phaser';
import type { Slime, Trafienie } from '../objects/Slime';
import type { PunktSmugi } from '../ludzik3d';
import { trzesienieWlaczone } from '../ustawieniaGracza';

export const OPRAWA = {
  /** Hit stop, ms (visual only: the struck creature's pose and the hero's blow hold still; never stacks). */
  stop: { zwykly: 22, mocny: 46, krytyk: 62, zabicie: 34 },
  /** Camera nudge (ms, share of the view) – none for ordinary blows. */
  wstrzas: { mocny: [70, 0.0014], krytyk: [110, 0.0026], boss: [240, 0.006] } as Record<string, [number, number]>,
  /** Blade trail life (ms). */
  smugaMs: 170,
  /** Effects alive at once (weak phones get fewer sparks and no arrow trails). */
  maks: 48,
  maksLekko: 18,
};

/** Bosses: their fall shakes the camera once. */
const BOSSOWIE = new Set(['koziol', 'herszt', 'wielki_herszt', 'upior', 'wielki_glut', 'smok', 'elzet']);
/** How a creature falls apart (dust for flesh, shards for bones, sparkles for magic folk, rivets for the robot). */
export type GrupaSmierci = 'zwierze' | 'czlowiek' | 'kosci' | 'magia' | 'metal';
export function grupaSmierci(kind: string): GrupaSmierci {
  if (kind === 'szkielet') return 'kosci';
  if (kind === 'koziol' || kind === 'elzet') return 'metal';
  if (['glut', 'wielki_glut', 'driada', 'blob', 'wodnik', 'upior'].includes(kind)) return 'magia';
  if (['bandyta', 'zombie', 'wojownik', 'herszt', 'wielki_herszt'].includes(kind)) return 'czlowiek';
  return 'zwierze';
}

/** Colours by the weapon in hand: steel for blades, warm gold for the mythic ones, a pale trace for a stick; magic
 * by the wand / orb / book (blue-white, violet, gold). */
export function kolorySmugi(bron: string | null | undefined) {
  const zloty = bron === 'swietlisty' || bron === 'gromowladny' || bron === 'karabela_damascenska';
  const drewno = !bron || bron === 'kijek' || bron === 'siekiera';
  return {
    ostrze: zloty ? 0xfff0b8 : drewno ? 0xf2e6c8 : 0xf4f8ff,
    poswiata: zloty ? 0xffc94a : drewno ? 0xd9c49a : 0xbfd8ff,
    magia: bron === 'kula' ? 0xd2a8ff : bron === 'ksiega' ? 0xffd27a : 0x8fe0ff,
    magia2: bron === 'kula' ? 0x7b4bd6 : bron === 'ksiega' ? 0xd9822b : 0x3d8bff,
  };
}

/** A weak device: little memory or few cores, or the game already dropped to the plain picture there. */
export function slabeUrzadzenie(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number };
  let plain = false;
  try { plain = localStorage.getItem('exp-ostrosc-2') === '1'; } catch { /* storage blocked */ }
  return (n.deviceMemory !== undefined && n.deviceMemory <= 3) || (navigator.hardwareConcurrency || 8) <= 4 || plain;
}

type Rodzaj = 'ostrze' | 'tepe' | 'strzala' | 'magia' | 'inne';
interface Efekt {
  typ: 'iskry' | 'blysk' | 'pyl' | 'smierc' | 'dlon';
  x: number; y: number; kat: number; od: number; ms: number;
  kolor: number; kolor2: number; n: number; r: number; ziarno: number; mocny: boolean;
}
interface Slad { obj: Phaser.GameObjects.Components.Transform & { active: boolean }; pkt: { x: number; y: number; t: number }[]; kolor: number; magia: boolean; mocny: boolean }

/** Deterministic little noise for an effect's sparks (no Math.random per frame: they don't flicker). */
const los = (z: number, i: number) => { const v = Math.sin(z * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };

export interface OprawaHost {
  /** The hero's blade trail points (ludzik3d.smuga); empty when there is no 3D hero. */
  smuga: () => readonly PunktSmugi[];
  bohater: () => { x: number; y: number; depth: number };
  /** Colours of the weapon in hand: trail [edge, glow], magic [core, glow]. */
  kolory: () => { ostrze: number; poswiata: number; magia: number; magia2: number };
  /** Hold the hero's blow for ms (hit stop). */
  zatrzymajBohatera: (ms: number) => void;
  dzwiek: (id: string, glosnosc?: number) => void;
  /** Was this hit the hero's own blow (melee or his projectile)? Only those stop the picture and shake. */
  odBohatera: (t: Trafienie) => boolean;
}

export class OprawaWalki {
  private gora: Phaser.GameObjects.Graphics;
  private swiatlo: Phaser.GameObjects.Graphics;
  private smugaG: Phaser.GameObjects.Graphics;
  private efekty: Efekt[] = [];
  private slady: Slad[] = [];
  private czysto = true;
  readonly lekko = slabeUrzadzenie();
  readonly stats = { trafienia: 0, efekty: 0, smierci: 0 };
  private zniszczony = false;

  constructor(private scene: Phaser.Scene, private host: OprawaHost) {
    this.gora = scene.add.graphics().setDepth(1_045_000);
    this.swiatlo = scene.add.graphics().setDepth(1_045_001).setBlendMode(Phaser.BlendModes.ADD);
    this.smugaG = scene.add.graphics();
    scene.events.on('trafienie', this.naTrafienie);
    scene.events.once('shutdown', () => this.destroy());
    (window as unknown as { __oprawa?: OprawaWalki }).__oprawa = this;
  }

  private dodaj(e: Omit<Efekt, 'od' | 'ziarno'> & { od?: number }) {
    const limit = this.lekko ? OPRAWA.maksLekko : OPRAWA.maks;
    if (this.efekty.length >= limit) this.efekty.shift();
    this.efekty.push({ ...e, od: e.od ?? this.scene.time.now, ziarno: Math.random() * 1000 });
    this.stats.efekty++;
  }

  private naTrafienie = (t: Trafienie) => {
    if (this.zniszczony) return;
    this.stats.trafienia++;
    const rodzaj: Rodzaj = t.fx.rodzaj ?? 'inne';
    const mocny = !!t.fx.mocny, krytyk = !!t.fx.krytyk;
    const kat = Math.atan2(t.y - t.zY, t.x - t.zX);
    const s = t.cel;
    // Contact point: the side of the body facing the blow, at chest height.
    const r = Math.max(3, s.size * 0.6);
    const cx = t.x - Math.cos(kat) * r * 0.5, cy = t.y - 5 * (s.kind.scale || 1) - Math.sin(kat) * r * 0.3;
    const k = this.host.kolory();
    const kolor = rodzaj === 'magia' ? k.magia : rodzaj === 'tepe' ? 0xe8d6ad : rodzaj === 'strzala' ? 0xf1e2c0 : 0xffffff;
    const kolor2 = rodzaj === 'magia' ? k.magia2 : rodzaj === 'tepe' ? 0x8a6a42 : rodzaj === 'strzala' ? 0xb4864e : 0xffd36a;
    const ile = (krytyk ? 9 : mocny ? 7 : 5) - (this.lekko ? 2 : 0);
    this.dodaj({ typ: 'iskry', x: cx, y: cy, kat, ms: krytyk ? 230 : mocny ? 200 : 140, kolor, kolor2, n: ile, r: krytyk ? 12 : mocny ? 10 : 7, mocny: mocny || krytyk });
    this.dodaj({ typ: 'blysk', x: cx, y: cy, kat, ms: krytyk ? 150 : mocny ? 120 : 70, kolor: rodzaj === 'magia' ? k.magia2 : 0xfff6d8, kolor2: krytyk ? 0xff8a2a : kolor2, n: 0, r: krytyk ? 11 : mocny ? 8 : 4.5, mocny: mocny || krytyk });

    const odBohatera = this.host.odBohatera(t);
    if (odBohatera) {
      const ms = krytyk ? OPRAWA.stop.krytyk : mocny ? OPRAWA.stop.mocny : t.zabity ? OPRAWA.stop.zabicie : OPRAWA.stop.zwykly;
      s.zamroz(this.scene.time.now, ms);
      if (rodzaj === 'ostrze' || rodzaj === 'tepe') this.host.zatrzymajBohatera(ms);
      if (krytyk) this.wstrzas('krytyk'); else if (mocny) this.wstrzas('mocny');
    }
    // Sounds: the contact itself (by weapon), a heavy layer for strong/critical blows, the creature's fall.
    const id = rodzaj === 'magia' ? 'hit-magic' : rodzaj === 'strzala' ? 'hit-arrow' : rodzaj === 'tepe' ? 'hit-blunt' : 'hit-blade';
    this.host.dzwiek(id);
    if (mocny || krytyk) this.host.dzwiek('hit-heavy', krytyk ? 1 : 0.75);
    if (t.zabity) this.smierc(s);
  };

  /** A creature's fall: dust ring at the feet (shards, sparkles or rivets by kind) and its sound; a boss shakes. */
  smierc(s: Slime) {
    this.stats.smierci++;
    const g = grupaSmierci(s.kindId);
    const kolor = g === 'kosci' ? 0xe6e1d2 : g === 'magia' ? 0x9fe8ff : g === 'metal' ? 0xd9a441 : 0xc9b48a;
    const kolor2 = g === 'kosci' ? 0x8c877a : g === 'magia' ? 0xd7a6ff : g === 'metal' ? 0x6b4b22 : 0x7a6342;
    const opoznienie = s.model3d ? Math.max(0, s.modelDeathMs - 380) : 80;
    this.dodaj({ typ: 'smierc', x: s.x, y: s.y + 2, kat: 0, od: this.scene.time.now + opoznienie, ms: 520,
      kolor, kolor2, n: this.lekko ? 5 : 9, r: Math.max(8, s.size * 1.4), mocny: BOSSOWIE.has(s.kindId) });
    this.host.dzwiek(`death-${g}`);
    if (BOSSOWIE.has(s.kindId)) this.scene.time.delayedCall(opoznienie, () => this.wstrzas('boss'));
  }

  wstrzas(jaki: 'mocny' | 'krytyk' | 'boss') {
    if (!trzesienieWlaczone()) return;
    const [ms, sila] = OPRAWA.wstrzas[jaki];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.scene.cameras.main.shake(ms, sila, false);
  }

  /** A projectile's flight trail (arrows: a faint line; magic: a glowing tail). */
  sledz(obj: Slad['obj'], magia: boolean, mocny: boolean) {
    if (!magia && this.lekko) return;
    const k = this.host.kolory();
    this.slady.push({ obj, pkt: [], kolor: magia ? k.magia : mocny ? 0xffe08a : 0xf4ecda, magia, mocny });
  }

  /** Where a projectile ended without a creature: dust and splinters on a wall or the ground. */
  uderzenieWTeren(x: number, y: number, kat: number, magia: boolean) {
    const k = this.host.kolory();
    this.dodaj({ typ: 'pyl', x, y, kat, ms: 260, kolor: magia ? k.magia : 0xb8a27a, kolor2: magia ? k.magia2 : 0x6e5a3c, n: this.lekko ? 3 : 5, r: 5, mocny: false });
    this.host.dzwiek(magia ? 'hit-magic' : 'hit-wall', magia ? 0.5 : 0.8);
  }

  /** The mage's hand lights up as the spell leaves it. */
  dlon(x: number, y: number) {
    const k = this.host.kolory();
    this.dodaj({ typ: 'dlon', x, y, kat: 0, ms: 160, kolor: k.magia, kolor2: k.magia2, n: 0, r: 6, mocny: false });
  }

  update() {
    if (this.zniszczony) return;
    const now = this.scene.time.now;
    this.efekty = this.efekty.filter(e => now - e.od < e.ms);
    this.slady = this.slady.filter(s => s.obj.active || s.pkt.some(p => now - p.t < 140));
    const smuga = this.host.smuga().filter(p => now - p.t < OPRAWA.smugaMs);
    if (!this.efekty.length && !this.slady.length && !smuga.length) {
      if (!this.czysto) { this.gora.clear(); this.swiatlo.clear(); this.smugaG.clear(); this.czysto = true; }
      return;
    }
    this.czysto = false;
    const g = this.gora, l = this.swiatlo;
    g.clear(); l.clear();
    this.rysujSmuge(smuga, now);
    for (const s of this.slady) this.rysujSlad(s, now);
    for (const e of this.efekty) {
      const u = (now - e.od) / e.ms;
      if (u < 0) continue;
      switch (e.typ) {
        case 'iskry': this.iskry(e, u); break;
        case 'blysk': this.blysk(e, u); break;
        case 'pyl': this.pyl(e, u); break;
        case 'smierc': this.smiercRysuj(e, u); break;
        case 'dlon': l.fillStyle(e.kolor2, 0.5 * (1 - u)).fillCircle(e.x, e.y, e.r * (0.6 + u)); l.fillStyle(e.kolor, 0.8 * (1 - u)).fillCircle(e.x, e.y, e.r * 0.45); break;
      }
    }
  }

  /** The blade's way: a ribbon between the blade's middle and its tip over the last frames, brightest at the tip. */
  private rysujSmuge(p: readonly PunktSmugi[], now: number) {
    const g = this.smugaG;
    g.clear();
    if (p.length < 2) return;
    const b = this.host.bohater(), k = this.host.kolory();
    g.setDepth(b.depth + (p[p.length - 1].przod ? 0.6 : -0.6));
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], c = p[i];
      if (c.t - a.t > 90) continue; // a gap (paused frame): no ribbon across it
      const w = 1 - (now - c.t) / OPRAWA.smugaMs;
      if (w <= 0) continue;
      g.fillStyle(k.poswiata, 0.45 * w);
      g.fillPoints([new Phaser.Math.Vector2(a.ix, a.iy), new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(c.ix, c.iy)], true);
      g.lineStyle(1.4, k.ostrze, 0.95 * w);
      g.lineBetween(a.x, a.y, c.x, c.y);
    }
  }

  private rysujSlad(s: Slad, now: number) {
    if (s.obj.active) {
      s.pkt.push({ x: s.obj.x, y: s.obj.y, t: now });
      if (s.pkt.length > 10) s.pkt.shift();
    }
    const zycie = s.magia ? 160 : 90;
    s.pkt = s.pkt.filter(p => now - p.t < zycie);
    const pk = s.pkt;
    for (let i = 1; i < pk.length; i++) {
      const w = 1 - (now - pk[i].t) / zycie;
      if (s.magia) {
        this.swiatlo.lineStyle(3.2 * w + 0.6, s.kolor, 0.45 * w);
        this.swiatlo.lineBetween(pk[i - 1].x, pk[i - 1].y, pk[i].x, pk[i].y);
      } else {
        this.gora.lineStyle(s.mocny ? 1.2 : 0.8, s.kolor, 0.35 * w);
        this.gora.lineBetween(pk[i - 1].x, pk[i - 1].y, pk[i].x, pk[i].y);
      }
    }
    // A magic shot: a glowing core around its picture while it flies.
    if (s.magia && s.obj.active) {
      const p = pk[pk.length - 1];
      if (p) {
        this.swiatlo.fillStyle(s.kolor, 0.28).fillCircle(p.x, p.y, s.mocny ? 6 : 4.5);
        this.swiatlo.fillStyle(0xffffff, 0.35).fillCircle(p.x, p.y, s.mocny ? 2.4 : 1.7);
      }
    }
  }

  private iskry(e: Efekt, u: number) {
    const g = this.gora, l = this.swiatlo;
    const a = 1 - u;
    for (let i = 0; i < e.n; i++) {
      const rozrzut = (los(e.ziarno, i) - 0.5) * (e.mocny ? 2.2 : 1.6);
      const k = e.kat + rozrzut;
      const dl = e.r * (0.55 + 0.6 * los(e.ziarno, i + 9));
      const r0 = dl * Math.min(1, u * 2.4) * 0.35, r1 = dl * (0.25 + 0.9 * Math.sqrt(u));
      const x0 = e.x + Math.cos(k) * r0, y0 = e.y + Math.sin(k) * r0 + u * u * 3;
      const x1 = e.x + Math.cos(k) * r1, y1 = e.y + Math.sin(k) * r1 + u * u * 4;
      g.lineStyle(i % 2 ? 1 : 1.4, i % 3 === 0 ? e.kolor2 : e.kolor, a);
      g.lineBetween(x0, y0, x1, y1);
    }
    if (e.mocny) { l.lineStyle(1.6 * a + 0.4, e.kolor2, 0.7 * a); l.strokeCircle(e.x, e.y, e.r * (0.3 + 0.9 * u)); }
  }

  /** The contact flash: a four-pointed comic star that pops and shrinks. */
  private blysk(e: Efekt, u: number) {
    const l = this.swiatlo, g = this.gora;
    const s = e.r * (u < 0.3 ? 0.6 + u * 1.6 : 1.08 - (u - 0.3) * 1.2), a = 1 - u;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const k = e.kat + Math.PI / 4 + (i * Math.PI) / 4, r = i % 2 ? s * 0.28 : s;
      pts.push(new Phaser.Math.Vector2(e.x + Math.cos(k) * r, e.y + Math.sin(k) * r));
    }
    l.fillStyle(e.kolor2, 0.35 * a).fillCircle(e.x, e.y, s * 0.9);
    g.fillStyle(e.kolor, 0.9 * a).fillPoints(pts, true);
  }

  private pyl(e: Efekt, u: number) {
    const g = this.gora, a = 1 - u;
    g.fillStyle(e.kolor, 0.45 * a).fillEllipse(e.x, e.y, e.r * (1 + u * 1.6), e.r * 0.6 * (1 + u));
    for (let i = 0; i < e.n; i++) {
      const k = e.kat + Math.PI + (los(e.ziarno, i) - 0.5) * 2.4;
      const d = e.r * (0.4 + 1.4 * u) * (0.6 + los(e.ziarno, i + 5) * 0.6);
      g.fillStyle(e.kolor2, a).fillRect(e.x + Math.cos(k) * d - 0.5, e.y + Math.sin(k) * d * 0.6 - 3 * Math.sin(Math.PI * u) - 0.5, 1, 1);
    }
  }

  private smiercRysuj(e: Efekt, u: number) {
    const g = this.gora, l = this.swiatlo, a = 1 - u;
    // A flat ring of dust spreading over the ground, and motes (shards, sparkles, rivets) thrown up and falling.
    g.lineStyle(2.2 * a + 0.4, e.kolor2, 0.5 * a);
    g.strokeEllipse(e.x, e.y, e.r * (0.6 + 1.5 * u) * 2, e.r * (0.6 + 1.5 * u));
    g.fillStyle(e.kolor, 0.28 * a).fillEllipse(e.x, e.y, e.r * (0.8 + u) * 2, e.r * (0.8 + u));
    for (let i = 0; i < e.n; i++) {
      const k = (i / e.n) * Math.PI * 2 + los(e.ziarno, i);
      const d = e.r * (0.3 + 1.3 * u) * (0.7 + 0.5 * los(e.ziarno, i + 3));
      const h = 10 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * (0.5 + los(e.ziarno, i + 7));
      const x = e.x + Math.cos(k) * d, y = e.y + Math.sin(k) * d * 0.5 - h;
      if (e.kolor === 0x9fe8ff) l.fillStyle(i % 2 ? e.kolor : e.kolor2, a).fillCircle(x, y, 1.2);
      else g.fillStyle(i % 2 ? e.kolor : e.kolor2, a).fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
    }
    if (e.mocny) { l.lineStyle(2 * a, 0xffe4a0, 0.5 * a); l.strokeEllipse(e.x, e.y, e.r * 4 * u, e.r * 2 * u); }
  }

  destroy() {
    if (this.zniszczony) return;
    this.zniszczony = true;
    this.scene.events.off('trafienie', this.naTrafienie);
    this.gora.destroy(); this.swiatlo.destroy(); this.smugaG.destroy();
    this.efekty = []; this.slady = [];
  }
}

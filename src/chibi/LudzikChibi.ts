// The hero as a small „clay” chibi drawn by code (owner, 24 Nov 2026: „jebiemy się z tymi postaciami 3d… glina…
// ludzik 20 pixeli super, ataki są świetne, wdrażamy live”; mock-up: claude.ai artifact 7i5WNdz2cJ4ZaQwRMFGcv6).
// The figure is a handful of 3D primitives (spheres, capsules, rounded boxes – chibi/rysownik.ts) ray-traced pixel by
// pixel at the world's own pixel size (1 frame px = 1 world px = ½ map px), lit from the north-west with the world's ink
// outline, so it matches the generated buildings and trees. Frames are computed in a worker and cached as small textures:
// 64 angles (turns smoothly to any direction), walk/run cycles, a hopping combat stance, sword cuts A/B, the strong
// overhead blow, the spin (sword skill „Zamach”), the bow's draw/release and the mage's cast. Same public shape as
// Ludzik3D (GameScene/Hala/Arena use either). `?chibi=0` brings the 3D model back (localStorage `exp-chibi`).
import Phaser from 'phaser';
import type { Player } from '../objects/Player';
import type { PunktSmugi } from '../ludzik3d';
import { SKALA_POSTACI } from '../skala';
import { session } from '../quests';
import { gear, item } from '../inventory';
import { testVehicle, hasTestVehicle } from '../testTransport';
import { koloryZWygladu } from '../przebarwienie3d';
import { SKORY_MODUL, WLOSY_MODUL, UBRANIA_MODUL } from '../content/modul';
import { czubek, kula, E } from './rysownik';
import { opisNaPostaci, type NaPostaci } from '../content/naPostaci';

/** The renderer's equipment layers: the worn items' looks by body place. */
function wygladEkwipunku(equip: Record<string, string | null>): Partial<Record<'helm' | 'bron' | 'druga' | 'zbroja' | 'buty', NaPostaci>> {
  const out: Partial<Record<'helm' | 'bron' | 'druga' | 'zbroja' | 'buty', NaPostaci>> = {};
  const ze = (id: string | null | undefined) => opisNaPostaci(id, item(id ?? '')?.baza);
  const pary: [keyof typeof out, string | null | undefined][] = [['helm', equip.helm], ['bron', equip.bron], ['druga', equip.dystans], ['zbroja', equip.zbroja], ['buty', equip.buty]];
  for (const [miejsce, id] of pary) { const o = ze(id); if (o) out[miejsce] = o; }
  return out;
}

export const CHIBI = {
  /** Height in world px (owner: „ludzik 20 pixeli super”). */
  wysokosc: 20,
  katy: 64,
  /** Walking cycles per map px walked (like the 3D hero: ≈ 2.4 cycles/s at 70 km/h). */
  cyklNaPx: 0.064,
  /** From this share of the base speed the hero runs (lean, longer strides). */
  biegOd: 0.8,
  obrot: 14,
  /** After an attack the hero keeps the combat stance (hopping) this long while standing. */
  walkaMs: 2600,
  /** The moment of contact in every blow (the game's sounds and timing use 40 %). */
  kontakt: 0.4,
  workerow: 2,
  /** While the first frames are computed the drawn hero is hidden at most this long. */
  czekajMs: 8000,
};
(window as unknown as { __chibi: typeof CHIBI }).__chibi = CHIBI;

const KLUCZ = 'exp-chibi';
/** On everywhere; `?chibi=0` switches it off on this device (the 3D model or the drawn sheet then). */
export function chibi(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('chibi');
    if (q === '0' || q === '1') localStorage.setItem(KLUCZ, q);
    if (localStorage.getItem(KLUCZ) === '0') return false;
  } catch { /* storage blocked: default */ }
  return true;
}

type Rgb = [number, number, number];
const hex = (c: Rgb, k = 1) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
const PZ_ZAMACH = Array.from({ length: 15 }, (_, i) => +(-0.9 + 0.3 * i).toFixed(2));
const PZ_CIOS = Array.from({ length: 11 }, (_, i) => +(-0.9 + 0.3 * i).toFixed(2));
const najbl = (l: number[], a: number) => l.reduce((b, x) => (Math.abs(x - a) < Math.abs(b - a) ? x : b), l[0]);
const HOP: [number, number][] = [[0, 0.9], [1.0, 1], [1.8, 1.04], [1.0, 1]];
const sE = Math.sin(E), cE = Math.cos(E);
const gladko = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

type Rodzaj = 'miecz' | 'luk' | 'magia';
type Cios = { rodzaj: Rodzaj; wariant: 'A' | 'B' | 'C' | 'wir'; p: number; D: number; kat: number; mocny: boolean; uderzyl?: boolean };
type Klatka = { klucz: string; ox: number; oy: number; w: number; h: number };
type Efekt = { typ: string; t0: number; zyc: number; x: number; y: number; vx?: number; vy?: number; kol?: string; seed?: number; r?: number };

interface Zadanie { id: number; klucz: string; o: Record<string, unknown>; yaw: number; faza: number; pr: number; H: number }

/** One shared pool of workers and the frame cache (several scenes may show the hero). */
class Pracownia {
  private workers: Worker[] = [];
  private wolne: Worker[] = [];
  private kolejka: Zadanie[] = [];
  private wToku = new Map<number, Zadanie>();
  private nr = 0;
  readonly gotowe = new Map<string, Klatka>();
  /** Textures per scene's texture manager are the same game-wide (Phaser shares one manager). */
  textures?: Phaser.Textures.TextureManager;
  constructor() {
    for (let i = 0; i < CHIBI.workerow; i++) {
      const w = new Worker(new URL('./chibi.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.odbierz(w, e.data);
      this.workers.push(w);
      this.wolne.push(w);
    }
  }
  private odbierz(w: Worker, d: { id: number; w: number; h: number; ox: number; oy: number; px: ArrayBuffer }) {
    const z = this.wToku.get(d.id);
    this.wToku.delete(d.id);
    this.wolne.push(w);
    if (z && this.textures) {
      const c = document.createElement('canvas');
      c.width = d.w; c.height = d.h;
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(d.px), d.w, d.h), 0, 0);
      const key = 'chibi:' + this.gotowe.size + ':' + d.id;
      const tex = this.textures.addCanvas(key, c);
      tex?.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.gotowe.set(z.klucz, { klucz: key, ox: d.ox, oy: d.oy, w: d.w, h: d.h });
    }
    this.pompuj();
  }
  private pompuj() {
    if (!this.wolne.length || !this.kolejka.length) return;
    this.kolejka.sort((a, b) => b.pr - a.pr);
    while (this.wolne.length && this.kolejka.length) {
      const z = this.kolejka.shift()!;
      if (this.gotowe.has(z.klucz)) continue;
      this.wToku.set(z.id, z);
      this.wolne.pop()!.postMessage({ id: z.id, o: z.o, yaw: z.yaw, faza: z.faza, H: z.H });
    }
  }
  /** The frame if ready, else asks for it (priority pr: higher first). */
  klatka(o: Record<string, unknown>, k: number, faza: number, pr: number, H = CHIBI.wysokosc, grupa = 'B'): Klatka | undefined {
    const klucz = Pracownia.klucz(o, k, faza, H, grupa);
    const g = this.gotowe.get(klucz);
    if (g) return g;
    const q = this.kolejka.find((z) => z.klucz === klucz);
    if (q) q.pr = Math.max(q.pr, pr);
    else if (![...this.wToku.values()].some((z) => z.klucz === klucz))
      this.kolejka.push({ id: ++this.nr, klucz, o, yaw: (k * Math.PI * 2) / CHIBI.katy, faza, pr, H });
    this.pompuj();
    return undefined;
  }
  static klucz(o: Record<string, unknown>, k: number, faza: number, H: number, grupa: string) { return grupa + '|' + H + '|' + JSON.stringify(o) + '|' + k + '|' + faza; }
  ma(o: Record<string, unknown>, k: number, faza: number, H = CHIBI.wysokosc, grupa = 'B') { return this.gotowe.get(Pracownia.klucz(o, k, faza, H, grupa)); }
  /** Old outfits' frames go when the outfit changes (textures freed); creatures' frames stay. */
  zapomnijInne(stroj: string) {
    const p = 'B|' + CHIBI.wysokosc + '|' + stroj;
    for (const [klucz, kl] of this.gotowe) {
      if (!klucz.startsWith('B|') || klucz.startsWith(p)) continue;
      this.textures?.remove(kl.klucz);
      this.gotowe.delete(klucz);
    }
    this.kolejka = this.kolejka.filter((z) => !z.klucz.startsWith('B|') || z.klucz.startsWith(p));
  }
  get czeka() { return this.kolejka.length + this.wToku.size; }
}
let pracownia: Pracownia | undefined;
/** The shared worker pool + frame cache (the hero and the creatures). */
export function pracowniaChibi(textures: Phaser.Textures.TextureManager) { pracownia ??= new Pracownia(); pracownia.textures = textures; return pracownia; }
export type { Klatka };

export class LudzikChibi {
  private image?: Phaser.GameObjects.Image;
  private efektyG?: Phaser.GameObjects.Graphics;
  private ziemiaG?: Phaser.GameObjects.Graphics;
  private skala = 1;
  private kat = 0;
  private faza = 0;
  private ostatniaFaza = 0;
  private ostatnio?: { x: number; y: number };
  private pokazany = false;
  private start = performance.now();
  private cios?: Cios;
  private ostatniCios = -Infinity;
  private wariantA = true;
  private walkaDo = -Infinity;
  private zamrozDo = -Infinity;
  private efekty: Efekt[] = [];
  private stroj = '';
  private strojO: Record<string, unknown> = {};
  private attackSound?: { fn: (remainingMs: number) => void; leadMs: number };
  private disposed = false;
  readonly smuga: PunktSmugi[] = [];
  onKrok?: () => void;

  constructor(private scene: Phaser.Scene, opcje: { klucz?: string; skala?: number } = {}) {
    this.skala = opcje.skala ?? 1;
    pracownia ??= new Pracownia();
    pracownia.textures = scene.textures;
    this.ubierz();
    this.zamowRuch();
  }

  get widoczny() { return this.pokazany; }
  get atakuje() { return !!this.cios; }
  get attackEventMs(): number | undefined { return this.pokazany ? 0.55 * CHIBI.kontakt * 1000 : undefined; }

  ukryjNaStart(player: Player) {
    player.setVisible(false);
    this.pokazany = true;
  }

  zamroz(ms: number) {
    const now = this.scene.time.now;
    if (ms > 0 && now >= this.zamrozDo) this.zamrozDo = now + ms;
  }

  /** What the hero wears, as the renderer's outfit (from the equipment and the look's colours). */
  private ubierz() {
    const k = koloryZWygladu(session.look.modul, session.name);
    const S = SKORY_MODUL[k.s % SKORY_MODUL.length] as Rgb, W = WLOSY_MODUL[k.w % WLOSY_MODUL.length] as Rgb;
    const U = UBRANIA_MODUL[k.u % UBRANIA_MODUL.length] as Rgb, U2 = UBRANIA_MODUL[k.u2 % UBRANIA_MODUL.length] as Rgb;
    const o: Record<string, unknown> = {
      styl: 'A',
      kolory: { skora: hex(S, 0.95), wlosy: hex(W), mundur: hex(U, 0.82), spodnie: hex(U2, 0.7) },
    };
    if ((session.look.guard3d ?? session.look.modul?.p) === 'k') o.plec = 'k';
    const bron = gear.equip.bron ? item(gear.equip.bron) : undefined;
    // Each worn item's own look (content/naPostaci.ts); an item without one falls back to the generic picture.
    const eq = wygladEkwipunku(gear.equip);
    if (Object.keys(eq).length) o.eq = eq;
    const helm = gear.equip.helm;
    if (helm && !eq.helm) { o.helm = 1; o.helmTyp = /helm/.test(helm) ? 'kopula' : 'kaszkiet'; }
    if (gear.equip.zbroja && !eq.zbroja) o.naramiennik = 1;
    if (gear.equip.dystans && /tarcza/.test(gear.equip.dystans) && !eq.druga) o.tarcza = 1;
    if (eq.druga?.ksztalt === 'kolczan') o.pas = 1;
    if (bron?.rodzaj === 'luk') { o.bron = 'luk'; o.pas = 1; }
    else if (bron?.rodzaj === 'magia') { o.bron = 'kostur'; if (eq.zbroja?.ksztalt !== 'plaszcz') o.peleryna = 'niebieska'; }
    else if (gear.equip.bron === 'kijek' || !gear.equip.bron) o.bron = 'galaz';
    else if (/szabla|karabela/.test(gear.equip.bron)) o.bron = 'szabla';
    else o.bron = 'miecz';
    o.mankiet = 1;
    const s = JSON.stringify(o);
    if (s === this.stroj) return false;
    this.stroj = s;
    this.strojO = o;
    this.cios = undefined;
    pracownia!.zapomnijInne(s.slice(0, -1));
    return true;
  }

  private z(dod: Record<string, unknown>) { return Object.assign({}, this.strojO, dod); }
  private rodzajBroni(): Rodzaj { const b = this.strojO.bron; return b === 'luk' ? 'luk' : b === 'kostur' ? 'magia' : 'miecz'; }

  /** Movement frames first (standing, walking, running at 16 angles, then all 64). */
  private zamowRuch() {
    const p = pracownia!;
    for (const krok of [16, 4, 1]) for (let k = 0; k < CHIBI.katy; k += krok) {
      const pr = krok === 16 ? 5 : krok === 4 ? 3 : 1;
      p.klatka(this.strojO, k, 0, pr + 0.5);
      for (const f of [0, 0.25, 0.5, 0.75]) {
        p.klatka(this.z({ chod: 1 }), k, f, pr);
        p.klatka(this.z({ bieg: 1, pochyl: 0.22 }), k, f, pr - 0.2);
      }
    }
  }

  atakuj(aim: number, sound?: (remainingMs: number) => void, leadMs = 0, opcje: { mocny?: boolean; strzal?: 'luk' | 'magia'; wir?: boolean } = {}): boolean {
    if (this.disposed) return false;
    const now = this.scene.time.now;
    this.kat = Math.atan2(Math.cos(aim), Math.sin(aim));
    const rodzaj: Rodzaj = opcje.strzal ?? 'miecz';
    const pace = (this.scene as Phaser.Scene & { player?: Player }).player?.attackCooldown ?? 320;
    let D = Math.min(0.62, Math.max(0.26, (Math.max(80, pace) * 0.85) / 1000 / CHIBI.kontakt));
    let wariant: Cios['wariant'] = 'A';
    if (rodzaj === 'miecz') {
      if (opcje.wir) { wariant = 'wir'; D = 0.75; }
      else if (opcje.mocny) { wariant = 'C'; D *= 1.25; }
      else { this.wariantA = now - this.ostatniCios > 1100 ? true : !this.wariantA; wariant = this.wariantA ? 'A' : 'B'; }
      this.ostatniCios = now;
    } else D = rodzaj === 'luk' ? 0.5 : 0.55;
    this.cios = { rodzaj, wariant, p: 0, D, kat: this.kat, mocny: !!opcje.mocny };
    this.walkaDo = now + CHIBI.walkaMs;
    this.smuga.length = 0;
    this.attackSound = sound ? { fn: sound, leadMs } : undefined;
    this.emitAttackSound();
    // The cut's frames at this angle (on demand, right away).
    const k = this.katIdx(this.kat);
    for (const a of this.klatkiCiosu(this.cios)) pracownia!.klatka(a, k, 0, 30);
    if (rodzaj === 'magia') this.dodajMagie(now);
    return true;
  }

  private klatkiCiosu(c: Cios): Record<string, unknown>[] {
    if (c.rodzaj === 'luk') return [this.z({ poza: { typ: 'luk', a: 1 } }), this.z({ poza: { typ: 'luk', a: 0, puszczona: 1 } })];
    if (c.rodzaj === 'magia') return [this.z({ poza: { typ: 'czar', a: 0 } }), this.z({ poza: { typ: 'czar', a: 1 } })];
    if (c.wariant === 'C') return PZ_CIOS.map((a) => this.z({ poza: { typ: 'cios', a } }));
    return PZ_ZAMACH.map((a) => this.z({ poza: { typ: 'zamach', a } }));
  }

  private emitAttackSound() {
    const c = this.cios, s = this.attackSound;
    if (!c || !s) return;
    const remaining = Math.max(0, (CHIBI.kontakt - c.p) * c.D * 1000);
    if (remaining > s.leadMs) return;
    this.attackSound = undefined;
    s.fn(remaining);
  }

  private katIdx(kat: number) { const n = CHIBI.katy; return ((Math.round((kat / (Math.PI * 2)) * n) % n) + n) % n; }

  /** The blow's pose for progress p (renderer pose and the yaw offset of the spin). */
  private pozaCiosu(c: Cios): { o: Record<string, unknown>; a?: number; typ?: string; obrot: number } {
    const p = c.p;
    if (c.rodzaj === 'luk') return { o: p < 0.14 ? this.z({ poza: { typ: 'luk', a: 1 } }) : p < 0.7 ? this.z({ poza: { typ: 'luk', a: 0, puszczona: 1 } }) : this.z({ poza: { typ: 'luk', a: 0 } }), obrot: 0 };
    if (c.rodzaj === 'magia') return { o: this.z({ poza: { typ: 'czar', a: p < 0.18 ? 0 : 1 } }), obrot: 0 };
    if (c.wariant === 'wir') { const e = gladko(0.05, 0.85, p); return { o: this.z({ poza: { typ: 'zamach', a: 1.5 } }), typ: 'zamach', a: 1.5, obrot: e * Math.PI * 2 }; }
    if (c.wariant === 'C') {
      const a = p < 0.25 ? -0.9 : p < 0.4 ? -0.9 + ((p - 0.25) / 0.15) * 3 : 2.1;
      return { o: this.z({ poza: { typ: 'cios', a: najbl(PZ_CIOS, a) } }), typ: 'cios', a, obrot: 0 };
    }
    let a = p < 0.2 ? -0.9 : p < 0.55 ? -0.9 + ((p - 0.2) / 0.35) * 4.2 : 3.3;
    if (c.wariant === 'B') a = 2.4 - a; // the same cut walked back: right ← left
    return { o: this.z({ poza: { typ: 'zamach', a: najbl(PZ_ZAMACH, a) } }), typ: 'zamach', a, obrot: 0 };
  }

  /** Local point of the hero (renderer units = world px) → map px, relative to the feet. */
  private rzut(l: number[], yaw: number) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const w0 = c * l[0] + s * l[2], w2 = -s * l[0] + c * l[2];
    const k = 0.5 * this.skala * (CHIBI.wysokosc / 20);
    return { x: w0 * k, y: -(l[1] * cE - w2 * sE) * k, z: l[1] * sE + w2 * cE };
  }

  update(player: Player, dt: number) {
    if (this.disposed) return;
    const riding = testVehicle !== 'pieszo' && hasTestVehicle(testVehicle);
    const now = this.scene.time.now;
    if (this.ubierz()) this.zamowRuch();
    if (riding || player.isDead) { this.schowaj(player); return; }
    // Movement (scenes that tween the hero leave vel at 0: read it from the position change).
    let vx = player.vel.x, vy = player.vel.y, fx = player.facing.x, fy = player.facing.y;
    const o0 = this.ostatnio;
    this.ostatnio = { x: player.x, y: player.y };
    if (vx * vx + vy * vy <= 1 && o0 && dt > 0) {
      const mx = (player.x - o0.x) / this.skala / dt, my = (player.y - o0.y) / this.skala / dt;
      if (mx * mx + my * my > 4 && mx * mx + my * my < 1e6) { vx = mx; vy = my; fx = mx; fy = my; }
    }
    const v = Math.hypot(vx, vy), idzie = v > 1;
    const cel = this.cios ? this.cios.kat : Math.atan2(fx, fy);
    let d = cel - this.kat;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.kat += d * (1 - Math.exp(-dt * CHIBI.obrot));
    const baza = (this.scene as Phaser.Scene & { player?: Player }).player?.speed ?? 37;
    const bieg = v / Math.max(1, baza) >= CHIBI.biegOd;
    if (idzie) {
      this.faza = (this.faza + v * dt * CHIBI.cyklNaPx) % 1;
      if (Math.floor(this.faza * 2) !== Math.floor(this.ostatniaFaza * 2)) this.onKrok?.();
      this.ostatniaFaza = this.faza;
    }
    // The blow's own clock (held during a hit stop).
    const c = this.cios;
    if (c) {
      if (now >= this.zamrozDo) c.p += dt / c.D;
      if (c.p >= 1) this.cios = undefined;
    }
    this.emitAttackSound();
    let o: Record<string, unknown>, faza = 0, yaw = this.kat;
    const cc = this.cios;
    let poza: ReturnType<LudzikChibi['pozaCiosu']> | undefined;
    if (cc) {
      poza = this.pozaCiosu(cc);
      o = poza.o;
      yaw = cc.kat + poza.obrot;
      if (cc.rodzaj === 'miecz') this.efektyCiosu(cc, poza, player, now);
    } else if (idzie) {
      o = bieg ? this.z({ bieg: 1, pochyl: 0.22 }) : this.z({ chod: 1 });
      faza = Math.floor(this.faza * 4) / 4;
    } else if (now < this.walkaDo) {
      // Combat stance: hopping on the spot (the mage floats), weapon ready.
      const i = Math.floor(now / 120) % 4;
      const r = this.rodzajBroni();
      o = r === 'magia' ? this.z({ unos: [0.3, 0.9, 1.5, 0.9][Math.floor(now / 220) % 4] })
        : r === 'luk' ? this.z({ poza: { typ: 'luk', a: 0 }, unos: HOP[i][0], sy: HOP[i][1] })
          : this.z({ poza: { typ: 'gotow' }, unos: HOP[i][0], sy: HOP[i][1] });
    } else o = this.strojO;
    const k = this.katIdx(yaw);
    const p = pracownia!;
    let kl = p.klatka(o, k, faza, 20);
    if (!kl) kl = this.najblizsza(o, k, faza) ?? this.najblizsza(idzie ? this.z(bieg ? { bieg: 1, pochyl: 0.22 } : { chod: 1 }) : this.strojO, k, faza) ?? this.najblizsza(this.strojO, k, 0);
    if (!kl) {
      // Nothing computed yet: keep the drawn hero hidden for a moment, then show him until frames are in.
      if (performance.now() - this.start < CHIBI.czekajMs) { player.setVisible(false); this.pokazany = true; this.image?.setVisible(false); }
      else this.schowaj(player);
      return;
    }
    const sc = 0.5 * this.skala;
    if (!this.image || !this.image.scene) this.image = this.scene.add.image(player.x, player.y, kl.klucz);
    const stopy = player.y + 8 * SKALA_POSTACI * this.skala;
    this.image.setTexture(kl.klucz).setScale(sc).setOrigin(kl.ox / kl.w, kl.oy / kl.h)
      .setPosition(player.x, stopy).setDepth(player.depth).setAlpha(player.alpha).setVisible(true);
    if (player.isTinted) this.image.setTint(player.tintTopLeft); else this.image.clearTint();
    player.setVisible(false);
    this.pokazany = true;
    // Blade trail for the game's ribbon (walka/oprawa.ts): while the blade cuts.
    if (cc && poza && poza.typ && poza.a !== undefined) {
      const tnie = cc.wariant === 'wir' ? cc.p > 0.05 && cc.p < 0.88 : cc.wariant === 'C' ? cc.p > 0.24 && cc.p < 0.42 : cc.p > 0.19 && cc.p < 0.57;
      if (tnie) {
        const pz = { typ: poza.typ, a: poza.a };
        const t = this.rzut(czubek(pz), yaw), m = this.rzut(kula(pz), yaw);
        const mid = { x: m.x + (t.x - m.x) * 0.45, y: m.y + (t.y - m.y) * 0.45 };
        this.smuga.push({ x: player.x + t.x, y: stopy + t.y, ix: player.x + mid.x, iy: stopy + mid.y, t: now, przod: t.z >= -1 });
        if (this.smuga.length > 24) this.smuga.shift();
      }
    }
    this.rysujEfekty(now, player.depth);
  }

  /** Nearest computed angle of the same pose. */
  private najblizsza(o: Record<string, unknown>, k: number, faza: number) {
    const p = pracownia!, n = CHIBI.katy;
    for (let d = 0; d <= n / 2; d++) for (const kk of d ? [k + d, k - d] : [k]) { const r = p.ma(o, ((kk % n) + n) % n, faza); if (r) return r; }
    return undefined;
  }

  private schowaj(player: Player) {
    if (this.pokazany) player.setVisible(true);
    this.image?.setVisible(false);
    this.pokazany = false;
  }

  // ---------- effects of the strong blow, the spin and the mage's cast (pixel squares, ½ map px) ----------
  private efektyCiosu(c: Cios, poza: { a?: number }, player: Player, now: number) {
    const stopy = player.y + 8 * SKALA_POSTACI * this.skala;
    if (c.wariant === 'C' && !c.uderzyl && c.p >= 0.4) {
      c.uderzyl = true;
      const tip = czubek({ typ: 'cios', a: 2.1 });
      const g = this.rzut([tip[0], 0, tip[2]], c.kat);
      const x = player.x + g.x, y = stopy + g.y;
      this.efekty.push({ typ: 'fala', t0: now, zyc: 520, x, y });
      this.efekty.push({ typ: 'rysy', t0: now, zyc: 1100, x, y, seed: Math.random() * 1000 });
      for (let i = 0; i < 14; i++) { const an = Math.random() * 7; this.efekty.push({ typ: 'kurz', t0: now, zyc: 450 + Math.random() * 300, x, y, vx: Math.cos(an) * 11, vy: Math.sin(an) * 4.5 - 3 }); }
    }
    if (c.wariant === 'wir' && Math.random() < 0.45) {
      const an = Math.random() * 7;
      this.efekty.push({ typ: 'kurz', t0: now, zyc: 400, x: player.x + Math.cos(an) * 4.5, y: stopy + Math.sin(an) * 2, vx: Math.cos(an) * 7, vy: Math.sin(an) * 2.5 });
    }
    void poza;
  }

  private dodajMagie(now: number) {
    // A burst of sparks around the staff's orb at the cast (the game draws the missile itself).
    this.efekty.push({ typ: 'blysk', t0: now + this.cios!.D * 180, zyc: 260, x: 0, y: 0 });
  }

  private rysujEfekty(now: number, depth: number) {
    if (!this.efekty.length) { this.efektyG?.clear(); this.ziemiaG?.clear(); return; }
    this.efektyG ??= this.scene.add.graphics();
    this.ziemiaG ??= this.scene.add.graphics();
    const G = this.efektyG, Z = this.ziemiaG;
    G.clear().setDepth(depth + 0.5);
    Z.clear().setDepth(-1e7 + 2);
    const px = 0.5 * this.skala;
    const pix = (g: Phaser.GameObjects.Graphics, x: number, y: number, kol: number, a: number) => {
      if (a <= 0) return;
      g.fillStyle(kol, Math.min(1, a)).fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px);
    };
    const player = (this.scene as Phaser.Scene & { player?: Player }).player;
    this.efekty = this.efekty.filter((f) => now - f.t0 < f.zyc);
    for (const f of this.efekty) {
      const d = now - f.t0;
      if (d < 0) continue;
      const u = d / f.zyc, s = d / 1000;
      if (f.typ === 'fala') { const r = (3 + u * 22) * px; for (let a = 0; a < 6.28; a += px / r) pix(Z, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * sE, u < 0.4 ? 0xfff6e0 : 0xd9c9a8, (1 - u) * 0.85); }
      if (f.typ === 'rysy') {
        let sd = f.seed!; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let j = 0; j < 5; j++) { let x = f.x, y = f.y, an = rnd() * 6.28; for (let st = 0; st < 7 + rnd() * 5; st++) { an += (rnd() - 0.5) * 0.9; x += Math.cos(an) * px; y += Math.sin(an) * sE * px; pix(Z, x, y, 0x2a2024, (1 - u) * 0.8); } }
      }
      if (f.typ === 'kurz') { const x = f.x + f.vx! * s, y = f.y + f.vy! * s + 5 * s * s; const k = u < 0.4 ? 2 : 1; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) pix(G, x + i * px, y + j * px, u < 0.5 ? 0xc9b48a : 0x9c8a6a, (1 - u) * 0.7); }
      if (f.typ === 'blysk' && player) {
        const c = this.cios;
        const orb = this.rzut(kula({ typ: 'czar', a: 1 }), c ? c.kat : this.kat);
        const ox = player.x + orb.x, oy = player.y + 8 * SKALA_POSTACI * this.skala + orb.y;
        for (let i = 0; i < 8; i++) { const an = i * 0.785 + u * 2, r = (1 + u * 6) * px; pix(G, ox + Math.cos(an) * r, oy + Math.sin(an) * r * 0.8, i % 2 ? 0xfff7c2 : 0xbfe9ff, 1 - u); }
        pix(G, ox, oy, 0xffffff, 1 - u);
      }
    }
  }

  /** Whole-body turnaround for the cannon's flight (24 frames) – only once those angles are computed. */
  flightPortrait(spin = false): string[] | undefined {
    const p = pracownia!, n = spin ? 24 : 6, out: string[] = [];
    let brak = false;
    for (let i = 0; i < n; i++) {
      const k = Math.round((i * CHIBI.katy) / n) % CHIBI.katy;
      const kl = p.klatka(this.strojO, k, 0, 4);
      if (!kl) { brak = true; continue; }
      const src = this.scene.textures.get(kl.klucz).getSourceImage() as HTMLCanvasElement;
      const c = document.createElement('canvas');
      c.width = kl.w * 3; c.height = kl.h * 3;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      g.drawImage(src, 0, 0, c.width, c.height);
      out.push(c.toDataURL('image/png'));
    }
    return brak ? undefined : out;
  }

  destroy() {
    this.disposed = true;
    this.image?.destroy();
    this.efektyG?.destroy();
    this.ziemiaG?.destroy();
    this.image = undefined;
  }
}

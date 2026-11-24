// Monsters as code-drawn clay chibis, in the hero's style (owner, 24 Nov 2026: „rób stworki”). Each enemy kind is a set
// of primitives in chibi/rysownik.ts (wolf, warg, imp, skeleton, dryad, crypt wraith, water blob, brass goat) or the
// hero's figure in other clothes (bandit, gang bosses, zombie, wodnik). The pose comes from what the actor is doing –
// idle breathing, walking, the AI's wind-up (StworAI modelAttack start → contact), the strike (contact → end), a hit,
// the fall – and the frame (32 directions) from the shared worker pool. Gameplay stays on the Slime: only its texture,
// scale and origin are swapped (like stwory3d.ts did, which keeps the townsfolk). `?stworyChibi=0` = the 3D models.
import Phaser from 'phaser';
import type { Slime } from '../objects/Slime';
import type { RodzajWroga } from '../content/fabula';
import { SKALA_POSTACI } from '../skala';
import { pracowniaChibi, CHIBI, type Klatka } from './LudzikChibi';

type Stroj = { o: Record<string, unknown>; wys: number; czworonog?: boolean; bron?: boolean; czar?: boolean };
const C = (o: Record<string, unknown>) => Object.assign({ styl: 'A' }, o);
const BANDYTA = { skora: '#e0a878', wlosy: '#3a2a22', mundur: '#5a3a2a', spodnie: '#2a2a30' };
const HERSZT = { skora: '#d99a6a', wlosy: '#2a2020', mundur: '#4a2a22', spodnie: '#1f1f26', czapka: '#2a2226', plaszcz: '#8a2a24' };
export const STROJE_STWOROW: Partial<Record<RodzajWroga, Stroj>> = {
  wilk: { o: C({ stwor: 'wilk' }), wys: 0.78, czworonog: true },
  warg: { o: C({ stwor: 'warg' }), wys: 0.78, czworonog: true },
  glut: { o: C({ stwor: 'chochlik' }), wys: 0.7 },
  wielki_glut: { o: C({ stwor: 'chochlik' }), wys: 0.7 },
  szkielet: { o: C({ stwor: 'szkielet', bron: 1 }), wys: 1 },
  driada: { o: C({ stwor: 'driada' }), wys: 1, czar: true },
  upior: { o: C({ stwor: 'upior' }), wys: 1 },
  blob: { o: C({ stwor: 'blob' }), wys: 0.6 },
  koziol: { o: C({ stwor: 'koziol' }), wys: 1.05 },
  bandyta: { o: C({ kolory: BANDYTA, kaptur: 'kaptur', szal: 1, kolDod: { szal: '#a83a2a' }, bron: 'szabla', pas: 1, mankiet: 1 }), wys: 1, bron: true },
  herszt: { o: C({ kolory: HERSZT, plaszcz: 1, dol: 1, helm: 1, helmTyp: 'kaszkiet', bron: 'szabla', naramiennik: 1, mankiet: 1 }), wys: 1, bron: true },
  wielki_herszt: { o: C({ kolory: HERSZT, plaszcz: 1, dol: 1, helm: 1, helmTyp: 'kaszkiet', bron: 'miecz', naramiennik: 1, tarcza: 1, mankiet: 1 }), wys: 1, bron: true },
  zombie: { o: C({ kolory: { skora: '#93b07c', wlosy: '#4a3a2a', mundur: '#6a5a4a', spodnie: '#3e4a5a' }, rekaPrzod: 1, kolorOczu: '#f2f0c8', bezRumiencow: true, ustaD: { y: -0.42, w: 0.18 } }), wys: 1 },
  wodnik: { o: C({ kolory: { skora: '#4a9a8a', wlosy: '#2b6a6a', mundur: '#2b5a6a', spodnie: '#1f3a4a' }, pletwa: 1, bron: 'kostur', kolorOczu: '#ffe04a', bezRumiencow: true }), wys: 1, czar: true },
};

export function stworyChibi(): boolean {
  try { if (new URLSearchParams(location.search).get('stworyChibi') === '0') return false; } catch { /* default */ }
  return true;
}

const KIERUNKI = 32, KROK_K = CHIBI.katy / KIERUNKI;
const HOP: [number, number][] = [[0, 1], [0, 1.03]];
const SMIERC = [0.45, 0.95, 1.45];

type Stan = { saved: { texture: string; frame: string | number; sx: number; sy: number; ox: number; oy: number; flip: boolean }; yaw: number; k: number; ostatnia?: Klatka };

export class StworyChibi {
  private stany = new Map<Slime, Stan>();
  private znane = new Set<string>();
  private p;
  constructor(private scene: Phaser.Scene) { this.p = pracowniaChibi(scene.textures); }

  /** Render height (world px) of an actor's chibi. */
  private H(a: Slime, st: Stroj) { return Math.min(64, Math.round(20 * st.wys * Math.pow(a.kind.scale || 1, 0.85))); }

  /** The pose's renderer options and walk phase for what the actor does now. */
  private poza(a: Slime, st: Stroj, now: number): { o: Record<string, unknown>; faza: number; pr: number } {
    const t = a.czasModelu(now), base = st.o, z = (d: Record<string, unknown>) => Object.assign({}, base, d);
    if (a.isDead) {
      const i = Math.min(2, Math.floor(Math.max(0, t - a.modelDeathAt) / (a.modelDeathMs / 3.2)));
      return { o: z({ przechyl: SMIERC[i], pochyl: -0.15 }), faza: 0, pr: 25 };
    }
    if (t - a.modelHitAt < 180) return { o: z({ pochyl: -0.26, przechyl: 0.12 }), faza: 0, pr: 22 };
    const atak = a.modelAttack;
    if (atak && t < atak.end) {
      const zamach = t < atak.contact;
      if (st.czworonog) return { o: zamach ? z({ poza: 'zamach', sy: 0.86, pochyl: 0.12 }) : z({ poza: 'cios', unos: 2.4, wypad: 3.6, pochyl: -0.1 }), faza: 0, pr: 30 };
      if (st.czar) return { o: z({ poza: { typ: 'czar', a: zamach ? 0 : 1 }, pochyl: zamach ? -0.12 : 0.14 }), faza: 0, pr: 30 };
      if (st.bron) return { o: z({ poza: { typ: 'cios', a: zamach ? -0.9 : 2.1 }, pochyl: zamach ? -0.14 : 0.2, wypad: zamach ? 0 : 1.6 }), faza: 0, pr: 30 };
      return { o: z({ poza: zamach ? 'zamach' : 'cios', pochyl: zamach ? -0.16 : 0.24, wypad: zamach ? 0 : 2, sy: zamach ? 0.95 : 1 }), faza: 0, pr: 30 };
    }
    if (a.vel.lengthSq() > 1 && !a.isDazed(now)) {
      const v = Math.min(2.5, Math.max(0.6, a.vel.length() / 22));
      return { o: z({ chod: 1 }), faza: Math.floor(((t / 1000) * 2.2 * v) % 1 * 4) / 4, pr: 12 };
    }
    const [unos, sy] = HOP[Math.floor(t / 700) % 2];
    return { o: sy === 1 ? base : z({ unos, sy }), faza: 0, pr: 10 };
  }

  private katIdx(yaw: number) { const n = KIERUNKI; return ((((Math.round((yaw / (Math.PI * 2)) * n)) % n) + n) % n) * KROK_K; }

  /** Movement frames of a kind in the background, once (standing + walking at every 2nd direction, then all). */
  private zamowRodzaj(kind: string, st: Stroj, H: number) {
    const id = kind + ':' + H;
    if (this.znane.has(id)) return;
    this.znane.add(id);
    for (const krok of [KROK_K * 4, KROK_K]) for (let k = 0; k < CHIBI.katy; k += krok) {
      const pr = krok === KROK_K * 4 ? 4 : 0.5;
      this.p.klatka(st.o, k, 0, pr + 0.2, H, 'S');
      for (const f of [0, 0.25, 0.5, 0.75]) this.p.klatka(Object.assign({}, st.o, { chod: 1 }), k, f, pr, H, 'S');
    }
  }

  private najblizsza(o: Record<string, unknown>, k: number, faza: number, H: number) {
    const n = CHIBI.katy;
    for (let d = 0; d <= n / 2; d += KROK_K) for (const kk of d ? [k + d, k - d] : [k]) {
      const r = this.p.ma(o, ((kk % n) + n) % n, faza, H, 'S');
      if (r) return r;
    }
    return undefined;
  }

  update(enemies: Slime[], now: number) {
    const view = this.scene.cameras.main.worldView;
    const widac = new Set<Slime>();
    for (const a of enemies) {
      if (!a.active || a.ownLook || a.inAir) continue;
      const st = STROJE_STWOROW[a.kindId];
      if (!st) continue;
      if (a.x < view.x - 80 || a.x > view.right + 80 || a.y < view.y - 80 || a.y > view.bottom + 80) continue;
      widac.add(a);
      const H = this.H(a, st);
      this.zamowRodzaj(a.kindId, st, H);
      let s = this.stany.get(a);
      const atak = a.modelAttack && a.czasModelu(now) < a.modelAttack.end ? a.modelAttack : undefined;
      const yaw = atak ? Math.atan2(Math.cos(atak.aim), Math.sin(atak.aim)) : a.vel.lengthSq() > 1 ? Math.atan2(a.vel.x, a.vel.y) : s?.yaw ?? 0;
      const k = this.katIdx(yaw);
      const { o, faza, pr } = this.poza(a, st, now);
      const kl = this.p.klatka(o, k, faza, pr, H, 'S') ?? this.najblizsza(o, k, faza, H)
        ?? (a.isDead ? undefined : this.p.ma(st.o, k, 0, H, 'S') ?? this.najblizsza(st.o, k, 0, H)) ?? s?.ostatnia;
      if (!kl) continue;
      if (!s) {
        s = { saved: { texture: a.texture.key, frame: a.frame.name, sx: a.scaleX, sy: a.scaleY, ox: a.originX, oy: a.originY, flip: a.flipX }, yaw, k };
        this.stany.set(a, s);
        a.anims.stop();
        a.model3d = true;
        a.modelDeathMs = 700;
        if (a.kind.tint && a.tintTopLeft === a.kind.tint) a.clearTint();
      }
      s.yaw = yaw; s.k = k; s.ostatnia = kl;
      const sc = 0.5;
      if (a.texture.key !== kl.klucz) a.setTexture(kl.klucz);
      a.setScale(sc).setFlipX(false).setOrigin(kl.ox / kl.w, (kl.oy - (8 * SKALA_POSTACI) / sc) / kl.h);
    }
    // Actors that died this frame leave the enemies list but still fade: keep their last pose until destroyed.
    for (const [a, s] of this.stany) {
      if (!a.active) { this.stany.delete(a); continue; }
      if (widac.has(a)) continue;
      if (a.isDead) {
        const st = STROJE_STWOROW[a.kindId]!, H = this.H(a, st);
        const { o } = this.poza(a, st, now);
        const kl = this.p.klatka(o, s.k, 0, 25, H, 'S') ?? s.ostatnia;
        if (kl && a.texture.key !== kl.klucz) a.setTexture(kl.klucz).setOrigin(kl.ox / kl.w, (kl.oy - (8 * SKALA_POSTACI) / 0.5) / kl.h);
      }
    }
  }

  /** Back to the drawn sprites (scene shutdown or switch-off). */
  destroy() {
    for (const [a, s] of this.stany) {
      a.model3d = false;
      if (!a.active) continue;
      const v = s.saved;
      a.setTexture(v.texture, v.frame).setScale(v.sx, v.sy).setOrigin(v.ox, v.oy).setFlipX(v.flip);
      if (a.kind.tint) a.setTint(a.kind.tint);
    }
    this.stany.clear();
  }
}

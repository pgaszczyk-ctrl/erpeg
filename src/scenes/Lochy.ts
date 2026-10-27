// Lochy (content/lochy.ts, src/loch/): na powierzchni – kamienne zejścia na cmentarzach i za co drugą świątynią
// (`LochyWejscia`), pod ziemią – rysunek labiryntu, pochodnie, schody w górę, skrzynia i potwory po komnatach
// (`LochWnetrze`). Samo przejście między mapami i walka robi GameScene (jak przy przejściu Lublin ↔ mapa świata).
import Phaser from 'phaser';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { rng } from '../rng';
import { LOCH, LOCHY, type RodzajLochu } from '../content/lochy';
import { hashLochu, podloga, type PlanLochu } from '../loch/plan';
import type { RodzajWroga } from '../content/fabula';

const M = PX_PER_M;
/** Rysunek lochu: tyle pikseli płótna na piksel mapy (jak postacie – piksel świata to pół piksela mapy). */
const D = 2;

// ============================================================================ powierzchnia

export interface WejscieLochu {
  /** Stałe id (mapa + cmentarz/świątynia). */
  id: string;
  rodzaj: RodzajLochu;
  x: number;
  y: number;
  seed: number;
  /** Nazwa miejsca (świątynia) – do podpisu. */
  przy?: string;
}

function poleRing(r: number[]) {
  let s = 0;
  for (let i = 0; i < r.length; i += 2) {
    const j = (i + 2) % r.length;
    s += r[i] * r[j + 1] - r[j] * r[i + 1];
  }
  return Math.abs(s) / 2;
}

/** Tekstury zejść, pochodni, skrzyni i światła (rysowane kodem – zastępczo, do zamówienia u grafika). */
function tekstury(scene: Phaser.Scene) {
  const tex = scene.textures;
  const plotno = (key: string, w: number, h: number, f: (c: CanvasRenderingContext2D) => void) => {
    if (tex.exists(key)) return;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    f(x);
    tex.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  };
  const ink = '#1e1a24';
  // Krypta: kamienna obudowa schodów w dół (od góry), z małym krzyżem na nadprożu.
  plotno('loch-wej-krypta', 36, 30, (c) => {
    c.fillStyle = ink; c.fillRect(2, 4, 32, 25);
    c.fillStyle = '#8d8e92'; c.fillRect(3, 5, 30, 23);
    c.fillStyle = '#6d6f75'; c.fillRect(3, 24, 30, 4);
    c.fillStyle = '#a8a9ad'; c.fillRect(3, 5, 30, 2);
    c.fillStyle = ink; c.fillRect(8, 9, 20, 17);
    for (let i = 0; i < 4; i++) { c.fillStyle = ['#3d3f45', '#2f3036', '#232429', '#18191d'][i]; c.fillRect(9, 10 + i * 4, 18, 3); }
    c.fillStyle = '#0b0b0e'; c.fillRect(9, 22, 18, 3);
    c.fillStyle = ink; c.fillRect(16, 0, 4, 9); c.fillRect(13, 2, 10, 3);
    c.fillStyle = '#b9b5a8'; c.fillRect(17, 1, 2, 7); c.fillRect(14, 3, 8, 1);
    c.fillStyle = '#5c7a42'; c.fillRect(4, 20, 3, 2); c.fillRect(29, 9, 3, 2);
  });
  // Podziemia: odchylone okute drzwiczki przy murze i ciemny otwór.
  plotno('loch-wej-podziemia', 36, 30, (c) => {
    c.fillStyle = ink; c.fillRect(1, 6, 24, 22);
    c.fillStyle = '#7d6a58'; c.fillRect(2, 7, 22, 20);
    c.fillStyle = ink; c.fillRect(5, 10, 16, 15);
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#2e2620', '#211b16', '#15110e'][i]; c.fillRect(6, 11 + i * 5, 14, 4); }
    // Drzwiczki leżą obok, deski + okucia.
    c.fillStyle = ink; c.fillRect(23, 4, 12, 24);
    c.fillStyle = '#7a4c2a'; c.fillRect(24, 5, 10, 22);
    c.fillStyle = '#5e3a20'; c.fillRect(27, 5, 1, 22); c.fillRect(31, 5, 1, 22);
    c.fillStyle = '#4a4a50'; c.fillRect(24, 9, 10, 2); c.fillRect(24, 21, 10, 2);
    c.fillStyle = '#c9a14a'; c.fillRect(32, 15, 2, 2);
  });
  // Schody w górę (w lochu), od góry: stopnie jaśniejące ku wyjściu.
  plotno('loch-schody', 48, 40, (c) => {
    c.fillStyle = ink; c.fillRect(0, 0, 48, 40);
    for (let i = 0; i < 5; i++) {
      const v = 70 + i * 22;
      c.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      c.fillRect(2, 2 + i * 7, 44, 6);
      c.fillStyle = ink; c.fillRect(2, 8 + i * 7, 44, 1);
    }
    c.fillStyle = '#e8dcbc'; c.fillRect(2, 2, 44, 2);
  });
  // Skrzynia: zamknięta / otwarta.
  plotno('loch-skrzynia', 48, 24, (c) => {
    for (const [ox, otw] of [[0, false], [24, true]] as [number, boolean][]) {
      c.fillStyle = ink; c.fillRect(ox + 1, 6, 22, 17);
      c.fillStyle = '#8a5a2e'; c.fillRect(ox + 2, 11, 20, 11);
      c.fillStyle = '#6b4220'; c.fillRect(ox + 2, 18, 20, 4);
      if (otw) {
        c.fillStyle = '#2a1a0e'; c.fillRect(ox + 2, 7, 20, 5);
        c.fillStyle = '#f2c94c'; c.fillRect(ox + 5, 9, 4, 2); c.fillRect(ox + 12, 8, 5, 3);
        c.fillStyle = ink; c.fillRect(ox + 1, 1, 22, 6);
        c.fillStyle = '#9b6a38'; c.fillRect(ox + 2, 2, 20, 4);
      } else {
        c.fillStyle = '#9b6a38'; c.fillRect(ox + 2, 7, 20, 5);
        c.fillStyle = '#b07a42'; c.fillRect(ox + 2, 7, 20, 1);
      }
      c.fillStyle = '#c9a14a'; c.fillRect(ox + 6, otw ? 2 : 7, 2, otw ? 4 : 15); c.fillRect(ox + 16, otw ? 2 : 7, 2, otw ? 4 : 15);
      c.fillStyle = '#e2c46a'; c.fillRect(ox + 10, 12, 4, 4);
      c.fillStyle = ink; c.fillRect(ox + 11, 13, 2, 2);
    }
  });
  if (tex.exists('loch-skrzynia') && !tex.get('loch-skrzynia').has('z')) {
    tex.get('loch-skrzynia').add('z', 0, 0, 0, 24, 24);
    tex.get('loch-skrzynia').add('o', 0, 24, 0, 24, 24);
  }
  // Pochodnia: uchwyt + płomień (płomień osobno, migocze).
  plotno('loch-pochodnia', 10, 18, (c) => {
    c.fillStyle = ink; c.fillRect(3, 7, 4, 11);
    c.fillStyle = '#6b4a2a'; c.fillRect(4, 8, 2, 9);
    c.fillStyle = '#4a4a50'; c.fillRect(2, 13, 6, 2);
    c.fillStyle = '#ff9a2e'; c.fillRect(3, 2, 4, 6);
    c.fillStyle = '#ffd36a'; c.fillRect(4, 3, 2, 4);
    c.fillStyle = '#fff2c0'; c.fillRect(4, 5, 2, 2);
  });
  // Miękkie światło (ADD).
  if (!tex.exists('loch-swiatlo')) {
    const S = 128, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,190,110,0.9)');
    g.addColorStop(0.35, 'rgba(255,150,70,0.35)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    tex.addCanvas('loch-swiatlo', c);
  }
}

/**
 * Zejścia do lochów wokół bohatera: krypty na cmentarzach (≥ LOCH.cmentarzOdM2) i podziemia za co drugą świątynią
 * (strona budynku przeciwna drzwiom). Liczone raz na cmentarz/świątynię, gdy ich kafelki są wczytane.
 */
export class LochyWejscia {
  private znane = new Map<string, WejscieLochu | null>();
  private obrazki = new Map<string, Phaser.GameObjects.GameObject[]>();
  private nastepne = 0;
  readonly lista: WejscieLochu[] = [];

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    tekstury(scene);
  }

  private cmentarz(a: { id: number; rings: number[][]; x0: number; y0: number; x1: number; y1: number }): WejscieLochu | null {
    if (poleRing(a.rings[0]) / (M * M) < LOCH.cmentarzOdM2) return null;
    const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
    const ok = (x: number, y: number) => this.city.areaKindsAt(x, y).includes('cemetery') && this.city.isFree(x, y, 10, 9);
    const seed = hashLochu(`${this.city.id}:krypta:${a.id}`);
    for (let r = 0; r < 200; r += 6) {
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2 + (seed % 7);
        const x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r;
        if (ok(x, y)) return { id: `${this.city.id}:krypta:${a.id}`, rodzaj: 'krypta', x, y, seed };
        if (!r) break;
      }
    }
    return null;
  }

  private swiatynia(p: { id: string; name: string; door: { x: number; y: number }; building: { x0: number; y0: number; x1: number; y1: number } | null }): WejscieLochu | null {
    const seed = hashLochu(`${this.city.id}:podziemia:${p.id}`);
    if (!p.building || seed % LOCH.kosciolCo !== 0) return null;
    const b = p.building;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1 - 20) / 2;
    const a0 = Math.atan2(cy - p.door.y, cx - p.door.x);
    for (const da of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) {
      const dx = Math.cos(a0 + da), dy = Math.sin(a0 + da);
      // Ze środka na zewnątrz budynku, potem kilka metrów dalej.
      let d = 0;
      while (d < 400 && this.city.buildingAt(cx + dx * d, cy + dy * d)) d += 2;
      for (let e = 4 * M; e < 16 * M; e += 2 * M) {
        const x = cx + dx * (d + e), y = cy + dy * (d + e);
        if (this.city.isFree(x, y, 10, 9)) return { id: `${this.city.id}:podziemia:${p.id}`, rodzaj: 'podziemia', x, y, seed, przy: p.name };
      }
    }
    return null;
  }

  update(px: number, py: number, now: number) {
    if (now < this.nastepne) return;
    this.nastepne = now + 1200;
    const R = LOCH.szukajM * M;
    const box = { x0: px - R, y0: py - R, x1: px + R, y1: py + R };
    for (const a of this.city.query(box).areas) {
      if (a.kind !== 'cemetery') continue;
      const id = `c${a.id}`;
      if (this.znane.has(id) || !this.city.ready(a)) continue;
      this.dodaj(id, this.cmentarz(a));
    }
    for (const p of this.city.places) {
      if (p.kind !== 'church') continue;
      if (Math.abs(p.door.x - px) > R || Math.abs(p.door.y - py) > R) continue;
      const id = `k${p.id}`;
      if (this.znane.has(id) || !this.city.ready({ x0: p.door.x - 60, y0: p.door.y - 60, x1: p.door.x + 60, y1: p.door.y + 60 })) continue;
      this.dodaj(id, this.swiatynia(p));
    }
    // Daleko od bohatera: obrazki zdjęte (wrócą, gdy podejdzie).
    for (const w of this.lista) {
      const blisko = Math.abs(w.x - px) < R * 1.2 && Math.abs(w.y - py) < R * 1.2;
      const ma = this.obrazki.has(w.id);
      if (blisko && !ma) this.pokaz(w);
      else if (!blisko && ma) {
        for (const o of this.obrazki.get(w.id)!) o.destroy();
        this.obrazki.delete(w.id);
      }
    }
  }

  private dodaj(id: string, w: WejscieLochu | null) {
    this.znane.set(id, w);
    if (w && !this.lista.some((q) => Math.hypot(q.x - w.x, q.y - w.y) < 30 * M)) this.lista.push(w);
  }

  private pokaz(w: WejscieLochu) {
    const s = this.scene;
    const img = s.add.image(w.x, w.y, `loch-wej-${w.rodzaj}`).setScale(1 / D).setOrigin(0.5, 0.75).setDepth(w.y - 6);
    // Zimna poświata – żeby zejście było widać z daleka (ADD, powolny oddech).
    const blask = s.add.image(w.x, w.y - 1, 'loch-swiatlo').setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ab8ff).setDisplaySize(40, 30).setDepth(w.y - 7).setAlpha(0.25);
    s.tweens.add({ targets: blask, alpha: { from: 0.12, to: 0.32 }, duration: 1800 + (w.seed % 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.obrazki.set(w.id, [img, blask]);
  }

  /** Zejście w zasięgu ręki (punkt ciosu albo stopy bohatera). */
  przy(x: number, y: number): WejscieLochu | null {
    const r = LOCH.dotykM * M;
    let best: WejscieLochu | null = null, bd = r;
    for (const w of this.lista) {
      const d = Math.hypot(w.x - x, w.y - y);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  destroy() {
    for (const l of this.obrazki.values()) for (const o of l) o.destroy();
    this.obrazki.clear();
  }
}

// ============================================================================ pod ziemią

/** Between the scenes (not saved): where the dungeon's stairs come out, and a defeat down there waiting for the hospital. */
export const lochSesja = {
  powrot: null as { m: string; x: number; y: number; nazwa: string } | null,
  porazka: null as string | null,
};

interface Lokator { kind: RodzajWroga; x: number; y: number; komnata: number; straznik: boolean }

/** Co zostało pokonane w lochu w tej sesji logowania (id lochu → numery potworów, skrzynia). */
const stany = new Map<string, { zabici: Set<number>; skrzynia: boolean; ogloszony: boolean }>();

export interface LochHost {
  scene: Phaser.Scene;
  spawn: (x: number, y: number, kind: RodzajWroga, home: { x: number; y: number; r: number }) => Phaser.GameObjects.Sprite & { isDead: boolean };
  toast: (t: string, ms?: number) => void;
  /** Numer logowania – stan lochu (pokonani, skrzynia) trwa tylko do następnego. */
  nonce: string | number;
}

export class LochWnetrze {
  readonly plan: PlanLochu;
  private img!: Phaser.GameObjects.Image;
  private ciemno!: Phaser.GameObjects.Rectangle;
  private plomienie: { glow: Phaser.GameObjects.Image; fire: Phaser.GameObjects.Image; f: number }[] = [];
  private skrzyniaImg!: Phaser.GameObjects.Image;
  private lokatorzy: Lokator[] = [];
  private zywi = new Map<unknown, number>();
  private stan: { zabici: Set<number>; skrzynia: boolean; ogloszony: boolean };
  private key: string;

  constructor(private h: LochHost, city: CityMap) {
    this.plan = city.loch!;
    this.key = `${h.nonce}|${city.id}`;
    this.stan = stany.get(this.key) ?? { zabici: new Set(), skrzynia: false, ogloszony: false };
    stany.set(this.key, this.stan);
    tekstury(h.scene);
    this.maluj();
    this.planujPotwory();
  }

  get opis() {
    return LOCHY[this.plan.rodzaj];
  }

  /** Środek kratki w px mapy. */
  px(tx: number, ty: number) {
    return { x: (tx + 0.5) * this.plan.T, y: (ty + 0.5) * this.plan.T };
  }

  /** Gdzie staje bohater po zejściu. */
  get start() {
    return this.px(this.plan.start.x, this.plan.start.y);
  }

  get schody() {
    const p = this.px(this.plan.schody.x, this.plan.schody.y);
    return { x: p.x, y: p.y + this.plan.T * 0.5 };
  }

  get skrzynia() {
    return this.px(this.plan.skrzynia.x, this.plan.skrzynia.y);
  }

  private maluj() {
    const p = this.plan, T = p.T, s = this.h.scene;
    const K = this.opis.kolory;
    const r = rng(p.seed ^ 0x5bd1e995);
    const W = p.w * T * D, H = p.h * T * D, t = T * D;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d')!;
    x.fillStyle = '#07070a';
    x.fillRect(0, 0, W, H);
    const pod = (tx: number, ty: number) => podloga(p, tx, ty);
    const scianaKratka = new Set<number>();
    for (const [a, b, cc, d] of p.sciany) for (let ty = b; ty < d; ty++) for (let tx = a; tx < cc; tx++) scianaKratka.add(ty * p.w + tx);
    // 1) Podłoga: płyty (po 2×2 kratki z przesunięciem co drugi rząd), spoiny, pęknięcia, mech/cegła.
    for (let ty = 0; ty < p.h; ty++) for (let tx = 0; tx < p.w; tx++) {
      if (!pod(tx, ty)) continue;
      const X = tx * t, Y = ty * t;
      const blok = ((Math.floor((tx + (Math.floor(ty / 2) % 2)) / 2) * 73856093) ^ (Math.floor(ty / 2) * 19349663)) >>> 0;
      x.fillStyle = K.plyta[blok % K.plyta.length];
      x.fillRect(X, Y, t, t);
      // Drobny szum.
      for (let i = 0; i < 5; i++) {
        x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
        x.fillRect(X + Math.floor(r() * t), Y + Math.floor(r() * t), 2, 2);
      }
      x.fillStyle = K.spoina;
      if (ty % 2 === 0) x.fillRect(X, Y, t, 1);
      if ((tx + (Math.floor(ty / 2) % 2)) % 2 === 0) x.fillRect(X, Y, 1, t);
      if (r() < 0.05) {
        x.fillStyle = 'rgba(10,10,14,0.55)';
        let cx = X + 3 + Math.floor(r() * (t - 6)), cy = Y + 3;
        for (let i = 0; i < 6; i++) { x.fillRect(cx, cy, 1, 2); cx += Math.round(r() * 2 - 1); cy += 2; }
      }
      if (p.rodzaj === 'krypta' && r() < 0.06) {
        x.fillStyle = K.akcent;
        x.fillRect(X + Math.floor(r() * (t - 4)), Y + Math.floor(r() * (t - 3)), 3 + Math.floor(r() * 3), 2);
      }
      // Cień przy ścianie od północy i zachodu (światło z dołu-prawej, jak lico ściany).
      if (!pod(tx, ty - 1)) { x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(X, Y, t, 5); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(X, Y + 5, t, 4); }
      if (!pod(tx - 1, ty)) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(X, Y, 4, t); }
    }
    // 2) Ściany: ciemny wierzch; tam, gdzie pod spodem podłoga – lico z kamieni/cegieł.
    for (let ty = 0; ty < p.h; ty++) for (let tx = 0; tx < p.w; tx++) {
      if (pod(tx, ty) || !scianaKratka.has(ty * p.w + tx)) continue;
      const X = tx * t, Y = ty * t;
      x.fillStyle = K.wierzch;
      x.fillRect(X, Y, t, t);
      if (r() < 0.3) { x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(X + Math.floor(r() * t), Y + Math.floor(r() * t), 3, 2); }
      // Krawędź wierzchu przy podłodze (z każdej strony) – cienka jaśniejsza linia.
      x.fillStyle = 'rgba(255,255,255,0.10)';
      if (pod(tx, ty - 1)) x.fillRect(X, Y, t, 1);
      if (pod(tx - 1, ty)) x.fillRect(X, Y, 1, t);
      if (pod(tx + 1, ty)) x.fillRect(X + t - 1, Y, 1, t);
      if (pod(tx, ty + 1)) {
        // Lico: dolne ~2/3 kratki.
        const hL = Math.round(t * 0.62), yL = Y + t - hL;
        x.fillStyle = '#1e1a24';
        x.fillRect(X, yL - 1, t, 1);
        x.fillStyle = K.lico;
        x.fillRect(X, yL, t, hL);
        x.fillStyle = K.licoCien;
        x.fillRect(X, Y + t - 2, t, 2);
        // Kamienie / cegły.
        const rz = p.rodzaj === 'podziemia' ? 3 : 2;
        const hR = Math.floor(hL / rz);
        for (let i = 0; i < rz; i++) {
          const yy = yL + i * hR;
          x.fillStyle = K.licoCien;
          x.fillRect(X, yy + hR - 1, t, 1);
          const off = (i + tx) % 2 ? Math.floor(t / 2) : 0;
          x.fillRect(X + off, yy, 1, hR);
          if (r() < 0.5) { x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(X + off + 2, yy + 1, Math.floor(t / 3), 1); }
        }
        if (p.rodzaj === 'krypta' && r() < 0.12) { x.fillStyle = K.akcent; x.fillRect(X + Math.floor(r() * (t - 4)), yL + 1, 4, 2); }
      }
    }
    // 3) Ozdoby.
    for (const o of p.ozdoby) {
      const X = o.x * t, Y = o.y * t, ink = '#1e1a24';
      switch (o.co) {
        case 'kosci':
          x.fillStyle = '#d9d2bf';
          x.fillRect(X + 3, Y + 7, 9, 2); x.fillRect(X + 2, Y + 6, 2, 4); x.fillRect(X + 11, Y + 6, 2, 4);
          x.fillRect(X + 6, Y + 11, 2, 4); x.fillRect(X + 5, Y + 3, 6, 2);
          break;
        case 'czaszka':
          x.fillStyle = ink; x.fillRect(X + 4, Y + 4, 9, 9);
          x.fillStyle = '#e4dcc6'; x.fillRect(X + 5, Y + 5, 7, 6); x.fillRect(X + 6, Y + 11, 5, 1);
          x.fillStyle = ink; x.fillRect(X + 6, Y + 7, 2, 2); x.fillRect(X + 9, Y + 7, 2, 2);
          break;
        case 'trumna':
          x.fillStyle = ink; x.fillRect(X + 1, Y + 2, t * 2 - 2, t - 3);
          x.fillStyle = '#5e3a20'; x.fillRect(X + 2, Y + 3, t * 2 - 4, t - 5);
          x.fillStyle = '#74492a'; x.fillRect(X + 2, Y + 3, t * 2 - 4, 3);
          x.fillStyle = '#b9b5a8'; x.fillRect(X + t - 3, Y + 5, 6, 1); x.fillRect(X + t - 1, Y + 4, 2, 5);
          break;
        case 'beczka':
          x.fillStyle = ink; x.fillRect(X + 2, Y + 2, 12, 12);
          x.fillStyle = '#8a5a2e'; x.fillRect(X + 3, Y + 3, 10, 10);
          x.fillStyle = '#4a4a50'; x.fillRect(X + 3, Y + 5, 10, 1); x.fillRect(X + 3, Y + 10, 10, 1);
          x.fillStyle = '#a8763e'; x.fillRect(X + 5, Y + 4, 2, 8);
          break;
        case 'skrzynka':
          x.fillStyle = ink; x.fillRect(X + 2, Y + 3, 12, 11);
          x.fillStyle = '#9b6a38'; x.fillRect(X + 3, Y + 4, 10, 9);
          x.fillStyle = '#6b4220'; x.fillRect(X + 3, Y + 8, 10, 1); x.fillRect(X + 7, Y + 4, 1, 9);
          break;
        case 'pajeczyna': {
          x.fillStyle = 'rgba(230,230,235,0.45)';
          const lewa = o.x === Math.min(...p.komnaty.filter((k) => k.duza && k.y0 === o.y && (k.x0 === o.x || k.x1 - 1 === o.x)).map((k) => k.x0));
          for (let i = 0; i < 12; i++) {
            const a = lewa ? i : t - 1 - i;
            x.fillRect(X + a, Y + i, 1, 1);
            x.fillRect(X + (lewa ? 0 : t - 1), Y + i, 1, 1);
            x.fillRect(X + a, Y, 1, 1);
          }
          for (let i = 3; i < 12; i += 4) for (let j = 0; j <= i; j++) x.fillRect(X + (lewa ? j : t - 1 - j), Y + i - j, 1, 1);
          break;
        }
        case 'kaluza':
          x.fillStyle = 'rgba(40,60,80,0.55)';
          x.fillRect(X + 2, Y + 6, 12, 5); x.fillRect(X + 4, Y + 4, 8, 9);
          x.fillStyle = 'rgba(180,210,230,0.25)'; x.fillRect(X + 5, Y + 6, 3, 1);
          break;
      }
    }
    const key = `loch-${p.rodzaj}-${p.seed}`;
    if (s.textures.exists(key)) s.textures.remove(key);
    s.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.img = s.add.image(0, 0, key).setOrigin(0).setScale(1 / D).setDepth(-1e8);

    // Schody w górę, smuga światła dziennego z góry.
    const sch = this.px(p.schody.x, p.schody.y);
    s.add.image(sch.x, sch.y - T * 0.5, 'loch-schody').setOrigin(0.5, 0).setScale(1 / D).setDepth(-1e8 + 1);
    const dzien = s.add.image(sch.x, sch.y + T * 0.6, 'loch-swiatlo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xdfe8ff).setDisplaySize(T * 5, T * 4).setDepth(1_041_200).setAlpha(0.35);
    s.tweens.add({ targets: dzien, alpha: { from: 0.28, to: 0.4 }, duration: 2600, yoyo: true, repeat: -1 });
    // Skrzynia.
    const sk = this.skrzynia;
    this.skrzyniaImg = s.add.image(sk.x, sk.y + T * 0.4, 'loch-skrzynia', this.stan.skrzynia ? 'o' : 'z').setOrigin(0.5, 1).setScale(1 / D).setDepth(sk.y);
    // Pochodnie na licach ścian.
    for (const q of p.pochodnie) {
      const at = this.px(q.x, q.y);
      const fire = s.add.image(at.x, at.y + T * 0.15, 'loch-pochodnia').setOrigin(0.5, 1).setScale(1 / D).setDepth(at.y + T * 0.5);
      const glow = s.add.image(at.x, at.y + T * 0.6, 'loch-swiatlo').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(T * 9, T * 8).setDepth(1_041_300).setAlpha(0.5);
      this.plomienie.push({ glow, fire, f: r() * 10 });
    }
    // Ciemność poza lampą i pochodniami (nad mgłą wojny, pod światłami).
    this.ciemno = s.add.rectangle(0, 0, 10, 10, 0x05040a, LOCH.ciemnosc).setOrigin(0).setDepth(999_500);
  }

  private planujPotwory() {
    const p = this.plan, O = this.opis, T = p.T;
    const r = rng(p.seed ^ 0x2545f491);
    p.komnaty.forEach((k, i) => {
      if (!k.duza || k.wejscie) return;
      const kinds: { kind: RodzajWroga; straznik: boolean }[] = [];
      if (k.skarb) {
        kinds.push({ kind: O.straznik, straznik: true });
        for (const o of O.obstawa) kinds.push({ kind: o, straznik: false });
      } else {
        if (r() > LOCH.szansaGrupy) return;
        const [a, b] = LOCH.wKomnacie;
        const ile = Math.round(a + (b - a) * (0.25 + 0.75 * k.glebokosc) * (0.6 + 0.4 * r()));
        for (let j = 0; j < ile; j++) kinds.push({ kind: O.potwory[Math.floor(r() * O.potwory.length)], straznik: false });
      }
      for (const q of kinds) {
        for (let t = 0; t < 20; t++) {
          const tx = k.x0 + 1 + Math.floor(r() * Math.max(1, k.x1 - k.x0 - 2));
          const ty = k.y0 + 1 + Math.floor(r() * Math.max(1, k.y1 - k.y0 - 2));
          if (!podloga(p, tx, ty)) continue;
          if (this.lokatorzy.some((l) => Math.hypot(l.x - (tx + 0.5) * T, l.y - (ty + 0.5) * T) < T * 1.5) && t < 15) continue;
          const at = q.straznik ? this.px(k.cx, k.cy) : this.px(tx, ty);
          this.lokatorzy.push({ kind: q.kind, x: at.x, y: at.y, komnata: i, straznik: q.straznik });
          break;
        }
      }
    });
    this.lokatorzy.forEach((l, i) => {
      if (this.stan.zabici.has(i)) return;
      const k = p.komnaty[l.komnata];
      const R = Math.max(k.x1 - k.x0, k.y1 - k.y0) * T * 0.9 + 4 * T;
      const e = this.h.spawn(l.x, l.y, l.kind, { x: (k.cx + 0.5) * T, y: (k.cy + 0.5) * T, r: R });
      this.zywi.set(e, i);
    });
  }

  /** Ilu potworów jeszcze nie pokonano. */
  get zostalo() {
    return this.lokatorzy.length - this.stan.zabici.size;
  }

  /** Strażnicy skrzyni (komnata skarbu) wciąż żyją? */
  private skrzyniaPilnowana() {
    return this.lokatorzy.some((l, i) => this.plan.komnaty[l.komnata].skarb && !this.stan.zabici.has(i));
  }

  /** GameScene: ten potwór padł (true = był z lochu). */
  zabity(e: unknown) {
    const i = this.zywi.get(e);
    if (i === undefined) return false;
    this.zywi.delete(e);
    this.stan.zabici.add(i);
    const k = this.lokatorzy[i].komnata;
    const komnataPusta = !this.lokatorzy.some((l, j) => l.komnata === k && !this.stan.zabici.has(j));
    if (this.plan.komnaty[k].skarb && komnataPusta) this.h.toast('🧰 Strażnik pokonany – skrzynia stoi otworem!', 3200);
    else if (!this.zostalo && !this.stan.ogloszony) {
      this.stan.ogloszony = true;
      this.h.toast('🏆 Loch oczyszczony!', 3200);
    }
    return true;
  }

  /** Zbliżył się do skarbca – raz ostrzega. */
  private ostrzegl = false;

  /** Co jest w zasięgu ręki: schody albo skrzynia. */
  przy(x: number, y: number): 'schody' | 'skrzynia' | null {
    const r = LOCH.dotykM * M;
    const s = this.schody, k = this.skrzynia;
    if (Math.hypot(s.x - x, s.y - y) < r) return 'schody';
    if (Math.hypot(k.x - x, k.y - y) < r) return 'skrzynia';
    return null;
  }

  /** Skrzynię można otworzyć? null = tak; inaczej powód. */
  skrzyniaPowod(): string | null {
    if (this.stan.skrzynia) return 'pusta';
    if (this.skrzyniaPilnowana()) return 'pilnowana';
    return null;
  }

  otworzSkrzynie() {
    this.stan.skrzynia = true;
    this.skrzyniaImg.setFrame('o');
  }

  /** `znane`: the fog of war knows this spot (an unexplored room's torch doesn't shine through the dark). */
  update(now: number, cam: Phaser.Cameras.Scene2D.Camera, hero: { x: number; y: number }, znane: (x: number, y: number) => boolean = () => true) {
    const v = cam.worldView;
    this.ciemno.setPosition(v.x - 20, v.y - 20).setSize(v.width + 40, v.height + 40);
    const t = now / 1000;
    for (const q of this.plomienie) {
      const on = q.fire.x > v.x - 60 && q.fire.x < v.right + 60 && q.fire.y > v.y - 60 && q.fire.y < v.bottom + 60 && znane(q.fire.x, q.fire.y + this.plan.T);
      q.glow.setVisible(on);
      if (!on) continue;
      const m = 0.5 * Math.sin(t * 7.1 + q.f) + 0.3 * Math.sin(t * 13.3 + q.f * 2) + (Math.random() - 0.5) * 0.3;
      q.glow.setAlpha(0.42 + m * 0.1);
      q.fire.setScale((1 / D) * (1 + m * 0.04), (1 / D) * (1 + m * 0.08));
    }
    if (!this.ostrzegl && this.skrzyniaPilnowana()) {
      const k = this.skrzynia;
      if (Math.hypot(k.x - hero.x, k.y - hero.y) < 14 * this.plan.T) {
        this.ostrzegl = true;
        this.h.toast('☠ Coś wielkiego pilnuje tu skrzyni…', 2800);
      }
    }
  }

  destroy() {
    this.img?.destroy();
  }
}

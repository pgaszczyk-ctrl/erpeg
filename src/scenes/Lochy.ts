// Lochy (content/lochy.ts, src/loch/): na powierzchni – kamienne zejścia na cmentarzach i za co drugą świątynią
// (`LochyWejscia`), pod ziemią – rysunek labiryntu, pochodnie, schody w górę, skrzynia i potwory po komnatach
// (`LochWnetrze`). Samo przejście między mapami i walka robi GameScene (jak przy przejściu Lublin ↔ mapa świata).
import Phaser from 'phaser';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { rng } from '../rng';
import { LOCH, LOCHY, LOCH_TEKSTY, POZIOMY_LOCHU, PUKANIE, type RodzajLochu } from '../content/lochy';
import { KLATEK_ZEJSCIA, obrazZejscia, plotnoKurzu, plotnoPoswiaty, type ObrazZejscia } from '../loch/zejscieObraz';
import { KATY_PIKSELOWE } from '../gen/budynki';
import { pukanie } from '../sfx';
import { hashLochu, podloga, type PlanLochu } from '../loch/plan';
import type { RodzajWroga } from '../content/fabula';
import { pasekWyjsciaZLochu } from '../ui/lochWyjscie';

const M = PX_PER_M;
/** Rysunek lochu: tyle pikseli płótna na piksel mapy (jak postacie – piksel świata to pół piksela mapy). */
const D = 2;

/** Zejścia rysowane kodem w pikselach świata (src/loch/zejscieObraz.ts): skala 1/2, zaczepione na progu. */
const SKALA_ZEJSCIA = 1 / D;
const OBRAZY_ZEJSC = new Map<string, ObrazZejscia>();
/** Texture of one entrance look (kind × one of the 8 pixel angles × which side is the front), made once per page. */
function teksturaZejscia(scene: Phaser.Scene, rodzaj: RodzajLochu, kat: number, przod: 1 | -1): { key: string; o: ObrazZejscia } {
  const key = `loch-zejscie-${rodzaj}-${kat}-${przod > 0 ? 'p' : 'l'}`;
  let o = OBRAZY_ZEJSC.get(key);
  if (!o) { o = obrazZejscia(rodzaj, kat, przod); OBRAZY_ZEJSC.set(key, o); }
  if (!scene.textures.exists(key)) {
    const t = scene.textures.addCanvas(key, o.canvas);
    t?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (let k = 0; k < KLATEK_ZEJSCIA; k++) t?.add(k, 0, k * o.w, 0, o.w, o.h);
  }
  return { key, o };
}

/** Lines that set an entrance's angle (roads and paths; not water, rails or boundaries). */
const LINIE_KIERUNKU = /^(major|medium|minor|service|pedestrian|path|footway|track|steps|cycleway|residential|living_street)$/;

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
  /** Turned like the nearest wall or road: index in KATY_PIKSELOWE and the side the front faces (set when first shown). */
  kat?: number;
  przod?: 1 | -1;
  /** A mission stage's own entrance (Etap typ 'loch'): which mission and stage, the dungeon's name and guardian. */
  misja?: { id: string; etap: number; nazwa?: string; straznik?: RodzajWroga };
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
  if (!tex.exists('loch-kurz')) {
    const t = tex.addCanvas('loch-kurz', plotnoKurzu());
    t?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    t?.add(0, 0, 0, 0, 10, 8); t?.add(1, 0, 10, 0, 10, 8);
  }
  if (!tex.exists('loch-poswiata')) tex.addCanvas('loch-poswiata', plotnoPoswiaty())?.setFilter(Phaser.Textures.FilterMode.NEAREST);
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
  // Jaskinia (siedliska): skalny pagór z czarną szczeliną, mech i kości u wejścia.
  plotno('loch-wej-jaskinia', 44, 34, (c) => {
    const skala = ['#4e4438', '#6b5b48', '#857259', '#9c8668'];
    c.fillStyle = ink; c.beginPath(); c.ellipse(22, 20, 21, 14, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = skala[1]; c.beginPath(); c.ellipse(22, 20, 20, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = skala[2]; c.beginPath(); c.ellipse(19, 16, 15, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = skala[3]; c.fillRect(10, 9, 9, 2); c.fillRect(26, 11, 6, 2);
    c.fillStyle = skala[0]; c.fillRect(32, 22, 8, 3); c.fillRect(4, 24, 6, 3);
    // Szczelina.
    c.fillStyle = ink; c.beginPath(); c.ellipse(22, 25, 10, 8, 0, Math.PI, 0); c.fill(); c.fillRect(12, 25, 20, 5);
    c.fillStyle = '#0b0a09'; c.beginPath(); c.ellipse(22, 25, 8.5, 6.5, 0, Math.PI, 0); c.fill(); c.fillRect(13.5, 25, 17, 4);
    c.fillStyle = '#5c7a42'; c.fillRect(6, 15, 4, 2); c.fillRect(34, 15, 3, 2); c.fillRect(15, 7, 3, 1);
    c.fillStyle = '#d9d2bf'; c.fillRect(31, 30, 4, 1); c.fillRect(33, 29, 1, 3);
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
  // Schody w dół: stopnie ciemniejące w głąb (czarna czeluść u góry).
  plotno('loch-w-dol', 48, 40, (c) => {
    c.fillStyle = ink; c.fillRect(0, 0, 48, 40);
    for (let i = 0; i < 5; i++) {
      const v = 18 + i * 17;
      c.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
      c.fillRect(3, 3 + i * 7, 42, 6);
      c.fillStyle = ink; c.fillRect(3, 9 + i * 7, 42, 1);
    }
    c.fillStyle = '#050407'; c.fillRect(3, 3, 42, 5);
    c.fillStyle = '#8d877a'; c.fillRect(0, 0, 3, 40); c.fillRect(45, 0, 3, 40);
    c.fillStyle = '#5d584f'; c.fillRect(2, 0, 1, 40); c.fillRect(45, 0, 1, 40);
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

/** Luźna ściana (ukryte zejście): kawał lica w kolorach lochu, 3 klatki – cała, popękana, ledwo się trzyma. */
function teksturaGruzu(scene: Phaser.Scene, rodzaj: RodzajLochu) {
  const key = `loch-gruz-${rodzaj}`;
  if (scene.textures.exists(key)) return key;
  const K = LOCHY[rodzaj].kolory, ink = '#1e1a24', W = 48, H = 44;
  const c = document.createElement('canvas');
  c.width = W * 3;
  c.height = H;
  const x = c.getContext('2d')!;
  const r = rng(hashLochu(key));
  for (let k = 0; k < 3; k++) {
    const o = k * W;
    x.fillStyle = ink; x.fillRect(o, 0, W, H);
    x.fillStyle = K.wierzch; x.fillRect(o + 1, 0, W - 2, 12);
    x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(o + 1, 11, W - 2, 1);
    x.fillStyle = ink; x.fillRect(o, 12, W, 1);
    x.fillStyle = K.lico; x.fillRect(o + 1, 13, W - 2, H - 14);
    x.fillStyle = K.licoCien; x.fillRect(o + 1, H - 3, W - 2, 2);
    // Kamienie w rzędach (jak lico ściany), trochę krzywo – luźno ułożone.
    for (let rz = 0; rz < 4; rz++) {
      const yy = 13 + rz * 7;
      x.fillStyle = K.licoCien; x.fillRect(o + 1, yy + 6, W - 2, 1);
      for (let xx = (rz % 2) * 6 + 2; xx < W - 2; xx += 11 + Math.floor(r() * 3)) x.fillRect(o + xx, yy, 1, 7);
      if (r() < 0.8) { x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(o + 4 + Math.floor(r() * 30), yy + 1, 6, 1); }
    }
    // Ledwo widoczna rysa (podpowiedź dla uważnych), potem coraz więcej pęknięć i ubytków.
    const rysa = (n: number) => {
      x.fillStyle = 'rgba(8,8,12,0.75)';
      let cx = o + 14 + Math.floor(r() * 20), cy = 14;
      for (let i = 0; i < n; i++) { x.fillRect(cx, cy, 1, 2); cx += Math.round(r() * 2 - 1); cy += 2; if (cy > H - 4) break; }
    };
    rysa(5);
    if (k >= 1) { rysa(12); rysa(9); x.fillStyle = '#0b0a0d'; x.fillRect(o + 18, 27, 6, 4); }
    if (k >= 2) { rysa(14); rysa(14); x.fillStyle = '#060508'; x.fillRect(o + 8, 20, 7, 5); x.fillRect(o + 28, 33, 9, 5); x.fillRect(o + 22, 16, 5, 3); }
  }
  const t = scene.textures.addCanvas(key, c);
  t?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (let k = 0; k < 3; k++) t?.add(k, 0, k * W, 0, W, H);
  return key;
}

/**
 * Zejścia do lochów wokół bohatera: krypty na cmentarzach (≥ LOCH.cmentarzOdM2) i podziemia za co drugą świątynią
 * (strona budynku przeciwna drzwiom). Liczone raz na cmentarz/świątynię, gdy ich kafelki są wczytane.
 */
export class LochyWejscia {
  private znane = new Map<string, WejscieLochu | null>();
  private obrazki = new Map<string, Phaser.GameObjects.GameObject[]>();
  private nastepne = 0;
  /** Per shown entrance: next knock, last knock, doors open (1) and when they last changed. */
  private stan = new Map<string, { nast: number; puk: number; otw: number; zmiana: number }>();
  readonly lista: WejscieLochu[] = [];

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    tekstury(scene);
  }

  private cmentarz(a: { id: number; rings: number[][]; x0: number; y0: number; x1: number; y1: number }): WejscieLochu | null {
    if (poleRing(a.rings[0]) / (M * M) < LOCH.cmentarzOdM2) return null;
    const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
    const ok = (x: number, y: number) => this.city.areaKindsAt(x, y).includes('cemetery') && this.miejsce(x, y);
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

  private swiatynia(p: { id: string; name: string; door: { x: number; y: number }; building: { x0: number; y0: number; x1: number; y1: number; rings: number[][] } | null }): WejscieLochu | null {
    const seed = hashLochu(`${this.city.id}:podziemia:${p.id}`);
    if (!p.building || LOCH.bezKatakumb.test(p.name) || !p.building.rings?.length) return null;
    if (poleRing(p.building.rings[0]) / (M * M) < LOCH.kosciolOdM2) return null;
    const b = p.building;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1 - 20) / 2;
    const a0 = Math.atan2(cy - p.door.y, cx - p.door.x);
    const wejscie = (x: number, y: number): WejscieLochu => ({ id: `${this.city.id}:podziemia:${p.id}`, rodzaj: 'podziemia', x, y, seed, przy: p.name });
    // Najpierw za świątynią (strona przeciwna drzwiom), potem coraz bardziej z boku – aż do frontu; każda duża świątynia
    // ma katakumby (właściciel), więc szukamy miejsca dookoła, a w ostateczności obok drzwi.
    const katy = [0];
    for (let k = 1; k <= 8; k++) katy.push(k * 0.39, -k * 0.39);
    for (const da of katy) {
      const dx = Math.cos(a0 + da), dy = Math.sin(a0 + da);
      // Ze środka na zewnątrz budynku, potem kilka metrów dalej.
      let d = 0;
      while (d < 400 && this.city.buildingAt(cx + dx * d, cy + dy * d)) d += 2;
      for (let e = 3 * M; e < 40 * M; e += 2 * M) {
        const x = cx + dx * (d + e), y = cy + dy * (d + e);
        if (this.miejsce(x, y)) return wejscie(x, y);
      }
    }
    for (let r = 4 * M; r < 30 * M; r += 3 * M) for (let k = 0; k < 12; k++) {
      const x = p.door.x + Math.cos((k / 12) * Math.PI * 2) * r, y = p.door.y + Math.sin((k / 12) * Math.PI * 2) * r;
      if (this.miejsce(x, y)) return wejscie(x, y);
    }
    return null;
  }

  /** Room for the entrance and for the hero standing by it (owner's test: a hatch squeezed between the cathedral and its
   * neighbour left no room for him – the game pushed him back onto the street). */
  private miejsce(x: number, y: number) {
    const c = this.city;
    for (let dy = -18; dy <= 22; dy += 4) for (let dx = -16; dx <= 16; dx += 4) if (c.isBlocked(x + dx, y + dy)) return false;
    return true;
  }

  update(px: number, py: number, now: number) {
    this.zywe(px, py, now);
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
        this.stan.delete(w.id);
      }
    }
  }

  private dodaj(id: string, w: WejscieLochu | null) {
    this.znane.set(id, w);
    if (w && !this.lista.some((q) => Math.hypot(q.x - w.x, q.y - w.y) < 30 * M)) this.lista.push(w);
  }

  addTutorial(w: WejscieLochu) {
    if (!this.lista.some(q => q.id === w.id)) { this.lista.push(w); this.pokaz(w); }
  }

  /** A mission stage's entrance (Etap typ 'loch'): shown at once, even next to an ordinary one. */
  dodajMisyjne(w: WejscieLochu) {
    this.usun(w.id);
    this.lista.unshift(w);
    this.pokaz(w);
  }

  /** A settlement's cave (src/siedliska): one fixed entrance per camp, shown like the others when the hero is near. */
  dodajSiedliskowe(w: WejscieLochu) {
    if (!this.lista.some((q) => q.id === w.id)) this.lista.push(w);
  }

  /** Takes an entrance away (a mission stage that is over). */
  usun(id: string) {
    const i = this.lista.findIndex((q) => q.id === id);
    if (i >= 0) this.lista.splice(i, 1);
    for (const o of this.obrazki.get(id) ?? []) o.destroy();
    this.obrazki.delete(id);
    this.stan.delete(id);
  }

  /** The nearest spot within ~40 m of (x, y) with room for an entrance and the hero by it (null: none). */
  wolneMiejsce(x: number, y: number): { x: number; y: number } | null {
    if (this.miejsce(x, y)) return { x, y };
    for (let r = 4; r < 40 * M; r += 4) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r;
      if (this.miejsce(qx, qy)) return { x: qx, y: qy };
    }
    return null;
  }

  private pokaz(w: WejscieLochu) {
    const s = this.scene;
    if (w.rodzaj === 'jaskinia') {
      // Skalny otwór jaskini (siedliska) – bez klapy i bez pukania.
      const img = s.add.image(w.x, w.y, 'loch-wej-jaskinia').setOrigin(0.5, 0.82).setScale(0.75).setDepth(w.y + 2);
      const blask = s.add.image(w.x, w.y - 1, 'loch-swiatlo').setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ab8ff).setDisplaySize(40, 30).setDepth(w.y - 7).setAlpha(0.25);
      s.tweens.add({ targets: blask, alpha: { from: 0.12, to: 0.32 }, duration: 1800 + (w.seed % 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.obrazki.set(w.id, [img, blask]);
      return;
    }
    if (w.kat === undefined) this.ustaw(w);
    const { key, o } = teksturaZejscia(s, w.rodzaj, w.kat!, w.przod!);
    const img = s.add.image(w.x, w.y, key, 0).setOrigin(o.srX / o.w, o.srY / o.h).setScale(SKALA_ZEJSCIA).setDepth(w.y);
    // Zimna poświata w pikselach (twarde pasma) nad szczeliną klapy – oddycha powoli.
    const [sx, sy] = this.szczelina(w);
    const blask = s.add.image(sx, sy, 'loch-poswiata').setScale(SKALA_ZEJSCIA).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x8ab8ff).setDepth(w.y + 0.5).setAlpha(0.25);
    s.tweens.add({ targets: blask, alpha: { from: 0.14, to: 0.36 }, duration: 1800 + (w.seed % 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.obrazki.set(w.id, [img, blask]);
    // Pierwsze pukanie wkrótce po pojawieniu się, potem każde zejście w swoim rytmie.
    this.stan.set(w.id, { nast: s.time.now + 1500 + (w.seed % 2500), puk: -1e9, otw: 0, zmiana: 0 });
  }

  /**
   * Turns the entrance like the world around it (owner, 21 Nov 2026: „pochyl do kąta świata/drogi/budynku”): the nearest
   * building wall or road within 30 m gives the axis, snapped to the 8 pixel angles of buildings. Next to a wall the
   * front faces away from it, next to a road towards it; never straight north (the back wall would hide the hatch).
   */
  private ustaw(w: WejscieLochu) {
    const R = 30 * M;
    const q = this.city.query({ x0: w.x - R, y0: w.y - R, x1: w.x + R, y1: w.y + R });
    let best = R, ang = 0, nx = 0, ny = 1, odSciany = true;
    const odcinek = (ax: number, ay: number, bx: number, by: number, sciana: boolean) => {
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      if (L < 1) return;
      const t = Math.max(0, Math.min(1, ((w.x - ax) * dx + (w.y - ay) * dy) / L));
      const cx = ax + t * dx, cy = ay + t * dy, d = Math.hypot(w.x - cx, w.y - cy);
      // A wall counts a bit nearer than a road: the entrance belongs to its building.
      const dd = sciana ? d * 0.8 : d;
      if (dd >= best) return;
      best = dd; ang = Math.atan2(dy, dx); nx = w.x - cx; ny = w.y - cy; odSciany = sciana;
    };
    for (const b of q.buildings) for (const r of b.rings) for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      odcinek(r[i], r[i + 1], r[j], r[j + 1], true);
    }
    for (const l of q.lines) {
      if (!LINIE_KIERUNKU.test(l.kind)) continue;
      for (let i = 0; i + 3 < l.pts.length; i += 2) odcinek(l.pts[i], l.pts[i + 1], l.pts[i + 2], l.pts[i + 3], false);
    }
    let deg = ((ang * 180) / Math.PI % 180 + 180) % 180, kat = 0, bd = 999;
    KATY_PIKSELOWE.forEach((k, i) => { for (const kk of [k, k + 180]) { const d = Math.abs(deg - kk); if (d < bd) { bd = d; kat = i; } } });
    const a = (KATY_PIKSELOWE[kat] * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    // Front normal for przod = 1 is (−uy, ux); which way do we want it?
    const chce = best < R ? (odSciany ? 1 : -1) * Math.sign(-uy * nx + ux * ny || 1) : 1;
    let przod = (chce >= 0 ? 1 : -1) as 1 | -1;
    if (ux * przod < -0.2) przod = (-przod) as 1 | -1;
    w.kat = kat;
    w.przod = przod;
  }

  /** Środek szczeliny między skrzydłami klapy (piksele mapy). */
  private szczelina(w: WejscieLochu): [number, number] {
    const { o } = teksturaZejscia(this.scene, w.rodzaj, w.kat ?? 0, w.przod ?? 1);
    return [w.x + (o.szczX - o.srX) * SKALA_ZEJSCIA, w.y + (o.szczY - o.srY) * SKALA_ZEJSCIA];
  }

  /** Klapy otwierają się przy bohaterze; z dala zejście co kilka sekund puka (drgnięcie, błysk, kurz, dźwięk). */
  private zywe(px: number, py: number, now: number) {
    const cam = this.scene.cameras.main.worldView;
    const blisko = PUKANIE.otwartaM * M;
    for (const w of this.lista) {
      const ob = this.obrazki.get(w.id);
      const st = this.stan.get(w.id);
      if (!ob || !st) continue;
      const img = ob[0] as Phaser.GameObjects.Image;
      const d = Math.hypot(w.x - px, w.y - py);
      // Otwieranie/zamykanie przez klatkę „uchylone”.
      const cel = d < blisko ? 1 : 0;
      if (cel !== st.otw) { st.otw = cel; st.zmiana = now; }
      const przejscie = now - st.zmiana < 130;
      let klatka = st.otw ? (przejscie ? 2 : 3) : (przejscie && st.zmiana ? 2 : 0);
      let dy = 0;
      const t = now - st.puk;
      if (!st.otw && t >= 0 && t < 320) {
        klatka = 1;
        if (t < 70 || (t >= 170 && t < 240)) dy = -SKALA_ZEJSCIA;
      }
      if (String(img.frame.name) !== String(klatka)) img.setFrame(klatka);
      img.y = w.y + dy;
      if (st.otw || now < st.nast) continue;
      st.nast = now + (PUKANIE.coOdS + Math.random() * (PUKANIE.coDoS - PUKANIE.coOdS)) * 1000;
      const naEkranie = w.x > cam.x - 20 && w.x < cam.right + 20 && w.y > cam.y - 20 && w.y < cam.bottom + 30;
      const slychac = d < PUKANIE.slychacM * M && !document.hidden;
      if (!naEkranie && !slychac) continue;
      st.puk = now;
      if (slychac) {
        const glos = PUKANIE.glosnosc * Math.pow(1 - d / (PUKANIE.slychacM * M), 1.5);
        pukanie(glos, (w.x - px) / (15 * M));
      }
      if (naEkranie) this.kurz(w);
    }
  }

  /** Dwa obłoczki kurzu ze szczeliny, unoszą się i znikają. */
  private kurz(w: WejscieLochu) {
    const s = this.scene;
    const [sx, sy] = this.szczelina(w);
    for (const [ox, op] of [[-4, 0], [3, 170]] as const) {
      const c = s.add.image(sx + ox, sy, 'loch-kurz', 0).setScale(SKALA_ZEJSCIA).setDepth(w.y + 1).setAlpha(0);
      s.tweens.add({
        targets: c, delay: op, y: sy - 7, x: sx + ox * 1.6, alpha: { from: 0.85, to: 0 }, duration: 750, ease: 'Sine.easeOut',
        onUpdate: (tw) => { if (tw.progress > 0.5 && String(c.frame.name) !== '1') c.setFrame(1); },
        onComplete: () => c.destroy(),
      });
    }
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
    this.stan.clear();
  }
}

// ============================================================================ pod ziemią

/** Between the scenes (not saved): where the dungeon's stairs come out, and a defeat down there waiting for the hospital. */
export const lochSesja = {
  powrot: null as { m: string; x: number; y: number; nazwa: string } | null,
  /** Down in a mission stage's dungeon: which mission/stage (its chest completes the stage). */
  misja: null as WejscieLochu['misja'] | null,
  porazka: null as string | null,
};

interface Lokator { kind: RodzajWroga; x: number; y: number; komnata: number; straznik: boolean }

/** Co zostało pokonane w lochu w tej sesji logowania (id lochu → numery potworów, skrzynia). */
interface StanLochu { zabici: Set<number>; skrzynia: boolean; ogloszony: boolean; /** Ciosy w luźną ścianę i czy już runęła. */ sciana: number; odkryte: boolean }
const stany = new Map<string, StanLochu>();

export interface LochHost {
  scene: Phaser.Scene;
  /** Use the existing surface transition, keeping the character and entrance position. */
  wyjdz: () => void;
  /** The escape button (shown PRZYCISK s after arriving): asks, then runs up to the surface. */
  uciekaj: () => void;
  spawn: (x: number, y: number, kind: RodzajWroga, home: { x: number; y: number; r: number }) => Phaser.GameObjects.Sprite & { isDead: boolean; hp: number; power?: number };
  toast: (t: string, ms?: number) => void;
  /** Numer logowania – stan lochu (pokonani, skrzynia) trwa tylko do następnego. */
  nonce: string | number;
  /** Persistent progress only for the character's tutorial instance. */
  progress?: { killed: number[]; chest: boolean };
  /** A mission dungeon's own name and chest guardian (Etap.loch). */
  nazwa?: string;
  straznik?: RodzajWroga;
}

export class LochWnetrze {
  readonly plan: PlanLochu;
  private img!: Phaser.GameObjects.Image;
  private ciemno!: Phaser.GameObjects.Rectangle;
  private plomienie: { glow: Phaser.GameObjects.Image; fire: Phaser.GameObjects.Image; f: number }[] = [];
  private skrzyniaImg!: Phaser.GameObjects.Image;
  private skrzyniaPuls!: Phaser.GameObjects.Image;
  private lokatorzy: Lokator[] = [];
  private zywi = new Map<unknown, number>();
  private stan: StanLochu;
  private gruz?: Phaser.GameObjects.Image;
  private key: string;
  private wyjscie: ReturnType<typeof pasekWyjsciaZLochu>;

  constructor(private h: LochHost, city: CityMap) {
    this.plan = city.loch!;
    this.key = `${h.nonce}|${city.id}`;
    this.stan = h.progress ? { zabici: new Set(h.progress.killed), skrzynia: h.progress.chest, ogloszony: false, sciana: 0, odkryte: false } : stany.get(this.key) ?? { zabici: new Set(), skrzynia: false, ogloszony: false, sciana: 0, odkryte: false };
    stany.set(this.key, this.stan);
    tekstury(h.scene);
    this.maluj();
    this.planujPotwory();
    // Prologue: the old shortcut once the floor is clear. Every other dungeon: an escape button POZIOMY_LOCHU.przyciskPoS
    // seconds after arriving (owner, 24 Nov 2026), asking first and running up with a short animation.
    this.wyjscie = pasekWyjsciaZLochu(() => {
      if (this.plan.tutorial) { if (this.zostalo === 0) this.h.wyjdz(); }
      else this.h.uciekaj();
    });
    if (this.plan.tutorial) this.wyjscie.ustawOczyszczony(this.zostalo === 0);
    else h.scene.time.delayedCall(POZIOMY_LOCHU.przyciskPoS * 1000, () => this.wyjscie.ustawOczyszczony(true));
    h.scene.events.once('shutdown', () => this.destroy());
  }

  get opis() {
    const o = LOCHY[this.plan.rodzaj];
    if (!this.h.nazwa && !this.h.straznik) return o;
    // Getters (nazwa/wejscie in the player's language) don't survive a spread, so the base is read field by field.
    return { nazwa: this.h.nazwa ?? o.nazwa, wejscie: o.wejscie, wezly: o.wezly, potwory: o.potwory, straznik: this.h.straznik ?? o.straznik, obstawa: o.obstawa, kolory: o.kolory, nagroda: o.nagroda };
  }

  /** Name with the level („Krypta pod cmentarzem · poziom -2”). */
  get nazwaPoziomu() {
    return this.plan.poziom > 1 ? `${this.opis.nazwa} · ${LOCH_TEKSTY.poziom(this.plan.poziom)}` : this.opis.nazwa;
  }

  /** Stairs down: the ordinary ones, or the hidden ones once their loose wall is down (null otherwise). */
  get zejscie() {
    const p = this.plan;
    if (p.zejscie) { const q = this.px(p.zejscie.x, p.zejscie.y); return { x: q.x, y: q.y + p.T * 0.5 }; }
    if (p.ukryte && this.stan.odkryte) { const q = this.px(p.ukryte.x, p.ukryte.y); return { x: q.x, y: q.y + p.T * 0.4 }; }
    return null;
  }

  /** The loose wall's middle while it still stands. */
  private get srodekGruzu() {
    const u = this.plan.ukryte;
    if (!u || this.stan.odkryte) return null;
    return { x: (u.x + 0.5) * this.plan.T, y: u.y * this.plan.T + this.plan.T * 0.3 };
  }

  /**
   * A blow (melee point, or the hero standing next to it) or a shot at the loose wall: it takes POZIOMY_LOCHU.ciosowSciany
   * hits whatever the damage – no name, no life bar, it never strikes back. true = the wall was hit.
   */
  uderzSciane(x: number, y: number, hx?: number, hy?: number): boolean {
    const c = this.srodekGruzu, img = this.gruz;
    if (!c || !img) return false;
    const T = this.plan.T;
    const d = Math.min(Math.hypot(x - c.x, y - c.y), hx === undefined ? Infinity : Math.hypot(hx - c.x, hy! - c.y - T * 0.6));
    if (d > T * 2.6) return false;
    const s = img.scene;
    this.stan.sciana++;
    pukanie(0.9);
    const x0 = img.x;
    s.tweens.killTweensOf(img);
    img.setX(x0);
    s.tweens.add({ targets: img, x: { from: x0 - 1, to: x0 + 1 }, duration: 40, yoyo: true, repeat: 2, onComplete: () => img.setX(x0) });
    this.kurz(c.x, c.y + T * 0.8, 3);
    if (this.stan.sciana < POZIOMY_LOCHU.ciosowSciany) {
      img.setFrame(Math.min(2, this.stan.sciana));
      this.h.toast(LOCH_TEKSTY.scianaPeka, 1400);
      return true;
    }
    this.stan.odkryte = true;
    s.cameras.main.shake(220, 0.004);
    this.kurz(c.x, c.y + T * 0.6, 8);
    s.tweens.add({ targets: img, scaleY: 0, alpha: 0, y: img.y + 2, duration: 420, ease: 'Quad.In', onComplete: () => img.destroy() });
    this.gruz = undefined;
    this.h.toast(LOCH_TEKSTY.scianaOdkryta, 3200);
    return true;
  }

  /** Little dust puffs (the entrances' dust texture). */
  private kurz(x: number, y: number, n: number) {
    const s = this.h.scene;
    for (let i = 0; i < n; i++) {
      const p = s.add.image(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 4, 'loch-kurz', i % 2).setScale(0.5).setDepth(y + 2).setAlpha(0.9);
      s.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 14, y: p.y - 4 - Math.random() * 8, alpha: 0, scale: 0.9, duration: 500 + Math.random() * 400, onComplete: () => p.destroy() });
    }
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
      if (p.rodzaj === 'jaskinia') {
        // Skała: plamy po 3×3 kratki bez spoin, drobne kamyki, gdzieniegdzie mokry połysk.
        const pl = ((Math.floor(tx / 3) * 73856093) ^ (Math.floor(ty / 3) * 19349663)) >>> 0;
        x.fillStyle = K.plyta[pl % K.plyta.length];
        x.fillRect(X, Y, t, t);
        for (let i = 0; i < 4; i++) {
          x.fillStyle = r() < 0.5 ? K.plyta[(pl + 1 + i) % K.plyta.length] : K.spoina;
          x.fillRect(X + Math.floor(r() * (t - 3)), Y + Math.floor(r() * (t - 2)), 2 + Math.floor(r() * 3), 2);
        }
        if (r() < 0.04) { x.fillStyle = 'rgba(150,200,220,0.18)'; x.fillRect(X + 2, Y + 4, t - 5, 3); }
        if (!pod(tx, ty - 1)) { x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(X, Y, t, 5); }
        if (!pod(tx - 1, ty)) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(X, Y, 4, t); }
        continue;
      }
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
        if (p.rodzaj === 'jaskinia') {
          // Lico skały: nieregularne bryły zamiast cegieł.
          for (let i = 0; i < 5; i++) {
            x.fillStyle = r() < 0.5 ? K.licoCien : 'rgba(255,240,210,0.10)';
            x.fillRect(X + Math.floor(r() * (t - 4)), yL + Math.floor(r() * (hL - 3)), 3 + Math.floor(r() * 5), 2 + Math.floor(r() * 2));
          }
          if (r() < 0.1) { x.fillStyle = K.akcent; x.fillRect(X + Math.floor(r() * (t - 4)), yL + 1, 4, 2); }
          continue;
        }
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
        case 'stalagmit':
          x.fillStyle = ink; x.fillRect(X + 5, Y + 2, 6, 13); x.fillRect(X + 3, Y + 10, 10, 5);
          x.fillStyle = '#7d6b55'; x.fillRect(X + 6, Y + 3, 4, 11); x.fillRect(X + 4, Y + 11, 8, 3);
          x.fillStyle = '#a08a6c'; x.fillRect(X + 6, Y + 3, 1, 10);
          x.fillStyle = '#4e4134'; x.fillRect(X + 9, Y + 6, 1, 8);
          break;
        case 'krysztal':
          x.fillStyle = ink; x.fillRect(X + 3, Y + 4, 10, 10);
          x.fillStyle = '#5fc7c0'; x.fillRect(X + 4, Y + 8, 3, 5); x.fillRect(X + 7, Y + 5, 3, 8); x.fillRect(X + 10, Y + 9, 2, 4);
          x.fillStyle = '#c6fff6'; x.fillRect(X + 8, Y + 6, 1, 4); x.fillRect(X + 5, Y + 9, 1, 2);
          x.fillStyle = 'rgba(120,255,230,0.18)'; x.fillRect(X, Y + 2, t, t - 2);
          break;
        case 'grzybki':
          for (const [dx, dy] of [[3, 9], [8, 6], [11, 10]]) {
            x.fillStyle = '#d8d0b8'; x.fillRect(X + dx + 1, Y + dy + 2, 1, 3);
            x.fillStyle = '#9fe36a'; x.fillRect(X + dx, Y + dy, 3, 2);
            x.fillStyle = 'rgba(160,255,110,0.25)'; x.fillRect(X + dx - 2, Y + dy - 2, 7, 6);
          }
          break;
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
    // Schody w dół (najdalsza komnata poziomu nad ostatnim) i ukryte za luźną ścianą.
    if (p.zejscie) {
      const z = this.px(p.zejscie.x, p.zejscie.y);
      s.add.image(z.x, z.y - T * 0.5, 'loch-w-dol').setOrigin(0.5, 0).setScale(1 / D).setDepth(-1e8 + 1);
    }
    if (p.ukryte) {
      const u = this.px(p.ukryte.x, p.ukryte.y);
      const top = p.ukryte.y * T - T * 0.6;
      s.add.image(u.x, top, 'loch-w-dol').setOrigin(0.5, 0).setScale(1 / D).setDepth(-1e8 + 1);
      if (!this.stan.odkryte) {
        const key = teksturaGruzu(s, p.rodzaj);
        this.gruz = s.add.image(u.x, top - 2, key, Math.min(2, this.stan.sciana)).setOrigin(0.5, 0).setScale(1 / D).setDepth(top + 20);
      }
    }
    // Skrzynia (tylko na ostatnim zwykłym i ukrytym poziomie).
    const sk = this.skrzynia;
    this.skrzyniaImg = s.add.image(sk.x, sk.y + T * 0.4, 'loch-skrzynia', this.stan.skrzynia ? 'o' : 'z').setOrigin(0.5, 1).setScale(1 / D).setDepth(sk.y).setVisible(p.maSkrzynie);
    // A warm pulse round the chest while it can be opened (guardian beaten, not opened yet).
    this.skrzyniaPuls = s.add.image(sk.x, sk.y + T * 0.1, 'loch-swiatlo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc65a).setDisplaySize(T * 4.5, T * 3.4).setDepth(sk.y - 0.5).setVisible(false);
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
      if (p.tutorial) {
        kinds.push({ kind: 'glut', straznik: false });
      } else if (k.skarb && p.maSkrzynie) {
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
      // Jaskinia pod wielkim obozem: groźniejsza niż krypta (właściciel: „trudniejsze potworki”) – życie i ciosy ×1,4.
      // Niżej położone poziomy – coraz groźniej; ukryty najgroźniej.
      const moc = (p.rodzaj === 'jaskinia' && !p.tutorial ? 1.4 : 1) * (1 + POZIOMY_LOCHU.mocNaPoziom * (p.poziom - 1)) * (p.ukrytyPoziom ? POZIOMY_LOCHU.mocUkrytego : 1);
      if (moc !== 1) { e.power = (e.power ?? 1) * moc; e.hp = Math.max(1, Math.round(e.hp * moc)); }
      this.zywi.set(e, i);
    });
  }

  /** Ilu potworów jeszcze nie pokonano. */
  get zostalo() {
    return this.lokatorzy.length - this.stan.zabici.size;
  }

  /** Strażnicy skrzyni (komnata skarbu) wciąż żyją? */
  private skrzyniaPilnowana() {
    return this.plan.maSkrzynie && this.lokatorzy.some((l, i) => this.plan.komnaty[l.komnata].skarb && !this.stan.zabici.has(i));
  }

  /** GameScene: ten potwór padł (true = był z lochu). */
  zabity(e: unknown) {
    const i = this.zywi.get(e);
    if (i === undefined) return false;
    this.zywi.delete(e);
    this.stan.zabici.add(i);
    if (this.plan.tutorial) this.wyjscie.ustawOczyszczony(this.zostalo === 0);
    if (this.h.progress && !this.h.progress.killed.includes(i)) this.h.progress.killed.push(i);
    const k = this.lokatorzy[i].komnata;
    const komnataPusta = !this.lokatorzy.some((l, j) => l.komnata === k && !this.stan.zabici.has(j));
    if (this.plan.komnaty[k].skarb && komnataPusta) this.h.toast(LOCH_TEKSTY.straznikPokonany, 3200);
    else if (!this.zostalo && !this.stan.ogloszony) {
      this.stan.ogloszony = true;
      this.h.toast(LOCH_TEKSTY.oczyszczony, 3200);
    }
    return true;
  }

  /** Tutorial adapter; the ordinary dungeon uses exactly the same generator and monsters. */
  get firstChamber() {
    return this.plan.komnaty.map((k, i) => ({ k, i })).filter(q => !q.k.wejscie)
      .sort((a,b) => a.k.glebokosc-b.k.glebokosc || a.i-b.i)[0];
  }
  get magicSpot() { const k = this.firstChamber.k; return this.px(k.cx, k.cy); }
  get firstGroupCleared() { return !this.lokatorzy.some((l, i) => l.komnata === this.firstChamber.i && !this.stan.zabici.has(i)); }
  contains(e: unknown) { return this.zywi.has(e); }

  /** Zbliżył się do skarbca – raz ostrzega. */
  private ostrzegl = false;

  /** Co jest w zasięgu ręki: schody w górę, zejście w głąb albo skrzynia. */
  przy(x: number, y: number): 'schody' | 'zejscie' | 'skrzynia' | null {
    const r = LOCH.dotykM * M;
    const s = this.schody, k = this.skrzynia, z = this.zejscie;
    if (Math.hypot(s.x - x, s.y - y) < r) return 'schody';
    if (z && Math.hypot(z.x - x, z.y - y) < r) return 'zejscie';
    if (this.plan.maSkrzynie && Math.hypot(k.x - x, k.y - y) < r) return 'skrzynia';
    return null;
  }

  /** Skrzynię można otworzyć? null = tak; inaczej powód ('brak' = ten poziom nie ma skrzyni). */
  skrzyniaPowod(): string | null {
    if (!this.plan.maSkrzynie) return 'brak';
    if (this.stan.skrzynia) return 'pusta';
    if (this.skrzyniaPilnowana()) return 'pilnowana';
    return null;
  }

  otworzSkrzynie(anim = false) {
    this.stan.skrzynia = true;
    if (this.h.progress) this.h.progress.chest = true;
    const img = this.skrzyniaImg, s = img.scene, sc = 1 / D;
    if (!anim) { img.setFrame('o'); this.skrzyniaPuls.setVisible(false); return; }
    // Shakes, squashes and bursts open with a flash (owner, 22 Nov 2026: „z animacją, dźwiękiem, pulsowaniem”).
    const x0 = img.x;
    s.tweens.add({ targets: img, x: { from: x0 - 0.8, to: x0 + 0.8 }, duration: 45, yoyo: true, repeat: 4, onComplete: () => {
      img.setX(x0);
      s.tweens.add({ targets: img, scaleY: sc * 0.82, scaleX: sc * 1.12, duration: 90, yoyo: true, onYoyo: () => img.setFrame('o'), onComplete: () => img.setScale(sc) });
      const ring = s.add.image(img.x, img.y - this.plan.T * 0.5, 'lup-pierscien').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setDepth(img.depth + 1).setScale(0.2);
      s.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      s.tweens.add({ targets: this.skrzyniaPuls, alpha: { from: 1, to: 0 }, duration: 900, onComplete: () => this.skrzyniaPuls.setVisible(false) });
    } });
  }

  /** Where the chest's things come out from (its open lid). */
  get wylotSkrzyni() {
    return { x: this.skrzyniaImg.x, y: this.skrzyniaImg.y - this.plan.T * 0.6 };
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
    {
      const czeka = this.plan.maSkrzynie && !this.stan.skrzynia && !this.skrzyniaPilnowana() && !this.skrzyniaPuls.scene.tweens.isTweening(this.skrzyniaPuls);
      if (czeka) {
        const k = this.skrzynia;
        const widac = k.x > v.x - 40 && k.x < v.right + 40 && k.y > v.y - 40 && k.y < v.bottom + 40 && znane(k.x, k.y);
        this.skrzyniaPuls.setVisible(widac);
        if (widac) {
          const p = 0.5 + 0.5 * Math.sin(t * 4.2);
          this.skrzyniaPuls.setAlpha(0.35 + 0.45 * p);
          this.skrzyniaImg.setScale((1 / D) * (1 + 0.04 * p));
        }
      } else if (!this.stan.skrzynia) this.skrzyniaPuls.setVisible(false);
    }
    if (!this.ostrzegl && this.skrzyniaPilnowana()) {
      const k = this.skrzynia;
      if (Math.hypot(k.x - hero.x, k.y - hero.y) < 14 * this.plan.T) {
        this.ostrzegl = true;
        this.h.toast(LOCH_TEKSTY.straznik, 2800);
      }
    }
  }

  destroy() {
    this.img?.destroy();
    this.wyjscie?.usun();
  }
}

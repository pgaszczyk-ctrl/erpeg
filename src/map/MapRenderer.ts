import Phaser from 'phaser';
import { SKALA_SWIATA } from '../skala';
import { CityMap, PX_PER_M, distToPolyline, type Area, type Line, type Building } from './CityMap';
import { AREA_FILL, ROAD_FILL } from './drawCity';
import { GORY } from '../content/gory';
import { PODLOZE_PLIKI, DACHY_PLIKI, SKALA_PLIKOW, SCIANY, LATARNIE, KOMINY, ZIELEN, DEKORACJE } from '../content/swiat';
import { DZIELENIE, POZIOMY } from '../content/budynki';
import { SKALA_POSTACI } from '../skala';
import { Wysokie } from './Wysokie';
import { MIESZKANCY } from '../content/mieszkancy';
import { plazaLandmark } from './landmarks';
import { OSTROSC } from '../screen';
import { pixelate } from '../art';
import { WYGLAD_09, mapaRodzajow, rysujZiemie, ziemiaWTle, przygotujRysunkiUpraw } from './Podloze09';
import { GEN_DOTS, type Budynek09, type Pole09 } from './ziemia09';
import { STAN } from './drzewa09';
import { POLA, miesiacUpraw } from '../content/pola';
import { idRosliny, ksztaltBudynku, type WielkoscMiasta } from '../gen';
import { Korony, type Korona } from './Korony';
import { peronyWOkolicy } from './perony';
import { MOZAIKI } from '../content/mozaiki';
import type { Mozaika09 } from './mozaika09';
import type { Peron09 } from './dworzec09';
import { ruryPrzyUlicy, type Rura09 } from './rury09';
import { architekturaTest2Aktywna, srodowiskoTest2 } from '../test2/mode';

export { AREA_FILL, ROAD_FILL };

// Draws the city in square chunks (canvas textures) around the camera, in a
// cartoon top-down style. Chunks are drawn on demand and recycled.

const CHUNK = 512; // px
/**
 * Canvas pixels per map pixel in the map chunks: 2 on sharp screens (OSTROSC),
 * so the artist's 3× graphics keep twice the detail and roof edges and lamps
 * aren't blown-up blocks next to the detailed characters; 1 on slow phones.
 * The 09 look always gets at least GEN_DOTS (2): the generator paints 2 picture px per map px and
 * at 1 every other one was dropped – roofs came out ~3× coarser than the characters (owner, 6 Oct
 * 2026, GESTOSC_PIKSELI.md: "gigantyczny dysonans między postaciami a budynkami").
 */
const DOTS = WYGLAD_09 ? Math.max(OSTROSC, GEN_DOTS) : OSTROSC;
/**
 * The map lies under everything. Sprites are sorted by their y, and parts of
 * the Lublin map (around Jastków, Nałęczów…) have negative y: at −1000 the
 * hero and townsfolk slipped under the map there and vanished.
 */
export const GROUND_DEPTH = -1e8;
/**
 * How many painted chunks (each CHUNK×DOTS square, 4 MB at DOTS 2) may exist at once. Phones lost
 * the picture ("WebGL context lost" on screen) with 12 of them plus everything else (~75 MB of
 * textures), so: 8, and 6 on phones that report little memory. Painting reaches only a quarter
 * chunk past the view, so 4–6 are needed while walking.
 */
const LOW_MEMORY = typeof navigator !== 'undefined' && ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
const MAX_CHUNKS = DOTS > 1 ? (LOW_MEMORY ? 6 : 8) : 16;
const CAR_ROADS = new Set(['major', 'medium', 'minor', 'pedestrian', 'service']);
/**
 * Does a street object at (x, y) beside line `own` stand on (or right by)
 * another road? Dual carriageways are two parallel lines merged into one
 * paved road: their inner edges are the middle of the road, not a pavement.
 */
function onOtherRoad(m: CityMap, own: Line, x: number, y: number) {
  const r = 12 * PX_PER_M;
  for (const l of m.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }).lines) {
    if (l === own || !CAR_ROADS.has(l.kind) || l.bridge) continue;
    if (distToPolyline(l.pts, x, y) <= l.width / 2 + 2.5 * PX_PER_M) return true;
  }
  return false;
}
/** Snaps a map coordinate to the chunk's canvas pixels. */
const snap = (v: number) => Math.round(v * DOTS) / DOTS;
/** The characters' outline colour (1 px #1e1a24 in the artist's sheets): map edges use it too, thin, so it all looks one style. */
const OUTLINE = '#1e1a24';
/** Outline widths in map px (a character's outline pixel is ~0.36 map px). */
const EDGE = { dach: 0.7, podstawa: 1, sciany: 0.6, droga: 0.8, obszar: 0.7 };

// One earthen track for roads, pavements and paths alike.
const TRACK_FILL = '#d9ab72';
const TRACK_EDGE = '#8f6034';
/** Drawn width: a bit wider than the real road so near-parallel paths merge. */
function trackWidth(l: Line) {
  return Math.max(l.width, 3 * PX_PER_M) + 3 * PX_PER_M;
}
const ROOFS = ['#c75b4a', '#b5553c', '#a9644a', '#8d6e63', '#a1887f', '#7b8794', '#9c6b4e', '#6d7b8a', '#b0714f'];

function patternCanvas(size: number, draw: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  return c;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePatterns(ctx: CanvasRenderingContext2D) {
  const p = (size: number, draw: (c: CanvasRenderingContext2D) => void) => ctx.createPattern(patternCanvas(size, draw), 'repeat')!;
  const speckles = (c: CanvasRenderingContext2D, base: string, dots: string[], n: number, seed: number, size: number) => {
    c.fillStyle = base;
    c.fillRect(0, 0, size, size);
    const r = seeded(seed);
    for (let i = 0; i < n; i++) {
      c.fillStyle = dots[i % dots.length];
      c.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1, 2);
    }
  };
  return {
    // Soft cobblestones for the streets: staggered rows of rounded stones.
    paved: p(16, (c) => {
      c.fillStyle = '#b9ad98';
      c.fillRect(0, 0, 16, 16);
      const r = seeded(21);
      for (let row = 0; row < 4; row++) {
        for (let col = -1; col < 4; col++) {
          const x = col * 4 + (row % 2 ? 2 : 0);
          const y = row * 4;
          c.fillStyle = ['#cbbfa8', '#c3b79f', '#d2c7b1'][Math.floor(r() * 3)];
          c.fillRect(x + 0.5, y + 0.5, 3, 3);
          c.fillStyle = 'rgba(255,255,255,0.18)';
          c.fillRect(x + 0.5, y + 0.5, 3, 1);
        }
      }
    }),
    grass: p(64, (c) => speckles(c, '#6abe30', ['#4b9a2a', '#8fd44f', '#5aad2c'], 70, 3, 64)),
    park: p(64, (c) => {
      speckles(c, '#7ccf45', ['#5aad2c', '#9be067'], 60, 5, 64);
      const r = seeded(9);
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(r() * 60) + 2, y = Math.floor(r() * 60) + 2;
        c.fillStyle = i % 2 ? '#ffffff' : '#ff6b9a';
        c.fillRect(x - 1, y, 3, 1);
        c.fillRect(x, y - 1, 1, 3);
        c.fillStyle = '#fbf236';
        c.fillRect(x, y, 1, 1);
      }
    }),
    forest: p(48, (c) => {
      c.fillStyle = '#35803a';
      c.fillRect(0, 0, 48, 48);
      for (const [x, y] of [[12, 12], [36, 12], [24, 30], [0, 30], [48, 30], [12, 48], [36, 48], [12, -0], [36, 0]]) {
        c.fillStyle = OUTLINE;
        c.beginPath();
        c.arc(x, y, 11, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2f7a2f';
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#44a044';
        c.beginPath();
        c.arc(x - 2, y - 2, 6, 0, Math.PI * 2);
        c.fill();
      }
    }),
    water: p(64, (c) => {
      c.fillStyle = '#3f8fd8';
      c.fillRect(0, 0, 64, 64);
      const r = seeded(21);
      for (let i = 0; i < 10; i++) {
        c.fillStyle = i % 3 ? '#8ccaf7' : '#2f6fb3';
        c.fillRect(Math.floor(r() * 58), Math.floor(r() * 62), 5 + Math.floor(r() * 4), 1);
      }
    }),
    farmland: p(32, (c) => {
      c.fillStyle = '#c8d77a';
      c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#b3c264';
      for (let y = 0; y < 32; y += 8) c.fillRect(0, y, 32, 2);
    }),
    plaza: p(16, (c) => {
      c.fillStyle = '#dccfb2';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#c4b594';
      c.fillRect(0, 0, 16, 1);
      c.fillRect(0, 8, 16, 1);
      c.fillRect(0, 0, 1, 8);
      c.fillRect(8, 8, 1, 8);
    }),
    cemetery: p(32, (c) => {
      c.fillStyle = '#6aa84f';
      c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#b8bcc4';
      for (const [x, y] of [[6, 6], [22, 6], [14, 20], [30, 20]]) {
        c.fillRect(x, y, 4, 6);
        c.fillStyle = '#8a8e96';
        c.fillRect(x, y + 5, 4, 1);
        c.fillStyle = '#b8bcc4';
      }
    }),
    outside: p(48, (c) => {
      c.fillStyle = '#1f4d24';
      c.fillRect(0, 0, 48, 48);
      for (const [x, y] of [[12, 12], [36, 12], [24, 30], [0, 30], [48, 30], [12, 48], [36, 48], [12, 0], [36, 0]]) {
        c.fillStyle = '#163a1a';
        c.beginPath();
        c.arc(x, y, 11, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#285e2d';
        c.beginPath();
        c.arc(x - 2, y - 2, 7, 0, Math.PI * 2);
        c.fill();
      }
    }),
  };
}

/**
 * An artist's object sheet (lamp, chimney, decorations) shrunk to map size (null when there is no file).
 * In the 09 look each of its `frames` is turned into world pixels (area average, world palette, hard alpha,
 * 1 px outline – `pixelate` in art.ts): smoothly shrunk, the gas lamps were a blur (owner, 6 Oct 2026).
 */
function artSheet(scene: Phaser.Scene, file: string, frames = 1): HTMLCanvasElement | null {
  const key = `swiat-${file}`;
  if (!scene.textures.exists(key)) return null;
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  if (WYGLAD_09) {
    const fw = Math.floor(img.width / frames);
    const parts = Array.from({ length: frames }, (_, i) => {
      const f = document.createElement('canvas');
      f.width = fw;
      f.height = img.height;
      f.getContext('2d')!.drawImage(img, i * fw, 0, fw, img.height, 0, 0, fw, img.height);
      return pixelate(f, DOTS / SKALA_PLIKOW);
    });
    c.width = parts[0].width * frames;
    c.height = parts[0].height;
    const g = c.getContext('2d')!;
    parts.forEach((p, i) => g.drawImage(p, i * parts[0].width, 0));
    return c;
  }
  c.width = Math.round((img.width * DOTS) / SKALA_PLIKOW);
  c.height = Math.round((img.height * DOTS) / SKALA_PLIKOW);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Pattern transform from the chunk's canvas pixels back to map pixels. */
const UNDOTS = new DOMMatrix().scaleSelf(1 / DOTS);

/** The runs of a polyline whose segments touch the box (a long railway: only the part near a chunk). */
function clipLine(pts: number[], x0: number, y0: number, x1: number, y1: number): number[][] {
  const out: number[][] = [];
  let run: number[] | null = null;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
    const inside = Math.max(ax, bx) >= x0 && Math.min(ax, bx) <= x1 && Math.max(ay, by) >= y0 && Math.min(ay, by) <= y1;
    if (!inside) { run = null; continue; }
    if (!run) out.push((run = [ax, ay]));
    run.push(bx, by);
  }
  return out;
}

/** Is (x, y) inside the ring (even–odd rule)? */
function pointIn(r: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function night() {
  const h = new Date().getHours();
  const n = MIESZKANCY.noc;
  return n.od > n.do ? h >= n.od || h < n.do : h >= n.od && h < n.do;
}

/** Signed area of a ring (> 0: its outward normal of edge (dx, dy) is (dy, −dx) in screen coordinates). */
function ringArea(r: number[]) {
  let a = 0;
  for (let i = 0; i < r.length; i += 2) {
    const j = (i + 2) % r.length;
    a += r[i] * r[j + 1] - r[j] * r[i + 1];
  }
  return a / 2;
}

/** Where a roof texture sits on a building: turned to its longest wall, offset by its seed (cached per building). */
const roofTf = new WeakMap<Building, DOMMatrix>();
function roofTransform(b: Building): DOMMatrix {
  let m = roofTf.get(b);
  if (m) return m;
  const r = b.rings[0];
  let best = -1, ang = 0;
  for (let i = 0; i < r.length; i += 2) {
    const j = (i + 2) % r.length;
    const dx = r[j] - r[i], dy = r[j + 1] - r[i + 1];
    const len = dx * dx + dy * dy;
    if (len > best) [best, ang] = [len, Math.atan2(dy, dx)];
  }
  m = new DOMMatrix().translateSelf(r[0], r[1]).rotateSelf((ang * 180) / Math.PI).translateSelf(b.seed % 17, (b.seed >> 5) % 13);
  roofTf.set(b, m);
  return m;
}

type Patterns = ReturnType<typeof makePatterns> & Record<string, CanvasPattern>;

/** The artist's texture `swiat-<file>` shrunk to the map's size, as a repeating pattern (null when there is no file). */
function artPattern(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, file: string): CanvasPattern | null {
  const key = `swiat-${file}`;
  if (!scene.textures.exists(key)) return null;
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((img.width * DOTS) / SKALA_PLIKOW));
  c.height = Math.max(1, Math.round((img.height * DOTS) / SKALA_PLIKOW));
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  const pat = ctx.createPattern(c, 'repeat');
  pat?.setTransform(UNDOTS);
  return pat;
}

/** Bounding boxes of rings (cached), so a chunk skips the ones that miss it. */
const ringBox = new WeakMap<number[], [number, number, number, number]>();
/** The chunk being painted (with a margin); rings outside it are skipped. */
let clip: { x0: number; y0: number; x1: number; y1: number } | null = null;

function boxOf(r: number[]) {
  let b = ringBox.get(r);
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < b[0]) b[0] = r[i];
      if (r[i + 1] < b[1]) b[1] = r[i + 1];
      if (r[i] > b[2]) b[2] = r[i];
      if (r[i + 1] > b[3]) b[3] = r[i + 1];
    }
    ringBox.set(r, b);
  }
  return b;
}

/**
 * Traces rings (an outline and its holes). Rings that don't reach the chunk
 * being painted are skipped: they change nothing in it, and the merged street
 * areas have thousands of building holes, which made each chunk slow to draw.
 */
function ringsPath(ctx: CanvasRenderingContext2D, rings: number[][], dx = 0, dy = 0) {
  ctx.beginPath();
  for (const r of rings) {
    if (clip) {
      const b = boxOf(r);
      if (b[2] + dx < clip.x0 || b[0] + dx > clip.x1 || b[3] + dy < clip.y0 || b[1] + dy > clip.y1) continue;
    }
    ctx.moveTo(r[0] + dx, r[1] + dy);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i] + dx, r[i + 1] + dy);
    ctx.closePath();
  }
}

function linePath(ctx: CanvasRenderingContext2D, pts: number[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
}

/** Wall heights (px) of the three kinds of buildings: a ground floor, a taller one, a very big one. */
// ×SKALA_SWIATA: in the bigger-world look buildings grow in height as well as footprint (more window rows).
export const WYSOKOSCI_SCIAN = { parter: 4 * SKALA_SWIATA, wyzszy: 6 * SKALA_SWIATA, duzy: 8 * SKALA_SWIATA };
/** Walls lean this much to the right per px of height, so the east side of every building shows too (bug report 11). */
export const WALL_SKEW = 0.35;

/**
 * Overhaul 09 (owner, 6 Oct 2026, GENERATOR_SWIATA 13a): game levels instead of storeys – 1–3 storeys = 1 level, 4–14 = 2,
 * 15+ = 3; a level is 16–24 px of the mock-up (by the footprint's size), scaled so buildings keep the mock-up's proportion to
 * the characters (content/budynki.ts POZIOMY). `poziom` in generator px, `h` (the wall) in map px.
 */
const ksztalty = new WeakMap<Building, { poziomy: number; poziom: number; h: number }>();
export function ksztalt09(b: Building) {
  let k = ksztalty.get(b);
  if (k) return k;
  const r = b.rings[0] ?? [];
  let a = 0;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) a += r[j] * r[i + 1] - r[i] * r[j + 1];
  const m2 = Math.abs(a) / 2 / (PX_PER_M * PX_PER_M);
  const f = (56 * 0.36 * SKALA_POSTACI * GEN_DOTS) / POZIOMY.wzorBohatera;
  const { poziomy, poziom } = ksztaltBudynku(b.levels || 1, m2);
  const p = Math.max(10, Math.round(poziom * f));
  k = { poziomy, poziom: p, h: (poziomy * p) / GEN_DOTS };
  if (r.length) ksztalty.set(b, k);
  return k;
}

/** Overhaul 09: walls stand on the footprint and the roof juts out to the north (else walls hang south of it, over the street). */
export const WALLS_UP = WYGLAD_09;

export function wallHeight(b: Building) {
  if (WYGLAD_09) return ksztalt09(b).h;
  // Low walls (they are drawn over the street to the south), whatever the
  // map says about storeys: only three heights, so nothing hides the streets.
  const l = b.levels || 1;
  return l <= 1 ? WYSOKOSCI_SCIAN.parter : l === 2 ? WYSOKOSCI_SCIAN.wyzszy : WYSOKOSCI_SCIAN.duzy;
}

// Texture keys must be unique for the whole game, across scene restarts.
let textureCounter = 0;
const czasyKawalkow: number[] = [];
/** Overhaul 09: from asking for a chunk to seeing it (ms), background ground included. */
const czasyCalosci: number[] = [];
const czasyWorker: number[] = [];
Object.assign(window, { __czasyKawalkow: czasyKawalkow, __czasyCalosci: czasyCalosci });

interface Chunk {
  key: string;
  tex: Phaser.Textures.CanvasTexture;
  img: Phaser.GameObjects.Image;
  /** Which request for its ground (overhaul 09) the chunk waits for; older answers are dropped. */
  ver?: number;
  /** Latest request whose pixels have reached the canvas texture. */
  paintedVer?: number;
  error?: Error;
  /** Overhaul 09: the tree crowns standing in this chunk (sprites, sorted by depth with the characters). */
  crowns?: Korona[];
  /** Overhaul 09: steam puffs from the platform pipes and gauges. */
  steam?: Phaser.GameObjects.Image[];
  /** Overhaul 09: ripe vegetables on fields in this chunk (map px), picked by walking over them. */
  zbior?: Uprawa09[];
  /** Their pictures (GameScene's onRipe), taken away with the chunk. */
  ripe?: Phaser.GameObjects.Image[];
  /** Overhaul 09: tall buildings reaching this chunk (shown as their own sprites by Wysokie). */
  wysokie?: Budynek09[];
}

/** A ripe vegetable on a field (src/gen/pola.ts): where (map px), what goes into the backpack, its id (generator px). */
export interface Uprawa09 { id: string; x: number; y: number; veg: string; /** The ripe plant's picture (uprawa_<k>.png), when the artist drew one. */ k?: string }



export class MapRenderer {
  private chunks = new Map<string, Chunk>();
  private free: Chunk[] = [];
  /** Test2 reports allocated pixel storage; this is not total browser/GPU memory. */
  diagnostics() {
    const chunks = [...this.chunks.values(), ...this.free];
    const high = this.wysokie.diagnostics();
    return {
      chunks: this.chunks.size,
      allocatedChunks: chunks.length,
      maxChunks: MAX_CHUNKS,
      pendingChunks: [...this.chunks.values()].filter(c => c.paintedVer !== c.ver).length,
      chunkRgbaBytes: chunks.reduce((sum, c) => sum + c.tex.width * c.tex.height * 4, 0),
      crowns: chunks.reduce((sum, c) => sum + (c.crowns?.length ?? 0), 0),
      steam: chunks.reduce((sum, c) => sum + (c.steam?.length ?? 0), 0),
      buildings: high.count,
      pendingBuildings: high.pending,
      buildingRgbaBytes: high.rgbaBytes,
      workerBuildingCacheMaxBytes: 12_000_000 * Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1)),
      paintMs: [...czasyKawalkow],
      readyMs: [...czasyCalosci],
      computeMs: [...czasyWorker],
    };
  }
  private patterns?: Patterns;
  /** Buildings with special roof/wall colours (missions, shops, schools). */
  highlight = new Map<Building, { roof: string; wall: string }>();

  /** Chunks drawn before a map tile arrived: redrawn in place (kept visible meanwhile). */
  private stale = new Set<string>();

  /** City size for the buildings' steampunk (GENERATOR_SWIATA 0.10): Lublin is big; a station town by how many places it has; world maps medium. */
  private get miasto(): WielkoscMiasta {
    if (this.map.id === 'lublin') return 'duze';
    if (this.map.id.startsWith('w:')) return 'srednie';
    return this.map.places.length > 150 ? 'srednie' : 'wies';
  }

  constructor(private scene: Phaser.Scene, private map: CityMap) {
    this.korony = new Korony(scene);
    this.wysokie = new Wysokie(scene, this.korony);
    const off = map.onTile((b) => {
      // Walls hang up to ~60 px below a footprint: one chunk of margin.
      for (let cx = Math.floor(b.x0 / CHUNK) - 1; cx <= Math.floor(b.x1 / CHUNK) + 1; cx++)
        for (let cy = Math.floor(b.y0 / CHUNK) - 1; cy <= Math.floor(b.y1 / CHUNK) + 1; cy++)
          if (this.chunks.has(`${cx},${cy}`)) this.stale.add(`${cx},${cy}`);
    });
    scene.events.once('shutdown', () => {
      off();
      this.destroy();
    });
  }

  /** Frees the chunk textures (the scene is going away). */
  destroy() {
    for (const c of [...this.chunks.values(), ...this.free]) {
      this.dropCrowns(c);
      c.img.destroy();
      this.scene.textures.remove(c.tex);
    }
    this.chunks.clear();
    this.free = [];
    this.wysokie.destroy();
  }

  /** Draws the chunks around the camera; call every frame. */
  update(cam: Phaser.Cameras.Scene2D.Camera, budget = 2) {
    const v = cam.worldView;
    const want: [number, number, number][] = [];
    const M = CHUNK / 4;
    const cx0 = Math.floor((v.x - M) / CHUNK), cx1 = Math.floor((v.right + M) / CHUNK);
    const cy0 = Math.floor((v.y - M) / CHUNK), cy1 = Math.floor((v.bottom + M) / CHUNK);
    const mx = v.centerX / CHUNK - 0.5, my = v.centerY / CHUNK - 0.5;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) want.push([cx, cy, (cx - mx) ** 2 + (cy - my) ** 2]);
    if (srodowiskoTest2()) {
      // Prioritize the visible terrain; prefetch must fit the existing pixel budget.
      const visible = ([x, y]: [number, number, number]) => x >= Math.floor(v.x / CHUNK) && x <= Math.floor(v.right / CHUNK) && y >= Math.floor(v.y / CHUNK) && y <= Math.floor(v.bottom / CHUNK);
      want.sort((a, b) => Number(visible(b)) - Number(visible(a)) || a[2] - b[2]);
      want.length = Math.min(want.length, MAX_CHUNKS);
    } else want.sort((a, b) => a[2] - b[2]);
    const keep = new Set(want.map(([x, y]) => `${x},${y}`));

    // Recycle chunks far from the view.
    for (const [k, c] of this.chunks) {
      if (keep.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      if (x < cx0 - 1 || x > cx1 + 1 || y < cy0 - 1 || y > cy1 + 1 || this.chunks.size > MAX_CHUNKS) {
        c.img.setVisible(false);
        this.dropCrowns(c);
        this.chunks.delete(k);
        this.stale.delete(k);
        this.free.push(c);
      }
    }

    // Spare textures beyond what the cap allows go back to the graphics card's memory.
    while (this.free.length && this.chunks.size + this.free.length > MAX_CHUNKS) {
      const c = this.free.pop()!;
      this.dropCrowns(c);
      c.img.destroy();
      this.scene.textures.remove(c.tex);
    }

    for (const [x, y] of want) {
      const k = `${x},${y}`;
      if (this.chunks.has(k) && !this.stale.has(k)) continue;
      if (budget-- <= 0) break;
      // At the cap with nothing spare: reuse the farthest chunk the view doesn't need.
      if (!this.chunks.has(k) && !this.free.length && this.chunks.size >= MAX_CHUNKS) {
        let far: string | null = null;
        let best = -1;
        for (const ck of this.chunks.keys()) {
          if (keep.has(ck)) continue;
          const [ax, ay] = ck.split(',').map(Number);
          const d = (ax - mx) ** 2 + (ay - my) ** 2;
          if (d > best) {
            best = d;
            far = ck;
          }
        }
        if (far) {
          const c = this.chunks.get(far)!;
          c.img.setVisible(false);
          this.dropCrowns(c);
          this.chunks.delete(far);
          this.stale.delete(far);
          this.free.push(c);
        }
      }
      this.draw(x, y);
    }
  }

  /** The visible terrain has both its map data and its finished picture. */
  firstViewReady(cam: Phaser.Cameras.Scene2D.Camera) {
    const v = cam.worldView;
    if (!this.map.ready({ x0: v.x, y0: v.y, x1: v.right, y1: v.bottom })) return false;
    for (let x = Math.floor(v.x / CHUNK); x <= Math.floor(v.right / CHUNK); x++) {
      for (let y = Math.floor(v.y / CHUNK); y <= Math.floor(v.bottom / CHUNK); y++) {
        const key = `${x},${y}`, c = this.chunks.get(key);
        if (c?.error) throw c.error;
        if (!c || !c.img.visible || this.stale.has(key) || (WYGLAD_09 && c.paintedVer !== c.ver)) return false;
      }
    }
    return this.wysokie.firstViewReady(v);
  }

  /** Forces a redraw of every chunk (e.g. after mission highlights change). */
  invalidate() {
    for (const [, c] of this.chunks) {
      c.img.setVisible(false);
      this.dropCrowns(c);
      this.free.push(c);
    }
    this.chunks.clear();
    this.stale.clear();
  }

  private draw(cx: number, cy: number) {
    const k = `${cx},${cy}`;
    this.stale.delete(k);
    let chunk = this.chunks.get(k) ?? this.free.pop();
    if (!chunk) {
      const key = `chunk-${textureCounter++}`;
      const tex = this.scene.textures.createCanvas(key, CHUNK * DOTS, CHUNK * DOTS)!;
      const img = this.scene.add.image(0, 0, key).setOrigin(0).setScale(1 / DOTS).setDepth(GROUND_DEPTH);
      chunk = { key: '', tex, img };
    }
    const fresh = chunk.key !== k;
    chunk.key = k;
    chunk.error = undefined;
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    const ctx = chunk.tex.getContext();
    this.patterns ??= this.withArt(ctx, makePatterns(ctx));
    const t0 = performance.now();
    if (WYGLAD_09) {
      // Overhaul 09: the ground is computed in the background (Web Worker); the chunk shows up when it's ready
      // (a chunk being redrawn keeps its old picture until then).
      const ver = (chunk.ver = (chunk.ver ?? 0) + 1);
      const c = chunk;
      if (fresh) c.img.setVisible(false);
      this.chunks.set(k, c);
      const order = this.groundOrder(x0, y0);
      przygotujRysunkiUpraw().then(() => ziemiaWTle().policz(order)).then((ready) => {
        if (c.key !== k || c.ver !== ver || !this.scene.textures.exists(c.tex.key)) return;
        const t1 = performance.now();
        if (ready.computeMs !== undefined) {
          czasyWorker.push(Math.round(ready.computeMs));
          if (czasyWorker.length > 20) czasyWorker.shift();
        }
        this.paint(ctx, x0, y0, ready.ziemia);
        this.dropCrowns(c);
        c.crowns = ready.drzewa.map((t) => this.korony.make(t));
        c.wysokie = order.budynki.filter((b) => b.osobno);
        this.wysokie.trzymaj(c, c.wysokie, order.noc, order.miasto);
        c.steam = [...ready.para.map(([px, py]) => this.korony.steam(px, py)), ...ready.fale.map(([px, py]) => this.korony.fala(px, py)), ...ready.wyrzuty.map((z) => this.korony.wyrzut(z))];
        c.zbior = ready.zbior.map((q) => ({ id: idRosliny(q.x, q.y), x: q.x / GEN_DOTS, y: q.y / GEN_DOTS, veg: q.przedmiot, k: q.k }));
        c.ripe = this.onRipe ? c.zbior.filter((q) => !STAN.zebrane.has(q.id)).map((q) => this.onRipe!(q)).filter((im): im is Phaser.GameObjects.Image => !!im) : undefined;
        (czasyKawalkow.push(Math.round(performance.now() - t1)), czasyKawalkow.length > 20 && czasyKawalkow.shift());
        (czasyCalosci.push(Math.round(performance.now() - t0)), czasyCalosci.length > 20 && czasyCalosci.shift());
        c.tex.refresh();
        c.img.setPosition(x0, y0).setVisible(true);
        c.paintedVer = ver;
      }).catch((error: unknown) => {
        if (c.key === k && c.ver === ver) c.error = error instanceof Error ? error : new Error(String(error));
      });
      return;
    }
    this.paint(ctx, x0, y0);
    // Paint times of the last chunks (ms), for checks on phones and in automated tests.
    (czasyKawalkow.push(Math.round(performance.now() - t0)), czasyKawalkow.length > 20 && czasyKawalkow.shift());
    chunk.tex.refresh();
    chunk.img.setPosition(x0, y0).setVisible(true);
    this.chunks.set(chunk.key, chunk);
  }

  /** Overhaul 09: tree crowns (wind, see-through), see src/map/Korony.ts. */
  readonly korony: Korony;
  /** Overhaul 09: tall buildings as sprites with a see-through cut-out (src/map/Wysokie.ts). */
  private readonly wysokie: Wysokie;

  /** Takes a chunk's tree crowns away (it is recycled or hidden). */
  private dropCrowns(c: Chunk) {
    if (c.wysokie) this.wysokie.pusc(c, c.wysokie);
    c.wysokie = undefined;
    c.zbior = undefined;
    if (c.ripe) for (const im of c.ripe) this.onRipeGone?.(im);
    c.ripe = undefined;
    if (c.steam) for (const im of c.steam) this.korony.dropSteam(im);
    c.steam = undefined;
    if (!c.crowns) return;
    for (const k of c.crowns) this.korony.drop(k);
    c.crowns = undefined;
  }

  /** GameScene makes a picture (a pickup) of each ripe vegetable of a ready chunk, and takes it away again. */
  onRipe?: (q: Uprawa09) => Phaser.GameObjects.Image | undefined;
  onRipeGone?: (im: Phaser.GameObjects.Image) => void;

  /** The nearest ripe vegetable on a field within `reach` of (x, y) (not picked, not being picked). */
  uprawaAt(x: number, y: number, reach: number, busy: Set<string>): Uprawa09 | null {
    let best: Uprawa09 | null = null;
    let bd = reach;
    for (const c of this.chunks.values()) for (const q of c.zbior ?? []) {
      if (STAN.zebrane.has(q.id) || busy.has(`pole:${q.id}`)) continue;
      const d = Math.hypot(q.x - x, q.y - 3 - y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  /** A vegetable was picked: a hole with leaf scraps instead (until the next login). */
  zbierzUprawe(id: string, x: number, y: number) {
    STAN.zebrane.add(id);
    this.redrawAround(x, y);
  }

  /** Buildings under a landmark picture (G12, Zabytki.ts): painted as a shadow only. */
  zabytekCovers: (b: Building) => boolean = () => false;

  /** Repaints the chunks around a map point (a felled tree's stump, overhaul 09); the old picture stays until then. */
  redrawAround(x: number, y: number) {
    for (let cx = Math.floor((x - 40) / CHUNK); cx <= Math.floor((x + 40) / CHUNK); cx++)
      for (let cy = Math.floor((y - 40) / CHUNK); cy <= Math.floor((y + 40) / CHUNK); cy++)
        if (this.chunks.has(`${cx},${cy}`)) this.stale.add(`${cx},${cy}`);
  }

  /** Wind and see-through of the crowns in view; call every frame (overhaul 09). */
  updateTrees(now: number, dt: number, cam: Phaser.Cameras.Scene2D.Camera, hx: number, hy: number) {
    if (WYGLAD_09) {
      this.korony.update(now, dt, cam.worldView, hx, hy);
      this.wysokie.update(cam.worldView, hx, hy);
    }
  }

  /** Roof patterns from the artist's files (empty until they arrive). */
  private roofArt: (CanvasPattern | null)[] = [];
  /** Front wall patterns per material (the window version, else the plain one). */
  private wallArt: { pat: CanvasPattern; udzial: number }[] = [];
  /** The artist's lamp and chimney sheets (shrunk to map size), when present. */
  private lampArt: HTMLCanvasElement | null = null;
  private chimneyArt: HTMLCanvasElement | null = null;
  private treeArt: HTMLCanvasElement | null = null;
  /** The artist's street decorations (pack 04b), by DEKORACJE key. */
  private deco: Partial<Record<keyof typeof DEKORACJE, HTMLCanvasElement>> = {};
  private bushArt: HTMLCanvasElement | null = null;
  private trackArt: CanvasPattern | null = null;

  /** The drawn patterns, with the artist's textures in place of those that have a file (content/swiat.ts). */
  private withArt(ctx: CanvasRenderingContext2D, drawn: ReturnType<typeof makePatterns>): Patterns {
    const out = { ...drawn } as Patterns;
    for (const [kind, file] of Object.entries(PODLOZE_PLIKI)) {
      const pat = artPattern(this.scene, ctx, file);
      if (!pat) continue;
      if (kind === 'track') this.trackArt = pat;
      else out[kind] = pat;
    }
    const made = new Map<string, CanvasPattern | null>();
    for (const w of SCIANY) {
      const pat = artPattern(this.scene, ctx, `${w.plik}_okno`) ?? artPattern(this.scene, ctx, `${w.plik}_gladka`);
      if (pat) this.wallArt.push({ pat, udzial: w.udzial });
    }
    this.lampArt = artSheet(this.scene, LATARNIE.plik, LATARNIE.klatki);
    this.chimneyArt = artSheet(this.scene, KOMINY.plik, KOMINY.klatki);
    this.treeArt = artSheet(this.scene, ZIELEN.drzewo, ZIELEN.klatki);
    for (const [k, d] of Object.entries(DEKORACJE)) {
      const c = artSheet(this.scene, d.plik, 'klatki' in d ? (d as { klatki: number }).klatki : 1);
      if (c) this.deco[k as keyof typeof DEKORACJE] = c;
    }
    this.bushArt = artSheet(this.scene, ZIELEN.krzak, ZIELEN.klatki);
    this.roofArt = DACHY_PLIKI.map((f) => {
      if (!made.has(f)) made.set(f, artPattern(this.scene, ctx, f));
      return made.get(f)!;
    });
    return out;
  }

  /** What the background painter needs for a chunk's ground: the kinds of ground around it (overhaul 09). */
  private groundOrder(x0: number, y0: number) {
    const m = this.map;
    const wide = m.query({ x0: x0 - 24, y0: y0 - 24, x1: x0 + CHUNK + 24, y1: y0 + CHUNK + 24 });
    wide.areas.sort((a, b) => a.id - b.id);
    const outside = !m.insideCity(x0, y0) || !m.insideCity(x0 + CHUNK, y0) || !m.insideCity(x0, y0 + CHUNK) || !m.insideCity(x0 + CHUNK, y0 + CHUNK) || !m.insideCity(x0 + CHUNK / 2, y0 + CHUNK / 2);
    // Platforms around the chunk (OSM and made-up ones, perony.ts): their slabs go into the kind map,
    // their steampunk fittings (pipes, lens lamps, a telescope, a steam gauge) are painted by the worker.
    const perony = peronyWOkolicy(m, { x0: x0 - 60, y0: y0 - 60, x1: x0 + CHUNK + 60, y1: y0 + CHUNK + 60 });
    const kinds = mapaRodzajow(wide.areas, wide.lines, trackWidth, outside ? (g) => {
      g.beginPath();
      g.rect(x0 - 30, y0 - 30, CHUNK + 60, CHUNK + 60);
      for (const r of m.boundary) {
        g.moveTo(r[0], r[1]);
        for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
        g.closePath();
      }
      g.fill('evenodd');
    } : null, x0, y0, CHUNK, perony.filter((p) => p.ring.length).map((p) => p.ring));
    // Tracks (rail and tram) cut to the chunk with a margin, in generator pixels.
    const tory: number[][] = [];
    const tramwaje: number[][] = [];
    for (const l of wide.lines) if (l.kind === 'tram') tramwaje.push(...clipLine(l.pts, x0 - 16, y0 - 16, x0 + CHUNK + 16, y0 + CHUNK + 16).map((p) => p.map((v) => v * GEN_DOTS)));
    for (const l of wide.lines) if (l.kind === 'rail') tory.push(...clipLine(l.pts, x0 - 16, y0 - 16, x0 + CHUNK + 16, y0 + CHUNK + 16).map((p) => p.map((v) => v * GEN_DOTS)));
    // Buildings whose roof, walls or shadow reach the chunk (roofs jut out north of the outline), north to south.
    const { buildings } = m.query({ x0: x0 - 24, y0: y0 - 24, x1: x0 + CHUNK + 24, y1: y0 + CHUNK + 48 });
    buildings.sort((a, b) => a.y1 - b.y1);
    const G = GEN_DOTS;
    const budynki: Budynek09[] = buildings.map((b) => {
      const hl = this.highlight.get(b);
      const k = ksztalt09(b);
      const zabytek = this.zabytekCovers(b);
      return {
        test2: architekturaTest2Aktywna(),
        zabytek,
        r: b.rings[0].map((v) => v * G),
        dziury: b.rings.slice(1).map((r) => r.map((v) => v * G)),
        h: k.poziomy * k.poziom,
        poziom: k.poziom,
        osobno: !zabytek && k.poziomy >= POZIOMY.osobnoOd,
        id: b.id,
        seed: b.seed,
        drzwi: b.door ? [b.door.x * G, b.door.y * G] as [number, number] : undefined,
        hl: hl ? [hl.roof, hl.wall] as [string, string] : undefined,
      };
    });
    const G2 = GEN_DOTS;
    const rury: Rura09[] = [];
    const pipeRoads = new Map<string, Line[]>();
    for (const l of m.query({x0:x0-80,y0:y0-80,x1:x0+CHUNK+80,y1:y0+CHUNK+80}).lines) {
      if (!['minor', 'medium', 'service'].includes(l.kind) || l.bridge) continue;
      const paths = ruryPrzyUlicy(l.pts, l.id, trackWidth(l), (x, y, radius = 4) => {
        if (!m.isFree(x, y, radius, radius)) return false;
        // Leave roads, sidewalks, rails and their crossings open. Query includes adjacent tiles.
        const cx=Math.floor(x/32)*32, cy=Math.floor(y/32)*32, key=`${cx},${cy}`;
        let nearby=pipeRoads.get(key);
        if (!nearby) {
          nearby=m.query({x0:cx-40,y0:cy-40,x1:cx+72,y1:cy+72}).lines.filter(q =>
            ['major','medium','minor','service','pedestrian','steps','platform','path','rail','tram'].includes(q.kind));
          pipeRoads.set(key, nearby);
        }
        return !nearby.some(q =>
          distToPolyline(q.pts, x, y) < (q.kind === 'rail' || q.kind === 'tram' ? 7 : trackWidth(q) / 2) + radius);
      }, 500 * PX_PER_M);
      for (const p of paths) {
        const xs=p.pts.filter((_,i)=>i%2===0), ys=p.pts.filter((_,i)=>i%2===1);
        if (Math.max(...xs)<x0-80 || Math.min(...xs)>x0+CHUNK+80 || Math.max(...ys)<y0-80 || Math.min(...ys)>y0+CHUNK+80) continue;
        rury.push({pts:p.pts.map(v=>v*G2),seed:p.seed, kotly:p.kotly?.map(k=>({x:k.x*G2,y:k.y*G2,pipeX:k.pipeX*G2,pipeY:k.pipeY*G2}))});
      }
    }
    const peronyGen: Peron09[] = perony.map((p) => ({ os: p.os.map((v) => v * G2), tor: p.tor, szer: p.szer * G2, seed: (Math.round(p.os[0]) * 7919 + Math.round(p.os[1]) * 104729) >>> 0 }));
    // Fields and allotments reaching the chunk: whole outlines (the strips must be the same in every chunk).
    const pola: Pole09[] = wide.areas
      .filter((a) => a.kind === 'farmland' || a.kind === 'allotments')
      .map((a) => ({ r: a.rings[0].map((v) => v * G2), seed: a.id, dz: a.kind === 'allotments' }));
    // Pictures laid in coloured paving (content/mozaiki.ts), those reaching the chunk.
    const mozaiki: Mozaika09[] = [];
    for (const mz of MOZAIKI) {
      if (mz.mapa !== m.id) continue;
      const c = m.fromLatLon(mz.lat, mz.lon);
      const half = (mz.szerM * PX_PER_M) / 2 + 8;
      if (c.x + half < x0 || c.x - half > x0 + CHUNK || c.y + half < y0 || c.y - half > y0 + CHUNK) continue;
      mozaiki.push({ cx: c.x * G2, cy: c.y * G2, kat: (mz.katDeg * Math.PI) / 180, skala: (mz.szerM * PX_PER_M * G2) / mz.obraz[0].length, kostka: mz.kostkaM * PX_PER_M * G2, obraz: mz.obraz });
    }
    return { ...kinds, budynki, noc: night(), miasto: this.miasto, sciete: this.korony.sciete(), tory, perony: peronyGen, pola, miesiac: miesiacUpraw(), zebrane: [...STAN.zebrane], dojrzale: POLA.dojrzale, mozaiki, tramwaje, rury };
  }

  private paint(ctx: CanvasRenderingContext2D, x0: number, y0: number, ground?: HTMLCanvasElement) {
    const P = this.patterns!;
    const m = this.map;
    ctx.setTransform(DOTS, 0, 0, DOTS, -x0 * DOTS, -y0 * DOTS);
    ctx.imageSmoothingEnabled = false;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const box = { x0: x0 - 8, y0: y0 - 60, x1: x0 + CHUNK + 8, y1: y0 + CHUNK + 8 };
    const { areas, lines, buildings } = m.query(box);
    // Wide enough for outlines, walls (drawn lower) and patterns.
    clip = { x0: x0 - 40, y0: y0 - 80, x1: x0 + CHUNK + 40, y1: y0 + CHUNK + 80 };

    if (ground) {
      // Overhaul 09: the ground (areas, roads, water, tracks) comes from the generator in src/gen.
      // Buildings come with the ground (roofs, walls, shadows from the generator).
      rysujZiemie(ctx, ground, x0, y0, CHUNK);
      if (m.terrain) {
        this.paintRelief(ctx, x0, y0);
        this.paintCliffs(ctx, x0, y0);
        this.paintTrailMarks(ctx, lines);
      }
      if (Object.keys(this.deco).length) this.paintDecorations(ctx, lines, areas, x0, y0);
      if (this.lampArt) this.paintLamps(ctx, lines);
      clip = null;
      return;
    }

    ctx.fillStyle = P.grass;
    ctx.fillRect(x0, y0, CHUNK, CHUNK);

    // Areas (already in draw order from the map build).
    areas.sort((a, b) => a.id - b.id);
    for (const a of areas) if (a.kind !== 'paved') this.paintArea(ctx, a);

    // Waterways, then roads (outlines first so crossings merge), then rails.
    for (const l of lines) {
      if (l.kind !== 'river' && l.kind !== 'stream' && l.kind !== 'ditch') continue;
      linePath(ctx, l.pts);
      ctx.strokeStyle = '#2f6fb3';
      ctx.lineWidth = l.width + 1;
      ctx.stroke();
      ctx.strokeStyle = P.water;
      ctx.lineWidth = l.width;
      ctx.stroke();
    }
    // Roads, pavements and paths are all one kind of track: every outline
    // first, then every fill in the same colour, so parallel and crossing
    // pieces melt into one shape with a single outline.
    const roads = lines.filter((l) => ROAD_FILL[l.kind]);
    for (const l of roads) {
      linePath(ctx, l.pts);
      ctx.strokeStyle = TRACK_EDGE;
      ctx.lineWidth = trackWidth(l) + (l.bridge ? 5 : EDGE.droga);
      ctx.stroke();
    }
    for (const l of roads) {
      linePath(ctx, l.pts);
      ctx.strokeStyle = this.trackArt ?? TRACK_FILL;
      ctx.lineWidth = trackWidth(l);
      ctx.stroke();
    }
    // Streets for cars: one cobbled surface (parallel carriageways merged
    // in build-map), over the earthen tracks; paths stay earthen.
    for (const a of areas) {
      if (a.kind !== 'paved') continue;
      ringsPath(ctx, a.rings);
      ctx.strokeStyle = TRACK_EDGE;
      ctx.lineWidth = EDGE.droga;
      ctx.stroke();
    }
    for (const a of areas) {
      if (a.kind !== 'paved') continue;
      ringsPath(ctx, a.rings);
      ctx.fillStyle = P.paved;
      ctx.fill('evenodd');
    }
    for (const l of lines) if (l.kind === 'rail' || l.kind === 'tram') this.paintRail(ctx, l);

    // Outside the city: dark forest.
    if (!m.insideCity(x0, y0) || !m.insideCity(x0 + CHUNK, y0) || !m.insideCity(x0, y0 + CHUNK) || !m.insideCity(x0 + CHUNK, y0 + CHUNK) || !m.insideCity(x0 + CHUNK / 2, y0 + CHUNK / 2)) {
      ctx.beginPath();
      ctx.rect(x0 - 1, y0 - 1, CHUNK + 2, CHUNK + 2);
      for (const r of m.boundary) {
        ctx.moveTo(r[0], r[1]);
        for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
        ctx.closePath();
      }
      ctx.fillStyle = P.outside;
      ctx.fill('evenodd');
    }

    // Mountains (world maps): hill shading and contour lines over the ground.
    if (m.terrain) {
      this.paintRelief(ctx, x0, y0);
      this.paintCliffs(ctx, x0, y0);
      this.paintTrailMarks(ctx, lines);
    }

    // Buildings, north to south so southern walls overlap northern roofs.
    buildings.sort((a, b) => a.y1 - b.y1);
    for (const b of buildings) this.paintBuilding(ctx, b);
    if (this.treeArt || this.bushArt) this.paintGreenery(ctx, x0, y0);
    if (Object.keys(this.deco).length) this.paintDecorations(ctx, lines, areas, x0, y0);
    if (this.lampArt) this.paintLamps(ctx, lines);
    clip = null;
  }

  /**
   * Where the hero can't go (a cliff past GORY.urwisko, off any path – report 57: a meadow that looked flat was a wall),
   * boulders are drawn, so the player sees why: a grey stone with a lit top-left, a dark outline, on a 4 m grid,
   * size and offset by position (stays the same in every chunk).
   */
  private paintCliffs(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
    const m = this.map, t = m.terrain!;
    const cell = 4 * PX_PER_M;
    const h = (a: number, b: number, s: number) => {
      let v = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
      v = Math.imul(v ^ (v >>> 13), 1274126177);
      return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
    };
    for (let cy = Math.floor((y0 - cell) / cell); cy <= Math.ceil((y0 + CHUNK + cell) / cell); cy++)
      for (let cx = Math.floor((x0 - cell) / cell); cx <= Math.ceil((x0 + CHUNK + cell) / cell); cx++) {
        const x = (cx + 0.5) * cell, y = (cy + 0.5) * cell;
        if (!(t.slopeAt(x, y) > t.maxSlope) || m.nearPath(x, y)) continue;
        if (h(cx, cy, 5) < 0.3) continue; // gaps between the stones, so it reads as a scree, not a pavement
        const big = h(cx, cy, 6) < 0.15;
        const r = cell * (big ? 0.6 + 0.15 * h(cx, cy, 1) : 0.22 + 0.22 * h(cx, cy, 1));
        const px = x + (h(cx, cy, 2) - 0.5) * cell * 0.4, py = y + (h(cx, cy, 3) - 0.5) * cell * 0.4;
        const tone = h(cx, cy, 4) < 0.5 ? ['#6e6a66', '#8c8782', '#b3ada6'] : ['#66625f', '#7f7a75', '#a49e97'];
        ctx.fillStyle = 'rgba(30,26,36,0.35)'; // shadow to the lower right
        ctx.beginPath(); ctx.ellipse(px + r * 0.35, py + r * 0.3, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = tone[0];
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = tone[1];
        ctx.beginPath(); ctx.ellipse(px - r * 0.12, py - r * 0.12, r * 0.78, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = tone[2];
        ctx.beginPath(); ctx.ellipse(px - r * 0.35, py - r * 0.3, r * 0.32, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1e1a24';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
      }
  }

  /**
   * Trail marks in the mountains (Góry v2, GORY.md p. 7): along paths above GORY.szlakOdM, every GORY.znakCoM metres
   * (counted from the path's start, so every chunk agrees), alternately on each side: a stone with a white-red-white
   * stripe or a wooden post with the stripe on top; on steep ground a little cairn. Placeholders until the artist's sprites.
   */
  private paintTrailMarks(ctx: CanvasRenderingContext2D, lines: Line[]) {
    const t = this.map.terrain!;
    const co = GORY.znakCoM * PX_PER_M;
    for (const l of lines) {
      if (l.kind !== 'path' && l.kind !== 'steps') continue;
      const p = l.pts;
      let acc = co * 0.5, n = 0;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], ay = p[i + 1], dx = p[i + 2] - ax, dy = p[i + 3] - ay, L = Math.hypot(dx, dy);
        if (!L) continue;
        let d = co - acc;
        while (d <= L) {
          const x = ax + (dx * d) / L, y = ay + (dy * d) / L;
          n++;
          const h = t.heightAt(x, y);
          if (h > GORY.szlakOdM) {
            const side = n % 2 ? 1 : -1, off = l.width / 2 + 2.2;
            const mx = x - (dy / L) * off * side, my = y + (dx / L) * off * side;
            if (t.slopeAt(mx, my) > GORY.stromoBezSzlaku && n % 3 === 0) this.cairn(ctx, mx, my);
            else if (n % 2) this.markStone(ctx, mx, my);
            else this.markPost(ctx, mx, my);
          }
          d += co;
        }
        acc = (acc + L) % co;
      }
    }
  }

  private markStone(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#1e1a24';
    ctx.fillRect(x - 2, y - 2.5, 4, 3);
    ctx.fillStyle = '#7a7a80';
    ctx.fillRect(x - 1.5, y - 2, 3, 2);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(x - 1, y - 2, 2, 0.5);
    ctx.fillRect(x - 1, y - 1, 2, 0.5);
    ctx.fillStyle = '#c8352c';
    ctx.fillRect(x - 1, y - 1.5, 2, 0.5);
  }

  private markPost(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#1e1a24';
    ctx.fillRect(x - 1, y - 6, 2, 6);
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x - 0.5, y - 5.5, 1, 5.5);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(x - 0.5, y - 5.5, 1, 0.5);
    ctx.fillRect(x - 0.5, y - 4.5, 1, 0.5);
    ctx.fillStyle = '#c8352c';
    ctx.fillRect(x - 0.5, y - 5, 1, 0.5);
  }

  private cairn(ctx: CanvasRenderingContext2D, x: number, y: number) {
    for (const [w, dy] of [[4.5, 0], [3.5, -1.5], [2, -3]] as const) {
      ctx.fillStyle = '#1e1a24';
      ctx.fillRect(x - w / 2 - 0.5, y + dy - 1.5, w + 1, 2);
      ctx.fillStyle = '#8a8a90';
      ctx.fillRect(x - w / 2, y + dy - 1, w, 1.5);
    }
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(x - 0.5, y - 4.5, 1, 0.5);
    ctx.fillStyle = '#c8352c';
    ctx.fillRect(x - 0.5, y - 4, 1, 0.5);
  }

  private reliefShade?: HTMLCanvasElement;
  private reliefLines?: HTMLCanvasElement;

  /**
   * Light from the north-west on slopes (darker away from it) and a brown
   * contour line every GORY.poziomice metres (every fifth one stronger).
   */
  private paintRelief(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
    const t = this.map.terrain!;
    const S = 4; // px between height samples
    const M = 10; // extra samples around the chunk, so the smoothing matches across chunks
    const n = CHUNK / S + 1 + 2 * M;
    const h = new Float32Array(n * n);
    let any = false;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const v = t.heightAt(x0 + (i - M) * S, y0 + (j - M) * S);
        h[j * n + i] = v;
        if (!Number.isNaN(v)) any = true;
      }
    if (!any) return;
    // Relief shading and contour lines only in real mountains (owner, 7 Oct 2026: on flat ground „sama poziomica” – dark bands and lines on a hill like Wawel): the
    // spread of heights within GORY.poziomiceRzezbaM around the chunk must reach GORY.poziomiceOdM.
    {
      const cx = x0 + CHUNK / 2, cy = y0 + CHUNK / 2, R = GORY.poziomiceRzezbaM * PX_PER_M;
      let lo = Infinity, hi = -Infinity;
      for (let ring = 0; ring <= 2; ring++) for (let k = 0; k < (ring ? 12 : 1); k++) {
        const a = (k * Math.PI) / 6, r = (R * ring) / 2;
        const v = t.heightAt(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        if (Number.isNaN(v)) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      if (!(hi - lo >= GORY.poziomiceOdM)) return;
    }
    const at = (i: number, j: number) => h[Math.min(n - 1, Math.max(0, j)) * n + Math.min(n - 1, Math.max(0, i))];
    // The heights come in ~12 m steps: smooth them for the shading (two box
    // blurs each way), or every step shows as a square.
    const g = Float32Array.from(h);
    const tmp = new Float32Array(n * n);
    const R = 4;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (let k = -R; k <= R; k++) sum += g[j * n + Math.min(n - 1, Math.max(0, i + k))];
          tmp[j * n + i] = sum / (2 * R + 1);
        }
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          let sum = 0;
          for (let k = -R; k <= R; k++) sum += tmp[Math.min(n - 1, Math.max(0, j + k)) * n + i];
          g[j * n + i] = sum / (2 * R + 1);
        }
    }
    const sm = (i: number, j: number) => g[Math.min(n - 1, Math.max(0, j)) * n + Math.min(n - 1, Math.max(0, i))];
    // Shading, drawn smooth.
    const m = CHUNK / S + 1;
    this.reliefShade ??= Object.assign(document.createElement('canvas'), { width: m, height: m });
    const sctx = this.reliefShade.getContext('2d')!;
    const img = sctx.createImageData(m, m);
    const dist = (2 * S) / PX_PER_M; // metres between the samples of a difference
    const sun = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }; // from the north-west
    const flat = Math.SQRT1_2;
    for (let j = 0; j < m; j++)
      for (let i = 0; i < m; i++) {
        const dx = (sm(i + M + 1, j + M) - sm(i + M - 1, j + M)) / dist;
        const dy = (sm(i + M, j + M + 1) - sm(i + M, j + M - 1)) / dist;
        if (Number.isNaN(dx) || Number.isNaN(dy)) continue;
        // Surface normal (−dx, −dy, 1), sun 45° up.
        const len = Math.hypot(dx, dy, 1);
        const light = (Math.SQRT1_2 * (-dx * sun.x - dy * sun.y) + Math.SQRT1_2) / len;
        const d = (light - flat) * GORY.cien;
        const o = (j * m + i) * 4;
        if (d < 0) img.data[o + 3] = Math.min(210, -d * 640);
        else {
          img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
          img.data[o + 3] = Math.min(130, d * 420);
        }
      }
    sctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.reliefShade, x0 - S / 2, y0 - S / 2, m * S, m * S);
    // Contour lines, crisp, on a 2 px grid (heights in between interpolated).
    const L = CHUNK / 2;
    this.reliefLines ??= Object.assign(document.createElement('canvas'), { width: L, height: L });
    const lctx = this.reliefLines.getContext('2d')!;
    const li = lctx.createImageData(L, L);
    const step = GORY.poziomice;
    const hh = (u: number, v: number) => {
      // u, v in 2 px units from the chunk corner.
      const fx = u / 2 + M, fy = v / 2 + M, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
      return (at(ix, iy) * (1 - ax) + at(ix + 1, iy) * ax) * (1 - ay) + (at(ix, iy + 1) * (1 - ax) + at(ix + 1, iy + 1) * ax) * ay;
    };
    const band = new Float32Array((L + 1) * (L + 1));
    for (let v = 0; v <= L; v++) for (let u = 0; u <= L; u++) band[v * (L + 1) + u] = Math.floor(hh(u, v) / step);
    for (let v = 0; v < L; v++)
      for (let u = 0; u < L; u++) {
        const b = band[v * (L + 1) + u], r = band[v * (L + 1) + u + 1], d = band[(v + 1) * (L + 1) + u];
        if (Number.isNaN(b) || (b === r && b === d)) continue;
        const top = Math.max(b, r, d);
        const o = (v * L + u) * 4;
        const major = top % 5 === 0;
        li.data[o] = major ? 70 : 90;
        li.data[o + 1] = major ? 40 : 60;
        li.data[o + 2] = major ? 20 : 35;
        li.data[o + 3] = major ? 210 : 130;
      }
    lctx.putImageData(li, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.reliefLines, x0, y0, CHUNK, CHUNK);
    ctx.restore();
  }

  private paintArea(ctx: CanvasRenderingContext2D, a: Area) {
    const P = this.patterns!;
    ringsPath(ctx, a.rings);
    const pat = P[a.kind];
    ctx.fillStyle = pat ?? AREA_FILL[a.kind] ?? '#72c23a';
    ctx.fill('evenodd');
    if (a.kind === 'water') {
      ctx.strokeStyle = '#2f6fb3';
      ctx.lineWidth = EDGE.obszar;
      ctx.stroke();
    } else if (a.kind === 'forest' || a.kind === 'pitch' || a.kind === 'parking') {
      ctx.strokeStyle = a.kind === 'pitch' ? '#ffffff' : a.kind === 'parking' ? '#9c6f42' : '#24602a';
      ctx.lineWidth = EDGE.obszar;
      ctx.stroke();
    }
  }

  private paintRail(ctx: CanvasRenderingContext2D, l: Line) {
    linePath(ctx, l.pts);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#8a7f73';
    ctx.lineWidth = l.width + 2;
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = l.width;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#d0d0d8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineCap = 'round';
  }

  private paintBuilding(ctx: CanvasRenderingContext2D, b: Building) {
    const parts = this.partsOf(b);
    if (!parts) return this.paintBody(ctx, b, wallHeight(b), b.seed);
    // A big hall (galleria, market hall): a few parts side by side, each with its own roof, every other one a storey higher.
    const h = wallHeight(b);
    parts.forEach((clip, i) => {
      ctx.save();
      ctx.beginPath();
      // The band of the footprint, swept down (and right) as far as the walls reach.
      for (const t of [0, 0.5, 1]) {
        const dh = (h + 3) * t;
        ctx.moveTo(clip[0] + dh * WALL_SKEW, clip[1] + dh);
        for (let k = 2; k < clip.length; k += 2) ctx.lineTo(clip[k] + dh * WALL_SKEW, clip[k + 1] + dh);
        ctx.closePath();
      }
      ctx.clip('nonzero');
      this.paintBody(ctx, b, i % 2 ? Math.min(h + 3, 11) : h, b.seed + i * 7);
      // Each part a little lighter or darker, so they read as separate roofs even in one colour.
      ringsPath(ctx, b.rings);
      ctx.fillStyle = [`rgba(255,246,228,0.14)`, `rgba(24,14,36,0.12)`, `rgba(255,246,228,0.05)`, `rgba(24,14,36,0.2)`, `rgba(255,246,228,0.1)`][i % 5];
      ctx.fill('evenodd');
      ctx.restore();
    });
    // Where the parts meet: a thin seam over the roof.
    ctx.save();
    ringsPath(ctx, b.rings);
    ctx.clip('evenodd');
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = EDGE.dach;
    for (let i = 1; i < parts.length; i++) {
      const c = parts[i];
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[6], c[7]);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * A big hall is drawn as 2–DZIELENIE.maks parts cut across its longest side (bands as 4-point polygons),
   * castles, churches and the like (by name) stay whole; null = draw as one.
   */
  private partsOf(b: Building): number[][] | null {
    if (b.name && DZIELENIE.bezPodzialu.test(b.name)) return null;
    const r = b.rings[0];
    const m2 = Math.abs(ringArea(r)) / (PX_PER_M * PX_PER_M);
    if (m2 < DZIELENIE.odM2) return null;
    const n = Math.max(2, Math.min(DZIELENIE.maks, Math.round(m2 / DZIELENIE.m2NaCzesc)));
    // The longest wall's direction (like the roof tiles).
    let best = -1, ang = 0;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      const dx = r[j] - r[i], dy = r[j + 1] - r[i + 1];
      if (dx * dx + dy * dy > best) [best, ang] = [dx * dx + dy * dy, Math.atan2(dy, dx)];
    }
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    let t0 = Infinity, t1 = -Infinity, s0 = Infinity, s1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) {
      const t = r[i] * ux + r[i + 1] * uy, s = r[i] * vx + r[i + 1] * vy;
      t0 = Math.min(t0, t); t1 = Math.max(t1, t); s0 = Math.min(s0, s); s1 = Math.max(s1, s);
    }
    s0 -= 20; s1 += 20;
    const at = (t: number, s: number) => [t * ux + s * vx, t * uy + s * vy];
    const out: number[][] = [];
    for (let i = 0; i < n; i++) {
      const a = t0 + ((t1 - t0) * i) / n - (i ? 0 : 20), c = t0 + ((t1 - t0) * (i + 1)) / n + (i === n - 1 ? 20 : 0);
      out.push([...at(a, s0), ...at(c, s0), ...at(c, s1), ...at(a, s1)]);
    }
    // Draw from the back (north) forward, so the higher parts' walls overlap properly.
    return out.sort((p, q) => p[1] + p[3] + p[5] + p[7] - (q[1] + q[3] + q[5] + q[7]));
  }

  private paintBody(ctx: CanvasRenderingContext2D, b: Building, h: number, seed: number) {
    const special = this.highlight.get(b);
    const sk = WALL_SKEW;
    // Walls: the footprint dropped by h (leaning right), plus the outline.
    ringsPath(ctx, b.rings, h * sk, h);
    ctx.lineWidth = EDGE.podstawa;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    for (let s = h; s > 0; s -= 1) {
      ringsPath(ctx, b.rings, s * sk, s);
      ctx.fillStyle = special ? special.wall : s > h / 2 ? '#d9c9a3' : '#eadcb8';
      ctx.fill('evenodd');
    }
    // The artist's front walls: on every wall of the outline that faces the viewer (south), the texture
    // runs along the wall with its bottom on the ground; low buildings show only its lower part.
    if (!special && this.wallArt.length) this.paintWalls(ctx, b, h);
    else this.shadeSides(ctx, b, h);
    // Roof.
    ringsPath(ctx, b.rings);
    const art = this.roofArt[seed % ROOFS.length] ?? null;
    // Tile rows run along the building's longest wall, shifted per building, so neighbours don't share one grid.
    if (art) art.setTransform(roofTransform(b).scale(1 / DOTS));
    ctx.fillStyle = special && !art ? special.roof : art ?? ROOFS[seed % ROOFS.length];
    ctx.fill('evenodd');
    // A place's roof keeps its tiles, coloured with the place's colour (bug reports 10 and 12: no flat sheets of paint).
    if (special && art) {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = special.roof;
      ctx.fill('evenodd');
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.lineWidth = EDGE.dach;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    // A lighter inner edge gives the roof some volume.
    ringsPath(ctx, b.rings, 0.8, 0.8);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (this.chimneyArt && !special) this.paintChimney(ctx, b);
  }

  /** The east-facing walls (seen thanks to WALL_SKEW) a little darker than the front ones. */
  private shadeSides(ctx: CanvasRenderingContext2D, b: Building, h: number) {
    const r = b.rings[0];
    const out = ringArea(r) > 0 ? 1 : -1;
    ctx.fillStyle = 'rgba(30,20,40,0.22)';
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      const ax = r[i], ay = r[i + 1], dx = r[j] - ax, dy = r[j + 1] - ay;
      const L = Math.hypot(dx, dy);
      if (L < 1 || out * dy <= 0.2 * L) continue;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + dx, ay + dy);
      ctx.lineTo(ax + dx + h * WALL_SKEW, ay + dy + h);
      ctx.lineTo(ax + h * WALL_SKEW, ay + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  private paintWalls(ctx: CanvasRenderingContext2D, b: Building, h: number) {
    let pick = ((b.seed >>> 3) % 1000) / 1000;
    let art = this.wallArt[0];
    for (const w of this.wallArt) {
      if (pick < w.udzial) { art = w; break; }
      pick -= w.udzial;
    }
    const r = b.rings[0];
    const out = ringArea(r) > 0 ? 1 : -1;
    const tileH = 24 / SKALA_PLIKOW;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      const ax = r[i], ay = r[i + 1], dx = r[j] - ax, dy = r[j + 1] - ay;
      const L = Math.hypot(dx, dy);
      // Facing the viewer: the outward normal points down the screen.
      if (L < 1 || out * -dx <= 0.2 * L) continue;
      const sk = WALL_SKEW;
      art.pat.setTransform(new DOMMatrix([dx / L, dy / L, sk, 1, ax + (h - tileH) * sk, ay + h - tileH]).scaleSelf(1 / DOTS));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + dx, ay + dy);
      ctx.lineTo(ax + dx + h * sk, ay + dy + h);
      ctx.lineTo(ax + h * sk, ay + h);
      ctx.closePath();
      ctx.fillStyle = art.pat;
      ctx.fill();
      // Walls turned away from the light (to the right) a little darker.
      if (dy < 0) {
        ctx.fillStyle = 'rgba(30,20,40,0.12)';
        ctx.fill();
      }
    }
    this.shadeSides(ctx, b, h);
    // Keep the outline crisp over the texture.
    ringsPath(ctx, b.rings, h * WALL_SKEW, h);
    ctx.lineWidth = EDGE.sciany;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  /** A chimney with steam on some roofs (every KOMINY.naIleDomow-th house big enough), inside the footprint. */
  private paintChimney(ctx: CanvasRenderingContext2D, b: Building) {
    const c = this.chimneyArt!;
    if (b.seed % KOMINY.naIleDomow !== 0) return;
    const w = b.x1 - b.x0, hgt = b.y1 - b.y0;
    if (w * hgt < KOMINY.odM2 * PX_PER_M * PX_PER_M) return;
    const r = b.rings[0];
    // A spot a third of the way in from the upper left, if it is on the roof.
    const x = b.x0 + w * (0.3 + ((b.seed >> 4) % 40) / 100), y = b.y0 + hgt * 0.4;
    if (!pointIn(r, x, y)) return;
    const fw = c.width / KOMINY.klatki;
    const f = (b.seed >> 7) % KOMINY.klatki;
    ctx.drawImage(c, f * fw, 0, fw, c.height, snap(x - fw / 2 / DOTS), snap(y - c.height / DOTS), fw / DOTS, c.height / DOTS);
  }

  /**
   * Leafy trees and bushes on lawns and in parks (ZIELEN): one spot per grid
   * cell, seeded by the cell, on grass away from paths, walls and roofs south of it.
   * Painted into the chunk (they don't block walking).
   */
  private paintGreenery(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
    const m = this.map;
    const G = ZIELEN.coM * PX_PER_M;
    const pad = 30;
    // Spots reach past the chunk (trees overhang it): look at every area there, in draw order.
    const areas = m.query({ x0: x0 - pad - G, y0: y0 - pad - G, x1: x0 + CHUNK + pad + G, y1: y0 + CHUNK + 2 * pad + G }).areas.slice().sort((a, b) => a.id - b.id);
    for (let gx = Math.floor((x0 - pad) / G); gx * G < x0 + CHUNK + pad; gx++) {
      for (let gy = Math.floor((y0 - pad) / G); gy * G < y0 + CHUNK + pad * 2; gy++) {
        let h = Math.imul(gx * 73856093 ^ gy * 19349663, 2654435761) >>> 0;
        const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296);
        const x = (gx + 0.2 + r() * 0.6) * G, y = (gy + 0.2 + r() * 0.6) * G;
        // The topmost area there decides (areas come in draw order): no trees on a pitch in a park.
        let kind: string | null = null;
        for (const a of areas) {
          if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1) continue;
          if (a.kind !== 'paved' && pointIn(a.rings[0], x, y)) kind = a.kind;
        }
        if (!kind || ZIELEN.szansa[kind] === undefined || r() > ZIELEN.szansa[kind]) continue;
        const tree = r() < ZIELEN.drzew;
        const c = tree ? this.treeArt ?? this.bushArt : this.bushArt ?? this.treeArt;
        if (!c) continue;
        if (m.surfaceAt(x, y) !== 'trawa' || m.surfaceAt(x - 6, y) !== 'trawa' || m.surfaceAt(x + 6, y) !== 'trawa' || m.surfaceAt(x, y + 5) !== 'trawa') continue;
        let clear = !m.buildingAt(x, y);
        for (let k = 6; clear && k <= 30; k += 6) if (m.buildingAt(x, y + k) || m.buildingAt(x, y - k)) clear = false;
        if (!clear) continue;
        const fw = c.width / ZIELEN.klatki;
        const f = Math.floor(r() * ZIELEN.klatki);
        ctx.drawImage(c, f * fw, 0, fw, c.height, snap(x - fw / 2 / DOTS), snap(y - c.height / DOTS), fw / DOTS, c.height / DOTS);
      }
    }
  }

  /** One frame of a decoration sheet standing with its bottom middle at (x, y). */
  private stand(ctx: CanvasRenderingContext2D, key: keyof typeof DEKORACJE, x: number, y: number, frame = 0) {
    const c = this.deco[key];
    if (!c) return;
    const n = ('klatki' in DEKORACJE[key] ? (DEKORACJE[key] as { klatki: number }).klatki : 1);
    const fw = c.width / n;
    ctx.drawImage(c, (frame % n) * fw, 0, fw, c.height, snap(x - fw / 2 / DOTS), snap(y - c.height / DOTS), fw / DOTS, c.height / DOTS);
  }

  /** Walks along a line every `step` px (starting at a seeded offset), calling f with the spot, the unit direction and the side (±1). */
  private along(l: Line, step: number, f: (x: number, y: number, ux: number, uy: number, side: number, n: number) => void) {
    let carry = step * (0.3 + ((l.id * 7919) % 100) / 200);
    let side = l.id % 2 ? 1 : -1;
    let n = 0;
    for (let i = 0; i + 3 < l.pts.length; i += 2) {
      const ax = l.pts[i], ay = l.pts[i + 1], dx = l.pts[i + 2] - ax, dy = l.pts[i + 3] - ay;
      const L = Math.hypot(dx, dy);
      if (L < 0.01) continue;
      let t = carry;
      while (t < L) {
        f(ax + (dx * t) / L, ay + (dy * t) / L, dx / L, dy / L, side, n++);
        side = -side;
        t += step;
      }
      carry = t - L;
    }
  }

  /**
   * The artist's street decorations (DEKORACJE): benches and bins along park
   * paths, steam hydrants and poster columns by streets, steam grates in the
   * cobbles, clocks on squares, flower pots / crates / penny-farthings by
   * doors, the pneumatic post pillar at post offices, boxes and lockers.
   */
  private paintDecorations(ctx: CanvasRenderingContext2D, lines: Line[], areas: Area[], x0: number, y0: number) {
    const m = this.map;
    const D = DEKORACJE;
    const free = (x: number, y: number) => !m.buildingAt(x, y) && !m.buildingAt(x, y - 6) && !m.buildingAt(x, y + 6);
    for (const l of lines) {
      if (l.bridge) continue;
      const off = l.width / 2 + 1.5 * PX_PER_M;
      if (this.deco.lawka && (l.kind === 'path' || l.kind === 'pedestrian')) {
        this.along(l, D.lawka.coM * PX_PER_M, (x, y, ux, uy, side, n) => {
          const bx = x - uy * off * side, by = y + ux * off * side;
          if (!free(bx, by) || m.surfaceAt(bx, by) !== 'trawa' || !m.areaKindsAt(bx, by).includes('park')) return;
          this.stand(ctx, 'lawka', bx, by);
          if (n % 2 === 0) this.stand(ctx, 'kosz', bx + 11, by);
        });
      }
      if (l.kind === 'major' || l.kind === 'medium' || l.kind === 'minor') {
        if (this.deco.studzienka && D.studzienka.ulice.includes(l.kind)) {
          this.along(l, D.studzienka.coM * PX_PER_M, (x, y, _ux, _uy, _s, n) => {
            if (free(x, y) && m.surfaceAt(x, y) === 'asfalt') this.stand(ctx, 'studzienka', x, y + 4, (l.id + n) % 3);
          });
        }
        if (this.deco.hydrant) {
          this.along(l, D.hydrant.coM * PX_PER_M, (x, y, ux, uy, side) => {
            const hx = x - uy * (off + PX_PER_M) * side, hy = y + ux * (off + PX_PER_M) * side;
            if (free(hx, hy) && !onOtherRoad(m, l, hx, hy)) this.stand(ctx, 'hydrant', hx, hy);
          });
        }
        if (this.deco.slup && l.kind !== 'minor') {
          this.along(l, D.slup.coM * PX_PER_M, (x, y, ux, uy, side) => {
            const px = x + uy * (off + 2 * PX_PER_M) * side, py = y - ux * (off + 2 * PX_PER_M) * side;
            if (free(px, py) && !onOtherRoad(m, l, px, py)) this.stand(ctx, 'slup', px, py);
          });
        }
      }
    }
    // A street clock in the middle of bigger squares.
    if (this.deco.zegar) {
      for (const a of areas) {
        if (a.kind !== 'plaza' || (a.x1 - a.x0) * (a.y1 - a.y0) < D.zegar.odM2 * PX_PER_M * PX_PER_M || plazaLandmark(m, a)) continue;
        const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
        if (pointIn(a.rings[0], cx, cy) && free(cx, cy)) this.stand(ctx, 'zegar', cx, cy);
      }
    }
    // By the doors of places.
    const pad = 40;
    for (const p of m.places) {
      const { x, y } = p.door;
      if (x < x0 - pad || x > x0 + CHUNK + pad || y < y0 - pad || y > y0 + CHUNK + pad * 2) continue;
      const h = (Math.abs(Math.round(x * 13 + y * 7)) >>> 0) % 12;
      const potOk = ['shop', 'school', 'church', 'library', 'hotel', 'office', 'bank'].includes(p.kind);
      if (potOk && free(x - 8, y + 3)) this.stand(ctx, 'donica', x - 8, y + 3, h);
      if (potOk && free(x + 8, y + 3)) this.stand(ctx, 'donica', x + 8, y + 3, h + 1);
      if ((p.kind === 'shop' || p.kind === 'merchant' || p.kind === 'gear') && h % 2 === 0 && free(x + 16, y + 4)) this.stand(ctx, 'skrzynie', x + 16, y + 4);
      if ((p.kind === 'school' || p.kind === 'library') && h % 3 === 0 && free(x - 17, y + 4)) this.stand(ctx, 'welocyped', x - 17, y + 4);
    }
    // The pneumatic post pillar where the map has a post office, a post box or a parcel locker.
    if (this.deco.poczta) {
      for (const p of m.posts) {
        if (p.x < x0 - pad || p.x > x0 + CHUNK + pad || p.y < y0 - pad || p.y > y0 + CHUNK + pad * 2) continue;
        // A post office inside a building: the nearest free spot outside it (south first, towards the viewer).
        let spot: { x: number; y: number } | null = null;
        for (let r = 0; r <= 70 && !spot; r += 4) {
          for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [0, -1]]) {
            const qx = p.x + dx * r, qy = p.y + dy * r;
            if (free(qx, qy)) { spot = { x: qx, y: qy }; break; }
            if (!r) break;
          }
        }
        if (spot) this.stand(ctx, 'poczta', spot.x, spot.y + 2);
      }
    }
  }

  /** Gas lamps along the town streets, every LATARNIE.coM metres, alternating sides, lit at night. */
  private paintLamps(ctx: CanvasRenderingContext2D, lines: Line[]) {
    const c = this.lampArt!;
    const fw = c.width / LATARNIE.klatki;
    const f = night() && LATARNIE.klatki > 1 ? 1 : 0;
    const step = LATARNIE.coM * PX_PER_M;
    const m = this.map;
    for (const l of lines) {
      if (!LATARNIE.ulice.includes(l.kind) || l.bridge) continue;
      let carry = step / 2 + (l.id % 7) * PX_PER_M;
      let side = l.id % 2 ? 1 : -1;
      for (let i = 0; i + 3 < l.pts.length; i += 2) {
        const ax = l.pts[i], ay = l.pts[i + 1], dx = l.pts[i + 2] - ax, dy = l.pts[i + 3] - ay;
        const L = Math.hypot(dx, dy);
        if (L < 0.01) continue;
        let t = carry;
        while (t < L) {
          const off = l.width / 2 + 2 * PX_PER_M;
          const x = ax + (dx * t) / L + (-dy / L) * off * side;
          const y = ay + (dy * t) / L + (dx / L) * off * side;
          // At the road's edge: a little further out there is no more road (a dual carriageway's middle or a wide junction).
          const ox = x + (-dy / L) * 3 * PX_PER_M * side, oy = y + (dx / L) * 3 * PX_PER_M * side;
          const edge = m.buildingAt(ox, oy) || m.surfaceAt(ox, oy) !== 'asfalt';
          if (edge && !m.buildingAt(x, y) && !m.buildingAt(x, y - 6) && !onOtherRoad(m, l, x, y)) ctx.drawImage(c, f * fw, 0, fw, c.height, snap(x - fw / 2 / DOTS), snap(y - c.height / DOTS), fw / DOTS, c.height / DOTS);
          side = -side;
          t += step;
        }
        carry = t - L;
      }
    }
  }
}

import Phaser from 'phaser';
import { CityMap, PX_PER_M, type Area, type Line, type Building } from './CityMap';
import { AREA_FILL, ROAD_FILL } from './drawCity';

export { AREA_FILL, ROAD_FILL };

// Draws the city in square chunks (canvas textures) around the camera, in a
// cartoon top-down style. Chunks are drawn on demand and recycled.

const CHUNK = 512; // px
const MAX_CHUNKS = 24;
const OUTLINE = '#2a2430';

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

type Patterns = ReturnType<typeof makePatterns>;

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

export function wallHeight(b: Building) {
  // Low walls (they are drawn over the street to the south): a little per
  // storey and never more than 10 px, so narrow Old Town streets stay visible.
  return Math.max(4, Math.min(10, Math.round((2 + Math.min(b.levels || 1, 4)) * PX_PER_M)));
}

// Texture keys must be unique for the whole game, across scene restarts.
let textureCounter = 0;

interface Chunk {
  key: string;
  tex: Phaser.Textures.CanvasTexture;
  img: Phaser.GameObjects.Image;
}

export class MapRenderer {
  private chunks = new Map<string, Chunk>();
  private free: Chunk[] = [];
  private patterns?: Patterns;
  /** Buildings with special roof/wall colours (missions, shops, schools). */
  highlight = new Map<Building, { roof: string; wall: string }>();

  /** Chunks drawn before a map tile arrived: redrawn in place (kept visible meanwhile). */
  private stale = new Set<string>();

  constructor(private scene: Phaser.Scene, private map: CityMap) {
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
      c.img.destroy();
      this.scene.textures.remove(c.tex);
    }
    this.chunks.clear();
    this.free = [];
  }

  /** Draws the chunks around the camera; call every frame. */
  update(cam: Phaser.Cameras.Scene2D.Camera, budget = 2) {
    const v = cam.worldView;
    const want: [number, number, number][] = [];
    const cx0 = Math.floor((v.x - CHUNK / 2) / CHUNK), cx1 = Math.floor((v.right + CHUNK / 2) / CHUNK);
    const cy0 = Math.floor((v.y - CHUNK / 2) / CHUNK), cy1 = Math.floor((v.bottom + CHUNK / 2) / CHUNK);
    const mx = v.centerX / CHUNK - 0.5, my = v.centerY / CHUNK - 0.5;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) want.push([cx, cy, (cx - mx) ** 2 + (cy - my) ** 2]);
    want.sort((a, b) => a[2] - b[2]);
    const keep = new Set(want.map(([x, y]) => `${x},${y}`));

    // Recycle chunks far from the view.
    for (const [k, c] of this.chunks) {
      if (keep.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      if (x < cx0 - 1 || x > cx1 + 1 || y < cy0 - 1 || y > cy1 + 1 || this.chunks.size > MAX_CHUNKS) {
        c.img.setVisible(false);
        this.chunks.delete(k);
        this.stale.delete(k);
        this.free.push(c);
      }
    }

    for (const [x, y] of want) {
      const k = `${x},${y}`;
      if (this.chunks.has(k) && !this.stale.has(k)) continue;
      if (budget-- <= 0) break;
      this.draw(x, y);
    }
  }

  /** Forces a redraw of every chunk (e.g. after mission highlights change). */
  invalidate() {
    for (const [, c] of this.chunks) {
      c.img.setVisible(false);
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
      const tex = this.scene.textures.createCanvas(key, CHUNK, CHUNK)!;
      const img = this.scene.add.image(0, 0, key).setOrigin(0).setDepth(-1000);
      chunk = { key: '', tex, img };
    }
    chunk.key = `${cx},${cy}`;
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    const ctx = chunk.tex.getContext();
    this.patterns ??= makePatterns(ctx);
    this.paint(ctx, x0, y0);
    chunk.tex.refresh();
    chunk.img.setPosition(x0, y0).setVisible(true);
    this.chunks.set(chunk.key, chunk);
  }

  private paint(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
    const P = this.patterns!;
    const m = this.map;
    ctx.setTransform(1, 0, 0, 1, -x0, -y0);
    ctx.imageSmoothingEnabled = false;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.fillStyle = P.grass;
    ctx.fillRect(x0, y0, CHUNK, CHUNK);

    const box = { x0: x0 - 8, y0: y0 - 60, x1: x0 + CHUNK + 8, y1: y0 + CHUNK + 8 };
    const { areas, lines, buildings } = m.query(box);
    // Wide enough for outlines, walls (drawn lower) and patterns.
    clip = { x0: x0 - 40, y0: y0 - 80, x1: x0 + CHUNK + 40, y1: y0 + CHUNK + 80 };

    // Areas (already in draw order from the map build).
    areas.sort((a, b) => a.id - b.id);
    for (const a of areas) if (a.kind !== 'paved') this.paintArea(ctx, a);

    // Waterways, then roads (outlines first so crossings merge), then rails.
    for (const l of lines) {
      if (l.kind !== 'river' && l.kind !== 'stream' && l.kind !== 'ditch') continue;
      linePath(ctx, l.pts);
      ctx.strokeStyle = '#2f6fb3';
      ctx.lineWidth = l.width + 2;
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
      ctx.lineWidth = trackWidth(l) + (l.bridge ? 7 : 3);
      ctx.stroke();
    }
    for (const l of roads) {
      linePath(ctx, l.pts);
      ctx.strokeStyle = TRACK_FILL;
      ctx.lineWidth = trackWidth(l);
      ctx.stroke();
    }
    // Streets for cars: one cobbled surface (parallel carriageways merged
    // in build-map), over the earthen tracks; paths stay earthen.
    for (const a of areas) {
      if (a.kind !== 'paved') continue;
      ringsPath(ctx, a.rings);
      ctx.strokeStyle = TRACK_EDGE;
      ctx.lineWidth = 3;
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

    // Buildings, north to south so southern walls overlap northern roofs.
    buildings.sort((a, b) => a.y1 - b.y1);
    for (const b of buildings) this.paintBuilding(ctx, b);
    clip = null;
  }

  private paintArea(ctx: CanvasRenderingContext2D, a: Area) {
    const P = this.patterns!;
    ringsPath(ctx, a.rings);
    const pat = (P as Record<string, CanvasPattern>)[a.kind];
    ctx.fillStyle = pat ?? AREA_FILL[a.kind] ?? '#72c23a';
    ctx.fill('evenodd');
    if (a.kind === 'water') {
      ctx.strokeStyle = '#2f6fb3';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (a.kind === 'forest' || a.kind === 'pitch' || a.kind === 'parking') {
      ctx.strokeStyle = a.kind === 'pitch' ? '#ffffff' : a.kind === 'parking' ? '#9c6f42' : '#24602a';
      ctx.lineWidth = 2;
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
    const h = wallHeight(b);
    const special = this.highlight.get(b);
    // Walls: the footprint dropped by h, plus the outline.
    ringsPath(ctx, b.rings, 0, h);
    ctx.fillStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    for (let s = h; s > 0; s -= 2) {
      ringsPath(ctx, b.rings, 0, s);
      ctx.fillStyle = special ? special.wall : s > h / 2 ? '#d9c9a3' : '#eadcb8';
      ctx.fill('evenodd');
    }
    // Roof.
    ringsPath(ctx, b.rings);
    ctx.fillStyle = special ? special.roof : ROOFS[b.seed % ROOFS.length];
    ctx.fill('evenodd');
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    // A lighter inner edge gives the roof some volume.
    ringsPath(ctx, b.rings, 1, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

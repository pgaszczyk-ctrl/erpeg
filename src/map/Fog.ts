import Phaser from 'phaser';
import type { CityMap, Building } from './CityMap';
import { wallHeight, WALL_SKEW } from './MapRenderer';
import { PX_PER_M } from './CityMap';
import { MGLA } from '../content/mgla';
import { SKALA_PLIKOW } from '../content/swiat';

// Fog of war:
// - clear: what the hero sees right now (a cone where they look, a small
//   circle around them), blocked by buildings,
// - grey: places seen before,
// - black: never seen.
// "Seen before" is kept in 8 px cells, grouped in 64x64-cell chunks, and
// saved with the character.

export const FOG_CELL = 4; // world px
const CHUNK_CELLS = 64;

export const BASE_VIEW_RANGE = 125; // px, in the looking direction (the old default; see WIDOK in content/trudnosc.ts)
const BASE_NEAR_RANGE = 22; // px, all around
const CONE_HALF = (58 * Math.PI) / 180;
const RAY_STEP_DEG = 2;
const MARCH = 4; // px per ray step
const FOG_RES = 2; // world px per fog-canvas pixel

const b64 = {
  enc(bytes: Uint8Array) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  },
  dec(str: string) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

/** Marks a whole building (roof and walls) as seen. */
export function markBuilding(explored: Explored, city: CityMap, b: Building) {
  const h = wallHeight(b);
  const n = ((b.x1 - b.x0) / FOG_CELL) * ((b.y1 - b.y0 + h) / FOG_CELL);
  if (n > 40000) return; // huge blocks: only what the rays touch
  for (let y = b.y0; y <= b.y1 + h; y += FOG_CELL) {
    for (let x = b.x0; x <= b.x1; x += FOG_CELL) {
      if (city.buildingAt(x, y) === b || city.buildingAt(x, y - h) === b) explored.mark(x, y);
    }
  }
}

export class Explored {
  private chunks = new Map<string, Uint8Array>(); // 1 byte per cell (0/1)
  dirty = false;

  private chunk(cx: number, cy: number, create: boolean) {
    const k = `${cx},${cy}`;
    let c = this.chunks.get(k);
    if (!c && create) this.chunks.set(k, (c = new Uint8Array(CHUNK_CELLS * CHUNK_CELLS)));
    return c;
  }

  mark(x: number, y: number) {
    const gx = Math.floor(x / FOG_CELL);
    const gy = Math.floor(y / FOG_CELL);
    const c = this.chunk(Math.floor(gx / CHUNK_CELLS), Math.floor(gy / CHUNK_CELLS), true)!;
    const i = (gy - Math.floor(gy / CHUNK_CELLS) * CHUNK_CELLS) * CHUNK_CELLS + (gx - Math.floor(gx / CHUNK_CELLS) * CHUNK_CELLS);
    if (!c[i]) {
      c[i] = 1;
      this.dirty = true;
    }
  }

  /** Cell coordinates (not px). */
  hasCell(gx: number, gy: number) {
    const cx = Math.floor(gx / CHUNK_CELLS);
    const cy = Math.floor(gy / CHUNK_CELLS);
    const c = this.chunk(cx, cy, false);
    if (!c) return false;
    return c[(gy - cy * CHUNK_CELLS) * CHUNK_CELLS + (gx - cx * CHUNK_CELLS)] === 1;
  }

  /** Bit-packed, base64 per chunk; positions depend on the map scale. */
  serialize(): { s: number; chunks: Record<string, string> } {
    const chunks: Record<string, string> = {};
    for (const [k, c] of this.chunks) {
      const bits = new Uint8Array(c.length / 8);
      for (let i = 0; i < c.length; i++) if (c[i]) bits[i >> 3] |= 1 << (i & 7);
      chunks[k] = b64.enc(bits);
    }
    return { s: PX_PER_M, chunks };
  }

  load(data: { s: number; chunks: Record<string, string> } | undefined) {
    this.chunks.clear();
    if (!data) return;
    const k = PX_PER_M / (data.s || PX_PER_M);
    for (const [key, v] of Object.entries(data.chunks)) {
      const bits = b64.dec(v);
      const c = new Uint8Array(CHUNK_CELLS * CHUNK_CELLS);
      for (let i = 0; i < c.length; i++) c[i] = (bits[i >> 3] >> (i & 7)) & 1;
      if (Math.abs(k - 1) < 1e-6) {
        this.chunks.set(key, c);
        continue;
      }
      // Saved at another map scale (the test server's bigger world shares saves with production): every
      // seen cell marks the cells covering the same ground at this scale.
      const [cx, cy] = key.split(',').map(Number);
      for (let i = 0; i < c.length; i++) {
        if (!c[i]) continue;
        const gx = cx * CHUNK_CELLS + (i % CHUNK_CELLS), gy = cy * CHUNK_CELLS + Math.floor(i / CHUNK_CELLS);
        const x0 = gx * FOG_CELL * k, y0 = gy * FOG_CELL * k, x1 = (gx + 1) * FOG_CELL * k, y1 = (gy + 1) * FOG_CELL * k;
        for (let y = Math.floor(y0 / FOG_CELL) * FOG_CELL; y < y1; y += FOG_CELL)
          for (let x = Math.floor(x0 / FOG_CELL) * FOG_CELL; x < x1; x += FOG_CELL) this.mark(x + FOG_CELL / 2, y + FOG_CELL / 2);
      }
    }
    this.dirty = false;
  }
}

/**
 * Visible area as a polygon (flat x,y list) seen from (x, y) looking at `angle`.
 * `light` scales how far one sees (e.g. a glowing sword), `back` only around and behind.
 */
/**
 * The field of view: a cone of `view.half` radians each side of `angle`, reaching `view.range` px
 * (by difficulty, content/trudnosc.ts `widok`; later goggles may widen it), and a small circle all around.
 */
export function visionPolygon(city: CityMap, explored: Explored, x: number, y: number, angle: number, light = 1, seen?: Set<Building>, back = 1, view: { half: number; range: number } = { half: CONE_HALF, range: BASE_VIEW_RANGE }) {
  const half = view.half;
  const VIEW_RANGE = view.range * light;
  // `back`: how much further one sees around and behind (easier levels).
  const NEAR_RANGE = BASE_NEAR_RANGE * light * back;
  const pts: number[] = [];
  for (let d = 0; d < 360; d += RAY_STEP_DEG) {
    const a = (d * Math.PI) / 180;
    const diff = Math.abs(((a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    // Soften the cone edge a little.
    const range = diff < half ? VIEW_RANGE : diff < half + 0.2 ? NEAR_RANGE + (VIEW_RANGE - NEAR_RANGE) * 0.35 : NEAR_RANGE;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let r = 0;
    while (r < range) {
      r = Math.min(range, r + MARCH);
      const px = x + dx * r;
      const py = y + dy * r;
      explored.mark(px, py);
      const hitB = city.buildingAt(px, py);
      if (hitB) {
        seen?.add(hitB);
        // Let a sliver of the wall show, then stop.
        explored.mark(px + dx * FOG_CELL, py + dy * FOG_CELL);
        r = Math.min(range, r + 3);
        break;
      }
    }
    pts.push(x + dx * r, y + dy * r);
  }
  return pts;
}

export function pointInPolygon(pts: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const yi = pts[i + 1];
    const yj = pts[j + 1];
    if (yi > y !== yj > y && x < ((pts[j] - pts[i]) * (y - yi)) / (yj - yi) + pts[i]) inside = !inside;
  }
  return inside;
}

/**
 * Daylight 0 (night) … 1 (day) now at latitude/longitude, from the real
 * sunrise and sunset (sun declination; solar noon from the longitude and the
 * device's time zone), with MGLA.szarowkaGodzin of twilight on each side.
 */
export function daylight(lat: number, lon: number, d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const decl = (-23.44 * Math.PI / 180) * Math.cos((2 * Math.PI / 365) * (doy + 10));
  const phi = (lat * Math.PI) / 180;
  const c = -Math.tan(phi) * Math.tan(decl);
  if (c <= -1) return 1; // midnight sun
  if (c >= 1) return 0; // polar night
  const half = (Math.acos(c) * 180) / Math.PI / 15; // hours from noon to sunset
  const tz = -d.getTimezoneOffset() / 60;
  const noon = 12 + tz - lon / 15;
  const h = d.getHours() + d.getMinutes() / 60;
  const fromNoon = Math.abs(((h - noon + 36) % 24) - 12);
  const edge = half - fromNoon; // hours of sun left (< 0: after sunset)
  const t = MGLA.szarowkaGodzin;
  return Math.max(0, Math.min(1, (edge + t) / (2 * t)));
}

/** The parchment the unknown lands are drawn with: the artist's file, else a made-up one (soft stains, fibres, faint ink marks). */
function parchment(scene: Phaser.Scene): HTMLCanvasElement {
  const key = `swiat-${MGLA.plik}`;
  if (scene.textures.exists(key)) {
    const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const k = SKALA_PLIKOW * FOG_RES;
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(img.width / k));
    c.height = Math.max(8, Math.round(img.height / k));
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  const S = 160;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const [r, gr, b] = MGLA.dzien;
  g.fillStyle = `rgb(${r},${gr},${b})`;
  g.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Wrapped drawing so the pattern tiles.
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, rad = 6 + rnd() * 26, dark = rnd() < 0.6;
    const a = 0.05 + rnd() * 0.09;
    wrap((dx, dy) => {
      const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      grd.addColorStop(0, dark ? `rgba(90,62,30,${a})` : `rgba(255,240,205,${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    });
  }
  // Faint fibres.
  g.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S, y = rnd() * S, l = 4 + rnd() * 10, ang = rnd() * Math.PI;
    g.strokeStyle = `rgba(110,80,45,${0.05 + rnd() * 0.06})`;
    wrap((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(ang) * l, y + dy + Math.sin(ang) * l); g.stroke(); });
  }
  // A few ink marks of an old map: small crosses and dots.
  for (let i = 0; i < 9; i++) {
    const x = Math.round(rnd() * S), y = Math.round(rnd() * S), cross = rnd() < 0.5;
    g.fillStyle = 'rgba(95,68,40,0.28)';
    wrap((dx, dy) => {
      if (cross) { g.fillRect(x + dx - 1, y + dy, 3, 1); g.fillRect(x + dx, y + dy - 1, 1, 3); } else g.fillRect(x + dx, y + dy, 1, 1);
    });
  }
  return c;
}

/** Draws the fog over the camera view. */
export class FogView {
  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private cells = document.createElement('canvas');
  private cellCtx = this.cells.getContext('2d')!;
  /** Explored-but-unseen cells: a plain light haze, no parchment (owner, bug report 16). */
  private haze = document.createElement('canvas');
  private hazeCtx = this.haze.getContext('2d')!;
  /** What is seen now, cut out of the fog with a soft edge. */
  private mask = document.createElement('canvas');
  private maskCtx = this.mask.getContext('2d')!;
  private static counter = 0;

  private paper: CanvasPattern | null = null;
  /** Where the map lies on Earth, for the sunrise and sunset. */
  private where = { lat: 51.25, lon: 22.57 };
  private lightAt = 0;
  private light = 1;

  constructor(private scene: Phaser.Scene, private explored: Explored, where?: { lat: number; lon: number }) {
    if (where) this.where = where;
    const key = `fog-${FogView.counter++}`;
    this.tex = scene.textures.createCanvas(key, 64, 64)!;
    this.tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.img = scene.add.image(0, 0, key).setOrigin(0).setDepth(1_000_000).setScale(FOG_RES);
    scene.events.once('shutdown', () => {
      this.img.destroy();
      scene.textures.remove(this.tex);
    });
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, vision: number[], buildings: Iterable<Building> = []) {
    const v = cam.worldView;
    // Cell-aligned area a bit larger than the view.
    // Generous margin: the camera eases after the hero, so the view can be
    // ahead of last frame's worldView.
    const mx = Math.ceil(v.width / 3 / FOG_CELL) + 2;
    const my = Math.ceil(v.height / 3 / FOG_CELL) + 2;
    const gx0 = Math.floor(v.x / FOG_CELL) - mx;
    const gy0 = Math.floor(v.y / FOG_CELL) - my;
    const gw = Math.ceil(v.width / FOG_CELL) + 2 * mx + 1;
    const gh = Math.ceil(v.height / FOG_CELL) + 2 * my + 1;

    // 1) Explored cells: grey; unexplored: black. One pixel per cell.
    if (this.cells.width !== gw || this.cells.height !== gh) {
      this.cells.width = this.haze.width = gw;
      this.cells.height = this.haze.height = gh;
    }
    const data = this.cellCtx.createImageData(gw, gh);
    const hz = this.hazeCtx.createImageData(gw, gh);
    const d = data.data, e = hz.data;
    const [hr, hg, hb] = MGLA.mgielka;
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        const o = (j * gw + i) * 4;
        const seen = this.explored.hasCell(gx0 + i, gy0 + j);
        d[o] = d[o + 1] = d[o + 2] = 0;
        d[o + 3] = seen ? 0 : 255;
        e[o] = hr; e[o + 1] = hg; e[o + 2] = hb;
        e[o + 3] = seen ? MGLA.poznaneKrycie : 0;
      }
    }
    this.cellCtx.putImageData(data, 0, 0);
    this.hazeCtx.putImageData(hz, 0, 0);

    // 2) Scale up smoothly, then cut out what is visible now.
    const W = Math.ceil((gw * FOG_CELL) / FOG_RES);
    const H = Math.ceil((gh * FOG_CELL) / FOG_RES);
    if (this.tex.width !== W || this.tex.height !== H) {
      this.tex.setSize(W, H);
      this.tex.setFilter(Phaser.Textures.FilterMode.LINEAR); // soft fog edges
    }
    const ctx = this.tex.getContext();
    ctx.globalCompositeOperation = 'copy';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.cells, 0, 0, W, H);
    // The fog's shape painted as old parchment, darker at night (daylight checked once a minute).
    this.paper ??= ctx.createPattern(parchment(this.scene), 'repeat');
    const now = Date.now();
    if (now - this.lightAt > 60_000) {
      this.lightAt = now;
      this.light = daylight(this.where.lat, this.where.lon);
    }
    ctx.globalCompositeOperation = 'source-atop';
    if (this.paper) {
      // Pinned to the map, but drifting along with the hero at MGLA.paralaksa of his walk (a layer above the land).
      const drift = MGLA.paralaksa;
      this.paper.setTransform(new DOMMatrix([1, 0, 0, 1, (-gx0 * FOG_CELL + cam.midPoint.x * drift) / FOG_RES, (-gy0 * FOG_CELL + cam.midPoint.y * drift) / FOG_RES]));
      ctx.fillStyle = this.paper;
      ctx.fillRect(0, 0, W, H);
    }
    // Known places: under the parchment, only a light haze (you see the map, not who's there).
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(this.haze, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-atop';
    const dark = MGLA.nocCiemnosc * (1 - this.light);
    if (dark > 0.01) {
      ctx.fillStyle = `rgba(14,10,8,${dark.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // What is seen now (the vision cone and buildings in sight) goes into a mask, which then cuts the fog
    // with a soft edge (owner, 5 Oct 2026: a sharp outline looked wrong in the soft world).
    const ox = gx0 * FOG_CELL;
    const oy = gy0 * FOG_CELL;
    if (this.mask.width !== W || this.mask.height !== H) {
      this.mask.width = W;
      this.mask.height = H;
    }
    const mc = this.maskCtx;
    mc.globalCompositeOperation = 'copy';
    mc.fillStyle = 'rgba(0,0,0,0)';
    mc.fillRect(0, 0, W, H);
    mc.globalCompositeOperation = 'source-over';
    mc.fillStyle = '#000';
    mc.strokeStyle = '#000';
    mc.beginPath();
    for (let i = 0; i < vision.length; i += 2) {
      const px = (vision[i] - ox) / FOG_RES;
      const py = (vision[i + 1] - oy) / FOG_RES;
      if (i === 0) mc.moveTo(px, py);
      else mc.lineTo(px, py);
    }
    mc.closePath();
    mc.fill();
    // A building in sight is seen whole: its roof and walls, plus a few px of ground around it
    // (MGLA.odScian), so the fog's edge doesn't jitter right on the wall as the hero moves.
    mc.lineJoin = 'round';
    mc.lineWidth = (2 * MGLA.odScian) / FOG_RES;
    for (const b of buildings) {
      const h = wallHeight(b);
      for (const dy of [0, h / 2, h]) {
        const dx = dy * WALL_SKEW;
        mc.beginPath();
        for (const r of b.rings) {
          mc.moveTo((r[0] + dx - ox) / FOG_RES, (r[1] + dy - oy) / FOG_RES);
          for (let i = 2; i < r.length; i += 2) mc.lineTo((r[i] + dx - ox) / FOG_RES, (r[i + 1] + dy - oy) / FOG_RES);
          mc.closePath();
        }
        mc.fill('evenodd');
        if (MGLA.odScian > 0) mc.stroke();
      }
    }
    ctx.globalCompositeOperation = 'destination-out';
    const blur = MGLA.miekkaKrawedz / FOG_RES;
    if (blur > 0) {
      // The mask's blurred shadow does the cutting (shadows work on every browser, canvas filters don't).
      ctx.save();
      ctx.shadowColor = '#000';
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = W + 50;
      ctx.drawImage(this.mask, -(W + 50), 0);
      ctx.restore();
    } else ctx.drawImage(this.mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    this.tex.refresh();
    this.img.setPosition(ox, oy);
  }
}

import Phaser from 'phaser';
import type { CityMap, Building } from './CityMap';
import { wallHeight } from './MapRenderer';
import { PX_PER_M } from './CityMap';

// Fog of war:
// - clear: what the hero sees right now (a cone where they look, a small
//   circle around them), blocked by buildings,
// - grey: places seen before,
// - black: never seen.
// "Seen before" is kept in 8 px cells, grouped in 64x64-cell chunks, and
// saved with the character.

export const FOG_CELL = 4; // world px
const CHUNK_CELLS = 64;

const BASE_VIEW_RANGE = 125; // px, in the looking direction
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
    // A different map scale means different cells: start fresh.
    if (!data || data.s !== PX_PER_M) return;
    for (const [k, v] of Object.entries(data.chunks)) {
      const bits = b64.dec(v);
      const c = new Uint8Array(CHUNK_CELLS * CHUNK_CELLS);
      for (let i = 0; i < c.length; i++) c[i] = (bits[i >> 3] >> (i & 7)) & 1;
      this.chunks.set(k, c);
    }
  }
}

/**
 * Visible area as a polygon (flat x,y list) seen from (x, y) looking at `angle`.
 * `light` scales how far one sees (e.g. a glowing sword).
 */
export function visionPolygon(city: CityMap, explored: Explored, x: number, y: number, angle: number, light = 1, seen?: Set<Building>) {
  const VIEW_RANGE = BASE_VIEW_RANGE * light;
  const NEAR_RANGE = BASE_NEAR_RANGE * light;
  const pts: number[] = [];
  for (let d = 0; d < 360; d += RAY_STEP_DEG) {
    const a = (d * Math.PI) / 180;
    const diff = Math.abs(((a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    // Soften the cone edge a little.
    const range = diff < CONE_HALF ? VIEW_RANGE : diff < CONE_HALF + 0.2 ? NEAR_RANGE + (VIEW_RANGE - NEAR_RANGE) * 0.35 : NEAR_RANGE;
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

/** Draws the fog over the camera view. */
export class FogView {
  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private cells = document.createElement('canvas');
  private cellCtx = this.cells.getContext('2d')!;
  private static counter = 0;

  constructor(scene: Phaser.Scene, private explored: Explored) {
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
      this.cells.width = gw;
      this.cells.height = gh;
    }
    const data = this.cellCtx.createImageData(gw, gh);
    const d = data.data;
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        const o = (j * gw + i) * 4;
        const seen = this.explored.hasCell(gx0 + i, gy0 + j);
        d[o] = seen ? 28 : 6;
        d[o + 1] = seen ? 30 : 6;
        d[o + 2] = seen ? 40 : 10;
        d[o + 3] = seen ? 165 : 255;
      }
    }
    this.cellCtx.putImageData(data, 0, 0);

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
    ctx.globalCompositeOperation = 'destination-out';
    const ox = gx0 * FOG_CELL;
    const oy = gy0 * FOG_CELL;
    ctx.beginPath();
    for (let i = 0; i < vision.length; i += 2) {
      const px = (vision[i] - ox) / FOG_RES;
      const py = (vision[i + 1] - oy) / FOG_RES;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    // A building in sight is seen whole: its roof and walls.
    for (const b of buildings) {
      const h = wallHeight(b);
      for (const dy of [0, h]) {
        ctx.beginPath();
        for (const r of b.rings) {
          ctx.moveTo((r[0] - ox) / FOG_RES, (r[1] + dy - oy) / FOG_RES);
          for (let i = 2; i < r.length; i += 2) ctx.lineTo((r[i] - ox) / FOG_RES, (r[i + 1] + dy - oy) / FOG_RES);
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    this.tex.refresh();
    this.img.setPosition(ox, oy);
  }
}

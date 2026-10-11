// Heights of the ground on world maps: the free elevation tiles of the whole
// Earth on Amazon (Terrarium PNGs: height = R·256 + G + B/256 − 32768 m),
// zoom 13 (≈ 12 m per pixel in Poland), read with bilinear smoothing.
// Used for hill shading and contour lines (MapRenderer), steep slopes that
// can only be climbed along paths (CityMap.isBlocked) and slower walking
// uphill (GameScene). Tunables in content/gory.ts.

import { GORY } from '../content/gory';

export const TERRAIN_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const TZ = 13;
const N = 2 ** TZ;
const SIZE = 256;

type LatLon = (x: number, y: number) => { lat: number; lon: number };

export class Terrain {
  private tiles = new Map<number, Float32Array | null>();
  private pending = new Map<number, Promise<void>>();
  private base: string;
  /** Steeper than this (m per m) only along paths; rock and ice too, if set (content/gory.ts). */
  readonly maxSlope = GORY.urwisko;
  /** Steep off a path (slowed, CityMap.steepFactor): from this slope, speed naStromym → naStromymMin at maxSlope. */
  readonly steep = { from: GORY.stromoBezSzlaku, slow: GORY.naStromym, min: GORY.naStromymMin };
  readonly rockOnlyPaths = GORY.skalyTylkoSzlakiem;

  constructor(private toLatLon: LatLon, private pxPerM: number) {
    this.base = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('terrain')) || TERRAIN_URL;
  }

  /** Global pixel position (zoom 13) of a map point. */
  private gpx(x: number, y: number) {
    const { lat, lon } = this.toLatLon(x, y);
    return {
      gx: ((lon + 180) / 360) * N * SIZE,
      gy: ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * N * SIZE,
    };
  }

  /** Fetches the height tiles under a box (map px). */
  load(box: { x0: number; y0: number; x1: number; y1: number }): Promise<void> {
    const a = this.gpx(box.x0 - 40, box.y0 - 40), b = this.gpx(box.x1 + 40, box.y1 + 40);
    const jobs: Promise<void>[] = [];
    for (let tx = Math.floor(a.gx / SIZE); tx <= Math.floor(b.gx / SIZE); tx++)
      for (let ty = Math.floor(a.gy / SIZE); ty <= Math.floor(b.gy / SIZE); ty++) {
        const k = tx * N + ty;
        if (this.tiles.has(k)) continue;
        let job = this.pending.get(k);
        if (!job) {
          job = this.fetchTile(tx, ty)
            .then((h) => void this.tiles.set(k, h))
            .catch(() => void this.tiles.set(k, null)) // no heights there: flat
            .finally(() => this.pending.delete(k));
          this.pending.set(k, job);
        }
        jobs.push(job);
      }
    return Promise.all(jobs).then(() => undefined);
  }

  private async fetchTile(tx: number, ty: number) {
    const res = await fetch(`${this.base}/${TZ}/${tx}/${ty}.png`);
    if (!res.ok) throw new Error(`terrain ${res.status}`);
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const h = new Float32Array(SIZE * SIZE);
    for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    return h;
  }

  private sample(gx: number, gy: number) {
    const tx = Math.floor(gx / SIZE), ty = Math.floor(gy / SIZE);
    const t = this.tiles.get(tx * N + ty);
    if (!t) return NaN;
    const x = Math.min(SIZE - 1, Math.max(0, gx - tx * SIZE));
    const y = Math.min(SIZE - 1, Math.max(0, gy - ty * SIZE));
    return t[Math.floor(y) * SIZE + Math.floor(x)];
  }

  /** Height in metres at a map point (NaN where not loaded). */
  heightAt(x: number, y: number) {
    const { gx, gy } = this.gpx(x, y);
    const fx = gx - 0.5, fy = gy - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const h00 = this.sample(x0, y0), h10 = this.sample(x0 + 1, y0), h01 = this.sample(x0, y0 + 1), h11 = this.sample(x0 + 1, y0 + 1);
    return (h00 * (1 - ax) + h10 * ax) * (1 - ay) + (h01 * (1 - ax) + h11 * ax) * ay;
  }

  private slopes = new Map<number, number>();
  /** Steepness (metres up per metre across) around a point, cached on a 4 m grid. */
  slopeAt(x: number, y: number) {
    const cell = 4 * this.pxPerM;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    const k = cx * 4_000_000 + cy;
    let s = this.slopes.get(k);
    if (s === undefined) {
      const px = (cx + 0.5) * cell, py = (cy + 0.5) * cell, d = 8 * this.pxPerM;
      const dx = (this.heightAt(px + d, py) - this.heightAt(px - d, py)) / 16;
      const dy = (this.heightAt(px, py + d) - this.heightAt(px, py - d)) / 16;
      s = Math.hypot(dx, dy);
      if (Number.isNaN(s)) return 0; // not loaded yet: don't remember
      if (this.slopes.size > 300_000) this.slopes.clear();
      this.slopes.set(k, s);
    }
    return s;
  }

  /** Walking speed factor for moving (vx, vy) from (x, y): slower uphill and down steep slopes. */
  speedFactor(x: number, y: number, vx: number, vy: number) {
    const len = Math.hypot(vx, vy);
    if (!len) return 1;
    const step = 6 * this.pxPerM; // 6 m ahead
    const dh = this.heightAt(x + (vx / len) * step, y + (vy / len) * step) - this.heightAt(x, y);
    if (Number.isNaN(dh)) return 1;
    const grade = dh / 6;
    return grade > 0 ? 1 / (1 + GORY.podejscie * grade) : 1 / (1 + GORY.zejscie * -grade);
  }

  /**
   * Mountain zone at a point (owner, 11 Oct 2026, Triglav): 0 = below the treeline, 1 = above it (no trees,
   * bushes or benches; forest/park/scrub look like an alpine meadow), 2 = above the rock line (bare rock/scree
   * wherever there is no road, water or square). Both lines wander ± GORY.granicaRozrzut m with a soft noise
   * (in metres, so every chunk agrees). NaN heights (not loaded) count as 0.
   */
  zoneAt(x: number, y: number): 0 | 1 | 2 {
    const h = this.zoneHeight(x, y);
    return h >= GORY.skalyNadLasem ? 2 : h >= 0 ? 1 : 0;
  }

  /**
   * Height over the treeline at a point (m; negative below it, NaN where not loaded): the real height minus the
   * treeline for its latitude (GORY.granicaLasu at 46°, granicaLasuNaStopien lower per degree north), shifted by
   * a soft noise of ± GORY.granicaRozrzut. Rock from GORY.skalyNadLasem up.
   */
  zoneHeight(x: number, y: number) {
    const h = this.heightAt(x, y);
    if (!(h > GORY.granicaLasuMin - GORY.granicaRozrzut)) return h - GORY.granicaLasuMin - GORY.granicaRozrzut - 1;
    const { lat } = this.toLatLon(x, y);
    const line = Math.min(GORY.granicaLasuMax, Math.max(GORY.granicaLasuMin, GORY.granicaLasu - (Math.abs(lat) - 46) * GORY.granicaLasuNaStopien));
    return h - line + (noise(x / this.pxPerM / 90, y / this.pxPerM / 90) * 2 - 1) * GORY.granicaRozrzut;
  }
}

/** Smooth value noise 0..1 on a unit grid (bilinear between hashed corners, smoothstep). */
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const h = (a: number, b: number) => {
    let v = (a * 374761393 + b * 668265263) | 0;
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bottom = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

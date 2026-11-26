import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { MultiPolygon, Polygon } from 'geojson';
import geography from 'world-atlas/countries-50m.json';
import terrain from '../content/atlasTerrain.json';
import { atlasInk, atlasPaint, atlasPeaks, atlasSteamship, atlasTrees, atlasWater, atlasWaves, loadAtlasSymbols } from './loadingAtlasArt';

type Point = readonly [x: number, y: number];
type Bounds = { west: number; east: number; north: number; south: number };
type Shape = { paths: Point[][]; bounds: Bounds };

const mapPoint = ([lon, lat]: readonly number[]): Point => [(lon + 180) / 360, (90 - lat) / 360];
const wrapNear = (x: number, target: number) => x + Math.round(target - x);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function shape(paths: Point[][]): Shape {
  const bounds = { west: Infinity, east: -Infinity, north: Infinity, south: -Infinity };
  for (const ring of paths) for (const [x, y] of ring) {
    bounds.west = Math.min(bounds.west, x);
    bounds.east = Math.max(bounds.east, x);
    bounds.north = Math.min(bounds.north, y);
    bounds.south = Math.max(bounds.south, y);
  }
  return { paths, bounds };
}

function shapes(geometry: Polygon | MultiPolygon) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.map((poly) => shape(poly.map((ring) => ring.map(mapPoint))));
}

// Natural Earth 1:50m land and country outlines, supplied by world-atlas.
// Land is separate to avoid outlining every internal border as a coastline.
const topology = geography as unknown as Topology<{ land: GeometryCollection; countries: GeometryCollection }>;
const land = feature(topology, topology.objects.land).features.flatMap((item) => shapes(item.geometry as Polygon | MultiPolygon));
const countries = feature(topology, topology.objects.countries).features.map((item) => shapes(item.geometry as Polygon | MultiPolygon));
// Natural Earth 1:50m Physical Vectors (public domain): simplified rivers,
// lake polygons and elevation points, with coordinates rounded to 0.001°.
const lakes = terrain.lakes.map((poly) => shape(poly.map((ring) => ring.map(mapPoint))));
const rivers = terrain.rivers.map((line) => shape([line.map(mapPoint)]));
const peaks = terrain.peaks.map(([lon, lat, height]) => ({ p: mapPoint([lon, lat]), snowy: height > 3500 || Math.abs(lat) > 42 }));

function wraps(box: Bounds, x: number) {
  const middle = (box.west + box.east) / 2;
  return Math.round(x - middle);
}

function inside(p: Point, ring: Point[], dx: number) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [xx, yy] = ring[j];
    if ((y > p[1]) !== (yy > p[1]) && p[0] < x + dx + (xx - x) * (p[1] - y) / (yy - y)) result = !result;
  }
  return result;
}

function contains(s: Shape, p: Point) {
  const b = s.bounds, dx = wraps(b, p[0]);
  return p[0] >= b.west + dx && p[0] <= b.east + dx && p[1] >= b.north && p[1] <= b.south
    && inside(p, s.paths[0], dx) && !s.paths.slice(1).some((ring) => inside(p, ring, dx));
}

function destination(p: Point) {
  for (const country of countries) {
    const main = country.find((part) => contains(part, p));
    if (!main) continue;
    // Include nearby islands and dateline pieces, excluding remote territories
    // that would otherwise shrink the destination into a dot.
    const b = main.bounds;
    const west = b.west + wraps(b, p[0]), east = west + b.east - b.west;
    const near = country.filter(({ bounds: c }) => {
      const dx = wraps(c, p[0]);
      return c.east + dx >= west - .036 && c.west + dx <= east + .036 && c.south >= b.north - .028 && c.north <= b.south + .028;
    });
    const bounds = { west, east, north: b.north, south: b.south };
    for (const { bounds: c } of near) {
      const dx = wraps(c, p[0]);
      bounds.west = Math.min(bounds.west, c.west + dx);
      bounds.east = Math.max(bounds.east, c.east + dx);
      bounds.north = Math.min(bounds.north, c.north);
      bounds.south = Math.max(bounds.south, c.south);
    }
    return { parts: near, bounds };
  }
  return { parts: [], bounds: { west: p[0] - .016, east: p[0] + .016, north: p[1] - .01, south: p[1] + .01 } };
}

const fraction = (n: number) => n - Math.floor(n);
const noise = (x: number, y: number) => fraction(Math.sin(x * 81.733 + y * 46.127) * 32971.323);

export function prepareAtlasRegion(lat: number, lon: number) {
  const artReady = loadAtlasSymbols();
  const player = mapPoint([lon, lat]);
  const { bounds, parts } = destination(player);
  const finalX = (bounds.east + bounds.west) / 2;
  const finalY = (bounds.north + bounds.south) / 2;
  const longitudeScale = Math.max(.36, Math.cos(lat * Math.PI / 180));
  return {
    artReady,
    render(canvas: HTMLCanvasElement, marker: HTMLElement, progress: number) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const width = Math.round(w * dpr), height = Math.round(h * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const g = canvas.getContext('2d')!;
      const paint = atlasPaint(g);
      // Both axes participate in fitting the country, including on a portrait screen.
      const finalSpan = Math.max(.012, (bounds.east - bounds.west) * longitudeScale * 1.25, (bounds.south - bounds.north) * w / h * 1.25);
      const startSpan = Math.max(finalSpan, Math.min(.94, Math.max(.14, finalSpan * 3.7)));
      const t = 1 - (1 - progress) ** 1.55;
      const span = startSpan * (finalSpan / startSpan) ** t;
      const scale = w / span, sx = scale * longitudeScale;
      const cx = player[0] + (finalX - player[0]) * t, cy = player[1] + (finalY - player[1]) * t;
      const px = (x: number) => w / 2 + (x - cx) * sx;
      const py = (y: number) => h / 2 + (y - cy) * scale;
      const view = { west: cx - (w + 40) / (2 * sx), east: cx + (w + 40) / (2 * sx), north: cy - (h + 40) / (2 * scale), south: cy + (h + 40) / (2 * scale) };

      const trace = (list: Shape[], closed: boolean) => {
        g.beginPath();
        for (const { bounds: b, paths } of list) {
          if (b.south < view.north || b.north > view.south) continue;
          const dx = wraps(b, cx);
          for (const shift of [dx - 1, dx, dx + 1]) {
            if (b.east + shift < view.west || b.west + shift > view.east) continue;
            for (const ring of paths) {
              ring.forEach(([x, y], i) => {
                if (i) g.lineTo(px(x + shift), py(y));
                else g.moveTo(px(x + shift), py(y));
              });
              if (closed) g.closePath();
            }
          }
        }
      };

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.fillStyle = paint.sea;
      g.fillRect(0, 0, w, h);
      trace(land, true);
      g.strokeStyle = '#e2e7b6';
      g.lineWidth = 5;
      g.stroke();
      g.strokeStyle = atlasInk;
      g.lineWidth = 1.8;
      g.stroke();
      g.fillStyle = paint.land;
      g.fill('evenodd');

      // The selected country receives a warm wash, as in the Poland painting.
      trace(parts, true);
      g.fillStyle = paint.country;
      g.fill('evenodd');
      g.strokeStyle = '#816038a0';
      g.lineWidth = 1.1;
      g.stroke();

      const step = finalSpan < .10 ? .0055 : .012;
      const grid = Math.max(Math.round(1 / step / longitudeScale), 1);
      const treeStep = 1 / grid;
      const decorateLand = () => {
        trace(land, true);
        g.clip('evenodd');
        // Pencil-like groups on a world-anchored grid. Decorative foliage,
        // with separate fixed coordinates for waterways and mountain glyphs.
        for (let ix = Math.floor(view.west / treeStep); ix <= view.east / treeStep; ix++) {
          for (let iy = Math.floor(view.north / step); iy <= view.south / step; iy++) {
            const col = (ix % grid + grid) % grid;
            const r = noise(col, iy);
            if (r < .57) continue;
            const y = (iy + .15 + .7 * r) * step;
            const x = (col + noise(iy, col)) * treeStep;
            const latitude = 90 - y * 360, longitude = x * 360 - 180;
            const saharaAndArabia = latitude > 16 && latitude < 32 && longitude > -16 && longitude < 55;
            const australianInterior = latitude < -19 && latitude > -32 && longitude > 120 && longitude < 145;
            if (Math.abs(latitude) > 66 || saharaAndArabia || australianInterior) continue;
            const size = clamp(sx * treeStep / 54, .43, 1.08) * (.65 + r * .55);
            atlasTrees(g, px((ix + noise(iy, col)) * treeStep), py(y), size);
          }
        }
      };
      g.save();
      // Keep forests legible at atlas scale, fading them gently in as detail appears.
      g.globalAlpha = clamp((.32 - span) / .16, 0, .92);
      decorateLand();
      g.restore();

      trace(rivers, false);
      g.strokeStyle = atlasWater;
      g.lineWidth = clamp(w / 730, .8, 1.8);
      g.stroke();
      trace(lakes, true);
      g.fillStyle = paint.sea;
      g.fill('evenodd');
      g.lineWidth = .8;
      g.stroke();

      for (const { p: [x, y], snowy } of peaks) {
        const xx = wrapNear(x, cx);
        if (xx > view.west && xx < view.east && y > view.north && y < view.south) {
          atlasPeaks(g, px(xx), py(y), clamp(.15 / span, .62, 1.6), snowy);
        }
      }

      // A few flecks of painted water give quiet seas some room and texture.
      for (let ix = 1; ix < 7; ix++) for (let iy = 1; iy < 5; iy++) {
        const r = noise(ix, iy);
        if (r < .47) continue;
        const p: Point = [cx + span / longitudeScale * ((ix + r) / 8 - .5), cy + span * h / w * ((iy + noise(iy, ix)) / 6 - .5)];
        if (!land.some((s) => contains(s, p))) atlasWaves(g, px(p[0]), py(p[1]), .75 + r * .25);
      }

      // Place one small illustrated ship only where both the hull and its wake clear land.
      const ship: Point = [cx + span / longitudeScale * .30, cy + span * h / w * .30];
      const beam = 42 / sx;
      const hull: Point[] = [ship, [ship[0] - beam, ship[1]], [ship[0] + beam, ship[1]], [ship[0], ship[1] - 20 / scale]];
      if (!hull.some((p) => land.some((s) => contains(s, p)))) {
        atlasSteamship(g, px(ship[0]), py(ship[1]), clamp(w / 900, .7, 1.32));
      }

      marker.style.left = `${px(player[0])}px`;
      marker.style.top = `${py(player[1])}px`;
    },
  };
}

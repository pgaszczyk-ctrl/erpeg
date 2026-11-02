// Where a generated artillery station's cannon stands on a game map (no Phaser: also used by Node checks).
import type { CityMap } from "../map/CityMap";
import { PX_PER_M, pointInRings } from "../map/CityMap";
import { metry } from "./generator";

/** Rules for a cannon's spot (owner, 1 Nov 2026: „zawsze przynajmniej 50 m od budynków z każdej strony; koniecznie na
 *  placu lub parkingu, nie tuż obok bloków”). */
export const MIEJSCE = {
  /** No building (sheds included) closer than this, in every direction. */
  odBudynkowM: 50,
  /** Area kinds a cannon may stand on. */
  rodzaje: ["plaza", "parking"],
  /** The base and a ring this wide around it must lie on such areas. */
  podstawaM: 6,
  /** Candidate grid on the squares/car parks, metres (world-aligned, so every player gets the same spot). */
  krokM: 4,
  /** A city gate with no square/car park near (owner, 2 Nov 2026: „nie usuwaj, wysuń dalej w tym samym kierunku z dala
   *  od zabudowy”): searched outwards along its direction, up to this far, on open ground ≥ odBudynkowM from buildings,
   *  never farther than one flight (maksSkokM) from the stations it links to. */
  wysunM: 1500,
  wysunKrokM: 8,
  maksSkokM: 7000,
};
/** A gate's way out: the city centre (direction) and the stations it links to (the 7 km limit). */
export type Wysun = { centrum: { lat: number; lon: number }; partnerzy: { lat: number; lon: number }[] };
/** How far from its generated point a cannon may stand on a square/car park; a gate may move up to MIEJSCE.wysunM
 *  (the server allows a little more: ma_lot). Nowhere suitable = the station has no cannon on this map. */
export const MIEJSCE_M = 900;
/** The farthest any cannon may stand from its generated point (tiles to load around it). */
export const MIEJSCE_MAKS_M = Math.max(MIEJSCE_M, MIEJSCE.wysunM);
const miejsca = new Map<string, { x: number; y: number } | null>();

/**
 * Where a station's cannon stands on a map: the spot nearest its generated point that lies on a square or car park,
 * at least MIEJSCE.odBudynkowM from every building, not on a car road, with room and a way out.
 * undefined = the tiles there aren't loaded yet; null = nowhere suitable.
 */
export function miejsceStacji(city: CityMap, id: string, lat: number, lon: number, wysun?: Wysun) {
  const key = city.id + "|" + id;
  if (miejsca.has(key)) return miejsca.get(key);
  if (!city.hasLatLon(lat, lon)) return null;
  const p = city.fromLatLon(lat, lon),
    R = MIEJSCE_M * PX_PER_M,
    B = MIEJSCE.odBudynkowM * PX_PER_M,
    box = { x0: p.x - R, y0: p.y - R, x1: p.x + R, y1: p.y + R };
  if (!city.ready({ x0: box.x0 - B, y0: box.y0 - B, x1: box.x1 + B, y1: box.y1 + B })) return undefined;
  let found = szukaj(city, p, R, B, box);
  if (!found && wysun) {
    const w = wysunGdzie(city, p, B, wysun);
    if (w === undefined) return undefined;
    found = w;
  }
  miejsca.set(key, found);
  return found;
}

/** A gate pushed outwards from the city along its own direction onto open ground. */
function wysunGdzie(city: CityMap, p: { x: number; y: number }, B: number, w: Wysun) {
  const c = city.fromLatLon(w.centrum.lat, w.centrum.lon);
  let dx = p.x - c.x, dy = p.y - c.y;
  const dl = Math.hypot(dx, dy);
  if (dl < 1) return null;
  (dx /= dl), (dy /= dl);
  const D = MIEJSCE.wysunM * PX_PER_M, krok = MIEJSCE.wysunKrokM * PX_PER_M;
  const kx = p.x + dx * D, ky = p.y + dy * D;
  const box = { x0: Math.min(p.x, kx) - B, y0: Math.min(p.y, ky) - B, x1: Math.max(p.x, kx) + B, y1: Math.max(p.y, ky) + B };
  if (!city.ready(box)) return undefined;
  const blisko = mapaBudynkow(city, box, B, MIEJSCE.krokM * PX_PER_M);
  const wZasiegu = (x: number, y: number) => {
    const ll = city.toLatLon(x, y);
    return w.partnerzy.every((q) => metry(ll, q) <= MIEJSCE.maksSkokM);
  };
  let drogie = 0;
  for (let d = krok; d <= D; d += krok) {
    // Past the 7 km limit going further out only gets worse.
    if (!wZasiegu(p.x + dx * d, p.y + dy * d)) return null;
    for (const bok of [0, 1, -1, 2, -2]) {
      const x = p.x + dx * d - dy * bok * krok, y = p.y + dy * d + dx * bok * krok;
      if (blisko(x, y) || !city.isFree(x, y, 14, 14)) continue;
      const road = city.roadAt(x, y);
      if (road && !["path", "pedestrian", "footway", "track", "service"].includes(road.kind)) continue;
      if (city.buildingWithin(x, y, B) || !wZasiegu(x, y)) continue;
      if (++drogie > 12) return null;
      if (city.reachesFar(x, y, 100)) return { x, y };
    }
  }
  return null;
}

function szukaj(
  city: CityMap,
  p: { x: number; y: number },
  R: number,
  B: number,
  box: { x0: number; y0: number; x1: number; y1: number },
) {
  const krok = MIEJSCE.krokM * PX_PER_M,
    pod = MIEJSCE.podstawaM * PX_PER_M,
    rodzaje = new Set(MIEJSCE.rodzaje);
  // Every grid point on a square/car park within R, nearest first.
  const kand: { x: number; y: number; d: number }[] = [],
    widziane = new Set<string>(),
    place = city.areasIn(box).filter((a) => rodzaje.has(a.kind));
  for (const a of place) {
    const x0 = Math.ceil(Math.max(a.x0, box.x0) / krok), x1 = Math.floor(Math.min(a.x1, box.x1) / krok);
    const y0 = Math.ceil(Math.max(a.y0, box.y0) / krok), y1 = Math.floor(Math.min(a.y1, box.y1) / krok);
    for (let i = x0; i <= x1; i++)
      for (let j = y0; j <= y1; j++) {
        const x = i * krok, y = j * krok, d = Math.hypot(x - p.x, y - p.y), k = i + "," + j;
        if (d > R || widziane.has(k) || !pointInRings(a.rings, x, y)) continue;
        widziane.add(k);
        kand.push({ x, y, d });
      }
  }
  kand.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const blisko = mapaBudynkow(city, box, B, krok);
  const naPlacu = (x: number, y: number) =>
    place.some((a) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && pointInRings(a.rings, x, y));
  let drogie = 0;
  for (const c of kand) {
    const { x, y } = c;
    // Cheapest tests first.
    if (blisko(x, y)) continue;
    if (!naPlacu(x + pod, y) || !naPlacu(x - pod, y) || !naPlacu(x, y + pod) || !naPlacu(x, y - pod)) continue;
    if (!city.isFree(x, y, 14, 14)) continue;
    const road = city.roadAt(x, y);
    if (road && !["path", "pedestrian", "footway", "track", "service"].includes(road.kind)) continue;
    if (city.buildingWithin(x, y, B)) continue;
    // The flood fill is the dear test: a few at most.
    if (++drogie > 12) break;
    if (city.reachesFar(x, y, 100)) return { x, y };
  }
  return null;
}

/** A quick test „surely a building within B”: building outlines sampled onto a grid of `krok`, then a summed table
 *  answers whether the square inscribed in the B circle holds any of them (the exact test runs only on the rest). */
function mapaBudynkow(
  city: CityMap,
  box: { x0: number; y0: number; x1: number; y1: number },
  B: number,
  krok: number,
) {
  const x0 = box.x0 - B, y0 = box.y0 - B;
  const W = Math.ceil((box.x1 + B - x0) / krok) + 1, H = Math.ceil((box.y1 + B - y0) / krok) + 1;
  const sum = new Int32Array((W + 1) * (H + 1));
  const zaznacz = (x: number, y: number) => {
    const i = Math.floor((x - x0) / krok), j = Math.floor((y - y0) / krok);
    if (i >= 0 && j >= 0 && i < W && j < H) sum[(j + 1) * (W + 1) + i + 1] = 1;
  };
  const obszar = { x0, y0, x1: box.x1 + B, y1: box.y1 + B };
  for (const b of city.buildingsIn(obszar))
    for (const r of b.rings) {
      const n = r.length;
      for (let k = 0; k < n; k += 2) {
        const ax = r[k], ay = r[k + 1], bx = r[(k + 2) % n], by = r[(k + 3) % n];
        const kroki = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (krok / 2)));
        for (let t = 0; t <= kroki; t++) zaznacz(ax + ((bx - ax) * t) / kroki, ay + ((by - ay) * t) / kroki);
      }
    }
  for (let j = 1; j <= H; j++)
    for (let i = 1; i <= W; i++)
      sum[j * (W + 1) + i] += sum[(j - 1) * (W + 1) + i] + sum[j * (W + 1) + i - 1] - sum[(j - 1) * (W + 1) + i - 1];
  // Cells fully inside the inscribed square (half side B/√2, less one cell for the sampling).
  const h = Math.floor((B / Math.SQRT2) / krok) - 1;
  return (x: number, y: number) => {
    if (h < 0) return false;
    const ci = Math.floor((x - x0) / krok), cj = Math.floor((y - y0) / krok);
    const a = Math.max(0, ci - h), c = Math.min(W - 1, ci + h), b = Math.max(0, cj - h), d = Math.min(H - 1, cj + h);
    const S = (i: number, j: number) => sum[j * (W + 1) + i];
    return S(c + 1, d + 1) - S(a, d + 1) - S(c + 1, b) + S(a, b) > 0;
  };
}

// Where a generated artillery station's cannon stands on a game map (no Phaser: also used by Node checks).
import type { CityMap } from "../map/CityMap";
import { PX_PER_M } from "../map/CityMap";

/** How far from its generated point a cannon may stand (the server allows a little more). */
export const MIEJSCE_M = 240;
const miejsca = new Map<string, { x: number; y: number } | null>();
/**
 * Where a station's cannon stands on a map: the nearest free spot (not on a car road, room around, a way out) to its
 * generated point, searched outwards in the same order everywhere, so every player sees it in one place.
 * undefined = the tiles there aren't loaded yet; null = nowhere suitable.
 */
export function miejsceStacji(city: CityMap, id: string, lat: number, lon: number) {
  const key = city.id + "|" + id;
  if (miejsca.has(key)) return miejsca.get(key);
  if (!city.hasLatLon(lat, lon)) return null;
  const p = city.fromLatLon(lat, lon), R = MIEJSCE_M * PX_PER_M;
  if (!city.ready({ x0: p.x - R, y0: p.y - R, x1: p.x + R, y1: p.y + R })) return undefined;
  const ok = (x: number, y: number) => {
    if (!city.isFree(x, y, 14, 14)) return false;
    const road = city.roadAt(x, y);
    return !road || ["path", "pedestrian", "footway", "track"].includes(road.kind);
  };
  let found: { x: number; y: number } | null = null, tries = 0;
  for (let r = 0; r <= R && !found && tries < 8; r += 12) {
    const n = r === 0 ? 1 : Math.ceil((2 * Math.PI * r) / 12);
    for (let i = 0; i < n && tries < 8; i++) {
      const a = (i / n) * 2 * Math.PI, x = p.x + r * Math.sin(a), y = p.y - r * Math.cos(a);
      if (!ok(x, y)) continue;
      tries++;
      if (city.reachesFar(x, y, 100)) {
        found = { x, y };
        break;
      }
    }
  }
  miejsca.set(key, found);
  return found;
}

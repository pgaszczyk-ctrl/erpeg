// Big one-off decorations on squares (artist pack 04d, MIEJSCA in content/swiat.ts):
// which square gets a fountain, a dragon cauldron or a clock tower, and where.
// Shared by MapRenderer (no painted street clock there) and scenes/Landmarks.ts
// (the sprites, standing with depth and a small solid base).

import { PX_PER_M, pointInRings, type Area, type CityMap } from './CityMap';
import { MIEJSCA } from '../content/swiat';

export type Landmark = 'fontanna' | 'kociol' | 'wieza';

const TOWN_HALL = /ratusz|urząd (miasta|gminy|miejski)|rathaus|ayuntamiento|town hall|city hall|hôtel de ville|mairie|municipio|palazzo comunale/i;

/** The solid base of a landmark standing at (x, y) (its bottom centre), in map px. */
export function baseBox(kind: Landmark, x: number, y: number) {
  const [w, h] = MIEJSCA[kind].podstawa;
  return { x0: x - w / 2, y0: y - h, x1: x + w / 2, y1: y };
}

/** What stands on this square, and where (bottom centre), or null. */
export function plazaLandmark(city: CityMap, a: Area): { kind: Landmark; x: number; y: number } | null {
  if (a.kind !== 'plaza') return null;
  const m2 = ((a.x1 - a.x0) * (a.y1 - a.y0)) / (PX_PER_M * PX_PER_M);
  if (m2 < MIEJSCA.kociol.odM2) return null;
  const x = (a.x0 + a.x1) / 2;
  const y = (a.y0 + a.y1) / 2 + 4;
  if (!pointInRings(a.rings, x, y)) return null;
  const hall = city.places.some((p) => p.kind === 'office' && TOWN_HALL.test(p.name) && Math.hypot(p.door.x - x, p.door.y - y) < MIEJSCA.wieza.przyRatuszuM * PX_PER_M);
  const kind: Landmark | null =
    hall && m2 >= MIEJSCA.wieza.odM2 ? 'wieza'
    : m2 >= MIEJSCA.fontanna.odM2 ? 'fontanna'
    : (a.id * 2654435761) % 3 === 0 ? 'kociol'
    : null;
  if (!kind) return null;
  // Room for it: no building under its base or just behind it.
  const b = baseBox(kind, x, y);
  for (const [px, py] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [x, b.y0 - 6]]) if (city.buildingAt(px, py)) return null;
  return { kind, x, y };
}

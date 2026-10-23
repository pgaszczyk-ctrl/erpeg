// Combat rules deliberately independent of rendering and the live game's saves.
export type Point = { x: number; z: number };
export const RULES = {
  speed: 6.3,
  radius: 0.43,
  attackDuration: 0.38,
  attackHitAt: 0.13,
  attackCooldown: 0.47,
  reach: 2.9,
  halfArc: 0.92,
  sweepReach: 4.2,
  sweepHalfArc: 2.1,
  sweepCooldown: 6,
  potionCooldown: 14,
  regenDelay: 5,
  safeRadius: 7.5,
};
export const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const angleDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function inArc(
  from: Point,
  to: Point,
  heading: number,
  reach: number,
  halfArc: number,
  targetRadius = 0.5,
) {
  const d = distance(from, to);
  return (
    d <= reach + targetRadius &&
    (d < targetRadius ||
      Math.abs(
        angleDifference(Math.atan2(to.x - from.x, to.z - from.z), heading),
      ) <= halfArc)
  );
}
export function inRing(x: number, z: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export const inPolygon = (x: number, z: number, rings: number[][][]) =>
  inRing(x, z, rings[0]) && !rings.slice(1).some((r) => inRing(x, z, r));
export function circleBlocked(p: Point, radius: number, rings: number[][][]) {
  if (inPolygon(p.x, p.z, rings)) return true;
  for (const ring of rings)
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1],
        b = ring[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        den = dx * dx + dz * dz;
      const t = den
        ? clamp(((p.x - a[0]) * dx + (p.z - a[1]) * dz) / den, 0, 1)
        : 0;
      if (Math.hypot(p.x - a[0] - dx * t, p.z - a[1] - dz * t) < radius)
        return true;
    }
  return false;
}
export function segmentHitsCircle(a: Point, b: Point, c: Point, r: number) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    den = dx * dx + dz * dz;
  const t = den ? clamp(((c.x - a.x) * dx + (c.z - a.z) * dz) / den, 0, 1) : 0;
  return Math.hypot(a.x + dx * t - c.x, a.z + dz * t - c.z) <= r;
}
export function deathExperience(exp: number) {
  const base = Math.floor(exp / 60) * 60;
  return base + Math.floor((exp - base) * 0.9);
}

import { PLAYER, type Player } from "../objects/Player";
/** Timed hero effects that a scene restart must not discard. Absolute deadlines keep ticking in flight. */
export interface HeroState {
  hp: number;
  extra: number;
  extraUntil: number;
  boost: number;
  boostUntil: number;
  face: { x: number; y: number };
}
export function heroState(value: unknown): HeroState | null {
  const s = value as HeroState | null;
  if (
    !s ||
    ![
      s.hp,
      s.extra,
      s.extraUntil,
      s.boost,
      s.boostUntil,
      s.face?.x,
      s.face?.y,
    ].every(Number.isFinite)
  )
    return null;
  if (
    s.hp <= 0 ||
    s.hp > 100 ||
    s.extra < 0 ||
    s.extra > 100 ||
    s.boost < 0 ||
    s.boost > 10
  )
    return null;
  return structuredClone(s);
}
export function captureHero(p: Player): HeroState {
  return {
    hp: p.hp,
    extra: p.extra,
    extraUntil: p.extraUntil,
    boost: p.boost,
    boostUntil: p.boostUntil,
    face: { x: p.facing.x, y: p.facing.y },
  };
}
export function restoreHero(p: Player, value: unknown) {
  const s = heroState(value);
  if (!s) return;
  p.hp = Math.min(PLAYER.maxHp, s.hp);
  p.extra = s.extraUntil > Date.now() ? s.extra : 0;
  p.extraUntil = s.extraUntil;
  p.boost = s.boost;
  p.boostUntil = s.boostUntil;
  p.face(s.face.x, s.face.y);
}

// Approved sources: Mixkit swords supplied by the owner, staff A/v2, wolf growl v4, other attacks v1.
export const COMBAT_SOUNDS = {
  'sword-light': { variants: 1, cue: .072, gain: .60 },
  'sword-heavy': { variants: 1, cue: .342, gain: .65 },
  'staff-light': { variants: 3, cue: .035, gain: .72 },
  'staff-heavy': { variants: 3, cue: .160, gain: .72 },
  'bow-quick': { variants: 3, cue: .035, gain: .80 },
  'bow-power': { variants: 3, cue: .240, gain: .80 },
  fireball: { variants: 3, cue: .100, gain: .75 },
  heatwave: { variants: 3, cue: .290, gain: .75 },
  dagger: { variants: 3, cue: .045, gain: .60 },
  bone: { variants: 3, cue: .075, gain: .65 },
  'chestnut-throw': { variants: 3, cue: .035, gain: .75 },
  'chestnut-hit': { variants: 3, cue: .015, gain: .65 },
  'wolf-growl': { variants: 3, cue: 0, gain: .65 },
  'wolf-leap': { variants: 3, cue: .025, gain: .65 },
  'wolf-bite': { variants: 3, cue: .025, gain: .65 },
} as const;
export type CombatSound = keyof typeof COMBAT_SOUNDS;
export const meleeSound = (weapon: string | null | undefined, strong: boolean): CombatSound =>
  `${!weapon || weapon === 'kijek' ? 'staff' : 'sword'}-${strong ? 'heavy' : 'light'}`;
export const shotSound = (skill: 'luk' | 'magia', strong: boolean): CombatSound =>
  skill === 'magia' ? (strong ? 'heatwave' : 'fireball') : (strong ? 'bow-power' : 'bow-quick');
export const enemyMeleeSound = (kind: string): CombatSound | undefined =>
  kind === 'szkielet' ? 'bone' : ['bandyta', 'herszt', 'wielki_herszt'].includes(kind) ? 'dagger' : undefined;

/** Place a sample's audible action at an animation event. Crop unavailable windup rather than play late. */
export function soundTiming(cue: number, eventMs: number) {
  return { delayMs: Math.max(0, eventMs - cue * 1000), offset: Math.max(0, cue - eventMs / 1000) };
}

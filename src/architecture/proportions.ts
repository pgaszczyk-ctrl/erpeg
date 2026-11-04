/** Visible bounds of the unchanged 64×64 lab hero frames, in source-image pixels. */
export const LAB_HERO_BOUNDS = { width: 42, height: 54 } as const;
export interface CharacterReference { width: number; height: number }
export interface Openings { doorWidth: number; doorHeight: number; windowWidth: number; windowHeight: number; spacing: number }
export const MAX_BUILDING_LEVELS = 3;
/** Owner's compression: OSM 1–3 → 1, 4–6 → 2, above 6 → 3. */
export function buildingLevels(value: string | number | undefined): number {
  const parsed=Number(value);
  return Number.isFinite(parsed)&&parsed>0?(parsed<=3?1:parsed<=6?2:MAX_BUILDING_LEVELS):1;
}
export function labHeroScale(characterScale: number): number {
  return characterScale === 2 / 3 ? .25 : .36 * characterScale;
}
/** Metres here are stylised map units: the actual sprite, not real-world door sizes, is the ruler. */
export function characterReference(spriteScale = .25, pixelsPerMetre = 1.92): CharacterReference {
  return { width: LAB_HERO_BOUNDS.width * spriteScale / pixelsPerMetre, height: LAB_HERO_BOUNDS.height * spriteScale / pixelsPerMetre };
}
export function cottageOpenings(character: CharacterReference = characterReference()): Openings {
  return {
    doorWidth: character.width * 1.12,
    doorHeight: character.height * 1.12,
    windowWidth: character.width * .72,
    windowHeight: character.height * .48,
    spacing: character.width * 1.7,
  };
}
export function cottageWallHeight(openings: Openings, heightInDoors = 1.32, existingHeight = 0): number {
  return Math.max(openings.doorHeight * heightInDoors, existingHeight);
}
export function buildingWallHeight(openings: Openings, levels: number, heightInDoors = 1.32): number {
  // `levels` is already compressed by the planner; never compress it a second time.
  const rendered=Number.isFinite(levels)?Math.min(MAX_BUILDING_LEVELS,Math.max(1,Math.round(levels))):1;
  return cottageWallHeight(openings,heightInDoors)*rendered;
}

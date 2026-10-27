/** One origin story per character, across every city. Kept inside the existing saved Story object. */
export const PROLOG_ID = 'prolog.recruit.v1';
export const STAGES = ['intro', 'letter_deliver', 'letter_return', 'rescue_fight', 'rescue_reward', 'bow_trial', 'rescue_return', 'dungeon_enter', 'dungeon_first_group', 'magic_pickup', 'magic_trial', 'dungeon_recover', 'dungeon_return', 'library_visit', 'completed'] as const;
export type PrologStage = typeof STAGES[number];
export type AnchorKind = 'mentor' | 'outpost' | 'ambush' | 'bowPractice' | 'dungeonEntrance' | 'library';
export interface Anchor { id: string; lat: number; lon: number; name: string; fallback: boolean }
export interface PrologState {
  version: 1;
  status: 'active' | 'completed' | 'skipped';
  stage: PrologStage;
  originMapId: string;
  originName: string;
  anchors: Partial<Record<AnchorKind, Anchor>>;
  rewardsClaimed: string[];
  storyItems: ('letter' | 'receipt' | 'bear')[];
  pendingRewards: string[];
  bowTried: boolean;
  magicTried: boolean;
  rescueKilled: number[];
  dungeon: { id: string; seed: number; killed: number[]; chest: boolean } | null;
  /** The first weapon and headwear remain recoverable even with a full backpack. */
  service: 'guard' | 'independent';
}
export function freshProlog(): PrologState {
  return { version: 1, status: 'active', stage: 'intro', originMapId: '', originName: '', anchors: {}, rewardsClaimed: [], storyItems: [], pendingRewards: [], bowTried: false, magicTried: false, rescueKilled: [], dungeon: null, service: 'guard' };
}
export function mayStart(state: PrologState | undefined, mission: string | undefined): boolean {
  // A global mission marker also protects characters whose older client preserved only that marker.
  return !state && !mission;
}
export function claimOnce(p: PrologState, id: string, give: () => void): boolean {
  if (p.rewardsClaimed.includes(id)) return false;
  give();
  p.rewardsClaimed.push(id);
  return true;
}
export function advance(p: PrologState, from: PrologStage, to: PrologStage): boolean {
  if (p.status !== 'active' || p.stage !== from || STAGES.indexOf(to) <= STAGES.indexOf(from)) return false;
  p.stage = to;
  if (to === 'completed') p.status = 'completed';
  return true;
}
export function recordKill(p: PrologState, encounter: 'rescue' | 'dungeon', index: number, count: number): boolean {
  const list = encounter === 'rescue' ? p.rescueKilled : p.dungeon?.killed;
  if (!list || index < 0 || index >= count || list.includes(index) || p.status !== 'active') return false;
  list.push(index);
  return true;
}

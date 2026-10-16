import type { RodzajWroga } from '../content/fabula';
import type { RodzajGangu } from '../content/gangi';
import type { Gang, StreetSpawn } from '../scenes/Ambient';
import type { GatunekId } from '../content/smoki';
import type { Stats } from '../api';
import type { saveGear } from '../inventory';
import type { Story } from '../quests';
import type { Point } from './rules';
export interface CombatLoot extends Point { kind: string; n: number; texture: string; frame: string | number; scale: number }

export interface SavedEnemy extends Point {
  id: number; hp: number; kind: RodzajWroga; missionId?: string; temp?: boolean;
  ambient?: boolean; folkQuest?: boolean; carrier?: boolean; gatunek?: GatunekId;
  berserk?: boolean; power?: number; slot?: number; boss?: boolean;
  duel?: { folkId: string; hp: number; damage: number; carry: number };
}
export interface CombatSave {
  origin: string;
  version: 1; stamp: number; map: string; scale: number; nonce: number;
  phase: 'hero' | 'enemy'; round: number; moves: number; max: number; rng: number;
  active: number[]; responded: number[]; enemies: SavedEnemy[];
  hero: Point & { hp: number; extra: number; extraUntil: number };
  intents: [number, Point & { angle: number; reach: number }][];
  stunned: number[];
  loot: CombatLoot[];
  gang?: { id: string; kind: RodzajGangu; x: number; y: number; r: number; spots: StreetSpawn[] | null; alive: number[]; boss: Gang['boss']; formation?: Gang['formation'] };
  progress: { exp: number; coins: number; stats: Stats; missions: Record<string, import('../quests').MissionState>; story: Story; mikstury: number; etap: Record<string,number>; fabula: string[]; flagi: Record<string,number>; gear: ReturnType<typeof saveGear> };
}

const key = (name: string) => `exp-test-combat-v1:${name}`;
/** Compare recovery against the actual last server save, without storing a credential. */
export function combatBase(save: unknown, exp: number) {
  const plain=JSON.parse(JSON.stringify(save)) as Record<string,unknown>;
  delete plain.testCombat;
  const stable=(v:unknown):unknown=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v;
  const text=JSON.stringify([exp,stable(plain)]);let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return (h>>>0).toString(16);
}
export function localCombat(name: string): CombatSave | null {
  try { const s = JSON.parse(localStorage.getItem(key(name)) ?? 'null'); return s?.version === 1 && Array.isArray(s.enemies) && s.enemies.length <= 60 ? s : null; } catch { return null; }
}
export function storeCombat(name: string, state: CombatSave | null) {
  try { if (state) localStorage.setItem(key(name), JSON.stringify(state)); else localStorage.removeItem(key(name)); } catch { /* The server checkpoint still works when browser storage is disabled. */ }
}

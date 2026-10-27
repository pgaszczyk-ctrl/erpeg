import type { Gear } from '../inventory';
import type { PrologState } from './state';
import type { Miejsce } from '../content/przedmioty';

/** Save the old item before replacing its slot, including zero-value sticks. Never silently discard gear. */
export function equipStoryItem(p: PrologState, gear: Gear, id: string, slot: Miejsce, capacity: number) {
  const old=gear.equip[slot];
  if(old===id)return;
  if(old){if(gear.bag.length<capacity)gear.bag.push({item:old});else p.pendingRewards.push(old);}
  gear.equip[slot]=id;
}
/** A saved depot is accessible from the backpack in every city. Collecting does not auto-equip items. */
export function collectStoryItems(p: PrologState, gear: Gear, capacity: number) {
  while(p.pendingRewards.length && gear.bag.length<capacity)gear.bag.push({item:p.pendingRewards.shift()!});
}

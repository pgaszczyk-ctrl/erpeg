import {
  PRZEDMIOTY, PLECAK, UMIEJETNOSCI, PIERWSZY_POZIOM, MNOZNIK_POZIOMU, MAKS_POZIOM, OBRONA_ZA_PUNKT, OBRONA_MAKS,
  type Miejsce, type Przedmiot, type Umiejetnosc,
} from './content/przedmioty';
import { OWOCE, type Owoc } from './content/sklepy';

// The character's things: equipped items, a 5-slot backpack (fruit stacks up
// to 99 per slot), skill practice and whether they learned magic.

export type Slot = { item: string } | { fruit: Owoc; n: number };

export interface Gear {
  equip: Record<Miejsce, string | null>;
  bag: Slot[];
  skills: Record<Umiejetnosc, number>;
  magic: boolean;
}

export const gear: Gear = freshGear();

export function freshGear(): Gear {
  return {
    equip: { bron: 'kijek', dystans: null, zbroja: null, helm: null, buty: null },
    bag: [],
    skills: { miecz: 0, luk: 0, magia: 0 },
    magic: false,
  };
}

export function item(id: string | null | undefined): Przedmiot | undefined {
  return id ? PRZEDMIOTY.find((p) => p.id === id) : undefined;
}

/** Loads gear from a save, converting saves from before the backpack. */
export function loadGear(save: {
  equip?: Gear['equip']; bag?: Slot[]; skills?: Gear['skills']; magic?: boolean;
  sword?: string; swordSkill?: number; fruits?: Partial<Record<Owoc, number>>;
}) {
  const g = freshGear();
  if (save.equip) Object.assign(g.equip, save.equip);
  else if (save.sword && item(save.sword)) g.equip.bron = save.sword; // old "sword" field
  if (save.bag) g.bag = save.bag.filter((s) => ('item' in s ? item(s.item) : OWOCE[s.fruit])).slice(0, PLECAK.miejsc);
  if (save.skills) Object.assign(g.skills, save.skills);
  else if (save.swordSkill) g.skills.miecz = pointsForLevel(1 + save.swordSkill * 2); // old school levels
  g.magic = !!save.magic;
  Object.assign(gear, g);
  for (const [f, n] of Object.entries(save.fruits ?? {}) as [Owoc, number][]) for (let i = 0; i < n; i++) addFruit(f);
}

export function saveGear() {
  return { equip: gear.equip, bag: gear.bag, skills: gear.skills, magic: gear.magic };
}

// ---------------------------------------------------------------- skills

/** Total practice needed to reach `level` (level 1 needs 0). */
export function pointsForLevel(level: number) {
  let total = 0;
  for (let l = 2; l <= level; l++) total += Math.round(PIERWSZY_POZIOM * MNOZNIK_POZIOMU ** (l - 2));
  return total;
}

export function skillLevel(skill: Umiejetnosc) {
  const p = gear.skills[skill];
  let l = 1;
  while (l < MAKS_POZIOM && p >= pointsForLevel(l + 1)) l++;
  return l;
}

/** Progress inside the current level, for the character sheet. */
export function skillProgress(skill: Umiejetnosc) {
  const level = skillLevel(skill);
  if (level >= MAKS_POZIOM) return { level, into: 1, need: 1 };
  const base = pointsForLevel(level);
  return { level, into: gear.skills[skill] - base, need: pointsForLevel(level + 1) - base };
}

/** Adds practice; returns the new level if it went up. */
export function practice(skill: Umiejetnosc, points = 1): number | null {
  const before = skillLevel(skill);
  gear.skills[skill] += points;
  const after = skillLevel(skill);
  return after > before ? after : null;
}

/** Time between attacks of that kind, in ms. */
export function cooldown(skill: Umiejetnosc) {
  const u = UMIEJETNOSCI[skill];
  return u.przerwa - (skillLevel(skill) - 1) * u.szybciejNaPoziom;
}

/** Skills the character can use (shown on the character sheet). */
export function availableSkills(): Umiejetnosc[] {
  const out: Umiejetnosc[] = ['miecz'];
  const hasBow = gear.equip.dystans && item(gear.equip.dystans)?.rodzaj === 'luk';
  const bagBow = gear.bag.some((s) => 'item' in s && item(s.item)?.rodzaj === 'luk');
  if (hasBow || bagBow || gear.skills.luk > 0) out.push('luk');
  if (gear.magic) out.push('magia');
  return out;
}

// ---------------------------------------------------------------- equipment

/** Special power of the weapon in hand (mythic items). */
export function weaponEffect() {
  return item(gear.equip.bron)?.efekt;
}

export function meleeDamage() {
  return item(gear.equip.bron)?.moc ?? 1;
}

/** The equipped ranged weapon, if it can be used (magic needs the skill). */
export function rangedWeapon(): Przedmiot | null {
  const r = item(gear.equip.dystans);
  if (!r) return null;
  if (r.rodzaj === 'magia' && !gear.magic) return null;
  return r;
}

export function defense() {
  return (['zbroja', 'helm', 'buty'] as Miejsce[]).reduce((sum, m) => sum + (item(gear.equip[m])?.moc ?? 0), 0);
}

/** Chance that a hit does no harm, from armour. */
export function blockChance() {
  return Math.min(OBRONA_MAKS, defense() * OBRONA_ZA_PUNKT);
}

export function owns(id: string) {
  return Object.values(gear.equip).includes(id) || gear.bag.some((s) => 'item' in s && s.item === id);
}

/** Puts a new item on (if that slot is free) or into the backpack. */
export function addItem(id: string): 'equipped' | 'bag' | false {
  const p = item(id);
  if (!p) return false;
  if (!gear.equip[p.miejsce] || gear.equip[p.miejsce] === 'kijek') {
    // A stick is not worth keeping when a real weapon comes along.
    gear.equip[p.miejsce] = id;
    return 'equipped';
  }
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ item: id });
  return 'bag';
}

/** Swaps a backpack item with what is worn in its place. */
export function equipFromBag(index: number) {
  const s = gear.bag[index];
  if (!s || !('item' in s)) return;
  const p = item(s.item)!;
  const worn = gear.equip[p.miejsce];
  gear.equip[p.miejsce] = s.item;
  if (worn && worn !== 'kijek') gear.bag[index] = { item: worn };
  else gear.bag.splice(index, 1);
}

export function unequip(m: Miejsce): boolean {
  const worn = gear.equip[m];
  if (!worn || worn === 'kijek') return false;
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ item: worn });
  gear.equip[m] = m === 'bron' ? 'kijek' : null;
  return true;
}

export function dropFromBag(index: number) {
  gear.bag.splice(index, 1);
}

// ---------------------------------------------------------------- fruit

export function addFruit(f: Owoc): boolean {
  const stack = gear.bag.find((s) => 'fruit' in s && s.fruit === f && s.n < PLECAK.owocowNaMiejsce) as { fruit: Owoc; n: number } | undefined;
  if (stack) {
    stack.n++;
    return true;
  }
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ fruit: f, n: 1 });
  return true;
}

export function fruitCount(f: Owoc) {
  return gear.bag.reduce((n, s) => n + ('fruit' in s && s.fruit === f ? s.n : 0), 0);
}

export function fruitValue() {
  return gear.bag.reduce((v, s) => v + ('fruit' in s ? s.n * OWOCE[s.fruit].cena : 0), 0);
}

/** Removes all fruit from the backpack; returns its value in coins. */
export function sellAllFruit() {
  const v = fruitValue();
  gear.bag = gear.bag.filter((s) => !('fruit' in s));
  return v;
}

export function totalFruit() {
  return gear.bag.reduce((n, s) => n + ('fruit' in s ? s.n : 0), 0);
}

/** Eats `n` fruit, cheapest first; false if there are not enough. */
export function eatFruit(n: number): boolean {
  if (totalFruit() < n) return false;
  const stacks = gear.bag
    .filter((s): s is { fruit: Owoc; n: number } => 'fruit' in s)
    .sort((a, b) => OWOCE[a.fruit].cena - OWOCE[b.fruit].cena);
  for (const st of stacks) {
    const take = Math.min(n, st.n);
    st.n -= take;
    n -= take;
    if (!n) break;
  }
  gear.bag = gear.bag.filter((s) => !('fruit' in s) || s.n > 0);
  return true;
}

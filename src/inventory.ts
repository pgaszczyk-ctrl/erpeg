import {
  PRZEDMIOTY, PLECAK, UMIEJETNOSCI, PIERWSZY_POZIOM, MNOZNIK_POZIOMU, MAKS_POZIOM, OBRONA_ZA_PUNKT, OBRONA_MAKS,
  type Miejsce, type Przedmiot, type Umiejetnosc,
} from './content/przedmioty';
import { OWOCE, GRUPY, type Grupa, type Owoc } from './content/sklepy';

// The character's things: equipped items, a 5-slot backpack, skill practice
// and whether they learned magic. Fruit, vegetables, mushrooms and wood lie in
// the backpack by group (one slot each, up to PLECAK.owocowNaMiejsce); how
// many of each kind is kept only for selling (the prices differ).

export type Goods = { goods: Grupa; counts: Partial<Record<Owoc, number>> };
export type Slot = { item: string } | Goods;

/** How many things are in a goods slot. */
export function goodsN(s: Goods) {
  return Object.values(s.counts).reduce((a, b) => a + (b ?? 0), 0);
}

/** A slot from an old save ({ fruit, n }) or a new one. */
export function normalizeSlot(s: unknown): Slot | null {
  const o = s as { item?: string; fruit?: Owoc; n?: number; goods?: Grupa; counts?: Goods['counts'] } | null;
  if (!o) return null;
  if (o.item) return item(o.item) ? { item: o.item } : null;
  if (o.goods && GRUPY[o.goods]) return { goods: o.goods, counts: { ...o.counts } };
  if (o.fruit && OWOCE[o.fruit] && o.n) return { goods: OWOCE[o.fruit].grupa, counts: { [o.fruit]: o.n } };
  return null;
}

/** Icon and description of a slot (backpack, chest). */
export function goodsLabel(s: Goods) {
  const parts = (Object.entries(s.counts) as [Owoc, number][]).filter(([, n]) => n > 0).map(([f, n]) => `${OWOCE[f].mnoga} ${n}`);
  return `${GRUPY[s.goods].nazwa} ×${goodsN(s)}${parts.length > 1 ? ` (${parts.join(', ')})` : ''}`;
}

/** Moves as much as fits from goods slot `a` onto `b` (same group). */
export function mergeGoods(a: Goods, b: Goods) {
  let room = PLECAK.owocowNaMiejsce - goodsN(b);
  for (const f of Object.keys(a.counts) as Owoc[]) {
    const take = Math.min(room, a.counts[f] ?? 0);
    if (!take) continue;
    b.counts[f] = (b.counts[f] ?? 0) + take;
    a.counts[f]! -= take;
    room -= take;
  }
}

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
  // Old saves kept one slot per fruit kind: now they merge by group.
  const old: Goods[] = [];
  for (const raw of save.bag ?? []) {
    const s = normalizeSlot(raw);
    if (!s) continue;
    if ('item' in s) g.bag.push(s);
    else old.push(s);
  }
  g.bag = g.bag.slice(0, PLECAK.miejsc);
  if (save.skills) Object.assign(g.skills, save.skills);
  else if (save.swordSkill) g.skills.miecz = pointsForLevel(1 + save.swordSkill * 2); // old school levels
  g.magic = !!save.magic;
  Object.assign(gear, g);
  for (const s of old) for (const [f, n] of Object.entries(s.counts) as [Owoc, number][]) for (let i = 0; i < n; i++) addFruit(f);
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

const goodsSlots = () => gear.bag.filter((s): s is Goods => 'goods' in s);
const dropEmpty = () => (gear.bag = gear.bag.filter((s) => !('goods' in s) || goodsN(s) > 0));

export function addFruit(f: Owoc): boolean {
  const g = OWOCE[f].grupa;
  const slot = goodsSlots().find((s) => s.goods === g && goodsN(s) < PLECAK.owocowNaMiejsce);
  if (slot) {
    slot.counts[f] = (slot.counts[f] ?? 0) + 1;
    return true;
  }
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ goods: g, counts: { [f]: 1 } });
  return true;
}

export function fruitCount(f: Owoc) {
  return goodsSlots().reduce((n, s) => n + (s.counts[f] ?? 0), 0);
}

/** How many things of one group (all fruit, all vegetables…). */
export function groupCount(g: Grupa) {
  return goodsSlots().reduce((n, s) => n + (s.goods === g ? goodsN(s) : 0), 0);
}

export function fruitValue() {
  return goodsSlots().reduce((v, s) => v + (Object.entries(s.counts) as [Owoc, number][]).reduce((a, [f, n]) => a + n * OWOCE[f].cena, 0), 0);
}

/** Removes all goods from the backpack; returns their value in coins. */
export function sellAllFruit() {
  const v = fruitValue();
  gear.bag = gear.bag.filter((s) => !('goods' in s));
  return v;
}

/** Things one can eat (fruit, vegetables, mushrooms – not wood). */
export function totalFruit() {
  return goodsSlots().reduce((n, s) => n + (Object.entries(s.counts) as [Owoc, number][]).reduce((a, [f, c]) => a + (OWOCE[f].jadalne ? c : 0), 0), 0);
}

/** Takes `n` of one kind out of the backpack; false if there are not enough. */
export function takeFruit(f: Owoc, n: number): boolean {
  if (fruitCount(f) < n) return false;
  for (const s of goodsSlots()) {
    const take = Math.min(n, s.counts[f] ?? 0);
    if (take) s.counts[f]! -= take;
    n -= take;
    if (!n) break;
  }
  dropEmpty();
  return true;
}

/** Eats `n` edible things, cheapest first; false if there are not enough. */
export function eatFruit(n: number): boolean {
  if (totalFruit() < n) return false;
  const kinds = (Object.keys(OWOCE) as Owoc[]).filter((f) => OWOCE[f].jadalne).sort((a, b) => OWOCE[a].cena - OWOCE[b].cena);
  for (const f of kinds) {
    const take = Math.min(n, fruitCount(f));
    if (take) takeFruit(f, take);
    n -= take;
    if (!n) break;
  }
  return true;
}

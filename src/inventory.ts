import { WALKA, zTabeli } from './content/walka';
import {
  PRZEDMIOTY, PLECAK, UMIEJETNOSCI, kosztPoziomu, MAKS_POZIOM, OBRONA_ZA_PUNKT, OBRONA_MAKS,
  PODKOWA, TALIZMANY, type Miejsce, type Przedmiot, type Umiejetnosc,
} from './content/przedmioty';
import { OWOCE, GRUPY, type Grupa, type Owoc } from './content/sklepy';
import { esencja } from './content/esencje';

// The character's things: equipped items, a 5-slot backpack, skill practice
// and whether they learned magic. Fruit, vegetables, mushrooms and wood lie in
// the backpack by group (one slot each, up to PLECAK.owocowNaMiejsce); how
// many of each kind is kept only for selling (the prices differ).

export type Goods = { goods: Grupa; counts: Partial<Record<Owoc, number>> };
/** An essence flask (content/esencje.ts): dragged onto a weapon it imbues it for a while. */
export type Flask = { esencja: string };
export type Slot = { item: string } | Goods | Flask;

/** How many things are in a goods slot. */
export function goodsN(s: Goods) {
  return Object.values(s.counts).reduce((a, b) => a + (b ?? 0), 0);
}

/** A slot from an old save ({ fruit, n }) or a new one. */
export function normalizeSlot(s: unknown): Slot | null {
  const o = s as { item?: string; fruit?: Owoc; n?: number; goods?: Grupa; counts?: Goods['counts']; esencja?: string } | null;
  if (!o) return null;
  if (o.esencja) return esencja(o.esencja) ? { esencja: o.esencja } : null;
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
  /** Imbued weapons: item id → essence and until when (Date.now ms). */
  imbue: Record<string, { e: string; until: number }>;
}

export const gear: Gear = freshGear();

export function freshGear(): Gear {
  return {
    equip: { bron: 'kijek', dystans: null, zbroja: null, helm: null, buty: null, amulet: null, talizman: null, talizman2: null, talizman3: null },
    bag: [],
    skills: { miecz: 0, luk: 0, magia: 0 },
    magic: false,
    imbue: {},
  };
}

export function item(id: string | null | undefined): Przedmiot | undefined {
  return id ? PRZEDMIOTY.find((p) => p.id === id) : undefined;
}

/** Loads gear from a save, converting saves from before the backpack. */
export function loadGear(save: {
  equip?: Gear['equip']; bag?: Slot[]; skills?: Gear['skills']; magic?: boolean; nasycenia?: Gear['imbue'];
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
    if ('goods' in s) old.push(s);
    else g.bag.push(s);
  }
  g.bag = g.bag.slice(0, PLECAK.miejsc);
  if (save.skills) Object.assign(g.skills, save.skills);
  else if (save.swordSkill) g.skills.miecz = pointsForLevel(1 + save.swordSkill * 2); // old school levels
  g.magic = !!save.magic;
  for (const [id, v] of Object.entries(save.nasycenia ?? {})) if (v && esencja(v.e) && v.until > Date.now()) g.imbue[id] = { e: v.e, until: v.until };
  // Bows and wands used to go in the second hand; now they are held in the main hand.
  const off = item(g.equip.dystans);
  if (off && off.miejsce === 'bron' && g.bag.length < PLECAK.miejsc) {
    g.bag.push({ item: off.id });
    g.equip.dystans = null;
  }
  Object.assign(gear, g);
  for (const s of old) for (const [f, n] of Object.entries(s.counts) as [Owoc, number][]) for (let i = 0; i < n; i++) addFruit(f);
  for (const [f, n] of Object.entries(save.fruits ?? {}) as [Owoc, number][]) for (let i = 0; i < n; i++) addFruit(f);
}

export function saveGear() {
  return { equip: gear.equip, bag: gear.bag, skills: gear.skills, magic: gear.magic, nasycenia: gear.imbue };
}

// ---------------------------------------------------------------- skills

/** Total practice needed to reach `level` (level 1 needs 0). */
export function pointsForLevel(level: number) {
  let total = 0;
  for (let l = 2; l <= level; l++) total += kosztPoziomu(l);
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
  const lvl = skillLevel(skill);
  if (skill === 'miecz') return Math.round(zTabeli(WALKA.miecz.przerwa, lvl));
  if (skill === 'luk') return Math.round(Math.max(WALKA.luk.najkrotszaPrzerwa, zTabeli(WALKA.luk.przerwa, lvl)));
  const u = UMIEJETNOSCI[skill];
  return Math.max(300, u.przerwa - (lvl - 1) * u.szybciejNaPoziom);
}

/** Chance (0–1) that an attack lands: the skill's table plus the difficulty's bonus. */
export function hitChance(skill: Umiejetnosc, strong: boolean, bonus = 0) {
  const lvl = skillLevel(skill);
  let pct = 100;
  if (skill === 'miecz') pct = strong ? 100 : zTabeli(WALKA.miecz.trafienie, lvl);
  else if (skill === 'luk') pct = zTabeli(strong ? WALKA.luk.mocnyTrafienie : WALKA.luk.trafienie, lvl);
  return Math.min(100, pct + bonus) / 100;
}

/** How many times harder a strong attack of that kind hits. */
export function strongFactor(skill: Umiejetnosc) {
  if (skill === 'miecz') return zTabeli(WALKA.miecz.mocnyMnoznik, skillLevel('miecz'));
  if (skill === 'luk') return WALKA.luk.mocnyMnoznik;
  return WALKA.mnoznikCzaru;
}

/** Chance (0–1) that an arrow kills an ordinary monster at once. */
export function instaKillChance() {
  return zTabeli(WALKA.luk.natychmiast, skillLevel('luk')) / 100;
}

/** Skills the character can use (shown on the character sheet). */
export function availableSkills(): Umiejetnosc[] {
  const out: Umiejetnosc[] = ['miecz'];
  const hasBow = item(gear.equip.bron)?.rodzaj === 'luk';
  const bagBow = gear.bag.some((s) => 'item' in s && item(s.item)?.rodzaj === 'luk');
  if (hasBow || bagBow || gear.skills.luk > 0) out.push('luk');
  if (gear.magic) out.push('magia');
  return out;
}

// ---------------------------------------------------------------- equipment

let luckCarry = 0;
/** Coins from monsters and gangs: 10% more while the Podkowa Szczęścia is worn (fractions add up). */
export function luckyCoins(n: number) {
  if (!TALIZMANY.some((m) => item(gear.equip[m])?.efekt === 'szczescie')) return n;
  const v = n * PODKOWA + luckCarry;
  const whole = Math.floor(v);
  luckCarry = v - whole;
  return whole;
}

/** Special power of the weapon in hand (mythic items). */
export function weaponEffect() {
  return item(gear.equip.bron)?.efekt;
}

/** A blow of the weapon in hand: skill level + WALKA.zaMoc × its power (content/walka.ts). */
export function meleeDamage() {
  const p = item(gear.equip.bron);
  const moc = p && !p.rodzaj ? p.moc : 1; // a bow or wand used as a club is no better than a stick
  return skillLevel('miecz') + WALKA.zaMoc * moc;
}

/** A shot of the bow / a spell of the wand in hand (a magic item in the other hand adds its power to spells). */
export function shotDamage(weapon: Przedmiot) {
  const skill: Umiejetnosc = weapon.rodzaj === 'magia' ? 'magia' : 'luk';
  const off = item(gear.equip.dystans);
  const extra = skill === 'magia' && off?.rodzaj === 'magia' ? off.moc : 0;
  return skillLevel(skill) + WALKA.zaMoc * (weapon.moc + extra);
}

/** The equipped ranged weapon, if it can be used (magic needs the skill). */
export function rangedWeapon(): Przedmiot | null {
  const r = item(gear.equip.bron);
  if (!r?.rodzaj || r.miejsce !== 'bron') return null;
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
  // Talismans always go into the backpack first: they work once dragged onto a talisman place.
  if (TALIZMANY.includes(p.miejsce) && gear.bag.length < PLECAK.miejsc) {
    gear.bag.push({ item: id });
    return 'bag';
  }
  const m = slotFor(p.miejsce);
  if (!gear.equip[m] || gear.equip[m] === 'kijek') {
    // A stick is not worth keeping when a real sword comes along (with a bow or wand it goes to the backpack).
    if (gear.equip[m] === 'kijek' && p.rodzaj && gear.bag.length < PLECAK.miejsc) gear.bag.push({ item: 'kijek' });
    gear.equip[m] = id;
    return 'equipped';
  }
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ item: id });
  return 'bag';
}

/** Where an item of that kind goes: a talisman takes the first free of the three talisman places. */
function slotFor(m: Miejsce): Miejsce {
  if (!TALIZMANY.includes(m)) return m;
  return TALIZMANY.find((t) => !gear.equip[t]) ?? 'talizman';
}

/** Swaps a backpack item with what is worn in its place. */
export function equipFromBag(index: number) {
  const s = gear.bag[index];
  if (!s || !('item' in s)) return;
  const p = item(s.item)!;
  const m = slotFor(p.miejsce);
  const worn = gear.equip[m];
  gear.equip[m] = s.item;
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

/** Takes up to `n` things of one group (cheapest kinds first); returns how many were taken. */
export function takeGroup(g: Grupa, n: number): number {
  let taken = 0;
  const kinds = (Object.keys(OWOCE) as Owoc[]).filter((f) => OWOCE[f].grupa === g).sort((a, b) => OWOCE[a].cena - OWOCE[b].cena);
  for (const f of kinds) {
    const take = Math.min(n - taken, fruitCount(f));
    if (take) takeFruit(f, take);
    taken += take;
    if (taken >= n) break;
  }
  return taken;
}

/** What all the things of one group in the backpack are worth. */
export function groupValue(g: Grupa) {
  return goodsSlots().reduce((v, s) => v + (s.goods === g ? (Object.entries(s.counts) as [Owoc, number][]).reduce((a, [f, c]) => a + c * OWOCE[f].cena, 0) : 0), 0);
}

/** Sells every thing of one group from the backpack; returns the coins. */
export function sellGroup(g: Grupa) {
  const v = groupValue(g);
  gear.bag = gear.bag.filter((s) => !('goods' in s) || s.goods !== g);
  return v;
}

// ---------------------------------------------------------------- essences and moving things around

/** Puts an essence flask into the backpack; false if it is full. */
export function addEssence(id: string): boolean {
  if (gear.bag.length >= PLECAK.miejsc) return false;
  gear.bag.push({ esencja: id });
  return true;
}

/** The essence working on that weapon now, with minutes left. */
export function imbueOf(id: string | null | undefined) {
  const v = id ? gear.imbue[id] : undefined;
  if (!v) return null;
  const left = v.until - Date.now();
  if (left <= 0) {
    delete gear.imbue[id!];
    return null;
  }
  const e = esencja(v.e);
  return e ? { e, minutes: Math.ceil(left / 60_000) } : null;
}

/** Can things of this kind be imbued (weapons in hand or the second hand)? */
export function canImbue(id: string | null | undefined) {
  const p = item(id);
  return !!p && (p.miejsce === 'bron' || p.miejsce === 'dystans');
}

/** Can this item be worn in that place? */
export function fits(id: string, m: Miejsce) {
  const p = item(id);
  if (!p) return false;
  return TALIZMANY.includes(p.miejsce) ? TALIZMANY.includes(m) : p.miejsce === m;
}

/** A place in the equipment, the backpack or the chest (grids in the character sheet and the chest). */
export type Place = { zone: 'eq'; m: Miejsce } | { zone: 'bag' | 'chest'; i: number };

/**
 * Drags the thing at `from` onto `to`: puts it on (if it fits), takes it off,
 * swaps, merges goods, or rubs an essence into a weapon. `chest` is the chest's
 * slots when it is open. Returns a message for the player ('' = done quietly).
 */
export function moveThing(from: Place, to: Place, chest?: (Slot | null)[]): string {
  const bag: (Slot | null)[] = Array.from({ length: PLECAK.miejsc }, (_, i) => gear.bag[i] ?? null);
  const list = (z: 'bag' | 'chest') => (z === 'bag' ? bag : chest!);
  const get = (p: Place): Slot | null => {
    if (p.zone === 'eq') {
      const id = gear.equip[p.m];
      return id && id !== 'kijek' ? { item: id } : null;
    }
    return list(p.zone)[p.i] ?? null;
  };
  const put = (p: Place, s: Slot | null) => {
    if (p.zone === 'eq') gear.equip[p.m] = s && 'item' in s ? s.item : p.m === 'bron' ? 'kijek' : null;
    else list(p.zone)[p.i] = s;
  };
  const done = (msg = '') => {
    gear.bag = bag.filter((s): s is Slot => !!s);
    return msg;
  };
  const a = get(from);
  if (!a || (from.zone === to.zone && (from.zone === 'eq' ? from.m === (to as { m: Miejsce }).m : from.i === (to as { i: number }).i))) return '';
  // An essence onto a weapon: the weapon is imbued, the flask is used up.
  const targetId = to.zone === 'eq' ? gear.equip[to.m] : ((b) => (b && 'item' in b ? b.item : null))(get(to));
  if ('esencja' in a && (to.zone === 'eq' || (targetId && canImbue(targetId)))) {
    if (!targetId || !canImbue(targetId)) return 'Esencję przeciągnij na broń.';
    const e = esencja(a.esencja)!;
    gear.imbue[targetId] = { e: e.id, until: Date.now() + e.minut * 60_000 };
    put(from, null);
    return done(`${e.ikona} ${item(targetId)!.nazwa}: ${e.nazwa} działa przez ${e.minut} minut.`);
  }
  const b = get(to);
  if (to.zone === 'eq') {
    if (!('item' in a) || !fits(a.item, to.m)) return 'To tu nie pasuje.';
    if (from.zone === 'eq') {
      put(to, a);
      put(from, b);
      return done();
    }
    put(to, a);
    put(from, b);
    return done();
  }
  if (from.zone === 'eq') {
    // Taking something off: onto an empty cell, or swapping with a thing that fits there.
    if (b && !('item' in b && fits(b.item, from.m))) return 'Połóż to na wolnym miejscu.';
    put(to, a);
    put(from, b);
    return done();
  }
  if (b && 'goods' in a && 'goods' in b && a.goods === b.goods) {
    mergeGoods(a, b);
    if (!goodsN(a)) put(from, null);
    return done();
  }
  put(to, a);
  put(from, b);
  return done();
}

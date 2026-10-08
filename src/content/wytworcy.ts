import type { Grupa } from './sklepy';

/** Mechanisms first: recipe quantities/prices/healing remain easy to balance later. */
interface FoodRecipe {
  item: string; name: string; icon: string;
  group: Extract<Grupa, 'owoce' | 'warzywa'>;
  amount: number; coins: number; hearts: number;
}
export const WYTWORCY: Record<'paczkarnia' | 'mcdonalds', FoodRecipe> = {
  paczkarnia: { item: 'paczek', name: 'Pączek', icon: '🍩', group: 'owoce', amount: 20, coins: 50, hearts: 2 },
  mcdonalds: { item: 'hamburger', name: 'Burger warzywny', icon: '🍔', group: 'warzywa', amount: 20, coins: 50, hearts: 2 },
};

export function producerRecipe(name: string) {
  if (/dobra pączkarnia/i.test(name)) return WYTWORCY.paczkarnia;
  if (/\bmc ?donald['’]?s\b/i.test(name)) return WYTWORCY.mcdonalds;
  return null;
}

export function foodIcon(id: string) {
  return Object.values(WYTWORCY).find(r => r.item === id)?.icon;
}

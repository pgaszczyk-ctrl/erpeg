/** TEST recipes: costs and healing can be adjusted independently of the shop window. */
export const WYTWORCY = {
  paczkarnia: { item: 'paczek', name: 'Pączek', icon: '🍩', fruit: 20, coins: 50, hearts: 1 },
} as const;

export function producerRecipe(name: string) {
  if (/dobra pączkarnia/i.test(name)) return WYTWORCY.paczkarnia;
  return null;
}

export function foodIcon(id: string) {
  return Object.values(WYTWORCY).find(r => r.item === id)?.icon;
}

/** McDonald's houses a smith, never a food producer. */
export const isSmith = (name: string) => /\bmc ?donald['’]?s\b/i.test(name);

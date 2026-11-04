import { condition, gear, item, type Slot } from './inventory';
import { SKUP_SPRZETU } from './content/sklepy';

/** Only ordinary priced items can be resold; rewards and premium goods retain their existing rules. */
export function bagSaleOffer(slot: Slot): { price: number; reason?: string } {
  if ('goods' in slot) return { price: 0, reason: 'Zbiory sprzedawaj według grupy.' };
  if (!('item' in slot)) return { price: 0, reason: 'Kupiec nie skupuje esencji. Zachowaj ją do nasycenia broni.' };
  const p = item(slot.item);
  if (!p) return { price: 0, reason: 'Kupiec nie zna tego przedmiotu.' };
  if (p.fabularny) return { price: 0, reason: 'Przedmiot fabularny — kupiec go nie skupuje.' };
  if (p.cenaDiamenty) return { price: 0, reason: 'Kupiec nie skupuje przedmiotów kupowanych za diamenty.' };
  if (p.cena <= 0) return { price: 0, reason: 'Nagroda lub przedmiot bez ceny odkupu — kupiec go nie skupuje.' };
  const wear = condition(p.id);
  return { price: Math.max(1, Math.floor(p.cena * SKUP_SPRZETU.czescCeny * (wear ? wear.left / wear.max : 1))) };
}

/** Sell this exact backpack object once. A stale selection must never remove a shifted or equipped item. */
export function sellBagItem(slot: Slot): number {
  if (!('item' in slot)) return 0;
  const at = gear.bag.indexOf(slot), { price } = bagSaleOffer(slot);
  if (at < 0 || price <= 0) return 0;
  gear.bag.splice(at, 1);
  return price;
}

import { UMIEJETNOSCI, type Przedmiot } from '../content/przedmioty';
import { itemPictureUrl, itemLargeUrl, goodsPicture, rzeczUrl } from './itemIcon';
import type { Grupa } from '../content/sklepy';
import { condition, item, type Slot } from '../inventory';
import { bagSaleOffer } from '../shopSales';
import { esencja } from '../content/esencje';

export type ShopCategory = 'all' | 'weapons' | 'armour' | 'supplies' | 'ammo' | 'magic' | 'services' | 'food';
/** Presentation only: the existing shop callbacks still perform every transaction. */
export interface ShopEntry {
  id: string;
  index: number;
  name: string;
  category: ShopCategory;
  picture?: string | null;
  /** Bigger picture for the preview (order 45), when there is one. */
  pictureLarge?: string | null;
  icon?: string;
  costNote?: string;
  description: string;
  stats?: [string, string][];
  price?: number;
  diamonds?: boolean;
  action?: string;
  /** Shown in the selling list, with an explanation instead of a sale. */
  disabledReason?: string;
  badge?: string;
  /** Rebuild stock after the existing callback, unless it already opens another dialog. */
  refresh?: boolean;
}
export interface ShopPresentation {
  id: string;
  banner: 'decathlon' | 'kupiec_01';
  subtitle: string;
  sellsAmmo?: boolean;
  emptyText?: string;
  entries: ShopEntry[];
}

export function shopItem(p: Przedmiot, index: number, price: number): ShopEntry {
  const category: ShopCategory = p.pojazd || p.narzedzie ? 'supplies' : p.rodzaj === 'magia' ? 'magic'
    : p.miejsce === 'bron' ? 'weapons' : 'armour';
  return {
    id: `buy:${p.id}`, index, name: p.nazwa, category, picture: itemPictureUrl(p.id), pictureLarge: itemLargeUrl(p.id),
    description: p.opis ?? (p.miejsce === 'bron' ? 'Solidna broń na kolejne wyprawy.' : 'Ochrona przydatna podczas wędrówki.'),
    stats: [
      ...(!p.pojazd ? [[p.rodzaj === 'magia' ? 'Moc magii' : p.miejsce === 'bron' ? 'Obrażenia' : 'Pancerz', String(p.moc)] as [string, string]] : []),
      ...(p.miejsce === 'bron' ? [[`Wymaga ${UMIEJETNOSCI[p.rodzaj ?? 'miecz'].dopelniacz}:`, String(p.wymaganySkill ?? 1)] as [string, string]] : []),
      ...(p.wytrzymalosc ? [['Wytrzymałość', `${p.wytrzymalosc}/${p.wytrzymalosc}`] as [string, string]] : []),
    ],
    price: p.cenaDiamenty ?? price, diamonds: !!p.cenaDiamenty, action: 'KUP', refresh: true,
  };
}

export function shopGoods(g: Grupa, index: number, name: string, count: number, value: number): ShopEntry {
  return { id: `sell:${g}`, index, name, category: 'supplies', picture: goodsPicture(g),
    description: 'Kupiec odkupi całą tę grupę z plecaka.', stats: [['Liczba', String(count)]],
    price: value, action: 'SPRZEDAJ' };
}

export function shopBagItem(slot: Exclude<Slot, { goods: unknown }>, index: number, bagIndex: number): ShopEntry {
  const offer = bagSaleOffer(slot);
  const p = 'item' in slot ? item(slot.item) : undefined;
  const wear = p ? condition(p.id) : null;
  const entry: ShopEntry = p ? shopItem(p, index, offer.price) : {
    id: '', index, name: 'esencja' in slot ? esencja(slot.esencja)?.nazwa ?? slot.esencja : 'Nieznany przedmiot',
    category: 'magic', picture: 'esencja' in slot ? rzeczUrl(`esencja_${slot.esencja}`) : undefined,
    description: 'Flakonik esencji z twojego plecaka.',
  };
  return { ...entry, id: `sell:bag:${bagIndex}`, index, diamonds: false, refresh: false,
    ...(p?.leczenie ? { category: 'food' } : p && (p.miejsce.startsWith('talizman') || p.miejsce === 'amulet') ? { category: 'supplies' } : {}),
    description: entry.description + (offer.reason ? '' : ' Kupiec odkupi jedną sztukę z plecaka.'),
    price: offer.reason ? undefined : offer.price, action: offer.reason ? 'NIE NA SPRZEDAŻ' : 'SPRZEDAJ', disabledReason: offer.reason,
    stats: (entry.stats ?? []).map(([label, value]): [string, string] => [label, label === 'Wytrzymałość' && wear ? `${wear.left}/${wear.max}` : value]),
  };
}

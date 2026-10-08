import type { Przedmiot } from '../content/przedmioty';
import { itemPictureUrl, goodsPicture } from './itemIcon';
import type { Grupa } from '../content/sklepy';

export type ShopCategory = 'all' | 'weapons' | 'armour' | 'supplies' | 'ammo' | 'magic' | 'services' | 'food';
/** Presentation only: the existing shop callbacks still perform every transaction. */
export interface ShopEntry {
  id: string;
  index: number;
  name: string;
  category: ShopCategory;
  picture?: string | null;
  icon?: string;
  costNote?: string;
  description: string;
  stats?: [string, string][];
  price?: number;
  diamonds?: boolean;
  action?: string;
  badge?: string;
  /** Rebuild stock after the existing callback, unless it already opens another dialog. */
  refresh?: boolean;
}
export interface ShopPresentation {
  id: string;
  banner: 'decathlon' | 'kupiec_01';
  subtitle: string;
  sellsAmmo?: boolean;
  entries: ShopEntry[];
}

export function shopItem(p: Przedmiot, index: number, price: number): ShopEntry {
  const category: ShopCategory = p.pojazd || p.narzedzie ? 'supplies' : p.rodzaj === 'magia' ? 'magic'
    : p.miejsce === 'bron' ? 'weapons' : 'armour';
  return {
    id: `buy:${p.id}`, index, name: p.nazwa, category, picture: itemPictureUrl(p.id),
    description: p.opis ?? (p.miejsce === 'bron' ? 'Solidna broń na kolejne wyprawy.' : 'Ochrona przydatna podczas wędrówki.'),
    stats: [
      ...(!p.pojazd ? [[p.rodzaj === 'magia' ? 'Moc magii' : p.miejsce === 'bron' ? 'Obrażenia' : 'Obrona', String(p.moc)] as [string, string]] : []),
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

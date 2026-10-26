// The skill on the „special” button (new controls test, walka/live.ts). One active skill per weapon kind,
// changed ONLY at a training place (owner, 26 Oct 2026: „umiejętności będziemy zmieniać tylko w ośrodkach
// treningowych takich jak stadiony, siłownie lub biblioteki w przypadku magów”): sword and bow skills at a
// stadium judge / sports training stations / fitness centres, magic at a library. Numbers are TEST VALUES.
import type { Umiejetnosc } from './przedmioty';

export type IdUmiejetnosci = 'mocny' | 'zamach' | 'mocny_strzal' | 'salwa' | 'mocny_czar' | 'wachlarz';

export interface Umiej {
  id: IdUmiejetnosci;
  nazwa: string;
  ikona: string;
  bron: Umiejetnosc;
  opis: string;
  /** Needs this level of the weapon skill (0 = from the start). */
  poziom: number;
}

export const UMIEJETNOSCI: Umiej[] = [
  { id: 'mocny', nazwa: 'Mocny cios', ikona: '💥', bron: 'miecz', poziom: 0, opis: 'Potężny cios przed siebie: dalej, mocniej, zawsze trafia i ogłusza.' },
  { id: 'zamach', nazwa: 'Zamach', ikona: '🌀', bron: 'miecz', poziom: 3, opis: 'Obrót z bronią: trafia każdego wroga dookoła (słabiej niż mocny cios).' },
  { id: 'mocny_strzal', nazwa: 'Mocny strzał', ikona: '🎯', bron: 'luk', poziom: 0, opis: 'Napięta do końca cięciwa: mocniej i celniej.' },
  { id: 'salwa', nazwa: 'Salwa', ikona: '🏹', bron: 'luk', poziom: 3, opis: 'Trzy strzały naraz w wachlarzu.' },
  { id: 'mocny_czar', nazwa: 'Mocny czar', ikona: '✨', bron: 'magia', poziom: 0, opis: 'Skupiony czar: znacznie silniejszy pocisk.' },
  { id: 'wachlarz', nazwa: 'Wachlarz ognia', ikona: '🔥', bron: 'magia', poziom: 3, opis: 'Pięć ognistych pocisków w szerokim wachlarzu.' },
];

/** The default skill of a weapon kind (the first, available from the start). */
export const domyslnaUmiejetnosc = (b: Umiejetnosc) => UMIEJETNOSCI.find((u) => u.bron === b && u.poziom === 0)!;

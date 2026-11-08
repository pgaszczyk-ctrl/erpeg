// TEST HUD A (29 Oct 2026): the selector also switches level-unlocked skills of the current weapon.
// Training-place selection stays available; production keeps its training-only rule until release.
// The skill on the „special” button (new controls test, walka/live.ts). One active skill per weapon kind,
// changed ONLY at a training place (owner, 26 Oct 2026: „umiejętności będziemy zmieniać tylko w ośrodkach
// treningowych takich jak stadiony, siłownie lub biblioteki w przypadku magów”): sword and bow skills at a
// stadium judge / sports training stations / fitness centres, magic at a library. Numbers are TEST VALUES.
import type { Umiejetnosc } from './przedmioty';
import { tx } from '../i18n';

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
  { id: 'mocny', get nazwa() { return tx('Mocny cios', 'Strong blow'); }, ikona: '💥', bron: 'miecz', poziom: 0, get opis() { return tx('Potężny cios przed siebie: dalej, mocniej, zawsze trafia i ogłusza.', 'A mighty blow ahead: farther, harder, always hits and stuns.'); } },
  { id: 'zamach', get nazwa() { return tx('Zamach', 'Sweep'); }, ikona: '🌀', bron: 'miecz', poziom: 3, get opis() { return tx('Obrót z bronią: trafia każdego wroga dookoła (słabiej niż mocny cios).', 'A spin with your weapon: hits every enemy around (weaker than a strong blow).'); } },
  { id: 'mocny_strzal', get nazwa() { return tx('Mocny strzał', 'Strong shot'); }, ikona: '🎯', bron: 'luk', poziom: 0, get opis() { return tx('Napięta do końca cięciwa: mocniej i celniej.', 'A fully drawn bowstring: harder and more accurate.'); } },
  { id: 'salwa', get nazwa() { return tx('Salwa', 'Volley'); }, ikona: '🏹', bron: 'luk', poziom: 3, get opis() { return tx('Trzy strzały naraz w wachlarzu.', 'Three arrows at once in a fan.'); } },
  { id: 'mocny_czar', get nazwa() { return tx('Mocny czar', 'Strong spell'); }, ikona: '✨', bron: 'magia', poziom: 0, get opis() { return tx('Skupiony czar: znacznie silniejszy pocisk.', 'A focused spell: a much stronger missile.'); } },
  { id: 'wachlarz', get nazwa() { return tx('Wachlarz ognia', 'Fan of fire'); }, ikona: '🔥', bron: 'magia', poziom: 3, get opis() { return tx('Pięć ognistych pocisków w szerokim wachlarzu.', 'Five fiery missiles in a wide fan.'); } },
];

/** The default skill of a weapon kind (the first, available from the start). */
export const domyslnaUmiejetnosc = (b: Umiejetnosc) => UMIEJETNOSCI.find((u) => u.bron === b && u.poziom === 0)!;

// TEST HUD A (29 Oct 2026): the selector also switches level-unlocked skills of the current weapon.
// Training-place selection stays available; production keeps its training-only rule until release.
// The skill on the „special” button (new controls test, walka/live.ts). One active skill per weapon kind,
// changed ONLY at a training place (owner, 26 Oct 2026: „umiejętności będziemy zmieniać tylko w ośrodkach
// treningowych takich jak stadiony, siłownie lub biblioteki w przypadku magów”): sword and bow skills at a
// stadium judge / sports training stations / fitness centres, magic at a library. Numbers are TEST VALUES.
import type { Umiejetnosc } from './przedmioty';
import { tx } from '../i18n';

export type IdUmiejetnosci = 'mocny' | 'zamach' | 'tarcza' | 'mocny_strzal' | 'przebicie' | 'salwa' | 'mocny_czar' | 'wachlarz' | 'krag';

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
  { id: 'tarcza', get nazwa() { return tx('Uderzenie tarczą', 'Shield bash'); }, ikona: '🛡', bron: 'miecz', poziom: 0, get opis() { return tx('Pchnięcie tarczą przed siebie: odrzuca i ogłusza wrogów.', 'A shove with your shield: knocks enemies back and stuns them.'); } },
  { id: 'przebicie', get nazwa() { return tx('Strzał przebijający', 'Piercing shot'); }, ikona: '🎯', bron: 'luk', poziom: 0, get opis() { return tx('Mocny strzał, który przelatuje przez kilku wrogów.', 'A strong shot that flies through several enemies.'); } },
  { id: 'krag', get nazwa() { return tx('Krąg mocy', 'Circle of power'); }, ikona: '🔮', bron: 'magia', poziom: 0, get opis() { return tx('Fala magii wokół ciebie: rani wszystkich wrogów w pobliżu.', 'A wave of magic around you: hurts every enemy nearby.'); } },
  { id: 'mocny_strzal', get nazwa() { return tx('Mocny strzał', 'Strong shot'); }, ikona: '🎯', bron: 'luk', poziom: 0, get opis() { return tx('Napięta do końca cięciwa: mocniej i celniej.', 'A fully drawn bowstring: harder and more accurate.'); } },
  { id: 'salwa', get nazwa() { return tx('Salwa', 'Volley'); }, ikona: '🏹', bron: 'luk', poziom: 3, get opis() { return tx('Trzy strzały naraz w wachlarzu.', 'Three arrows at once in a fan.'); } },
  { id: 'mocny_czar', get nazwa() { return tx('Mocny czar', 'Strong spell'); }, ikona: '✨', bron: 'magia', poziom: 0, get opis() { return tx('Skupiony czar: znacznie silniejszy pocisk.', 'A focused spell: a much stronger missile.'); } },
  { id: 'wachlarz', get nazwa() { return tx('Fala ognia', 'Wave of fire'); }, ikona: '🔥', bron: 'magia', poziom: 3, get opis() { return tx('Pięć ognistych pocisków w szerokim wachlarzu.', 'Five fiery missiles in a wide fan.'); } },
];

/** The default skill of a weapon kind (the first, available from the start). */
export const domyslnaUmiejetnosc = (b: Umiejetnosc) => UMIEJETNOSCI.find((u) => u.bron === b && u.poziom === 0)!;

/**
 * The special attack comes from the equipment, not from a choice (owner, 24 Nov 2026: „dwa ataki, będą wynikały
 * z broni lub offhandu”; no skill tree): the second hand decides when it holds something that has its own special,
 * otherwise the weapon itself. Shields work with every one-handed weapon from skill 1 (their passive powers need
 * the item's `mocWymaga`). Quivers and two-handed weapons come later.
 */
export function specjalnyZEkwipunku(bron: Umiejetnosc, drugaReka: string | null | undefined): IdUmiejetnosci {
  const druga = drugaReka ?? '';
  if (bron === 'miecz') return druga.startsWith('tarcza_') ? 'tarcza' : 'zamach';
  if (bron === 'luk') return 'przebicie';
  if (druga.startsWith('kula')) return 'wachlarz';
  if (druga.startsWith('ksiega')) return 'mocny_czar';
  return 'krag';
}

export const umiejetnoscOId = (id: IdUmiejetnosci) => UMIEJETNOSCI.find((u) => u.id === id)!;

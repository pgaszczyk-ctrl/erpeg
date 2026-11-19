// Profesje (raport 19.11.2026, wzór Tibii): wybór od 5. poziomu u szefa straży. Profesja nie blokuje broni – zmienia
// tempo, w jakim rosną umiejętności (główna ×1,5, pozostałe ×0,7). Zmiana: za diament. Stroje profesji przyjdą z
// nowymi postaciami (zamówienie dla grafika). Bez Phasera.
import type { Umiejetnosc } from './przedmioty';

export type ProfesjaId = 'rycerz' | 'lowca' | 'mag';

export const PROFESJE: Record<ProfesjaId, { nazwa: { pl: string; en: string }; ikona: string; glowna: Umiejetnosc; opis: { pl: string; en: string } }> = {
  rycerz: { nazwa: { pl: 'Rycerz', en: 'Knight' }, ikona: '🛡', glowna: 'miecz',
    opis: { pl: 'Miecz i tarcza, walka wręcz. Krzepa rośnie półtora raza szybciej.', en: 'Sword and shield, close combat. Melee skill grows one and a half times faster.' } },
  lowca: { nazwa: { pl: 'Łowca', en: 'Hunter' }, ikona: '🏹', glowna: 'luk',
    opis: { pl: 'Łuk, kusza, pistolet parowy – walka z dystansu. Celność rośnie półtora raza szybciej.', en: 'Bow, crossbow, steam pistol – ranged combat. Archery grows one and a half times faster.' } },
  mag: { nazwa: { pl: 'Mag', en: 'Mage' }, ikona: '🪄', glowna: 'magia',
    opis: { pl: 'Różdżka, kula i księga, walka czarami. Skupienie rośnie półtora raza szybciej.', en: 'Wand, orb and book – combat with spells. Focus grows one and a half times faster.' } },
};

export const PROFESJA = {
  odPoziomu: 5,
  glowna: 1.5,
  inne: 0.7,
  /** Zmiana profesji kosztuje tyle diamentów (nigdy „wcale” – kto źle wybrał, odszedłby z gry). */
  zmianaDiamenty: 1,
};

/** The character's profession now (set at login, saved as `profesja`). */
export const profesja: { id: ProfesjaId | null } = { id: null };

export function mnoznikProfesji(skill: Umiejetnosc): number {
  if (!profesja.id) return 1;
  return PROFESJE[profesja.id].glowna === skill ? PROFESJA.glowna : PROFESJA.inne;
}

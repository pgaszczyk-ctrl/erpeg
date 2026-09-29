// ============================================================================
//  ESENCJE I SMARY
//  Flakonik leży w plecaku (jedno miejsce). Przeciągnięty na broń (założoną
//  albo w plecaku) nasyca ją na `minut` minut. Na broni widać wtedy w rogu
//  ikonkę esencji i ile minut zostało. Nowa esencja na tej samej broni
//  zastępuje starą.
//  Uwarzy je alchemik na stacji benzynowej z tego, co w `przepis`.
//
//  efekt:
//   'oglusz' – z szansą `szansa` trafiony potwór stoi ogłuszony `ms` i nie bije,
//   'mroz'   – potwory z listy `wrazliwe` dostają `mnoznik` razy mocniej,
//              a z szansą `szansa` każdy trafiony zamarza na `ms`.
//  Smoki się nie ogłuszają i nie zamarzają (ale wrażliwe mogą być).
// ============================================================================

import type { RodzajWroga } from './fabula';
import type { Grupa } from './sklepy';

export interface Esencja {
  id: string;
  nazwa: string;
  ikona: string;
  /** Kolor znaczka na broni. */
  kolor: string;
  minut: number;
  efekt: 'oglusz' | 'mroz';
  szansa: number;
  ms: number;
  wrazliwe?: RodzajWroga[];
  mnoznik?: number;
  przepis: Partial<Record<Grupa, number>>;
  opis: string;
}

export const ESENCJE: Esencja[] = [
  {
    id: 'dab', nazwa: 'Esencja dębu', ikona: '🌳', kolor: '#8bc34a', minut: 10, efekt: 'oglusz', szansa: 0.4, ms: 1500,
    przepis: { grzyby: 15, drewno: 5 },
    opis: 'Twarda jak dąb: trafiony potwór bywa ogłuszony na chwilę i wtedy nie może uderzyć.',
  },
  {
    id: 'mroz', nazwa: 'Esencja mrozu', ikona: '❄️', kolor: '#6fd3ff', minut: 10, efekt: 'mroz', szansa: 0.25, ms: 1000,
    wrazliwe: ['glut', 'wielki_glut', 'smok'], mnoznik: 1.5,
    przepis: { warzywa: 20, grzyby: 5 },
    opis: 'Ognistym chochlikom i smokom zadaje półtora raza większe rany, a czasem zamraża potwora na sekundę.',
  },
];

export function esencja(id: string | undefined) {
  return ESENCJE.find((e) => e.id === id);
}

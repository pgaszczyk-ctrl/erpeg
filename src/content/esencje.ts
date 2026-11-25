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
//   'mroz'   – ciosy niosą mróz (content/zywioly.ts),
//              a z szansą `szansa` każdy trafiony zamarza na `ms`.
//  Smoki się nie ogłuszają i nie zamarzają (ale wrażliwe mogą być).
// ============================================================================

import type { RodzajWroga } from './fabula';
import type { Grupa } from './sklepy';
import type { Zywiol } from './zywioly';

export interface Esencja {
  id: string;
  nazwa: string;
  ikona: string;
  /** Kolor znaczka na broni. */
  kolor: string;
  minut: number;
  efekt: 'oglusz' | 'mroz' | 'brak';
  /** The weapon's blows take this element while it works (content/zywioly.ts: resistances decide the damage). */
  zywiol?: Zywiol;
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
    zywiol: 'mroz',
    przepis: { warzywa: 20, grzyby: 5 },
    opis: 'Ciosy niosą mróz: chochliki, wodne stwory i ognisty smok go nie znoszą, a czasem potwór zamarza na sekundę. Nieumarli i wilki są na mróz odporni.',
  },
  {
    id: 'ogien', nazwa: 'Esencja ognia', ikona: '🔥', kolor: '#ff7a2e', minut: 10, efekt: 'brak', szansa: 0, ms: 0, zywiol: 'ogien',
    przepis: { drewno: 10, owoce: 10 },
    opis: 'Ciosy niosą ogień: driady, zombiaki i leśny smok płoną. Chochliki i wodne stwory są na ogień odporne.',
  },
  {
    id: 'piorun', nazwa: 'Esencja burzy', ikona: '⚡', kolor: '#fff06a', minut: 10, efekt: 'brak', szansa: 0, ms: 0, zywiol: 'piorun',
    przepis: { grzyby: 10, warzywa: 10 },
    opis: 'Ciosy niosą piorun: wodne stwory i mosiężne automaty go nie znoszą. Górski smok jest na niego odporny.',
  },
  {
    id: 'swiatlo', nazwa: 'Esencja światła', ikona: '☀', kolor: '#fff3c4', minut: 10, efekt: 'brak', szansa: 0, ms: 0, zywiol: 'swiatlo',
    przepis: { owoce: 20, grzyby: 5 },
    opis: 'Ciosy niosą światło: szkielety, upiory i smok-cień dostają podwójnie.',
  },
];

export function esencja(id: string | undefined) {
  return ESENCJE.find((e) => e.id === id);
}

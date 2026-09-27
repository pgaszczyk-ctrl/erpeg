// ============================================================================
//  GANGI POTWORÓW
//  Potwory nie chodzą po całym mieście: siedzą w gangach, każdy na swoim
//  terenie (koło o promieniu promienM), spowitym lekką czerwoną mgiełką.
//  Członkowie stoją na swoich miejscach i ruszają dopiero, gdy zobaczą
//  bohatera. Gangów nie ma przy ważnych miejscach (dom, sklepy, kościoły…).
//  Na terenie gangu nie ma mieszkańców; wracają powrotS sekund po rozbiciu
//  gangu. Gdy padnie ostatni członek, wychodzi herszt – jego pokonanie
//  rozbija gang i daje nagrodę. Nowe gangi przy każdym wejściu do gry.
//  naKm2 – średnio tyle gangów danego rodzaju na 1 km² (razy poziom
//  trudności „potwory” i razy więcej w nocy).
// ============================================================================

import type { RodzajWroga } from './fabula';

export interface RodzajGangu {
  nazwa: string;
  promienM: number;
  czlonkow: [number, number];
  naKm2: number;
  herszt: RodzajWroga;
  nagroda: { monety: number; exp: number };
}

export const GANGI: RodzajGangu[] = [
  { nazwa: 'Mały gang', promienM: 300, czlonkow: [5, 8], naKm2: 0.35, herszt: 'herszt', nagroda: { monety: 40, exp: 60 } },
  { nazwa: 'Wielki gang', promienM: 700, czlonkow: [12, 18], naKm2: 0.08, herszt: 'wielki_herszt', nagroda: { monety: 150, exp: 250 } },
];

/** Bez gangów: środek gangu co najmniej tyle metrów od ważnych miejsc, członkowie tyle od drzwi. */
export const GANG_OD_MIEJSC_M = 200;
export const GANG_CZLONEK_OD_DRZWI_M = 50;
/** Po tylu sekundach od rozbicia gangu wracają mieszkańcy. */
export const GANG_POWROT_S = 60;
/** Czerwona mgiełka: kolor i przezroczystość. */
export const GANG_MGLA = { kolor: 0xe43b44, alfa: 0.18 };

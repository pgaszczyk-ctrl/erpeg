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
  /** Nazwa rodzaju żeńskiego („Banda rozbita”). */
  zenska?: boolean;
}

// Promienie zmniejszone tak, żeby teren miał o 30% mniejszą powierzchnię (×0,84).
export const GANGI: RodzajGangu[] = [
  { nazwa: 'Banda', promienM: 92, czlonkow: [4, 6], naKm2: 0.45, herszt: 'herszt', nagroda: { monety: 25, exp: 40 }, zenska: true },
  { nazwa: 'Mały gang', promienM: 184, czlonkow: [6, 9], naKm2: 0.25, herszt: 'herszt', nagroda: { monety: 40, exp: 60 } },
  { nazwa: 'Wielki gang', promienM: 376, czlonkow: [12, 18], naKm2: 0.06, herszt: 'wielki_herszt', nagroda: { monety: 150, exp: 250 } },
];

/** Bez gangów: środek gangu co najmniej tyle metrów od ważnych miejsc, członkowie tyle od drzwi. */
export const GANG_OD_MIEJSC_M = 200;
export const GANG_CZLONEK_OD_DRZWI_M = 50;
/** Po tylu sekundach od rozbicia gangu wracają mieszkańcy. */
export const GANG_POWROT_S = 60;
/** Czerwona mgiełka: kolor i przezroczystość. */
export const GANG_MGLA = { kolor: 0xe43b44, alfa: 0.3 };
/** Muszki nad terenem gangu: siatka co coPx pikseli świata, muszka w co coIleKratek-tej kratce (więcej = mniej muszek), kolor. */
export const GANG_MUSZKI = { coPx: 22, kolor: 0xb3202c, coIleKratek: 8 };

/** Poza miastem (kratka 1 km z mniej niż miejscMniejNiz ważnymi miejscami) gangów jest tyle razy więcej; środek gangu zwykle najwyżej odDrogiM od drogi. */
export const GANG_WIES = { miejscMniejNiz: 3, mnoznik: 2, odDrogiM: 150 };

/** Łup z herszta (oprócz nagrody za rozbicie gangu): monety i owoce wysypują się na ziemię. */
export const LUP_HERSZTA = { monety: [10, 50] as [number, number], owoce: [0, 20] as [number, number] };

/**
 * Licznik opisowy: co słychać na terenie gangu, zależnie od tego, ilu członków
 * jeszcze żyje (zostalo) z wszystkich (razem). Gra pokazuje napis, gdy się zmieni.
 */
export function stanGangu(zostalo: number, razem: number): string {
  if (zostalo <= 0) return '';
  if (zostalo === 1) return 'Gdzieś tu jeszcze jest niedobitek…';
  if (zostalo === 2) return 'Gdzieś tu jeszcze są dwa niedobitki…';
  if (zostalo <= razem / 2) return 'No, chyba już niewielu…';
  if (zostalo < razem) return 'Jeszcze sporo ich tu zostało.';
  return 'Pełno ich tu – uważaj!';
}

/**
 * Berserker: w niektórych gangach (szansa) jeden członek ma mrugającą czerwoną
 * aurę. Uderza `szybciej` razy częściej, ale ma tylko `zycie` zwykłego życia.
 */
export const BERSERKER = { szansa: 0.4, szybciej: 1.5, zycie: 0.7, auraKolor: 0xff3b1f, mrugMs: 260 };

/**
 * Obstawa herszta: gdy herszt wychodzi, obok niego staje tyle dodatkowych
 * potworów, ile progów poziomu postaci bohater osiągnął (2 → jeden, 4 → drugi).
 * Od poziomu `berserkerOd` jeden z obstawy bywa berserkerem (z szansą `szansaBerserkera`).
 */
export const OBSTAWA_HERSZTA = { progi: [2, 4], berserkerOd: 7, szansaBerserkera: 0.5 };

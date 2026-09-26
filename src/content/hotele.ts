// ============================================================================
//  HOTELE NA STAŁE (np. po współpracy)
//  Hotele to punkty zapisu i wczytywania. Z hoteli na mapie (OpenStreetMap)
//  gra wybiera losowo jeden na każdy kwadrat 300 × 300 m. Hotel wpisany tutaj
//  jest zawsze, a w jego kwadracie nie losuje się już innego.
//  adres – ulica i numer budynku (musi istnieć na mapie) albo nazwa hotelu z mapy
//  nazwa – jak go podpisać w grze (niewymagane)
// ============================================================================

export interface HotelStaly {
  adres: string;
  nazwa?: string;
}

export const HOTELE: HotelStaly[] = [
  // { adres: 'Krakowskie Przedmieście 56', nazwa: 'Hotel Europa' },
];

/** Ile kosztuje nocleg z zapisem gry (monety). */
export const HOTEL_CENA = 500;

/** Bok kwadratu, w którym zostaje jeden hotel (metry). */
export const HOTEL_KWADRAT_M = 300;

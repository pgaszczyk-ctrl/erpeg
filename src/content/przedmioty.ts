// ============================================================================
//  PRZEDMIOTY I UMIEJĘTNOŚCI
//  Gracz zaczyna jako wojownik z kijkiem. W bibliotece może nauczyć się
//  magii. Łuk można kupić w sklepie (albo dostać w nagrodę od policji).
//  Klik = atak bronią z ręki; przytrzymanie i celowanie = atak z dystansu
//  (łuk albo przedmiot magiczny).
// ============================================================================

export type Miejsce = 'bron' | 'dystans' | 'zbroja' | 'helm' | 'buty';
export type Umiejetnosc = 'miecz' | 'luk' | 'magia';

export interface Przedmiot {
  id: string;
  nazwa: string;
  /** Gdzie się go zakłada. */
  miejsce: Miejsce;
  /** Obrażenia (broń) albo obrona (zbroja, hełm, buty). */
  moc: number;
  /** Cena w sklepie (0 = nie do kupienia). */
  cena: number;
  /** Tylko broń dystansowa: łuk czy magia. */
  rodzaj?: 'luk' | 'magia';
  /** Gdzie się go kupuje: sklep (domyślnie) albo biblioteka. */
  gdzie?: 'sklep' | 'biblioteka';
}

// Ceny są wysokie celowo: tanie rzeczy ok. 20× więcej niż na początku, najlepsze
// ok. 50×, żeby na dobry sprzęt trzeba było popracować (owoce, zlecenia).
export const PRZEDMIOTY: Przedmiot[] = [
  // Broń do ręki (klik)
  { id: 'kijek', nazwa: 'Kijek', miejsce: 'bron', moc: 1, cena: 0 },
  { id: 'zelazny', nazwa: 'Żelazny miecz', miejsce: 'bron', moc: 2, cena: 1500 },
  { id: 'stalowy', nazwa: 'Stalowy miecz', miejsce: 'bron', moc: 3, cena: 6000 },
  { id: 'rycerski', nazwa: 'Rycerski miecz', miejsce: 'bron', moc: 5, cena: 22500 },
  // Broń dystansowa (przytrzymaj i celuj)
  { id: 'luk', nazwa: 'Łuk', miejsce: 'dystans', rodzaj: 'luk', moc: 2, cena: 3000 },
  { id: 'dlugi_luk', nazwa: 'Długi łuk', miejsce: 'dystans', rodzaj: 'luk', moc: 3, cena: 12000 },
  { id: 'rozdzka', nazwa: 'Różdżka', miejsce: 'dystans', rodzaj: 'magia', moc: 2, cena: 2000, gdzie: 'biblioteka' },
  { id: 'kula', nazwa: 'Szklana kula', miejsce: 'dystans', rodzaj: 'magia', moc: 3, cena: 9000, gdzie: 'biblioteka' },
  { id: 'ksiega', nazwa: 'Księga zaklęć', miejsce: 'dystans', rodzaj: 'magia', moc: 5, cena: 26000, gdzie: 'biblioteka' },
  // Ochrona: każdy punkt obrony to 6% szans, że cios nie zrani (najwyżej 60%)
  { id: 'skorzana_zbroja', nazwa: 'Skórzana zbroja', miejsce: 'zbroja', moc: 2, cena: 1600 },
  { id: 'kolczuga', nazwa: 'Kolczuga', miejsce: 'zbroja', moc: 4, cena: 9600 },
  { id: 'skorzany_helm', nazwa: 'Skórzany hełm', miejsce: 'helm', moc: 1, cena: 800 },
  { id: 'zelazny_helm', nazwa: 'Żelazny hełm', miejsce: 'helm', moc: 2, cena: 5200 },
  { id: 'skorzane_buty', nazwa: 'Skórzane buty', miejsce: 'buty', moc: 1, cena: 600 },
  { id: 'zelazne_buty', nazwa: 'Żelazne buty', miejsce: 'buty', moc: 2, cena: 4400 },
];

export const MIEJSCA: Record<Miejsce, string> = {
  bron: 'Broń',
  dystans: 'Dystans',
  zbroja: 'Zbroja',
  helm: 'Hełm',
  buty: 'Buty',
};

export const OBRONA_ZA_PUNKT = 0.06;
export const OBRONA_MAKS = 0.6;

/** Plecak: ile miejsc i ile owoców mieści się w jednym miejscu. */
export const PLECAK = { miejsc: 5, owocowNaMiejsce: 99 };

// ----------------------------------------------------------------------------
//  UMIEJĘTNOŚCI rosną od używania: każde trafienie (wroga, drzewa, lalki,
//  tarczy, kryształu) to 1 punkt. Poziom 2 wymaga 100 punktów, każdy kolejny
//  1,5 raza więcej. Najwyżej poziom 10. Każdy poziom skraca przerwę między
//  atakami.
// ----------------------------------------------------------------------------
export const UMIEJETNOSCI: Record<Umiejetnosc, { nazwa: string; przerwa: number; szybciejNaPoziom: number }> = {
  miecz: { nazwa: 'Walka wręcz', przerwa: 320, szybciejNaPoziom: 18 },
  luk: { nazwa: 'Łucznictwo', przerwa: 650, szybciejNaPoziom: 35 },
  magia: { nazwa: 'Magia', przerwa: 750, szybciejNaPoziom: 40 },
};
export const PIERWSZY_POZIOM = 100;
export const MNOZNIK_POZIOMU = 1.5;
export const MAKS_POZIOM = 10;

/** Nauka magii w bibliotece. */
export const NAUKA_MAGII = 150;
/** Lekcja w szkole: za tyle monet tyle punktów praktyki. */
export const LEKCJA = { cena: 50, punkty: 40 };

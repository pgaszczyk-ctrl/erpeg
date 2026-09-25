// ============================================================================
//  FABUŁA GRY: misje i wrogowie w Lublinie.
//  Za pokonanie gluta gracz dostaje 5 punktów doświadczenia (EXP).
//  Adresy wpisujemy tak jak na tabliczce: "Ulica numer", np. "Zamkowa 9"
//  (może być też "ul. Zamkowa 9" albo "al. Racławickie 1").
//  Można też podać nazwę budynku z mapy, np. "Zamek w Lublinie",
//  albo współrzędne: { lat: 51.25, lon: 22.57 }.
// ============================================================================

export type Miejsce = string | { lat: number; lon: number };

export type RodzajWroga = 'glut';

export interface Zadanie {
  /** 'pokonaj' = pokonaj wrogów w danym miejscu, 'idz' = dojdź do miejsca. */
  typ: 'pokonaj' | 'idz';
  miejsce: Miejsce;
  /** Tylko dla 'pokonaj': ilu wrogów i jakich. */
  ile?: number;
  wrog?: RodzajWroga;
  /** Krótki opis celu pokazywany na ekranie, np. "Pokonaj gluty pod Bramą". */
  cel: string;
}

export interface Misja {
  id: string;
  /** Budynek, w którym misję się dostaje (jego wejście świeci na złoto). */
  adres: string;
  tytul: string;
  /** Co mówi zleceniodawca po wejściu do budynku. */
  opis: string;
  zadanie: Zadanie;
  /** Co mówi po powrocie, gdy zadanie jest wykonane. */
  zakonczenie: string;
  /** Nagroda w monetach. */
  nagroda: number;
  /** Punkty doświadczenia za misję (jeśli nie podane: tyle co monet). */
  doswiadczenie?: number;
}

export interface Wrogowie {
  miejsce: Miejsce;
  wrog: RodzajWroga;
  ile: number;
}

// ----------------------------------------------------------------------------
//  MISJE (przykładowe, do podmiany)
// ----------------------------------------------------------------------------
export const MISJE: Misja[] = [
  {
    id: 'zamek',
    adres: 'Zamkowa 9',
    tytul: 'Kłopoty na Starym Mieście',
    opis: 'Witaj, wędrowcze! Pod Bramą Krakowską zalęgły się fioletowe gluty i straszą turystów. Przegoń je, a zamek sowicie cię wynagrodzi.',
    zadanie: { typ: 'pokonaj', miejsce: 'Bramowa 1', ile: 4, wrog: 'glut', cel: 'Pokonaj gluty przy Bramie Krakowskiej' },
    zakonczenie: 'Brawo! Turyści znów mogą spokojnie robić zdjęcia. Oto twoja nagroda.',
    nagroda: 20,
  },
  {
    id: 'ratusz',
    adres: 'Plac Władysława Łokietka 1',
    tytul: 'List do Collegium Novum',
    opis: 'Mamy pilny list do rektora. Zanieś go do Collegium Novum przy Alejach Racławickich.',
    zadanie: { typ: 'idz', miejsce: 'Aleje Racławickie 1', cel: 'Zanieś list do Collegium Novum' },
    zakonczenie: 'Dziękujemy, rektor dostał list na czas!',
    nagroda: 10,
  },
];

// ----------------------------------------------------------------------------
//  STALI WROGOWIE (pojawiają się w tych miejscach zawsze, odradzają się)
// ----------------------------------------------------------------------------
export const WROGOWIE: Wrogowie[] = [
  { miejsce: 'Krakowskie Przedmieście 36', wrog: 'glut', ile: 3 },
];

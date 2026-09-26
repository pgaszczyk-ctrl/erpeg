// ============================================================================
//  FABUŁA GRY: misje i wrogowie w Lublinie.
//  Za pokonanie chochlika gracz dostaje 5 punktów doświadczenia (EXP).
//  Adresy wpisujemy tak jak na tabliczce: "Ulica numer", np. "Zamkowa 9"
//  (może być też "ul. Zamkowa 9" albo "al. Racławickie 1").
//  Można też podać nazwę budynku z mapy, np. "Zamek w Lublinie",
//  albo współrzędne: { lat: 51.25, lon: 22.57 }.
// ============================================================================

export type Miejsce = string | { lat: number; lon: number };

/**
 * glut = chochlik (3 życia), wielki_glut = wielki chochlik (18 życia, mocno bije),
 * bandyta (6 życia, szybki), driada (w lasach), zombie (przy wodzie),
 * szkielet (przy cmentarzach), smok (tylko w historii), wojownik (mieszkaniec w pojedynku).
 */
export type RodzajWroga = 'glut' | 'wielki_glut' | 'bandyta' | 'smok' | 'driada' | 'zombie' | 'szkielet' | 'wojownik';

export interface Zadanie {
  /**
   * 'pokonaj' = pokonaj wrogów w danym miejscu, 'idz' = dojdź do miejsca,
   * 'brak' = samo miejsce bez zadania (np. partner z tajnym hasłem na ulotce),
   * 'zbierz' = przynieś rzeczy (np. grzyby, drewno); miejsce = gdzie ich szukać.
   */
  typ: 'pokonaj' | 'idz' | 'brak' | 'zbierz';
  /** Tylko dla 'zbierz': co przynieść (id z sklepy.ts, np. 'grzyb', 'drewno') i ile. */
  towar?: import('./sklepy').Owoc;
  miejsce: Miejsce;
  /** Tylko dla 'pokonaj': ilu wrogów i jakich. */
  ile?: number;
  wrog?: RodzajWroga;
  /** Krótki opis celu pokazywany na ekranie, np. "Pokonaj chochliki pod Bramą". */
  cel: string;
  /** Cel trzeba odszukać: strzałka pokazuje tylko okolicę (list gończy). */
  szukaj?: boolean;
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
  /** Przedmiot w nagrodę (id z przedmioty.ts), np. 'luk'. */
  przedmiot?: string;
  /** Tylko zlecenia losowe: miejsce (kościół, urząd, komenda), które je dało. */
  placeId?: string;
}

export interface Wrogowie {
  miejsce: Miejsce;
  wrog: RodzajWroga;
  ile: number;
}

// ----------------------------------------------------------------------------
//  MISJE (przykładowe, do podmiany)
// ----------------------------------------------------------------------------
/**
 * Ile zadań naraz: główne (historia) + poboczne (misje, zlecenia, wyścigi,
 * trening). Nowego nie da się wziąć, gdy tyle jest aktywnych. Każde ma swój
 * kolor strzałki: główne złote, poboczne z listy KOLORY_ZADAN.
 */
export const ZADAN_NARAZ = 3;
export const KOLOR_GLOWNEGO = '#f7c531';
export const KOLORY_ZADAN = ['#4fc3f7', '#ff6fb5', '#7be07b'];

export const MISJE: Misja[] = [
  {
    id: 'zamek',
    adres: 'Zamkowa 9',
    tytul: 'Kłopoty na Starym Mieście',
    opis: 'Witaj, wędrowcze! Pod Bramą Krakowską zalęgły się psotne chochliki i straszą turystów. Przegoń je, a zamek sowicie cię wynagrodzi.',
    zadanie: { typ: 'pokonaj', miejsce: 'Bramowa 1', ile: 4, wrog: 'glut', cel: 'Pokonaj chochliki przy Bramie Krakowskiej' },
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

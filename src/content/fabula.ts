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
export type RodzajWroga = 'glut' | 'wielki_glut' | 'bandyta' | 'smok' | 'driada' | 'zombie' | 'szkielet' | 'wojownik' | 'herszt' | 'wielki_herszt';

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
  /** Tylko dla 'idz': okienko po dotarciu na miejsce (zamiast krótkiego napisu). */
  komunikat?: string;
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
  /**
   * Trwała nagroda: 'znizka_woznica' = u woźniców na zawsze taniej (WOZNICA.znizka)
   * i jeden darmowy przejazd u woźnicy na dworcu WOZNICA.gratisNaStacji.
   */
  flaga?: 'znizka_woznica';
  /** Tylko zlecenia losowe: miejsce (kościół, urząd, komenda), które je dało. */
  placeId?: string;
  /** Wykonane zadanie można oddać w dowolnej bibliotece (zlecenia towarzystw naukowych). */
  dowolnaBiblioteka?: boolean;
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
    id: 'rury_na_ratuszu',
    adres: 'Plac Władysława Łokietka 1',
    tytul: 'Rury na ratuszu',
    opis: 'Słuchaj no, wędrowcze! Chochliki dorwały się do naszych nowych, mosiężnych rur na tyłach ratusza i spuszczają całą parę! Zegary na mieście zaraz staną. Przegoń je, tylko szybko!',
    zadanie: { typ: 'pokonaj', miejsce: 'Plac Władysława Łokietka 1', ile: 4, wrog: 'glut', cel: 'Przegoń chochliki od rur za ratuszem' },
    zakonczenie: 'Uff, zawory dokręcone. Masz tu parę monet, tylko nie mów nikomu, że to z miejskiego skarbca!',
    nagroda: 30,
    doswiadczenie: 20,
  },
  {
    id: 'tajemnica_stacji',
    adres: 'Plac Dworcowy 1',
    tytul: 'Tajemnica stacji',
    opis: 'Woźnica rwie włosy z głowy! Ktoś porwał jego najlepszego konia, a obok wozu znaleźliśmy ślady wielkich, rogatych stóp. Idź za dworzec i odzyskaj zgubę.',
    zadanie: { typ: 'pokonaj', miejsce: 'Plac Dworcowy 1', ile: 1, wrog: 'wielki_glut', cel: 'Odbij konia z rąk wielkiego chochlika za dworcem' },
    zakonczenie: 'Koń cały i zdrowy, a ty masz krzepę! Jak będziesz chciał ruszyć w daleki świat, u mnie masz jeden przejazd gratis.',
    nagroda: 50,
    doswiadczenie: 40,
    przedmiot: 'podkowa_szczescia',
    flaga: 'znizka_woznica',
  },
];

// ----------------------------------------------------------------------------
//  STALI WROGOWIE (pojawiają się w tych miejscach zawsze, odradzają się)
// ----------------------------------------------------------------------------
export const WROGOWIE: Wrogowie[] = [
  { miejsce: 'Krakowskie Przedmieście 36', wrog: 'glut', ile: 3 },
];

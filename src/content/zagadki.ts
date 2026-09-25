// ============================================================================
//  ZAGADKI I MĄDRALE (postacie z zagadkami)
//  Mądrale stoją na ulicach ok. 500 m od szkół i kościołów. Każdy ma jedną
//  zagadkę dziennie (jedna próba). Zagadki dobiera się do wieku gracza
//  (podanego przy tworzeniu postaci, domyślnie 7 lat). Każdy mądrala ma swoją
//  trudność: łatwy (o poziom niżej), zwykły albo trudny (o poziom wyżej).
//
//  Część zagadek to rachunki losowane przez grę, reszta jest wpisana niżej.
//  W każdej zagadce PIERWSZA odpowiedź jest dobra – gra sama je potasuje.
// ============================================================================

export interface Zagadka {
  pytanie: string;
  /** Pierwsza odpowiedź jest dobra, pozostałe złe. */
  odpowiedzi: string[];
}

export interface Poziom {
  nazwa: string;
  /** Dla graczy do tylu lat włącznie. */
  wiekDo: number;
  /** Nagroda za dobrą odpowiedź (monety i tyle samo EXP). */
  nagroda: number;
  zagadki: Zagadka[];
}

export const POZIOMY: Poziom[] = [
  {
    nazwa: 'maluch',
    wiekDo: 7,
    nagroda: 20,
    zagadki: [
      { pytanie: 'Które zwierzę robi „muu”?', odpowiedzi: ['Krowa', 'Kot', 'Kaczka', 'Pies'] },
      { pytanie: 'Które zwierzę robi „kwa kwa”?', odpowiedzi: ['Kaczka', 'Koń', 'Owca', 'Świnka'] },
      { pytanie: 'Jak nazywa się mama cielaczka?', odpowiedzi: ['Krowa', 'Kura', 'Koza', 'Klacz'] },
      { pytanie: 'Kto ma długą szyję i je liście z wysokich drzew?', odpowiedzi: ['Żyrafa', 'Słoń', 'Lew', 'Zebra'] },
      { pytanie: 'Jakie zwierzę ma paski i wygląda jak koń?', odpowiedzi: ['Zebra', 'Tygrys', 'Osioł', 'Żyrafa'] },
      { pytanie: 'Co wyjdzie, gdy zmieszasz żółty i niebieski?', odpowiedzi: ['Zielony', 'Fioletowy', 'Pomarańczowy', 'Brązowy'] },
      { pytanie: 'Co wyjdzie, gdy zmieszasz czerwony i żółty?', odpowiedzi: ['Pomarańczowy', 'Zielony', 'Różowy', 'Szary'] },
      { pytanie: 'Co wyjdzie, gdy zmieszasz czerwony i niebieski?', odpowiedzi: ['Fioletowy', 'Zielony', 'Żółty', 'Biały'] },
      { pytanie: 'Co wyjdzie, gdy zmieszasz czerwony i biały?', odpowiedzi: ['Różowy', 'Czarny', 'Zielony', 'Niebieski'] },
      { pytanie: 'Ile nóg ma pająk?', odpowiedzi: ['8', '6', '4', '10'] },
      { pytanie: 'Ile nóg ma kura?', odpowiedzi: ['2', '4', '6', '3'] },
      { pytanie: 'Jakiego koloru jest banan, gdy jest dojrzały?', odpowiedzi: ['Żółty', 'Niebieski', 'Czerwony', 'Fioletowy'] },
      { pytanie: 'Co świeci na niebie w dzień?', odpowiedzi: ['Słońce', 'Księżyc', 'Latarnia', 'Gwiazdka z choinki'] },
      { pytanie: 'Która pora roku jest najzimniejsza?', odpowiedzi: ['Zima', 'Lato', 'Wiosna', 'Jesień'] },
      { pytanie: 'Ile kół ma rower?', odpowiedzi: ['2', '3', '4', '1'] },
      { pytanie: 'Co ma więcej nóg: kot czy kura?', odpowiedzi: ['Kot', 'Kura', 'Tyle samo', 'Żadne nie ma nóg'] },
    ],
  },
  {
    nazwa: 'uczeń',
    wiekDo: 9,
    nagroda: 30,
    zagadki: [
      { pytanie: 'Która planeta jest najbliżej Słońca?', odpowiedzi: ['Merkury', 'Ziemia', 'Mars', 'Jowisz'] },
      { pytanie: 'Jak nazywa się nasza galaktyka?', odpowiedzi: ['Droga Mleczna', 'Andromeda', 'Wielki Wóz', 'Kosmiczna Autostrada'] },
      { pytanie: 'Która planeta ma piękne pierścienie?', odpowiedzi: ['Saturn', 'Mars', 'Wenus', 'Merkury'] },
      { pytanie: 'Kto był pierwszym koronowanym królem Polski?', odpowiedzi: ['Bolesław Chrobry', 'Mieszko I', 'Kazimierz Wielki', 'Jan III Sobieski'] },
      { pytanie: 'Jak nazywa się rzeka, która płynie przez Lublin?', odpowiedzi: ['Bystrzyca', 'Wisła', 'Odra', 'Warta'] },
      { pytanie: 'Jaka jest stolica Polski?', odpowiedzi: ['Warszawa', 'Kraków', 'Lublin', 'Gdańsk'] },
      { pytanie: 'Kolega mówi „No super, znowu pada deszcz”. Czy naprawdę się cieszy?', odpowiedzi: ['Nie, żartuje (to sarkazm)', 'Tak, uwielbia deszcz', 'Tak, bo lubi parasole', 'Nie wiadomo, co to deszcz'] },
      { pytanie: 'Mama widzi bałagan i mówi „Pięknie posprzątane!”. Co ma na myśli?', odpowiedzi: ['Że trzeba posprzątać', 'Że jest czysto', 'Że lubi bałagan', 'Że idzie na zakupy'] },
      { pytanie: 'Ile to jest tuzin?', odpowiedzi: ['12', '10', '20', '6'] },
      { pytanie: 'Ile dni ma tydzień?', odpowiedzi: ['7', '5', '10', '12'] },
      { pytanie: 'Co jest cięższe: kilogram piór czy kilogram żelaza?', odpowiedzi: ['Ważą tyle samo', 'Żelazo', 'Pióra', 'Zależy od pogody'] },
      { pytanie: 'Które zwierzę jest ssakiem?', odpowiedzi: ['Delfin', 'Rekin', 'Pingwin', 'Żółw'] },
      { pytanie: 'W którą stronę wschodzi Słońce?', odpowiedzi: ['Na wschodzie', 'Na zachodzie', 'Na północy', 'Na południu'] },
      { pytanie: 'Ile nóg mają razem 3 psy?', odpowiedzi: ['12', '9', '6', '15'] },
    ],
  },
  {
    nazwa: 'odkrywca',
    wiekDo: 12,
    nagroda: 45,
    zagadki: [
      { pytanie: 'Jaka jest następna liczba: 2, 4, 8, 16, …?', odpowiedzi: ['32', '24', '20', '64'] },
      { pytanie: 'Jaka jest następna liczba: 1, 1, 2, 3, 5, 8, …?', odpowiedzi: ['13', '11', '12', '16'] },
      { pytanie: 'W którym roku była bitwa pod Grunwaldem?', odpowiedzi: ['1410', '1569', '966', '1683'] },
      { pytanie: 'Co zawarto w Lublinie w 1569 roku?', odpowiedzi: ['Unię lubelską', 'Pokój toruński', 'Traktat wersalski', 'Hołd pruski'] },
      { pytanie: 'Ile trwa jeden obrót Ziemi wokół Słońca?', odpowiedzi: ['Około roku', 'Dzień', 'Miesiąc', 'Tydzień'] },
      { pytanie: 'Która planeta jest największa w Układzie Słonecznym?', odpowiedzi: ['Jowisz', 'Saturn', 'Ziemia', 'Neptun'] },
      { pytanie: 'Jaki gaz wydychamy?', odpowiedzi: ['Dwutlenek węgla', 'Tlen', 'Hel', 'Wodór'] },
      { pytanie: 'Przy jakiej temperaturze zamarza woda?', odpowiedzi: ['0 °C', '100 °C', '10 °C', '−10 °C'] },
      { pytanie: 'Kto napisał „Pana Tadeusza”?', odpowiedzi: ['Adam Mickiewicz', 'Henryk Sienkiewicz', 'Juliusz Słowacki', 'Bolesław Prus'] },
      { pytanie: 'Kto odkrył polon i rad?', odpowiedzi: ['Maria Skłodowska-Curie', 'Mikołaj Kopernik', 'Albert Einstein', 'Izaak Newton'] },
      { pytanie: 'Ojciec Ani ma trzy córki: Ewę, Ulę i…?', odpowiedzi: ['Anię', 'Olę', 'Kasię', 'Zosię'] },
      { pytanie: 'Na lekcji pada: „Ależ ty jesteś punktualny!” do kogoś spóźnionego 20 minut. To…', odpowiedzi: ['Sarkazm', 'Pochwała', 'Pytanie', 'Przeprosiny'] },
    ],
  },
  {
    nazwa: 'mędrzec',
    wiekDo: 999,
    nagroda: 70,
    zagadki: [
      { pytanie: 'Ile to jest 2 do potęgi 10?', odpowiedzi: ['1024', '1000', '512', '2048'] },
      { pytanie: 'Kto sformułował teorię heliocentryczną?', odpowiedzi: ['Mikołaj Kopernik', 'Galileusz', 'Ptolemeusz', 'Kepler'] },
      { pytanie: 'Światło Słońca leci do Ziemi około…', odpowiedzi: ['8 minut', '8 sekund', '8 godzin', '8 dni'] },
      { pytanie: 'Pociąg jedzie 90 km/h. Ile przejedzie w 20 minut?', odpowiedzi: ['30 km', '45 km', '18 km', '20 km'] },
      { pytanie: 'Jeśli wszystkie gluty są fioletowe, a Bob jest glutem, to Bob…', odpowiedzi: ['jest fioletowy', 'nie jest fioletowy', 'może być zielony', 'nie jest glutem'] },
      { pytanie: 'Kij i piłka kosztują razem 110 zł. Kij jest o 100 zł droższy. Ile kosztuje piłka?', odpowiedzi: ['5 zł', '10 zł', '1 zł', '15 zł'] },
      { pytanie: 'W którym roku Polska odzyskała niepodległość?', odpowiedzi: ['1918', '1945', '1989', '1791'] },
      { pytanie: 'Co oznacza „ironia”?', odpowiedzi: ['Mówienie odwrotnie niż się myśli', 'Mówienie bardzo cicho', 'Rymowanie', 'Kłamanie dla zysku'] },
      { pytanie: 'Która liczba jest liczbą pierwszą?', odpowiedzi: ['97', '91', '87', '93'] },
      { pytanie: 'Ile wynosi suma kątów w trójkącie?', odpowiedzi: ['180°', '360°', '90°', '270°'] },
    ],
  },
];

/** Jak często rachunek zamiast zagadki z listy (0–1). */
export const SZANSA_NA_RACHUNEK = 0.5;

/** Ilu mądrali: jeden na tyle szkół i kościołów (reszta miejsc stoi pusta). */
export const MADRALA_CO_ILE_MIEJSC = 4;
/** Jak daleko od szkoły lub kościoła stoi mądrala (w metrach). */
export const MADRALA_ODLEGLOSC_M = 500;

export const MADRALE: { imie: string; powitanie: string }[] = [
  { imie: 'Profesor Sowa', powitanie: 'Hu-hu! Rozwiążesz moją dzisiejszą zagadkę?' },
  { imie: 'Babcia Zosia', powitanie: 'Dzień dobry, dziecko! Mam dla ciebie zagadkę.' },
  { imie: 'Pan Mądralski', powitanie: 'Sprawdźmy, czy jesteś bystrzejszy od gluta!' },
  { imie: 'Kot Filozof', powitanie: 'Mrrr… Zagadka na dziś. Tylko jedna próba.' },
  { imie: 'Listonosz Heniek', powitanie: 'Zanim pobiegnę dalej – zagadka!' },
  { imie: 'Pani Bibliotekarka', powitanie: 'Ciii… Szeptem: znasz odpowiedź?' },
  { imie: 'Dziadek Józef', powitanie: 'Za moich czasów każdy to wiedział!' },
  { imie: 'Wróżka Ula', powitanie: 'Widzę w kuli… zagadkę dla ciebie!' },
];

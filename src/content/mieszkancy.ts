// ============================================================================
//  MIESZKAŃCY – ludzie spacerujący po brukowanych ulicach.
//  Większość tylko mówi „dzień dobry”, niektórzy chcą się pojedynkować.
//  W pojedynku gracz dostaje 3 fioletowe serduszka (pod czerwonymi); gdy je
//  straci, nie ginie, tylko traci jedno zwykłe serduszko.
//  Siła przeciwnika zależy od poziomu trudności (trudnosc.ts, pole „pojedynek”).
// ============================================================================

export const MIESZKANCY = {
  /** Ilu ludzi na każde 200 m brukowanej ulicy. */
  na200m: 2,
  /** Jaka część tylko się wita, a jaka sama wyzywa na pojedynek / przyjmuje wyzwanie. */
  tylkoWita: 0.9,
  wyzywa: 0.05,
  // reszta (0.05) przyjmuje wyzwanie, gdy gracz sam je rzuci
  /**
   * Gęstość: w centrum (dużo sklepów, urzędów, kościołów w kwadracie 1 km)
   * tylu, ilu wyżej; na osiedlach mniej, na przedmieściach jeszcze mniej.
   * miejsc – od ilu miejsc w kwadracie 1×1 km, mnoznik – jaka część ludzi.
   */
  dzielnice: [{ miejsc: 20, mnoznik: 1 }, { miejsc: 8, mnoznik: 0.5 }, { miejsc: 0, mnoznik: 0.25 }],
  /** Wsie: mało miejsc, ale dużo domów – kratka z tyloma domami z adresem ma co najmniej taki mnożnik. */
  wsie: [{ domow: 40, mnoznik: 0.7 }, { domow: 15, mnoznik: 0.45 }],
  /** Noc (od–do, godziny w telefonie): mniej ludzi, więcej potworów. */
  noc: { od: 21, do: 6, ludzi: 0.3, potworow: 1.5 },
  /** Ludzie boją się smoka: w tej odległości (metry) od niego nikogo nie ma. */
  strachPrzedSmokiem: 400,
  /** Jaka część witających się mówi, dokąd idzie (i tam idzie). */
  sprawunki: 0.4,
  /** {nazwa} = miejsce, {dzien} = dzień tygodnia („sobotę”), {ulica} = ulica boiska. */
  sprawa: {
    bank: ['Idę do banku {nazwa}, mam sprawę do załatwienia.', 'Muszę zajrzeć do banku – {nazwa}. Lokata sama się nie założy!'],
    sklep: ['No tak, mamy {dzien}, więc idę do sklepu. {nazwa} jest niedaleko.', 'Mamy {dzien}, trzeba zrobić zakupy. Idę do sklepu {nazwa}.'],
    kosciol: ['Dziś niedziela, idę do świątyni – {nazwa}.'],
    boisko: ['W każdy piątek idę oglądać wyczyny sportowców. Byłeś na boisku przy ul. {ulica}?'],
  },
  /** Ile fioletowych serduszek ma gracz w pojedynku. */
  serduszka: 3,
  /** EXP za wygrany pojedynek. */
  nagrodaExp: 15,
  /** Names for the old pixel people (look unknown: any of them). */
  imiona: ['Pan Zenek', 'Pani Krysia', 'Pan Staszek', 'Pani Basia', 'Student Kuba', 'Pani Ola', 'Pan Mirek', 'Pani Jadzia', 'Pan Rysiek', 'Pani Ewa', 'Pan Tadek', 'Pani Gosia'],
  /** Names by who the new characters are (content/wyglad.ts plec + wiek). */
  imionaWg: {
    k: {
      dziecko: ['Zosia', 'Hania', 'Julka', 'Lena', 'Kasia', 'Ola'],
      dorosly: ['Pani Ewa', 'Pani Ola', 'Pani Gosia', 'Pani Kasia', 'Pani Magda', 'Pani Ania', 'Studentka Marta'],
      starszy: ['Pani Krysia', 'Pani Basia', 'Pani Jadzia', 'Pani Halinka', 'Babcia Stasia', 'Pani Zosia'],
    },
    m: {
      dziecko: ['Kuba', 'Franek', 'Antek', 'Staś', 'Tymek', 'Jaś'],
      dorosly: ['Pan Rysiek', 'Pan Mirek', 'Pan Tadek', 'Pan Marek', 'Pan Paweł', 'Student Kuba', 'Pan Tomek'],
      starszy: ['Pan Zenek', 'Pan Staszek', 'Pan Henio', 'Dziadek Józek', 'Pan Władek', 'Pan Kazio'],
    },
  } as Record<'k' | 'm', Record<'dziecko' | 'dorosly' | 'starszy', string[]>>,
  /**
   * W mieście, w którym bohater jeszcze nie był (zgłoszenie 18): pierwszy i trzeci zagadnięty mieszkaniec
   * mówi, gdzie jesteśmy. {miasto} = nazwa miejscowości. Miasto uznajemy za znane przez 60 dni.
   */
  nowyWMiescie: [
    'No tak, to {miasto}. A ty z daleka?',
    'To jest {miasto} – rzadko kto tu zagląda z mieczem.',
    'Pierwszy raz tutaj? To {miasto}, od razu widać po minie.',
    'To {miasto}, wędrowcze. Skąd przybywasz?',
    'Ho, ho, obcy! Tu, w naszym mieście, wszyscy się znają. To {miasto}, gdybyś nie wiedział.',
    'Zgubiłeś się? Spokojnie, to tylko {miasto}.',
    'Dzień dobry! Miasto {miasto} gości zawsze mile widzi.',
    'Ty nie stąd, co? To jest {miasto}, kochanieńki.',
    '{miasto} wita! Tylko uważaj na chochliki za miastem.',
    'A ty to skąd? Bo tu {miasto}, gdyby co.',
    'No proszę, nowa twarz! Witaj – to {miasto}.',
    'Szukasz czegoś? To {miasto}, tu wszystko jest blisko.',
    'Witamy! To {miasto}. Pierwsza wizyta, prawda?',
    'To {miasto}. Daleko cię nogi poniosły, podróżniku.',
    'Ech, turysta… No tak, to {miasto}, nic tu się nie dzieje. Prawie.',
    'Ooo, przybysz! Rozgość się – to {miasto}.',
  ],

  powitania: ['Dzień dobry!', 'Dzień dobry, piękna dziś pogoda.', 'Witam, witam!', 'Dzień dobry! Uważaj na chochliki.', 'O, dzień dobry! Spieszę się do sklepu.', 'Dzień dobry. Widziałeś może mojego kota?'],
  wyzwanie: ['Hej, ty z mieczem! Zmierzysz się ze mną?', 'Wyglądasz na silnego… Sprawdzimy? Pojedynek!', 'Stawaj! Nikt w tej dzielnicy mnie jeszcze nie pokonał!'],
  przyjmuje: ['Pojedynek? Z przyjemnością!', 'Ha! Myślisz, że dasz mi radę? Dawaj!', 'No dobrze, ale nie płacz potem!'],
  wygrana: ['Uff… Wygrałeś. Szacunek, wojowniku!', 'Dobra walka! Jesteś lepszy, niż myślałem.'],
  przegrana: ['Ha! Tym razem wygrałem ja. Wróć, gdy potrenujesz!', 'Nie tym razem, przyjacielu!'],
};

// ----------------------------------------------------------------------------
//  PROŚBY MIESZKAŃCÓW – czasem ktoś się żali, że chochliki coś mu ukradły
//  i uciekły w pole albo do lasu. Trzeba tam pójść, pokonać je (ile) – jeden
//  z nich upuści zgubę – i oddać ją właścicielowi (czeka tam, gdzie z nim
//  rozmawiałeś). Naraz jedna taka prośba.
// ----------------------------------------------------------------------------
export const PROSBY = {
  /** Jaka część witających się ma prośbę (reszta tylko się wita). */
  szansa: 0.1,
  ile: 5,
  /** Jak daleko od proszącego (metry). */
  odlegloscM: [300, 900] as [number, number],
  nagroda: { monety: 20, exp: 40 },
  zguby: [
    { co: 'kota', nazwa: 'Kot Mruczek', ikona: '🐈' },
    { co: 'wałek do ciasta', nazwa: 'Wałek do ciasta', ikona: '🥖' },
    { co: 'okulary', nazwa: 'Okulary', ikona: '👓' },
    { co: 'pluszowego misia wnuczka', nazwa: 'Pluszowy miś', ikona: '🧸' },
    { co: 'kurę Zosię', nazwa: 'Kura Zosia', ikona: '🐔' },
    { co: 'klucze do domu', nazwa: 'Klucze', ikona: '🔑' },
    { co: 'kapelusz dziadka', nazwa: 'Kapelusz dziadka', ikona: '🎩' },
    { co: 'słoik konfitur', nazwa: 'Słoik konfitur', ikona: '🍯' },
    { co: 'piłkę syna', nazwa: 'Piłka', ikona: '⚽' },
    { co: 'portfel', nazwa: 'Portfel', ikona: '👛' },
  ],
  /** {co} – co ukradły, {gdzie} – dokąd uciekły, {kierunek}, {m} – ile metrów. */
  prosba: [
    'Ojej, pomóż! Chochliki ukradły mi {co} i uciekły {gdzie}, jakieś {m} m na {kierunek}! Odzyskasz?',
    'Dzień dobry… Mam kłopot: banda chochlików porwała {co}. Widziałem, jak biegły {gdzie}, tak {m} m na {kierunek}.',
    'Te przeklęte chochliki! Zabrały {co} i uciekły {gdzie} – ze {m} m stąd, na {kierunek}. Pomożesz?',
  ],
  czekam: 'Czekam tutaj! Chochliki są {gdzie}, na {kierunek}.',
  dziekuje: 'Jest! {nazwa}! Dziękuję z całego serca! Weź to w podzięce.',
  /** Ktoś, komu już dziś pomogłeś (raz dziennie na osobę). */
  znowu: 'O, to ty! Jeszcze raz dziękuję za pomoc. Dziś już niczego mi nie trzeba.',
};

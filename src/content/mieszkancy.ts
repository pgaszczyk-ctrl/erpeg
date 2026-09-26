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
    kosciol: ['Dziś niedziela, idę do kościoła – {nazwa}.'],
    boisko: ['W każdy piątek idę oglądać wyczyny sportowców. Byłeś na boisku przy ul. {ulica}?'],
  },
  /** Ile fioletowych serduszek ma gracz w pojedynku. */
  serduszka: 3,
  /** EXP za wygrany pojedynek. */
  nagrodaExp: 15,
  imiona: ['Pan Zenek', 'Pani Krysia', 'Pan Staszek', 'Pani Basia', 'Student Kuba', 'Pani Ola', 'Pan Mirek', 'Pani Jadzia', 'Pan Rysiek', 'Pani Ewa', 'Pan Tadek', 'Pani Gosia'],
  powitania: ['Dzień dobry!', 'Dzień dobry, piękna dziś pogoda.', 'Witam, witam!', 'Dzień dobry! Uważaj na chochliki.', 'O, dzień dobry! Spieszę się do sklepu.', 'Dzień dobry. Widziałeś może mojego kota?'],
  wyzwanie: ['Hej, ty z mieczem! Zmierzysz się ze mną?', 'Wyglądasz na silnego… Sprawdzimy? Pojedynek!', 'Stawaj! Nikt w tej dzielnicy mnie jeszcze nie pokonał!'],
  przyjmuje: ['Pojedynek? Z przyjemnością!', 'Ha! Myślisz, że dasz mi radę? Dawaj!', 'No dobrze, ale nie płacz potem!'],
  wygrana: ['Uff… Wygrałeś. Szacunek, wojowniku!', 'Dobra walka! Jesteś lepszy, niż myślałem.'],
  przegrana: ['Ha! Tym razem wygrałem ja. Wróć, gdy potrenujesz!', 'Nie tym razem, przyjacielu!'],
};

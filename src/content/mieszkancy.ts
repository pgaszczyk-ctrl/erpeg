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
  tylkoWita: 0.8,
  wyzywa: 0.1,
  // reszta (0.1) przyjmuje wyzwanie, gdy gracz sam je rzuci
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

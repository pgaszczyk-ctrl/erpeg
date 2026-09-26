// ============================================================================
//  SPORT – na boiskach czekają wyzwania.
//  Duże boiska/stadiony (od duzeBoiskoM2): kukły treningowe i Trener, który
//  daje wyzwanie: uderz kukłę 10 razy, biegnij do drugiej kukły, uderz ją
//  i wróć – wszystko na czas (czas liczony z odległości i poziomu trudności).
//  Kukły treningowe (miecz, łuk, magia) stoją też na mniejszych boiskach (od
//  kuklyOdM2), ale z boisk leżących obok siebie (bliżej niż sasiedziM) tylko
//  na największym.
//  Małe boiska: Biegacz (najwyżej jeden na 1 km²): „założę się, że szybciej dobiegnę
//  do innego boiska niż ty!” – wyścig ze strzałką i stoperem.
//  Jak trudno jest na każdym poziomie – trudnosc.ts (pola „wyzwanie”, „rywal”, „farta”).
// ============================================================================

export const SPORT = {
  /** Od ilu m² boisko jest „duże” (kukły + Trener); mniejsze dostają Biegacza. */
  duzeBoiskoM2: 2500,
  /** Od ilu m² na boisku mogą stać kukły treningowe. */
  kuklyOdM2: 400,
  /** Boiska bliżej siebie niż tyle metrów to „sąsiedzi”: kukły tylko na największym. */
  sasiedziM: 100,
  /** Najmniejsze boisko, na którym ktoś stoi (m²). */
  maleBoiskoM2: 300,
  uderzen: 10,
  /** Wyścig: do boiska oddalonego od–do (metry). */
  wyscigOdM: 150,
  wyscigDoM: 700,
  nagroda: { trener: { exp: 20, monety: 15 }, biegacz: { exp: 12, monety: 10 } },
  trener: {
    imie: 'Trener Zbyszek',
    wyzwanie: 'Hej, młody sportowcze! Dasz radę uderzyć tę kukłę {uderzen} razy, pobiec do drugiej kukły, uderzyć ją i wrócić tutaj – a wszystko w {czas}?',
    wygrana: 'Brawo! Tak się trenuje! Oto nagroda.',
    przegrana: 'Czas minął! Nie poddawaj się, spróbuj jeszcze raz.',
  },
  biegacz: {
    imie: 'Biegaczka Ania',
    wyzwanie: 'Założę się, że szybciej dobiegnę do boiska „{cel}” niż ty! Ścigamy się?',
    wygrana: 'Nie do wiary, byłeś pierwszy! Gratuluję!',
    przegrana: 'Ha! Byłam pierwsza! Może następnym razem…',
  },
};

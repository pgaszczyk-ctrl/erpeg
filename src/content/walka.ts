// ============================================================================
//  WALKA – szybki i mocny atak
//  Stuknięcie (klik, spacja) = szybki atak jak dotąd. Przytrzymanie przez
//  `mocnyPoMs` i puszczenie = mocny atak: miecz uderza `mnoznikMiecz` razy
//  mocniej i sięga `zasiegMiecz` razy dalej, a strzała / czar z łuku lub
//  przedmiotu magicznego `mnoznikStrzal` razy mocniej. Wokół bohatera rośnie
//  wtedy złote kółko – pełne znaczy „gotowy mocny atak”.
//  (Liczby tymczasowe: właściciel przygotowuje tabelę obrażeń, szansy na
//  trafienie i ciosów krytycznych zależnie od poziomu umiejętności.)
//
//  Animacja ciosu: obrazek broni z ręki przelatuje łukiem `lukStopnie`
//  na zmianę z lewej do prawej i z prawej do lewej, w `ciosMs`.
// ============================================================================

export const WALKA = {
  mocnyPoMs: 1000,
  mnoznikMiecz: 2,
  zasiegMiecz: 1.3,
  mnoznikStrzal: 2,
  lukStopnie: 120,
  ciosMs: 150,
  /** Wielkość obrazka broni w punktach mapy (mocny cios trochę większy). */
  wielkoscBroni: 13,
};

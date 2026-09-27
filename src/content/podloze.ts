// ----------------------------------------------------------------------------
//  PODŁOŻE – jak szybko idzie bohater po różnym terenie (1 = pełna prędkość).
//  Liczy się to, po czym stoi: droga, ścieżka, a poza nimi rodzaj terenu.
// ----------------------------------------------------------------------------

export const PODLOZE = {
  /** Drogi dla aut (bruk/asfalt), deptaki, place i parkingi. */
  asfalt: 1,
  /** Ścieżki i drogi gruntowe. */
  sciezka: 0.95,
  /** Trawa, łąki, parki, pola, ogródki – i każdy teren bez drogi. */
  trawa: 0.85,
  /** Lasy i zarośla (także kosodrzewina). */
  las: 0.7,
  /** Piasek i plaże. */
  piasek: 0.8,
};

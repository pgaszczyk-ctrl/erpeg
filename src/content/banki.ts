// ============================================================================
//  BANKI – lokaty na procent. W banku (prawdziwe banki z mapy) oddajesz monety
//  na określony czas, a po tym czasie odbierasz je z odsetkami w dowolnym
//  banku. Zerwanie lokaty wcześniej = zwrot monet bez odsetek.
//  Czas liczy się naprawdę (według zegara serwera), także gdy gra jest wyłączona.
// ============================================================================

export interface Lokata {
  nazwa: string;
  /** Na ile dni. */
  dni: number;
  /** Ile procent odsetek po tym czasie. */
  procent: number;
}

export const LOKATY: Lokata[] = [
  { nazwa: 'na 1 dzień', dni: 1, procent: 5 },
  { nazwa: 'na 3 dni', dni: 3, procent: 20 },
  { nazwa: 'na tydzień', dni: 7, procent: 60 },
];

/** Najwyżej tyle lokat naraz, od ilu do ilu monet każda. */
export const BANK = { maksLokat: 3, minKwota: 50, maksKwota: 10000 };

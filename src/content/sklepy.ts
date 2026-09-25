// ============================================================================
//  SKLEPY I SZKOŁY
//  Sklepy są w prawdziwych Biedronkach, Lidlach, Lewiatanach i Delikatesach
//  Centrum (z mapy OpenStreetMap), szkoły umiejętności w prawdziwych szkołach.
//  Glut ma 3 punkty życia: drewnianym mieczem potrzeba 3 cięć.
// ============================================================================

export interface Bron {
  id: string;
  nazwa: string;
  /** Ile życia zabiera jedno cięcie. */
  obrazenia: number;
  /** Cena w monetach (0 = na start). */
  cena: number;
}

// Kolejność ma znaczenie: każdy następny jest lepszy.
export const BRONIE: Bron[] = [
  { id: 'drewniany', nazwa: 'Drewniany miecz', obrazenia: 1, cena: 0 },
  { id: 'zelazny', nazwa: 'Żelazny miecz', obrazenia: 2, cena: 60 },
  { id: 'stalowy', nazwa: 'Stalowy miecz', obrazenia: 3, cena: 180 },
  { id: 'rycerski', nazwa: 'Rycerski miecz', obrazenia: 5, cena: 450 },
];

export interface PoziomUmiejetnosci {
  cena: number;
  opis: string;
  /** Zasięg cięcia (1 = zwykły). */
  zasieg: number;
  /** Przerwa między cięciami w milisekundach (mniej = szybciej). */
  przerwa: number;
}

// Poziom 0 to stan na starcie; szkoła uczy kolejnych poziomów po kolei.
export const WALKA_MIECZEM: PoziomUmiejetnosci[] = [
  { cena: 0, opis: 'Podstawy', zasieg: 1, przerwa: 320 },
  { cena: 100, opis: 'Dłuższy zamach – miecz sięga dalej', zasieg: 1.35, przerwa: 320 },
  { cena: 250, opis: 'Szybkie cięcia – machasz mieczem szybciej', zasieg: 1.35, przerwa: 190 },
  { cena: 500, opis: 'Mistrz miecza – jeszcze szybciej i dalej', zasieg: 1.5, przerwa: 120 },
];

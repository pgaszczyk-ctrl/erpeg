// ============================================================================
//  BUDYNKI – jak gra rysuje i traktuje budynki (zgłoszenia 11, 12, 15).
// ============================================================================

/** Mapy innych miast (świat): drobne budynki bez adresu. */
export const SZOPY = {
  /** Mniejsze (m²) wcale nie są rysowane. */
  usunM2: 30,
  /** Mniejsze (m²) są rysowane, ale bohater (i strzały) przez nie przechodzą – szopy, garaże. */
  przejscieM2: 60,
  /** Ile pięter ma dom, o którym mapa nic nie mówi (dawniej 1 – wyglądały jak naleśniki). */
  domyslniePieter: 2,
};

/**
 * Wielkie gmachy (galerie, hale): rysowane jako kilka części, każda z innym dachem,
 * co druga o piętro wyższa – żeby nie były jednym monotonnym plackiem.
 * Zamki, pałace, kościoły i inne zabytki (po nazwie) zostają w jednym kawałku.
 */
export const DZIELENIE = {
  /** Od ilu m² dzielimy. */
  odM2: 2500,
  /** Na ile części (najwyżej): jedna na tyle m², od 2 do `maks`. */
  m2NaCzesc: 1800,
  maks: 5,
  /** Nazwy, których nie dzielimy (zamki, pałace, świątynie, zabytki). */
  bezPodzialu: /zam(ek|ku|ki)|castle|burg|schloss|château|castillo|castello|pa[lł]a[cć]|palace|palazzo|kości|kosci|katedr|bazylik|klasztor|opactw|ko[sś]ci[oó]ł|church|cathedral|dom\b|ratusz|town hall|muzeum|museum|teatr|theat|opera|synagog|cerkiew|meczet|mosque|twierdz|fort/i,
};

/**
 * Poziomy gry zamiast pięter (właściciel 6.10.2026, GENERATOR_SWIATA 13a, wygląd 09): 1–3 piętra = 1 poziom,
 * 4–14 = 2, 15+ = 3 (`ksztaltBudynku` w src/gen/budynki.ts). Makieta miała bohaterkę 48 px obrazu; w grze ludzik jest
 * mniejszy (SKALA_POSTACI), więc poziomy i prześwit są przeliczane tak, żeby proporcje budynek : postać zostały jak w makiecie.
 */
export const POZIOMY = {
  /** Wzrost bohaterki w makiecie (px obrazu generatora). */
  wzorBohatera: 48,
  /** Od ilu poziomów budynek jest osobnym obrazkiem (sortowanym z postaciami, z prześwitem), a nie częścią kawałka mapy. */
  osobnoOd: 2,
};

/** Prześwit za wysokim budynkiem – wariant E (właściciel 6.10): duże wycięcie, zostaje kontur. Liczby w px obrazu przy bohaterce 48 px. */
export const PRZESWIT_BUDYNKU = {
  promien: 58,
  /** Poziomo elipsa szersza tyle razy. */
  rozciag: 1.25,
  /** Ditherowany brzeg. */
  brzeg: 10,
  /** Krycie wnętrza (0–255): budynek prawie znika. */
  alfaWnetrza: 0x18,
  /** Krycie konturu: widać, gdzie stoi ściana. */
  alfaKonturu: 0xb0,
  /** Środek elipsy tyle px nad stopami. */
  srodekNadStopami: 22,
};

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

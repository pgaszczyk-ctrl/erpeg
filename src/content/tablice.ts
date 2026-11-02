// City boards in towns of the whole world (src/tablice/swiatowe.ts). Lublin's own boards: scripts/tablice/tablice.mjs.
export const TABLICE_SWIAT = {
  /** Towns from this many people get boards (smaller ones have no ways out worth a sign). */
  minLudzi: 15_000,
  /** Looking for the town: towns within this many metres of the hero. */
  szukajM: 40_000,
  /** The hero counts as in town within its built-up radius × this. */
  wMiescie: 1.3,
  /** Built-up radius = 9.5 m × √people, at least this. */
  minPromienM: 2_500,
  /** The board map covers at least this far from the centre (m). */
  minZakresM: 6_000,
  /** Grid of the built-up land (m), and the gap in it that ends the town along a ray. */
  kratkaM: 150,
  przerwaM: 900,
  /** …and the gap allowed before the first built-up land (old towns have none at zoom 9). */
  przerwaStartM: 3_500,
  /** The outline reaches at least this share of the built-up radius in every direction. */
  minCzescPromienia: 0.45,
  /** A road leaving town heads out of it (cos of the angle to the radius). */
  promieniowo: 0.4,
  /** Crossings closer than this and heading the same way (degrees) are one way out. */
  jedenWylotM: 2_000,
  kat: 35,
  blisko: { minKm: 12, maxKm: 75, minLudzi: 1_500, maxLudzi: 70_000, srodekKm: 30 },
  /** A big city is hidden behind another big one this much nearer (share of the distance) within this angle (owner:
   *  from Kraków no sign to Lublin – Rzeszów/Kielce come first). */
  oslona: { blizej: 0.7, kat: 30 },
  daleko: { minKm: 45, maxKm: 450, minLudzi: 100_000, zapasLudzi: 40_000, zapasKm: 200 },
  /** Lakes smaller than this (m across) aren't drawn. */
  jezioroMinM: 500,
  /** Boards: by a way out this far inside town, at least this far apart, at most this many per town. */
  wGlabM: 600,
  odstepM: 900,
  maksTablic: 40,
  /** Boards are put up once the hero is this near their spot (the game tiles there are loaded). */
  stawiajM: 700,
};

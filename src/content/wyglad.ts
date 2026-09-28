// The new, detailed characters (64×64 px frames drawn by the artist, files in
// public/postacie/). Each sheet: 3 rows (down, side, up) × 3 columns (step A,
// standing, step B). A mask of the same size marks what may be recoloured:
// red = clothes, green = second colour (belt, trousers, skin of the goblin),
// blue = small accents. See sprites.ts.

/** Switch the new characters on (off = the old 16×20 pixel people). */
export const NOWE_POSTACIE = true;

export interface Postac {
  id: string;
  /** Name in the character sheet. */
  nazwa: string;
  /** File in public/postacie/ (without .png); the mask is `<plik>_maska.png`. */
  plik: string;
  /** Does the side row look to the right? (the game wants it looking left and mirrors it) */
  bokWPrawo: boolean;
  /** Size on the map: how much of the 64 px frame (0.36 ≈ as tall as the old hero). */
  skala: number;
  /** Make the STROJE colour variants from the mask (false: the mask is wrong, only the drawn colours). */
  przebarwiaj?: boolean;
  /** Who it is, so the townsfolk get a fitting name: k = woman/girl, m = man/boy. */
  plec?: 'k' | 'm';
  wiek?: 'dziecko' | 'dorosly' | 'starszy';
}

/** Heroes to choose from (and the townsfolk, recoloured). */
export const BOHATEROWIE: Postac[] = [
  { id: 'wedrowiec', nazwa: 'Wędrowiec', plik: 'traveler', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'rycerz', nazwa: 'Rycerz', plik: 'knight', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'luczniczka', nazwa: 'Łuczniczka', plik: 'ranger', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
];

/** Townsfolk drawn by the artist (packs „mieszkańcy 01–05” with v3 masks and „06–10”); each also in the STROJE colours. Ids: letters only. */
export const MIESZKANCY_HD: Postac[] = [
  { id: 'kobieta', nazwa: 'Młoda kobieta', plik: 'mieszkaniec_01', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
  { id: 'chlopiec', nazwa: 'Chłopiec', plik: 'mieszkaniec_02', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dziecko' },
  { id: 'wasacz', nazwa: 'Pan z wąsem', plik: 'mieszkaniec_03', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'babcia', nazwa: 'Babcia', plik: 'mieszkaniec_04', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'starszy' },
  { id: 'mlodzieniec', nazwa: 'Młody mężczyzna', plik: 'mieszkaniec_05', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'dziewczynka', nazwa: 'Dziewczynka z warkoczykami', plik: 'mieszkaniec_06', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dziecko' },
  { id: 'chlopak', nazwa: 'Chłopiec', plik: 'mieszkaniec_07', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dziecko' },
  { id: 'pani', nazwa: 'Kobieta', plik: 'mieszkaniec_08', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
  { id: 'pan', nazwa: 'Mężczyzna', plik: 'mieszkaniec_09', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'dziadek', nazwa: 'Starszy pan', plik: 'mieszkaniec_10', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'starszy' },
];

/** The imp (chochlik): smaller than a person. */
export const CHOCHLIK: Postac = { id: 'chochlik', nazwa: 'Chochlik', plik: 'slime', bokWPrawo: false, skala: 0.28 };

/** Townsfolk: each hero in these clothes colours (hue in degrees, saturation ×, lightness ×) – red and green mask parts. */
export const STROJE: { ubranie: [number, number, number]; drugi: [number, number, number] }[] = [
  { ubranie: [0, 1, 1], drugi: [0, 1, 1] }, // as drawn
  { ubranie: [140, 1, 1.05], drugi: [0, 0.6, 0.8] },
  { ubranie: [300, 0.9, 1.1], drugi: [0, 1, 1.2] },
  { ubranie: [40, 1.1, 1.15], drugi: [200, 0.4, 0.8] },
  { ubranie: [0, 0.1, 0.9], drugi: [0, 1, 0.7] },
];

/** Red glow around enemies (and townsfolk in a duel) so they aren't taken for people: blur in frame pixels, how strong (0–1), how many layers. */
export const POSWIATA = { rozmycie: 6, mocno: 1, warstwy: 3, kolor: '#ff2a2a' };

/** Where the feet stand in a 64 px frame (px from the top). */
export const STOPY_PX = 62;

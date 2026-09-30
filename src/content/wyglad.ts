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
  /** Has a clothes mask file (`<plik>_maska.png`); the enemies don't. */
  maska?: boolean;
  /** Kept off the streets until the artist redraws it (e.g. broken walking frames). */
  wylaczona?: boolean;
  /** Who it is, so the townsfolk get a fitting name: k = woman/girl, m = man/boy. */
  plec?: 'k' | 'm';
  wiek?: 'dziecko' | 'dorosly' | 'starszy';
}

/** Heroes to choose from (and the townsfolk, recoloured). */
export const BOHATEROWIE: Postac[] = [
  { id: 'wedrowiec', nazwa: 'Wędrowiec', plik: 'traveler', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'rycerz', nazwa: 'Rycerz', plik: 'knight', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'luczniczka', nazwa: 'Łuczniczka', plik: 'ranger', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
  // Pack „bohaterowie 04–10”.
  { id: 'podrozniczka', nazwa: 'Podróżniczka w szaliku', plik: 'bohater_04', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
  { id: 'obiezyswiat', nazwa: 'Obieżyświat', plik: 'bohater_05', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'zielarka', nazwa: 'Dziewczyna z warkoczami', plik: 'bohater_06', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dziecko' },
  { id: 'wloczega', nazwa: 'Włóczęga w bezrękawniku', plik: 'bohater_07', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dorosly' },
  { id: 'wojowniczka', nazwa: 'Wojowniczka z kucykiem', plik: 'bohater_08', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
  { id: 'zwiadowca', nazwa: 'Chłopiec w pelerynie', plik: 'bohater_09', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dziecko' },
  { id: 'srebrna', nazwa: 'Srebrnowłosa', plik: 'bohater_10', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' },
];

/** Characters made before the pack 04–10 got one of the first three by their name: they keep it. */
export const PIERWSI_BOHATEROWIE = 3;

/** Townsfolk drawn by the artist (packs „mieszkańcy 01–05” with v3 masks, „06–10” and „11–15” from the style fix v5); each also in the STROJE colours. Ids: letters only. */
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
  { id: 'panienka', nazwa: 'Dziewczynka', plik: 'mieszkaniec_11', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dziecko' }, // redrawn in the enemies pack v1
  { id: 'urwis', nazwa: 'Chłopiec', plik: 'mieszkaniec_12', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'dziecko' },
  { id: 'staruszka', nazwa: 'Starsza pani', plik: 'mieszkaniec_13', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'starszy' },
  { id: 'staruszek', nazwa: 'Starszy pan w kapeluszu', plik: 'mieszkaniec_14', bokWPrawo: false, skala: 0.36, plec: 'm', wiek: 'starszy' },
  { id: 'mieszczka', nazwa: 'Kobieta', plik: 'mieszkaniec_15', bokWPrawo: false, skala: 0.36, plec: 'k', wiek: 'dorosly' }, // redrawn in the enemies pack v1 (the first v5 step frames were "halved")
];

/** The imp (chochlik): smaller than a person. */
export const CHOCHLIK: Postac = { id: 'chochlik', nazwa: 'Chochlik', plik: 'slime', bokWPrawo: false, skala: 0.28 };

/** Fixed characters (pack „postacie stałe 01”): each has one look (no recolouring). Key = who in FixedNpcs/Story. */
export const STALE_HD: Record<'mag' | 'margo' | 'marek' | 'iwonka' | 'grazynka' | 'luigi' | 'martin' | 'woznica', Postac> = {
  mag: { id: 'mag', nazwa: 'Mag Albrecht', plik: 'mag', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'm', wiek: 'starszy' },
  margo: { id: 'margo', nazwa: 'Siostra Margo', plik: 'siostra_margo', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'k', wiek: 'dorosly' },
  marek: { id: 'marek', nazwa: 'Dziadek Marek', plik: 'dziadek_marek', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'm', wiek: 'starszy' },
  iwonka: { id: 'iwonka', nazwa: 'Babcia Iwonka', plik: 'babcia_iwonka', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'k', wiek: 'starszy' },
  grazynka: { id: 'grazynka', nazwa: 'Babcia Grażynka', plik: 'babcia_grazynka', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'k', wiek: 'starszy' },
  // Pack „postacie stałe 02”.
  luigi: { id: 'luigi', nazwa: 'Luigi', plik: 'luigi', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'm', wiek: 'dorosly' },
  martin: { id: 'martin', nazwa: 'Martin', plik: 'martin', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'm', wiek: 'dorosly' },
  woznica: { id: 'woznica', nazwa: 'Woźnica', plik: 'woznica', bokWPrawo: false, skala: 0.36, przebarwiaj: false, plec: 'm', wiek: 'dorosly' },
};

/** The other enemies (pack „wrogowie v1”; no masks, the game adds the red glow). Key = enemy kind(s) in fabula.ts. */
export const WROGOWIE_HD: { postac: Postac; rodzaje: string[] }[] = [
  { postac: { id: 'driada', nazwa: 'Driada', plik: 'driada', bokWPrawo: false, skala: 0.32, maska: false }, rodzaje: ['driada'] },
  { postac: { id: 'zombie', nazwa: 'Zombiak', plik: 'zombie', bokWPrawo: false, skala: 0.32, maska: false }, rodzaje: ['zombie', 'wodnik'] },
  { postac: { id: 'szkielet', nazwa: 'Szkielet', plik: 'szkielet', bokWPrawo: false, skala: 0.32, maska: false }, rodzaje: ['szkielet'] },
  { postac: { id: 'bandyta', nazwa: 'Bandyta', plik: 'bandyta', bokWPrawo: false, skala: 0.36, maska: false }, rodzaje: ['bandyta'] },
  // The boss: a bigger goblin with a helmet and a club; the game makes him 1.8× / 2.5× bigger (ENEMY_KINDS scale).
  { postac: { id: 'herszt', nazwa: 'Herszt', plik: 'herszt', bokWPrawo: false, skala: 0.28, maska: false }, rodzaje: ['herszt', 'wielki_herszt'] },
];

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

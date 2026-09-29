// ============================================================================
//  GRAFIKI ŚWIATA (podłoże, dachy) od grafika – public/swiat/<plik>.png
//  Pliki są rysowane 3× większe niż na mapie (1 m ≈ 6 px w pliku) i muszą się
//  kafelkować. Gra używa tylko tych z listy MAMY – dopisz nazwę pliku, gdy
//  trafi do public/swiat/. Bez pliku zostaje dotychczasowy, rysowany wygląd.
// ============================================================================

/** Ground textures: kind of area on the map → file name. */
export const PODLOZE_PLIKI: Record<string, string> = {
  grass: 'podloze_trawa',
  park: 'podloze_park',
  forest: 'podloze_las',
  scrub: 'podloze_zarosla',
  wetland: 'podloze_mokradlo',
  water: 'podloze_woda',
  farmland: 'podloze_pole',
  cemetery: 'podloze_cmentarz',
  allotments: 'podloze_dzialki',
  pitch: 'podloze_boisko',
  playground: 'podloze_plac_zabaw',
  parking: 'podloze_parking',
  plaza: 'podloze_plac',
  paved: 'podloze_bruk',
  sand: 'podloze_piasek',
  rock: 'podloze_skala',
  glacier: 'podloze_lodowiec',
  // Not areas: the earthen roads and paths, and the wild land outside the map.
  track: 'podloze_droga',
  outside: 'podloze_puszcza',
};

/**
 * Roof textures (the sunny side) in place of the drawn roof colours, in the
 * same order as ROOFS in MapRenderer (reds, browns, greys): a building keeps
 * its colour family, and one without its file yet stays a plain colour.
 */
export const DACHY_PLIKI = [
  'dach_dachowka_czerwona_jasna', 'dach_dachowka_czerwona_jasna', 'dach_dachowka_czerwona_jasna',
  'dach_dachowka_brazowa_jasna', 'dach_dachowka_brazowa_jasna', 'dach_lupek_jasna',
  'dach_dachowka_brazowa_jasna', 'dach_lupek_jasna', 'dach_dachowka_czerwona_jasna',
];

/** Front walls (48 × 24, repeat sideways, bottom = ground): materials, picked per building by its seed. */
export const SCIANY = [
  { plik: 'sciana_tynk_kremowy', udzial: 0.6 },
  { plik: 'sciana_cegla', udzial: 0.4 },
];

/** Gas lamps along the town streets (sheet of 2 frames 24 × 72: day, night) and chimneys with steam on roofs (3 frames 18 × 30). */
export const LATARNIE = { plik: 'latarnia_gazowa', klatki: 2, coM: 32, ulice: ['major', 'medium', 'minor', 'pedestrian'] };
export const KOMINY = { plik: 'komin_para', klatki: 3, naIleDomow: 3, odM2: 60 };

/**
 * Ozdobne drzewa i krzaki na trawnikach i w parkach (nie da się ich ściąć ani zerwać): siatka co `coM`
 * metrów, w każdym oczku z taką szansą coś rośnie; `drzew` = jaka część to duże drzewa (reszta krzaki).
 */
export const ZIELEN = {
  drzewo: 'drzewo_lisciaste', krzak: 'krzak', klatki: 2, coM: 16,
  szansa: { park: 0.45, grass: 0.12, cemetery: 0.3 } as Record<string, number>,
  drzew: 0.55,
};

/** How many times bigger the artist draws than the map shows. */
export const SKALA_PLIKOW = 3;

/** Files already in public/swiat/ (add the name when the artist's file arrives). */
import { MGLA } from './mgla';

export const MAMY: string[] = ['podloze_trawa', 'podloze_bruk', 'dach_dachowka_czerwona_jasna', 'dach_dachowka_brazowa_jasna', 'dach_lupek_jasna', 'podloze_droga', 'podloze_plac', 'podloze_park', 'podloze_las', 'podloze_woda', 'podloze_pole', 'podloze_zarosla', 'sciana_tynk_kremowy_gladka', 'sciana_tynk_kremowy_okno', 'sciana_tynk_kremowy_drzwi', 'sciana_cegla_gladka', 'sciana_cegla_okno', 'sciana_cegla_drzwi', 'latarnia_gazowa', 'komin_para', MGLA.plik, 'drzewo_jablon', 'drzewo_sliwa', 'winorosl', 'sosna', 'grzyb', 'kloda', 'drzewo_lisciaste', 'krzak'];

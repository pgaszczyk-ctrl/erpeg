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

/** Roof textures (the sunny side); a building gets one of those present, by its seed. */
export const DACHY_PLIKI = ['dach_dachowka_czerwona_jasna', 'dach_dachowka_brazowa_jasna', 'dach_lupek_jasna', 'dach_gont_jasna', 'dach_strzecha_jasna', 'dach_miedz_jasna'];

/** How many times bigger the artist draws than the map shows. */
export const SKALA_PLIKOW = 3;

/** Files already in public/swiat/ (add the name when the artist's file arrives). */
export const MAMY: string[] = [];

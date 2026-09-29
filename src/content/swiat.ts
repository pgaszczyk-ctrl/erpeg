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

/**
 * Dekoracje ulic (paczka 04b): pliki i gdzie gra je stawia. `coM` = co ile metrów wzdłuż drogi.
 */
export const DEKORACJE = {
  lawka: { plik: 'lawka', coM: 38 },          // przy ścieżkach w parkach
  kosz: { plik: 'kosz_mosiezny' },           // przy co drugiej ławce
  hydrant: { plik: 'hydrant_parowy', coM: 95 },       // chodniki ulic
  slup: { plik: 'slup_ogloszeniowy', coM: 170 },       // większe ulice
  studzienka: { plik: 'studzienka_para', klatki: 3, coM: 260, ulice: ['major', 'medium'] }, // w bruku większych ulic (rzadko – właściciel: było za gęsto)
  zegar: { plik: 'zegar_uliczny', odM2: 1500 },     // na placach (większych niż odM2)
  donica: { plik: 'donica_kwiaty', klatki: 2 },     // przy drzwiach sklepów, szkół, kościołów, bibliotek, hoteli, urzędów
  skrzynie: { plik: 'skrzynie_beczki' },      // przy sklepach i wozach kupców
  welocyped: { plik: 'welocyped' },           // przy szkołach i bibliotekach
  poczta: { plik: 'automat_pneumatyczny' },   // przy pocztach, skrzynkach pocztowych i paczkomatach
};

/**
 * Miejsca szczególne (paczka 04d): najwyżej jedno na plac. Wieża zegarowa na placu
 * co najmniej `odM2` m² z ratuszem/urzędem miasta w promieniu `przyRatuszuM`,
 * fontanna na placach od `odM2`, smoczy kocioł na co trzecim mniejszym placu od
 * `odM2` (i zawsze na lubelskim Rynku). `podstawa` = twarda podstawa w punktach
 * mapy (szer. × gł.), reszta obrazka nie zatrzymuje bohatera, tylko go zasłania.
 */
export const MIEJSCA = {
  fontanna: { plik: 'fontanna_smok', odM2: 3000, podstawa: [18, 5] as [number, number] },
  kociol: { plik: 'kociol_publiczny', odM2: 1500, podstawa: [15, 4] as [number, number] },
  wieza: { plik: 'wieza_zegarowa', odM2: 1500, przyRatuszuM: 150, podstawa: [19, 5] as [number, number] },
  /** Smoczy kocioł na lubelskim Rynku (misja Martina „Zmarznięty smok” go rozpala). */
  kociolLublin: { lat: 51.24787, lon: 22.56818, przy: 'Rynek 1' },
};

/**
 * Wozy woźniców (paczka „wozy konne final”): ładunek × maść, każdy plik 2 klatki
 * (koń stoi / przestępuje) po 248 × 198, pokazane tak, żeby klatka miała
 * `wysokosc` punktów mapy (koń trochę wyższy od ludzika). Wóz stoi przy stacji,
 * wybierany po id stacji; klatki zmieniają się co `klatkaMs`.
 */
export const WOZY = {
  ladunki: ['pusty', 'beczki', 'worki'],
  masci: ['brazowy', 'czarny', 'szary'],
  wysokosc: 34,
  klatkaMs: [1400, 2600] as [number, number],
};

/** Przyrządy treningowe (paczka 07): 3 klatki (stoi, trafiony, wraca); kukła ma w grze `wysokosc` punktów mapy (jak mieszkaniec), reszta w tej samej skali. */
export const TRENING = { wysokosc: 22, klatkaMs: 110 };

/** Szyldy nad drzwiami miejsc (wycięte z planszy grafika, 86 × 84): szerokość w grze w punktach mapy (dawne znaczki miały 14). */
export const SZYLDY = { szerokosc: 16 };

/** How many times bigger the artist draws than the map shows. */
export const SKALA_PLIKOW = 3;

/** Files already in public/swiat/ (add the name when the artist's file arrives). */
import { MGLA } from './mgla';

export const MAMY: string[] = ['podloze_trawa', 'podloze_bruk', 'dach_dachowka_czerwona_jasna', 'dach_dachowka_brazowa_jasna', 'dach_lupek_jasna', 'podloze_droga', 'podloze_plac', 'podloze_park', 'podloze_las', 'podloze_woda', 'podloze_pole', 'podloze_zarosla', 'sciana_tynk_kremowy_gladka', 'sciana_tynk_kremowy_okno', 'sciana_tynk_kremowy_drzwi', 'sciana_cegla_gladka', 'sciana_cegla_okno', 'sciana_cegla_drzwi', 'latarnia_gazowa', 'komin_para', MGLA.plik, 'drzewo_jablon', 'drzewo_sliwa', 'winorosl', 'sosna', 'grzyb', 'kloda', 'drzewo_lisciaste', 'krzak', 'lawka', 'kosz_mosiezny', 'hydrant_parowy', 'slup_ogloszeniowy', 'studzienka_para', 'zegar_uliczny', 'donica_kwiaty', 'skrzynie_beczki', 'welocyped', 'automat_pneumatyczny', 'fontanna_smok', 'kociol_publiczny', 'wieza_zegarowa', 'drogowskaz', 'kukla_treningowa', 'kukla_treningowa_druga', 'tarcza_strzelnicza', 'krysztal_magii', ...['sklep', 'szkola', 'kosciol', 'urzad', 'szpital', 'policja', 'biblioteka', 'hotel', 'bank', 'alchemik', 'sklep_sportowy', 'kemping'].map((n) => `szyld_${n}`)];

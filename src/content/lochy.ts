// Lochy – proste labirynty pod ziemią (właściciel, 27.10.2026: „w miejscach ruin i na cmentarzach stworzyć
// lochy/piwnice do eksploracji… proste labirynty wypełnione potworkami”; „na żywo, zacznij od cmentarzy na
// teście; dodaj na tyłach co 2. kościoła”). Tylko z „nową walką” (walka/live.ts – serwer testowy).
// Wejście: kamienne zejście na cmentarzu albo za co drugą świątynią; w środku osobna mała mapa (src/loch/),
// ta sama dla każdego (układ z numeru miejsca), grupki potworów po komnatach, strażnik i skrzynia w najdalszej.
// WARTOŚCI DO TESTU – liczby ustawimy przy balansie.
import type { RodzajWroga } from './fabula';
import { tx } from '../i18n';

export type RodzajLochu = 'krypta' | 'podziemia';

export interface OpisLochu {
  nazwa: string;
  /** Tekst przy wejściu (pytanie, czy zejść). */
  wejscie: string;
  /** Siatka węzłów labiryntu [kolumny, wiersze] – zakres losowany z numeru miejsca. */
  wezly: [[number, number], [number, number]];
  /** Zwykli mieszkańcy komnat. */
  potwory: RodzajWroga[];
  /** Strażnik skrzyni w najdalszej komnacie i jego obstawa. */
  straznik: RodzajWroga;
  obstawa: RodzajWroga[];
  /** Kolory rysunku: podłoga (płyty), spoiny, wierzch ściany, lico ściany, akcent (mech / cegła). */
  kolory: { plyta: string[]; spoina: string; wierzch: string; lico: string; licoCien: string; akcent: string };
  /** Nagroda ze skrzyni. */
  nagroda: { monety: [number, number]; exp: number; mikstura: number; diament: number };
}

export const LOCHY: Record<RodzajLochu, OpisLochu> = {
  krypta: {
    get nazwa() { return tx('Krypta pod cmentarzem', 'Crypt under the cemetery'); },
    get wejscie() { return tx('Między nagrobkami kamienne schody schodzą w ciemność. Z dołu ciągnie chłodem i czymś, co chrobocze.\n\nZejść do krypty?', 'Between the gravestones, stone steps lead down into the dark. Cold air rises from below, and something is scratching.\n\nGo down into the crypt?'); },
    wezly: [[4, 3], [5, 4]],
    potwory: ['szkielet', 'szkielet', 'zombie'],
    straznik: 'upior',
    obstawa: ['szkielet', 'szkielet'],
    kolory: {
      plyta: ['#4a4d52', '#45484d', '#504f52', '#43474a'],
      spoina: '#2a2b30',
      wierzch: '#24252b',
      lico: '#5b5e66',
      licoCien: '#3b3d44',
      akcent: '#4f6a3e',
    },
    nagroda: { monety: [80, 160], exp: 150, mikstura: 1, diament: 0.03 },
  },
  podziemia: {
    get nazwa() { return tx('Katakumby pod świątynią', 'Catacombs under the temple'); },
    get wejscie() { return tx('Za świątynią, pod murem, okute drzwiczki prowadzą do starych katakumb. Ktoś je niedawno wyważył…\n\nZejść do katakumb?', 'Behind the temple, by the wall, an iron-bound hatch leads to old catacombs. Someone forced it open not long ago…\n\nGo down into the catacombs?'); },
    wezly: [[3, 3], [4, 4]],
    potwory: ['glut', 'glut', 'szkielet', 'bandyta'],
    straznik: 'wielki_glut',
    obstawa: ['glut', 'glut'],
    kolory: {
      plyta: ['#5a4a3e', '#55473b', '#604e40', '#514338'],
      spoina: '#2e241d',
      wierzch: '#2a201a',
      lico: '#7a4f3a',
      licoCien: '#523426',
      akcent: '#8a5e44',
    },
    nagroda: { monety: [60, 120], exp: 110, mikstura: 1, diament: 0.02 },
  },
};

export const LOCH = {
  /** Kratka labiryntu (px mapy). Bohater ma ~8 px szerokości. */
  kratka: 8,
  /** Odstęp węzłów (kratki). */
  odstep: 14,
  /** Szerokość korytarza (kratki, nieparzysta). */
  korytarz: 3,
  /** Komnata: bok w kratkach [min, max]. */
  komnata: [6, 10] as [number, number],
  /** Szansa, że węzeł jest komnatą (reszta: skrzyżowanie korytarzy); wejście i skarb zawsze. */
  szansaKomnaty: 0.6,
  /** Dodatkowe przejścia (pętle) poza drzewem rozpinającym. */
  petle: 0.22,
  /** Grubość ściany w kratkach (zasłania wzrok). */
  sciana: 2,
  /** Potworów w komnacie [min, max]; im głębiej (dalej od wejścia), tym więcej. */
  wKomnacie: [1, 4] as [number, number],
  /** Szansa, że komnata (nie wejście, nie skarb) ma potwory. */
  szansaGrupy: 0.75,
  /** Pochodnia co tyle kratek ściany w komnatach. */
  pochodniaCo: 7,
  /** Cmentarz musi mieć co najmniej tyle m², żeby mieć kryptę. */
  cmentarzOdM2: 2500,
  /** Katakumby ma każda duża świątynia (właściciel, 27.10.2026: „duży kościół zawsze ma katakumby, inne nie”): budynek od tylu m². */
  kosciolOdM2: 1200,
  /** Kaplice nie mają (często stoją w szpitalu/szkole – liczyłaby się powierzchnia całego budynku). */
  bezKatakumb: /kaplic|chapel|kapell/i,
  /** Jak blisko wejścia trzeba stanąć (m), żeby zejść/wyjść. */
  dotykM: 9,
  /** Jak daleko szukać wejść wokół bohatera (m). */
  szukajM: 900,
  /** Jak daleko widać w lochu (m) – dalej ciemność (ściany i tak zasłaniają). */
  wzrokM: 75,
  /** Ciemność w lochu (0..1) – poza światłem lampy i pochodni. */
  ciemnosc: 0.5,
};

export const LOCH_TEKSTY = {
  get schodze() { return tx('🕯 Schodzę', '🕯 Go down'); },
  get nieTeraz() { return tx('Nie teraz', 'Not now'); },
  get wWalce() { return tx('Najpierw skończ walkę.', 'Finish the fight first.'); },
  zszedl: (n: string) => tx(`🕯 ${n}. Ciemno, wilgotno… Schody za tobą prowadzą z powrotem na górę.`, `🕯 ${n}. Dark and damp… The stairs behind you lead back up.`),
  get wyjsc() { return tx('⬆ Schody na powierzchnię', '⬆ Stairs to the surface'); },
  wyjscPytanie: (zostalo: number) => zostalo > 0
    ? tx(`W lochu wciąż czai się ${zostalo === 1 ? 'jeden potwór' : `${zostalo} potworów`}. Wyjść na powierzchnię?`, `${zostalo === 1 ? 'One monster still lurks' : `${zostalo} monsters still lurk`} in the dungeon. Go up to the surface?`)
    : tx('Wyjść na powierzchnię?', 'Go up to the surface?'),
  get wychodze() { return tx('⬆ Wychodzę', '⬆ Go up'); },
  get zostaje() { return tx('Zostaję', 'Stay'); },
  get wyszedl() { return tx('☀ Znów na powierzchni.', '☀ Back on the surface.'); },
  get skrzynia() { return tx('🧰 Skrzynia', '🧰 Chest'); },
  get skrzyniaZamknieta() { return tx('Skrzynię pilnują – najpierw pokonaj strażnika i jego obstawę.', 'The chest is guarded – beat its guardian and the escort first.'); },
  get skrzyniaPusta() { return tx('Skrzynia jest pusta – już ją dziś otworzyłeś.', 'The chest is empty – you have already opened it today.'); },
  skrzyniaOtwarta: (co: string) => tx(`Wieko skrzypi… W środku:\n\n${co}`, `The lid creaks… Inside:\n\n${co}`),
  get zabrane() { return tx('Zabieram', 'Take it'); },
  get komnataCzysta() { return tx('🕯 W tej części lochu cicho.', '🕯 This part of the dungeon is quiet.'); },
  get wszystko() { return tx('🏆 Loch oczyszczony! Skrzynia czeka w najdalszej komnacie.', '🏆 Dungeon cleared! The chest waits in the farthest chamber.'); },
  get straznik() { return tx('☠ Coś wielkiego pilnuje tu skrzyni…', '☠ Something big guards the chest here…'); },
  get straznikPokonany() { return tx('🧰 Strażnik pokonany – skrzynia stoi otworem!', '🧰 Guardian beaten – the chest is open!'); },
  get oczyszczony() { return tx('🏆 Loch oczyszczony!', '🏆 Dungeon cleared!'); },
  get zloto() { return tx('złota', 'gold'); },
  get mikstura() { return tx('mikstura leczenia', 'healing potion'); },
  get diament() { return tx('💎 diament!', '💎 a diamond!'); },
  get misyjna() { return tx('Na dnie skrzyni, pod złotem, leży to, po co tu przyszedłeś:', 'At the bottom of the chest, under the gold, lies what you came for:'); },
};

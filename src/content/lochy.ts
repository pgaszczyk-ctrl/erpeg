// Lochy – proste labirynty pod ziemią (właściciel, 27.10.2026: „w miejscach ruin i na cmentarzach stworzyć
// lochy/piwnice do eksploracji… proste labirynty wypełnione potworkami”; „na żywo, zacznij od cmentarzy na
// teście; dodaj na tyłach co 2. kościoła”). Tylko z „nową walką” (walka/live.ts – serwer testowy).
// Wejście: kamienne zejście na cmentarzu albo za co drugą świątynią; w środku osobna mała mapa (src/loch/),
// ta sama dla każdego (układ z numeru miejsca), grupki potworów po komnatach, strażnik i skrzynia w najdalszej.
// WARTOŚCI DO TESTU – liczby ustawimy przy balansie.
import type { RodzajWroga } from './fabula';
import { tx } from '../i18n';

export type RodzajLochu = 'krypta' | 'podziemia' | 'jaskinia';

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
  // Jaskinia pod wielkim obozem bandytów (siedliska, właściciel 21.11.2026: „zejście do podziemi generowane jak lochy,
  // tyle że to jaskinia; i trudniejsze potworki”): nieregularne komnaty, kręte korytarze, wargi i Mosiężny Kozioł.
  jaskinia: {
    get nazwa() { return tx('Jaskinia pod obozem', 'Cave under the camp'); },
    get wejscie() { return tx('Za namiotem herszta skały rozstępują się w czarną szczelinę. Z dołu dochodzi warczenie i stukot kopyt o kamień.\n\nZejść do jaskini?', 'Behind the chieftain\'s tent the rocks part into a black crack. Growling and the clatter of hooves on stone rise from below.\n\nGo down into the cave?'); },
    wezly: [[4, 4], [6, 5]],
    potwory: ['warg', 'bandyta', 'warg', 'szkielet', 'zombie', 'bandyta'],
    straznik: 'koziol',
    obstawa: ['warg', 'warg', 'bandyta'],
    kolory: {
      plyta: ['#4f4438', '#5a4d3f', '#463c32', '#605345'],
      spoina: '#2b241e',
      wierzch: '#1d1915',
      lico: '#6b5b48',
      licoCien: '#43372b',
      akcent: '#6f8a7a',
    },
    nagroda: { monety: [160, 320], exp: 320, mikstura: 2, diament: 0.06 },
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

/** Zejście woła bohatera (właściciel, 21 Nov 2026: „upewnić się, że gracz je będzie widział – drgały co kilka sekund
 * lub pukały dźwiękowo”): klapa podskakuje, w szczelinie błyska, unosi się kurz, a z bliska słychać „puk-puk”. */
export const PUKANIE = {
  /** Co ile sekund puka jedno zejście (losowo z przedziału, każde ma swój rytm). */
  coOdS: 5,
  coDoS: 8.5,
  /** Z jakiej odległości słychać pukanie (m); obraz drga, gdy zejście jest na ekranie. */
  slychacM: 35,
  /** Głośność przy samym wejściu (0..1). */
  glosnosc: 0.8,
  /** Klapy otwierają się, gdy bohater stoi bliżej niż tyle metrów (wtedy już nie puka). */
  otwartaM: 6,
};

/**
 * Skrzynia skarbu (właściciel, 22.11.2026: „z niej też musi wyskakiwać coś z animacją, a nie w dialogu”): poza złotem,
 * EXP-em i miksturą czasem przedmiot z jakością lepszą niż z potworów (procenty: kiepski … mistrzowski).
 */
export const SKRZYNIA_LUP = { przedmiot: 0.75, drugi: 0.2, jakosci: [4, 16, 36, 30, 14] as const };

/**
 * Poziomy lochu (właściciel, 24.11.2026: „losowo 1–6 poziomów; ostatni ukryty, tylko w 25% lochów – zejście w losowym
 * miejscu, zasypane za luźną ścianą, 3 ciosy i pojawia się zejście”). 75 % lochów ma 1–5 poziomów (losowo),
 * 25 % ma 5 zwykłych + ukryty szósty. Skrzynia ze strażnikiem stoi na ostatnim zwykłym poziomie (i na ukrytym).
 * Lochy misji i prologu mają jeden poziom. WARTOŚCI DO TESTU.
 */
export const POZIOMY_LOCHU = {
  /** Szansa, że loch ma ukryty poziom za luźną ścianą (wtedy zwykłych jest `maks`). */
  szansaUkrytego: 0.25,
  /** Najwięcej zwykłych poziomów. */
  maks: 5,
  /** Potwory: życie i ciosy × (1 + mocNaPoziom × (poziom − 1)); ukryty jeszcze × mocUkrytego. */
  mocNaPoziom: 0.2,
  /** Od średniej trudności pierwsze zejście w głąb wymaga poziomu bohatera 5. */
  pierwszyProg: 5,
  mocUkrytego: 1.4,
  /** Skrzynia: złoto i EXP × (1 + nagrodaNaPoziom × (poziom − 1)). */
  nagrodaNaPoziom: 0.25,
  /** Ile ciosów trzeba zadać luźnej ścianie. */
  ciosowSciany: 3,
  /** Przycisk ucieczki pokazuje się po tylu sekundach od wejścia na poziom. */
  przyciskPoS: 10,
  /** Ucieczka (animacja biegnącego ludzika) trwa co najmniej tyle ms – w tym czasie wczytuje się powierzchnia. */
  ucieczkaMs: 5000,
};

/**
 * Wygląd lochów (właściciel, 24.11.2026: „dodaj dekorację lochów, trochę zmurszałe mury, ściekającą wodę; poziom za
 * ukrytą ścianą bardziej elegancki, marmury; trudniejsi przeciwnicy”). Wszystko rysowane kodem.
 */
export const DEKOR_LOCHU = {
  /** Szansa na ubytek w kamieniu/cegle lica (zmurszały mur). */
  ubytek: 0.16,
  /** Szansa na rysę na licu i na pękniętą płytę podłogi. */
  rysa: 0.14,
  /** Zacieki mchu spływające z góry lica. */
  mech: 0.12,
  /** Gruz u stóp ściany (kratka podłogi pod licem). */
  gruz: 0.12,
  /** Szansa, że kratka lica ma kapiącą wodę (zaciek + kałuża + spadające krople). */
  kapanie: 0.07,
  /** Co ile sekund spada kropla (losowo z przedziału, każde miejsce ma swój rytm). */
  kroplaCoS: [1.4, 3.8] as [number, number],
  /** Z jakiej odległości słychać kapanie (m). */
  kapanieSlychacM: 22,
  kapanieGlosnosc: 0.5,
};

/** Poziom za ukrytą ścianą: marmurowa sala i trudniejsi przeciwnicy. WARTOŚCI DO TESTU. */
export const UKRYTY_POZIOM = {
  /** Każda komnata ma grupę, a grupy są tyle razy liczniejsze. */
  liczniej: 1.3,
  /** Szansa, że potwór w komnacie jest z elity (silniejsze rodzaje danego lochu). */
  szansaElity: 0.25,
  elita: { krypta: ['zombie', 'zombie', 'upior'], podziemia: ['wielki_glut', 'herszt'], jaskinia: ['koziol', 'warg'] } as Record<RodzajLochu, RodzajWroga[]>,
  /** Szansa, że zwykły potwór wpada w szał (berserker: szybszy, częstsze ciosy, czerwona poświata). */
  berserk: 0.18,
  /** Dodatkowa obstawa strażnika skrzyni. */
  obstawa: { krypta: ['zombie', 'szkielet'], podziemia: ['herszt', 'bandyta'], jaskinia: ['warg', 'koziol'] } as Record<RodzajLochu, RodzajWroga[]>,
  /** Kolory marmurowej sali. */
  kolory: {
    jasny: ['#ece6da', '#e3dccd', '#efe9de'], ciemny: ['#3b3542', '#332e3a', '#403946'],
    zylka: 'rgba(120,108,96,0.55)', zylkaCiemna: 'rgba(200,190,210,0.25)',
    zloto: '#d4af37', zlotoCien: '#8a6a1e', lico: '#e6dfd0', licoCien: '#aaa08d', wierzch: '#221e29', dywan: '#7a1c24', dywanCien: '#5a1219',
  },
};

/** Skrzynia na ukrytym poziomie: szansa na coś lepszego (przedmioty jeszcze dopracujemy). */
export const SKRZYNIA_UKRYTA = { monety: 2, exp: 2, diament: 3, przedmiot: 1, drugi: 0.6, jakosci: [0, 6, 24, 40, 30] as const };

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
  poziom: (n: number) => tx(`poziom -${n}`, `level -${n}`),
  get zejdzNizej() { return tx('⬇ Zejście w głąb', '⬇ Way down'); },
  zejdzPytanie: (n: number, ukryty: boolean) => ukryty
    ? tx(`Za gruzem ciemne schody prowadzą jeszcze niżej – na poziom -${n}. Tu chyba nikt nie schodził od wieków…\n\nZejść?`, `Behind the rubble, dark stairs lead even deeper – to level -${n}. Nobody seems to have gone down here for ages…\n\nGo down?`)
    : tx(`Schody prowadzą głębiej, na poziom -${n}. Im niżej, tym groźniej – i tym bogatsza skrzynia na dnie.\n\nZejść?`, `The stairs lead deeper, to level -${n}. The lower you go, the more dangerous it gets – and the richer the chest at the bottom.\n\nGo down?`),
  get schodzeNizej() { return tx('⬇ Schodzę', '⬇ Go down'); },
  get wyzej() { return tx('⬆ Schody w górę', '⬆ Stairs up'); },
  wyzejPytanie: (n: number) => n > 0 ? tx(`Wrócić na poziom -${n}?`, `Go back up to level -${n}?`) : tx('Wyjść na powierzchnię?', 'Go up to the surface?'),
  get scianaPeka() { return tx('Ściana się kruszy…', 'The wall crumbles…'); },
  get scianaOdkryta() { return tx('🕳 Luźna ściana runęła – za nią schody w głąb!', '🕳 The loose wall caved in – stairs lead deeper behind it!'); },
  get zejscieNizej() { return tx('Zejście', 'Way down'); },
  get uciekajTytul() { return tx('🏃 Ucieczka z lochu', '🏃 Escape the dungeon'); },
  get uciekajPytanie() { return tx('Na pewno chcesz uciec na powierzchnię? Wrócisz przy wejściu do lochu.', 'Do you really want to run back to the surface? You will come out by the dungeon\'s entrance.'); },
  get uciekam() { return tx('🏃 Uciekam', '🏃 Run'); },
  get marmur() { return tx('✨ Marmurowa sala… Ktoś tu kiedyś mieszkał w przepychu. I wciąż czegoś pilnuje.', '✨ A marble hall… Someone once lived here in splendour. And something still keeps watch.'); },
  get uciekaszNapis() { return tx('Uciekasz na powierzchnię…', 'Running back to the surface…'); },
  get misyjna() { return tx('Na dnie skrzyni, pod złotem, leży to, po co tu przyszedłeś:', 'At the bottom of the chest, under the gold, lies what you came for:'); },
};

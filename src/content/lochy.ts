// Lochy – proste labirynty pod ziemią (właściciel, 27.10.2026: „w miejscach ruin i na cmentarzach stworzyć
// lochy/piwnice do eksploracji… proste labirynty wypełnione potworkami”; „na żywo, zacznij od cmentarzy na
// teście; dodaj na tyłach co 2. kościoła”). Tylko z „nową walką” (walka/live.ts – serwer testowy).
// Wejście: kamienne zejście na cmentarzu albo za co drugą świątynią; w środku osobna mała mapa (src/loch/),
// ta sama dla każdego (układ z numeru miejsca), grupki potworów po komnatach, strażnik i skrzynia w najdalszej.
// WARTOŚCI DO TESTU – liczby ustawimy przy balansie.
import type { RodzajWroga } from './fabula';

export type RodzajLochu = 'krypta' | 'podziemia';

export interface OpisLochu {
  nazwa: string;
  /** Tekst przy wejściu (pytanie, czy zejść). */
  wejscie: string;
  /** Zwykli mieszkańcy komnat. */
  potwory: RodzajWroga[];
  /** Strażnik skrzyni w najdalszej komnacie i jego obstawa. */
  straznik: RodzajWroga;
  obstawa: RodzajWroga[];
  /** Strażnica (stopień 3+): silniejszy przywódca w komnacie po drodze, z obstawą. */
  elita: RodzajWroga;
  /** Kolory rysunku: podłoga (płyty), spoiny, wierzch ściany, lico ściany, akcent (mech / cegła). */
  kolory: { plyta: string[]; spoina: string; wierzch: string; lico: string; licoCien: string; akcent: string };
  /** Nagroda ze skrzyni. */
  nagroda: { monety: [number, number]; exp: number; mikstura: number; diament: number };
}

export const LOCHY: Record<RodzajLochu, OpisLochu> = {
  krypta: {
    nazwa: 'Krypta pod cmentarzem',
    wejscie: 'Między nagrobkami kamienne schody schodzą w ciemność. Z dołu ciągnie chłodem i czymś, co chrobocze.\n\nZejść do krypty?',
    potwory: ['szkielet', 'szkielet', 'zombie'],
    straznik: 'upior',
    obstawa: ['szkielet', 'szkielet'],
    elita: 'zombie',
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
    nazwa: 'Katakumby pod świątynią',
    wejscie: 'Za świątynią, pod murem, okute drzwiczki prowadzą do starych katakumb. Ktoś je niedawno wyważył…\n\nZejść do katakumb?',
    potwory: ['glut', 'glut', 'szkielet', 'bandyta'],
    straznik: 'wielki_glut',
    obstawa: ['glut', 'glut'],
    elita: 'herszt',
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

/**
 * Stopnie skomplikowania lochu 1–5 (właściciel, 27.10.2026: „pierwszy loch to był jeden korytarz w kółko i jeden
 * pokoik; zrób 5 poziomów skomplikowania, na wyższych trudnościach dużo bardziej skomplikowane i więcej potworków”).
 * Ten sam loch (to samo wejście) na tej samej trudności ma zawsze ten sam stopień i układ – id mapy niesie oba.
 */
export interface StopienLochu {
  /** Siatka węzłów [kolumny, wiersze]: od – do. */
  siatka: [[number, number], [number, number]];
  /** Jaka część węzłów siatki jest użyta (reszta to lita skała – nieregularny kształt, ślepe odnogi). */
  zajete: number;
  /** Dodatkowe przejścia (pętle) poza drzewem rozpinającym. */
  petle: number;
  /** Szansa, że węzeł jest komnatą (reszta: skrzyżowanie korytarzy). */
  komnaty: number;
  /** Szansa, że korytarz kluczy (zakręt w kształcie Z albo objazd w bok). */
  zakrety: number;
  /** Szansa ślepej odnogi z niszą w stronę nieużytego węzła. */
  slepe: number;
  /** Potworów w komnacie [min, max] (więcej w głębi) i szansa, że komnata w ogóle je ma. */
  wKomnacie: [number, number];
  szansaGrupy: number;
  /** Szansa potwora na skrzyżowaniu korytarzy / w niszy ślepej odnogi. */
  naSkrzyzowaniu: number;
  wNiszy: number;
  /** Ile strażnic (elita + obstawa) po drodze. */
  straznice: number;
}

export const STOPNIE_LOCHU: StopienLochu[] = [
  /* 1 */ { siatka: [[3, 3], [4, 3]], zajete: 1, petle: 0.12, komnaty: 0.6, zakrety: 0.1, slepe: 0, wKomnacie: [1, 3], szansaGrupy: 0.75, naSkrzyzowaniu: 0, wNiszy: 0, straznice: 0 },
  /* 2 */ { siatka: [[4, 3], [4, 4]], zajete: 0.9, petle: 0.18, komnaty: 0.6, zakrety: 0.25, slepe: 0.25, wKomnacie: [2, 4], szansaGrupy: 0.8, naSkrzyzowaniu: 0.15, wNiszy: 0.2, straznice: 0 },
  /* 3 */ { siatka: [[4, 4], [5, 4]], zajete: 0.85, petle: 0.22, komnaty: 0.55, zakrety: 0.4, slepe: 0.4, wKomnacie: [2, 5], szansaGrupy: 0.85, naSkrzyzowaniu: 0.3, wNiszy: 0.35, straznice: 1 },
  /* 4 */ { siatka: [[5, 4], [6, 5]], zajete: 0.8, petle: 0.25, komnaty: 0.55, zakrety: 0.5, slepe: 0.5, wKomnacie: [3, 6], szansaGrupy: 0.9, naSkrzyzowaniu: 0.45, wNiszy: 0.5, straznice: 1 },
  /* 5 */ { siatka: [[6, 5], [7, 6]], zajete: 0.75, petle: 0.28, komnaty: 0.5, zakrety: 0.6, slepe: 0.6, wKomnacie: [3, 7], szansaGrupy: 0.95, naSkrzyzowaniu: 0.6, wNiszy: 0.65, straznice: 2 },
];

/**
 * Piętra (właściciel, 27.10.2026: „dungeony mają mieć poziomy; ilość = poziom trudności × 1,5 w górę”): Dziecięcy 2,
 * Młody 3, Średni 5, Wysoki 6, Hardkor 8. Każde niższe piętro trudniejsze: układ (stopień), więcej wrogów, silniejszy
 * boss i większa nagroda. Boss pilnuje skrzyni i zejścia na następne piętro.
 */
export const pieterLochu = (trudnosc: number) => Math.ceil((Math.max(0, Math.min(4, trudnosc)) + 1) * 1.5);

/** Stopień skomplikowania piętra (1–5): rośnie z głębokością, najgłębsze (8.) ma 5. */
export const stopienPietra = (pietro: number) => Math.max(1, Math.min(STOPNIE_LOCHU.length, Math.ceil((pietro * STOPNIE_LOCHU.length) / 8)));

export const PIETRA = {
  /** Na każdym kolejnym piętrze tyle więcej potworów (×). */
  potworow: 0.15,
  /** Boss: życie × (1 + tyle × (piętro − 1)), a na ostatnim piętrze jeszcze × ostatniBoss. */
  bossZycia: 0.4,
  ostatniBoss: 1.5,
  /** Boss trochę większy z każdym piętrem (× skali). */
  bossWiekszy: 0.06,
  /** Nagroda ze skrzyni: × (1 + tyle × (piętro − 1)); ostatnie piętro × ostatniaNagroda. */
  nagrody: 0.6,
  ostatniaNagroda: 2,
};

/** Mnożnik liczby potworów na trudności (na wyższych więcej, także na tym samym piętrze). */
export const POTWORY_NA_TRUDNOSC = [0.85, 1, 1.15, 1.3, 1.5];

export const LOCH = {
  /** Kratka labiryntu (px mapy). Bohater ma ~8 px szerokości. */
  kratka: 8,
  /** Odstęp węzłów (kratki). */
  odstep: 14,
  /** Szerokość korytarza (kratki, nieparzysta). */
  korytarz: 3,
  /** Komnata: bok w kratkach [min, max]. */
  komnata: [6, 10] as [number, number],
  /** Grubość ściany w kratkach (zasłania wzrok). */
  sciana: 2,
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
  schodze: '🕯 Schodzę',
  nieTeraz: 'Nie teraz',
  wWalce: 'Najpierw skończ walkę.',
  pieter: (n: number) => `Pięter: ${n} – im niżej, tym groźniej (i tym lepsze skarby).`,
  pietro: (f: number, n: number) => `Piętro ${f} z ${n}`,
  schodyDol: '⬇ Schody w dół',
  schodyDolPytanie: (f: number, n: number) => `Kręte schody prowadzą głębiej – na piętro ${f} z ${n}. Tam będzie groźniej.`,
  schodzeNizej: '⬇ Schodzę niżej',
  schodyDolZamkniete: 'Zejście niżej zagradza strażnik – najpierw go pokonaj.',
  schodyGora: '⬆ Schody w górę',
  wyjscPietro: (f: number) => `Schody prowadzą piętro wyżej (na ${f}.).`,
  wchodze: '⬆ Wchodzę',
  dno: '🏆 To najgłębsze piętro – skarb lochu jest tutaj.',
  ucieczka: '🏃 Uciekaj z lochu',
  uciekl: '🏃 Wybiegłeś z lochu na powierzchnię.',
  zszedl: (n: string) => `🕯 ${n}. Ciemno, wilgotno… Schody za tobą prowadzą z powrotem na górę.`,
  wyjsc: '⬆ Schody na powierzchnię',
  wyjscPytanie: (zostalo: number) => zostalo > 0
    ? `W lochu wciąż czai się ${zostalo === 1 ? 'jeden potwór' : `${zostalo} potworów`}. Wyjść na powierzchnię?`
    : 'Wyjść na powierzchnię?',
  wychodze: '⬆ Wychodzę',
  zostaje: 'Zostaję',
  wyszedl: '☀ Znów na powierzchni.',
  skrzynia: '🧰 Skrzynia',
  skrzyniaZamknieta: 'Skrzynię pilnują – najpierw pokonaj strażnika i jego obstawę.',
  skrzyniaPusta: 'Skrzynia jest pusta – już ją dziś otworzyłeś.',
  skrzyniaOtwarta: (co: string) => `Wieko skrzypi… W środku:\n\n${co}`,
  zabrane: 'Zabieram',
  komnataCzysta: '🕯 W tej części lochu cicho.',
  wszystko: '🏆 Loch oczyszczony! Skrzynia czeka w najdalszej komnacie.',
  straznik: '☠ Coś wielkiego pilnuje tu skrzyni…',
};

// ============================================================================
//  SMOKI – gatunki i ich ataki (zadanie „smoki_gatunki_ataki” z czatu 🎨 Grafika, decyzje właściciela 7.10.2026).
//  Smok to wpis w danych: gatunek + lista ataków z wagami. Atak to moduł (objects/SmokAI.ts).
//  Wszystkie liczby (zasięgi, obrażenia, czasy) są tu, w jednej tabeli – wartości startowe do strojenia na teście.
//  W = wzrost bohaterki w punktach mapy (zasięgi podane w jej wzrostach).
//  Obrażenia: ułamek pełnego zdrowia gracza (0,08 = 8 %), mnożone przez trudność (TRUDNOSC_SMOKOW).
// ============================================================================

export type AtakSmoka = 'ugryzienie' | 'ogien' | 'kwas' | 'dym' | 'lot';
export type GatunekId = 'lesny' | 'ognisty' | 'kwasowy' | 'trujacy' | 'gorski' | 'cien';

export interface Gatunek {
  nazwa: string;
  /** Zabarwienie zaślepki (do czasu rysunków grafika, zamówienia 15/15b). */
  kolor: number;
  /** Punkty życia (jak u innych wrogów, nie rosną z poziomem bohaterki). */
  zycie: number;
  /** Chód (px/s przy prędkości gracza 60 – skalowane jak u wrogów) i promień, w którym zauważa gracza (w W). */
  predkosc: number;
  wykrycie: number;
  /** Ataki specjalne z wagami (ugryzienie ma każdy). */
  ataki: Partial<Record<Exclude<AtakSmoka, 'ugryzienie'>, number>>;
  /** Fazy (boss „Cień smoka”): od jakiej części życia (1 → 0) dochodzą ataki. */
  fazy?: { odZycia: number; ataki: Partial<Record<Exclude<AtakSmoka, 'ugryzienie'>, number>> }[];
  /** Odporny na swój żywioł (na przyszłość: esencje i magia). */
  odporny?: 'ogien' | 'kwas' | 'trucizna';
  lup: { luska: [number, number]; zloto: [number, number]; exp: number };
  /** Wielkość względem zwykłego smoka-zaślepki. */
  skala: number;
}

export const GATUNKI_SMOKOW: Record<GatunekId, Gatunek> = {
  lesny: { nazwa: 'Smok leśny', kolor: 0x7fbf6a, zycie: 120, predkosc: 18, wykrycie: 6, ataki: {}, lup: { luska: [1, 2], zloto: [10, 25], exp: 60 }, skala: 0.9 },
  kwasowy: { nazwa: 'Smok kwasowy', kolor: 0xc8e04a, zycie: 200, predkosc: 16, wykrycie: 7, ataki: { kwas: 1 }, odporny: 'kwas', lup: { luska: [2, 3], zloto: [20, 40], exp: 100 }, skala: 1 },
  trujacy: { nazwa: 'Smok trujący', kolor: 0x9a86b0, zycie: 200, predkosc: 16, wykrycie: 7, ataki: { dym: 1 }, odporny: 'trucizna', lup: { luska: [2, 3], zloto: [20, 40], exp: 100 }, skala: 1 },
  ognisty: { nazwa: 'Smok ognisty', kolor: 0xff8a5a, zycie: 300, predkosc: 17, wykrycie: 8, ataki: { ogien: 1 }, odporny: 'ogien', lup: { luska: [3, 4], zloto: [30, 60], exp: 150 }, skala: 1.1 },
  gorski: { nazwa: 'Smok górski', kolor: 0x8fa8c8, zycie: 300, predkosc: 15, wykrycie: 9, ataki: { lot: 1 }, lup: { luska: [3, 4], zloto: [30, 60], exp: 150 }, skala: 1.15 },
  // Boss z historii (Mag Albrecht): ataki dochodzą w fazach (właściciel 7.10: „ataki w fazach”). Życie liczy historia (SMOK_CIOSOW).
  cien: {
    nazwa: 'Cień smoka', kolor: 0xffffff, zycie: 0, predkosc: 15, wykrycie: 10, ataki: { ogien: 1 },
    fazy: [{ odZycia: 0.66, ataki: { ogien: 1, kwas: 1, dym: 1 } }, { odZycia: 0.33, ataki: { ogien: 1, kwas: 1, dym: 1, lot: 2 } }],
    lup: { luska: [5, 5], zloto: [0, 0], exp: 0 }, skala: 1,
  },
};

/** Ataki: telegraf (pozy, ms), część czynna, odnowienie (ms), obszar (w W), obrażenia (ułamek zdrowia). */
/** Najkrótszy odstęp między dwoma atakami specjalnymi (ms), żeby dało się złapać oddech. */
export const PRZERWA_MIEDZY_ATAKAMI = 2500;

export const ATAKI_SMOKA = {
  ugryzienie: { zasieg: 1.2, telegraf: 400, odnowienie: 1500, obrazenia: 0.08 },
  ogien: { telegraf: 600, czas: 1200, dlugosc: 4, szerokosc: 2.5, tik: 300, obrazenia: 0.03, odnowienie: 7000, zasieg: 4.5,
    /** Podpalenie po wyjściu ze stożka: ms i obrażenia na tik. */
    podpalenie: { ms: 2000, tik: 500, obrazenia: 0.01 }, plamaMs: 30000 },
  kwas: { telegraf: 500, kul: 1, predkosc: 60, lot: 6, obrazenia: 0.06, odnowienie: 6000, zasieg: 7,
    oparzenie: { ms: 3000, tik: 500, obrazenia: 0.01 }, kaluza: { promien: 1.2, ms: 6000, tik: 500, obrazenia: 0.02 } },
  dym: { telegraf: 800, promien: 3.5, rosnie: 1000, trwa: 6000, rzednie: 800, tik: 500, obrazenia: 0.02, spowolnienie: 0.8, poWyjsciu: 4000, odnowienie: 12000, zasieg: 3 },
  lot: { start: 600, migniecia: 3, odstep: 700, rozrzut: 2, blokadaOd: 2, upadek: 300, promien: 2.5, obrazenia: 0.25, oszolomienie: 1500, odnowienie: 25000, zasieg: 12,
    trzesienie: { ms: 600, px: 6 }, peknieciaMs: 20000 },
};

/** Trudność (Dziecięcy, Młody, Średni, Wysoki, Hardkor): obrażenia ×, czas telegrafu ×, kule kwasu. */
export const TRUDNOSC_SMOKOW = {
  obrazenia: [0.5, 0.75, 1, 1.2, 1.5],
  telegraf: [1.5, 1.25, 1, 0.85, 0.7],
  kulKwasu: [1, 1, 2, 2, 3],
  /** Dziecięcy: dłuższe mignięcia cienia przed upadkiem. */
  odstepLotu: [1000, 850, 700, 700, 650],
};

/** Limity efektów (wydajność): kałuże, plamy, pęknięcia, chmury naraz. */
export const LIMIT_EFEKTOW = 24;

/**
 * Rozmieszczenie (właściciel 7.10: „wg środowiska, rzadko”): w kratce 1 km z szansą `szansa` (poza centrum: najwyżej
 * `maksMiejsc` miejsc w kratce), w pierwszym z `prob` losowych punktów kratki, którego teren pasuje do gatunku;
 * nie bliżej niż `odDomuM` od domu i `odMiejscM` od sklepów itp. Pokonany smok wraca przy następnym wejściu do gry.
 */
export const SMOKI_NA_MAPIE = { szansa: 0.18, maksMiejsc: 4, prob: 14, odDomuM: 600, odMiejscM: 120, odRuchu: 1600 };

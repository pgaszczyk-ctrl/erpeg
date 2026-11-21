// ============================================================================
//  SIEDLISKA — stałe miejsca polowań wbudowane w generowaną mapę (brief właściciela, 20.11.2026).
//  Etap 1–2: wspólna infrastruktura + obóz z palisadą. Rumowisko, bagno, leśne legowisko i ruiny
//  dojdą jako kolejne `TypSiedliska` korzystające z tego samego systemu (docs/siedliska/ADR.md).
//
//  Siedlisko NIE jest nakładką: planer (src/siedliska/plan.ts) zmienia mapę rodzajów podłoża
//  (klepisko, ścieżki), z kawałków znikają drzewa w jego obrysie, palisada/namioty/wieża są
//  osobnymi obiektami świata (głębia = podstawa, jak drzewa), a ich kolizje trafiają do CityMap.isBlocked.
//
//  Włącznik: src/siedliska/wlacznik.ts (razem z łowiskami; `?siedliska=0` wyłącza).
//  WARTOŚCI DO TESTU.
// ============================================================================

import type { RodzajWroga } from './fabula';

export type TypSiedliska = 'oboz' | 'rumowisko' | 'bagno';
export type RozmiarSiedliska = 'czujka' | 'maly' | 'sredni' | 'duzy' | 'warownia' | 'wielki' | 'twierdza';

/**
 * Wersja generatora siedlisk: wchodzi do ziarna i do id, więc zmiana reguł daje nowe (ale znowu stałe) układy,
 * a stare zapisy (np. pokonany szef) po prostu przestają pasować – nic się nie psuje.
 */
export const WERSJA_SIEDLISK = 3;

/** Teren, na którym obóz może stać, i czego musi unikać (obszary OSM w całym obrysie z marginesem). */
export const TEREN_SIEDLISK = {
  /** Środek: otwarty teren (brak obszaru = trawa). */
  // Dzicz, nie gospodarstwo: pole uprawne obok domu to nie miejsce na obóz (brief: lasy, polany, nieużytki).
  dozwolone: ['forest', 'grass', 'scrub', ''],
  /** Żadna próbka obrysu z marginesem nie może leżeć na tych obszarach (rzeczywiste jeziora, parki, cmentarze…). */
  zakazane: ['farmland', 'water', 'wetland', 'park', 'cemetery', 'allotments', 'pitch', 'plaza', 'parking', 'playground', 'paved', 'platform', 'sand', 'rock', 'glacier'],
  /** Margines (m) od palisady do najbliższego budynku i do każdej linii (droga, ścieżka, tor, rzeka). */
  odBudynkuM: 25,
  odLiniiM: 9,
  /** Od głównej drogi (linie 'major'). */
  odGlownejM: 140,
  /** Od ważnych miejsc (drzwi, dom). */
  odMiejscM: 260,
};

export interface ParametryRozmiaru {
  /** Promień obrysu (m) – kształt nieregularny, kurczy się tam, gdzie brakuje miejsca. */
  promienM: number;
  namioty: [number, number];
  bramy: [number, number];
  /** Oczekiwana liczba wież strażniczych (część ułamkowa = szansa na jeszcze jedną). */
  wieze: number;
  rekwizyty: [number, number];
  /** Zwykli mieszkańcy obozu (oprócz szefa i obstawy). */
  czlonkowie: [number, number];
  /** Szef i ilu ma obstawy (istniejący bestiariusz). */
  szef: RodzajWroga;
  obstawa: number;
  /** Wierzchołki obrysu (więcej przy dużych, żeby palisada była gładka). */
  wierzcholki: number;
  /**
   * Wielkie obozy (właściciel 21.11.2026: „mogą być duuużo większe, nawet zajmujące pojedyncze budynki kawałek od
   * miasta”): w obrysie mogą stać budynki (najwyżej tyle, z dala od wsi), a ścieżki i polne drogi przecinające
   * palisadę dostają bramy – nic nie zostaje odcięte. Bez tego pola obóz omija budynki i każdą linię jak dawniej.
   */
  zBudynkami?: number;
  /** Mieszkańcy z wagami (istniejący bestiariusz) – im większy obóz, tym groźniejsze towarzystwo. */
  sklad: [RodzajWroga, number][];
  /** Udział szaleńców (berserkerów: czerwona aura, szybsi, częściej biją) wśród mieszkańców. */
  berserkow: number;
  /** Mnożnik życia i ciosów mieszkańców (Slime.power – ten sam mechanizm co pogoda; EXP i łup bez zmian). */
  moc: number;
  /** Szansa na zejście do jaskini (src/loch, rodzaj 'jaskinia') przy namiocie szefa. */
  jaskinia: number;
}

export const OBOZ = {
  /** Szansa, że komórka łowisk (LOWISKA_EPI.komorkaKm) dostanie siedlisko (obóz, rumowisko albo bagno) zamiast łowiska. */
  szansa: 0.4,
  /** Kolejność prób rozmiarów: najpierw wylosowany, potem coraz mniejsze. */
  // Właściciel 20.11.2026: „w grze muszą mieć różne wielkości” – od czujki z jednym namiotem po warownię
  // z kilkoma wieżami (promień ×4,5). Wylosowany rozmiar, a gdy brakuje miejsca – kolejne mniejsze.
  rozmiary: {
    twierdza: { promienM: 125, namioty: [22, 30], bramy: [2, 3], wieze: 6.5, rekwizyty: [30, 40], czlonkowie: [20, 26], szef: 'wielki_herszt', obstawa: 4, wierzcholki: 64,
      zBudynkami: 5, sklad: [['bandyta', 0.55], ['warg', 0.3], ['wilk', 0.15]], berserkow: 0.2, moc: 1.5, jaskinia: 1 },
    wielki: { promienM: 85, namioty: [14, 18], bramy: [2, 3], wieze: 4.2, rekwizyty: [20, 26], czlonkowie: [15, 19], szef: 'wielki_herszt', obstawa: 3, wierzcholki: 48,
      zBudynkami: 3, sklad: [['bandyta', 0.65], ['warg', 0.25], ['wilk', 0.1]], berserkow: 0.15, moc: 1.3, jaskinia: 1 },
    warownia: { promienM: 58, namioty: [9, 12], bramy: [2, 2], wieze: 2.6, rekwizyty: [12, 16], czlonkowie: [11, 14], szef: 'wielki_herszt', obstawa: 3, wierzcholki: 34,
      zBudynkami: 1, sklad: [['bandyta', 0.8], ['warg', 0.2]], berserkow: 0.1, moc: 1.15, jaskinia: 0.6 },
    duzy: { promienM: 41, namioty: [6, 8], bramy: [2, 2], wieze: 1.3, rekwizyty: [8, 11], czlonkowie: [8, 10], szef: 'herszt', obstawa: 2, wierzcholki: 26,
      sklad: [['bandyta', 0.9], ['warg', 0.1]], berserkow: 0.05, moc: 1, jaskinia: 0.25 },
    sredni: { promienM: 28, namioty: [3, 5], bramy: [1, 2], wieze: 0.4, rekwizyty: [4, 6], czlonkowie: [5, 7], szef: 'herszt', obstawa: 2, wierzcholki: 20,
      sklad: [['bandyta', 1]], berserkow: 0, moc: 1, jaskinia: 0 },
    maly: { promienM: 19, namioty: [2, 3], bramy: [1, 1], wieze: 0, rekwizyty: [2, 4], czlonkowie: [3, 4], szef: 'herszt', obstawa: 1, wierzcholki: 16,
      sklad: [['bandyta', 1]], berserkow: 0, moc: 1, jaskinia: 0 },
    czujka: { promienM: 13, namioty: [1, 1], bramy: [1, 1], wieze: 0.5, rekwizyty: [1, 2], czlonkowie: [2, 2], szef: 'bandyta', obstawa: 0, wierzcholki: 14,
      sklad: [['bandyta', 1]], berserkow: 0, moc: 1, jaskinia: 0 },
  } as Record<RozmiarSiedliska, ParametryRozmiaru>,
  /** Od największego do najmniejszego (kolejność prób przy braku miejsca). */
  kolejnosc: ['twierdza', 'wielki', 'warownia', 'duzy', 'sredni', 'maly', 'czujka'] as RozmiarSiedliska[],
  wagiRozmiaru: [['twierdza', 0.12], ['wielki', 0.16], ['warownia', 0.16], ['duzy', 0.18], ['sredni', 0.18], ['maly', 0.12], ['czujka', 0.08]] as [RozmiarSiedliska, number][],
  /** Wielkie obozy: ile budynków w promieniu (obrys + tyle m) to już wieś – wtedy nie. */
  wiesM: 150,
  wiesBudynkow: 10,
  /** Linie, przez które w palisadzie robi się bramę (ścieżki, polne i dojazdowe drogi); reszta linii – omijać. */
  przechodnie: ['path', 'track', 'service', 'pedestrian', 'steps', 'footway', 'cycleway', 'bridleway'],
  /** Odstęp palisady od budynku w środku/obok (m). */
  odBudynkuWielkiM: 6,
  /** Rozrzut promienia (udział). */
  rozrzut: 0.18,
  /** Najmniejszy dopuszczalny promień kierunku (udział promienia) – mniej = za ciasno, mniejszy rozmiar. */
  minUdzial: 0.72,
  /** Szerokość bramy (m) i odstęp pali (m). Pal w px mapy liczy się względem bohatera (rysunki.ts). */
  bramaM: 8.5,
  palCoM: 1.05,
  /** Ścieżka od bramy do najbliższej drogi, jeśli jest bliżej niż tyle (m). */
  sciezkaDoDrogiM: 90,
  /** Grubość kolizji palisady (px mapy, od osi). */
  grubosc: 1.6,
};

/** Kto mieszka w siedlisku danego typu – wyłącznie istniejące wpisy bestiariusza (ENEMY_KINDS / STWORY). */
export const MIESZKANCY_SIEDLISK: Record<TypSiedliska, { czlonkowie: [RodzajWroga, number][]; szef: RodzajWroga; obstawa: RodzajWroga; ileObstawy: number; trudnosc: number }> = {
  // Brief: na test bandyci i herszt (gobliny dojdą, gdy pojawią się w bestiariuszu).
  oboz: { czlonkowie: [['bandyta', 1]], szef: 'herszt', obstawa: 'bandyta', ileObstawy: 2, trudnosc: 2 },
  // Golemów i trolli jeszcze nie ma w bestiariuszu – na razie wargi, wilki i szkielety, a w środku Mosiężny Kozioł.
  rumowisko: { czlonkowie: [['warg', 0.45], ['wilk', 0.35], ['szkielet', 0.2]], szef: 'koziol', obstawa: 'warg', ileObstawy: 2, trudnosc: 3 },
  // Bagno: topielce (zombie), driady, wodne bańki, a w sercu wodnik przywołujący bańki.
  bagno: { czlonkowie: [['zombie', 0.45], ['driada', 0.3], ['blob', 0.25]], szef: 'wodnik', obstawa: 'zombie', ileObstawy: 2, trudnosc: 3 },
};

/** Udział typów wśród siedlisk (gdy teren pozwala na kilka): obóz najczęściej. */
export const TYPY_SIEDLISK: [TypSiedliska, number][] = [['oboz', 0.5], ['rumowisko', 0.3], ['bagno', 0.2]];

/** Rumowisko skalne (etap 3): skały różnej wielkości w skupiskach, kamienne przesmyki i otwarte place do walki. */
export const RUMOWISKO = {
  promienM: [32, 70] as [number, number],
  wierzcholki: 28,
  /** Skupiska głazów i ile głazów w skupisku. */
  skupiska: [9, 16] as [number, number],
  wSkupisku: [6, 13] as [number, number],
  /** Promień głazu (m): mały kamień … wielka skała; najwięcej średnich. */
  glaz: [1.2, 7] as [number, number],
  /** Murki (linie głazów z przerwami – przesmyki) i ile przerw. */
  murki: [2, 4] as [number, number],
  /** Udział drzew, które zostają w środku. */
  drzewa: 0.3,
  czlonkowie: [6, 12] as [number, number],
  jaskinia: 0.45,
};

/** Bagno (etap 4): błoto spowalnia, płycizna spowalnia mocniej, głęboka woda blokuje; suche wysepki i martwe drzewa. */
export const BAGNO = {
  promienM: [34, 75] as [number, number],
  wierzcholki: 30,
  /** Głębokie oczka (blokują), płycizny (brodzenie) i plamy błota. */
  oczka: [5, 9] as [number, number],
  plycizny: [8, 14] as [number, number],
  bloto: [10, 18] as [number, number],
  /** Suche wysepki z trawą (tam stoją potwory i martwe drzewa). */
  wyspy: [4, 8] as [number, number],
  martweDrzewa: [10, 22] as [number, number],
  czlonkowie: [6, 11] as [number, number],
  /** Mnożniki prędkości bohatera (podłoże CityMap.surfaceAt → content/podloze.ts). */
  predkoscBloto: 0.55,
  predkoscBrod: 0.4,
};

export const ODNOWIENIE_SIEDLISK = {
  /** Zwykli mieszkańcy: sekundy AKTYWNEJ gry od wybicia wszystkich (jak łowiska, ale wolniej). */
  zwykliS: 180,
  /** Szef: minuty czasu rzeczywistego od pokonania – zapisywane w `session.daily` (przeżywa logowanie). */
  szefMin: 360,
};

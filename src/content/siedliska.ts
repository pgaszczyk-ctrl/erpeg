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

export type TypSiedliska = 'oboz';
export type RozmiarSiedliska = 'maly' | 'sredni' | 'duzy';

/**
 * Wersja generatora siedlisk: wchodzi do ziarna i do id, więc zmiana reguł daje nowe (ale znowu stałe) układy,
 * a stare zapisy (np. pokonany szef) po prostu przestają pasować – nic się nie psuje.
 */
export const WERSJA_SIEDLISK = 1;

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
  wieza: number;
  rekwizyty: [number, number];
  /** Zwykli mieszkańcy obozu (oprócz szefa i obstawy). */
  czlonkowie: [number, number];
}

export const OBOZ = {
  /** Szansa, że komórka łowisk (LOWISKA_EPI.komorkaKm) dostanie obóz zamiast łowiska (gdy znajdzie się miejsce). */
  szansa: 0.3,
  /** Kolejność prób rozmiarów: najpierw wylosowany, potem coraz mniejsze. */
  rozmiary: {
    duzy: { promienM: 34, namioty: [5, 6], bramy: [1, 2], wieza: 0.7, rekwizyty: [6, 9], czlonkowie: [7, 9] },
    sredni: { promienM: 27, namioty: [3, 5], bramy: [1, 2], wieza: 0.35, rekwizyty: [4, 6], czlonkowie: [5, 7] },
    maly: { promienM: 20, namioty: [2, 3], bramy: [1, 1], wieza: 0, rekwizyty: [3, 4], czlonkowie: [3, 4] },
  } as Record<RozmiarSiedliska, ParametryRozmiaru>,
  wagiRozmiaru: [['duzy', 0.3], ['sredni', 0.45], ['maly', 0.25]] as [RozmiarSiedliska, number][],
  /** Wierzchołki obrysu i rozrzut promienia (udział). */
  wierzcholki: 20,
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
};

export const ODNOWIENIE_SIEDLISK = {
  /** Zwykli mieszkańcy: sekundy AKTYWNEJ gry od wybicia wszystkich (jak łowiska, ale wolniej). */
  zwykliS: 180,
  /** Szef: minuty czasu rzeczywistego od pokonania – zapisywane w `session.daily` (przeżywa logowanie). */
  szefMin: 360,
};

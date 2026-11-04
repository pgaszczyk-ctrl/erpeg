// ============================================================================
//  RODZAJE ATAKÓW W WALCE TUROWEJ (nowe sterowanie, serwer testowy)
//  Właściciel 19.10.2026: „rodzaje ataków będziemy mogli dodawać po osiągnięciu
//  odpowiednich kryteriów, np. sweep, co bije kilku naraz, albo u maga wachlarz ognia”.
//  Kółko przy wrogu pokazuje tylko odblokowane ataki broni w ręce (właściciel:
//  „szarych nie może być”); przy więcej niż 4 – po 3 na stronę + „Więcej”. Nowy atak = nowy wpis tutaj
//  (+ ewentualnie ikonka w ui/walkaKolo.ts). Liczby to próba do strojenia.
// ============================================================================

import type { Umiejetnosc } from './przedmioty';

/** Czym się bije: wręcz (miecz, kij, siekiera), łuk/kusza/pistolet, magia (różdżka). */
export type BronAtaku = 'wrecz' | 'luk' | 'magia';

/**
 * Kogo trafia:
 * - `jeden` – tylko wybrany cel;
 * - `zamach` – cel i każdy inny wróg w zasięgu ciosu po tej samej stronie (łuk `katStopnie` wokół kierunku na cel);
 * - `stozek` – wszyscy w stożku `katStopnie` od bohatera w stronę celu, do `zasiegW` (albo do celu, jeśli dalej);
 * - `salwa` – cel i do `ileCelow − 1` najbliższych mu wrogów w promieniu `zasiegW` od niego, po pocisku na każdego.
 */
export type ObszarAtaku = 'jeden' | 'zamach' | 'stozek' | 'salwa';

export interface WymogAtaku {
  /** Poziom umiejętności (miecz / łuk / magia). */
  umiejetnosc?: { u: Umiejetnosc; poziom: number };
  /** Poziom postaci. */
  poziomPostaci?: number;
  /** Trzeba umieć czarować (biblioteka). */
  magia?: boolean;
}

export interface RodzajAtaku {
  id: string;
  nazwa: string;
  bron: BronAtaku;
  /** Ruchy (podejście liczy się osobno). */
  koszt: number;
  /** Mnożnik obrażeń względem zwykłego ciosu/strzału tą bronią. */
  mnoznik: number;
  /** Mocny = pewne trafienie mieczem i ogłuszenie (jak dotychczasowy mocny cios). */
  mocny?: boolean;
  obszar: ObszarAtaku;
  katStopnie?: number;
  zasiegW?: number;
  ileCelow?: number;
  wymaga?: WymogAtaku;
  /** Jedno zdanie do podpowiedzi. */
  opis: string;
}

export const ATAKI: RodzajAtaku[] = [
  { id: 'cios', nazwa: 'Atak', bron: 'wrecz', koszt: 1, mnoznik: 1, obszar: 'jeden', opis: 'Zwykły atak.' },
  { id: 'mocny', nazwa: 'Mocny atak', bron: 'wrecz', koszt: 2, mnoznik: 1, mocny: true, obszar: 'jeden', opis: 'Zawsze trafia i ogłusza na turę.' },
  {
    id: 'zamach', nazwa: 'Zamach', bron: 'wrecz', koszt: 2, mnoznik: 0.7, obszar: 'zamach', katStopnie: 140,
    wymaga: { umiejetnosc: { u: 'miecz', poziom: 5 } }, opis: 'Szeroki zamach – trafia wszystkich wrogów obok celu.',
  },
  { id: 'strzal', nazwa: 'Strzał', bron: 'luk', koszt: 1, mnoznik: 1, obszar: 'jeden', opis: 'Zwykły strzał.' },
  {
    id: 'salwa', nazwa: 'Salwa', bron: 'luk', koszt: 2, mnoznik: 0.7, obszar: 'salwa', ileCelow: 3, zasiegW: 2.5,
    wymaga: { umiejetnosc: { u: 'luk', poziom: 3 } }, opis: 'Trzy pociski naraz – w cel i dwóch wrogów obok niego.',
  },
  { id: 'czar', nazwa: 'Czar', bron: 'magia', koszt: 1, mnoznik: 1, obszar: 'jeden', opis: 'Zwykły czar.' },
  {
    id: 'wachlarz', nazwa: 'Wachlarz ognia', bron: 'magia', koszt: 2, mnoznik: 0.8, obszar: 'stozek', katStopnie: 60, zasiegW: 4,
    wymaga: { magia: true, umiejetnosc: { u: 'magia', poziom: 3 } }, opis: 'Płomienie w stożku – parzą wszystkich na drodze.',
  },
];

const UMIEJETNOSC: Record<Umiejetnosc, string> = { miecz: 'krzepy', luk: 'celności', magia: 'skupienia' };

/** „Odblokujesz przy krzepie 5” – what's still missing, for the hint. */
export function brakujeDoAtaku(w: WymogAtaku | undefined, stan: { poziomPostaci: number; magia: boolean; umiejetnosc(u: Umiejetnosc): number }): string | null {
  if (!w) return null;
  const braki: string[] = [];
  if (w.magia && !stan.magia) braki.push('naukę magii w bibliotece');
  if (w.umiejetnosc && stan.umiejetnosc(w.umiejetnosc.u) < w.umiejetnosc.poziom) braki.push(`${UMIEJETNOSC[w.umiejetnosc.u]}: ${w.umiejetnosc.poziom}`);
  if (w.poziomPostaci && stan.poziomPostaci < w.poziomPostaci) braki.push(`poziom postaci ${w.poziomPostaci}`);
  return braki.length ? braki.join(' i ') : null;
}

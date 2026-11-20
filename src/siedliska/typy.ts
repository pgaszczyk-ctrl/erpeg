// Dane jednego siedliska (współrzędne w px mapy). Planer: plan.ts; kolizje: kolizje.ts;
// podłoże w Web Workerze: ziemia.ts; obiekty świata: Widok.ts.
import type { RodzajWroga } from '../content/fabula';
import type { RozmiarSiedliska, TypSiedliska } from '../content/siedliska';

export interface Brama {
  /** Środek przejścia na obrysie. */
  x: number;
  y: number;
  /** Normalna na zewnątrz. */
  nx: number;
  ny: number;
  /** Szerokość przejścia (px mapy). */
  szer: number;
}

export interface Pal {
  x: number;
  y: number;
  /** Numer odcinka palisady (do grupowania w obiekty świata) i ziarno wyglądu. */
  odc: number;
  seed: number;
  /** Słup bramy (grubszy, wyższy, z latarnią). */
  brama?: boolean;
}

export interface Namiot {
  /** Środek podstawy, wymiary podstawy (px mapy): w = wschód–zachód, d = północ–południe. */
  x: number;
  y: number;
  w: number;
  d: number;
  szef?: boolean;
  wariant: number;
}

export type RodzajRekwizytu = 'skrzynia' | 'beczka' | 'drewno';

export interface Rekwizyt { x: number; y: number; rodzaj: RodzajRekwizytu; seed: number }

export interface Spawn { x: number; y: number; rola: 'czlonek' | 'szef' | 'obstawa' }

export interface Siedlisko {
  id: string;
  typ: TypSiedliska;
  wersja: number;
  seed: number;
  rozmiar: RozmiarSiedliska;
  /** Środek (px mapy). */
  x: number;
  y: number;
  /** Obrys palisady (pary x, y; zamknięty bez powtórzenia). */
  obrys: number[];
  /** Ramka obrysu z zapasem na ścieżkę i cienie. */
  ramka: { x0: number; y0: number; x1: number; y1: number };
  bramy: Brama[];
  pale: Pal[];
  /** Odcinki kolizji palisady (ax, ay, bx, by po kolei), bez przejść w bramach. */
  sciany: number[];
  namioty: Namiot[];
  ognisko: { x: number; y: number };
  wieze: { x: number; y: number }[];
  rekwizyty: Rekwizyt[];
  /** Wydeptane ścieżki (linie łamane, szerokość px mapy): w środku i od bramy do najbliższej drogi. */
  sciezki: { pts: number[]; w: number }[];
  spawny: Spawn[];
  stwory: { czlonkowie: RodzajWroga[]; szef: RodzajWroga; obstawa: RodzajWroga; ileObstawy: number };
  trudnosc: number;
}

/** Pytania planera o teren – w grze odpowiada CityMap, w testach sztuczna mapa. */
export interface TerenSiedliska {
  /** Rodzaje obszarów OSM w punkcie. */
  rodzaje(x: number, y: number): string[];
  /** Punkt zablokowany (budynek, woda, niewczytana mapa…). */
  zablokowane(x: number, y: number): boolean;
  /** Budynek bliżej niż r. */
  budynek(x: number, y: number, r: number): boolean;
  /** Jakakolwiek linia (droga, ścieżka, tor, rzeka) bliżej niż r od osi + jej połowa szerokości. */
  linia(x: number, y: number, r: number): boolean;
  /** Linia 'major' bliżej niż r. */
  glowna(x: number, y: number, r: number): boolean;
  /** Najbliższy punkt drogi/ścieżki do r (do wydeptanej ścieżki od bramy). */
  droga(x: number, y: number, r: number): { x: number; y: number } | null;
}

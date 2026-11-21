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
  /** Brama na prawdziwej ścieżce przecinającej palisadę (wielkie obozy) – bez własnej wydeptanej ścieżki do ogniska. */
  sciezka?: boolean;
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

/** Rekwizyty: zapasy, siedziska przy ognisku i łupy (ukradzione zwoje miedzi, mosiężne rury, skrzynie z trybikami). */
export type RodzajRekwizytu = 'skrzynia' | 'beczka' | 'drewno' | 'pienek' | 'zwoje' | 'rury' | 'lup';

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
  /** Wszystkie ogniska (pierwsze = `ognisko`); wielkie obozy mają kilka „osiedli” namiotów, każde przy swoim. */
  ogniska: { x: number; y: number }[];
  /** Co wisi nad każdym ogniskiem (ta sama kolejność): gar z gulaszem, rożen z pieczenią albo nic. */
  nadOgniem?: ('gar' | 'rozen' | null)[];
  /**
   * Wielkie obozy: wydeptane placki (x, y, r po kolei) – klepisko tylko pod namiotami, przy ogniskach, wieżach i
   * wzdłuż palisady; między nimi zostaje trawa i część drzew. Brak = całe wnętrze to klepisko (małe obozy).
   */
  placki?: number[];
  wieze: { x: number; y: number }[];
  rekwizyty: Rekwizyt[];
  /** Wydeptane ścieżki (linie łamane, szerokość px mapy): w środku i od bramy do najbliższej drogi. */
  sciezki: { pts: number[]; w: number }[];
  spawny: Spawn[];
  stwory: { czlonkowie: RodzajWroga[]; berserk: boolean[]; moc: number; szef: RodzajWroga; obstawa: RodzajWroga; ileObstawy: number };
  /** Rumowisko: głazy (promień r px mapy – kolizja i wysokość obrazu). */
  glazy?: { x: number; y: number; r: number; seed: number }[];
  /** Bagno: martwe drzewa (pień blokuje). */
  martwe?: { x: number; y: number; seed: number }[];
  /** Bagno: woda – elipsy [x, y, rx, ry] głębokich oczek (blokują) i płycizn (bród), plamy błota, suche wyspy. */
  oczka?: number[];
  plycizny?: number[];
  bloto?: number[];
  wyspy?: number[];
  /** Rumowisko: plamy skalnego podłoża wokół skupisk głazów (reszta terenu zostaje). */
  skaly?: number[];
  /** Rodzaj podłoża całego obrysu (gdy nie klepisko): 'mokradlo' (bagno), 'brak' = teren zostaje (rumowisko). */
  podstawa?: string;
  /** Udział drzew, które zostają w obrysie (rumowisko). */
  drzewa?: number;
  /** Zejście do jaskini (src/loch, rodzaj 'jaskinia'), gdy obóz ją ma. */
  jaskinia: { x: number; y: number } | null;
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
  /** Linia, przez którą nie robimy bramy (droga dla aut, tor, rzeka – OBOZ.przechodnie to te, przez które tak), bliżej niż r. */
  liniaTwarda(x: number, y: number, r: number): boolean;
  /** Miejsca, gdzie przechodnie linie (ścieżki, polne drogi) przecinają obrys, z szerokością linii. */
  przeciecia(obrys: number[]): { x: number; y: number; szer: number }[];
  /** Budynki (ramki) w prostokącie. */
  budynki(x0: number, y0: number, x1: number, y1: number): { x0: number; y0: number; x1: number; y1: number }[];
  /** Linia 'major' bliżej niż r. */
  glowna(x: number, y: number, r: number): boolean;
  /** Najbliższy punkt drogi/ścieżki do r (do wydeptanej ścieżki od bramy). */
  droga(x: number, y: number, r: number): { x: number; y: number } | null;
}

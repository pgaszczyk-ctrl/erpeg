import { ziemia, type Zlecenie } from './ziemia09';

// Maluje ziemię, budynki i pnie kawałka mapy w tle (overhaul 09), żeby gra się nie przycinała; odsyła też drzewa (korony stawia gra).
self.onmessage = (e: MessageEvent<Zlecenie & { nr: number }>) => {
  const { px, drzewa, para } = ziemia(e.data);
  (self as unknown as Worker).postMessage({ nr: e.data.nr, px, drzewa, para }, [px.buffer]);
};

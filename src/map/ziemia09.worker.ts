import { ziemia, type Zlecenie } from './ziemia09';

// Maluje ziemię i budynki kawałka mapy w tle (overhaul 09), żeby gra się nie przycinała.
self.onmessage = (e: MessageEvent<Zlecenie & { nr: number }>) => {
  const px = ziemia(e.data);
  (self as unknown as Worker).postMessage({ nr: e.data.nr, px }, [px.buffer]);
};

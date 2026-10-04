import { ziemia } from './ziemia09';

// Maluje ziemię kawałka mapy w tle (overhaul 09), żeby gra się nie przycinała.
self.onmessage = (e: MessageEvent<{ nr: number; ids: Uint8Array; S: number; X0: number; Y0: number; N: number }>) => {
  const { nr, ids, S, X0, Y0, N } = e.data;
  const px = ziemia(ids, S, X0, Y0, N);
  (self as unknown as Worker).postMessage({ nr, px }, [px.buffer]);
};

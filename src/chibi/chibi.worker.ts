import { renderuj } from './rysownik';

// Liczy klatki ludzika-chibi w tle (ok. 50 ms każda), żeby gra się nie przycinała.
self.onmessage = (e: MessageEvent<{ id: number; o: unknown; yaw: number; faza: number; H: number }>) => {
  const { id, o, yaw, faza, H } = e.data;
  const r = renderuj(o, yaw, faza, H) as { w: number; h: number; ox: number; oy: number; px: Uint8ClampedArray };
  (self as unknown as Worker).postMessage({ id, w: r.w, h: r.h, ox: r.ox, oy: r.oy, px: r.px.buffer }, [r.px.buffer]);
};

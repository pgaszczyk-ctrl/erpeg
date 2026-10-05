import { ziemia, ustawRysunkiUpraw, type Zlecenie } from './ziemia09';
import type { Sprite } from '../gen';
import { rysujPojazd, cienPojazdu, lokomotywa, tender, wagonOsobowy, type Model } from '../gen';

// Maluje ziemię, budynki i pnie kawałka mapy w tle (overhaul 09), żeby gra się nie przycinała; odsyła też drzewa
// (korony stawia gra) i miejsca pary. Liczy też klatki pojazdów kolejowych z modelu 3D (ok. 0,5–1 s każda).
const MODELE: Record<string, Model> = { lokomotywa, tender, wagon_bordo: wagonOsobowy('kabina_b'), wagon_zielony: wagonOsobowy('kabina') };

self.onmessage = (e: MessageEvent<(Zlecenie & { nr: number }) | { nr: number; pojazd: string; kat: number } | { rysunki: Record<string, Sprite> }>) => {
  const d = e.data;
  if ('rysunki' in d) return ustawRysunkiUpraw(d.rysunki);
  if ('pojazd' in d) {
    const m = MODELE[d.pojazd];
    const o = rysujPojazd(m, d.kat), c = cienPojazdu(m, d.kat);
    (self as unknown as Worker).postMessage({ nr: d.nr, px: o.px, cien: c.px, S: o.w }, [o.px.buffer, c.px.buffer]);
    return;
  }
  const { px, drzewa, para, fale, zbior, wyrzuty } = ziemia(d);
  (self as unknown as Worker).postMessage({ nr: d.nr, px, drzewa, para, fale, zbior, wyrzuty }, [px.buffer]);
};

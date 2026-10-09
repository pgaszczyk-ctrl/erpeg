import { ziemia, ustawRysunkiUpraw, obrazBudynku, type Zlecenie, type Budynek09 } from './ziemia09';
import type { WielkoscMiasta } from '../gen';
import type { Sprite } from '../gen';
import { ustawOzdoby } from '../gen/budynki';
import { rysujPojazd, cienPojazdu, lokomotywa, tender, wagonOsobowy, type Model } from '../gen';

// Maluje ziemię, budynki i pnie kawałka mapy w tle (overhaul 09), żeby gra się nie przycinała; odsyła też drzewa
// (korony stawia gra) i miejsca pary. Liczy też klatki pojazdów kolejowych z modelu 3D (ok. 0,5–1 s każda).
const MODELE: Record<string, Model> = { lokomotywa, tender, wagon_bordo: wagonOsobowy('kabina_b'), wagon_zielony: wagonOsobowy('kabina') };

self.onmessage = (e: MessageEvent<(Zlecenie & { nr: number }) | { nr: number; pojazd: string; kat: number } | { rysunki: Record<string, Sprite>; ozdoby?: Record<string, Sprite> } | { nr: number; budynek: Budynek09; noc: boolean; miasto: WielkoscMiasta }>) => {
  const d = e.data;
  if ('rysunki' in d) {
    if (d.ozdoby) ustawOzdoby(d.ozdoby);
    return ustawRysunkiUpraw(d.rysunki);
  }
  if ('budynek' in d) {
    // Wysoki budynek jako osobny obrazek (gra go sortuje z postaciami i robi w nim prześwit).
    const { obraz, x0, y0, para } = obrazBudynku(d.budynek, d.noc, d.miasto);
    const px = obraz.px.slice();
    (self as unknown as Worker).postMessage({ nr: d.nr, px, S: obraz.w, x0, y0, wyrzuty: para.filter((z) => z.okres), bud: true }, [px.buffer]);
    return;
  }
  if ('pojazd' in d) {
    const m = MODELE[d.pojazd];
    const o = rysujPojazd(m, d.kat), c = cienPojazdu(m, d.kat);
    (self as unknown as Worker).postMessage({ nr: d.nr, px: o.px, cien: c.px, S: o.w }, [o.px.buffer, c.px.buffer]);
    return;
  }
  const start = performance.now();
  const { px, drzewa, para, fale, zbior, wyrzuty } = ziemia(d);
  (self as unknown as Worker).postMessage({ nr: d.nr, px, drzewa, para, fale, zbior, wyrzuty, computeMs: performance.now() - start }, [px.buffer]);
};

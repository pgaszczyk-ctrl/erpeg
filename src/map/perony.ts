import { rownolegla, wycinek } from '../gen';
import { PX_PER_M, type CityMap, type Line, type Place } from './CityMap';

// Perony przy stacjach kolejowych (overhaul 09, SPEC_09 punkt 7). Z danych OSM (railway=platform: obszary i linie
// 'platform', od odświeżenia danych 5.10.2026), a gdzie ich brak – peron dorysowany przez grę: pas płyt wzdłuż
// najbliższego toru, po stronie budynku stacji (albo po drugiej, gdy tam leży inny tor lub budynek).

export const PERON = {
  /** Długość dorysowanego peronu (m). */
  dlugoscM: 70,
  /** Szerokość (m) i odstęp krawędzi od osi toru (m). */
  szerokoscM: 4,
  odToruM: 2.4,
  /** Stacja dalej od toru niż tyle (m) to nie kolej (np. dworzec autobusowy). */
  maksOdToruM: 60,
  /** Gdy w promieniu tylu metrów jest peron z OSM, nie dorysowujemy. */
  osmBliskoM: 50,
};

const gotowe = new WeakMap<CityMap, Map<string, number[] | null>>();

/** Perony dorysowane przy stacjach w okolicy prostokąta (px mapy); liczone raz na stację, gdy okolica jest wczytana. */
export function peronyZastepcze(m: CityMap, box: { x0: number; y0: number; x1: number; y1: number }): number[][] {
  let pam = gotowe.get(m);
  if (!pam) gotowe.set(m, (pam = new Map()));
  const out: number[][] = [];
  const zasieg = PERON.dlugoscM * PX_PER_M;
  for (const p of m.places) {
    if (p.kind !== 'station' || p.door.x < box.x0 - zasieg || p.door.x > box.x1 + zasieg || p.door.y < box.y0 - zasieg || p.door.y > box.y1 + zasieg) continue;
    let r = pam.get(p.id);
    if (r === undefined) {
      const okolica = { x0: p.door.x - 2 * zasieg, y0: p.door.y - 2 * zasieg, x1: p.door.x + 2 * zasieg, y1: p.door.y + 2 * zasieg };
      if (!m.ready(okolica)) continue;
      r = peronStacji(m, p, okolica);
      pam.set(p.id, r);
    }
    if (r) out.push(r);
  }
  return out;
}

function peronStacji(m: CityMap, p: Place, okolica: { x0: number; y0: number; x1: number; y1: number }): number[] | null {
  const { areas, lines } = m.query(okolica);
  const osm = PERON.osmBliskoM * PX_PER_M;
  const blisko = (x0: number, y0: number, x1: number, y1: number) => x1 >= p.door.x - osm && x0 <= p.door.x + osm && y1 >= p.door.y - osm && y0 <= p.door.y + osm;
  if (areas.some((a) => a.kind === 'platform' && blisko(a.x0, a.y0, a.x1, a.y1)) || lines.some((l) => l.kind === 'platform' && blisko(l.x0, l.y0, l.x1, l.y1))) return null;
  const tory = lines.filter((l) => l.kind === 'rail');
  // Najbliższy punkt toru (odległość, linia, długość łuku do niego).
  let best: { d: number; l: Line; s: number; x: number; y: number } | null = null;
  for (const l of tory) {
    let s = 0;
    for (let i = 0; i + 3 < l.pts.length; i += 2) {
      const ax = l.pts[i], ay = l.pts[i + 1], dx = l.pts[i + 2] - ax, dy = l.pts[i + 3] - ay, L = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(1, ((p.door.x - ax) * dx + (p.door.y - ay) * dy) / (L * L)));
      const x = ax + dx * t, y = ay + dy * t, d = Math.hypot(x - p.door.x, y - p.door.y);
      if (!best || d < best.d) best = { d, l, s: s + t * L, x, y };
      s += L;
    }
  }
  if (!best || best.d > PERON.maksOdToruM * PX_PER_M) return null;
  const pol = (PERON.dlugoscM * PX_PER_M) / 2;
  const os = wycinek(best.l.pts, Math.max(0, best.s - pol), best.s + pol);
  if (os.length < 4) return null;
  const a = PERON.odToruM * PX_PER_M, b = a + PERON.szerokoscM * PX_PER_M;
  // Strona stacji: znak iloczynu wektorowego (kierunek toru × do drzwi); rownolegla(+d) = po prawej.
  const tx = os[os.length - 2] - os[0], ty = os[os.length - 1] - os[1];
  const prawa = tx * (p.door.y - best.y) - ty * (p.door.x - best.x) > 0 ? 1 : -1;
  const inneTory = tory.filter((l) => l !== best!.l);
  const wolne = (srodek: number[]) => {
    for (let k = 0; k < srodek.length; k += 2) {
      const x = srodek[k], y = srodek[k + 1];
      if (m.buildingAt(x, y)) return false;
      for (const l of inneTory) for (let j = 0; j + 3 < l.pts.length; j += 2) {
        const ax = l.pts[j], ay = l.pts[j + 1], dx = l.pts[j + 2] - ax, dy = l.pts[j + 3] - ay, L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < (b - a) / 2 + a) return false;
      }
    }
    return true;
  };
  for (const strona of [prawa, -prawa]) {
    const srodek = rownolegla(os, (strona * (a + b)) / 2);
    if (!wolne(srodek)) continue;
    const blizej = rownolegla(os, strona * a), dalej = rownolegla(os, strona * b);
    const ring = [...blizej];
    for (let k = dalej.length - 2; k >= 0; k -= 2) ring.push(dalej[k], dalej[k + 1]);
    return ring;
  }
  return null;
}

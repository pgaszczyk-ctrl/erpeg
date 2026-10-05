import { rownolegla, wycinek } from '../gen';
import { PX_PER_M, type CityMap, type Line, type Place } from './CityMap';

// Perony przy stacjach kolejowych (overhaul 09, SPEC_09 punkt 7). Z danych OSM (railway=platform: obszary i linie
// 'platform', od odświeżenia danych 5.10.2026), a gdzie ich brak – peron dorysowany przez grę: pas płyt wzdłuż
// najbliższego toru, po stronie budynku stacji (albo po drugiej, gdy tam leży inny tor lub budynek).

export const PERON = {
  /** Długość dorysowanego peronu (m). */
  dlugoscM: 110,
  /** Szerokość (m) i odstęp krawędzi od osi toru (m). */
  szerokoscM: 7,
  odToruM: 2.4,
  /** Stacja dalej od toru niż tyle (m) to nie kolej (np. dworzec autobusowy). */
  maksOdToruM: 60,
  /** Gdy w promieniu tylu metrów jest peron z OSM, nie dorysowujemy. */
  osmBliskoM: 50,
};

/** Peron w px mapy: obrys, oś, strona toru (+1 = po prawej od kierunku osi), szerokość. */
export interface Peron { ring: number[]; os: number[]; tor: 1 | -1; szer: number }

const gotowe = new WeakMap<CityMap, Map<string, Peron | null>>();

/** Perony dorysowane przy stacjach w okolicy prostokąta (px mapy); liczone raz na stację, gdy okolica jest wczytana. */
export function peronyZastepcze(m: CityMap, box: { x0: number; y0: number; x1: number; y1: number }): Peron[] {
  let pam = gotowe.get(m);
  if (!pam) gotowe.set(m, (pam = new Map()));
  const out: Peron[] = [];
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

function peronStacji(m: CityMap, p: Place, okolica: { x0: number; y0: number; x1: number; y1: number }): Peron | null {
  const { areas, lines } = m.query(okolica);
  const osm = PERON.osmBliskoM * PX_PER_M;
  const blisko = (x0: number, y0: number, x1: number, y1: number) => x1 >= p.door.x - osm && x0 <= p.door.x + osm && y1 >= p.door.y - osm && y0 <= p.door.y + osm;
  if (areas.some((a) => a.kind === 'platform' && blisko(a.x0, a.y0, a.x1, a.y1)) || lines.some((l) => l.kind === 'platform' && blisko(l.x0, l.y0, l.x1, l.y1))) return null;
  const tory = lines.filter((l) => l.kind === 'rail');
  const best = najblizszyTor(tory, p.door.x, p.door.y);
  if (!best || best.d > PERON.maksOdToruM * PX_PER_M) return null;
  const a = PERON.odToruM * PX_PER_M;
  const inneTory = tory.filter((l) => l !== best!.l);
  const wolne = (srodek: number[], pol: number) => {
    // Próbki co ~4 px wzdłuż osi (długie proste odcinki mają tylko dwa wierzchołki).
    const pr: number[] = [];
    for (let k = 0; k + 3 < srodek.length; k += 2) {
      const n = Math.max(1, Math.ceil(Math.hypot(srodek[k + 2] - srodek[k], srodek[k + 3] - srodek[k + 1]) / 4));
      for (let q = 0; q < n; q++) pr.push(srodek[k] + ((srodek[k + 2] - srodek[k]) * q) / n, srodek[k + 1] + ((srodek[k + 3] - srodek[k + 1]) * q) / n);
    }
    for (let k = 0; k < pr.length; k += 2) {
      const x = pr[k], y = pr[k + 1];
      if (m.buildingAt(x, y)) return false;
      for (const l of inneTory) for (let j = 0; j + 3 < l.pts.length; j += 2) {
        const ax = l.pts[j], ay = l.pts[j + 1], dx = l.pts[j + 2] - ax, dy = l.pts[j + 3] - ay, L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < pol + a) return false;
      }
    }
    return true;
  };
  // Najpierw pełna długość i szerokość po stronie stacji, potem po drugiej; między gęstymi torami
  // i przy zwrotnicach krótszy i węższy peron.
  for (const dl of [PERON.dlugoscM, 75, 45]) {
    const pol = (dl * PX_PER_M) / 2;
    const os = wycinek(best.l.pts, Math.max(0, best.s - pol), best.s + pol);
    if (os.length < 4) return null;
    // Strona stacji: znak iloczynu wektorowego (kierunek toru × do drzwi); rownolegla(+d) = po prawej.
    const tx = os[os.length - 2] - os[0], ty = os[os.length - 1] - os[1];
    const prawa = tx * (p.door.y - best.y) - ty * (p.door.x - best.x) > 0 ? 1 : -1;
    for (const szer of [PERON.szerokoscM, 5.5, 4])
    for (const strona of [prawa, -prawa]) {
      const b = a + szer * PX_PER_M;
      const srodek = rownolegla(os, (strona * (a + b)) / 2);
      if (!wolne(srodek, (b - a) / 2)) continue;
      const blizej = rownolegla(os, strona * a), dalej = rownolegla(os, strona * b);
      const ring = [...blizej];
      for (let k = dalej.length - 2; k >= 0; k -= 2) ring.push(dalej[k], dalej[k + 1]);
      // Oś peronu i strona toru: tor leży po stronie przeciwnej do przesunięcia.
      return { ring, os: srodek, tor: (strona > 0 ? -1 : 1) as 1 | -1, szer: b - a };
    }
  }
  return null;
}

/**
 * Wszystkie perony w okolicy prostokąta: z OSM (linie – oś, obszary – oś z kierunku największego rozrzutu)
 * i dorysowane. Strona toru z najbliższego toru przy środku peronu.
 */
export function peronyWOkolicy(m: CityMap, box: { x0: number; y0: number; x1: number; y1: number }): Peron[] {
  const out = peronyZastepcze(m, box);
  const { areas, lines } = m.query(box);
  const tory = lines.filter((l) => l.kind === 'rail' || l.kind === 'tram');
  const stronaToru = (os: number[]): 1 | -1 => {
    const n = os.length / 2, cx = (os[0] + os[os.length - 2]) / 2, cy = (os[1] + os[os.length - 1]) / 2;
    let bd = Infinity, bx = cx, by = cy;
    for (const l of tory) for (let j = 0; j + 3 < l.pts.length; j += 2) {
      const ax = l.pts[j], ay = l.pts[j + 1], dx = l.pts[j + 2] - ax, dy = l.pts[j + 3] - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / L2));
      const d = Math.hypot(ax + dx * t - cx, ay + dy * t - cy);
      if (d < bd) { bd = d; bx = ax + dx * t; by = ay + dy * t; }
    }
    const tx = os[2 * (n - 1)] - os[0], ty = os[2 * (n - 1) + 1] - os[1];
    // rownolegla(+d) leży po prawej: (−ty, tx) w układzie ekranu.
    return (bx - cx) * -ty + (by - cy) * tx >= 0 ? 1 : -1;
  };
  for (const l of lines) if (l.kind === 'platform') out.push({ ring: [], os: l.pts, tor: stronaToru(l.pts), szer: l.width });
  for (const a of areas) {
    if (a.kind !== 'platform') continue;
    const r = a.rings[0];
    let cx = 0, cy = 0;
    for (let i = 0; i < r.length; i += 2) { cx += r[i]; cy += r[i + 1]; }
    cx /= r.length / 2; cy /= r.length / 2;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < r.length; i += 2) { const x = r[i] - cx, y = r[i + 1] - cy; sxx += x * x; syy += y * y; sxy += x * y; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang);
    let t0 = Infinity, t1 = -Infinity, w0 = Infinity, w1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) { const x = r[i] - cx, y = r[i + 1] - cy, t = x * ux + y * uy, w = -x * uy + y * ux; t0 = Math.min(t0, t); t1 = Math.max(t1, t); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
    const wm = (w0 + w1) / 2;
    const os = [cx + t0 * ux - wm * uy, cy + t0 * uy + wm * ux, cx + t1 * ux - wm * uy, cy + t1 * uy + wm * ux];
    out.push({ ring: [], os, tor: stronaToru(os), szer: w1 - w0 });
  }
  return out;
}

/** Najbliższy punkt torów do (x, y): linia, odległość, długość łuku do niego, sam punkt. */
export function najblizszyTor(tory: Line[], px: number, py: number) {
  let best: { d: number; l: Line; s: number; x: number; y: number } | null = null;
  for (const l of tory) {
    let s = 0;
    for (let i = 0; i + 3 < l.pts.length; i += 2) {
      const ax = l.pts[i], ay = l.pts[i + 1], dx = l.pts[i + 2] - ax, dy = l.pts[i + 3] - ay, L = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (L * L)));
      const x = ax + dx * t, y = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (!best || d < best.d) best = { d, l, s: s + t * L, x, y };
      s += L;
    }
  }
  return best;
}

/**
 * Tor stacji kolejowej (najbliższy drzwiom, najwyżej PERON.maksOdToruM), gdy okolica jest wczytana:
 * undefined = jeszcze nie wiadomo (kafelki się wczytują), null = to nie kolej (np. dworzec autobusowy).
 */
export function torStacji(m: CityMap, p: Place) {
  const r = 2 * PERON.dlugoscM * PX_PER_M;
  const okolica = { x0: p.door.x - r, y0: p.door.y - r, x1: p.door.x + r, y1: p.door.y + r };
  if (!m.ready(okolica)) return undefined;
  const best = najblizszyTor(m.query(okolica).lines.filter((l) => l.kind === 'rail'), p.door.x, p.door.y);
  return best && best.d <= PERON.maksOdToruM * PX_PER_M ? best : null;
}

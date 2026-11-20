// Geometria siedlisk: wnętrze obrysu, kolizje konstrukcji (CityMap.isBlocked) i obejście przez bramę
// (potwór w środku obozu idzie do bramy zamiast wbijać się w palisadę). Czyste funkcje, px mapy.
import type { Siedlisko } from './typy';

export function wWielokacie(r: number[], x: number, y: number) {
  let w = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
    if ((r[i + 1] > y) !== (r[j + 1] > y) && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) w = !w;
  return w;
}

export function odlOdcinka(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

export function odlegloscOdObrysu(r: number[], x: number, y: number) {
  let d = Infinity;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) d = Math.min(d, odlOdcinka(x, y, r[j], r[j + 1], r[i], r[i + 1]));
  return d;
}

/** Połowa szerokości kolizji palisady (px mapy) – ustawiana raz z OBOZ.grubosc. */
let GRUBOSC = 1.6;
export const ustawGruboscPalisady = (g: number) => (GRUBOSC = g);

/** Prostokąty kolizji konstrukcji (namioty, nogi wieży, rekwizyty, ognisko) – liczone raz na siedlisko. */
const PUDELKA = new WeakMap<Siedlisko, number[]>();
export function pudelka(s: Siedlisko, M: number) {
  let p = PUDELKA.get(s);
  if (p) return p;
  p = [];
  // Namiot: cała podstawa (płachta do ziemi), lekko węższa, żeby dało się podejść do wejścia.
  for (const n of s.namioty) p.push(n.x - n.w / 2 + 0.5, n.y - n.d / 2 + 0.5, n.x + n.w / 2 - 0.5, n.y + n.d / 2 - 0.5);
  for (const w of s.wieze) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const lx = w.x + dx * 2.6 * M, ly = w.y + dy * 1.8 * M;
    p.push(lx - 0.8, ly - 0.8, lx + 0.8, ly + 0.8);
  }
  for (const q of s.rekwizyty) p.push(q.x - 1.4 * M, q.y - 0.9 * M, q.x + 1.4 * M, q.y + 0.9 * M);
  p.push(s.ognisko.x - 1.8 * M, s.ognisko.y - 1.2 * M, s.ognisko.x + 1.8 * M, s.ognisko.y + 1.2 * M);
  PUDELKA.set(s, p);
  return p;
}

/** Czy (x, y) jest w konstrukcji siedliska (palisada, namiot, wieża, rekwizyt, ognisko). */
export function zablokowaneW(s: Siedlisko, x: number, y: number, M: number) {
  const R = s.ramka;
  if (x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1) return false;
  const w = s.sciany;
  for (let i = 0; i < w.length; i += 4) {
    const ax = w[i], ay = w[i + 1], bx = w[i + 2], by = w[i + 3];
    if (x < Math.min(ax, bx) - GRUBOSC || x > Math.max(ax, bx) + GRUBOSC || y < Math.min(ay, by) - GRUBOSC || y > Math.max(ay, by) + GRUBOSC) continue;
    if (odlOdcinka(x, y, ax, ay, bx, by) <= GRUBOSC) return true;
  }
  for (const p of s.pale) if (p.brama && Math.abs(p.x - x) < 1.4 && Math.abs(p.y - y) < 1.2) return true;
  const b = pudelka(s, M);
  for (let i = 0; i < b.length; i += 4) if (x > b[i] && x < b[i + 2] && y > b[i + 1] && y < b[i + 3]) return true;
  return false;
}

/** Czy odcinek a→b przecina palisadę (którąkolwiek ścianę). */
function przecinaSciane(s: Siedlisko, ax: number, ay: number, bx: number, by: number) {
  const w = s.sciany;
  for (let i = 0; i < w.length; i += 4) {
    const cx = w[i], cy = w[i + 1], dx = w[i + 2], dy = w[i + 3];
    const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return true;
  }
  return false;
}

/**
 * Gdy droga a→b przecina palisadę, punkt pośredni: brama najbliższa `a` – najpierw do punktu po stronie `a`,
 * a stojąc już w bramie, do punktu po drugiej stronie. null = idź prosto.
 */
export function obejscie(lista: readonly Siedlisko[], ax: number, ay: number, bx: number, by: number, M: number): { x: number; y: number } | null {
  for (const s of lista) {
    const R = s.ramka;
    if (Math.max(ax, bx) < R.x0 || Math.min(ax, bx) > R.x1 || Math.max(ay, by) < R.y0 || Math.min(ay, by) > R.y1) continue;
    if (!przecinaSciane(s, ax, ay, bx, by)) continue;
    const wA = wWielokacie(s.obrys, ax, ay);
    let best: { x: number; y: number } | null = null, bd = Infinity;
    for (const g of s.bramy) {
      const strona = wA ? -1 : 1;
      const blisko = Math.hypot(ax - g.x, ay - g.y) < 3 * M;
      const cel = blisko ? { x: g.x - strona * g.nx * 5 * M, y: g.y - strona * g.ny * 5 * M } : { x: g.x + strona * g.nx * 3 * M, y: g.y + strona * g.ny * 3 * M };
      const d = Math.hypot(ax - g.x, ay - g.y) + Math.hypot(bx - g.x, by - g.y);
      if (d < bd) { bd = d; best = cel; }
    }
    return best;
  }
  return null;
}

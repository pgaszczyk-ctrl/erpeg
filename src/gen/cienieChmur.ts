// Cienie chmur przesuwane z wiatrem (jak w makiecie „żywy świat”): jedna tekstura 512×512 bez szwów, generowana raz,
// w grze jako TileSprite z mieszaniem MULTIPLY nad mapą, postaciami i drzewami, pod mgłą wojny i HUD.
// Przesunięcie co klatkę = wiatr z pogody (kierunek i siła), ok. 2–12 px/s; nocą wyłączone; ilość plam z zachmurzenia.
import { Obraz, nowy, hash, rgb } from './wspolne';

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
function szumKafel(x: number, y: number, okres: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const g = (a: number, b: number) => hash(((a % okres) + okres) % okres, ((b % okres) + okres) % okres, s);
  const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Tekstura cieni chmur `rozmiar`×`rozmiar` (domyślnie 512), bez szwów. `zachmurzenie` 0–1 (z pogody `k` %/100):
 * 0 = pojedyncze małe plamy, 1 = prawie cały ekran w cieniu. Dwa stopnie cienia (krawędź z ditheringiem Bayera), kolor chłodny.
 * Wynik mnożyć (MULTIPLY) z obrazem: biel = bez zmian.
 */
export function teksturaChmur(zachmurzenie: number, seed = 1, rozmiar = 512): Obraz {
  const o = nowy(rozmiar, rozmiar), prog = 0.68 - zachmurzenie * 0.3;
  const bez = rgb(255, 255, 255), lekki = rgb(214, 220, 232), pelny = rgb(178, 188, 208);
  for (let y = 0; y < rozmiar; y++) for (let x = 0; x < rozmiar; x++) {
    let n = 0, a = 0.6, f = 4 / rozmiar, w = 0;
    for (let k = 0; k < 4; k++) { const okres = Math.round(rozmiar * f); n += a * szumKafel(x * f, y * f, okres, seed + k); w += a; a *= 0.5; f *= 2; }
    n /= w;
    const b = (BAY[((y & 3) << 2) | (x & 3)] - 0.5) * 0.04;
    o.px[y * rozmiar + x] = n > prog + 0.07 + b ? pelny : n > prog + b ? lekki : bez;
  }
  return o;
}

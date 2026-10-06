// Prześwit za wysokim budynkiem – wariant E (decyzja właściciela 6.10): duże wycięcie, zostaje kontur budynku.
import { Obraz, bayer } from './wspolne';

export const PRZESWIT = {
  promien: 58,      // px obrazu (pionowo); poziomo × rozciag
  rozciag: 1.25,
  brzeg: 10,        // szerokość ditherowanego brzegu
  alfaWnetrza: 0x18, // ~10 %: budynek prawie znika
  alfaKonturu: 0xb0, // ~70 %: widać, gdzie stoi ściana
  srodekNadStopami: 22, // środek elipsy: tyle px nad stopami postaci
};

const OBRYS = 0x241a1e; // #1e1a24 zapisane jako ABGR (bez alfy)

/**
 * Zwraca kopię obrazu budynku z wycięciem wokół postaci.
 * (x0, y0) – położenie obrazu na mapie, (hx, hy) – stopy postaci.
 * Kontur = piksel na brzegu obrazu albo na granicy obrysu (#1e1a24) i reszty.
 * W grze: liczyć tylko, gdy postać stoi za budynkiem (y stóp < linia podstawy budynku i prostokąty się nakładają);
 * w Phaserze to samo da się zrobić maską/shaderem zamiast kopiowania pikseli.
 */
export function przeswitWyciecie(im: Obraz, x0: number, y0: number, hx: number, hy: number, p = PRZESWIT): Obraz {
  const px = im.px.slice(), { w, h } = im, cy = hy - p.srodekNadStopami;
  const pelny = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && (im.px[j * w + i] >>> 24) !== 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; const c = im.px[k]; if (!(c >>> 24)) continue;
    const d = Math.hypot((x0 + i - hx) / p.rozciag, y0 + j - cy);
    if (!(d < p.promien || (d < p.promien + p.brzeg && bayer(x0 + i, y0 + j) < (p.promien + p.brzeg - d) / p.brzeg))) continue;
    const ob = (c & 0xffffff) === OBRYS;
    const kontur = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !pelny(i + a, j + b) || ((im.px[(j + b) * w + i + a] & 0xffffff) === OBRYS) !== ob);
    px[k] = ((c & 0x00ffffff) | ((kontur ? p.alfaKonturu : p.alfaWnetrza) << 24)) >>> 0;
  }
  return { w, h, px };
}

// SZKIC (SPEC 3.2 „Prześwit”) – niesprawdzony w grze.
// Tekstura maski: koło o postrzępionej krawędzi z macierzy Bayera 4×4. Biel = widoczne, przezroczyste = dziura.
// Używać z odwróceniem: sprite.filters.internal.addMask(klucz, true, kamera, 'world') tylko na koronach,
// które w tej chwili zasłaniają postać; przesuwać razem z postacią; zdejmować, gdy wyjdzie.
import Phaser from 'phaser';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function maskaPrzeswitu(scene: Phaser.Scene, promienPx: number, pas = 5) {
  const key = `przeswit-${promienPx}`;
  if (scene.textures.exists(key)) return key;
  const S = promienPx * 2 + 2;
  const c = scene.textures.createCanvas(key, S, S)!;
  const g = c.getContext();
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x + 0.5 - S / 2, (y + 0.5 - S / 2) * 1.05);
    let dziura = d < promienPx - pas;
    if (!dziura && d < promienPx) dziura = BAYER[((y & 3) << 2) | (x & 3)] < (promienPx - d) / pas;
    const o = (y * S + x) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = dziura ? 255 : 0; // maska odwrócona: tu, gdzie 255, korona znika
  }
  g.putImageData(img, 0, 0);
  c.refresh();
  c.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
// Uwaga: krawędź z Bayera powinna leżeć w siatce ŚWIATA (nie ekranu), inaczej „pływa” przy ruchu.
// Najprościej: pozycję maski zaokrąglać do wielokrotności 4 px pliku (2 px mapy).

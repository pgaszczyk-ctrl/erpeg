// SZKIC (wariant A ze SPEC 3.2) – niesprawdzony w grze, do dopasowania do art.ts / sprites.ts.
// Z jednej tekstury korony robi 5 klatek „ścięcia” na wietrze: każdy wiersz pikseli
// przesunięty o całe piksele, u góry najbardziej, u dołu prawie wcale. Pixel art zostaje ostry.
import Phaser from 'phaser';

export const KLATKI_WIATRU = [-2, -1, 0, 1, 2]; // k: wychylenie w lewo … w prawo

/** Dodaje do menedżera tekstur `<klucz>-w` z klatkami 'w-2' … 'w2' (szerokość płótna + 2×margines). */
export function klatkiWiatru(scene: Phaser.Scene, klucz: string, sztywnosc: number, margines = 6) {
  const src = scene.textures.get(klucz).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width, h = src.height, W = w + 2 * margines;
  const c = document.createElement('canvas');
  c.width = W * KLATKI_WIATRU.length;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  // dół korony = ostatni niepusty wiersz; rf liczony od niego do góry
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
  const tg = tmp.getContext('2d')!; tg.drawImage(src, 0, 0);
  const a = tg.getImageData(0, 0, w, h).data;
  let top = h, bot = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3]) { top = Math.min(top, y); bot = Math.max(bot, y); }
  KLATKI_WIATRU.forEach((k, i) => {
    for (let y = 0; y < h; y++) {
      const rf = Math.max(0, Math.min(1, (bot - y) / Math.max(1, bot - top)));
      const dx = Math.round(k * sztywnosc * (0.3 + 0.95 * rf));
      g.drawImage(src, 0, y, w, 1, i * W + margines + dx, y, w, 1);
    }
  });
  const key = `${klucz}-w`;
  const tex = scene.textures.addCanvas(key, c)!;
  KLATKI_WIATRU.forEach((k, i) => tex.add(`w${k}`, 0, i * W, 0, W, h));
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Wybór klatki dla drzewa co klatkę gry (windAt jak w dane/wiatr.json, w px pliku). */
export function klatkaDlaDrzewa(wiatr: number, sztywnosc: number, rustle: number, t: number, seed: number) {
  let k = (wiatr * sztywnosc) / 1.2;
  if (rustle > 0.02) k += Math.sin(t * 26 + seed) * rustle * 1.4;
  return `w${Math.max(-2, Math.min(2, Math.round(k)))}`;
}

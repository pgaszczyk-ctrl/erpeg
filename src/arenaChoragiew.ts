// The Arena's banner (artist 38-G002: a grey cloth + its mask) tinted with a country's flag:
// used in the arena itself and on the stadiums out in the world, so the place is easy to recognise.

import Phaser from 'phaser';
import { FLAGI, FLAGA_NIEZNANA, KOLORY_FLAG } from './content/flagi';
import { ARENA_RYSUNEK } from './content/arena';

/** Loads the two banner pictures and the notice board once (the world's stadiums; the arena scene loads them in preload). */
export function wczytajChoragiew(scene: Phaser.Scene) {
  const t = scene.textures;
  if (t.exists('arena-choragiew') && t.exists('arena-choragiew-maska') && t.exists('arena-tablica')) return true;
  if (wczytuje) return false;
  wczytuje = true;
  const base = import.meta.env.BASE_URL;
  if (!t.exists('arena-choragiew')) scene.load.image('arena-choragiew', `${base}${ARENA_RYSUNEK.choragiew}`);
  if (!t.exists('arena-choragiew-maska')) scene.load.image('arena-choragiew-maska', `${base}${ARENA_RYSUNEK.choragiewMaska}`);
  if (!t.exists('arena-tablica')) scene.load.image('arena-tablica', `${base}swiat/ozdoby/plac_gablota_ogloszen.png`);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => { wczytuje = false; });
  scene.load.start();
  return false;
}
let wczytuje = false;

/** The artist's grey banner with its cloth tinted by the country's flag (stripes top to bottom, shading kept). */
export function choragiewKraju(scene: Phaser.Scene, kraj: string | null): string | null {
  if (!scene.textures.exists('arena-choragiew') || !scene.textures.exists('arena-choragiew-maska')) return null;
  const key = `arena-choragiew:${kraj ?? '-'}`;
  if (scene.textures.exists(key)) return key;
  const wzor = (kraj && FLAGI[kraj]) || FLAGA_NIEZNANA;
  const src = scene.textures.get('arena-choragiew').getSourceImage() as HTMLImageElement;
  const msk = scene.textures.get('arena-choragiew-maska').getSourceImage() as HTMLImageElement;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(msk, 0, 0);
  const m = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  // The cloth's box: the flag pattern is stretched over it.
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[(y * w + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const rows = wzor.length, cols = wzor[0].length;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * w + x) * 4;
    if (m[i + 3] <= 128 || px[i + 3] === 0) continue;
    const ch = wzor[Math.min(rows - 1, Math.floor(((y - y0) / (y1 - y0 + 1)) * rows))][Math.min(cols - 1, Math.floor(((x - x0) / (x1 - x0 + 1)) * cols))];
    const kol = KOLORY_FLAG[ch];
    if (!kol) continue;
    const v = Number.parseInt(kol.slice(1), 16);
    // The grey cloth's shade (≈ 0.7 … 0.85 light) keeps the folds: light 0.8 gives the flag's own colour.
    const l = (px[i] + px[i + 1] + px[i + 2]) / 3 / 255 / 0.8;
    px[i] = Math.min(255, ((v >> 16) & 255) * l);
    px[i + 1] = Math.min(255, ((v >> 8) & 255) * l);
    px[i + 2] = Math.min(255, (v & 255) * l);
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, c);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

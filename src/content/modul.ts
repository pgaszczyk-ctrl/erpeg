// Modular heroes (artist pack „20 postaci, osie v5”, owner 20 Oct 2026): a head and a body glued at the neck,
// with skin, hair and clothes colours. Parts and anchors: content/modulDane.ts (scripts/postacie-modul.py).
import { tx } from '../i18n';

/** Skin tones, light to dark (the button „Kolor skóry” goes through them). */
export const SKORY_MODUL: [number, number, number][] = [
  [255, 218, 176], [252, 194, 140], [226, 160, 106], [184, 114, 70], [132, 80, 50], [92, 56, 38],
];
/** Hair colours to draw from (grey/white hair of the old heads is kept). */
export const WLOSY_MODUL: [number, number, number][] = [
  [58, 38, 30], [104, 60, 38], [150, 84, 42], [206, 92, 38], [232, 186, 98], [246, 222, 160], [170, 168, 180], [70, 130, 170],
];
/** Clothes colours (main and second material). */
export const UBRANIA_MODUL: [number, number, number][] = [
  [62, 112, 70], [52, 86, 150], [150, 52, 48], [196, 150, 54], [104, 70, 140], [64, 64, 74], [214, 206, 190], [126, 82, 48],
  [46, 120, 126], [170, 96, 40], [120, 30, 60], [90, 110, 60],
];

export const PLEC_NAPIS = { k: () => tx('♀ Kobieta', '♀ Woman'), m: () => tx('♂ Mężczyzna', '♂ Man') };

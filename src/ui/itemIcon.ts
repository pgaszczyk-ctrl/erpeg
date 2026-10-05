import { condition } from '../inventory';

// Pixel-art pictures of items (public/items/<id>.png: the old 16×16 ones, and the artist's 64×64 – a 32×32
// grid shown 2× – from pack ikony12 as they arrive), shown
// enlarged without blur in the character sheet and the chest.

/** Items that have a picture (also loaded as Phaser textures `item-<id>` in BootScene). */
export const ITEM_PICTURES = [
  'kijek', 'zelazny', 'miecz_mosiezny', 'stalowy', 'szabla_hartowana', 'rycerski', 'karabela_damascenska', 'swietlisty', 'gromowladny',
  'luk', 'dlugi_luk', 'rozdzka', 'kula', 'ksiega',
  'skorzana_zbroja', 'kolczuga', 'skorzany_helm', 'zelazny_helm', 'kapelusz', 'czapka_maga', 'korona',
  'skorzane_buty', 'zelazne_buty', 'podkowa_szczescia',
  'szklany_miecz', 'tarcza_drewniana', 'tarcza_okuta',
];
const HAVE = new Set(ITEM_PICTURES);

/** Pictures that change with wear: the glass sword shows its cracks once a third of its blows is left (ikony12 B2). */
const CRACKED: Record<string, string> = { szklany_miecz: 'szklany_miecz_pekniety' };
/** Extra pictures to load (BootScene) besides ITEM_PICTURES. */
export const ITEM_VARIANTS = Object.values(CRACKED);

/** The picture file for an item now (its cracked variant when worn down). */
function pictureOf(id: string) {
  const v = CRACKED[id];
  if (!v) return id;
  const c = condition(id);
  return c && c.left <= c.max / 3 ? v : id;
}

/** Phaser texture key of an item's picture, or null. */
export function itemTexture(id: string) {
  return HAVE.has(id) ? `item-${pictureOf(id)}` : null;
}

/** An <img> of the item, or null when it has no picture yet. */
export function itemIcon(id: string, className = 'item-ico'): HTMLImageElement | null {
  if (!HAVE.has(id)) return null;
  const img = document.createElement('img');
  img.src = `items/${pictureOf(id)}.png`; // relative: the game is built with base ./
  img.className = className;
  img.alt = '';
  img.draggable = false;
  return img;
}

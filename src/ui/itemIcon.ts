// Pixel-art pictures of items (16×16 PNGs in public/items/<id>.png), shown
// enlarged without blur in the character sheet and the chest.

/** Items that have a picture (also loaded as Phaser textures `item-<id>` in BootScene). */
export const ITEM_PICTURES = [
  'kijek', 'zelazny', 'stalowy', 'rycerski', 'swietlisty', 'gromowladny',
  'luk', 'dlugi_luk', 'rozdzka', 'kula', 'ksiega',
  'skorzana_zbroja', 'kolczuga', 'skorzany_helm', 'zelazny_helm', 'kapelusz', 'czapka_maga', 'korona',
  'skorzane_buty', 'zelazne_buty',
];
const HAVE = new Set(ITEM_PICTURES);

/** Phaser texture key of an item's picture, or null. */
export function itemTexture(id: string) {
  return HAVE.has(id) ? `item-${id}` : null;
}

/** An <img> of the item, or null when it has no picture yet. */
export function itemIcon(id: string, className = 'item-ico'): HTMLImageElement | null {
  if (!HAVE.has(id)) return null;
  const img = document.createElement('img');
  img.src = `items/${id}.png`; // relative: the game is built with base ./
  img.className = className;
  img.alt = '';
  img.draggable = false;
  return img;
}

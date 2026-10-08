import { condition } from '../inventory';
import type { Owoc, Grupa } from '../content/sklepy';

// Pixel-art pictures of items (public/items/<id>.png: the old 16×16 ones, and the artist's 64×64 – a 32×32
// grid shown 2× – from pack ikony12 as they arrive), shown
// enlarged without blur in the character sheet and the chest.

/** Items that have a picture (also loaded as Phaser textures `item-<id>` in BootScene). */
export const ITEM_PICTURES = [
  'kijek', 'zelazny', 'miecz_mosiezny', 'stalowy', 'szabla_hartowana', 'rycerski', 'karabela_damascenska', 'swietlisty', 'gromowladny',
  'luk', 'luk_refleksyjny', 'dlugi_luk', 'kusza', 'pistolet_parowy', 'rozdzka', 'kula', 'ksiega',
  'skorzana_zbroja', 'kolczuga', 'skorzany_helm', 'zelazny_helm', 'kapelusz', 'czapka_maga', 'korona',
  'skorzane_buty', 'zelazne_buty', 'podkowa_szczescia',
  'szklany_miecz', 'tarcza_drewniana', 'tarcza_okuta', 'siekiera',
];
// Vehicle pictures already load with MATERIAL_PICTURES; recognise them as backpack/shop items on test.
const HAVE = new Set([...ITEM_PICTURES, ...(import.meta.env?.VITE_TEST === '1' ? ['rower', 'hulajnoga_parowa'] : [])]);

/** Pack 26 trial helmet stays on test; production keeps the previous picture. */
export function itemAssetUrl(id: string) {
  if (import.meta.env?.VITE_TEST === '1' && id === 'skorzana_zbroja') return 'proby31/skorzana_zbroja.png';
  return import.meta.env?.VITE_TEST === '1' && id === 'skorzany_helm' ? 'sklepy/skorzany_helm.png' : `items/${id}.png`;
}

/** Pictures that change with wear: the glass sword shows its cracks once a third of its blows is left (ikony12 B2). */
const CRACKED: Record<string, string> = { szklany_miecz: 'szklany_miecz_pekniety' };
/**
 * Raw materials (ikony12 A1/A2, 64×64 like the items): only wood (`drewno`) and brushwood (`chrust`) are backpack goods so far;
 * chrust, kij (bow material, not the stick weapon `kijek`), wegiel, ruda_zelaza, miedz wait for crafting.
 */
export const MATERIAL_PICTURES = [
  'drewno', 'chrust', 'kij', 'wegiel', 'ruda_zelaza', 'miedz',
  // A2: for the smith later.
  'piasek', 'odlamek_komety', 'sztaba_zelaza', 'sztaba_stali', 'sztaba_mosiadzu', 'szklo',
  // A3/D1: power cells (full/empty) and the pickaxe – for later.
  'ogniwo', 'ogniwo_puste', 'kilof',
  // D2: vehicles and scrap for later; the diamond is shown in the Kufer's Zasoby.
  'rower', 'hulajnoga_parowa', 'diament', 'zlom', 'zlom_miedziany',
];
/** Goods shown with a material picture instead of the game's small texture / the group's emoji. */
const GOODS_PICTURES: Partial<Record<Owoc | Grupa, string>> = {
  drewno: 'drewno', chrust: 'chrust', ruda_zelaza: 'ruda_zelaza',
  // Backpack groups instead of the bright, detailed emoji (owner, 5 Oct 2026): the artist's apple (HUD pack) and
  // Noto emoji run through docs/paczka-dla-artysty/8_wyrownanie/wyrownaj.py (24 px, world palette, outline; sources
  // in scripts/ikony-grup/), centred in 32×32 and shown 2× like the other icons.
  owoce: 'grupa_owoce', warzywa: 'grupa_warzywa', grzyby: 'grupa_grzyby',
};

/** The picture URL of a backpack good or goods group, if it has one. */
export function goodsPicture(what: Owoc | Grupa): string | undefined {
  const f = GOODS_PICTURES[what];
  return f ? `items/${f}.png` : undefined;
}

/** Ammunition pictures (ikony12 C2), textures `item-<kind>`: arrows, bolts, bullets, a magic charge. */
export const AMMO_PICTURES = ['strzaly', 'belty', 'naboje', 'ladunek_magii'];
/** Extra pictures to load (BootScene) besides ITEM_PICTURES. */
export const ITEM_VARIANTS = [...Object.values(CRACKED), ...AMMO_PICTURES, ...MATERIAL_PICTURES];

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

/** The picture's URL (relative, like the game's base ./), or null when the item has none yet. */
export function itemPictureUrl(id: string): string | null {
  return HAVE.has(id) ? itemAssetUrl(pictureOf(id)) : null;
}

/** An <img> of the item, or null when it has no picture yet. */
export function itemIcon(id: string, className = 'item-ico'): HTMLImageElement | null {
  if (!HAVE.has(id)) return null;
  const img = document.createElement('img');
  img.src = itemAssetUrl(pictureOf(id)); // relative: the game is built with base ./
  img.className = className;
  img.alt = '';
  img.draggable = false;
  return img;
}

import { PRZEDMIOTY } from '../content/przedmioty';
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
  'szklany_miecz', 'tarcza_drewniana', 'tarcza_okuta', 'siekiera', 'cukierniczy_cylinder',
  // Order 45 stage D: recruit kit, story rewards/talismans, food.
  'miecz_rekruta', 'luk_rekruta', 'rozdzka_szkolna', 'kapelusz_szkolny', 'karabin_trybunal', 'klasztorny_pochlaniacz',
  'plaszcz_cechmistrza', 'buty_biegacza', 'gwizdek_maszynisty', 'kluczyk_nakrecacz', 'kieszonkowy_chronometr',
  'zegarek_czeladnika', 'filtr_aetherowy', 'zlota_pilka', 'paczek', 'hamburger',
];
// Vehicle pictures already load with MATERIAL_PICTURES; recognise them as backpack/shop items.
// (Order 45 D gave the recruit kit its own pictures; no stand-ins left.)
const QUEST_PICTURES: Record<string, string> = {};
const pictureBase = (id: string) => QUEST_PICTURES[id] ?? PRZEDMIOTY.find(p => p.id === id)?.baza ?? id;
const HAVE = new Set([...ITEM_PICTURES, 'rower', 'hulajnoga_parowa']);

/**
 * Order 45 (A+B): the artist's 64 px exports are machine reductions of smooth 1254 px drawings, so their diagonal
 * edges step unevenly and look ragged when enlarged (owner, 1 Nov 2026). HTML windows show the original shrunk
 * smoothly to 256 px (public/items_hd, image-rendering auto via CSS); Phaser keeps the 64 px file (`phaserItemUrl`).
 */
const HD = new Set([
  'swietlisty', 'gromowladny', 'kolczuga', 'ksiega', 'czapka_maga', 'kapelusz', 'zelazny', 'stalowy',
  'luk', 'luk_refleksyjny', 'dlugi_luk', 'rozdzka', 'kula', 'zlom', 'zlom_miedziany',
  // stage D
  'miecz_rekruta', 'luk_rekruta', 'rozdzka_szkolna', 'kapelusz_szkolny', 'karabin_trybunal', 'klasztorny_pochlaniacz',
  'plaszcz_cechmistrza', 'buty_biegacza', 'gwizdek_maszynisty', 'kluczyk_nakrecacz', 'kieszonkowy_chronometr',
  'zegarek_czeladnika', 'filtr_aetherowy', 'zlota_pilka', 'paczek', 'hamburger',
  'jablko', 'sliwka', 'winogrono', 'marchewka', 'brokul', 'salata', 'grzyb', 'kiel', 'luska',
  'esencja_dab', 'esencja_mroz', 'mikstura', 'namiot',
  // C1 (weapons, shields, boots, talisman, hats)
  'rycerski', 'miecz_mosiezny', 'szabla_hartowana', 'karabela_damascenska', 'szklany_miecz', 'szklany_miecz_pekniety',
  'kusza', 'pistolet_parowy', 'siekiera', 'tarcza_drewniana', 'tarcza_okuta', 'skorzany_helm', 'skorzane_buty',
  'zelazne_buty', 'podkowa_szczescia', 'cukierniczy_cylinder',
]);

/** The file Phaser loads as `item-<id>` (small textures: the pixel export, not the smooth HD picture). */
export function phaserItemUrl(id: string) {
  return HD.has(id) ? `items/${id}.png` : itemAssetUrl(id);
}

/** Detailed illustrations released in 1.015, without resampling the original files. */
export function itemAssetUrl(id: string) {
  if (HD.has(id)) return `items_hd/${id}.png`;
  if (id === 'skorzana_zbroja') return 'proby31/skorzana_zbroja.png';
  return id === 'skorzany_helm' ? 'sklepy/skorzany_helm.png' : `items/${id}.png`;
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
  // Order 45 D
  jablko: 'jablko', sliwka: 'sliwka', winogrono: 'winogrono', marchewka: 'marchewka', brokul: 'brokul', salata: 'salata',
  grzyb: 'grzyb', kiel: 'kiel', luska: 'luska',
  // Backpack groups instead of the bright, detailed emoji (owner, 5 Oct 2026): the artist's apple (HUD pack) and
  // Noto emoji run through docs/paczka-dla-artysty/8_wyrownanie/wyrownaj.py (24 px, world palette, outline; sources
  // in scripts/ikony-grup/), centred in 32×32 and shown 2× like the other icons.
  // Since order 45 D (1 Nov 2026) the groups use the artist's new apple/carrot/mushroom (grupa_* files kept).
  owoce: 'jablko', warzywa: 'marchewka', grzyby: 'grzyb',
};

/** The picture URL of a backpack good or goods group, if it has one. */
export function goodsPicture(what: Owoc | Grupa): string | undefined {
  const f = GOODS_PICTURES[what];
  return f ? itemAssetUrl(f) : undefined;
}

/** Pictures of things that aren't items or goods (order 45 D): essence flasks `esencja_<id>`, the potion, the rolled tent. */
export function rzeczUrl(id: 'mikstura' | 'namiot' | `esencja_${string}`): string | null {
  return HD.has(id) ? itemAssetUrl(id) : null;
}

/** Ammunition pictures (ikony12 C2), textures `item-<kind>`: arrows, bolts, bullets, a magic charge. */
export const AMMO_PICTURES = ['strzaly', 'belty', 'naboje', 'ladunek_magii'];
/** Extra pictures to load (BootScene) besides ITEM_PICTURES. */
export const ITEM_VARIANTS = [...Object.values(CRACKED), ...AMMO_PICTURES, ...MATERIAL_PICTURES];

/** The picture file for an item now (its cracked variant when worn down). */
function pictureOf(id: string) {
  const base = pictureBase(id);
  const v = CRACKED[base];
  if (!v) return base;
  const c = condition(id);
  return c && c.left <= c.max / 3 ? v : base;
}

/** Phaser texture key of an item's picture, or null. */
export function itemTexture(id: string) {
  return HAVE.has(pictureBase(id)) ? `item-${pictureOf(id)}` : null;
}

/** The picture's URL (relative, like the game's base ./), or null when the item has none yet. */
export function itemPictureUrl(id: string): string | null {
  return HAVE.has(pictureBase(id)) ? itemAssetUrl(pictureOf(id)) : null;
}

/** An <img> of the item, or null when it has no picture yet. */
export function itemIcon(id: string, className = 'item-ico'): HTMLImageElement | null {
  if (!HAVE.has(pictureBase(id))) return null;
  const img = document.createElement('img');
  img.src = itemAssetUrl(pictureOf(id)); // relative: the game is built with base ./
  img.className = className;
  img.alt = '';
  img.draggable = false;
  return img;
}

// The hero's look from the editor (owner, 25 Nov 2026; artist pack 51-G001 „postacie chibi v6”): the artist's
// big front figure (menu, Kufer, portraits) recoloured by the game, and the same choices for the code-drawn chibi.
// Three choices only: hairstyle, hair colour, skin colour. Gender is picked once at creation; the clothes (linen
// shirt, leather trousers) never change. Palettes from order 51-P001.
import { tx } from '../i18n';

export type Plec = 'k' | 'm';

/** Skin tones, light to dark. */
export const SKORY_51: { hex: string; nazwa: () => string }[] = [
  { hex: '#FBE3CF', nazwa: () => tx('Bardzo jasna', 'Very fair') },
  { hex: '#F1C7A5', nazwa: () => tx('Jasna', 'Fair') },
  { hex: '#E0AC85', nazwa: () => tx('Jasnobrzoskwiniowa', 'Light peach') },
  { hex: '#C68B62', nazwa: () => tx('Oliwkowa', 'Olive') },
  { hex: '#A86E48', nazwa: () => tx('Śniada', 'Tan') },
  { hex: '#8A5636', nazwa: () => tx('Brązowa', 'Brown') },
  { hex: '#6B4029', nazwa: () => tx('Ciemnobrązowa', 'Dark brown') },
  { hex: '#4A2C1E', nazwa: () => tx('Bardzo ciemna', 'Very dark') },
];

/** Hair colours. */
export const WLOSY_51: { hex: string; nazwa: () => string }[] = [
  { hex: '#1F1A1A', nazwa: () => tx('Czarne', 'Black') },
  { hex: '#3B2A20', nazwa: () => tx('Ciemny brąz', 'Dark brown') },
  { hex: '#5E3E2A', nazwa: () => tx('Brąz', 'Brown') },
  { hex: '#7A3D22', nazwa: () => tx('Kasztan', 'Chestnut') },
  { hex: '#B5481F', nazwa: () => tx('Rude', 'Red') },
  { hex: '#C8743A', nazwa: () => tx('Miedziane', 'Copper') },
  { hex: '#D9B66A', nazwa: () => tx('Blond', 'Blond') },
  { hex: '#EDE2C4', nazwa: () => tx('Platyna', 'Platinum') },
  { hex: '#A9A6A8', nazwa: () => tx('Siwe', 'Grey') },
];

/**
 * How the code-drawn chibi (src/chibi/rysownik.ts) shows a hairstyle: a few simple shapes that read at 20 px.
 */
export type FryzuraChibi = 'krotkie' | 'jez' | 'irokez' | 'afro' | 'dlugie' | 'bob' | 'warkocz' | 'warkocze' | 'kucyk' | 'kok' | 'koczki';

export interface Fryzura {
  id: string;
  nazwa: () => string;
  /** The artist drew a back layer (under the head) too. */
  tyl: boolean;
  chibi: FryzuraChibi;
}

const f = (id: string, pl: string, en: string, tyl: boolean, chibi: FryzuraChibi): Fryzura => ({ id, nazwa: () => tx(pl, en), tyl, chibi });

/** Hairstyles per gender, in the artist's manifest order. */
export const FRYZURY: Record<Plec, Fryzura[]> = {
  k: [
    f('dlugie', 'Długie rozpuszczone', 'Long and loose', true, 'dlugie'),
    f('loki', 'Burza loków / afro', 'Curls / afro', true, 'afro'),
    f('warkocz_dlugi', 'Długi warkocz', 'Long braid', true, 'warkocz'),
    f('warkocz_bok', 'Warkoczyk na bok', 'Side braid', true, 'warkocz'),
    f('warkocze', 'Dwa warkocze', 'Two braids', true, 'warkocze'),
    f('kucyk', 'Wysoki kucyk', 'High ponytail', true, 'kucyk'),
    f('bob', 'Krótki bob', 'Short bob', true, 'bob'),
    f('kok', 'Wysoki kok', 'High bun', false, 'kok'),
    f('dwa_koczki', 'Dwa plecione koczki', 'Two braided buns', false, 'koczki'),
    f('prosta_grzywka', 'Prosta grzywka', 'Straight fringe', false, 'bob'),
    f('korona_warkocz', 'Korona z warkocza', 'Braided crown', false, 'kok'),
    f('warkoczyki_cienkie', 'Dwa cienkie warkoczyki', 'Two thin braids', true, 'warkocze'),
    f('warkocz_na_lewe_ramie', 'Długi warkocz na ramię', 'Long braid over the shoulder', true, 'warkocz'),
  ],
  m: [
    f('zaczesane', 'Krótko zaczesane', 'Short, combed', false, 'krotkie'),
    f('jez', 'Na jeża', 'Buzz cut', false, 'jez'),
    f('rozczochrane', 'Rozczochrane', 'Tousled', false, 'krotkie'),
    f('kitka', 'Niska kitka', 'Low ponytail', true, 'kucyk'),
    f('loki', 'Krótkie loki / afro', 'Short curls / afro', false, 'afro'),
    f('podgolone', 'Podgolone boki', 'Shaved sides', false, 'krotkie'),
    f('przedzialek_srodek', 'Przedziałek na środku', 'Middle parting', false, 'krotkie'),
    f('irokez_krecony', 'Kręcony irokez', 'Curly mohawk', false, 'irokez'),
    f('warkoczyki_przy_skorze', 'Warkoczyki przy skórze', 'Cornrows', false, 'jez'),
    f('irokez_spiczasty', 'Spiczasty irokez', 'Spiky mohawk', false, 'irokez'),
  ],
};

/** The artist's portrait point per gender (centre of the head and a radius around it with the hair). */
export const PORTRET_51: Record<Plec, { srodek: [number, number]; promien: number }> = {
  k: { srodek: [384, 382], promien: 382 },
  m: { srodek: [384, 364], promien: 330 },
};

export const PLOTNO_51 = { w: 768, h: 1152 };

/** The clothes the chibi wears without armour (the artist's recruit outfit: linen shirt, leather trousers). */
export const STROJ_CHIBI = { koszula: '#d9c39d', spodnie: '#6a4430' };

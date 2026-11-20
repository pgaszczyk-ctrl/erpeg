import { lang } from '../i18n';
/**
 * Names offered by default in the new-character form (owner, 8 Nov 2026: „100 losowych imion,
 * 20 polskich, 40 anglojęzycznych, 40 fantasy”). The player can type over it. Max 20 characters.
 */
export const IMIONA_POLSKIE = [
  'Zbyszko', 'Jagienka', 'Bartosz', 'Wiesia', 'Mieszko', 'Dobrawa', 'Kazik', 'Halinka', 'Stach', 'Marysia',
  'Wojtek', 'Zosia', 'Janek', 'Basia', 'Bolko', 'Jadzia', 'Leszek', 'Grażyna', 'Witek', 'Hania',
];
export const IMIONA_ANGIELSKIE = [
  'Oliver', 'Amelia', 'Jack', 'Isla', 'Harry', 'Ava', 'George', 'Emily', 'Charlie', 'Poppy',
  'Thomas', 'Lily', 'Oscar', 'Grace', 'William', 'Sophie', 'James', 'Ella', 'Henry', 'Freya',
  'Arthur', 'Ivy', 'Alfie', 'Mia', 'Leo', 'Evie', 'Theo', 'Ruby', 'Archie', 'Daisy',
  'Finn', 'Matilda', 'Samuel', 'Rosie', 'Edward', 'Alice', 'Max', 'Willow', 'Toby', 'Hazel',
];
export const IMIONA_FANTASY = [
  'Aldric', 'Elowen', 'Thorin', 'Lyra', 'Garrick', 'Seraphine', 'Brannoc', 'Isolde', 'Kaelen', 'Morwen',
  'Darian', 'Faelan', 'Rowena', 'Torvald', 'Ysolde', 'Corwin', 'Nimue', 'Eldrin', 'Sylvara', 'Brom',
  'Galadan', 'Ithril', 'Wren Ashdown', 'Oberon', 'Ravena', 'Taliesin', 'Arwyn', 'Mirabel', 'Zephyr', 'Cedric',
  'Elara', 'Fendrel', 'Kestrel', 'Lorcan', 'Mabyn', 'Orrin', 'Peregrin', 'Quillon', 'Sorcha', 'Vesper',
];
export const IMIONA = [...IMIONA_POLSKIE, ...IMIONA_ANGIELSKIE, ...IMIONA_FANTASY];

/** Default name in the player's language (report #24: a Polish player got „Ivy”): Polish + fantasy for Polish, English + fantasy otherwise. */
export function losoweImie(): string {
  const pl = lang === 'pl';
  const lista = pl ? [...IMIONA_POLSKIE, ...IMIONA_POLSKIE, ...IMIONA_FANTASY] : [...IMIONA_ANGIELSKIE, ...IMIONA_FANTASY];
  return lista[Math.floor(Math.random() * lista.length)];
}

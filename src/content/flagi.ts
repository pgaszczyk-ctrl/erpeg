// Flags on mountain peaks (owner, 11 Oct 2026: „zdecydowanie flaga kraju”): each peak's cairn
// carries the flag of the country it stands in (src/kraj.ts krajWPunkcie). A flag is 6 × 4
// pixels, one letter per pixel (colours in KOLORY_FLAG, '.' = transparent); a country without
// a flag here gets FLAGA_NIEZNANA (a plain pennant that says nothing about a country).
// Tiny on purpose: only the stripes and the biggest sign of each flag fit.

export const KOLORY_FLAG: Record<string, string> = {
  W: '#ffffff', R: '#d8323c', r: '#9e2a3a', B: '#2457a8', b: '#7fb3e0', N: '#1a1a1a',
  Y: '#f2c230', G: '#2e8b45', O: '#f08a24', P: '#f0e2b8',
};

export const FLAGI: Record<string, string[]> = {
  PL: ['WWWWWW', 'WWWWWW', 'RRRRRR', 'RRRRRR'],
  SK: ['WWWWWW', 'BRBBBB', 'RRRRRR', 'RRRRRR'],
  CZ: ['BWWWWW', 'BBWWWW', 'BBRRRR', 'BRRRRR'],
  SI: ['WBWWWW', 'BBBBBB', 'RRRRRR', 'RRRRRR'],
  AT: ['RRRRRR', 'WWWWWW', 'WWWWWW', 'RRRRRR'],
  DE: ['NNNNNN', 'RRRRRR', 'RRRRRR', 'YYYYYY'],
  CH: ['RRRRRR', 'RRWWRR', 'RWWWWR', 'RRWWRR'],
  IT: ['GGWWRR', 'GGWWRR', 'GGWWRR', 'GGWWRR'],
  FR: ['BBWWRR', 'BBWWRR', 'BBWWRR', 'BBWWRR'],
  ES: ['RRRRRR', 'YYYYYY', 'YYYYYY', 'RRRRRR'],
  PT: ['GGRRRR', 'GYRRRR', 'GYRRRR', 'GGRRRR'],
  HU: ['RRRRRR', 'WWWWWW', 'WWWWWW', 'GGGGGG'],
  HR: ['RRRRRR', 'WWRWWW', 'WWWWWW', 'BBBBBB'],
  RS: ['RRRRRR', 'BBBBBB', 'BBBBBB', 'WWWWWW'],
  RO: ['BBYYRR', 'BBYYRR', 'BBYYRR', 'BBYYRR'],
  MD: ['BBYYRR', 'BBYYRR', 'BBYYRR', 'BBYYRR'],
  BG: ['WWWWWW', 'GGGGGG', 'GGGGGG', 'RRRRRR'],
  UA: ['BBBBBB', 'BBBBBB', 'YYYYYY', 'YYYYYY'],
  BY: ['RRRRRR', 'RRRRRR', 'RRRRRR', 'GGGGGG'],
  LT: ['YYYYYY', 'GGGGGG', 'GGGGGG', 'RRRRRR'],
  LV: ['rrrrrr', 'WWWWWW', 'rrrrrr', 'rrrrrr'],
  EE: ['BBBBBB', 'NNNNNN', 'NNNNNN', 'WWWWWW'],
  RU: ['WWWWWW', 'BBBBBB', 'BBBBBB', 'RRRRRR'],
  NL: ['RRRRRR', 'WWWWWW', 'WWWWWW', 'BBBBBB'],
  LU: ['RRRRRR', 'WWWWWW', 'WWWWWW', 'bbbbbb'],
  BE: ['NNYYRR', 'NNYYRR', 'NNYYRR', 'NNYYRR'],
  IE: ['GGWWOO', 'GGWWOO', 'GGWWOO', 'GGWWOO'],
  GB: ['BWRRWB', 'RRRRRR', 'RRRRRR', 'BWRRWB'],
  DK: ['RWRRRR', 'WWWWWW', 'RWRRRR', 'RWRRRR'],
  NO: ['RBRRRR', 'BBBBBB', 'RBRRRR', 'RBRRRR'],
  SE: ['BYBBBB', 'YYYYYY', 'BYBBBB', 'BYBBBB'],
  FI: ['WBWWWW', 'BBBBBB', 'WBWWWW', 'WBWWWW'],
  GR: ['BWBBBB', 'WWWWWW', 'BWBBBB', 'WWWWWW'],
  TR: ['RRRRRR', 'RWRWRR', 'RWRRRR', 'RRRRRR'],
  IL: ['BBBBBB', 'WWBWWW', 'WWWWWW', 'BBBBBB'],
  EG: ['RRRRRR', 'WWYWWW', 'WWWWWW', 'NNNNNN'],
  JP: ['WWWWWW', 'WWRRWW', 'WWRRWW', 'WWWWWW'],
  KR: ['NWWWWN', 'WWRRWW', 'WWBBWW', 'NWWWWN'],
  CN: ['RYRRRR', 'YYYRRR', 'RYRRRR', 'RRRRRR'],
  IN: ['OOOOOO', 'WWBBWW', 'WWWWWW', 'GGGGGG'],
  SG: ['RWRRRR', 'RRRRRR', 'WWWWWW', 'WWWWWW'],
  US: ['BBBRRR', 'BBBWWW', 'RRRRRR', 'WWWWWW'],
  CA: ['RWWWWR', 'RWRRWR', 'RWRRWR', 'RWWWWR'],
  MX: ['GGWWRR', 'GGWGRR', 'GGWWRR', 'GGWWRR'],
  BR: ['GGYYGG', 'GYBBYG', 'GYBBYG', 'GGYYGG'],
  AR: ['bbbbbb', 'WWYWWW', 'WWWWWW', 'bbbbbb'],
  AU: ['WBBBBB', 'BBBBWB', 'BBBBBB', 'BWBBBW'],
};

/** A peak in a country we have no flag for (or no country at all): a plain cream pennant. */
export const FLAGA_NIEZNANA = ['PPPP..', 'PPPPPP', 'PPPP..', '......'];

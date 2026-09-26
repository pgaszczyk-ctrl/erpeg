// ============================================================================
//  POZIOMY TRUDNOŚCI (wybierane suwakiem przy tworzeniu postaci)
//  wiek      – do jakiego wieku dobieramy zagadki mądrali
//  obrazenia – ile razy mocniej/słabiej biją potwory (1 = normalnie)
//  tyl       – ile razy dalej widać wokół siebie i za plecami (1 = normalnie)
//  miecz     – jak szeroki łuk zatacza miecz, w stopniach (0 = zwykły cios przed sobą)
//  potwory   – ile razy więcej potworów na ulicach (1 = normalnie)
//  tempo     – jak szybko chodzą i gonią potwory (1 = normalnie)
//  skup      – jaka część sklepów odkupuje owoce, grzyby i drewno (1 = każdy)
//  pojedynek – siła i życie mieszkańca w pojedynku względem gracza (1 = tak samo)
// ============================================================================

export interface Trudnosc {
  nazwa: string;
  en: string;
  opis: string;
  wiek: number;
  obrazenia: number;
  tyl: number;
  miecz: number;
  potwory: number;
  tempo: number;
  skup: number;
  pojedynek: number;
}

export const TRUDNOSCI: Trudnosc[] = [
  { nazwa: 'Dziecięcy', en: 'Kids', opis: 'Zagadki dla 5–7 lat, potwory biją 4× słabiej, widać 2× dalej za plecami, miecz zatacza 280°, potwory chodzą o połowę wolniej.', wiek: 6, obrazenia: 0.25, tyl: 2, miecz: 280, potwory: 1, tempo: 0.5, skup: 1, pojedynek: 0.3 },
  { nazwa: 'Młody', en: 'Young', opis: 'Zagadki dla 7–10 lat, potwory biją 2× słabiej, widać 1,5× dalej za plecami, miecz zatacza 220°.', wiek: 9, obrazenia: 0.5, tyl: 1.5, miecz: 220, potwory: 1, tempo: 0.6, skup: 0.6, pojedynek: 0.5 },
  { nazwa: 'Średni', en: 'Medium', opis: 'Zagadki dla 10+ lat, widać o 20% dalej za plecami.', wiek: 12, obrazenia: 1, tyl: 1.2, miecz: 0, potwory: 1, tempo: 0.7, skup: 0.4, pojedynek: 0.7 },
  { nazwa: 'Wysoki', en: 'Hard', opis: 'Zagadki dla dorosłych, zwykły widok i cios.', wiek: 18, obrazenia: 1, tyl: 1, miecz: 0, potwory: 1, tempo: 0.8, skup: 0.4, pojedynek: 1 },
  { nazwa: 'Hardkor', en: 'Hardcore', opis: 'Zagadki dla dorosłych, o połowę więcej potworów, biją 2× mocniej.', wiek: 19, obrazenia: 2, tyl: 1, miecz: 0, potwory: 1.5, tempo: 0.9, skup: 0.4, pojedynek: 1.5 },
];

/** Dziecięcy. */
export const DOMYSLNA_TRUDNOSC = 0;

/**
 * The level is kept as an age (players.age: 6, 9, 12, 18 or 19); characters
 * made before the slider keep the age they typed.
 */
export function trudnoscZWieku(age: number) {
  return age <= 7 ? 0 : age <= 10 ? 1 : age <= 12 ? 2 : age <= 18 ? 3 : 4;
}

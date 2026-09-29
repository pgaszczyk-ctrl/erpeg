// ============================================================================
//  POZIOMY TRUDNOŚCI (wybierane suwakiem przy tworzeniu postaci)
//  wiek      – do jakiego wieku dobieramy zagadki mądrali
//  obrazenia – ile razy mocniej/słabiej biją potwory (1 = normalnie)
//  tyl       – ile razy dalej widać wokół siebie i za plecami (1 = normalnie)
//  widok     – kąt widzenia w stopniach i czy widać aż do brzegu ekranu (ekran: true) czy zwykle blisko
//  miecz     – jak szeroki łuk zatacza miecz, w stopniach (0 = zwykły cios przed sobą)
//  potwory   – ile razy więcej potworów na ulicach (1 = normalnie)
//  tempo     – jak szybko chodzą i gonią potwory (1 = normalnie)
//  skup      – jaka część sklepów odkupuje owoce, grzyby i drewno (1 = każdy)
//  pojedynek – siła i życie mieszkańca w pojedynku względem gracza (1 = tak samo)
//  wyzwanie  – ile razy więcej czasu niż „na styk” daje Trener (więcej = łatwiej)
//  rywal     – ile razy wolniej od gracza biegnie Biegacz (więcej = łatwiej)
//  serca     – ile serduszek życia ma bohater
//  farta     – jak często Biegacz ma dobry dzień i dobiega pierwszy (0 = nigdy, 0.05 = raz na 20)
// ============================================================================

/** Zasięg „do brzegu ekranu”: co najmniej ekranMin × dawny zasięg, najwyżej maks punktów mapy (tyle liczy telefon bez zadyszki). */
export const WIDOK = { ekranMin: 2, maks: 330 };

export interface Trudnosc {
  nazwa: string;
  en: string;
  opis: string;
  wiek: number;
  obrazenia: number;
  tyl: number;
  widok: { stopnie: number; ekran: boolean };
  miecz: number;
  potwory: number;
  tempo: number;
  skup: number;
  pojedynek: number;
  wyzwanie: number;
  rywal: number;
  farta: number;
  serca: number;
}

export const TRUDNOSCI: Trudnosc[] = [
  { nazwa: 'Dziecięcy', en: 'Kids', opis: 'Zagadki dla 5–7 lat, potwory biją 4× słabiej, widać prawie dookoła (320°) aż do brzegu ekranu, miecz zatacza 280°, potwory chodzą o połowę wolniej.', wiek: 6, obrazenia: 0.25, widok: { stopnie: 320, ekran: true }, tyl: 2, miecz: 280, potwory: 1, tempo: 0.5, skup: 1, pojedynek: 0.3, wyzwanie: 2.5, rywal: 2.2, farta: 0, serca: 5 },
  { nazwa: 'Młody', en: 'Young', opis: 'Zagadki dla 7–10 lat, potwory biją 2× słabiej, widać 200° aż do brzegu ekranu, miecz zatacza 220°.', wiek: 9, obrazenia: 0.5, widok: { stopnie: 200, ekran: true }, tyl: 1.5, miecz: 220, potwory: 1, tempo: 0.6, skup: 0.6, pojedynek: 0.5, wyzwanie: 2, rywal: 1.8, farta: 0.05, serca: 5 },
  { nazwa: 'Średni', en: 'Medium', opis: 'Zagadki dla 10+ lat, widać 200° aż do brzegu ekranu.', wiek: 12, obrazenia: 1, widok: { stopnie: 200, ekran: true }, tyl: 1.2, miecz: 0, potwory: 1, tempo: 0.7, skup: 0.4, pojedynek: 0.7, wyzwanie: 1.6, rywal: 1.5, farta: 0.08, serca: 5 },
  { nazwa: 'Wysoki', en: 'Hard', opis: 'Zagadki dla dorosłych, zwykły cios, widać 200° aż do brzegu ekranu, 3 serduszka.', wiek: 18, obrazenia: 1, widok: { stopnie: 200, ekran: true }, tyl: 1, miecz: 0, potwory: 1, tempo: 0.8, skup: 0.4, pojedynek: 1, wyzwanie: 1.35, rywal: 1.3, farta: 0.12, serca: 3 },
  { nazwa: 'Hardkor', en: 'Hardcore', opis: 'Zagadki dla dorosłych, o połowę więcej potworów, biją 2× mocniej, widać tylko 160° i bliżej, tylko 2 serduszka.', wiek: 19, obrazenia: 2, widok: { stopnie: 160, ekran: false }, tyl: 1, miecz: 0, potwory: 1.5, tempo: 0.9, skup: 0.4, pojedynek: 1.5, wyzwanie: 1.2, rywal: 1.15, farta: 0.18, serca: 2 },
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

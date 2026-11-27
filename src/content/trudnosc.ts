// ============================================================================
//  POZIOMY TRUDNOŚCI (wybierane suwakiem przy tworzeniu postaci)
//  wiek      – do jakiego wieku dobieramy zagadki mądrali
//  obrazenia – ile razy mocniej/słabiej biją potwory (1 = normalnie)
//  tyl       – ile razy dalej widać wokół siebie i za plecami (1 = normalnie)
//  widok     – kąt widzenia w stopniach i czy widać aż do brzegu ekranu (ekran: true) czy zwykle blisko
//  miecz     – jak szeroki łuk zatacza miecz, w stopniach (0 = zwykły cios przed sobą)
//  potwory   – ile razy więcej potworów na ulicach (1 = normalnie)
//  tempo     – jak szybko chodzą i gonią potwory (1 = normalnie)
//  pojedynek – siła i życie mieszkańca w pojedynku względem gracza (1 = tak samo)
//  wyzwanie  – ile razy więcej czasu niż „na styk” daje Trener (więcej = łatwiej)
//  rywal     – ile razy wolniej od gracza biegnie Biegacz (więcej = łatwiej)
//  serca     – ile serduszek życia ma bohater
//  farta     – jak często Biegacz ma dobry dzień i dobiega pierwszy (0 = nigdy, 0.05 = raz na 20)
//  celnosc   – ile punktów procentowych dodać do szansy trafienia (miecz, łuk; najwyżej 100%)
//  zuzycie   – czy broń się tępi i trzeba ją naprawiać (content/zuzycie.ts; szklany miecz pęka zawsze)
// ============================================================================

/** Zasięg „do brzegu ekranu”: co najmniej ekranMin × dawny zasięg, najwyżej maks punktów mapy (tyle liczy telefon bez zadyszki). */
export const WIDOK = {
  ekranMin: 2, maks: 330,
  /** Właściciel, 5 X 2026: widać wszystko dookoła aż do rogów ekranu, zasłaniają tylko budynki (stożek wzroku wyłączony). */
  wszedzie: true,
  maksWszedzie: 700,
};

export interface Trudnosc {
  nazwa: string;
  en: string;
  opis: string;
  wiek: number;
  obrazenia: number;
  hpWrogow: number;
  tyl: number;
  widok: { stopnie: number; ekran: boolean };
  miecz: number;
  potwory: number;
  tempo: number;
  pojedynek: number;
  wyzwanie: number;
  rywal: number;
  farta: number;
  serca: number;
  celnosc: number;
  zuzycie: boolean;
}

const przygoda: Trudnosc = { nazwa: 'Przygoda', en: 'Adventure', opis: 'Zagadki dla 10+ lat, widać 200° aż do brzegu ekranu. Broń się tępi – trzeba ją naprawiać.', wiek: 12, hpWrogow: 2, obrazenia: 1, widok: { stopnie: 200, ekran: true }, tyl: 1.2, miecz: 0, potwory: 1, tempo: 0.7, pojedynek: 0.7, wyzwanie: 1.6, rywal: 1.5, farta: 0.08, serca: 5, celnosc: 0, zuzycie: true };

export const TRUDNOSCI: Trudnosc[] = [
  { nazwa: 'Rodzinny', en: 'Family', opis: 'Zagadki dla 5–7 lat, potwory biją 4× słabiej, widać 220° aż do brzegu ekranu i daleko za plecami, miecz zatacza 280°, potwory chodzą o połowę wolniej.', wiek: 6, hpWrogow: 1, obrazenia: 0.25, widok: { stopnie: 220, ekran: true }, tyl: 3.2, miecz: 280, potwory: 1, tempo: 0.5, pojedynek: 0.3, wyzwanie: 2.5, rywal: 2.2, farta: 0, serca: 5, celnosc: 15, zuzycie: false },
  { nazwa: 'Młody', en: 'Young', opis: 'Zagadki dla 7–10 lat, potwory biją 2× słabiej, widać 200° aż do brzegu ekranu, miecz zatacza 220°.', wiek: 9, hpWrogow: 1, obrazenia: 0.5, widok: { stopnie: 200, ekran: true }, tyl: 1.5, miecz: 220, potwory: 1, tempo: 0.6, pojedynek: 0.5, wyzwanie: 2, rywal: 1.8, farta: 0.05, serca: 5, celnosc: 15, zuzycie: false },
  przygoda,
  { nazwa: 'Wysoki', en: 'Hard', opis: 'Zagadki dla dorosłych, zwykły cios, widać 200° aż do brzegu ekranu, 3 serduszka. Broń się tępi – trzeba ją naprawiać.', wiek: 18, hpWrogow: 4, obrazenia: 1, widok: { stopnie: 200, ekran: true }, tyl: 1, miecz: 0, potwory: 1, tempo: 0.8, pojedynek: 1, wyzwanie: 1.35, rywal: 1.3, farta: 0.12, serca: 3, celnosc: 0, zuzycie: true },
  { ...przygoda, nazwa: 'Hardkor', en: 'Hardcore', opis: 'Wrogowie mają o 20% więcej HP i zadają o 20% większe obrażenia. Śmierć kosztuje 10% całego EXP i może obniżyć poziom.', wiek: 19, hpWrogow: przygoda.hpWrogow * 1.2, obrazenia: przygoda.obrazenia * 1.2 },
];

/** Dziecięcy. */
export const DOMYSLNA_TRUDNOSC = 2;

/**
 * Choosing the difficulty after the QR demo and changing it later in the game menu (owner, 19 Oct 2026: once a
 * day – the server refuses a second change on the same Warsaw day; the first choice after the demo is free).
 */
export const WYBOR_TRUDNOSCI = {
  tytul: '⚖ Wariant przygody',
  poDemo: 'Zanim ruszysz w miasto: jak trudno ma być? Poziom możesz potem zmienić w menu gry – raz dziennie.',
  wMenu: 'Poziom możesz zmieniać raz dziennie. Postać, ekwipunek i postęp zostają.',
  /** One short line per level (TRUDNOSCI order). */
  krotko: [
    'potwory słabe i wolne, łatwe zagadki',
    'potwory słabsze, zagadki dla 7–10-latków',
    'potwory mają 2× więcej życia, zagadki dla młodzieży',
    'potwory mają 4× więcej życia, zagadki dla starszych',
    '+20% życia i obrażeń wrogów. Śmierć zabiera 10% całego EXP, także poniżej progu poziomu.',
  ],
  juzDzis: 'Dziś już zmieniałeś poziom trudności. Następna zmiana – jutro.',
  zmieniony: (nazwa: string) => `⚖ Wariant przygody: ${nazwa}`,
  blad: 'Nie udało się zmienić poziomu – spróbuj za chwilę.',
};

/**
 * The level is kept as an age (players.age: 6, 9, 12, 18 or 19); characters
 * made before the slider keep the age they typed.
 */
export function trudnoscZWieku(age: number) {
  return age <= 10 ? 0 : age <= 18 ? 2 : 4;
}

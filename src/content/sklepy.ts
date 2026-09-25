// ============================================================================
//  SKLEPY, SZKOŁY I OWOCE
//  Sklepy są w prawdziwych Biedronkach, Lidlach, Lewiatanach i Delikatesach
//  Centrum (z mapy OpenStreetMap), szkoły umiejętności w prawdziwych szkołach.
//  Glut ma 3 punkty życia: kijkiem potrzeba 3 uderzeń.
// ============================================================================

// Broń, zbroje i umiejętności są teraz w przedmioty.ts.

// ----------------------------------------------------------------------------
//  OWOCE – rosną na działkach, trawnikach i w parkach. Drzewo strąca się
//  mieczem: każde uderzenie zrzuca jeden owoc (2–5 na drzewo). Owoce
//  sprzedaje się w sklepie. Po ponownym uruchomieniu gry drzewa odrastają.
// ----------------------------------------------------------------------------
export type Owoc = 'jablko' | 'sliwka' | 'winogrono';

export const OWOCE: Record<Owoc, { nazwa: string; mnoga: string; cena: number }> = {
  jablko: { nazwa: 'jabłko', mnoga: 'jabłka', cena: 2 },
  sliwka: { nazwa: 'śliwka', mnoga: 'śliwki', cena: 3 },
  winogrono: { nazwa: 'winogrono', mnoga: 'winogrona', cena: 5 },
};

/** Ile drzew na 1000 m² zieleni (i najwyżej ile na jeden trawnik/działki). */
export const DRZEWA = { na1000m2: 0.5, maksNaObszar: 16, minimalnyObszarM2: 1200 };

/** Jedzenie owoców leczy: tyle owoców (dowolnych, najpierw najtańsze) = jedno serduszko. */
export const LECZENIE_OWOCAMI = { owocow: 20, serduszek: 1 };

// ============================================================================
//  SKLEPY, SZKOŁY I OWOCE
//  Sklepy są w prawdziwych Biedronkach, Lidlach, Lewiatanach i Delikatesach
//  Centrum (z mapy OpenStreetMap), szkoły umiejętności w prawdziwych szkołach.
//  Chochlik ma 3 punkty życia: kijkiem potrzeba 3 uderzeń.
// ============================================================================

// Broń, zbroje i umiejętności są teraz w przedmioty.ts.

// ----------------------------------------------------------------------------
//  OWOCE – rosną na działkach, trawnikach i w parkach. Drzewo strąca się
//  mieczem: każde uderzenie zrzuca jeden owoc (2–5 na drzewo). Owoce
//  sprzedaje się w sklepie. Po ponownym uruchomieniu gry drzewa odrastają.
// ----------------------------------------------------------------------------
// Grzyby i drewno leżą w plecaku tak jak owoce i też sprzedaje się je w sklepie.
export type Owoc = 'jablko' | 'sliwka' | 'winogrono' | 'grzyb' | 'drewno';

/** jadalne – czy można to zjeść, żeby się leczyć (drewna się nie je). */
export const OWOCE: Record<Owoc, { nazwa: string; mnoga: string; cena: number; jadalne: boolean }> = {
  jablko: { nazwa: 'jabłko', mnoga: 'jabłka', cena: 2, jadalne: true },
  sliwka: { nazwa: 'śliwka', mnoga: 'śliwki', cena: 3, jadalne: true },
  winogrono: { nazwa: 'winogrono', mnoga: 'winogrona', cena: 5, jadalne: true },
  grzyb: { nazwa: 'grzyb', mnoga: 'grzyby', cena: 6, jadalne: true },
  drewno: { nazwa: 'drewno', mnoga: 'drewno', cena: 12, jadalne: false },
};

// ----------------------------------------------------------------------------
//  LAS – w lasach rosną grzyby (zbiera się je, wchodząc na nie) i drzewa do
//  ścięcia (kilka uderzeń bronią = jedno drewno). Po ponownym uruchomieniu
//  gry wszystko odrasta.
//  kratka – las dzieli się na kratki o takim boku (metry); w każdej może być
//  kilka grzybów (grzybowNaKratke prób, każda z szansą szansaGrzyb) i drzewo
//  do ścięcia, z podaną szansą.
// ----------------------------------------------------------------------------
export const LAS = { kratkaM: 30, grzybowNaKratke: 3, szansaGrzyb: 0.45, szansaDrzewo: 0.45, uderzenNaDrzewo: 4 };

/** Ile drzew na 1000 m² zieleni (i najwyżej ile na jeden trawnik/działki). */
export const DRZEWA = { na1000m2: 0.5, maksNaObszar: 16, minimalnyObszarM2: 1200 };

/**
 * KAMIEŃ MOCY – do kupienia w świątyniach. Gdy bohater zginie, kamień się
 * rozsypuje i wskrzesza go (w hotelu, w którym ostatnio spał, albo w domu),
 * zamiast śmierci na zawsze. Cena w monetach albo w złotówkach (płatności wkrótce).
 */
export const KAMIEN_MOCY = { cena: 1_000_000_000, zlotych: 10 };

/** Jedzenie owoców leczy: tyle owoców (dowolnych, najpierw najtańsze) = jedno serduszko. */
export const LECZENIE_OWOCAMI = { owocow: 20, serduszek: 1 };

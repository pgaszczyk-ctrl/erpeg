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
// Grzyby, warzywa i drewno leżą w plecaku tak jak owoce i też sprzedaje się je
// w sklepie. W plecaku liczy się grupa (owoce, warzywa, grzyby, drewno): jedna
// grupa = jedno miejsce, a to, ile jest czego, gra pamięta tylko do sprzedaży
// (różne ceny). W innych krajach mogą dojść inne owoce i warzywa.
export type Owoc = 'jablko' | 'sliwka' | 'winogrono' | 'marchewka' | 'brokul' | 'salata' | 'grzyb' | 'drewno';
export type Grupa = 'owoce' | 'warzywa' | 'grzyby' | 'drewno';

/** jadalne – czy można to zjeść, żeby się leczyć (drewna się nie je). */
export const OWOCE: Record<Owoc, { nazwa: string; mnoga: string; cena: number; jadalne: boolean; grupa: Grupa }> = {
  jablko: { nazwa: 'jabłko', mnoga: 'jabłka', cena: 2, jadalne: true, grupa: 'owoce' },
  sliwka: { nazwa: 'śliwka', mnoga: 'śliwki', cena: 3, jadalne: true, grupa: 'owoce' },
  winogrono: { nazwa: 'winogrono', mnoga: 'winogrona', cena: 5, jadalne: true, grupa: 'owoce' },
  marchewka: { nazwa: 'marchewka', mnoga: 'marchewki', cena: 2, jadalne: true, grupa: 'warzywa' },
  brokul: { nazwa: 'brokuł', mnoga: 'brokuły', cena: 3, jadalne: true, grupa: 'warzywa' },
  salata: { nazwa: 'sałata', mnoga: 'sałata', cena: 3, jadalne: true, grupa: 'warzywa' },
  grzyb: { nazwa: 'grzyb', mnoga: 'grzyby', cena: 1, jadalne: true, grupa: 'grzyby' },
  drewno: { nazwa: 'drewno', mnoga: 'drewno', cena: 12, jadalne: false, grupa: 'drewno' },
};

/** Grupy w plecaku: nazwa i ikonka (kilka owoców naraz). */
export const GRUPY: Record<Grupa, { nazwa: string; ikona: string }> = {
  owoce: { nazwa: 'Owoce', ikona: '🍎🍇' },
  warzywa: { nazwa: 'Warzywa', ikona: '🥕🥦' },
  grzyby: { nazwa: 'Grzyby', ikona: '🍄' },
  drewno: { nazwa: 'Drewno', ikona: '🪵' },
};

/**
 * WARZYWA rosną na działkach i polach grządkami: rzedow × wRzedzie sztuk jednego gatunku
 * (w kratce z szansą `szansa`). Uderz warzywo – pasek zapełnia się przez zbiorSekund
 * i dopiero wtedy jest zebrane. Odrastają przy każdym wejściu do gry.
 */
export const WARZYWA = { szansa: 0.25, rzedow: 3, wRzedzie: 4, zbiorSekund: 2, rodzaje: ['marchewka', 'brokul', 'salata'] as Owoc[] };

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
 * WSKRZESZENIE za diamenty (zastąpiło kamień mocy, 4 X 2026). Gdy bohater
 * zginie, a ma tyle diamentów, gra pyta: „Porażka. Moc diamentów może cię
 * ocalić…” – wraca do życia w hotelu, w którym ostatnio spał, albo w domu.
 * Tyle samo kosztuje wskrzeszenie martwej postaci w menu (po pierwszym,
 * darmowym). Pokrętło w panelu admina: `wskrzeszenie_diamenty`.
 */
export const WSKRZESZENIE = { diamentow: 10 };

/**
 * DIAMENT – waluta premium (kupowana w banku: za monety albo prawdziwe
 * pieniądze, płatności wkrótce). Za diamenty woźnica zawiezie do dowolnego
 * miasta, w którym już się było (`dowolneMiasto`), a za kolejne dojedzie
 * `razySzybciej` razy szybciej (`szybciej`).
 */
export const DIAMENT = { monet: 1_000_000, euro: 2, dowolneMiasto: 1, szybciej: 1, razySzybciej: 2 };

/**
 * ALCHEMIK – na stacjach benzynowych. Przerabia owoce (dowolne jadalne, najpierw
 * najtańsze) na miksturę leczącą: całe zdrowie i dodatkowe serduszko w innym
 * kolorze na kilka minut. Miksturę pije się przyciskiem leczenia (🧪, klawisz H).
 */
export const ALCHEMIK = { owocow: 50, premiaSerc: 1, premiaMinut: 10 };


/** Jedzenie owoców leczy: tyle owoców (dowolnych, najpierw najtańsze) = jedno serduszko. */
export const LECZENIE_OWOCAMI = { owocow: 20, serduszek: 1 };

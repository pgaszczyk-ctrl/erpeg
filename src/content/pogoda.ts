// ============================================================================
//  POGODA – prawdziwa pogoda za oknem (prognoza MET Norway, pobierana przez
//  serwer 3 razy dziennie dla kwadratów ok. 33 × 31 km; gra dostaje gotowe
//  godziny) i jej wpływ na grę.
//  `?pogoda=czysto|pochmurno|deszcz|ulewa|burza|snieg|mgla` wymusza pogodę
//  (do testów i pokazów), `?pogoda=prawdziwa` wraca do prognozy.
// ============================================================================

export type Pogoda = 'czysto' | 'pochmurno' | 'deszcz' | 'ulewa' | 'burza' | 'snieg' | 'mgla';

export const POGODA = {
  /** Co ile minut gra pyta serwer o pogodę (prognoza i tak zmienia się rzadko). */
  odswiezMin: 60,
  /** Od ilu mm deszczu na godzinę uznajemy, że pada, i od ilu – że leje. */
  padaOdMm: 0.1,
  ulewaOdMm: 2.5,
  /** Od ilu % zachmurzenia jest „pochmurno”. */
  pochmurnoOd: 80,
  /** Śnieg na ziemi (cm): od ilu drobny (trawa przebija), od ilu duży (wszystko białe). Grafika śniegu – po paczce od grafika. */
  snieg: { drobnyOdCm: 1, duzyOdCm: 10 },
  /** Ikona i nazwa w HUD. */
  opis: {
    czysto: { ikona: '☀️', noc: '🌙', nazwa: 'pogodnie' },
    pochmurno: { ikona: '☁️', noc: '☁️', nazwa: 'pochmurno' },
    deszcz: { ikona: '🌧', noc: '🌧', nazwa: 'pada' },
    ulewa: { ikona: '🌧', noc: '🌧', nazwa: 'leje' },
    burza: { ikona: '⛈', noc: '⛈', nazwa: 'burza' },
    snieg: { ikona: '🌨', noc: '🌨', nazwa: 'pada śnieg' },
    mgla: { ikona: '🌫', noc: '🌫', nazwa: 'mgła' },
  } as Record<Pogoda, { ikona: string; noc: string; nazwa: string }>,
};

/** Co widać: krople/płatki na ekranie (ile na 100×100 px widoku), przyciemnienie, mgła, błyski. */
export const EFEKTY_POGODY: Record<Pogoda, { krople?: number; platki?: number; ciemniej?: number; mgla?: number; blyski?: boolean }> = {
  czysto: {},
  pochmurno: { ciemniej: 0.08 },
  deszcz: { krople: 3, ciemniej: 0.14 },
  ulewa: { krople: 7, ciemniej: 0.22 },
  burza: { krople: 8, ciemniej: 0.3, blyski: true },
  snieg: { platki: 3, ciemniej: 0.06 },
  mgla: { mgla: 0.42, ciemniej: 0.05 },
};

/** Czy w tej pogodzie „pada” (dla potworów wodnych i mieszkańców). */
export const MOKRO: Pogoda[] = ['deszcz', 'ulewa', 'burza'];

/**
 * Wpływ na potwory: mnożnik siły (życie i obrażenia) albo `znika` (nie pojawia się wcale).
 * Brak wpisu = bez zmian. Smok z historii jest ognisty: w deszczu słabszy, ale nie znika (historia go potrzebuje).
 */
export const WPLYW_NA_POTWORY: Partial<Record<string, Partial<Record<Pogoda, { sila?: number; znika?: boolean }>>>> = {
  // Smoki (rodzaj z historii = ognisty).
  smok: { deszcz: { sila: 0.7 }, ulewa: { sila: 0.55 }, burza: { sila: 0.55 }, snieg: { sila: 0.85 } },
  smok_ognisty: { deszcz: { sila: 0.7 }, ulewa: { znika: true }, burza: { znika: true } },
  smok_wodny: { deszcz: { sila: 1.2 }, ulewa: { sila: 1.2 }, burza: { sila: 1.2 } },
  // Wodne stwory: w deszczu 20% mocniejsze.
  blob: { deszcz: { sila: 1.2 }, ulewa: { sila: 1.2 }, burza: { sila: 1.2 } },
  wodnik: { deszcz: { sila: 1.2 }, ulewa: { sila: 1.2 }, burza: { sila: 1.2 } },
};

/** Kto jest w gangach zależnie od pory i pogody. */
export const SKLAD_GANGOW = {
  /** Zwykle: tyle bandytów (rzezimieszków) zamiast chochlików. */
  bandyciDzien: 0.1,
  /** W nocy więcej rzezimieszków niż chochlików. */
  bandyciNoc: 0.6,
  /** W deszczu chochliki zamieniają się w wodne bloby, a co `blobowNaWodnika` blobów stoi wodnik (ich pan). */
  blobowNaWodnika: 3,
};

/** Wodnik: przywołuje bloby kilka metrów od bohatera, najwyżej `maksBlobow` naraz, co `przerwaMs`; potem stoi i czaruje. */
export const WODNIK = {
  maksBlobow: 2,
  przerwaMs: 1800,
  /** Jak daleko od bohatera pojawia się blob (m). */
  blobOdBohateraM: [3, 5] as [number, number],
  /** Trzyma się tak daleko od bohatera (m) – ucieka, gdy ten podejdzie bliżej. */
  dystansM: 12,
  /** Po śmierci wodnika jego bloby się rozpływają. */
  blobyZnikajaZNim: true,
  /** Kolor nici magii między wodnikiem a jego blobami. */
  kolorMagii: 0x6fd3ff,
};

/** Mieszkańcy w deszczu: mniej ich na ulicach, część z parasolem. */
export const LUDZIE_W_DESZCZU = { ilu: 0.5, parasol: 0.45, kolory: [0x2b4f7a, 0x7a2b3b, 0x2f6b46, 0x3a3a44, 0xb08a2e] };

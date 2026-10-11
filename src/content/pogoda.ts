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

/** Cloud shadows drifting over the map (WeatherFx): cover = generator amount odPokrycia + zaPokrycie × forecast cloud
 * (0.2 → ~10 % of the view in shadow, 0.65 → ~35 %), so even a full overcast leaves most of the ground in the sun. */
export const CIENIE_CHMUR = {
  odPokrycia: 0.2,
  zaPokrycie: 0.45,
  /** Alpha of the shadow's soft rim and of its core (0..255). */
  alfaLekka: 38,
  alfaPelna: 68,
};

/**
 * The hero's lamp (owner, 11 Oct 2026): a warm light AROUND the hero (a hole over him, so he isn't
 * blinded) and a cone lighting the way ahead in the direction he faces, like the old cone of sight.
 * Off by day (clouds and mist don't light it); it comes on after sunset and while it rains or snows.
 * Darkness = `zaOpady` while it rains/snows (`gdyPada`) + night (1 − daylight) × `zaNoc`;
 * the light fades in between `odCiemnosci` and `pelnaPrzy` of it, up to `moc`.
 */
export const POSWIATA_BOHATERA = {
  /** Reach of the cone ahead in map px (the hero is ~13 map px tall). */
  zasieg: 70,
  /** Radius of the glow around the hero, as a share of `zasieg` (owner: „to nie latarka tylko lampa” – a soft glow all around). */
  wokol: 0.6,
  /** Strength of the glow around vs the light ahead (0..1 of the texture). */
  wokolMoc: 0.85,
  stozekMoc: 0.4,
  /** The dark hole over the hero, as a share of `zasieg` (fully lit from `dziura` × 2). */
  dziura: 0.07,
  /** Half-angle of the cone in degrees (soft edge 15° more). */
  stozekStopni: 45,
  kolor: [255, 214, 150] as [number, number, number],
  moc: 0.42,
  /** Weather kinds in which the lamp is lit by day too (owner: „po zachodzie słońca lub pada”), and how strongly (0..1 of darkness). */
  gdyPada: ['deszcz', 'ulewa', 'burza', 'snieg'] as string[],
  zaOpady: 0.5,
  zaNoc: 1,
  odCiemnosci: 0.12,
  pelnaPrzy: 0.45,
  /** Flicker like a flame: ± this share of the light. */
  migotanie: 0.07,
};

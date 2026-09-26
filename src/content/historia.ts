// ============================================================================
//  GŁÓWNA HISTORIA: „Cień smoka”
//  1. Po minucie chodzenia nad bohaterem przelatuje cień smoka (i słychać pisk).
//  2. W szkołach i kościołach można zapytać o cienie – niektórzy coś wiedzą
//     i wysyłają na uczelnię (albo do ratusza, gdy w miejscowości nie ma uczelni).
//  3. Przy uczelni chodzi mag w spiczastej czapce. Od poziomu postaci 5 mówi,
//     że smoki wróciły, i wskazuje, gdzie widziano smoka.
//  4. Przy smoku: „Zabij bestię” (walka) albo „Zbadaj to cudo” (rozmowa).
//     Na koniec bohater dostaje tytuł pod imieniem.
//  Teksty można dowolnie zmieniać. {cel} = nazwa uczelni, {poziom} = wymagany poziom.
// ============================================================================

export const HISTORIA = {
  /** Po ilu sekundach chodzenia przelatuje cień smoka. */
  sekundDoCienia: 60,
  cien: 'Co to za cień? Trochę to było straszne… i ten pisk? Muszę się dowiedzieć więcej.',

  pytanie: '🐉 Zapytaj o cienie',
  /** Jaka część szkół i kościołów coś wie. */
  ktoWie: 0.5,
  nieWiedza: [
    'Cienie? Nic nie widziałem. Może ci się przywidziało?',
    'Nie mam pojęcia, o czym mówisz. Zapytaj gdzie indziej.',
    'Słyszałem jakiś pisk, ale myślałem, że to tramwaj. Nic więcej nie wiem.',
    'Nie, nie, ja się takimi bajkami nie zajmuję.',
  ],
  wiedza: [
    'Też go widziałem! Ogromny, skrzydlaty… Uczeni z miejsca „{cel}” na pewno coś wiedzą. Idź tam!',
    'Ciii… Mówią, że przy „{cel}” kręci się dziwny człowiek w spiczastej czapce. On wie więcej.',
    'Stare księgi mówiły, że kiedyś wrócą… Zapytaj w „{cel}”, tam mają najmądrzejsze głowy.',
  ],

  mag: {
    imie: 'Mag Albrecht',
    /** Z jakiego poziomu postaci mag zdradzi tajemnicę. */
    wymaganyPoziom: 5,
    zaSlaby: 'Hmm… Czuję, że widziałeś cień. Ale jesteś jeszcze za słaby na tę opowieść. Wróć, gdy osiągniesz {poziom}. poziom.',
    tekst: 'Więc i ty go widziałeś… Smoki wróciły! Po wiekach snu znów latają nad naszą ziemią. Jednego widziano niedawno za miastem, z dala od domów. Idź tam, jeśli się odważysz – strzałka pokaże ci drogę. Tylko pamiętaj: nie każdy smok jest zły.',
  },
  /** Jak daleko od budynków (metry) najlepiej, żeby siedział smok. */
  smokOdBudynkow: 500,

  spotkanie: 'Przed tobą, na polanie, leży prawdziwy smok! Jego łuski lśnią, a z nozdrzy unosi się dym. Patrzy prosto na ciebie.',
  zabij: '⚔ Zabij bestię',
  zbadaj: '🔍 Zbadaj to cudo',
  poZbadaj: 'Smok przekrzywia głowę i nie atakuje. Podejdź bliżej, może da się z nim porozmawiać.',
  rozmowa: [
    'Smok odzywa się głębokim głosem: „Nie bój się, mały człowieku. Od stu lat nikt nie odważył się ze mną porozmawiać.”',
    '„Kiedyś smoki i ludzie żyli razem. Pilnowaliśmy lasów i rzek, a ludzie przynosili nam jabłka i śliwki. Potem przyszła wielka wojna i zasnęliśmy głęboko pod ziemią.”',
    '„Teraz się budzimy. Ale chochliki, które widzisz na ulicach, też się obudziły… To one straszą ludzi, nie my.”',
    '„Jeśli chcesz, zostań moim przyjacielem. Razem przywrócimy dawny porządek. A to dopiero początek naszej historii…”',
  ],
  wygrana: 'Smok pada z hukiem. Ziemia drży, a nad lasem unosi się dym. Pokonałeś smoka!',
  tytulPogromca: 'Pogromca smoka',
  tytulBrat: 'Brat smoków',
  nagroda: { exp: 300, monety: 200 },
};

/** Ile EXP trzeba na dany poziom postaci: 2 = 100, 3 = 300, 4 = 600, 5 = 1000… */
export function expNaPoziom(poziom: number) {
  return 50 * (poziom - 1) * poziom;
}

/** Najwyższy poziom postaci. */
export const MAKS_POZIOM_POSTACI = 20;

export function poziomPostaci(exp: number) {
  let p = 1;
  while (p < MAKS_POZIOM_POSTACI && exp >= expNaPoziom(p + 1)) p++;
  return p;
}

/**
 * PREMIA ZA POZIOM: na poziomie 20 bohater ma 2× więcej życia (zycie: 1 =
 * +100%) i chodzi o 30% szybciej. Wzrost: ((poziom − 1) / 19) ^ wykladnik –
 * przy 0,77 poziomy 1→5 dają ok. 30% premii, 5→15 kolejne ok. 50%, 15→20
 * resztę (ok. 20%). Mniejszy wykładnik = więcej na początku.
 */
export const PREMIA_POZIOMU = { zycie: 1, szybkosc: 0.3, wykladnik: 0.77 };

/** Jaka część pełnej premii należy się na danym poziomie (0 na 1., 1 na 20.). */
export function czescPremii(poziom: number) {
  const t = Math.min(1, Math.max(0, (poziom - 1) / (MAKS_POZIOM_POSTACI - 1)));
  return Math.pow(t, PREMIA_POZIOMU.wykladnik);
}

/** Życie (w połówkach serduszek) przy danej liczbie serduszek z poziomu trudności i danym EXP. */
export function zyciePostaci(serca: number, exp: number) {
  return serca * 2 + Math.round(serca * 2 * PREMIA_POZIOMU.zycie * czescPremii(poziomPostaci(exp)));
}

/** Mnożnik szybkości chodzenia przy danym EXP. */
export function szybkoscPostaci(exp: number) {
  return 1 + PREMIA_POZIOMU.szybkosc * czescPremii(poziomPostaci(exp));
}

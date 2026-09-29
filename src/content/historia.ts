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
    tekst: 'Smoki wróciły! Kometa, która niedawno przecięła niebo, obudziła je z wiekowego snu. Kiedyś żyliśmy w zgodzie, ale ludzka chciwość w dawnej Wojnie o Tryby wygnała je w mrok. Teraz wracają, lecz uważaj – od tak długiego snu niektóre z nich zapadły na Rdzę Umysłu i postradały zmysły. Znalazłem leże za miastem. Musisz tam iść, zanim bestia zrobi krzywdę sobie lub komuś z nas.',
  },
  /**
   * WĘDROWNY MĘDRZEC: poza Lublinem zamiast maga Albrechta. Imię zależy od
   * kraju, w którym jest mapa (prostokąty lat/lon, sprawdzane po kolei), a z
   * dwóch imion wybiera się jedno stałe dla danej mapy. Kobiece imiona gra
   * weźmie, gdy grafik narysuje mędrczynię (MEDRCZYNI_JEST = true).
   */
  medrcy: [
    { kraj: 'CH/IT', lat: [45.8, 47.8], lon: [5.95, 10.5], m: ['Badacz Leonardo', 'Inżynier Lorenzo'], k: ['Badaczka Beatrycze', 'Inżynierka Katarzyna'] },
    { kraj: 'DE/AT', lat: [46.4, 49.0], lon: [9.5, 17.2], m: ['Alchemik Fryderyk', 'Uczony Otton'], k: ['Alchemiczka Matylda', 'Uczona Hildegarda'] },
    { kraj: 'PL', lat: [49.0, 54.9], lon: [14.1, 24.2], m: ['Mędrzec Kazimierz', 'Uczony Zygmunt'], k: ['Mędrczyni Jadwiga', 'Uczona Anna'] },
    { kraj: 'DE/AT', lat: [47.3, 55.1], lon: [5.9, 15.0], m: ['Alchemik Fryderyk', 'Uczony Otton'], k: ['Alchemiczka Matylda', 'Uczona Hildegarda'] },
    { kraj: 'UK', lat: [49.9, 60.9], lon: [-8.2, 1.8], m: ['Kronikarz Edward', 'Mag Artur'], k: ['Kronikarka Eleonora', 'Czarodziejka Elżbieta'] },
    { kraj: 'FR', lat: [42.3, 51.1], lon: [-4.8, 8.2], m: ['Filozof Filip', 'Astrolog Ludwik'], k: ['Filozofka Blanka', 'Astrolożka Joanna'] },
    { kraj: 'ES', lat: [36.0, 43.8], lon: [-9.3, 3.3], m: ['Nawigator Ferdynand', 'Kartograf Alfons'], k: ['Nawigatorka Izabela', 'Kartografka Urraka'] },
    { kraj: 'CH/IT', lat: [36.6, 47.1], lon: [6.6, 18.5], m: ['Badacz Leonardo', 'Inżynier Lorenzo'], k: ['Badaczka Beatrycze', 'Inżynierka Katarzyna'] },
  ],
  /** Gdzie indziej na świecie. */
  medrzecInnych: { m: ['Wędrowny Mędrzec'], k: ['Wędrowna Mędrczyni'] },
  /** Jak daleko od budynków (metry) najlepiej, żeby siedział smok. */
  smokOdBudynkow: 500,

  spotkanie: 'Przed tobą, na polanie, leży prawdziwy smok! Jego łuski lśnią, a z nozdrzy unosi się dym. Patrzy prosto na ciebie.',
  zabij: '⚔ Zabij bestię',
  zbadaj: '🔍 Zbadaj to cudo',
  poZbadaj: 'Smok przekrzywia głowę i nie atakuje. Podejdź bliżej, może da się z nim porozmawiać.',
  rozmowa: [
    'Smok odzywa się głębokim głosem: „Blask komety wyrwał mnie z ziemi… Wasz świat się zmienił. Pełno tu gryzącego dymu i ryczących maszyn parowych.”',
    '„Gdzie podziały się spokojne lasy, których strzegliśmy? Gdzie jabłka, które przynosili nam wasi przodkowie?”',
    '„Jeśli naprawdę pamiętasz dawny pakt, udowodnij to. Zagraj naszą melodię, a znów staniemy się waszymi strażnikami…”',
  ],
  /** Po zagraniu melodii (ui/melody.ts). */
  poMelodii: 'Smok przymyka ślepia i mruczy z zadowoleniem: „Tak… to nasza pieśń. Pamiętasz pakt. Od dziś znów będziemy strzec waszych lasów i rzek – a ty, Bracie smoków, nie zapomnij o jabłkach.”',
  wygrana: 'Smok pada z hukiem. Ziemia drży, a nad lasem unosi się dym. W jego oczach gaśnie mętny blask Rdzy Umysłu – już nikogo nie skrzywdzi. Pokonałeś smoka!',
  tytulPogromca: 'Pogromca smoka',
  tytulBrat: 'Brat smoków',
  nagroda: { exp: 300, monety: 200 },
};

/** Czy jest już obrazek mędrczyni (wtedy połowa map dostaje kobietę). */
export const MEDRCZYNI_JEST = false;

/** The wizard's name on a map: Mag Albrecht in Lublin, else a travelling sage by country (stable per map id). */
export function imieMedrca(mapId: string, lat: number, lon: number) {
  if (mapId === 'lublin') return HISTORIA.mag.imie;
  let h = 2166136261;
  for (let i = 0; i < mapId.length; i++) h = Math.imul(h ^ mapId.charCodeAt(i), 16777619);
  h >>>= 0;
  const c = HISTORIA.medrcy.find((r) => lat >= r.lat[0] && lat <= r.lat[1] && lon >= r.lon[0] && lon <= r.lon[1]) ?? HISTORIA.medrzecInnych;
  const list = MEDRCZYNI_JEST && h % 2 ? c.k : c.m;
  return list[(h >>> 1) % list.length];
}

/**
 * SMOCZA MELODIA (ścieżka „Brat smoków”): smok nuci nutki, widać je na
 * pięciolinii, a gracz powtarza je na fujarce (5 kolorowych klawiszy).
 * `nut` = ile nutek na danym poziomie trudności (Dziecięcy … Hardkor).
 */
export const MELODIA = {
  nut: [3, 4, 5, 6, 6],
  tytul: '🎵 Smocza melodia',
  wstep: 'Smok nuci cichą, starą melodię. Zagraj ją na fujarce – te same nutki po kolei.',
  smokNuci: 'Smok nuci:',
  twojaFujarka: 'Twoja fujarka:',
  jeszczeRaz: '🔁 Posłuchaj jeszcze raz',
  zle: 'Smok kręci łbem… Posłuchaj jeszcze raz.',
  dobrze: '✨ Pięknie! Smok nuci razem z tobą.',
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
/** Postać administratora (players.immortal, dziś Arceus) chodzi tyle razy szybciej – do sprawdzania miejsc na mapie. */
export const ADMIN_SZYBKOSC = 5;

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

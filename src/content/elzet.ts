// ============================================================================
//  ELZET 10 – quest właściciela (30.10.2026). Robotyczny ziomek z Kryształowej.
//  Kolejność: siedzi i paruje („bzzt”) → brakuje mu zębatki → chochliki przy Lidlu (Jana Pawła II 37)
//  biegają wokół zębatego kółka → po ich pokonaniu kółko do wzięcia → robot wstaje, kręci się, walczy
//  (walka 1) → przy 10% życia odchodzi na Nałęczowską 14 → walka 2 (czary + miecz) → przy 10% zostawia
//  Złotą piłkę na łańcuszku i odchodzi nad Zalew Zemborzycki → 10 żartów: po 5 jabłka, po 10 Buty biegacza.
//  Kod: scenes/Elzet.ts. Liczby walki są tymczasowe (właściciel: wartości zbalansujemy później).
// ============================================================================

/** Kroki questa (session.flagi.elzet). */
export const KROK = {
  nic: 0,
  /** Gracz obejrzał robota: szuka brakującej części. */
  szuka: 1,
  /** Ma zębate kółko: wraca do robota. */
  kolko: 2,
  /** Kółko włożone: robot stoi przy Kryształowej i walczy (walka 1). */
  walka1: 3,
  /** Robot czeka na Nałęczowskiej 14 (walka 2). */
  walka2: 4,
  /** Robot spaceruje nad Zalewem Zemborzyckim i opowiada żarty. */
  jezioro: 5,
  /** Wszystkie żarty wysłuchane, buty dane. */
  koniec: 6,
} as const;

export const ELZET = {
  imie: 'Elzet 10',
  /** Gdzie siedzi na początku (Kryształowa, Lublin – punkt od właściciela 30.10.2026). */
  start: { lat: 51.224225164808516, lon: 22.49834065154772 },
  /** Lidl przy Jana Pawła II 37 – tu chochliki biegają wokół zębatki. */
  lidl: { lat: 51.22543, lon: 22.50310 },
  /** Zębatka: górny skraj parkingu przed Lidlem (właściciel, 30.10.2026). */
  kolko: { lat: 51.22514, lon: 22.50250 },
  /** Nałęczowska 14 – plac między budynkami (sześciokąt między nr 14 i 16). */
  naleczowska: { lat: 51.24888, lon: 22.51782 },
  /** Domek nad Zalewem Zemborzyckim, wokół którego chodzi na końcu. */
  jezioro: { lat: 51.195750, lon: 22.535222 },

  /** Chochliki przy Lidlu: ile, w jakim kręgu biegają (m), od jakiej odległości się pojawiają (m). */
  chochliki: { ile: 5, krazaM: 5, pojawiajOdM: 450, znikajOdM: 900 },

  /**
   * Ile ciosów bohatera zabiłoby jego własną kopię – z tego liczy się życie robota i siła jego ciosów,
   * więc walka rośnie razem z bohaterem (właściciel: „jest zależny od poziomu gracza”).
   */
  ciosowNaKopie: 10,
  /** Przy jakiej części życia robot przerywa walkę (właściciel: po zabraniu 90%). */
  prog: 0.1,
  /** Walka 1 (Kryształowa): życie ×1,5 bohatera, chodzi i bije 1,5× szybciej, ciosy o połowę słabsze. */
  walka1: { zycie: 1.5, predkosc: 1.5, tempo: 1.5, sila: 0.5, exp: 50 },
  /** Walka 2 (Nałęczowska): życie ×2, chodzi 0,7× bohatera, czary szybciej niż bohater, siła ×0,5. */
  walka2: { zycie: 2, predkosc: 0.7, tempo: 1.5, sila: 0.5, exp: 100 },
  /** Zasięg miecza robota (m) i jego klina (połowa kąta, rad). */
  mieczM: 2.6,
  mieczKat: 0.9,
  /** Czary w walce 2: seria 3 strzałów, 2 serie, potem 3 ciosy mieczem – i od nowa. */
  czary: { naSerie: 3, serii: 2, ciosow: 3, predkoscM: 16, zasiegM: 22, trzymaM: 9, przerwaSeriiMs: 700 },
  /** Krótka czerwona zapowiedź przed każdym ciosem/strzałem (gra pokazuje każdy atak). */
  zapowiedzMs: 320,
  /** Bohater uciekł tak daleko (m) od miejsca walki: walka zaczyna się od nowa. */
  ucieczkaM: 70,
  /** Robot na wolnym biegu: podchodząc tak blisko (m), zaczynasz walkę 2 / wracasz do walki 1. */
  zaczepM: 12,
  /** Nad jeziorem chodzi wolno (× prędkość bohatera) po kółku wokół domku. */
  spacer: 0.08,
  /** Po ilu żartach jabłka, po ilu buty. */
  jablkaPo: 5,
  jablek: 10,
  butyPo: 10,
} as const;

export const ELZET_TEKSTY = {
  bzzt: ['Bzzt… bzt.', 'Bzzt. Bzt. Bzzzt…', 'Bzt… bzzt.'],
  ogledziny:
    'Robot siedzi na chodniku. Z rury na plecach syczy para, oczy migają bez ładu.\n\n' +
    'Jest ciężki, solidnie skręcony – ale w boku ziała pusta oś, jakby ktoś wyrwał z niego zębatkę. ' +
    'Na pancerzu świeże rysy. Ktoś musiał go niedawno uszkodzić.\n\nNa tabliczce: „ELZET 10”.',
  celSzukaj: 'Elzet 10: znajdź brakującą zębatkę (podobno chochliki kręcą się przy Lidlu)',
  pilnuja: 'Chochliki nie dają podejść do zębatki – najpierw je przegoń!',
  znalezione: '⚙ Zębate kółko! Wygląda na część jakiejś maszyny… Podobno na Kryształowej siedzi zepsuty robot.',
  celZnalezione: 'Zębatka od maszyny – może pasuje do robota na Kryształowej?',
  mamKolko: '⚙ Masz zębate kółko! Pasuje jak ulał do robota z Kryształowej.',
  celWroc: 'Elzet 10: zanieś zębatkę robotowi (Kryształowa)',
  wloz: '⚙ Włóż zębatkę',
  wkladasz: 'Zębatka wskakuje na oś z głośnym KLIK. Robot drży, para bucha z rury…',
  wstal:
    'BZZT. Systemy: sprawne. Jednostka ELZET 10 aktywna.\n\n' +
    'Analiza celu… Organizm. Poziom zagrożenia: do sprawdzenia.\n\nRozpoczynam test bojowy.',
  walcz: '⚔ Walcz',
  celWalka1: 'Elzet 10: robot chce cię sprawdzić – walcz!',
  wracaDoWalki: 'BZZT. Test bojowy nieukończony. Kontynuacja.',
  przerwa1: 'Niepowodzenie. Potrzebny rozwój.\n\nWidzimy się na Nałęczowskiej.',
  celNaleczowska: 'Elzet 10 czeka na Nałęczowskiej 14',
  spotkanie2: 'BZZT. Rozwój ukończony. Moduł magiczny: aktywny.\n\nTest bojowy, podejście drugie.',
  przerwa2: 'Może jednak mam inne przeznaczenie?…',
  pilka: '✨ Elzet 10 zostawił Złotą piłkę na łańcuszku!',
  celJezioro: 'Elzet 10: podobno widziano go nad Zalewem Zemborzyckim',
  celZarty: (n: number) => `Elzet 10 opowiada żarty nad Zalewem (${n}/10)`,
  jedz: 'Dobrze rozmawiać. Jeść?',
  nagrodaJablka: (n: number) => `Elzet 10 wyciąga z klapy w brzuchu ${n} jabłek i podaje ci je z dumą.`,
  nagrodaButy: 'Elzet 10 wyjmuje z pancerza parę lekkich butów. Dostajesz Buty biegacza – chodzisz w nich o 10% szybciej.',
  buty: 'Trzymaj. Prosto z butiku.',
  posluchaj: '😄 Posłuchaj żartu',
  pa: 'Do zobaczenia',
  powitanie: 'BZZT. Organizm! Dobrze, że jesteś. Mam nowy moduł: humor. Test?',
  potem:
    'BZZT. Żarty: wyczerpane. Kiedyś może pójdę z tobą w drogę. Na razie pilnuję domku.',
  /** The owner's list (31 Oct 2026); Polish and English jokes are separate, not translations. */
  zarty: [
    { pl: "Jak nazywa się bumerang, który nie wraca? Patyk.", en: "What do you call a boomerang that won’t come back? A stick." },
    { pl: "Dlaczego książka do matematyki jest zawsze smutna? Bo ma pełno problemów.", en: "Why did the math book look sad? Because it had too many problems." },
    { pl: "Co mówi ściana do ściany? Spotkajmy się w rogu.", en: "What do you call a fake noodle? An impasta." },
    { pl: "Czym się różni Manchester United od trójkąta? Trójkąt regularnie ma trzy punkty.", en: "What’s the difference between Manchester United and a triangle? A triangle actually has three points." },
    { pl: "Jak się nazywa pies, który umie sztuczki magiczne? Labrakadabrador.", en: "What do you call a magic dog? A labracadabrador." },
    { pl: "Dlaczego szkielety nigdy się nie biją? Bo nie mają do tego serca.", en: "Why don't skeletons fight each other? They don't have the guts." },
    { pl: "Jaką rybę matematycy lubią łowić najbardziej? Suma.", en: "What do you call cheese that isn't yours? Nacho cheese." },
    { pl: "Dlaczego wąż nie bije brawa? Bo nie ma rąk.", en: "Why couldn't the bicycle stand up by itself? It was two tired." },
    { pl: "Jak się nazywa żona rosyjskiego księdza (popa)? Popażona.", en: "What do you call a factory that makes just okay products? A satisfactory." },
    { pl: "Co mówi ksiądz zaraz po ślubie informatyka? Pobieranie zakończone.", en: "Why did the scarecrow win an award? Because he was outstanding in his field." },
  ],

} as const;

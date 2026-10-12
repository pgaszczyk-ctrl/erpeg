// ============================================================================
//  PRÓBY MAGA – co robić w „Cieniu smoka” przed poziomem 5 (właściciel,
//  12.10.2026: „śmiało pisz i rób próby maga”; propozycja Q-20261012-P002).
//
//  0. Osmalona łuska: zaraz po przelocie cienia coś spada niedaleko – podnieś.
//  Potem pytasz o cienie w szkołach i świątyniach (jak dotąd) i trafiasz do maga.
//  Za słabego na smoka mag nie odsyła, tylko zleca próby, po kolei:
//   1. gang  – rozbij najbliższy gang chochlików (uciekły przed cieniem),
//   2. lekcja – w szkole albo bibliotece wysłuchaj opowieści o smokach i odpowiedz,
//   3. krag  – znajdź wypalony krąg w polu/lesie (strzałka tylko w okolicę),
//   4. mikstura – zanieś alchemikowi (stacja paliw) owoce/grzyby na miksturę.
//  Po każdej próbie mosiężny gołąb maga przynosi liścik z kawałkiem historii.
//  Próby, której nie da się zrobić (brak takiego miejsca w okolicy), gra
//  pomija, a jej EXP dolicza do następnej. Na poziomie 5 – wracasz do maga.
//  Teksty można dowolnie zmieniać. EXP do zbalansowania później.
// ============================================================================

export type Proba = 'gang' | 'lekcja' | 'krag' | 'mikstura';

export const PROBY_MAGA = {
  kolejnosc: ['gang', 'lekcja', 'krag', 'mikstura'] as Proba[],

  luska: {
    /** Jak daleko od bohatera spada łuska (metry). */
    odlegloscM: [35, 80] as [number, number],
    exp: 30,
    cel: 'Coś spadło z cienia – sprawdź, co to',
    znalezione: 'Na bruku leży jeszcze ciepła łuska, wielka jak dłoń. Pachnie dymem i… jabłkami? To nie był ptak. Trzeba zapytać mądrzejszych – w szkołach albo świątyniach ktoś musi coś wiedzieć.',
  },

  /** Mag do bohatera poniżej wymaganego poziomu – pierwszy raz. */
  wstep: 'Widziałeś cień… i masz smoczą łuskę! Nie mylisz się – to był smok. Ale na spotkanie z nim jesteś jeszcze za słaby: niektóre smoki chorują na Rdzę Umysłu i nie poznają przyjaciela.\n\nPotrzebuję jednak zwiadowcy. Zrobisz dla mnie kilka prób – po każdej mój mosiężny gołąb przyniesie ci liścik. A gdy osiągniesz {poziom}. poziom, wróć do mnie.',
  wstepBez: 'Widziałeś cień? Nie mylisz się – to był smok. Ale na spotkanie z nim jesteś jeszcze za słaby: niektóre smoki chorują na Rdzę Umysłu i nie poznają przyjaciela.\n\nPotrzebuję jednak zwiadowcy. Zrobisz dla mnie kilka prób – po każdej mój mosiężny gołąb przyniesie ci liścik. A gdy osiągniesz {poziom}. poziom, wróć do mnie.',
  /** Kolejne rozmowy z magiem w trakcie prób. */
  wTrakcie: 'Jak idzie? Teraz: {proba}.\n\nMasz {poziomTeraz}. poziom – na smoka potrzeba {poziom}.',
  poProbach: 'Zrobiłeś wszystko, o co prosiłem. Brakuje ci jeszcze {brak} EXP do {poziom}. poziomu. Rozbijaj gangi, odpowiadaj na pytania w szkołach, pomagaj ludziom – i wracaj.',
  gotowy: 'Masz już {poziom}. poziom! Wróć do maga – {cel}.',
  golab: '🕊 Mosiężny gołąb maga',
  nastepna: 'Następna próba: {proba}.',
  koniecProb: 'To była ostatnia próba. Nabieraj krzepy i wróć do mnie na {poziom}. poziomie.',
  krzepa: 'Nabierz krzepy: poziom {teraz}/{poziom} (brakuje {brak} EXP)',
  wroc: 'Wróć do maga: {cel}',

  gang: {
    exp: 150,
    nazwa: 'rozbij gang chochlików',
    cel: 'Rozbij gang chochlików (czerwona mgła)',
    szukaj: 'Znajdź gang chochlików – czerwona mgła',
    zlecenie: 'Chochliki zawsze pierwsze czują smoka. Po przelocie cienia zbiły się w gangi i rozrabiają. Rozbij jeden z nich – jego herszt na pewno coś widział.',
    liscik: '„Brawo! Herszt wyśpiewał, że cień leciał nisko, nad samymi dachami. Za czasów Paktu chochliki siedziały cicho w kominach, bo smoki grzały kotły całych miast. Dziś bez smoków rozzuchwaliły się w gangi.”',
  },
  lekcja: {
    exp: 120,
    nazwa: 'posłuchaj lekcji o smokach',
    cel: 'Lekcja o smokach: {miejsce}',
    zlecenie: 'Zajrzyj do najbliższej szkoły albo biblioteki. Tam pamiętają stare opowieści o smokach – posłuchaj uważnie.',
    tytul: '📖 Lekcja o smokach',
    zle: 'Hmm, nie do końca. Posłuchaj jeszcze raz.',
    koniec: 'Świetnie! Teraz wiesz o smokach więcej niż niejeden profesor.',
    liscik: '„Dobrze słuchałeś. Pamiętaj: nie każdy smok jest zły. Niektóre tylko chorują na Rdzę Umysłu – i może da się im pomóc.”',
    rundy: [
      {
        opowiesc: 'Dawno temu ludzie i smoki zawarli Pakt. Smoki ogrzewały oddechem wielkie kotły, a z kotłów płynęła para do fabryk i domów. W zamian ludzie przynosili im jabłka i strzegli ich gniazd.',
        pytanie: 'Co smoki dawały ludziom w czasach Paktu?',
        odpowiedzi: ['Ciepło do kotłów', 'Złote monety', 'Mapy skarbów'],
      },
      {
        opowiesc: 'Potem ludziom zachciało się coraz więcej pary. Wybuchła Wielka Wojna o Tryby i z chciwości ludzie zwrócili się przeciw smokom. Smoki odleciały w góry i zapadły w długi sen.',
        pytanie: 'Dlaczego smoki odeszły?',
        odpowiedzi: ['Przez ludzką chciwość w Wojnie o Tryby', 'Bo zabrakło jabłek', 'Bo przyszła mroźna zima'],
      },
      {
        opowiesc: 'Niedawno nad światem przeleciała Kometa. Jej blask obudził smoki. Ale po tak długim śnie niektóre zachorowały na Rdzę Umysłu – są zagubione i groźne.',
        pytanie: 'Co obudziło smoki?',
        odpowiedzi: ['Kometa', 'Burza z piorunami', 'Gwizdek pociągu'],
      },
    ],
  },
  krag: {
    exp: 200,
    nazwa: 'odszukaj miejsce lądowania smoka',
    cel: 'Szukaj wypalonego kręgu – gdzieś tutaj',
    zlecenie: 'Ludzie mówią, że za miastem coś wylądowało i spaliło trawę w krąg. Wiem tylko mniej więcej gdzie – resztę musisz wypatrzeć sam.',
    znalezione: 'Jest! Trawa wypalona w idealny krąg, a pośrodku kolejna łuska. Smok tu odpoczywał.',
    liscik: '„Krąg to ślad lądowania. Smok przysiadł, odpoczął i poleciał dalej… Coraz lepiej wiem, gdzie jest jego leże.”',
    /** O ile metrów strzałka może się mylić. */
    mylenieM: 40,
  },
  mikstura: {
    exp: 100,
    ile: 15,
    nazwa: 'zanieś alchemikowi {ile} owoców lub grzybów',
    cel: 'Zanieś {ile} owoców/grzybów alchemikowi (masz {masz})',
    zlecenie: 'Bez mikstury nie podchodź do smoka – ogień parzy, a kwas gryzie. Zbierz {ile} owoców albo grzybów i zanieś je alchemikowi na stacji benzynowej. Uprzedziłem go.',
    zaMalo: 'Alchemik zagląda ci do plecaka: „Mag mówił o {ile} owocach albo grzybach. Masz {masz}. Wróć, jak uzbierasz.”',
    zrobione: 'Alchemik wrzuca owoce do bulgoczącego kociołka. „Proszę – mikstura od maga. Wypijesz ją, dotykając kotła życia na dole ekranu (albo klawiszem H). Wyleczy cię całego.”',
    liscik: '„Mikstura w plecaku? To dobrze. Ze smokiem nigdy nie wiadomo.”',
    /** Jak daleko (km) może być alchemik, żeby dało się zrobić próbę. */
    maksKm: 5,
  },
  /** Gołąb: jak daleko (m) od miejsca próby trzeba podejść, żeby zadziałała. */
  podejdzM: 12,
};

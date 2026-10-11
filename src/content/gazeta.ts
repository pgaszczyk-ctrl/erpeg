// The newsboy (gazeciarz, owner 11 Oct 2026): in every town, more of them in bigger towns. He sells the
// „Kurier Parowy”: what changed in the game, what is planned, a reporter's errand, and a letter to the
// editors where the player can order a quest / describe an adventure (RPC order_quest → table quest_orders,
// read by the owner in the admin panel; untrusted player text, ideas only).

export const GAZETA = {
  tytul: 'Kurier Parowy',
  podtytul: 'Gazeta codzienna dla wszystkich exp-lorerów',
  /** How many newsboys a 1 km square gets, by how many places (shops, offices, temples…) it has. */
  ilu: [
    { miejsc: 60, ile: 3 },
    { miejsc: 25, ile: 2 },
    { miejsc: 6, ile: 1 },
  ],
  /** Their look: the artist's newsboy trial v2 (order 32: standing frames only, so they stand on a corner). */
  wyglad: 'hd-gazeciarz',
  /** The masthead picture (artist, 32-G003); the page title stays only for screen readers. */
  winieta: 'gazeta/winieta_poziomy.png',
  imiona: ['Gazeciarz Felek', 'Gazeciarz Józek', 'Gazeciarz Staś', 'Gazeciarz Kazio', 'Gazeciarka Mania', 'Gazeciarka Zocha', 'Gazeciarz Tadzio', 'Gazeciarka Hela'],
  okrzyki: [
    'Nadzwyczajne wydanie! Nadzwyczajne wydanie!',
    'Kurier Parowy! Najświeższe wieści!',
    'Smoki nad miastem? Czytajcie w Kurierze!',
    'Gazeta, gazeta! Kto chce gazetę?',
  ],
  /** Longest letter to the editors. */
  maksListu: 500,
};

/** The reporter's errand: go to a place in town and write a note there (finishes on the spot). */
export const REPORTAZ = {
  odM: 250,
  doM: 1100,
  monetNaKm: 30,
  minMonet: 15,
  expNaKm: 60,
  minExp: 25,
  tytuly: ['Reportaż: {cel}', 'Sensacja przy {cel}!', 'Plotki spod {cel}', 'Co słychać przy {cel}?'],
  opisy: [
    'Redakcja słyszała, że przy {cel} z kanałów bucha dziwnie kolorowa para. Idź tam, rozejrzyj się i spisz notatkę – wydrukujemy ją jutro na pierwszej stronie!',
    'Mieszkańcy piszą, że koło {cel} chochliki podmieniają szyldy. Sprawdź, co się tam dzieje, i zanotuj wszystko, co zobaczysz.',
    'Podobno przy {cel} ktoś widział cień smoka w kałuży. Bzdura czy sensacja? Idź i sprawdź na własne oczy.',
    'Przy {cel} otwarto ponoć nowy parowy wynalazek. Zajrzyj tam i opisz go naszym czytelnikom.',
  ],
  komunikat: 'Notatka spisana! Gazeciarz odbierze ją przy następnym wydaniu, a honorarium już trafiło do sakiewki.',
};

/** „Ludzie” – the daily rankings (RPC kurier_wydanie; test characters never appear). */
export const RANKINGI = {
  tytul: 'Ludzie z naszych łamów',
  wczoraj: 'Wydanie z {dzien}: kto wędrował najdalej i kto dokonał rzeczy wielkich.',
  dzis: 'Pierwsze wydanie rankingów – redakcja liczy na bieżąco, co dzieje się dzisiaj.',
  czekam: 'Gazeciarz wyciąga z torby najświeższe wydanie…',
  brak: 'Dziś gazeciarz nie dostał rankingów z drukarni (brak połączenia?). Zajrzyj później.',
  pusto: 'Tu wczoraj było cicho – może ty trafisz do jutrzejszego wydania?',
  km: 'Najdalej wędrowali',
  wybitne: 'Wybitne osiągnięcia',
  swiat: 'Świat',
  gratulacje: 'Gratulacje od redakcji!',
  moje: 'Wczoraj do twojej Księgi osiągnięć trafiła nowa pieczęć: {odznaki}. Kurier Parowy pisze o tobie!',
  mojeDzis: 'Dziś do twojej Księgi osiągnięć trafiła nowa pieczęć: {odznaki}. Kurier Parowy pisze o tobie!',
  mojeKm: 'Przebyta droga tego dnia: {km} km.',
  stopka: 'Rankingi drukujemy codziennie o północy. Liczą się kilometry przebyte pieszo i odznaki z Księgi osiągnięć.',
};

export interface Wiesc {
  data: string;
  tytul: string;
  tresc: string;
}

/** „Co nowego” – newest first. Written for players, short and without jargon. */
export const NOWOSCI: Wiesc[] = [
  {
    data: '11.10.2026', tytul: 'Codzienne rankingi w Kurierze',
    tresc: 'Na stronie „Ludzie” gazeta pisze, kto wczoraj przewędrował najwięcej kilometrów na świecie, w twoim kraju i mieście, i kto zdobył wybitne odznaki. Jeśli i ty zdobędziesz pieczęć – redakcja ci pogratuluje!',
  },
  {
    data: '11.10.2026', tytul: 'Gazeciarze na ulicach!',
    tresc: 'W każdym mieście biegają gazeciarze z Kurierem Parowym. Mają zlecenia reporterskie, przyjmują listy do redakcji i opowiadają, co nowego w świecie.',
  },
  {
    data: '11.10.2026', tytul: 'Lampa na złą pogodę',
    tresc: 'Po zmroku, w deszczu i we mgle bohater niesie ciepłe światło lampy – widać go i to, co ma tuż obok.',
  },
  {
    data: '10.10.2026', tytul: 'Nowa maszyneria na dole ekranu',
    tresc: 'Kocioł życia, rurka doświadczenia z manometrem, mosiężne bulaje i para. Wystarczy dotknąć kotła, by się uleczyć.',
  },
  {
    data: '9.10.2026', tytul: 'Rowery i parowe hulajnogi',
    tresc: 'W sklepach sportowych kupisz rower albo parową hulajnogę – i pojedziesz szybciej niż na piechotę.',
  },
  {
    data: '9.10.2026', tytul: '25 bohaterów do wyboru',
    tresc: 'W Kufrze możesz zmienić wygląd bohatera – jest aż 25 postaci.',
  },
  {
    data: '8.10.2026', tytul: 'Pączkarnia, burgery i warsztaty',
    tresc: 'Dobra Pączkarnia na Krakowskim Przedmieściu robi pączki z owoców, McDonald’s – wege burgery z warzyw, a warsztaty samochodowe naprawiają broń i skupują rudę.',
  },
];

/** „Plany redakcji” – what we are working on (no dates promised). */
export const PLANY: Wiesc[] = [
  { data: 'wkrótce', tytul: 'Gazeciarz z prawdziwego zdarzenia', tresc: 'Nasz rysownik szkicuje gazeciarza z torbą pełną gazet i nową, papierową szatę Kuriera.' },
  { data: 'wkrótce', tytul: 'Smoki w pełnej krasie', tresc: 'Leśny i trujący smok dostaną nowe, bajkowe rysunki i pełne ruchy.' },
  { data: 'w planach', tytul: 'Zabytki Lublina', tresc: 'Nowy Ratusz, Archikatedra z Wieżą Trynitarską – rysowane jak Zamek i Brama Krakowska.' },
  { data: 'w planach', tytul: 'Więcej przygód', tresc: 'Nowe historie pisane ręcznie – także z waszych listów do redakcji!' },
  { data: 'w planach', tytul: 'Gra po angielsku', tresc: 'Cała gra w dwóch językach, z wyborem przy tworzeniu postaci.' },
];

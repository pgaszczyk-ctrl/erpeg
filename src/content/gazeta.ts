import type { Txt } from '../i18n';

// The newsboy (gazeciarz, owner 11 Oct 2026): in every town, more of them in bigger towns. He stands on
// a street corner, shouts and turns to the hero. A talk opens a short dialog first (read the paper,
// help deliver papers – every few newsboys –, goodbye). The „Kurier Parowy” / „The Steam Courier”:
//   • front page – news the owner writes in the admin panel (new quests, special tasks; RPC
//     kurier_wiesci, table kurier_wiesci, both languages) + the reporter's errand,
//   • „Ludzie” – daily rankings (RPC kurier_wydanie),
//   • „Z warsztatu” – what changed in the game and what is planned (NOWOSCI / PLANY below),
//   • a letter to the editors (RPC order_quest → quest_orders; untrusted player text, ideas only).
// Every text is two-language ({ pl, en }, read with tr() when shown – the language can change at login).

export const GAZETA = {
  tytul: { pl: 'Kurier Parowy', en: 'The Steam Courier' } as Txt,
  podtytul: { pl: 'Gazeta codzienna dla wszystkich exp-lorerów', en: 'The daily paper for every exp-lorer' } as Txt,
  /** How many newsboys a 1 km square gets, by how many places (shops, offices, temples…) it has. */
  ilu: [
    { miejsc: 60, ile: 3 },
    { miejsc: 25, ile: 2 },
    { miejsc: 6, ile: 1 },
  ],
  /** Their look: the artist's newsboy trial v2 (order 32: standing frames; they stand on a corner – owner OK). */
  wyglad: 'hd-gazeciarz',
  /** Masthead pictures per language (artist, 32-G003); a language without one gets a typeset masthead. */
  winieta: { pl: 'gazeta/winieta_poziomy.png', en: null } as Record<'pl' | 'en', string | null>, // EN + phone versions ordered: 32-P004
  imiona: [
    { pl: 'Gazeciarz Felek', en: 'Newsboy Felek' }, { pl: 'Gazeciarz Józek', en: 'Newsboy Józek' },
    { pl: 'Gazeciarz Staś', en: 'Newsboy Staś' }, { pl: 'Gazeciarz Kazio', en: 'Newsboy Kazio' },
    { pl: 'Gazeciarka Mania', en: 'Newsgirl Mania' }, { pl: 'Gazeciarka Zocha', en: 'Newsgirl Zocha' },
    { pl: 'Gazeciarz Tadzio', en: 'Newsboy Tadzio' }, { pl: 'Gazeciarka Hela', en: 'Newsgirl Hela' },
  ] as Txt[],
  okrzyki: [
    { pl: 'Nadzwyczajne wydanie! Nadzwyczajne wydanie!', en: 'Extra! Extra! Read all about it!' },
    { pl: 'Kurier Parowy! Najświeższe wieści!', en: 'The Steam Courier! Hot off the press!' },
    { pl: 'Smoki nad miastem? Czytajcie w Kurierze!', en: 'Dragons over the town? Read it in the Courier!' },
    { pl: 'Gazeta, gazeta! Kto chce gazetę?', en: 'Paper, paper! Who wants a paper?' },
    { pl: 'Nowe zadania dla śmiałków! Tylko w Kurierze!', en: 'New quests for the brave! Only in the Courier!' },
  ] as Txt[],
  /** Longest letter to the editors. */
  maksListu: 500,
};

/** The talk with a newsboy, before the paper. */
export const ROZMOWA = {
  czytaj: { pl: '📰 Poproszę Kuriera', en: '📰 A Courier, please' } as Txt,
  roznos: { pl: '🗞 Pomogę roznosić gazety', en: '🗞 I can help deliver papers' } as Txt,
  jakIdzie: { pl: '🗞 Jak tam roznoszenie?', en: '🗞 About the deliveries…' } as Txt,
  pa: { pl: '👋 Do widzenia', en: '👋 Goodbye' } as Txt,
  /** Said while the delivery is in progress. {ulica} {zostalo} */
  wToku: {
    pl: 'Jeszcze {zostalo} domów – {ulica}! Wsuń gazetę w drzwi albo do skrzynki – wystarczy podejść pod adres.',
    en: '{zostalo} more houses on {ulica}! Slip a paper under the door or into the box – just walk up to the address.',
  } as Txt,
  zrobione: { pl: 'Dzięki za pomoc! Dziś już wszystko rozniesione.', en: 'Thanks for the help! Everything is delivered for today.' } as Txt,
};

/**
 * Delivering papers (owner, 11 Oct 2026): every few newsboys ask for help – and not always the same way
 * („roznoszenie musi być różnorodne”): a street round nearby, a long round a kilometre or more away, or one
 * very important client a few kilometres off whom the newsboy forgot. `waga` = how often each kind comes.
 */
export const ROZNOSZENIE = {
  /** Which newsboys ask: one in `co` (by id). */
  co: 3,
  monetNaDom: 6,
  expNaDom: 10,
  /** Extra pay for the walk to the street / client. */
  monetNaKm: 25,
  expNaKm: 45,
  warianty: {
    /** A street near the newsboy. */
    blisko: { waga: 0.5, odM: 0, doM: 700, min: 3, max: 6 },
    /** A whole street in another part of town. */
    daleko: { waga: 0.3, odM: 800, doM: 1600, min: 6, max: 10 },
    /** One forgotten, very important subscriber far away (one address). */
    klient: { waga: 0.2, odM: 2200, doM: 3800 },
  },
  tytul: { pl: 'Roznoszenie gazet – {ulica}', en: 'Paper round – {ulica}' } as Txt,
  opis: {
    pl: 'Nie nadążam! Zanieś Kuriera do {ile} domów – {ulica}. Wystarczy podejść pod adres – gazetę wsuniesz w drzwi. Za ostatni dom od razu dostaniesz zapłatę.',
    en: 'I can’t keep up! Take the Courier to {ile} houses on {ulica}. Just walk up to each address and slip the paper under the door. You get paid at the last house.',
  } as Txt,
  tytulDaleko: { pl: 'Wielka runda – {ulica}', en: 'The big round – {ulica}' } as Txt,
  opisDaleko: {
    pl: 'Mamy kłopot w innej dzielnicy – {ulica}, jakieś {km} km stąd! Chłopak, który tam roznosi gazety, rozchorował się, a czeka {ile} prenumeratorów. Weźmiesz całą torbę? Zapłacę jak za dwóch.',
    en: 'The boy who delivers on {ulica} is sick in bed, and it’s a fair walk from here – about {km} km! {ile} subscribers are waiting. Will you take the whole bag? I’ll pay you double.',
  } as Txt,
  cel: { pl: 'Roznieś gazety: {ulica}', en: 'Deliver papers: {ulica}' } as Txt,
  dom: { pl: 'Tu mieszkają prenumeratorzy Kuriera. Wsunąć gazetę w szparę drzwi?', en: 'Courier subscribers live here. Slip a paper under the door?' } as Txt,
  przycisk: { pl: '🗞 Doręcz gazetę', en: '🗞 Deliver the paper' } as Txt,
  koniec: { pl: 'Ostatnia gazeta doręczona! Gazeciarz będzie zachwycony – zapłata już w sakiewce.', en: 'The last paper is delivered! The newsboy will be delighted – your pay is in your purse.' } as Txt,
  /** The forgotten client: {kto} (name with title), {adres}, {km}. */
  klienci: [
    { pl: 'pan mecenas Wiktor Zębaty', en: 'Counsellor Wiktor Zębaty' },
    { pl: 'pani radczyni Aurelia Mosiądz', en: 'Councillor Aurelia Mosiądz' },
    { pl: 'profesor astronomii Teodor Lunetka', en: 'Professor of astronomy Teodor Lunetka' },
    { pl: 'kapitan sterowca Bronisław Para', en: 'Airship captain Bronisław Para' },
    { pl: 'dyrektor fabryki zegarów Hipolit Tryb', en: 'Clock factory director Hipolit Tryb' },
    { pl: 'hrabina Eleonora Manometr', en: 'Countess Eleonora Manometr' },
  ] as Txt[],
  tytulKlient: { pl: 'Pilna gazeta: {adres}', en: 'Urgent paper: {adres}' } as Txt,
  opisKlient: {
    pl: 'O nie, zapomniałem! {kto} zawsze dostaje pierwszy egzemplarz, jeszcze ciepły z drukarni. Mieszka pod adresem {adres} – to jakieś {km} km stąd. Jeśli gazeta nie dotrze, redakcja mnie zwolni! Pobiegniesz? Płaci sowicie.',
    en: 'Oh no, I forgot! {kto} always gets the very first copy, still warm from the press. The address is {adres} – about {km} km from here. If it doesn’t arrive, the editors will sack me! Will you run? They pay handsomely.',
  } as Txt,
  celKlient: { pl: 'Zanieś gazetę: {adres}', en: 'Deliver the paper: {adres}' } as Txt,
  koniecKlient: {
    pl: '{kto} odbiera Kuriera: „Nareszcie! Bez porannej gazety nie ruszam się z domu.” Dostajesz sowity napiwek.',
    en: '{kto} takes the Courier: “At last! I never leave the house without my morning paper.” You get a generous tip.',
  } as Txt,
};

/** The reporter's errand: go to a place in town and write a note there (finishes on the spot). */
export const REPORTAZ = {
  /**
   * Where a reporter's errand may send the hero (owner, 12 Oct 2026: never a random business – „restauracja Lwów” –
   * the paper's business mentions are for paid partnerships later): only these public places, or a plain house address.
   */
  miejsca: ['library', 'school', 'university'] as string[],
  /** Share of errands that go to a plain address even when such a place is in range. */
  adres: 0.5,
  odM: 250,
  doM: 1100,
  monetNaKm: 30,
  minMonet: 15,
  expNaKm: 60,
  minExp: 25,
  tytuly: [
    { pl: 'Reportaż: {cel}', en: 'Report: {cel}' },
    { pl: 'Sensacja przy {cel}!', en: 'Sensation at {cel}!' },
    { pl: 'Plotki spod {cel}', en: 'Gossip from {cel}' },
    { pl: 'Co słychać przy {cel}?', en: 'What’s new at {cel}?' },
  ] as Txt[],
  opisy: [
    { pl: 'Redakcja słyszała, że przy {cel} z kanałów bucha dziwnie kolorowa para. Idź tam, rozejrzyj się i spisz notatkę – wydrukujemy ją jutro na pierwszej stronie!', en: 'The editors heard that oddly coloured steam is puffing from the drains at {cel}. Go there, look around and write a note – we’ll print it on tomorrow’s front page!' },
    { pl: 'Mieszkańcy piszą, że koło {cel} chochliki podmieniają szyldy. Sprawdź, co się tam dzieje, i zanotuj wszystko, co zobaczysz.', en: 'Readers write that imps swap the shop signs near {cel}. Find out what’s going on and note everything you see.' },
    { pl: 'Podobno przy {cel} ktoś widział cień smoka w kałuży. Bzdura czy sensacja? Idź i sprawdź na własne oczy.', en: 'Someone says they saw a dragon’s shadow in a puddle at {cel}. Nonsense or a scoop? Go and see for yourself.' },
    { pl: 'Przy {cel} otwarto ponoć nowy parowy wynalazek. Zajrzyj tam i opisz go naszym czytelnikom.', en: 'A new steam invention was supposedly unveiled at {cel}. Take a look and describe it for our readers.' },
  ] as Txt[],
  cel: { pl: 'Spisz notatkę: {cel}', en: 'Write a note: {cel}' } as Txt,
  komunikat: { pl: 'Notatka spisana! Gazeciarz odbierze ją przy następnym wydaniu, a honorarium już trafiło do sakiewki.', en: 'Note written! The newsboy will collect it for the next edition, and your fee is already in your purse.' } as Txt,
};

/** Every label of the paper itself. */
export const STRONY = {
  wiesci: { pl: 'Wieści', en: 'News' } as Txt,
  ludzie: { pl: 'Ludzie', en: 'People' } as Txt,
  warsztat: { pl: 'Z warsztatu', en: 'Workshop' } as Txt,
  zlecenie: { pl: 'Zlecenie', en: 'Assignment' } as Txt,
  list: { pl: 'Do redakcji', en: 'Letters' } as Txt,
  lamiglowka: { pl: 'Łamigłówka', en: 'Puzzle' } as Txt,
  zamknij: { pl: 'Złóż gazetę', en: 'Fold the paper' } as Txt,
  sprzedaje: { pl: 'Sprzedaje: {kto}', en: 'Sold by {kto}' } as Txt,
  okolica: { pl: 'okolica', en: 'hereabouts' } as Txt,
  // Front page
  wiesciTytul: { pl: 'Z pierwszej strony', en: 'Front page' } as Txt,
  wiesciPusto: { pl: 'Dziś redakcja nie ma nowych wieści o zadaniach w tej okolicy. Zajrzyj jutro – albo poczytaj, co słychać w warsztacie gry!', en: 'No quest news for these parts today. Look again tomorrow – or read what’s new in the game’s workshop!' } as Txt,
  wczytuje: { pl: 'Gazeciarz wyciąga z torby najświeższe wydanie…', en: 'The newsboy pulls the latest edition from his bag…' } as Txt,
  rodzaj: {
    zadanie: { pl: 'Nowe zadanie', en: 'New quest' },
    specjalne: { pl: 'Zadanie specjalne', en: 'Special task' },
    wiesc: { pl: 'Wieści', en: 'News' },
  } as Record<string, Txt>,
  gdzie: { pl: 'Gdzie: {miejsce}', en: 'Where: {miejsce}' } as Txt,
  // Workshop
  warsztatNowe: { pl: 'Co nowego w grze', en: 'What’s new in the game' } as Txt,
  warsztatPlany: { pl: 'Redakcja zdradza plany', en: 'The editors reveal their plans' } as Txt,
  planyUwaga: { pl: 'Plany mogą się zmienić – piszcie do redakcji, co chcielibyście zobaczyć!', en: 'Plans may change – write to the editors about what you’d like to see!' } as Txt,
  // Assignment
  zlecenieTytul: { pl: 'Zlecenie dla reportera', en: 'An assignment for a reporter' } as Txt,
  zlecenieBrak: { pl: 'Dziś redakcja nie ma dla ciebie zlecenia w tej okolicy. Zajrzyj do innego gazeciarza.', en: 'The editors have no assignment for you around here today. Try another newsboy.' } as Txt,
  wez: { pl: 'Biorę zlecenie', en: 'Take the assignment' } as Txt,
  wziete: { pl: 'To zlecenie już masz – strzałka pokaże ci drogę.', en: 'You already have this assignment – the arrow shows the way.' } as Txt,
  pelno: { pl: 'Masz już komplet zadań. Skończ któreś i wróć po to zlecenie.', en: 'Your quest log is full. Finish one and come back for this.' } as Txt,
  zrobione: { pl: 'To zlecenie już wykonane. Dziękujemy!', en: 'This assignment is done. Thank you!' } as Txt,
  // Letters
  listTytul: { pl: 'List do redakcji', en: 'A letter to the editors' } as Txt,
  listOpis: { pl: 'Opisz przygodę, którą chcesz przeżyć, miejsce, które warto pokazać w grze, albo pomysł na zadanie. Redakcja czyta każdy list – najlepsze trafią do gry!', en: 'Describe an adventure you’d like to have, a place worth showing in the game, or an idea for a quest. The editors read every letter – the best ones make it into the game!' } as Txt,
  listPoczatek: { pl: 'Szanowna Redakcjo…', en: 'Dear Editors…' } as Txt,
  wyslij: { pl: 'Wyślij list', en: 'Send the letter' } as Txt,
  zaKrotki: { pl: 'Napisz choć kilka słów.', en: 'Write at least a few words.' } as Txt,
  wysylam: { pl: 'Gazeciarz zanosi list do redakcji…', en: 'The newsboy runs the letter to the editors…' } as Txt,
  wyslany: { pl: 'Dziękujemy! List trafił do redakcji.', en: 'Thank you! Your letter reached the editors.' } as Txt,
  limit: { pl: 'Redakcja ma dziś od ciebie dość listów – spróbuj za godzinę.', en: 'The editors have enough letters from you for now – try again in an hour.' } as Txt,
  blad: { pl: 'Nie udało się wysłać (brak internetu?). Spróbuj jeszcze raz.', en: 'Couldn’t send it (no internet?). Try again.' } as Txt,
};

/** „Łamigłówka dnia” (src/lamiglowki.ts, src/ui/lamiglowka.ts): one kind a day for everyone, the puzzle by the
 *  character's difficulty level. The reward isn't told up front (owner's rule, 7 Oct 2026). */
export const LAMIGLOWKA = {
  nagrodaExp: 100,
  tytul: { pl: 'Łamigłówka dnia', en: 'Puzzle of the day' } as Txt,
  nazwy: {
    sudoku: { pl: 'Sudoku 6×6', en: 'Sudoku 6×6' },
    kakuro: { pl: 'Kakuro', en: 'Kakuro' },
    krzyzowka: { pl: 'Matematyczna krzyżówka', en: 'Number crossword' },
    trasa: { pl: 'Najkrótsza trasa', en: 'The shortest route' },
  } as Record<string, Txt>,
  zasady: {
    sudoku: { pl: 'Wpisz cyfry od 1 do 6 tak, by w każdym wierszu, każdej kolumnie i każdym prostokącie 3×2 każda cyfra była dokładnie raz.', en: 'Fill in digits 1 to 6 so that every row, every column and every 3×2 box holds each digit exactly once.' },
    kakuro: { pl: 'W białe pola wpisz cyfry od 1 do 9. Liczba nad ukośną kreską to suma cyfr w prawo, liczba pod nią – suma cyfr w dół. W jednym ciągu cyfry nie mogą się powtarzać.', en: 'Fill the white cells with digits 1 to 9. The number above the slash is the sum of the digits to the right, the one below it – of the digits downwards. No digit repeats within one run.' },
    krzyzowka: { pl: 'W puste pola wpisz liczby lub znaki działań. Liczymy po kolei, od lewej do prawej i z góry na dół – jak na kalkulatorze.', en: 'Fill the empty cells with numbers or operation signs. Work in order, left to right and top to bottom – like on a calculator.' },
    trasa: { pl: 'Każda liczba to metry. Wyznacz drogę od startu w lewym dolnym rogu do mety w prawym górnym, krok po kroku w bok, w górę lub w dół, tak by suma metrów była najmniejsza. Dotknij pola obok końca trasy, by ją przedłużyć; dotknij pola na trasie, by ją do niego skrócić.', en: 'Every number is metres. Find the way from the start in the bottom-left corner to the finish in the top-right one, step by step sideways, up or down, so that the metres add up to the least. Tap a cell next to the end of the route to extend it; tap a cell on the route to cut it back there.' },
  } as Record<string, Txt>,
  poziom: { pl: 'Trudność: {poziom}', en: 'Difficulty: {poziom}' } as Txt,
  sprawdz: { pl: 'Sprawdź', en: 'Check' } as Txt,
  wyczysc: { pl: 'Od nowa', en: 'Start over' } as Txt,
  niePelne: { pl: 'Jeszcze nie wszystkie pola są wypełnione.', en: 'Not every cell is filled in yet.' } as Txt,
  zle: { pl: 'Coś się nie zgadza… Popatrz jeszcze raz!', en: 'Something doesn’t add up… Take another look!' } as Txt,
  dlugosc: { pl: 'Twoja trasa: {m} m', en: 'Your route: {m} m' } as Txt,
  krotsza: { pl: 'Dotarłeś na metę ({m} m), ale da się krócej!', en: 'You reached the finish ({m} m), but there’s a shorter way!' } as Txt,
  brawo: { pl: 'Brawo! Łamigłówka rozwiązana. +{exp} EXP', en: 'Well done! Puzzle solved. +{exp} EXP' } as Txt,
  juz: { pl: 'Dzisiejsza łamigłówka rozwiązana – jutro w Kurierze nowa!', en: 'Today’s puzzle is solved – a new one in tomorrow’s Courier!' } as Txt,
  start: { pl: 'Start', en: 'Start' } as Txt,
  meta: { pl: 'Meta', en: 'Finish' } as Txt,
  stopka: { pl: 'Codziennie nowa łamigłówka – ta sama dla wszystkich graczy na tym samym poziomie trudności.', en: 'A new puzzle every day – the same for every player on the same difficulty level.' } as Txt,
};

/** „Ludzie” – the daily rankings (RPC kurier_wydanie; test characters never appear). */
export const RANKINGI = {
  tytul: { pl: 'Ludzie z naszych łamów', en: 'People in the news' } as Txt,
  wczoraj: { pl: 'Wydanie z {dzien}: kto wędrował najdalej i kto dokonał rzeczy wielkich.', en: 'Edition of {dzien}: who walked the farthest and who did great things.' } as Txt,
  dzis: { pl: 'Pierwsze wydanie rankingów – redakcja liczy na bieżąco, co dzieje się dzisiaj.', en: 'The first edition of the rankings – the editors count today’s deeds as they happen.' } as Txt,
  brak: { pl: 'Dziś gazeciarz nie dostał rankingów z drukarni (brak połączenia?). Zajrzyj później.', en: 'The rankings didn’t arrive from the printers today (no connection?). Look again later.' } as Txt,
  pusto: { pl: 'Tu wczoraj było cicho – może ty trafisz do jutrzejszego wydania?', en: 'All quiet here yesterday – maybe you’ll make tomorrow’s edition?' } as Txt,
  km: { pl: 'Najdalej wędrowali', en: 'Farthest walkers' } as Txt,
  wybitne: { pl: 'Wybitne osiągnięcia', en: 'Outstanding deeds' } as Txt,
  swiat: { pl: 'Świat', en: 'World' } as Txt,
  gratulacje: { pl: 'Gratulacje od redakcji!', en: 'Congratulations from the editors!' } as Txt,
  moje: { pl: 'Wczoraj do twojej Księgi osiągnięć trafiła nowa pieczęć: {odznaki}. Kurier Parowy pisze o tobie!', en: 'Yesterday a new seal joined your Book of Deeds: {odznaki}. The Steam Courier writes about you!' } as Txt,
  mojeDzis: { pl: 'Dziś do twojej Księgi osiągnięć trafiła nowa pieczęć: {odznaki}. Kurier Parowy pisze o tobie!', en: 'Today a new seal joined your Book of Deeds: {odznaki}. The Steam Courier writes about you!' } as Txt,
  mojeKm: { pl: 'Przebyta droga tego dnia: {km} km.', en: 'Distance walked that day: {km} km.' } as Txt,
  stopka: { pl: 'Rankingi drukujemy codziennie o północy. Liczą się kilometry przebyte pieszo i pieczęcie z Księgi osiągnięć.', en: 'Rankings are printed every midnight. Kilometres on foot and seals from the Book of Deeds count.' } as Txt,
};

export interface Wiesc {
  data: string;
  tytul: Txt;
  tresc: Txt;
}

/** „Co nowego” – newest first. Written for players, short and without jargon. Update with each release. */
export const NOWOSCI: Wiesc[] = [
  {
    data: '12.10.2026', tytul: { pl: 'Łamigłówka dnia', en: 'Puzzle of the day' },
    tresc: { pl: 'W Kurierze Parowym codziennie nowa łamigłówka: sudoku, kakuro, matematyczna krzyżówka albo najkrótsza trasa. Taka sama dla wszystkich na twoim poziomie trudności – porównajcie się ze znajomymi!', en: 'Every day the Steam Courier prints a new puzzle: sudoku, kakuro, a number crossword or the shortest route. The same for everyone on your difficulty level – compare with your friends!' },
  },
  {
    data: '12.10.2026', tytul: { pl: 'Nowy herb i krótsze demo', en: 'A new emblem and a shorter demo' },
    tresc: { pl: 'Gra ma nowe logo – okrągły herb z globusem, który na początku dema obraca się jak moneta. Gazeta ma zawsze ten sam, duży rozmiar, a reporterskie zlecenia prowadzą do szkół, bibliotek i zwykłych adresów. Na laptopie na baterii gra rysuje prostszy obraz, żeby nie zwalniać.', en: 'The game has a new logo – a round emblem with a globe that spins like a coin at the start of the demo. The paper always keeps one large size, and reporter errands lead to schools, libraries and plain addresses. On a laptop running on battery the game draws a plainer picture to stay smooth.' },
  },
  {
    data: '11.10.2026', tytul: { pl: 'Kurier w nowej szacie', en: 'The Courier gets a new look' },
    tresc: { pl: 'Gazeta wygląda teraz jak prawdziwa gazeta, a na pierwszej stronie redakcja ogłasza nowe zadania. Gazeciarze najpierw zagadują – a co trzeci poprosi o pomoc w roznoszeniu gazet po ulicy.', en: 'The paper now looks like a real paper, and the front page announces new quests. Newsboys chat first – and every third one asks for help delivering papers along a street.' },
  },
  {
    data: '11.10.2026', tytul: { pl: 'Codzienne rankingi w Kurierze', en: 'Daily rankings in the Courier' },
    tresc: { pl: 'Na stronie „Ludzie” gazeta pisze, kto wczoraj przewędrował najwięcej kilometrów na świecie, w twoim kraju i mieście, i kto zdobył wybitne pieczęcie. Jeśli i ty zdobędziesz pieczęć – redakcja ci pogratuluje!', en: 'The “People” page tells who walked the most kilometres yesterday in the world, your country and your town, and who earned outstanding seals. Earn one yourself and the editors will congratulate you!' },
  },
  {
    data: '11.10.2026', tytul: { pl: 'Gazeciarze na ulicach!', en: 'Newsboys on the streets!' },
    tresc: { pl: 'W każdym mieście na rogach ulic stoją gazeciarze z Kurierem Parowym. Mają zlecenia reporterskie i przyjmują listy do redakcji.', en: 'In every town newsboys stand on street corners with the Steam Courier. They have reporter assignments and take letters to the editors.' },
  },
  {
    data: '11.10.2026', tytul: { pl: 'Lampa na złą pogodę', en: 'A lamp for bad weather' },
    tresc: { pl: 'Po zmroku, w deszczu i we mgle bohater niesie ciepłe światło lampy – widać go i to, co ma tuż obok.', en: 'After dark, in rain and fog your hero carries a warm lamp – you can see them and what’s close by.' },
  },
  {
    data: '10.10.2026', tytul: { pl: 'Nowa maszyneria na dole ekranu', en: 'New machinery at the bottom of the screen' },
    tresc: { pl: 'Kocioł życia, rurka doświadczenia z manometrem, mosiężne bulaje i para. Wystarczy dotknąć kotła, by się uleczyć.', en: 'A life boiler, an experience tube with a gauge, brass portholes and steam. Touch the boiler to heal.' },
  },
  {
    data: '9.10.2026', tytul: { pl: 'Rowery i parowe hulajnogi', en: 'Bicycles and steam scooters' },
    tresc: { pl: 'W sklepach sportowych kupisz rower albo parową hulajnogę – i pojedziesz szybciej niż na piechotę.', en: 'Sports shops sell bicycles and steam scooters – faster than walking.' },
  },
  {
    data: '9.10.2026', tytul: { pl: '25 bohaterów do wyboru', en: '25 heroes to choose from' },
    tresc: { pl: 'W Kufrze możesz zmienić wygląd bohatera – jest aż 25 postaci.', en: 'Change your hero’s look in the Trunk – there are 25 characters.' },
  },
];

/** „Plany redakcji” – what we are working on (no dates promised). */
export const PLANY: Wiesc[] = [
  { data: 'wkrótce', tytul: { pl: 'Gazeciarz z prawdziwego zdarzenia', en: 'A proper newsboy' }, tresc: { pl: 'Nasz rysownik szkicuje gazeciarzy i gazeciarki z torbą pełną gazet oraz nową, papierową szatę Kuriera.', en: 'Our artist is sketching newsboys and newsgirls with bags full of papers, and the Courier’s new paper look.' } },
  { data: 'wkrótce', tytul: { pl: 'Smoki w pełnej krasie', en: 'Dragons in full glory' }, tresc: { pl: 'Leśny i trujący smok dostaną nowe, bajkowe rysunki i pełne ruchy.', en: 'The forest and poison dragons will get new fairy-tale drawings and full animations.' } },
  { data: 'w planach', tytul: { pl: 'Zabytki Lublina', en: 'Lublin’s landmarks' }, tresc: { pl: 'Nowy Ratusz, Archikatedra z Wieżą Trynitarską – rysowane jak Zamek i Brama Krakowska.', en: 'The New Town Hall, the Cathedral and the Trinitarian Tower – drawn like the Castle and the Kraków Gate.' } },
  { data: 'w planach', tytul: { pl: 'Więcej przygód', en: 'More adventures' }, tresc: { pl: 'Nowe historie pisane ręcznie – także z waszych listów do redakcji!', en: 'New hand-written stories – some from your letters to the editors!' } },
  { data: 'w planach', tytul: { pl: 'Gra po angielsku', en: 'The whole game in English' }, tresc: { pl: 'Cała gra w dwóch językach, z wyborem przy tworzeniu postaci.', en: 'The whole game in two languages, chosen when you create your character.' } },
];

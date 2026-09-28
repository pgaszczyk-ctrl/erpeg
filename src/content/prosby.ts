// ============================================================================
//  PROŚBY MĄDRALI – zagadki „z życia”
//  Mądrale (postacie z zagadkami na ulicach) nie odpytują jak w szkole, tylko
//  proszą o pomoc: w kuchni, przy zwierzakach, z pogodą, z dniem tygodnia,
//  z godziną, z odległością do innego miasta, z zakupami.
//
//  Ta sama prośba nie wraca do gracza przez NIE_POWTARZAJ_DNI dni (gra pamięta,
//  co już słyszał). Dni tygodnia, godziny, odległości i zakupy gra układa
//  sama (Npcs.ts), więc próśb nigdy nie zabraknie.
//
//  W każdej prośbie PIERWSZA odpowiedź jest dobra – gra sama je potasuje.
//  `g('…', '…')` wybiera formę żeńską albo męską, zależnie od tego, kto pyta.
// ============================================================================

export const NIE_POWTARZAJ_DNI = 60;

/** Nagroda: EXP rośnie z poziomem trudności; do tego monety ALBO jabłka (na zmianę). */
export const NAGRODA_PROSBY = { expNaPoziom: [10, 15, 20, 30], monety: 5, jablka: 2 };

type G = (zenska: string, meska: string) => string;

export interface Prosba {
  id: string;
  /** Od którego poziomu trudności (0 maluch … 3 mędrzec). */
  od: number;
  tekst: (g: G) => string;
  /** Pierwsza dobra. */
  odp: string[];
}

export const PROSBY: Prosba[] = [
  // --- Kuchnia
  { id: 'nalesniki', od: 0, tekst: () => 'Wyglądasz na kogoś, kto lubi naleśniki. Mam straszną ochotę! Podpowiesz, czego do nich potrzebuję?', odp: ['Mleko, jajka i mąkę', 'Masło, ziemniaki i śmietanę', 'Nie wiem, nie umiem gotować', 'Ryż i keczup'] },
  { id: 'jajecznica', od: 0, tekst: () => 'Chcę zrobić jajecznicę na śniadanie. Co mam rozbić na patelnię?', odp: ['Jajka', 'Orzechy', 'Talerz', 'Ziemniaki'] },
  { id: 'herbata', od: 0, tekst: (g) => `${g('Zmarzłam', 'Zmarzłem')} na przystanku… Chcę zrobić herbatę. Czym zalać torebkę?`, odp: ['Gorącą wodą', 'Zimnym mlekiem', 'Sokiem pomarańczowym', 'Niczym, zjem ją na sucho'] },
  { id: 'kanapka', od: 0, tekst: (g) => `Jestem ${g('głodna', 'głodny')}, a mam tylko chleb, masło i ser. Co z tego zrobię?`, odp: ['Kanapkę', 'Zupę pomidorową', 'Lody', 'Naleśniki'] },
  { id: 'pierogi_ruskie', od: 1, tekst: () => 'Babcia robi pierogi ruskie. Co jest w środku?', odp: ['Ziemniaki z twarogiem i cebulką', 'Truskawki', 'Kapusta z grzybami', 'Mięso mielone'] },
  { id: 'pomidorowa', od: 1, tekst: () => 'Na obiad robię zupę pomidorową. Z czym najczęściej ją podajemy?', odp: ['Z makaronem albo ryżem', 'Z lodami', 'Z płatkami śniadaniowymi', 'Z czekoladą'] },
  { id: 'placki', od: 1, tekst: () => 'Chcę usmażyć placki ziemniaczane. Co trzeba zetrzeć na tarce?', odp: ['Ziemniaki', 'Jabłka', 'Marchewkę', 'Ser żółty'] },
  { id: 'salatka_owocowa', od: 0, tekst: () => 'Robię sałatkę owocową. Co z tego NIE pasuje do niej?', odp: ['Cebula', 'Banan', 'Jabłko', 'Winogrona'] },
  { id: 'lodowka', od: 1, tekst: (g) => `${g('Kupiłam', 'Kupiłem')} mleko i jogurt, a jest bardzo ciepło. Gdzie mam je schować?`, odp: ['Do lodówki', 'Do szafy z ubraniami', 'Na parapet w słońcu', 'Pod łóżko'] },
  { id: 'jajko_twarde', od: 2, tekst: () => 'Ile mniej więcej trzeba gotować jajko na twardo, od zagotowania wody?', odp: ['Około 8–10 minut', 'Około 30 sekund', 'Około 2 godzin', 'Wcale, wystarczy je umyć'] },
  { id: 'drozdze', od: 3, tekst: () => 'Piekę ciasto drożdżowe, ale nie chce wyrosnąć. Gdzie postawić miskę z ciastem?', odp: ['W ciepłym miejscu, bez przeciągu', 'W zamrażarce', 'Na balkonie w mróz', 'Pod zimną wodą'] },
  { id: 'czosnek', od: 2, tekst: () => 'Przepis mówi „dwa ząbki czosnku”. Co to jest ząbek?', odp: ['Jedna mała cząstka z główki czosnku', 'Cała główka czosnku', 'Łyżeczka soli', 'Szczypta pieprzu'] },
  // --- Zwierzaki
  { id: 'pies_czekolada', od: 0, tekst: () => 'Mój piesek patrzy na moją czekoladę takimi smutnymi oczami… Mogę mu dać kawałek?', odp: ['Nie, czekolada szkodzi psom', 'Tak, całą tabliczkę', 'Tak, ale tylko gorzką', 'Tylko w niedzielę'] },
  { id: 'jez', od: 0, tekst: () => 'Wieczorem w ogrodzie tupie jakieś małe zwierzątko z kolcami. Co to może być?', odp: ['Jeż', 'Wiewiórka', 'Zając', 'Kaczka'] },
  { id: 'kaczki', od: 1, tekst: () => 'Idę nad staw nakarmić kaczki. Co będzie dla nich najzdrowsze?', odp: ['Płatki owsiane albo mrożony groszek', 'Biały chleb', 'Chipsy', 'Cukierki'] },
  { id: 'bocian', od: 1, tekst: () => 'Na kominie sąsiadów było wielkie gniazdo z biało-czarnym ptakiem z czerwonym dziobem. Jesienią zniknął. Co to za ptak?', odp: ['Bocian – odleciał do Afryki', 'Wróbel – schował się w krzakach', 'Sroka – poszła na zakupy', 'Gołąb – przeprowadził się na dworzec'] },
  { id: 'wiewiorka', od: 0, tekst: (g) => `W parku ${g('widziałam', 'widziałem')} rude zwierzątko z puszystym ogonem, które chowało orzechy. Kto to był?`, odp: ['Wiewiórka', 'Lis', 'Kot', 'Kret'] },
  { id: 'kot_woda', od: 1, tekst: () => 'Mój kot jest spragniony. Co najlepiej mu nalać do miski?', odp: ['Świeżej wody', 'Kawy', 'Coli', 'Soku z cytryny'] },
  { id: 'chomik', od: 1, tekst: () => 'Mój chomik cały dzień śpi, a w nocy biega w kółeczku. Czy jest chory?', odp: ['Nie, chomiki są aktywne nocą', 'Tak, trzeba mu dać syrop', 'Tak, bo chomiki nigdy nie śpią', 'Nie, on gra w piłkę'] },
  { id: 'rybki', od: 0, tekst: () => 'Moje rybki w akwarium wyglądają na głodne. Ile im dać jedzenia?', odp: ['Szczyptę, tyle ile zjedzą od razu', 'Całe opakowanie', 'Kanapkę z serem', 'Nic, rybki jedzą raz w roku'] },
  { id: 'pszczola', od: 0, tekst: () => 'Koło mnie bzyczy pszczoła! Co robić?', odp: ['Spokojnie odejść i nie machać rękami', 'Machać rękami ze wszystkich sił', 'Złapać ją gołą ręką', 'Krzyczeć na nią'] },
  { id: 'pies_upal', od: 2, tekst: () => 'Jest upał, a ja muszę wejść na chwilę do sklepu. Mogę zostawić psa w zamkniętym samochodzie?', odp: ['Nie, w upale w aucie pies może się przegrzać', 'Tak, jeśli zostawię mu radio', 'Tak, psy lubią gorąco', 'Tak, na godzinkę'] },
  { id: 'dzieciol', od: 2, tekst: () => 'W lesie ktoś stuka: puk-puk-puk w pień drzewa. Kto to?', odp: ['Dzięcioł', 'Bóbr', 'Sowa', 'Borsuk'] },
  { id: 'nietoperz', od: 3, tekst: () => 'Wieczorem nad moim domem latają nietoperze. Czym właściwie są nietoperze?', odp: ['Ssakami, które latają', 'Ptakami bez piór', 'Owadami', 'Płazami'] },
  // --- Pogoda
  { id: 'chmury', od: 0, tekst: () => 'Zrobiło się ciemno, a nad nami wiszą wielkie, granatowe chmury. Co wziąć na spacer?', odp: ['Parasol', 'Okulary do pływania', 'Sanki', 'Nic, będzie słońce'] },
  { id: 'burza', od: 1, tekst: () => 'Zaczyna się burza z piorunami, a ja jestem na łące. Gdzie się schować?', odp: ['W budynku, nie pod samotnym drzewem', 'Pod najwyższym drzewem', 'Na szczycie górki', 'W jeziorze'] },
  { id: 'tecza', od: 0, tekst: () => 'Pada deszcz, a jednocześnie świeci słońce. Co możemy zobaczyć na niebie?', odp: ['Tęczę', 'Zorzę polarną', 'Gwiazdy', 'Księżyc w pełni'] },
  { id: 'snieg', od: 0, tekst: () => 'Za oknem biało, a z nieba lecą płatki. Co pada?', odp: ['Śnieg', 'Deszcz', 'Piasek', 'Liście'] },
  { id: 'upal', od: 1, tekst: () => 'Jest bardzo gorąco, ponad 30 stopni. Co zrobić, żeby nie zasłabnąć?', odp: ['Pić wodę i chodzić w cieniu', 'Założyć zimową kurtkę', 'Biegać w słońcu w południe', 'Nie pić nic cały dzień'] },
  { id: 'mgla', od: 2, tekst: () => 'Rano jest taka mgła, że nic nie widać. Jak iść przez ulicę?', odp: ['Wolniej i bardzo uważnie, najlepiej w odblasku', 'Biegiem, zamykając oczy', 'Tak jak zawsze, mgła nie przeszkadza', 'Po środku jezdni'] },
  { id: 'gololedz', od: 2, tekst: () => 'Wczoraj padało, a w nocy był mróz. Na co uważać na chodniku?', odp: ['Na gołoledź – jest ślisko', 'Na upał', 'Na piasek z plaży', 'Na tęczę'] },
  { id: 'grad', od: 3, tekst: () => 'Z nieba spadają lodowe kulki wielkości groszku, choć jest lato. Co to?', odp: ['Grad', 'Śnieg', 'Szron', 'Rosa'] },
  // --- Codzienność, pomoc
  { id: 'reszta', od: 1, tekst: (g) => `${g('Zapłaciłam', 'Zapłaciłem')} 10 zł za bułki za 7 zł. Ile ${g('powinnam', 'powinienem')} dostać reszty?`, odp: ['3 zł', '17 zł', '7 zł', 'Nic'] },
  { id: 'zgubione_dziecko', od: 1, tekst: () => 'W sklepie płacze małe dziecko, zgubiło mamę. Co najlepiej zrobić?', odp: ['Zawołać ochroniarza albo pracownika sklepu', 'Zabrać je do domu', 'Udawać, że nic się nie stało', 'Kazać mu szukać samemu'] },
  { id: 'oparzenie', od: 2, tekst: (g) => `${g('Dotknęłam', 'Dotknąłem')} gorącego garnka i piecze mnie palec. Co zrobić?`, odp: ['Schłodzić go pod chłodną wodą', 'Posmarować masłem', 'Przyłożyć do kaloryfera', 'Pomachać nim nad garnkiem'] },
  { id: 'numer_alarmowy', od: 1, tekst: () => 'Ktoś zasłabł na ulicy! Pod jaki numer dzwonić po pomoc w Polsce?', odp: ['112', '997 997', '123', '555'] },
  { id: 'przejscie', od: 0, tekst: () => 'Chcę przejść przez ulicę, a na sygnalizatorze świeci czerwony ludzik. Co robię?', odp: ['Czekam na zielonego', 'Przebiegam szybko', 'Idę tyłem', 'Zamykam oczy i idę'] },
  { id: 'kwadrans', od: 1, tekst: () => 'Autobus ma przyjechać za kwadrans. Ile to minut?', odp: ['15', '4', '25', '45'] },
  { id: 'pol_godziny', od: 0, tekst: () => 'Mama powiedziała, że wróci za pół godziny. Ile to minut?', odp: ['30', '50', '15', '12'] },
  { id: 'polnoc', od: 2, tekst: (g) => `${g('Zgubiłam', 'Zgubiłem')} się w lesie w południe. Słońce jest wtedy mniej więcej na południu. W którą stronę mam się odwrócić, żeby iść na północ?`, odp: ['Plecami do słońca', 'Twarzą do słońca', 'Bokiem do słońca', 'W stronę najbliższego grzyba'] },
  { id: 'zachod', od: 1, tekst: (g) => `${g('Umówiłam', 'Umówiłem')} się, że wrócę, kiedy słońce zacznie zachodzić. W którą stronę mam patrzeć?`, odp: ['Na zachód', 'Na wschód', 'Na północ', 'W dół'] },
  { id: 'segregacja', od: 1, tekst: () => 'Mam pustą plastikową butelkę. Do którego kosza ją wyrzucić?', odp: ['Do żółtego – na plastik i metal', 'Do zielonego – na szkło', 'Do niebieskiego – na papier', 'Do brązowego – na resztki jedzenia'] },
  { id: 'baterie', od: 2, tekst: () => 'Zużyły mi się baterie w pilocie. Co z nimi zrobić?', odp: ['Oddać do zbiórki baterii, np. w sklepie', 'Wrzucić do kosza na papier', 'Zakopać w ogródku', 'Wrzucić do rzeki'] },
  { id: 'ile_nog', od: 0, tekst: () => 'Na podwórku są 2 koty i 1 kura. Ile razem mają nóg?', odp: ['10', '6', '8', '12'] },
  { id: 'rok_przestepny', od: 3, tekst: () => 'Siostrzenica urodziła się 29 lutego. Co ile lat ma „prawdziwe” urodziny?', odp: ['Co 4 lata (zwykle)', 'Co roku', 'Co 10 lat', 'Nigdy'] },
];

/** Dni tygodnia (0 = niedziela, jak w kalendarzu przeglądarki). */
export const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
export const DNI_BIERNIK = ['niedzieli', 'poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty'];

/** Bliższe miasta do pytań o odległość (reszta z listy dużych miast, content/pociagi.ts). */
export const BLISKIE_MIASTA = [
  { nazwa: 'Świdnik', lat: 51.2197, lon: 22.6967 },
  { nazwa: 'Nałęczów', lat: 51.2842, lon: 22.2166 },
  { nazwa: 'Kazimierz Dolny', lat: 51.3219, lon: 21.948 },
  { nazwa: 'Puławy', lat: 51.4166, lon: 21.969 },
  { nazwa: 'Lubartów', lat: 51.4597, lon: 22.6021 },
  { nazwa: 'Kraśnik', lat: 50.9244, lon: 22.2206 },
  { nazwa: 'Chełm', lat: 51.1431, lon: 23.4717 },
  { nazwa: 'Zamość', lat: 50.7231, lon: 23.2519 },
  { nazwa: 'Biała Podlaska', lat: 52.0325, lon: 23.1149 },
];

/** Drogą jest dalej niż w linii prostej – mniej więcej tyle razy. */
export const DROGA_RAZY = { blisko: 1.3, daleko: 1.12 };

/** Zakupy do policzenia: nazwa (w bierniku, liczba mnoga) i cena za sztukę w zł. */
export const ZAKUPY = [
  { co: 'bułki', cena: 1 },
  { co: 'jogurty', cena: 2 },
  { co: 'jabłka', cena: 1 },
  { co: 'lizaki', cena: 2 },
  { co: 'drożdżówki', cena: 3 },
  { co: 'soki', cena: 4 },
  { co: 'zeszyty', cena: 5 },
];

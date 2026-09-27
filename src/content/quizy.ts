// ============================================================================
//  QUIZY W SZKOŁACH
//  Szkoły nie uczą już walki – zadają quizy: rachunki i łamigłówki (gra losuje
//  je sama, więc nigdy się nie kończą), wiedzę i zagadki. Pytania przychodzą
//  też z serwera (tabela quizzes): wgrywa je zewnętrzny program (np. inny AI
//  na harmonogramie) przez add_quizzes – każda paczka jest ważna 2 dni, stare
//  same wypadają. Gdy serwer nic nie da, zostają pytania wpisane niżej.
//  W każdym pytaniu PIERWSZA odpowiedź jest dobra (gra sama je tasuje).
//  Poziomy jak u mądrali: 0 maluch (do 7 lat), 1 uczeń (do 9), 2 odkrywca
//  (do 12), 3 mędrzec (starsi) – wg poziomu trudności postaci.
// ============================================================================

export interface PytanieQuizu {
  kategoria: string;
  pytanie: string;
  odpowiedzi: string[];
}

export const SZKOLA_QUIZ = {
  /** Ile pytań dziennie w jednej szkole (gracz tego nie widzi). */
  naSzkoleDziennie: 50,
  /** Pytań na jedną lekcję, potem przerwa. */
  naLekcje: 10,
  /** Przerwa: tyle minut, zaokrąglone w górę do pełnych 5 minut (10:41 → 10:45). */
  przerwaMin: 3,
  /** EXP za dobrą odpowiedź. */
  exp: 10,
  /** Monety za dobrą odpowiedź (0 = bez monet). */
  monety: 0,
  /** Mag za dobrą odpowiedź ćwiczy też władanie magią (tyle punktów). */
  magia: 2,
  /** Od którego pytania (licząc od 1) robi się trudniej: o 1 poziom, potem o 2. */
  trudniejOd: [31, 41],
  /** Jak często rachunek lub łamigłówka liczbowa zamiast pytania z bazy (0–1). */
  szansaNaRachunek: 0.35,
};

/** Pytania wpisane na stałe (gdy serwer nic nie przyśle), po poziomach 0–3. */
export const QUIZY: PytanieQuizu[][] = [
  // 0 – maluch
  [
    { kategoria: 'przyroda', pytanie: 'Z czego wyrasta drzewo?', odpowiedzi: ['Z nasionka', 'Z kamienia', 'Z liścia', 'Z chmury'] },
    { kategoria: 'przyroda', pytanie: 'Które zwierzę śpi zimą w norze?', odpowiedzi: ['Niedźwiedź', 'Wróbel', 'Koń', 'Kura'] },
    { kategoria: 'przyroda', pytanie: 'Jakiego koloru jest trawa latem?', odpowiedzi: ['Zielonego', 'Niebieskiego', 'Fioletowego', 'Czarnego'] },
    { kategoria: 'łamigłówka', pytanie: 'Co jest większe: słoń czy mysz?', odpowiedzi: ['Słoń', 'Mysz', 'Są równe', 'Zależy od dnia'] },
    { kategoria: 'łamigłówka', pytanie: 'Który kształt nie ma rogów?', odpowiedzi: ['Koło', 'Kwadrat', 'Trójkąt', 'Prostokąt'] },
    { kategoria: 'łamigłówka', pytanie: 'Co pasuje: rękawiczka – ręka, but – …?', odpowiedzi: ['Noga', 'Głowa', 'Ucho', 'Brzuch'] },
    { kategoria: 'wiedza', pytanie: 'Czym myjemy zęby?', odpowiedzi: ['Szczoteczką', 'Łyżką', 'Grzebieniem', 'Ołówkiem'] },
    { kategoria: 'wiedza', pytanie: 'Ile jest pór roku?', odpowiedzi: ['4', '2', '7', '12'] },
    { kategoria: 'wiedza', pytanie: 'Na jakim świetle przechodzimy przez ulicę?', odpowiedzi: ['Na zielonym', 'Na czerwonym', 'Na żółtym', 'Kiedy nikt nie patrzy'] },
    { kategoria: 'język', pytanie: 'Od jakiej litery zaczyna się słowo „kot”?', odpowiedzi: ['K', 'O', 'T', 'M'] },
    { kategoria: 'język', pytanie: 'Co jest przeciwieństwem słowa „duży”?', odpowiedzi: ['Mały', 'Wysoki', 'Gruby', 'Szybki'] },
    { kategoria: 'przyroda', pytanie: 'Co daje nam krowa?', odpowiedzi: ['Mleko', 'Jajka', 'Miód', 'Wełnę'] },
    { kategoria: 'przyroda', pytanie: 'Co robią pszczoły?', odpowiedzi: ['Miód', 'Mleko', 'Chleb', 'Ser'] },
    { kategoria: 'łamigłówka', pytanie: 'Ile uszu mają dwa króliki?', odpowiedzi: ['4', '2', '6', '8'] },
  ],
  // 1 – uczeń
  [
    { kategoria: 'geografia', pytanie: 'Jakie morze jest na północy Polski?', odpowiedzi: ['Bałtyckie', 'Czarne', 'Śródziemne', 'Czerwone'] },
    { kategoria: 'geografia', pytanie: 'Jakie góry są najwyższe w Polsce?', odpowiedzi: ['Tatry', 'Bieszczady', 'Sudety', 'Pieniny'] },
    { kategoria: 'geografia', pytanie: 'Najdłuższa rzeka Polski to…', odpowiedzi: ['Wisła', 'Odra', 'Bug', 'Bystrzyca'] },
    { kategoria: 'przyroda', pytanie: 'Z czego żaba robi skrzek?', odpowiedzi: ['Składa jaja w wodzie', 'Buduje gniazdo', 'Kopie norę', 'Śpiewa'] },
    { kategoria: 'przyroda', pytanie: 'Który ptak nie umie latać?', odpowiedzi: ['Pingwin', 'Bocian', 'Wróbel', 'Sowa'] },
    { kategoria: 'łamigłówka', pytanie: 'Mama Kasi ma 4 dzieci: Wiosnę, Lato, Jesień i…?', odpowiedzi: ['Kasię', 'Zimę', 'Marzec', 'Tomka'] },
    { kategoria: 'łamigłówka', pytanie: 'Co ma klucze, ale nie otwiera drzwi?', odpowiedzi: ['Pianino', 'Szafa', 'Samochód', 'Portfel'] },
    { kategoria: 'łamigłówka', pytanie: 'Im więcej z niej zabierasz, tym większa się robi. Co to?', odpowiedzi: ['Dziura', 'Góra', 'Kałuża', 'Chmura'] },
    { kategoria: 'wiedza', pytanie: 'Ile minut ma godzina?', odpowiedzi: ['60', '100', '30', '24'] },
    { kategoria: 'wiedza', pytanie: 'Który miesiąc jest najkrótszy?', odpowiedzi: ['Luty', 'Kwiecień', 'Czerwiec', 'Listopad'] },
    { kategoria: 'język', pytanie: 'Jak brzmi liczba mnoga słowa „dziecko”?', odpowiedzi: ['Dzieci', 'Dziecka', 'Dzieciaki', 'Dziecki'] },
    { kategoria: 'język', pytanie: 'Które słowo jest czasownikiem?', odpowiedzi: ['Biegać', 'Stół', 'Zielony', 'Szybko'] },
    { kategoria: 'historia', pytanie: 'Jaki symbol jest w godle Polski?', odpowiedzi: ['Biały orzeł', 'Czerwony lew', 'Złoty smok', 'Czarny niedźwiedź'] },
    { kategoria: 'wiedza', pytanie: 'Pod jakim numerem wzywamy pomoc w nagłym wypadku?', odpowiedzi: ['112', '997', '100', '911 tylko w Polsce'] },
  ],
  // 2 – odkrywca
  [
    { kategoria: 'geografia', pytanie: 'Na jakim kontynencie leży Egipt?', odpowiedzi: ['W Afryce', 'W Azji', 'W Europie', 'W Ameryce'] },
    { kategoria: 'geografia', pytanie: 'Który ocean jest największy?', odpowiedzi: ['Spokojny', 'Atlantycki', 'Indyjski', 'Arktyczny'] },
    { kategoria: 'historia', pytanie: 'Kto był pierwszym historycznym władcą Polski?', odpowiedzi: ['Mieszko I', 'Bolesław Krzywousty', 'Władysław Jagiełło', 'Kazimierz Wielki'] },
    { kategoria: 'historia', pytanie: 'O kim mówi się: „zastał Polskę drewnianą, a zostawił murowaną”?', odpowiedzi: ['O Kazimierzu Wielkim', 'O Mieszku I', 'O Janie III Sobieskim', 'O Stefanie Batorym'] },
    { kategoria: 'przyroda', pytanie: 'Który narząd pompuje krew?', odpowiedzi: ['Serce', 'Płuca', 'Wątroba', 'Żołądek'] },
    { kategoria: 'przyroda', pytanie: 'Jak nazywa się zamiana gąsienicy w motyla?', odpowiedzi: ['Przeobrażenie', 'Fotosynteza', 'Parowanie', 'Linienie'] },
    { kategoria: 'łamigłówka', pytanie: 'Zegar wybija 6 razy w 5 sekund. Ile sekund zajmie mu wybicie 12?', odpowiedzi: ['11', '10', '12', '14'] },
    { kategoria: 'łamigłówka', pytanie: 'Wchodzisz do ciemnego pokoju z zapałką. Jest tam świeca, lampa i kominek. Co zapalasz najpierw?', odpowiedzi: ['Zapałkę', 'Świecę', 'Lampę', 'Kominek'] },
    { kategoria: 'łamigłówka', pytanie: 'Ile razy można odjąć 5 od 25?', odpowiedzi: ['Raz – potem to już 20', '5 razy', '4 razy', 'Nieskończenie wiele'] },
    { kategoria: 'wiedza', pytanie: 'Ile to jest kilometr w metrach?', odpowiedzi: ['1000', '100', '10 000', '10'] },
    { kategoria: 'język', pytanie: 'Które zdanie jest pytające?', odpowiedzi: ['Czy pada deszcz?', 'Pada deszcz.', 'Niech pada!', 'Deszcz pada, pada.'] },
    { kategoria: 'język', pytanie: 'Co znaczy „mieć muchy w nosie”?', odpowiedzi: ['Być w złym humorze', 'Być przeziębionym', 'Lubić owady', 'Być głodnym'] },
    { kategoria: 'wiedza', pytanie: 'Z ilu graczy składa się drużyna piłkarska na boisku?', odpowiedzi: ['11', '10', '9', '12'] },
    { kategoria: 'przyroda', pytanie: 'Co roślina wydziela w fotosyntezie?', odpowiedzi: ['Tlen', 'Dwutlenek węgla', 'Azot', 'Dym'] },
  ],
  // 3 – mędrzec
  [
    { kategoria: 'historia', pytanie: 'W którym roku uchwalono Konstytucję 3 Maja?', odpowiedzi: ['1791', '1918', '1569', '1683'] },
    { kategoria: 'historia', pytanie: 'Który król pokonał Turków pod Wiedniem w 1683 roku?', odpowiedzi: ['Jan III Sobieski', 'Stefan Batory', 'Zygmunt III Waza', 'August II Mocny'] },
    { kategoria: 'nauka', pytanie: 'Jaki jest symbol chemiczny złota?', odpowiedzi: ['Au', 'Ag', 'Zł', 'Go'] },
    { kategoria: 'nauka', pytanie: 'Która cząstka ma ładunek ujemny?', odpowiedzi: ['Elektron', 'Proton', 'Neutron', 'Foton'] },
    { kategoria: 'nauka', pytanie: 'Ile wynosi przyspieszenie ziemskie (w przybliżeniu)?', odpowiedzi: ['9,8 m/s²', '1 m/s²', '98 m/s²', '3,14 m/s²'] },
    { kategoria: 'łamigłówka', pytanie: '5 maszyn robi 5 rzeczy w 5 minut. Ile minut zajmie 100 maszynom zrobienie 100 rzeczy?', odpowiedzi: ['5', '100', '20', '500'] },
    { kategoria: 'łamigłówka', pytanie: 'Lilie na stawie podwajają się co dzień i pokrywają staw w 48 dni. Kiedy pokryją połowę?', odpowiedzi: ['47. dnia', '24. dnia', '46. dnia', '12. dnia'] },
    { kategoria: 'łamigłówka', pytanie: 'Masz 3 jabłka i zabierasz 2. Ile masz jabłek?', odpowiedzi: ['2', '1', '3', '5'] },
    { kategoria: 'geografia', pytanie: 'Stolicą Australii jest…', odpowiedzi: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
    { kategoria: 'geografia', pytanie: 'Najwyższy szczyt świata to…', odpowiedzi: ['Mount Everest', 'K2', 'Mont Blanc', 'Kilimandżaro'] },
    { kategoria: 'język', pytanie: 'Która forma jest poprawna?', odpowiedzi: ['Włączyć', 'Włanczać', 'Włonczyć', 'Wlączyć'] },
    { kategoria: 'język', pytanie: 'Autorem „Lalki” jest…', odpowiedzi: ['Bolesław Prus', 'Henryk Sienkiewicz', 'Stefan Żeromski', 'Eliza Orzeszkowa'] },
    { kategoria: 'nauka', pytanie: 'Ile wynosi π z dokładnością do dwóch miejsc?', odpowiedzi: ['3,14', '3,41', '2,71', '1,62'] },
    { kategoria: 'łamigłówka', pytanie: 'Jaka jest następna litera: A, C, F, J, …?', odpowiedzi: ['O', 'N', 'M', 'P'] },
  ],
];

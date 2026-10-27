# Pierwsza służba — prolog rekruta miejskiej straży

Wersja: 1.0, 27.10.2026. Źródło decyzji: rozmowa właściciela z projektantem.
Stan: przygotowany scenariusz i specyfikacja wdrożenia; jeszcze nie grywalny questline.
Sprawdzona baza kodu: `52cbdaff605975fc86edb5fbbbf33b60b616f79b` (`claude/bold-gauss-peehzd`).

## 1. Decyzje właściciela i zakres

- Każda nowa postać zaczyna jako rekrut/rekrutka miejskiej straży. To pochodzenie, nie nieodwracalna profesja.
- Obok gracza od pierwszego widoku stoi starszy strażnik: instruktor, początkowo poirytowany obowiązkiem szkolenia, z czasem okazujący szacunek. Żartuje rzadko i sytuacyjnie; nie poniża gracza.
- Misja 1: dostarczenie listu do pobliskiego posterunku i powrót do przełożonego; nauka chodzenia i interakcji.
- Misja 2: w przeciwnym kierunku uratowanie mieszkańca/łucznika napadniętego przez chochliki. Nagrodą jest jego stary łuk; gracz może go założyć i wypróbować.
- Misja 3: najbliższy odpowiedni loch przy cmentarzu lub świątyni; pierwsza walka, znalezienie różdżki i kapelusza, samoczynne założenie po dotknięciu, próba magii, odzyskanie skradzionego przedmiotu i powrót.
- Po relacji o magii przełożony kieruje do najbliższej biblioteki. To epilog trzeciej misji i przejście do dalszej gry.
- Prolog działa niezależnie od miasta startowego. Nie zapisujemy na sztywno Lublina, ulic, współrzędnych ani nazw instytucji.
- Właściciel informuje, że lochy są już dodane. W sprawdzonej bazie nie znaleziono jeszcze ich modułu: punkt integracji musi zostać dopasowany do gałęzi zawierającej tę funkcję. Nie tworzyć konkurencyjnego systemu lochów.

Imię instruktora, konkretne dialogi, liczby, fallbacki lokalizacji i wyjaśnienie wyposażenia poniżej są propozycją wykonawczą projektanta w ramach zleconego scenariusza, nie osobnymi wcześniejszymi decyzjami właściciela. Miś jest przyjętym tu wariantem jego przykładu skradzionego przedmiotu.

## 2. Postacie i ton

**Starszy strażnik / instruktor.** W roboczych tekstach bez imienia, etykieta „Starszy strażnik”. Na potrzeby krótkiego prologu jest także osobą, do której wracamy po zadaniach: „szef” oznacza dowodzącego patrolem. Nie dokładamy drugiego identycznego zleceniodawcy ani komendanta do każdej rozmowy.

Zaczyna obok bohatera, przy osiągalnym punkcie zbiórki. Po rozmowie zostaje tam jako stałe miejsce powrotu. Nie udaje towarzysza podróży, który znika przy pierwszej walce. Samodzielne wyjścia są od początku ćwiczeniami pod jego nadzorem. Pełne podążanie i walka towarzysza nie są wymagane w pierwszym wdrożeniu.

Jego stosunek zmienia się po czynach, nie po upływie czasu:

| Moment | Zachowanie |
|---|---|
| Początek | Oschły, zajęty, daje konkretne wskazówki. |
| Po liście | Krótkie uznanie, jeszcze drobna uszczypliwość. |
| Po ratunku | Pyta przede wszystkim, czy uratowana osoba jest cała. Zauważa samodzielność gracza. |
| Przed lochem | Powierza własne zadanie i pozwala się przygotować. |
| Po lochu | Traktuje relację poważnie, przyznaje, że o magii wie niewiele, kieruje do kogoś kompetentnego. |
| Po bibliotece | Przestaje używać „żółtodziób”, zwraca się po imieniu. |

**Łucznik.** Mieszkaniec w podróży, zaskoczony przez chochliki. Napastnicy odcięli mu drogę i możliwość spokojnego oddania strzału; nie jest zawodowym wojownikiem bezradnie czekającym na gracza. Ma obecny łuk oraz starszy zapasowy, który oddaje. Nie zostaje bez obrony.

**Właściciel misia.** Osoba zgłaszająca kradzież; może pozostać poza kadrem. Odzyskiwana zabawka jest osobistą, wiarygodną stawką. Strażnik nie wyśmiewa zgłoszenia: skoro chochliki kradną przy domach, trzeba sprawdzić ich kryjówkę.

**Bibliotekarz/bibliotekarka.** Rozpoznaje przedmioty jako działający komplet szkoleniowy. Nie rozwiązuje od razu zagadki właściciela. To otwarcie dalszego wątku, bez objawiania przeznaczenia bohatera.

## 3. Przebieg i gotowe dialogi PL

Teksty źródłowe są polskie. W runtime każda wypowiedź wymaga wersji PL/EN, zgodnie z `src/i18n.ts`. Żart oznaczyć metadanymi `localHumor: true`; cele i instrukcje mechaniki `false`. Użyć istniejącej obsługi płci w tekstach i nie zmieniać twarzy, włosów, wieku ani imienia przy zmianie broni. Mag to ten sam rekrut, bez automatycznej brody.

### Otwarcie: „Pierwsza służba”

Po zniknięciu ekranu ładowania starszy strażnik jest widoczny obok postaci. Jedna krótka rozmowa, później podpowiedź sterowania. Brak ataku podczas ładowania, dialogu i pierwszej próby ruchu.

Instruktor: „To ciebie przysłali? Dobrze. Tylko trzymaj się drogi. Mam dziś dość papierów bez raportu o zgubionym rekrucie.”

Instruktor: „Zaniesiesz list na posterunek. Tam potwierdzą odbiór i wracasz do mnie. Zacznijmy od tego, żeby trafić pod właściwe drzwi.”

Przycisk: „Pokaż drogę”. Cel: „Dostarcz list do: {posterunek}”.

Instrukcje wyświetlać według faktycznie aktywnego sterowania: telefon z joystickiem, klawiatura/mysz albo istniejący tryb walki. Nie kopiować starych wskazówek o rozmowie przez wymach mieczem do trybu, w którym obowiązuje podwójne stuknięcie.

### Misja 1: „Pod właściwy adres”

1. List trafia do osobnej kieszeni fabularnej. Jedna strzałka prowadzi do osiągalnego wejścia posterunku.
2. Po przejściu krótkiego odcinka podpowiedź ruchu znika; przy drzwiach pojawia się pojedyncza wskazówka interakcji.
3. Doręczenie wymaga interakcji z dyżurnym, nie samego wejścia w promień znacznika.
4. List zostaje zamieniony na potwierdzenie odbioru. Cel zmienia się na powrót do instruktora.
5. Oddanie potwierdzenia kończy zadanie, nagroda i postęp naliczają się raz.

Dyżurny: „Od patrolowego? Daj tutaj. A to potwierdzenie zabierz z powrotem, bo będzie mnie ścigał, że list zaginął między biurkiem a szufladą.”

Instruktor po powrocie: „Jest potwierdzenie. I jesteś ty. Dobry początek.”

Bez sztucznego limitu czasu i bez obowiązkowego ciosu w pustkę. Próba miecza wynika z następnej sytuacji.

### Misja 2: „Ktoś woła o pomoc”

Instruktor: „Teraz druga strona okolicy. Ktoś zgłosił chochliki zaczepiające przechodniów. Sprawdź trakt przy {okolica}. Jeśli ktoś potrzebuje pomocy, reaguj.”

1. Cel jest po przeciwnej stronie punktu zbiórki niż posterunek, o ile pozwala na to osiągalna sieć dróg. Napad nie wymaga konkretnego rodzaju budynku.
2. Z odległości widać łucznika i małą, przypisaną do zadania grupę chochlików (`glut` w obecnym katalogu). Propozycja: dwa słabe chochliki, do zbalansowania w aktywnym systemie walki.
3. Łucznik woła o pomoc. Walka uczy podstawowego ataku, poruszania i unikania sygnalizowanego zagrożenia. NPC nie umiera przez czytanie instrukcji ani zwłokę gracza.
4. Instruktor nie zabija za gracza. Po zwycięstwie rozmowa z uratowanym daje łuk i zapas strzał.
5. Przycisk „Wypróbuj łuk” bezpiecznie zamienia broń i otwiera krótką próbę na nieruchomym celu w pobliżu; „Później” zachowuje nagrodę. Nie wprowadzamy nowej obowiązkowej walki.
6. Próba zalicza się po strzale oddanym przez gracza. Nie wymaga trafienia losowo zależnego od celności. Po niej można wrócić do poprzedniej broni.
7. Powrót do instruktora zamyka misję. Próba łuku jest oferowana, a nie wymuszana jako warunek ratunku.

Łucznik przed ratunkiem: „Hej! Przydałaby się tu straż!”

Łucznik po ratunku: „Dzięki. Jeden od przodu, drugi od tyłu — nie miałem nawet gdzie napiąć cięciwy.”

Łucznik: „Mam zapasowy łuk. Stary, ale sprawny. Weź go, razem ze strzałami. Pokażę ci, jak celować.”

Instruktor po powrocie: „Człowiek cały? To najważniejsze. Dobra robota. Widzę, że potrafisz coś więcej niż nosić korespondencję.”

### Misja 3: „Zguba pod ziemią”

Instruktor: „Jest jeszcze sprawa przy {wejscieDoLochu}. Chochliki znoszą tam kradzione rzeczy. Zginął między innymi pluszowy miś. Sprawdź kryjówkę i przynieś zgubę.”

Opcjonalna odpowiedź gracza: „Wysyłasz straż po misia?”

Instruktor: „Po czyjąś własność. Wielkość właściciela nic tu nie zmienia.”

1. Wybieramy najbliższe osiągalne, odpowiednie wejście do już istniejącego systemu lochów: cmentarz lub świątynia. „Najbliższe” odnosi się do drogi, nie odległości w linii prostej.
2. Generujemy zapisaną instancję tutorialową istniejącego małego labiryntu, z ustalonym seedem. Jeden poziom, krótka odnoga, czytelne wyjście; nie ogromny losowy dungeon ani boss.
3. W pierwszej komorze mała grupa wrogów do pokonania mieczem albo łukiem. Po oczyszczeniu tej komory ujawnia się komplet: różdżka i kapelusz. Te przedmioty nie czekają dopiero w końcowej skrzyni.
4. Interakcja z kompletem automatycznie zakłada oba przedmioty jako jednorazowe zdarzenie fabularne. Zmienione wyposażenie i znacznik zdarzenia zapisują się razem. Poprzednia broń i nakrycie głowy nie znikają.
5. Krótka reakcja bohatera i wskazówka celowania. Pierwsze zaklęcie oddaje gracz; automatyczne wyposażenie nie powoduje samoczynnego strzału w NPC lub potwora.
6. W dalszej części są słabi przeciwnicy do wypróbowania magii. Można zmienić broń — nie robimy zamka otwieranego wyłącznie magią, który zablokuje osobę bez many lub z pełnym plecakiem.
7. Po oczyszczeniu obowiązkowej części gracz podnosi misia. Tylko wrogowie tej instancji liczą się do celu. Skrzynia dodatkowa może być opcjonalna; miś jest gwarantowany.
8. Wyjście prowadzi do tego samego wejścia w świecie. Powrót do instruktora i oddanie misia kończą główny cel, po czym dostajemy skierowanie do biblioteki.

Bohater przy znalezieniu: „Różdżka… i kapelusz? Kto zostawia tu takie rzeczy?”

Po dotknięciu: „Ej, chwila. Ja tego nie zakładam…”

Po wyposażeniu: „…samo się założyło. A ta różdżka chyba działa.”

Podpowiedź: „Wyceluj i rzuć pierwsze zaklęcie.”

Bohater po powrocie: „Miś jest. Znalazły się też różdżka i kapelusz. Same się założyły. A potem udało mi się rzucić czar.”

Instruktor: „Miś wróci do właściciela. A z różdżką… dobra, bez żartów. Na tym się nie znam. Idź do {biblioteka}. Tam powinni wiedzieć, co trzymasz.”

Instruktor: „I nie sprawdzaj tego na moim biurku.”

### Epilog: „Kto zostawił kapelusz?”

Biblioteka jest kontynuacją, nie nową długą misją. Najbliższy osiągalny punkt wiedzy, krótka rozmowa i bezpieczny cel do zaklęcia. Nie pobieramy opłaty za wyjaśnienie funkcji, którą gracz właśnie dostał.

Bibliotekarka/bibliotekarz: „To komplet do nauki. Kapelusz dostraja różdżkę i pomaga utrzymać zaklęcie. Dlatego zadziałało, choć nikt cię jeszcze nie uczył.”

Na pytanie „Czyje to rzeczy?”: „Nie wiem. W środku jest znak, ale nie poznaję go. Nie wygląda na znak naszego warsztatu.”

Dalej: „Mogę pokazać ci podstawy. Potem zdecydujesz, czy chcesz rozwijać magię, łucznictwo czy walkę mieczem. Sprzęt można zmieniać — nie musisz dzisiaj wybierać na zawsze.”

Po rozmowie magia jest normalnie dostępna w dotychczasowym systemie. Przed rozmową ma działać już w lochu: znalezienie kompletu musi odblokować realny atak, nie sam wygląd. Nie uzależniać zapisu tymczasowej zdolności od obecności obu przedmiotów w dwóch identycznych nazwach slotów.

Wybrany wariant wykonawczy: przy pierwszym podniesieniu kompletu trwale ustawić istniejące `gear.magic = true`, razem z wyposażeniem i znacznikiem nagrody. To odkrycie podstawowej zdolności, nie wybór profesji. Biblioteka wyjaśnia i rozwija magię zamiast ponownie ją „odblokowywać”. Nie dodawać drugiej, konkurencyjnej flagi magii ani nie odbierać zdolności po wyjściu z lochu. Zmienić dialog standardowej biblioteki dla tej postaci, aby nie proponował płatnego odblokowania już poznanej zdolności.

Ostatnia wiadomość instruktora, przy kolejnym naturalnym spotkaniu, bez wymuszonego czwartego powrotu: „{imie}, mam dla ciebie następne zlecenie. Tym razem nie będę tłumaczył, gdzie są drzwi.”

To koniec prologu. Wątek właściciela kapelusza pozostaje otwarty. Nie dopisujemy jeszcze jego rozwiązania ani wybrańca.

## 4. Dobieranie miejsc na dowolnej mapie

### Zapisywany zestaw lokalizacji

`home`/punkt zbiórki, `mentor`, `outpost`, `ambush`, `bowPractice`, `dungeonEntrance`, `library`.
Każda kotwica ma: ID mapy, stabilne ID źródłowego miejsca albo ID punktu zastępczego, geograficzną pozycję, wersję i rodzaj fallbacku. Pozycje świata i wnętrza lochu są różnymi przestrzeniami; przy przeliczaniu pikseli zachować skalę.

Plan powstaje raz dla postaci i zostaje w zapisie. Nie używać sesyjnego nonce losowych zleceń. Ponowne logowanie, zmiana miasta i dogranie kolejnego kafelka nie losują nowego łucznika ani nie przenoszą instruktora.

### Kolejność planowania

1. Po ustaleniu startu dograć lokalne dane mapy w kontrolowanym obszarze. Oddzielić „brak miejsca” od „kafelek jeszcze nie dotarł”. Nie skanować całego kraju ani świata.
2. Wybrać wolny, osiągalny punkt instruktora kilka kroków od gracza, poza drzwiami i ruchem. To stałe miejsce powrotu.
3. Posterunek: preferować pobliską policję. Straż pożarna jest dopuszczonym przez właściciela rodzajem punktu, lecz wymaga potwierdzenia obsługi w aktualnym importerze OSM — w sprawdzonym `Place.kind` nie ma osobnego `fire_station`. Nie traktować dworca jako posterunku tylko dlatego, że zawiera słowo „station”.
4. Bez odpowiedniego posterunku: osiągalny urząd jako punkt dyżurnego; ostatecznie mały punkt patrolowy/NPC w bezpiecznym miejscu. Gra nazywa go punktem straży, nie udaje, że na prawdziwej mapie istnieje komenda. To fallback fabularny, bez trwałej edycji OSM.
5. Napad: preferować przeciwległy sektor względem **punktu zbiórki**. Dla wektorów do posterunku i napadu po normalizacji preferencja `dot <= -0.5` (kąt co najmniej 120°). Najpierw jednak wymagane są osiągalność i bezpieczeństwo trasy. W mieście z rzeką lub jedną drogą dopuścić największy dostępny kąt zamiast celu za wodą. Kierunek pierwszego rozgałęzienia trasy ma znaczenie; dwa punkty geograficznie przeciwne mogą wymagać tej samej długiej drogi.
6. Napad tworzyć jako wydzielone spotkanie zadania w kieszeni poza bezpiecznym punktem startowym. Nie wyłączać globalnie ochrony domu i nie dosypywać zwykłych łowisk do centrum. Podejście i powrót nie powinny prowadzić przez niekontrolowane silne grupy.
7. Loch: z istniejącego indeksu wejść wybrać najbliższe dostępne, osiągalne i obsługujące mały wariant prologu. Wczesna wizyta przed misją nie może skonsumować fabularnego wyposażenia lub misia. Właściwa instancja jest przypisana do prologu postaci.
8. Biblioteka: najbliższa osiągalna w budżecie drogi. Jeśli jej brak, dyżur bibliotekarza w dostępnym urzędzie/szkole jako jawny zastępczy punkt wiedzy. Dialog mówi o dyżurze, nie zmyślonej bibliotece w budynku.

Jeśli okolica nie ma żadnego wejścia do lochu, samo hasło „najbliższy” nie rozwiązuje problemu. Najpierw rozszerzyć lokalne wyszukiwanie w limicie czasu podróży. Potem, jeśli istniejący system to obsługuje, utworzyć jedno prologowe wejście do małej piwnicy na osiągalnym terenie i użyć tego samego generatora wnętrza. To propozycja fallbacku, nie potwierdzona funkcja. Bez obsługi takiego wejścia nie ogłaszać jeszcze pełnej niezależności od miejsca startu; nie kończyć misji automatycznie i nie teleportować gracza przez pół kraju.

### Tempo

Cel: około 12–18 minut aktywnej gry do biblioteki, w sesjach, które można przerwać. To budżet do sprawdzenia, nie gwarantowany czas.
Planista liczy długości osiągalnych tras i czas według rzeczywistej bazowej prędkości postaci. Propozycja: do 6 minut łącznego obowiązkowego chodzenia, reszta na walkę, dialogi i labirynt. Nie dobierać jednego stałego promienia „500 m” dla wszystkich skali i miast. Każdy powrót do instruktora wliczać do budżetu.

Wyczerpanie budżetu uruchamia fallback lokalizacji. Nie kompensujemy złego planu automatycznym przyspieszaniem bohatera lub zmniejszaniem świata.

## 5. Kontrakt postępu i ekwipunku

To propozycja nowego zapisu, nie istniejące już pole API. Dopasować do aktualnego snapshotu i jego roundtripu przez serwer. Nie zakładać, że nieznane pola obiektu zostaną automatycznie zachowane przez RPC.

| Pole | Znaczenie |
|---|---|
| `version` | Wersja schematu prologu. |
| `status` | `active`, `completed` albo `skipped`; ukończenie i pominięcie są odrębne. |
| `originMapId`, `anchors` | Startowa mapa i utrwalone miejsca. |
| `stage` | Stabilny identyfikator etapu z listy poniżej. |
| `rewardsClaimed` | Identyfikatory jednorazowych nagród/zdarzeń. |
| `bowTried`, `magicTried` | Faktycznie wykonane próby; pominięcie łuku nie udaje próby. |
| `dungeon` | ID instancji, seed, stan pokonanych grup, podniesień i punkt wznowienia. |
| `storyItems` | List, potwierdzenie, miś — nie zwykły plecak handlowy. |
| `pendingRewards` | Bezpieczny odbiór rzeczy, których nie zmieścił plecak. |

Stabilna kolejność etapów:

`intro` → `letter_deliver` → `letter_return` → `rescue_fight` → `rescue_reward` → `bow_trial` → `rescue_return` → `dungeon_enter` → `dungeon_first_group` → `magic_pickup` → `magic_trial` → `dungeon_recover` → `dungeon_return` → `library_visit` → `completed`.

`bow_trial` ma jawne wyjście „Później”, bez zaznaczenia `bowTried`. `magic_trial` nie wymaga wygranej wyłącznie różdżką; zachowuje możliwość zmiany broni i wyjścia. Przykładowe ID nagród: `letter_done`, `bow_received`, `magic_set_received`, `bear_returned`. ID są stałe w obrębie postaci, niezależne od miasta i sesji.

- Zachować obecne mechanizmy EXP, obrażeń, kosztów zasobów, śmierci/szpitala i umiejętności. Nie budować osobnej walki tutorialowej. Pierwsze spotkania należy odpowiednio zbalansować, bez wymuszania zakupów.
- Startowe wyposażenie strażnika musi odpowiadać temu, czym naprawdę walczy: obecny `freshGear()` daje `kijek`, podczas gdy model 3D pokazuje miecz. Wdrożenie ma jawnie uzgodnić broń/statystyki i widok, nie tylko zmienić nazwę w dialogu.
- Łuk i komplet magiczny mają być podstawowe, bez przeskoku gospodarczego. Można użyć istniejących `luk`, `rozdzka`, `czapka_maga` dopiero po ocenie wartości i możliwości odsprzedaży; darmowy komplet nie może stać się farmą pieniędzy.
- Do łuku dać np. 20 strzał (liczba do balansu); nieustannie odnawialny próbny zapas może działać wyłącznie na celu treningowym bez nagród i treningu umiejętności. Nie dawać bez końca handlowej amunicji.
- Komplet magiczny jest jednym fabularnym podniesieniem, dającym dwa prawdziwe przedmioty. Automatycznie zakłada się raz po świadomej interakcji, nie po każdym załadowaniu wnętrza.
- Wymiana sprzętu jest bezstratna i odporna na pełny plecak. Przy pełnym plecaku stary sprzęt trafia do trwałego depozytu odbioru/pending, dostępnego z ekwipunku; nie spada w niedostępne miejsce i nie jest usuwany. Powtórna interakcja nie kopiuje nagród.
- Gdy różdżka i kapelusz się założą, pojawia się krótka informacja o zmianie oraz dostęp do poprzedniej broni. Nie blokować slotów i nie przerysowywać twarzy bohatera na inną postać.
- Gracz powinien mieć dość many na pierwszą próbę; regeneracja/odpoczynek muszą pozwalać kontynuować bez zakupu mikstury. Łuk może skończyć amunicję, ale miecz pozostaje dostępny. Rzucenie pierwszego czaru zaliczać po faktycznej akcji, nie tylko zmianie ikonki.
- Restart po porażce korzysta z obecnego szpitala. Zapisany prolog, wyposażenie i miś nie przepadają. Wnętrze pozwala wznowić zadanie; nie naliczać ponownie łupów już pokonanych grup przez samo wejście/wyjście.
- Powrót po reloadzie nie odtwarza starego wyposażenia nad nowszym świadomym wyborem gracza. Dialogi nie zaliczają się ponownie. Tam, gdzie silnik ma gwarancje wyłącznie lokalne, dodać spójny checkpoint i obsługę nieudanego zapisu zamiast obiecywać serwerową transakcję.

## 6. Wpięcie do sprawdzonego kodu

| Obszar | Obecny punkt | Wymagana praca |
|---|---|---|
| Dotychczasowy start | `src/scenes/SamouczekStartu.ts`, `GameScene.startSamouczek` | Zastąpić prowadzenie do gazeciarza nowym prologiem dla nowych postaci. Nie uruchamiać obu jednocześnie. |
| Prowadzenie do celu | `GameScene.activeQuests`, `samouczekCel` | Jeden bieżący cel prologu, wliczany i wyświetlany świadomie, bez zdublowanych strzałek. |
| Misje i etapy | `src/content/fabula.ts`, `src/scenes/Etapy.ts`, `src/quests.ts` | Stabilne ID, nowe eventy ratunku/podniesienia/lochu/wyposażenia. Samo `Etap.daje` nadaje nazwy fabularne, nie zapewnia pełnej obsługi sprzętu. |
| Miejsca i trasy | `CityMap.places`, `ensure`, `reachableNear`, `roadPath` | Ograniczone wyszukiwanie, dogranie kafli, walidacja osiągalności i utrwalenie kotwic. `reachableNear` samo nie dowodzi całej trasy. |
| Wyposażenie | `src/inventory.ts`, `src/content/przedmioty.ts` | Nagrody, amunicja, bezpieczna zamiana dwóch slotów; `addItem` nie gwarantuje automatycznego założenia w zajęty slot. |
| Magia i biblioteka | `gear.magic`, `rangedWeapon()`, biblioteka w `GameScene` | Ustawić `gear.magic` już przy podniesieniu kompletu; `rangedWeapon` odrzuca obecnie magię bez tej flagi. W bibliotece wyjaśnienie i szkolenie zamiast ponownego płatnego odblokowania. |
| Modele i animacje | `src/ludzik3d.ts` oraz aktualne modele innych wykonawców | Zmiana broni/stroju i prawidłowy atak łukiem/różdżką. W sprawdzonej bazie jeden model strażnika; nie twierdzić, że same questy tworzą brakujące animacje. |
| Lochy | Moduł z gałęzi, w której dodano labirynty | Adapter wejścia, instancji, strefy pierwszej grupy, podniesienia kompletu, skrzynki z misiem i powrotu. Nie podajemy wymyślonej istniejącej nazwy pliku. |
| Zapis | Aktualny snapshot w `src/api.ts` / `src/quests.ts` i właściwy RPC | Roundtrip prologu, nagród, skali i instancji. Jeżeli konieczna migracja, osobny SQL i dotychczasowe zasady ochrony danych. |

Dla nowej postaci prolog jest głównym wprowadzeniem. Dotychczasowy gazeciarz i pozostałe misje pozostają później dostępne. Stare postacie nie zostają automatycznie przebrane ani cofnięte do rekruta; potrzebują jawnej opcji rozpoczęcia/obejrzenia prologu. Nie używać samego progu EXP jako dowodu, że postać jest nowa.

Istniejące QR demo i jego pobudka to oddzielna ścieżka: nie zmieniać snu i nie dokładać dwóch samouczków. Decyzja właściciela dotyczy normalnego startu; ewentualne wpięcie po demo wymaga świadomego dopasowania do jego obecnego ciągu, nie automatycznej podmiany.

Nie wymuszać wyboru profesji przed biblioteką. W epilogu gracz może wskazać preferowany kierunek szkolenia; zapis preferencji nie odbiera dwóch pozostałych broni. Kolejny etap progresji profesji można dobudować później.

## 7. Sprawdzenie przed uznaniem za wdrożone

| Przypadek | Oczekiwany wynik |
|---|---|
| Dwa odległe miasta i różne skale | Ten sam przebieg, inne lokalne miejsca, osiągalne drzwi i krótki czas dojścia. |
| Brak policji/straży pożarnej | Lokalny, jawny punkt zastępczy; misja doręczenia nadal działa. |
| Brak biblioteki | Działający dyżur bibliotekarza, bez fikcyjnej etykiety prawdziwego budynku. |
| Brak lochu / kafel jeszcze w drodze | Najpierw czekamy na ograniczone dogranie; potem obsługiwany fallback. Brak nieskończonego ładowania i fałszywego zakończenia. |
| Rzeka, mur, zamknięty dziedziniec | Osiągalna trasa ma pierwszeństwo przed idealnie przeciwnym kierunkiem. |
| Reload po każdym oddaniu i podniesieniu | Ten sam etap i lokalizacje, wyposażenie nie znika, nagrody się nie mnożą. |
| Zmiana miasta w trakcie | Prolog zostaje przy startowym mieście, nie tworzy się drugi komplet nagród. |
| Pełny plecak przed łukiem i przed kompletem | Żaden stary przedmiot nie ginie; odbiór jest trwały i możliwy. |
| Brak strzał / brak many | Można odpocząć, zmienić broń i kontynuować. Pierwsza próba nie wymaga zakupu. |
| Wejście do lochu przed misją, wyjście i powrót | Nie można zablokować/ukraść własnych przyszłych przedmiotów fabularnych ani farmić tych samych nagród. |
| Porażka w napadzie lub lochu | Szpital i wznowienie, bez utraty prologu i zdublowanych NPC. |
| Starsza postać, również z małym EXP | Brak przymusowego resetu, przebrania i automatycznego nadania nagród. |
| Telefon poziomo i komputer | Instrukcje odpowiadają sterowaniu, dialogi czytelne, brak okien nad aktywną walką. |
| Różne płcie i styl walki | Ta sama tożsamość postaci, prawidłowa broń i animacja; żadnej brody przy automatycznej próbie magii. |
| PL/EN | Cały nowy prolog przetłumaczony, humor oznaczony, cele zawsze zrozumiałe. |

Pełne wdrożenie oznacza przejście tego ciągu w grze, zapis/wznowienie, build oraz oględziny na komputerze i telefonie. Sam ten dokument ani podłączenie samych dialogów nie oznaczają działającego questline.

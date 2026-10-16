# Exp-lore — spotkania i walka półturowa na mapie

**ARCHIWUM — 16.10.2026 właściciel polecił wycofać wdrożenie i odłożyć doprecyzowanie. Dokument nie jest aktualnym poleceniem wdrażania.**

Data: 16 października 2026. Wersja: 1.0, po korektach właściciela do makiety.

Status: specyfikacja do wykonania prototypu na serwerze TEST. Ten dokument nie oznacza, że mechanika została wdrożona. Nie wykonywać wydania produkcyjnego.

## 1. Polecenie dla Codexa / programisty

Wdroż na TEST prototyp spotkań oraz walki półturowej według poniższych zasad. Najpierw przeczytaj aktualne AGENTS.md i CLAUDE.md w repozytorium. Sprawdź obecny kod grup, mgły, interakcji, walki, przedmiotów, zapisu oraz sterowania. Dostosuj rozwiązanie do aktualnej wersji gry; wymienione niżej miejsca w kodzie są wskazówką, nie potwierdzeniem ich dzisiejszej zawartości.

Zachowaj zatwierdzony kierunek projektu. Samodzielnie dobierz i opisz w przekazaniu wartości startowe potrzebne do działającego prototypu: ruchy według poziomu, koszty, zasięgi, liczebność grup oraz szanse zdarzeń. Nie pozostawiaj prototypu bez tych wartości i nie traktuj liczb z przykładów jako zatwierdzonego balansu.

Wprowadź zmianę zgodnie z aktualnymi zasadami repozytorium: praca na chatgpt/praca, weryfikacja, następnie zwykłe scalenie do claude/bold-gauss-peehzd dla wdrożenia na https://exp-lore.app/test/. Nie zmieniaj PRODUKCJA, numeru wydania produkcji ani produkcja/. Jeżeli aktualne instrukcje repozytorium zmieniły ten proces, zastosuj aktualne. Uzupełnij dokumentację i przekazanie z wynikami testów oraz wybranymi parametrami.

## 2. Cel i granice zmiany

Obecna walka jest odczuwana jako ciągłe podchodzenie i odpychanie się bronią. Przeciwników trudno szukać za budynkami, a długie przemieszczanie bez zdarzeń osłabia eksplorację.

Nowy system ma dawać krótkie spotkania z czytelnymi decyzjami: czy podejść do postaci, z kim porozmawiać, gdzie się ustawić, kogo zaatakować i na co wydać dostępne ruchy. Poziom oraz przedmioty mają otwierać możliwości taktyczne. Walka pozostaje na tej samej mapie miasta, w tym samym miejscu.

Pierwsze wdrożenie obejmuje spotkania, grupy, wybór podejścia, sterowanie turami, ruch po mapie, ataki oraz szczęśliwe zdarzenia. Rozbudowa questów i systemu znajdziek pozostaje oddzielnym zadaniem. Istniejące łupy i nagrody powinny nadal działać.

## 3. Wiążące korekty właściciela

1. Pierwszy wybór brzmi „Podejdź bliżej / Uniknij”. Nie zakłada walki: ze smokiem można również porozmawiać.
2. Spotkanie może zawierać grupkę albo jedną postać / stworzenie.
3. Walka odbywa się na istniejącej mapie. Nie przenosi bohatera do osobnej areny.
4. System jest półturowy: gracz wybiera działania bez presji czasu; animacje wykonania są krótkie i płynne.
5. Zasób nazywa się „ruchy”, nie PA. W swojej turze bohater ma określoną liczbę ruchów do wydania na różne działania.
6. Liczba dostępnych ruchów zależy od poziomu postaci. Ruchy i ich koszty muszą być konfigurowalne.
7. Zwykły atak i przemieszczenie są oddzielnymi działaniami. Można wykonać krok i zaatakować, jeżeli wystarcza ruchów. Mocniejszy atak może kosztować np. dwa ruchy.
8. W fazie odpowiedzi przeciwnicy również wykonują ograniczoną liczbę ruchów. Punktem wyjścia do sprawdzenia jest jeden ruch na aktywnego przeciwnika; końcowe wartości dobiera programista z uwzględnieniem przeżywalności bohatera.
9. Koniczynka jest sygnałem szczęśliwego zdarzenia, nie stałym slotem przedmiotu w tym widoku. Zdarzenie może dać krytyk, unik, blok albo dodatkowy ruch.
10. Ikona zwykłego ataku mieczem przedstawia miecz. Nie używać przypadkowego symbolu niezwiązanego z działaniem.

Wcześniejsza makieta pokazuje kierunek wizualny. Teksty „Walcz / Omiń”, licznik PA, stała ikona koniczynki i sztywne dwa ruchy z makiety są zastąpione powyższymi ustaleniami. Nie kopiować z makiety dawnych elementów HUD, jeśli obecna gra ma już nowszy interfejs.

## 4. Spotkanie: mgła, podejście i rozmowa

### 4.1. Obszar spotkania

Małą grupę lub pojedyncze stworzenie można oznaczyć delikatną mgiełką wokół miejsca spotkania. Punktem wyjścia dla małej grupy jest promień około 30 m od środka spotkania, nie 30 m wokół każdego uczestnika. Ostateczna wartość podlega testom skali świata.

Mgiełka ma być przejrzysta, blisko ziemi i odróżnialna od mgły wojny. Nie zasłania ścieżek, postaci i celu przemieszczenia. Nie odsłania nieodkrytego terenu ani ukrytych uczestników. Nie oznacza automatycznie wrogości; wygląd może wynikać z tego, co gracz już wie o spotkaniu.

W dokumentacji odczytanej w tej rozmowie opisano już terytoria gangów, mgłę i ograniczenie pościgu. Przed implementacją sprawdź faktyczny kod. Wykorzystaj istniejący mechanizm zamiast tworzyć drugi, konkurencyjny system. Rozmiary dużych terytoriów gangów i małego obszaru interakcji mogą być różne; nie zmniejszaj mechanicznie wszystkich istniejących gangów do 30 m.

### 4.2. Wybór „Podejdź bliżej / Uniknij”

Po wejściu w zasięg interakcji pojawia się krótki opis spotkania i dwa duże przyciski:

- Podejdź bliżej / Approach.
- Uniknij / Avoid.

Samo wejście w mgłę lub wyświetlenie wyboru nie rozpoczyna zadawania obrażeń. Uczestnicy nie mogą bić bohatera podczas czytania tego okna. Nie pokazywać danych o postaciach, których bohater nie odkrył.

„Podejdź bliżej” uruchamia zachowanie spotkania zależne od jego treści i nastawienia:

| Typ spotkania | Rezultat podejścia |
| --- | --- |
| Rozmówca, neutralne stworzenie, przyjazny smok | Rozmowa / interakcja fabularna |
| Jawnie wroga grupa | Rozpoczęcie walki |
| Spotkanie z wyborem fabularnym | Dialog; walka tylko jeśli wynika z wyboru lub scenariusza |

Sam gatunek „smok” nie może uruchamiać walki. Wyraźne zasady zadania / scenariusza mają pierwszeństwo przed domyślnym zachowaniem rodzaju przeciwnika. Przy znanej wrogiej grupie opis powinien uprzedzać, że podejście rozpocznie starcie.

„Uniknij” zamyka interakcję i pozwala odejść. Nie uruchamia automatycznego ataku w tej samej chwili ani nie otwiera okna ponownie co klatkę. Zastosuj ponowne uzbrojenie po wyjściu z obszaru / świadomym ponownym wybraniu spotkania. Uniknięcie spotkania i unik ciosu w walce to dwa różne mechanizmy.

Punkt interakcji i miejsce ustawienia bohatera muszą być osiągalne po istniejących przejściach. Nie wymagaj szukania jednego stworka za budynkiem. Podejście respektuje kolizje; jeśli drogi nie ma, nie pobieraj kosztu i nie przenoś bohatera przez ścianę.

## 5. Tura i ruchy

### 5.1. Definicje oraz język

| Znaczenie | PL w interfejsie | EN w interfejsie / dokumentacji |
| --- | --- | --- |
| Faza działań danego uczestnika | Tura | Turn |
| Jednostki do wydania w turze | Ruchy | Moves |
| Jedna jednostka kosztu | 1 ruch | 1 move |
| Fizyczna zmiana położenia | Przemieszczenie; przycisk „Ruch” | Reposition; przycisk „Move” |
| Zwykłe uderzenie | Atak | Attack |
| Działania szczególne | Specjalne | Special |
| Oddanie kolejki | Zakończ turę | End turn |

„Moves” to wybrana etykieta produktu, obejmująca także ataki. Krótka pierwsza podpowiedź wyjaśnia: „W swojej turze wydajesz ruchy na atak, przemieszczenie i zdolności”. Po angielsku: „Spend moves on attacks, repositioning and abilities during your turn.” W kodzie można zachować jednoznaczną nazwę techniczną zasobu; nie musi ona być nazwą prezentowaną graczowi.

Licznik: „Ruchy: 2/3” / „Moves: 2/3”. Koszt: „1 ruch”, „2 ruchy”, „5 ruchów” z poprawną odmianą. Nie wyświetlać „PA”, „AP” ani „punkty ruchu”.

### 5.2. Przebieg rundy — wariant startowy do prototypu

1. Po rozpoczęciu starcia ustal uczestników i pokaż turę bohatera.
2. Bohater otrzymuje bazową pulę ruchów wyliczoną z poziomu oraz jawnych modyfikatorów.
3. Wybiera działanie, cel / pozycję i zatwierdza. Koszt pobierany jest przy wykonaniu prawidłowej akcji.
4. Po animacji może wydać pozostałe ruchy. Podczas planowania przeciwnicy czekają.
5. Gdy nie ma ruchów na dostępne działanie albo gracz wybierze „Zakończ turę”, zaczyna się odpowiedź przeciwników.
6. Każdy aktywny przeciwnik wykonuje przydzieloną liczbę ruchów; na start sprawdzić po jednym. Pokonani nie odpowiadają.
7. Po ich odpowiedzi rozpoczyna się kolejna tura bohatera.

To wariant „pula bohatera, następnie odpowiedź przeciwników”, a nie automatyczna odpowiedź całej grupy po każdym pojedynczym kliknięciu bohatera. Przykład „krok i atak, potem rywale” musi być możliwy, gdy pula i koszty na to pozwalają. Ruchy odnawiają się na początku własnej tury; na start niewydane ruchy nie przechodzą na kolejną turę. To ostatnie jest proponowaną regułą porządkującą prototyp.

Przeciwnik mający jeden ruch nie dostaje ukrytego darmowego dojścia i ataku, jeżeli dla bohatera są to dwa płatne działania. Jeśli jakaś zdolność łączy ruch z uderzeniem, jej reguła, koszt oraz zapowiedź muszą być jawne.

### 5.3. Koszty

| Działanie | Przykładowy koszt startowy | Warunek |
| --- | ---: | --- |
| Zwykły atak mieczem | 1 ruch | Cel żyje, jest osiągalny bronią i znajduje się w zasięgu |
| Jedno przemieszczenie | 1 ruch | Wybrana pozycja mieści się w budżecie drogi |
| Atak specjalny | Np. 2 ruchy | Odpowiednia zdolność / przedmiot i prawidłowy cel |
| Aktywny przedmiot | Według definicji | Koszt i efekt widoczne przed użyciem |

Liczby to propozycje do zbalansowania, nie zatwierdzona stała. Podgląd, otwarcie listy zdolności, zmiana zaznaczenia i anulowanie przed zatwierdzeniem nie kosztują ruchów. Brak zasięgu nie uruchamia niejawnego bezpłatnego podejścia. Blokada przycisku musi wynikać z czytelnej przyczyny.

## 6. Poziom, przeciwnicy i skalowanie

Liczba ruchów bohatera ma zależeć od poziomu. Programista wybiera startową tabelę / progi i umieszcza je w konfiguracji razem z kosztami, zasięgami i pulami przeciwników. Nie rozrzucać tych liczb po interfejsie i logice walki.

Zalecenie: ruchy zwiększać na wybranych progach rozwoju, z kontrolowanym maksimum. Przyznawanie dodatkowego ruchu na każdym poziomie bardzo szybko wydłuży turę i zwielokrotni liczbę ataków. Nie jest wymagane liniowe „poziom = liczba ruchów”.

Balans rozpatrywać dla całej grupy. Bohater z dwoma ruchami przeciw pięciu przeciwnikom po jednym ma do przyjęcia nawet pięć działań w odpowiedzi. Również najtańsze potwory mogą wówczas zabić go przed następną decyzją. Z kolei dodatkowe ruchy połączone z większymi obrażeniami i częstymi krytykami mogą dać bohaterowi nadmierną przewagę.

Dobierając parametry, uwzględnij: poziom i życie bohatera, typowy ekwipunek na tym etapie, obrażenia i zasięgi, liczebność / role w grupie, koszt dojścia, leczenie oraz zdarzenia szczęścia. Ogranicz trudność zwykłego spotkania składem i pulami działań. Nie naprawiaj przewagi liczebnej wyłącznie ogromną liczbą punktów życia.

Zwykłe, odpowiednie do poziomu spotkanie nie powinno zabijać zdrowego bohatera w pierwszej odpowiedzi bez możliwości sensownej reakcji. Mocniejszy przeciwnik powinien być czytelnie rozpoznawalny przed podejściem. Ostateczne liczby i odstępstwa dla bossów pozostają decyzją programisty do sprawdzenia na TEST.

## 7. Przemieszczenie i znaczenie ustawienia

Po wybraniu „Ruch” pokaż obszar dostępnego przemieszczenia wokół aktualnej pozycji, jak zakreślony cyrklem promień. Dystans jednego działania jest ograniczony i konfigurowalny.

- Koło przedstawia maksymalny zasięg. Faktycznie dostępne pozycje uwzględniają długość przejścia, budynki, wodę i inne obowiązujące kolizje.
- Pokaż podgląd trasy i koszt przed wykonaniem; droga nie może przecinać ściany.
- Na telefonie pierwsze wskazanie może ustawiać cel, a jawne potwierdzenie go wykonywać; umożliw anulowanie bez kosztu.
- Niedostępny punkt jest odrzucony czytelnie, bez utraty ruchu.
- Przemieszczenie nie ujawnia terenu z wyprzedzeniem. Odkrywanie następuje zgodnie z aktualną mechaniką widzenia po rzeczywistym ruchu.
- Podgląd może pokazać cele, które będą w zasięgu ataku po dojściu.

Promień spotkania i zasięg jednego przemieszczenia to różne wartości oraz różne nakładki. Nie robić z 30 m automatycznie zasięgu jednego ruchu.

Ustawienie musi wpływać na walkę: zasięg miecza, linia strzału, przeszkody i zapowiadany obszar mocnego ataku. Dla prototypu wystarczy mały, spójny zestaw tych zasad. Przeciwnik przygotowujący silny cios powinien pokazać jego kierunek / obszar, aby można było zareagować przemieszczeniem. Nie projektować każdej odpowiedzi tak, aby zawsze dosięgała bohatera niezależnie od wybranej pozycji.

Zwykłe uderzenie nie powinno stale rozrzucać walczących i wymuszać pogoni. Duży odrzut może być jawnym efektem określonej zdolności; szanuje kolizje i granice spotkania.

## 8. Koniczynka: szczęśliwe zdarzenie

Koniczynka pojawia się chwilowo przy rozstrzygnięciu korzystnego zdarzenia. Nie jest stale pokazywanym slotem wyposażenia ani przyciskiem aktywującym szczęście. Ta specyfikacja nie wymaga dodania ani usunięcia przedmiotu o takiej nazwie w ekwipunku.

| Rodzaj zdarzenia | Kiedy losować | Skutek / przykładowy komunikat |
| --- | --- | --- |
| Krytyk | Przy prawidłowo wykonywanym ataku | Zwiększony efekt uderzenia; „Szczęście! Krytyk” |
| Unik | Przy rozstrzyganiu nadchodzącego trafienia | Cios nie trafia; „Szczęście! Unik” |
| Blok | Przy rozstrzyganiu nadchodzącego trafienia, gdy spełnione są warunki bloku | Redukcja obrażeń; „Szczęście! Blok” |
| Dodatkowy ruch | Proponowany punkt startowy: początek własnej tury | +1 do bieżącej puli; „Szczęście! +1 ruch” |

Programista dobiera konkretne szanse i mnożniki. Wcześniejsze 10% to przykład z rozmowy, nie uniwersalna, zatwierdzona szansa każdego efektu. Efekty mogą wynikać z odpowiednich statystyk i przedmiotów, jeśli ich istniejące definicje to wspierają.

Ważne reguły wykonania:

- Wynik losowany jest przy rozstrzygnięciu, nie przy zaznaczaniu celu, przeglądaniu opcji lub odświeżaniu interfejsu.
- Dodatkowy ruch nie oznacza dodatkowej pełnej tury i nie wywołuje kolejnego losowania dodatkowego ruchu. Zapobiec nieskończonym łańcuchom.
- Przy proponowanym bonusie na początku tury limit wynosi jedno takie zdarzenie na turę. Inny moment losowania wymaga równie jasno ograniczonej reguły.
- Unik i blok mają ustaloną kolejność rozstrzygania; nie uruchamiać obu na tym samym ciosie i nie pokazywać obu komunikatów.
- Wybrana postawa obronna, jeśli istnieje, jest osobną mechaniką od losowego szczęśliwego uniku / bloku.
- Koniczynka i krótki tekst nie blokują sterowania na długi czas. Informacja jest zrozumiała także bez rozróżniania kolorów.

## 9. Przedmioty i zdolności

Koszty w ruchach umożliwiają lepsze wykorzystanie ekwipunku. Przykładowe kierunki, nie lista obowiązkowych nowych przedmiotów:

- Broń ze specjalnym atakiem za więcej ruchów: przełamanie osłony, atak obszarowy lub efekt taktyczny.
- Buty zwiększające dystans jednego przemieszczenia.
- Tarcza wpływająca na skuteczność / szansę bloku, o ile postać rzeczywiście jej używa.
- Przedmiot zmieniający szansę odpowiedniego szczęśliwego zdarzenia.
- Szczególny, kontrolowany efekt dający dodatkowy ruch lub zmieniający koszt wskazanej zdolności.

Nie dodawać automatycznie tych cech wszystkim obecnym przedmiotom. Najpierw sprawdzić katalog i zachować dotychczasowe zatwierdzone efekty. Zwłaszcza automatyczne obrażenia i efekty oparte na czasie rzeczywistym muszą dostać jednoznaczne miejsce w turze, żeby nie działały wielokrotnie podczas spokojnego wybierania akcji.

## 10. Interfejs na telefon i komputer

Na mapie podczas walki:

- Czytelna informacja „Twoja tura” / „Ruch przeciwników”.
- Licznik „Ruchy: pozostałe/pula tej tury”; bonus szczęścia aktualizuje licznik. Programista ustala spójny sposób pokazania bonusu względem bazowego maksimum.
- Trzy duże przyciski: „Atak”, „Ruch”, „Specjalne”, z ikonami i kosztami lub zakresem kosztów, jeśli lista specjalnych ma różne ceny.
- Dla ataku mieczem wyraźna ikona miecza. Dla innych rodzajów używanej broni ikona odpowiada rzeczywistej akcji; zachować rozróżnienie broni wręcz, łuku i magii.
- „Specjalne” otwiera dostępne zdolności / aktywne przedmioty. Samo otwarcie nic nie kosztuje.
- Oddzielny, mniejszy „Zakończ turę”.
- Cel, zasięg i zamiary przeciwników widoczne na mapie. Przyciski nie zasłaniają uczestników.
- Koniczynka wyłącznie chwilowo jako komunikat zdarzenia szczęścia.

Obsłużyć dotyk oraz mysz i klawiaturę. Blokować wielokrotne wykonanie przez szybkie kliknięcia. Podczas animacji nie przyjmować kolejnego działania, chyba że kolejka jest jawnie zaprojektowana i bezpieczna; dla prototypu zalecana blokada. Koszt pobrać dokładnie raz.

Nie wolno równocześnie uruchamiać starego ciosu, joysticka i nowego przycisku walki od tego samego dotknięcia. Interfejs rozmowy ma pierwszeństwo przed wejściami walki. Po zakończeniu starcia przywrócić zwykłe sterowanie.

## 11. Zakończenie walki i działanie świata

Spotkanie kończy się po pokonaniu wszystkich walczących przeciwników albo innym rozstrzygnięciu przewidzianym scenariuszem. Przyznanie łupów, doświadczenia, treningu umiejętności, postępu questa i nagrody grupowej ma nastąpić zgodnie z istniejącymi regułami, dokładnie raz. Nie dopisywać osobnej nagrody za każdy krok animacji.

Przed wdrożeniem sprawdź, jak istniejące gangi uruchamiają herszta po pokonaniu członków. Taki herszt musi wejść w nowy mechanizm w jawnym momencie, np. jako kolejna faza spotkania; nie może pojawić się poza kolejką i od razu bić bohatera podczas wyboru akcji.

Bezpiecznie połącz tryb turowy z aktualną symulacją. Bohater nie może otrzymywać ciosów z dawnej pętli czasu rzeczywistego, efektów cyklicznych ani od przeciwników spoza kontrolowanego starcia podczas planowania. Nie zakładaj, że wstrzymanie samych animacji rozwiązuje obrażenia, regenerację i automatyczne efekty przedmiotów. Ustal ich zachowanie jawnie; czekanie w turze nie powinno bez końca leczyć ani zadawać obrażeń.

Nowi przeciwnicy nie dołączają bez zapowiedzi poza ustalonym harmonogramem. W pierwszym prototypie skład małego spotkania może być zamknięty po jego rozpoczęciu. Zachowanie dużych gangów, fal i bossów opisz osobno, jeśli wymaga odstępstw.

Decyzja „Uniknij” przed podejściem nie jest darmowym wyjściem z rozpoczętej walki. Jeżeli dodajesz ucieczkę w trakcie starcia, wyraźnie określ jej koszt i skutek; nie zmieniaj przy okazji śmierci, wskrzeszania ani wychodzenia z gry. Zweryfikuj aktualny zapis, przerwanie sesji i powrót, aby nie można było odświeżeniem odzyskać ruchów / ponawiać losowań ani utknąć w zablokowanym trybie. Nie zmieniaj zasad produkcyjnego serwera ani danych graczy dla samego prototypu.

## 12. Zakres pierwszego prototypu i decyzje programisty

Pierwsza grywalna wersja musi pokazać:

1. Neutralne spotkanie z pojedynczą postacią / stworzeniem, kończące się rozmową.
2. Wrogie spotkanie z jednym przeciwnikiem oraz z małą grupą.
3. Podejście / uniknięcie, delikatną mgłę i zachowanie istniejącego odkrywania mapy.
4. Turę bohatera, pule ruchów według poziomu i odpowiedź przeciwników.
5. Ruch po mapie z podglądem, zwykły atak oraz przynajmniej jedną zdolność o innym koszcie.
6. Szczęśliwe zdarzenia rozstrzygane w określonych momentach, z chwilową koniczynką; na TEST możliwość deterministycznego sprawdzenia każdego efektu bez czekania na losowanie.
7. Zakończenie walki, dotychczasowe nagrody i powrót do eksploracji.

Przed zgłoszeniem gotowości programista podaje wybrane parametry i krótkie uzasadnienie:

| Do ustalenia | Co należy sprawdzić |
| --- | --- |
| Pula ruchów według poziomu | Progi, maksimum i tempo tury |
| Ruchy przeciwników | Koszt podejścia i uderzenia, suma działań całej grupy |
| Zasięg przemieszczenia i broni | Czy ustawienie daje wybór i czy walka nie zmienia się w pogoń |
| Skład / trudność spotkań | Przeżywalność, role, obecność mocniejszych wrogów |
| Koszty i efekty specjalnych | Kiedy warto użyć zdolności zamiast zwykłych ataków |
| Szanse szczęścia | Osobno krytyk, unik, blok, dodatkowy ruch oraz reguły kumulacji |
| Promień mgły i interakcji | Czytelność oraz osiągalność na rzeczywistej mapie |

Nie jest zatwierdzony konkretny wzór skalowania, stała liczba ruchów ani ostateczne prawdopodobieństwa. Oczekiwany jest działający, konfigurowalny prototyp z rozsądnie wybranymi wartościami.

## 13. Kryteria odbioru na TEST

### Spotkania

- Podejście do neutralnego smoka / rozmówcy otwiera rozmowę, nie walkę.
- Wroga grupa uruchamia starcie po świadomym podejściu; podczas okna wyboru nie zadaje obrażeń.
- „Uniknij” pozwala odejść bez zapętlonego okna i natychmiastowego ataku.
- Mgiełka nie ujawnia nieodkrytej mapy; interakcja jest dostępna z osiągalnego miejsca.

### Ruchy i walka

- Dwa różne progi poziomu faktycznie dają różne skonfigurowane pule ruchów.
- Bohater może przemieścić się i zaatakować w jednej turze, gdy ma odpowiednią pulę.
- Działanie za dwa ruchy nie działa przy jednym pozostałym. Anulowanie i błędny cel nic nie kosztują.
- Przejście nie przecina ścian i rozlicza długość rzeczywistej trasy; nie można wskazać celu poza dozwolonym dystansem.
- W turze planowania przeciwnicy czekają. W odpowiedzi wykonują tylko przydzielone działania.
- Szybkie kliknięcia i mieszane sterowanie nie dublują ataków ani pobierania kosztu.
- Zwykłe spotkanie na odpowiednim poziomie jest przeżywalne przy zdrowej postaci i rozsądnym zachowaniu; sprawdzić też słabszy sprzęt, większą grupę i niskie życie.

### Szczęście i integracja

- Krytyk, unik, blok i dodatkowy ruch mają poprawny moment losowania oraz czytelny komunikat.
- Bonus +1 daje jeden ruch, nie całą turę; nie uruchamia pętli kolejnych bonusów.
- Unik i blok nie rozstrzygają się jednocześnie na tym samym ciosie.
- Koniczynka nie jest stałym elementem wyposażenia na ekranie walki.
- Przedmioty automatyczne i cykliczne nie działają wielokrotnie podczas czekania.
- Łupy, EXP, trening, quest i nagroda grupowa rozliczają się raz; herszt nie omija kolejki.
- Zakończenie, śmierć i przerwanie sesji nie zostawiają zablokowanego sterowania ani możliwości odnawiania ruchów odświeżeniem.

Wykonaj wymagane w repozytorium sprawdzenie kompilacji i build, a następnie sprawdzenie działającej wersji oraz zrzuty w rozmiarze telefonu (np. 390×844) i komputera. W odczytanej instrukcji repozytorium wymagano build + preview, ponieważ tryb dev miał błąd cyklicznego importu. Zweryfikuj aktualny stan, zamiast zakładać naprawę. Po sprawdzeniu wdroż wyłącznie na TEST i podaj adres, commit, wybrane wartości oraz ograniczenia prototypu.

## 14. Punkty orientacyjne w dotychczasowej dokumentacji kodu

Poniższe nazwy pochodzą z dokumentacji odczytanej podczas tej rozmowy. Przed zmianą sprawdzić ich aktualną zawartość i zależności:

- src/scenes/Ambient.ts oraz src/content/gangi.ts — grupy, terytoria, mgła i powrót mieszkańców.
- src/objects/Slime.ts — rodzaje przeciwników i ograniczenie pościgu do terytorium.
- src/scenes/GameScene.ts oraz src/controls.ts — wykonanie ataków, kolizje, sterowanie i efekty.
- src/scenes/UIScene.ts oraz src/ui/hud.ts — nakładki, obecny HUD i kontrolki.
- src/map/CityMap.ts oraz src/map/Fog.ts — geometria, kolizje, widzenie i odkrywanie.
- src/content/przedmioty.ts oraz src/inventory.ts — katalog i istniejące efekty wyposażenia.
- src/quests.ts i istniejące interakcje — postęp zadań, rozmowy, zapis i rozliczenia.

Nie jest wymagane tworzenie konkretnych plików o narzuconych nazwach. Wybierz strukturę zgodną z projektem i oddziel reguły tur / koszty od rysowania interfejsu, aby dało się bezpiecznie sprawdzić mechanikę.

## 15. Przykład rozgrywki do pokazania właścicielowi

W parku widać grupkę otoczoną delikatną mgłą. Po podejściu gracz wybiera „Podejdź bliżej” albo „Uniknij”. Wrogie nastawienie grupy rozpoczyna walkę w tym samym miejscu na mapie.

W wybranej do demonstracji konfiguracji bohater ma trzy ruchy. Wydaje jeden na dojście i jeden na atak mieczem. Został jeden: może zmienić ustawienie, zaatakować ponownie, jeśli pozwalają reguły, albo zakończyć turę. Atak specjalny kosztujący dwa ruchy jest już niedostępny. Rywale wykonują swoją skonfigurowaną odpowiedź.

Na początku kolejnej tury zdarzenie szczęścia może przyznać dodatkowy ruch. Krótko pojawia się koniczynka z napisem „+1 ruch”, a bohater zyskuje więcej możliwości w tej turze. Kolejna napotkana postać, np. smok związany z zadaniem, po „Podejdź bliżej” rozpoczyna rozmowę.

Trzy ruchy i koszty z tego przykładu służą wyjaśnieniu przebiegu. Nie zastępują parametrów dobranych i sprawdzonych przez programistę.

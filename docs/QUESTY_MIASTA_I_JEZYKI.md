# Questy miejskie i języki — 10.10.2026

## Działające questy

`src/content/questy/runtime.json` zawiera 12 wykonywalnych scenariuszy: zegar, listonosz, spokojny strażnik, dwie pieczęcie, szkic zalany herbatą, filtr strażnika, ogródek, hałaśliwi sąsiedzi, karty paktu, regulator, uczący się automat oraz powrót do wcześniejszego odczytu. Ostatni wymaga ukończenia szkicu i pieczęci; nie wszystkie zadania są od razu dostępne.

Questy korzystają z istniejących zagadek, napraw i melodii oraz nowego etapu `decyzja`. Odpowiedzi w decyzji są poprawnymi wariantami rozwiązania. Reakcja i stały identyfikator wyboru są zapisywane. Zwykłe złe odpowiedzi pozwalają spróbować ponownie bez utraty życia. Pomocnik dostarcza części fabularne, nie obciąża plecaka. Nagroda pilotażowa: 10 monet i 20 EXP za scenariusz; bez diamentów lub zmian cen.

To adaptacje scenariuszy do działającego silnika: wybór pieczęci i nasion jest wyborem kart, efekty wariantów są tekstowe; nie ma jeszcze nowego budynku ogródka, autonomicznego androida, marszu z zużyciem baterii ani samodzielnego generatora dowolnej kombinacji 40 modułów. Katalog 40 modułów i wstępne dialogi w `catalog.json` są materiałem do dalszego wdrażania, a nie deklaracją, że wszystkie mechaniki już działają. Etapy składa się jawnie w `runtime.json`.

## Miasta i miejsca

Ta sama logika działa na Lublinie, mapach regionalnych i światowych, we wszystkich krajach. Nie wymaga kościoła, jeziora ani konkretnego adresu. Zleceniodawcy są fikcyjnymi pomocnikami przy rzeczywistych miejscach; nie reprezentują realnych firm ani urzędów. Typy miejsc zleceniodawcy są określone w `giverKinds`. Zadanie ze sklepem na szkicu rzeczywiście wybiera sklep; ogródek wymaga istniejącego terenu zielonego.

W promieniu 1 km gracza potrzebne jest co najmniej 6 odrębnych punktów z co najmniej 2 rodzajami miejsc. To kontrola dostępności treści, **nie kontrola liczby mieszkańców**. Mapy nie mają populacji, dlatego proponowany próg 40 tys. i ograniczenie tworzenia nowych postaci pozostają do wdrożenia z osobnym wiarygodnym źródłem danych. Istniejących postaci nie przenosimy.

Planner wybiera maksymalnie 4 oferty na własny kwadrat 1 km podczas jednego planowania. Nie jest to jeszcze ustalona docelowa siatka „4 w centrum, 1–2 obok”: środek planowania podąża za graczem i działa też na nowych kaflach mapy. Oferta już dodana do sceny nie zmienia miejsca. Przeliczanie co 15 sekund dopisuje nowe scenariusze w odpowiednich okolicach.

Każdy odcinek sprawdzamy z kolizjami mapy (obrys stóp, budynki, woda i mosty). Ograniczone A* mierzy długość znalezionego przejścia; suma odcinków musi zmieścić się w budżecie scenariusza. Niepewne lub zbyt długie trasy pomijamy. Wąskie przejścia mogą dawać fałszywe odrzucenie — to świadome, ostrożne ograniczenie siatki 6 m. Nie uwzględniamy dynamicznych przeciwników ani wszystkich dekoracji innych systemów mapy.

## Puławy → Lublin: jeden scenariusz na postać

`Misja.id` jest stałym `quest.*`, bez miasta, losowego ziarna lub numeru logowania. `save.missions[id]` zapisuje `active`, `goal` lub `done` globalnie. Wszystkie trzy stany blokują ofertę tego scenariusza w każdym innym mieście. Ukończenia nie są usuwane razem z zakończonymi misjami `gen-*`.

Przyjęte zadanie ma `scenariusz.mapId`, niezmienne współrzędne geograficzne punktów oraz `choices`. Przechowujemy je w istniejącym `save.gen`, a etap w `save.etap`. Po zmianie miasta nie projektujemy obcych współrzędnych na lokalną mapę. Dziennik pokazuje miasto kontynuacji, bez błędnej strzałki. Po powrocie i ponownym logowaniu odtwarzamy te same punkty i etap. Po ukończeniu `questResults[id]` zachowuje wybory, mapę początku i odczyt potrzebny do powrotu do wcześniejszego zadania.

Starsze losowe zlecenia pozostają osobnym, powtarzalnym systemem. Nowa blokada dotyczy 12 nowych scenariuszy; nie migruje wszystkich historycznych losowych zadań.

## PL/EN i humor

Każdy nowy tekst i odpowiedź w katalogu ma stałe ID, a każdy wariant `language`, `localHumor` i `text`. Język nie wynika z miasta. Lista języków w menu zapisuje preferencję na urządzeniu i w zapisie postaci; jawne `?lang=pl/en` lub wybór urządzenia mają pierwszeństwo przed profilem. Przy odtworzeniu nowego questa jego teksty są ponownie składane z katalogu, zaś punkty, odpowiedzi logiczne i wybory pozostają niezmienne.

Edytor etapów ma pole języka i checkbox „Lokalny humor”. `dialogueMeta` jest opcjonalny dla starszych danych. Etap `decyzja` ma edytowalne ID, etykietę i reakcję dla każdej odpowiedzi. Nowe warianty językowe katalogu nadal autorujemy w repozytorium; nie ma jeszcze pełnego edytora tłumaczeń całej gry.

Wspólne okna questów przekazują metadane języka, humoru i odpowiedzi. `legacy.json` zawiera 76 wcześniej przetłumaczonych wpisów historii, melodii, starych misji i osiągnięć. Stosujemy dokładne dopasowania, także przy zmianie języka zapisanej misji. **Nie jest to pełne tłumaczenie całej gry**: starsze sklepy, pozostały interfejs, quizy, dane serwerowe i regionalne historie mogą nadal mieć polskie teksty. Nie wysyłamy tekstów ani danych graczy do zewnętrznego translatora; tłumaczenia są przygotowane z góry.

Dodano diamentowy wpis „Okrążenie Ziemi” za 40 075 km łącznie. Istniejące osiągnięcia 1 km i 100 km zachowane.

## Sprawdzenie

- `VITE_TEST=1 npm run build` (wszystkie mapy, typy, Vite).
- `npm run test:quests` — komplet wariantów PL/EN i metadanych, 12 scenariuszy, zapis wyboru/etapu, globalne blokowanie aktywnych i ukończonych questów, most/przeszkoda wodna, pusty teren.
- `npm run test:quest-maps` po budowie — rzeczywiste wygenerowane mapy Lublina i Puław.
- `scripts/tests/browser-city-quests.cjs` z Playwright, Vite preview i w pełni przechwyconymi RPC: logowanie, cała naprawa zegara z błędną i poprawną odpowiedzią, nagroda, podróż, decyzja, zapis i ponowne logowanie EN; widoki 390×844 i 1280×800. Test nigdy nie loguje ani nie zapisuje realnej postaci.

W środowisku bez lokalnego pakietu Playwright można podać `PLAYWRIGHT_MODULE`; przeglądarkę spoza standardowej instalacji wskazuje `BROWSER_EXECUTABLE`. Zrzuty powstają w ignorowanym `.cache/`. Wdrożenie trafia na gałąź serwera testowego; pliki wydania produkcyjnego pozostają bez zmian.

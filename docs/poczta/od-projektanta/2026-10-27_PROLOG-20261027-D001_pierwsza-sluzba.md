ID: PROLOG-20261027-D001
Odpowiedź na: polecenie właściciela z 27.10.2026 — prolog rekruta, łuk, loch, magia i biblioteka
Od: projektant
Do: programista
Status: nowe
Akceptacja: 27.10.2026 właściciel zlecił przygotowanie questline niezależnego od miejsca startu; szczegóły wykonawcze opisano osobno od jego decyzji.
Wykonanie: gotowy scenariusz PL, przebieg etapów, dobór miejsc/fallbacki, kontrakt zapisu i odbioru przedmiotów, mapa integracji i kryteria sprawdzenia. Kod gry i działający questline jeszcze niewdrożone.
Dotyczy: Pierwsza służba — wspólny prolog strażnika i strażniczki

Pełna specyfikacja: [docs/prolog/PROLOG_REKRUTA.md](../../prolog/PROLOG_REKRUTA.md).

Kolejność: starszy strażnik przy starcie → list na pobliski posterunek → powrót → napad chochlików w przeciwnym kierunku → uratowany łucznik, stary zapasowy łuk i próba strzelania → powrót → najbliższy odpowiedni loch przy cmentarzu/świątyni → pierwsza walka → różdżka i kapelusz, jednorazowe automatyczne wyposażenie i próba magii → odzyskanie misia → powrót → biblioteka, podstawy magii i otwarta zagadka właściciela kompletu.

Najważniejsze przy wdrażaniu:

- Zastąpić nowym ciągiem obecny samouczek gazeciarza dla nowych postaci, nie uruchamiać obu równolegle.
- Dobierać osiągalne miejsca według tras i czasu chodzenia; utrwalić je w zapisie postaci, niezależnie od sesji. Brak OSM POI ma mieć jawny lokalny fallback.
- W sprawdzonej bazie `52cbdaf` brak modułu lochów: połączyć z istniejącą pracą z właściwej gałęzi, bez budowania duplikatu. Właściciel potwierdził dodanie labiryntów.
- W tej bazie `freshGear()` daje kijek, `rangedWeapon()` blokuje czary bez `gear.magic`, `addItem()` nie gwarantuje założenia w zajęty slot, a `Place.kind` nie zawiera `fire_station`. Uwzględnić te fakty zamiast traktować scenariusz jako zwykłe wstawienie tekstów.
- Bezstratne automatyczne założenie dwóch przedmiotów przy pełnym plecaku; nagrody i pickupy dokładnie raz; zapisana instancja lochu i powrót po szpitalu.
- Magię faktycznie odblokować istniejącym `gear.magic = true` przy podniesieniu kompletu. Biblioteka wyjaśnia i rozwija odkrytą zdolność; nie pobiera ponownie opłaty za jej odblokowanie.
- Nie zmieniać twarzy bohatera wraz z profesją. Potrzebne prawdziwe animacje łuku i różdżki z aktualnych prac nad modelami.
- Parametry, imiona i dialogi w dokumencie są propozycją projektu. Nie oznaczać wdrożenia, dopóki questline nie jest grywalny i sprawdzony.

Proszę odpowiedzieć na to ID: wskazać gałąź/moduł lochów, faktycznie wdrożone elementy, wynik pełnego przejścia i zapisu/wznowienia na telefonie oraz komputerze. Nie resetować starych postaci i nie publikować produkcji w ramach samego przekazania scenariusza.

# KUL i osiedle — studium brył na rzeczywistych danych OSM

Właściciel wskazał nieregularne obrysy jako główny problem i poprosił o konkretne przykłady KUL oraz osiedla. Plansze pokazują prawdziwy obrys, propozycję wydzielenia dużych skrzydeł i roboczy model. To **studium geometrii, bez docelowych tekstur, fasad i dekoracji**. Nie są to zrzuty gry.

- [KUL przy Alejach Racławickich](kul.png): Gmach Główny jako cztery skrzydła wokół zachowanego dziedzińca. Collegium Jana Pawła II jako jedna wysoka bryła, Norwidianum jako jeden szeroki korpus. Drobne ryzality nie otrzymują osobnych stromych dachów.
- [Osiedle przy Dziewanny](dziewanny.png): Dziewanny 10 — trzy główne skrzydła, Dziewanny 9 — cztery, Dziewanny 14 — dwa. Zachowane L i duże uskoki. Loggie, schodki elewacji i małe występy nie mnożą połaci. Krótkie połączenia mają niższy płaski dach.
- [Szczytowa 11](szczytowa.png): trudniejszy obrys z 255 punktami. Propozycja zachowuje otwartą kompozycję w siedmiu większych odcinkach z dwoma płaskimi łącznikami. Sprowadzenie tego budynku do jednego prostokąta zatarłoby jego rozpoznawalny kształt.

## Aktualna reguła kondygnacji

Po wyjaśnieniu sprzeczności „maksymalnie 2” / „powyżej 6 → 3” właściciel wybrał:

| Rzeczywista liczba kondygnacji | Liczba w grze |
|---|---|
| 1–3 | 1 |
| 4–6 | 2 |
| powyżej 6 | 3 |

Wartości niecałkowite ponad 3, np. źródłowe 3,5 w Gmachu Głównym i Norwidianum, trafiają do drugiej grupy. Collegium Jana Pawła II ma w źródle 10 i w studium otrzymuje 3. Wysokość drzwi i okien nadal wynika z rozmiaru postaci. Ta reguła jest już w lokalnym kodzie generatora.

## Podział w generatorze brył

1. Zachować osobne źródłowe budynki, ich położenie, duże załamania i dziedzińce.
2. Ustalić główne osie długich ścian; scalić niewielkie różnice współrzędnych elewacji.
3. Wyodrębnić duże, znaczące skrzydła. Ograniczyć małe występy do detalu, ganków i płaskich daszków.
4. Zapewnić ciągłość korpusu niższymi płaskimi łącznikami. Każde główne skrzydło dostaje prosty dach i własną kalenicę, bez fragmentowania dachówek na każde wcięcie OSM.

Skrypt `python scripts/architecture/massing-study.py` odtwarza plansze z `fixtures.json`. Odczytuje osie ścian, grupuje je z tolerancją 4 m, zachowuje dziedziniec, wybiera duże prostokątne skrzydła i łączy odseparowane części płaskimi łącznikami. Wynik oraz parametry są w `study.json`; dla każdego przykładu sprawdzana jest spójność bryły.

**2 listopada: podział jest podłączony do lokalnego generatora `/test2/`.** `src/architecture/massing.ts` przenosi reguły studium do workera gry: ważone osie ścian (4 m), duże skrzydła, niższe płaskie łączniki. Chroni cały prostokątny zakres dziedzińca, a nie tylko jego środek. Odrzuca niebezpieczne połączenia przez rozległe puste miejsca i niespójne korpusy. Budżet liczby osi/iteracji ogranicza koszt złożonych danych.

Planer sprawdza ulice i sąsiadów dla skrzydeł **oraz łączników**. Generator fasad pomija ściany wewnętrzne, rysuje odsłonięte ściany ponad niższym łącznikiem i wybiera wejście na odsłoniętym odcinku wystarczająco szerokim dla postaci. Wieloskrzydłowe domy prowadzą kalenicę wzdłuż dłuższego boku skrzydła. Oba cache uwzględniają łączniki. Panel ma skróty KUL/Dziewanny/Szczytowa oraz skalę obrysu 1.0 do porównania z 1.5/2.0.

[Podgląd rzeczywistej geometrii generatora](../artifacts/massing/index.html) pokazuje wszystkie siedem modeli z fasadami. To rasteryzacja programowa bez ulic, przy skali obrysu 1.0, **nie zrzuty gry**. 13 testów obejmuje zaakceptowane liczby skrzydeł/łączników, ciągłość, próbki całego dziedzińca, brak wewnętrznych ścian, wejście wielkości postaci, deterministyczność oraz audyt kolizji w czterech dzielnicach.

**Ograniczenie rozmieszczenia:** przy dotychczasowej skali 2.0 kontrola ulic odrzuca wszystkie siedem wskazanych budynków. Nawet przy 1.0 część przykładów koliduje z poszerzonymi ścieżkami prowadzącymi do wejść, a automatyczna orientacja może zwiększać kolizje. Podgląd izolowanej geometrii nie dowodzi, że konkretny model zostanie wybrany na mapie. Domyślnej skali 2.0 nie zmieniono bez odpowiedzi właściciela. Nie wyłączono kontroli dróg dla wymuszenia widoczności.

Chromium nadal nie uruchamia się w lokalnym sandboxie (`setsockopt` / `shutdown: Operation not permitted`). Przygotowano workflow GitHub z rzeczywistą sceną na komputerze i telefonie, kadrami przed/po oraz artefaktem wyników. Publiczny `/test2/` nie jest jeszcze potwierdzony.

Dane pochodzą z lokalnego `data/lublin-osm.geojsonseq.gz`; `fixtures.json` zawiera tylko wskazane budynki i potrzebne tagi. © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright.

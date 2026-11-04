# Architektura EXP-LORE — laboratorium `/test2/`

Przebudowa jest podłączona wyłącznie do anonimowego laboratorium. Zwykła gra używa dotychczasowego generatora. Produkcja, dane graczy, postacie i zasoby przyrody nie są zmieniane przez tę funkcję.

## Wysokość: OSM 1–3 → 1, 4–6 → 2, powyżej 6 → 3

Najnowsza decyzja właściciela kompresuje liczbę kondygnacji: źródłowe 1–3 daje jedną w grze, 4–6 daje dwie, powyżej 6 daje trzy. Zastępuje to poprzedni limit pięciu. Brak prawidłowej wartości daje jeden poziom. Wartości niecałkowite ponad 3, np. 3,5 w danych KUL, należą do drugiej grupy. Każdy poziom ma duże okna i tę samą wysokość dopasowaną do postaci. Priorytet nadal korzysta ze źródłowej informacji OSM. Rozmiar obrysu nie podnosi sam z siebie parterowej bryły. Duży prostokątny obrys pozostaje jednym domem; nieregularne bryły mają kilka głównych skrzydeł. [Studium rzeczywistych obrysów KUL i osiedla](massing/README.md) pokazuje proponowane uproszczenie, jeszcze oddzielone od generatora gry.

Otwór drzwiowy ma 112% widocznej wysokości i szerokości ludzika; wyższy dom nie zmniejsza drzwi ani okien. Pomiar pochodzi z niezmienionego arkusza postaci: 42×54 px przy aktualnej skali sprite’a. Worker otrzymuje tę referencję w jednostkach mapy, więc zmiana skali postaci lub świata nie rozjeżdża wejść. Parametr stylu `body_height_in_doors` ustala wysokość jednej kondygnacji, a `buildingLevels` i `MAX_BUILDING_LEVELS=3` w `proportions.ts` ustalają kompresję i limit. Już przeliczonej liczby kondygnacji nie przeliczamy ponownie przy liczeniu wysokości. Drzwi są wyłącznie na parterze i zachowane także w dalekim LOD; belki fasady nie zasłaniają otworu.

Niższy rzut skraca podstawę domu, ale zachowuje wysokość drzwi tak jak wysokość postaci. Ściany mają pionowe krawędzie. Dachówki mają co najmniej pięć natywnych pikseli odstępu, również na skróconej połaci; drobne paski powstałe przy ortogonalizacji są odrzucane. Domy mieszkalne pokazują szczyt dachu od ulicy. [Porównanie progów wysokości z postacią](artifacts/height-comparison.png) i [porównanie przed/po](artifacts/cottage-comparison.png) są podglądami rasteryzatora, nie zrzutami gry.

## Uruchomienie i porównanie

`npm run build`, następnie `npm run preview` i `/test2.html`. W publikowanym układzie laboratorium zachowuje adres `/test2/` i współdzielone zasoby `/test/`.

Panel **Pomiary** zawiera wybór starego/nowego wyglądu, skali 2,0/1,5, przyciągania kątów, konturu i opisów stylów. Po zmianie parametrów zachowuje współrzędne i przeładowuje warstwę, aby unieważnić wszystkie zależne cache.

| Parametr URL | Domyślnie | Wartości |
|---|---|---|
| `arch` | `1` w laboratorium | `0`, `1` |
| `BUILDING_SCALE` | `2` | panel: `1.5`, `2`; diagnostycznie 1–3 |
| `ANGLE_SNAP` | `22.5` | `22.5`, `0` / `off` |
| `OUTLINE` | `1` | `0`, `1` |
| `styles` | `0` | `0`, `1` |
| `decorations` | `1` | `0`, `1` |
| `view` | `lower` | `normal`, `lower` |

Przykład: `/test2.html?lat=51.2483&lon=22.5679&mapa=lublin&arch=1&BUILDING_SCALE=2&styles=1`.

## Dane i deterministyczność

`scripts/architecture/build-data.mjs` przygotowuje osobne kafle źródłowe 250 m z niescalonymi budynkami i tagami. Jest częścią `npm run build`. Wynik w `public/architecture/lublin/` jest generowany i ignorowany w Git. Istniejące kafle gry, adresy i ich identyfikatory pozostają oddzielne.

Obecny lokalny wyciąg nie ma ID OSM: wynik zawiera 149 717 obiektów z jawnie oznaczonym zastępczym ID geometrii. Klucz ignoruje początek i kierunek pierścienia oraz początek układu mapy. Nie jest to gwarancja zachowania ID po aktualizacji samej geometrii OSM. Kolejne pobranie przez istniejący workflow eksportuje ID i osobny plik kontekstu `data/architecture-context.geojsonseq.gz`; dodatkowe obszary przemysłowe/mieszkaniowe nie trafiają do generatora podłoża.

Mapa świata zachowuje dostępne identyfikatory i tagi PMTiles w opcjonalnych metadanych. ID źródłowe Protomaps jest oznaczane jako `feature`, bez udawania potwierdzonego ID OSM. Starszy format nadal działa. Szczegółowe tagi, których nie ma w archiwum świata, zastępują kontekst i region. Region pochodzi z dołączonych granic Natural Earth; cztery JSON-y określają materiały, dachy i domyślne style. Prostokąty klimatyczne są zapasowym źródłem decyzji.

Planowanie używa globalnych identyfikatorów, sortowania priorytetów i konserwatywnej rezerwacji wszystkich możliwych pozycji ważniejszych sąsiadów. To celowo może usunąć więcej domów, niż minimalna selekcja. Nie zmniejsza powiększonych budynków, aby zmieścić je w luce. Pełna niezmienność na granicach strumieniowania wymaga dostarczenia wszystkich sąsiadów z halo; testy obejmują odwróconą kolejność tego samego kompletnego zestawu.

## Renderowanie i ochrona pozostałych warstw

Geometria i style powstają w osobnym Web Workerze. Ten sam worker renderuje rzeczywiste trójkąty do targetów koloru, ID i głębi przez Three.js. Shader wybiera dokładnie jedną z trzech pozycji materiału w palecie. Osobny pass konturu analizuje sąsiadów ID/głębi. Brak WebGL w workerze włącza jawnie raportowany rasteryzator programowy tych samych trójkątów i materiałów.

Wyniki są buforowane jako osobne obrazy Phasera, sortowane z drzewami i postacią po podstawie budynku. Kontur ma jeden piksel natywnego targetu, następnie rośnie nearest-neighbor wraz z pikselem gry. Nie jest obrysem jednego fizycznego piksela monitora przy każdym powiększeniu. ID/głębia są rozwiązywane wewnątrz obrazu budynku; pomiędzy budynkami obowiązuje obecne sortowanie Phasera. To wymaga jeszcze odbioru zasłaniania w przeglądarce.

Rzut niższy jest liczony przed rasteryzacją. Kompensacja skali Y pozwala uniknąć dodatkowego rozciągania pikseli budynku. Przesunięcie kamery kwantyzowane jest wyłącznie dla nowych brył. Podłoże nadal korzysta z dotychczasowej kamery i danych wejściowych. Drzewa i rury są rozmieszczane z oryginalnych obrysów, a nie z powiększonych brył. Stare budynki i ich cienie są pomijane tylko w nowym wariancie.

Nowe cienie są maskami brył w kierunku SE i używają ciemniejszych kolorów palety, wybranych względem odczytanego podłoża. Obrysy ruchu laboratorium korzystają z nowych podstaw; rzeki, granice i inne przeszkody sprawdza dotychczasowa mapa. Zapisane współrzędne nie są przeliczane. Laboratorium nie ma mechaniki misji, dlatego migracja wejść misji i widoczności pełnej gry nie jest wdrożona; pozostaje elementem późniejszej integracji zwykłej gry.

## Wydajność i pomiary

Wydzielone kafle źródłowe mają 250 m; raster podłoża zachowuje obecne fragmenty 512 px. Worker przechowuje do 16 MiB rastrów, warstwa zwalnia odległe obrazy, korzysta z frustum culling i LOD bez okien/dekoracji. Phaser grupuje obrazy w swoim rendererze. Nie wdrożono `InstancedMesh` ani scalania 3D całego fragmentu: geometria jest rasteryzowana i buforowana per budynek, aby zachować obecne sortowanie sceny.

Kontrola kodu: `node scripts/architecture/test.mjs`. Arkusz techniczny: skompilować `scripts/architecture/preview.ts` przez rolldown, następnie uruchomić wynik, `python scripts/architecture/compare-cottages.py` oraz `python scripts/architecture/compare-heights.py`. Podgląd znajduje się w [artifacts/preview.html](artifacts/preview.html); nie jest zrzutem z przeglądarki.

`node scripts/architecture/browser.mjs` buduje aplikację i obsługuje pliki bez lokalnego portu przez Playwright. Sprawdza te same kadry Lublina, Bergen, Sewilli i Kioto, telefon, ruch i zmianę rzutu. Wymaga dostępnego Chromium oraz dostępu do istniejącej mapy świata dla lokalizacji zagranicznych. Wynik zapisuje w `artifacts/browser-results.json`. W tym środowisku uruchomienie Chromium zostało zablokowane przez ograniczenia systemowe; próby uruchomienia z dodatkowymi uprawnieniami nie zwróciły wyniku. Zrzutów gry nie wykonano.

60 FPS i pierwszy pełny kadr <3 s od otrzymania danych pozostają **niepotwierdzone**. Docelowy pomiar: fizyczny Samsung Galaxy A54, Chrome, 1080 px szerokości; zimne pobieranie aplikacji i mapy mierzone osobno. Wyników kontenera nie należy przedstawiać jako pomiaru tego telefonu.

## Licencje

Dane mapy: © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright. Granice krajów: Natural Earth 1:110m, public domain — https://www.naturalearthdata.com/about/terms-of-use/. Sprite’y dekoracji i generator są nowymi plikami projektu; istniejące assety nie były przerysowywane.

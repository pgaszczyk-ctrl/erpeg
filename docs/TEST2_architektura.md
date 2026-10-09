# Test2: próba rzutu ze starymi budynkami

Adres: https://exp-lore.app/test2/ . Lokalnie: `/test2.html` z Vite build + preview.

## Decyzja właściciela — 9.10.2026

Próba nowych dachów nie przypomina ilustracji referencyjnej, została uznana za zbyt równą/schematyczną. Wycofano ją w całości: usunięty moduł architekturaTest2, jego flaga w zleceniu workera, wariant cache i test tego generatora. Budynki korzystają wyłącznie z dotychczasowej geometrii, palet, dachów i ozdób. Parametr arch z wcześniejszych linków jest ignorowany/usuwany przy zmianie widoku.

## Aktualna próba

- Przełącznik **Obecny / Niższy kąt** działa w tym samym miejscu, bez przeładowania strony. `view=normal|lower` pozwala też otworzyć oba rzuty bezpośrednio.
- Niższy kąt: natywna kamera Phasera, `zoomY = zoomX ×0.72`, bez obrotu, szadera lub dodatkowego bufora. Oba widoki mają ten sam poziomy zoom (domyślnie3). Zachowana nieregularna dotychczasowa grafika; nie dochodzą nowe połacie/gzymsy.
- To skrócenie w pionie już narysowanego obrazu — również ścian/drzew/pociągów. Nie odsłania dodatkowych fasad. Pełna izometria wymaga osobnego przeliczenia podstaw obiektów i wysokości; nie nazywać tej próby nowym silnikiem izometrycznym.
- Bohater ma kompensację skali Y i zachowaną podstawę stóp/proporcje. Wektor dotyku/klawiatury przeliczany przez odwrotny skrót pionowy, potem normalizowany do dotychczasowej prędkości świata. Kolizje/współrzędne OSM pozostają dotychczasowe.
- Zasięg pobierania używa obu zoomów. Wspólne minimum powiększenia mieści prostokąt w 2×3 lub 3×2 fragmentach; limit6/8 pozostaje egzekwowany. Kamera aktualizuje worldView przed sprawdzeniem gotowości i renderowaniem mapy. Po przełączeniu/powiększeniu/obrocie gotowość nowego kadru jest sprawdzana ponownie.
- Samo ustawienie zoomY nie dokłada grafiki i pracy malowania budynku. Większy widoczny zasięg pionowy może jednak pokazać więcej obiektów/fragmentów niż Obecny przy tym samym zoomX, więc koszt spaceru należy mierzyć. Istniejące ograniczenia pamięci wektorów/wysokości/wysokich budynków pozostają jak opisano poniżej.
- HTML `/test2/` nadal współdzieli zasoby `/test/`. Bez nowych PNG, zmian produkcyjnego pinu, SQL, danych graczy lub prawdziwych RPC.

## Kontrola aktualnej wersji

Pełny npm run build i osobny vite build. Lokalny Playwright1280×900 oraz390×844: Obecny/Niższy kąt, identyczne miejsce/poziomy zoom, zoomY ratio0.72, zachowana ekranowa wysokość bohatera, rzeczywiste sterowanie klawiaturą/dotykiem, obrót telefonu/resize komputera, budżet fragmentów i brak błędów JS. Zrzuty obu rzutów obejrzano. Dalsze potwierdzenie publikacji poniżej.

---

## Archiwum: odrzucona próba architektury i pierwotne pomiary

**Poniższy opis dotyczy wycofanego kodu f2e22bd. Nie opisuje obecnego wyglądu. Wymieniony test generatora/moduł zostały usunięte. Ograniczenia istniejącego systemu danych OSM nadal obowiązują.**

# Test2: proceduralna architektura OSM

Adres: https://exp-lore.app/test2/ (opublikowane 9.10.2026, kod f2e22bd). Lokalnie: `/test2.html` z Vite build + preview.

## Zakres próby

Oddzielny spacer po rzeczywistej mapie, bez logowania, walki, misji ani zapisu postaci. Przełącznik Nowy / Obecny (`arch=1|0`), przybliżenie, Lublin i dowolne współrzędne istniejącej mapy świata. WASD / strzałki i przeciągnięcie na ekranie dotykowym. Panel pokazuje FPS, 95 percentyl czasu klatki, rysowanie fragmentu bez kolejki, czas wraz z kolejką, część pamięci obrazu i liczbę pobranych obrysów.

To pierwsza próba poprawienia obecnego rzutu 2.5D, nie pełny nowy silnik izometryczny ani gotowa oprawa z ilustracji referencyjnej. Algorytm dzieli duże dachy na skrzydła, dodaje wyraźniejsze połacie/dachówki, lukarny, okapy, gzymsy i narożniki. Nie odzyskuje pojedynczych domów z obrysów połączonych wcześniej podczas przygotowywania mapy. Geografia, wejścia, wysokości i kolizje pozostają obecne. Rury, roślinność i pociągi są obecnymi zasobami; ta próba nie zmienia zasad rur ani rozmieszczenia rud.

## Koszt i przechowywanie

Malowanie odbywa się raz przy przygotowaniu budynku, w istniejących workerach, przed zapisaniem do obecnego cache. Nie dochodzą obiekty renderowane osobno co klatkę ani tekstury budynków na serwerze. Te same obrysy i ziarno dają ten sam wynik; klucz cache rozróżnia oba warianty. Pomocnicze maski to 2 bajty na piksel plus rzadka siatka, zwalniane po malowaniu. Wymiar i alfa końcowego obrazu są identyczne w pięciu sprawdzonych kształtach.

Publikacja `/test2/index.html` wskazuje bazę `/test/` i współdzieli mapy, kod i grafiki testu. Nie kopiujemy całego `public/` do trzeciej lokalizacji. Przyrost wszystkich skompilowanych JS/CSS względem c1510d3: **25333 B (11715 B po gzip)**. Wejście HTML ma 2575 B, publikowane w `/test/test2.html` oraz `/test2/index.html`. Łącznie około 30 kB dodatkowego kodu/HTML, bez nowych PNG. Biblioteki i istniejące grafiki nadal trzeba pobrać przy zimnym wejściu; przeorganizowanie chunków może jednorazowo unieważnić ich cache.

Dane OSM nadal są konieczne. Istniejący plik `world-20261003.pmtiles` na R2 ma według Content-Range 138 547 794 382 B (około 138,5 GB); próba architektury go nie powiększa. Korzystamy z istniejących plików wektorowych Lublina i istniejącej mapy PMTiles na R2, czytanej fragmentami. Nie dokładamy wyrenderowanych obrazów dla każdego miejsca świata. To nie oznacza braku kosztu przechowywania/transferu samych danych OSM.

## Pomiary 2026-10-09

Środowisko: kontener, headless Chromium, programowe WebGL SwiftShader; ekran 1280×900 DPR 1 oraz 390×844 DPR 2, telefon z zadeklarowanym deviceMemory=4. To nie pomiar fizycznego telefonu ani komputera z normalną kartą graficzną. Stała 22-sekundowa trasa kamery w Lublinie (niezależna od kolizji), dodatkowo osobne sprawdzenie rzeczywistego sterowania klawiaturą i dotykiem. Jedna próba każdego wariantu; małe różnice nie dowodzą przyspieszenia/spowolnienia.

| Ekran | Wariant | Gotowy pierwszy widok | FPS na trasie | P95 klatki | Wybrane bufory obrazu |
|---|---|---:|---:|---:|---:|
| desktop | current | 9.90 s | 17.3 | 106 ms | 32.2 MiB |
| desktop | new | 10.50 s | 16.9 | 109 ms | 32.2 MiB |
| phone | current | 9.10 s | 16.5 | 109 ms | 24.2 MiB |
| phone | new | 9.16 s | 17.4 | 110 ms | 24.2 MiB |

Pod spowolnieniem CPU ×4 (nieruchomy widok po trasie) telefon: obecny 13,5 FPS, nowy 14,0 FPS. Oba warianty są wolne przy programowym GPU; wynik nie daje gwarancji płynności na telefonie. Nowa dekoracja nie zwiększyła buforów końcowych ani liczby tekstur dla tej samej trasy. Start/rysowanie fragmentów pozostają istotnym istniejącym kosztem; większość przygotowania odbywa się poza głównym wątkiem.

Generator w Node, rozgrzany, naprzemienne warianty, mediana 15 pomiarów:

| Kształt | Obecny | Nowy | Rozmiar końcowych pikseli |
|---|---:|---:|---:|
| dom | 7.27 ms | 8.82 ms | 62880 B |
| hala | 21.36 ms | 24.57 ms | 274208 B |
| skrzydla | 17.01 ms | 19.32 ms | 226904 B |
| dziedziniec | 20.19 ms | 22.04 ms | 199584 B |
| rotunda | 9.44 ms | 10.85 ms | 106304 B |

Dodatkowe statyczne próby Krakowa dały ten sam rozmiar buforów i 392 wysokie budynki w obu wariantach (FPS 7,7 / 8,3 na programowym GPU; poza właściwym benchmarkiem). Widok gęstego Krakowa w mapie świata miał 392 osobne wysokie budynki: około 82,8 MiB wybranych buforów (podłoże + wysokie budynki), przed kopiami GPU/cache/heap. To pokazuje, że limit liczby fragmentów nie jest jeszcze limitem całkowitej pamięci. Lokalna próbka nie zawierała dwóch sąsiednich kafli wysokości; sprawdzono przygotowanie widoku przy ich niedostępności.

## Granice i następny etap

- Limit obrazów fragmentów w test2 jest egzekwowany: do 6 na telefonie o deviceMemory ≤4, do 8 przy wyższej pamięci, w aktualnym generatorze ×2. Widoczne fragmenty mają pierwszeństwo przed pobieraniem sąsiednich; minimalne przybliżenie utrzymuje widok w tym budżecie. Ta korekta dotyczy tylko labu, nie normalnej gry.
- Miernik pokazuje bufory podłoża i wysokich budynków (canvas + zachowany oryginał). Nie mierzy pełnego RAM, kopii GPU, cache workerów (limit obrazów budynków do około 12 MB na worker, jeden/dwa workery), obrysów, biblioteki ani innych tekstur.
- **Nie ma jeszcze stałego całkowitego limitu pamięci podczas nieograniczonego spaceru.** `CityMap.loadedTiles`, obrysy/indeksy mapy, `worldLoader.done` z wynikami konwersji i cache wysokości nadal gromadzą pobrane dane; obiekty stacji też mogą pozostać. To istniejące ograniczenie. Przed długimi trasami trzeba dodać własność elementów przez kafle, referencje dla elementów wspólnych, usuwanie dalekich kafli/indeksów oraz bezpieczne ponowne wczytanie. Nie wolno usuwać samych tablic bez resetu loadedTiles i pozostałych indeksów.
- Determinizm testu dotyczy identycznego obrysu i ziarna. Istniejąca mapa świata jest rzutowana wokół lokalnego początku gracza; szczegóły rastra mogą różnić się przy innym początku i wersji danych. Dla ścisłej zgodności wszystkich graczy należy ustalić globalną siatkę, stabilne identyfikatory OSM oraz wersję mapy/generatora. Sam hash nie naprawi różnic geometrii/rzutowania.
- Ochrona istniejących ozdób jest kolorystyczna, nie oparta na osobnej warstwie/maskach obiektów. Piksel ozdoby o kolorze materiału może być zmieniony. Przy docelowej grafice wydzielić warstwy materiału i dekoracji.
- Pełniejsza izometria: wspólny transform punktów terenu i obiektów, odwrotne przeliczenie dotyku/myszy, sortowanie i zasłanianie, zgodne rzuty sprite'ów, krawędzie chunków i wysokość. OSM może dostarczać geometrię; nie musi narzucać sposobu jej pokazania. Najpierw ustalić kamerę i skalę na małym wycinku, potem mierzyć na fizycznych urządzeniach.
- Następne grafiki: mały atlas materiałów (dachówki, tynk, kamień), okna/drzwi i gzymsy dopasowane do jednego rzutu oraz kilka wariantów fasad. Rzadkie indywidualne zabytki mogą nadal być osobnymi plikami. Nie zamawiać PNG całych miast ani wariantu każdego budynku dla każdego kąta.

## Powtórzenie weryfikacji

`VITE_TEST=1 npm run build`, osobny `VITE_TEST=1 npx --no-install vite build`, Vite preview.

Test geometrii, deterministyczności, cache i mikrobenchmark: `npx --no-install rolldown scripts/test2-generator.ts --file /tmp/test2-generator.mjs --format esm --platform node`, potem `node /tmp/test2-generator.mjs`.

Scenariusze przeglądarki: komputer i telefon, oba warianty w tej samej lokalizacji, spacer z rzeczywistym sterowaniem, stała trasa kamery, limit fragmentów, brak błędów JS, panel, link A/B, `/test2/` z bazą `/test/`, Kraków z prawdziwej lokalnej próbki PMTiles oraz obecna gra/menu/demo. Lokalne skrypty i zrzuty w work/ są materiałem pomiarowym, nie zasobami publikacji.

Sprawdzono również faktyczne pobieranie Krakowa z domyślnego pliku R2/PMTiles i wysokości (bez fixture/override mapy): poprawny gotowy widok, brak błędów JS, brak HTTP 4xx i RPC. Kod frontendu na tym etapie dostarczony lokalnie pod originem domeny gry. R2 CORS zezwala na https://exp-lore.app, więc domyślna mapa świata nie działa z samego lokalnego originu Vite; używać próbek/override lub opublikowanego test2. Chromium w kontenerze nie ufa CA pośrednika w swoim NSS; żądania HTTPS przekazano przez route.fetch Playwright/Node z odziedziczonym proxy i CA, przy włączonej weryfikacji TLS. To technika testu środowiska, bez zmian kodu gry.

Publikacja potwierdzona: [Actions 37929120500](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/37929120500), wszystkie zadania success, 12:38:44 UTC. Playwright publicznego `/test2/` przeszedł: stacja na komputerze (ruch + rzeczywista nawigacja do Obecny), domy na telefonie, Kraków na telefonie z prawdziwego R2 i wysokości, panel/limity fragmentów, bez błędów JS/HTTP/RPC. Zrzuty komputera/telefonu obejrzano. Żądania HTTPS w teście przekazane przez weryfikujący TLS klient Node/Playwright jak opisano wyżej, bez podmiany opublikowanych zasobów lub danych mapy. `/test/version.json` wskazuje f2e22bd, produkcyjny kod pozostaje e0a27d0.

Budowa na Actions trwała 20:07 przez istniejące przygotowanie OSM: 102449 budynków Lublina złączonych w 78190 bloków, samo łączenie 628,2 s, potem kafle i 124 miejscowości. Vite 1,28 s. To czas przygotowania/publikacji danych, osobny od obciążenia spaceru gracza; nowy algorytm architektury nie jest wywoływany przez build-map.mjs.

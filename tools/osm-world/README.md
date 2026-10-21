# Exp-lore: lokalne laboratorium świata OSM

Osobny eksperyment, bez zależności od gry, logowania, serwera danych ani wdrożenia.
**Działający podgląd rzeczywistych danych, ale nie zakończony test akceptacyjny z wytycznych.**

## Uruchomienie

Wymagane Node 22+ i Python 3 (biblioteki standardowe; bez instalacji pakietów).
Z katalogu głównego repo:

```sh
cd tools/osm-world
npm run generate
npm test
npm start
```

Otwórz http://localhost:4174. Generowanie trwa około 8 sekund na użytym serwerze.
Dane wejściowe już są w repo: `../../data/lublin-osm.geojsonseq.gz`.
`extract.py` strumieniowo ogranicza plik do lokalnego kontekstu, `generate.mjs`
przetwarza go i zapisuje `public/world.json`, `data/snapshot.geojsonseq.gz`
oraz `data/report.json`. Duże dane są ignorowane w git; można je odtworzyć.
Podgląd nie odpytuje OSM podczas pracy. Snapshot nie jest datowanym odczytem aktualnego
OSM: czas importu i SHA256 identyfikują lokalny plik, jego źródłowa data nie jest znana.

Alternatywny lokalny GeoJSON Sequence (także gzip):

```sh
python3 extract.py /sciezka/dane.geojsonseq.gz
node generate.mjs data/local-input.geojsonseq.gz
```

Wstępny importer Overpass JSON:

```sh
node generate.mjs /sciezka/overpass.json
```

Zachowuje ID węzłów i dróg, ale **nie składa relacji**. Do pełnego testu należy
rozbudować tę część lub dostarczyć GeoJSON z ID i topologią. Nie uznawać flagi
`fullTopology` za wynik walidacji dostępności. Eksport obecnej gry utracił ID OSM;
identyfikatory `content:` są jawnymi zastępnikami opartymi na treści, nie ID OSM.
Zmiana tagów zmieni taki identyfikator — nie nadaje się jeszcze do zapisów postępu.

## Pełniejsze dane do następnego testu

Polecenie do wykonania w środowisku z dostępem do Overpass (w tej sesji połączenie
nie odpowiedziało w ciągu 25 s):

```sh
curl --fail --retry 2 --max-time 180 \
  --data-urlencode 'data=[out:json][timeout:120];nwr(around:3500,51.2390715,22.4871666);out meta geom;' \
  https://overpass-api.de/api/interpreter -o data/overpass.json
```

Nie uruchamiać tego na każdą regenerację. Zachować plik i jego hash. Alternatywnie
pobrać `https://download.geofabrik.de/europe/poland/lubelskie-latest.osm.pbf`
i eksportować osmium z włączonymi atrybutami `type,id` (oraz osobno zachować
referencje węzłów do grafu). Nie nadpisywać snapshotu bez zmiany wersji danych.

## Co można obejrzeć

- Stała projekcja EPSG:2180 (GRS80, układ PL-1992), niezależna od adresu i promienia.
  Mały adapter realizuje lokalny szereg Transverse Mercator bez dodatkowych bibliotek.
  Kolejność osi w grze to easting/northing. To rozwiązanie dla polskiego MVP,
  nie projekcja globalna. Maska ma promień 3000 m w metrycznym układzie projekcji;
  pozostaje niewielka różnica względem dokładnej odległości geodezyjnej.
- Środek 22.4871666 E, 51.2390715 N: dokładny punkt adresowy Guliwera 4, Lublin
  w lokalnym wyciągu. Niezależna weryfikacja online pozostaje niewykonana.
- Skala współrzędnych 1:10, komórki 0,5 m gry, fragmenty 128×128, kontekst 500 m.
- Źródłowe wektory 2D, graf, przechodnie komórki dróg, obrysy i izometria.
  Kamera i wybór obiektu są wspólne między widokami.
- Budynki z bryłą, ścianami i płaskim dachem, cztery warianty osi oraz dziesięć
  palet. To prosta geometria diagnostyczna, nie docelowy pixel art.
- Drogi mają pierwszeństwo nad modułem budynku. Kolizja powoduje jawne pominięcie
  modułu; oryginalny obrys pozostaje widoczny w diagnostyce.
- Kliknięcie pokazuje źródło, moduł, paletę i powód pozostawienia osobnego obrysu.
- Spacer: zaznacz przełącznik i kliknij cel albo wybierz POI i „Idź do miejsca”.
  Cel jest przyciągany do najbliższej komórki drogi. Wyszukiwanie BFS daje najkrótszą
  trasę w siatce czterosąsiedniej (funkcja historycznie nazwana `astar`).
- Zmiana palety fragmentu zapisuje się w localStorage i przetrwa regenerację.
  Nie przebudowuje geometrii; to tylko ograniczona demonstracja oddzielnych poprawek.

## Wynik i ograniczenia

Wyniki liczbowe i lista kategorii: `data/report.json`. Liczby obejmują **kontekst**,
nie wyłącznie maskę 3 km. Aktualny wynik: 88 505 rekordów, 21 574 polilinie,
17 860 obrysów budynków, 6995 modułów po odrzuceniu konfliktów i 168 POI w masce.
Nie są to liczby unikalnych obiektów OSM: eksport potrafi zawierać osobno linię
obrysu i powierzchnię. Brak ID uniemożliwia pewne usunięcie duplikatów.

Konserwatywny test kolizji prostokątów odrzuca około 61% budynków; to istotny błąd
jakościowy do rozwiązania przez obrysowe moduły, zwężanie i agregację. Nie ma jeszcze
łączenia pierzei, narożników, bram, wykrywania kwartałów ani deduplikacji building:part.
Widok „grupowanie” pokazuje osobne obrysy, a nie ukończony algorytm grupowania.
Nie twierdzimy, że obecny wycinek potwierdził mechanizm historycznej pierzei lub wsi.
W danych kontekstowych są m.in. domy, bloki, usługi, pola, lasy, ogrody i trawniki.

Graf z GeoJSON łączy tylko równe współrzędne o jednakowej etykiecie poziomu,
a nie dowolne wizualne przecięcia. Bez referencji węzłów pozostaje przybliżony.
Siatka ruchu nie rozdziela jeszcze poziomów mostów/tuneli, więc może tworzyć
fałszywe przejścia. Nie zaliczać testów mostów i wielopoziomowych skrzyżowań.
Portale zapisane obecnie są próbkami wejścia drogi do fragmentu, **nie ukończonym
protokołem współdzielonych przecięć granic**. Spójność granic nie jest potwierdzona.
Woda nie blokuje jeszcze siatki ruchu. Przybliżone punkty POI leżą przy drogach,
nie są zweryfikowanymi wejściami; odległe miejsca są oznaczane jako niepotwierdzone.
Nie ma pełnej kontroli drogi od punktu interakcji do drzwi.

Testy automatyczne sprawdzają stałe współrzędne, supercover wąskiej i ukośnej drogi,
otwór poligonu, referencje grafu, brak modułów na korytarzach i niezmienność geometrii
przy poprawce palety. Nie zastępują brakujących testów zgodności grafu z ruchem,
mostów, wejść i przebudowy zabudowy fragmentu. Playwright sprawdził pięć widoków,
trasę 7 komórek i zachowanie poprawki po odświeżeniu w 1280×900 i 390×844;
bez błędów JavaScript. Nie jest to test fizycznego telefonu. Wyniki rysowania
w headless Chromium są zmienne i wynosiły kilkadziesiąt ms/klatkę po zmianach widoku.
Plik świata ma około 72 MB; potrzebuje kompresji formatu i strumieniowania fragmentów.
Indeks przestrzenny ogranicza rysowanie do widocznych obiektów, ale ładowany jest cały plik.

Nie przenoszono kodu HexWorld ani zasobów graficznych. Dane: © OpenStreetMap
contributors, https://www.openstreetmap.org/copyright, ODbL 1.0. Pochodne dane świata
należy traktować zgodnie z ODbL, niezależnie od licencji kodu gry.

Test przeglądarkowy (wymaga osobno Playwright i Chromium):

```sh
PLAYWRIGHT_MODULE=/sciezka/node_modules/playwright/index.mjs node browser-check.mjs
```

Wyniki zapisuje w `data/browser-report.json`, obrazy w `artifacts/`.

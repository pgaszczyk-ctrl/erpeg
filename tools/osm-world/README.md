## Bilans terenu — próba v5

Drogi są ciągłymi pasami w płaszczyźnie świata, niezależnymi od komórek budynków. OSM width lub domyślna szerokość według klasy; minimum czytelności 0,085 m gry dla ścieżek i 0,14 m dla ulic. Nie zalewamy wysepek. Równoległe chodniki blisko ulic scalane wizualnie, zachowane aliasy źródeł. Siatka i porty pozostają diagnostyką osi, nie szerokości drogi.

Zieleń, lasy, pola i woda z OSM chronione przed bryłami budynków; parking osobno. Tło bez klasyfikacji nie jest liczone jako zieleń. Budynki testowane rzeczywistymi częściami L/U, nie całym prostokątem obwiedni. Widok przed/po przełącza cały wynik, również budynki i kolizje spaceru. Skala i zakres bez zmian.

Próbka: drogi 64,10% → 12,04%; nieprzykryta zieleń OSM 9,57% → 33,44% całego terenu. Szacunek sumy powierzchni co 0,05 m gry, nie udział pikseli ekranu. Moduły 166 → 138; pominięte grupy 7 → 26: ochrona zieleni zmniejsza zabudowę. Nie są to docelowe proporcje dla wszystkich miast. Brak rozstrzygnięcia konfliktów/niedokładności źródłowych OSM; szerokości bez width są przybliżone. Pełna trasa do Warszawy nadal nie wygenerowana.

Walidacja: `npm run test:blocks`; przeglądarka desktop i 390×844: oba wyniki, galeria, swobodny spacer, brak błędów JS. Dane porównania: `data/ground-comparison-report.json`. Do publikacji generować także `public/blocks-before.json` (ignorowany przez Git).

# Exp-lore: lokalne laboratorium świata OSM

Uruchomiony prywatny podgląd właściciela (Sites):
https://exp-lore-osm-laboratorium.snugsnow32.chatgpt.site


Osobny eksperyment, bez zależności od gry, logowania, serwera danych ani wdrożenia.
**Działający podgląd rzeczywistych danych, ale nie zakończony test akceptacyjny z wytycznych.**



## Aktualnie: większe maski, łączenie szeregu i kalibracja podróży

Generator używa `public/building-kit.json`: podstawy 4×2, 2×4, 3×3, L i U
oraz segmenty szeregu. Maska `#` wyznacza zajęte komórki, `.` pozostawia wolny
teren (także dziedziniec). Jedna bryła może objąć wiele bloczków; wszystkie
odwołują się do tego samego ID modułu. Kolizje i nowe łączniki dróg sprawdzają
**części maski**, nie pełny prostokąt obejmujący dziedziniec.

Katalog jest walidowany: spójna maska, poprawne wymiary, brak pustych lub
oderwanych części i rzeczywista ściana pod złączem. Złącza szeregu mają wspólny
profil, wysokość gzymsu, styl i odcinek styku. Zgodne segmenty o różnych
szerokościach i fasadach mogą się łączyć. Ściany stykają się bez szczeliny,
wewnętrzne ściany nie są rysowane. Dziś używamy profilu płaskiego parapetu;
nie obiecujemy pasowania dowolnych, nieprzygotowanych dachów PNG.

Rozpoznanie szeregu opiera się na `building=terrace` albo dokładnie wspólnej
krawędzi dwóch obrysów, nie tylko bliskości centroidów. Rezerwacja obejmuje
stały obszar właścicielski 9×9 komórek. Daje to deterministyczny wybór po
przestawieniu danych i przy zmianie obszaru podglądu. Przebudowa większej bryły
wymaga ponownego przeliczenia jej obszaru właścicielskiego. Na brzegu próbki
zachowujemy pełną definicję przecinanej bryły i złącza, a rysowanie przycinamy.

Bieżąca próbka OSM: 1197 obrysów w polu podglądu, 166 modułów (część ma źródła
z kontekstu), **52 wielobloczkowe moduły i 14 wewnętrznych wspólnych ścian**.
Pominięto 7 grup, dla których nie udało się znaleźć miejsca. Zera kolizji
potwierdza audyt. To lokalne upakowanie z uproszczonym doborem funkcji, nadal
nie pełna analiza kwartałów. Zachowujemy źródłowe identyfikatory zastępcze i
tożsamości nazwanych/ważnych budynków wewnątrz agregatu.

Przycisk **„Kształty i szereg”** otwiera wyraźnie oznaczoną **próbkę syntetyczną**
z dziedzińcem U, L i trzema różnymi segmentami szeregu. To demonstracja
kontraktu grafiki i kolizji, nie fikcyjna dzielnica Lublina. Nowe maski są
rysowane kodem; pilot PNG nadal służy jedynie pasującym, wolnostojącym 2×2.
Nowe PNG można zarejestrować w `building-kit.json` → `assets`, bez zmiany maski:

```json
{
  "id":"workshop-L-steam", "shape_id":"wing-L", "style":"steam",
  "asset_file":"assets/workshop-L-steam.png",
  "canvas_px":[512,512], "anchor_px":[256,448],
  "opaque_bbox_px":[0,0,512,512],
  "party_wall_profile":null, "joined_sides":[]
}
```

To przykład pól, nie istniejący plik ani gotowa geometria kotwicy L. Grafik
podaje rzeczywistą kotwicę rzutu narożnika max x/max y całej zajętości, przy
bazie komórki 128×64 px. Obraz jest skalowany jednolicie zoom/64. Grafika do
szeregu musi jawnie deklarować obsługiwane strony styku i zgodny profil
`flat-parapet-v1`; bez tego renderer pozostawi bryłę proceduralną.

### Skala i 30 minut Lublin–Warszawa

`public/layout.json` to nowe, wersjonowane ustawienie. Źródłowy cache świata
pozostaje w starym 1:10, ale `scale.mjs` przelicza wszystkie współrzędne
wektorowe **przed** rasteryzacją i upakowaniem. Nie zmieniamy zoomu ani
rozmiaru postaci/grafik, aby udawać zmianę skali.

Przyjęto referencyjne **170 km** na podstawie
[opisu trasy Lublin–Warszawa](https://conadrogach.pl/wyznaczanie-trasy/lublin-warszawa/),
sprawdzonego 21.10.2026. Jest to odniesienie drogowe, nie wyznaczona trasa
piesza i nie ograniczenie nawigacyjne gry. Przy tempie **3 m gry/s** i
**1800 s**: realToGame = 3×1800/170000 = 0,03176470588, czyli **1:31,48148**.
170 km daje 5,4 km gry i modelowe 30 minut ciągłego marszu bez postojów,
walk i objazdów. Poprzedni model 1:10 dawał około 94,4 minuty przy tym samym
tempie. Obecna geografia jest liniowo około 3,15 razy krótsza.

Komórka odpowiada teraz 31,48 m terenu, bloczek 94,44 m. Pole 13×13 bloczków
obejmuje około 1,228 km, zachowując dotychczasowy mały obszar testu. Nie
wygenerowano całego połączenia Warszawa–Lublin i nie przeprowadzono takiej
podróży w grze. Po ustaleniu rzeczywistej długości grywalnej trasy trzeba
ponowić kalibrację. To jawnie model czasu, a nie zaliczony test całej trasy.

Pomiar w przeglądarce dał około 2,96–2,97 m gry/s z narzutem pomiaru; raport data/travel-speed-report.json jawnie oznacza model i brak pełnego testu trasy.

Dodatkowo wyrównano prędkość klawiatury we wszystkich kierunkach: pełne
wychylenie/klawisz oznacza 3 m gry/s; analogowy joystick zachowuje regulację.
Testy obejmują zmianę prawdziwych współrzędnych, czas modelu, dopasowanie i
odrzucanie złączy, ruch na dziedzińcu, agregację, stabilność po zmianie
obszaru i kolejności źródeł oraz rzeczywisty i syntetyczny audyt kolizji.

```sh
npm run generate:blocks
npm run test:blocks
PLAYWRIGHT_MODULE=/sciezka/playwright/index.mjs node multishape-browser-check.mjs
```

## Aktualnie: swobodny spacer, czyszczenie resztek i pilot grafiki

Domyślnie podgląd pozwala chodzić po całym wolnym terenie — także trawie i
podwórkach. Kliknięcie zachowuje dokładny cel, WASD/strzałki i dotykowy joystick
sterują ciągłą pozycją. Ruch sprawdza przemiatany odcinek, z promieniem postaci
0,1 m gry, oraz ślizga się wzdłuż ścian. Kliknięcie budynku jest odrzucane.
`free-walk.mjs` używa pomocniczej siatki 0,1 m wyłącznie do szukania trasy,
a potem wygładza ją odcinkami widoczności. Postać nie skacze po polach.
Limit wyszukiwania 300 tys. węzłów może odrzucić skrajnie złożoną trasę.
Kolizje są konserwatywnymi prostokątami rozszerzonymi o rozmiar postaci.
Woda jest blokadą poligonową; w tej próbce nie ma wody i nie zaliczamy
na jej podstawie kompleksowego testu brzegów z promieniem postaci.
Walka nie jest dodawana w laboratorium; właściciel dopuszcza w niej siatkę.

`terrain-cleanup.mjs` wypełnia brukiem drobne, zamknięte resztki do 3 komórek
bez budynków i ważnego źródłowego pokrycia terenu (park/ogród/plac zabaw/las/woda).
Wypełniono 61 pól; 7 małych podwórek lub chronionych obszarów zachowano.
Duże trawniki i podwórka pozostają; bruk nie dodaje fikcyjnych dróg do OSM.
Bez względu na kolor nawierzchni wolny teren pozostaje przechodni.

Dostarczona paczka `Exp_lore_budynki_pilot_v1.zip`: cztery PNG 512×512, manifest
i opis pochodzenia w `public/assets/building-pilot-v1/`. Oryginały nie były
przerabiane. Wczytywane są warianty domu i bloku w stylu steam/elven, tylko na
modułach **2×2** odpowiedniej kategorii. Podmieniono 531 zgodnych modułów; usługi
i mniejsze podstawy pozostają proceduralne. Wybór stylu jest w menu, przyciski
„Dom pilota” i „Blok pilota” ustawiają kamerę na rzeczywistych modułach.

Kotwica używa `[256,448]` z manifestu, rzutowana z narożnika max x/max y
**zajętości**, nie z pomniejszonej bryły. Jednolity współczynnik skali zoom/64,
bez rozciągania i lustrzanego odbicia. Dostarczono tylko orientację 0. Grafiki
nie zmieniają położenia, footprintu, ID ani kolizji. Przy zasłonięciu pionka
budynek jest przygaszany (przybliżone sprawdzenie bbox sprite'a); znacznik stóp
pozostaje czytelny. Nie ma jeszcze podziału długich sprite'ów na segmenty głębi.

Testy: `npm run test:blocks`; niezależna kontrola wymiarów, alpha i kotwic
PNG w data/pilot-asset-report.json; testy przeglądarkowe obu stylów i podstaw,
precyzyjnego celu poza drogą, faktycznego ruchu, blokady budynku oraz odrębny
test dotykowego joysticka z zatrzymaniem po puszczeniu. Wynik przy 1280×900
i 390×844 bez błędów JS. Nie jest to test fizycznego telefonu.

```sh
PLAYWRIGHT_MODULE=/sciezka/playwright/index.mjs node free-pilot-browser-check.mjs
```

## Nowa próbka: bloczki 3×3 (21 października 2026)

Domyślny podgląd pokazuje teraz **próbkę 1,2 × 1,2 km** wokół Guliwera 4.
Poprzedni pełny wycinek jest pod `legacy.html`. Nie rozszerzamy próby na cały świat.

```sh
cd tools/osm-world
npm run generate
npm run generate:blocks
npm run test:blocks
npm start
```

Do wygenerowania tylko nowej próbki z wcześniej zapisanej wersji świata:

```sh
node generate-blocks.mjs /sciezka/world.json
```

`blocks.mjs` działa przed uruchomieniem podglądu. Komórka ma **1 m gry = 10 m
terenu**, bloczek to **3×3 komórki = 30×30 m terenu**. To osobna wersja układu
`blocks-3x3-v1`, bez zmiany konfiguracji starego świata. Początek siatki pozostaje
stały w EPSG:2180. Generator pobiera dodatkowy pas sąsiednich bloczków jako kontekst.

Najpierw rasteryzowane są drogi OSM (supercover). Wspólna krawędź dwóch komórek
należących do tej samej drogi definiuje jeden kanoniczny portal, na który wskazują
oba bloczki. Każdy bloczek zachowuje swoją maskę 9 komórek, maski czterech sąsiadów
i listę wspólnych wejść. Zewnętrzne wyjścia próbki są jawnie oznaczone.

Dopiero później układane są moduły. Obrysy w jednym bloczku są łączone w jeden
moduł ze źródłową listą identyfikatorów zastępczych. Moduł zajmuje wolny prostokąt
2×2, 2×1 lub 1×1 komórek i ma szczelinę 0,3 m gry. Nigdy nie wychodzi poza własny
bloczek ani nie zajmuje komórki drogi/wody. Kolejność danych i zmiana rozmiaru
próbki nie przesuwają wspólnych modułów. To prosta agregacja według siatki,
jeszcze bez analizy funkcji kwartału i historycznej pierzei.

Drogi są rysowane jako powierzchnie komórek w tej samej izometrii co podstawy
budynków, a nie jako kreski o stałej szerokości ekranu. Budynki mają dachy dwuspadowe.
Warstwy: izometria, bloczki i sąsiedzi, wejścia dróg oraz rzeczywiste wektory OSM 2D.
„Następny bloczek” wybiera przykład z drogą i zabudową. „Buduj krokami” odtwarza
kolejne gotowe bloczki; nie wykonuje importu w pętli renderowania. Spacer działa
po rzeczywistych komórkach dróg próbki, z blokowaniem trawnika i budynków.

Wynik: 1600 bloczków, 4191 komórek dróg, **1586 wspólnych wewnętrznych portali**,
1159 obrysów źródłowych → **690 modułów**, 4 bloczki zabudowy pominięte z braku
miejsca. 73 wyjścia na zewnętrznej granicy. Niezależny audyt zajętości: **0 kolizji
budynek–budynek, 0 kolizji budynek–droga, 0 błędnych portali**. 2 drogi na innych
poziomach jawnie pominięte. Generowanie około 1,6–2,2 s na poprzednio opisanym
serwerze; plik `public/blocks.json` jest ignorowany w git. Raporty: `data/blocks-*`.

Testy sprawdzają ciągłość ruchu przez granice, ukośne przejścia, ujemne indeksy,
niezmienność po zmianie kolejności danych i rozmiaru próbki, wspólne portale,
agregację i kolizje. Audyt wykrywa także celowo wprowadzone kolizje. Playwright
sprawdza cztery widoki, inspekcję sąsiadów, kroki budowy i **faktyczny ruch pionka**
na komputerze i w układzie telefonu. Test przeglądarkowy można powtórzyć:

```sh
PLAYWRIGHT_MODULE=/sciezka/playwright/index.mjs node blocks-browser-check.mjs
```

Ograniczenia: komórka 10 m upraszcza i schodkuje drogi, może sklejać pobliskie
chodniki. Portale sprawdzają zgodność rasteryzacji, nie odzyskują utraconych ID
węzłów OSM. Mosty/tunele nie są jeszcze obsługiwane w tej próbce. Łączenie w tym
samym bloczku może połączyć różne funkcje budynków; POI nie mają jeszcze osobnych
wejść. Nie uruchomiono wielodniowego zadania ani generowania całego obszaru.

---

Poniżej dokumentacja starszego eksperymentu (`legacy.html`).

## Uruchomienie

Wymagane Node 22+ i Python 3 (biblioteki standardowe; bez instalacji pakietów).
Z katalogu głównego repo:

```sh
cd tools/osm-world
npm run generate
npm test
npm start
```

Otwórz http://localhost:4174. Generowanie trwa około 9–21 sekund na użytym serwerze.
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
w headless Chromium są zmienne i wynosiły 41,5 ms (układ telefonu) i 103,6 ms (komputer) po zmianach widoku.
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

## Przekątne zamiast schodków (21 października 2026)

Widok świata łączy schodki przekątnymi: zewnętrzne narożniki drogi są ścinane,
a wewnętrzne uzupełniane trójkątnym łącznikiem. Łącznik powstaje tylko między
komórkami wspólnej drogi źródłowej, gdy nie przecina obrysu modułu i wody.
Siatka rezerwacji, budynki i dotychczasowe portale nie przesuwają się. W siatce
diagnostycznej nadal widać bazowe kwadraty; w świecie izometrycznym widać
powierzchnię z przekątnymi. Ruch pionka korzysta z jawnych połączeń ukośnych
(bez dowolnego cięcia narożników), a test próbuje punkty na każdym odcinku
po widocznej nawierzchni. BFS minimalizuje liczbę kroków, a nie koszt geometryczny
przekątnej; nie jest to nawigacja po dozwolonych trasach w rzeczywistym mieście.

W próbce: 1402 trójkątne łączniki i 1472 połączenia ukośne. Niezależny test
sprawdza brak kolizji łączników z budynkami oraz pokrycie trasy geometrią drogi.
Budynki są identyczne jak przed zmianą.

Aktualna biblioteka: **3 kategorie logiczne, jedna bryła proceduralna, 4 rozmiary
podstawy i 10 palet**. Liczby modułów: dom 668, usługi 16, blok mieszkalny 6.
Zalecany zestaw grafik oraz kotwice i podstawy opisano w [ART_BRIEF.md](ART_BRIEF.md).
Importer własnych sprite'ów pozostaje kolejnym krokiem po otrzymaniu próbnej grafiki.

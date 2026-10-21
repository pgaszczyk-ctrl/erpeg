# Exp-lore — pilot budynków v1

Paczka testowa, 21.10.2026. Wzory: jasna dzielnica parowa i elficka z zielonymi dachami z tej rozmowy. Obejmuje większy dom i budynek wielorodzinny dla obu stylów. To grafiki do sprawdzenia w generatorze; nie jest to gotowy importer ani wdrożona zmiana gry.

## Zawartość

| Plik | Styl | Podstawa | Widok | Kondygnacje fasady |
|---|---|---|---|---|
| `sprites/house-large-steam-0.png` | parowy, lekki baśniowy | 2×2 | 0 | 2 |
| `sprites/apartment-steam-0.png` | parowy, lekki baśniowy | 2×2 | 0 | 4 + dach mansardowy |
| `sprites/house-large-elven-0.png` | elficki, magiczny | 2×2 | 0 | 2 |
| `sprites/apartment-elven-0.png` | elficki, magiczny | 2×2 | 0 | 3 |

- `manifest.json`: rzeczywiste wymiary PNG, kotwice, podstawy, nazwy plików i konwencja orientacji.
- `overlays/`: przezroczyste nakładki pasujące piksel w piksel do sprite’ów; dodatkowo wspólny SVG.
- `PODGLAD.html`: samodzielny lokalny podgląd z przełącznikiem nakładek i ciemnego tła; obrazy są osadzone w pliku. Jego otwarcie nie pobiera niczego z sieci.
- `PODGLAD.png`, `PODGLAD_Z_PODSTAWA.png`: plansze porównawcze w skali 1:1.
- `sources/`: cztery źródła o wyższej rozdzielczości, przed normalizacją eksportu. Do gry używać wyłącznie `sprites/`.
- `QA_geometry.json`, `VALIDATION.json`: zapis parametrów eksportu i wyniki kontroli gotowych plików.
- `SPECYFIKACJA_PILOTA.md`: wymagania techniczne przyjęte z treści zamówienia w tej rozmowie.
- `PROMPTY.md`: opis poleceń i pochodzenia grafiki.

## Rzut i kotwica

Wszystkie cztery PNG mają **512×512 px**, prawdziwy kanał alpha i brak tła, podłoża oraz cienia rzucanego na ziemię. Alpha eksportu ma tylko wartości 0/255. Cieniowanie ścian pozostaje częścią budynku.

- Komórka: romb 128×64 px. Wektory osi: `(64,32)`, `(-64,32)`.
- 1 komórka = 1 m gry = 10 m terenu rzeczywistego.
- Działka: 2×2 = romb 256×128 px.
- Początek lokalnego świata `(0,0)` rzutuje się na `(256,320)` obrazu.
- Kotwica `anchor_px = [256,448]` to rzut narożnika świata `(2,2)`, czyli x=max, y=max zajętości. **Nie** jest to dół pliku, próg drzwi ani koniec widocznej ściany.
- Narożniki zajętości w PNG, od tylnego zgodnie z ruchem wskazówek: `(256,320)`, `(384,384)`, `(256,448)`, `(128,384)`.
- Bryła na ziemi jest wpisana w zakres `[0.15,1.85]` obu osi. Narożniki tego obrysu: `(256,329.6)`, `(364.8,384)`, `(256,438.4)`, `(147.2,384)`.
- Różnica 9,6 px między najbliższym narożnikiem ścian a kotwicą jest zamierzona: to odsunięcie 0,15 komórki.
- Rzut 2:1 i odsunięcie zostały wyrównane podczas przygotowania stałych wariantów eksportu. Raster dopuszcza zaokrąglenie do 1 px.

Nakładki: turkus = granica działki i podział na komórki; fiolet = obrys odsunięcia bryły; żółty = kotwica. Nakładka jest debugowa; nie łączyć jej na stałe z grafiką gry.

## Wstawienie do testu

Najpierw wstawić `house-large-steam-0.png` w miejsce jednego istniejącego modułu **2×2**, zachowując jego pozycję, zajętość, kolizje i źródła OSM. Następnie sprawdzić blok i wersje elfickie. Nie zastępować tymi plikami modułów 1×1 lub prostokątnych.

Przy skali źródłowej lewy górny róg rysowania = ekranowa pozycja narożnika x=max,y=max minus `(256,448)`. Przy innym zoomie mnożyć obraz i kotwicę przez ten sam współczynnik. Nie rozciągać osobno szerokości/wysokości i nie dopasowywać grafiki do przypadkowej działki. Jeśli renderer przyjmuje pozycję środka albo początku działki, najpierw przeliczyć ją na wskazany narożnik świata.

```js
// screenAnchor to już rzut narożnika x=max, y=max z generatora.
// zoom jest jednym wspólnym współczynnikiem kamery.
ctx.drawImage(image,
  screenAnchor.x - asset.anchor_px[0] * zoom,
  screenAnchor.y - asset.anchor_px[1] * zoom,
  asset.canvas_px[0] * zoom,
  asset.canvas_px[1] * zoom
);
```

`orientation: 0` w tej paczce oznacza front z drzwiami na widocznej prawej fasadzie, o normalnej świata `+X`. Nie należy utożsamiać tego automatycznie z nieznaną konwencją kątów istniejącego renderera; dopasować mapowanie po stronie importu. Dostarczono jeden kierunek, bez lustrzanego odbicia ani obracania PNG w ekranie.

## Co sprawdzić w grze

1. Prawidłowy narożnik, odstęp od granic i stałość położenia przy zoomie.
2. Dom i blok na tej samej działce 2×2; brak zmiany kolizji lub dostępu do POI.
3. Sortowanie z postacią i sąsiadami, zasłanianie przez dach oraz czytelność na telefonie.
4. Wizualną wysokość i detal w rzeczywistym zoomie. `height_game_m` jest **nominalnym parametrem artystycznym do testu**, nie pomiarem modelu 3D ani wysokością do kolizji. Przyjęta pomocnicza skala pionowa to 64 px/m gry. Sam rysunek określa rzeczywistą widoczną wysokość.
5. Przy przyszłym dodaniu cieni dostarczyć je osobno. `shadow_file: null` oznacza ich brak.

## Zakres i ograniczenia

To pierwszy pilot, nie komplet sześciu brył. Nie zawiera jeszcze podstaw 1×1, 1×2, 2×1, nowych kategorii logicznych, kierunków 90/180/270, masek materiałów ani dziesięciu palet. Parowy i elficki korzystają ze wspólnej rodziny ciepłych ścian, drewna i zielono-turkusowych dachów. Nie wykonano testu w działającej grze ani importu do repozytorium. Kontrola plików i geometria eksportu nie zastępują tego testu.

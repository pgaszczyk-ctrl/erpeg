# Smoki 40 — pełny zestaw v2 / 40-G002

**[Pobierz paczkę PNG, atlasów i podglądów](../40_smoki_pelne_v2.zip).** Rozpakuj folder `40_smoki_pelne_v2`, otwórz `podglad.html` i wybierz animację. Podgląd działa lokalnie bez logowania i bez połączeń z serwerem.

Pakiet uzupełnia 40-G001: zawiera wszystkie poprzednie ataki oraz nowe stanie, chód, ugryzienia, śmierć, lot górskiego/Cienia i dodatkowe fazy ataków Cienia. Nowe ugryzienie leśnego zastępuje dziewięć klatek z v1, żeby pasowało do reszty nowego arkusza ruchu.

## Zakres

| Gatunek | Stanie | Chód | Ugryzienie | Śmierć | Specjalne | Start/lot/lądowanie | Razem |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ognisty | 6 | 12 | 9 | 3 | ziej: 9 | — | 39 |
| Górski | 6 | 12 | 9 | 3 | szpony: 9 | 11 | 50 |
| Kwasowy | 6 | 12 | 9 | 3 | pluj: 9 | — | 39 |
| Leśny | 6 | 12 | 9 | 3 | — | — | 30 |
| Trujący | 6 | 12 | 9 | 3 | dmuch: 9 | — | 39 |
| Cień | 6 | 12 | 9 | 3 | ziej/pluj/dmuch: po 9 | 11 | 68 |
| **Łącznie** | **36** | **72** | **54** | **18** | **63** | **22** | **265** |

Stanie, chód, ugryzienie i specjalne są w trzech stronach `bok`, `przod`, `tyl`. Śmierć jest z boku. Start ma bok i przód po 3 klatki; `lot_gora` 2; `ladowanie_przod` 3. Bok patrzy w lewo; prawo robi gra przez lustro.

## Pliki

- `<gatunek>/<akcja>_<kierunek>_<nr>.png`: 265 klatek do użycia, każda 220×200 px.
- `<gatunek>/smok_<gatunek>.png`: pełny atlas gatunku, **8 kolumn**, układ wierszami. Puste końcowe komórki ignorować.
- `<gatunek>/smok_<gatunek>.json`: lista `klatki` w kolejności atlasu; rozmiar komórki i wymiary siatki. Nazwy zgodne z istniejącym `smokRysunki.ts`; nowa akcja `szpony` wymaga osobnego podłączenia.
- `metadata.json`: każdy indeks atlasu i prostokąt klatki, punkt pyska, punkt zaczepienia, skala oraz grupy animacji/czasy.
- `<gatunek>/<akcja>_<kierunek>_podglad.gif`: 89 podglądów sekwencji. GIF-y służą ocenie póz; miarodajne dopasowanie zaczepów pokazuje HTML.
- `QA.json`: sprawdzenie wymiarów, alf i liczby kolorów; sumy SHA-256 poszczególnych klatek są w metadanych.
- `zrodla/` w repozytorium: dziewięć nowych arkuszy źródłowych. Nie są potrzebne do wczytania gotowych klatek. `export.py` wykonuje tylko wycięcie, skalowanie nearest-neighbour, twardą alfę, wspólną paletę i pakowanie — nie rysuje animacji programowo.

## Ważne dla podłączenia

**Nie używać jednego origin dla wszystkich klatek.** Dla każdej klatki stosować `renderOrigin` i `renderScale` z `metadata.json`. Punkt zaczepienia w widoku od tyłu omija wystający ogon, a w powietrzu odnosi się do tułowia. W locie rozłożone skrzydła mieszczą się w komórce dzięki mniejszemu eksportowi; `renderScale` kompensuje to w świecie. Nie dopasowywać klatek osobno do pełnego rozmiaru komórki, bo ciało będzie zmieniało wielkość.

Punkty zaczepienia, pyska i skala są **przybliżone**. Należy je sprawdzić w grze po połączeniu z cieniem, ruchem i efektami. Otwarty pysk w widoku od tyłu bywa zasłonięty; tam punkt emisji musi być zweryfikowany szczególnie uważnie. Ten eksport nie jest potwierdzonym wdrożeniem w Phaser.

Przy lustrze punkt `(x,y)` przeliczyć na `(220-x,y)`. Odbić także origin X (`1-originX`). W pionie nie odbijać. Każda sekwencja ma własną listę indeksów w `animations`; **nie zakładać sąsiadujących indeksów ani kolejności alfabetycznej numerów poza metadanymi**.

Proponowane czasy są w `durationsMs`. Stanie, chód i lot odtwarzać w pętli; ataki, start, lądowanie i śmierć raz. Po śmierci pozostać w ostatniej leżącej klatce. Podglądy celowo odtwarzają także animacje jednorazowe ponownie. `hitFrame: 1` oznacza indeks drugiej klatki, sugerowany moment trafienia/emisji; nie zmienia parametrów obrażeń i zasięgów.

Lot nadal wymaga ruchu całego sprite’a w kodzie: wznoszenia, cienia i zejścia do lądowania. Sama zmiana obrazków nie przesuwa aktora. Dla Cienia fazy ziej/pluj/dmuch/lot wybiera obecna logika bossa; nie używać wydechu jako zastępstwa każdej akcji.

Wylatujące płomienie, pociski, chmury i fala uderzeniowa pozostają dotychczasowymi osobnymi efektami gry. Płomyk na ogonie ognistego jest elementem zaakceptowanej sylwetki.

## Styl i kontrola

Zachowano zaakceptowane masywne, różne sylwetki: ognisty z płomieniem na ogonie, szerokoskrzydły górski, kwasowy z dłuższą szyją, leśny z liściastą kryzą/porożem, niski trujący z workami jadowymi, granatowo-złoty Cień.

Każdy gatunek używa jednej palety z v1: do 15 kolorów nieprzezroczystych plus przezroczystość; alfa wyłącznie 0/255, bez ditheringu. Kontur pochodzi z rysunku i **nie jest gwarantowany jako dokładnie 1 px na całym obwodzie** po skalowaniu. Główny kierunek światła: lewa-góra. Rzeczywiste kolory sprawdzono w gotowych PNG, nie tylko w opisie.

Kontrola eksportu: 265 klatek i 89 sekwencji; wymagane nazwy i liczby klatek; brak identycznych plików wewnątrz sekwencji; poprawne rozmiary atlasów, twarda alfa, limit palety i przezroczysty margines; obejrzane plansze stania/chodu/śmierci oraz lotu. **Nie wykonano testu integracji i synchronizacji w grze.** Podgląd HTML wymaga własnego sprawdzenia przez programistę; nie raportujemy go jako testu Phaser.

## Odtworzenie

Python: Pillow, numpy, scipy; ImageMagick `convert` i `montage`. Obok `export.py` umieścić `zrodla/` z tego katalogu repozytorium i `poprzednie_ataki/` z rozpakowanego `40_smoki_ataki_v1.zip` (zawartość folderu `40_smoki_ataki_v1`, łącznie z metadata.json i klatkami). Uruchomić `python export.py`. Oryginałów i poprzednich klatek nie zastępować nowymi generacjami przy ponownym pakowaniu.

Próba `npm run build` nie mogła uruchomić aplikacji w tej kopii roboczej: checkout ograniczono do dokumentacji i grafik, bez `scripts/build-maps.mjs` i reszty kodu. Nie jest to udany test kompilacji ani sygnał błędu w grze. Dostawa nie modyfikuje kodu aplikacji. Sprawdzono składnię JavaScript podglądu przez `node --check`; testu przeglądarkowego/Phaser nie wykonano.

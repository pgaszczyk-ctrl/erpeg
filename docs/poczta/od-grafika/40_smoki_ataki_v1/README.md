# Smoki 40 — ataki v1

**[Pobierz pliki do użycia — 40_smoki_ataki_v1.zip](../40_smoki_ataki_v1.zip)**. Archiwum zawiera PNG, atlasy, GIF-y, metadane, podgląd HTML i skrypt eksportu. Rozpakować w `docs/poczta/od-grafika/`; źródła `zrodla/` są obok w repozytorium. Skrypt z archiwum skopiować do repozytoryjnego `scripts/`.

Pakiet 54 osobnych PNG, sześciu atlasów PNG i 18 podglądów GIF. Jest to **moduł ataków**, a nie kompletne zastępstwo wszystkich animacji smoków z zamówienia 40-P001.

## Pliki i odtwarzanie

| Gatunek | Prefiks akcji | Pliki |
|---|---|---|
| Ognisty | `ziej` | `ognisty/ziej_<bok|przod|tyl>_<1..3>.png` |
| Górski | `szpony` | `gorski/szpony_<bok|przod|tyl>_<1..3>.png` |
| Kwasowy | `pluj` | `kwasowy/pluj_<bok|przod|tyl>_<1..3>.png` |
| Leśny | `ugryzienie` | `lesny/ugryzienie_<bok|przod|tyl>_<1..3>.png` |
| Trujący | `dmuch` | `trujacy/dmuch_<bok|przod|tyl>_<1..3>.png` |
| Cień | `ziej` | `cien/ziej_<bok|przod|tyl>_<1..3>.png` |

- Klatka 220 × 200 px; nominalna baza obrazu `[110,170]`. Do rysowania używać **`renderOrigin` / `renderAnchor` konkretnej klatki** z `metadata.json`: w widoku tylnym ogon schodzi poniżej stóp, a podczas pikowania zaczepem jest tułów. Stałe origin `[0.5,0.85]` we wszystkich klatkach spowoduje przesunięcia. Punkty dobrano ręcznie w przybliżeniu; wymagają sprawdzenia w grze. Zastosowanie osobnego zaczepu zachowuje wspólną skalę gatunku bez zmniejszania go przez wystający ogon.
- `atlas.png` ma 660 × 600 px. Kolumny: zapowiedź, uderzenie, powrót. Rzędy: bok, przód, tył.
- Bok patrzy w lewo; prawo przez lustro. Przy lustrze pysk `(x,y)` staje się `(220-x,y)`.
- Proponowane czasy: 280 / 160 / 400 ms, jednokrotnie. GIF celowo zatrzymuje powrót dłużej (650 ms) i zapętla podgląd; jego tempa nie należy kopiować automatycznie do mechaniki walki.
- Zdarzenie trafienia / emisji efektu: wejście w klatkę 2. To propozycja synchronizacji, nie nowe zatwierdzone obrażenia ani zasięgi.
- `mouth` w metadanych jest **przybliżonym** punktem pyska dla każdej klatki. Trzeba go sprawdzić przy podłączeniu efektów, szczególnie w widoku tylnym, gdzie pysk bywa zasłonięty.
- Tło przezroczyste, alfa 0/255, maksymalnie 15 nieprzezroczystych kolorów na gatunek + przezroczystość, bez ditheringu; nearest-neighbour. Nie rozciągać osi osobno. Obrys pochodzi z ilustracji; eksport nie gwarantuje obrysu dokładnie 1 px w każdym miejscu.

## Atak górskiego: pikujące szpony

1. Uniesienie, przednie łapy podciągnięte pod klatkę piersiową, tylne zaczynają wychodzić do przodu.
2. Tylne łapy wyprowadzone przed tułów, rozwarte szpony, uderzenie jak u orła.
3. Hamowanie skrzydłami, cofnięcie tylnych łap.

Podczas tego ataku `renderAnchor` jest punktem tułowia nad podłożem, a nie kontaktem łap z ziemią. Gra przesuwa cały sprite, cień i miejsce trafienia zgodnie ze swoją fazą lotu. Sam arkusz nie wdraża pikowania ani zmiany dotychczasowego ataku górskiego. Nowa akcja `szpony` wymaga obsługi w animatorze; nie należy zakładać, że istniejący loader już ją rozpoznaje.

## Efekty i integracja

Wylatujący ogień, kwas, jad i energia nie są wmalowane w atakujące postacie; zgodnie z zamówieniem korzystamy z istniejących efektów gry. Stały płomyk na ogonie ognistego jest elementem zatwierdzonego wyglądu.

Nie zastępować obecnego pełnego atlasu gatunku samym dziewięcioklatkowym plikiem. Programista powinien dodać osobne klucze ataków albo scalić te klatki z pozostałymi animacjami, zachowując obecne stany. Cień dostał tutaj tylko wydech `ziej`; fazy `pluj`, `dmuch` i lot nie są w tym pakiecie.

Nowe, zróżnicowane sylwetki zostały zaakceptowane przez właściciela 18.10.2026 po dwóch poprawkach: gatunki mają różnić się budową, ale pozostawać szerokie i masywne. Te decyzje zastępują zapis 40-P001 o identycznej pozie/sylwetce i bezwzględnie niezmienionym ognistym.

**Poza tym pakietem:** `stoi`, `idzie`, pozostałe ugryzienia, śmierć, start, lot i lądowanie. Nie wytwarzać ich jako kopii klatek ataku i nie oznaczać całego zamówienia jako ukończonego. Wdrożenie w grze pozostaje do programisty.

## Kontrola

`QA.json`: wszystkie 54 klatki mają poprawny rozmiar, twardą alfę, ograniczenie palety i pustą krawędź. Obejrzano planszę wszystkich klatek po eksporcie. Oryginały zachowano w `zrodla/`; skrypt reprodukcji: `scripts/smoki40-ataki-export.py` (Python z Pillow/numpy/scipy do inspekcji; ImageMagick do eksportu).

Podgląd bez gry: otworzyć `podglad.html` (lokalne PNG, bez połączenia z serwerem). Wybór kierunku i pauza pozwalają obejrzeć również punkty zaczepienia.

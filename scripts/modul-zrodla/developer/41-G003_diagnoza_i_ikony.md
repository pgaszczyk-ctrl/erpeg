ID: 41-G003
Od: grafik
Do: programista / właściciel
Status: diagnoza wykonana, maski poprawione; CSS do zastosowania
Dotyczy: zrzuty 34803–34807, postacie modułowe v6.1 → v6.2

Sprawdzona gałąź: ccr-9ad7c2f9-reh9fq w pgaszczyk-ctrl/erpeg.

## Wynik

Samo składanie głowy z ciałem jest poprawne. Wszystkie cztery paski w `public/postacie/modul/` porównano piksel po pikselu z arkuszami paczki v6.1 — zgodne dla wszystkich 20 postaci. Kotwice z `src/content/modulDane.ts` są zgodne z manifestem we wszystkich 60 kierunkach. `src/ui/modulPostac.ts` prawidłowo używa `Math.round(neck − mount)` i rysuje ciało przed głową; przesunięcie DOL dotyczy obu części. Nie wprowadzać dodatkowych przesunięć głowy.

Problemy są dwa, po obu stronach przygotowania podglądu:

1. **Błąd masek grafika.** Część skóry na policzkach, uszach oraz widocznej przez okulary nie miała maski niebieskiej. Filtr komponentów błędnie dopuszczał odłączone obszary skóry przy oczach tylko do 10 pikseli. Okulary rozdzielają skórę na większe obszary, więc np. u profesora zostawały jasne policzki, uszy i wnętrza szkieł. Po wybraniu ciemniejszej skóry wyglądało to jak różne twarze naklejone na siebie. W v6.2 maski poprawione w 23 widokach głów (69 plikach klatek plus powiększenia i arkusze). Przód profesora: maska skóry 176 → 278 px. Dodatkowo usunięto 13 odłączonych pikseli z frontowej głowy ogrodniczki 06, we wszystkich trzech klatkach.
2. **Filtr i prezentacja w UI gry.** `index.html`, `.k-dag-pic`, nakłada `filter: sepia(0.55) contrast(1.05)` na cały obraz. Zmienia to również twarz, włosy i ubrania, więc wybrana paleta nie odpowiada kolorom widocznym w ramce. `.k-dag-hero` nie ustala `image-rendering: pixelated`; globalna reguła dla `canvas` nie dotyczy tego elementu `div` z obrazem tła. Dołączono minimalną poprawkę CSS: wyłączyć filtr na rodzicu i jawnie ustawić pikselowe wyświetlanie tła.

Ciemna twarz sama w sobie nie oznacza awarii — jest wybranym odcieniem skóry. Błędem były pozostające jasne fragmenty i dodatkowa zmiana barw przez sepię. Również zmiana ubrania lub fryzury po naciśnięciu Losuj jest zgodna z obecną funkcją losowania.

Odtworzono układ łuczniczki 18 z ciałkiem 18 i jasnym kolorem ubrania bez zmiany algorytmu montażu. Efekt konturowej, jasnej kurtki pochodzi z rysunku, jego cieniowania i doboru kolorów; nie jest dowodem złego ustawienia kotwic. Nie zmieniano jej proporcji ani punktów montażu.

Porównanie w `preview/41-G003_maski_i_sepia.png` pokazuje te same przykładowe ustawienia kolorów w trzech wersjach: maska v6.1 + filtr gry, maska v6.1 bez filtra, poprawiona maska bez filtra. Zestawy kolorów są kontrolnymi przykładami — zrzuty nie zawierają zapisanych indeksów wszystkich kolorów.

## Co podmienić

Podmienić `scripts/modul-zrodla` plikami paczki v6.2 i uruchomić `python3 scripts/postacie-modul.py`, aby przeliczyć paski i dane referencyjne. Nowy manifest nadal ma `version: 6`, z `revision: "6.2"`. Nazwy i kotwice zachowane. Zastosować CSS z `41-G003_podglad.css` lub równoważny diff. Wyczyścić cache złożonych arkuszy przy podmianie danych / przeładować stronę.

Kontrola: wszystkie 180 klatek ciałek i ich maski są identyczne z v6.1; wszystkie kotwice niezmienione. Zmiana grafiki głów dotyczy wyłącznie usunięcia 13 odłączonych pikseli 06 front. Nadal 3600 połączeń bez przerwy na osi szyi; maski nie wychodzą poza alfa. Szczegóły: `kontrola_41-G003.json` i `kontrola_41-P002.json`.

## Trzy ikony

`ui_icons/plec_64.png`: połączone ♀♂, `kolory_64.png`: paleta, `losuj_64.png`: kostka. Tylko ikony, bez tekstów i bez prostokątnego tła. Wersje PNG 32/48/64/128/256, atlas 192×64 i oryginały źródłowe. Sugerowana ikona 40 CSS px w polu dotyku minimum 48×48 CSS px. Mniejszy pasek trzech przycisków zamiast obecnych dużych szarych prostokątów.

Przycisk płci zachowuje wspólną ikonkę ♀♂, a aktualną płeć podaje `aria-label`/`title`. Przycisk palety w obecnym kodzie nadal zmienia wyłącznie kolor skóry — etykieta dostępności powinna to mówić. Kostka zachowuje obecną funkcję losowania. Nie usuwać tekstowej etykiety dla czytników ekranu, tylko jej widoczny napis.

Ikony wykonano wbudowanym imagegen, zestaw promptów: `ui_icons/prompts.json`. Powiększenia/przeskalowania ikon przygotowano NN z binarną alfą.

Bez wdrożenia lub commitu do repozytorium w ramach tej diagnozy.

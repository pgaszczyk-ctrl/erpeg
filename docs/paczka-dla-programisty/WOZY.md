# Wozy konne składane z części (decyzja właściciela 5.10)

Dzisiejsze wozy (WOZY w content/swiat.ts: gotowe obrazki 248×198, `wysokosc` 50 px mapy, ładunek wrysowany) są za duże, gładkie i ładunek „tonie”. Nowe: grafik dostarcza części (zamówienie 14 w paczce grafika), my je wyrównujemy (`wyrownaj.py`) i **składamy w grze**.

## Składanie (od tyłu do przodu)
1. cień (sylwetka całości, przesunięta w prawo-dół, jak u budynków),
2. wóz – warstwa „tył” (dno, tylna ściana, tylne koło),
3. ładunek(i) – kotwica = środek dna skrzyni z pliku wozu (`kotwice.json`: punkt dna, szerokość dna); do 3 sztuk obok siebie, losowo z ziarna miejsca,
4. wóz – warstwa „przód” (przednia burta, przednie koło) – przykrywa dół ładunku, więc nic nie „tonie” ani nie wisi,
5. koń (klatki postoju losowo co 1,4–2,6 s), maść = przebarwienie sierści (5 maści, tabela kolorów; przebarwiamy tylko piksele z odcieni sierści wzorcowego konia),
6. woźnica na koźle (jeśli wóz ma kozioł) albo stojący obok (jak dziś).
Lustro całości, gdy wóz stoi w prawo.

## Skala
Koń ok. 24 px mapy wysokości z głową (bohater 24), zaprzęg ok. 50 px mapy długości (zamiast dzisiejszych 50 px wysokości). Pokrętło `WOZY.dlugosc`.

## Różnorodność
Wóz = typ (skrzynia, drabiniasty, bryczka, kryty, beczkowóz, kocioł) × ładunek (pusty, beczki, worki, skrzynie, siano, dynie, drewno, bańki, dywan; siano tylko na drabiniastym, beczkowóz i bryczka bez ładunku) × maść (5). Wybór z ziarna miejsca: przy dworcach autobusowych głównie bryczki i kryte (podróżni), na wsiach drabiniaste i skrzynie, przy targach skrzynie z warzywami, na dużych dworcach jeden `woz_kociol`.

## Zadanie
| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| G13 | Wozy z części: składanie warstw, kotwice ładunku, przebarwienie maści, nowa skala, dobór wg miejsca | próbka grafika (koń + skrzynia + beczki/worki) stoi przy dworcu w dobrej skali, ładunek leży na dnie | ~200 tys. |

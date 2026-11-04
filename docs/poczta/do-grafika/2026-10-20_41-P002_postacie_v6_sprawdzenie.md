ID: 41-P002
Odpowiedź na: 41-G001
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 20.10.2026 przekazał paczkę v6 do sprawdzenia („sprawdź czy wszystko jest”)
Wykonanie: sprawdzone, jeszcze nie wdrożone
Dotyczy: postacie modułowe v6 (20 głów + 20 ciałek, 3 kierunki × 3 klatki)

# v6 – sprawdzenie

Dziękuję – kompletność i liczby się zgadzają, poprawki z 41-P001 są zrobione.

| Co | Wynik |
|---|---|
| Pliki | 360 części + 360 masek, 40 arkuszy 3×3 (192 i 1536), manifest, kotwice, GIF-y – komplet |
| Płeć | 7 f / 13 m, `gender` i `plec` zgodne |
| Kotwice | stałe w trzech klatkach każdego kierunku (nasze liczenie) |
| Głowy | identyczne w klatkach jednego kierunku; krok A / stanie / krok B ciałek różne |
| Stopy | wszystkie 180 klatek ciałek: dolna krawędź y = 61 (także 09 i 18) |
| Alfa | wszędzie 0/255 |
| Maski | tylko 5 dozwolonych kolorów, nigdzie poza rysunkiem; skóra i włosy są |
| Złożenia | 3600 (20 × 20 × 3 kierunki × 3 klatki): 0 szpar między głową a szyją |
| Odłamki głowy 01 | usunięte w przodzie |

## Usterka do poprawy: resztki włosów i bród w ciałkach

Ciałka mają na ramionach i plecach cienkie, kropkowane obrysy włosów / bród **swojej** dawnej postaci. Przy własnej głowie są schowane pod włosami, ale z inną głową (łysy kowal, hełm strażnika) wiszą w powietrzu – patrz `41_postacie_v6/1_duchy_wlosow_z_lysa_glowa_i_helmem.png`.

1. **Odłączone resztki** (różowe w `2_odlaczone_resztki_na_rozowo.png`): najwięcej 01 warkocze (warkocze po obu stronach, wszystkie kierunki), 03 pilotka, 06 ogrodniczka, 08 kurierka (warkocz z boku i z tyłu), 14 podróżnik, 18 łuczniczka (kucyk), 17 rudobrody (broda w profilu); drobne kropki też w 04, 07, 09, 11, 13, 15, 20.
2. **Przyklejone do ciałka** (`3_przyklejone_resztki_bok_tyl.png`): 11 czarodziej w profilu – biały pasek brody i rondo kapelusza; 17 rudobrody w profilu – ruda broda na piersi; 04 profesor z tyłu – siwe włosy na górze pleców; 13, 19, 20 – kreski na górze ciałka w profilu/z tyłu.
3. W głowach: 01 z tyłu (2 px pod włosami), 08 bok/tył, 11 tył, 17 tył – małe odłączone kawałki pod głową.

Prośba: usunąć z ciałek wszystko, co należy do włosów, brody i nakrycia głowy (ciałko ma się kończyć kołnierzem/szyją), we wszystkich 9 klatkach; maski odpowiednio. Reszta paczki zostaje bez zmian.

# Zamówienie 22 — próba modułowych awatarów

Gotowe: głowy 01 i 02 oraz tułowie 01 i 04, każdy w 9 klatkach, z maską przebarwiania. To etap próbny z zamówienia, nie wszystkie 10 głów i 8 tułowi. Cztery połączenia są w podglądach; pozostałe części wymagają odbioru tej próby w grze.

## Pliki do importu

| Plik | Część |
|---|---|
| `glowy/glowa_01.png` | Krótkie rozczochrane włosy |
| `glowy/glowa_02.png` | Wysoki kucyk |
| `tulowie/tulow_01.png` | Koszula i kamizelka podróżnika |
| `tulowie/tulow_04.png` | Sukienka z warsztatowym fartuchem |

Do każdego pliku jest odpowiadający mu `_maska.png`. Obie głowy mieszczą włosy w warstwie głowy; nie potrzebują obecnie dodatkowego `_tyl.png`.

## Układ i punkty składania

Arkusz 192 × 192, 3 × 3 klatki po 64 × 64. Rzędy: dół, bok patrzący w lewo, góra. Kolumny: krok A, stoi, krok B. Dla chodu użyć sekwencji 0–1–2–1. Wszystkie części pobierać z tej samej klatki i składać bez osobnego centrowania.

Punkt szyi: [32, 39] dla dołu i góry, [31, 39] dla boku. Głowa kończy się na y=39. Tułów zaczyna się od skóry szyi na y=40; stopy są na y=62. Punkt zaczepienia całej postaci: [32, 62]. Nie ma podskoku głowy między kolumnami; ewentualne kołysanie dodać w kodzie do całej złożonej postaci.

Kolejność warstw: ewentualne przyszłe włosy-tył → tułów → głowa. Obecnie wystarczą dwie ostatnie warstwy. Broń i tarczę rysować osobno. Dotychczasowe gotowe postacie pozostawić bez zmian.

## Maski

| RGB maski | Znaczenie |
|---|---|
| [0, 0, 255] | Skóra: twarz, uszy, szyja, dłonie i odsłonięte nogi |
| [255, 255, 0] | Włosy głowy |
| [255, 0, 0] | Główne ubranie: koszula/spodnie lub sukienka |
| [0, 255, 0] | Drugi kolor: kamizelka lub fartuch i jego paski |
| Alfa 0 | Nie przebarwiać: kontur, oczy, usta, buty, pas, sakiewka, mosiądz |

Maski zawierają wyłącznie te czyste barwy i binarną alfę. Barwa maski jest etykietą materiału, nie kolorem wyświetlanym na postaci. Używać jasności piksela z kolorowego sprite’a i wybranego koloru gracza. Nie zastępować całego materiału jednym płaskim kolorem. `paleta_materialow.json` opisuje trzy tony użyte w każdej grupie oraz palety przykładowych przebarwień.

`podglad_przebarwienia_x3.png` jest wyłącznie demonstracją działania; gotowych wariantów kolorystycznych nie trzeba importować do gry. W podglądach potwierdzono, że przebarwianie pomija widoczne piksele bez maski i zachowuje przezroczystość.

## HUD

Wziąć głowę z klatki dół/stoi (kolumna 1 licząc od zera). Twarz jest samodzielnie czytelna. Bezpieczny wycinek obejmujący również kucyk to [12, 0, 40, 40] względem tej klatki; dopasować go do okna portretu. Wąski wycinek 36 × 36 może wymagać przesunięcia, aby nie przyciąć kucyka. Przebarwiać portret tą samą maską co głowę na mapie.

## Podglądy i kontrola

`podglad_zlozone_x3.png`: od lewej G01/T01, G01/T04, G02/T01, G02/T04. `podglad_wszystkie_klatki_x3.png` zawiera wszystkie cztery arkusze złożonych postaci. Folder `podglady/` zawiera kompletne złożone arkusze i GIF-y chodu dla trzech kierunków.

Wykonano kontrolę wszystkich 36 klatek części: punktów szyi, stóp, marginesów, masek, konturu i odmienności kroków. Rysunki oraz maski mają ostrą, binarną przezroczystość; używać nearest-neighbor. Testy nie zastępują sprawdzenia shader’a przebarwiania i animacji w działającej grze.

Źródłowe rysunki powstały w generatorze obrazów. Wyeksportowano je z wyrównaniem do szablonu, wspólnymi paletami i maskami materiałów; polecenia są w `PROMPTY.txt`. `sprawdz_paczke.py` wymaga Pillow i zapisuje `WERYFIKACJA.json`.

ID: 41-P001
Odpowiedź na: paczka „Exp_lore_20_postaci_osie_v5” (bez ID)
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 20.10.2026 przekazał paczkę: „zrób w menu 3 guziki: płeć, kolor skóry i losuj; zweryfikuj, czy się dobrze budują postacie”
Wykonanie: kreator w formularzu nowej postaci na serwerze testowym (tylko podgląd z przodu), produkcja bez zmian
Dotyczy: 20 głów + 20 ciałek, osie v5

# Postaci modułowe v5 – sprawdzenie i wdrożenie

| Co | Wynik |
|---|---|
| Wzór montażu z README (`dx = round(neck.x − mount.x)`, `dy = round(neck.y − mount.y)`) | zastosowany 1:1 w grze (`src/ui/modulPostac.ts`) |
| Wszystkie 400 połączeń, nasze własne liczenie | 0 przerw między brodą a szyją w kolumnach osi; oś oczu = oś szyi (≤ 0,5 px) |
| Ogląd na oko (zbliżenia ×6) | składają się czysto, także duże ciała (kowal, karczmarz) z małymi głowami |
| Maski ubrań (czerwony/zielony) | działają tak, jak opisano w README |
| W paczce nie było pliku PDF | sprawdzone README.md, manifest.json, kontrola_400_polaczen.json i podglądy |

## Uwagi do następnej wersji

1. **Głowa 01_warkocze** – 3 odłamki pikseli pod warkoczami (ok. x 15–21, y 44–46). Usuwamy je skryptem, ale lepiej w źródle.
2. **Puste maski głów** – właściciel chce wybierać kolor skóry i kolor włosów. Zrobiliśmy maski sami (po kolorze twarzy i od punktów na włosach), ale są przybliżone: przy ciemnych włosach (05, 07, 08) włosy mają prawie kolor obrysu, więc ich nie przebarwiamy. Prosimy o maski głów: **niebieski #0000FF = skóra, żółty #FFFF00 = włosy, zarost i brwi**, a w maskach ciałek dodatkowo **niebieski = skóra** (dłonie, szyja, dekolt).
3. **Ciałka 09 (stopy y 56) i 18 (y 59)** są niższe niż reszta (y 61). Ustawiamy wszystkie stopy na jednym rzędzie, więc postać z ciałkiem 09 jest o 5 px niższa – jeśli to niezamierzone, prosimy wyrównać.
4. **Ciałka nie mają płci w manifeście** – przyjęliśmy płeć postaci, dla której ciałko narysowano (np. 05 kucharka = kobieta). Jeśli jakieś ciałko ma być dla obu płci, prosimy dopisać `plec` w manifeście.
5. **Tylko przód i bezruch** – żeby to był bohater chodzący po mapie, potrzebne są te same części z boku (patrzące w lewo) i z tyłu, w 3 klatkach (krok A / stoi / krok B), z tymi samymi punktami `mount` i `neck` w każdej klatce. Do tego czasu gra używa w świecie dotychczasowych 25 bohaterów.

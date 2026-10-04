# Makieta `zywy-swiat.html` – co gdzie jest

Jeden plik HTML, czysty JavaScript (bez bibliotek), wszystko rysowane piksel po pikselu na `<canvas>` 256×176 (1 px canvasu = 1 px pliku grafika = 0,5 px mapy gry). Świat 384×256. Otwórz w przeglądarce, sterowanie strzałkami/WASD, E/spacja = ścinanie/potrząsanie.

| Funkcja / miejsce | Co robi | Odpowiednik w SPEC |
|---|---|---|
| `windAt`, `gustAt`, `PULSE` | wiatr: dwie sinusoidy + fala podmuchu sunąca w prawo | 3.6, `dane/wiatr.json` |
| `bay(x, y)` | macierz Bayera 4×4 (dithering krawędzi prześwitu, chmur, granic) | 3.2 |
| `noise` | szum wartości 64×64 (chmury, tekstura ziemi) | 3.5 |
| `placeTrees` | rozmieszczenie: rzut z odrzuceniem (Poisson), skraj lasu, gatunki zależne od x (iglasty po lewej, liściasty po prawej), sad w rzędach, pomnik przyrody, `chop` przez hash | 3.1 |
| `buildCrown` | **zaślepka korony:** kępy kół (dąb/brzoza/sosna/jabłoń/krzak) albo piętra (świerk), 4 odcienie wg światła z lewej-góry, ciemna linia pod kępami, obrys z selektywnym jaśniejszym brzegiem od światła, plamki liści, jabłka; `rf` = wysokość w koronie | Z2 (zaślepki do czasu grafik) |
| `rebuildCanopy` | mapa „tu jest korona” (do testu prześwitu) | – |
| `bake` | malowanie świata: ziemia (szum + paleta), droga, staw, cienie drzew (elipsy), pnie z zaciosem / pieniek / tabliczka pomnika, budynki, jasne/ciemne wersje do podmuchu i chmur | kawałek mapy |
| `bakeBuildings` | **dach kopertowy z obrysu** (prostokąt): najbliższa krawędź → połać, jasność z normalnej, rzędy dachówek z `d`, naroża, kalenica, obrys; ściana pod dachem kolumnami z oknami (część zapalona), cokół, cień pod okapem; cień rzucany; tryb „jak dziś” = obracana tekstura w blokach 4 px; `snapA` = przyciąganie kątów | 5 (uogólnienie: `dachy_roofs.py`) |
| `genTufts` | kępki trawy, wysoka trawa na łące, trzciny z pałką, paprocie w lesie, każdy piksel z wysokością `j` nad podstawą | 3.4 |
| `drawTufts(front)` | źdźbła przesunięte o `round(wiatr × j × 0,3)` + odchylenie od postaci; te przed postacią rysowane po niej (brodzenie) | 3.4 |
| `drawSpriteList(t, hole)` | korona: każdy piksel przesunięty o `round(w × (0,3 + 0,95·rf))` + szelest; prześwit z Bayerem | 3.2 |
| `render` | kolejność: ziemia (+ chmury, podmuch, iskry na wodzie) → trawa za postacią → [budynki, krzaki, sadzonki, korony drzew za postacią, postać] posortowane po y → trawa przed postacią → korony przed postacią z prześwitem → liście/wióry → pasek ścinania, „+3” | 3.2–3.5 |
| `tryChop`, `chopping`, `chips`, `spawnLeaves`, `pops` | ścinanie 4 uderzeniami z paskiem postępu, wióry i liście, pieniek → sadzonka → drzewo; jabłoń: potrząśnięcie, 3 jabłka spadają, „+3”; chronione: komunikat z powodem | 4 |
| `update` | ruch postaci z kolizjami, autopilot, wykrywanie „pod koroną” tylko dla drzew na południe od postaci, odrastanie | – |

Uwaga: w grze wariant A zastępuje przesuwanie pojedynczych pikseli co klatkę (makieta robi to na CPU dla całego widoku) gotowymi klatkami ścięcia (`shadery/klatkiWiatru.ts`). Efekt ten sam, koszt dużo mniejszy.

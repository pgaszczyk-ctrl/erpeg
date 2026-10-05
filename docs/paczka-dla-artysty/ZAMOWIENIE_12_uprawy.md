# Zamówienie 12 – rośliny na polach (atlas upraw)

Pola w grze rysuje program: dzieli pole na pasy, sadzi rośliny w rzędach, robi miedze z trawą, ziemię, ściernisko, łan zboża i pory roku (`9_uprawy/pola_pazdziernik_z_generatora.png`, zbliżenia w tym samym folderze). **Same rośliny** program rysuje dziś zbyt prosto. Prosimy Cię o atlas roślin – program będzie je sadził w rzędach zamiast swoich.

## Jak rysować (poprawka 5.10 po pierwszej próbie)
Pierwsza próba (marchew, dynia) jest ładna, ale to **ilustracja**, a ma być **pixel art**, tylko trochę bardziej artystyczny niż generator. Po zmniejszeniu do gry pierzasta nać zlała się w plamę (`9_uprawy/test_proby_po_wyrownaniu_x3.png`, z lewej dynia i marchew z próby po wyrównaniu, na polu z generatora).
- **Pixel art jak pierwsza lokomotywa i nasze drzewa:** rysuj na siatce – **1 piksel gry = kwadrat 4×4 px** w Twoim dużym rysunku. Wyraźne „piksele”, 3–5 odcieni na kolor, twarde krawędzie, ciemny obrys, **bez gradientów, bez miękkiego malowania i bez fotograficznych detali**.
- Może być trochę bardziej artystycznie niż generator: ładniejszy kształt liści, połysk na dyni, kilka jaśniejszych pikseli światła – ale każdy szczegół co najmniej 1 piksel gry (4×4 px u Ciebie).
- **Uproszczone kształty:** nać marchwi = 4–6 grubszych „piór” z 2–3 ząbkami, nie dziesiątki listków; liść dyni = 3–5 klapek. Musi być czytelne przy 12–22 px.
- **Widok z góry z ukosa, jak drzewa w grze** – widać wierzch rośliny (liście rozłożone dookoła łodygi), a nie czysty profil z boku.
- **Kolory z `8_wyrownanie/paleta_swiata.png`** (są w niej zielenie liści, pomarańcz marchwi i dyni, brązy ziemi).
- Tło całkowicie przezroczyste (bez szarego podłoża i cieni). Podstawa rośliny na środku dolnej krawędzi, wspólna dla wszystkich faz.
- Światło z lewej-góry. Rośliny stoją prosto (wiatr robi program). Bez ziemi pod rośliną (poza dołkiem „po zbiorze”).
- Po Twojej dostawie i tak przepuszczamy wszystko przez `8_wyrownanie/wyrownaj.py` (zmniejszenie, paleta, obrys) – ale rysunek ma już wyglądać jak pixel art, wtedy nic się nie zgubi.

Tekst od właściciela: „Próba jest śliczna, ale wyszła ilustracja. Potrzebuję pixel artu, tylko trochę bardziej artystycznego: rysuj na siatce 4×4 px (jeden piksel gry), 3–5 odcieni na kolor, twarde krawędzie i obrys, bez gradientów. Kształty prostsze (nać marchwi z kilku grubych piór), widok z góry z ukosa jak drzewa w grze, kolory z palety świata, przezroczyste tło. Najpierw znowu marchew i dynia.”

## Lista (docelowy rozmiar po zmniejszeniu, w nawiasie)
Dla każdej uprawy: **młoda** (1 wariant), **dorosła** (3 warianty, lekko różne), **dojrzała do zebrania** (2 warianty – plon wyraźnie widoczny, np. pomarańczowa główka marchwi wystająca z ziemi, kopczyk ziemniaków przy krzaku, dorodna dynia), **po zbiorze** (1: dołek/resztki liści).

| Plik (prefiks) | Uprawa | Rozmiar docelowy | Uwagi |
|---|---|---|---|
| `uprawa_marchewka_*` | marchew | 12×14 | pierzasta nać, dojrzała: pomarańczowa główka |
| `uprawa_kapusta_*` | kapusta | 18×16 | sinozielone liście okrywowe, jasna główka |
| `uprawa_brokul_*` | brokuł | 16×16 | liście + zbita ciemnozielona różyczka |
| `uprawa_salata_*` | sałata | 14×12 | jasnozielona, falbaniasta |
| `uprawa_ziemniak_*` | ziemniak | 16×14 | krzak; wariant kwitnący (białe/fioletowe kwiatki) |
| `uprawa_burak_*` | burak | 14×14 | liście z czerwonymi ogonkami, czerwona główka |
| `uprawa_dynia_*` | dynia | 22×16 | duże klapowane liście, wąsy; owoc z bruzdami |
| `uprawa_kukurydza_*` | kukurydza | 12×32 | łodyga, liście, wiecha, kolba; wariant suchy (październik) |
| `uprawa_slonecznik_*` | słonecznik | 12×34 | żółta tarcza / brązowa dojrzała |
| `uprawa_chmiel_*` | chmiel | 10×44 | pnącze na sznurku, szyszki (sierpień) |

Nazwy: `uprawa_<nazwa>_mloda.png`, `_dorosla_1..3.png`, `_dojrzala_1..2.png`, `_po_zbiorze.png`.

## Ikony do plecaka (16×16, jak dotychczasowe ikony przedmiotów)
`ziemniak.png`, `kapusta.png`, `burak.png`, `dynia.png` – w tym samym stylu co `marchewka`, `brokul`, `salata`.

## Kolejność
1. Próbka: marchew i dynia, wszystkie fazy – do akceptacji.
2. Reszta warzyw (kapusta, brokuł, sałata, ziemniak, burak).
3. Wysokie: kukurydza, słonecznik, chmiel.
4. Ikony.

# Zamówienie 12 – rośliny na polach (atlas upraw)

Pola w grze rysuje program: dzieli pole na pasy, sadzi rośliny w rzędach, robi miedze z trawą, ziemię, ściernisko, łan zboża i pory roku (`9_uprawy/pola_pazdziernik_z_generatora.png`, zbliżenia w tym samym folderze). **Same rośliny** program rysuje dziś zbyt prosto. Prosimy Cię o atlas roślin – program będzie je sadził w rzędach zamiast swoich.

## Jak rysować (tak jak pierwsza próbka lokomotywy)
- W swoim stylu, **duże: ok. 4× docelowego rozmiaru**, każda roślina w osobnym PNG z przezroczystym tłem, podstawa (miejsce, gdzie roślina wychodzi z ziemi) na środku dolnej krawędzi.
- Widok jak drzewa i krzaki w grze: z góry, lekko z ukosa. Światło z lewej-góry. Bez cienia na ziemi (robi go program), bez ziemi pod rośliną, bez tła.
- Nie zmniejszaj, nie zmieniaj palety, nie dodawaj obrysu gry – to robimy my (`8_wyrownanie/wyrownaj.py`).
- Rośliny stoją prosto; wiatr dodaje program.
- **Żadnych uproszczeń typu kulka/emotka**: dynia ma bruzdy, ogonek i liście; kapusta liście okrywowe i żyłki; marchew pierzastą nać.

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

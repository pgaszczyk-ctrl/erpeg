# Prompt dla czatu 🛠 Technika i rozwój (do wklejenia)

```
Zaczynamy overhaul grafiki świata: świat rysuje program, w telefonie, w stylu szczegółowego pixel artu.
Pobierz najnowszą gałąź claude/bold-gauss-peehzd i przeczytaj po kolei:
1. docs/paczka-dla-programisty/CZYTAJ_MNIE.md
2. docs/paczka-dla-programisty/GENERATOR_SWIATA.md – zacznij od punktu 0 (ostatnie decyzje), potem zadania G1–G11
3. docs/paczka-dla-programisty/SPEC_09_zywy_swiat.md – wiatr, przeświecanie koron, ścinanie z paskiem postępu, owoce (punkt 4), postacie (4a), steampunk (6), kolej (7)
4. docs/paczka-dla-programisty/POMIARY.md – czasy na telefonie

Najważniejsze decyzje właściciela (4.10.2026):
- Ziemia, drzewa, krzaki, trawa, budynki, rurociągi, para i tory pochodzą z generatora w docs/paczka-dla-programisty/generator/ (TypeScript, bez Phasera i DOM-u, przechodzi tsc --strict). Skopiuj go do src/gen/. Żadnych dużych arkuszy do ręcznego przeglądania: wszystko generuje się samo i deterministycznie; poprawiamy tylko konkretne miejsca zgłoszone jako błąd.
- Drzewa w skali 0,6 (SKALA_DRZEW) i gęściej (dane/gatunki_osm.json). Korony to sprite'y z atlasu z 5 klatkami wiatru, pnie w kawałku mapy.
- Budynki z OSM obracane do 8 kątów (przyciagnij() w generator/budynki.ts), liczone raz w scripts/build-map.mjs (i dla map świata), z kontrolą kolizji z drogami i sąsiadami – gdy koliduje, zmniejsz o 1–2 px, a w ostateczności zostaw bez obrotu. Dach i ściany liczy generator (budynek()), WALL_SKEW zostaje.
- Rurociągi tylko wzdłuż dróg: równolegle, w stałym odsunięciu za chodnikiem, tym samym łukiem co droga; na końcach wchodzą do budynku albo pod ziemię do studzienki (trasaPrzyDrodze + rurociagWzdluz w generator/steampunk.ts, GENERATOR_SWIATA punkt 0.6). Żadnych zygzaków po trawie.
- Góry (GORY.md, zadanie G10): ten sam generator na prawdziwych wysokościach, szersze ścieżki szlaku dopasowane do ludzika, na stromym stoku rozmycie tego, co leży niżej od bohatera (filtr/shader), bez oddalania kamery; po skałach i urwiskach tylko szlakiem.
- Pola (POLA.md, G11): zamiast grządek 3×4 całe pola w pasach jednej uprawy (generator/pola.ts), wygląd wg miesiąca, część warzyw dojrzała do zebrania jak drzewa z zaciosem.
- Kolej: rozróżnij stacje kolejowe (railway=station/halt) od dworców autobusowych (amenity=bus_station). Przy dworcach autobusowych zostają wozy konne i woźnica. Przy stacjach kolejowych zamiast koni stoi parowy skład na torze przy peronie: lokomotywa i tender (16 kierunków), wagony (8 kierunków), każdy pojazd ustawiony osobno wzdłuż toru wg stycznej (SPEC 7); konduktor zamiast woźnicy. Do czasu arkuszy od grafika – zaślepki rysowane programem.
- Woda i brzegi jak w makiecie: przy każdym zbiorniku brzeg z szuwarów albo plaża (przy bruku/chodniku kamienne nabrzeże), głębokość stopniowana od brzegu (malujWode w generator/woda.ts). Trawa żywsza (posiejRuno), chodnik z nierównych płyt (podloze.ts). Wzór: zrzuty/generator_laka_staw_tor.png i generator_chodnik_trawa.png.
- Malowanie kawałków mapy w Web Workerze (średni telefon ok. 1,25 s na kawałek, ok. 1,9 s z wodą – w tle, bez przycięć).
- Postacie zostają z arkuszy grafika (maniera „blondynki”, SPEC 4a); mojego ludzika z makiety nie używaj.

Zasady jak zawsze: wszystko za przełącznikiem ?wyglad=09, najpierw serwer testowy, po każdym zadaniu npm run build + zrzut w widoku telefonu (Playwright) i krótka notka dla mnie po polsku, bez żargonu. Na produkcję tylko na moje polecenie. Zacznij od G1 (skopiowanie generatora + test deterministyczności), potem G8 (budynki do 8 kątów w build-map) i G2 (podłoże z generatora), pokaż mi zrzuty przed i po. Na koniec każdego kroku zaktualizuj CLAUDE.md.
```

## Wycena (z dokumentów)

G1–G9: ok. 3,3 mln tokenów łącznie. Najpierw G1 + G8 + G2 (ok. 0,8 mln) i ocena zrzutów, potem reszta.

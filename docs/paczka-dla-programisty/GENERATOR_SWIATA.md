# Generator świata – świat rysowany w telefonie, bez grafika

> **Decyzja właściciela (4 października 2026):** ziemię, drzewa, krzaki, runo, budynki, rurociągi, parę i tory **rysuje program w telefonie**, tak jak w makiecie. Grafik zostaje tylko do rzeczy „z charakterem”: postacie (są już arkusze w manierze blondynki), pojazdy (lokomotywa, wagony, wóz), zabytki, szyldy, ikony przedmiotów. Zamówienie 10 dla grafika (klocki świata) jest wstrzymane.
> Ten dokument uzupełnia `SPEC_09_zywy_swiat.md`: tam jest **jak to pokazać i animować** (warstwy, wiatr, prześwit, ścinanie), tu **skąd brać obrazki**.

## 0. Ostatnie decyzje właściciela (4.10.2026, wieczór) – mają pierwszeństwo

1. **Wszystko się generuje, bez dużych arkuszy do ręcznego przeglądania.** Gra obejmie cały świat, więc nikt nie będzie oglądał mapy kawałek po kawałku. Poprawiamy tylko konkretne miejsca, gdy ktoś zgłosi błąd. Generator jest deterministyczny: ten sam gatunek, wariant i miejsce wyglądają tak samo na każdym telefonie.
2. **Drzewa w skali 0,6** rozmiarów bazowych z `GATUNKI` (`SKALA_DRZEW` w `generator/drzewa.ts`, domyślna wartość `drzewo()`) i **gęściej**: odstępy w `dane/gatunki_osm.json` ×0,55, gęstość ×1,4. Powód: przy pełnej skali budynki wyglądały na za małe (`zrzuty/budynki_drzewa_porownanie.png`, wariant B).
3. **Budynki obracane do 8 kątów** (0°, 26,6°, 45°, 63,4°, 90°, 116,6°, 135°, 153,4° – krawędzie pod tymi kątami dają równe schodki pikseli), kształt z OSM zostaje (wariant C na porównaniu). Funkcja `przyciagnij(pierscien)` w `generator/budynki.ts`. **Liczyć raz w `scripts/build-map.mjs`** (i w kafelkach świata `world.ts`), nie w telefonie:
   - obrót wokół środka budynku do najbliższego kąta (największa zmiana ok. 11°),
   - po obrocie sprawdzić, czy obrys nie wchodzi na drogę (wycięte drogi z clipper-lib) ani na sąsiedni budynek; jeśli tak, spróbować zmniejszyć budynek o 1–2 px na krawędź, a gdy dalej koliduje, zostawić go bez obrotu,
   - kolizje (`CityMap.buildingAt`), drzwi (`entranceOf`) i odkrywanie przez mgłę liczą się już na obróconym obrysie, więc wszystko zostaje spójne,
   - zapisane pozycje graczy się nie zmieniają (budynki przesuwają się najwyżej o kilka metrów); `unstickHero` i tak wyciąga postać ze ściany.
4. **Kolej:** na stacjach kolejowych parowe lokomotywy i wagony na torach (zamiast koni), przy dworcach autobusowych zostają wozy konne. Szczegóły: `SPEC_09_zywy_swiat.md` punkt 7.
5. **Woda, brzegi, trawa i chodnik jak w makiecie, nie biedniej** (uwaga właściciela po porównaniu z makietą):
   - **każdy zbiornik wodny ma brzeg**: szuwary (błoto, bujna ciemna trawa, trzciny na lądzie i w płyciźnie, lilie wodne) **albo plaża** (mokry i suchy piasek, wchodzący ditherem w trawę). Wybór: piasek w OSM → plaża; mokradło, zarośla, las, łąka → zwykle szuwary; trawa i park → odcinkami na zmianę (duży szum, więc jeden staw ma i plażę, i szuwary); bruk, chodnik, plac, droga → kamienne nabrzeże;
   - **głębokość stopniowana** od linii brzegu: piana → płycizna (jasna nad piaskiem, mętna zielona przy szuwarach) → płytko → średnio → głębia, granice pasów postrzępione, zmarszczki i błyski, ciemny uskok brzegu od północy;
   - **trawa żywsza**: duże jaśniejsze i ciemniejsze plamy, błyski, dużo gęstszych kępek, plamy wysokiej trawy, kwiatki (`posiejRuno`);
   - **chodnik nierówny**: płyty różnej szerokości i odcienia, przesunięte rzędy, krzywe fugi, pęknięcia, zapadnięte płyty, wyszczerbione rogi, mech i trawa w fugach.
   Kod: `generator/woda.ts` (`malujWode`), `posiejRuno` w `runo.ts`, `chodnik` i trawa w `podloze.ts`. Wzór: `zrzuty/generator_laka_staw_tor.png`, `zrzuty/generator_chodnik_trawa.png`.

6. **Rurociągi tylko wzdłuż dróg, bez zygzaków po trawie.** Rura biegnie **równolegle do drogi, w stałym odsunięciu** (połowa jezdni + chodnik + 6–8 px trawy, po jednej stronie), **tym samym łukiem co droga**, z zaokrąglonymi zakrętami. Na każdym końcu **wchodzi do budynku** (skręt łukiem do najbliższej ściany w zasięgu ok. 80 px mapy, rura rysowana przed budynkiem, więc ściana ją przykrywa) **albo pod ziemię** (kołnierz i żeliwna studzienka, z której czasem idzie para). Nigdy nie przecina jezdni ani budynku po drodze; gdy na trasie jest skrzyżowanie lub wjazd – rura kończy się studzienką przed nim i może wyjść drugą studzienką za nim. Długość odcinka 60–200 px mapy, 0–2 odcinki na ulicę (ziarno z id drogi OSM, więc wszędzie tak samo). Kod: `trasaPrzyDrodze()` + `rurociagWzdluz()` w `generator/steampunk.ts` (stare `rurociag()` po siatce zostaje tylko do rur na ścianach). Wzór: `zrzuty/generator_rurociag.png`.
7. **Góry** (makieta zaakceptowana): generator na prawdziwych wysokościach, szersze ścieżki szlaku (dopasowane do ludzika), na stromym stoku rozmycie tego, co leży niżej od bohatera; bez oddalania i bez zmiany perspektywy. Po skałach, urwiskach i bardzo stromo tylko szlakiem. Szczegóły i zadanie G10: `GORY.md`.
8. **Pola** (5.10): całe pola obsiane w pasach (szachownica jak na Lubelszczyźnie), uprawa z tagu OSM `crop` albo z wag, wygląd wg miesiąca, miedze, ok. 3,5 % warzyw dojrzałych do zebrania (jak drzewa z zaciosem). Szczegóły i zadanie G11: `POLA.md`.
9. **Zabytki** (5.10): duże charakterystyczne budowle nie jako bloki – grafik maluje je na szkielecie z OSM (obrys, części, wysokości w rzucie gry), gra stawia obrazek dokładnie na obrysie. Szczegóły i zadanie G12: `ZABYTKI.md`.
10. **Steampunk na zwykłych budynkach wg miasta i wielkości** (5.10): `poziomSteampunku(wielkośćMiasta, pole m², ziarno)` w `generator/budynki.ts` → opcja `steampunk` 0–3 w `budynek()`:
   - duże miasto (place=city lub > 100 tys.; mapa Lublina): 3/4 dużych budynków (≥ 600 m²) poziom 3, 1/3 średnich (150–600 m²) poziom 2, 1/5 małych poziom 1;
   - średnie miasto (town / 10–100 tys.): połowa dużych (2–3), 1/4 średnich (2), 15 % małych (1);
   - wieś: 1/5 wszystkich (małe 1, większe 2);
   - **katalog 19 ozdób** (`OZDOBY_STEAMPUNK`, `zrzuty/steampunk_katalog_ozdob.png`): na ścianach – manometr, zawór z kołem, lampa gazowa, rurki poziome, rura spod ziemi (właz + kolano do ściany, czasem para), kratka z parą, zębatka, zegar, zbiornik przy ścianie, poczta pneumatyczna; na dachu – kocioł z manometrem i wylotem pary, wentylator, świetlik z zębatą ramą, luneta na trójnogu, kopuła obserwatorium, zbiornik wody na nóżkach, antena Tesli z iskrami, żelazny komin, anemometr; do tego rury po ścianach wystające kolanem nad dach i okna-bulaje;
   - losowanie zestawu wg poziomu: 1 → 1–2 drobne; 2 → 2–3 średnie + 1–2 drobne; 3 → 2–3 duże + 2–3 średnie + 2–3 drobne (każdy budynek inny, deterministycznie z ziarna); `ozdoby: [...]` wymusza konkretne (miejsca specjalne, podgląd).
   `budynek()` zwraca `para: [x, y, rozmiar][]` – gra stawia tam animowane obłoczki `para()` (pióropusz z 2–3 obłoczków). Wielkość miasta: Lublin = duże, mapy miast z planu stacji wg `place`/`population` z OSM, mapy świata wg najbliższego miejsca z warstwy `places` Protomaps (city/town/village). Wzór: `zrzuty/budynki_steampunk_porownanie.png`, demo `generator/demo/steampunk_budynki_demo.ts`.
11. **Para pryska krótko i rzadko** (5.10, było za dużo): `budynek()` zwraca źródła `ZrodloPary`; działa tylko ok. 40 % wylotów (na poziomie 3 ok. 55 %), każdy co 5–14 s wyrzuca jeden obłoczek na 0,8–1,6 s – `klatkaPary(źródło, czas)` mówi, którą klatkę `para()` pokazać albo że nic (−1). Gra trzyma pulę kilkunastu sprite'ów pary tylko dla źródeł w widoku.
12. **Ruchome cienie chmur** (jak w makiecie): `teksturaChmur(zachmurzenie, ziarno)` w `generator/cienieChmur.ts` – tekstura 512×512 bez szwów, dwa stopnie chłodnego cienia z ditheringiem. W grze `TileSprite` nad mapą, postaciami i drzewami (pod mgłą wojny i HUD), mieszanie MULTIPLY, przesuwany co klatkę z wiatrem z pogody (kierunek + siła, ok. 2–12 px/s), zachmurzenie z pogody (`k`/100), nocą wyłączone. Teksturę generować przy zmianie pogody (≈ 0,1 s). Wzór ruchu pary i chmur: `zrzuty/para_i_cienie_chmur.gif`, demo `generator/demo/para_chmury_demo.ts`.
13. **Wysokość ścian wg pięter z OSM (decyzja właściciela 5.10, zastępuje „max 3 piętra”)**: `wysokosc = 8 + 4 × (piętra − 1)` px obrazu (4 + 2 × (piętra − 1) px mapy) **do 8 pięter** (36 px); wyżej +2 px na piętro, najwyżej 52 px (16 pięter). Brak `building:levels` → jak dziś (domyślne piętra wg rodzaju/pola). Makieta: `zrzuty/wysokosci_budynkow_porownanie.png`, demo `generator/demo/wysokosci_demo.ts`; generator rysuje tyle rzędów okien, ile mieści ściana.
   - **Prześwit przy wysokich budynkach (jak przy koronach drzew):** budynki o ścianach ≥ 24 px (od 5 pięter) nie są malowane w kawałek mapy, tylko jako osobny obiekt sortowany po linii podstawy południowej ściany (`depth = y podstawy`). Gdy bohater (albo wróg, postać) stoi za takim budynkiem i obiekt go zasłania, budynek dostaje maskę prześwitu – koło ok. 28 px wokół postaci, krycie 40 %, krawędź z ditheringiem – ta sama maska co dla koron (`shadery/maskaPrzeswitu.ts`). Niższe budynki zostają w kawałku mapy jak dziś.
   - `WYSOKOSCI_SCIAN` w MapRenderer zamienić na funkcję z liczby pięter (pokrętło admina `max_pieter` 8).
   - **Prześwit – poprawka 6.10 (właściciel: małe koło, przez które widać samą głowę, wygląda dziwnie; większy obszar – tak):** zamiast koła 28 px duże wycięcie: elipsa ok. 145×116 px obrazu (promień 58, poziomo ×1,25) wokół postaci, brzeg 10–14 px z ditheringiem; w środku budynek prawie znika (alfa ~10 %), a **kontur budynku zostaje** (alfa ~70 %), żeby było widać, gdzie stoi ściana. Warianty porównane w `zrzuty/przeswity_warianty.png` (A brak, B małe koło, C duża elipsa półprzezroczysta, E duże wycięcie z konturem – wybrany, D cały budynek przygaszony); demo `generator/demo/wiezowce/demo.ts` (tryby 0–4). **Właściciel wybrał wariant E (6.10).** Gotowa funkcja: `generator/przeswit.ts` – `przeswitWyciecie(obraz, x0, y0, stopyX, stopyY)` i pokrętła `PRZESWIT` (promień 58, rozciągnięcie 1,25, brzeg 10, alfa wnętrza ~10 %, konturu ~70 %). Wcześniejszy opis „koło ok. 28 px” poniżej/powyżej jest nieaktualny.
   - **Płaskie dachy:** ściana ≥ 24 px (≈ od 5 pięter) → dach płaski (`plaski` w `budynek()`, domyślnie `H >= 24`; 4 rodzaje w `DACHY_PLASKIE`: żwir, papa, zielony dach, blacha, z attyką i świetlikami). Spadzisty dach na wieżowcu wyglądał jak piramida.
   - **Wieże i maszty (np. wieża telewizyjna, Pałac Kultury):** ponad 200 m albo `man_made=tower` – nie jako budynek, tylko jako zabytek od grafika na szkielecie z OSM (`ZABYTKI.md`).
   - OSM często ma ten sam obrys kilka razy (budynek + `building:part`) – rysować jeden (najwyższy), części z `min_height` pomijać.
   - Makieta centrum dużego miasta (Berlin Alexanderplatz zamiast Warszawy – w próbkach mapy nie ma Warszawy): `zrzuty/wiezowce_centrum_porownanie.png`, demo `generator/demo/wiezowce/`.
13a. **Poziomy gry zamiast pięter (decyzja właściciela 6.10 – ZASTĘPUJE regułę „do 8 pięter po 4 px” z punktu 13)**: dużo pięter i drobnych okienek gryzło się z dużym ludzikiem; blok z wielkiej płyty ma wyglądać jak dwupoziomowa karczma, nie pomniejszony moloch. `ksztaltBudynku(pietraOSM, m²)` w `budynki.ts`: **1–3 piętra = 1 poziom, 4–14 = 2, 15+ = 3**; wysokość poziomu rośnie łagodnie z wielkością: 100 m² → 16 px, 400 → 20, 1600+ → 24 (ściana = poziomy × poziom, np. blok 11 pięter 700 m² = 2 × 22 = 44 px, prawie wzrost bohaterki 48 px). `budynek(…, { wysokosc, poziom })` rysuje na każdym poziomie jeden rząd **dużych okien** (ok. 0,4 × 0,55 poziomu, rama, szprosy, parapet, nadproże; w nocy część świeci), gzyms między poziomami, kamienny cokół, **łukowe drzwi z desek** na parterze (okna obok drzwi znikają), na części tynkowanych ścian **mur pruski** (belki, zastrzały – karczma), na małych domach **okiennice**; bulaje na wyższych poziomach steampunku; dach płaski tylko przy 3 poziomach. Bez `poziom` zostaje stary układ (do porównań). Prześwit (wariant E) dla budynków od 2 poziomów. Makiety: `zrzuty/ulica_poziomy.png` (dziś / nowe / bohaterka za blokiem / noc), `zrzuty/lublin_osiedle_poziomy.png` (osiedle na Czubach), demo `generator/demo/poziomy/`.
14. **Szyldy na słupach (poprawka 6.10, właściciel: szyld wiszący na ścianie „nie wiadomo co to jest”; musi mieć nogę od ziemi i stać przy rogu budynku)**: zamiast złotej poświaty – żeliwny słup tuż obok drzwi (poprawka 6.10; wcześniej: przy narożniku) (na zewnątrz obrysu, nie na jezdni), dwa rodzaje: tablica na szczycie słupa albo ramię z tablicą na łańcuszkach (ta może się lekko kołysać ±5°); mała lampka na słupie – nocą ciepła plama światła na chodniku (ADD), szyld oświetlony od góry; cień słupa na ziemi w prawo-dół. Słup i tablice rysuje grafik (`ZAMOWIENIE_15`, pliki `szyld_slup_*`, `szyld_tablica_<rodzaj>`), wyrównanie skryptem. Makieta: `zrzuty/szyldy_na_slupkach.png` (stara propozycja wspornika na ścianie: `szyldy_porownanie.png` – odrzucona).
15. **Ozdoby steampunkowe od grafika (6.10)**: 19 ozdób z `OZDOBY_STEAMPUNK` (+ bulaj, kolanko, skrzynka poczty) rysuje grafik (`paczka-dla-artysty/ZAMOWIENIE_15_ozdoby_steampunk.md`), po `wyrownaj.py` trafiają do atlasu `public/swiat/ozdoby/`; `budynki.ts` zamiast rysować je pikselami nakłada sprite'y w tych samych punktach (`wpt`/`naDachu`: podstawa sprite'u w punkcie, dla grupy A dolna krawędź na wysokości z kodu); rury poziome i poczta z kafelków powtarzalnych; klatki (wentylator, anemometr, antena, lampa) animuje gra. Wyrównanie klatek: `paczka-dla-artysty/8_wyrownanie/wyrownaj_klatki.py wejscie wyjscie SZER WYS [KLATKI]` (wspólna skala klatek, paleta, głosowanie zamiast rozmycia). Po przejściu na poziomy gry (13a) ozdoby grup A/B są 1,5× większe niż w pierwszym zamówieniu (manometr 12×15, kocioł 26×17, wentylator 16×16); tablice szyldów 22×20 na słupach 54 px (28×25 było za duże względem słupa), każdy rodzaj z własnym kolorem tła. **Osadzenie ozdób na dachu (uwaga właściciela 6.10: „wyglądają jak naklejone”)**: cień rzucony (sylwetka przesunięta o 4,3 px, alfa ~45 %), miękkie przyciemnienie dachu pod podstawą (elipsa ~1,2× szerokości, mnożenie 60–80 %), lekki przechył ±4–6° (obrót pikselowy: ×4 najbliższy sąsiad → obrót → ×1/4), losowany z ziarna; ozdoby ścienne tylko cień 1,1 px. **Słup szyldu stoi tuż obok drzwi** (1–3 m od krawędzi drzwi, na ziemi przed ścianą, tablica nie zasłania drzwi, ramię skierowane od drzwi), zamiast przy narożniku – inaczej nie wiadomo, gdzie wejść. Skrypt makiety: `generator/demo/szyldy/ozdoby_w_swiecie.py`, obrazy `paczka-dla-artysty/12_ozdoby/probka1/probka15_poprawki.png`, `probka15_zblizenia.png`. Próbka 1 w świecie: `paczka-dla-artysty/12_ozdoby/probka1/`. Do czasu dostawy zostaje dzisiejsze rysowanie.

## 1. Co jest w folderze `generator/`

Gotowy kod TypeScript, bez Phasera i bez DOM-u (działa też w Web Workerze), do skopiowania jako `src/gen/`:

| Plik | Co daje | Najważniejsze funkcje |
|---|---|---|
| `wspolne.ts` | piksele (`Obraz` = `{w, h, px: Uint32Array}`), kolory, hash, szum we współrzędnych świata, Bayer, obrys | `nowy`, `hex`, `ciemniej`, `jasniej`, `hash`, `rng`, `szum`, `bayer`, `naloz`, `obrysuj`, `doImageData`, `doCanvas` |
| `drzewa.ts` | **16 rodzajów drzew i krzaków** (dąb, buk, lipa, brzoza, olcha, wierzba, jabłoń, grusza, śliwa, sosna, świerk, jodła, kosodrzewina, jałowiec, krzak, krzak kwitnący), każdy w dowolnej liczbie wariantów (ziarno). Korona, pień, pień z zaciosem, pieniek, sadzonka, warstwa owoców, punkt stania, 5 klatek wiatru | `GATUNKI`, `drzewo(gatunek, ziarno)`, `klatkiWiatru(korona, góra, dół, sztywność)` |
| `podloze.ts` | 19 rodzajów podłoża liczonych per piksel we współrzędnych świata (bez szwów między kawałkami): trawa, łąka, park, las liściasty/iglasty, bruk, chodnik, plac, droga, piasek, woda, pole (orka/zboże), zarośla, parking, cmentarz, mokradło, skała, tory. Postrzępione granice bez pasków od grafika | `kolorPodloza(rodzaj, x, y)`, `malujPodloze(obraz, x0, y0, rodzajW, cień?)`, `obwodka(...)` |
| `woda.ts` | **woda ze stopniowaną głębią i brzegi** przy każdym zbiorniku: szuwary albo plaża, przy utwardzonym – nabrzeże; odległość od brzegu liczona w oknie z marginesem 32 px, więc bez szwów między kawałkami; zwraca miejsca trzcin | `malujWode(obraz, x0, y0, rodzajW)` → `[x, y][]` trzcin, `rodzajBrzegu`, `odlegloscBrzegu` |
| `runo.ts` | kępki trawy, wysoka trawa, trzciny z pałką, paproć, wrzos, kwiaty, kamyki, głazy, grzyby; z przesunięciem wierzchołka (wiatr, odchylenie od postaci) | `runo(obraz, x, y, rodzaj, ziarno, wiatr)`, `posiejRuno(x0, y0, w, h, rodzajW)` (deterministyczny rozsiew) |
| `budynki.ts` | budynek z dowolnego obrysu: dach kopertowy z najbliższej krawędzi (połacie, rzędy dachówek, naroża, kalenice, kosze w L/U), ściany pod obrysem z przesunięciem `WALL_SKEW`, okna (nocą część świeci), drzwi, mosiężna rura, komin; 13 materiałów; maska cienia | `budynek(pierścień, opcje)`, `cienBudynku(pierścień, wysokość)`, `MATERIALY` |
| `steampunk.ts` | moduły rurociągu 8×8 (z zaworami, manometrami, podporami), trasa rurociągu po siatce, obłoczki pary (3 rozmiary × 6 klatek), tor kolejowy wzdłuż łamanej | `rurociagWzdluz` (rura po dowolnej łamanej, końce: dom / ziemia), `trasaPrzyDrodze`, `rownolegla`, `wycinek`, `zaokraglij`, `modulRury`, `para`, `tor` |
| `demo/` | galeria wszystkiego + pomiar czasu (otwórz `demo/index.html`) | – |

## 2. Czy to nie za ciężkie dla telefonu? (pomiary)

Zmierzone w Chromium bez karty graficznej, z **dławieniem procesora 4× i 6×** (symulacja średniego i słabego telefonu), na jednym kawałku mapy 1024×1024 px (= dzisiejszy kawałek 512 px mapy przy DOTS 2), z gęstym lasem (117 drzew), łąką, stawem, 12 budynkami, rurociągiem i torem: **tabela w `POMIARY.md`**. W skrócie (drzewa 0,6, gęsty las 409 drzew): cały kawałek ok. 0,4 s na komputerze, ok. 1,25 s na średnim telefonie (1,9 s z wodą), ok. 1,85 s na słabym; atlas drzew raz ok. 0,1–0,3 s.

Wnioski i zasady:
1. **Drzewa, para, moduły rur generujemy raz** (przy starcie albo przy pierwszym biomie w okolicy) do atlasu, czyli tekstury Phasera. Wszystkie gatunki × 3 warianty × 5 klatek wiatru to ułamek sekundy nawet na słabym telefonie i kilka MB pamięci. Można też tylko gatunki z okolicy.
2. **Podłoże, runo, pnie, budynki, tory i rurociągi malujemy raz na kawałek mapy**, tak jak dziś `MapRenderer.paint`, tylko per piksel zamiast wzorów z plików. Kawałek maluje się raz i jest trzymany w pamięci (`MAX_CHUNKS`), więc koszt ponosimy przy wchodzeniu w nowy teren, nie co klatkę.
3. **Malowanie kawałka w Web Workerze** (OffscreenCanvas albo przekazanie `Uint32Array`): gra nie przycina się podczas chodzenia, a kawałek pojawia się chwilę później (jak dziś przy wczytywaniu kafelków). Kod generatora nie używa DOM-u, więc przeniesie się bez zmian.
4. **Pamięć** bez zmian względem dzisiejszych kawałków (to te same płótna). Odpadają za to pliki `public/swiat/*.png` (pobieranie i dekodowanie przy starcie).
5. Gdy telefon jest bardzo wolny (`OSTROSC = 1`): kawałek 512×512 zamiast 1024×1024, czyli 4× mniej pracy.

## 3. Jak to wpiąć w grę

### 3.1 Kawałek mapy (`MapRenderer.paint`)

1. **Mapa rodzajów:** obszary OSM jak dziś (`paintArea`) wypełnić na pomocniczym płótnie **kolorami-identyfikatorami** (np. R = numer rodzaju) z `imageSmoothingEnabled = false`. Drogi i chodniki tak samo (grubość jak `trackWidth`). Odczyt przez `getImageData` raz na kawałek → `Uint8Array`. Uwaga: Canvas wygładza krawędzie wypełnień, więc przy odczycie brać najbliższy znany identyfikator albo rysować bez wygładzania (`ctx.imageSmoothingEnabled` nie dotyczy ścieżek – kolory pośrednie odrzucić i wziąć sąsiada).
2. `malujPodloze(obrazKawałka, x0·DOTS, y0·DOTS, rodzajW, cień)`: współrzędne **świata** w px obrazu (px mapy × 2), dzięki temu sąsiednie kawałki się łączą.
3. Cienie budynków (`cienBudynku`) i drzew (elipsa przesunięta w prawo-dół, jak w demo) przed narysowaniem obiektów.
4. Tory: `tor()` dla linii `rail`/`tram` (zastępuje `paintRail`).
5. Woda i brzegi: `malujWode(obrazKawałka, x0·DOTS, y0·DOTS, rodzajW)` zaraz po `malujPodloze` (kawałki bez wody w zasięgu 32 px są pomijane od razu). Zwrócone trzciny rysować jak runo.
5a. Runo: `posiejRuno(...)` (gęstość per rodzaj, plamy wysokiej trawy, kwiatki). **Statyczne** w kawałku. Ruchoma wysoka trawa przy postaci to osobne sprite'y (SPEC 3.4).
6. Budynki: `budynek(pierścień×2, {wysokosc: wallHeight×2, dach, sciana, seed, rura, komin, drzwi, noc})`, kolejność z północy na południe jak dziś. Materiał z ziarna budynku, miejsca specjalne (`highlight`) dostają własny materiał (np. szkoła `miedz_patyna`). `partsOf` (hale) zostaje: każda część osobno.
7. Rurociągi: wzdłuż dróg (punkt 0.6): dla drogi `minor`/`medium` w kawałku (i z marginesem, żeby rura z sąsiedniego kawałka się nie ucinała) ziarno z id drogi → strona, odcinek [s0, s1], koniec w domu lub studzience; `rurociagWzdluz` przed budynkami.
8. Pnie drzew rysowane w kawałek. **Korony nie**: one są sprite'ami z atlasu (SPEC 3.2).
9. `putImageData` do płótna kawałka i `refresh()` tekstury.

### 3.2 Drzewa (`src/scenes/Trees.ts`, zastępuje `ZIELEN`/`Forest`/`Orchards`)

- Przy starcie: dla gatunków z okolicy `drzewo(gatunek, ziarno_wariantu)` × 3 → `klatkiWiatru` → jeden `CanvasTexture` (atlas) z klatkami `<gatunek>-<wariant>-w<k>`, `pien`, `pienZacios`, `pieniek`, `sadzonka`, `owoce`. Filtr NEAREST, skala 0,5.
- Rozmieszczenie i gatunki: `dane/gatunki_osm.json`. Ścinanie, owoce, informacja zwrotna: SPEC punkt 4.

### 3.3 Para i efekty

`para(rozmiar, klatka)` → tekstura z 6 klatkami. Pula sprite'ów nad studzienkami, kominami i przeciekami w widoku (SPEC punkt 6). Wióry i liście to cząsteczki Phasera w kolorach z palety drzewa (1–2 px), bez grafik.

## 4. Czego generator (jeszcze) nie robi – zostaje grafikowi albo na później

- **Postacie** (są arkusze; nowe w manierze blondynki), **pojazdy** (lokomotywa, wagony w 16 kierunkach, wóz z koniem), **zabytki** (fontanna, wieża zegarowa, smoczy kocioł), **szyldy miejsc**, **ikony przedmiotów** i HUD.
- Latarnie, ławki, hydranty, słupy ogłoszeniowe: zostają obecne pliki. Można spróbować generatora (proste bryły), decyzja po porównaniu.
- Śnieg: łatwy w generatorze (mieszanie koloru z bielą według `snowLevel` + białe czapy na koronach i dachach od góry). Do dopisania przy części G.

## 5. Kolejność wdrożenia (zamiast Z2/Z7 ze SPEC)

| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| G1 | Skopiować `generator/` do `src/gen/`, typecheck, test jednostkowy (deterministyczność: ten sam obraz dla tego samego ziarna) | `npm run build` przechodzi | ~100 tys. |
| G2 | Podłoże z generatora w `MapRenderer` za przełącznikiem `?wyglad=09` (mapa rodzajów + `malujPodloze` + obwódki + runo + tory) | kawałki bez szwów, czas malowania w budżecie | ~400 tys. |
| G3 | Malowanie kawałka w Web Workerze | brak przycięć przy chodzeniu na telefonie | ~300 tys. |
| G4 | Budynki z generatora (`budynek`, cienie, materiały, miejsca specjalne, drzwi z `entranceOf`) | dachy jak w demo, także hale i L/U | ~500 tys. |
| G5 | Drzewa z atlasu + wiatr + prześwit + ścinanie (SPEC Z3–Z5 na atlasie z generatora) | jak w makiecie | ~800 tys. |
| G6 | Rurociągi, para, przecieki | widoczne, nie za gęsto (akceptacja właściciela) | ~300 tys. |
| G8 | Przyciąganie budynków do 8 kątów w `build-map` (+ mapy świata), z kontrolą kolizji (punkt 0.3) | budynki równo ułożone, żaden nie wchodzi na drogę; liczba „zostawionych bez obrotu” w logu build-map | ~300 tys. |
| G9 | Kolej na stacjach: tory, perony, składy parowe na torze, konduktor; konie tylko przy dworcach autobusowych (SPEC 7) | lokomotywa stoi na torze przy peronie, wagony idą za łukiem; przy dworcu autobusowym wóz | ~600 tys. |
| G10 | Góry: generator na mapach z terenem, szersze ścieżki, filtr „rozmycie w dół”, blokady szlaku (`GORY.md`) | Zakopane wygląda jak makieta, płynnie na telefonie | ~500 tys. |
| G11 | Pola: pasy upraw, pory roku, dojrzałe do zebrania (`POLA.md`) | pola obsiane w całości, część do zebrania | ~400 tys. |
| G12 | Zabytki na szkielecie z OSM (`ZABYTKI.md`) | Zamek Lubelski od grafika na swoim obrysie | ~350 tys. |
| G13 | Wozy konne z części od grafika (`WOZY.md`) | koń + wóz + ładunek w dobrej skali, ładunek na dnie | ~200 tys. |
| G14 | Szyldy na słupach przy rogu budynku, lampka nocą zamiast poświaty (punkt 14) | szyld widać z daleka bez aury | ~100 tys. |
| G15 | Ozdoby steampunkowe ze sprite'ów grafika zamiast rysowania pikselami (punkt 15) | ozdoby w stylu postaci | ~150 tys. |
| G7 | Usunięcie nieużywanych plików `public/swiat/` (podłoże, dachy, ściany, drzewa) po akceptacji | mniej do pobierania | ~50 tys. |

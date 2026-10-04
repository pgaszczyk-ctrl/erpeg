# Zamówienie 10 – klocki świata, partia 1 (konkretna lista plików)

> **WSTRZYMANE (4.10.2026), czeka na decyzję właściciela:** rozważamy, żeby świat (ziemię, drzewa, budynki, rurociągi, parę) rysował w całości program, jak w makiecie. Wtedy od grafika potrzebne byłyby tylko postacie, pojazdy, zabytki, szyldy i ikony. Nie zaczynaj tej listy bez potwierdzenia.

> **Styl, skala i klimat: `ZAMOWIENIE_09_pixel_art_swiat.md` (punkty 1–2).** To zamówienie mówi dokładnie, **jakie pliki** narysować w pierwszej kolejności, żeby gra mogła narysować świat: ziemię, drzewa, budynki, ulice ze steampunkiem i efekty. Postacie, kolej i zima przyjdą w kolejnych partiach.
> Materiały: folder **`7_zamowienie_10/`**: szablony każdego arkusza (`szablony/<plik>_siatka.png` do podłożenia pod rysunek i `<plik>_objasnienie.png` z podpisami), lista plików `manifest.json`, sprawdzarka `sprawdz_paczke.py`.
> Data: 4 października 2026.

## 0. Najważniejsze w 5 zdaniach

1. **Każdy plik ma dokładny rozmiar z tabeli** i jest rysowany 1:1 (bez powiększania). Gra pokazuje każdy piksel.
2. **Arkusze rysujesz w siatce z szablonu:** jedna rzecz w jednej komórce, nazwy komórek są w `_objasnienie.png`. Puste komórki zostaw puste.
3. **Rzeczy stojące na ziemi** (pnie, kępki, latarnie, okna, drzwi) **stoją na dolnej krawędzi komórki, na środku** (czerwony punkt w siatce). Od boków i góry zostaw 1 px wolnego.
4. **Bez półprzezroczystości** (wyjątek: para, 2–3 stopnie). **Kafle podłoża są pełne** (bez przezroczystości) i powtarzają się bez szwów.
5. **Kolory z palety** `6_zamowienie_09/04_paleta/paleta_startowa.png` (możesz ją dopracować, ale wtedy oddaj nową). Światło z lewej-góry, obrys w kolorze materiału, nie czarny.

## 1. Co rysuje program, a co Ty

| Rysuje program (Tobie nie potrzeba) | Rysujesz Ty (ta partia) |
|---|---|
| kształty budynków z mapy: dachy, połacie, kalenice, ściany, cienie | **kolory materiałów** dachów i ścian + **stemple** (okna, drzwi, rury, kominy) |
| granice trawa–droga–woda–las (postrzępione krawędzie) | **kafle podłoża** + **runo** (kępki, kamienie), które program rozsypuje na granicach |
| cienie drzew i budynków, cienie chmur, wiatr, prześwit pod koronami | **drzewa** w częściach (korona, pień, pień z zaciosem, pieniek, sadzonka, owoce) |
| przebieg rurociągów po mapie, gdzie bucha para | **moduły rurociągu** 8×8 i **obłoczki pary** |
| pasek postępu, liczby „+1”, dźwięki | **efekty i ikonki** (wióry, liście, siekiera, owoce) |

## 2. Jak pracować z generatorem obrazów (ważne)

Generator rysuje za duże obrazy z pikselami różnej wielkości. Żeby plik nadawał się do gry:
1. Generuj na **jednolitym tle** (np. czysta magenta `#ff00ff`), z prośbą o „pixel art, flat colors, no anti-aliasing, top-down view, light from top-left”.
2. **Zmniejsz** do docelowego rozmiaru metodą **najbliższego sąsiada** (nearest neighbor). Nie używaj dwuliniowego ani dwusześciennego.
3. **Ogranicz kolory** do palety (w GIMP: Obraz → Tryb → Indeksowany → paleta `paleta_startowa.gpl`, bez ditheringu; w Aseprite: Sprite → Color Mode → Indexed).
4. **Usuń tło** (magenta → przezroczystość), sprawdź, czy na brzegach nie zostały różowe piksele.
5. **Popraw ręcznie** pojedyncze „brudne” piksele, obrys i podstawę.
6. **Kafle:** przesuń obraz o połowę (GIMP: Warstwa → Przekształć → Przesunięcie, „zawijaj”), zamaluj szew na środku, przesuń z powrotem. Sprawdź 2×2 kafle obok siebie.
7. **Wklej do arkusza** w komórkę według `_siatka.png` (siatka to osobna warstwa pod spodem, w pliku końcowym jej nie ma).

## 3. Kontrola automatyczna (robimy ją my)

Każdą paczkę sprawdzamy skryptem `7_zamowienie_10/sprawdz_paczke.py`: wymiary, przezroczystość, liczba kolorów, szwy kafli, kontrast podłoża, puste komórki, czy rzeczy stoją na dolnej krawędzi i nie dotykają boków, kolory spoza palety. Odpowiadamy raportem `RAPORT.txt` z listą „OK / UWAGA / BŁĄD” dla każdego pliku. Pliki z błędem wracają do poprawki, a pliki z uwagą ocenia właściciel.

## 4. Lista plików – partia 1

Razem **62 plików**. Szablon każdego arkusza: `7_zamowienie_10/szablony/<nazwa>_siatka.png` i `<nazwa>_objasnienie.png`.

### A. Podłoże

Kafle **256×256 px**, po 3 warianty (`_a`, `_b`, `_c`) w tej samej jasności, żeby program mógł je mieszać. **Spokojne**: mało kontrastu, bez dużych pojedynczych obiektów (te dają stemple z runa). Bez kierunkowego światła i cieni.

| Plik | Kolorów najwyżej | Co ma przedstawiać |
|---|---|---|
| `podloze_trawa_a/_b/_c.png` | 12 | krótka miejska trawa, drobne kępki, spokojna |
| `podloze_laka_a/_b/_c.png` | 12 | wyższa trawa, kilka kwiatków, trochę jaśniejsza i cieplejsza od trawy |
| `podloze_park_a/_b/_c.png` | 12 | staranna, równiejsza trawa, odrobinę ciemniejsza |
| `podloze_las_lisciasty_a/_b/_c.png` | 12 | ściółka: brązowe liście, trochę mchu i ziemi, bez pni |
| `podloze_las_iglasty_a/_b/_c.png` | 12 | ściółka: rude igły, szyszki, mech |
| `podloze_bruk_a/_b/_c.png` | 10 | kostka brukowa ok. 4×3 px na kamień, ciemne szpary, lekko nierówna |
| `podloze_chodnik_a/_b/_c.png` | 8 | płyty chodnikowe ok. 16×16 px, jaśniejsze od bruku |
| `podloze_plac_a/_b/_c.png` | 8 | duże kamienne płyty rynku ok. 24×16 px w cegiełkę |
| `podloze_droga_a/_b/_c.png` | 10 | ubita ziemia, delikatne koleiny poziomo, kamyczki |
| `podloze_piasek_a/_b/_c.png` | 8 | piasek, drobne zmarszczki, jasny |
| `podloze_woda_a/_b/_c.png` | 8 | spokojna woda, ciemniejsza i jaśniejsza smuga, bez odbić nieba (falowanie robi program) |

### B. Drzewa

| Plik | Rozmiar pliku | Komórka | Układ (wiersze × kolumny) | Kolorów najwyżej | Przezroczystość | Co ma przedstawiać |
|---|---|---|---|---|---|---|
| `drzewo_dab.png` | 288×448 | 96×112 | 4 × 3 | 24 | tylko 0 albo 100% | szeroka „kalafiorowa” korona, ciemna zieleń, brązowy pień |
| `drzewo_brzoza.png` | 192×416 | 64×104 | 4 × 3 | 24 | tylko 0 albo 100% | lekka jasnozielona korona, biały pień w czarne plamki |
| `drzewo_sosna.png` | 216×480 | 72×120 | 4 × 3 | 24 | tylko 0 albo 100% | wysoki rudy pień, płaskie kępy igieł u góry |
| `drzewo_swierk.png` | 168×448 | 56×112 | 4 × 3 | 24 | tylko 0 albo 100% | ciemny stożek z pięter gałęzi, pień widać tylko u dołu |
| `drzewo_jablon.png` | 192×288 | 64×72 | 4 × 3 | 24 | tylko 0 albo 100% | niska rozłożysta, jasna zieleń; owoce osobno w ostatnim wierszu |
| `krzaki.png` | 240×64 | 40×32 | 2 × 6 | 20 | tylko 0 albo 100% | dwa rodzaje krzaków × 3 warianty; górna część (kołysze się) i dolna (stoi) na tym samym płótnie |

**Drzewa:** każdy gatunek to jeden arkusz, wszystkie komórki tej samej wielkości (płótno drzewa). **Korona i pień tego samego wariantu nałożone na siebie dają całe drzewo**, więc rysuj je razem, a potem rozdziel na dwie komórki. Pień stoi na dolnej krawędzi na środku. Korona zachodzi na górę pnia o 4–6 px. Pień z zaciosem = ten sam pień z **wyraźnym jasnym zaciosem** (świeże drewno, 3–4 px). Owoce (jabłoń) = **tylko owoce** w miejscach, gdzie wiszą na koronie (program zdejmuje je po kolei). Rozmiary: dąb 96×112, brzoza 64×104, sosna 72×120, świerk 56×112, jabłoń 64×72. Wzór wyglądu: `6_zamowienie_09/02_makieta_zrzuty/` (makieta to szkic programu, Twoje mają być ładniejsze).

### C. Runo i kamienie

| Plik | Rozmiar pliku | Komórka | Układ (wiersze × kolumny) | Kolorów najwyżej | Przezroczystość | Co ma przedstawiać |
|---|---|---|---|---|---|---|
| `runo.png` | 128×144 | 16×24 | 6 × 8 | 40 | tylko 0 albo 100% | każda roślina wyrasta z dolnej krawędzi komórki, na środku; trawa niska 4–8 px, wysoka 10–16 px, trzcina do 22 px |

### D. Budynki

| Plik | Rozmiar pliku | Komórka | Układ (wiersze × kolumny) | Kolorów najwyżej | Przezroczystość | Co ma przedstawiać |
|---|---|---|---|---|---|---|
| `materialy.png` | 56×120 | 8×8 | 15 × 7 | 105 | pełny, bez przezroczystości | każdy wiersz = jeden materiał: 6 kwadratów 8×8 jednolitego koloru od najciemniejszego do najjaśniejszego + 7. kolor kalenicy/krawędzi |
| `stemple_scian.png` | 128×48 | 16×16 | 3 × 8 | 16 | tylko 0 albo 100% | małe elementy przyklejane przez program na ścianę frontową; okno 3–5 px szer. × 4–5 px wys., drzwi 4–6 × 7 px, witryna 10–12 × 6 px; wszystko stoi na dolnej krawędzi komórki |
| `rury_sciana.png` | 48×18 | 8×18 | 1 × 6 | 10 | tylko 0 albo 100% | mosiężna rura po ścianie (3–4 px szerokości): pionowa na wysokość ściany 8/12/16 px z kolankiem u góry i u dołu, odcinek poziomy 8 px, osobne kolanka |
| `stemple_dachow.png` | 128×48 | 16×24 | 2 × 8 | 20 | tylko 0 albo 100% | rzeczy stawiane przez program na dachach (widok prawie z góry); wentylator i wiatrowskaz to klatki animacji |

**Materiały** (`materialy.png`): kolejność wierszy: `dachowka_czerwona`, `dachowka_brazowa`, `lupek`, `gont`, `blacha_zielona`, `miedz_patyna`, `papa`, `tynk_kremowy`, `tynk_zolty`, `tynk_szary`, `tynk_bialy`, `cegla`, `drewno`, `kamien`, `mosiadz`. W każdym wierszu 6 kwadratów 8×8 jednolitego koloru od najciemniejszego do najjaśniejszego (program cieniuje nimi połacie i ściany) + 7. kwadrat: kalenica/krawędź (dachy) albo cokół (ściany). Jak wygląda dach z takich kolorów: `6_zamowienie_09/05_dachy_jak_liczy_program/dachy_katy_x4.png`.

**Stemple:** program przykleja je na ściany (wysokość ściany 8, 12 albo 16 px) i dachy, **nie obraca ich**, więc rysujesz je w zwykłym widoku gry. Okna nocą (`_noc`) to te same okna z ciepłym światłem.

### E. Ulica i steampunk

| Plik | Rozmiar pliku | Komórka | Układ (wiersze × kolumny) | Kolorów najwyżej | Przezroczystość | Co ma przedstawiać |
|---|---|---|---|---|---|---|
| `rurociag.png` | 64×24 | 8×8 | 3 × 8 | 12 | tylko 0 albo 100% | moduły rurociągu: rura 3–4 px grubości biegnie środkiem kafla (x 2–5 albo y 2–5) i dochodzi do krawędzi, żeby moduły się łączyły; schemat: 6_zamowienie_09/03_szablony/schemat_rurociagu_moduly_8x8.png |
| `para_mala.png` | 96×16 | 16×16 | 1 × 6 | 6 | do 4 stopni | obłoczek pary: 6 klatek (rośnie, rozwiewa się w górę); biało-kremowy; wolno 2–3 stopnie przezroczystości (100/60/30%) |
| `para_srednia.png` | 144×24 | 24×24 | 1 × 6 | 6 | do 4 stopni | obłoczek pary: 6 klatek (rośnie, rozwiewa się w górę); biało-kremowy; wolno 2–3 stopnie przezroczystości (100/60/30%) |
| `para_duza.png` | 192×32 | 32×32 | 1 × 6 | 6 | do 4 stopni | obłoczek pary: 6 klatek (rośnie, rozwiewa się w górę); biało-kremowy; wolno 2–3 stopnie przezroczystości (100/60/30%) |
| `latarnia_gazowa.png` | 32×48 | 16×48 | 1 × 2 | 16 | tylko 0 albo 100% | żeliwna latarnia z mosiężną głowicą; noc = świeci (sama latarnia, poświatę robi program) |
| `lawka.png` | 24×16 | 24×16 | 1 × 1 | 16 | tylko 0 albo 100% | ławka z żeliwnymi bokami, widziana prawie z góry (widać siedzisko) |
| `kosz_mosiezny.png` | 8×12 | 8×12 | 1 × 1 | 16 | tylko 0 albo 100% | mosiężny kosz na śmieci |
| `hydrant_parowy.png` | 10×12 | 10×12 | 1 × 1 | 16 | tylko 0 albo 100% | niski zawór z czerwonym kółkiem |
| `studzienka.png` | 16×16 | 16×16 | 1 × 1 | 16 | tylko 0 albo 100% | okrągła kratka w bruku (prawie koło), bez pary – parę robi program z para_* |
| `slup_ogloszeniowy.png` | 16×32 | 16×32 | 1 × 1 | 16 | tylko 0 albo 100% | okrągły słup z afiszami bez napisów |
| `skrzynka_rozdzielcza.png` | 12×16 | 12×16 | 1 × 1 | 16 | tylko 0 albo 100% | skrzynka rozdzielcza pary z manometrem i lampką |
| `zbiornik_ulica.png` | 20×24 | 20×24 | 1 × 1 | 16 | tylko 0 albo 100% | duży mosiężny zbiornik na nóżkach z zaworem |
| `zegar_uliczny.png` | 12×40 | 12×40 | 1 × 1 | 16 | tylko 0 albo 100% | zegar na słupie |
| `donica_kwiaty.png` | 12×12 | 12×12 | 1 × 1 | 16 | tylko 0 albo 100% | donica z kwiatami przy drzwiach |

**Rurociąg:** moduły muszą do siebie pasować: rura dochodzi do krawędzi kafla zawsze w tym samym miejscu (środek, 3–4 px grubości). Schemat połączeń: `6_zamowienie_09/03_szablony/schemat_rurociagu_moduly_8x8.png`. **Para:** jedyne pliki z półprzezroczystością (do 4 stopni, bez gładkich przejść).

### F. Efekty

| Plik | Rozmiar pliku | Komórka | Układ (wiersze × kolumny) | Kolorów najwyżej | Przezroczystość | Co ma przedstawiać |
|---|---|---|---|---|---|---|
| `efekty_ciecie.png` | 128×16 | 16×16 | 1 × 8 | 10 | tylko 0 albo 100% | wióry odpryskujące od pnia (4 klatki) i krótki błysk uderzenia (3 klatki) |
| `efekty_liscie.png` | 96×72 | 24×24 | 3 × 4 | 12 | tylko 0 albo 100% | obłok spadających liści / igieł, 4 klatki |
| `ikony_akcji.png` | 64×8 | 8×8 | 1 × 8 | 12 | tylko 0 albo 100% | małe ikonki nad drzewem: ścinasz / potrząsasz / chronione; owoce spadające z drzewa; drewno (+1) |
| `pasek_postepu.png` | 36×5 | 18×5 | 1 × 2 | 6 | tylko 0 albo 100% | mosiężna ramka paska postępu jak manometr: pusta i pełna (program odsłania pełną od lewej) |

## 5. Kolejność: najpierw mała próbka

Zanim narysujesz wszystko, oddaj **próbkę** (te same nazwy i rozmiary, reszta komórek pusta):
1. `podloze_trawa_a.png`, `podloze_bruk_a.png`, `podloze_droga_a.png`,
2. `drzewo_dab.png`: tylko `korona_a` i `pien_a`; `drzewo_sosna.png`: tylko `korona_a` i `pien_a`,
3. `runo.png`: pierwszy wiersz (trawa niska),
4. `materialy.png`: pierwsze 3 wiersze (dachówka czerwona, brązowa, łupek) i `tynk_kremowy`, `cegla`,
5. `stemple_scian.png`: `okno_zwykle`, `okno_zwykle_noc`, `drzwi_drewniane`; `rury_sciana.png`: `rura_12`,
6. `rurociag.png`: pierwszy wiersz; `para_mala.png`.

Wstawimy ją do makiety i do gry testowej. Po akceptacji właściciela robisz resztę **w tej kolejności: A (podłoże) → B (drzewa) → C (runo) → D (budynki) → E (ulica) → F (efekty).**

## 6. Jak oddać

- Jeden zip, **wszystkie PNG w jednym folderze** (bez podfolderów), nazwy **dokładnie** jak w tabelach (małe litery, bez polskich znaków).
- Dodatkowo możesz dołączyć podglądy powiększone, ale z dopiskiem `_podglad` w nazwie.
- Jeśli zmieniłeś paletę: `paleta.gpl` + `paleta.png`.

## 7. Następne partie (dla orientacji)

Partia 2: kolej parowa (lokomotywa, wagony w 16 kierunkach, tory i perony – punkt 9a zamówienia 09), pozostałe gatunki drzew (buk, lipa, olcha, wierzba, grusza, śliwa, jodła, kosodrzewina, jałowiec), reszta kafli (pole, zarośla, parking, cmentarz, mokradło, skała, tory) i dekoracji ulic. Partia 3: zima i pogoda (część G zamówienia 08 w nowym stylu). Postacie osobno (zamówienie 09, punkt 4, wzór: blondynka).

# Zamówienie 03 – duża partia (świat, ulice, drzewa, reszta postaci)

> Paczka „świat 02” (brązowa dachówka, łupek, droga) przyjęta – krawędzie tym razem idealne, dziękujemy! To zamówienie jest większe, żebyś miał zajęcie na dłużej. **Oddawaj partiami, w kolejności sekcji A → E** – każdą gotową partię od razu wstawiamy do gry i odsyłamy zrzut.
>
> Zasady ogólne bez zmian: skala 3× (1 m ≈ 6 px w pliku), światło z lewej-góry, klimat lekkiego baśniowego steampunku (`STYL_SWIATA_steampunk.md`), nazwy plików małymi literami bez polskich znaków, PNG.
>
> **Tekstury** (podłoże, dachy, ściany): pełne, bez przezroczystości, bez konturu, kafelkujące się, **bez powtarzania pierwszego rzędu/kolumny na końcu**, drobiazgi rozsiane nieregularnie.
> **Obiekty** (ozdoby, drzewa, pojazdy): przezroczyste tło, kontur 1 px `#1e1a24`, margines ok. 3 px.
> **Postacie**: jak dotąd – arkusz 192×192 (3×3 po 64), rzędy dół / bok patrzy w lewo / góra, kolumny krok A / stoi / krok B, stopy na y=62, maska ubrań (czerwony/zielony), płeć i wiek w `metadata.json`.

---

## A. Reszta podłoża (tekstury, folder `swiat/`)

Najpierw sześć najważniejszych – widać je na mapie wszędzie:

| Plik | Rozmiar | Co to |
|---|---|---|
| `podloze_plac` | 192 × 192 | place i deptaki: duże kamienne płyty (ok. 18–24 px), ciepła szarość |
| `podloze_park` | 192 × 192 | staranna trawa parków, jaśniejsza niż zwykła, trochę kwiatów |
| `podloze_las` | 192 × 192 | poszycie lasu: mech, igliwie, ciemna zieleń (drzewa gra rysuje osobno) |
| `podloze_woda` | 192 × 192 | spokojna woda rzek i stawów, delikatne fale; bez brzegu |
| `podloze_pole` | 192 × 192 | pole uprawne, bruzdy **poziomo** |
| `podloze_zarosla` | 192 × 192 | krzaki, nieużytki, wyższa, dzika trawa |

Potem reszta (po 192 × 192): `podloze_dzialki` (ogródki, drobne grządki), `podloze_cmentarz` (trawa z malutkimi płytami, spokojnie), `podloze_parking` (ubita ziemia lub drobny żwir), `podloze_boisko` (równa jasna trawa, bez linii), `podloze_plac_zabaw` (piasek / kora), `podloze_piasek` (plaże), `podloze_mokradlo` (trawa z kałużami), `podloze_puszcza` (bardzo ciemny, gęsty las za brzegiem mapy).

## B. Reszta dachów (tekstury 48 × 48, rzędy poziomo – gra je obraca)

`dach_gont_jasna` (drewniany gont, wieś), `dach_strzecha_jasna` (strzecha, chaty), `dach_miedz_jasna` (zielonkawa miedziana blacha: wieże, ratusze, uczelnie).

## C. Ściany frontowe (tekstury 48 × 24, kafelkują się **tylko poziomo**)

Widzimy je z przodu, pod dachem. Dół obrazka = ziemia. Budynki mają tylko 3 wysokości, więc gra **ucina górę**: zostaje 12, 18 albo 24 px – dlatego okna i drzwi trzymaj w **dolnych 18 px**, a na górze najwyżej gzyms.

Każdy materiał w 3 wersjach: `_gladka` (sama ściana), `_okno` (jedno okno na środku, ok. 9 × 9 px, nocą gra może je rozświetlić), `_drzwi` (drzwi na środku, ok. 12 × 18 px, stoją na dolnej krawędzi).

| Materiał | Gdzie |
|---|---|
| `sciana_tynk_kremowy` | najczęstsza: kamienice, domy (zacznij od niej) |
| `sciana_cegla` | kamienice, fabryki, stare domy |
| `sciana_tynk_bialy` | bloki, nowsze domy |
| `sciana_deski` | drewniane domy na wsi |
| `sciana_kamien` | kościoły, zamek, mury |
| `sciana_mur_pruski` | stare domy (później) |

Steampunkowe warianty (po jednym, bez okna/drzwi): `sciana_cegla_rury` i `sciana_tynk_kremowy_rury` – mosiężna rura biegnąca poziomo po murze. Oraz `sciana_sklep_witryna` – parter sklepu: witryna w drewnianej ramie z mosiężnym szyldem bez napisu.

Przykład nazw: `sciana_cegla_gladka.png`, `sciana_cegla_okno.png`, `sciana_cegla_drzwi.png`.

## D. Ozdoby ulic i drzewa (obiekty z przezroczystym tłem)

Widok jak postacie: z góry i trochę z przodu, „stoją” na dolnej krawędzi.

| Plik | Rozmiar | Co to | Klatki (obok siebie w jednym pliku) |
|---|---|---|---|
| `latarnia_gazowa` | 24 × 72 | żeliwna latarnia z mosiężną głowicą | 2: dzień (zgaszona) / noc (świeci ciepłym światłem) |
| `lawka` | 42 × 24 | ławka z żeliwnymi bokami | 1 |
| `komin_para` | 18 × 30 | komin na dach z obłoczkiem pary | 3: obłoczek mały / większy / rozwiany |
| `zegar_uliczny` | 24 × 78 | zegar na słupie | 1 |
| `slup_ogloszeniowy` | 30 × 60 | okrągły słup z kolorowymi afiszami (bez czytelnych napisów) | 1 |
| `studzienka_para` | 24 × 24 | kratka w bruku, czasem bucha para | 3: bez pary / mały obłoczek / duży |
| `drzewo_jablon` | 64 × 72 | jabłoń | 2: z owocami / bez |
| `drzewo_sliwa` | 64 × 72 | śliwa | 2: z owocami / bez |
| `winorosl` | 60 × 54 | krzak winorośli | 2: z winogronami / bez |
| `sosna` | 48 × 78 | sosna w lesie | 2: drzewo / pieniek |
| `grzyb` | 24 × 24 | grzyb do zebrania | 1 |
| `kloda` | 30 × 18 | kłoda drewna | 1 |

Obecny wygląd drzew i grzybów: `3_obecne_grafiki/` (pliki `…__teraz_x4.png`).

## E. Reszta postaci stałych (arkusze 3 × 3 po 64 × 64 + maska)

| Plik | Kto | Wygląd |
|---|---|---|
| `luigi` | Luigi, hiszpańskojęzyczny macho (nie ten z Mario!) | pewny siebie, rozpięta koszula, złoty łańcuszek, wąsik, uśmiech |
| `martin` | Martin, znawca smoków i gier karcianych | okulary, kamizelka, talia kart albo księga o smokach w dłoni |
| `trener` | Trener Zbyszek (boiska) | dres, gwizdek na szyi, czapka z daszkiem |
| `biegaczka` | Biegaczka Ania (boiska) | strój do biegania, opaska na włosach |
| `madrala_m`, `madrala_k` | Mądrale – ludzie z zagadkami | „mądry” wygląd: okulary, książka, może gogle na czole (steampunk) |
| `woznica` | Woźnica na stacjach | płaszcz, kapelusz, bat, mosiężne gogle na kapeluszu |
| `pies` | Biało-czarny pies (zadanie ze świnką) | arkusz jak u postaci, ale pies na czterech łapach; stopy na y=62 |

`metadata.json`: płeć i wiek jak zawsze (pies: `"plec": "m"`, `"wiek": "dorosly"`).

---

## Kolejność oddawania (partie)

1. **A** – sześć najważniejszych podłoży (plac, park, las, woda, pole, zarośla).
2. **C** – `sciana_tynk_kremowy` i `sciana_cegla` (po 3 wersje) + `latarnia_gazowa`, `komin_para`.
3. **D** – drzewa, grzyb, kłoda, reszta ozdób.
4. **E** – postacie: najpierw `luigi`, `martin`, `woznica`, potem reszta.
5. Reszta A i C, potem B.

Dziękujemy – każda partia od razu trafia do gry testowej!

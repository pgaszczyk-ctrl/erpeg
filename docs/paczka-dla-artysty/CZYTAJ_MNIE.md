# Exp-lore – paczka dla grafika

Exp-lore to przygodowa gra na telefon (i komputer), grana na prawdziwej mapie miasta, widok z góry.
Zmieniamy grafikę na nowy, ładniejszy styl. Punktem wyjścia jest **paczka v1** (wędrowiec, rycerz,
łuczniczka, goblin-chochlik) – styl się podoba i jest już w grze na serwerze testowym
(https://exp-lore.app/test/). Zrzuty: `5_zrzuty_z_gry/`.

Co jest w tej paczce:

| Folder | Co to |
|---|---|
| `1_format/` | wzór arkusza postaci (z liniami pomocniczymi) i paczka v1 jako przykład |
| `2_uwagi_do_v1/` | co w v1 trzeba poprawić w kolejnych postaciach |
| `3_obecne_grafiki/` | wszystkie obecne obrazki z gry, powiększone ×4, **nazwane tak, jak ma się nazywać nowy plik** |
| `4_przedmioty_obecne/` | obecne ikony przedmiotów (16 × 16, powiększone ×4) |
| `5_zrzuty_z_gry/` | jak nowe postacie wyglądają w grze |

---

## A. Styl

- Jak paczka v1: sympatyczne postacie „chibi” (duża głowa), czytelne z daleka, ciemny kontur,
  światło z lewej-góry.
- Odrzucone wcześniej: postacie składane z części 24 × 30 px („fatalnie wyglądają”) – nie idziemy w tę stronę.
- Wszystko **na przezroczystym tle**, bez cienia pod nogami (gra dorysuje sama).
- **Wrogów nie obrysowujemy na czerwono** – gra sama dodaje wrogom czerwoną poświatę.

## B. Skala

Na mapie 1 metr ≈ 2 punkty. Postać 64 × 64 px w pliku jest w grze zmniejszana do ok. 23 punktów.
Dlatego **każdą nową grafikę rysujemy ok. 3 razy większą niż jej obecny rozmiar na mapie**
(w tabelach niżej jest i obecny, i proponowany rozmiar pliku). Obecny wygląd każdej rzeczy
widać w `3_obecne_grafiki/` (plik `<nazwa>__teraz_x4.png` → nowy plik to `<nazwa>.png`).

## C. Arkusz postaci (ludzie i stworki, które chodzą)

Wzór: `1_format/wzor_arkusza_192x192.png` (i objaśnienie `wzor_arkusza_objasnienie.png`).

- **192 × 192 px = 3 × 3 klatki po 64 × 64.**
- Rzędy: 1 = w dół (przodem), 2 = w bok **patrząc w lewo** (w prawo gra odbija sama), 3 = w górę (tyłem).
- Kolumny: krok A · stoi · krok B. Gra chodzi na zmianę krok A / krok B, a „stoi” pokazuje, gdy postać stoi.
- **Stopy zawsze na linii y = 62** (liczone od góry, z 64).
- **Środek postaci zawsze na x = 32**, w każdej klatce w tym samym miejscu.
- **Margines ok. 5 px** z każdej strony wolny (tam idzie poświata; nic nie może wchodzić do sąsiedniej klatki).
- Klatki jednego kierunku mają się różnić **tylko nogami i rękami** – włosy, hełm, twarz takie same.
- **Maska** (osobny plik tej samej wielkości, `<nazwa>_maska.png`): czerwony = główne ubranie,
  zielony = drugi kolor (spodnie, pas), niebieski = drobne dodatki, reszta przezroczysta.
  Z maski gra robi kilka wersji kolorystycznych tej samej postaci (mieszkańcy w różnych strojach).
- Założonego sprzętu (hełm, zbroja) na postaci **nie pokazujemy** – bohater wygląda zawsze tak samo.

### Uwagi do paczki v1 (`2_uwagi_do_v1/`)
1. Rycerz i łuczniczka w klatce „stoi” są **przesunięci o 4–6 px** względem klatek kroku – postać „skakała” w bok.
2. Klatka „stoi” jest narysowana **inaczej niż kroki**: łuczniczka od tyłu ma kucyk raz po lewej,
   raz po prawej; rycerz od tyłu ma inaczej narysowany hełm.
3. Pod wędrowcem i łuczniczką **kreski cienia wchodzą do klatki niżej**; goblin dotyka brzegów kwadratu.

Gra część z tego poprawia sama, ale w nowych postaciach proszę tego unikać.

### Uwagi do paczki „mieszkańcy 01–05 v2”
Arkusze są bardzo dobre (wyrównane, stopy na y = 62, marginesy – wszystko się zgadza) i są już w grze.
**Maski są do poprawy:** zamiast samego ubrania zaznaczają kontury całej postaci (czerwony), a u
mieszkańca 01 także włosy (zielony), u 03 twarz i czapkę. Maska ma obejmować **tylko ubranie**
(czerwony = główne ubranie, zielony = spodnie/pas/drugi kolor), bez konturu, skóry, włosów i czapki.
**Poprawione w paczce v3** – maski są teraz dobre, gra robi z nich warianty kolorystyczne (`5_zrzuty_z_gry/mieszkancy_warianty_kolorow.png`). Tak robić maski dla kolejnych postaci.

## D. Lista do narysowania

### D1. Postacie (arkusz 3 × 3 po 64 × 64 + maska)

| Co | Nazwa pliku | Uwagi |
|---|---|---|
| Bohaterowie – 10 wyglądów | `bohater_01` … `bohater_10` | 3 już są (wędrowiec, rycerz, łuczniczka); dziewczyny i chłopcy, różne fryzury |
| Mieszkańcy – 15 wyglądów | `mieszkaniec_01` … `mieszkaniec_15` | zwykli ludzie z miasta: dzieci, dorośli, starsi, różne ubrania |
| Mag Albrecht | `mag` | stary czarodziej w szpiczastej czapce |
| Siostra Margo | `siostra_margo` | zakonnica |
| Dziadek Marek | `dziadek_marek` | |
| Babcia Iwonka | `babcia_iwonka` | |
| Babcia Grażynka | `babcia_grazynka` | wiejska, z koszykiem |
| Luigi | `luigi` | hiszpański macho (nie ten z Mario) |
| Martin | `martin` | |
| Trener Zbyszek | `trener` | dres, gwizdek |
| Biegaczka Ania | `biegaczka` | strój do biegania |
| Mądrale (dają zagadki) | `madrala_m`, `madrala_k` | mężczyzna i kobieta, „mądry” wygląd (okulary, książka) |
| Woźnica | `woznica` | stoi przy wozie na stacji |

### D2. Wrogowie (arkusz 3 × 3 po 64 × 64, bez czerwonego obrysu)

| Co | Nazwa pliku | Teraz na mapie | Uwagi |
|---|---|---|---|
| Chochlik | `chochlik` | 16 × 16 | ✅ jest (goblin z v1) |
| Herszt gangu | `herszt` | chochlik × 2 | większy goblin z hełmem/maczugą; plik też 64 × 64 (gra powiększa) |
| Driada (las) | `driada` | 16 × 16 | duszek lasu, liściaste włosy |
| Zombiak (przy wodzie) | `zombie` | 16 × 16 | niebieskawy, ręce przed sobą |
| Szkielet (przy cmentarzu) | `szkielet` | 16 × 16 | |
| Bandyta | `bandyta` | 16 × 16 | człowiek w masce na oczach |
| Smok | `smok` | 40 × 30 | arkusz 3 × 3 po **128 × 128**; może być tylko rząd „w bok” + 2 klatki machania skrzydłami |
| Cień smoka (widziany z góry, w locie) | `smok_cien` | 48 × 48 | 2 klatki po 128 × 128: skrzydła rozłożone / złożone, głową w prawo, jednolita czarna sylwetka |

### D3. Zwierzęta

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Pies | `pies` | 16 × 12 | arkusz 3 × 3 po 64 × 64 |
| Świnka-zabawka w krzakach | `swinka` | 10 × 8 | 32 × 24 |

### D4. Rzeczy na mapie (kilka klatek = obok siebie w jednym pliku)

| Co | Nazwa pliku | Teraz | Nowy plik | Klatki |
|---|---|---|---|---|
| Jabłoń | `drzewo_jablon` | 22 × 24 | 64 × 72 | 2: z owocami / bez |
| Śliwa | `drzewo_sliwa` | 22 × 24 | 64 × 72 | 2: z owocami / bez |
| Winorośl | `winorosl` | 20 × 18 | 60 × 54 | 2: z winogronami / bez |
| Sosna | `sosna` | 16 × 26 | 48 × 78 | 2: drzewo / pieniek |
| Grzyb | `grzyb` | 8 × 8 | 24 × 24 | |
| Kłoda drewna | `kloda` | 10 × 6 | 30 × 18 | |
| Marchewka, brokuł, sałata (na grządce) | `warzywo_marchewka`, `warzywo_brokul`, `warzywo_salata` | 8 × 8 | 24 × 24 | |
| Jabłko, śliwka, winogrono | `owoc_jablko`, `owoc_sliwka`, `owoc_winogrono` | 8 × 8 | 24 × 24 | |
| Serduszko do podniesienia | `serce_podnies` | 9 × 8 | 27 × 24 | |
| Moneta | `moneta` | 8 × 8 | 24 × 24 | |
| Zguba (rzecz odbita chochlikom) | `zguba` | 12 × 12 | 36 × 36 | |
| Namiot | `namiot` | 20 × 16 | 60 × 48 | |
| Drogowskaz | `drogowskaz` | 16 × 20 | 48 × 60 | |
| Szczyt góry (znacznik) | `szczyt` | 12 × 12 | 36 × 36 | |
| Domek (ikonka na dachu domu bohatera) | `dom` | 26 × 24 | 78 × 72 | |
| Wózek kupca (na rondzie) | `woz_kupca` | 22 × 20 | 66 × 60 | |
| Powóz z koniem (stacja) | `powoz` | 30 × 20 | 90 × 60 | koń patrzy w lewo |
| Kukła treningowa | `kukla` | 14 × 20 | 42 × 60 | |
| Tarcza strzelnicza | `tarcza` | 16 × 20 | 48 × 60 | |
| Kryształ (trening magii) | `krysztal` | 14 × 20 | 42 × 60 | |
| Znacznik misji (drzwi) | `znacznik`, `znacznik_zrobione` | 14 × 18 | 42 × 54 | wykrzyknik / ptaszek |

### D5. Szyldy nad drzwiami (teraz 14 × 12 → nowe 42 × 36)

`szyld_sklep`, `szyld_szkola`, `szyld_kosciol`, `szyld_urzad`, `szyld_szpital`, `szyld_policja`,
`szyld_bank`, `szyld_hotel`, `szyld_alchemik` (stacja benzynowa – mikstury), `szyld_budowlany`
(sklep budowlany/sportowy – namioty), `szyld_biblioteka`.

### D6. Efekty

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Cięcie miecza (łuk) | `ciecie` | 24 × 24 | 72 × 72 |
| Strzała w locie | `strzala` | 12 × 5 | 36 × 15 |
| Pocisk magii | `pocisk_magii` | 10 × 10 | 30 × 30 |
| Kula ognia smoka | `kula_ognia` | 10 × 10 | 30 × 30 |
| Dymek „chcę pogadać” | `dymek` | 12 × 10 | 36 × 30 |
| Dymek z „?” (mądrale) | `dymek_pytanie` | 9 × 11 | 27 × 33 |
| Wykrzyknik nad głową | `wykrzyknik` | 8 × 14 | 24 × 42 |

### D7. Ekran (HUD)

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Serce: pełne, puste | `serce`, `serce_puste` | 9 × 8 | 27 × 24 |
| Serce niebieskie (z mikstury) | `serce_niebieskie` | 9 × 8 | 27 × 24 |
| Serce fioletowe (pojedynek) | `serce_pojedynek`, `serce_pojedynek_puste` | 9 × 8 | 27 × 24 |
| Gwiazdka doświadczenia: pełna, pół, pusta | `gwiazda`, `gwiazda_pol`, `gwiazda_pusta` | 11 × 11 | 33 × 33 |
| Ikona mapy | `ikona_mapy` | 14 × 12 | 42 × 36 |
| Strzałka do celu | `strzalka` | 16 × 16 | 48 × 48 – biała/szara, gra nada jej kolor |

### D8. Przedmioty (ikony w plecaku, skrzyni i sklepie) – `4_przedmioty_obecne/`

Teraz 16 × 16. Nowe: **48 × 48**, przezroczyste tło, te same nazwy plików:

`kijek`, `zelazny` (miecz), `stalowy`, `rycerski`, `swietlisty`, `gromowladny`, `luk`, `dlugi_luk`,
`rozdzka`, `kula`, `ksiega`, `skorzana_zbroja`, `kolczuga`, `skorzany_helm`, `zelazny_helm`,
`kapelusz`, `czapka_maga`, `korona`, `skorzane_buty`, `zelazne_buty`.

### D9. Budynki (po postaciach, gdy zobaczymy nowy styl na mapie)

Teraz dachy i ściany rysuje sam program kolorami. Mają dostać tekstury.
Budynki mają najwyżej 3 wysokości: parter, budynek wyższy, bardzo duży (max ok. 3 piętra) –
ściany frontowe są niskie, bo nic nie może zasłaniać ulic.

- Tekstury dachów i ścian **bez konturu i bez przezroczystości** – gra dorysuje ciemny kontur budynku.
  Muszą się **kafelkować** (lewa krawędź pasuje do prawej, górna do dolnej).
- Ozdoby (krzak, beczka…) – przezroczyste tło, z konturem.

**Dachy – 48 × 48, kafelkujące się w obie strony**, każdy w dwóch wersjach: `_jasna` (połać od słońca)
i `_ciemna` (ten sam wzór, w cieniu). Rzędy dachówek poziomo – gra obraca je wzdłuż kalenicy.

| Plik | Co to | Gdzie |
|---|---|---|
| `dach_dachowka_czerwona_jasna` / `_ciemna` | czerwona dachówka | miasta, domy murowane |
| `dach_dachowka_brazowa_jasna` / `_ciemna` | brązowa dachówka | wsie, stare domy |
| `dach_lupek_jasna` / `_ciemna` | szary łupek | kamienice, kościoły |
| `dach_gont_jasna` / `_ciemna` | drewniany gont | drewniane domy na wsi |
| `dach_strzecha_jasna` / `_ciemna` | słomiana strzecha | chaty, zagrody |
| `dach_plaski` (jedna wersja) | płaski dach (papa, żwir) | bloki, hale, duże budynki |

**Kalenica** – pasek 48 × 9, kafelkujący się poziomo, po jednym na materiał:
`kalenica_dachowka_czerwona`, `kalenica_dachowka_brazowa`, `kalenica_lupek`, `kalenica_gont`, `kalenica_strzecha`.

**Ściany frontowe – paski 48 × 24, kafelkujące się poziomo.** Dół obrazka = ziemia. Przy niskich
budynkach gra utnie górę (zostanie 12 lub 18 px), więc okna i drzwi trzymaj w dolnych 18 px.
Każdy materiał w 3 wersjach: `_gladka` (sama ściana), `_okno` (jedno okno na środku),
`_drzwi` (drzwi na środku, stoją na dolnej krawędzi).
Materiały: `sciana_deski`, `sciana_bale`, `sciana_mur_pruski`, `sciana_cegla`, `sciana_tynk_bialy`,
`sciana_tynk_kremowy`, `sciana_kamien` (np. `sciana_cegla_okno.png`).

**Ozdoby:** `ozdoba_krzak` (24 × 18), `ozdoba_plot` (48 × 18, kafelkuje się poziomo), `ozdoba_beczka`
(15 × 18), `ozdoba_studnia` (36 × 36), `ozdoba_stog` (36 × 30), `sciezka_kamienna` (24 × 24, kafelkuje się, bez konturu).

Na start budynków wystarczy: dachówka czerwona, gont, łupek, płaski + 3 kalenice; ściany: deski,
cegła, tynk biały (po 3 wersje); ozdoby: krzak i płot. Później: inne kraje (dachówka japońska,
dach tajski, glina), zamki (ok. 144 × 144) i pomniki (wieża z zegarem, łuk, obelisk, fontanna, posąg; 48–96 px).

---

## E. Kolejność

1. Mieszkańcy 1–15 + bohaterowie 4–10 (tych na mapie widać najwięcej).
2. Wrogowie: driada, zombie, szkielet, bandyta, herszt.
3. Stałe postacie (mag, Margo, dziadkowie, Grażynka, Luigi, Martin, trener, biegaczka, mądrale, woźnica, pies).
4. Drzewa, grzyby, owoce, szyldy.
5. Smok i cień smoka.
6. Efekty, ekran, przedmioty.
7. Budynki.

## F. Jak oddać

- Przy każdej postaci napisz w `metadata.json` (albo w README), **kim jest**: płeć (`"plec": "k"` – kobieta/dziewczynka,
  `"m"` – mężczyzna/chłopiec) i wiek (`"wiek": "dziecko" | "dorosly" | "starszy"`). Po tym gra dobiera imię
  (np. babcia nie będzie „Pan Rysiek”). Nazw plików nie trzeba zmieniać.

- PNG, nazwy plików dokładnie jak w tabelach (małe litery, bez polskich znaków), postacie razem z maską.
- Najlepiej partiami (np. 5 postaci naraz) – od razu wstawiamy je do gry testowej i odsyłamy uwagi.

# Grafiki do przerysowania w nowym stylu – lista dla artysty

Punkt wyjścia: paczka „exp_lore_pretty_postacie_v1” (wędrowiec, rycerz, łuczniczka, goblin-chochlik)
jest już w grze na serwerze testowym (exp-lore.app/test/). Pliki leżą w `public/postacie/`.

## Wspólne zasady

- PNG z przezroczystym tłem, bez tła, bez cienia pod nogami (gra sama dorysuje, jeśli trzeba).
- **Skala:** postać 64 × 64 px w pliku zajmuje na mapie ok. 23 × 23 punktów mapy (1 m ≈ 2 punkty).
  Czyli nowe grafiki rysujemy **ok. 3 razy większe** niż ich obecny rozmiar na mapie
  (kolumna „Nowy plik” niżej podaje proponowany rozmiar).
- Wrogów **nie obrysowujemy na czerwono** – gra sama dodaje czerwoną poświatę.
- Każda klatka musi się mieścić **w swoim kwadracie**, z wolnym marginesem ok. **5 px** z każdej strony
  (poświata potrzebuje miejsca; w paczce v1 goblin dotyka brzegów, a pod wędrowcem i łuczniczką
  „przeciekały” kreski cienia do rzędu niżej – gra je teraz wycina, ale lepiej, żeby ich nie było).
- Stopy postaci zawsze na tej samej wysokości (w paczce v1: 62. piksel od góry z 64).

### Arkusz postaci (ludzie i stworki, które chodzą)
Jak w paczce v1: 192 × 192 px = 3 × 3 klatki po 64 × 64.

| Rząd | Kierunek |
|---|---|
| 1 | w dół (przodem) |
| 2 | w bok – **patrzy w lewo** (w prawo gra odbija sama) |
| 3 | w górę (tyłem) |

Kolumny: krok A · stoi · krok B.
Do każdej postaci **maska** tej samej wielkości: czerwony = główne ubranie, zielony = drugi kolor
(spodnie, pas), niebieski = drobne dodatki. Dzięki masce gra robi z jednej postaci kilka strojów.

Nazwy plików: `postacie/<nazwa>.png` i `postacie/<nazwa>_maska.png` (małe litery, bez polskich znaków).

---

## 1. Postacie (arkusz 3 × 3 po 64 × 64 + maska)

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

## 2. Wrogowie (arkusz 3 × 3 po 64 × 64, bez czerwonego obrysu)

| Co | Nazwa pliku | Teraz (na mapie) | Uwagi |
|---|---|---|---|
| Chochlik | `chochlik` | 16 × 16 | ✅ jest (goblin z v1) |
| Herszt gangu / wielki herszt | `herszt` | chochlik × 1,8–2,5 | może być większy goblin z hełmem/maczugą; plik też 64 × 64 (gra powiększa) |
| Driada (las) | `driada` | 16 × 16 | duszek lasu, liściaste włosy |
| Zombiak (przy wodzie) | `zombie` | 16 × 16 | niebieskawy, ręce przed sobą |
| Szkielet (przy cmentarzu) | `szkielet` | 16 × 16 | |
| Bandyta | `bandyta` | 16 × 16 | człowiek w masce na oczach |
| Smok | `smok` | 40 × 30 | arkusz 3 × 3 po **128 × 128** (duży); wystarczy też 2 klatki machania skrzydłami |
| Cień smoka (widziany z góry, lecący) | `smok_cien` | 48 × 48 | 2 klatki po 128 × 128: skrzydła rozłożone / złożone, głową w prawo, jednolita czarna sylwetka |

## 3. Zwierzęta

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Pies (zadanie z zabawką) | `pies` | 16 × 12 | arkusz 3 × 3 po 64 × 64 |
| Świnka-zabawka w krzakach | `swinka` | 10 × 8 | 32 × 24 |

## 4. Rzeczy na mapie (jeden obrazek albo kilka klatek obok siebie)

| Co | Nazwa pliku | Teraz | Nowy plik | Klatki |
|---|---|---|---|---|
| Jabłoń | `drzewo_jablon` | 22 × 24 | 64 × 72 | 2: z owocami / bez |
| Śliwa | `drzewo_sliwa` | 22 × 24 | 64 × 72 | 2: z owocami / bez |
| Winorośl | `winorosl` | 20 × 18 | 60 × 54 | 2: z winogronami / bez |
| Sosna | `sosna` | 16 × 26 | 48 × 78 | 2: drzewo / pieniek |
| Grzyb | `grzyb` | 8 × 8 | 24 × 24 | |
| Kłoda drewna | `kloda` | 10 × 6 | 30 × 18 | |
| Marchewka, brokuł, sałata (na grządce) | `warzywo_marchewka`, `warzywo_brokul`, `warzywo_salata` | 8 × 8 | 24 × 24 | |
| Jabłko, śliwka, winogrono (spadły owoc) | `owoc_jablko`, `owoc_sliwka`, `owoc_winogrono` | 8 × 8 | 24 × 24 | |
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

## 5. Szyldy nad drzwiami (teraz 14 × 12 → nowe 42 × 36)

`szyld_sklep`, `szyld_szkola`, `szyld_kosciol`, `szyld_urzad`, `szyld_szpital`, `szyld_policja`,
`szyld_bank`, `szyld_hotel`, `szyld_alchemik` (stacja benzynowa – mikstury), `szyld_budowlany`
(sklep budowlany/sportowy – namioty), `szyld_biblioteka`.

## 6. Efekty

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Cięcie miecza (łuk) | `ciecie` | 24 × 24 | 72 × 72 |
| Strzała w locie | `strzala` | 12 × 5 | 36 × 15 |
| Pocisk magii | `pocisk_magii` | 10 × 10 | 30 × 30 |
| Kula ognia smoka | `kula_ognia` | 10 × 10 | 30 × 30 |
| Dymek „chcę pogadać” | `dymek` | 12 × 10 | 36 × 30 |
| Dymek z „?” (mądrale) | `dymek_pytanie` | 9 × 11 | 27 × 33 |
| Wykrzyknik nad głową | `wykrzyknik` | 8 × 14 | 24 × 42 |

## 7. Ekran (HUD) – te mogą zostać pikselowe, ale warto dopasować styl

| Co | Nazwa pliku | Teraz | Nowy plik |
|---|---|---|---|
| Serce: pełne, puste | `serce`, `serce_puste` | 9 × 8 | 27 × 24 |
| Serce niebieskie (z mikstury) | `serce_niebieskie` | 9 × 8 | 27 × 24 |
| Serce fioletowe (pojedynek) | `serce_pojedynek`, `serce_pojedynek_puste` | 9 × 8 | 27 × 24 |
| Gwiazdka doświadczenia: pełna, pół, pusta | `gwiazda`, `gwiazda_pol`, `gwiazda_pusta` | 11 × 11 | 33 × 33 |
| Ikona mapy | `ikona_mapy` | 14 × 12 | 42 × 36 |
| Strzałka do celu (gra ją przebarwia) | `strzalka` | 16 × 16 | 48 × 48 – biała/szara, gra nada kolor |

## 8. Przedmioty (ikony w plecaku, skrzyni i sklepie)

Teraz 16 × 16 w `public/items/`. W nowym stylu proponuję **48 × 48**, te same nazwy plików:

`kijek`, `zelazny` (miecz), `stalowy`, `rycerski`, `swietlisty`, `gromowladny`, `luk`, `dlugi_luk`,
`rozdzka`, `kula`, `ksiega`, `skorzana_zbroja`, `kolczuga`, `skorzany_helm`, `zelazny_helm`,
`kapelusz`, `czapka_maga`, `korona`, `skorzane_buty`, `zelazne_buty`.

## 9. Mapa (osobno, po zobaczeniu postaci na tle mapy)

Podłoże i budynki rysuje teraz sam program kolorami (trawa, bruk, ścieżki, woda, las, piasek, dachy).
Na nie jest osobna lista: `docs/kafelki-budynkow.md` (dachy, ściany, ozdoby). Po nowym stylu postaci
te kafelki też warto zrobić ok. 3× gęściej (np. dachówka 48 × 48 zamiast 16 × 16).

---

## Kolejność (proponowana)

1. Mieszkańcy 1–15 + bohaterowie 4–10 (tych na mapie widać najwięcej).
2. Wrogowie: driada, zombie, szkielet, bandyta, herszt.
3. Stałe postacie (mag, Margo, dziadkowie, Grażynka, Luigi, Martin, trener, biegaczka, mądrale, woźnica, pies).
4. Drzewa, grzyby, owoce, szyldy.
5. Smok i cień smoka.
6. Efekty, HUD, przedmioty.

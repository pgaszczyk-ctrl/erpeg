# Zamówienie: ŚWIAT, partia 1 – podłoże, drogi, dachy

> Najważniejsza paczka teraz. Postacie są piękne, ale chodzą po płaskich kolorach (zobacz `5_zrzuty_z_gry/swiat_dzis_plaskie_kolory.png`). Ta partia zmienia wygląd całej mapy. Klimat opisuje `STYL_SWIATA_steampunk.md`: lekki, baśniowy, ciepły, z nutą pary i mosiądzu.

## Jak gra to używa

- Mapę widać **z góry**. Gra wypełnia każdy kawałek terenu (trawnik, las, plac, ulicę…) twoją teksturą, **powtarzając ją jak tapetę**. Dlatego każda tekstura **musi się kafelkować**: lewa krawędź pasuje do prawej, a górna do dolnej, bez widocznych szwów i bez jednego rzucającego się w oczy elementu, który będzie się powtarzał co kawałek.
- Rysujesz **3× większe**, niż widać na mapie (1 m ≈ 6 px w pliku). Gra zmniejsza plik 3× z wygładzaniem.
- Tekstury podłoża: **bez konturu, bez przezroczystości**, pełny kwadrat.
- Światło z lewej-góry, paleta ciepła jak w postaciach.
- Pliki wstawiamy od razu po otrzymaniu: gra podmienia rysowany kolor na twoją teksturę, a brakujący plik zostaje po staremu. Można więc oddawać po kilka.

## 1. Podłoże – 192 × 192 px (albo 96 × 96 dla drobnych wzorów), kafelkujące się

W kolejności ważności (tego jest najwięcej na mapie):

| Plik | Co to | Uwagi |
|---|---|---|
| `podloze_trawa` | zwykły trawnik, tło całego miasta | spokojna, nie za jaskrawa, drobne kępki i kwiatki rzadko |
| `podloze_bruk` | ulice dla wozów (kocie łby / kostka) | 96 × 96; kamienie ok. 10–12 px, ciepła szarość z beżem |
| `podloze_droga` | drogi gruntowe, chodniki i ścieżki | ubita ziemia, jasny brąz, drobne kamyki; gra kładzie ją pasami wzdłuż dróg |
| `podloze_las` | poszycie lasu | ciemna zieleń, mech, igliwie (drzewa gra dorysuje osobno) |
| `podloze_park` | parki | trawa staranniej przystrzyżona, trochę kwiatów |
| `podloze_plac` | place, deptaki, rynki | płyty kamienne większe niż bruk (ok. 18–24 px) |
| `podloze_woda` | rzeki, stawy | spokojna woda, delikatne fale; bez brzegu (gra dorysuje brzeg) |
| `podloze_pole` | pola uprawne | bruzdy **poziomo** |
| `podloze_zarosla` | krzaki, nieużytki | |
| `podloze_dzialki` | ogródki działkowe | drobne grządki, ścieżki |
| `podloze_cmentarz` | cmentarze | trawa + malutkie płyty/krzyżyki, spokojnie |
| `podloze_parking` | place postojowe dla wozów | ubita ziemia albo drobny żwir |
| `podloze_boisko` | boiska | równa, jasna trawa (linie gra dorysuje) |
| `podloze_plac_zabaw` | place zabaw | piasek/kora |
| `podloze_piasek` | plaże, piaski | |
| `podloze_mokradlo` | podmokłe łąki | trawa z kałużami |
| `podloze_puszcza` | dzika puszcza za granicą mapy | bardzo ciemny, gęsty las (widać ją na brzegach mapy) |
| `podloze_skala`, `podloze_lodowiec` | góry (tylko mapy w górach) | później, niski priorytet |

## 2. Dachy – 48 × 48 px, kafelkujące się (jak D9 w CZYTAJ_MNIE)

Rzędy dachówek biegną **poziomo**. Na start wystarczy wersja `_jasna`, a `_ciemna` (ten sam wzór w cieniu) można dorobić później.

| Plik | Co to |
|---|---|
| `dach_dachowka_czerwona_jasna` | czerwona dachówka – najczęstszy dach |
| `dach_dachowka_brazowa_jasna` | brązowa dachówka |
| `dach_lupek_jasna` | szary łupek (kamienice) |
| `dach_gont_jasna` | drewniany gont (wieś) |
| `dach_strzecha_jasna` | strzecha (chaty) |
| `dach_miedz_jasna` | zielonkawa miedziana blacha (wieże, ratusze) – steampunkowy akcent |

## 3. Kolejność oddawania

1. **Na próbę 3 pliki:** `podloze_trawa`, `podloze_bruk`, `dach_dachowka_czerwona_jasna`. Wstawimy je od razu i odeślemy zrzut, jak wygląda miasto.
2. Reszta podłoża z tabeli 1, od góry.
3. Pozostałe dachy.
4. Potem partia 2: ściany frontowe (D9), latarnie, kominy z parą, parowóz (`STYL_SWIATA_steampunk.md`).

## 4. Nazwy i oddanie

- PNG, nazwy dokładnie jak w tabelach (małe litery, bez polskich znaków), bez folderów w środku albo w folderze `swiat/`.
- Przy każdej teksturze dobrze sprawdzić ułożenie 3 × 3 obok siebie: czy nie widać szwów ani powtarzającego się wzoru.

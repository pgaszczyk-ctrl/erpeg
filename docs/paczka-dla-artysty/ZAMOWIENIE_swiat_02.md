# Zamówienie: ŚWIAT, partia 2 – reszta dachów i podłoża

> Próba (trawa, bruk, czerwona dachówka) jest w grze i wygląda świetnie – zrzuty: `5_zrzuty_z_gry/swiat_proba_01_w_grze.png` i `swiat_dachy_obracane.png`. Teraz reszta, żeby całe miasto miało teksturę. Zasady (rozmiary, kafelkowanie, skala 3×, bez konturu) jak w `ZAMOWIENIE_swiat_01.md`, klimat jak w `STYL_SWIATA_steampunk.md`.

## Co się zmieniło w grze

- **Dachówki obracają się wzdłuż najdłuższej ściany budynku** i każdy dom ma wzór trochę przesunięty. Rysuj dalej rzędy **poziomo**, gra sama je obróci.
- Każdy dom ma swoją „rodzinę” koloru dachu: czerwoną, brązową albo szarą. Dopóki nie ma pliku danej rodziny, dom ma płaski kolor – dlatego brązowa dachówka i łupek są teraz najważniejsze.

## Dwie poprawki z próby (proszę pilnować)

1. **Nie powtarzaj krawędzi.** W próbie ostatni rząd i ostatnia kolumna były takie same jak pierwsze – przy układaniu wychodzi podwójny rząd. Następny piksel po prawej ma być pierwszym pikselem z lewej.
2. **Bez równej siatki drobiazgów.** Kwiatki, kamyki, kępki rozsiewaj nieregularnie, żeby przy powtarzaniu nie było widać wzoru.

## 1. Dachy – 48 × 48, rzędy poziomo (najpierw pierwsze dwa!)

| Plik | Co to | Na które domy |
|---|---|---|
| `dach_dachowka_brazowa_jasna` | brązowa dachówka | domy z brązowym dachem (dziś płaski kolor) |
| `dach_lupek_jasna` | szary łupek | kamienice, szare dachy (dziś płaski kolor) |
| `dach_gont_jasna` | drewniany gont | wieś (później) |
| `dach_strzecha_jasna` | strzecha | chaty (później) |
| `dach_miedz_jasna` | zielonkawa miedź | wieże, ratusze (później) |

Wersje `_ciemna` (ta sama tekstura w cieniu) – jeszcze nie potrzebne.

## 2. Podłoże – w tej kolejności

| Plik | Rozmiar | Co to |
|---|---|---|
| `podloze_droga` | 96 × 96 | ubita ziemia dróg gruntowych, chodników i ścieżek (dziś najbardziej „płaska” rzecz na mapie – jasnobrązowe pasy) |
| `podloze_plac` | 192 × 192 | duże kamienne płyty placów i deptaków |
| `podloze_park` | 192 × 192 | staranna trawa parków, trochę kwiatów |
| `podloze_las` | 192 × 192 | poszycie lasu: mech, igliwie, ciemna zieleń |
| `podloze_woda` | 192 × 192 | spokojna woda, delikatne fale |
| `podloze_pole` | 192 × 192 | pole z bruzdami poziomo |
| `podloze_zarosla`, `podloze_dzialki`, `podloze_cmentarz`, `podloze_parking`, `podloze_boisko`, `podloze_plac_zabaw`, `podloze_piasek`, `podloze_mokradlo`, `podloze_puszcza` | 192 × 192 | opisy w `ZAMOWIENIE_swiat_01.md`, tabela 1 |

## 3. Kolejność oddawania

1. `dach_dachowka_brazowa_jasna`, `dach_lupek_jasna`, `podloze_droga` – to zmieni najwięcej.
2. `podloze_plac`, `podloze_park`, `podloze_las`, `podloze_woda`, `podloze_pole`.
3. Reszta podłoża, potem gont, strzecha, miedź.
4. Następna partia (3): ściany frontowe (D9 w CZYTAJ_MNIE), latarnie gazowe, kominy z parą, parowóz.

Nazwy plików dokładnie jak w tabelach, PNG, folder `swiat/`.

# Zamówienie 11 – tylko to, czego nie narysuje program

> **Zmiana (4 października 2026):** ziemię, drzewa, krzaki, trawę, budynki, rurociągi, parę i tory **rysuje teraz program** (zobacz `6_zamowienie_09/02_makieta_zrzuty/`). **Zamówienie 10 (klocki świata) jest wstrzymane, nie rysuj go.** Od Ciebie potrzebujemy tylko rzeczy z charakterem, których program nie zrobi dobrze: pojazdów, zabytków, szyldów i kilku nowych postaci.
> Styl i skala: `ZAMOWIENIE_09_pixel_art_swiat.md` (punkty 1–2 dla świata, punkt 4 dla postaci). Zasady techniczne i praca z generatorem obrazów: `ZAMOWIENIE_10_klocki_swiata_partia1.md`, punkty 0, 2, 3 i 6 (one nadal obowiązują). Każda paczka jest sprawdzana skryptem (`7_zamowienie_10/sprawdz_paczke.py`).

## 1. Dwie gęstości pikseli – pilnuj, która do czego

| Co | Gęstość | Wzór |
|---|---|---|
| **Pojazdy, zabytki, szyldy** (część świata) | drobny piksel: 1 px pliku = 1 px świata | koń z wozu (`6_zamowienie_09/01_wzor_stylu/kon_WZOR_SWIATA_x3.png`) i makieta |
| **Postacie** | grubszy piksel: siatka 32×32 zapisana jako 64×64 (każdy piksel 2×2) | blondynka (`01_wzor_stylu/wzor_postaci_blondynka_tak_nie.png`) |

## 2. Lista

### 2.1 Kolej parowa (najważniejsze)

**Lokomotywa i tender w 16 kierunkach** (mają przód i tył), **wagony w 8 kierunkach** (wagon jest symetryczny: jadący w lewo wygląda tak samo jak jadący w prawo, więc wystarczy pół obrotu: 0°, 22,5° … 157,5°). Kierunki w jednym wierszu, od „jedzie w prawo” (0°) zgodnie z ruchem wskazówek zegara co 22,5° (`6_zamowienie_09/03_szablony/schemat_16_kierunkow_pojazdu.png`). Program ustawia każdy pojazd osobno na torze i wybiera kierunek najbliższy krzywiźnie toru w tym miejscu (różnica najwyżej 11°, niewidoczna). Więcej kierunków nie trzeba. Środek pojazdu w środku klatki. Widok prawie z góry, lekko z przodu (jak mapa). Bez dymu (parę robi program). Do każdego arkusza osobny `_cien.png` (czarna sylwetka cienia na ziemi, ta sama siatka).

| Plik | Klatka | Arkusz | Co to |
|---|---|---|---|
| `lokomotywa_parowa.png` | 72×72 | 1152×72 | mała, sympatyczna lokomotywa ok. 64 px długości: komin, mosiężny kocioł, kabina, lampa z przodu, czerwone koła |
| `tender.png` | 56×56 | 896×56 | wagonik z węglem i wodą |
| `wagon_osobowy_zielony.png`, `wagon_osobowy_bordowy.png` | 72×72 | 576×72 (8 kierunków) | drewniany wagon z oknami; + `_noc` (te same klatki, okna świecą) |
| `wagon_towarowy.png` | 72×72 | 576×72 (8 kierunków) | kryty wagon z desek |
| `wagon_platforma.png` | 72×72 | 576×72 (8 kierunków) | platforma z beczkami i skrzyniami |

**Najpierw próbka:** lokomotywa w 3 kierunkach (0°, 22,5°, 45°) + `_cien`, żeby sprawdzić styl i wielkość na torze. To tylko próbka; docelowo lokomotywa ma wszystkie 16 kierunków.

### 2.2 Wóz konny (poprawka)

Obecne wozy są narysowane czysto z boku i wyglądają płasko. Nowe: **lekko z góry i z przodu**, więcej odcieni na koniu (jaśniejszy grzbiet, ciemniejszy brzuch), widać wnętrze skrzyni. 2 klatki (krok konia), 3 ładunki (`pusty`, `beczki`, `worki`) × 3 maści (`brazowy`, `czarny`, `szary`), klatka ok. **124×100**, jeden kierunek (patrzy w lewo, prawo robi lustro). Nazwy jak dziś: `woz_konny_<ladunek>_<masc>.png` + `_cien`. Wozy stoją tylko przy dworcach autobusowych.

### 2.3 Zabytki i miejsca

Widok prawie z góry (koła na ziemi jako prawie koła, widać wnętrze fontanny i kotła), drobny piksel, mocny steampunk. Środek podstawy na środku dolnej krawędzi.

| Plik | Płótno | Klatki | Co to |
|---|---|---|---|
| `fontanna_smok.png` | 96×96 | 3 (woda się rusza) | okrągła fontanna z mosiężnym smokiem |
| `kociol_publiczny.png` | 80×80 | 2 (zgaszony / świeci) | „smoczy kocioł” na placu, mosiężny, z manometrami i rurami |
| `wieza_zegarowa.png` | 64×128 | 1 | wieża z zegarem i miedzianym dachem, skrócona w pionie (ok. 2/3) |
| `wieza_cisnien.png` | 48×72 | 1 | mosiężny zbiornik na wodę dla lokomotyw (przy dworcach) |
| `zuraw_wodny.png` | 24×40 | 1 | żuraw do nalewania wody do lokomotywy |
| `wiata_peronowa.png` | 32×32 | 1 | moduł wiaty (słupy z kutego żelaza, daszek), powtarzany wzdłuż peronu |
| `semafor.png` | 12×40 | 2 (stój / jedź) | semafor kolejowy |

### 2.4 Szyldy miejsc

12 szyldów jak dziś (`szyld_<sklep|szkola|kosciol|urzad|szpital|policja|biblioteka|hotel|bank|alchemik|sklep_sportowy|kemping>`) + nowe `szyld_dworzec`, `szyld_kupiec`. **Mosiężna tabliczka na kutym wysięgniku**, prosty symbol, bez napisów, **28×24 px** (drobny piksel).

### 2.5 Nowe postacie (maniera blondynki, arkusz wg zamówienia 09 punkt 4)

- `konduktor`: mundur z mosiężnymi guzikami, czapka z daszkiem, gwizdek, chorągiewka (stoi przy stacjach kolejowych zamiast woźnicy).
- Po akceptacji bazy ruchu: przerysowanie mieszkańców 11 i 15 (dziś wyłączeni, ucięte spódnice).

## 3. Kolejność

1. Próbka lokomotywy (3 kierunki + cień).
2. Reszta kolei (2.1) i wieża ciśnień.
3. Wóz konny (2.2).
4. Zabytki (2.3) i szyldy (2.4).
5. Konduktor (2.5).

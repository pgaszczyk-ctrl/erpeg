# Exp-lore – styl świata: lekki baśniowy steampunk

> Nowy kierunek dla domów, ulic i ozdób. Format, skala, kontur, światło i nazwy plików zostają takie jak w `CZYTAJ_MNIE` (punkty A, B i D9). Ten plik mówi, **w jakim klimacie** to rysujemy i **co dochodzi** do listy.

## 1. Zasada świata (jedno zdanie)

> **Dzisiejsze miasto, ale technika zatrzymała się na parze, mosiądzu i gazowych latarniach, a obok żyje magia.**

W tle jest historia, którą pisze autor: dawniej smoki żyły z ludźmi w zgodzie, a ich żar napędzał kotły i maszyny. Potem przeleciała kometa, smoki zdziczały, driady zrobiły się złośliwe, a chochliki zbiły się w gangi. Dlatego para jest wszędzie, ale trochę „przygasła”.

## 2. Jak lekko

- **Para to ozdoba, nie przemysł.** Ma być przytulnie i baśniowo: miodowe światło latarni, mosiężne okucia, zegary, kominki z obłoczkiem pary. Nie brudna fabryka, rdza i smog.
- **Zębatki z umiarem.** Jeden mały akcent na budynek albo przedmiot, nie wszędzie.
- Budynki to wciąż **prawdziwe miasto**: kamienice, domy, bloki, kościoły, sklepy. Nie zamieniamy ich w fabryki. Dostają dachy i ściany w starym stylu oraz steampunkowe dodatki.
- Postacie zostają w stylu v1 (chibi, ciemny kontur, światło z lewej-góry). U części przyszłych postaci mogą się pojawić drobne akcenty: gogle na czole, mosiężna klamra, kamizelka.

## 3. Paleta (wskazówka)

Ciepłe kolory i dużo mosiądzu:

| Kolor | Przykład | Do czego |
|---|---|---|
| mosiądz | `#c8923a` | okucia, rury, szyldy, latarnie |
| miedź | `#b5673a` | kotły, dachy wież, zegary |
| ciemne żelazo | `#3a3440` | słupy, kraty, koła |
| ciepłe światło | `#ffd27a` | okna nocą, płomień latarni |
| para | `#f1ede4` | obłoczki (półprzezroczyste krawędzie są OK tylko w parze) |

Dachówki, cegła i tynk jak w D9 (czerwona dachówka, łupek, gont, tynk biały i kremowy), tylko odrobinę cieplejsze.

## 4. Co dochodzi do listy (nowe pliki)

Rozmiary są w nowej skali (ok. 3× obecnej mapy, 1 m ≈ 6 px w pliku). Ozdoby mają przezroczyste tło i kontur `#1e1a24`. Tekstury są bez konturu i się kafelkują.

### 4a. Ulica

| Plik | Rozmiar | Co to | Klatki |
|---|---|---|---|
| `latarnia_gazowa` | 24 × 72 | żeliwna latarnia z mosiężną głowicą | 2: zgaszona (dzień) / świeci (noc) |
| `lawka` | 42 × 24 | ławka z żeliwnymi bokami | |
| `slup_ogloszeniowy` | 30 × 60 | okrągły słup z afiszami | |
| `hydrant_parowy` | 18 × 24 | niski zawór z kółkiem | |
| `studzienka_para` | 24 × 24 | kratka w bruku, z której czasem bucha para | 3: bez pary / mały obłoczek / duży |
| `zegar_uliczny` | 24 × 78 | zegar na słupie | |
| `przystanek_tramwaju` | 60 × 48 | wiata z daszkiem z kutego żelaza | |

### 4b. Budynki (dodatki do D9)

| Plik | Rozmiar | Co to |
|---|---|---|
| `sciana_cegla_rury`, `sciana_tynk_kremowy_rury` | 48 × 24 | ściana z mosiężną rurą biegnącą po murze (kafelkuje się poziomo) |
| `sciana_sklep_witryna` | 48 × 24 | parter sklepu: witryna w drewnianej ramie, mosiężny szyld bez napisu |
| `komin_para` | 18 × 30 | komin na dach z obłoczkiem pary (3 klatki obłoczka) |
| `okno_noc` | 12 × 12 | ciepło świecące okno (gra nakłada je nocą na ściany) |
| `dach_miedz_jasna` / `_ciemna` | 48 × 48 | zielonkawa miedziana blacha (wieże, ratusz, uczelnia) |

### 4c. Pojazdy

| Plik | Rozmiar | Co to | Klatki |
|---|---|---|---|
| `parowoz` | 144 × 72 | mała, sympatyczna lokomotywa z wagonikiem, bokiem (patrzy w lewo) | 2: dym w górę / dym w bok |
| `tramwaj_parowy` | 144 × 60 | tramwaj parowy, bokiem, patrzy w lewo | 2 (koła) |
| `sterowiec` | 192 × 96 | mały sterowiec widziany z góry i trochę z boku (przelatuje nad mapą) | 1 + osobno `sterowiec_cien` (jednolita czarna sylwetka) |

Konny wóz woźnicy (`powoz`, D4) zostaje, może dostać mosiężne latarenki.

### 4d. Miejsca szczególne (później, po pierwszej partii)

| Plik | Rozmiar | Co to |
|---|---|---|
| `wieza_zegarowa` | 96 × 144 | wieża z wielkim zegarem i miedzianym dachem (rynki, ratusze) |
| `kociol_publiczny` | 72 × 72 | „smoczy kocioł” na placu: duży mosiężny kocioł, dziś przygasły (element lore) |
| `fontanna` | 72 × 60 | fontanna z mosiężną rzeźbą smoka |

### 4e. Szyldy (D5) w nowym stylu

Szyldy nad drzwiami (sklep, szkoła, kościół, urząd, szpital, policja, bank, hotel, alchemik, budowlany, biblioteka) proszę narysować jako **mosiężne tabliczki na kutym wysięgniku**, z prostym symbolem, bez napisów. Rozmiar 42 × 36.

## 5. Kolejność

1. **Pierwsza partia na próbę** (żeby zobaczyć styl na mapie): `latarnia_gazowa`, `lawka`, `komin_para`, `sciana_cegla_rury`, `sciana_sklep_witryna`, `parowoz` oraz dachy i ściany „na start” z D9 (czerwona dachówka, łupek, gont, płaski, kalenice, ściany z desek, cegły i białego tynku).
2. Reszta ulicy (4a) i szyldy (4e).
3. Tramwaj, sterowiec.
4. Miejsca szczególne (4d).

## 6. Czego unikać

- Brudu, rdzy, smogu i mrocznego przemysłu.
- Zębatek na wszystkim.
- Napisów na grafikach (gra jest w kilku językach).
- Wysokich budynków zasłaniających ulice. Nadal obowiązują najwyżej 3 wysokości ścian (D9).
- Anime i cyberpunku.

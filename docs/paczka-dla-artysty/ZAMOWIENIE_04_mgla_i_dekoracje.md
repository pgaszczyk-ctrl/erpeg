# Zamówienie 04 – mgła-pergamin i dekoracje miasta

> Zasady ogólne bez zmian (`CZYTAJ_MNIE`, `STYL_SWIATA_steampunk.md`): skala 3× (1 m ≈ 6 px w pliku), światło z lewej-góry, nazwy małymi literami bez polskich znaków, PNG. Tekstury pełne i kafelkujące się (bez powtarzania krawędzi), obiekty na przezroczystym tle z konturem 1 px `#1e1a24` i marginesem ok. 3 px, „stoją” na dolnej krawędzi.

## A. Mgła nieznanych miejsc – `mgla_pergamin` (najważniejsze)

Nieodkryte miejsca gra zakrywa teraz **starą mapą**. Na razie ten papier rysuje program (zrzut: `5_zrzuty_z_gry/mgla_pergamin_dzien_zmierzch_noc.png`). Prosta, równa siatka z programu wyglądała jak **cerata z fabryki**, dlatego wygląd papieru i siatki oddajemy Tobie.

- **Plik:** `mgla_pergamin`, **384 × 384**, pełny, kafelkujący się we wszystkie strony, bez powtarzania krawędzi.
- **Kolor:** jasny, raczej chłodny, szarawo-kremowy papier. Nie żółto-brązowy, bo taki zlewa się z dachami i drogami. Rysuj wersję **dzienną**, bo nocą i o zmierzchu gra sama go przyciemnia.
- **Faktura:** duże, miękkie plamy i przebarwienia, delikatne włókna, gdzieniegdzie przetarcia.
- **Siatka kartograficzna rysowana ręką:**
  - linie lekko falujące, **nierówne, miejscami przerwane i wyblakłe**, różnej grubości;
  - 2 × 2 albo 3 × 3 oczka na plik, a jedna linia może być mocniejsza;
  - do tego rzadko rozsiane wyblakłe znaczki starego kartografa: krzyżyki, kropki, fragment róży wiatrów, drobne ślady atramentu.
- **Uwaga na skalę:** gra zmniejsza plik ok. **6×**. Linie muszą mieć co najmniej 3–4 px grubości w pliku, a znaczki 12–20 px, inaczej znikną. Rysuj duże i miękkie.
- **Ruch:** papier przesuwa się powoli razem z bohaterem, z 1/20 jego prędkości, jak warstwa nad miastem. Dlatego wzór nie może mieć jednego rzucającego się w oczy punktu, który „jeździłby” po ekranie.
- **Bez:** napisów, rysunków drzew, domów i postaci.

## B. Dekoracje ulic (obiekty)

Gra rozstawi je sama w pasujących miejscach, więc liczy się rozmiar i to, żeby dobrze wyglądały powtórzone kilka razy.

| Plik | Rozmiar | Co to | Gdzie gra je postawi | Klatki |
|---|---|---|---|---|
| `lawka` | 42 × 24 | ławka z żeliwnymi bokami | parki, place | 1 |
| `zegar_uliczny` | 24 × 78 | zegar na słupie | place, skrzyżowania | 1 |
| `slup_ogloszeniowy` | 30 × 60 | okrągły słup z afiszami (bez czytelnych napisów) | ulice w centrum | 1 |
| `studzienka_para` | 24 × 24 | kratka w bruku, bucha z niej para | ulice z brukiem | 3: bez pary / mały / duży obłok |
| `hydrant_parowy` | 18 × 24 | niski mosiężny zawór z kółkiem | chodniki | 1 |
| `kosz_mosiezny` | 15 × 21 | kosz na śmieci z mosiądzu | przy ławkach | 1 |
| `donica_kwiaty` | 18 × 18 | kamienna donica z kwiatami | przy drzwiach sklepów, szkół | 2 wersje kolorów obok siebie |
| `skrzynie_beczki` | 36 × 27 | stos skrzynek i beczka | przy sklepach i straganach | 1 |
| `plot_drewniany` | 48 × 18 | płot (kafelkuje się poziomo) | ogródki, wieś | 1 |
| `plot_kuty` | 48 × 18 | kuty płotek (kafelkuje się poziomo) | parki, cmentarze | 1 |
| `welocyped` | 36 × 27 | stary rower z wielkim kołem, oparty o coś | przy sklepach, szkołach | 1 |
| `automat_pneumatyczny` | 21 × 42 | słupek poczty pneumatycznej z mosiężną rurą | ulice w centrum | 1 |

## C. Drzewa i przyroda (obiekty)

Zamiast obecnych, prostych drzewek:

| Plik | Rozmiar | Co to | Klatki |
|---|---|---|---|
| `drzewo_jablon` | 64 × 72 | jabłoń | 2: z owocami / bez |
| `drzewo_sliwa` | 64 × 72 | śliwa | 2: z owocami / bez |
| `winorosl` | 60 × 54 | krzak winorośli | 2: z winogronami / bez |
| `sosna` | 48 × 78 | sosna w lesie | 2: drzewo / pieniek |
| `drzewo_lisciaste` | 72 × 84 | duże drzewo w parku (dąb, lipa) | 2 wersje obok siebie |
| `krzak` | 30 × 24 | krzak ozdobny | 2 wersje obok siebie |
| `grzyb` | 24 × 24 | grzyb do zebrania | 1 |
| `kloda` | 30 × 18 | kłoda drewna | 1 |

## D. Miejsca szczególne (większe obiekty, po jednym na plac lub rynek)

| Plik | Rozmiar | Co to |
|---|---|---|
| `fontanna_smok` | 72 × 60 | fontanna z mosiężną rzeźbą smoka (nawiązanie do historii) |
| `kociol_publiczny` | 72 × 72 | „smoczy kocioł” na placu: duży mosiężny kocioł, dziś przygasły (element lore) |
| `wieza_zegarowa` | 96 × 144 | wieża z wielkim zegarem i miedzianym dachem |
| `drogowskaz` | 48 × 60 | drogowskaz w stylu steampunk: słupek z mosiężnymi strzałkami bez napisów (zamiast obecnego) |

## Kolejność oddawania

1. **A** – `mgla_pergamin`, najlepiej w 2 wersjach do wyboru (np. z gęstszą i rzadszą siatką).
2. **C** – drzewa, grzyb, kłoda (widać je wszędzie).
3. **B** – ławka, donica, skrzynie, studzienka, hydrant, kosz, potem reszta.
4. **D** – fontanna, kocioł, wieża, drogowskaz.

Z zamówienia 03 zostają jeszcze: reszta ścian (biały tynk, deski, kamień, mur pruski, wersje z rurą, witryna), reszta podłoży (działki, cmentarz, parking, boisko, plac zabaw, piasek, mokradło, puszcza), dachy (gont, strzecha, miedź) oraz postacie (Luigi, Martin, woźnica, trener, biegaczka, mądrale, pies). Rób je, kiedy pasuje, w dowolnej kolejności.

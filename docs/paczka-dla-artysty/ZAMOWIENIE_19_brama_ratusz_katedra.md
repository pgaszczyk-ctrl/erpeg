# Zamówienie 19: Brama Krakowska, Nowy Ratusz, Archikatedra z Wieżą Trynitarską (+ cewka Tesli)

Zamek Lubelski z poprzedniej paczki stoi już w grze i zostaje bez zmian. Teraz trzy kolejne zabytki, robione **tą samą metodą co zamek**: malujesz budowlę na szkielecie z mapy, a gra kładzie obraz dokładnie na obrysie.

Wszystkie pliki są w folderze `19_zabytki_szkielety/`.

## Jak (dla każdego zabytku)

1. Na wejście generatora obrazów daj `<zabytek>_szkielet_x4.png` (szkielet 4× na tle magenta) i 2–4 zdjęcia zabytku (linki niżej).
2. `<zabytek>_w_scenie_x2.png` pokazuje, **gdzie zabytek stoi w mieście**: szare bryły to sąsiednie budynki (ich nie malujesz), kolorowa to zabytek, numery to jego części, a bohaterka pokazuje skalę. Północ jest u góry.
3. Wynik ma mieć **ten sam rozmiar, sylwetkę i położenie** co szkielet i **tło magenta**. Zmniejszenie, paletę i obrys robimy my skryptem.
4. Jeśli generator zmieni kształt, powtórz z dopiskiem `do not change the outline, only paint inside it`.
5. Brzegi **bez różowej obwódki** (przy zamku wyczyściliśmy ok. 250 różowych pikseli).

**Rzut gry:** dachy widać z góry na obrysie, a ściany idą w dół (na południe) i lekko w prawo, jak u zamku. Światło z lewej-góry, obrys #1e1a24, grube kwadratowe piksele, 3–5 odcieni na kolor, bez gradientów, bez napisów.

## 1. Brama Krakowska → steampunkowa rotunda (`brama_krakowska_*`, poprawka 7.10)

**Dziękujemy za próbkę: styl jest bardzo dobry** (cegła, biały bęben, miedziany hełm, zegar). Problem jest w orientacji. Prawdziwa brama stoi na mapie skosem, a przejazd biegnie z północnego wschodu na południowy zachód. Wierna kopia byłaby więc od strony widza widoczna bokiem i nie dałoby się poznać, co to.

**Decyzja właściciela:** zamiast wiernej bramy stawiamy w tym miejscu **steampunkową rotundę**: okrągłą (z każdej strony wygląda tak samo), **wyższą**, z elementami Bramy Krakowskiej. Nowy szkielet jest okrągły (`brama_krakowska_szkielet_x4.png`, średnica ok. 15 m, ściany 50 px w rzucie).

**Rotunda może wyjść ponad szkielet, nawet dwa razy wyżej.** Na górze płótna jest zapas magenty na taką wysokość. Podstawa (dolny obrys) i średnica zostają jak w szkielecie, a w górę rośnie tylko wieża. W grze tak wysoka wieża działa jak wysokie drzewo: zasłania bohaterkę, która stoi za nią, i wtedy robi się przejrzysta.

Co ma mieć rotunda (od dołu):

1. **Dół z czerwonej cegły** jak w próbce, z gotyckimi blankami w połowie wysokości. **Przejazd (ostrołukowa brama) od południa**, czyli na stronie widocznej dla gracza.
2. **Biały bęben** (z próbki) z **dużym mosiężnym zegarem z widocznymi zębatkami**, skierowanym na południe.
3. **Miedziany hełm z latarnią** (zielona patyna, jak w próbce), na szczycie mosiężna iglica albo kula.
4. Steampunk: **mosiężne obręcze** opasujące wieżę na 2–3 wysokościach, **miedziane rury** pnące się po murze i wychodzące nad dach, **mały balkon obserwacyjny z lunetą** pod bębnem, kilka nitów i zaworów. Pary nie rysuj, robi ją program.

Uwagi do próbki, które dalej obowiązują: przejazd ostrołukowy (nie półokrągły), rury mosiężne/miedziane (bez zielonej patyny na rurach), światło z lewej-góry.

## 2. Nowy Ratusz (`nowy_ratusz_*`)

- Urząd Miasta na placu Łokietka, naprzeciw Bramy Krakowskiej. **Nie myl go z Trybunałem Koronnym (Starym Ratuszem) na Rynku.**
- Jedna część: **klasycystyczny gmach**, żółte (piaskowe) ściany, białe gzymsy i obramienia okien, **czerwony dach czterospadowy**; od strony placu fasada z kolumnami/pilastrami i trójkątnym frontonem.
- Lekki steampunk: **mosiężny zegar z wahadłem nad wejściem**, na dachu **antena telegrafu** (mosiężny maszt z izolatorami), wzdłuż jednej ściany **rury poczty pneumatycznej**. Pary nie rysuj, robi ją program.
- Zdjęcia: wyszukaj „Nowy Ratusz Lublin plac Łokietka” na Wikimedia Commons.

## 3. Archikatedra i Wieża Trynitarska (`katedra_*`)

Dwie części (numery w `katedra_w_scenie_x2.png`):

| Nr | Część | Wysokość w rzucie | Opis |
|---|---|---|---|
| 1 | Archikatedra | 24 px (ok. 20 m) | jasne, szarobiałe ściany, zielony (miedziany) dach, od zachodu **portyk z kolumnami** |
| 2 | Wieża Trynitarska | 56 px (40 m) | neogotycka wieża, beżowy kamień, zegar, ostry hełm; stoi przy katedrze od północnego zachodu |

- Zdjęcia: https://www.wikidata.org/wiki/Q9373790 (Wieża Trynitarska) i strona Archikatedry Lubelskiej na Wikidanych/Commons.

### Cewka Tesli na katedrze (animowana)

Na dachu katedry, we wschodniej części, stoi **cewka Tesli**. Miejsce zaznaczyliśmy czerwonym krzyżykiem w `katedra_miejsce_cewki_tesli_x4.png`, a współrzędne są w `katedra.json` (`cewka_tesli_px_1x`).

- **Osobny plik**, bo gra animuje cewkę oddzielnie: `cewka_tesli.png` na magencie.
- Wygląd: miedziana spirala na mosiężnej podstawie z nitami, na górze **metalowy torus (pierścień)**, obok mały mosiężny piorunochron. Wysokość mniej więcej **jak bohaterka** (cewka ma być widoczna z ulicy, ale nie przytłaczać wieży).
- **Klatki (w jednym rzędzie, ta sama skala i podstawa):**
  1. spokojna (bez iskier),
  2. i 3. małe trzaskające iskry wokół torusa (dwa różne układy),
  4. duże wyładowanie: 2–3 jasnoniebieskie łuki od torusa w dół do piorunochronu.
- Iskry jasne, biało-błękitne, z ciemnym obrysem tylko wokół cewki (nie wokół iskier). Poświatę nocą dorobi gra.
- **Nie rysuj cewki na obrazie katedry.** W tym miejscu dach ma być zwykły, a cewkę gra postawi na wierzchu.

## Polecenie dla generatora obrazów (gotowe do wklejenia, podmień nazwę i opis)

```
Repaint this block-out as a detailed pixel art building for a top-down RPG.
Keep EXACTLY the same footprint, base, size, position and perspective: roofs seen from above, walls visible below the roofs, leaning slightly to the right. The tower may rise ABOVE the block-out, up to twice its height, into the empty magenta space at the top. Keep the flat magenta background #FF00FF.
This is a STEAMPUNK ROTUNDA inspired by the Krakow Gate in Lublin (Brama Krakowska), see the attached photos:
part 1 – a tall round tower: red-brick lower part with gothic crenellations and a pointed archway passage facing south (towards the viewer), a white round drum above with a big brass clock with visible gears, a green-patina copper helmet roof with a lantern and a brass spire; brass rings around the tower, copper pipes climbing the walls, a small observation balcony with a brass telescope.
Pixel art: chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24, light from the top-left, no anti-aliasing, no gradients, no text.
Very light steampunk touch: brass clockwork, a few copper pipes.
```

Dla cewki Tesli:

```
Pixel art game sprite sheet of a STEAMPUNK TESLA COIL for a top-down RPG, 4 frames in one row, same scale, same baseline:
1) idle, 2) small crackling sparks around the top torus, 3) different small sparks, 4) big discharge: 2-3 bright blue-white arcs from the torus down to a small lightning rod.
Copper coil on a riveted brass base, metal torus on top. Chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24 around the coil only, light from the top-left, no anti-aliasing, no text.
Solid flat background pure magenta #FF00FF, no ground, no shadow.
```

## Kolejność

1. Brama Krakowska jako steampunkowa rotunda (do akceptacji, na nowym okrągłym szkielecie).
2. Nowy Ratusz.
3. Archikatedra z Wieżą Trynitarską i osobno cewka Tesli.

Kolejne zabytki (Brama Grodzka, Trybunał Koronny) dostaniesz w ten sam sposób, gdy przygotujemy ich szkielety.
